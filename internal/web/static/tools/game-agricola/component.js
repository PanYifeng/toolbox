// 农场主 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

const game = {
  id: 'agricola', // 纪念卡/排行榜主题键 = game-agricola；本地存档键 = bg-agricola-save
  name: { zh: '农场主', en: 'Agricola' },
  minPlayers: 1,
  maxPlayers: 5,
  needsPrivacy: true, // 手牌（职业/小改进）属隐私，人类间换手需交接遮罩
  colors: ['#e05d5d', '#4d84e0', '#e0b23c', '#57b06a', '#9a6fd0'],
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
