export default {
  id: 'regex',
  name: { zh: '正则测试', en: 'Regex Tester' },
  category: { zh: '文本', en: 'Text' },
  icon: '🔍',
  keywords: ['regex', 'regexp', '正则', 'pattern'],
  component: () => import('./component.js'),
};
