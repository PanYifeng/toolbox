package main

import (
	"context"
	"flag"
	"log"
	"os/signal"
	"strings"
	"syscall"

	"toolbox/internal/config"
	"toolbox/internal/web"

	// 通过 init 注册服务端工具
	_ "toolbox/internal/tools/server/audio_convert"
	_ "toolbox/internal/tools/server/doc_convert"
	_ "toolbox/internal/tools/server/video_convert"
	_ "toolbox/internal/tools/server/video_cut"
)

// main 启动 HTTP 服务。
// 配置优先级（高 → 低）：-set 覆盖 > TOOLBOX_* 环境变量 > Nacos > config.json > 内置默认值。
func main() {
	cfgPath := flag.String("config", "config.json", "配置文件路径")
	setFlags := flag.String("set", "",
		"配置覆盖 path=value，可逗号分隔多项，如 -set storage.driver=redis,server.addr=:9090")
	flag.Parse()

	var sets []string
	for _, s := range strings.Split(*setFlags, ",") {
		if s = strings.TrimSpace(s); s != "" {
			sets = append(sets, s)
		}
	}

	cfg, err := config.Build(*cfgPath, sets)
	if err != nil {
		log.Fatalf("load config failed: %v", err)
	}

	srv, err := web.NewServer(cfg)
	if err != nil {
		log.Fatalf("init server failed: %v", err)
	}
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	if err := srv.Run(ctx); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}
