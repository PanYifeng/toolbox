export default {
  id: 'cert-verify',
  name: { zh: '纪念卡验真', en: 'Memorial Card Verify' },
  category: { zh: '纪念卡', en: 'Memorial' },
  icon: '🛡',
  keywords: ['verify', 'cert', 'memorial', 'card', '验真', '防伪', '纪念卡', 'anti-counterfeit'],
  component: () => import('./component.js'),
};
