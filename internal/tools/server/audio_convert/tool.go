package audio_convert

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"toolbox/internal/tools"
)

// 输入格式白名单（带前后导点，便于子串匹配）
const inputExtWhitelist = ".mp3.wav.flac.ogg.m4a.aac.opus.wma."

// codecByFmt 目标格式 → 音频编码
var codecByFmt = map[string]string{
	"mp3":  "libmp3lame",
	"wav":  "pcm_s16le",
	"flac": "flac",
	"ogg":  "libvorbis",
	"m4a":  "aac",
}

// Tool 音频转换工具（基于 ffmpeg）
type Tool struct {
	workDir string
}

func init() {
	dir, err := os.MkdirTemp("", "toolbox-audio-*")
	if err != nil {
		dir = ".toolbox-audio"
		_ = os.MkdirAll(dir, 0o755)
	}
	t := &Tool{workDir: dir}
	tools.Register(t)
	go t.cleanupLoop()
}

// Manifest 工具元信息
func (t *Tool) Manifest() tools.Manifest {
	return tools.Manifest{
		ID:       "audio_convert",
		Name:     "音频转换",
		Category: "音频",
	}
}

// Submit 执行音频转码，返回输出文件路径
func (t *Tool) Submit(ctx context.Context, p tools.SubmitParams) (string, error) {
	if p.File == nil {
		return "", fmt.Errorf("no file uploaded")
	}
	if p.File.Size <= 0 {
		return "", fmt.Errorf("empty file")
	}
	src := strings.ToLower(filepath.Ext(p.File.FileName))
	if !strings.Contains(inputExtWhitelist, src+".") {
		return "", fmt.Errorf("unsupported input format: %s", src)
	}
	target := p.Params["format"]
	codec, ok := codecByFmt[target]
	if !ok {
		return "", fmt.Errorf("unsupported output format: %s", target)
	}
	outPath := filepath.Join(t.workDir, fmt.Sprintf("%d-out.%s", time.Now().UnixNano(), target))
	// 安全加固：同 video_convert（协议白名单阻断 SSRF、单线程、时长/体积上限）
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-nostdin", "-y",
		"-protocol_whitelist", "file",
		"-i", p.File.Path,
		"-threads", "1",
		"-vn",
		"-c:a", codec,
		"-t", "1800", "-fs", "300M",
		outPath)
	if out, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(outPath)
		return "", fmt.Errorf("ffmpeg failed: %w: %s", err, string(out))
	}
	return outPath, nil
}

// cleanupLoop 定期清理过期产物
func (t *Tool) cleanupLoop() {
	for range time.Tick(30 * time.Minute) {
		t.cleanup()
	}
}

// cleanup 删除超过 1 小时的文件
func (t *Tool) cleanup() {
	entries, err := os.ReadDir(t.workDir)
	if err != nil {
		return
	}
	for _, e := range entries {
		info, err := e.Info()
		if err != nil {
			continue
		}
		if time.Since(info.ModTime()) > time.Hour {
			_ = os.Remove(filepath.Join(t.workDir, e.Name()))
		}
	}
}
