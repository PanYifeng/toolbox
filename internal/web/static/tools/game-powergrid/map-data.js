// 电力公司地图：官方德国版图誊录（42 城、6 区各 7 城、83 条连接边，逐边费用与官方一致）。
// 数据来源（三个独立开源实现交叉验证，83 条边价格全部一致）：
//   - brentjohnson/powergrid-reimagined  assets/maps/germany.toml（84 条目含 1 重复）
//   - PowerGrid/powergrid（慕尼黑 HM）    EditionGermany.java
//   - simawn/comp345w19                   data/maps/MAP[Ger].json（仅 53 边子集）
// 唯一分歧边 Regensburg–Passau（14 vs 12）按 2:1 取 12；官方设定 Duisburg–Essen、
// Frankfurt–Wiesbaden、Halle–Leipzig 三条 0 费用边如实保留。
// 坐标按官方版图城市相对位置（归一化）线性映射到 SVG 画布 1000×880。

// C(id, 区, x, y, [[邻城, 费用], ...])——邻接为双向（构建时镜像）
function C(id, region, x, y, adj) { return { id, region, x, y, adj }; }

export const REGIONS = {
  northwest: { zh: '西北', en: 'Northwest', color: '#4e9a51' },
  northeast: { zh: '东北', en: 'Northeast', color: '#a0784a' },
  west: { zh: '西部', en: 'West', color: '#d9534f' },
  east: { zh: '东部', en: 'East', color: '#d9a92c' },
  southwest: { zh: '西南', en: 'Southwest', color: '#4d84e0' },
  southeast: { zh: '东南', en: 'Southeast', color: '#9a6fd0' },
};

const RAW = [
  // northwest
  C('flensburg', 'northwest', 408, 75, [['kiel', 4]]),
  C('kiel', 'northwest', 455, 121, [['flensburg', 4], ['hamburg', 8], ['luebeck', 4]]),
  C('hamburg', 'northwest', 452, 196, [['kiel', 8], ['schwerin', 8], ['bremen', 11], ['hannover', 17], ['cuxhaven', 11], ['luebeck', 6]]),
  C('bremen', 'northwest', 364, 241, [['hamburg', 11], ['hannover', 10], ['osnabrueck', 11], ['wilhelmshaven', 11], ['cuxhaven', 8]]),
  C('hannover', 'northwest', 456, 310, [['hamburg', 17], ['bremen', 10], ['magdeburg', 15], ['kassel', 15], ['osnabrueck', 16], ['erfurt', 19], ['schwerin', 19]]),
  C('wilhelmshaven', 'northwest', 287, 198, [['bremen', 11], ['osnabrueck', 14]]),
  C('cuxhaven', 'northwest', 347, 165, [['hamburg', 11], ['bremen', 8]]),
  // northeast
  C('magdeburg', 'northeast', 622, 315, [['schwerin', 16], ['hannover', 15], ['halle', 11], ['berlin', 10]]),
  C('berlin', 'northeast', 754, 292, [['schwerin', 18], ['magdeburg', 10], ['frankfurt_oder', 6], ['halle', 17], ['torgelow', 15]]),
  C('schwerin', 'northeast', 588, 193, [['hamburg', 8], ['rostock', 6], ['magdeburg', 16], ['berlin', 18], ['luebeck', 6], ['torgelow', 19], ['hannover', 19]]),
  C('rostock', 'northeast', 640, 129, [['schwerin', 6], ['torgelow', 19]]),
  C('luebeck', 'northeast', 523, 152, [['hamburg', 6], ['schwerin', 6], ['kiel', 4]]),
  C('torgelow', 'northeast', 806, 196, [['rostock', 19], ['schwerin', 19], ['berlin', 15]]),
  C('frankfurt_oder', 'northeast', 847, 314, [['berlin', 6], ['dresden', 16], ['leipzig', 21]]),
  // west
  C('dortmund', 'west', 260, 403, [['muenster', 2], ['essen', 4], ['koeln', 10], ['kassel', 18], ['frankfurt', 20]]),
  C('duisburg', 'west', 125, 368, [['essen', 0]]),
  C('essen', 'west', 180, 380, [['dortmund', 4], ['duisburg', 0], ['duesseldorf', 2], ['muenster', 6]]),
  C('duesseldorf', 'west', 139, 425, [['essen', 2], ['koeln', 4], ['aachen', 9]]),
  C('muenster', 'west', 245, 349, [['osnabrueck', 7], ['dortmund', 2], ['essen', 6]]),
  C('osnabrueck', 'west', 296, 303, [['bremen', 11], ['muenster', 7], ['wilhelmshaven', 14], ['hannover', 16], ['kassel', 20]]),
  C('kassel', 'west', 413, 412, [['hannover', 15], ['frankfurt', 13], ['erfurt', 15], ['osnabrueck', 20], ['dortmund', 18], ['fulda', 8]]),
  // east
  C('nuernberg', 'east', 571, 593, [['augsburg', 18], ['regensburg', 12], ['wuerzburg', 8], ['erfurt', 21]]),
  C('wuerzburg', 'east', 471, 563, [['frankfurt', 13], ['nuernberg', 8], ['augsburg', 19], ['stuttgart', 12], ['mannheim', 10], ['fulda', 11]]),
  C('erfurt', 'east', 570, 441, [['kassel', 15], ['halle', 6], ['nuernberg', 21], ['fulda', 13], ['hannover', 19], ['dresden', 19]]),
  C('halle', 'east', 637, 391, [['erfurt', 6], ['magdeburg', 11], ['leipzig', 0], ['berlin', 17]]),
  C('leipzig', 'east', 685, 412, [['halle', 0], ['dresden', 13], ['frankfurt_oder', 21]]),
  C('dresden', 'east', 810, 444, [['leipzig', 13], ['erfurt', 19], ['frankfurt_oder', 16]]),
  C('fulda', 'east', 450, 485, [['wuerzburg', 11], ['frankfurt', 8], ['kassel', 8], ['erfurt', 13]]),
  // southwest
  C('koeln', 'southwest', 198, 461, [['duesseldorf', 4], ['aachen', 7], ['trier', 20], ['dortmund', 10], ['wiesbaden', 21]]),
  C('aachen', 'southwest', 110, 476, [['duesseldorf', 9], ['koeln', 7], ['trier', 19]]),
  C('frankfurt', 'southwest', 359, 518, [['wiesbaden', 0], ['kassel', 13], ['wuerzburg', 13], ['dortmund', 20], ['fulda', 8]]),
  C('wiesbaden', 'southwest', 306, 535, [['trier', 18], ['frankfurt', 0], ['mannheim', 11], ['koeln', 21], ['saarbruecken', 10]]),
  C('trier', 'southwest', 146, 564, [['koeln', 20], ['aachen', 19], ['saarbruecken', 11], ['wiesbaden', 18]]),
  C('saarbruecken', 'southwest', 226, 620, [['trier', 11], ['mannheim', 11], ['stuttgart', 17], ['wiesbaden', 10]]),
  C('mannheim', 'southwest', 342, 607, [['saarbruecken', 11], ['wiesbaden', 11], ['stuttgart', 6], ['wuerzburg', 10]]),
  // southeast
  C('stuttgart', 'southeast', 378, 667, [['saarbruecken', 17], ['mannheim', 6], ['freiburg', 16], ['augsburg', 15], ['konstanz', 16], ['wuerzburg', 12]]),
  C('freiburg', 'southeast', 274, 725, [['stuttgart', 16], ['konstanz', 14]]),
  C('konstanz', 'southeast', 377, 759, [['freiburg', 14], ['augsburg', 17], ['stuttgart', 16]]),
  C('augsburg', 'southeast', 523, 688, [['stuttgart', 15], ['konstanz', 17], ['muenchen', 6], ['nuernberg', 18], ['regensburg', 13], ['wuerzburg', 19]]),
  C('muenchen', 'southeast', 612, 726, [['augsburg', 6], ['regensburg', 10], ['passau', 14]]),
  C('regensburg', 'southeast', 641, 639, [['muenchen', 10], ['nuernberg', 12], ['passau', 12], ['augsburg', 13]]),
  C('passau', 'southeast', 774, 677, [['muenchen', 14], ['regensburg', 12]]),
];

// buildMap 镜像邻接成双向图，返回 {cityId: {id, region, x, y, adj: {id: cost}, owners: []}}
export function buildMap() {
  const cities = {};
  for (const c of RAW) cities[c.id] = { id: c.id, region: c.region, x: c.x, y: c.y, adj: {}, owners: [] };
  for (const c of RAW) {
    for (const [nb, cost] of c.adj) {
      cities[c.id].adj[nb] = cost;
      cities[nb].adj[c.id] = cost;
    }
  }
  return cities;
}

export const CITY_IDS = RAW.map((c) => c.id);

// 中文/英文名（官方德文名，中文为通行译名）
export const CITY_NAMES = {
  flensburg: { zh: '弗伦斯堡', en: 'Flensburg' },
  kiel: { zh: '基尔', en: 'Kiel' },
  hamburg: { zh: '汉堡', en: 'Hamburg' },
  bremen: { zh: '不来梅', en: 'Bremen' },
  hannover: { zh: '汉诺威', en: 'Hannover' },
  dortmund: { zh: '多特蒙德', en: 'Dortmund' },
  duisburg: { zh: '杜伊斯堡', en: 'Duisburg' },
  essen: { zh: '埃森', en: 'Essen' },
  duesseldorf: { zh: '杜塞尔多夫', en: 'Düsseldorf' },
  koeln: { zh: '科隆', en: 'Köln' },
  aachen: { zh: '亚琛', en: 'Aachen' },
  muenster: { zh: '明斯特', en: 'Münster' },
  osnabrueck: { zh: '奥斯纳布吕克', en: 'Osnabrück' },
  kassel: { zh: '卡塞尔', en: 'Kassel' },
  frankfurt: { zh: '法兰克福', en: 'Frankfurt' },
  wiesbaden: { zh: '威斯巴登', en: 'Wiesbaden' },
  trier: { zh: '特里尔', en: 'Trier' },
  saarbruecken: { zh: '萨尔布吕肯', en: 'Saarbrücken' },
  mannheim: { zh: '曼海姆', en: 'Mannheim' },
  stuttgart: { zh: '斯图加特', en: 'Stuttgart' },
  freiburg: { zh: '弗赖堡', en: 'Freiburg' },
  konstanz: { zh: '康斯坦茨', en: 'Konstanz' },
  augsburg: { zh: '奥格斯堡', en: 'Augsburg' },
  muenchen: { zh: '慕尼黑', en: 'München' },
  regensburg: { zh: '雷根斯堡', en: 'Regensburg' },
  nuernberg: { zh: '纽伦堡', en: 'Nürnberg' },
  wuerzburg: { zh: '维尔茨堡', en: 'Würzburg' },
  erfurt: { zh: '埃尔福特', en: 'Erfurt' },
  halle: { zh: '哈勒', en: 'Halle' },
  leipzig: { zh: '莱比锡', en: 'Leipzig' },
  dresden: { zh: '德累斯顿', en: 'Dresden' },
  magdeburg: { zh: '马格德堡', en: 'Magdeburg' },
  berlin: { zh: '柏林', en: 'Berlin' },
  schwerin: { zh: '什未林', en: 'Schwerin' },
  rostock: { zh: '罗斯托克', en: 'Rostock' },
  wilhelmshaven: { zh: '威廉港', en: 'Wilhelmshaven' },
  cuxhaven: { zh: '库克斯港', en: 'Cuxhaven' },
  luebeck: { zh: '吕贝克', en: 'Lübeck' },
  torgelow: { zh: '托格洛', en: 'Torgelow' },
  frankfurt_oder: { zh: '奥得河畔法兰克福', en: 'Frankfurt (Oder)' },
  fulda: { zh: '富尔达', en: 'Fulda' },
  passau: { zh: '帕绍', en: 'Passau' },
};
