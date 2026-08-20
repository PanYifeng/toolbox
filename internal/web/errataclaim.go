package web

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// 错题解析付费解锁核销（站主确认门，镜像 recordVerifyStore）：
// 交卷后访客一次性提交 {邮箱,交易号,错题 review 快照,语言} → pending 落盘 → 站主收确认邮件
// → 点 HMAC 签名链接通过 → 解析以纯文本邮件发至访客邮箱。
// 通过前解析绝不展示（前端无自解锁按钮）；review 落盘以跨站主确认时延（访客已关页面）保活。

const (
	ecPending  = "pending"  // 已提交申请，待站主确认收款
	ecApproved = "approved" // 站主邮件确认通过，解析已发至访客邮箱
)

// bilingualText 中英双语文本（题干/选项/解析均复用此结构）
type bilingualText struct {
	ZH string `json:"zh"`
	EN string `json:"en"`
}

// errataReviewItem 单道错题快照：题干/选项/用户作答/正确索引/解析（服务端存，确认后渲染入邮件）
type errataReviewItem struct {
	Q           bilingualText   `json:"q"`
	Options     []bilingualText `json:"options"`
	UserPick    int             `json:"userPick"`       // -1 表示未作答
	Correct     int             `json:"correctIndex"`  // 正确选项索引 0..3
	Explanation *bilingualText `json:"explanation"`    // 可空：无解析的题（如宗教旧库）
}

// errataClaimInput 创建申请所需要素（访客一次性提交，对应 ec.create 入参）
type errataClaimInput struct {
	Feature string             // 付费项标识，如 "knowledge-quiz 错题解析"
	Amount  float64            // 金额（元），按错题数 ×0.2 客户端算
	Count   int               // 错题数
	Email   string            // 访客邮箱（解析确认后发往此处）
	TxID    string            // 前端生成，提示访客填入支付备注供站主对账
	Lang    string            // 访客当前语言，邮件按此语言渲染
	Review  []errataReviewItem // 错题快照（仅错题，服务端存）
}

// errataVerifyEntry 单条错题解析解锁申请
type errataVerifyEntry struct {
	ID          string             `json:"id"`
	Feature     string             `json:"feature"`
	Amount      float64            `json:"amount"`
	Count       int                `json:"count"`
	Email       string             `json:"email"`
	TxID        string             `json:"txId"`
	Lang        string             `json:"lang"`
	Review      []errataReviewItem `json:"review"`
	Status      string             `json:"status"` // pending / approved
	CreatedAt   string             `json:"createdAt"`
	ActivatedAt string            `json:"activatedAt"`
}

// errataVerifyStore 管理错题解析解锁申请：加载 / mtime 重载 / 创建 / 查询 / 状态流转 / 持久化。
// 落盘模式镜像 recordVerifyStore（load/maybeReload/persistLocked 原子写）。
type errataVerifyStore struct {
	path  string
	mu    sync.RWMutex
	items map[string]errataVerifyEntry
	order []string // 保持写入顺序
	mtime time.Time
}

// newErrataVerifyStore 创建并加载；文件缺失视为空 store
func newErrataVerifyStore(path string) *errataVerifyStore {
	st := &errataVerifyStore{path: path, items: map[string]errataVerifyEntry{}}
	st.load()
	return st
}

// load 从文件加载（缺失或解析失败降级为空 store）
func (s *errataVerifyStore) load() {
	entries, ok := readECFile(s.path)
	if !ok {
		return
	}
	m := map[string]errataVerifyEntry{}
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

// readECFile 读取并解析错题申请文件
func readECFile(path string) ([]errataVerifyEntry, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, false
	}
	var entries []errataVerifyEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, false
	}
	return entries, true
}

// maybeReload mtime 变化时重载（作者外部操作后自动同步）
func (s *errataVerifyStore) maybeReload() {
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
	if entries, ok := readECFile(s.path); ok {
		m := map[string]errataVerifyEntry{}
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

// create 访客一次性提交申请：创建 pending 记录并持久化（含 review 快照）
func (s *errataVerifyStore) create(in errataClaimInput) errataVerifyEntry {
	e := errataVerifyEntry{
		ID:        newHexID(),
		Feature:   in.Feature,
		Amount:    in.Amount,
		Count:     in.Count,
		Email:     in.Email,
		TxID:      in.TxID,
		Lang:      in.Lang,
		Review:    in.Review,
		Status:    ecPending,
		CreatedAt: time.Now().Format(time.RFC3339),
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.items[e.ID] = e
	s.order = append(s.order, e.ID)
	s.persistLocked()
	return e
}

// find 按 ID 查询（不存在返回 ok=false）
func (s *errataVerifyStore) find(id string) (errataVerifyEntry, bool) {
	s.maybeReload()
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.items[id]
	return e, ok
}

// setStatus 流转状态并记录生效时间，持久化；返回是否成功
func (s *errataVerifyStore) setStatus(id, status string) bool {
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

// persistLocked 原子写回整个申请列表（调用方持写锁）。镜像 recordVerifyStore。
func (s *errataVerifyStore) persistLocked() {
	entries := make([]errataVerifyEntry, 0, len(s.order))
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
	tmp, err := os.CreateTemp(dir, ".errata-claims-*.tmp")
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
