export default {
  id: 'hash',
  name: { zh: '哈希计算', en: 'Hash Generator' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '#️⃣',
  keywords: ['hash', 'sha', 'sha256', 'sha512', '摘要', 'digest'],
  component: () => import('./component.js'),
};
