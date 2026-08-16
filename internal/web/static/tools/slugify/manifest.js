export default {
  id: 'slugify',
  name: { zh: 'Slug 生成', en: 'Slugify' },
  category: { zh: '文本', en: 'Text' },
  icon: '🔗',
  keywords: ['slug', 'url', 'permalink', 'slugify'],
  component: () => import('./component.js'),
};
