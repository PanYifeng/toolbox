export default {
  id: 'audio_convert',
  name: { zh: '音频转换', en: 'Audio Convert' },
  category: { zh: '音频', en: 'Audio' },
  icon: '🎵',
  keywords: ['audio', 'mp3', 'wav', 'flac', 'ffmpeg', '音频', '转码'],
  component: () => import('./component.js'),
};
