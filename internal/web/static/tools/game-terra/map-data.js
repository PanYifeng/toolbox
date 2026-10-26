// 神秘大地官方棋盘誊录：9 行（A–I）× 13/12 槽，共 113 格 =
// 77 地形格（7 地形 × 11）+ 36 河流格。
// 来源：jsnell/terra-mystica src/Game/Constants.pm 的 @base_map 逐 token 誊录
// （社区公认权威在线实现）；官方棋盘色 → 地形映射经 jsnell 派系家园地形双源核对。
// 坐标系：axial (q, r)，尖顶六边形；id = "q,r"。r = 行号 0-8，
// q = 行内槽位 - floor(r/2)（odd-r 行偏移，与 jsnell 行列编号一致）。

// TERRAINS 地形（与 tables.WHEEL 顺序一致）
export const TERRAINS = ['plains', 'swamp', 'lakes', 'forest', 'mountain', 'wasteland', 'desert', 'river'];

// COLOR_TO_TERRAIN 官方棋盘色 → 地形（'x' = 河流格）
const COLOR_TO_TERRAIN = {
  yellow: 'desert', brown: 'plains', black: 'swamp', blue: 'lakes',
  green: 'forest', gray: 'mountain', red: 'wasteland', x: 'river',
};

// MAP_ROWS 官方九行棋盘数据（A–I 行，逐 token 誊录）
const MAP_ROWS = [
  'brown gray green blue yellow red brown black red green blue red black',
  'yellow x x brown black x x yellow black x x yellow',
  'x x black x gray x green x green x gray x x',
  'green blue yellow x x red blue x red x red brown',
  'black brown red blue black brown gray yellow x x green black blue',
  'gray green x x yellow green x x x brown gray brown',
  'x x x gray x red x green x yellow black blue yellow',
  'yellow blue brown x x x blue black x gray brown gray',
  'red black gray blue red green yellow brown gray x blue green red',
];

// HEXES 展开为 {id, q, r, terrain} 列表
export const HEXES = [];
MAP_ROWS.forEach((line, r) => {
  line.split(' ').forEach((color, ci) => {
    const q = ci - Math.floor(r / 2);
    HEXES.push({ id: `${q},${r}`, q, r, terrain: COLOR_TO_TERRAIN[color] });
  });
});

// TERRAIN_BY_ID 格 id → 地形（桥位计算用）
const TERRAIN_BY_ID = {};
for (const h of HEXES) TERRAIN_BY_ID[h.id] = h.terrain;

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

// BRIDGE_PAIRS 官方桥位：两格互不相邻、恰有 2 个公共邻格、且两个公共邻格
// 均为河格的陆地格对（jsnell setup_valid_bridges 三种模式的等价刻画，
// 已在官方图上逐对核验：恰好 29 对，不多不少）。
// 桥建成后两格视为直邻；每派系全局限 3 座、每对至多 1 座（engine 侧约束）。
export const BRIDGE_PAIRS = (() => {
  const pairs = [];
  for (let i = 0; i < HEXES.length; i++) {
    for (let j = i + 1; j < HEXES.length; j++) {
      const a = HEXES[i].id;
      const b = HEXES[j].id;
      if (TERRAIN_BY_ID[a] === 'river' || TERRAIN_BY_ID[b] === 'river') continue;
      if (ADJACENCY[a].includes(b)) continue;
      const common = ADJACENCY[a].filter((x) => ADJACENCY[b].includes(x));
      if (common.length === 2 && common.every((x) => TERRAIN_BY_ID[x] === 'river')) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
})();
