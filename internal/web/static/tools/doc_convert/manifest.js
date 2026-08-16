export default {
  id: 'doc_convert',
  name: { zh: '文档转换', en: 'Document Convert' },
  category: { zh: '文档', en: 'Document' },
  icon: '📄',
  keywords: ['doc', 'docx', 'pdf', 'libreoffice', '文档', '转换', 'word'],
  component: () => import('./component.js'),
};
