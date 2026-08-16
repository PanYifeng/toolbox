package video_convert

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"toolbox/internal/tools"
)

// Tool 视频转码工具
type Tool struct {
	workDir string
}

func init() {
	dir, err := os.MkdirTemp("", "toolbox-video-*")
	if err != nil {
		// 退化到当前目录下的临时文件夹
		dir = ".toolbox-video"
		_ = os.MkdirAll(dir, 0o755)
	}
	t := &Tool{workDir: dir}
	tools.Register(t)
	go t.cleanupLoop()
}

// Manifest 工具元信息
func (t *Tool) Manifest() tools.Manifest {
	return tools.Manifest{
		ID:       "video_convert",
		Name:     "视频转码",
		Category: "视频",
	}
}

// Submit 执行转码，返回输出文件路径
func (t *Tool) Submit(ctx context.Context, p tools.SubmitParams) (string, error) {
	if p.File == nil {
		return "", fmt.Errorf("no file uploaded")
	}
	if p.File.Size <= 0 {
		return "", fmt.Errorf("empty file")
	}
	target := p.Params["format"]
	if target == "" {
		target = "mp4"
	}
	if !isAllowedFormat(target) {
		return "", fmt.Errorf("unsupported format: %s", target)
	}

	outPath := filepath.Join(t.workDir, fmt.Sprintf("%d-out.%s", time.Now().UnixNano(), target))
	// 安全加固：
	//   -nostdin              禁止读取 stdin，防止阻塞
	//   -protocol_whitelist file  仅允许 file 协议，阻断 ffmpeg SSRF
	//                              （恶意媒体文件无法再触发 http/rtmp/data 等网络或本地越权读取）
	//   -threads 1            限制 CPU，保护 1C2G
	//   -t 600                限制输出时长 10 分钟，防资源耗尽
	//   -fs 200M              限制输出体积
	cmd := exec.CommandContext(ctx, "ffmpeg",
		"-nostdin", "-y",
		"-protocol_whitelist", "file",
		"-i", p.File.Path,
		"-threads", "1",
		"-map", "0:v?", "-map", "0:a?",
		"-c:v", "libx264", "-preset", "fast",
		"-c:a", "aac",
		"-t", "600", "-fs", "200M",
		outPath)
	if err := cmd.Run(); err != nil {
		_ = os.Remove(outPath)
		return "", fmt.Errorf("ffmpeg failed: %w", err)
	}
	return outPath, nil
}

// isAllowedFormat 输出格式白名单
func isAllowedFormat(f string) bool {
	switch f {
	case "mp4", "webm", "mkv", "avi", "mov":
		return true
	}
	return false
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
