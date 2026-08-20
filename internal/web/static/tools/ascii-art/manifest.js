export default {
  id: 'ascii-art',
  name: { zh: 'ASCII 艺术生成器', en: 'ASCII Art Generator' },
  category: { zh: '设计', en: 'Design' },
  icon: '🖼️',
  keywords: ['ascii', 'art', 'ascii art', '图片转字符', '字符画', '灰度', '图片转文本', 'image to text'],
  desc: '把上传的图片转为 ASCII 字符画：读取像素灰度，按亮度映射到 @#%*+=-:. 字符，输出可复制的文本，纯前端运行。',
  guide: {
    zh: `## 功能

上传一张图片，按像素灰度亮度映射到 ASCII 字符（如 \`@#%*+=-:.\` ），生成可复制的字符画。可调节输出宽度、切换明暗方向、选择字符集。

## 使用场景

- 把头像 / logo 转成字符画用于 README 或论坛签名
- 制作复古风格的字符海报
- 理解亮度→字符映射的小演示

## 常见问题

- **支持格式**：PNG / JPG / GIF / WebP 等浏览器支持的图片格式
- **宽度**：字符画按字符宽度（列数）缩放，行数按图片比例自动折半（字符高宽比约 2:1）
- **明暗方向**：默认亮处用空格、暗处用 @；可反转用于深色背景
- **数据安全**：图片在浏览器本地读取处理，不上传服务器`,
    en: `## Features

Upload an image and convert it to ASCII art: each pixel's grayscale brightness maps to a character like \`@#%*+=-:.\` , producing copyable text. Adjust output width, flip light/dark direction, or switch character sets.

## Use cases

- Turn an avatar or logo into ASCII for a README or forum signature
- Make a retro text poster
- A small demo of brightness-to-character mapping

## FAQ

- **Formats**: PNG / JPG / GIF / WebP — anything the browser can decode
- **Width**: output is scaled to a character column count; rows are halved by image aspect (char aspect ≈ 2:1)
- **Light/dark**: by default bright pixels become spaces and dark ones @; flip it for dark backgrounds
- **Privacy**: the image is read and processed locally, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
