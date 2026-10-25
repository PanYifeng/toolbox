// 神秘大地棋盘：55 格六边形（7 地形 ×7 + 河流 ×6）。
// ⚠ 诚实声明：官方地图 ~91 格无法在线核对，此为按「北山漠荒、西森林、
// 东平原、南湖沼、河流斜贯」布局自制的近似图，非官方誊录。
// 坐标系：axial (q, r)，尖顶六边形；id = "q,r"。

// TERRAINS 地形（与 tables.WHEEL 顺序一致）
export const TERRAINS = ['plains', 'swamp', 'lakes', 'forest', 'mountain', 'wasteland', 'desert', 'river'];

// MAP_ROWS 按行手工布置：键 = r，值 = [起始q, 地形序列]
const MAP_ROWS = {
  '-3': [0, ['mountain', 'mountain', 'desert', 'desert', 'wasteland', 'wasteland']],
  '-2': [-1, ['mountain', 'mountain', 'mountain', 'desert', 'desert', 'river', 'wasteland']],
  '-1': [-1, ['forest', 'mountain', 'mountain', 'river', 'desert', 'desert', 'wasteland', 'wasteland']],
  '0': [-2, ['forest', 'forest', 'forest', 'river', 'lakes', 'wasteland', 'wasteland', 'swamp', 'plains', 'plains']],
  '1': [-2, ['forest', 'forest', 'lakes', 'lakes', 'swamp', 'swamp', 'plains', 'plains', 'plains', 'plains']],
  '2': [-1, ['forest', 'river', 'lakes', 'lakes', 'swamp', 'swamp', 'plains', 'desert']],
  '3': [0, ['lakes', 'river', 'swamp', 'swamp', 'lakes', 'river']],
};

// HEXES 展开为 {id, q, r, terrain} 列表
export const HEXES = [];
for (const [rStr, [q0, list]] of Object.entries(MAP_ROWS)) {
  list.forEach((terrain, i) => {
    const q = q0 + i;
    HEXES.push({ id: `${q},${rStr}`, q, r: Number(rStr), terrain });
  });
}

// NEIGHBORS 六方向偏移（axial 尖顶）
export const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

// hexAt 取格（不存在返回 null）
export function hexAt(q, r) {
  return HEXES.find((h) => h.q === q && h.r === r) || null;
}

// neighborsOf 某格的全部邻格 id（跳过棋盘外）
export function neighborsOf(id) {
  const [q, r] = id.split(',').map(Number);
  const out = [];
  for (const [dq, dr] of DIRS) {
    const h = hexAt(q + dq, r + dr);
    if (h) out.push(h.id);
  }
  return out;
}

// ADJACENCY 邻接表 {id: [邻格id...]}
export const ADJACENCY = {};
for (const h of HEXES) ADJACENCY[h.id] = neighborsOf(h.id);

// 桥：允许跨过河流格连接两侧——桥建在河格上，桥 id 即河格 id。
// bridgeSides 河格两侧可连的对岸格对（河格的邻格中隔着它互不相邻的两组），
// 动态计算：河格 h 的邻格里，任意两个互不相邻的格即为「两岸」候选。
export function bridgePairs(riverId) {
  const ns = ADJACENCY[riverId];
  const pairs = [];
  for (let i = 0; i < ns.length; i++) {
    for (let j = i + 1; j < ns.length; j++) {
      if (!ADJACENCY[ns[i]].includes(ns[j])) pairs.push([ns[i], ns[j]]);
    }
  }
  return pairs;
}
