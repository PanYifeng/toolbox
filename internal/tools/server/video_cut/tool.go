package video_cut

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"toolbox/internal/tools"
)

// 视频输入格式白名单
const inputExtWhitelist = ".mp4.webm.mkv.avi.mov.m4v.flv.ts."

// Tool 视频截断工具（ffmpeg -ss/-t 流复制，不重编码）
type Tool struct {
	workDir string
}

func init() {
	dir, err := os.MkdirTemp("", "toolbox-cut-*")
	if err != nil {
		dir = ".toolbox-cut"
		_ = os.MkdirAll(dir, 0o755)
	}
	t := &Tool{workDir: dir}
	tools.Register(t)
	go t.cleanupLoop()
}

// Manifest 工具元信息
func (t *Tool) Manifest() tools.Manifest {
	return tools.Manifest{
		ID:       "video_cut",
		Name:     "视频截断",
		Category: "视频",
	}
}

// Submit 执行截断，返回输出文件路径
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
	startSec, endSec, err := parseRange(p.Params["start"], p.Params["end"])
	if err != nil {
		return "", err
	}
	outPath := filepath.Join(t.workDir, fmt.Sprintf("%d-cut.mp4", time.Now().UnixNano()))
	args := buildArgs(startSec, endSec, p.File.Path, outPath)
	// 安全加固：
	//   -nostdin                    禁止读取 stdin
	//   -protocol_whitelist file    仅允许 file 协议，阻断 ffmpeg SSRF
	//   -ss（输入定位）+ -t（输出时长） 秒数计算，避免 -to 版本歧义
	//   重编码（libx264 ultrafast + aac）保证截断点帧级精确；-c copy 只能关键帧对齐且时间戳易错乱
	//   -threads 1                  限制 CPU，配合全局 3 并发不超载
	//   -fs 500M                    限制输出体积
	cmd := exec.CommandContext(ctx, "ffmpeg", args...)
	if out, err := cmd.CombinedOutput(); err != nil {
		_ = os.Remove(outPath)
		return "", fmt.Errorf("ffmpeg failed: %w: %s", err, string(out))
	}
	return outPath, nil
}

// buildArgs 组装 ffmpeg 截断参数
// startSec=0 表示从头；endSec<0 表示到文件结尾；否则用 -t (end-start) 限定时长
func buildArgs(startSec, endSec float64, inPath, outPath string) []string {
	args := []string{"-nostdin", "-y", "-protocol_whitelist", "file"}
	if startSec > 0 {
		args = append(args, "-ss", strconv.FormatFloat(startSec, 'f', 3, 64))
	}
	args = append(args, "-i", inPath)
	if endSec >= 0 {
		dur := endSec - startSec
		if dur < 0 {
			dur = 0
		}
		args = append(args, "-t", strconv.FormatFloat(dur, 'f', 3, 64))
	}
	args = append(args,
		"-threads", "1",
		"-c:v", "libx264", "-preset", "ultrafast",
		"-c:a", "aac",
		"-fs", "500M", outPath)
	return args
}

// parseRange 解析 start/end 时间字符串为秒，至少一项有效
func parseRange(startStr, endStr string) (start, end float64, err error) {
	startStr = strings.TrimSpace(startStr)
	endStr = strings.TrimSpace(endStr)
	if startStr == "" && endStr == "" {
		return 0, 0, fmt.Errorf("specify start or end time")
	}
	hasEnd := endStr != ""
	if startStr != "" {
		start, err = parseTimeToSeconds(startStr)
		if err != nil {
			return 0, 0, fmt.Errorf("invalid start time: %w", err)
		}
	}
	end = -1
	if hasEnd {
		end, err = parseTimeToSeconds(endStr)
		if err != nil {
			return 0, 0, fmt.Errorf("invalid end time: %w", err)
		}
		if hasEnd && end <= start {
			return 0, 0, fmt.Errorf("end time must be greater than start time")
		}
	}
	return start, end, nil
}

// parseTimeToSeconds 把 "SS" / "SS.ss" / "MM:SS" / "HH:MM:SS" 解析为秒
func parseTimeToSeconds(s string) (float64, error) {
	parts := strings.Split(s, ":")
	var secs float64
	switch len(parts) {
	case 1:
		v, err := strconv.ParseFloat(parts[0], 64)
		if err != nil {
			return 0, err
		}
		secs = v
	case 2:
		m, err1 := strconv.Atoi(parts[0])
		sec, err2 := strconv.ParseFloat(parts[1], 64)
		if err1 != nil || err2 != nil {
			return 0, fmt.Errorf("bad time: %s", s)
		}
		secs = float64(m)*60 + sec
	case 3:
		h, err1 := strconv.Atoi(parts[0])
		m, err2 := strconv.Atoi(parts[1])
		sec, err3 := strconv.ParseFloat(parts[2], 64)
		if err1 != nil || err2 != nil || err3 != nil {
			return 0, fmt.Errorf("bad time: %s", s)
		}
		secs = float64(h)*3600 + float64(m)*60 + sec
	default:
		return 0, fmt.Errorf("bad time: %s", s)
	}
	if secs < 0 {
		return 0, fmt.Errorf("negative time: %s", s)
	}
	return secs, nil
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
