package web

import (
	"net"
	"net/http"
	"sync"
	"time"
)

// securityHeaders 设置基础安全响应头，防止点击劫持 / MIME 嗅探 / 信息泄露
func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		h := w.Header()
		h.Set("X-Content-Type-Options", "nosniff")
		h.Set("X-Frame-Options", "DENY")
		h.Set("Referrer-Policy", "no-referrer")
		h.Set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'")
		next.ServeHTTP(w, r)
	})
}

// bucket 单 IP 计数桶
type bucket struct {
	count   int
	resetAt time.Time
}

// rateLimiter 每 IP 滑动窗口限流
type rateLimiter struct {
	mu     sync.Mutex
	bucket map[string]*bucket
	rate   int
	window time.Duration
}

// newRateLimiter 创建限流器
func newRateLimiter(rate int, window time.Duration) *rateLimiter {
	rl := &rateLimiter{bucket: map[string]*bucket{}, rate: rate, window: window}
	go rl.gc()
	return rl
}

// allow 判断 IP 是否仍可放行
func (rl *rateLimiter) allow(ip string) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	b, ok := rl.bucket[ip]
	if !ok || now.After(b.resetAt) {
		b = &bucket{count: 0, resetAt: now.Add(rl.window)}
		rl.bucket[ip] = b
	}
	if b.count >= rl.rate {
		return false
	}
	b.count++
	return true
}

// gc 定期清理过期桶，防止内存无限增长
func (rl *rateLimiter) gc() {
	for range time.Tick(time.Minute) {
		rl.mu.Lock()
		now := time.Now()
		for ip, b := range rl.bucket {
			if now.After(b.resetAt) {
				delete(rl.bucket, ip)
			}
		}
		rl.mu.Unlock()
	}
}

// middleware 超限返回 429
func (rl *rateLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !rl.allow(clientIP(r)) {
			http.Error(w, "too many requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// clientIP 取客户端 IP（去除端口）
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
