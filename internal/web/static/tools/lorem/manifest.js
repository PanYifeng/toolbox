export default {
  id: 'lorem',
  name: { zh: 'Lorem 生成', en: 'Lorem Ipsum' },
  category: { zh: '生成', en: 'Generate' },
  icon: '📃',
  keywords: ['lorem', 'ipsum', 'placeholder', '占位', '文本'],
  component: () => import('./component.js'),
};
