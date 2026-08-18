// OG 分享图 + PWA 图标生成器：用 Go 官方内嵌字体 gofont 绘制 PNG。
// 一次性运行：go run ./cmd/gen-og  → 生成 og.png / icon-192.png / icon-512.png
// 不进主二进制（主服务只 embed 生成的 png）。
package main

import (
	"fmt"
	"image"
	"image/color"
	"image/draw"
	"image/png"
	"log"
	"os"

	"golang.org/x/image/font"
	"golang.org/x/image/font/gofont/gobold"
	"golang.org/x/image/font/gofont/goregular"
	"golang.org/x/image/font/opentype"
	"golang.org/x/image/math/fixed"
)

const (
	imgDir  = "../../internal/web/static/img/"
	w, h    = 1200, 630
)

func main() {
	// OG 分享图
	og := image.NewRGBA(image.Rect(0, 0, w, h))
	drawGradient(og, w, h)
	drawIcon(og, 900, 180, 270)
	drawText(og, "Toolbox", 80, 230, 110, gobold.TTF, color.White)
	drawText(og, "All-in-one Developer Tools", 80, 320, 44, goregular.TTF, color.RGBA{220, 230, 255, 255})
	drawText(og, "34 个工具 · 纯前端 · 零成本 · 无需安装", 80, 560, 30, goregular.TTF, color.RGBA{200, 210, 235, 255})
	saveAt(imgDir+"og.png", og)
	log.Printf("generated %sog.png (%dx%d)", imgDir, w, h)

	// PWA 图标（Chrome/Edge 安装条件需 192 + 512 PNG）
	genIcon(192)
	genIcon(512)
}

// genIcon 生成指定尺寸的 PNG 应用图标（渐变背景 + 居中工具箱）
func genIcon(size int) {
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	drawGradient(img, size, size)
	s := size * 55 / 100
	x := (size - s) / 2
	y := (size - s) / 2
	drawIcon(img, x, y, s)
	p := fmt.Sprintf("%sicon-%d.png", imgDir, size)
	saveAt(p, img)
	log.Printf("generated %s (%dx%d)", p, size, size)
}

// drawGradient 垂直渐变背景（品牌蓝 #2563eb → #1e40af）
func drawGradient(img *image.RGBA, ww, hh int) {
	for y := 0; y < hh; y++ {
		t := float64(y) / float64(hh)
		c := blend(color.RGBA{37, 99, 235, 255}, color.RGBA{30, 64, 175, 255}, t)
		for x := 0; x < ww; x++ {
			img.SetRGBA(x, y, c)
		}
	}
}

// blend 线性插值两个颜色
func blend(a, b color.RGBA, t float64) color.RGBA {
	return color.RGBA{
		R: uint8(float64(a.R) + (float64(b.R)-float64(a.R))*t),
		G: uint8(float64(a.G) + (float64(b.G)-float64(a.G))*t),
		B: uint8(float64(a.B) + (float64(b.B)-float64(a.B))*t),
		A: 255,
	}
}

// drawText 用指定 TTF 字体在 (x,y) 绘制文字
func drawText(img *image.RGBA, text string, x, y, size int, ttf []byte, col color.Color) {
	parsed, err := opentype.Parse(ttf)
	if err != nil {
		log.Printf("parse font: %v", err)
		return
	}
	face, err := opentype.NewFace(parsed, &opentype.FaceOptions{
		Size: float64(size), DPI: 72, Hinting: font.HintingFull,
	})
	if err != nil {
		log.Printf("new face: %v", err)
		return
	}
	d := font.Drawer{
		Dst:  img,
		Src:  image.NewUniform(col),
		Face: face,
		Dot:  fixed.Point26_6{X: fixed.I(x), Y: fixed.I(y)},
	}
	d.DrawString(text)
}

// drawIcon 绘制简化工具箱图标（白色箱体 + 蓝色分隔条 + 把手）
func drawIcon(img *image.RGBA, x, y, s int) {
	white := image.NewUniform(color.White)
	blue := image.NewUniform(color.RGBA{37, 99, 235, 255})
	draw.Draw(img, image.Rect(x, y, x+s, y+s), white, image.Point{}, draw.Src)
	// 上沿分隔条
	mid := y + s*52/100
	draw.Draw(img, image.Rect(x, mid, x+s, mid+s*9/100), blue, image.Point{}, draw.Src)
	// 把手
	hx := x + s/2
	draw.Draw(img, image.Rect(hx-s*6/100, y-s*12/100, hx+s*6/100, y), white, image.Point{}, draw.Src)
}

// saveAt 写入指定路径的 PNG 文件
func saveAt(path string, img image.Image) {
	f, err := os.Create(path)
	if err != nil {
		log.Fatalf("create %s: %v", path, err)
	}
	defer f.Close()
	if err := png.Encode(f, img); err != nil {
		log.Fatalf("encode: %v", err)
	}
}
