// 神秘大地 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

const game = {
  id: 'terra', // 纪念卡/排行榜主题键 = game-terra；本地存档键 = bg-terra-save
  name: { zh: '神秘大地', en: 'Terra Mystica' },
  minPlayers: 2,
  maxPlayers: 5,
  needsPrivacy: false,
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
