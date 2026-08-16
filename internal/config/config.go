package config

import (
	"encoding/json"
	"os"
)

// Config 全局配置
type Config struct {
	Server ServerConfig `json:"server"`
	Limits LimitsConfig `json:"limits"`
	Ads    AdsConfig    `json:"ads"`
	Pro    ProConfig    `json:"pro"`
}

// ServerConfig 服务配置
type ServerConfig struct {
	Addr string `json:"addr"`
}

// LimitsConfig 资源限制
type LimitsConfig struct {
	MaxUploadBytes      int64 `json:"maxUploadBytes"`
	HeavyConcurrency    int   `json:"heavyConcurrency"`
	JobTimeoutSeconds   int   `json:"jobTimeoutSeconds"`
}

// AdsConfig 广告配置
type AdsConfig struct {
	Enabled bool     `json:"enabled"`
	Slots   []AdSlot `json:"slots"`
}

// AdSlot 广告位
type AdSlot struct {
	ID       string `json:"id"`
	Position string `json:"position"` // top / bottom / sidebar
	HTML     string `json:"html"`
}

// ProConfig 付费层配置（售卖 API token / 订阅）
type ProConfig struct {
	Tokens         []string `json:"tokens"`
	MaxUploadBytes int64    `json:"maxUploadBytes"`
}

// Load 从路径加载配置
func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	c := &Config{}
	if err := json.Unmarshal(data, c); err != nil {
		return nil, err
	}
	c.applyDefaults()
	return c, nil
}

// applyDefaults 填充默认值
func (c *Config) applyDefaults() {
	if c.Server.Addr == "" {
		c.Server.Addr = ":8080"
	}
	if c.Limits.MaxUploadBytes == 0 {
		c.Limits.MaxUploadBytes = 1 << 30 // 默认 1GB
	}
	if c.Limits.HeavyConcurrency == 0 {
		c.Limits.HeavyConcurrency = 1
	}
	if c.Limits.JobTimeoutSeconds == 0 {
		c.Limits.JobTimeoutSeconds = 300
	}
	if c.Pro.MaxUploadBytes == 0 {
		c.Pro.MaxUploadBytes = 2 << 30 // Pro 用户默认 2GB
	}
}
