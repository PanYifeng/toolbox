export default {
  id: 'video_convert',
  name: { zh: '视频转码', en: 'Video Convert' },
  category: { zh: '视频', en: 'Video' },
  icon: '🎬',
  keywords: ['video', 'ffmpeg', '视频', '转码', 'mp4'],
  component: () => import('./component.js'),
};
