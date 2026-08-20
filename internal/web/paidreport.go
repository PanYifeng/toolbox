package web

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
	"time"
)

// 通用付费内容站主确认门（镜像 errataVerifyStore，payload 为任意文本报告）：
// 访客一次性提交 {邮箱,交易号,语言,报告文本} → pending 落盘 → 站主收确认邮件
// → 点 HMAC 签名链接通过 → 报告以纯文本邮件发至访客邮箱。
// 供人格测试完整版（¥5）等"付费解锁内容经邮件送达"场景复用；前端无自解锁。

const (
	prPending  = "pending"  // 已提交申请，待站主确认收款
	prApproved = "approved" // 站主确认通过，报告已发至访客邮箱
)

// paidReportInput 创建付费报告申请所需要素（访客一次性提交）
type paidReportInput struct {
	Feature string // 付费项标识，如 "MBTI 完整版人格报告"
	Title   string // 邮件主题（默认取 Feature）
	Amount  float64 // 金额（元）
	Email   string  // 访客邮箱
	TxID    string  // 前端生成，提示填入支付备注供站主对账
	Lang    string  // 访客当前语言，邮件按此渲染脚注
	Report  string  // 完整报告文本（按访客语言客户端预生成，确认后原样邮件送达）
	PNG     string  // 金纪念卡 PNG（dataURL/base64，人格测试完整版随申请附带，确认后作邮件附件）
}

// paidReportEntry 单条付费报告解锁申请
type paidReportEntry struct {
	ID          string  `json:"id"`
	Feature     string  `json:"feature"`
	Title       string  `json:"title"`
	Amount      float64 `json:"amount"`
	Email       string  `json:"email"`
	TxID        string  `json:"txId"`
	Lang        string  `json:"lang"`
	Report      string  `json:"report"`
	PNG         string  `json:"png"`
	Status      string  `json:"status"`
	CreatedAt   string  `json:"createdAt"`
	ActivatedAt string  `json:"activatedAt"`
}

// paidReportStore 管理付费报告解锁申请：加载 / mtime 重载 / 创建 / 查询 / 状态流转 / 持久化。
// 落盘模式镜像 errataVerifyStore（load/maybeReload/persistLocked 原子写）。
type paidReportStore struct {
	path  string
	mu    sync.RWMutex
	items map[string]paidReportEntry
	order []string // 保持写入顺序
	mtime time.Time
}

// newPaidReportStore 创建并加载；文件缺失视为空 store
func newPaidReportStore(path string) *paidReportStore {
	st := &paidReportStore{path: path, items: map[string]paidReportEntry{}}
	st.load()
	return st
}

// load 从文件加载（缺失或解析失败降级为空 store）
func (s *paidReportStore) load() {
	entries, ok := readPRFile(s.path)
	if !ok {
		return
	}
	m := map[string]paidReportEntry{}
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

// readPRFile 读取并解析付费报告申请文件
func readPRFile(path string) ([]paidReportEntry, bool) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, false
	}
	var entries []paidReportEntry
	if err := json.Unmarshal(data, &entries); err != nil {
		return nil, false
	}
	return entries, true
}

// maybeReload mtime 变化时重载（作者外部操作后自动同步）
func (s *paidReportStore) maybeReload() {
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
	if entries, ok := readPRFile(s.path); ok {
		m := map[string]paidReportEntry{}
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

// create 访客一次性提交申请：创建 pending 记录并持久化（含报告文本）
func (s *paidReportStore) create(in paidReportInput) paidReportEntry {
	e := paidReportEntry{
		ID:        newHexID(),
		Feature:   in.Feature,
		Title:     in.Title,
		Amount:    in.Amount,
		Email:     in.Email,
		TxID:      in.TxID,
		Lang:      in.Lang,
		Report:    in.Report,
		PNG:       in.PNG,
		Status:    prPending,
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
func (s *paidReportStore) find(id string) (paidReportEntry, bool) {
	s.maybeReload()
	s.mu.RLock()
	defer s.mu.RUnlock()
	e, ok := s.items[id]
	return e, ok
}

// setStatus 流转状态并记录生效时间，持久化；返回是否成功
func (s *paidReportStore) setStatus(id, status string) bool {
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

// persistLocked 原子写回整个申请列表（调用方持写锁）。镜像 errataVerifyStore。
func (s *paidReportStore) persistLocked() {
	entries := make([]paidReportEntry, 0, len(s.order))
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
	tmp, err := os.CreateTemp(dir, ".paid-reports-*.tmp")
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
