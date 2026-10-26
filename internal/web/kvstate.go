package web

// state 存储层：可选策略——local=本地 JSON 文件原子写（原行为），redis=外部 Redis 写透。
// 由 config.storage 驱动（默认 redis）；七个 store（leaderboard / pro tokens / pro requests /
// record claims / errata claims / paid reports / rooms）的读写统一收口到 stateIO：
//   - local 模式：与旧版完全兼容（同目录 tmp→rename 原子写；缩进格式默认保持，
//     rooms.json 原为紧凑格式，经 compact() 保持不变——不写脏已有文件）
//   - redis 模式：每 store 一个 string 键存紧凑 JSON（键 = KeyPrefix + slug），
//     首次发现 redis 键为空而本地文件有数据时种子导入一次（本地文件只读不改写）；
//     热重载（mtime 轮询）仅 local 模式有效，redis 模式本进程即唯一写者
//   - 密码仅从环境变量 REDIS_PASSWORD 读取，不进 config、不进日志
//
// Redis 后端为 RESP 直连最小客户端（零第三方依赖，保持零 CGO 交叉编译）。
// 单连接 + 互斥锁串行：当前写频为个位数 QPS 级，足够；断线自动重建重试一次。

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"toolbox/internal/config"
)

// 各 store 的 redis 键 slug（最终键 = KeyPrefix + slug，如 "tb:lb"）。
// slug 固定不含路径信息——切换驱动不产生孤儿键。
const (
	kvKeyLeaderboard = "lb"
	kvKeyProTokens   = "pro-tokens"
	kvKeyProRequests = "pro-requests"
	kvKeyRecordClms  = "record-claims"
	kvKeyErrataClms  = "errata-claims"
	kvKeyPaidReports = "paid-reports"
	kvKeyRooms       = "rooms"
)

// errKVUnavailable redis 后端不可用（启动 fail-fast 用）
var errKVUnavailable = errors.New("state storage backend unavailable")

// stateKV 后端接口：Load 返回键下 JSON（键不存在返回 nil,nil）
type stateKV interface {
	Load(key string) ([]byte, error)
	Save(key string, data []byte) error
}

// —— stateIO：单 store 读写门面 ——

// stateIO 单 store 的读写门面。path 在 redis 模式下仅用于首次种子导入（只读）。
// 缓存字段（cached/lmt/loaded）由所属 store 的互斥锁保护，本类型自身不加锁。
type stateIO struct {
	path     string
	slug     string
	kv       stateKV // nil = local 模式
	noIndent bool    // local 模式写紧凑 JSON（rooms.json 原即紧凑，保持不变）
	lmt      time.Time
	cached   []byte // 上次读取的数据（mtime 未变时免重读；redis 模式直接缓存）
	loaded   bool   // 是否已完成首次读取（redis 模式含种子迁移）
}

// newStateIO 构建 stateIO
func newStateIO(path, slug string, kv stateKV) stateIO {
	return stateIO{path: path, slug: slug, kv: kv}
}

// compact local 模式也用紧凑 JSON 写（与该文件历史格式保持一致）
func (s stateIO) compact() stateIO {
	s.noIndent = true
	return s
}

// loadSync 读取最新数据。changed=true 表示与上次读取不同（首次读取或本地 mtime 变化），
// 调用方据此决定是否重解析交换内存表。文件缺失/不可读沿用内存副本（与旧版 maybeReload 行为一致）。
func (s *stateIO) loadSync() (data []byte, changed bool, err error) {
	if s.kv == nil {
		return s.loadLocal()
	}
	return s.loadRemote()
}

// loadLocal 本地模式：mtime 未变返回缓存；变化则重读并刷新缓存
func (s *stateIO) loadLocal() ([]byte, bool, error) {
	fi, serr := os.Stat(s.path)
	if serr != nil {
		return s.cached, false, nil
	}
	if s.loaded && fi.ModTime().Equal(s.lmt) {
		return s.cached, false, nil
	}
	data, rerr := os.ReadFile(s.path)
	if rerr != nil {
		return s.cached, false, nil
	}
	s.cached, s.lmt, s.loaded = data, fi.ModTime(), true
	return data, true, nil
}

// loadRemote redis 模式：读一次后缓存（本进程即唯一写者）；键为空时尝试种子迁移
func (s *stateIO) loadRemote() ([]byte, bool, error) {
	if s.loaded {
		return s.cached, false, nil
	}
	data, kerr := s.kv.Load(s.slug)
	if kerr != nil {
		return nil, false, kerr
	}
	if len(data) > 0 {
		s.cached, s.loaded = data, true
		return data, true, nil
	}
	local, serr := s.seedFromLocal()
	if serr != nil {
		return nil, false, serr
	}
	s.cached, s.loaded = local, true
	return local, true, nil
}

// seedFromLocal 种子迁移：redis 键为空而本地文件有数据 → 紧凑化后导入 redis 一次。
// 本地文件只读不改写（零污染）；redis 已有数据时不会走到这里，不存在覆盖。
func (s *stateIO) seedFromLocal() ([]byte, error) {
	local, err := os.ReadFile(s.path)
	if err != nil || len(local) == 0 || !json.Valid(local) {
		return nil, nil
	}
	var buf bytes.Buffer
	if json.Compact(&buf, local) != nil {
		return nil, nil
	}
	if err := s.kv.Save(s.slug, buf.Bytes()); err != nil {
		return nil, err
	}
	log.Printf("kv state seeded %s from local file %s (%d bytes)", s.slug, s.path, buf.Len())
	return local, nil
}

// marshal 序列化：redis=紧凑（精炼）；local=缩进格式（人工可读，与各文件历史格式一致）
func (s *stateIO) marshal(v any) ([]byte, error) {
	if s.kv != nil || s.noIndent {
		return json.Marshal(v)
	}
	return json.MarshalIndent(v, "", "  ")
}

// write 写回：local=同目录 tmp→rename 原子写并刷新 mtime 缓存（避免误判为外部变更）；
// redis=SET 并刷新缓存
func (s *stateIO) write(data []byte) error {
	if s.kv != nil {
		if err := s.kv.Save(s.slug, data); err != nil {
			return err
		}
		s.cached = data
		return nil
	}
	dir := filepath.Dir(s.path)
	if dir == "" {
		dir = "."
	}
	tmp, err := os.CreateTemp(dir, ".kvstate-*.tmp")
	if err != nil {
		return err
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(data); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	if err := os.Rename(tmp.Name(), s.path); err != nil {
		return err
	}
	s.cached = data
	s.loaded = true
	if fi, err := os.Stat(s.path); err == nil {
		s.lmt = fi.ModTime()
	}
	return nil
}

// —— redis 后端：RESP 最小客户端 ——

// redisKV 单连接 redis 客户端（GET/SET/AUTH/SELECT/PING 子集）
type redisKV struct {
	addr     string
	password string
	db       int
	prefix   string

	mu   sync.Mutex
	conn net.Conn
	rd   *bufio.Reader
}

// newRedisKVStore 连接 + 鉴权 + 探活；失败返回包装 errKVUnavailable 的错误（启动 fail-fast）
func newRedisKVStore(rc config.RedisConfig) (*redisKV, error) {
	s := &redisKV{
		addr:     net.JoinHostPort(rc.Host, strconv.Itoa(rc.Port)),
		password: os.Getenv("REDIS_PASSWORD"), // 密码只走环境变量
		db:       rc.DB,
		prefix:   rc.KeyPrefix,
	}
	if err := s.connect(); err != nil {
		return nil, err
	}
	return s, nil
}

// connect 建立连接并完成鉴权 / 选库 / 探活
func (s *redisKV) connect() error {
	conn, err := net.DialTimeout("tcp", s.addr, 5*time.Second)
	if err != nil {
		return fmt.Errorf("%w: dial %s: %v", errKVUnavailable, s.addr, err)
	}
	s.conn = conn
	s.rd = bufio.NewReader(conn)
	if err := s.authPing(); err != nil {
		s.closeConn()
		return err
	}
	return nil
}

// authPing AUTH（有密码时）+ SELECT（非 0 库）+ PING 探活
func (s *redisKV) authPing() error {
	if s.password != "" {
		if _, err := s.do("AUTH", s.password); err != nil {
			return fmt.Errorf("%w: auth failed: %v", errKVUnavailable, err)
		}
	}
	if s.db != 0 {
		if _, err := s.do("SELECT", strconv.Itoa(s.db)); err != nil {
			return fmt.Errorf("%w: select db %d: %v", errKVUnavailable, s.db, err)
		}
	}
	if _, err := s.do("PING"); err != nil {
		return fmt.Errorf("%w: ping: %v", errKVUnavailable, err)
	}
	return nil
}

// closeConn 关闭当前连接（置空后下次操作自动重建）
func (s *redisKV) closeConn() {
	if s.conn != nil {
		s.conn.Close()
		s.conn = nil
	}
}

// do 发送一条命令并读单条回复（须持 s.mu；连接失效自动重建）
func (s *redisKV) do(args ...string) (string, error) {
	if s.conn == nil {
		if err := s.connect(); err != nil {
			return "", err
		}
	}
	_ = s.conn.SetDeadline(time.Now().Add(5 * time.Second))
	if _, err := s.conn.Write(encodeRESP(args)); err != nil {
		s.closeConn()
		return "", err
	}
	v, err := s.readReply()
	if err != nil {
		s.closeConn()
	}
	return v, err
}

// encodeRESP 组装 RESP 数组请求（bulk 长度按字节计，中文内容安全）
func encodeRESP(args []string) []byte {
	var b strings.Builder
	fmt.Fprintf(&b, "*%d\r\n", len(args))
	for _, a := range args {
		fmt.Fprintf(&b, "$%d\r\n%s\r\n", len(a), a)
	}
	return []byte(b.String())
}

// readReply 读一条 RESP 回复：+简单串 / :整数 / $bulk；$-1（键不存在）返回空串
func (s *redisKV) readReply() (string, error) {
	line, err := s.rd.ReadString('\n')
	if err != nil {
		return "", err
	}
	line = strings.TrimRight(line, "\r\n")
	switch {
	case strings.HasPrefix(line, "+"), strings.HasPrefix(line, ":"):
		return line[1:], nil
	case strings.HasPrefix(line, "-"):
		return "", errors.New(line[1:])
	case line == "$-1":
		return "", nil
	case strings.HasPrefix(line, "$"):
		n, err := strconv.Atoi(line[1:])
		if err != nil || n < 0 {
			return "", fmt.Errorf("bad bulk header %q", line)
		}
		buf := make([]byte, n+2) // 数据 + 末尾 \r\n
		if _, err := readFull(s.rd, buf); err != nil {
			return "", err
		}
		return string(buf[:n]), nil
	default:
		return "", fmt.Errorf("unexpected reply %q", line)
	}
}

// readFull 读满 buf（bufio.Reader 读满语义的等价实现）
func readFull(rd *bufio.Reader, buf []byte) (int, error) {
	total := 0
	for total < len(buf) {
		n, err := rd.Read(buf[total:])
		total += n
		if err != nil {
			return total, err
		}
	}
	return total, nil
}

// Load 读键（须持 s.mu；键不存在返回 nil,nil）
func (s *redisKV) loadLocked(key string) ([]byte, error) {
	v, err := s.do("GET", s.prefix+key)
	if err != nil {
		return nil, fmt.Errorf("redis GET %s: %w", key, err)
	}
	if v == "" {
		return nil, nil
	}
	return []byte(v), nil
}

// Load 读键（键不存在返回 nil,nil）
func (s *redisKV) Load(key string) ([]byte, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.loadLocked(key)
}

// Save 写键；断线自动重建后重试一次，避开瞬时抖动（须持 s.mu）
func (s *redisKV) saveLocked(key string, data []byte) error {
	if _, err := s.do("SET", s.prefix+key, string(data)); err != nil {
		if _, err2 := s.do("SET", s.prefix+key, string(data)); err2 != nil {
			return fmt.Errorf("redis SET %s: %v (retry: %v)", key, err, err2)
		}
	}
	return nil
}

// Save 写键；断线自动重建后重试一次
func (s *redisKV) Save(key string, data []byte) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.saveLocked(key, data)
}

// —— 工厂：按 storage 配置构建后端 ——

// newStateKV 构建后端；redis 未配 host 时降级 local 并告警（保护未升级配置的存量部署）。
// 返回 nil 即 local 模式。
func newStateKV(sc config.StorageConfig) (stateKV, error) {
	if !sc.UseRedis() {
		return nil, nil
	}
	if sc.Redis.Host == "" {
		log.Printf("kv state: storage.driver=redis but redis.host empty, falling back to local files")
		return nil, nil
	}
	return newRedisKVStore(sc.Redis)
}
