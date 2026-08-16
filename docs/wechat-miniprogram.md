# 微信小程序落地方案

## 结论先行

**可以做，但有两条路径，且受微信平台硬性约束（最关键：单文件上传 10MB 上限，1GB 视频无法在小程序内处理）。**

| 方案 | 思路 | 工作量 | 主体要求 | 适合 |
|------|------|--------|----------|------|
| **A. web-view 内嵌 H5** | 小程序用 `<web-view>` 直接加载已部署的 Toolbox 网页 | 极小（几乎零改动） | **非个人主体**（企业/个体工商户等） | 快速上线，复用现有网页 |
| **B. 原生小程序** | WXML 重写界面，纯前端工具在小程序内实现，服务端工具调 Toolbox HTTPS API | 大 | 个人主体也可 | 体验最好，可独立上架 |

> ⚠️ **个人主体不支持 `<web-view>` 组件**（微信限制）。若只有个人主体，只能走方案 B 原生开发，或注册个体工商户/企业主体走方案 A。

---

## 一、平台硬性约束（必须先知道）

1. **HTTPS + 备案域名**：小程序所有 `wx.request`/`wx.uploadFile`/`wx.downloadFile` 的目标域名必须是 **HTTPS**、**ICP 备案**过，并在小程序后台配为「合法域名」。
2. **`wx.uploadFile` 单文件 ≤ 10MB**：微信小程序上传接口单次最大约 10MB。**1GB 视频无法在小程序内上传**——视频转码/截断在小程序端不可用（或只能处理极小视频）。这是平台限制，无法绕过。
3. **业务域名白名单**：方案 A 的 web-view 加载的域名需配「业务域名」（与 request 合法域名分开配置），且需校验文件归属。
4. **包体积**：主包 ≤ 2MB，总包 ≤ 20MB。纯前端工具代码很小，无忧。
5. **类目与资质**：注册时选「工具」类目；视频/音频处理类目可能要求相关资质，个人主体部分类目不开放（以提审时审核为准）。
6. **审核**：首次提审约 1~7 天；涉及文件处理可能被要求说明用途。

> 政策会变，提审前以 [小程序运营规范](https://developers.weixin.qq.com/miniprogram/product/) 为准。

---

## 二、方案 A：web-view 内嵌 H5（推荐快速落地）

### 适用前提
- 已有**非个人主体**小程序（企业/个体工商户/政府/媒体等）。
- Toolbox 已按 [部署文档](./deployment-tencent-cloud.md) 上线 HTTPS 域名且备案完成。

### 步骤
1. **配置业务域名**：小程序后台 → 开发管理 → 开发设置 → 业务域名 → 添加 `https://yourdomain.com`，下载校验文件放到网站根目录（Toolbox 需加一个静态文件路由放该校验文件，或用 Nginx 直接返回）。
2. **小程序页面**：
   ```xml
   <!-- pages/index/index.wxml -->
   <web-view src="https://yourdomain.com/"></web-view>
   ```
   ```json
   { "usingComponents": {} }
   ```
3. **app.json**：
   ```json
   {
     "pages": ["pages/index/index"],
     "window": { "navigationBarTitleText": "Toolbox" }
   }
   ```
4. 提审上线。

### 优缺点
- ✅ 几乎零开发，网页改了小程序自动同步。
- ✅ 所有纯前端工具 + 服务端工具（除超大文件）都可用。
- ❌ web-view 内不能调用部分小程序原生能力（支付、分享等需特殊处理）。
- ❌ 视频等大文件上传受浏览器自身限制（网页端 1GB 可用，但移动端浏览器实际体验受网络限制）。
- ❌ 个人主体不可用。

---

## 三、方案 B：原生小程序（体验最佳）

### 架构
```
小程序前端(WXML/WXSS/JS)
  ├─ 纯前端工具：在小程序 JS 内实现（JSON/时间戳/Base64/UUID/正则/颜色…）
  └─ 服务端工具：wx.uploadFile → https://yourdomain.com/api/tools/{id}
                                  → wx 轮询 /api/jobs/{id}
                                  → wx.downloadFile 下载产物 → wx.openDocument 预览
```

### 3.1 纯前端工具（直接移植）
这些工具的 JS 逻辑与浏览器一致，几乎原样搬进小程序：
- JSON 格式化（`JSON.parse/stringify`）
- 时间戳转换、时间长度换算（`Date` + 算术）
- Base64、URL 编码、HTML 实体（`wx.base64ToArrayBuffer` 等，或自实现 UTF-8 安全版本）
- UUID、密码生成、Lorem ipsum
- 进制转换、颜色转换、正则测试、大小写、文本统计、文本行处理、Slug
- JWT 解码（base64 解码 payload）

> 小程序 JS 环境无 `crypto.subtle`，SHA Hash 需用 `js-sha256` 等 npm 包或走服务端。

### 3.2 服务端工具（调 HTTPS API）
复用 Toolbox 现有接口，无需改后端：
```js
// 上传（受 10MB 限制，仅适合音频/小文档/小视频）
wx.uploadFile({
  url: 'https://yourdomain.com/api/tools/audio_convert',
  filePath,
  name: 'file',
  formData: { format: 'mp3' },
  success: (res) => {
    const { jobId } = JSON.parse(res.data);
    poll(jobId);
  },
});

// 轮询
function poll(jobId) {
  wx.request({
    url: `https://yourdomain.com/api/jobs/${jobId}`,
    success: (r) => {
      if (r.data.status === 'done') download(r.data.downloadUrl);
      else if (r.data.status === 'failed') wx.showToast({ title: r.data.error });
      else setTimeout(() => poll(jobId), 2000);
    },
  });
}

// 下载并预览
function download(url) {
  wx.downloadFile({
    url: `https://yourdomain.com${url}`,
    success: (r) => wx.openDocument({ filePath: r.tempFilePath, showMenu: true }),
  });
}
```

### 3.3 后台域名配置
小程序后台 → 开发管理 → 开发设置：
- **request 合法域名**：`https://yourdomain.com`
- **uploadFile 合法域名**：`https://yourdomain.com`
- **downloadFile 合法域名**：`https://yourdomain.com`

### 3.4 视频等大文件怎么办？
小程序内 10MB 上限处理不了 1GB 视频。两种折中：
- **小程序端只开放小工具**，视频/大文档入口显示「请访问网页版 yourdomain.com」并 `wx.setClipboardData` 复制链接。
- **引导用户用网页版**：小程序内放一个按钮，`wx.setClipboardData` 复制域名提示浏览器打开。

---

## 四、推荐落地路径

1. **第一步（1~2 周）**：按部署文档把 H5 上线（域名 + HTTPS + 备案）。
2. **第二步（视主体）**：
   - 有企业/个体主体 → **方案 A web-view**，1~2 天上线小程序，全功能复用。
   - 只有个人主体 → **方案 B 原生**，先做 10~15 个纯前端工具（2~4 周），视频/大文件引导网页版。
3. **第三步（可选）**：原生版补服务端小文件工具（音频、文档转换），形成独立体验。

---

## 五、需要 Toolbox 后端配合的点

- 现有 `/api/tools/{id}`、`/api/jobs/{id}`、`/api/jobs/{id}/download` 已满足小程序调用，**后端零改动**。
- 若走方案 A，需支持在网站根目录放置微信「业务域名校验文件」（可在 Nginx 加一个 `location = /MP_verify_xxx.txt` 直接返回，或 Toolbox 加静态文件路由）。
- 建议给 `/api/*` 的 CORS 放开（小程序不受 CORS 限制，但 web-view 内 H5 若跨域需要；同域则无需）。

---

## 六、风险与限制总结

| 限制 | 影响 | 应对 |
|------|------|------|
| 个人主体不能用 web-view | 方案 A 不可用 | 注册个体工商户，或走方案 B |
| uploadFile ≤ 10MB | 1GB 视频无法小程序内处理 | 视频引导网页版 |
| 域名需 HTTPS+备案 | 部署前置 | 见部署文档 |
| 类目资质审核 | 可能被拒或要求补充材料 | 选「工具-效率」类，准备用途说明 |
| 审核 1~7 天 | 上线节奏 | 预留时间，避免敏感词 |
