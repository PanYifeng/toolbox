package web

import (
	"crypto/tls"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"net/smtp"
	"strings"
	"time"

	"toolbox/internal/config"
)

// certRequest 纪念卡发送请求
type certRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Score    int    `json:"score"`
	Code     string `json:"code"`
	PNG      string `json:"png"`      // data:image/png;base64,.... 或纯 base64
	Religion string `json:"religion"`
}

// handleCertSend 将生成的纪念卡 PNG 发送到用户邮箱（需配置 SMTP）。
// 邮件发送是唯一需要出站网络的功能；未配置时返回 503，前端回退到下载。
func (s *Server) handleCertSend(w http.ResponseWriter, r *http.Request) {
	var req certRequest
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 6<<20)).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]any{"ok": false, "message": "invalid request"})
		return
	}
	if _, err := mail.ParseAddress(req.Email); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]any{"ok": false, "message": "invalid email"})
		return
	}
	m := s.cfg.Mail
	if !m.Configured() {
		w.WriteHeader(http.StatusServiceUnavailable)
		writeJSON(w, map[string]any{"ok": false, "message": "email service not configured"})
		return
	}
	pngBytes, err := decodePNG(req.PNG)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]any{"ok": false, "message": "invalid image"})
		return
	}
	if err := sendMemorialMail(m, req, pngBytes); err != nil {
		log.Printf("cert mail send failed: %v", err)
		w.WriteHeader(http.StatusBadGateway)
		writeJSON(w, map[string]any{"ok": false, "message": "send failed"})
		return
	}
	writeJSON(w, map[string]any{"ok": true})
}

// decodePNG 解析 dataURL 或纯 base64 的 PNG
func decodePNG(s string) ([]byte, error) {
	if i := strings.Index(s, ","); i >= 0 && strings.HasPrefix(s, "data:") {
		s = s[i+1:]
	}
	return base64.StdEncoding.DecodeString(s)
}

// sendMemorialMail 构造 multipart 邮件并发送，支持 465 隐式 TLS 与 587 STARTTLS
func sendMemorialMail(m config.MailConfig, req certRequest, png []byte) error {
	from := m.From
	to := req.Email
	subject := fmt.Sprintf("Toolbox 纪念卡 / Memorial Card — %s", req.Name)
	body := buildMailBody(req, png, from, to, subject)
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.User, m.Pass, m.Host)

	if m.Port == 465 {
		return sendTLS(addr, m.Host, auth, from, []string{to}, body)
	}
	return smtp.SendMail(addr, auth, from, []string{to}, body)
}

// sendTLS 通过隐式 TLS（465）发送邮件
func sendTLS(addr, host string, auth smtp.Auth, from string, to []string, body []byte) error {
	conn, err := tls.Dial("tcp", addr, &tls.Config{ServerName: host})
	if err != nil {
		return err
	}
	defer conn.Close()
	c, err := smtp.NewClient(conn, host)
	if err != nil {
		return err
	}
	defer c.Quit()
	if err = c.Auth(auth); err != nil {
		return err
	}
	if err = c.Mail(from); err != nil {
		return err
	}
	for _, rcpt := range to {
		if err = c.Rcpt(rcpt); err != nil {
			return err
		}
	}
	w, err := c.Data()
	if err != nil {
		return err
	}
	if _, err = w.Write(body); err != nil {
		return err
	}
	return w.Close()
}

// buildMailBody 构造 multipart/mixed 邮件：正文 + PNG 附件
func buildMailBody(req certRequest, png []byte, from, to, subject string) []byte {
	boundary := fmt.Sprintf("tb%d", time.Now().UnixNano())
	text := fmt.Sprintf("%s\n\n姓名 / Name: %s\n分数 / Score: %d\n防伪码 / Anti-counterfeit: %s\n\n（纪念卡为附件 PNG，请查收。）\nThis is a project keepsake, not a religious credential.",
		"感谢参与宗教文化学习，纪念卡见附件。", req.Name, req.Score, req.Code)
	header := fmt.Sprintf("From: %s\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n",
		from, to, subject, boundary)
	textPart := fmt.Sprintf("--%s\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n%s\r\n",
		boundary, text)
	imgPart := fmt.Sprintf("--%s\r\nContent-Type: image/png; name=\"memorial.png\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"memorial.png\"\r\n\r\n",
		boundary)
	b64 := base64.StdEncoding.EncodeToString(png)
	end := fmt.Sprintf("\r\n--%s--\r\n", boundary)
	return []byte(header + textPart + imgPart + b64 + end)
}
