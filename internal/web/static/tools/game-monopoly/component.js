// 大富翁 component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import { t } from '/core/i18n.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';

// ROUND_CHOICES 回合上限选项（0 = 不设上限，打到只剩一家）
const ROUND_CHOICES = [0, 30, 60, 100];

// setupOptions 开局附加项：回合上限；人数变化/开局时框架会重新调用，
// 用 el._moRounds 记住上次选择，保证重绘后不重置用户选择
function setupOptions(el, ctx) {
  void ctx;
  const prev = el._moRounds === undefined ? 60 : el._moRounds;
  el.innerHTML = `<div class="mo-setup">
    <label>${t('mo.ui.opt.rounds')}
      <select data-opt="rounds">
        ${ROUND_CHOICES.map((v) => `<option value="${v}"${v === prev ? ' selected' : ''}>${v === 0 ? t('mo.ui.opt.roundsNone') : v}</option>`).join('')}
      </select></label>
    <p class="muted mo-opt-tip">${t('mo.ui.opt.tip')}</p>
  </div>`;
  const read = () => {
    el._moRounds = Number(el.querySelector('[data-opt="rounds"]').value) || 0;
    return { maxRounds: el._moRounds };
  };
  el.querySelector('[data-opt="rounds"]').onchange = read;
  return read();
}

const game = {
  id: 'monopoly', // 纪念卡/排行榜主题键 = game-monopoly；本地存档键 = bg-monopoly-save
  name: { zh: '大富翁', en: 'Monopoly' },
  minPlayers: 2,
  maxPlayers: 6,
  needsPrivacy: false, // 明牌：现金与地契全公开（房地产桌游的公开信息）
  colors: ['#d9534f', '#3b7dd8', '#3aa757', '#e0a53c', '#8b5cf6', '#0ea5a5'],
  initialState: engine.initialState,
  legalActions: engine.legalActions,
  apply: engine.apply,
  validateAction: engine.validateAction, // 交易等无法穷举的动作由引擎深校验
  currentPlayer: engine.currentPlayer,
  isGameOver: engine.isGameOver,
  score: engine.score,
  // 无 tieBreak：净资产相同时按座位序（框架默认行为）
  bot,
  renderBoard,
  setupOptions,
};

export default function (el) {
  mountBoardGame(el, game);
}
