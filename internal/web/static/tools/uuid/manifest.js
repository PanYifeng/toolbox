export default {
  id: 'uuid',
  name: { zh: 'UUID 生成', en: 'UUID Generator' },
  category: { zh: '生成', en: 'Generate' },
  icon: '🆔',
  keywords: ['uuid', 'guid', '唯一', 'unique', 'v4'],
  component: () => import('./component.js'),
};
