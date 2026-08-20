import { t } from '/core/i18n.js';
import { mountGameCard } from '/core/game-card.js';

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
const AI_OPTIMAL = 0.7; // O 走 minimax 最优的概率，剩余随机——弱化 AI 使井字棋可赢（完美 minimax 下必和）

// render 井字棋（玩家 X，电脑 O 用 minimax）
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('ttt.you')}</span>
      <span>${t('ttt.streak')}: <b id="tt-streak">0</b></span>
      <span>${t('game.best')}: <b id="tt-best">0</b></span>
      <span id="tt-status" class="muted"></span>
      <button id="tt-reset">${t('ttt.reset')}</button>
    </div>
    <p class="rules">${t('ttt.howto')}</p>
    <div id="tt-board" class="ttt-board"></div>`;

  let board;
  let streak = Number(localStorage.getItem('tttstreak') || 0);
  let bestStreak = Number(localStorage.getItem('tttbest') || 0);
  const $board = el.querySelector('#tt-board');
  const $status = el.querySelector('#tt-status');
  const $streak = el.querySelector('#tt-streak');
  const $best = el.querySelector('#tt-best');
  $streak.textContent = streak; $best.textContent = bestStreak;
  el.querySelector('#tt-reset').onclick = newGame;
  newGame();
  // 通关纪念卡入口（按最高连胜数生成）
  mountGameCard(el, () => bestStreak, 'ttt');

  function newGame() {
    board = Array(9).fill('');
    $status.textContent = '';
    draw();
  }

  function draw() {
    $board.innerHTML = '';
    board.forEach((v, i) => {
      const b = document.createElement('button');
      b.className = 'ttt-cell' + (v ? ' ttt-' + v : '');
      b.textContent = v;
      b.onclick = () => play(i);
      $board.appendChild(b);
    });
  }

  function play(i) {
    if (board[i] || winner(board)) return;
    board[i] = 'X';
    if (afterMove('X')) return;
    // 电脑走一步（弱化 AI：70% 最优 + 30% 随机，使井字棋可赢）
    board[bestMove()] = 'O';
    afterMove('O');
    draw();
  }

  function afterMove(p) {
    const w = winner(board);
    if (w === 'X') {
      streak++; if (streak > bestStreak) bestStreak = streak;
      localStorage.setItem('tttstreak', streak); localStorage.setItem('tttbest', bestStreak);
      $streak.textContent = streak; $best.textContent = bestStreak;
      $status.textContent = `${t('ttt.win')} · ${t('ttt.streak')} ${streak}`; $status.className = 'ok';
      draw(); return true;
    }
    if (w === 'O' || board.every(Boolean)) {
      streak = 0; localStorage.setItem('tttstreak', '0'); $streak.textContent = '0';
      $status.textContent = w === 'O' ? t('ttt.lose') : t('ttt.draw');
      $status.className = w === 'O' ? 'err' : 'muted';
      draw(); return true;
    }
    draw();
    return false;
  }

  function winner(b) {
    for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    return null;
  }

  // bestMove 选 O 的落子：AI_OPTIMAL 概率走 minimax 最优，否则随机空格（弱化 AI，让人类有取胜空间）
  function bestMove() {
    if (Math.random() >= AI_OPTIMAL) {
      const empty = [];
      for (let i = 0; i < 9; i++) if (!board[i]) empty.push(i);
      return empty[(Math.random() * empty.length) | 0];
    }
    let best = -Infinity, move = -1;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        const s = minimax(board, 0, false);
        board[i] = '';
        if (s > best) { best = s; move = i; }
      }
    }
    return move;
  }

  function minimax(b, depth, max) {
    const w = winner(b);
    if (w === 'O') return 10 - depth;
    if (w === 'X') return depth - 10;
    if (b.every(Boolean)) return 0;
    if (max) {
      let best = -Infinity;
      for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = 'O'; best = Math.max(best, minimax(b, depth + 1, false)); b[i] = ''; }
      return best;
    }
    let best = Infinity;
    for (let i = 0; i < 9; i++) if (!b[i]) { b[i] = 'X'; best = Math.min(best, minimax(b, depth + 1, true)); b[i] = ''; }
    return best;
  }
}
