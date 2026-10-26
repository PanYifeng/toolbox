package web

// 房间 HTTP handlers：创建 / 快照 / 加入 / 离开 / 行动 / 关闭 / SSE 事件流。
// 全部走 JSON + apiErr 状态码；POST 体系 64KB 上限，SSE 走 GET 长连接。

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"
)

// roomWriteErr 统一错误出口：apiErr 用其状态码，其余按 400 处理
func roomWriteErr(w http.ResponseWriter, err error) {
	if ae, ok := err.(*apiErr); ok {
		http.Error(w, ae.msg, ae.code)
		return
	}
	http.Error(w, "bad request", http.StatusBadRequest)
}

// roomDecodeBody 解析 JSON 请求体（带 64KB 上限）
func roomDecodeBody(w http.ResponseWriter, r *http.Request, v any) error {
	return json.NewDecoder(http.MaxBytesReader(w, r.Body, roomBodyLimit)).Decode(v)
}

// handleRoomCreate 创建房间（每 IP 限流）
func (s *Server) handleRoomCreate(w http.ResponseWriter, r *http.Request) {
	var in roomCreateInput
	if err := roomDecodeBody(w, r, &in); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	v, err := s.rooms.createRoom(in)
	if err != nil {
		roomWriteErr(w, err)
		return
	}
	writeJSON(w, v)
}

// handleRoomGet 房间公开快照：?since=N 增量拉行动，?me=clientId 标记自己座位
func (s *Server) handleRoomGet(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	since, err := strconv.Atoi(r.URL.Query().Get(roomSinceKey))
	if err != nil || since < 0 {
		since = -1 // 全量
	}
	v, err := s.rooms.getRoom(code, since, r.URL.Query().Get("me"))
	if err != nil {
		roomWriteErr(w, err)
		return
	}
	writeJSON(w, v)
}

// handleRoomJoin 占座加入（每 IP 限流）
func (s *Server) handleRoomJoin(w http.ResponseWriter, r *http.Request) {
	var in roomJoinInput
	if err := roomDecodeBody(w, r, &in); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	v, seat, err := s.rooms.joinRoom(r.PathValue("code"), in)
	if err != nil {
		roomWriteErr(w, err)
		return
	}
	writeJSON(w, map[string]any{"room": v, "seat": seat})
}

// handleRoomLeave 释放座位（可随时重进接管）
func (s *Server) handleRoomLeave(w http.ResponseWriter, r *http.Request) {
	var in roomActorInput
	if err := roomDecodeBody(w, r, &in); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if err := s.rooms.leaveRoom(r.PathValue("code"), in.ClientID); err != nil {
		roomWriteErr(w, err)
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// handleRoomAction 提交行动（每 IP 高频限流；seq 冲突返回 409 由客户端重同步）
func (s *Server) handleRoomAction(w http.ResponseWriter, r *http.Request) {
	var in roomActorInput
	if err := roomDecodeBody(w, r, &in); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	v, err := s.rooms.appendAction(r.PathValue("code"), in)
	if err != nil {
		roomWriteErr(w, err)
		return
	}
	writeJSON(w, v)
}

// handleRoomClose 房主关闭房间
func (s *Server) handleRoomClose(w http.ResponseWriter, r *http.Request) {
	var in roomActorInput
	if err := roomDecodeBody(w, r, &in); err != nil {
		http.Error(w, "invalid request", http.StatusBadRequest)
		return
	}
	if err := s.rooms.closeRoom(r.PathValue("code"), in.ClientID); err != nil {
		roomWriteErr(w, err)
		return
	}
	writeJSON(w, map[string]bool{"ok": true})
}

// handleRoomEvents SSE 事件流：先补发 since 之后的存量行动，再实时推 action/seats/close；
// 每 25s 发心跳注释行保活。客户端掉线由 EventSource 自动重连 + since 兜底。
func (s *Server) handleRoomEvents(w http.ResponseWriter, r *http.Request) {
	code := r.PathValue("code")
	since, err := strconv.Atoi(r.URL.Query().Get(roomSinceKey))
	if err != nil || since < 0 {
		since = -1
	}
	// 先校验房间存在（不存在直接 404，不挂长连接）
	snap, err := s.rooms.getRoom(code, since, "")
	if err != nil {
		roomWriteErr(w, err)
		return
	}
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming unsupported", http.StatusInternalServerError)
		return
	}
	// 先订阅再补发存量：订阅后到达的事件进通道，存量行可能与之重复，由客户端按 seq 去重
	ch := s.rooms.subscribe(code)
	defer s.rooms.unsubscribe(code, ch)

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("X-Accel-Buffering", "no")
	fmt.Fprintf(w, ": connected\n\n")
	flusher.Flush()

	// 补发存量行动（seq > since 的部分）
	for _, a := range snap.Actions {
		if data, err := json.Marshal(a); err == nil {
			w.Write(sseFrame(roomEvAction, data))
		}
	}
	flusher.Flush()

	ping := time.NewTicker(roomSSEHeartbeat)
	defer ping.Stop()
	for {
		select {
		case <-r.Context().Done():
			return
		case msg := <-ch:
			if _, err := w.Write(msg); err != nil {
				return
			}
			flusher.Flush()
		case <-ping.C:
			if _, err := fmt.Fprintf(w, ": ping\n\n"); err != nil {
				return
			}
			flusher.Flush()
		}
	}
}
