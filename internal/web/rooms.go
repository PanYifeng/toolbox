package web

// 联机对局房间中继层（全桌游共用）：服务端只存「座位表 + 有序行动日志」，
// 不跑任何规则引擎——每个客户端用同一套确定性前端引擎重放日志收敛状态，
// 断线重连 = 拉全量日志重放。SSE 实时推送 + ?since=N 轮询兜底。
// 信任模型为好友对局：服务端仅校验座位归属与 base 序号（乐观并发），
// 规则合法性由各端引擎本地校验（提交前对照 legalActions）。

import (
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"sync"
	"time"
)

const (
	roomCodeLen      = 6                // 房间码长度
	roomBodyLimit    = 64 << 10         // 请求体上限 64KB（options + 单个 action 均远小于此）
	roomMaxSeats     = 6                // 座位数上限
	roomMaxActions   = 5000             // 单房间行动日志上限（防滥用）
	roomMaxLive      = 400              // 全局活跃房间上限
	roomTTL          = 48 * time.Hour   // 房间闲置过期时间
	roomSSEHeartbeat = 25 * time.Second // SSE 心跳间隔
)

// 房间事件名（SSE event: 行）
const (
	roomEvAction = "action"
	roomEvSeats  = "seats"
	roomEvClose  = "close"
	roomSinceKey = "since" // 快照查询参数：返回 seq > since 的行动
)

var (
	roomGamePattern   = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{2,63}$`)         // 游戏 id（工具页 id，如 game_splendor）
	roomClientPattern = regexp.MustCompile(`^[A-Za-z0-9_-]{8,64}$`)             // 客户端 id（前端 crypto.randomUUID 派生）
	roomNamePattern   = regexp.MustCompile(`^[\p{Han}\p{L}\p{N}_\-·. ]{1,24}$`) // 座位名：中英文/数字/常用符号
)

// roomSeat 单个座位：AI 座位 ClientID 恒空，人类座位被占后记录占座客户端
type roomSeat struct {
	Name     string `json:"name"`
	IsAI     bool   `json:"isAI"`
	ClientID string `json:"clientId,omitempty"`
	JoinedAt string `json:"joinedAt,omitempty"`
}

// roomAction 行动日志条目：Seat 为执行座位（可为 AI 座位），By 为实际提交者（机器人由人代驱）
type roomAction struct {
	Seq    int             `json:"seq"`
	Seat   int             `json:"seat"`
	By     string          `json:"by"`
	Action json.RawMessage `json:"action"`
	At     string          `json:"at"`
}

// room 单个房间：创建时快照 seed/options，之后只追加 Actions
type room struct {
	Code       string          `json:"code"`
	Game       string          `json:"game"`
	Seed       int64           `json:"seed"`
	Options    json.RawMessage `json:"options,omitempty"`
	Seats      []roomSeat      `json:"seats"`
	Actions    []roomAction    `json:"actions"`
	HostClient string          `json:"hostClient"`
	CreatedAt  string          `json:"createdAt"`
	UpdatedAt  string          `json:"updatedAt"`
	Closed     bool            `json:"closed"`
}

// roomsFile 落盘格式
type roomsFile struct {
	Rooms []room `json:"rooms"`
}

// roomStore 房间存储：互斥锁保护的 code->room 表 + 落盘 + SSE 订阅者广播
type roomStore struct {
	path string
	mu   sync.Mutex
	all  map[string]*room
	subs map[string]map[chan []byte]struct{} // SSE 订阅者（内存态，不落盘）
}

// newRoomStore 创建并加载；文件缺失视为空 store
func newRoomStore(path string) *roomStore {
	st := &roomStore{
		path: path,
		all:  map[string]*room{},
		subs: map[string]map[chan []byte]struct{}{},
	}
	st.load()
	return st
}

// load 从文件加载并顺带清理过期房间
func (s *roomStore) load() {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return
	}
	var f roomsFile
	if err := json.Unmarshal(data, &f); err != nil {
		log.Printf("rooms store load failed: %v", err)
		return
	}
	now := time.Now()
	for i := range f.Rooms {
		r := &f.Rooms[i]
		if r.Code == "" || roomExpired(r, now) {
			continue
		}
		s.all[r.Code] = r
	}
}

// persistLocked 原子落盘（调用方须持锁）
func (s *roomStore) persistLocked() {
	f := roomsFile{Rooms: make([]room, 0, len(s.all))}
	for _, r := range s.all {
		f.Rooms = append(f.Rooms, *r)
	}
	data, err := json.Marshal(f)
	if err != nil {
		return
	}
	dir := filepath.Dir(s.path)
	if dir == "" {
		dir = "."
	}
	tmp, err := os.CreateTemp(dir, ".rooms-*.tmp")
	if err != nil {
		return
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return
	}
	tmp.Close()
	_ = os.Rename(tmp.Name(), s.path)
}

// roomExpired 房间是否已过闲置期
func roomExpired(r *room, now time.Time) bool {
	t, err := time.Parse(time.RFC3339, r.UpdatedAt)
	return err != nil || now.Sub(t) > roomTTL
}

// sweepLocked 清理过期 + 超量房间（调用方须持锁）
func (s *roomStore) sweepLocked() {
	now := time.Now()
	for code, r := range s.all {
		if roomExpired(r, now) {
			delete(s.all, code)
		}
	}
	for len(s.all) > roomMaxLive {
		oldest := s.oldestLocked()
		if oldest == nil {
			break
		}
		delete(s.all, oldest.Code)
	}
}

// oldestLocked 找最后更新最早的房间（超量逐出用）
func (s *roomStore) oldestLocked() *room {
	var oldest *room
	for _, r := range s.all {
		if oldest == nil || r.UpdatedAt < oldest.UpdatedAt {
			oldest = r
		}
	}
	return oldest
}

// newRoomCodeLocked 生成未占用的 6 位房间码（lbAntiAlphabet 去混淆字符表）
func (s *roomStore) newRoomCodeLocked() string {
	for try := 0; try < 16; try++ {
		b := make([]byte, roomCodeLen)
		if _, err := rand.Read(b); err != nil {
			continue
		}
		code := make([]byte, roomCodeLen)
		for i, v := range b {
			code[i] = lbAntiAlphabet[int(v)%len(lbAntiAlphabet)]
		}
		if _, taken := s.all[string(code)]; !taken {
			return string(code)
		}
	}
	return "" // 理论不可达（31^6 空间）
}

// subscribe 订阅房间 SSE 事件流（返回事件通道；缓冲满则事件被丢，客户端重连时用 since 兜底）
func (s *roomStore) subscribe(code string) chan []byte {
	ch := make(chan []byte, 64)
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.subs[code] == nil {
		s.subs[code] = map[chan []byte]struct{}{}
	}
	s.subs[code][ch] = struct{}{}
	return ch
}

// unsubscribe 退订
func (s *roomStore) unsubscribe(code string, ch chan []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if set := s.subs[code]; set != nil {
		delete(set, ch)
		if len(set) == 0 {
			delete(s.subs, code)
		}
	}
}

// broadcastLocked 向房间全部订阅者非阻塞推送（调用方须持锁）
func (s *roomStore) broadcastLocked(code string, msg []byte) {
	for ch := range s.subs[code] {
		select {
		case ch <- msg:
		default: // 订阅者跟不上即丢弃，客户端重连时用 since 兜底
		}
	}
}

// emitLocked 组装并广播一条 SSE 事件（调用方须持锁，保证事件与落盘同序）
func (s *roomStore) emitLocked(code, event string, data any) {
	payload, err := json.Marshal(data)
	if err != nil {
		return
	}
	s.broadcastLocked(code, sseFrame(event, payload))
}

// sseFrame 拼装 SSE 帧（event + data）
func sseFrame(event string, payload []byte) []byte {
	return []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", event, payload))
}

// ---- 房间操作（错误经 apiErr 映射 HTTP 状态码） ----

// apiErr 带状态码的错误
type apiErr struct {
	code int
	msg  string
}

func (e *apiErr) Error() string { return e.msg }

// 房间操作错误
var (
	errRoomNotFound = &apiErr{http.StatusNotFound, "room not found"}
	errRoomClosed   = &apiErr{http.StatusConflict, "room closed"}
	errNoOpenSeat   = &apiErr{http.StatusConflict, "no open seat"}
	errSeqConflict  = &apiErr{http.StatusConflict, "seq conflict"}
	errNotSeatOwner = &apiErr{http.StatusForbidden, "not seat owner"}
	errRoomLogFull  = &apiErr{http.StatusConflict, "room log full"}
	errTooManyRooms = &apiErr{http.StatusServiceUnavailable, "too many rooms"}
	errBadInput     = &apiErr{http.StatusBadRequest, "bad input"}
)

// roomCreateInput 创建房间请求
type roomCreateInput struct {
	Game     string          `json:"game"`
	ClientID string          `json:"clientId"`
	Seats    []roomSeat      `json:"seats"`
	Options  json.RawMessage `json:"options"`
}

// roomJoinInput 加入房间请求（Seat 为 nil 或 -1 = 自动取首个空人类座位；指针区分「未传」与「座位 0」）
type roomJoinInput struct {
	ClientID string `json:"clientId"`
	Name     string `json:"name"`
	Seat     *int   `json:"seat"`
}

// roomActorInput 行动提交请求：Base = 客户端计算该行动时的日志长度（乐观并发）
type roomActorInput struct {
	ClientID string          `json:"clientId"`
	Seat     int             `json:"seat"`
	Base     int             `json:"base"`
	Action   json.RawMessage `json:"action"`
}

// createRoom 创建房间：校验输入 → 生成 code/seed → 落盘
func (s *roomStore) createRoom(in roomCreateInput) (roomView, error) {
	if !roomGamePattern.MatchString(in.Game) || !roomClientPattern.MatchString(in.ClientID) {
		return roomView{}, errBadInput
	}
	if len(in.Seats) < 1 || len(in.Seats) > roomMaxSeats {
		return roomView{}, errBadInput
	}
	hasHuman := false
	for i := range in.Seats {
		se := &in.Seats[i]
		se.Name = trimRoomName(se.Name)
		// 人类座位允许空名（占位待加入，join 时填）；AI 座位必须有名（无人补填）
		if se.Name != "" && !roomNamePattern.MatchString(se.Name) {
			return roomView{}, errBadInput
		}
		if se.IsAI {
			if se.Name == "" {
				return roomView{}, errBadInput
			}
			se.ClientID = "" // AI 座位不允许携带客户端
		} else {
			hasHuman = true
		}
	}
	if !hasHuman {
		return roomView{}, errBadInput
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sweepLocked()
	if len(s.all) >= roomMaxLive {
		return roomView{}, errTooManyRooms
	}
	code := s.newRoomCodeLocked()
	if code == "" {
		return roomView{}, errTooManyRooms
	}
	now := time.Now().UTC().Format(time.RFC3339)
	seed, _ := rand.Int(rand.Reader, big.NewInt(1<<62))
	r := &room{
		Code: code, Game: in.Game, Seed: seed.Int64(), Options: in.Options,
		Seats: in.Seats, HostClient: in.ClientID, CreatedAt: now, UpdatedAt: now,
	}
	s.all[code] = r
	s.persistLocked()
	log.Printf("room created: code=%s game=%s seats=%d", code, in.Game, len(in.Seats))
	return toRoomView(r, in.ClientID, -1), nil
}

// getRoom 取房间公开快照（me 用于标记 you；Actions 只带 seq > since 的尾部）
func (s *roomStore) getRoom(code string, since int, me string) (roomView, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.all[code]
	if !ok {
		return roomView{}, errRoomNotFound
	}
	return toRoomView(r, me, since), nil
}

// joinRoom 占座：指定座位或自动选首个空人类座位，广播 seats 事件；返回公开快照与座位号
func (s *roomStore) joinRoom(code string, in roomJoinInput) (roomView, int, error) {
	if !roomClientPattern.MatchString(in.ClientID) {
		return roomView{}, -1, errBadInput
	}
	name := trimRoomName(in.Name)
	if !roomNamePattern.MatchString(name) {
		return roomView{}, -1, errBadInput
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.all[code]
	if !ok {
		return roomView{}, -1, errRoomNotFound
	}
	if r.Closed {
		return roomView{}, -1, errRoomClosed
	}
	seat := pickOpenSeat(r, in.Seat)
	if seat < 0 {
		return roomView{}, -1, errNoOpenSeat
	}
	r.Seats[seat].Name = name
	r.Seats[seat].ClientID = in.ClientID
	r.Seats[seat].JoinedAt = time.Now().UTC().Format(time.RFC3339)
	r.UpdatedAt = r.Seats[seat].JoinedAt
	s.persistLocked()
	log.Printf("room join: code=%s seat=%d name=%q", code, seat, name)
	s.emitLocked(code, roomEvSeats, seatView(r))
	return toRoomView(r, in.ClientID, -1), seat, nil
}

// pickOpenSeat 选座位：指定编号须为空人类座位，否则首个空人类座位；返回 -1 表示无空位
func pickOpenSeat(r *room, want *int) int {
	target := -1
	if want != nil && *want >= 0 {
		target = *want
	} else {
		for i := range r.Seats {
			if !r.Seats[i].IsAI && r.Seats[i].ClientID == "" {
				target = i
				break
			}
		}
	}
	if target < 0 || target >= len(r.Seats) || r.Seats[target].IsAI || r.Seats[target].ClientID != "" {
		return -1
	}
	return target
}

// seatRow 座位表行（公开视图：不含 clientId，防占座冒充；me 命中时标 you）
type seatRow struct {
	Seat  int    `json:"seat"`
	Name  string `json:"name"`
	IsAI  bool   `json:"isAI"`
	Taken bool   `json:"taken"`
	You   bool   `json:"you,omitempty"`
}

// actionView 行动公开视图（不含提交者 clientId）
type actionView struct {
	Seq    int             `json:"seq"`
	Seat   int             `json:"seat"`
	Action json.RawMessage `json:"action"`
	At     string          `json:"at"`
}

// roomView 房间公开视图：座位/行动均脱敏 clientId
type roomView struct {
	Code    string          `json:"code"`
	Game    string          `json:"game"`
	Seed    int64           `json:"seed"`
	Options json.RawMessage `json:"options,omitempty"`
	Seats   []seatRow       `json:"seats"`
	Actions []actionView    `json:"actions"`
	Closed  bool            `json:"closed"`
	Count   int             `json:"count"` // 日志总长度（轮询游标）
	Host    bool            `json:"host,omitempty"` // me 为房主时为真（大厅「开始」按钮判定）
}

// toRoomView 转公开视图（me = 询问者 clientId，命中座位标 you、房主标 host；since 为 -1 时带全量行动）
func toRoomView(r *room, me string, since int) roomView {
	v := roomView{
		Code: r.Code, Game: r.Game, Seed: r.Seed, Options: r.Options,
		Seats: make([]seatRow, 0, len(r.Seats)), Closed: r.Closed, Count: len(r.Actions),
		Host: me != "" && me == r.HostClient,
	}
	for i, se := range r.Seats {
		v.Seats = append(v.Seats, seatRow{
			Seat: i, Name: se.Name, IsAI: se.IsAI,
			Taken: se.ClientID != "", You: me != "" && se.ClientID == me,
		})
	}
	start := 0
	if since > 0 {
		start = since + 1
	}
	if start < 0 || start > len(r.Actions) {
		start = len(r.Actions)
	}
	for _, a := range r.Actions[start:] {
		v.Actions = append(v.Actions, actionView{Seq: a.Seq, Seat: a.Seat, Action: a.Action, At: a.At})
	}
	return v
}

// seatView 输出带座位号的公开座位表（SSE seats 事件用）
func seatView(r *room) map[string]any {
	rows := make([]seatRow, 0, len(r.Seats))
	for i, se := range r.Seats {
		rows = append(rows, seatRow{Seat: i, Name: se.Name, IsAI: se.IsAI, Taken: se.ClientID != ""})
	}
	return map[string]any{"seats": rows, "closed": r.Closed}
}

// leaveRoom 释放自己的座位（随时可离；对局状态在日志里，重进即接管原座位）
func (s *roomStore) leaveRoom(code, clientID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.all[code]
	if !ok {
		return errRoomNotFound
	}
	left := false
	for i := range r.Seats {
		if r.Seats[i].ClientID == clientID {
			r.Seats[i].ClientID = ""
			r.Seats[i].JoinedAt = ""
			left = true
		}
	}
	if !left {
		return errNotSeatOwner
	}
	r.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	s.persistLocked()
	log.Printf("room leave: code=%s client=%s", code, clientID)
	s.emitLocked(code, roomEvSeats, seatView(r))
	return nil
}

// appendAction 追加行动：base 必须等于当前日志长度（乐观并发，双端竞态由 409 裁决），
// 人类座位须本人提交，AI 座位须由在座人类代驱
func (s *roomStore) appendAction(code string, in roomActorInput) (actionView, error) {
	if !roomClientPattern.MatchString(in.ClientID) || len(in.Action) == 0 || len(in.Action) > roomBodyLimit {
		return actionView{}, errBadInput
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.all[code]
	if !ok {
		return actionView{}, errRoomNotFound
	}
	if r.Closed {
		return actionView{}, errRoomClosed
	}
	if len(r.Actions) >= roomMaxActions {
		return actionView{}, errRoomLogFull
	}
	if in.Base != len(r.Actions) {
		return actionView{}, errSeqConflict
	}
	if err := roomAuthorize(r, in); err != nil {
		return actionView{}, err
	}
	act := roomAction{
		Seq: len(r.Actions), Seat: in.Seat, By: in.ClientID,
		Action: in.Action, At: time.Now().UTC().Format(time.RFC3339),
	}
	r.Actions = append(r.Actions, act)
	r.UpdatedAt = act.At
	s.persistLocked()
	s.emitLocked(code, roomEvAction, actionView{Seq: act.Seq, Seat: act.Seat, Action: act.Action, At: act.At})
	return actionView{Seq: act.Seq, Seat: act.Seat, Action: act.Action, At: act.At}, nil
}

// roomAuthorize 座位归属校验：人类座位仅本人；AI 座位允许任意在座人类代驱
func roomAuthorize(r *room, in roomActorInput) error {
	if in.Seat < 0 || in.Seat >= len(r.Seats) {
		return errBadInput
	}
	se := r.Seats[in.Seat]
	if se.IsAI {
		for i := range r.Seats {
			if !r.Seats[i].IsAI && r.Seats[i].ClientID == in.ClientID {
				return nil // 在座人类可代驱机器人
			}
		}
		return errNotSeatOwner
	}
	if se.ClientID != in.ClientID {
		return errNotSeatOwner
	}
	return nil
}

// closeRoom 房主关闭房间（拒收后续行动）
func (s *roomStore) closeRoom(code, clientID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	r, ok := s.all[code]
	if !ok {
		return errRoomNotFound
	}
	if r.HostClient != clientID {
		return errNotSeatOwner
	}
	r.Closed = true
	r.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
	s.persistLocked()
	log.Printf("room closed: code=%s", code)
	s.emitLocked(code, roomEvClose, map[string]bool{"closed": true})
	return nil
}

// trimRoomName 规整座位名：去首尾空白 + 折叠连续空白
func trimRoomName(name string) string {
	var out []rune
	prevSpace := false
	for _, c := range name {
		if c == '\t' {
			c = ' '
		}
		if c == ' ' && prevSpace {
			continue
		}
		out = append(out, c)
		prevSpace = c == ' '
	}
	start, end := 0, len(out)
	for start < end && out[start] == ' ' {
		start++
	}
	for end > start && out[end-1] == ' ' {
		end--
	}
	return string(out[start:end])
}
