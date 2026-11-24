// 斗地主 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

// 固定 3 人局（经典叫分制），无开局附加项
const game = {
  id: 'doudizhu', // 纪念卡/排行榜主题键 = game-doudizhu；本地存档键 = bg-doudizhu-save
  name: { zh: '斗地主', en: 'Dou Dizhu' },
  minPlayers: 3,
  maxPlayers: 3,
  needsPrivacy: true, // 手牌为隐藏信息，多个真人同屏时需交接遮罩
  colors: ['#d9534f', '#3b7dd8', '#3aa757'],
  initialState: engine.initialState,
  legalActions: engine.legalActions,
  apply: engine.apply,
  currentPlayer: engine.currentPlayer,
  isGameOver: engine.isGameOver,
  score: engine.score,
  // 平分判定：斗地主地主与农民分数恒相反，无并列，直接按座位序
  bot,
  renderBoard,
};

export default function (el) {
  mountBoardGame(el, game);
}
