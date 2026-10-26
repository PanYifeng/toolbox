package web

import (
	"encoding/json"
	"log"
	"strings"
	"sync"
	"time"
)

// 通用付费内容站主确认门（镜像 errataVerifyStore，payload 为任意文本报告）：
// 访客一次性提交 {邮箱,交易号,语言,报告文本} → pending 落盘 → 站主收确认邮件
// → 点 HMAC 签名链接通过 → 报告以纯文本邮件发至访客邮箱。
// 供人格测试完整版（¥5）等"付费解锁内容经邮件送达"场景复用；前端无自解锁。
// 读写经 stateIO 门面（kvstate.go），存储策略由 config.storage 驱动。

const (
	prPending  = "pending"  // 已提交申请，待站主确认收款
	prApproved = "approved" // 站主确认通过，报告已发至访客邮箱
)

// paidReportInput 创建付费报告申请所需要素（访客一次性提交）
type paidReportInput struct {
	Feature string  // 付费项标识，如 "MBTI 完整版人格报告"
	Title   string  // 邮件主题（默认取 Feature）
	Amount  float64 // 金额（元）
	Email   string  // 访客邮箱
	Name    string  // 访客姓名（金卡持证人 + PDF 持证人行）
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
	Name        string  `json:"name,omitempty"`
	TxID        string  `json:"txId"`
	Lang        string  `json:"lang"`
	Report      string  `json:"report"`
	PNG         string  `json:"png"`
	Status      string  `json:"status"`
	CreatedAt   string  `json:"createdAt"`
	ActivatedAt string  `json:"activatedAt"`
}

// paidReportStore 管理付费报告解锁申请：加载 / 变更重载 / 创建 / 查询 / 状态流转 / 持久化。
// 落盘模式镜像 errataVerifyStore。
type paidReportStore struct {
	st    stateIO
	mu    sync.RWMutex
	items map[string]paidReportEntry
	order []string // 保持写入顺序
}

// newPaidReportStore 创建并加载；无数据视为空 store
func newPaidReportStore(path string, kv stateKV) *paidReportStore {
	st := &paidReportStore{st: newStateIO(path, kvKeyPaidReports, kv), items: map[string]paidReportEntry{}}
	st.mu.Lock()
	defer st.mu.Unlock()
	st.reloadLocked()
	return st
}

// parsePRData 解析付费报告申请列表数据
func parsePRData(data []byte) (map[string]paidReportEntry, []string, bool) {
	var entries []paidReportEntry
	if json.Unmarshal(data, &entries) != nil {
		return nil, nil, false
	}
	m := map[string]paidReportEntry{}
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
func (s *paidReportStore) reloadLocked() {
	data, changed, err := s.st.loadSync()
	if err != nil {
		log.Printf("paid reports load failed: %v", err)
		return
	}
	if !changed {
		return
	}
	if m, order, ok := parsePRData(data); ok {
		s.items = m
		s.order = order
	}
}

// maybeReload 数据变化时重载（作者外部操作后自动同步；redis 模式实际不再触发）
func (s *paidReportStore) maybeReload() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.reloadLocked()
}

// create 访客一次性提交申请：创建 pending 记录并持久化（含报告文本）
func (s *paidReportStore) create(in paidReportInput) paidReportEntry {
	e := paidReportEntry{
		ID:        newHexID(),
		Feature:   in.Feature,
		Title:     in.Title,
		Amount:    in.Amount,
		Email:     in.Email,
		Name:      strings.TrimSpace(in.Name),
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

// persistLocked 写回整个申请列表（调用方持写锁）。镜像 errataVerifyStore。
func (s *paidReportStore) persistLocked() {
	entries := make([]paidReportEntry, 0, len(s.order))
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
		log.Printf("paid reports persist failed: %v", err)
	}
}
