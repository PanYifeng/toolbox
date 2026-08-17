#!/bin/bash
# 启动 toolbox 服务。
#
# 运行模式：
#   1) 容器/云部署（前台，PID 1）：TOOLBOX_FOREGROUND=1 ./start.sh  或  ./start.sh --fg
#      前台 exec 成为 1 号进程，SIGTERM 直达 Go 服务触发优雅关闭，日志输出到 stdout，
#      适配 k8s / 容器编排的健康检查与滚动更新。
#   2) 裸机部署（后台 nohup）：./start.sh [config.json]
#      写 pidfile，日志落 toolbox.log，配合 stop.sh 管理。
#   3) 自动更新（--pull）：./start.sh --pull [--fg] [config.json]
#      先在源码目录 git pull 拉取 GitHub 最新代码，再 go build 重新编译二进制，
#      然后启动。免去每次改代码都要重新构建/推送镜像。需服务器装有 git 与 go，
#      且 start.sh 位于 git 源码检出目录（或用 TOOLBOX_SRC 指定源码目录）。
#
# 配置路径优先级：命令行参数 > $TOOLBOX_CONFIG > config.json
# 二进制优先级：--pull 产物 > ./toolbox > $TOOLBOX_BIN > PATH 中的 toolbox
# 环境变量：TOOLBOX_SRC（--pull 用的源码目录，默认为 start.sh 所在目录）
set -e
cd "$(dirname "$0")"

CONFIG="${TOOLBOX_CONFIG:-config.json}"
FOREGROUND=0
PULL=0
for arg in "$@"; do
  case "$arg" in
    --fg|--foreground) FOREGROUND=1 ;;
    --pull|--update) PULL=1 ;;
    *) CONFIG="$arg" ;;
  esac
done
[ "$TOOLBOX_FOREGROUND" = "1" ] && FOREGROUND=1

# resolveBin 在 PATH 及常见安装路径中定位可执行文件，避免非交互部署环境
# （systemd / 容器，不读 ~/.bashrc）PATH 不含 /usr/local/go/bin 时找不到 go。
resolveBin() {
  local name="$1" candidates
  command -v "$name" >/dev/null 2>&1 && { command -v "$name"; return 0; }
  case "$name" in
    go) candidates="/usr/local/go/bin/go /usr/lib/go/bin/go /usr/lib/go-*/bin/go ${GOROOT:+$GOROOT/bin/go} $HOME/go/bin/go" ;;
    git) candidates="/usr/bin/git /usr/local/bin/git" ;;
    *) candidates="" ;;
  esac
  for c in $candidates; do
    [ -x "$c" ] && { echo "$c"; return 0; }
  done
  return 1
}

# pullLatest 从 GitHub 拉取最新代码并编译二进制，返回产物路径
pullLatest() {
  local src="${TOOLBOX_SRC:-$(pwd)}"
  if [ ! -d "$src/.git" ]; then
    echo "--pull needs a git source checkout: set TOOLBOX_SRC or run start.sh from the source dir" >&2
    exit 1
  fi
  local gitBin goBin
  gitBin=$(resolveBin git) || { echo "git not found" >&2; exit 1; }
  goBin=$(resolveBin go)  || { echo "go not found (install Go toolchain, e.g. to /usr/local/go)" >&2; exit 1; }
  echo "pulling latest code in $src ..."
  "$gitBin" -C "$src" pull --ff-only
  echo "building binary ..."
  "$goBin" -C "$src" build -o "$src/toolbox" ./cmd/server
  echo "built $src/toolbox"
}

if [ "$PULL" = "1" ]; then
  pullLatest
  BIN="${TOOLBOX_SRC:-$(pwd)}/toolbox"
elif [ -x ./toolbox ]; then
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
