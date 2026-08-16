export default {
  id: 'url_encode',
  name: { zh: 'URL 编解码', en: 'URL Encode/Decode' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '🔗',
  keywords: ['url', 'uri', 'encode', 'decode', 'percent'],
  component: () => import('./component.js'),
};
