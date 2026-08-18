package web

import (
	"context"
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"mime/multipart"
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
	cfg        *config.Config
	queue      *queue.Queue
	mux        *http.ServeMux
	uploadRL   *rateLimiter
	seo        *seoStore
	fileServer http.Handler
	track      *trackStore
	pro        *proTokenStore
	proReq     *proRequestStore
}

// NewServer 创建服务
func NewServer(cfg *config.Config) *Server {
	s := &Server{
		cfg:        cfg,
		queue:      queue.New(cfg.Limits.HeavyConcurrency, cfg.Limits.JobTimeoutSeconds),
		uploadRL:   newRateLimiter(20, time.Minute), // 上传接口每 IP 每分钟最多 20 次，防滥用
		seo:        newSEOStore(),
		fileServer: http.FileServer(http.FS(mustSub())),
		track:      newTrackStore(),
		pro:        newProTokenStore(cfg.Pro.TokensFile),
		proReq:     newProRequestStore(cfg.Pro.RequestsFile),
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
	mux.HandleFunc("POST /api/cert/send", s.handleCertSend)
	mux.HandleFunc("GET /api/bootstrap", s.handleBootstrap)
	mux.HandleFunc("GET /api/pro/status", s.handleProStatus)
	mux.HandleFunc("POST /api/pro/request", s.handleProRequestCreate)
	mux.HandleFunc("GET /api/pro/request/{id}", s.handleProRequestStatus)
	if s.cfg.Pro.AdminSecret != "" {
		mux.HandleFunc("GET /api/pro/confirm", s.handleProConfirm)
	}
	mux.HandleFunc("GET /robots.txt", s.handleRobots)
	mux.HandleFunc("GET /sitemap.xml", s.handleSitemap)
	// 第三方平台站点验证文件（微信/QQ浏览器等）：精确路由原样返回固定内容
	for _, v := range s.cfg.SiteVerification {
		if v.Filename == "" || strings.ContainsAny(v.Filename, "/\\") {
			continue // 跳过空名或含路径分隔的非法条目
		}
		mux.HandleFunc("GET /"+v.Filename, s.serveVerification(v.Content))
	}
	if s.cfg.EffectiveFeatures().Analytics {
		mux.HandleFunc("POST /api/track", s.handleTrack)
	}
	// SPA 入口与静态资源统一分发：/ 与 /t/{id} 走模板渲染，其余走静态文件
	mux.HandleFunc("/", s.handleSPA)
	s.mux = mux
}

// handleSPA 分发：首页/工具页渲染模板，其余交给静态文件服务
func (s *Server) handleSPA(w http.ResponseWriter, r *http.Request) {
	p := r.URL.Path
	if p == "/" || p == "/index.html" {
		s.renderIndex(w, r, "")
		return
	}
	if strings.HasPrefix(p, "/t/") {
		id := strings.TrimPrefix(p, "/t/")
		id = strings.TrimSuffix(id, "/")
		if id == "" {
			http.Redirect(w, r, "/", http.StatusFound)
			return
		}
		s.renderIndex(w, r, id)
		return
	}
	// 静态资源（JS/CSS/图片）：短缓存，便于部署后快速生效（覆盖 CF 默认 4h 边缘缓存）
	w.Header().Set("Cache-Control", "public, max-age=120, must-revalidate")
	s.fileServer.ServeHTTP(w, r)
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
	go s.proAutoApproveLoop(ctx)
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
// 流式落盘：通过 MultipartReader 边读边写临时文件，避免大文件（默认 1GB）全量缓冲进内存。
func (s *Server) handleSubmitTool(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	tool, ok := tools.Get(id)
	if !ok {
		http.Error(w, "tool not found", http.StatusNotFound)
		return
	}
	limit := s.effectiveUploadLimit(r)
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	reader, err := r.MultipartReader()
	if err != nil {
		http.Error(w, "invalid multipart: "+err.Error(), http.StatusBadRequest)
		return
	}
	params, fileInput, inputPath, err := readUpload(reader)
	if err != nil {
		if inputPath != "" {
			_ = os.Remove(inputPath)
		}
		http.Error(w, "upload failed: "+err.Error(), http.StatusBadRequest)
		return
	}
	if fileInput == nil {
		http.Error(w, "no file", http.StatusBadRequest)
		return
	}
	jobID := queue.NewID()
	s.queue.Submit(jobID, func(ctx context.Context) (string, error) {
		result, err := tool.Submit(ctx, tools.SubmitParams{Params: params, File: fileInput})
		defer os.Remove(inputPath) // 执行完成后清理输入文件
		return result, err
	})
	resp := map[string]any{"jobId": jobID}
	// 上传被接受后，对次数型 Pro token 扣减一次（失败上传不计费）
	if tok := r.Header.Get("X-Pro-Token"); tok != "" {
		info := s.pro.consume(tok)
		if info.status == proValid {
			p := map[string]any{"type": info.typ, "status": string(info.status)}
			if info.typ == "count" {
				p["remaining"] = info.remaining
			} else {
				p["expiresAt"] = info.expiresAt
			}
			resp["pro"] = p
		} else {
			resp["pro"] = map[string]any{"status": string(info.status)}
		}
	}
	writeJSON(w, resp)
}

// readUpload 流式读取 multipart：文件段写入临时文件（保留扩展名），其余段作为单值参数
func readUpload(reader *multipart.Reader) (params map[string]string, fi *tools.FileInput, path string, err error) {
	params = map[string]string{}
	for {
		part, e := reader.NextPart()
		if e == io.EOF {
			break
		}
		if e != nil {
			return nil, nil, path, e
		}
		if part.FileName() != "" {
			p, n, e := savePartToTemp(part)
			if e != nil {
				return nil, nil, p, e
			}
			fi = &tools.FileInput{Path: p, FileName: part.FileName(), Size: n}
			path = p
		} else {
			b, e := io.ReadAll(io.LimitReader(part, 1<<20)) // 单个字段至多 1MB
			if e != nil {
				return nil, nil, path, e
			}
			params[part.FormName()] = string(b)
		}
	}
	return params, fi, path, nil
}

// savePartToTemp 把一个文件段流式写入临时文件，返回路径与字节数
func savePartToTemp(part *multipart.Part) (string, int64, error) {
	ext := strings.ToLower(filepath.Ext(part.FileName()))
	tmp, err := os.CreateTemp("", "toolbox-in-*"+ext)
	if err != nil {
		return "", 0, err
	}
	n, err := io.Copy(tmp, part)
	_ = tmp.Close()
	if err != nil {
		_ = os.Remove(tmp.Name())
		return tmp.Name(), 0, err
	}
	return tmp.Name(), n, nil
}

// isProRequest 判断请求是否携带有效 Pro token
func (s *Server) isProRequest(r *http.Request) bool {
	return s.isProToken(r.Header.Get("X-Pro-Token"))
}

// isProToken 校验 token 是否有效（委托 proTokenStore，按时间/次数规则）
func (s *Server) isProToken(token string) bool {
	return s.pro.validate(token).status == proValid
}

// handleProStatus 查询 token 状态：供前端输入 token 后即时显示有效期/剩余次数/限额
func (s *Server) handleProStatus(w http.ResponseWriter, r *http.Request) {
	info := s.pro.validate(r.Header.Get("X-Pro-Token"))
	resp := map[string]any{
		"enabled":    s.cfg.Pro.Enabled,
		"valid":      info.status == proValid,
		"status":     string(info.status),
		"freeLimit":  s.cfg.Limits.MaxUploadBytes,
		"proLimit":   s.cfg.Pro.MaxUploadBytes,
	}
	if info.status == proValid {
		resp["type"] = info.typ
		if info.typ == "count" {
			resp["remaining"] = info.remaining
		} else {
			resp["expiresAt"] = info.expiresAt
		}
	}
	writeJSON(w, resp)
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

// serveVerification 返回第三方平台验证文件的固定内容（text/plain，不缓存）
func (s *Server) serveVerification(content string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Header().Set("Cache-Control", "no-cache")
		_, _ = io.WriteString(w, content)
	}
}

// writeJSON 写 JSON 响应
func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
