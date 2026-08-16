#!/bin/bash
# 启动 toolbox 服务（后台 nohup）。用法: ./start.sh [config.json]
set -e
cd "$(dirname "$0")"
CONFIG="${1:-config.json}"

# 优先用本地构建产物，其次 PATH 中的 toolbox
if [ -x ./toolbox ]; then
  BIN=./toolbox
else
  BIN=$(command -v toolbox) || { echo "toolbox binary not found"; exit 1; }
fi

# 已运行则跳过
if [ -f toolbox.pid ] && kill -0 "$(cat toolbox.pid)" 2>/dev/null; then
  echo "already running pid $(cat toolbox.pid)"; exit 0
fi

nohup "$BIN" "$CONFIG" > toolbox.log 2>&1 &
echo $! > toolbox.pid
echo "started pid $(cat toolbox.pid), log: $(pwd)/toolbox.log"
