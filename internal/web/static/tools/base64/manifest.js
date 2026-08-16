export default {
  id: 'base64',
  name: { zh: 'Base64 编解码', en: 'Base64 Encode/Decode' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '🔤',
  keywords: ['base64', 'encode', 'decode', '编码'],
  component: () => import('./component.js'),
};
