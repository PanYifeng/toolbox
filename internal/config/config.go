package config

import (
	"encoding/json"
	"os"
)

// Config 全局配置
type Config struct {
	Server     ServerConfig     `json:"server"`
	Limits     LimitsConfig     `json:"limits"`
	Ads        AdsConfig        `json:"ads"`
	Pro        ProConfig        `json:"pro"`
	Mail       MailConfig       `json:"mail"`
	Site       SiteConfig       `json:"site"`
	Features   FeaturesConfig   `json:"features"`
	Compliance ComplianceConfig `json:"compliance"`
	Donation   DonationConfig   `json:"donation"`
	SEO        SEOConfig        `json:"seo"`
}

// ServerConfig 服务配置
type ServerConfig struct {
	Addr string `json:"addr"`
}

// LimitsConfig 资源限制
type LimitsConfig struct {
	MaxUploadBytes    int64 `json:"maxUploadBytes"`
	HeavyConcurrency  int   `json:"heavyConcurrency"`
	JobTimeoutSeconds int   `json:"jobTimeoutSeconds"`
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

// MailConfig 邮件发送配置（纪念卡发送到邮箱，需 SMTP 授权码）
type MailConfig struct {
	Host string `json:"host"` // SMTP 主机，如 smtp.qq.com
	Port int    `json:"port"` // SMTP 端口，如 465 / 587
	User string `json:"user"` // 发件账号
	Pass string `json:"pass"` // SMTP 授权码（非登录密码）
	From string `json:"from"` // 发件人地址，通常同 User
}

// Configured 是否已配置可用
func (m MailConfig) Configured() bool {
	return m.Host != "" && m.User != "" && m.Pass != "" && m.From != ""
}

// SiteConfig 站点元信息（用于 SEO / OG / 模板注入）
type SiteConfig struct {
	Name        string `json:"name"`        // 站点名称
	URL         string `json:"url"`         // 站点公网地址（不含末尾斜杠），如 https://app.mytoolbox.eu.org
	Description string `json:"description"` // 站点描述
	OGImage     string `json:"ogImage"`     // Open Graph 图片路径，如 /img/og.png
}

// FeaturesConfig 功能开关：每个开关控制一类 UI/工具的显隐
type FeaturesConfig struct {
	Ads          bool `json:"ads"`          // 广告位
	Donation     bool `json:"donation"`     // 赞助 / 捐赠入口
	Signature    bool `json:"signature"`    // 个人署名（逸丰 ❤ 思宏）
	Religion     bool `json:"religion"`     // 宗教文化分类（合规风险）
	MemorialCard bool `json:"memorialCard"` // 纪念卡 + 验真（发证资质风险）
	Analytics    bool `json:"analytics"`    // 匿名埋点上报
}

// ComplianceConfig 合规预设
type ComplianceConfig struct {
	Strict bool `json:"strict"` // true=大陆合规预设：强制关闭宗教/纪念卡/署名/埋点
}

// DonationConfig 赞助 / 捐赠配置
type DonationConfig struct {
	Enabled bool             `json:"enabled"` // 总开关（同时受 features.donation 控制）
	Title   string           `json:"title"`
	Desc    string           `json:"desc"`
	Methods []DonationMethod `json:"methods"`
	ProHint string           `json:"proHint"` // 赞助换 Pro 的引导文案
}

// DonationMethod 单个赞助方式
type DonationMethod struct {
	Type  string `json:"type"`  // image / link
	Label string `json:"label"`
	Src   string `json:"src"`   // type=image 时的图片路径
	URL   string `json:"url"`   // type=link 时的外链
}

// SEOConfig SEO 相关开关
type SEOConfig struct {
	RobotsAllow *bool `json:"robotsAllow"` // robots.txt 是否允许抓取；nil=按默认(true，strict 下为 false)
}

// RobotsAllowed 返回是否允许抓取：显式设置优先，否则默认允许（strict 模式默认禁止）
func (c *Config) RobotsAllowed() bool {
	if c.SEO.RobotsAllow != nil {
		return *c.SEO.RobotsAllow
	}
	return !c.Compliance.Strict
}

// EffectiveFeatures 返回应用合规预设后的有效功能开关
// compliance.strict 为真时，强制关闭有合规风险的项（宗教/纪念卡/署名/埋点）
func (c *Config) EffectiveFeatures() FeaturesConfig {
	f := c.Features
	if c.Compliance.Strict {
		f.Religion = false
		f.MemorialCard = false
		f.Signature = false
		f.Analytics = false
	}
	return f
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
	if c.Mail.Configured() && c.Mail.Port == 0 {
		c.Mail.Port = 587
	}
	if c.Site.Name == "" {
		c.Site.Name = "Toolbox"
	}
	if c.Site.Description == "" {
		c.Site.Description = "一站式开发者工具：JSON 格式化、时间戳转换、视频转码等，纯前端零成本。"
	}
	if c.Site.URL == "" {
		c.Site.URL = "http://localhost:8080"
	}
	// features 默认全开（analytics 默认关）
	if c.Features == (FeaturesConfig{}) {
		c.Features = FeaturesConfig{
			Ads: true, Donation: true, Signature: true,
			Religion: true, MemorialCard: true, Analytics: false,
		}
	}
	if c.SEO.RobotsAllow == nil {
		// 未显式设置：默认允许抓取；strict 合规模式下默认禁止
		allow := !c.Compliance.Strict
		c.SEO.RobotsAllow = &allow
	}
}
