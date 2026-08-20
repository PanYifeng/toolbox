package web

import (
	"encoding/base64"
	"fmt"
	"net/smtp"
	"time"

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

// sendMailWithAttachment 发送一封带 PNG 附件的 multipart 邮件。
// 用于人格测试完整版付费报告：正文为画像纯文本，金纪念卡 PNG 作为附件送达。
func sendMailWithAttachment(m config.MailConfig, to, subject, textBody string, png []byte, filename string) error {
	from := m.From
	body := buildMultipartMail(from, to, subject, textBody, png, filename)
	addr := fmt.Sprintf("%s:%d", m.Host, m.Port)
	auth := smtp.PlainAuth("", m.User, m.Pass, m.Host)
	if m.Port == 465 {
		return sendTLS(addr, m.Host, auth, from, []string{to}, body)
	}
	return smtp.SendMail(addr, auth, from, []string{to}, body)
}

// buildMultipartMail 构造 multipart/mixed 邮件：UTF-8 纯文本正文 + PNG 附件（主题 Base64 防乱码）
func buildMultipartMail(from, to, subject, textBody string, png []byte, filename string) []byte {
	boundary := fmt.Sprintf("tb%d", time.Now().UnixNano())
	header := fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: =?UTF-8?B?%s?=\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n",
		from, to, base64.StdEncoding.EncodeToString([]byte(subject)), boundary,
	)
	textPart := fmt.Sprintf(
		"--%s\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n%s\r\n",
		boundary, textBody,
	)
	imgPart := fmt.Sprintf(
		"--%s\r\nContent-Type: image/png; name=\"%s\"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"%s\"\r\n\r\n",
		boundary, filename, filename,
	)
	b64 := base64.StdEncoding.EncodeToString(png)
	end := fmt.Sprintf("\r\n--%s--\r\n", boundary)
	return []byte(header + textPart + imgPart + b64 + end)
}
