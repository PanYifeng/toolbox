// 电力公司地图：德国及周边 42 城、6 区域（每区 7 城）。
// ⚠ 诚实声明：非官方地图誊录——官方邻接表与费用无法在线核对（网络被阻断），
// 本图为按真实德国地理自制的近似图：城市与区域按真实位置聚类，邻接取真实地理相邻，
// 费用按距离带设定（近 3 / 中 6 / 远 9）。
// 坐标为 SVG 画布（1000×880），大致按真实经纬度映射。

// C(id, 区, x, y, [[邻城, 费用], ...])——邻接为双向（构建时镜像）
function C(id, region, x, y, adj) { return { id, region, x, y, adj }; }

export const REGIONS = {
  north: { zh: '北德', en: 'North', color: '#d9534f' },
  west: { zh: '西德', en: 'West', color: '#e8b23c' },
  east: { zh: '东德', en: 'East', color: '#57b06a' },
  southwest: { zh: '西南', en: 'Southwest', color: '#4d84e0' },
  bavaria: { zh: '巴伐利亚', en: 'Bavaria', color: '#9a6fd0' },
  alps: { zh: '阿尔卑斯', en: 'Alps', color: '#8a8f98' },
};

const RAW = [
  // 北德（红）：石荷—汉堡—不来梅—汉诺威—柏林一线
  C('Flensburg', 'north', 480, 70, [['Kiel', 3]]),
  C('Kiel', 'north', 505, 110, [['Hamburg', 3]]),
  C('Hamburg', 'north', 545, 155, [['Bremen', 3], ['Rostock', 6], ['Berlin', 6]]),
  C('Rostock', 'north', 655, 100, [['Berlin', 6]]),
  C('Bremen', 'north', 445, 205, [['Hannover', 3], ['Osnabrueck', 6]]),
  C('Hannover', 'north', 530, 270, [['Berlin', 6], ['Magdeburg', 3]]),
  C('Berlin', 'north', 670, 235, [['Cottbus', 3]]),
  // 西德（黄）：鲁尔区 + 法兰克福
  C('Essen', 'west', 300, 345, [['Duesseldorf', 3], ['Dortmund', 3], ['Muenster', 3]]),
  C('Duesseldorf', 'west', 285, 390, [['Koeln', 3]]),
  C('Dortmund', 'west', 330, 400, [['Koeln', 6], ['Frankfurt', 9]]),
  C('Muenster', 'west', 360, 315, [['Osnabrueck', 3]]),
  C('Osnabrueck', 'west', 400, 285, []),
  C('Koeln', 'west', 275, 435, [['Frankfurt', 6]]),
  C('Frankfurt', 'west', 350, 525, [['Mainz', 3], ['Kassel', 6]]),
  // 东德（绿）：萨克森—图林根
  C('Magdeburg', 'east', 595, 305, [['Leipzig', 3]]),
  C('Leipzig', 'east', 615, 375, [['Erfurt', 3], ['Dresden', 3]]),
  C('Erfurt', 'east', 585, 395, [['Kassel', 3], ['Dresden', 6]]),
  C('Dresden', 'east', 685, 385, [['Görlitz', 3]]),
  C('Görlitz', 'east', 735, 400, [['Cottbus', 3]]),
  C('Cottbus', 'east', 660, 320, [['Dresden', 3]]),
  C('Kassel', 'east', 460, 435, []),
  // 西南（蓝）：莱茵—美因—施瓦本
  C('Mainz', 'southwest', 350, 510, [['Mannheim', 3], ['Wuerzburg', 3]]),
  C('Mannheim', 'southwest', 375, 550, [['Karlsruhe', 3], ['Stuttgart', 3]]),
  C('Karlsruhe', 'southwest', 385, 595, [['Stuttgart', 3], ['Freiburg', 3]]),
  C('Saarbruecken', 'southwest', 280, 575, [['Mainz', 6], ['Mannheim', 6]]),
  C('Wuerzburg', 'southwest', 435, 535, [['Nürnberg', 3], ['Stuttgart', 6]]),
  C('Stuttgart', 'southwest', 420, 615, [['Nürnberg', 6], ['Ulm', 3], ['Freiburg', 6]]),
  C('Nürnberg', 'southwest', 505, 575, [['Regensburg', 3]]),
  // 巴伐利亚（紫）：慕尼黑都市圈
  C('München', 'bavaria', 565, 735, [['Augsburg', 3], ['Regensburg', 3], ['Salzburg', 6], ['Innsbruck', 6]]),
  C('Augsburg', 'bavaria', 505, 725, [['Ulm', 3], ['Kempten', 3]]),
  C('Ulm', 'bavaria', 465, 660, [['Friedrichshafen', 3]]),
  C('Regensburg', 'bavaria', 625, 645, [['Passau', 3]]),
  C('Passau', 'bavaria', 685, 695, [['Salzburg', 3]]),
  C('Salzburg', 'bavaria', 655, 745, [['Innsbruck', 6]]),
  C('Innsbruck', 'bavaria', 585, 810, [['Kempten', 3]]),
  // 阿尔卑斯（灰）：博登湖—瑞士
  C('Freiburg', 'alps', 330, 655, [['Basel', 3]]),
  C('Basel', 'alps', 395, 735, [['Zürich', 3]]),
  C('Zürich', 'alps', 470, 800, [['Konstanz', 3]]),
  C('Konstanz', 'alps', 460, 720, [['Friedrichshafen', 3]]),
  C('Friedrichshafen', 'alps', 430, 690, [['Kempten', 3]]),
  C('Kempten', 'alps', 500, 755, [['Lindau', 3]]),
  C('Lindau', 'alps', 450, 755, [['Konstanz', 6]]),
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

// 中文/英文名（部分城市用拼写带省音符的 id，显示名独立）
export const CITY_NAMES = {
  Flensburg: { zh: '弗伦斯堡', en: 'Flensburg' },
  Kiel: { zh: '基尔', en: 'Kiel' },
  Hamburg: { zh: '汉堡', en: 'Hamburg' },
  Rostock: { zh: '罗斯托克', en: 'Rostock' },
  Bremen: { zh: '不来梅', en: 'Bremen' },
  Hannover: { zh: '汉诺威', en: 'Hannover' },
  Berlin: { zh: '柏林', en: 'Berlin' },
  Essen: { zh: '埃森', en: 'Essen' },
  Duesseldorf: { zh: '杜塞尔多夫', en: 'Düsseldorf' },
  Dortmund: { zh: '多特蒙德', en: 'Dortmund' },
  Muenster: { zh: '明斯特', en: 'Münster' },
  Osnabrueck: { zh: '奥斯纳布吕克', en: 'Osnabrück' },
  Koeln: { zh: '科隆', en: 'Köln' },
  Frankfurt: { zh: '法兰克福', en: 'Frankfurt' },
  Magdeburg: { zh: '马格德堡', en: 'Magdeburg' },
  Leipzig: { zh: '莱比锡', en: 'Leipzig' },
  Erfurt: { zh: '埃尔福特', en: 'Erfurt' },
  Dresden: { zh: '德累斯顿', en: 'Dresden' },
  Görlitz: { zh: '格尔利茨', en: 'Görlitz' },
  Cottbus: { zh: '科特布斯', en: 'Cottbus' },
  Kassel: { zh: '卡塞尔', en: 'Kassel' },
  Mainz: { zh: '美因茨', en: 'Mainz' },
  Mannheim: { zh: '曼海姆', en: 'Mannheim' },
  Karlsruhe: { zh: '卡尔斯鲁厄', en: 'Karlsruhe' },
  Saarbruecken: { zh: '萨尔布吕肯', en: 'Saarbrücken' },
  Wuerzburg: { zh: '维尔茨堡', en: 'Würzburg' },
  Stuttgart: { zh: '斯图加特', en: 'Stuttgart' },
  'Nürnberg': { zh: '纽伦堡', en: 'Nürnberg' },
  München: { zh: '慕尼黑', en: 'München' },
  Augsburg: { zh: '奥格斯堡', en: 'Augsburg' },
  Ulm: { zh: '乌尔姆', en: 'Ulm' },
  Regensburg: { zh: '雷根斯堡', en: 'Regensburg' },
  Passau: { zh: '帕绍', en: 'Passau' },
  Salzburg: { zh: '萨尔茨堡', en: 'Salzburg' },
  Innsbruck: { zh: '因斯布鲁克', en: 'Innsbruck' },
  Freiburg: { zh: '弗赖堡', en: 'Freiburg' },
  Basel: { zh: '巴塞尔', en: 'Basel' },
  Zürich: { zh: '苏黎世', en: 'Zürich' },
  Konstanz: { zh: '康斯坦茨', en: 'Konstanz' },
  Friedrichshafen: { zh: '腓特烈港', en: 'Friedrichshafen' },
  Kempten: { zh: '肯普滕', en: 'Kempten' },
  Lindau: { zh: '林道', en: 'Lindau' },
};
