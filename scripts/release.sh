#!/usr/bin/env bash
# 一键发布：把「编译 → 装二进制 → 建镜像 tag → 升级 → 验版本」串成一条命令。
#
# 为什么需要它：LAS 的镜像构建是**开发机文件系统快照**，不是从源码编译。
# 只要有人只跑 build 而忘了先编译，镜像里烤的就是旧二进制，而镜像 tag 看起来
# 一切正常（2026-11-10 实录：1.1.238 内是九小时前的旧 toolbox）。
# 这个脚本把编译做成发布动作的一部分，从构造上消除「忘记编译」。
#
# 版本号统一：整个镜像仓库（搜索服务 + toolbox）共用一个 major.minor.patch 计数，
# 新 tag = 仓库内现有最大 tag 的 patch +1。同一个数既烧进二进制
# （-ldflags -X）也用作镜像 tag，部署后再断言两者一致。
#
# 用法：
#   ./scripts/release.sh                 # 自动取下一个号，全链路发布
#   ./scripts/release.sh --tag 1.1.239   # 指定 tag
#   ./scripts/release.sh --dry-run       # 只打印将执行的步骤，不动线上
set -euo pipefail

DEV_HOST="root@124.174.92.34"
DEV_PORT="2001"
REMOTE_SRC="/root/.cache/toolbox-src"   # 编译目录（/root/.cache 在镜像排除列表内，不进镜像）
REMOTE_BIN="/root/toolbox/toolbox"
PYSERV="PYTHONPATH=/root/pyshim python3"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$SCRIPT_DIR/.." && pwd)"

TAG=""
DRY_RUN=0
while [ $# -gt 0 ]; do
  case "$1" in
    --tag) TAG="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    *) echo "unknown arg: $1" >&2; exit 2 ;;
  esac
done

log() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
run() { if [ "$DRY_RUN" = "1" ]; then echo "[dry-run] $*"; else "$@"; fi; }

rssh() { ssh -p "$DEV_PORT" "$DEV_HOST" "$@"; }

# resolve_tag 取仓库内现有最大 tag 的 patch +1。
# 统一计数：搜索服务与 toolbox 共用一套号，避免「我在哪个系列」的混淆；
# 回滚独立性由服务隔离保证（两个服务各自指向自己的 tag），与编号无关。
resolve_tag() {
  local tags latest
  tags=$(rssh "$PYSERV /root/tb_las_run.py tags --limit 200" | awk '/^[0-9]+\.[0-9]+\.[0-9]+/ {print $1}')
  latest=$(printf '%s\n' "$tags" | sort -t. -k1,1n -k2,2n -k3,3n | tail -1)
  if [ -z "$latest" ]; then
    echo "cannot determine latest image tag" >&2
    exit 1
  fi
  local major minor patch
  IFS=. read -r major minor patch <<< "$latest"
  echo "$major.$minor.$((patch + 1))"
}

local_commit() { git -C "$REPO" rev-parse --short HEAD; }
dirty_note() {
  if [ -n "$(git -C "$REPO" status --porcelain)" ]; then
    echo "WARN: working tree is dirty, the image will contain uncommitted changes" >&2
  fi
}

# sync_source 把源码推到编译目录（排除构建产物与本地私有配置）
sync_source() {
  rsync -az --delete \
    --exclude='.git' --exclude='node_modules' --exclude='.idea' --exclude='.playwright-mcp' \
    --exclude='toolbox' --exclude='toolbox-linux' --exclude='toolbox.log' --exclude='toolbox.pid' \
    --exclude='config.local.json' --exclude='*.png' \
    -e "ssh -p $DEV_PORT" "$REPO/" "$DEV_HOST:$REMOTE_SRC/"
}

# remote_build 在开发机上编译并把版本指纹烧进二进制（-ldflags -X）。
# CGO_ENABLED=0 + GOOS/GOARCH 显式指定：开发机是 linux/amd64，
# 直接 go build 会带上 cgo，产物对容器基座无必要依赖。
remote_build() {
  local tag="$1" commit="$2" built_at="$3"
  local ldflags="-X toolbox/internal/version.Version=$tag"
  ldflags="$ldflags -X toolbox/internal/version.Commit=$commit"
  ldflags="$ldflags -X toolbox/internal/version.BuiltAt=$built_at"
  rssh "cd $REMOTE_SRC && GOOS=linux GOARCH=amd64 CGO_ENABLED=0 GOPROXY=https://goproxy.cn,direct \
    /usr/local/go/bin/go build -ldflags '$ldflags' -o $REMOTE_SRC/toolbox ./cmd/server"
}

# install_bin 备份线上旧二进制（按它当时服务的 tag 命名）再替换。
# 镜像快照取的就是这个路径，所以替换必须发生在 build 之前。
install_bin() {
  local tag="$1" prev
  prev=$(rssh "PYTHONPATH=/root/pyshim python3 /root/tb_upgrade_run.py --info" \
    | sed -n 's/^Image: .*:\([0-9.]*\)$/\1/p' | head -1)
  rssh "cp -n $REMOTE_BIN $REMOTE_BIN.bak-${prev:-unknown} 2>/dev/null || true; \
        cp $REMOTE_SRC/toolbox $REMOTE_BIN && chmod +x $REMOTE_BIN && \
        sha256sum $REMOTE_BIN $REMOTE_SRC/toolbox"
}

main() {
  dirty_note
  [ -n "$TAG" ] || TAG=$(resolve_tag)
  local commit built_at
  commit=$(local_commit)
  built_at=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  log "releasing toolbox $TAG (commit $commit)"

  log "1/5 sync source to $REMOTE_SRC"
  run sync_source

  log "2/5 compile on dev machine (linux/amd64, version stamped)"
  run remote_build "$TAG" "$commit" "$built_at"

  log "3/5 install binary to $REMOTE_BIN"
  run install_bin "$TAG"

  log "4/5 build image tag $TAG and upgrade"
  run release_image "$TAG"

  log "5/5 verify deployed binary reports $TAG"
  run verify_deploy "$TAG"

  if [ "$DRY_RUN" = "1" ]; then
    log "dry-run finished, nothing was changed"
  else
    log "done: $TAG is live"
  fi
}

# release_image 提交镜像构建（脱离 SSH，防连接抖动杀掉构建）→ 轮询 → 升级
release_image() {
  local tag="$1"
  rssh "setsid nohup env $PYSERV /root/tb_las_run.py build --tag $tag \
        --desc 'toolbox $tag (commit $(local_commit))' \
        > /root/tb_build_$tag.log 2>&1 < /dev/null &"
  poll_build "$tag"
  rssh "$PYSERV /root/tb_upgrade_run.py --tag $tag --yes"
}

# poll_build 每 20s 查一次 tag 状态，直到 Succeeded/Failed（最长 60 分钟）
poll_build() {
  local tag="$1" i status
  for i in $(seq 1 180); do
    sleep 20
    status=$(rssh "$PYSERV /root/tb_las_run.py tag-info --tag $tag" \
      | sed -n 's/.*"Status": "\([A-Za-z]*\)".*/\1/p' | head -1)
    echo "  [$((i * 20))s] status=${status:-unknown}"
    case "$status" in
      Succeeded) return 0 ;;
      Failed) echo "build failed, see /root/tb_build_$tag.log" >&2; return 1 ;;
    esac
  done
  echo "build did not finish within 60 minutes" >&2
  return 1
}

# verify_deploy 从开发机 curl 实例的 /api/version，断言二进制版本 == 镜像 tag。
# 这是「忘记编译」的兜底：镜像 tag 对但二进制版本不对，立刻报错。
verify_deploy() {
  local tag="$1" ip got
  ip=$(rssh "$PYSERV /root/tb_upgrade_run.py --info" | sed -n 's/^Instance: \([0-9.]*\).*/\1/p' | head -1)
  for _ in $(seq 1 30); do
    got=$(rssh "curl -s --max-time 5 http://$ip:8080/api/version" 2>/dev/null \
      | sed -n 's/.*"version":"\([^"]*\)".*/\1/p')
    [ "$got" = "$tag" ] && { echo "  /api/version = $got (ok)"; return 0; }
    sleep 5
  done
  echo "version mismatch: binary reports '${got:-<empty>}', image tag is $tag" >&2
  echo "the image was built from a stale binary — rerun this script" >&2
  return 1
}

main
