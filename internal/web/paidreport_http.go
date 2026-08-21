package web

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"strings"
	"time"
)

// paidReportBody 访客提交付费报告申请入参：邮箱 + 交易号 + 语言 + 报告文本 + 金纪念卡 PNG。
// 报告文本由客户端按访客语言预生成，确认后原样邮件送达（访客 tab 关闭后仍可送达）。
// PNG 为人格测试完整版随申请附带的金纪念卡（可选），确认后作邮件附件。
type paidReportBody struct {
	Feature string  `json:"feature"`
	Title   string  `json:"title"`
	Amount  float64 `json:"amount"`
	Email   string  `json:"email"`
	TxID    string  `json:"txId"`
	Lang    string  `json:"lang"`
	Report  string  `json:"report"`
	PNG     string  `json:"png"`
}

// handlePaidReportCreate 访客提交付费报告申请：校验+落库 pending+发站主确认邮件。
// 通过前报告绝不展示（前端无自解锁）；站主点确认链接后由 handlePaidReportConfirm 把报告邮件发访客。
func (s *Server) handlePaidReportCreate(w http.ResponseWriter, r *http.Request) {
	var body paidReportBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 6<<20)).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if !validatePaidReport(&body) {
		http.Error(w, "email, txId, feature and report required", http.StatusBadRequest)
		return
	}
	if !s.payRL.allow(clientIP(r)) {
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}
	e := s.pr.create(paidReportInput{
		Feature: body.Feature, Title: body.Title, Amount: body.Amount,
		Email: body.Email, TxID: body.TxID, Lang: body.Lang, Report: body.Report, PNG: body.PNG,
	})
	go s.notifyPaidReportOwner(e)
	log.Printf("paid report claim created: id=%s feature=%s txid=%s amount=%.2f email=%s",
		e.ID, e.Feature, e.TxID, e.Amount, e.Email)
	writeJSON(w, map[string]any{"id": e.ID, "status": e.Status})
}

// validatePaidReport 去空白并校验必填项与邮箱合法性；返回 false 表示参数非法
func validatePaidReport(body *paidReportBody) bool {
	body.Feature = strings.TrimSpace(body.Feature)
	body.Title = strings.TrimSpace(body.Title)
	body.Email = strings.TrimSpace(body.Email)
	body.TxID = strings.TrimSpace(body.TxID)
	body.Lang = strings.TrimSpace(body.Lang)
	body.Report = strings.TrimSpace(body.Report)
	if body.TxID == "" || body.Feature == "" || body.Report == "" {
		return false
	}
	if _, err := mail.ParseAddress(body.Email); err != nil {
		return false
	}
	return true
}

// handlePaidReportConfirm 站主确认链接：校验 HMAC 签名后通过申请，并把报告邮件发至访客邮箱
func (s *Server) handlePaidReportConfirm(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sig := r.URL.Query().Get("sig")
	if id == "" || !s.checkConfirmSig(id, sig) {
		http.Error(w, "invalid or expired link", http.StatusForbidden)
		return
	}
	e, ok := s.pr.find(id)
	if !ok {
		http.Error(w, "claim not found", http.StatusNotFound)
		return
	}
	if e.Status != prPending {
		s.renderPaidReportConfirmResult(w, e, "already")
		return
	}
	s.pr.setStatus(e.ID, prApproved)
	e, _ = s.pr.find(id)
	go s.notifyPaidReportApprovedUser(e)
	log.Printf("paid report claim approved: id=%s feature=%s txid=%s", e.ID, e.Feature, e.TxID)
	s.renderPaidReportConfirmResult(w, e, "approved")
}

// paidReportConfirmLink 站主确认邮件中的链接（HMAC 签名，复用 adminSecret）
func (s *Server) paidReportConfirmLink(id string) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.Pro.AdminSecret))
	mac.Write([]byte(id))
	sig := hex.EncodeToString(mac.Sum(nil))
	base := strings.TrimRight(s.cfg.Site.URL, "/")
	return fmt.Sprintf("%s/api/paidreport/confirm?id=%s&sig=%s", base, id, sig)
}

// notifyPaidReportOwner 发站主确认邮件（含付费项/金额/报告预览 + 一键确认链接）
func (s *Server) notifyPaidReportOwner(e paidReportEntry) {
	m := s.cfg.Mail
	if !m.Configured() || s.cfg.Pro.AdminEmail == "" || s.cfg.Pro.AdminSecret == "" {
		return
	}
	preview := e.Report
	if len(preview) > 400 {
		preview = preview[:400] + "…（完整内容见通过后发给用户的邮件）"
	}
	text := fmt.Sprintf(
		"付费报告解锁申请待核验：\n\n付费项：%s\n金额：¥%.2f\n用户邮箱：%s\n交易号(TXID)：%s\n提交时间：%s\n\n报告预览：\n%s\n\n"+
			"请到收款账户按 TXID 备注（或金额+时间）核对这笔入账，确认收款后点击：%s\n\n核验通过后完整报告将自动发送至用户邮箱。",
		sanitizeMailField(e.Feature), e.Amount, e.Email, sanitizeMailField(e.TxID), e.CreatedAt, preview, s.paidReportConfirmLink(e.ID),
	)
	if err := sendMail(m, s.cfg.Pro.AdminEmail, "[Toolbox] 付费报告解锁申请 "+e.TxID, text); err != nil {
		log.Printf("paid report notify owner failed: id=%s err=%v", e.ID, err)
	}
}

// notifyPaidReportApprovedUser 通知访客并把完整报告邮件送达：附带金纪念卡则 multipart 附件，否则纯文本
func (s *Server) notifyPaidReportApprovedUser(e paidReportEntry) {
	m := s.cfg.Mail
	if !m.Configured() {
		return
	}
	text := buildPaidReportMailText(e, s.cfg.Site.URL)
	subject := e.Title
	if subject == "" {
		subject = "[Toolbox] 你的付费报告"
	} else {
		subject = subject + " 已封缄 · Sealed"
	}
	// 金卡附件文件名：含类型缩写与日期，如 "人格金卡-DISC-20260820.png"
	filename := "人格金卡-" + shortTypeName(e.Feature) + "-" + time.Now().Format("20060102") + ".png"
	// 申请若附带金纪念卡 PNG（人格测试完整版），作附件 multipart 发送；无则纯文本回退
	if strings.TrimSpace(e.PNG) != "" {
		if pngBytes, decErr := decodePNG(e.PNG); decErr == nil {
			if sendErr := sendMailWithAttachment(m, e.Email, subject, text, pngBytes, filename); sendErr != nil {
				log.Printf("paid report notify user (with card) failed: id=%s err=%v", e.ID, sendErr)
			}
			return
		}
		log.Printf("paid report png decode failed, fallback to text: id=%s", e.ID)
	}
	if err := sendMail(m, e.Email, subject, text); err != nil {
		log.Printf("paid report notify user failed: id=%s err=%v", e.ID, err)
	}
}

// shortTypeName 从付费项特征文字提取类型缩写，用于金卡附件文件名
func shortTypeName(feature string) string {
	if strings.Contains(feature, "MBTI") {
		return "MBTI"
	}
	if strings.Contains(feature, "DISC") {
		return "DISC"
	}
	if strings.Contains(feature, "大五") || strings.Contains(feature, "Big Five") {
		return "BigFive"
	}
	return "Report"
}

// buildPaidReportMailText 构造访客邮件正文：个性化寄语 + 报告原文 + 站点脚注（按申请语言）
func buildPaidReportMailText(e paidReportEntry, siteURL string) string {
	greeting := i18nField(e.Lang,
		"你好，以下是你付费解锁的完整报告，愿它为你带来新的视角。\n\n",
		"Hello, here is your full report. May it bring you a fresh perspective.\n\n")
	footer := i18nField(e.Lang, "感谢支持 Toolbox。", "Thanks for supporting Toolbox.")
	if u := strings.TrimSpace(siteURL); u != "" {
		footer = fmt.Sprintf("%s\n%s", footer, u)
	}
	return greeting + e.Report + "\n\n" + footer
}

// renderPaidReportConfirmResult 渲染站主点击确认后的结果页（纯静态 HTML，无需前端）
func (s *Server) renderPaidReportConfirmResult(w http.ResponseWriter, e paidReportEntry, kind string) {
	var msg string
	switch kind {
	case "approved":
		msg = "✅ 已核验通过，完整报告已发送至用户邮箱。"
	case "already":
		msg = "ℹ️ 该申请已处理过（状态：" + e.Status + "），无需重复操作。"
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = fmt.Fprintf(w, `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>付费报告核验</title></head>
<body style="font-family:system-ui;max-width:480px;margin:80px auto;text-align:center;color:#333">
<h2>%s</h2><p>申请 ID: %s</p><a href="%s">返回 Toolbox</a></body></html>`,
		msg, e.ID, strings.TrimRight(s.cfg.Site.URL, "/")+"/")
}
