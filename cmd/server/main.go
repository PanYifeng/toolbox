package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"toolbox/internal/config"
	"toolbox/internal/web"

	// 通过 init 注册服务端工具
	_ "toolbox/internal/tools/server/video_convert"
)

// main 启动 HTTP 服务
func main() {
	cfgPath := "config.json"
	if len(os.Args) > 1 {
		cfgPath = os.Args[1]
	}
	cfg, err := config.Load(cfgPath)
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}

	srv := web.NewServer(cfg)
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	if err := srv.Run(ctx); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}
