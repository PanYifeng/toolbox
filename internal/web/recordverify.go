package web

import (
	"encoding/json"
	"log"
	"sync"
	"time"
)

// 破纪录金版卡下载核销（站主确认门，镜像 proRequestStore）：
// 破纪录时由 leaderboard 提交即时创建 pending 记录（持有服务端签发的 TB-R- 码），
// 用户随后填邮箱+交易号 → 站主收确认邮件 → 点 HMAC 签名链接通过 → 码下发前端下载。
// 通过前 TB-R- 码绝不下发前端（top()/submit 响应均已剥离），使下载门真实有效。
// 读写经 stateIO 门面（kvstate.go），存储策略由 config.storage 驱动。

const (
	rvPending  = "pending"  // 已创建/已填表，待站主确认
	rvApproved = "approved" // 站主邮件确认通过，可下发码
)

// recordClaim 创建核销请求所需的最小要素（破纪录码由 leaderboard 签发后传入，rv 不持密钥）
type recordClaim struct {
	Game       string
	Name       string // 入榜姓名（已 trim，与签名一致）
	Score      int
	Time       string // 完成时间串，与卡面 displayTime / 签名 timeStr 一致
	SignedCode string // leaderboard.signRecord 签发的 TB-R- 码
}

// recordVerifyEntry 单条破纪录卡核销请求
type recordVerifyEntry struct {
	ID          string `json:"id"`
	Game        string `json:"game"`
	Name        string `json:"name"`
	Score       int    `json:"score"`
	Time        string `json:"time"`
	Email       string `json:"email"`      // 用户填表后写入；空表示尚未填表
	TxID        string `json:"txId"`       // 用户填表后写入
	SignedCode  string `json:"signedCode"` // 服务端签发码，approved 才下发
	Status      string `json:"status"`     // pending / approved
	CreatedAt   string `json:"createdAt"`
	ActivatedAt string `json:"activatedAt"`
}

// recordVerifyStore 管理破纪录卡核销请求：加载 / 变更重载 / 创建 / 填表 / 查询 / 状态流转 / 持久化。
// 落盘模式镜像 proRequestStore。
type recordVerifyStore struct {
	st    stateIO
	mu    sync.RWMutex
	items map[string]recordVerifyEntry
	order []string // 保持写入顺序
}

// newRecordVerifyStore 创建并加载；无数据视为空 store
func newRecordVerifyStore(path string, kv stateKV) *recordVerifyStore {
	st := &recordVerifyStore{st: newStateIO(path, kvKeyRecordClms, kv), items: map[string]recordVerifyEntry{}}
	st.mu.Lock()
	defer st.mu.Unlock()
	st.reloadLocked()
	return st
}

// parseRVData 解析核销请求列表数据
func parseRVData(data []byte) (map[string]recordVerifyEntry, []string, bool) {
	var entries []recordVerifyEntry
	if json.Unmarshal(data, &entries) != nil {
		return nil, nil, false
	}
	m := map[string]recordVerifyEntry{}
	var order []string
	for _, e := range entries {
		if e.ID != "" {
			m[e.ID] = e
			order = append(order, e.ID)
		}
	}
	return m, order, true
}

// reloadLocked 读取并解析最新数据（数据未变化时跳过；解析失败保留旧表；调用方须持写锁）
func (s *recordVerifyStore) reloadLocked() {
	data, changed, err := s.st.loadSync()
	if err != nil {
		log.Printf("record claims load failed: %v", err)
		return
	}
	if !changed {
		return
	}
	if m, order, ok := parseRVData(data); ok {
		s.items = m
		s.order = order
	}
}

// maybeReload 数据变化时重载（作者外部操作后自动同步；redis 模式实际不再触发）
func (s *recordVerifyStore) maybeReload() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reloadLocked()
}

// create 破纪录时创建 pending 请求并持久化（email/txid 留空，由 fill 写入）
func (s *recordVerifyStore) create(c recordClaim) recordVerifyEntry {
	e := recordVerifyEntry{
		ID:         newHexID(),
		Game:       c.Game,
		Name:       c.Name,
		Score:      c.Score,
		Time:       c.Time,
		SignedCode: c.SignedCode,
		Status:     rvPending,
		CreatedAt:  time.Now().Format(time.RFC3339),
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[e.ID] = e
	s.order = append(s.order, e.ID)
	s.persistLocked()
	return e
}

// fill 用户填表后写入邮箱+交易号；不存在或非 pending 返回 ok=false
func (s *recordVerifyStore) fill(id, email, txid string) (recordVerifyEntry, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.items[id]
	if !ok || e.Status != rvPending {
		return recordVerifyEntry{}, false
	}
	e.Email = email
	e.TxID = txid
	s.items[id] = e
	s.persistLocked()
	return e, true
}

// find 按 ID 查询（不存在返回 ok=false）
func (s *recordVerifyStore) find(id string) (recordVerifyEntry, bool) {
	s.maybeReload()
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.items[id]
	return e, ok
}

// setStatus 流转状态并记录生效时间，持久化；返回是否成功
func (s *recordVerifyStore) setStatus(id, status string) bool {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.items[id]
	if !ok {
		return false
	}
	e.Status = status
	e.ActivatedAt = time.Now().Format(time.RFC3339)
	s.items[id] = e
	s.persistLocked()
	return true
}

// persistLocked 写回整个请求列表（调用方持写锁）。镜像 proRequestStore。
func (s *recordVerifyStore) persistLocked() {
	entries := make([]recordVerifyEntry, 0, len(s.order))
	for _, id := range s.order {
		if e, ok := s.items[id]; ok {
			entries = append(entries, e)
		}
	}
	data, err := s.st.marshal(entries)
	if err != nil {
		return
	}
	if err := s.st.write(data); err != nil {
		log.Printf("record claims persist failed: %v", err)
	}
}
