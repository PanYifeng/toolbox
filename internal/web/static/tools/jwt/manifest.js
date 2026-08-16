export default {
  id: 'jwt',
  name: { zh: 'JWT 解码', en: 'JWT Decoder' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '🔑',
  keywords: ['jwt', 'json', 'token', '解码', 'decode'],
  component: () => import('./component.js'),
};
