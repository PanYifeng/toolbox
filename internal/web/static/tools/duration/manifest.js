export default {
  id: 'duration',
  name: { zh: '时间长度换算', en: 'Duration Convert' },
  category: { zh: '时间', en: 'Time' },
  icon: '⏳',
  keywords: ['duration', 'time', 'convert', '时间', '时长', '换算', '年月日时分秒'],
  component: () => import('./component.js'),
};
