export default {
  id: 'cert-verify',
  name: { zh: '纪念卡验真', en: 'Memorial Card Verify' },
  category: { zh: '宗教文化', en: 'Religion & Culture' },
  icon: '🛡',
  keywords: ['verify', 'cert', 'memorial', 'card', '验真', '防伪', '纪念卡', 'anti-counterfeit'],
  component: () => import('./component.js'),
};
