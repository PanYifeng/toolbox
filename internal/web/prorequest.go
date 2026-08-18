package web

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// 支付核销请求状态
const (
	reqPending  = "pending"  // 已提交，待作者确认或 1h 自动通过
	reqApproved = "approved" // 作者邮件确认通过
	reqAuto     = "auto"     // 超时自动通过
)

// proRequestEntry 单条支付核销请求：用户提交支付信息后，预生成 token 并等待确认。
// 确认（邮件点击或超时自动）前 token 不进 pro-tokens.json，即未生效。
type proRequestEntry struct {
	ID          string `json:"id"`
	PlanID      string `json:"planId"`
	Email       string `json:"email"`
	OrderID     string `json:"orderId"`
	Token       string `json:"token"`       // 预生成的 Pro token，激活前不生效
	CreatedAt   string `json:"createdAt"`   // RFC3339，用于 1h 超时判定
	Status      string `json:"status"`      // pending / approved / auto
	ActivatedAt string `json:"activatedAt"` // 生效时间（RFC3339）
}

// proRequestStore 管理支付核销请求：加载 / mtime 重载 / 创建 / 查询 / 状态流转 / 持久化。
type proRequestStore struct {
	path  string
	mu    sync.RWMutex
	items map[string]proRequestEntry
	order []string // 保持写入顺序，便于 listPending 稳定
	mtime time.Time
}

// newProRequestStore 创建并加载；文件不存在视为空 store
func newProRequestStore(path string) *proRequestStore {
	st := &proRequestStore{path: path, items: map[string]proRequestEntry{}}
	st.load()
	return st
}

// load 从文件加载（缺失或解析失败降级为空 store）
func (s *proRequestStore) load() {
	entries, ok := readRequestFile(s.path)
	if !ok {
		return
	}
	m := map[string]proRequestEntry{}
	for _, e := range entries {
		if e.ID != "" {
			m[e.ID] = e
			s.order = append(s.order, e.ID)
		}
	}
	s.items = m
	if fi, err := os.Stat(s.path); err == nil {
		s.mtime = fi.ModTime()
	}
}

// readRequestFile 读取并解析请求文件
func readRequestFile(path string) ([]proRequestEntry, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, false
	}
	var entries []proRequestEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, false
	}
	return entries, true
}

// maybeReload mtime 变化时重载（作者外部操作或其它进程写入后自动同步）
func (s *proRequestStore) maybeReload() {
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
	if entries, ok := readRequestFile(s.path); ok {
		m := map[string]proRequestEntry{}
		var order []string
		for _, e := range entries {
			if e.ID != "" {
				m[e.ID] = e
				order = append(order, e.ID)
			}
		}
		s.items = m
		s.order = order
		s.mtime = fi.ModTime()
	}
}

// newID 生成请求 ID（16 字节 hex）与 token 串
func newHexID() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

// create 创建一条 pending 请求并持久化，返回新条目
func (s *proRequestStore) create(planID, email, orderID string) proRequestEntry {
	e := proRequestEntry{
		ID:        newHexID(),
		PlanID:    planID,
		Email:     email,
		OrderID:   orderID,
		Token:     newHexID(),
		CreatedAt: time.Now().Format(time.RFC3339),
		Status:    reqPending,
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[e.ID] = e
	s.order = append(s.order, e.ID)
	s.persistLocked()
	return e
}

// find 按 ID 查询（不存在返回 ok=false）
func (s *proRequestStore) find(id string) (proRequestEntry, bool) {
	s.maybeReload()
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.items[id]
	return e, ok
}

// listPending 返回所有仍 pending 的请求（按创建顺序）
func (s *proRequestStore) listPending() []proRequestEntry {
	s.maybeReload()
	s.mu.RLock()
	defer s.mu.RUnlock()
	var out []proRequestEntry
	for _, id := range s.order {
		if e, ok := s.items[id]; ok && e.Status == reqPending {
			out = append(out, e)
		}
	}
	return out
}

// setStatus 流转状态并记录生效时间，持久化；返回是否成功
func (s *proRequestStore) setStatus(id, status string) bool {
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

// persistLocked 原子写回整个请求列表（调用方持写锁）
func (s *proRequestStore) persistLocked() {
	entries := make([]proRequestEntry, 0, len(s.order))
	for _, id := range s.order {
		if e, ok := s.items[id]; ok {
			entries = append(entries, e)
		}
	}
	data, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return
	}
	dir := filepath.Dir(s.path)
	if dir == "" {
		dir = "."
	}
	tmp, err := os.CreateTemp(dir, ".pro-requests-*.tmp")
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
