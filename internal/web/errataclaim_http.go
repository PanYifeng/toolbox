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

// errataClaimBody 访客提交申请入参：邮箱 + 交易号 + 错题 review 快照 + 语言。
// review 服务端落盘，确认后渲染入访客邮件——访客 tab 关闭后仍可送达。
type errataClaimBody struct {
	Feature string             `json:"feature"`
	Amount  float64            `json:"amount"`
	Count   int                `json:"count"`
	Email   string             `json:"email"`
	TxID    string             `json:"txId"`
	Lang    string             `json:"lang"`
	Review  []errataReviewItem `json:"review"`
}

// handleErrataClaimCreate 访客交卷后提交解锁申请：校验+落库 pending+发站主确认邮件。
// 通过前解析绝不展示（前端无自解锁按钮）；站主点确认链接后由 handleErrataConfirm 把解析邮件发访客。
func (s *Server) handleErrataClaimCreate(w http.ResponseWriter, r *http.Request) {
	var body errataClaimBody
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<18)).Decode(&body); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if !validateErrataClaim(&body) {
		http.Error(w, "email, txId, feature and review required", http.StatusBadRequest)
		return
	}
	if !s.payRL.allow(clientIP(r)) {
		http.Error(w, "rate limited", http.StatusTooManyRequests)
		return
	}
	e := s.ec.create(errataClaimInput{
		Feature: body.Feature, Amount: body.Amount, Count: body.Count,
		Email: body.Email, TxID: body.TxID, Lang: body.Lang, Review: body.Review,
	})
	go s.notifyErrataClaimOwner(e)
	log.Printf("errata claim created: id=%s feature=%s txid=%s count=%d amount=%.2f email=%s",
		e.ID, e.Feature, e.TxID, e.Count, e.Amount, e.Email)
	writeJSON(w, map[string]any{"id": e.ID, "status": e.Status})
}

// validateErrataClaim 去空白并校验必填项与邮箱合法性；返回 false 表示参数非法
func validateErrataClaim(body *errataClaimBody) bool {
	body.Feature = strings.TrimSpace(body.Feature)
	body.Email = strings.TrimSpace(body.Email)
	body.TxID = strings.TrimSpace(body.TxID)
	body.Lang = strings.TrimSpace(body.Lang)
	if body.TxID == "" || body.Feature == "" || len(body.Review) == 0 {
		return false
	}
	if _, err := mail.ParseAddress(body.Email); err != nil {
		return false
	}
	return true
}

// handleErrataConfirm 站主确认链接：校验 HMAC 签名后通过申请，并把解析邮件发至访客邮箱
func (s *Server) handleErrataConfirm(w http.ResponseWriter, r *http.Request) {
	id := r.URL.Query().Get("id")
	sig := r.URL.Query().Get("sig")
	if id == "" || !s.checkConfirmSig(id, sig) {
		http.Error(w, "invalid or expired link", http.StatusForbidden)
		return
	}
	e, ok := s.ec.find(id)
	if !ok {
		http.Error(w, "claim not found", http.StatusNotFound)
		return
	}
	if e.Status != ecPending {
		s.renderErrataConfirmResult(w, e, "already")
		return
	}
	s.ec.setStatus(e.ID, ecApproved)
	e, _ = s.ec.find(id)
	go s.notifyErrataApprovedUser(e)
	log.Printf("errata claim approved: id=%s feature=%s txid=%s", e.ID, e.Feature, e.TxID)
	s.renderErrataConfirmResult(w, e, "approved")
}

// errataConfirmLink 站主确认邮件中的链接（HMAC 签名，复用 adminSecret，与 record-confirm 同密钥不同路径）
func (s *Server) errataConfirmLink(id string) string {
	mac := hmac.New(sha256.New, []byte(s.cfg.Pro.AdminSecret))
	mac.Write([]byte(id))
	sig := hex.EncodeToString(mac.Sum(nil))
	base := strings.TrimRight(s.cfg.Site.URL, "/")
	return fmt.Sprintf("%s/api/errata/confirm?id=%s&sig=%s", base, id, sig)
}

// notifyErrataClaimOwner 发站主确认邮件（含付费项/金额/错题数/TXID/邮箱 + 一键确认链接）
func (s *Server) notifyErrataClaimOwner(e errataVerifyEntry) {
	m := s.cfg.Mail
	if !m.Configured() || s.cfg.Pro.AdminEmail == "" || s.cfg.Pro.AdminSecret == "" {
		return
	}
	text := fmt.Sprintf(
		"错题解析付费解锁申请待核验：\n\n付费项：%s\n错题数：%d\n金额：¥%.2f\n用户邮箱：%s\n交易号(TXID)：%s\n提交时间：%s\n\n"+
			"请到收款账户按 TXID 备注（或金额+时间）核对这笔入账，确认收款后点击：%s\n\n核验通过后错题解析将自动发送至用户邮箱。",
		sanitizeMailField(e.Feature), e.Count, e.Amount, e.Email, sanitizeMailField(e.TxID), e.CreatedAt, s.errataConfirmLink(e.ID),
	)
	if err := sendMail(m, s.cfg.Pro.AdminEmail, "[Toolbox] 错题解析解锁申请 "+e.TxID, text); err != nil {
		log.Printf("errata claim notify owner failed: id=%s err=%v", e.ID, err)
	}
}

// notifyErrataApprovedUser 通知访客并把完整错题解析以纯文本邮件发送
func (s *Server) notifyErrataApprovedUser(e errataVerifyEntry) {
	m := s.cfg.Mail
	if !m.Configured() {
		return
	}
	text := buildErrataMailText(e, s.cfg.Site.URL)
	if err := sendMail(m, e.Email, "[Toolbox] 你的错题解析", text); err != nil {
		log.Printf("errata notify user failed: id=%s err=%v", e.ID, err)
	}
}

// buildErrataMailText 构造访客邮件正文：按申请语言渲染全部错题（题干/选项/你的选择/正确答案/解析）
func buildErrataMailText(e errataVerifyEntry, siteURL string) string {
	lang := e.Lang
	if lang != "en" {
		lang = "zh" // 默认中文
	}
	youPicked := i18nField(lang, "你选的", "You picked")
	correct := i18nField(lang, "正确答案", "Correct answer")
	expl := i18nField(lang, "解析", "Explanation")
	noExpl := i18nField(lang, "暂无解析", "No explanation available")
	unanswered := i18nField(lang, "未作答", "Unanswered")
	var b strings.Builder
	fmt.Fprintf(&b, "%s\n\n", i18nField(lang,
		fmt.Sprintf("你的错题解析如下（共 %d 题）：", e.Count),
		fmt.Sprintf("Here is your error analysis (%d questions):", e.Count)))
	for i, r := range e.Review {
		fmt.Fprintf(&b, "【%s %d】\n", i18nField(lang, "第", "Q"), i+1)
		fmt.Fprintf(&b, "%s：%s\n", i18nField(lang, "题干", "Stem"), pickText(r.Q, lang))
		writeOptions(&b, r.Options, lang)
		fmt.Fprintf(&b, "%s：%s\n", youPicked, optText(r.UserPick, r.Options, lang, unanswered))
		fmt.Fprintf(&b, "%s：%s\n", correct, optText(r.Correct, r.Options, lang, unanswered))
		fmt.Fprintf(&b, "%s：%s\n\n", expl, explText(r.Explanation, lang, noExpl))
	}
	b.WriteString(i18nField(lang, "感谢支持 Toolbox。", "Thanks for supporting Toolbox."))
	footer := b.String()
	if u := strings.TrimSpace(siteURL); u != "" {
		footer = fmt.Sprintf("%s\n%s", footer, u)
	}
	return footer
}

// writeOptions 把 4 个选项写成 A./B./C./D. 行（题号顺序固定，避免乱序混淆）
func writeOptions(b *strings.Builder, opts []bilingualText, lang string) {
	for j, op := range opts {
		fmt.Fprintf(b, "  %s. %s\n", optionLetter(j), pickText(op, lang))
	}
}

// explText 取解析文案；无解析则降级 noExpl
func explText(expl *bilingualText, lang, noExpl string) string {
	if expl == nil {
		return noExpl
	}
	if t := pickText(*expl, lang); t != "" {
		return t
	}
	return noExpl
}

// optText 取选项文案；idx<0（未作答）返回 unanswered
func optText(idx int, opts []bilingualText, lang, unanswered string) string {
	if idx < 0 || idx >= len(opts) {
		return unanswered
	}
	return pickText(opts[idx], lang)
}

// pickText 按语言取双语字段（en 取 EN，否则取 ZH）
func pickText(bt bilingualText, lang string) string {
	if lang == "en" {
		return bt.EN
	}
	return bt.ZH
}

// optionLetter 0..3 → A..D
func optionLetter(j int) string {
	if j < 0 || j > 25 {
		return "?"
	}
	return string(rune('A' + j))
}

// i18nField 按语言取中英文案（en 取 en 文案，否则取 zh 文案）
func i18nField(lang, zh, en string) string {
	if lang == "en" {
		return en
	}
	return zh
}

// renderErrataConfirmResult 渲染站主点击确认后的结果页（纯静态 HTML，无需前端）
func (s *Server) renderErrataConfirmResult(w http.ResponseWriter, e errataVerifyEntry, kind string) {
	var msg string
	switch kind {
	case "approved":
		msg = "✅ 已核验通过，错题解析已发送至用户邮箱。"
	case "already":
		msg = "ℹ️ 该申请已处理过（状态：" + e.Status + "），无需重复操作。"
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_, _ = fmt.Fprintf(w, `<!doctype html><html lang="zh"><head><meta charset="utf-8"><title>错题解析核验</title></head>
<body style="font-family:system-ui;max-width:480px;margin:80px auto;text-align:center;color:#333">
<h2>%s</h2><p>申请 ID: %s</p><a href="%s">返回 Toolbox</a></body></html>`,
		msg, e.ID, strings.TrimRight(s.cfg.Site.URL, "/")+"/")
}
