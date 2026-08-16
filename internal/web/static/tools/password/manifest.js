export default {
  id: 'password',
  name: { zh: '密码生成', en: 'Password Generator' },
  category: { zh: '生成', en: 'Generate' },
  icon: '🔐',
  keywords: ['password', '随机', 'random', '密码', 'generator'],
  component: () => import('./component.js'),
};
