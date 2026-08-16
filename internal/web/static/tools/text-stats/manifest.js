export default {
  id: 'text_stats',
  name: { zh: '文本统计', en: 'Text Stats' },
  category: { zh: '文本', en: 'Text' },
  icon: '📊',
  keywords: ['count', 'words', 'chars', 'lines', '统计', '字数'],
  component: () => import('./component.js'),
};
