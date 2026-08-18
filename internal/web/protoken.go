package web

import (
	"crypto/subtle"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// proTokenEntry 单个已签发 token（作者手动维护 pro-tokens.json）
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

// proTokenStore 管理已签发 token：加载 / mtime 重载 / 校验 / 次数扣减 / 持久化。
// 次数型需运行时改写剩余次数，故 token 存独立 state 文件而非 config.json。
type proTokenStore struct {
	path  string
	mu    sync.RWMutex
	items map[string]proTokenEntry
	mtime time.Time
}

// newProTokenStore 创建并加载 store；文件不存在视为空 store，不报错
func newProTokenStore(path string) *proTokenStore {
	st := &proTokenStore{path: path, items: map[string]proTokenEntry{}}
	st.load()
	return st
}

// load 从文件加载（文件缺失或解析失败均降级为空 store）
func (s *proTokenStore) load() {
	entries, ok := readTokenFile(s.path)
	if !ok {
		return
	}
	m := map[string]proTokenEntry{}
	for _, e := range entries {
		if e.Token != "" {
			m[e.Token] = e
		}
	}
	s.items = m
	if fi, err := os.Stat(s.path); err == nil {
		s.mtime = fi.ModTime()
	}
}

// readTokenFile 读取并解析 token 文件
func readTokenFile(path string) ([]proTokenEntry, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, false
	}
	var entries []proTokenEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, false
	}
	return entries, true
}

// maybeReload 文件 mtime 变化时重载（作者外部追加 token 后自动生效）
func (s *proTokenStore) maybeReload() {
	fi, err := os.Stat(s.path)
	if err != nil {
		return
	}
	s.mu.RLock()
	same := !fi.ModTime().After(s.mtime)
	s.mu.RUnlock()
	if same {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if !fi.ModTime().After(s.mtime) {
		return
	}
	// 重载：运行时扣减后立即写回文件，文件始终是最新剩余，故外部重载安全
	if entries, ok := readTokenFile(s.path); ok {
		m := map[string]proTokenEntry{}
		for _, e := range entries {
			if e.Token != "" {
				m[e.Token] = e
			}
		}
		s.items = m
		s.mtime = fi.ModTime()
	}
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

// persistLocked 原子写回整个 token 列表（调用方持写锁）
func (s *proTokenStore) persistLocked() {
	entries := make([]proTokenEntry, 0, len(s.items))
	for _, e := range s.items {
		entries = append(entries, e)
	}
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return
	}
	dir := filepath.Dir(s.path)
	if dir == "" {
		dir = "."
	}
	tmp, err := os.CreateTemp(dir, ".pro-tokens-*.tmp")
	if err != nil {
		return
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return
	}
	tmp.Close()
	if err := os.Rename(tmp.Name(), s.path); err == nil {
		if fi, err := os.Stat(s.path); err == nil {
			s.mtime = fi.ModTime()
		}
	}
}
