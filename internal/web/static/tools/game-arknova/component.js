// 方舟动物园 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

const game = {
  id: 'arknova', // 纪念卡/排行榜主题键 = game-arknova；本地存档键 = bg-arknova-save
  name: { zh: '方舟动物园', en: 'Ark Nova' },
  minPlayers: 1, // 1 人 + AI 补位到 2 起对局；全 AI 观战亦可
  maxPlayers: 4,
  needsPrivacy: true, // 手牌私有信息
  colors: ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6'],
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
