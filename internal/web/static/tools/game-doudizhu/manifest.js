export default {
  id: 'game_doudizhu',
  name: { zh: '斗地主', en: 'Dou Dizhu' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '🀄',
  keywords: ['doudizhu', '斗地主', 'landlord', 'card game', '卡牌', 'board game', '桌游', '3 players', '三人', '热座', 'hot seat', 'online', '联机'],
  desc: '经典三人斗地主（叫分制）完整复刻：54 张牌每人 17 张 + 3 张底牌，叫 1/2/3 分定地主（叫满即定、三人不叫则重发）；单张/对子/三带/顺子/连对/飞机/四带二/炸弹/王炸全部牌型，炸弹与王炸翻倍、地主春天与农民反春再翻倍；地主获底牌先出，两人连续过牌则重新领出；一方出完即结算，地主 ±2×底分×倍数、农民各 ∓底分×倍数。固定 3 人热座同屏（隐藏手牌交接），支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

三人斗地主（经典叫分制）规则复刻：

- **牌库**：54 张（52 张标准牌 + 大小王），每人 17 张，留 3 张底牌
- **叫地主**：发牌后轮流叫分，可叫 1/2/3 分（须高于当前最高分）或「不叫」。有人叫满 3 分立即成为地主；三人各表态一次后最高叫分者当地主，底分 = 叫分；三人都不叫则重新发牌
- **出牌**：地主获得 3 张底牌并先出。每次出牌须压过上一手，压不过可「过牌」；其余两人连续过牌则由上一手出牌者重新领出（领出时不能过牌）
- **牌型**：单张 / 对子 / 三张 / 三带一 / 三带二 / 顺子（≥5 张连续单牌）/ 连对（≥3 对连续）/ 飞机（≥2 组连续三张，可带单或带对）/ 四带二 / 四带两对 / 炸弹 / 王炸
- **大小**：同型同长比点数（3 最小 → 2 最大，王最大）；炸弹压任意非炸弹牌型，王炸压一切
- **倍数**：每出一次炸弹或王炸本局倍数 ×2（可叠加）；地主获胜且两农民一张未出为「春天」、农民获胜且地主只出过一手为「反春」，均再 ×2
- **结算**：一方出完手牌即终局。地主胜 = 地主 +2×底分×倍数、两农民各 −底分×倍数；农民胜则相反

## 使用场景

- 和朋友同屏热座来一局斗地主（支持 AI 机器人补位，单人可与两 AI 对局）
- 学习斗地主牌型判定：连牌上限、飞机翅膀规则、四带二区分、炸弹翻倍等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **连牌上限**：顺子、连对、飞机的最大点数只能到 A，2 与大小王不可入连（官方规则）
- **飞机带翅膀**：带单时每张翅膀可以同点两张，但不能拆四张同点当翅膀；带对时每组翅膀必须是一对
- **为什么必须过牌**：跟牌时若手上没有能压过的牌型，只能「过牌」；两家连续过牌后自动由最后出牌者重新领出
- **春天/反春**：地主一把出完且两农民没出过任何牌是春天；农民获胜时地主只出过一手（含底牌那手）是反春，都再翻一倍
- **隐私交接**：多人同屏时手牌是隐藏信息，回合交接会弹遮罩确认
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **联机**：可在开局界面「创建联机房间」，把链接发给朋友；房间状态由服务端按行动序号同步`,
    en: `## Features

A faithful implementation of three-player Dou Dizhu with the classic bidding rules:

- **Deck**: 54 cards (52 standard + two jokers); 17 cards each and 3 cards set aside as the landlord's bottom cards
- **Bidding**: players take turns bidding 1/2/3 points (must exceed the current high bid) or passing. A bid of 3 immediately wins the landlord role; otherwise, after each of the three players has spoken, the highest bidder becomes landlord and the base score equals that bid. If nobody bids, the hand is redealt
- **Playing**: the landlord receives the 3 bottom cards and leads. Each play must beat the previous one; if you cannot beat it you pass. Two consecutive passes hand the lead back to the last player who played (you cannot pass when leading)
- **Combinations**: single / pair / triple / triple + 1 / triple + 2 / straight (5+ consecutive singles) / pair run (3+ consecutive pairs) / plane (2+ consecutive triples, optionally with singles or pairs) / four + 2 / four + 2 pairs / bomb / rocket
- **Ranking**: same type and length compare by rank (3 lowest → 2 highest, jokers top); a bomb beats any non-bomb, a rocket beats everything
- **Multipliers**: every bomb or rocket doubles the hand's multiplier (cumulative); a "spring" (landlord wins while both peasants played nothing) or "anti-spring" (peasants win while the landlord played at most once) doubles it again
- **Scoring**: the hand ends when someone empties their hand. If the landlord wins, the landlord gains 2 × base × multiplier and each peasant loses base × multiplier; the reverse applies when the peasants win

## Use cases

- Play hot-seat Dou Dizhu with friends (AI bots can fill seats, so solo play against two bots works)
- Learn Dou Dizhu combination rules: chain limits, plane wings, four + 2 variants and bomb multipliers are all implemented
- The random seed reproduces the same hand for review and discussion

## FAQ

- **Chain limits**: straights, pair runs and planes may only go up to Ace; 2s and jokers cannot be part of a chain (official rule)
- **Plane wings**: with singles, each wing may be two cards of the same rank, but you cannot split a four-of-a-kind as a wing; with pairs, each wing must be a pair
- **Why must I pass**: when following, if you hold no combination that beats the current play you can only pass; after two consecutive passes the last player to play leads again
- **Spring / anti-spring**: the landlord empties their hand while neither peasant has played anything is a spring; the peasants win while the landlord has played at most once (including the bottom-card play) is an anti-spring — both double again
- **Privacy hand-over**: hands are hidden information, so turn hand-overs in hot seat show a confirmation overlay
- **Undo**: paid undo rolls back to your latest decision point
- **Online**: use "Create online room" on the setup screen and send the link to friends; room state syncs by action sequence number`,
  },
  component: () => import('./component.js'),
};
