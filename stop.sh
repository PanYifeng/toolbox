#!/bin/bash
# 停止 toolbox 服务
cd "$(dirname "$0")"
if [ -f toolbox.pid ]; then
  kill "$(cat toolbox.pid)" 2>/dev/null && rm -f toolbox.pid && echo "stopped"
else
  echo "not running"
fi
