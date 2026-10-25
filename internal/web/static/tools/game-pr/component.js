// 波多黎各 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

// ? 待核对：2 人变体规则改动多（角色数/货船/起始配置），首发 3-5 人
const game = {
  id: 'pr', // 纪念卡/排行榜主题键 = game-pr；本地存档键 = bg-pr-save
  name: { zh: '波多黎各', en: 'Puerto Rico' },
  minPlayers: 3,
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
