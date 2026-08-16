export default {
  id: 'game_ttt',
  name: { zh: '井字棋', en: 'Tic-Tac-Toe' },
  category: { zh: '游戏', en: 'Games' },
  icon: '⭕',
  keywords: ['tictactoe', 'game', '游戏', '井字棋', 'oxo'],
  component: () => import('./component.js'),
};
