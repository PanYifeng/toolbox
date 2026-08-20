export default {
  id: 'pixel-art',
  name: { zh: '像素画板', en: 'Pixel Art' },
  category: { zh: '设计', en: 'Design' },
  icon: '🖌️',
  keywords: ['pixel', 'art', '像素', '画板', '涂色', '像素画', 'retro', 'grid', 'flood fill', '填充'],
  desc: '在线像素画板，N×N 网格涂色，支持选色盘、自定义色、橡皮擦、填充桶、撤销与 PNG 导出，纯前端运行。',
  guide: {
    zh: `## 功能

在 N×N 像素网格上按住拖动涂色，支持选色盘取色、自定义颜色、橡皮擦、填充桶（连通同色区域一键换色）、撤销与重做，完成后导出 PNG。

## 使用场景

- 绘制复古像素风头像 / 小图标 / 表情
- 快速做像素小稿用于游戏素材或贴纸
- 给小朋友涂色玩

## 常见问题

- **涂色方式**：按住鼠标 / 手指在网格上拖动即可连续涂色
- **橡皮擦**：选中橡皮擦后涂色即清除该格（变回底色）
- **填充桶**：点击某格，与其连通的同色区域一次性换为当前色
- **撤销**：每次落笔（按下到抬起为一次笔触）记一条历史，撤销逐笔回退
- **导出**：按网格实际像素导出无网格线的 PNG
- **数据安全**：画作仅存于浏览器，不上传服务器`,
    en: `## Features

Paint on an N×N pixel grid by press-dragging; pick from a palette or a custom color, erase, flood-fill connected same-color regions, undo per stroke, and export a PNG.

## Use cases

- Draw retro pixel avatars, icons, or emojis
- Sketch quick pixel art for game assets or stickers
- A simple coloring toy for kids

## FAQ

- **Painting**: press and drag across the grid to paint continuously
- **Eraser**: select the eraser, then paint to clear cells back to the background
- **Fill bucket**: click a cell to recolor every connected cell of the same color
- **Undo**: each press-to-release stroke is one history entry; undo steps back one stroke
- **Export**: PNG is exported at native pixel resolution without grid lines
- **Privacy**: your artwork stays in the browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
