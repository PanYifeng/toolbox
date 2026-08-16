export default {
  id: 'html_entity',
  name: { zh: 'HTML 实体编解码', en: 'HTML Entity Encode/Decode' },
  category: { zh: '编码', en: 'Encoding' },
  icon: '&lt;/&gt;',
  keywords: ['html', 'entity', 'escape', 'unescape', '实体', '转义'],
  component: () => import('./component.js'),
};
