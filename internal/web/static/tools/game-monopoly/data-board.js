// 大富翁棋盘数据：标准 40 格美式棋盘（22 块地产 + 4 条铁路 + 2 家公用事业 + 机会/命运/税务/监狱/起点）。
// 纯数据，零 DOM/i18n 依赖（node 可直接 import 自测）。货币单位：元。
// rent 数组 = [无房, 1 房, 2 房, 3 房, 4 房, 旅馆]；mortgage = 抵押价（= 地价一半）。

// GROUP_COLORS 各色组主色（棋盘着色与图例共用）
export const GROUP_COLORS = {
  brown: '#955436',
  lightblue: '#9fd8f5',
  pink: '#d93a96',
  orange: '#f7941d',
  red: '#ed1b24',
  yellow: '#f3d42c',
  green: '#1fb25a',
  darkblue: '#0072bb',
};

// SPACES 40 格定义（i = 棋盘位置，0 = 起点，顺时针）
export const SPACES = [
  { i: 0, type: 'go', name: { zh: '起点', en: 'GO' }, short: { zh: '起点', en: 'GO' } },
  {
    i: 1, type: 'prop', group: 'brown',
    name: { zh: '地中海大道', en: 'Mediterranean Ave' }, short: { zh: '地中海', en: 'Mediterranean' },
    price: 60, rent: [2, 10, 30, 90, 160, 250], house: 50, mortgage: 30,
  },
  { i: 2, type: 'cc', name: { zh: '命运', en: 'Community Chest' }, short: { zh: '命运', en: 'Chest' } },
  {
    i: 3, type: 'prop', group: 'brown',
    name: { zh: '波罗的海大道', en: 'Baltic Ave' }, short: { zh: '波罗的海', en: 'Baltic' },
    price: 60, rent: [4, 20, 60, 180, 320, 450], house: 50, mortgage: 30,
  },
  { i: 4, type: 'tax', amount: 200, name: { zh: '所得税', en: 'Income Tax' }, short: { zh: '所得税', en: 'Income Tax' } },
  {
    i: 5, type: 'rail', group: 'rail',
    name: { zh: '雷丁铁路', en: 'Reading Railroad' }, short: { zh: '雷丁铁路', en: 'Reading' },
    price: 200, mortgage: 100,
  },
  {
    i: 6, type: 'prop', group: 'lightblue',
    name: { zh: '东方大道', en: 'Oriental Ave' }, short: { zh: '东方', en: 'Oriental' },
    price: 100, rent: [6, 30, 90, 270, 400, 550], house: 50, mortgage: 50,
  },
  { i: 7, type: 'chance', name: { zh: '机会', en: 'Chance' }, short: { zh: '机会', en: 'Chance' } },
  {
    i: 8, type: 'prop', group: 'lightblue',
    name: { zh: '佛蒙特大道', en: 'Vermont Ave' }, short: { zh: '佛蒙特', en: 'Vermont' },
    price: 100, rent: [6, 30, 90, 270, 400, 550], house: 50, mortgage: 50,
  },
  {
    i: 9, type: 'prop', group: 'lightblue',
    name: { zh: '康涅狄格大道', en: 'Connecticut Ave' }, short: { zh: '康涅狄格', en: 'Connecticut' },
    price: 120, rent: [8, 40, 100, 300, 450, 600], house: 50, mortgage: 60,
  },
  { i: 10, type: 'jail', name: { zh: '监狱 / 探监', en: 'Jail / Just Visiting' }, short: { zh: '监狱', en: 'Jail' } },
  {
    i: 11, type: 'prop', group: 'pink',
    name: { zh: '圣查尔斯广场', en: 'St. Charles Place' }, short: { zh: '圣查尔斯', en: 'St. Charles' },
    price: 140, rent: [10, 50, 150, 450, 625, 750], house: 100, mortgage: 70,
  },
  {
    i: 12, type: 'util', group: 'util',
    name: { zh: '电力公司', en: 'Electric Company' }, short: { zh: '电力', en: 'Electric' },
    price: 150, mortgage: 75,
  },
  {
    i: 13, type: 'prop', group: 'pink',
    name: { zh: '州立大道', en: 'States Ave' }, short: { zh: '州立', en: 'States' },
    price: 140, rent: [10, 50, 150, 450, 625, 750], house: 100, mortgage: 70,
  },
  {
    i: 14, type: 'prop', group: 'pink',
    name: { zh: '弗吉尼亚大道', en: 'Virginia Ave' }, short: { zh: '弗吉尼亚', en: 'Virginia' },
    price: 160, rent: [12, 60, 180, 500, 700, 900], house: 100, mortgage: 80,
  },
  {
    i: 15, type: 'rail', group: 'rail',
    name: { zh: '宾夕法尼亚铁路', en: 'Pennsylvania Railroad' }, short: { zh: '宾州铁路', en: 'Pennsylvania' },
    price: 200, mortgage: 100,
  },
  {
    i: 16, type: 'prop', group: 'orange',
    name: { zh: '圣詹姆斯广场', en: 'St. James Place' }, short: { zh: '圣詹姆斯', en: 'St. James' },
    price: 180, rent: [14, 70, 200, 550, 750, 950], house: 100, mortgage: 90,
  },
  { i: 17, type: 'cc', name: { zh: '命运', en: 'Community Chest' }, short: { zh: '命运', en: 'Chest' } },
  {
    i: 18, type: 'prop', group: 'orange',
    name: { zh: '田纳西大道', en: 'Tennessee Ave' }, short: { zh: '田纳西', en: 'Tennessee' },
    price: 180, rent: [14, 70, 200, 550, 750, 950], house: 100, mortgage: 90,
  },
  {
    i: 19, type: 'prop', group: 'orange',
    name: { zh: '纽约大道', en: 'New York Ave' }, short: { zh: '纽约', en: 'New York' },
    price: 200, rent: [16, 80, 220, 600, 800, 1000], house: 100, mortgage: 100,
  },
  { i: 20, type: 'free', name: { zh: '免费停车', en: 'Free Parking' }, short: { zh: '免费停车', en: 'Free Parking' } },
  {
    i: 21, type: 'prop', group: 'red',
    name: { zh: '肯塔基大道', en: 'Kentucky Ave' }, short: { zh: '肯塔基', en: 'Kentucky' },
    price: 220, rent: [18, 90, 250, 700, 875, 1050], house: 150, mortgage: 110,
  },
  { i: 22, type: 'chance', name: { zh: '机会', en: 'Chance' }, short: { zh: '机会', en: 'Chance' } },
  {
    i: 23, type: 'prop', group: 'red',
    name: { zh: '印第安纳大道', en: 'Indiana Ave' }, short: { zh: '印第安纳', en: 'Indiana' },
    price: 220, rent: [18, 90, 250, 700, 875, 1050], house: 150, mortgage: 110,
  },
  {
    i: 24, type: 'prop', group: 'red',
    name: { zh: '伊利诺伊大道', en: 'Illinois Ave' }, short: { zh: '伊利诺伊', en: 'Illinois' },
    price: 240, rent: [20, 100, 300, 750, 925, 1100], house: 150, mortgage: 120,
  },
  {
    i: 25, type: 'rail', group: 'rail',
    name: { zh: 'B&O 铁路', en: 'B&O Railroad' }, short: { zh: 'B&O 铁路', en: 'B&O' },
    price: 200, mortgage: 100,
  },
  {
    i: 26, type: 'prop', group: 'yellow',
    name: { zh: '大西洋大道', en: 'Atlantic Ave' }, short: { zh: '大西洋', en: 'Atlantic' },
    price: 260, rent: [22, 110, 330, 800, 975, 1150], house: 150, mortgage: 130,
  },
  {
    i: 27, type: 'prop', group: 'yellow',
    name: { zh: '文特诺大道', en: 'Ventnor Ave' }, short: { zh: '文特诺', en: 'Ventnor' },
    price: 260, rent: [22, 110, 330, 800, 975, 1150], house: 150, mortgage: 130,
  },
  {
    i: 28, type: 'util', group: 'util',
    name: { zh: '自来水厂', en: 'Water Works' }, short: { zh: '水厂', en: 'Water' },
    price: 150, mortgage: 75,
  },
  {
    i: 29, type: 'prop', group: 'yellow',
    name: { zh: '马文花园', en: 'Marvin Gardens' }, short: { zh: '马文花园', en: 'Marvin' },
    price: 280, rent: [24, 120, 360, 850, 1025, 1200], house: 150, mortgage: 140,
  },
  { i: 30, type: 'gotojail', name: { zh: '入狱', en: 'Go To Jail' }, short: { zh: '入狱', en: 'Go To Jail' } },
  {
    i: 31, type: 'prop', group: 'green',
    name: { zh: '太平洋大道', en: 'Pacific Ave' }, short: { zh: '太平洋', en: 'Pacific' },
    price: 300, rent: [26, 130, 390, 900, 1100, 1275], house: 200, mortgage: 150,
  },
  {
    i: 32, type: 'prop', group: 'green',
    name: { zh: '北卡罗来纳大道', en: 'North Carolina Ave' }, short: { zh: '北卡', en: 'N. Carolina' },
    price: 300, rent: [26, 130, 390, 900, 1100, 1275], house: 200, mortgage: 150,
  },
  { i: 33, type: 'cc', name: { zh: '命运', en: 'Community Chest' }, short: { zh: '命运', en: 'Chest' } },
  {
    i: 34, type: 'prop', group: 'green',
    name: { zh: '宾夕法尼亚大道', en: 'Pennsylvania Ave' }, short: { zh: '宾州大道', en: 'Pennsylvania Ave' },
    price: 320, rent: [28, 150, 450, 1000, 1200, 1400], house: 200, mortgage: 160,
  },
  {
    i: 35, type: 'rail', group: 'rail',
    name: { zh: '短线铁路', en: 'Short Line' }, short: { zh: '短线铁路', en: 'Short Line' },
    price: 200, mortgage: 100,
  },
  { i: 36, type: 'chance', name: { zh: '机会', en: 'Chance' }, short: { zh: '机会', en: 'Chance' } },
  {
    i: 37, type: 'prop', group: 'darkblue',
    name: { zh: '公园广场', en: 'Park Place' }, short: { zh: '公园广场', en: 'Park Place' },
    price: 350, rent: [35, 175, 500, 1100, 1300, 1500], house: 200, mortgage: 175,
  },
  { i: 38, type: 'luxury', amount: 100, name: { zh: '奢侈税', en: 'Luxury Tax' }, short: { zh: '奢侈税', en: 'Luxury Tax' } },
  {
    i: 39, type: 'prop', group: 'darkblue',
    name: { zh: '木板路', en: 'Boardwalk' }, short: { zh: '木板路', en: 'Boardwalk' },
    price: 400, rent: [50, 200, 600, 1400, 1700, 2000], house: 200, mortgage: 200,
  },
];

// isOwnable 该格是否可被购买（地产 / 铁路 / 公用事业）
export function isOwnable(i) {
  const t = SPACES[i].type;
  return t === 'prop' || t === 'rail' || t === 'util';
}

// groupOf 该格所属色组（地产为颜色，铁路为 rail，公用事业为 util）
export function groupOf(i) {
  return SPACES[i].group || null;
}

// groupSpaces 某色组的全部格子下标
export function groupSpaces(group) {
  return SPACES.filter((x) => x.group === group).map((x) => x.i);
}

// GROUP_ORDER 棋盘上色组的自然顺序（渲染图例用）
export const GROUP_ORDER = ['brown', 'lightblue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkblue'];
