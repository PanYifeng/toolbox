export default {
  id: 'audio_convert',
  name: { zh: '音频转换', en: 'Audio Convert' },
  category: { zh: '音频', en: 'Audio' },
  icon: '🎵',
  keywords: ['audio', 'mp3', 'wav', 'flac', 'ffmpeg', '音频', '转码', 'm4a', 'ogg', 'aac', '格式转换'],
  desc: '在线音频格式转换工具，支持 MP3、WAV、FLAC、OGG、M4A 互转，服务端 ffmpeg 处理。',
  guide: {
    zh: `## 功能

上传音频文件，选择目标格式（MP3 / WAV / FLAC / OGG / M4A），由服务端 ffmpeg 转码后返回下载链接。

## 使用场景

- 把录音转成 MP3 方便分享和播放
- 将无损 FLAC 转为体积更小的 OGG 或 M4A
- 把各种格式统一转成 WAV 用于二次剪辑

## 常见问题

- **处理耗时**：大文件转码需要时间，提交后页面会自动轮询任务状态，完成后自动开始下载
- **支持格式**：输入支持常见音频格式，输出可选 MP3、WAV、FLAC、OGG、M4A（AAC）
- **文件大小**：受服务端处理能力限制，超大文件可能转换失败`,
    en: `## Features

Upload an audio file, pick a target format (MP3 / WAV / FLAC / OGG / M4A), and the server-side ffmpeg transcodes it and returns a download link.

## Use cases

- Convert recordings to MP3 for easy sharing and playback
- Shrink lossless FLAC into smaller OGG or M4A
- Normalize various formats into WAV for further editing

## FAQ

- **Processing time**: large files take longer; the page polls the job status and auto-downloads once done
- **Supported formats**: common audio inputs accepted; outputs include MP3, WAV, FLAC, OGG, M4A (AAC)
- **File size**: very large files may fail due to server-side limits`,
  },
  component: () => import('./component.js'),
};
