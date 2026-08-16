export default {
  id: 'text_diff',
  name: { zh: '文本差异', en: 'Text Diff' },
  category: { zh: '文本', en: 'Text' },
  icon: '⚖️',
  keywords: ['diff', 'compare', '差异', '对比'],
  component: () => import('./component.js'),
};
