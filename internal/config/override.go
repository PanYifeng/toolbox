package config

import (
	"fmt"
	"log"
	"os"
	"reflect"
	"strconv"
	"strings"
)

// envPrefix 环境变量统一前缀；配置点分路径转大写下划线后拼接。
// 例：storage.redis.host -> TOOLBOX_STORAGE_REDIS_HOST
const envPrefix = "TOOLBOX_"

// Override 单条配置覆盖：Path 为点分 JSON tag 路径，Value 为字符串形式按目标类型转换
type Override struct {
	Path   string
	Value  string
	Source string // 来源标记："flag" | "env"
}

// secretPath 判断路径是否含敏感字段（生效日志只打路径不打值）
func secretPath(path string) bool {
	low := strings.ToLower(path)
	return strings.Contains(low, "pass") || strings.Contains(low, "secret")
}

// SetPath 按点分路径（如 storage.redis.host）在 cfg 上设置标量字段值。
// 大小写不敏感匹配 JSON tag；不支持切片/嵌套结构（须用配置文件或 Nacos 设置）。
func SetPath(cfg *Config, path, value string) error {
	cur := reflect.ValueOf(cfg).Elem()
	for _, part := range strings.Split(path, ".") {
		if cur.Kind() != reflect.Struct {
			return fmt.Errorf("path %q: %s is not a struct", path, cur.Kind())
		}
		idx, ok := findFieldByTag(cur.Type(), part)
		if !ok {
			return fmt.Errorf("path %q: unknown field %q", path, part)
		}
		cur = cur.Field(idx)
	}
	if !cur.CanSet() {
		return fmt.Errorf("path %q: field not settable", path)
	}
	return setScalar(cur, value)
}

// findFieldByTag 在结构体中按 JSON tag 名（大小写不敏感）查找字段下标
func findFieldByTag(t reflect.Type, part string) (int, bool) {
	for i := 0; i < t.NumField(); i++ {
		name := strings.Split(t.Field(i).Tag.Get("json"), ",")[0]
		if name != "" && strings.EqualFold(name, part) {
			return i, true
		}
	}
	return 0, false
}

// setScalar 按反射种类把字符串值写入标量字段
func setScalar(fv reflect.Value, value string) error {
	switch fv.Kind() {
	case reflect.String:
		fv.SetString(value)
	case reflect.Bool:
		b, err := strconv.ParseBool(value)
		if err != nil {
			return fmt.Errorf("parse bool %q: %w", value, err)
		}
		fv.SetBool(b)
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		n, err := strconv.ParseInt(value, 10, 64)
		if err != nil {
			return fmt.Errorf("parse int %q: %w", value, err)
		}
		fv.SetInt(n)
	case reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64:
		n, err := strconv.ParseUint(value, 10, 64)
		if err != nil {
			return fmt.Errorf("parse uint %q: %w", value, err)
		}
		fv.SetUint(n)
	case reflect.Float32, reflect.Float64:
		f, err := strconv.ParseFloat(value, 64)
		if err != nil {
			return fmt.Errorf("parse float %q: %w", value, err)
		}
		fv.SetFloat(f)
	default:
		return fmt.Errorf("unsupported kind %s (use config file or nacos for complex types)", fv.Kind())
	}
	return nil
}

// EnumPaths 递归枚举全部可覆盖标量字段的 点分路径 -> 环境变量名 映射
func EnumPaths() map[string]string {
	out := map[string]string{}
	walkPaths(reflect.TypeOf(Config{}), "", out)
	return out
}

// walkPaths 递归遍历结构体；标量字段记入 out，子结构体下钻
func walkPaths(t reflect.Type, prefix string, out map[string]string) {
	for i := 0; i < t.NumField(); i++ {
		name := strings.Split(t.Field(i).Tag.Get("json"), ",")[0]
		if name == "" || name == "-" {
			continue
		}
		path := name
		if prefix != "" {
			path = prefix + "." + name
		}
		ft := t.Field(i).Type
		switch ft.Kind() {
		case reflect.Struct:
			walkPaths(ft, path, out)
		case reflect.String, reflect.Bool,
			reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64,
			reflect.Uint, reflect.Uint8, reflect.Uint16, reflect.Uint32, reflect.Uint64,
			reflect.Float32, reflect.Float64:
			out[path] = EnvName(path)
		}
	}
}

// EnvName 配置点分路径转环境变量名：storage.driver -> TOOLBOX_STORAGE_DRIVER
func EnvName(path string) string {
	return envPrefix + strings.ToUpper(strings.ReplaceAll(path, ".", "_"))
}

// EnvOverrides 扫描 TOOLBOX_ 前缀环境变量并映射为覆盖项。
// 未知变量名静默跳过（REDIS_PASSWORD 等非配置项环境变量合法存在）。
func EnvOverrides() []Override {
	byEnv := map[string]string{}
	for path, env := range EnumPaths() {
		byEnv[env] = path
	}
	var out []Override
	for _, kv := range os.Environ() {
		name, _, _ := strings.Cut(kv, "=")
		if !strings.HasPrefix(name, envPrefix) {
			continue
		}
		path, ok := byEnv[name]
		if !ok {
			continue
		}
		v, ok := os.LookupEnv(name)
		if !ok {
			continue
		}
		out = append(out, Override{Path: path, Value: v, Source: "env"})
	}
	return out
}

// ParseFlagSets 解析 CLI -set 传入的 path=value 列表为覆盖项
func ParseFlagSets(sets []string) ([]Override, error) {
	var out []Override
	for _, s := range sets {
		path, value, ok := strings.Cut(s, "=")
		if !ok || path == "" {
			return nil, fmt.Errorf("invalid -set %q: want path=value", s)
		}
		out = append(out, Override{Path: path, Value: value, Source: "flag"})
	}
	return out, nil
}

// ApplyOverrides 依次应用覆盖项；每条打生效日志（敏感路径值脱敏）。
// 任一条失败即返回错误（启动 fail-fast，防拼错路径静默失效）。
func ApplyOverrides(cfg *Config, ovs []Override) error {
	for _, ov := range ovs {
		if err := SetPath(cfg, ov.Path, ov.Value); err != nil {
			return fmt.Errorf("override from %s: %w", ov.Source, err)
		}
		if secretPath(ov.Path) {
			log.Printf("config override: source=%s path=%s value=***", ov.Source, ov.Path)
		} else {
			log.Printf("config override: source=%s path=%s value=%s", ov.Source, ov.Path, ov.Value)
		}
	}
	return nil
}
