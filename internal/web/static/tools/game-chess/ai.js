// chess ai.js — Web Worker：收 {state, side, depth} 跑 negamax+αβ，回 {move}。
// engine 接口包装成 game 对象供 /core/alphabeta.js 调用。
import { bestMove } from '/core/alphabeta.js';
import { legalMoves, apply, evaluate, inCheck, opp, moveScore } from './engine.js';

const game = { legalMoves, apply, evaluate, inCheck, opp, moveScore };

// 弱化：15% 概率从前 3 优里随机选，让人能赢（仿 game-ttt 哲学）
self.onmessage = (e) => {
  const { state, side, depth } = e.data;
  const r = bestMove(state, side, depth || 3, game, { randomTopK: 3, randomChance: 0.15 });
  self.postMessage({ move: r.move });
};
