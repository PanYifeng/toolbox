package queue

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"
)

// Status 任务状态
type Status string

const (
	StatusQueued  Status = "queued"
	StatusRunning Status = "running"
	StatusDone    Status = "done"
	StatusFailed  Status = "failed"
)

// Job 任务记录
type Job struct {
	ID        string
	Status    Status
	Result    string
	Error     string
	CreatedAt time.Time
}

// TaskFunc 任务执行函数，返回结果路径或错误
type TaskFunc func(ctx context.Context) (result string, err error)

// Queue 内存任务队列，限制并发数
type Queue struct {
	mu      sync.Mutex
	jobs    map[string]*Job
	sem     chan struct{}
	timeout time.Duration
}

// New 创建队列
func New(concurrency int, timeoutSec int) *Queue {
	if concurrency < 1 {
		concurrency = 1
	}
	return &Queue{
		jobs:    make(map[string]*Job),
		sem:     make(chan struct{}, concurrency),
		timeout: time.Duration(timeoutSec) * time.Second,
	}
}

// Submit 提交任务，立即返回 jobID 并异步执行
func (q *Queue) Submit(id string, fn TaskFunc) *Job {
	job := &Job{
		ID:        id,
		Status:    StatusQueued,
		CreatedAt: time.Now(),
	}
	q.mu.Lock()
	q.jobs[id] = job
	q.mu.Unlock()

	go q.run(job, fn)
	return job
}

// run 占用并发槽位并执行任务
func (q *Queue) run(job *Job, fn TaskFunc) {
	q.sem <- struct{}{}
	defer func() { <-q.sem }()

	q.set(job, StatusRunning, "", "")
	ctx, cancel := context.WithTimeout(context.Background(), q.timeout)
	defer cancel()

	result, err := fn(ctx)
	if err != nil {
		log.Printf("job %s failed: %v", job.ID, err)
		q.set(job, StatusFailed, "", err.Error())
		return
	}
	q.set(job, StatusDone, result, "")
}

// set 更新任务状态
func (q *Queue) set(job *Job, s Status, result, errStr string) {
	q.mu.Lock()
	defer q.mu.Unlock()
	job.Status = s
	job.Result = result
	job.Error = errStr
}

// Get 查询任务状态（返回副本）
func (q *Queue) Get(id string) (*Job, bool) {
	q.mu.Lock()
	defer q.mu.Unlock()
	j, ok := q.jobs[id]
	if !ok {
		return nil, false
	}
	cp := *j
	return &cp, true
}

// Cleanup 清理超过 maxAge 的已完成任务
func (q *Queue) Cleanup(maxAge time.Duration) {
	q.mu.Lock()
	defer q.mu.Unlock()
	cutoff := time.Now().Add(-maxAge)
	for id, j := range q.jobs {
		if (j.Status == StatusDone || j.Status == StatusFailed) && j.CreatedAt.Before(cutoff) {
			delete(q.jobs, id)
		}
	}
}

// NewID 生成简单 job id
func NewID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}
