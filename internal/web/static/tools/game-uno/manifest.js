export default {
  id: 'game_uno',
  name: { zh: '巫诺', en: 'UNO' },
  category: { zh: '桌游', en: 'Board Games' },
  icon: '🃏',
  keywords: ['uno', '巫诺', '乌诺', '优诺', 'board game', '桌游', '卡牌', 'card game', '2-6 players', '热座', 'hot seat', 'online', '联机'],
  desc: '经典卡牌《巫诺》（UNO）完整复刻：官方 108 张牌（四色 0-9 + 跳过/反转/+2 + 变色/+4）、每人 7 张、同色或同数字或同符号接牌、万能牌随时可出并选色、摸 1 张可立即打出、剩 1 张须喊 UNO（忘喊罚摸 2 张）、出完一局按对手手牌计分并累计到目标分结束整场。支持连锁罚牌、开局目标分等家庭规则开关。2-6 人热座或联机同屏对局，支持 AI 机器人补位，纯前端运行。',
  guide: {
    zh: `## 功能

《巫诺》（UNO）经典 108 张牌规则复刻（2-6 人）：

- **牌库**：红/黄/绿/蓝 四色各有 0 一张、1-9 各两张、跳过/反转/+2 各两张，另有 4 张变色、4 张 +4，合计 108 张
- **开局**：每人发 7 张，翻一张起始牌定色；起始牌为 +4 时洗回重翻，为变色时由首位玩家选色，为跳过/反转/+2 时对首位玩家即时生效
- **接牌**：打出与弃牌堆顶**同色**、**同数字**或**同符号**（跳过/反转/+2 可跨色接）的牌；变色与 +4 任何时刻都能出
- **功能牌**：跳过 = 下家失去回合；反转 = 改方向（两人局等同跳过）；+2 = 下家摸 2 张并跳过；+4 = 下家摸 4 张并跳过后由出牌者选色
- **无牌可出**：摸 1 张；摸到的牌可出时可选立即打出或留在手上
- **UNO**：出到剩 1 张须喊 UNO，忘喊罚摸 2 张（热座无实时抢答，罚则表现为自己选「忘喊认罚」）
- **计分**：有人出完手牌一局结束，赢家按对手手牌计分（数字牌 = 面值，功能牌 = 20，万能牌 = 50）；累计达目标分结束整场

## 使用场景

- 和朋友同屏热座来一局快节奏卡牌（支持 AI 机器人补位，单人也能开局）
- 学习 UNO 规则：接牌判定、功能牌连动、UNO 罚则、局末计分等细节引擎完整实现
- 随机种子可复现同一局，方便复盘讨论

## 常见问题

- **家庭规则**：开局前可开「连锁罚牌」（+2 只能接 +2、+4 只能接 +4，罚牌量累加至接不住者）与「摸到可出的牌可立即打出」（默认开），并选目标分（200/500/1000，官方建议 500）
- **变色怎么选色**：打出变色或 +4 后界面弹出四色按钮，选完才轮到下家
- **牌堆用尽**：弃牌堆除顶牌外的所有牌自动洗回牌堆，界面日志会有提示
- **UNO 罚则**：热座与联机都没有「别人抢喊」机制，故由出牌者自己选择「喊 UNO / 忘喊（罚摸 2）」，避免互相盯人导致的操作负担
- **隐私交接**：手牌只有「坐在屏幕前的人」看得到，其他人的手牌一律显示牌背与张数；多个真人同屏时，回合交接会弹遮罩确认，避免上一家还坐着就看到下一家的牌
- **终局**：有人累计分达到目标分即整场结束，平分时胜局多者胜
- **悔棋**：付费悔棋回退到最近一次人类待决策状态
- **联机**：可在开局界面「创建联机房间」，把链接发给朋友；房间状态由服务端按行动序号同步，所有座位状态（含手牌数量）对参与者公开`,
    en: `## Features

A faithful implementation of classic UNO with the official 108-card deck (2-6 players):

- **Deck**: each of red/yellow/green/blue has one 0, two each of 1-9, two each of Skip/Reverse/+2, plus 4 Wild and 4 Wild Draw Four — 108 cards total
- **Opening**: deal 7 cards each and flip a starting card to set the colour. A Wild Draw Four start is reshuffled and re-flipped; a Wild start lets the first player choose the colour; Skip/Reverse/+2 starts take effect on the first player immediately
- **Matching**: play a card with the **same colour**, **same number**, or **same symbol** as the discard top (Skip/Reverse/+2 match across colours); Wild cards may always be played
- **Action cards**: Skip = next player loses the turn; Reverse = flip direction (acts like a Skip in a two-player game); +2 = next player draws 2 and is skipped; Wild Draw Four = next player draws 4, is skipped, then the player picks a colour
- **Nothing playable**: draw 1; if it is playable you may play it immediately or keep it
- **UNO**: with one card left you must call UNO — forgetting costs a 2-card penalty (hot seat has no real-time calling, so the player chooses "forgot" themselves)
- **Scoring**: when someone empties their hand the round ends and they score the opponents' remaining cards (number = face value, action = 20, wild = 50); the match ends once someone reaches the target score

## Use cases

- A fast-paced card game with friends on one screen (AI bots can fill seats, so solo works too)
- Learn UNO properly: matching, action-card chains, the UNO penalty and round scoring are all implemented
- The random seed reproduces the same game for review and discussion

## FAQ

- **House rules**: before starting you can enable "stacking draws" (+2 answers +2, +4 answers +4, penalties accumulate until someone cannot answer) and "play what you draw" (on by default), and pick a target score (200/500/1000; the official suggestion is 500)
- **Choosing a colour**: after a Wild or +4 the four colour buttons appear; the turn passes only after you pick
- **Pile exhaustion**: all discards except the top card are reshuffled into the draw pile, with a log notice
- **UNO penalty**: neither hot seat nor online play has a "call out someone else" mechanic, so the player themselves chooses "call UNO" or "forgot (draw 2)" — this keeps the game playable without policing each other
- **Hidden hands**: only the player at the screen sees their own cards; every other hand shows card backs plus a count. With two or more humans on one device a pass-to overlay appears between turns, so the previous player cannot glimpse the next player's hand
- **Match end**: the match ends as soon as someone reaches the target score; ties are broken by rounds won
- **Undo**: paid undo rolls back to your latest decision point
- **Online**: use "Create online room" on the setup screen and send the link to friends; room state syncs by action sequence number and every seat's state (including hand counts) is public to participants`,
  },
  component: () => import('./component.js'),
};
