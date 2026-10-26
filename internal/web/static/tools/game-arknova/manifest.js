export default {
  id: 'game_arknova',
  name: { zh: '方舟动物园', en: 'Ark Nova' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '🦁',
  keywords: ['ark nova', '方舟动物园', 'board game', '桌游', 'zoo', '动物园', 'engine builder', '引擎构建', 'action cards', '行动卡', 'conservation', '保护', '策略', '热座', 'hot seat'],
  desc: '重策桌游《方舟动物园》基础版完整复刻：128 张动物卡 + 64 张协会卡构成 192 张主牌堆（另含 5 张 X 卡）、5 张行动卡档位机制（用卡降档、闲置升档、超 5 打烊）、市场位置费与暗置补位、围栏建造（体型/岩石/水域/同种限制）、22 个保护项目、协会行动（大学/合作动物园/声望轨）、终局卡二选一与「魅力 ×2 − 保护点」计分。1-4 人热座同屏对局，支持 AI 机器人补位与联机房间，纯前端运行。',
  guide: {
    zh: `## 快速上手（3 分钟看懂）

你是动物园园长，目标只有一个：**终局得分 = 魅力 × 2 − 保护点**。魅力靠动物和设施堆，保护点靠项目和高保护动物拿——两条腿都要走，只堆魅力会输。

**第一轮照着做就懂了：**

1. 开局先从两张终局卡里**选 1 张**（它是你的加分目标，看不懂就选顺眼的）
2. 点一张**行动卡**执行行动（卡上点数 = 档位，越高越强）：
   - 🦁 动物卡：把手牌里的动物放进围栏（预算 = 8 × 档位，放越贵动物越要高档位）
   - 🤝 协会卡：拿资金 / 建大学 / 建合作动物园 / 升声望 / 完成项目
   - 🏗 建造卡：建围栏、宠物角、爬行馆、大鸟舍、小卖部、餐厅
   - 🃏 卡牌卡：抽牌 + 从市场拿牌（市场最左边那张**免费**，越往右越贵）
   - 💼 赞助卡：拿资金 + 打出协会赞助卡（各种持续加成）
3. 用过的卡降到 1 档，其他卡 +1 档——所以"攒档位"和"用卡"要规划

## 核心机制（白话版）

- **行动卡档位**：5 张卡各管一类行动，强度 1-5。用一张它回 1 档、其余全体 +1；被抬过 5 的卡"打烊"进休息区（ ☕ ），可以付持有者 2 币借用来应急（按 1 档执行）
- **市场**：左起 5 张明牌，位置 0 免费、1-4 位要付对应金币；右端 3 张暗牌补位，拿走一张左边整体左移
- **X 卡与打烊**：牌堆里混着 5 张 X，抽到第 5 张全场"打烊"——每人领收入（基础 3 + 小卖部×2 + 餐厅×4）、休息区卡归位、手牌超 8 要弃牌。这是节奏事件不是惩罚，别怕
- **放动物的条件**：体型占围栏格数、岩石 ⛳ 与水域 🌊 需求要满足、每种动物全园限 1 只、卡面图标需求（大学 🏫 / 合作动物园 🤝 等）要够；家畜只能进宠物角，爬行动物进爬行馆、大鸟进鸟舍
- **声望轨**：1-5 格，升格付入场费（2-5 币）。**声望到 5 且保护点达门槛（2 人局 10 / 3 人局 12 / 4 人局 14）就触发终局**；牌堆二次耗尽或回合数达上限也会收束
- **终局卡**：开局二选一，终局按你的动物园形态给额外保护点（只帮你够门槛，不直接进分）

## 使用场景

- 1-4 人同屏热座来一局重策动物园经营（AI 机器人可补位，也可全部 AI 观战）
- 想入门《方舟动物园》实体桌游前的规则学习器：放置合法性、图标需求、终局触发全部按规则引擎判定，点错会告诉你差什么
- 联机房间与好友各设备对局；随机种子可复现同一局复盘

## 常见问题（新手卡点）

- **为什么我的动物放不进围栏**：点一下放不进的手牌动物，界面会用白话告诉你原因——空间不足 / 缺岩石 / 缺水域 / 同种已养 / 图标需求不够 / 预算不够（动物预算 = 8 × 动物卡档位，不是现金！）
- **行卡为什么不亮**：打烊（☕）的卡不能用，除非去"休息区借用"付 2 币；没亮也没 ☕ 说明当前阶段不对
- **钱有什么用**：建造、市场位置费、升声望、借用他人休息卡。**放动物不花现金**，花的是动物行动预算
- **保护点怎么拿**：完成保护项目（协会行动里点高亮项目）、放置高保护点动物、部分协会卡。注意计分是**减**保护点，但保护点是你触发终局的门票，两者要平衡
- **终局什么时候来**：任一玩家声望 5 + 保护点达标，或牌堆二次耗尽，或回合上限（防拖延兜底）。触发后打完本轮就计分

## 数据与规则声明

128 张基础版动物卡与 64 张协会卡的数值（体型/价格/岩石/水域/需求/标签/魅力/保护点/声望）誊录自开源实现（MIT，BASE 源筛除海洋世界扩展与 promo，161 张中基础版恰为 128 + 64 = 192）；动物中文名为标准中文名自行翻译。协会卡效果数值开源数据未含，按官方卡牌语义赋值；性别字段开源数据缺失，按 id 数位合成约各半（繁育项目按官方"同类异性成对"执行）。国家公园（放归机制）与个别依赖实体配件的项目未实现，共保留 22 个可引擎化项目；回合上限（60/人）为本实现防拖延兜底，非官方规则。

动物图片来自 [Wikimedia Commons](/tools/game-arknova/img/ATTRIBUTIONS.md)（各物种维基百科条目导语图，CC BY / CC BY-SA / 公有领域授权，逐卡来源见 ATTRIBUTIONS）。`,
    en: `## Quick start (3 minutes)

You run a zoo. One goal: **final score = appeal × 2 − conservation points**. Appeal comes from animals and facilities; conservation points come from projects and high-CP animals — you need both, appeal alone loses.

**Your first round:**

1. Pick 1 of 2 endgame cards (your bonus goal — pick whichever looks reachable)
2. Tap an action card to act (its pips = strength, higher is stronger):
   - 🦁 Animals: place animals from hand into enclosures (budget = 8 × strength)
   - 🤝 Association: funds / university / partner zoo / reputation / projects
   - 🏗 Build: enclosures, petting zoo, reptile house, aviary, kiosk, restaurant
   - 🃏 Cards: draw + take from the market (leftmost market card is free)
   - 💼 Sponsors: funds + play sponsor cards for ongoing bonuses
3. The used card drops to strength 1 and all others rise — plan your strengths

## Core mechanics, plainly

- **Action card strengths**: 5 cards cover 5 action types, strength 1-5. Playing one resets it to 1 and raises the rest; a card pushed past 5 "breaks" to the rest area (☕), borrowable for 2 coins at strength 1
- **Market**: 5 face-up cards; slot 0 free, slots 1-4 cost their position number; 3 hidden cards refill from the right; taking one slides the row left
- **X cards & the break**: 5 X cards hide in the deck; the 5th one drawn triggers a break — everyone collects income (3 base + 2×kiosks + 4×restaurants), rest-area cards return, hands over 8 discard. It's a pacing event, not a punishment
- **Placing animals**: size fills enclosure slots, rock ⛳ / water 🌊 needs must fit, one of each species per zoo, icon requirements (universities 🏫 / partner zoos 🤝 …) must be met; pets go to the petting zoo, reptiles to the reptile house, large birds to the aviary
- **Reputation track**: 1-5, each step up costs an entry fee (2-5 coins). Reputation 5 + enough CP (2p: 10 / 3p: 12 / 4p: 14) triggers the endgame; double deck exhaustion or the turn cap also end the game
- **Endgame card**: pick 1 of 2 at setup; grants bonus CP matching your zoo shape (counts toward the gate only, not raw score)

## Use cases

- 1-4 player hot-seat heavy strategy on one screen (AI bots fill seats; all-AI spectator games work too)
- A rules trainer before playing the physical game: placement legality, icon requirements and endgame triggers are all engine-enforced, with plain-language feedback when a move is illegal
- Online rooms with friends per device; seeds reproduce games for review

## FAQ (newbie sticking points)

- **Why won't my animal go in**: tap the animal in your hand and the UI tells you why — no space / missing rocks / missing water / species already housed / icon requirements unmet / over budget (animal budget = 8 × the animals card's strength, not cash!)
- **Why is an action card dim**: broken (☕) cards can't be used except via "borrow from rest area" for 2 coins; a dim card without ☕ just means the phase is wrong
- **What's money for**: building, market slot costs, reputation fees, borrowing rest-area cards. Placing animals costs budget, not cash
- **How do I get conservation points**: complete conservation projects (highlighted in the association action), place high-CP animals, some sponsor cards. Scoring subtracts CP, but CP is your ticket to triggering the endgame — balance both
- **When does the game end**: any player at reputation 5 + CP goal, double deck exhaustion, or the turn cap (anti-stall backstop). The current round finishes, then scoring

## Data & rules disclaimer

The 128 base animals and 64 base sponsors (size/price/rocks/water/requirements/tags/appeal/CP/reputation) are transcribed from an open-source MIT implementation (BASE source only, excluding the Marine Worlds expansion and promos; of 161 total cards exactly 128 + 64 = 192 are base); Chinese animal names are standard translated names. Sponsor effect values are absent from the source data and assigned per the official card semantics; the gender field is synthesized from card ids (roughly half each) since the source lacks it (breeding projects follow the official mated-pair rule). National parks (release mechanic) and a few component-dependent projects are not implemented — 22 engine-compatible projects remain; the per-player turn cap (60) is an anti-stall backstop, not an official rule.

Animal photos are from [Wikimedia Commons](/tools/game-arknova/img/ATTRIBUTIONS.md) (lead images of each species' Wikipedia article, CC BY / CC BY-SA / public domain; per-card sources in ATTRIBUTIONS).`,
  },
  component: () => import('./component.js'),
};
