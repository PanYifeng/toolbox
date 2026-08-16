export default {
  id: 'color',
  name: { zh: '颜色转换', en: 'Color Converter' },
  category: { zh: '设计', en: 'Design' },
  icon: '🎨',
  keywords: ['color', 'hex', 'rgb', 'hsl', '颜色'],
  component: () => import('./component.js'),
};
