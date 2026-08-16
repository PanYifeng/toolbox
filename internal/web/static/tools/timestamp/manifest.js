export default {
  id: 'timestamp',
  name: { zh: '时间戳转换', en: 'Timestamp Converter' },
  category: { zh: '时间', en: 'Time' },
  icon: '🕐',
  keywords: ['timestamp', 'unix', '时间戳', 'date', '时间'],
  component: () => import('./component.js'),
};
