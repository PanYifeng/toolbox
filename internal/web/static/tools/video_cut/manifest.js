export default {
  id: 'video_cut',
  name: { zh: '视频截断', en: 'Video Cut' },
  category: { zh: '视频', en: 'Video' },
  icon: '✂️',
  keywords: ['video', 'cut', 'trim', 'clip', '视频', '截断', '裁剪', '剪辑'],
  component: () => import('./component.js'),
};
