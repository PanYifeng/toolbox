package config

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"reflect"
	"strings"
	"time"
)

// NacosConfig Nacos 配置中心接入（可选远程配置源，零依赖纯 HTTP，OpenAPI v1）。
// 密码可写入本结构（与 mail.pass 同级敏感度），生效日志自动脱敏。
type NacosConfig struct {
	Enabled    bool   `json:"enabled"`
	ServerAddr string `json:"serverAddr"` // 如 10.112.140.127:8848
	Namespace  string `json:"namespace"`   // 命名空间 ID（tenant 参数）
	Group      string `json:"group"`       // 默认 DEFAULT_GROUP
	DataID     string `json:"dataId"`      // 配置 ID，内容为 config.json 子集 JSON
	Username   string `json:"username"`
	Password   string `json:"password"`
}

// fetchConfig 登录（如需）并拉取配置内容；404 视为无配置返回空
func (n NacosConfig) fetchConfig() ([]byte, error) {
	base := "http://" + n.ServerAddr
	token := ""
	if n.Username != "" {
		v := url.Values{"username": {n.Username}, "password": {n.Password}}
		resp, err := httpPostForm(base+"/nacos/v1/auth/login", v, 5*time.Second)
		if err != nil {
			return nil, fmt.Errorf("nacos login: %w", err)
		}
		var lr struct {
			AccessToken string `json:"accessToken"`
		}
		if err := json.Unmarshal(resp, &lr); err != nil || lr.AccessToken == "" {
			return nil, fmt.Errorf("nacos login: no accessToken in response")
		}
		token = lr.AccessToken
	}
	q := url.Values{}
	q.Set("dataId", n.DataID)
	q.Set("group", n.Group)
	q.Set("tenant", n.Namespace)
	if token != "" {
		q.Set("accessToken", token)
	}
	return httpGetWithQuery(base+"/nacos/v1/cs/configs", q, 10*time.Second)
}

// httpGetWithQuery / httpPostForm 最小 HTTP 辅助（保持零第三方依赖）
func httpGetWithQuery(rawurl string, q url.Values, timeout time.Duration) ([]byte, error) {
	u := rawurl
	if enc := q.Encode(); enc != "" {
		u += "?" + enc
	}
	resp, err := (&http.Client{Timeout: timeout}).Get(u)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusNotFound {
		return nil, nil // 配置不存在 = 无补丁，非错误
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s: status %d", u, resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}

// httpPostForm 发送表单 POST 并返回响应体
func httpPostForm(rawurl string, v url.Values, timeout time.Duration) ([]byte, error) {
	resp, err := (&http.Client{Timeout: timeout}).PostForm(rawurl, v)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("POST %s: status %d", rawurl, resp.StatusCode)
	}
	return io.ReadAll(resp.Body)
}

// ApplyNacos 拉取 Nacos 配置并作为覆盖层应用到 cfg（优先级高于文件与默认值，低于 env/flag）。
// nacos.* 自身字段先吃 env 覆盖（支持 TOOLBOX_NACOS_ENABLED 等在 LAS 控制台远程开合）。
func ApplyNacos(cfg *Config) error {
	if err := applyNacosBootstrap(cfg); err != nil {
		return err
	}
	if !cfg.Nacos.Enabled || cfg.Nacos.ServerAddr == "" {
		return nil
	}
	if cfg.Nacos.Group == "" {
		cfg.Nacos.Group = "DEFAULT_GROUP"
	}
	data, err := cfg.Nacos.fetchConfig()
	if err != nil {
		// fail-fast 与 kvstate redis 一致：启用即必须可用，避免静默用旧文件配置
		return fmt.Errorf("nacos fetch %s/%s/%s: %w", cfg.Nacos.ServerAddr, cfg.Nacos.Group, cfg.Nacos.DataID, err)
	}
	if len(strings.TrimSpace(string(data))) == 0 {
		log.Printf("nacos: config %s/%s empty or missing, skip", cfg.Nacos.Group, cfg.Nacos.DataID)
		return nil
	}
	patch := map[string]interface{}{}
	if err := json.Unmarshal(data, &patch); err != nil {
		return fmt.Errorf("nacos config %s: parse json: %w", cfg.Nacos.DataID, err)
	}
	applied, err := applyPatch(reflect.ValueOf(cfg).Elem(), patch, "")
	for _, p := range applied {
		if secretPath(p) {
			log.Printf("config override: source=nacos path=%s value=***", p)
		} else {
			log.Printf("config override: source=nacos path=%s", p)
		}
	}
	return err
}

// applyNacosBootstrap 先把 env 中 nacos.* 覆盖应用到 cfg（供远程开合 Nacos 本身）
func applyNacosBootstrap(cfg *Config) error {
	var boot []Override
	for _, ov := range EnvOverrides() {
		if strings.HasPrefix(ov.Path, "nacos.") {
			boot = append(boot, ov)
		}
	}
	return ApplyOverrides(cfg, boot)
}

// applyPatch 递归把 JSON 补丁应用到结构体：对象下钻，标量写入；返回生效路径列表
func applyPatch(root reflect.Value, patch map[string]interface{}, prefix string) ([]string, error) {
	var applied []string
	for k, v := range patch {
		idx, ok := findFieldByTag(root.Type(), k)
		if !ok {
			return applied, fmt.Errorf("nacos patch: unknown field %q at %s", k, prefix)
		}
		fv := root.Field(idx)
		path := k
		if prefix != "" {
			path = prefix + "." + k
		}
		if sub, isMap := v.(map[string]interface{}); isMap && fv.Kind() == reflect.Struct {
			subApplied, err := applyPatch(fv, sub, path)
			applied = append(applied, subApplied...)
			if err != nil {
				return applied, err
			}
			continue
		}
		if err := setAny(fv, v); err != nil {
			return applied, fmt.Errorf("nacos patch %s: %w", path, err)
		}
		applied = append(applied, path)
	}
	return applied, nil
}

// setAny 按 JSON 反序列化类型（string/bool/float64）写入标量字段
func setAny(fv reflect.Value, v interface{}) error {
	switch fv.Kind() {
	case reflect.String:
		s, ok := v.(string)
		if !ok {
			return fmt.Errorf("want string, got %T", v)
		}
		fv.SetString(s)
	case reflect.Bool:
		b, ok := v.(bool)
		if !ok {
			return fmt.Errorf("want bool, got %T", v)
		}
		fv.SetBool(b)
	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		f, ok := v.(float64)
		if !ok || f != float64(int64(f)) {
			return fmt.Errorf("want int, got %T(%v)", v, v)
		}
		fv.SetInt(int64(f))
	case reflect.Float32, reflect.Float64:
		f, ok := v.(float64)
		if !ok {
			return fmt.Errorf("want float, got %T", v)
		}
		fv.SetFloat(f)
	default:
		return fmt.Errorf("unsupported kind %s in nacos patch", fv.Kind())
	}
	return nil
}
