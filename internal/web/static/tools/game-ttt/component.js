import { t } from '/core/i18n.js';

const LINES = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

// render 井字棋（玩家 X，电脑 O 用 minimax）
export default function (el) {
  el.innerHTML = `
    <div class="game-bar">
      <span>${t('ttt.you')}</span>
      <span id="tt-status" class="muted"></span>
      <button id="tt-reset">${t('ttt.reset')}</button>
    </div>
    <p class="rules">${t('ttt.howto')}</p>
    <div id="tt-board" class="ttt-board"></div>`;

  let board;
  const $board = el.querySelector('#tt-board');
  const $status = el.querySelector('#tt-status');
  el.querySelector('#tt-reset').onclick = newGame;
  newGame();

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
    // 电脑走最佳一步
    board[bestMove()] = 'O';
    afterMove('O');
    draw();
  }

  function afterMove(p) {
    const w = winner(board);
    if (w === 'X') { $status.textContent = t('ttt.win'); $status.className = 'ok'; draw(); return true; }
    if (w === 'O') { $status.textContent = t('ttt.lose'); $status.className = 'err'; draw(); return true; }
    if (board.every(Boolean)) { $status.textContent = t('ttt.draw'); $status.className = 'muted'; draw(); return true; }
    draw();
    return false;
  }

  function winner(b) {
    for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
    return null;
  }

  // bestMove minimax 选 O 的最佳落子
  function bestMove() {
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
