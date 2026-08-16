export default {
  id: 'markdown',
  name: { zh: 'Markdown 预览', en: 'Markdown Preview' },
  category: { zh: '文本', en: 'Text' },
  icon: '📝',
  keywords: ['markdown', 'md', 'preview', '预览'],
  component: () => import('./component.js'),
};
