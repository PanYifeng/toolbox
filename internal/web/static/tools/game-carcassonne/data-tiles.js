// 卡卡颂基础版地形块数据（72 块 = 起始块 1 + 抽牌堆 71）。
// 誊录自 carcassonne-api allPlayTileTypes.json（引用 wikicarpedia C2 官方瓦片图命名），
// 与 bacher/carcassonne 独立实现三源交叉验证（见 /tmp/gamedata/carc/VALIDATION.md）。
// C1 与 C2 基础版瓦片构成相同（仅画风不同），本数据对两版均适用。
//
// 连接模型（与 carcassonne-api 一致的"边三段"标准模型）：
// - 边序 N=0/E=1/S=2/W=3；边类型 C 城市 / G 草地 / R 道路
// - 城市/道路按边连通：同边类型相邻块特征互连
// - 农田按"边槽位"连通：草地边整边一个槽位(slot 1)；道路边三段——
//   slot 0/2 为道路两侧草地带（顺时针序，旋转不变），slot 1 为道路本身；
//   相邻块对接时槽位镜像：0↔2、1↔1（即本块 slot s 对邻块 slot 2-s）
// - f 特征表（索引即随从落点）：['C', 边数组, 纹章] / ['R', 边数组] /
//   ['F', 接触槽位数组, 相邻城市特征索引] / ['M'] 修道院
// - 旋转 r（顺时针 90°×r）：边 e → (e+r)%4；槽位顺时针序旋转不变

export const START_TYPE = 0; // type 0 = 起始块（D 形，背面异色不入抽牌堆）

export const TILES = [
  { l: 'D', q: 1, e: 'CRGR', f: [
    ['C', [0], 0],
    ['R', [1, 3]],
    ['F', [[1, 0], [3, 2]], [0]],
    ['F', [[1, 2], [2, 1], [3, 0]], []],
  ] },
  { l: 'A', q: 2, e: 'GGRG', f: [
    ['R', [2]],
    ['F', [[0, 1], [1, 1], [2, 0], [2, 2], [3, 1]], []],
    ['M'],
  ] },
  { l: 'B', q: 4, e: 'GGGG', f: [
    ['F', [[0, 1], [1, 1], [2, 1], [3, 1]], []],
    ['M'],
  ] },
  { l: 'C', q: 1, e: 'CCCC', f: [
    ['C', [0, 1, 2, 3], 1],
  ] },
  { l: 'D', q: 3, e: 'CRGR', f: [
    ['C', [0], 0],
    ['R', [1, 3]],
    ['F', [[1, 0], [3, 2]], [0]],
    ['F', [[1, 2], [2, 1], [3, 0]], []],
  ] },
  { l: 'E', q: 5, e: 'CGGG', f: [
    ['C', [0], 0],
    ['F', [[1, 1], [2, 1], [3, 1]], [0]],
  ] },
  { l: 'F', q: 2, e: 'GCGC', f: [
    ['C', [1, 3], 1],
    ['F', [[0, 1]], [0]],
    ['F', [[2, 1]], [0]],
  ] },
  { l: 'G', q: 1, e: 'GCGC', f: [
    ['C', [1, 3], 0],
    ['F', [[0, 1]], [0]],
    ['F', [[2, 1]], [0]],
  ] },
  { l: 'H', q: 3, e: 'GCGC', f: [
    ['C', [1], 0],
    ['C', [3], 0],
    ['F', [[0, 1], [2, 1]], [0, 1]],
  ] },
  { l: 'I', q: 2, e: 'CCGG', f: [
    ['C', [0], 0],
    ['C', [1], 0],
    ['F', [[2, 1], [3, 1]], [0, 1]],
  ] },
  { l: 'J', q: 3, e: 'CRRG', f: [
    ['C', [0], 0],
    ['R', [1, 2]],
    ['F', [[1, 0], [2, 2], [3, 1]], [0]],
    ['F', [[1, 2], [2, 0]], []],
  ] },
  { l: 'K', q: 3, e: 'CGRR', f: [
    ['C', [0], 0],
    ['R', [2, 3]],
    ['F', [[1, 1], [2, 0], [3, 2]], [0]],
    ['F', [[2, 2], [3, 0]], []],
  ] },
  { l: 'L', q: 3, e: 'CRRR', f: [
    ['C', [0], 0],
    ['R', [1]],
    ['R', [2]],
    ['R', [3]],
    ['F', [[1, 0], [3, 2]], [0]],
    ['F', [[1, 2], [2, 0]], []],
    ['F', [[2, 2], [3, 0]], []],
  ] },
  { l: 'M', q: 2, e: 'CCGG', f: [
    ['C', [0, 1], 1],
    ['F', [[2, 1], [3, 1]], [0]],
  ] },
  { l: 'N', q: 3, e: 'CCGG', f: [
    ['C', [0, 1], 0],
    ['F', [[2, 1], [3, 1]], [0]],
  ] },
  { l: 'O', q: 2, e: 'CRRC', f: [
    ['C', [0, 3], 1],
    ['R', [1, 2]],
    ['F', [[1, 0], [2, 2]], [0]],
    ['F', [[1, 2], [2, 0]], []],
  ] },
  { l: 'P', q: 3, e: 'CRRC', f: [
    ['C', [0, 3], 0],
    ['R', [1, 2]],
    ['F', [[1, 0], [2, 2]], [0]],
    ['F', [[1, 2], [2, 0]], []],
  ] },
  { l: 'Q', q: 1, e: 'CCGC', f: [
    ['C', [0, 1, 3], 1],
    ['F', [[2, 1]], [0]],
  ] },
  { l: 'R', q: 3, e: 'CCGC', f: [
    ['C', [0, 1, 3], 0],
    ['F', [[2, 1]], [0]],
  ] },
  { l: 'S', q: 2, e: 'CCRC', f: [
    ['C', [0, 1, 3], 1],
    ['R', [2]],
    ['F', [[2, 0]], [0]],
    ['F', [[2, 2]], [0]],
  ] },
  { l: 'T', q: 1, e: 'CCRC', f: [
    ['C', [0, 1, 3], 0],
    ['R', [2]],
    ['F', [[2, 0]], [0]],
    ['F', [[2, 2]], [0]],
  ] },
  { l: 'U', q: 8, e: 'RGRG', f: [
    ['R', [0, 2]],
    ['F', [[0, 2], [1, 1], [2, 0]], []],
    ['F', [[0, 0], [2, 2], [3, 1]], []],
  ] },
  { l: 'V', q: 9, e: 'GGRR', f: [
    ['R', [2, 3]],
    ['F', [[0, 1], [1, 1], [2, 0], [3, 2]], []],
    ['F', [[2, 2], [3, 0]], []],
  ] },
  { l: 'W', q: 4, e: 'GRRR', f: [
    ['R', [1]],
    ['R', [2]],
    ['R', [3]],
    ['F', [[0, 1], [1, 0], [3, 2]], []],
    ['F', [[1, 2], [2, 0]], []],
    ['F', [[2, 2], [3, 0]], []],
  ] },
  { l: 'X', q: 1, e: 'RRRR', f: [
    ['R', [0]],
    ['R', [1]],
    ['R', [2]],
    ['R', [3]],
    ['F', [[0, 2], [1, 0]], []],
    ['F', [[1, 2], [2, 0]], []],
    ['F', [[2, 2], [3, 0]], []],
    ['F', [[0, 0], [3, 2]], []],
  ] },
];

// —— 模块加载期派生：特征对象化 + 随从落点坐标（单位方格坐标，左上为原点）——

// SLOT_PT 边槽位采样点：[边][槽位] → [x, y]
const SLOT_PT = [
  [[0.25, 0], [0.5, 0], [0.75, 0]], // N
  [[1, 0.25], [1, 0.5], [1, 0.75]], // E
  [[0.75, 1], [0.5, 1], [0.25, 1]], // S
  [[0, 0.75], [0, 0.5], [0, 0.25]], // W
];

// pull 从中心向外推（让落点远离 tile 中心，避免与道路落点重叠）
function pull(x, y, k, lo, hi) {
  const px = 0.5 + (x - 0.5) * k;
  const py = 0.5 + (y - 0.5) * k;
  return { x: Math.min(hi, Math.max(lo, px)), y: Math.min(hi, Math.max(lo, py)) };
}

// edgeMid 边中点
function edgeMid(e) {
  return { x: SLOT_PT[e][1][0], y: SLOT_PT[e][1][1] };
}

// cornerOf 两边共享角点（对边则返回中心 → 直路）
function cornerOf(a, b) {
  if ((a + b) % 2 === 0) return { x: 0.5, y: 0.5 };
  const pairs = { '01': [1, 0], '12': [1, 1], '23': [0, 1], '03': [0, 0] };
  const key = [a, b].sort().join('');
  const [x, y] = pairs[key];
  return { x, y };
}

// roadPos 道路落点：单边→边中点向中心收；双边→贝塞尔中点（控制点取共享角点向中心收）
function roadPos(edges) {
  if (edges.length === 1) {
    const m = edgeMid(edges[0]);
    return pull(m.x, m.y, 0.62, 0.12, 0.88);
  }
  const a = edgeMid(edges[0]);
  const b = edgeMid(edges[1]);
  const c = cornerOf(edges[0], edges[1]);
  const cx = 0.5 + (c.x - 0.5) * 0.55;
  const cy = 0.5 + (c.y - 0.5) * 0.55;
  return { x: 0.25 * a.x + 0.5 * cx + 0.25 * b.x, y: 0.25 * a.y + 0.5 * cy + 0.25 * b.y };
}

// cityPos 城市落点：成员边中点均值向外推
function cityPos(edges) {
  let x = 0;
  let y = 0;
  for (const e of edges) { x += edgeMid(e).x; y += edgeMid(e).y; }
  return pull(x / edges.length, y / edges.length, 1.15, 0.1, 0.9);
}

// FARM_POS_FIX 特例修正：A 块农田环绕修道院+南道路，推离方向会撞道路落点，手工指定
const FARM_POS_FIX = { A: { x: 0.24, y: 0.26 } };

// farmPos 农田落点：接触槽位均值；离中心过近时沿原方向推到 0.24（避开中央建筑/道路）
function farmPos(letter, contacts) {
  if (FARM_POS_FIX[letter]) return FARM_POS_FIX[letter];
  let x = 0;
  let y = 0;
  for (const [e, s] of contacts) { x += SLOT_PT[e][s][0]; y += SLOT_PT[e][s][1]; }
  x /= contacts.length;
  y /= contacts.length;
  const dx = x - 0.5;
  const dy = y - 0.5;
  const d = Math.hypot(dx, dy);
  if (d < 0.03) return { x: 0.71, y: 0.71 }; // 全包围农田（B 块）：取东南象限
  if (d < 0.24) return { x: 0.5 + (dx / d) * 0.24, y: 0.5 + (dy / d) * 0.24 };
  return pull(x, y, 1, 0.14, 0.86);
}

for (const t of TILES) {
  t.feats = t.f.map((f) => {
    if (f[0] === 'C') return { k: 'C', e: f[1], p: f[2], pos: cityPos(f[1]) };
    if (f[0] === 'R') return { k: 'R', e: f[1], pos: roadPos(f[1]) };
    if (f[0] === 'F') return { k: 'F', c: f[1], adj: f[2], pos: farmPos(t.l, f[1]) };
    return { k: 'M', pos: { x: 0.5, y: 0.44 } };
  });
  delete t.f;
  // 派生查表：正则边 → 特征索引（农田按 (边, 槽位) 二级表）
  t.edgeCity = [-1, -1, -1, -1];
  t.edgeRoad = [-1, -1, -1, -1];
  t.slotFarm = [{}, {}, {}, {}];
  t.feats.forEach((f, i) => {
    if (f.k === 'C') f.e.forEach((e) => { t.edgeCity[e] = i; });
    if (f.k === 'R') f.e.forEach((e) => { t.edgeRoad[e] = i; });
    if (f.k === 'F') f.c.forEach(([e, s]) => { t.slotFarm[e][s] = i; });
  });
}

// DECK_TYPES 抽牌堆构成（不含起始块）
export const DECK_TYPES = [];
for (let i = 0; i < TILES.length; i++) {
  if (i === START_TYPE) continue;
  for (let k = 0; k < TILES[i].q; k++) DECK_TYPES.push(i);
}

// FEAT_NAME 特征名（日志用双语对象）
export const FEAT_NAME = {
  C: { zh: '城市', en: 'city' },
  R: { zh: '道路', en: 'road' },
  F: { zh: '农田', en: 'field' },
  M: { zh: '修道院', en: 'monastery' },
};
