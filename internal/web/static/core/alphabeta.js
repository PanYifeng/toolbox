// alphabeta.js — negamax + alpha-beta 搜索，中国象棋/国际象棋 AI 共享。
// 两象棋规则差异大（各写各的 engine.js），但搜索逻辑完全一致，抽此模块复用。
//
// game（engine）须实现以下接口（命名导出或对象均可，本模块以对象方式调用）：
//   clone(state)            深拷贝 state（搜索前保险，apply 若已返回新 state 可 noop）
//   legalMoves(state, side) 返回 side 的【合法】走法数组（已过滤"走完己方将帅/王被将"）
//   apply(state, move)      返回应用 move 后的【新】state（不修改入参，便于回溯/搜索）
//   evaluate(state, side)   返回 side 视角的估值（material + PST；对方为负）
//   inCheck(state, side)    side 的将帅/王是否正被将军
//   opp(side)               对手方标识
//   noMovesIsLoss           可选 bool：无合法步时是否判负（中国象棋困毙即负）；
//                           不设则按国际象棋规则（仅被将判负，否则和棋=0）
//   moveScore(state, move)  可选：走法排序分（吃子优先，提昇 αβ 剪枝）；不实现则不排序
// move 结构由 engine 自定义；state 须可结构化克隆（纯对象/数组），便于 postMessage 传 worker。

// 将死分基线：早将死更负（被将一方视角）。ply=距根层数，越小越早被将死 → 越负。
const MATE = 1e6;

// negamax 返回 side 视角分数。困毙/逼和=0；被将死=-(MATE-ply)。
export function negamax(state, depth, alpha, beta, side, ply, game) {
  if (depth === 0) return game.evaluate(state, side);
  const moves = game.legalMoves(state, side);
  if (moves.length === 0) {
    // side 无合法步：将死（被将）必负；困毙按规则——中象判负、国象判和。
    // noMovesIsLoss 置真时无论是否被将都判负；否则仅被将判负，否则和棋（0）。
    const loss = game.noMovesIsLoss ? true : game.inCheck(state, side);
    return loss ? -(MATE - ply) : 0;
  }
  if (game.moveScore) moves.sort((a, b) => game.moveScore(state, b) - game.moveScore(state, a));
  let best = -Infinity;
  for (const m of moves) {
    const s2 = game.apply(state, m);
    const sc = -negamax(s2, depth - 1, -beta, -alpha, game.opp(side), ply + 1, game);
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break; // β 剪枝
  }
  return best;
}

// bestMove 根节点选最优走法。opts.randomTopK>1 + randomChance>0 时有概率从前 K 优里随机（弱化 AI，让人能赢，仿 game-ttt 哲学）。
export function bestMove(state, side, depth, game, opts = {}) {
  const moves = game.legalMoves(state, side);
  if (!moves.length) return { move: null, score: 0 };
  if (game.moveScore) moves.sort((a, b) => game.moveScore(state, b) - game.moveScore(state, a));
  const scored = [];
  let alpha = -Infinity;
  for (const m of moves) {
    const s2 = game.apply(state, m);
    const sc = -negamax(s2, depth - 1, -Infinity, -alpha, game.opp(side), 1, game);
    scored.push({ move: m, score: sc });
    if (sc > alpha) alpha = sc;
  }
  scored.sort((a, b) => b.score - a.score);
  const k = Math.min(opts.randomTopK || 1, scored.length);
  if (k > 1 && Math.random() < (opts.randomChance || 0)) {
    return scored[Math.floor(Math.random() * k)];
  }
  return scored[0];
}
