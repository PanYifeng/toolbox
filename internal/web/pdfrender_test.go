package web

import (
	"os"
	"testing"
)

// TestRadarRenderSample 渲染含维度详解段的样例报告到 /tmp，便于本地肉眼核验雷达标签是否与多边形重合。
// 跑：go test ./internal/web -run TestRadarRenderSample -v
func TestRadarRenderSample(t *testing.T) {
	cases := []struct {
		name string
		lang string
		rep  string
	}{
		{
			"mbti",
			"zh",
			"== 维度详解 ==\n" +
				"外向 / 内向 87% [清晰偏好]（E 2 / I 13）\n" +
				"实感 / 直觉 67% [中等偏好]（S 10 / N 5）\n" +
				"思考 / 情感 53% [轻微偏好]（T 8 / F 7）\n" +
				"判断 / 感知 87% [清晰偏好]（J 13 / P 2）\n" +
				"\n== 优势与盲点 ==\n" +
				"你在结构化与可靠性上表现突出。\n",
		},
		{
			"big5",
			"zh",
			"== 维度详解 ==\n" +
				"开放性 65% [偏高]\n" +
				"尽责性 40% [偏低]\n" +
				"外向性 70% [偏高]\n" +
				"宜人性 55% [中等]\n" +
				"神经质 30% [偏低]\n" +
				"\n== 优势与盲点 ==\n" +
				"你在创新与社交上表现突出。\n",
		},
	}
	for _, c := range cases {
		out := "/tmp/radar-" + c.name + ".pdf"
		b, err := renderPDFReport(c.rep, c.name+" 人格报告", "张三", c.lang)
		if err != nil {
			t.Fatalf("render %s: %v", c.name, err)
		}
		if err := os.WriteFile(out, b, 0644); err != nil {
			t.Fatalf("write %s: %v", out, err)
		}
		t.Logf("wrote %s (%d bytes)", out, len(b))
	}
}
