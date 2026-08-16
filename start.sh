#!/bin/bash
# 启动 toolbox 服务。
#
# 两种运行模式：
#   1) 容器/云部署（前台，PID 1）：TOOLBOX_FOREGROUND=1 ./start.sh  或  ./start.sh --fg
#      前台 exec 成为 1 号进程，SIGTERM 直达 Go 服务触发优雅关闭，日志输出到 stdout，
#      适配 k8s / 容器编排的健康检查与滚动更新。
#   2) 裸机部署（后台 nohup）：./start.sh [config.json]
#      写 pidfile，日志落 toolbox.log，配合 stop.sh 管理。
#
# 配置路径优先级：命令行参数 > $TOOLBOX_CONFIG > config.json
# 二进制优先级：./toolbox > $TOOLBOX_BIN > PATH 中的 toolbox
set -e
cd "$(dirname "$0")"

CONFIG="${TOOLBOX_CONFIG:-config.json}"
FOREGROUND=0
for arg in "$@"; do
  case "$arg" in
    --fg|--foreground) FOREGROUND=1 ;;
    *) CONFIG="$arg" ;;
  esac
done
[ "$TOOLBOX_FOREGROUND" = "1" ] && FOREGROUND=1

if [ -x ./toolbox ]; then
  BIN=./toolbox
elif [ -n "$TOOLBOX_BIN" ] && [ -x "$TOOLBOX_BIN" ]; then
  BIN="$TOOLBOX_BIN"
else
  BIN=$(command -v toolbox) || { echo "toolbox binary not found"; exit 1; }
fi

# 后台模式下：已运行则跳过
if [ "$FOREGROUND" -ne 1 ]; then
  if [ -f toolbox.pid ] && kill -0 "$(cat toolbox.pid)" 2>/dev/null; then
    echo "already running pid $(cat toolbox.pid)"; exit 0
  fi
  nohup "$BIN" "$CONFIG" > toolbox.log 2>&1 &
  echo $! > toolbox.pid
  echo "started pid $(cat toolbox.pid), log: $(pwd)/toolbox.log"
  exit 0
fi

# 前台模式：exec 成为 PID 1，日志走 stdout（容器标准做法）
exec "$BIN" "$CONFIG"
