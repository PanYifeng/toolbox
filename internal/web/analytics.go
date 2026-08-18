package web

import "sync"

// trackStore 内存埋点计数：仅记录路径访问次数，无 PII
type trackStore struct {
	mu    sync.Mutex
	count map[string]int
}

// newTrackStore 创建埋点存储
func newTrackStore() *trackStore {
	return &trackStore{count: map[string]int{}}
}
