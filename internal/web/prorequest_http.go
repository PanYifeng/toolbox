package web

import (
	"context"
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

	"toolbox/internal/config"
)

// proRequestBody 创建支付核销请求的入参
type proRequestBody struct {
	PlanID  string `json:"planId"`
	Email   string `json:"email"`
	OrderID string `json:"orderId"`
}

// handleProRequestCreate 用户提交支付信息：校验方案/邮箱，创建 pending 请求（预生成 token，
// 未生效），并向作者发送一封含确认链接的邮件。作者点击确认或 1h 后自动通过，token 才生效。
func (s *Server) handleProRequestCreate(w http.ResponseWriter, r *http.Request) {
	if !s.cfg.Pro.Enabled {
		http.NotFound(w, r)
		return
	}
	var body proRequestBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	body.PlanID = strings.TrimSpace(body.PlanID)
	body.Email = strings.TrimSpace(body.Email)
	body.OrderID = strings.TrimSpace(body.OrderID)
	plan, ok := s.cfg.Pro.Plan(body.PlanID)
	if !ok {
		http.Error(w, "unknown plan", http.StatusBadRequest)
		return
	}
	if _, err := mail.ParseAddress(body.Email); err != nil {
		http.Error(w, "invalid email", http.StatusBadRequest)
		return
	}
	if body.OrderID == "" {
		http.Error(w, "order id required", http.StatusBadRequest)
		return
	}
	req := s.proReq.create(body.PlanID, body.Email, body.OrderID)
	// 异步发作者确认邮件（失败仅记日志，不影响提交）
	go s.notifyAuthorConfirm(req, plan)
	writeJSON(w, map[string]any{
		"id":        req.ID,
		"status":    req.Status,
		"createdAt": req.CreatedAt,
		"planId":    req.PlanID,
	})
}

// handleProRequestStatus 查询核销请求状态；已通过时附带 token 供前端自动保存激活
func (s *Server) handleProRequestStatus(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	req, ok := s.proReq.find(id)
	if !ok {
		http.NotFound(w, r)
		return
	}
	resp := map[string]any{
		"id":          req.ID,
		"status":      req.Status,
		"planId":      req.PlanID,
		"createdAt":   req.CreatedAt,
		"activatedAt": req.ActivatedAt,
	}
	// 仅 pending 之外的状态才返回 token（已生效）
	if req.Status == reqApproved || req.Status == reqAuto {
		resp["token"] = req.Token
	}
	writeJSON(w, resp)
}

// handleProConfirm 作者邮件确认链接：校验 HMAC 签名后激活 token
func (s *Server) handleProConfirm(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sig := r.URL.Query().Get("sig")
	if id == "" || !s.checkConfirmSig(id, sig) {
		http.Error(w, "invalid or expired link", http.StatusForbidden)
		return
	}
	req, ok := s.proReq.find(id)
	if !ok {
		http.Error(w, "request not found", http.StatusNotFound)
		return
	}
	if req.Status != reqPending {
		s.renderConfirmResult(w, req, "already")
		return
	}
	s.activateRequest(req, reqApproved)
	req, _ = s.proReq.find(id) // 取最新状态用于结果页
	s.renderConfirmResult(w, req, "approved")
}

// activateRequest 激活某请求的 token：按方案构造 entry 写入 pro-tokens.json，流转状态，通知用户。
// 由作者确认（approved）或超时自动（auto）两条路径共用。
func (s *Server) activateRequest(req proRequestEntry, status string) {
	plan, ok := s.cfg.Pro.Plan(req.PlanID)
	if !ok {
		log.Printf("pro activate: plan %q not found for request %s", req.PlanID, req.ID)
		return
	}
	entry := buildProTokenEntry(plan, req.Token)
	s.pro.addToken(entry)
	s.proReq.setStatus(req.ID, status)
	go s.notifyUserApproved(req, plan)
}

// buildProTokenEntry 按方案生成 token entry：时间型 expiresAt=今天+durationDays；次数型 remaining=count
func buildProTokenEntry(plan config.ProPlan, token string) proTokenEntry {
	switch plan.Type {
	case "time":
		expires := time.Now().AddDate(0, 0, plan.DurationDays).Format("2006-01-02")
		return proTokenEntry{Token: token, Type: "time", ExpiresAt: expires}
	case "count":
		return proTokenEntry{Token: token, Type: "count", Remaining: plan.Count}
	default:
		return proTokenEntry{Token: token, Type: plan.Type}
	}
}

// proAutoApproveLoop 定时把超过 TTL 仍 pending 的请求自动通过；ctx 取消时退出
func (s *Server) proAutoApproveLoop(ctx context.Context) {
	ttl := s.cfg.Pro.AutoApproveDuration()
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.autoApproveExpired(ttl)
		}
	}
}

// autoApproveExpired 扫描 pending 请求，对 createdAt 已超过 ttl 的逐个自动通过
func (s *Server) autoApproveExpired(ttl time.Duration) {
	for _, req := range s.proReq.listPending() {
		created, err := time.Parse(time.RFC3339, req.CreatedAt)
		if err != nil {
			continue
		}
		if time.Since(created) > ttl {
			s.activateRequest(req, reqAuto)
			log.Printf("pro auto-approved request %s (plan %s)", req.ID, req.PlanID)
		}
	}
}

// checkConfirmSig 校验确认链接签名：HMAC-SHA256(adminSecret, id) == sig
func (s *Server) checkConfirmSig(id, sig string) bool {
	mac := hmac.New(sha256.New, []byte(s.cfg.Pro.AdminSecret))
	mac.Write([]byte(id))
	want := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(want), []byte(sig))
}

// confirmLink 构造作者确认邮件中的链接
func (s *Server) confirmLink(id string) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.Pro.AdminSecret))
	mac.Write([]byte(id))
	sig := hex.EncodeToString(mac.Sum(nil))
	base := strings.TrimRight(s.cfg.Site.URL, "/")
	return fmt.Sprintf("%s/api/pro/confirm?id=%s&sig=%s", base, id, sig)
}

// notifyAuthorConfirm 发送作者确认邮件（含用户支付信息 + 一键确认链接）
func (s *Server) notifyAuthorConfirm(req proRequestEntry, plan config.ProPlan) {
	m := s.cfg.Mail
	if !m.Configured() || s.cfg.Pro.AdminEmail == "" || s.cfg.Pro.AdminSecret == "" {
		return
	}
	text := fmt.Sprintf(
		"新的 Pro 支付核销请求：\n\n方案：%s\n用户邮箱：%s\n订单号：%s\n提交时间：%s\n\n"+
			"确认通过请点击：%s\n\n若不操作，%s 后将自动通过。",
		plan.Label.ZH, req.Email, req.OrderID, req.CreatedAt,
		s.confirmLink(req.ID), s.cfg.Pro.AutoApproveTTL,
	)
	if err := sendMail(m, s.cfg.Pro.AdminEmail, "[Toolbox] Pro 支付核销确认", text); err != nil {
		log.Printf("pro notify author failed: %v", err)
	}
}

// notifyUserApproved 通知用户 token 已生效（含 token 串）
func (s *Server) notifyUserApproved(req proRequestEntry, plan config.ProPlan) {
	m := s.cfg.Mail
	if !m.Configured() {
		return
	}
	text := fmt.Sprintf(
		"您的 Pro 已生效！\n\n方案：%s\nToken：%s\n\n请在对应工具页面的 Pro 面板输入该 Token 即可激活。\n感谢支持。",
		plan.Label.ZH, req.Token,
	)
	if err := sendMail(m, req.Email, "[Toolbox] Your Pro is active", text); err != nil {
		log.Printf("pro notify user failed: %v", err)
	}
}

// renderConfirmResult 渲染作者点击确认后的结果页（纯静态 HTML，无需前端）
func (s *Server) renderConfirmResult(w http.ResponseWriter, req proRequestEntry, kind string) {
	var msg string
	switch kind {
	case "approved":
		msg = "✅ 已确认通过，Pro Token 已生效并通知用户。"
	case "already":
		msg = "ℹ️ 该请求已处理过（状态：" + req.Status + "），无需重复操作。"
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = fmt.Fprintf(w, `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>Pro 核销</title></head>
<body style="font-family:system-ui;max-width:480px;margin:80px auto;text-align:center;color:#333">
<h2>%s</h2><p>请求 ID: %s</p><a href="%s">返回 Toolbox</a></body></html>`,
		msg, req.ID, strings.TrimRight(s.cfg.Site.URL, "/")+"/")
}
