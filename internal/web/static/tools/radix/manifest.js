export default {
  id: 'radix',
  name: { zh: '进制转换', en: 'Radix Converter' },
  category: { zh: '数学', en: 'Math' },
  icon: '🔢',
  keywords: ['radix', 'hex', 'bin', 'oct', 'dec', '进制', 'binary'],
  component: () => import('./component.js'),
};
