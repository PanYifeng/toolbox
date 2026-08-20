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
)

// recordClaimBody 用户填表入参：claimId 由破纪录提交时下发，txid 前端生成供站主对账
type recordClaimBody struct {
	ClaimID string `json:"claimId"`
	Email   string `json:"email"`
	TxID    string `json:"txId"`
}

// handleRecordClaimFill 用户破纪录后填邮箱+交易号：校验+落库+发站主确认邮件。
// 通过前不发码；站主点确认链接后由 handleRecordConfirm 下发。
func (s *Server) handleRecordClaimFill(w http.ResponseWriter, r *http.Request) {
	var body recordClaimBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	body.ClaimID = strings.TrimSpace(body.ClaimID)
	body.Email = strings.TrimSpace(body.Email)
	body.TxID = strings.TrimSpace(body.TxID)
	if body.ClaimID == "" || body.TxID == "" {
		http.Error(w, "claimId and txId required", http.StatusBadRequest)
		return
	}
	if _, err := mail.ParseAddress(body.Email); err != nil {
		http.Error(w, "invalid email", http.StatusBadRequest)
		return
	}
	if !s.payRL.allow(clientIP(r)) {
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}
	e, ok := s.rv.fill(body.ClaimID, body.Email, body.TxID)
	if !ok {
		http.Error(w, "claim not found or already processed", http.StatusNotFound)
		return
	}
	go s.notifyRecordClaimOwner(e)
	log.Printf("record claim filled: id=%s game=%s txid=%s email=%s", e.ID, e.Game, e.TxID, e.Email)
	writeJSON(w, map[string]any{"id": e.ID, "status": e.Status})
}

// handleRecordStatus 查询核销状态；approved 才下发签发码供前端渲染+下载
func (s *Server) handleRecordStatus(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	e, ok := s.rv.find(id)
	if !ok {
		http.NotFound(w, r)
		return
	}
	resp := map[string]any{
		"id":     e.ID,
		"status": e.Status,
		"game":   e.Game,
		"filled": e.Email != "",
	}
	// 仅 approved 下发签发码与卡面四要素（pending 不泄漏码）
	if e.Status == rvApproved {
		resp["signedCode"] = e.SignedCode
		resp["name"] = e.Name
		resp["score"] = e.Score
		resp["time"] = e.Time
	}
	writeJSON(w, resp)
}

// handleRecordConfirm 站主确认链接：校验 HMAC 签名后通过核销，并邮件通知用户回页下载
func (s *Server) handleRecordConfirm(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sig := r.URL.Query().Get("sig")
	if id == "" || !s.checkConfirmSig(id, sig) {
		http.Error(w, "invalid or expired link", http.StatusForbidden)
		return
	}
	e, ok := s.rv.find(id)
	if !ok {
		http.Error(w, "claim not found", http.StatusNotFound)
		return
	}
	if e.Status != rvPending {
		s.renderRecordConfirmResult(w, e, "already")
		return
	}
	if e.Email == "" {
		s.renderRecordConfirmResult(w, e, "noemail")
		return
	}
	s.rv.setStatus(e.ID, rvApproved)
	e, _ = s.rv.find(id)
	go s.notifyRecordApprovedUser(e)
	log.Printf("record claim approved: id=%s game=%s txid=%s", e.ID, e.Game, e.TxID)
	s.renderRecordConfirmResult(w, e, "approved")
}

// recordConfirmLink 站主确认邮件中的链接（HMAC 签名，复用 adminSecret，与 pro confirm 同密钥不同路径）
func (s *Server) recordConfirmLink(id string) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.Pro.AdminSecret))
	mac.Write([]byte(id))
	sig := hex.EncodeToString(mac.Sum(nil))
	base := strings.TrimRight(s.cfg.Site.URL, "/")
	return fmt.Sprintf("%s/api/game/record-confirm?id=%s&sig=%s", base, id, sig)
}

// notifyRecordClaimOwner 发站主确认邮件（含用户信息 + TXID 对账 + 一键确认链接）
func (s *Server) notifyRecordClaimOwner(e recordVerifyEntry) {
	m := s.cfg.Mail
	if !m.Configured() || s.cfg.Pro.AdminEmail == "" || s.cfg.Pro.AdminSecret == "" {
		return
	}
	text := fmt.Sprintf(
		"破纪录金版卡下载申请待核验：\n\n游戏：%s\n姓名：%s\n分数：%d\n完成时间：%s\n用户邮箱：%s\n交易号(TXID)：%s\n提交时间：%s\n\n"+
			"请到收款账户按 TXID（或金额 ¥1 + 时间）核对这笔入账，确认后点击：%s\n\n核验通过后用户回到游戏页面刷新即可下载金版卡。",
		recordGameLabel(e.Game), e.Name, e.Score, e.Time, e.Email, e.TxID, e.CreatedAt, s.recordConfirmLink(e.ID),
	)
	if err := sendMail(m, s.cfg.Pro.AdminEmail, "[Toolbox] 破纪录金版卡核验 "+e.TxID, text); err != nil {
		log.Printf("record claim notify owner failed: id=%s err=%v", e.ID, err)
	}
}

// notifyRecordApprovedUser 通知用户已通过，回游戏页刷新下载
func (s *Server) notifyRecordApprovedUser(e recordVerifyEntry) {
	m := s.cfg.Mail
	if !m.Configured() {
		return
	}
	text := fmt.Sprintf(
		"您的破纪录金版卡已核验通过！\n\n游戏：%s\n姓名：%s\n分数：%d\n\n请回到 %s 刷新页面，即可下载完整金版卡。\n感谢支持。",
		recordGameLabel(e.Game), e.Name, e.Score, strings.TrimRight(s.cfg.Site.URL, "/")+recordGamePath(e.Game),
	)
	if err := sendMail(m, e.Email, "[Toolbox] 破纪录金版卡已核验通过", text); err != nil {
		log.Printf("record claim notify user failed: id=%s err=%v", e.ID, err)
	}
}

// renderRecordConfirmResult 渲染站主点击确认后的结果页（纯静态 HTML，无需前端）
func (s *Server) renderRecordConfirmResult(w http.ResponseWriter, e recordVerifyEntry, kind string) {
	var msg string
	switch kind {
	case "approved":
		msg = "✅ 已核验通过，金版卡可下载，已通知用户回页刷新。"
	case "already":
		msg = "ℹ️ 该申请已处理过（状态：" + e.Status + "），无需重复操作。"
	case "noemail":
		msg = "⚠️ 该申请用户尚未填邮箱，无法通知。请等待用户填表后再确认。"
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = fmt.Fprintf(w, `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>破纪录卡核验</title></head>
<body style="font-family:system-ui;max-width:480px;margin:80px auto;text-align:center;color:#333">
<h2>%s</h2><p>申请 ID: %s</p><a href="%s">返回 Toolbox</a></body></html>`,
		msg, e.ID, strings.TrimRight(s.cfg.Site.URL, "/")+"/")
}

// recordGameLabel 由 game 主题键（game-tetris）得可读标签
func recordGameLabel(game string) string {
	return "破纪录金版卡（" + strings.TrimPrefix(game, "game-") + "）"
}

// recordGamePath 由 game 主题键得游戏页路径（/t/tetris）
func recordGamePath(game string) string {
	return "/t/" + strings.TrimPrefix(game, "game-")
}
