// 单花色蜘蛛纸牌（Spider 1-suit）：104 张全 ♠，8 组 A-K。
// 10 列发牌（前 4 列 6 张、后 6 列 5 张），余 50 张为发牌堆（5 次）。
// 点击同色降序连续序列选中，再点目标列移动；目标列顶牌需比选中顶牌大 1，空列任意。
// 列尾凑成 K..A 连续 13 张自动收走；收满 8 组通关。
import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';

const NCols = 10;
const RANK = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

// render 蜘蛛纸牌
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('sp.found')}: <b id="sp-found">0</b>/8</span>
      <span>${t('sp.moves')}: <b id="sp-moves">0</b></span>
      <span id="sp-status" class="muted"></span>
      <button id="sp-new">${t('game.newgame')}</button>
    </div>
    <p class="rules">${t('sp.howto')}</p>
    <div class="sp-table"><div id="sp-cols" class="sp-cols"></div></div>
    <div class="sp-stock-row"><button id="sp-stock" class="sp-stock"></button><span class="muted" id="sp-stockinfo"></span></div>`;
  const $cols = el.querySelector('#sp-cols');
  const $found = el.querySelector('#sp-found');
  const $moves = el.querySelector('#sp-moves');
  const $status = el.querySelector('#sp-status');
  const $stock = el.querySelector('#sp-stock');
  const $stockinfo = el.querySelector('#sp-stockinfo');
  let cols, stock, found, moves, sel, wins;
  wins = Number(localStorage.getItem('tbspwins') || 0);
  el.querySelector('#sp-new').onclick = newGame;
  $stock.onclick = dealStock;
  newGame();
  mountGameCard(el, () => found * 100 + (8 - found ? 0 : 100), 'spider');

  function newGame() {
    const deck = shuffle(buildDeck());
    cols = Array.from({ length: NCols }, () => []);
    for (let i = 0; i < NCols; i++) {
      const n = i < 4 ? 6 : 5;
      for (let k = 0; k < n; k++) cols[i].push({ r: deck.pop().r, up: false });
      cols[i][cols[i].length - 1].up = true;
    }
    stock = deck;
    found = 0; moves = 0; sel = null;
    draw();
  }

  function buildDeck() {
    const d = [];
    for (let i = 0; i < 8; i++) for (let r = 1; r <= 13; r++) d.push({ r });
    return d;
  }

  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // selectableRun 从 col 的 idx 起是否构成降序连续序列（且全部正面）
  function runOk(col, idx) {
    if (idx < 0 || idx >= col.length || !col[idx].up) return false;
    for (let i = idx; i < col.length; i++) {
      if (!col[i].up) return false;
      if (i > idx && col[i - 1].r !== col[i].r + 1) return false;
    }
    return true;
  }

  // onClick 点击某列某张牌：选中/取消/移动
  function onClick(ci, idx) {
    if (sel) {
      if (sel.col === ci) { sel = null; draw(); return; }
      tryMove(ci);
    } else {
      const col = cols[ci];
      if (!col.length || idx == null || !runOk(col, idx)) return;
      sel = { col: ci, idx };
      draw();
    }
  }

  // onClickEmpty 点击空列：若有选中则尝试移动
  function onClickEmpty(ci) {
    if (sel && sel.col !== ci) tryMove(ci);
  }

  // tryMove 把选中序列移到目标列
  function tryMove(to) {
    const from = cols[sel.col], seg = from.slice(sel.idx);
    const target = cols[to];
    const ok = target.length === 0 || target[target.length - 1].r === seg[0].r + 1;
    if (!ok) { sel = null; draw(); return; }
    cols[sel.col] = from.slice(0, sel.idx);
    if (cols[sel.col].length) cols[sel.col][cols[sel.col].length - 1].up = true;
    cols[to] = target.concat(seg);
    moves++; sel = null;
    collect(to);
    checkWin();
    draw();
  }

  // collect 收走列尾的 K..A 完整降序序列
  function collect(ci) {
    const col = cols[ci];
    if (col.length < 13) return;
    const tail = col.slice(-13);
    if (!tail.every((c, i) => c.up && (i === 0 || tail[i - 1].r === c.r + 1))) return;
    if (tail[0].r !== 13) return;
    cols[ci] = col.slice(0, -13);
    if (cols[ci].length) cols[ci][cols[ci].length - 1].up = true;
    found++;
  }

  // dealStock 发牌：每列发一张，任意空列时禁止
  function dealStock() {
    if (!stock.length) return;
    if (cols.some((c) => !c.length)) { $status.textContent = t('sp.needFill'); $status.className = 'err'; return; }
    for (let i = 0; i < NCols && stock.length; i++) {
      cols[i].push({ r: stock.pop().r, up: true });
      collect(i);
    }
    moves++; sel = null; checkWin(); draw();
  }

  function checkWin() {
    if (found === 8) {
      wins++; localStorage.setItem('tbspwins', wins);
      $status.textContent = t('sp.win'); $status.className = 'ok';
    }
  }

  // draw 渲染全部列与发牌堆
  function draw() {
    $found.textContent = found;
    $moves.textContent = moves;
    $stock.textContent = '🂠'.repeat(Math.min(stock.length, 5)) || '·';
    $stockinfo.textContent = `${t('sp.dealsLeft')}: ${Math.ceil(stock.length / NCols)}`;
    if (found < 8 && !stock.length && !sel) { $status.textContent = ''; $status.className = 'muted'; }
    $cols.innerHTML = '';
    for (let i = 0; i < NCols; i++) {
      const colEl = document.createElement('div');
      colEl.className = 'sp-col';
      if (!cols[i].length) {
        const empty = document.createElement('button');
        empty.className = 'sp-card sp-empty';
        empty.onclick = () => onClickEmpty(i);
        colEl.appendChild(empty);
      } else {
        cols[i].forEach((card, idx) => colEl.appendChild(cardEl(i, idx, card)));
      }
      $cols.appendChild(colEl);
    }
  }

  // cardEl 单张牌元素
  function cardEl(ci, idx, card) {
    const e = document.createElement('button');
    e.className = 'sp-card' + (card.up ? '' : ' down') + (sel && sel.col === ci && idx >= sel.idx ? ' sel' : '');
    e.textContent = card.up ? `${RANK[card.r]}♠` : '🂠';
    e.onclick = () => onClick(ci, idx);
    return e;
  }
}
