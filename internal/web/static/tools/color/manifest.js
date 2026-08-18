export default {
  id: 'color',
  name: { zh: '颜色转换', en: 'Color Converter' },
  category: { zh: '设计', en: 'Design' },
  icon: '🎨',
  keywords: ['color', 'hex', 'rgb', 'hsl', '颜色', '颜色值', '色值转换', '配色'],
  desc: '在线颜色转换工具，输入 HEX 实时输出 RGB 与 HSL，附色块预览，纯前端处理。',
  guide: {
    zh: `## 功能

输入 HEX 颜色值，实时换算并展示对应的 RGB 与 HSL 表示，同时显示色块预览。

## 使用场景

- 在 CSS、设计稿之间统一颜色格式
- 快速查看某个 HEX 色值的 RGB 分量用于调色
- 把屏幕取色结果换算成 HSL 方便调整色相和饱和度

## 常见问题

- **输入格式**：支持带或不带「#」前缀的 6 位 HEX，例如「2563eb」或「#2563eb」
- **格式无效**：输入非 6 位十六进制字符时会提示错误
- **数据安全**：换算在浏览器本地完成，不上传服务器`,
    en: `## Features

Enter a HEX color and instantly get the equivalent RGB and HSL values, with a live swatch preview.

## Use cases

- Unify color formats between CSS and design mockups
- Inspect the RGB components of a HEX value for fine-tuning
- Convert a picked screen color into HSL to adjust hue and saturation

## FAQ

- **Input format**: accepts 6-digit HEX with or without a # prefix, e.g. 2563eb or #2563eb
- **Invalid format**: non-6-digit hex input triggers an error
- **Privacy**: conversion runs locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
