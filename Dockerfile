# ---- 构建阶段 ----
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/toolbox ./cmd/server

# ---- 运行阶段 ----
FROM alpine:3.20
RUN apk add --no-cache ffmpeg ca-certificates
COPY --from=build /out/toolbox /usr/local/bin/toolbox
COPY config.json /etc/toolbox/config.json
EXPOSE 8080
ENTRYPOINT ["toolbox", "/etc/toolbox/config.json"]
