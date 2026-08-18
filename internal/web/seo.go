package web

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"html/template"
	"net/http"
	"strings"

	"toolbox/internal/config"
)

//go:embed static/tools.json
var toolsJSON []byte

//go:embed static/index.html
var indexHTML []byte

// toolMeta 工具 SEO 元信息（来自构建期生成的 tools.json）
type toolMeta struct {
	ID       string   `json:"id"`
	Name     i18nText `json:"name"`
	Category i18nText `json:"category"`
	Icon     string   `json:"icon"`
	Keywords []string `json:"keywords"`
	Desc     string   `json:"desc"`
}

// i18nText 中英文文案
type i18nText struct {
	ZH string `json:"zh"`
	EN string `json:"en"`
}

// seoStore 预解析的 SEO 数据与模板
type seoStore struct {
	metas []toolMeta
	byID  map[string]toolMeta
	tmpl  *template.Template
}

// newSEOStore 解析 tools.json 与 index.html 模板
func newSEOStore() *seoStore {
	var metas []toolMeta
	if err := json.Unmarshal(toolsJSON, &metas); err != nil {
		panic("parse tools.json: " + err.Error())
	}
	byID := make(map[string]toolMeta, len(metas))
	for _, m := range metas {
		byID[m.ID] = m
	}
	tmpl, err := template.New("index").Parse(string(indexHTML))
	if err != nil {
		panic("parse index.html template: " + err.Error())
	}
	return &seoStore{metas: metas, byID: byID, tmpl: tmpl}
}

// indexData 模板注入数据
type indexData struct {
	SiteName     string
	SiteURL      string
	Description  string
	OGImage      string
	Canonical    string
	Title        string
	Keywords     string
	JSONLD       template.HTML
	NoscriptHTML template.HTML
	Lang         string
}

// toolDesc 取工具 SEO 描述：优先 manifest.desc，否则按模板生成
func (s *seoStore) toolDesc(m toolMeta, lang string) string {
	if m.Desc != "" {
		return m.Desc
	}
	name := m.Name.ZH
	cat := m.Category.ZH
	if lang == "en" {
		name = m.Name.EN
		cat = m.Category.EN
	}
	base := fmt.Sprintf("%s — 在线%s工具，纯前端、免费、无需安装。", name, cat)
	if len(m.Keywords) > 0 {
		base += " 相关：" + strings.Join(m.Keywords[:min(6, len(m.Keywords))], "、")
	}
	return base
}

// handleBootstrap 返回前端启动所需的全部配置（站点/功能开关/赞助/广告）
// 功能开关已应用 compliance.strict 预设，前端据此过滤工具与显隐 UI
func (s *Server) handleBootstrap(w http.ResponseWriter, r *http.Request) {
	f := s.cfg.EffectiveFeatures()
	writeJSON(w, map[string]any{
		"site":     s.cfg.Site,
		"features": f,
		"donation": s.cfg.Donation,
		"ads":      s.cfg.Ads,
		"pro": map[string]any{
			"enabled":        s.cfg.Pro.Enabled,
			"maxUploadBytes": s.cfg.Pro.MaxUploadBytes,
			"plans":          s.cfg.Pro.Plans,
		},
	})
}

// handleRobots 输出 robots.txt
func (s *Server) handleRobots(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	base := s.cfg.Site.URL
	if s.cfg.RobotsAllowed() {
		fmt.Fprintf(w, "User-agent: *\nAllow: /\n\nSitemap: %s/sitemap.xml\n", base)
	} else {
		fmt.Fprintf(w, "User-agent: *\nDisallow: /\n\nSitemap: %s/sitemap.xml\n", base)
	}
}

// handleSitemap 输出 sitemap.xml，仅包含未被功能开关关闭的工具
func (s *Server) handleSitemap(w http.ResponseWriter, r *http.Request) {
	base := strings.TrimRight(s.cfg.Site.URL, "/")
	f := s.cfg.EffectiveFeatures()
	var b strings.Builder
	b.WriteString(`<?xml version="1.0" encoding="UTF-8"?>` + "\n")
	b.WriteString(`<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` + "\n")
	b.WriteString(fmt.Sprintf("  <url><loc>%s/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n", base))
	for _, m := range s.seo.metas {
		if !s.toolAllowed(m.ID, f) {
			continue
		}
		b.WriteString(fmt.Sprintf("  <url><loc>%s/t/%s</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>\n", base, m.ID))
	}
	b.WriteString("</urlset>\n")
	w.Header().Set("Content-Type", "application/xml; charset=utf-8")
	_, _ = w.Write([]byte(b.String()))
}

// handleTrack 最小匿名埋点：仅记录 path + referrer，无 PII，内存计数
func (s *Server) handleTrack(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Path string `json:"path"`
		Ref  string `json:"ref"`
	}
	_ = json.NewDecoder(r.Body).Decode(&body)
	if body.Path == "" {
		body.Path = r.URL.Path
	}
	s.track.mu.Lock()
	s.track.count[body.Path]++
	s.track.mu.Unlock()
	w.WriteHeader(http.StatusNoContent)
}

// renderIndex 渲染 SPA shell：id 为空渲染首页，否则渲染工具页（注入该工具 SEO meta）
func (s *Server) renderIndex(w http.ResponseWriter, r *http.Request, id string) {
	lang := preferLang(r)
	f := s.cfg.EffectiveFeatures()
	data := indexData{
		SiteName:    s.cfg.Site.Name,
		SiteURL:     strings.TrimRight(s.cfg.Site.URL, "/"),
		Description: s.cfg.Site.Description,
		OGImage:     s.cfg.Site.OGImage,
		Lang:        lang,
	}
	if id == "" {
		data.Title = s.cfg.Site.Name + " · 一站式开发者工具"
		data.Canonical = data.SiteURL + "/"
		data.NoscriptHTML = s.noscriptLinks(f, lang)
		data.JSONLD = s.siteJSONLD(data.SiteURL)
	} else {
		m, ok := s.seo.byID[id]
		if !ok || !s.toolAllowed(id, f) {
			http.NotFound(w, r)
			return
		}
		desc := s.seo.toolDesc(m, lang)
		name := m.Name.ZH
		if lang == "en" {
			name = m.Name.EN
		}
		data.Title = name + " · " + s.cfg.Site.Name
		data.Description = desc
		data.Keywords = strings.Join(m.Keywords, ", ")
		data.Canonical = data.SiteURL + "/t/" + id
		data.NoscriptHTML = template.HTML(fmt.Sprintf(`<p><a href="%s/">%s</a></p>`, data.SiteURL, s.cfg.Site.Name))
		data.JSONLD = s.toolJSONLD(m, data.SiteURL, lang)
	}
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	_ = s.seo.tmpl.Execute(w, data)
}

// noscriptLinks 生成首页 noscript 下的工具链接列表（爬虫与无 JS 用户可读）
func (s *Server) noscriptLinks(f config.FeaturesConfig, lang string) template.HTML {
	var b strings.Builder
	b.WriteString("<ul>")
	for _, m := range s.seo.metas {
		if !s.toolAllowed(m.ID, f) {
			continue
		}
		name := m.Name.ZH
		if lang == "en" {
			name = m.Name.EN
		}
		fmt.Fprintf(&b, `<li><a href="/t/%s">%s</a></li>`, m.ID, name)
	}
	b.WriteString("</ul>")
	return template.HTML(b.String())
}

// siteJSONLD 站点级结构化数据（WebSite + SearchAction）
func (s *Server) siteJSONLD(base string) template.HTML {
	ld := fmt.Sprintf(`{"@context":"https://schema.org","@type":"WebSite","name":%q,"url":%q,"description":%q}`,
		s.cfg.Site.Name, base, s.cfg.Site.Description)
	return template.HTML("<script type=\"application/ld+json\">" + ld + "</script>")
}

// toolJSONLD 工具级结构化数据（SoftwareApplication）
func (s *Server) toolJSONLD(m toolMeta, base, lang string) template.HTML {
	name := m.Name.ZH
	if lang == "en" {
		name = m.Name.EN
	}
	url := base + "/t/" + m.ID
	ld := fmt.Sprintf(`{"@context":"https://schema.org","@type":"SoftwareApplication","name":%q,"applicationCategory":"DeveloperApplication","operatingSystem":"All","url":%q,"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}}`,
		name, url)
	return template.HTML("<script type=\"application/ld+json\">" + ld + "</script>")
}

// toolAllowed 工具是否在当前功能开关下可见
func (s *Server) toolAllowed(id string, f config.FeaturesConfig) bool {
	switch {
	case isReligionTool(id) && !f.Religion:
		return false
	case isMemorialTool(id) && !f.MemorialCard:
		return false
	}
	return true
}

// isReligionTool 是否宗教文化分类工具
func isReligionTool(id string) bool {
	return strings.HasPrefix(id, "religion-")
}

// isMemorialTool 是否纪念卡 / 验真相关工具
func isMemorialTool(id string) bool {
	return id == "cert-verify"
}

// preferLang 从 Accept-Language 推断 zh/en
func preferLang(r *http.Request) string {
	al := r.Header.Get("Accept-Language")
	if strings.Contains(strings.ToLower(al), "zh") {
		return "zh"
	}
	if al == "" {
		return "zh"
	}
	return "en"
}
