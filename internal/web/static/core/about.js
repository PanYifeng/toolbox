// 关于页：站点介绍 + 隐私政策（双语）。隐私政策同时满足联盟/广告平台审核要求。
// 标题由模板 <h2> 提供（about.title），故正文 markdown 不再重复 "关于 Toolbox" 标题；
// 联系方式改为可触发反馈浮层的链接（与页头/页脚入口一致），不再贴裸邮箱。
import { t, getLang } from '/core/i18n.js';
import { renderMarkdown } from '/core/md.js';

// CONTENT 双语内容（markdown）；标题与联系方式由模板单独渲染，避免重复
const CONTENT = {
  zh: `Toolbox 是一个一站式开发者工具站，提供 30+ 个免费、即开即用的在线工具：JSON 格式化、时间戳转换、编解码、正则测试、视频/音频/文档转换等。

**使命**：让常用的开发者工具触手可及——无需安装、无需注册、打开即用。

**技术特点**：

- 多数工具纯前端运行，文件不离开浏览器，隐私友好
- 重资源工具（视频/音频/文档转换）在服务端处理，完成后自动删除
- 轻量高性能，支持 PWA 离线使用

### 隐私政策

我们高度重视你的隐私：

- **访问统计**：仅在开启匿名埋点时记录访问路径和来源，不含 Cookie 或个人身份信息
- **文件处理**：纯前端工具的文件完全在浏览器内处理，不上传；服务端转换工具的文件临时处理，完成后删除，不长期存储
- **第三方追踪**：本站不使用任何第三方追踪或广告脚本
- **本地存储**：仅用 localStorage 保存偏好设置（如语言）和 Pro 凭证，不用于追踪
- **外链**：部分外链为推广链接（affiliate），可能为本站带来返佣，但不增加你的任何使用成本`,
  en: `Toolbox is an all-in-one developer tools site offering 30+ free, ready-to-use online utilities: JSON formatter, timestamp converter, encode/decode, regex tester, video/audio/document conversion, and more.

**Mission**: Make everyday developer tools instantly accessible — no install, no signup, just open and use.

**Highlights**:

- Most tools run purely in the browser; files never leave your device (privacy-friendly)
- Heavy tools (video/audio/document conversion) run on the server and are deleted after processing
- Lightweight and fast, with PWA offline support

### Privacy Policy

We take your privacy seriously:

- **Analytics**: Only when anonymous tracking is enabled, we log visit paths and referrers — no cookies or personally identifiable information
- **File handling**: In-browser tools process files entirely on your device with no upload; server-side conversion files are processed temporarily and deleted after completion, never stored long-term
- **Third-party tracking**: This site does not use any third-party tracking or advertising scripts
- **Local storage**: localStorage is used only for preferences (e.g. language) and Pro credentials, never for tracking
- **External links**: Some links are affiliate links that may earn this site a commission at no extra cost to you`,
};

// aboutPageHTML 渲染关于页（返回按钮 + 标题 + 双语正文 + 联系入口）
export function aboutPageHTML() {
  const lang = getLang();
  const md = CONTENT[lang] || CONTENT.zh;
  return `<div class="about-page">
    <a class="back" href="/">&larr; ${t('app.back')}</a>
    <h2>${t('about.title')}</h2>
    <div class="about-content">
      ${renderMarkdown(md)}
      <h3>${t('about.contactTitle')}</h3>
      <p>${t('about.contactIntro')} <a href="#" id="about-feedback" class="about-feedback">${t('footer.coop')}</a></p>
    </div>
  </div>`;
}
