package web

import (
	"bytes"
	_ "embed"
	"math"
	"regexp"
	"strconv"
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
	pdfRadarRadius = 32.0 // 雷达图半径（mm）
	pdfRadarRings  = 4    // 雷达网格圈数
	pdfRadarMinDim = 3    // 雷达最少维度数（少于则不绘制）
	pdfRadarR      = 14   // 雷达强调色 R 分量（大五青绿 #0E7C86）
	pdfRadarG      = 124 // 雷达强调色 G 分量
	pdfRadarB      = 134 // 雷达强调色 B 分量
)

// renderPDFReport 把人格报告纯文本渲染为 A4 PDF：== 段标题 == 解析、正文自动折行、自动分页。
// report 为客户端 buildFullReport 生成的分段文本；title 作文档大标题。
func renderPDFReport(report, title, name, lang string) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(pdfMarginX, pdfMarginTop, pdfMarginX)
	pdf.SetAutoPageBreak(true, pdfMarginBot)
	pdf.AddUTF8FontFromBytes("mh", "", microheiFont)
	pdf.SetFillColor(pdfAccent, pdfAccent, pdfAccent) // 段标题色条
	pdf.AddPage()
	renderPDFTitle(pdf, title, name, lang)
	renderPDFBody(pdf, report)
	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// renderPDFTitle 渲染文档大标题（居中、大字号）+ 可选持证人姓名行（居中小字、下方留白）
func renderPDFTitle(pdf *gofpdf.Fpdf, title, name, lang string) {
	title = strings.TrimSpace(title)
	if title == "" {
		return
	}
	pdf.SetFont("mh", "", pdfTitleSize)
	pdf.MultiCell(0, pdfTitleLineH, title, "", "C", false)
	pdf.Ln(2.0)
	// 持证人姓名行：name 空则跳过（仅留白）；标签按访客语言取中英
	name = strings.TrimSpace(name)
	if name == "" {
		pdf.Ln(1.5)
		return
	}
	label := "Holder"
	if lang == "" || strings.HasPrefix(lang, "zh") {
		label = "持证人"
	}
	pdf.SetFont("mh", "", 12.0)
	pdf.MultiCell(0, 6.0, label+": "+name, "", "C", false)
	pdf.Ln(3.0)
}

// renderPDFBody 逐行解析报告文本：== 段标题 == 走标题渲染，其余走正文折行渲染。
// 维度详解段结束后自动插入人格画像雷达图（Big Five / DISC 适用）。
func renderPDFBody(pdf *gofpdf.Fpdf, report string) {
	dims := parseRadarDims(report)
	radarDrawn := false
	inDimSection := false
	lines := strings.Split(report, "\n")
	for _, raw := range lines {
		line := strings.TrimRight(raw, " \t\r")
		if strings.TrimSpace(line) == "" {
			pdf.Ln(2.2) // 空行作段间留白
			continue
		}
		if sec := extractSection(line); sec != "" {
			// 离开维度详解段时在段尾插入雷达图
			if inDimSection && !radarDrawn && len(dims) >= pdfRadarMinDim {
				renderPDFRadar(pdf, dims)
				radarDrawn = true
			}
			inDimSection = false
			renderPDFSectionHeader(pdf, sec)
			continue
		}
		if isRadarDimLine(line) {
			inDimSection = true
		}
		renderPDFBodyLine(pdf, line)
	}
	// 兜底：维度段为报告末段时补绘雷达图
	if inDimSection && !radarDrawn && len(dims) >= pdfRadarMinDim {
		renderPDFRadar(pdf, dims)
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

// renderPDFBodyLine 渲染正文一行：先按页宽预折行再交 MultiCell，规避 gofpdf 对无空格 CJK 折行丢字 bug。
func renderPDFBodyLine(pdf *gofpdf.Fpdf, line string) {
	pdf.SetFont("mh", "", pdfBodySize)
	pageW, _ := pdf.GetPageSize()
	avail := pageW - 2*pdfMarginX - 2.5 // 可用文字宽度，留 2.5mm 安全量（cell margin + 取整）
	pdf.MultiCell(0, pdfBodyLineH, wrapCJKLine(pdf, line, avail), "", "L", false)
}

// wrapCJKLine 按 avail 宽度贪心折行（插入 \n），使每段不超宽。
// 规避 gofpdf MultiCell 对无空格 CJK 折行时 sep=i、i=sep+1 跳过溢出字符导致丢字。
func wrapCJKLine(pdf *gofpdf.Fpdf, line string, avail float64) string {
	if line == "" {
		return line
	}
	var b strings.Builder
	seg := make([]rune, 0, 64)
	for _, r := range line {
		seg = append(seg, r)
		if len(seg) > 1 && pdf.GetStringWidth(string(seg)) > avail {
			last := seg[len(seg)-1]
			seg = seg[:len(seg)-1]
			b.WriteString(string(seg))
			b.WriteByte('\n')
			seg = seg[:0]
			seg = append(seg, last)
		}
	}
	b.WriteString(string(seg))
	return b.String()
}

// radarDimRe 匹配维度行"维度名 NN% [band]"，捕获组 1=维度名、2=百分位数值
var radarDimRe = regexp.MustCompile(`(?m)^(.+?)\s+(\d+)%\s*\[`)

// radarDim 为雷达图的一个维度数据（名称 + 百分位）
type radarDim struct {
	name string
	pct  float64
}

// parseRadarDims 从报告全文提取维度雷达数据：扫描所有"维度名 NN% [band]"行
func parseRadarDims(report string) []radarDim {
	matches := radarDimRe.FindAllStringSubmatch(report, -1)
	dims := make([]radarDim, 0, len(matches))
	for _, m := range matches {
		pct, err := strconv.ParseFloat(strings.TrimSpace(m[2]), 64)
		if err != nil {
			continue
		}
		dims = append(dims, radarDim{name: strings.TrimSpace(m[1]), pct: pct})
	}
	return dims
}

// isRadarDimLine 判断单行是否为维度行，用于标记进入维度详解段
func isRadarDimLine(line string) bool {
	return radarDimRe.MatchString(line)
}

// radarVertex 计算第 i 个轴、百分位 pct 对应的顶点坐标（起点正上、顺时针，与 radar.js 一致）
func radarVertex(i, n int, pct, radius, cx, cy float64) (float64, float64) {
	angle := 2.0*math.Pi*float64(i)/float64(n) - math.Pi/2.0
	r := radius * (pct / 100.0)
	if r < 0 {
		r = 0
	}
	return cx + r*math.Cos(angle), cy + r*math.Sin(angle)
}

// renderPDFRadar 在当前位置绘制人格画像雷达图：标题 + 网格 + 轴线 + 数据多边形 + 标签
func renderPDFRadar(pdf *gofpdf.Fpdf, dims []radarDim) {
	n := len(dims)
	if n < pdfRadarMinDim {
		return
	}
	// 整体高度不足时换页，避免雷达越过下边距（含标签外侧留白）
	_, pageH := pdf.GetPageSize()
	footprint := pdfRadarRadius*2 + 36.0
	if pdf.GetY()+footprint > pageH-pdfMarginBot {
		pdf.AddPage()
	}
	cx, cy := renderPDFRadarCaption(pdf)
	renderPDFRadarGrid(pdf, n, cx, cy)
	renderPDFRadarAxes(pdf, n, cx, cy)
	renderPDFRadarData(pdf, dims, cx, cy)
	renderPDFRadarLabels(pdf, dims, cx, cy)
	// 预留底部空间并复位颜色，避免污染后续段标题色条
	pdf.SetY(cy + pdfRadarRadius + 11.0)
	pdf.SetFillColor(pdfAccent, pdfAccent, pdfAccent)
	pdf.SetTextColor(0, 0, 0)
}

// renderPDFRadarCaption 渲染雷达标题并返回雷达中心坐标（居中、上方留半径+12）
func renderPDFRadarCaption(pdf *gofpdf.Fpdf) (cx, cy float64) {
	pdf.Ln(2)
	pdf.SetFont("mh", "", 11)
	pdf.SetTextColor(40, 40, 40)
	pdf.SetX(pdfMarginX)
	pdf.MultiCell(0, 6, "人格画像雷达", "", "C", false)
	pdf.Ln(1)
	pageW, _ := pdf.GetPageSize()
	cx = pageW / 2.0
	cy = pdf.GetY() + pdfRadarRadius + 12.0
	return cx, cy
}

// renderPDFRadarGrid 绘制同心多边形网格圈（从内到外 4 圈）
func renderPDFRadarGrid(pdf *gofpdf.Fpdf, n int, cx, cy float64) {
	pdf.SetDrawColor(215, 215, 215)
	pdf.SetLineWidth(0.18)
	for ring := 1; ring <= pdfRadarRings; ring++ {
		pct := 100.0 * float64(ring) / float64(pdfRadarRings)
		pts := make([]gofpdf.PointType, 0, n)
		for i := 0; i < n; i++ {
			x, y := radarVertex(i, n, pct, pdfRadarRadius, cx, cy)
			pts = append(pts, gofpdf.PointType{X: x, Y: y})
		}
		pdf.Polygon(pts, "D")
	}
}

// renderPDFRadarAxes 绘制从中心到各外顶点的轴线
func renderPDFRadarAxes(pdf *gofpdf.Fpdf, n int, cx, cy float64) {
	pdf.SetDrawColor(215, 215, 215)
	pdf.SetLineWidth(0.18)
	for i := 0; i < n; i++ {
		x, y := radarVertex(i, n, 100.0, pdfRadarRadius, cx, cy)
		pdf.Line(cx, cy, x, y)
	}
}

// renderPDFRadarData 绘制半透明填充的数据多边形 + 顶点圆点
func renderPDFRadarData(pdf *gofpdf.Fpdf, dims []radarDim, cx, cy float64) {
	n := len(dims)
	pts := make([]gofpdf.PointType, 0, n)
	pdf.SetFillColor(pdfRadarR, pdfRadarG, pdfRadarB)
	pdf.SetDrawColor(pdfRadarR, pdfRadarG, pdfRadarB)
	pdf.SetLineWidth(0.5)
	for i, d := range dims {
		x, y := radarVertex(i, n, d.pct, pdfRadarRadius, cx, cy)
		pts = append(pts, gofpdf.PointType{X: x, Y: y})
	}
	pdf.Polygon(pts, "FD")
	for i, d := range dims {
		x, y := radarVertex(i, n, d.pct, pdfRadarRadius, cx, cy)
		pdf.Circle(x, y, 0.8, "F")
	}
}

// renderPDFRadarLabels 在各顶点外侧标注维度名 + 百分位。
// 方向感知锚点：右半顶点左对齐自顶点向右展开、左半顶点右对齐向左展开、
// 上下顶点居中——避免固定宽度居中格在正左/正右顶点处内半宽伸入多边形造成字图重合。
func renderPDFRadarLabels(pdf *gofpdf.Fpdf, dims []radarDim, cx, cy float64) {
	n := len(dims)
	pdf.SetFont("mh", "", 9)
	pdf.SetTextColor(60, 60, 60)
	const (
		labelH = 4.5  // 单行行高（mm）
		gap    = 5.0  // 顶点外侧到标签的间距（mm）
		maxW   = 50.0 // 标签单元格宽度上限（mm）
	)
	for i, d := range dims {
		ax, ay := radarVertex(i, n, 100.0, pdfRadarRadius+gap, cx, cy)
		label := d.name + " " + strconv.FormatFloat(d.pct, 'f', 0, 64) + "%"
		w := pdf.GetStringWidth(label) + 1.5 // 实测宽 + 安全余量，单行可容
		if w > maxW {
			w = maxW
		}
		align := "C"
		x := ax - w/2
		if ax > cx+1.0 { // 右半：左对齐，自顶点向右展开，不内伸
			align = "L"
			x = ax
		} else if ax < cx-1.0 { // 左半：右对齐，自顶点向左展开，不内伸
			align = "R"
			x = ax - w
		}
		y := ay - labelH/2
		if ay < cy-1.0 { // 上顶点：标签置于顶点上方
			y = ay - labelH - 1.0
		} else if ay > cy+1.0 { // 下顶点：标签置于顶点下方
			y = ay + 1.0
		}
		pdf.SetXY(x, y)
		pdf.MultiCell(w, labelH, label, "", align, false)
	}
}
