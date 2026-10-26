// 卡卡颂 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

const game = {
  id: 'carcassonne', // 纪念卡/排行榜主题键 = game-carcassonne；本地存档键 = bg-carcassonne-save
  name: { zh: '卡卡颂', en: 'Carcassonne' },
  minPlayers: 2,
  maxPlayers: 5,
  needsPrivacy: false, // 全公开信息版图
  colors: ['#e05d5d', '#4d84e0', '#e0b23c', '#57b06a', '#9a6ae0'],
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
