// Package version 保存构建期注入的版本指纹，供 /api/version 与启动日志使用。
//
// 三个变量由构建命令通过 -ldflags -X 覆盖（见 scripts/release.sh）；
// 直接用 go build 本地调试时保持 dev/空，不会误导。
package version

// 构建期注入点。必须保持 var（-X 只能改包级字符串变量），不能改成 const。
var (
	// Version 镜像 tag，与 LAS 镜像版本号一一对应，如 1.0.14
	Version = "dev"
	// Commit 源码 commit 短哈希；rsync 部署目录没有 .git 时为空
	Commit = ""
	// BuiltAt 构建时间（RFC3339），用于判断二进制新旧
	BuiltAt = ""
)

// Info 版本指纹响应体
type Info struct {
	Version string `json:"version"`
	Commit  string `json:"commit,omitempty"`
	BuiltAt string `json:"builtAt,omitempty"`
}

// Current 返回当前二进制的版本指纹。
// 运维用途：LAS 的镜像构建是开发机文件系统快照而非源码构建，
// 镜像 tag 与二进制内含版本可能不一致（1.0.13 前的踩坑），
// 拿这里返回的 version 与镜像 tag 比对即可判定二进制是否新鲜。
func Current() Info {
	return Info{Version: Version, Commit: Commit, BuiltAt: BuiltAt}
}

// String 单行摘要，启动日志用
func String() string {
	s := Version
	if Commit != "" {
		s += " (" + Commit + ")"
	}
	if BuiltAt != "" {
		s += " built " + BuiltAt
	}
	return s
}
