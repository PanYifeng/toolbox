package web

import (
	"context"
	"crypto/subtle"
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"toolbox/internal/config"
	"toolbox/internal/queue"
	"toolbox/internal/tools"
)

//go:embed all:static
var staticFS embed.FS

// Server HTTP 服务
type Server struct {
	cfg      *config.Config
	queue    *queue.Queue
	mux      *http.ServeMux
	uploadRL *rateLimiter
}

// NewServer 创建服务
func NewServer(cfg *config.Config) *Server {
	s := &Server{
		cfg:      cfg,
		queue:    queue.New(cfg.Limits.VideoConcurrency, cfg.Limits.JobTimeoutSeconds),
		// 上传接口每 IP 每分钟最多 20 次，防滥用
		uploadRL: newRateLimiter(20, time.Minute),
	}
	s.routes()
	return s
}

// routes 注册路由
func (s *Server) routes() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/tools", s.handleListTools)
	// 上传接口加限流（Pro token 旁路）
	mux.Handle("POST /api/tools/{id}", s.uploadRL.middleware(http.HandlerFunc(s.handleSubmitTool), s.isProRequest))
	mux.HandleFunc("GET /api/jobs/{id}", s.handleGetJob)
	mux.HandleFunc("GET /api/jobs/{id}/download", s.handleDownload)
	mux.HandleFunc("GET /api/ads", s.handleAds)
	mux.Handle("/", http.FileServer(http.FS(mustSub())))
	s.mux = mux
}

// mustSub 取静态资源子目录
func mustSub() fs.FS {
	sub, err := fs.Sub(staticFS, "static")
	if err != nil {
		panic(err)
	}
	return sub
}

// Run 启动并阻塞直到 ctx 取消
func (s *Server) Run(ctx context.Context) error {
	srv := &http.Server{
		Addr:              s.cfg.Server.Addr,
		Handler:           securityHeaders(s.mux),
		ReadHeaderTimeout: 15 * time.Second, // 防 slowloris
		ReadTimeout:       120 * time.Second,
		WriteTimeout:      300 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	go func() {
		<-ctx.Done()
		shutCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutCtx)
	}()
	go s.queueCleanupLoop()
	log.Printf("server listening on %s", s.cfg.Server.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		return err
	}
	return nil
}

// queueCleanupLoop 定期清理过期任务
func (s *Server) queueCleanupLoop() {
	for range time.Tick(10 * time.Minute) {
		s.queue.Cleanup(time.Hour)
	}
}

// handleListTools 返回服务端工具清单
func (s *Server) handleListTools(w http.ResponseWriter, r *http.Request) {
	list := make([]tools.Manifest, 0, len(tools.All()))
	for _, t := range tools.All() {
		list = append(list, t.Manifest())
	}
	writeJSON(w, list)
}

// handleSubmitTool 接收文件并提交到队列
func (s *Server) handleSubmitTool(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tool, ok := tools.Get(id)
	if !ok {
		http.Error(w, "tool not found", http.StatusNotFound)
		return
	}
	limit := s.effectiveUploadLimit(r)
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	if err := r.ParseMultipartForm(limit); err != nil {
		http.Error(w, "file too large or invalid: "+err.Error(), http.StatusBadRequest)
		return
	}
	f, header, err := r.FormFile("file")
	if err != nil {
		http.Error(w, "no file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer f.Close()

	tmp, err := os.CreateTemp("", "toolbox-in-*")
	if err != nil {
		http.Error(w, "server error", http.StatusInternalServerError)
		return
	}
	if _, err := io.Copy(tmp, f); err != nil {
		_ = tmp.Close()
		_ = os.Remove(tmp.Name())
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	_ = tmp.Close()

	params := extractParams(r)
	fileInput := &tools.FileInput{Path: tmp.Name(), FileName: header.Filename, Size: header.Size}
	inputPath := tmp.Name()
	jobID := queue.NewID()
	s.queue.Submit(jobID, func(ctx context.Context) (string, error) {
		result, err := tool.Submit(ctx, tools.SubmitParams{Params: params, File: fileInput})
		defer os.Remove(inputPath) // 执行完成后清理输入文件
		return result, err
	})
	writeJSON(w, map[string]string{"jobId": jobID})
}

// extractParams 从 PostForm 提取单值参数
func extractParams(r *http.Request) map[string]string {
	params := map[string]string{}
	for k, v := range r.PostForm {
		if len(v) > 0 {
			params[k] = v[0]
		}
	}
	return params
}

// isProRequest 判断请求是否携带有效 Pro token
func (s *Server) isProRequest(r *http.Request) bool {
	return s.isProToken(r.Header.Get("X-Pro-Token"))
}

// isProToken 常数时间校验 token，防时序攻击
func (s *Server) isProToken(token string) bool {
	if token == "" {
		return false
	}
	for _, t := range s.cfg.Pro.Tokens {
		if subtle.ConstantTimeCompare([]byte(token), []byte(t)) == 1 {
			return true
		}
	}
	return false
}

// effectiveUploadLimit 取生效上传上限（Pro 用户更高）
func (s *Server) effectiveUploadLimit(r *http.Request) int64 {
	if s.isProRequest(r) {
		return s.cfg.Pro.MaxUploadBytes
	}
	return s.cfg.Limits.MaxUploadBytes
}

// handleGetJob 查询任务状态
func (s *Server) handleGetJob(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	job, ok := s.queue.Get(id)
	if !ok {
		http.Error(w, "job not found", http.StatusNotFound)
		return
	}
	resp := map[string]any{
		"id":     job.ID,
		"status": job.Status,
		"error":  job.Error,
	}
	if job.Status == queue.StatusDone {
		resp["downloadUrl"] = "/api/jobs/" + job.ID + "/download"
	}
	writeJSON(w, resp)
}

// handleDownload 下载任务产物
func (s *Server) handleDownload(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	job, ok := s.queue.Get(id)
	if !ok || job.Status != queue.StatusDone {
		http.Error(w, "not ready", http.StatusNotFound)
		return
	}
	// 防御性校验：产物路径必须是绝对路径且不含 ..，防止路径穿越
	result := filepath.Clean(job.Result)
	if !filepath.IsAbs(result) || containsDotDot(result) {
		http.Error(w, "invalid result path", http.StatusBadRequest)
		return
	}
	name := filepath.Base(result)
	w.Header().Set("Content-Disposition", "attachment; filename="+name)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	http.ServeFile(w, r, result)
}

// containsDotDot 检测路径中是否存在 .. 段
func containsDotDot(p string) bool {
	return strings.Contains(p, string(filepath.Separator)+"..") ||
		strings.HasPrefix(p, "..")
}

// handleAds 返回广告配置
func (s *Server) handleAds(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, s.cfg.Ads)
}

// writeJSON 写 JSON 响应
func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
