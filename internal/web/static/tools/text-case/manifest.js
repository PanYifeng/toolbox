export default {
  id: 'text_case',
  name: { zh: '大小写转换', en: 'Case Converter' },
  category: { zh: '文本', en: 'Text' },
  icon: 'Aa',
  keywords: ['case', 'camel', 'snake', 'kebab', 'upper', 'lower', '大小写'],
  component: () => import('./component.js'),
};
