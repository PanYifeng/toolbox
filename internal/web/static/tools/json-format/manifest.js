export default {
  id: 'json_format',
  name: { zh: 'JSON 格式化', en: 'JSON Format' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '{ }',
  keywords: ['json', 'format', '格式化', '校验', 'beautify'],
  component: () => import('./component.js'),
};
