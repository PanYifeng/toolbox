export default {
  id: 'game-minesweeper',
  name: { zh: '扫雷', en: 'Minesweeper' },
  category: { zh: '游戏', en: 'Games' },
  icon: '💣',
  keywords: ['minesweeper', 'mine', '扫雷', 'puzzle', 'logic'],
  component: () => import('./component.js'),
};
