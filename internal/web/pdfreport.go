package web

import (
	"bytes"
	_ "embed"
	"strings"

	"github.com/jung-kurt/gofpdf"
)

// 嵌入文泉驿微米黑 TTF（开源、覆盖常用中日韩字符），供 gofpdf 渲染中文 PDF。
//go:embed fonts/wqy-microhei.ttf
var microheiFont []byte

const (
	pdfMarginX     = 15.0 // 左右边距（mm）
	pdfMarginTop   = 16.0 // 上边距（mm）
	pdfMarginBot   = 15.0 // 下边距（mm）
	pdfBodySize    = 10.5 // 正文字号（pt）
	pdfHeaderSize  = 13.0 // 段标题字号（pt）
	pdfTitleSize   = 19.0 // 文档标题字号（pt）
	pdfBodyLineH   = 5.6  // 正文行高（mm）
	pdfHeaderLineH = 7.0  // 段标题行高（mm）
	pdfTitleLineH  = 9.0  // 文档标题行高（mm）
	pdfAccent      = 90   // 段标题左侧色条色值（深灰）
)

// renderPDFReport 把人格报告纯文本渲染为 A4 PDF：== 段标题 == 解析、正文自动折行、自动分页。
// report 为客户端 buildFullReport 生成的分段文本；title 作文档大标题。
func renderPDFReport(report, title string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(pdfMarginX, pdfMarginTop, pdfMarginX)
	pdf.SetAutoPageBreak(true, pdfMarginBot)
	pdf.AddUTF8FontFromBytes("mh", "", microheiFont)
	pdf.SetFillColor(pdfAccent, pdfAccent, pdfAccent) // 段标题色条
	pdf.AddPage()
	renderPDFTitle(pdf, title)
	renderPDFBody(pdf, report)
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// renderPDFTitle 渲染文档大标题（居中、大字号、下方留白）
func renderPDFTitle(pdf *gofpdf.Fpdf, title string) {
	title = strings.TrimSpace(title)
	if title == "" {
		return
	}
	pdf.SetFont("mh", "", pdfTitleSize)
	pdf.MultiCell(0, pdfTitleLineH, title, "", "C", false)
	pdf.Ln(3.5)
}

// renderPDFBody 逐行解析报告文本：== 段标题 == 走标题渲染，其余走正文折行渲染
func renderPDFBody(pdf *gofpdf.Fpdf, report string) {
	lines := strings.Split(report, "\n")
	for _, raw := range lines {
		line := strings.TrimRight(raw, " \t\r")
		if strings.TrimSpace(line) == "" {
			pdf.Ln(2.2) // 空行作段间留白
			continue
		}
		if sec := extractSection(line); sec != "" {
			renderPDFSectionHeader(pdf, sec)
			continue
		}
		renderPDFBodyLine(pdf, line)
	}
}

// extractSection 判断一行是否为 == 段标题 == 格式，是则返回去标记后的标题文本，否则空串
func extractSection(line string) string {
	t := strings.TrimSpace(line)
	if !strings.HasPrefix(t, "==") || !strings.HasSuffix(t, "==") {
		return ""
	}
	return strings.TrimSpace(strings.TrimSuffix(strings.TrimPrefix(t, "=="), "=="))
}

// renderPDFSectionHeader 渲染段标题：左侧短色条 + 加大字号 + 段后留白
func renderPDFSectionHeader(pdf *gofpdf.Fpdf, sec string) {
	pdf.Ln(1.5)
	pdf.SetFont("mh", "", pdfHeaderSize)
	// 左侧 2mm 宽色条作视觉锚点
	pdf.Rect(pdfMarginX, pdf.GetY(), 2, pdfHeaderLineH-1, "F")
	pdf.SetX(pdfMarginX + 4)
	pdf.MultiCell(0, pdfHeaderLineH, sec, "", "L", false)
	pdf.Ln(1.5)
}

// renderPDFBodyLine 渲染正文一行：自动折行适配页宽，超过页底自动分页
func renderPDFBodyLine(pdf *gofpdf.Fpdf, line string) {
	pdf.SetFont("mh", "", pdfBodySize)
	pdf.MultiCell(0, pdfBodyLineH, line, "", "L", false)
}
