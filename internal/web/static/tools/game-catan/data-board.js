// 卡坦岛棋盘数据：19 格六边形（3-4-5-4-3 行）几何图、54 顶点 / 72 边图、
// 9 个港口位、官方数字token螺旋摆放序、发展卡构成、建造费用——全部静态数据。
// 几何以 axial 坐标 (q, r) 生成（尖顶六边形，x = √3·(q + r/2)，y = 1.5·r），
// 19 格 = 半径 2 的六边形片区（max(|q|,|r|,|q+r|) ≤ 2），与官方岛形一致。
// 顶点/边由六边形角点坐标去重生成，selftest 断言 54 顶点 / 72 边做交叉验证。

export const SQ3 = Math.sqrt(3);
export const HEX_SIZE = 34; // 六边形边长（SVG 单位）

// 资源索引：0 木材 1 砖 2 羊 3 麦 4 矿（数组遍历用数值索引）
export const RESOURCES = [0, 1, 2, 3, 4];
export const RES_NAMES = [
  { zh: '木材', en: 'wood' },
  { zh: '砖', en: 'brick' },
  { zh: '羊', en: 'sheep' },
  { zh: '麦', en: 'wheat' },
  { zh: '矿石', en: 'ore' },
];

// 地形 → 产出资源（desert 无产出）
export const TERRAINS = ['forest', 'hills', 'pasture', 'fields', 'mountains', 'desert'];
export const TERRAIN_RES = [0, 1, 2, 3, 4, -1];

// 官方地形组成：森林×4 山丘×3 牧场×4 农田×4 山脉×3 沙漠×1 = 19
export const TERRAIN_BAG = [0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5];

// 官方数字 token 组（18 枚，无 7）
export const NUMBER_TOKENS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

// 官方发展卡构成：14 骑士 + 2 修路 + 2 丰年 + 2 垄断 + 5 分卡 = 25
export const DEV_TYPES = ['knight', 'roadBuild', 'yearOfPlenty', 'monopoly', 'vp'];
export const DEV_COUNTS = { knight: 14, roadBuild: 2, yearOfPlenty: 2, monopoly: 2, vp: 5 };
export const DEV_DECK_SIZE = 25;

// 官方建造费用（按资源索引）
export const COST_ROAD = [1, 1, 0, 0, 0];
export const COST_SETTLEMENT = [1, 1, 1, 1, 0];
export const COST_CITY = [0, 0, 0, 2, 3];
export const COST_DEV = [0, 0, 1, 1, 1];

// 棋子上限（官方：15 路 / 5 村 / 4 城）
export const MAX_ROADS = 15;
export const MAX_SETTLEMENTS = 5;
export const MAX_CITIES = 4;
export const WIN_VP = 10;
export const DISCARD_AT = 7;      // 超过 7 张资源触发弃牌
export const LONGEST_ROAD_MIN = 5;
export const LARGEST_ARMY_MIN = 3;
export const RES_PER_TYPE = 19;   // 每种资源卡 19 张

// —— 六边形片区：半径 2 六边形 ——
export const HEXES = [];
for (let r = -2; r <= 2; r++) {
  for (let q = -2; q <= 2; q++) {
    if (Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= 2) {
      HEXES.push({ q, r });
    }
  }
}

// 顶点：六边形 6 角点坐标去重（角点角度 30+60k，尖顶朝上/下）
const CORNER_ANGLES = [30, 90, 150, 210, 270, 330];

// vertexKey 坐标去重键（0.1 精度，消除浮点误差）
function vertexKey(x, y) {
  return `${Math.round(x * 10)}_${Math.round(y * 10)}`;
}

// 生成六边形中心与角点，登记唯一顶点
export const VERTICES = [];            // [{x, y, hexes:[], edges:[], adj:[]}]
const VERT_INDEX = new Map();          // 坐标键 → 顶点索引
export const HEX_VERTS = [];           // 每格 6 个顶点索引（与 CORNER_ANGLES 同序）

function centerOf(h) {
  return { x: SQ3 * HEX_SIZE * (h.q + h.r / 2), y: 1.5 * HEX_SIZE * h.r };
}

function cornerOf(c, angle) {
  const rad = (angle * Math.PI) / 180;
  return { x: c.x + HEX_SIZE * Math.cos(rad), y: c.y + HEX_SIZE * Math.sin(rad) };
}

function registerVertex(pt) {
  const key = vertexKey(pt.x, pt.y);
  if (VERT_INDEX.has(key)) return VERT_INDEX.get(key);
  const idx = VERTICES.length;
  VERTICES.push({ x: pt.x, y: pt.y, hexes: [], edges: [], adj: [] });
  VERT_INDEX.set(key, idx);
  return idx;
}

for (const h of HEXES) {
  const c = centerOf(h);
  const vs = CORNER_ANGLES.map((a) => registerVertex(cornerOf(c, a)));
  HEX_VERTS.push(vs);
}

// 边：六边形相邻角点对去重
export const EDGES = [];              // [{a, b, hexes:[]}]
const EDGE_INDEX = new Map();

function edgeKey(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

function registerEdge(a, b) {
  const key = edgeKey(a, b);
  if (EDGE_INDEX.has(key)) return EDGE_INDEX.get(key);
  const idx = EDGES.length;
  EDGES.push({ a, b, hexes: [] });
  EDGE_INDEX.set(key, idx);
  VERTICES[a].edges.push(idx);
  VERTICES[b].edges.push(idx);
  VERTICES[a].adj.push(b);
  VERTICES[b].adj.push(a);
  return idx;
}

export const HEX_EDGES = [];          // 每格 6 条边索引（角点 k 与 k+1 相连）
HEX_VERTS.forEach((vs) => {
  const es = [];
  for (let k = 0; k < 6; k++) es.push(registerEdge(vs[k], vs[(k + 1) % 6]));
  HEX_EDGES.push(es);
});

// 回填归属：顶点 ↔ 六边形、边 ↔ 六边形
HEXES.forEach((_, hi) => {
  for (const vi of HEX_VERTS[hi]) VERTICES[vi].hexes.push(hi);
  for (const ei of HEX_EDGES[hi]) EDGES[ei].hexes.push(hi);
});

export const COASTAL_EDGES = EDGES.map((e, i) => (e.hexes.length === 1 ? i : -1))
  .filter((i) => i >= 0);

// 官方螺旋摆放序（外圈 12 格顺时针 → 内圈 6 格顺时针 → 中心；起点为顶排最左海岸格）。
// 变体开局下 token 面朝下洗牌，起点/旋向仅决定摆放次序结构（对局中无规则效应）。
function hexIndexAt(q, r) {
  return HEXES.findIndex((h) => h.q === q && h.r === r);
}

const OUTER_RING = [
  hexIndexAt(0, -2), hexIndexAt(1, -2), hexIndexAt(2, -2),
  hexIndexAt(2, -1), hexIndexAt(2, 0), hexIndexAt(1, 1),
  hexIndexAt(0, 2), hexIndexAt(-1, 2), hexIndexAt(-2, 2),
  hexIndexAt(-2, 1), hexIndexAt(-2, 0), hexIndexAt(-1, -1),
];
const INNER_RING = [
  hexIndexAt(0, -1), hexIndexAt(1, -1), hexIndexAt(1, 0),
  hexIndexAt(0, 1), hexIndexAt(-1, 1), hexIndexAt(-1, 0),
];
export const SPIRAL_HEXES = [...OUTER_RING, ...INNER_RING, hexIndexAt(0, 0)];

// 港口位：外海岸 30 条边中均匀取 9 条（按绕板中心极角排序）。
// 官方海框架的 9 个港口位分布与此一致（间距 3-4 条海岸边，互不相邻）；
// 港口标记（5 专属 + 4 通用）洗牌后落到这 9 个位置（官方变体开局）。
function harborSpots() {
  const cx = 0;
  const cy = 0;
  const withAngle = COASTAL_EDGES.map((ei) => {
    const e = EDGES[ei];
    const mx = (VERTICES[e.a].x + VERTICES[e.b].x) / 2;
    const my = (VERTICES[e.a].y + VERTICES[e.b].y) / 2;
    return { ei, ang: Math.atan2(my - cy, mx - cx) };
  }).sort((p, q2) => p.ang - q2.ang);
  const spots = [];
  const n = withAngle.length;
  for (let k = 0; k < 9; k++) {
    spots.push(withAngle[Math.floor((k * n) / 9)].ei);
  }
  return spots;
}

export const HARBOR_SPOTS = harborSpots();
