package web

import (
	"encoding/base64"
	"fmt"
	"net/smtp"

	"toolbox/internal/config"
)

// sendMail 发送一封纯文本邮件（支持 465 隐式 TLS 与 587 STARTTLS）。
// 用于 Pro 核销通知：作者确认邮件、用户生效邮件。失败由调用方记录，不阻塞主流程。
func sendMail(m config.MailConfig, to, subject, text string) error {
	from := m.From
	body := buildTextMail(from, to, subject, text)
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.User, m.Pass, m.Host)
	if m.Port == 465 {
		return sendTLS(addr, m.Host, auth, from, []string{to}, body)
	}
	return smtp.SendMail(addr, auth, from, []string{to}, body)
}

// buildTextMail 构造符合 RFC 5322 的纯文本邮件（UTF-8 + Base64 主题防乱码）
func buildTextMail(from, to, subject, text string) []byte {
	return []byte(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: =?UTF-8?B?%s?=\r\n"+
			"MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n%s",
		from, to, base64.StdEncoding.EncodeToString([]byte(subject)), text,
	))
}
