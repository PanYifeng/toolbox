package web

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// payNotifyBody 支付对账通知入参：自觉解锁付费项时，前端把 TXID/功能/金额等发给站主邮箱对账。
// 无状态、无确认、不阻断解锁——仅发一封邮件，站主按 TXID 备注（或金额+时间）人工对账。
type payNotifyBody struct {
	Feature string  `json:"feature"` // 付费项标识，如 "knowledge-quiz 错题解析"
	Amount  float64 `json:"amount"`  // 金额（元）
	TxID    string  `json:"txId"`    // 交易号（前端生成，提示用户填入支付备注）
	Name    string  `json:"name"`    // 姓名（可选）
	Email   string  `json:"email"`   // 用户邮箱（可选）
}

// handlePayNotify 轻量支付通知：仅给站主发对账邮件，不存状态、不发 token、不阻断前端解锁。
func (s *Server) handlePayNotify(w http.ResponseWriter, r *http.Request) {
	var body payNotifyBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if !validatePayNotify(&body) {
		http.Error(w, "feature and txId required", http.StatusBadRequest)
		return
	}
	if !s.payRL.allow(clientIP(r)) {
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}
	s.dispatchPayNotify(w, &body)
}

// validatePayNotify 去空白并校验必填项；返回 false 表示参数非法
func validatePayNotify(body *payNotifyBody) bool {
	body.Feature = strings.TrimSpace(body.Feature)
	body.TxID = strings.TrimSpace(body.TxID)
	body.Name = strings.TrimSpace(body.Name)
	body.Email = strings.TrimSpace(body.Email)
	return body.Feature != "" && body.TxID != ""
}

// dispatchPayNotify 校验邮件配置后发送对账邮件（未配置则静默返回 ok:false）
func (s *Server) dispatchPayNotify(w http.ResponseWriter, body *payNotifyBody) {
	m := s.cfg.Mail
	if !m.Configured() || s.cfg.Pro.AdminEmail == "" {
		writeJSON(w, map[string]any{"ok": false, "message": "notify disabled"})
		return
	}
	text := buildPayNotifyText(body)
	subject := "[Toolbox] 支付通知 " + sanitizeMailField(body.TxID)
	if err := sendMail(m, s.cfg.Pro.AdminEmail, subject, text); err != nil {
		log.Printf("pay notify mail failed: feature=%s txId=%s err=%v", body.Feature, body.TxID, err)
		writeJSON(w, map[string]any{"ok": false, "message": "send failed"})
		return
	}
	log.Printf("pay notify mail sent: feature=%s txId=%s amount=%.2f", body.Feature, body.TxID, body.Amount)
	writeJSON(w, map[string]any{"ok": true})
}

// buildPayNotifyText 构造对账邮件正文（用户输入已脱敏，防邮件头注入）
func buildPayNotifyText(body *payNotifyBody) string {
	return fmt.Sprintf(
		"一笔自觉解锁付费项待对账：\n\n功能：%s\n金额：¥%.2f\n交易号(TXID)：%s\n姓名：%s\n用户邮箱：%s\n提交时间：%s\n\n"+
			"请在收款账户中按 TXID 备注（或金额+时间）核对这笔入账。",
		sanitizeMailField(body.Feature), body.Amount, sanitizeMailField(body.TxID),
		sanitizeMailField(body.Name), sanitizeMailField(body.Email),
		time.Now().Format("2006-01-02 15:04:05"),
	)
}

// sanitizeMailField 去除换行符，防止用户输入注入邮件头（RFC 5322 头以 \r\n 分隔）
func sanitizeMailField(s string) string {
	return strings.NewReplacer("\r", "", "\n", "").Replace(s)
}
