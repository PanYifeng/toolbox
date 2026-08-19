package config

import (
	"encoding/json"
	"os"
	"time"
)

// Config 全局配置
type Config struct {
	Server           ServerConfig       `json:"server"`
	Limits           LimitsConfig       `json:"limits"`
	Ads              AdsConfig          `json:"ads"`
	Pro              ProConfig          `json:"pro"`
	Mail             MailConfig         `json:"mail"`
	Site             SiteConfig         `json:"site"`
	Features         FeaturesConfig     `json:"features"`
	Compliance       ComplianceConfig   `json:"compliance"`
	Donation         DonationConfig     `json:"donation"`
	SEO              SEOConfig          `json:"seo"`
	SiteVerification []VerificationFile `json:"siteVerification"`
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
	ID       string      `json:"id"`
	Position string      `json:"position"` // top / bottom / sidebar
	HTML     interface{} `json:"html"`
}

// ProConfig 付费层配置：针对资源消耗大的功能（视频/音频/文档转换等）售卖上传额度。
// 与首页「赞助」分离——赞助是纯自愿支持，Pro 是按时间或次数计费的功能额度。
type ProConfig struct {
	Enabled        bool      `json:"enabled"`
	MaxUploadBytes int64     `json:"maxUploadBytes"` // Pro 用户上传上限
	TokensFile     string    `json:"tokensFile"`     // 已签发 token 的 state 文件路径（次数型需运行时改写）
	Plans          []ProPlan `json:"plans"`          // 定价方案（时间型 / 次数型，仅用于前端展示）
	RequestsFile   string    `json:"requestsFile"`   // 支付核销请求的 state 文件路径
	AdminSecret    string    `json:"adminSecret"`    // 确认链接 HMAC 密钥；空则禁用邮件确认（仅 1h 自动通过）
	AdminEmail     string    `json:"adminEmail"`     // 接收确认邮件的作者邮箱
	AutoApproveTTL string    `json:"autoApproveTTL"` // 未确认自动通过时限，如 "1h"
}

// ProPlan 单个定价方案
type ProPlan struct {
	ID           string  `json:"id"`
	Type         string  `json:"type"`         // time / count
	DurationDays int     `json:"durationDays"` // type=time 时的有效天数
	Count        int     `json:"count"`        // type=count 时的可用次数
	Price        float64 `json:"price"`        // 价格（元）
	Label        Label   `json:"label"`        // 中英双语名称
}

// Label 中英双语文案（复用于 ProPlan / 等场景）
type Label struct {
	ZH string `json:"zh"`
	EN string `json:"en"`
}

// AutoApproveDuration 解析 autoApproveTTL；非法时回退 1h
func (p ProConfig) AutoApproveDuration() time.Duration {
	if d, err := time.ParseDuration(p.AutoApproveTTL); err == nil && d > 0 {
		return d
	}
	return time.Hour
}

// Plan 按 ID 查找定价方案
func (p ProConfig) Plan(id string) (ProPlan, bool) {
	for _, pl := range p.Plans {
		if pl.ID == id {
			return pl, true
		}
	}
	return ProPlan{}, false
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

// DonationConfig 赞助 / 捐赠配置（纯自愿支持，不绑定任何 Pro 权益）
type DonationConfig struct {
	Enabled bool             `json:"enabled"` // 总开关（同时受 features.donation 控制）
	Title   interface{}      `json:"title"`
	Desc    interface{}      `json:"desc"`
	Methods []DonationMethod `json:"methods"`
	Links   []DonationLink   `json:"links"` // 免费支持外链（推广购买 / star 等），区别于打赏
	Picks   []DonationPick   `json:"picks"` // 站长精选好物池（affiliate 单品，前端每次随机抽取展示）
}

// DonationMethod 单个赞助方式
type DonationMethod struct {
	Type  string      `json:"type"` // image / link
	Label interface{} `json:"label"`
	Src   string      `json:"src"` // type=image 时的图片路径
	URL   string      `json:"url"` // type=link 时的外链
}

// DonationLink 免费支持外链（推广购买、GitHub star 等）
type DonationLink struct {
	Label     interface{} `json:"label"` // {zh,en}
	URL       string      `json:"url"`
	Hint      interface{} `json:"hint"`      // {zh,en} 可选说明
	Sponsored bool        `json:"sponsored"` // 推广返佣链接：追加 rel="nofollow sponsored"
}

// DonationPick 站长精选好物（affiliate 单品）。前端每次进入工具页从池中随机抽取若干展示，
// 保证"不选死"——每个单品都有均匀曝光机会，每次访问所见略有不同。
type DonationPick struct {
	Platform string `json:"platform"` // taobao / jd
	Name     string `json:"name"`     // 商品名（已截断，避免过长）
	Image    string `json:"image"`    // 商品主图 URL（已是 https）
	Price    string `json:"price"`    // 到手价（含币种符号或纯数字，原样展示）
	URL      string `json:"url"`      // affiliate 短链（带 PID，点击即计佣）
}

// SEOConfig SEO 相关开关
type SEOConfig struct {
	RobotsAllow *bool `json:"robotsAllow"` // robots.txt 是否允许抓取；nil=按默认(true，strict 下为 false)
}

// VerificationFile 第三方平台（微信/QQ浏览器/360 等）的站点归属验证文件
type VerificationFile struct {
	Filename string `json:"filename"` // 验证文件名，如 6a4a07bf2b0173fbc3dd5727997d2638.txt
	Content  string `json:"content"`  // 文件内容（原样返回，不加换行）
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
	if c.Pro.TokensFile == "" {
		c.Pro.TokensFile = "./pro-tokens.json"
	}
	if c.Pro.RequestsFile == "" {
		c.Pro.RequestsFile = "./pro-requests.json"
	}
	if c.Pro.AutoApproveTTL == "" {
		c.Pro.AutoApproveTTL = "1h"
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
