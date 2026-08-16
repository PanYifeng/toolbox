export default {
  id: 'url_parse',
  name: { zh: 'URL 解析', en: 'URL Parser' },
  category: { zh: '网络', en: 'Network' },
  icon: '🌐',
  keywords: ['url', 'parse', 'uri', '解析'],
  component: () => import('./component.js'),
};
