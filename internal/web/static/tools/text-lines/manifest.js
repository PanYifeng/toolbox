export default {
  id: 'text_lines',
  name: { zh: '文本行处理', en: 'Line Tools' },
  category: { zh: '文本', en: 'Text' },
  icon: '☰',
  keywords: ['lines', 'sort', 'dedupe', 'unique', 'trim', '行', '去重', '排序'],
  component: () => import('./component.js'),
};
