export default {
  id: 'video_convert',
  name: { zh: '视频转码', en: 'Video Convert' },
  category: { zh: '视频', en: 'Video' },
  icon: '🎬',
  keywords: ['video', 'ffmpeg', '视频', '转码', 'mp4', 'webm', 'mkv', 'mov'],
  desc: '在线视频转码工具，基于服务端 ffmpeg 将视频转换为 MP4、WebM、MKV、MOV 格式，免费 1GB，Pro 2GB。',
  guide: {
    zh: `## 功能

上传视频文件，由服务端 ffmpeg 转码为目标格式（MP4 H.264、WebM、MKV、MOV），任务完成后自动下载结果。

## 使用场景

- 将手机拍摄的 MOV 视频转为 MP4 便于分享
- 把视频转成 WebM 以适配网页内嵌播放
- 统一素材格式方便后续剪辑

## 常见问题

- **上传额度**：免费用户单文件上限 1GB，Pro 用户 2GB
- **转码耗时**：取决于视频时长与服务器负载，页面会实时轮询任务状态
- **格式支持**：输出格式固定为 MP4、WebM、MKV、MOV 四种，输入可为常见视频格式`,
    en: `## Features

Upload a video and transcode it on the server with ffmpeg into MP4, WebM, MKV, or MOV; the result auto-downloads when done.

## Use cases

- Convert MOV from a phone to MP4 for easier sharing
- Transcode to WebM for web-embedded playback
- Normalize footage formats before editing

## FAQ

- **Upload quota**: free users up to 1GB per file, Pro users up to 2GB
- **Duration**: depends on video length and server load; the page polls the job status live
- **Formats**: output is limited to MP4, WebM, MKV, MOV; input can be any common video format`,
  },
  component: () => import('./component.js'),
};
