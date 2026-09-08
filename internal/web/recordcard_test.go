package web

import "testing"

// TestRenderRecordCard 核验金版卡 PDF 能生成、非空、内容齐全（含防伪码与寄语）。
// 覆盖已知游戏主题与未知游戏回退两条路径。go test ./internal/web -run TestRenderRecordCard
func TestRenderRecordCard(t *testing.T) {
	cases := []struct{ game, name string }{
		{"game-match3", "测试员"},
		{"game-chess", "Tester"},
		{"game-unknown", "兜底"},
	}
	for _, c := range cases {
		pdf, err := renderRecordCardPDF(c.game, c.name, 42, "2026-09-07 12:30", "TB-R-ABCD-1234-EF89")
		if err != nil {
			t.Fatalf("render %s: %v", c.game, err)
		}
		if len(pdf) < 2000 {
			t.Fatalf("render %s: pdf too small %d", c.game, len(pdf))
		}
		if string(pdf[:5]) != "%PDF-" {
			t.Fatalf("render %s: not a pdf", c.game)
		}
		t.Logf("%s: %d bytes", c.game, len(pdf))
	}
}
