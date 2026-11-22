// 巫诺（UNO）引擎：经典 108 张牌规则复刻。
// 纯函数 + JSON-safe state，零 DOM/i18n 依赖（node 可直接自测）。
// 规则要点（官方基础版）：
//   · 每人 7 张，翻首张定色，顺时针；首张若是 +4 洗回重翻、若是变色由首位玩家选色、
//     若是跳过/反转/+2 则对首位玩家即时生效。
//   · 接牌：同色 | 同数字 | 同符号（跳过/反转/+2 跨色可接）| 万能牌随时可出。
//   · 无牌可出摸 1 张；摸到的牌可出可立即打出（家庭规则可关）。
//   · +2 让下家摸 2 并跳过；+4 让下家摸 4、跳过后由出牌者选色。
//     家庭规则「连锁」开启时，+2 只接 +2、+4 只接 +4，罚牌量累加至接不住者。
//   · 出到剩 1 张须喊 UNO；忘喊罚摸 2（热座/联机无实时抢答，罚则表现为自己选择「忘喊认罚」）。
//   · 有人出完一局结束，赢家按对手手牌计分（数字=面值，功能=20，万能=50）；
//     累计到目标分（默认 500）结束整场。

import {
  DECK, HAND_SIZE, DEFAULT_TARGET, WILD, V_SKIP, V_REV, V_DRAW2, V_WILD, V_WILD4,
  cardValue, cardName, COLOR_NAMES,
} from './data-cards.js';

// —— 基础工具 ——

// clone 深拷贝（apply 不改入参的保证）
function clone(s) { return JSON.parse(JSON.stringify(s)); }

// rnd 确定性随机数（state 内 LCG，悔棋/重放可复现）
function rnd(s) {
  s.rng.state = (Math.imul(s.rng.state, 1664525) + 1013904223) >>> 0;
  return s.rng.state / 4294967296;
}

// shuffled 洗牌副本（Fisher-Yates，用 state 随机源）
function shuffled(s, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd(s) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// LOG_CAP 日志上限：整场多局可累积数千条，只保留最近一段（界面只渲染尾部）
const LOG_CAP = 800;

// log 追加日志条目（args 值可为 {zh,en} 双语对象）
function log(s, seat, key, args) {
  s.log.push({ seat, key, args });
  if (s.log.length > LOG_CAP) s.log.splice(0, s.log.length - LOG_CAP);
}

// topCard 弃牌堆顶牌 id
function topCard(s) {
  return s.discard[s.discard.length - 1];
}

// nextSeat 沿当前方向数 k 步后的座位
function nextSeat(s, k) {
  let seat = s.cur;
  for (let i = 0; i < k; i++) seat = (seat + s.dir + s.n) % s.n;
  return seat;
}

// —— 摸牌与牌堆回收 ——

// drawCards 给指定座位摸 k 张（牌堆空则把弃牌堆除顶牌洗回）
function drawCards(s, seat, k) {
  const out = [];
  for (let i = 0; i < k; i++) {
    if (s.draw.length === 0) reshuffle(s);
    if (s.draw.length === 0) break; // 108 张牌下不可达，防御性退出
    const id = s.draw.shift();
    s.players[seat].hand.push(id);
    out.push(id);
  }
  return out;
}

// reshuffle 弃牌堆除顶牌洗回牌堆（官方：牌堆用尽时把弃牌堆重新洗混）
function reshuffle(s) {
  if (s.discard.length <= 1) return;
  const top = s.discard.pop();
  s.draw = shuffled(s, s.discard);
  s.discard = [top];
  log(s, -1, 'un.log.reshuffle', { k: s.draw.length });
}

// —— 可出牌判定 ——

// canPlay 该牌当前能否打出（同色 / 同数字 / 同符号 / 万能牌）
function canPlay(s, cardId) {
  const card = DECK[cardId];
  if (card.c === WILD) return true;
  if (card.c === s.activeColor) return true;
  return card.v === DECK[topCard(s)].v;
}

// canStack 连锁罚牌期可接的牌（+2 只接 +2，+4 只接 +4）
function canStack(s, cardId) {
  const v = DECK[cardId].v;
  return s.stackKind === 'd4' ? v === V_WILD4 : v === V_DRAW2;
}

// —— 开局 ——

// initialState 开局：洗牌发牌、翻首张、应用首张特殊效果
export function initialState(setup) {
  const seats = setup.seats;
  const extras = setup.extras || {};
  const s = {
    rng: { state: (setup.seed || 1) >>> 0 || 1 },
    n: seats.length,
    players: seats.map((x, i) => ({
      seat: i, name: x.name, isAI: x.isAI, color: x.color,
      hand: [], score: 0, wins: 0,
    })),
    rules: {
      target: Number(extras.target) > 0 ? Number(extras.target) : DEFAULT_TARGET,
      stacking: !!extras.stacking,
      drawPlay: extras.drawPlay !== false, // 官方默认允许摸到可出的牌立即打出
    },
    draw: [],
    discard: [],
    activeColor: 0, // 当前生效颜色（万能牌出后为所选色）
    dir: 1,
    cur: 0,
    drawStack: 0,   // 连锁累计待摸张数（仅 stacking 开启时用）
    stackKind: '',  // 'd2' | 'd4'
    pending: null,  // 微阶段：chooseColor / drawPlay / uno
    round: 0,
    roundOver: false,
    lastWinner: -1,
    gameOver: false,
    log: [],
  };
  dealRound(s);
  return s;
}

// dealRound 发一局：洗牌 → 每人 7 张 → 翻首张 → 应用首张特殊效果
function dealRound(s) {
  s.round += 1;
  s.roundOver = false;
  s.pending = null;
  s.dir = 1;
  // 每局起手玩家轮转（对应官方每局换庄）
  s.cur = (s.round - 1) % s.n;
  s.drawStack = 0;
  s.stackKind = '';
  s.discard = [];
  s.draw = shuffled(s, DECK.map((_, i) => i));
  for (const p of s.players) p.hand = [];
  for (let i = 0; i < HAND_SIZE; i++) {
    for (const p of s.players) p.hand.push(s.draw.shift());
  }
  log(s, -1, 'un.log.roundStart', { r: s.round, n: s.n });
  openWith(s);
}

// openWith 翻首张并应用其特殊效果（+4 洗回重翻）
function openWith(s) {
  let id = s.draw.pop();
  // 官方：起始牌为 +4 时放回牌堆重新翻（避免开局直接罚 4 张）
  for (let guard = 0; guard < 20 && DECK[id].v === V_WILD4; guard++) {
    s.draw.unshift(id);
    s.draw = shuffled(s, s.draw);
    id = s.draw.pop();
  }
  s.discard.push(id);
  const card = DECK[id];
  s.activeColor = card.c === WILD ? -1 : card.c;
  log(s, -1, 'un.log.firstCard', { c: cardName(id) });
  if (card.c === WILD) {
    // 变色起手：由首位玩家选色，选完即轮到其行动
    s.pending = { kind: 'chooseColor', seat: s.cur, card: id, firstCard: true };
    return;
  }
  if (card.v === V_SKIP) { s.cur = nextSeat(s, 1); log(s, -1, 'un.log.firstSkip', {}); return; }
  if (card.v === V_REV) {
    s.dir = -1;
    s.cur = (s.cur - 1 + s.n) % s.n;
    log(s, -1, 'un.log.firstReverse', {});
    return;
  }
  if (card.v === V_DRAW2) {
    // 官方：起手 +2 由首位玩家摸 2 并失去本回合，轮到其下家
    const victim = s.cur;
    drawCards(s, victim, 2);
    s.cur = nextSeat(s, 1);
    log(s, -1, 'un.log.firstDraw2', { n: s.players[victim].name });
  }
}

// —— 查询 ——

// currentPlayer 当前待决策座位（微阶段也精确到人）
export function currentPlayer(s) {
  return s.pending ? s.pending.seat : s.cur;
}

// isGameOver 是否整场结束
export function isGameOver(s) {
  return s.gameOver;
}

// score 整场累计计分
export function score(s) {
  return s.players.map((p) => ({
    seat: p.seat,
    total: p.score,
    breakdown: [
      ['un.score.points', p.score],
      ['un.score.wins', p.wins],
      ['un.score.cards', p.hand.length],
    ],
  }));
}

// —— legalActions ——

// legalActions 唯一合法性来源：局末 → 微阶段 → 主行动
export function legalActions(s) {
  if (s.gameOver) return [];
  if (s.roundOver) return [{ kind: 'nextRound' }];
  if (s.pending) return pendingActions(s);
  return mainActions(s);
}

// pendingActions 微阶段合法动作
function pendingActions(s) {
  const k = s.pending.kind;
  if (k === 'chooseColor') return [0, 1, 2, 3].map((color) => ({ kind: 'chooseColor', color }));
  if (k === 'uno') return [{ kind: 'unoCall' }, { kind: 'unoMiss' }];
  if (k === 'drawPlay') return [{ kind: 'playDrawn' }, { kind: 'keepDrawn' }];
  return [];
}

// mainActions 主行动枚举：可出的手牌 + 摸牌（连锁罚牌期为接牌 + 认罚）
function mainActions(s) {
  const p = s.players[s.cur];
  const acts = [];
  if (s.rules.stacking && s.drawStack > 0) {
    for (const id of p.hand) if (canStack(s, id)) acts.push({ kind: 'play', card: id });
    acts.push({ kind: 'drawPenalty' });
    return acts;
  }
  for (const id of p.hand) if (canPlay(s, id)) acts.push({ kind: 'play', card: id });
  acts.push({ kind: 'draw' });
  return acts;
}

// —— apply ——

// apply 执行行动（微阶段优先分发）
export function apply(state, action) {
  const s = clone(state);
  if (s.roundOver && action.kind === 'nextRound') {
    dealRound(s);
    checkGameOver(s);
    return s;
  }
  if (s.pending) applyPending(s, action);
  else applyMain(s, action);
  return s;
}

// applyPending 微阶段分发
function applyPending(s, a) {
  const k = s.pending.kind;
  if (k === 'chooseColor') applyChooseColor(s, a);
  else if (k === 'uno') applyUno(s, a);
  else if (k === 'drawPlay') applyDrawPlay(s, a);
}

// applyMain 主行动分发
function applyMain(s, a) {
  if (a.kind === 'play') applyPlay(s, a);
  else if (a.kind === 'draw') applyDraw(s);
  else if (a.kind === 'drawPenalty') applyDrawPenalty(s);
}

// applyPlay 打出手牌：万能牌先入弃牌堆并进入选色微阶段
function applyPlay(s, a) {
  const p = s.players[s.cur];
  const i = p.hand.indexOf(a.card);
  if (i < 0) return;
  p.hand.splice(i, 1);
  const card = DECK[a.card];
  log(s, s.cur, s.drawStack > 0 ? 'un.log.stack' : 'un.log.play', {
    n: p.name, c: cardName(a.card), k: s.drawStack,
  });
  s.discard.push(a.card);
  if (card.c === WILD) {
    s.pending = { kind: 'chooseColor', seat: s.cur, card: a.card, firstCard: false };
    return;
  }
  afterCard(s, a.card);
}

// applyChooseColor 万能牌选色：首张起手只定色，其余走效果链
function applyChooseColor(s, a) {
  s.activeColor = a.color;
  const pend = s.pending;
  s.pending = null;
  log(s, pend.seat, 'un.log.wildColor', { n: s.players[pend.seat].name, c: COLOR_NAMES[a.color] });
  if (pend.firstCard) { s.cur = pend.seat; return; }
  afterCard(s, pend.card);
}

// afterCard 牌效果链：罚牌/跳过/反转 → 局末判定 → UNO → 轮转
function afterCard(s, cardId) {
  const v = DECK[cardId].v;
  let skip = 0;
  if (v === V_SKIP) {
    skip = 1;
    log(s, -1, 'un.log.skip', { n: s.players[nextSeat(s, 1)].name });
  } else if (v === V_REV) {
    s.dir *= -1;
    log(s, -1, 'un.log.reverse', {});
    if (s.n === 2) skip = 1; // 两人局反转等同跳过
  } else if (v === V_DRAW2 || v === V_WILD4) {
    const amount = v === V_DRAW2 ? 2 : 4;
    if (s.rules.stacking) {
      s.drawStack += amount;
      s.stackKind = v === V_DRAW2 ? 'd2' : 'd4';
    } else {
      const victim = nextSeat(s, 1);
      drawCards(s, victim, amount);
      log(s, -1, v === V_DRAW2 ? 'un.log.draw2' : 'un.log.draw4', {
        n: s.players[victim].name, k: amount,
      });
      skip = 1;
    }
  }
  const p = s.players[s.cur];
  if (p.hand.length === 0) { endRound(s); return; }
  const next = nextSeat(s, 1 + skip);
  if (p.hand.length === 1) {
    s.pending = { kind: 'uno', seat: s.cur, next };
    return;
  }
  s.cur = next;
}

// applyUno 喊/不喊 UNO：不喊罚摸 2 张
function applyUno(s, a) {
  const p = s.players[s.pending.seat];
  if (a.kind === 'unoCall') log(s, p.seat, 'un.log.uno', { n: p.name });
  else {
    drawCards(s, p.seat, 2);
    log(s, p.seat, 'un.log.unoMiss', { n: p.name });
  }
  const next = s.pending.next;
  s.pending = null;
  s.cur = next;
}

// applyDraw 摸 1 张：家庭规则允许时，摸到可出的牌进入「打/留」微阶段
function applyDraw(s) {
  const p = s.players[s.cur];
  const drawn = drawCards(s, s.cur, 1)[0];
  log(s, s.cur, 'un.log.draw', { n: p.name });
  if (drawn !== undefined && s.rules.drawPlay && canPlay(s, drawn)) {
    s.pending = { kind: 'drawPlay', seat: s.cur, card: drawn };
    return;
  }
  s.cur = nextSeat(s, 1);
}

// applyDrawPlay 摸到的牌：立即打出或留在手上过牌
function applyDrawPlay(s, a) {
  const card = s.pending.card;
  s.pending = null;
  if (a.kind === 'playDrawn' && s.rules.drawPlay) applyPlay(s, { card });
  else s.cur = nextSeat(s, 1);
}

// applyDrawPenalty 连锁接不住：摸满累计张数并跳过
function applyDrawPenalty(s) {
  const p = s.players[s.cur];
  const k = s.drawStack;
  drawCards(s, s.cur, k);
  log(s, s.cur, 'un.log.penalty', { n: p.name, k });
  s.drawStack = 0;
  s.stackKind = '';
  s.cur = nextSeat(s, 1);
}

// endRound 一局结束：赢家按对手手牌计分，累计达目标分则整场结束
function endRound(s) {
  const winner = s.players[s.cur];
  // 最后一张是 +2/+4 且开着连锁：罚牌照常落到下家，再结算
  if (s.drawStack > 0) {
    const victim = nextSeat(s, 1);
    drawCards(s, victim, s.drawStack);
    log(s, -1, 'un.log.penalty', { n: s.players[victim].name, k: s.drawStack });
  }
  let points = 0;
  for (const p of s.players) {
    if (p.seat === winner.seat) continue;
    for (const id of p.hand) points += cardValue(id);
  }
  winner.score += points;
  winner.wins += 1;
  s.roundOver = true;
  s.lastWinner = winner.seat;
  s.drawStack = 0;
  s.stackKind = '';
  log(s, -1, 'un.log.roundEnd', { r: s.round, n: winner.name, p: points });
  checkGameOver(s);
}

// checkGameOver 有人累计达目标分即整场结束
function checkGameOver(s) {
  if (s.gameOver) return;
  if (s.players.some((p) => p.score >= s.rules.target)) {
    s.gameOver = true;
    log(s, -1, 'un.log.gameEnd', { t: s.rules.target });
  }
}
