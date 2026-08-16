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
}

// ServerConfig 服务配置
type ServerConfig struct {
	Addr string `json:"addr"`
}

// LimitsConfig 资源限制
type LimitsConfig struct {
	MaxUploadBytes    int64 `json:"maxUploadBytes"`
	VideoConcurrency  int   `json:"videoConcurrency"`
	JobTimeoutSeconds int   `json:"jobTimeoutSeconds"`
}

// AdsConfig 广告配置
type AdsConfig struct {
	Enabled bool     `json:"enabled"`
	Slots   []AdSlot `json:"slots"`
}

// AdSlot 广告位
type AdSlot struct {
	ID   string `json:"id"`
	HTML string `json:"html"`
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
		c.Limits.MaxUploadBytes = 50 << 20
	}
	if c.Limits.VideoConcurrency == 0 {
		c.Limits.VideoConcurrency = 1
	}
	if c.Limits.JobTimeoutSeconds == 0 {
		c.Limits.JobTimeoutSeconds = 300
	}
}
