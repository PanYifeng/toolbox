export default {
  id: 'game_snake',
  name: { zh: '贪吃蛇', en: 'Snake' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🐍',
  keywords: ['snake', 'game', '游戏', '贪吃蛇'],
  component: () => import('./component.js'),
};
