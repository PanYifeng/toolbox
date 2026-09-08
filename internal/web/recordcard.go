package web

import (
	"bytes"
	"fmt"
	"strconv"
	"strings"

	"github.com/jung-kurt/gofpdf"
)

// 破纪录金版卡服务端渲染（站主确认到账后调用，作为邮件附件下发）。
// 复用 pdfreport.go 嵌入的微米黑字体；与 cert.js 客户端卡面并行——服务端卡用于
// "确认即邮件送达" 场景（用户可能已离开页面），客户端卡仍用于本页下载。
// microhei 无 emoji 字形，故服务端卡面不画 symbol，以游戏标题为中脊。

// recordGameTheme 破纪录卡渲染所需的主题要素（从 cert.js THEMES 移植，仅取渲染字段）。
type recordGameTheme struct {
	Primary string // 主色 #RRGGBB
	TitleZh string
	TitleEn string
	MsgZh   string
	MsgEn   string
}

// recordGameThemes 各游戏主题。键为 leaderboard 主题键（game-<name>，连字符）。
var recordGameThemes = map[string]recordGameTheme{
	"game-2048":        {"#E67E22", "2048 通关纪念卡", "2048 Clear-Stage Memorial Card", "方寸之间运筹帷幄，愿你于生活中亦能合二为一。", "Strategy within a small grid; may you merge what matters in life."},
	"game-snake":       {"#2E8B57", "贪吃蛇 通关纪念卡", "Snake Clear-Stage Memorial Card", "步步为营，生生不息，愿你越行越远。", "Step by step, endless growth; may you go ever farther."},
	"game-ttt":         {"#6D3BE6", "井字棋 通关纪念卡", "Tic-Tac-Toe Memorial Card", "攻守相宜，落子无悔，愿你常保从容。", "Balance attack and defense; may you stay composed."},
	"game-spider":      {"#8B2C5C", "蜘蛛纸牌 通关纪念卡", "Spider Solitaire Memorial Card", "抽丝剥茧，运筹帷幄，愿你于纷繁中理出头绪。", "Untangle the threads and plan ahead; may you find clarity in complexity."},
	"game-minesweeper": {"#1F6F8B", "扫雷 通关纪念卡", "Minesweeper Memorial Card", "步步推理，谨慎前行，愿你避开暗礁抵达彼岸。", "Reason step by step and proceed with care; may you steer past hidden reefs."},
	"game-tetris":      {"#3b82f6", "俄罗斯方块 通关纪念卡", "Tetris Memorial Card", "方寸之间进退有度，愿你于纷至沓来中从容不迫。", "Order within the falling blocks; may you stay composed as things pile up."},
	"game-match3":      {"#ec4899", "消消乐 通关纪念卡", "Match-3 Memorial Card", "巧手连消，步步生花，愿你于纷繁中理出条理。", "Clever clears, blossoming step by step; may you find order amid the colorful clutter."},
	"game-xiangqi":     {"#b91c1c", "中国象棋 通关纪念卡", "Xiangqi Memorial Card", "楚河汉界，运筹帷幄，愿你于攻守之间常握先机。", "Across the Chu River and Han border, strategy in mind; may you hold the initiative between attack and defense."},
	"game-chess":       {"#475569", "国际象棋 通关纪念卡", "Chess Memorial Card", "方寸棋盘，千变万化，愿你思虑周全、落子无悔。", "On a small board, infinite variation; may you think it through and play without regret."},
}

// fallbackRecordTheme 未知游戏用通用主题
var fallbackRecordTheme = recordGameTheme{"#5B4B9A", "通关纪念卡", "Clear-Stage Memorial Card", "玩得开心，愿你常保欢喜之心。", "Well played — may you keep a joyful heart."}

// renderRecordCardPDF 渲染破纪录金版卡为 PDF 字节（90×132mm 竖卡）。
func renderRecordCardPDF(game, name string, score int, timeStr, code string) ([]byte, error) {
	th := recordGameThemes[game]
	if th.Primary == "" {
		th = fallbackRecordTheme
	}
	r, g, b := hexRGB(th.Primary)
	pdf := gofpdf.NewCustom(&gofpdf.InitType{OrientationStr: "P", UnitStr: "mm", Size: gofpdf.SizeType{Wd: 90, Ht: 132}, FontDirStr: ""})
	pdf.SetMargins(0, 0, 0)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AddUTF8FontFromBytes("mh", "", microheiFont)
	pdf.AddPage()

	// 顶部金色绶带（双带模拟渐变）
	pdf.SetFillColor(255, 215, 0)
	pdf.Rect(0, 0, 90, 16, "F")
	pdf.SetFillColor(218, 165, 32)
	pdf.Rect(0, 13, 90, 3, "F")
	pdf.SetFont("mh", "", 11)
	pdf.SetTextColor(90, 60, 0)
	drawCenterFull(pdf, "MEMORIAL  ·  纪念卡", 5.5, 6)

	// 双层边框
	pdf.SetDrawColor(r, g, b)
	pdf.SetLineWidth(0.8)
	pdf.Rect(4, 20, 82, 108, "D")
	pdf.SetLineWidth(0.3)
	pdf.Rect(5.5, 21.5, 79, 105, "D")

	// 游戏标题（中 / 英）
	pdf.SetFont("mh", "", 16)
	pdf.SetTextColor(r, g, b)
	drawCenter(pdf, th.TitleZh, 30, 6)
	pdf.SetFont("mh", "", 8)
	pdf.SetTextColor(110, 110, 110)
	drawCenter(pdf, th.TitleEn, 37, 4)

	// 破纪录标识
	pdf.SetFont("mh", "", 10)
	pdf.SetTextColor(218, 165, 32)
	drawCenter(pdf, "破纪录  ·  RECORD", 45, 5)

	// 姓名 / 分数 / 时间
	pdf.SetFont("mh", "", 11)
	pdf.SetTextColor(40, 40, 40)
	drawCenter(pdf, "姓名 / Name: "+name, 54, 6)
	drawCenter(pdf, fmt.Sprintf("分数 / Score: %d", score), 61, 6)
	pdf.SetFont("mh", "", 8)
	pdf.SetTextColor(120, 120, 120)
	drawCenter(pdf, "完成时间 / Time: "+timeStr, 67.5, 4)

	// 防伪码（主色框 + 居中码）
	pdf.SetDrawColor(r, g, b)
	pdf.SetLineWidth(0.5)
	pdf.SetFillColor(255, 250, 235)
	pdf.Rect(15, 76, 60, 10, "FD")
	pdf.SetFont("mh", "", 12)
	pdf.SetTextColor(r, g, b)
	pdf.SetXY(15, 78.8)
	pdf.MultiCell(60, 6, code, "", "C", false)
	pdf.SetFont("mh", "", 6)
	pdf.SetTextColor(150, 150, 150)
	pdf.SetXY(15, 84.2)
	pdf.MultiCell(60, 3, "防伪码 / Anti-counterfeit", "", "C", false)

	// 寄语（中 / 英，居中折行）
	pdf.SetFont("mh", "", 9)
	pdf.SetTextColor(70, 70, 70)
	wrapCenter(pdf, th.MsgZh, 78, 92, 4.3)
	pdf.SetFont("mh", "", 7.5)
	pdf.SetTextColor(140, 140, 140)
	wrapCenter(pdf, th.MsgEn, 78, 108, 3.8)

	// 页脚
	pdf.SetFont("mh", "", 6)
	pdf.SetTextColor(160, 160, 160)
	pdf.SetXY(0, 124)
	pdf.MultiCell(90, 4, "Toolbox · 此卡为留念性质，非任何资格凭证 / A keepsake, not a credential.", "", "C", false)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

// drawCenter 在指定 y 行居中写一行，文本居于页中 78mm 区（左右各留 6mm）。
func drawCenter(pdf *gofpdf.Fpdf, text string, y, h float64) {
	pdf.SetXY(6, y)
	pdf.MultiCell(78, h, text, "", "C", false)
}

// drawCenterFull 在指定 y 行居中写一行，占满 90mm 页宽。
func drawCenterFull(pdf *gofpdf.Fpdf, text string, y, h float64) {
	pdf.SetXY(0, y)
	pdf.MultiCell(90, h, text, "", "C", false)
}

// wrapCenter 居中自动折行多行文本，宽度 w 居于 90mm 页中。
func wrapCenter(pdf *gofpdf.Fpdf, text string, w, y, lineH float64) {
	pdf.SetXY((90-w)/2, y)
	pdf.MultiCell(w, lineH, text, "", "C", false)
}

// hexRGB 解析 #RRGGBB 为 0-255 三分量；非法则回退主题紫。
func hexRGB(hex string) (int, int, int) {
	h := strings.TrimPrefix(hex, "#")
	if len(h) != 6 {
		return 91, 74, 154
	}
	ri, err := strconv.ParseInt(h[0:2], 16, 0)
	if err != nil {
		return 91, 74, 154
	}
	gi, err := strconv.ParseInt(h[2:4], 16, 0)
	if err != nil {
		return 91, 74, 154
	}
	bi, err := strconv.ParseInt(h[4:6], 16, 0)
	if err != nil {
		return 91, 74, 154
	}
	return int(ri), int(gi), int(bi)
}
