package web

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// feedbackBody 用户反馈入参：留言 + 联系邮箱 + 来源模块（前端自动捕获当前工具 id）+ 语言。
// 无状态、不回传内容——仅把信息转发邮件给站主，由站主人工处理与回复。
type feedbackBody struct {
	Message string `json:"message"` // 留言内容（必填，至多 4000 字）
	Email   string `json:"email"`   // 联系邮箱（必填，便于站主回复）
	Module  string `json:"module"`  // 来源模块 id（如 mbti / game-suika，首页为空）
	Lang    string `json:"lang"`     // 提交时语言（zh/en，便于站主用同语言回复）
}

// handleFeedback 用户反馈：校验 → 限流 → 转发邮件给站主
func (s *Server) handleFeedback(w http.ResponseWriter, r *http.Request) {
	var body feedbackBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if !validateFeedback(&body) {
		http.Error(w, "message and valid email required", http.StatusBadRequest)
		return
	}
	if !s.fbRL.allow(clientIP(r)) {
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}
	s.dispatchFeedback(w, r, &body)
}

// validateFeedback 去空白并校验必填项与邮箱格式；返回 false 表示参数非法
func validateFeedback(body *feedbackBody) bool {
	body.Message = strings.TrimSpace(body.Message)
	body.Email = strings.TrimSpace(body.Email)
	body.Module = strings.TrimSpace(body.Module)
	body.Lang = strings.TrimSpace(body.Lang)
	if body.Message == "" || len(body.Message) > 4000 {
		return false
	}
	return emailLike(body.Email)
}

// emailLike 简易邮箱格式校验（非 RFC 严格，仅挡明显错误输入）
func emailLike(s string) bool {
	at := strings.IndexByte(s, '@')
	dot := strings.LastIndexByte(s, '.')
	return at > 0 && dot > at+1 && dot < len(s)-1
}

// dispatchFeedback 校验邮件配置后转发反馈邮件给站主（未配置则静默返回 ok:false）
func (s *Server) dispatchFeedback(w http.ResponseWriter, r *http.Request, body *feedbackBody) {
	m := s.cfg.Mail
	if !m.Configured() || s.cfg.Pro.AdminEmail == "" {
		writeJSON(w, map[string]any{"ok": false, "message": "feedback disabled"})
		return
	}
	text := buildFeedbackText(r, body)
	subject := "[Toolbox] 用户反馈 " + sanitizeMailField(body.Module)
	if err := sendMail(m, s.cfg.Pro.AdminEmail, subject, text); err != nil {
		log.Printf("feedback mail failed: module=%s email=%s err=%v", body.Module, body.Email, err)
		writeJSON(w, map[string]any{"ok": false, "message": "send failed"})
		return
	}
	log.Printf("feedback mail sent: module=%s email=%s", body.Module, body.Email)
	writeJSON(w, map[string]any{"ok": true})
}

// buildFeedbackText 构造反馈邮件正文（头部字段已脱敏防注入；正文保留换行便于阅读）
func buildFeedbackText(r *http.Request, body *feedbackBody) string {
	module := sanitizeMailField(body.Module)
	if module == "" {
		module = "首页"
	}
	lang := sanitizeMailField(body.Lang)
	if lang == "" {
		lang = "zh"
	}
	// 仅去 \r（防 \r\n 头注入），保留 \n 让多行留言正常显示
	msg := strings.ReplaceAll(body.Message, "\r", "")
	return fmt.Sprintf(
		"收到一条用户反馈：\n\n来源模块：%s\n语言：%s\n用户邮箱：%s\n提交时间：%s\n来源 IP：%s\n\n留言内容：\n%s",
		module, lang, sanitizeMailField(body.Email),
		time.Now().Format("2006-01-02 15:04:05"),
		clientIP(r), msg,
	)
}
