package web

// kvstate 存储层测试：stateIO local/redis 两种模式 + RESP 客户端对进程内假 redis 服务器的行为。
// 本地无 redis-server，故 redis 路径用 fake TCP 服务器覆盖协议与语义。

import (
	"bufio"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"toolbox/internal/config"
)

// memKV 进程内 stateKV 假后端（redis 语义：键不存在返回 nil,nil）
type memKV struct {
	mu sync.Mutex
	m  map[string]string
}

func newMemKV() *memKV { return &memKV{m: map[string]string{}} }

func (k *memKV) Load(key string) ([]byte, error) {
	k.mu.Lock()
	defer k.mu.Unlock()
	v, ok := k.m[key]
	if !ok {
		return nil, nil
	}
	return []byte(v), nil
}

func (k *memKV) Save(key string, data []byte) error {
	k.mu.Lock()
	defer k.mu.Unlock()
	k.m[key] = string(data)
	return nil
}

// —— fake redis TCP 服务器（RESP 子集：AUTH/SELECT/PING/GET/SET）——

// fakeRedis 进程内 redis 假服务器
type fakeRedis struct {
	ln   net.Listener
	pass string

	mu    sync.Mutex
	store map[string]string
	last  []string // 最近一条命令
}

// startFakeRedis 启动假服务器（监听 127.0.0.1:0）
func startFakeRedis(t *testing.T, pass string) *fakeRedis {
	t.Helper()
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	f := &fakeRedis{ln: ln, pass: pass, store: map[string]string{}}
	go f.serve()
	t.Cleanup(func() { ln.Close() })
	return f
}

// serve 接受连接并循环处理 RESP 命令（一次一连接，测试规模足够）
func (f *fakeRedis) serve() {
	for {
		conn, err := f.ln.Accept()
		if err != nil {
			return
		}
		f.handleConn(conn)
	}
}

// handleConn 处理单连接命令流
func (f *fakeRedis) handleConn(conn net.Conn) {
	defer conn.Close()
	rd := bufio.NewReader(conn)
	authed := f.pass == ""
	for {
		args, err := readRESPCommand(rd)
		if err != nil {
			return
		}
		var reply string
		if !authed && args[0] != "AUTH" {
			reply = "-NOAUTH Authentication required\r\n" // 与真实 redis 行为一致：未授权拒绝其它命令
		} else {
			f.mu.Lock()
			f.last = args
			reply = f.dispatch(args)
			f.mu.Unlock()
		}
		if args[0] == "AUTH" && len(args) >= 2 && args[1] == f.pass {
			authed = true
		}
		if _, err := conn.Write([]byte(reply)); err != nil {
			return
		}
	}
}

// dispatch 执行单条命令返回 RESP 回复串
func (f *fakeRedis) dispatch(args []string) string {
	switch args[0] {
	case "AUTH":
		if len(args) >= 2 && args[1] == f.pass {
			return "+OK\r\n"
		}
		return "-WRONGPASS invalid username-password pair\r\n"
	case "SELECT", "PING":
		return "+OK\r\n"
	case "GET":
		v, ok := f.store[args[1]]
		if !ok {
			return "$-1\r\n"
		}
		return fmt.Sprintf("$%d\r\n%s\r\n", len(v), v)
	case "SET":
		f.store[args[1]] = args[2]
		return "+OK\r\n"
	}
	return "-ERR unknown command\r\n"
}

// readRESPCommand 解析一条 RESP 数组命令
func readRESPCommand(rd *bufio.Reader) ([]string, error) {
	line, err := rd.ReadString('\n')
	if err != nil {
		return nil, err
	}
	n, err := strconv.Atoi(strings.TrimRight(strings.TrimPrefix(line, "*"), "\r\n"))
	if err != nil || n <= 0 {
		return nil, fmt.Errorf("bad array header %q", line)
	}
	args := make([]string, 0, n)
	for i := 0; i < n; i++ {
		hdr, err := rd.ReadString('\n')
		if err != nil {
			return nil, err
		}
		sz, err := strconv.Atoi(strings.TrimRight(strings.TrimPrefix(hdr, "$"), "\r\n"))
		if err != nil || sz < 0 {
			return nil, fmt.Errorf("bad bulk header %q", hdr)
		}
		buf := make([]byte, sz+2)
		if _, err := readFull(rd, buf); err != nil {
			return nil, err
		}
		args = append(args, string(buf[:sz]))
	}
	return args, nil
}

// addr 返回服务器地址（拆 host/port 供 RedisConfig 用）
func (f *fakeRedis) addr() (string, int) {
	h, p, _ := net.SplitHostPort(f.ln.Addr().String())
	pi, _ := strconv.Atoi(p)
	return h, pi
}

// —— redisKV RESP 客户端测试 ——

// TestRedisKVRoundTrip 假服务器上的 SET/GET 语义（含中文与键前缀）
func TestRedisKVRoundTrip(t *testing.T) {
	t.Setenv("REDIS_PASSWORD", "")
	f := startFakeRedis(t, "")
	h, p := f.addr()
	kv, err := newRedisKVStore(config.RedisConfig{Host: h, Port: p, KeyPrefix: "tb:"})
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	// 键不存在 → nil,nil
	if v, err := kv.Load("missing"); err != nil || v != nil {
		t.Fatalf("Load missing = %v, %v; want nil, nil", v, err)
	}
	// 写读回程（中文内容字节安全）
	val := []byte(`{"游戏":["磁悬浮列车"],"n":1}`)
	if err := kv.Save("lb", val); err != nil {
		t.Fatalf("Save: %v", err)
	}
	got, err := kv.Load("lb")
	if err != nil || string(got) != string(val) {
		t.Fatalf("Load = %q, %v; want %q", got, err, val)
	}
	// 键前缀生效
	f.mu.Lock()
	_, prefixed := f.store["tb:lb"]
	f.mu.Unlock()
	if !prefixed {
		t.Fatalf("expected key tb:lb in fake store, got %v", f.store)
	}
}

// TestRedisKVAuth 密码仅经 REDIS_PASSWORD 环境变量：错/缺密码拒绝，正确密码放行
func TestRedisKVAuth(t *testing.T) {
	f := startFakeRedis(t, "secret123")
	h, p := f.addr()
	rc := config.RedisConfig{Host: h, Port: p}

	t.Setenv("REDIS_PASSWORD", "")
	if _, err := newRedisKVStore(rc); err == nil {
		t.Fatal("expected auth failure with empty password")
	}

	t.Setenv("REDIS_PASSWORD", "wrong")
	if _, err := newRedisKVStore(rc); err == nil {
		t.Fatal("expected auth failure with wrong password")
	}

	t.Setenv("REDIS_PASSWORD", "secret123")
	if _, err := newRedisKVStore(rc); err != nil {
		t.Fatalf("connect with correct password: %v", err)
	}
}

// TestRedisKVUnreachable 不可达地址 fail-fast（包装 errKVUnavailable）
func TestRedisKVUnreachable(t *testing.T) {
	t.Setenv("REDIS_PASSWORD", "")
	// 端口 1（tcpmux）几乎必拒绝；用已关闭的本地端口更稳：先监听再关闭
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("listen: %v", err)
	}
	addr := ln.Addr().String()
	ln.Close()
	h, p, _ := net.SplitHostPort(addr)
	pi, _ := strconv.Atoi(p)
	_, err = newRedisKVStore(config.RedisConfig{Host: h, Port: pi})
	if err == nil {
		t.Fatal("expected error for unreachable redis")
	}
}

// TestEncodeRESP 请求编码字节级正确性
func TestEncodeRESP(t *testing.T) {
	got := string(encodeRESP([]string{"SET", "k", "v"}))
	want := "*3\r\n$3\r\nSET\r\n$1\r\nk\r\n$1\r\nv\r\n"
	if got != want {
		t.Fatalf("encodeRESP = %q; want %q", got, want)
	}
}

// —— stateIO 测试 ——

// TestStateIOLocalWriteRead local 模式：缺文件→空；写读回程；缩进格式保持
func TestStateIOLocalWriteRead(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "state.json")
	io := newStateIO(path, "lb", nil)

	// 初始无文件 → (nil,false)
	data, changed, err := io.loadSync()
	if err != nil || data != nil || changed {
		t.Fatalf("initial loadSync = %v, %v, %v; want nil, false, nil", data, changed, err)
	}
	// 写入后读回（经缓存，不再触发 changed）
	if err := io.write([]byte(`{"a":1}`)); err != nil {
		t.Fatalf("write: %v", err)
	}
	data, changed, err = io.loadSync()
	if err != nil || changed || string(data) != `{"a":1}` {
		t.Fatalf("loadSync after write = %q, %v, %v", data, changed, err)
	}
	// local 模式默认缩进序列化（与既有文件格式一致）
	b, err := io.marshal(map[string]int{"x": 1})
	if err != nil || !strings.Contains(string(b), "\n") {
		t.Fatalf("marshal(local) = %q, %v; want indented", b, err)
	}
	// compact 变体保持紧凑（rooms.json 历史格式）
	c := newStateIO(path, "rooms", nil).compact()
	b, err = c.marshal(map[string]int{"x": 1})
	if err != nil || strings.Contains(string(b), "\n") {
		t.Fatalf("marshal(compact) = %q, %v; want single line", b, err)
	}
}

// TestStateIOLocalHotReload local 模式：外部改写文件（mtime 变化）触发 changed
func TestStateIOLocalHotReload(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "state.json")
	if err := os.WriteFile(path, []byte(`{"v":1}`), 0o644); err != nil {
		t.Fatal(err)
	}
	io := newStateIO(path, "lb", nil)
	if data, changed, _ := io.loadSync(); !changed || string(data) != `{"v":1}` {
		t.Fatalf("first load = %q, %v", data, changed)
	}
	// 未变化：不触发
	if _, changed, _ := io.loadSync(); changed {
		t.Fatal("unexpected change without file modification")
	}
	// 外部改写 + 推后 mtime（避开文件系统时间粒度）
	if err := os.WriteFile(path, []byte(`{"v":2}`), 0o644); err != nil {
		t.Fatal(err)
	}
	future := time.Now().Add(2 * time.Second)
	if err := os.Chtimes(path, future, future); err != nil {
		t.Fatal(err)
	}
	if data, changed, _ := io.loadSync(); !changed || string(data) != `{"v":2}` {
		t.Fatalf("reload = %q, %v; want {\"v\":2}, true", data, changed)
	}
}

// —— stateIO redis 模式测试 ——

// TestStateIORedisSeed redis 键为空 + 本地文件有数据 → 种子导入一次；本地文件只读不改写
func TestStateIORedisSeed(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "leaderboard.json")
	local := "{\n  \"game-tetris\": [\n    {\"name\": \"Alice\"}\n  ]\n}"
	if err := os.WriteFile(path, []byte(local), 0o644); err != nil {
		t.Fatal(err)
	}
	kv := newMemKV()
	io := newStateIO(path, kvKeyLeaderboard, kv)

	data, changed, err := io.loadSync()
	if err != nil || !changed || string(data) != local {
		t.Fatalf("seed load = %q, %v, %v", data, changed, err)
	}
	// redis 已种子化（紧凑格式）
	seeded, err := kv.Load(kvKeyLeaderboard)
	if err != nil || strings.Contains(string(seeded), "\n") {
		t.Fatalf("seeded value = %q, %v; want compact", seeded, err)
	}
	// 本地文件字节不变（零污染）
	after, _ := os.ReadFile(path)
	if string(after) != local {
		t.Fatalf("local file modified: %q", after)
	}
	// 二次读取走缓存，不再触发 changed
	if _, changed, _ := io.loadSync(); changed {
		t.Fatal("unexpected second change signal")
	}
}

// TestStateIORedisNoOverwrite redis 已有数据时本地文件不参与（不覆盖已有数据）
func TestStateIORedisNoOverwrite(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "leaderboard.json")
	if err := os.WriteFile(path, []byte(`{"old":[]}`), 0o644); err != nil {
		t.Fatal(err)
	}
	kv := newMemKV()
	if err := kv.Save(kvKeyLeaderboard, []byte(`{"new":[]}`)); err != nil {
		t.Fatal(err)
	}
	io := newStateIO(path, kvKeyLeaderboard, kv)
	data, _, err := io.loadSync()
	if err != nil || string(data) != `{"new":[]}` {
		t.Fatalf("load = %q, %v; want redis value", data, err)
	}
}

// TestStateIORedisWriteThrough redis 模式写透：write → kv 更新 + 缓存刷新 + 紧凑 marshal
func TestStateIORedisWriteThrough(t *testing.T) {
	kv := newMemKV()
	io := newStateIO("ignored.json", kvKeyRooms, kv)
	if _, _, err := io.loadSync(); err != nil {
		t.Fatalf("initial load: %v", err)
	}
	b, err := io.marshal(map[string]int{"k": 1})
	if err != nil || strings.Contains(string(b), "\n") {
		t.Fatalf("marshal(redis) = %q, %v; want compact", b, err)
	}
	if err := io.write([]byte(`{"r":1}`)); err != nil {
		t.Fatalf("write: %v", err)
	}
	v, err := kv.Load(kvKeyRooms)
	if err != nil || string(v) != `{"r":1}` {
		t.Fatalf("kv after write = %q, %v", v, err)
	}
	if data, changed, _ := io.loadSync(); changed || string(data) != `{"r":1}` {
		t.Fatalf("cached load = %q, %v", data, changed)
	}
}

// —— store 级集成测试 ——

// TestProTokenStoreKV 次数型 token 经 stateKV 后端扣减，重建 store 后状态延续
func TestProTokenStoreKV(t *testing.T) {
	kv := newMemKV()
	st := newProTokenStore("unused-local.json", kv)
	st.addToken(proTokenEntry{Token: "tok-1", Type: "count", Remaining: 2})
	// 重建（模拟重启）：从 kv 恢复
	st2 := newProTokenStore("unused-local.json", kv)
	if info := st2.validate("tok-1"); info.status != proValid || info.remaining != 2 {
		t.Fatalf("validate after rebuild = %+v", info)
	}
	if info := st2.consume("tok-1"); info.status != proValid || info.remaining != 1 {
		t.Fatalf("consume = %+v", info)
	}
	// 持久化写回 kv
	v, _ := kv.Load(kvKeyProTokens)
	if !strings.Contains(string(v), `"remaining":1`) {
		t.Fatalf("kv after consume = %q", v)
	}
}
