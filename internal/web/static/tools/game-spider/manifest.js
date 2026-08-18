export default {
  id: 'game-spider',
  name: { zh: '蜘蛛纸牌', en: 'Spider Solitaire' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🕷',
  keywords: ['spider', 'solitaire', '纸牌', '蜘蛛', 'card', '扑克'],
  component: () => import('./component.js'),
};
