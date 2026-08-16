export default {
  id: 'game_2048',
  name: { zh: '2048', en: '2048' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🎯',
  keywords: ['2048', 'game', 'puzzle', '游戏', '益智'],
  component: () => import('./component.js'),
};
