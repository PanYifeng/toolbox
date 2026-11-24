// 大富翁卡牌数据：机会（Chance）16 张 + 命运（Community Chest）16 张，按标准官方牌组。
// 每张牌用结构化效果描述（t = 效果类型），引擎在 data-cards 之外只认这些效果类型，
// 便于自测穷举与后续扩展。纯数据，零 DOM/i18n 依赖。
//
// 效果类型：
//   advance     to: 目标格；collectGo: 途经起点是否领 200
//   nearestRail 前往最近的铁路（若已被他人持有，租金按 2 倍计）
//   nearestUtil 前往最近的公用事业（若已被他人持有，按骰点 ×10 缴租）
//   back3       后退 3 格
//   money       amount: 正数收入 / 负数支出
//   jail        直接入狱（不经过起点）
//   jailfree    获得「出狱卡」（可保留，离场时退回牌堆底）
//   repair      perHouse / perHotel：按自有房屋与旅馆数量缴费
//   payEach     amount：向每位其他玩家支付
//   collectEach amount：从每位其他玩家收取

// CHANCE 机会牌组（16 张）
export const CHANCE = [
  { id: 'ch_go', t: 'advance', to: 0, collectGo: true, text: { zh: '前进到起点，领取 200 元', en: 'Advance to GO (Collect $200)' } },
  { id: 'ch_illinois', t: 'advance', to: 24, collectGo: true, text: { zh: '前进到伊利诺伊大道；途经起点领 200 元', en: 'Advance to Illinois Ave. If you pass GO, collect $200' } },
  { id: 'ch_stcharles', t: 'advance', to: 11, collectGo: true, text: { zh: '前进到圣查尔斯广场；途经起点领 200 元', en: 'Advance to St. Charles Place. If you pass GO, collect $200' } },
  { id: 'ch_rail1', t: 'nearestRail', text: { zh: '前进到最近的铁路；若已被他人持有，租金加倍', en: 'Advance to the nearest Railroad. If owned, pay double rent' } },
  { id: 'ch_rail2', t: 'nearestRail', text: { zh: '前进到最近的铁路；若已被他人持有，租金加倍', en: 'Advance to the nearest Railroad. If owned, pay double rent' } },
  { id: 'ch_util', t: 'nearestUtil', text: { zh: '前进到最近的公用事业；若已被他人持有，掷骰并按点数 ×10 缴租', en: 'Advance to the nearest Utility. If owned, pay 10 × dice roll' } },
  { id: 'ch_dividend', t: 'money', amount: 50, text: { zh: '银行派发股息，收取 50 元', en: 'Bank pays you dividend of $50' } },
  { id: 'ch_jailfree', t: 'jailfree', text: { zh: '获得「出狱卡」（可保留使用）', en: 'Get Out of Jail Free' } },
  { id: 'ch_back3', t: 'back3', text: { zh: '后退 3 格', en: 'Go Back 3 Spaces' } },
  { id: 'ch_jail', t: 'jail', text: { zh: '直接入狱：不经过起点，不收 200 元', en: 'Go to Jail. Do not pass GO, do not collect $200' } },
  { id: 'ch_repairs', t: 'repair', perHouse: 25, perHotel: 100, text: { zh: '房屋大修：每栋房屋 25 元，每座旅馆 100 元', en: 'General repairs: $25 per house, $100 per hotel' } },
  { id: 'ch_speeding', t: 'money', amount: -15, text: { zh: '超速罚款，支付 15 元', en: 'Speeding fine $15' } },
  { id: 'ch_reading', t: 'advance', to: 5, collectGo: true, text: { zh: '前往雷丁铁路；途经起点领 200 元', en: 'Take a trip to Reading Railroad. If you pass GO, collect $200' } },
  { id: 'ch_chairman', t: 'payEach', amount: 50, text: { zh: '当选董事长，向每位其他玩家支付 50 元', en: 'Elected Chairman of the Board. Pay each player $50' } },
  { id: 'ch_loan', t: 'money', amount: 150, text: { zh: '建筑贷款到期，收取 150 元', en: 'Your building loan matures. Collect $150' } },
  { id: 'ch_boardwalk', t: 'advance', to: 39, collectGo: true, text: { zh: '前进到木板路', en: 'Advance to Boardwalk' } },
];

// CHEST 命运牌组（16 张）
export const CHEST = [
  { id: 'cc_go', t: 'advance', to: 0, collectGo: true, text: { zh: '前进到起点，领取 200 元', en: 'Advance to GO (Collect $200)' } },
  { id: 'cc_bankerror', t: 'money', amount: 200, text: { zh: '银行结算失误，对你有利：收取 200 元', en: 'Bank error in your favor. Collect $200' } },
  { id: 'cc_doctor', t: 'money', amount: -50, text: { zh: '看病费用，支付 50 元', en: "Doctor's fee. Pay $50" } },
  { id: 'cc_stock', t: 'money', amount: 50, text: { zh: '出售股票所得：收取 50 元', en: 'From sale of stock you get $50' } },
  { id: 'cc_jailfree', t: 'jailfree', text: { zh: '获得「出狱卡」（可保留使用）', en: 'Get Out of Jail Free' } },
  { id: 'cc_jail', t: 'jail', text: { zh: '直接入狱：不经过起点，不收 200 元', en: 'Go to Jail. Do not pass GO, do not collect $200' } },
  { id: 'cc_holiday', t: 'money', amount: 100, text: { zh: '节日基金到期，收取 100 元', en: 'Holiday fund matures. Receive $100' } },
  { id: 'cc_taxrefund', t: 'money', amount: 20, text: { zh: '所得税退税，收取 20 元', en: 'Income tax refund. Collect $20' } },
  { id: 'cc_birthday', t: 'collectEach', amount: 10, text: { zh: '今天是你的生日，向每位其他玩家收取 10 元', en: 'It is your birthday. Collect $10 from every player' } },
  { id: 'cc_insurance', t: 'money', amount: 100, text: { zh: '人寿保险到期，收取 100 元', en: 'Life insurance matures. Collect $100' } },
  { id: 'cc_hospital', t: 'money', amount: -100, text: { zh: '支付医院费用 100 元', en: 'Pay hospital fees of $100' } },
  { id: 'cc_school', t: 'money', amount: -50, text: { zh: '支付学费 50 元', en: 'Pay school fees of $50' } },
  { id: 'cc_consultancy', t: 'money', amount: 25, text: { zh: '收取咨询费 25 元', en: 'Receive $25 consultancy fee' } },
  { id: 'cc_streets', t: 'repair', perHouse: 40, perHotel: 115, text: { zh: '街道维修评税：每栋房屋 40 元，每座旅馆 115 元', en: 'Street repairs: $40 per house, $115 per hotel' } },
  { id: 'cc_beauty', t: 'money', amount: 10, text: { zh: '获得选美比赛二等奖，收取 10 元', en: 'Won second prize in a beauty contest. Collect $10' } },
  { id: 'cc_inherit', t: 'money', amount: 100, text: { zh: '继承遗产 100 元', en: 'You inherit $100' } },
];

// DECK_SIZE 各牌组张数（引擎建堆与洗牌校验用）
export const DECK_SIZE = { chance: CHANCE.length, chest: CHEST.length };
