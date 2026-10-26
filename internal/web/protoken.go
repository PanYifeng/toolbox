package web

import (
	"crypto/subtle"
	"encoding/json"
	"log"
	"sync"
	"time"
)

// proTokenEntry 单个已签发 token（作者手动维护）
type proTokenEntry struct {
	Token     string `json:"token"`
	Type      string `json:"type"`      // time / count
	ExpiresAt string `json:"expiresAt"` // type=time：有效期截止日 YYYY-MM-DD（含当天）
	Remaining int    `json:"remaining"` // type=count：剩余可用次数
}

// proStatus token 校验结果
type proStatus string

const (
	proValid     proStatus = "valid"     // 有效，享 Pro 权益
	proExpired   proStatus = "expired"   // 时间型已过期
	proExhausted proStatus = "exhausted" // 次数型已用尽
	proInvalid   proStatus = "invalid"   // 不存在 / 格式错
)

// proTokenInfo 校验返回的 token 信息
type proTokenInfo struct {
	status    proStatus
	typ       string
	remaining int
	expiresAt string
}

// proTokenStore 管理已签发 token：加载 / 变更重载 / 校验 / 次数扣减 / 持久化。
// 次数型需运行时改写剩余次数，故 token 存独立 state（local 文件或 redis 键）而非 config.json。
// 读写经 stateIO 门面（kvstate.go），存储策略由 config.storage 驱动。
type proTokenStore struct {
	st    stateIO
	mu    sync.RWMutex
	items map[string]proTokenEntry
}

// newProTokenStore 创建并加载 store；无数据视为空 store，不报错
func newProTokenStore(path string, kv stateKV) *proTokenStore {
	st := &proTokenStore{st: newStateIO(path, kvKeyProTokens, kv), items: map[string]proTokenEntry{}}
	st.mu.Lock()
	defer st.mu.Unlock()
	st.reloadLocked()
	return st
}

// parseTokenData 解析 token 列表数据
func parseTokenData(data []byte) (map[string]proTokenEntry, bool) {
	var entries []proTokenEntry
	if json.Unmarshal(data, &entries) != nil {
		return nil, false
	}
	m := map[string]proTokenEntry{}
	for _, e := range entries {
		if e.Token != "" {
			m[e.Token] = e
		}
	}
	return m, true
}

// reloadLocked 读取并解析最新数据（数据未变化时跳过；解析失败保留旧表；调用方须持写锁）
func (s *proTokenStore) reloadLocked() {
	data, changed, err := s.st.loadSync()
	if err != nil {
		log.Printf("pro tokens load failed: %v", err)
		return
	}
	if !changed {
		return
	}
	if m, ok := parseTokenData(data); ok {
		s.items = m
	}
}

// maybeReload 数据变化时重载（作者外部追加 token 后自动生效；redis 模式本进程即唯一写者，实际不再触发）
func (s *proTokenStore) maybeReload() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reloadLocked()
}

// validate 校验 token 有效性（不扣减）
func (s *proTokenStore) validate(token string) proTokenInfo {
	if token == "" {
		return proTokenInfo{status: proInvalid}
	}
	s.maybeReload()
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.items[token]
	if !ok {
		return proTokenInfo{status: proInvalid}
	}
	// map 命中后再常数时间比对确认，防时序枚举
	if subtle.ConstantTimeCompare([]byte(token), []byte(e.Token)) != 1 {
		return proTokenInfo{status: proInvalid}
	}
	switch e.Type {
	case "time":
		if e.ExpiresAt == "" {
			return proTokenInfo{status: proValid, typ: e.Type, expiresAt: e.ExpiresAt}
		}
		t, err := time.Parse("2006-01-02", e.ExpiresAt)
		if err == nil && time.Now().After(t.Add(24*time.Hour)) {
			return proTokenInfo{status: proExpired, typ: e.Type, expiresAt: e.ExpiresAt}
		}
		return proTokenInfo{status: proValid, typ: e.Type, expiresAt: e.ExpiresAt}
	case "count":
		if e.Remaining <= 0 {
			return proTokenInfo{status: proExhausted, typ: e.Type, remaining: 0}
		}
		return proTokenInfo{status: proValid, typ: e.Type, remaining: e.Remaining}
	default:
		return proTokenInfo{status: proInvalid}
	}
}

// consume 次数型 token 扣减一次并持久化；时间型 / 非有效 token 不扣减。
// 在上传被接受（入队前）调用，避免对失败上传计费。
func (s *proTokenStore) consume(token string) proTokenInfo {
	info := s.validate(token)
	if info.status != proValid || info.typ != "count" {
		return info
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.items[token]
	if !ok || e.Remaining <= 0 {
		return proTokenInfo{status: proExhausted, typ: "count", remaining: 0}
	}
	e.Remaining--
	s.items[token] = e
	s.persistLocked()
	return proTokenInfo{status: proValid, typ: "count", remaining: e.Remaining}
}

// addToken 写入一个预生成 token（审批激活时调用）并持久化。
// token 串由调用方生成；此处不校验是否已存在，重复写入幂等覆盖。
func (s *proTokenStore) addToken(entry proTokenEntry) {
	if entry.Token == "" {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[entry.Token] = entry
	s.persistLocked()
}

// persistLocked 写回整个 token 列表（调用方持写锁）
func (s *proTokenStore) persistLocked() {
	entries := make([]proTokenEntry, 0, len(s.items))
	for _, e := range s.items {
		entries = append(entries, e)
	}
	data, err := s.st.marshal(entries)
	if err != nil {
		return
	}
	if err := s.st.write(data); err != nil {
		log.Printf("pro tokens persist failed: %v", err)
	}
}
