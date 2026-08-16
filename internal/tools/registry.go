package tools

import "context"

// Manifest 工具元信息
type Manifest struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Category string `json:"category"`
}

// FileInput 上传文件信息
type FileInput struct {
	Path     string
	FileName string
	Size     int64
}

// SubmitParams 提交参数
type SubmitParams struct {
	Params map[string]string
	File   *FileInput
}

// Tool 服务端工具接口
type Tool interface {
	Manifest() Manifest
	Submit(ctx context.Context, p SubmitParams) (result string, err error)
}

var registry = map[string]Tool{}

// Register 注册工具（通常在 init 中调用）
func Register(t Tool) {
	registry[t.Manifest().ID] = t
}

// Get 取工具
func Get(id string) (Tool, bool) {
	t, ok := registry[id]
	return t, ok
}

// All 返回所有已注册工具
func All() []Tool {
	list := make([]Tool, 0, len(registry))
	for _, t := range registry {
		list = append(list, t)
	}
	return list
}
