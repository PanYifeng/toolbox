#!/usr/bin/env bash
# 扫描 internal/web/static/tools/*/manifest.js，重新生成 registry.js
# 新增前端工具只需新建目录 + manifest.js，然后运行本脚本
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TOOLS_DIR="$SCRIPT_DIR/../internal/web/static/tools"
OUT="$TOOLS_DIR/registry.js"

# 收集工具目录（排序）
dirs=()
while IFS= read -r line; do
  dirs+=("$line")
done < <(find "$TOOLS_DIR" -mindepth 1 -maxdepth 1 -type d | sort)

{
  echo "// 自动生成，请勿手动编辑。运行 scripts/gen-registry.sh 重新生成。"
  for d in "${dirs[@]}"; do
    name="$(basename "$d")"
    var="${name//-/_}"
    echo "import ${var} from './${name}/manifest.js';"
  done
  echo ""
  printf 'export const registry = ['
  first=1
  for d in "${dirs[@]}"; do
    name="$(basename "$d")"
    var="${name//-/_}"
    if [ "$first" -eq 1 ]; then first=0; else printf ', '; fi
    printf '%s' "$var"
  done
  printf '];\n'
} > "$OUT"

echo "generated $OUT"

# 同步生成 tools.json（供后端 SEO：sitemap / per-tool meta）
node "$SCRIPT_DIR/gen-meta.js"
