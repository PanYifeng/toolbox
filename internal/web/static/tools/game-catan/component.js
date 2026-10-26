// 卡坦岛 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

const game = {
  id: 'catan', // 纪念卡/排行榜主题键 = game-catan；本地存档键 = bg-catan-save
  name: { zh: '卡坦岛', en: 'Catan' },
  minPlayers: 3,
  maxPlayers: 4,
  needsPrivacy: false, // 明牌：资源与发展卡全公开（见 manifest 数据声明）
  colors: ['#e05d5d', '#4d84e0', '#e0b23c', '#57b06a'],
  initialState: engine.initialState,
  legalActions: engine.legalActions,
  apply: engine.apply,
  currentPlayer: engine.currentPlayer,
  isGameOver: engine.isGameOver,
  score: engine.score,
  bot,
  renderBoard,
};

export default function (el) {
  mountBoardGame(el, game);
}
