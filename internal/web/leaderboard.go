package web

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"toolbox/internal/config"
)

// 小游戏持久化排行榜：服务端落盘 top N、IP 限频、分数 sanity 上限，
// 破纪录（#1）由服务端 HMAC 签发 TB-R- 防伪码——区别于纯前端复算的普通纪念卡，
// 破纪录卡不可自造，可在「纪念卡验真」走 /api/leaderboard/verify 复验。
// 落盘模式镜像 protoken.go 的 proTokenStore（load/maybeReload/persistLocked 原子写）。

const (
	lbTopN         = 10                  // 每游戏保留与展示的前 N 名
	lbRecordPrefix = "TB-R-"             // 破纪录卡防伪码前缀（区别于普通 TB-）
	lbAntiAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789" // 31 字符表，与 cert.js fmtCode 一致
)

// lbScoreCaps 各游戏分数 sanity 上限（超上限判异常直接拒）。键为 cert 主题键 game-<name>。
// 依各游戏计分语义定的 generous 上限，挡掉明显伪造（如 9999999）。
var lbScoreCaps = map[string]int{
	"game-2048":        1000000,
	"game-snake":       100000,
	"game-tetris":      500000,
	"game-ttt":         2000000000, // 无实际上限：连胜数计分，仅反伪造 sanity 边界
	"game-spider":      5000,
	"game-minesweeper": 2000000000, // 无实际上限：速度累计分，仅作反伪造 sanity 边界（真实游玩远达不到）
}

// leaderboardEntry 单条榜单记录。IP/SignedCode 不下发前端（top() 已剥离 IP）。
type leaderboardEntry struct {
	Name       string `json:"name"`
	Score      int    `json:"score"`
	Time       string `json:"time"`               // ISO8601 到分钟，与卡面 displayTime 一致
	IP         string `json:"ip,omitempty"`        // 仅服务端审计，不下发前端
	SignedCode string `json:"signedCode,omitempty"` // 仅破纪录（曾为 #1）项持有，永久有效
}

// leaderboardStore 管理各游戏 top N：加载 / mtime 重载 / 提交入榜 / 签发 / 验签 / 持久化。
type leaderboardStore struct {
	path   string
	secret []byte
	mu     sync.RWMutex
	data   map[string][]leaderboardEntry // 键=game 主题键，值已按 score 降序
	mtime  time.Time
}

// newLeaderboardStore 创建并加载 store；HMAC 密钥按 Secret→AdminSecret→Site.URL 派生。
// 文件缺失视为空 store，不报错（镜像 protoken.go 行为）。
func newLeaderboardStore(cfg config.LeaderboardConfig, adminSecret, siteURL string) *leaderboardStore {
	secret := []byte(cfg.Secret)
	if len(secret) == 0 && adminSecret != "" {
		secret = []byte(adminSecret)
	}
	if len(secret) == 0 {
		// 降级：仅弱防伪，记日志提示生产应配 secret 或 adminSecret
		log.Printf("leaderboard: secret/adminSecret empty, falling back to site.URL-derived HMAC key — record cards only weakly protected")
		secret = []byte(siteURL)
	}
	st := &leaderboardStore{path: cfg.File, secret: secret, data: map[string][]leaderboardEntry{}}
	st.load()
	return st
}

// load 从文件加载（缺失或解析失败均降级为空 store）
func (s *leaderboardStore) load() {
	data, err := os.ReadFile(s.path)
	if err != nil {
		return
	}
	m := map[string][]leaderboardEntry{}
	if err := json.Unmarshal(data, &m); err != nil {
		return
	}
	s.mu.Lock()
	s.data = m
	if fi, err := os.Stat(s.path); err == nil {
		s.mtime = fi.ModTime()
	}
	s.mu.Unlock()
}

// maybeReload 文件 mtime 变化时重载（作者外部编辑后自动生效）
func (s *leaderboardStore) maybeReload() {
	fi, err := os.Stat(s.path)
	if err != nil {
		return
	}
	s.mu.RLock()
	same := !fi.ModTime().After(s.mtime)
	s.mu.RUnlock()
	if same {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if !fi.ModTime().After(s.mtime) {
		return
	}
	if m, err := readLBFile(s.path); err == nil {
		s.data = m
		s.mtime = fi.ModTime()
	}
}

// readLBFile 读取并解析排行榜文件
func readLBFile(path string) (map[string][]leaderboardEntry, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	m := map[string][]leaderboardEntry{}
	if err := json.Unmarshal(data, &m); err != nil {
		return nil, err
	}
	return m, nil
}

// top 返回某游戏前 n 名的副本（剥离 IP 字段，前端不可见）
func (s *leaderboardStore) top(game string, n int) []leaderboardEntry {
	s.maybeReload()
	s.mu.RLock()
	defer s.mu.RUnlock()
	src := s.data[game]
	if len(src) == 0 {
		return []leaderboardEntry{}
	}
	if n > len(src) {
		n = len(src)
	}
	out := make([]leaderboardEntry, n)
	for i := 0; i < n; i++ {
		// SignedCode 不下发前端：破纪录码仅在金版卡核销通过后由 /api/game/record-status 下发
		out[i] = leaderboardEntry{Name: src[i].Name, Score: src[i].Score, Time: src[i].Time}
	}
	return out
}

// record 返回当前 #1（前端据此判断是否破纪录）；空榜返回 ok=false
func (s *leaderboardStore) record(game string) (leaderboardEntry, bool) {
	s.maybeReload()
	s.mu.RLock()
	defer s.mu.RUnlock()
	list := s.data[game]
	if len(list) == 0 {
		return leaderboardEntry{}, false
	}
	e := list[0]
	return leaderboardEntry{Name: e.Name, Score: e.Score, Time: e.Time, SignedCode: e.SignedCode}, true
}

// submitResult 提交结果
type submitResult struct {
	rank     int
	isRecord bool
	code     string
	name     string // 入榜姓名（已 trim，与签名一致）
	time     string // 完成时间串（与卡面 displayTime / 签名 timeStr 一致）
	ok       bool
	reason   string
}

// submit 校验并提交分数：sanity 上限 → 入榜降序 → 截断 top N → 破纪录则签发。
// 返回名次、是否破纪录、签发码（仅破纪录非空）。code 永久有效（曾为 #1 即可复验）。
func (s *leaderboardStore) submit(game, name string, score int, ip string) submitResult {
	cap, known := lbScoreCaps[game]
	if !known {
		return submitResult{ok: false, reason: "unknown game"}
	}
	if score < 0 || score > cap {
		return submitResult{ok: false, reason: "score out of range"}
	}
	if name = strings.TrimSpace(name); name == "" || len(name) > 30 {
		return submitResult{ok: false, reason: "invalid name"}
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	list := s.data[game]
	isRecord := len(list) == 0 || score > list[0].Score
	entry := leaderboardEntry{Name: name, Score: score, Time: time.Now().Format("2006-01-02 15:04"), IP: ip}
	if isRecord {
		entry.SignedCode = s.signRecord(game, name, score, entry.Time)
	}

	// 降序构建新榜，同时记录插入位置即名次（1-based）
	newList := make([]leaderboardEntry, 0, len(list)+1)
	rank, added := 0, false
	for i, e := range list {
		if !added && score > e.Score {
			newList = append(newList, entry)
			added = true
			rank = i + 1
		}
		newList = append(newList, e)
	}
	if !added {
		newList = append(newList, entry)
		rank = len(newList)
	}
	if len(newList) > lbTopN {
		newList = newList[:lbTopN]
	}
	s.data[game] = newList
	// 落榜（被截断）名次标为 N+1，表示未上榜但已记录
	if rank > lbTopN {
		rank = lbTopN + 1
	}

	s.persistLocked()

	code := ""
	if isRecord {
		code = entry.SignedCode
	}
	return submitResult{rank: rank, isRecord: isRecord, code: code, name: name, time: entry.Time, ok: true}
}

// verifyCode 复验破纪录卡防伪码：常数时间比对，归一化（去横线/空格、转大写）后比较。
func (s *leaderboardStore) verifyCode(game, name string, score int, timeStr, code string) bool {
	expected := s.signRecord(game, name, score, timeStr)
	ne := normLBCode(expected)
	nc := normLBCode(code)
	if len(ne) != len(nc) {
		return false
	}
	return hmac.Equal([]byte(ne), []byte(nc))
}

// signRecord 由服务端 secret 对 (game|name|score|time) HMAC-SHA256 签发 TB-R- 防伪码。
// 取 HMAC 前 12 字节按 ANTI_ALPHABET 取模映射，格式 TB-R-XXXX-XXXX-XXXX（与 cert.js fmtCode 视觉一致）。
func (s *leaderboardStore) signRecord(game, name string, score int, timeStr string) string {
	msg := "RECORD|" + game + "|" + name + "|" + strconv.Itoa(score) + "|" + timeStr
	mac := hmac.New(sha256.New, s.secret)
	mac.Write([]byte(msg))
	sum := mac.Sum(nil)
	code := make([]byte, 12)
	for i := 0; i < 12; i++ {
		code[i] = lbAntiAlphabet[int(sum[i])%len(lbAntiAlphabet)]
	}
	return lbRecordPrefix + string(code[0:4]) + "-" + string(code[4:8]) + "-" + string(code[8:12])
}

// normLBCode 归一化防伪码用于比对：转大写、去横线与空格
func normLBCode(s string) string {
	s = strings.ToUpper(s)
	s = strings.ReplaceAll(s, "-", "")
	s = strings.ReplaceAll(s, " ", "")
	return s
}

// persistLocked 原子写回整个排行榜（调用方持写锁）。镜像 protoken.go。
func (s *leaderboardStore) persistLocked() {
	data, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return
	}
	dir := filepath.Dir(s.path)
	if dir == "" {
		dir = "."
	}
	tmp, err := os.CreateTemp(dir, ".leaderboard-*.tmp")
	if err != nil {
		return
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return
	}
	tmp.Close()
	if err := os.Rename(tmp.Name(), s.path); err == nil {
		if fi, err := os.Stat(s.path); err == nil {
			s.mtime = fi.ModTime()
		}
	}
}

// handleLeaderboardGet 返回某游戏前十名 + 当前纪录（前端展示与判断是否破纪录）
func (s *Server) handleLeaderboardGet(w http.ResponseWriter, r *http.Request) {
	game := r.PathValue("game")
	resp := map[string]any{
		"entries": s.lb.top(game, lbTopN),
	}
	if rec, ok := s.lb.record(game); ok {
		resp["record"] = map[string]any{"name": rec.Name, "score": rec.Score, "time": rec.Time}
	} else {
		resp["record"] = nil
	}
	writeJSON(w, resp)
}

// handleLeaderboardSubmit 接收分数提交：IP 限频 → sanity 上限 → 入榜 → 破纪录签发。
func (s *Server) handleLeaderboardSubmit(w http.ResponseWriter, r *http.Request) {
	game := r.PathValue("game")
	if !s.lbRL.allow(clientIP(r)) {
		w.WriteHeader(http.StatusTooManyRequests)
		writeJSON(w, map[string]any{"ok": false, "message": "too many submissions"})
		return
	}
	var req struct {
		Name  string `json:"name"`
		Score int    `json:"score"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]any{"ok": false, "message": "invalid request"})
		return
	}
	res := s.lb.submit(game, req.Name, req.Score, clientIP(r))
	if !res.ok {
		w.WriteHeader(http.StatusUnprocessableEntity)
		writeJSON(w, map[string]any{"ok": false, "message": res.reason})
		return
	}
	resp := map[string]any{
		"ok":       true,
		"rank":     res.rank,
		"isRecord": res.isRecord,
		"entries":  s.lb.top(game, lbTopN),
	}
	// 破纪录：创建金版卡核销请求（pending），返回 claimId 供前端走站主确认门。
	// TB-R- 码不再随 submit 下发前端，仅在核销通过后由 /api/game/record-status 下发。
	if res.isRecord {
		claim := s.rv.create(recordClaim{Game: game, Name: res.name, Score: req.Score, Time: res.time, SignedCode: res.code})
		resp["claimId"] = claim.ID
		resp["recordTime"] = res.time
	}
	writeJSON(w, resp)
}

// handleLeaderboardVerify 复验破纪录卡防伪码（cert-verify 对 TB-R- 码走此端点）
func (s *Server) handleLeaderboardVerify(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Game  string `json:"game"`
		Name  string `json:"name"`
		Score int    `json:"score"`
		Time  string `json:"time"`
		Code  string `json:"code"`
	}
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<16)).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		writeJSON(w, map[string]any{"valid": false, "message": "invalid request"})
		return
	}
	valid := s.lb.verifyCode(req.Game, req.Name, req.Score, req.Time, req.Code)
	writeJSON(w, map[string]any{"valid": valid, "isRecord": valid})
}
