// 电力公司 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

const game = {
  id: 'powergrid', // 纪念卡/排行榜主题键 = game-powergrid；本地存档键 = bg-powergrid-save
  name: { zh: '电力公司', en: 'Power Grid' },
  minPlayers: 2,
  maxPlayers: 6,
  needsPrivacy: false,
  colors: ['#e05d5d', '#4d84e0', '#e0b23c', '#57b06a', '#9a6fd0', '#e08a4d'],
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
