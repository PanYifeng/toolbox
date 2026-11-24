// 大富翁 AI：启发式 1-ply —— 买地按性价比，竞拍出价上限为估价，建房看现金安全垫，
// 缺钱先拆房再，抵押，监狱能出就出。同步函数，供框架驱动。
import { SPACES, groupSpaces, isOwnable } from './data-board.js';
import { ownerOf, ownsAll, ownableOf, netWorth } from './rules.js';

const CASH_BUFFER = 200;      // 建房 / 买地后至少留的现金
const BID_DISCOUNT = 1.0;    // 竞拍出价上限 = 估价 × 折扣
const JAIL_FINE_OK = 300;    // 现金充裕时愿意缴罚金出狱

// bot 入口
export function bot(s, legal) {
  if (!legal.length) return null;
  if (legal.length === 1) return legal[0];
  const pd = s.pending;
  if (pd && pd.kind === 'buy') return pickBuy(s, legal, pd);
  if (pd && pd.kind === 'auction') return pickBid(s, legal, pd);
  if (pd && pd.kind === 'debt') return pickDebt(s, legal, pd);
  if (pd && pd.kind === 'tradeRespond') return pickTrade(s, legal, pd);
  if (s.phase === 'roll') return pickJail(s, legal);
  return pickManage(s, legal);
}

// pickJail 狱中决策：有卡用卡；现金充裕缴罚金；否则掷骰碰运气
function pickJail(s, legal) {
  const p = s.players[s.cur];
  const roll = legal.find((a) => a.kind === 'roll');
  if (!p.inJail) return roll;
  const card = legal.find((a) => a.kind === 'useJailCard');
  if (card) return card;
  const fine = legal.find((a) => a.kind === 'payJailFine');
  if (fine && p.cash >= JAIL_FINE_OK) return fine;
  return roll;
}

// valueOf 地产估价：成组溢价 + 后续建房潜力 + 阻断对手的价值
function valueOf(s, seat, i) {
  const sp = SPACES[i];
  if (!isOwnable(i)) return 0;
  if (sp.type === 'rail' || sp.type === 'util') {
    const n = groupSpaces(sp.group).filter((x) => ownerOf(s, x) === seat).length;
    return sp.price * (1 + n * 0.25);
  }
  const total = groupSpaces(sp.group).length;
  const mine = groupSpaces(sp.group).filter((x) => ownerOf(s, x) === seat).length;
  // 最后一块显式加价：拿满一组才能建房，价值远高于面值
  const completing = mine === total - 1 ? 1.8 : 1;
  return sp.price * (1.0 + mine * 0.15) * completing;
}

// pickBuy 无主地产：留足现金且估价不太差就买（重策略：先占位再建房）
function pickBuy(s, legal, pd) {
  const p = s.players[pd.seat];
  const buy = legal.find((a) => a.kind === 'buy');
  const skip = legal.find((a) => a.kind === 'declineBuy');
  if (!buy) return legal[0];
  const price = SPACES[pd.i].price;
  if (p.cash - price < CASH_BUFFER * 0.5) return skip || buy;
  return valueOf(s, pd.seat, pd.i) >= price * 0.8 ? buy : skip || buy;
}

// pickBid 竞拍：出价不超过估价且留现金
function pickBid(s, legal, pd) {
  const p = s.players[pd.turnSeat];
  const value = valueOf(s, pd.turnSeat, pd.i) * BID_DISCOUNT;
  const budget = Math.min(value, p.cash - CASH_BUFFER * 0.5);
  const bids = legal.filter((a) => a.kind === 'bid' && a.amount <= budget);
  if (!bids.length) return legal.find((a) => a.kind === 'bidPass') || legal[0];
  return bids[0]; // 最小有效加价
}

// pickDebt 负债：优先拆房，其次抵押最不重要的资产，最后破产
function pickDebt(s, legal, pd) {
  const pay = legal.find((a) => a.kind === 'payDebt');
  if (pay) return pay;
  const sell = legal.find((a) => a.kind === 'sellHouse');
  if (sell) return sell;
  const mort = legal.filter((a) => a.kind === 'mortgage');
  if (mort.length) {
    // 抵押最便宜的资产，保住成组关键地块
    mort.sort((x, y) => SPACES[x.i].price - SPACES[y.i].price);
    return mort[0];
  }
  return legal.find((a) => a.kind === 'bankrupt') || legal[0];
}

// pickTrade 交易裁决：对方「给出」的东西值不值得接受（仅在有净收益时接受）
function pickTrade(s, legal, pd) {
  const accept = legal.find((a) => a.kind === 'tradeAccept');
  const sideValue = (seat, side) =>
    side.props.reduce((a, i) => a + valueOf(s, seat, i), 0) + side.cash;
  const gain = sideValue(pd.seat, pd.give) - sideValue(pd.from, pd.get);
  if (accept && gain > 0.15 * Math.max(1, sideValue(pd.from, pd.get))) return accept;
  return legal.find((a) => a.kind === 'tradeDecline') || legal[0];
}

// pickManage 经营阶段：先建房（回报最高），再赎回抵押，最后结束回合
function pickManage(s, legal) {
  const seat = s.cur;
  const p = s.players[seat];
  const builds = legal.filter((a) => a.kind === 'build');
  if (builds.length) {
    builds.sort((x, y) => rentGain(s, y.i) - rentGain(s, x.i));
    const best = builds[0];
    if (p.cash - SPACES[best.i].house >= CASH_BUFFER) return best;
  }
  const unmort = legal.filter((a) => a.kind === 'unmortgage');
  if (unmort.length && p.cash > 600) {
    unmort.sort((x, y) => SPACES[y.i].price - SPACES[x.i].price);
    return unmort[0];
  }
  return legal.find((a) => a.kind === 'endTurn') || legal[0];
}

// rentGain 该地产加盖一栋后的租金增量（估值排序用）
function rentGain(s, i) {
  const sp = SPACES[i];
  const h = s.houses[i] || 0;
  if (!sp.rent) return 0;
  const before = h === 0 ? sp.rent[0] : sp.rent[h];
  const after = h + 1 >= 5 ? sp.rent[5] : sp.rent[h + 1];
  return (after || 0) - (before || 0);
}

// propsOf 便捷：某座位持有列表
export function propsOf(s, seat) {
  return ownableOf(s, seat);
}
