package doc_convert

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

// 输入/输出格式白名单（带前后导点，便于子串匹配）
const (
	inputExtWhitelist  = ".docx.doc.pdf.odt.rtf.txt."
	outputExtWhitelist = ".pdf.docx.txt.odt.rtf.html."
)

// Tool 文档转换工具（LibreOffice + pdf2docx）
type Tool struct {
	workDir string
}

func init() {
	dir, err := os.MkdirTemp("", "toolbox-doc-*")
	if err != nil {
		dir = ".toolbox-doc"
		_ = os.MkdirAll(dir, 0o755)
	}
	t := &Tool{workDir: dir}
	tools.Register(t)
	go t.cleanupLoop()
}

// Manifest 工具元信息
func (t *Tool) Manifest() tools.Manifest {
	return tools.Manifest{
		ID:       "doc_convert",
		Name:     "文档转换",
		Category: "文档",
	}
}

// Submit 执行文档转换，返回输出文件路径
func (t *Tool) Submit(ctx context.Context, p tools.SubmitParams) (string, error) {
	if p.File == nil {
		return "", fmt.Errorf("no file uploaded")
	}
	src := strings.ToLower(filepath.Ext(p.File.FileName))
	if !whitelistHas(inputExtWhitelist, src+".") {
		return "", fmt.Errorf("unsupported input format: %s", src)
	}
	target := p.Params["format"]
	if target == "" {
		target = "pdf"
	}
	if !whitelistHas(outputExtWhitelist, "."+target+".") {
		return "", fmt.Errorf("unsupported output format: %s", target)
	}
	if strings.TrimPrefix(src, ".") == target {
		return "", fmt.Errorf("input and output format are the same")
	}
	outDir := filepath.Join(t.workDir, fmt.Sprintf("%d", time.Now().UnixNano()))
	if err := os.MkdirAll(outDir, 0o755); err != nil {
		return "", err
	}
	outPath, err := t.dispatch(ctx, src, target, p.File.Path, p.File.FileName, outDir)
	if err != nil {
		_ = os.RemoveAll(outDir)
		return "", err
	}
	return outPath, nil
}

// dispatch 按输入/目标格式选择转换后端
func (t *Tool) dispatch(ctx context.Context, src, target, inPath, fileName, outDir string) (string, error) {
	// PDF 只能由 pdf2docx 转 docx，或由 LibreOffice 转 html；其余不支持
	if src == ".pdf" {
		switch target {
		case "docx":
			return t.runPdf2docx(ctx, inPath, fileName, outDir)
		case "html":
			return t.runSoffice(ctx, target, inPath, fileName, outDir)
		default:
			return "", fmt.Errorf("PDF -> %s not supported (use docx or html)", target)
		}
	}
	return t.runSoffice(ctx, target, inPath, fileName, outDir)
}

// runSoffice 用 LibreOffice 转换
func (t *Tool) runSoffice(ctx context.Context, target, inPath, fileName, outDir string) (string, error) {
	soffice, err := resolveSoffice()
	if err != nil {
		return "", err
	}
	profileDir, _ := os.MkdirTemp("", "toolbox-lo-*")
	cmd := exec.CommandContext(ctx, soffice,
		"--headless", "--norestore", "--nologo", "--nolockcheck",
		"-env:UserInstallation=file://"+profileDir,
		"--convert-to", target,
		"--outdir", outDir,
		inPath,
	)
	if out, err := cmd.CombinedOutput(); err != nil {
		_ = os.RemoveAll(profileDir)
		return "", fmt.Errorf("libreoffice failed: %w: %s", err, string(out))
	}
	_ = os.RemoveAll(profileDir)
	// soffice 按输入文件名生成产物
	tempBase := strings.TrimSuffix(filepath.Base(inPath), filepath.Ext(inPath))
	actual := filepath.Join(outDir, tempBase+"."+target)
	if _, err := os.Stat(actual); err != nil {
		return "", fmt.Errorf("output not found: %w (target=%s)", err, target)
	}
	return renameToOrig(actual, fileName, target)
}

// runPdf2docx 用 pdf2docx 将 PDF 转为 docx
func (t *Tool) runPdf2docx(ctx context.Context, inPath, fileName, outDir string) (string, error) {
	py, err := exec.LookPath("python3")
	if err != nil {
		return "", fmt.Errorf("python3 required for PDF->docx")
	}
	outPath := origPath(outDir, fileName, "docx")
	script := "import sys;from pdf2docx import Converter;Converter(sys.argv[1]).convert(sys.argv[2])"
	cmd := exec.CommandContext(ctx, py, "-c", script, inPath, outPath)
	if out, err := cmd.CombinedOutput(); err != nil {
		return "", fmt.Errorf("pdf2docx failed: %w: %s", err, string(out))
	}
	if _, err := os.Stat(outPath); err != nil {
		return "", fmt.Errorf("output not found: %w", err)
	}
	return outPath, nil
}

// renameToOrig 将产物重命名为原始文件名（可读下载名）
func renameToOrig(actual, fileName, target string) (string, error) {
	orig := origPath(filepath.Dir(actual), fileName, target)
	if orig != actual {
		_ = os.Rename(actual, orig)
	}
	return orig, nil
}

// origPath 原始文件名 + 目标扩展名的输出路径
func origPath(dir, fileName, target string) string {
	base := strings.TrimSuffix(filepath.Base(fileName), filepath.Ext(fileName))
	return filepath.Join(dir, base+"."+target)
}

// resolveSoffice 查找 soffice / libreoffice 可执行文件
func resolveSoffice() (string, error) {
	for _, name := range []string{"soffice", "libreoffice"} {
		if p, err := exec.LookPath(name); err == nil {
			return p, nil
		}
	}
	return "", fmt.Errorf("libreoffice/soffice not installed")
}

// whitelistHas 子串匹配白名单
func whitelistHas(list, ext string) bool {
	return strings.Contains(list, ext)
}

// cleanupLoop 定期清理过期产物
func (t *Tool) cleanupLoop() {
	for range time.Tick(30 * time.Minute) {
		t.cleanup()
	}
}

// cleanup 删除超过 1 小时的输出目录
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
			_ = os.RemoveAll(filepath.Join(t.workDir, e.Name()))
		}
	}
}
