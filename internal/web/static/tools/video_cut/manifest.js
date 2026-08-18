export default {
  id: 'video_cut',
  name: { zh: '视频截断', en: 'Video Cut' },
  category: { zh: '视频', en: 'Video' },
  icon: '✂️',
  keywords: ['video', 'cut', 'trim', 'clip', '视频', '截断', '裁剪', '剪辑', 'ffmpeg'],
  desc: '在线视频截断工具，按起止时间裁剪视频片段，服务端 ffmpeg 流复制无需重编码，免费 1GB，Pro 2GB。',
  guide: {
    zh: `## 功能

指定起止时间，由服务端 ffmpeg 通过流复制（-ss/-to）快速裁剪视频片段，无需重新编码，完成后自动下载。

## 使用场景

- 截取视频中的精彩片段用于分享
- 去掉片头片尾冗余部分
- 从长视频中切出教学或演示片段

## 常见问题

- **上传额度**：免费用户单文件上限 1GB，Pro 用户 2GB
- **时间格式**：支持 「00:00:10」 或秒数（如 10）两种写法
- **画质无损**：采用流复制方式，裁剪过程不重新编码，画质与原片一致`,
    en: `## Features

Set start and end times to quickly cut a video clip on the server via ffmpeg stream copy (-ss/-to) without re-encoding; the result auto-downloads when done.

## Use cases

- Extract highlight clips from a video for sharing
- Trim redundant intros and outros
- Cut teaching or demo segments out of a long video

## FAQ

- **Upload quota**: free users up to 1GB per file, Pro users up to 2GB
- **Time format**: accepts "00:00:10" or seconds (e.g. 10)
- **Lossless**: uses stream copy, no re-encoding, so quality matches the source`,
  },
  component: () => import('./component.js'),
};
