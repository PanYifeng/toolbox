# ---- 构建阶段 ----
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/toolbox ./cmd/server

# ---- 运行阶段 ----
FROM alpine:3.20
# ffmpeg 视频转码/截断/音频转换；libreoffice 文档转换；python3+pdf2docx 处理 PDF→docx
RUN apk add --no-cache \
      ffmpeg \
      libreoffice \
      python3 \
      py3-pip \
      ca-certificates \
      tini \
 && pip install --no-cache-dir --break-system-packages pdf2docx

COPY --from=build /out/toolbox /usr/local/bin/toolbox
COPY start.sh /opt/toolbox/start.sh
COPY config.json /etc/toolbox/config.json
RUN chmod +x /opt/toolbox/start.sh /usr/local/bin/toolbox

WORKDIR /opt/toolbox
EXPOSE 8080

# tini 作 PID 1，正确转发信号并回收僵尸进程；start.sh --fg 前台 exec 启动服务
ENTRYPOINT ["/sbin/tini", "--", "/opt/toolbox/start.sh", "--fg", "/etc/toolbox/config.json"]

# 健康检查：服务端工具清单接口
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/api/tools >/dev/null || exit 1
