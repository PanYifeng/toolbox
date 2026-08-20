// Wordle 猜词游戏：6 次机会猜 5 字母词，绿/黄/灰反馈；支持自定义词库。计分 + 最佳 + 通关卡 + 排行榜。
// 计分：猜中用 n 次 → (7-n)×100；6 次未中 → 0。themeKey=game-wordle。
import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';
import builtinData from './data.js';

const WORD = 5, ROWS = 6;
const KB = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// render Wordle
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('game.score')}: <b id="w-score">0</b></span>
      <span>${t('game.best')}: <b id="w-best">0</b></span>
      <span id="w-status" class="muted"></span>
      <button id="w-new">${t('game.newgame')}</button>
    </div>
    <p class="rules">${t('wordle.howto')}</p>
    <div id="w-grid" class="wordle-grid"></div>
    <div id="w-kb" class="wordle-kb"></div>
    <details class="wordle-custom"><summary>${t('wordle.customList')}</summary>
      <textarea id="w-words" rows="4" placeholder="${t('wordle.customPh')}"></textarea>
      <button id="w-apply" class="btn-soft">${t('wordle.apply')}</button>
      <span id="w-pool" class="muted"></span>
    </details>`;

  const $grid = el.querySelector('#w-grid');
  const $kb = el.querySelector('#w-kb');
  const $score = el.querySelector('#w-score');
  const $best = el.querySelector('#w-best');
  const $status = el.querySelector('#w-status');
  let pool = [], answer = '', row = 0, buf = '', done = false, best, keyState = {};

  best = Number(localStorage.getItem('tbwordlebest') || 0);
  $best.textContent = best;
  buildGrid($grid);
  buildKb($kb);
  setPool(builtin());
  el.querySelector('#w-new').onclick = () => newGame();
  el.querySelector('#w-apply').onclick = applyCustom;
  document.addEventListener('keydown', onKey);
  newGame();
  mountGameCard(el, () => best, 'wordle');

  // builtin 返回内置词库副本
  function builtin() { return [...builtinData]; }

  // setPool 设置当前词库池并刷新显示
  function setPool(p) {
    pool = p.length ? p : builtin();
    const $pool = el.querySelector('#w-pool');
    if ($pool) $pool.textContent = t('wordle.poolSize').replace('{n}', pool.length);
  }

  // applyCustom 解析自定义词库（每行一个 5 字母词），有效则覆盖
  function applyCustom() {
    const raw = el.querySelector('#w-words').value.split(/\s+/).map((w) => w.trim().toUpperCase());
    const ok = raw.filter((w) => /^[A-Z]{5}$/.test(w));
    if (ok.length === 0) { $status.textContent = t('wordle.customFail'); $status.className = 'err'; return; }
    setPool(ok);
    $status.textContent = t('wordle.customOk').replace('{n}', ok.length);
    $status.className = 'ok';
    newGame();
  }

  // newGame 复位并随机出题
  function newGame() {
    answer = pool[Math.floor(Math.random() * pool.length)];
    row = 0; buf = ''; done = false; keyState = {};
    $score.textContent = 0;
    $status.textContent = t('wordle.start');
    $status.className = 'muted';
    [...$grid.children].forEach((r) => [...r.children].forEach((c) => { c.textContent = ''; c.className = 'wordle-cell'; }));
    refreshKb();
  }

  // buildGrid 6×5 网格
  function buildGrid($g) {
    for (let r = 0; r < ROWS; r++) {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordle-row';
      for (let c = 0; c < WORD; c++) {
        const cell = document.createElement('div');
        cell.className = 'wordle-cell';
        rowEl.appendChild(cell);
      }
      $g.appendChild(rowEl);
    }
  }

  // buildKb 屏上键盘
  function buildKb($k) {
    KB.forEach((line) => {
      const rowEl = document.createElement('div');
      rowEl.className = 'wordle-kb-row';
      [...line].forEach((ch) => {
        const b = document.createElement('button');
        b.className = 'wordle-key';
        b.dataset.k = ch;
        b.textContent = ch;
        b.onclick = () => type(ch);
        rowEl.appendChild(b);
      });
      $k.appendChild(rowEl);
    });
    // 退格与提交
    const last = $k.lastChild;
    const del = document.createElement('button');
    del.className = 'wordle-key wordle-key-wide';
    del.textContent = '⌫';
    del.onclick = () => type('DEL');
    const enter = document.createElement('button');
    enter.className = 'wordle-key wordle-key-wide';
    enter.textContent = '↵';
    enter.onclick = () => type('ENTER');
    last.insertBefore(del, last.firstChild);
    last.appendChild(enter);
  }

  // onKey 物理键盘
  function onKey(e) {
    if (!el.isConnected) { document.removeEventListener('keydown', onKey); return; }
    const k = e.key.toUpperCase();
    if (k === 'ENTER') { e.preventDefault(); type('ENTER'); return; }
    if (k === 'BACKSPACE') { e.preventDefault(); type('DEL'); return; }
    if (/^[A-Z]$/.test(k)) { e.preventDefault(); type(k); }
  }

  // type 处理输入
  function type(ch) {
    if (done) return;
    if (ch === 'DEL') { buf = buf.slice(0, -1); paintRow(); return; }
    if (ch === 'ENTER') { submit(); return; }
    if (buf.length < WORD) { buf += ch; paintRow(); }
  }

  // paintRow 当前行预览
  function paintRow() {
    const cells = $grid.children[row].children;
    for (let i = 0; i < WORD; i++) cells[i].textContent = buf[i] || '';
  }

  // submit 提交并评分；猜中或用尽次数则结算
  function submit() {
    if (buf.length !== WORD) { $status.textContent = t('wordle.need5'); $status.className = 'err'; return; }
    const grades = grade(buf, answer);
    const cells = $grid.children[row].children;
    grades.forEach((g, i) => {
      cells[i].textContent = buf[i];
      cells[i].classList.add('wordle-' + g);
      const ch = buf[i];
      keyState[ch] = bestKey(keyState[ch], g);
    });
    refreshKb();
    row++; const guessStr = buf; buf = '';
    if (guessStr === answer) { finish(true); }
    else if (row >= ROWS) { finish(false); }
    else { $status.textContent = ''; $status.className = 'muted'; }
  }

  // grade Wordle 评分：green 精确 / yellow 存在但位置错 / gray 无
  function grade(guess, ans) {
    const res = new Array(WORD).fill('gray');
    const counts = {};
    for (const c of ans) counts[c] = (counts[c] || 0) + 1;
    for (let i = 0; i < WORD; i++) if (guess[i] === ans[i]) { res[i] = 'green'; counts[guess[i]]--; }
    for (let i = 0; i < WORD; i++) { if (res[i] === 'green') continue; const c = guess[i]; if (counts[c] > 0) { res[i] = 'yellow'; counts[c]--; } }
    return res;
  }

  // bestKey 键位取最优状态：green > yellow > gray
  function bestKey(a, b) { const rank = { green: 3, yellow: 2, gray: 1 }; return rank[a] > rank[b] ? a : b; }

  // refreshKb 刷新屏上键盘着色
  function refreshKb() {
    $kb.querySelectorAll('.wordle-key').forEach((b) => {
      const k = b.dataset.k;
      if (!k) return;
      const st = keyState[k];
      b.className = 'wordle-key' + (st ? ' wordle-' + st : '');
    });
  }

  // finish 结算分数与状态
  function finish(win) {
    done = true;
    const sc = win ? (7 - row) * 100 : 0;
    $score.textContent = sc;
    if (sc > best) { best = sc; localStorage.setItem('tbwordlebest', best); $best.textContent = best; }
    $status.textContent = (win ? t('wordle.win') : t('wordle.lose')) + answer;
    $status.className = win ? 'ok' : 'err';
  }
}
