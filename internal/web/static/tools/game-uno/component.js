// 巫诺（UNO） component：组装 adapter 挂载到共享热座框架（core/boardgame.js）。
import { mountBoardGame } from '/core/boardgame.js';
import { t } from '/core/i18n.js';
import * as engine from './engine.js';
import { bot } from './bot.js';
import { renderBoard } from './render.js';
import { DEFAULT_TARGET, TARGET_CHOICES } from './data-cards.js';

// setupOptions 开局附加项：目标分 + 两条家庭规则；人数变化/开局时框架会重新调用，
// 第二次调用（gatherSetup）时按上次选择回填，保证「人数变化不重置用户选择」
function setupOptions(el, ctx) {
  // 复用已有 DOM 时读当前值，首次调用用默认值
  const prev = el._unOpts || { target: DEFAULT_TARGET, stacking: false, drawPlay: true };
  el.innerHTML = `
    <div class="un-setup">
      <label>${t('un.ui.opt.target')}
        <select data-opt="target">
          ${TARGET_CHOICES.map((v) => `<option value="${v}"${v === prev.target ? ' selected' : ''}>${v}</option>`).join('')}
        </select>
      </label>
      <label class="un-opt-check">
        <input type="checkbox" data-opt="stacking"${prev.stacking ? ' checked' : ''}> ${t('un.ui.opt.stacking')}
      </label>
      <label class="un-opt-check">
        <input type="checkbox" data-opt="drawPlay"${prev.drawPlay ? ' checked' : ''}> ${t('un.ui.opt.drawPlay')}
      </label>
      <p class="muted un-opt-tip">${t('un.ui.opt.tip')}</p>
    </div>`;
  const read = () => {
    const opts = {
      target: Number(el.querySelector('[data-opt="target"]').value) || DEFAULT_TARGET,
      stacking: el.querySelector('[data-opt="stacking"]').checked,
      drawPlay: el.querySelector('[data-opt="drawPlay"]').checked,
    };
    el._unOpts = opts;
    return opts;
  };
  el.querySelectorAll('[data-opt]').forEach(($x) => { $x.onchange = read; });
  return read();
}

const game = {
  id: 'uno', // 纪念卡/排行榜主题键 = game-uno；本地存档键 = bg-uno-save
  name: { zh: '巫诺', en: 'UNO' },
  minPlayers: 2,
  maxPlayers: 6,
  needsPrivacy: false, // 手牌数量公开可见，无需交接遮罩
  colors: ['#e05d5d', '#4d84e0', '#e0b23c', '#57b06a', '#a86bd1', '#d1774d'],
  initialState: engine.initialState,
  legalActions: engine.legalActions,
  apply: engine.apply,
  currentPlayer: engine.currentPlayer,
  isGameOver: engine.isGameOver,
  score: engine.score,
  // 平分判定：同分时胜局多者胜（compare 协议：负 = a 排前）
  tieBreak: (a, b, s) => s.players[b].wins - s.players[a].wins,
  bot,
  renderBoard,
  setupOptions,
};

export default function (el) {
  mountBoardGame(el, game);
}
