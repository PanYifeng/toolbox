export default {
  id: 'game-wordle',
  name: { zh: 'Wordle 猜词', en: 'Wordle' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🟩',
  keywords: ['wordle', '猜词', 'word game', 'five letter', '5 字母', 'guess word', 'word puzzle'],
  desc: 'Wordle 猜词游戏：6 次机会猜一个 5 字母英文单词，绿/黄/灰给出线索。内置常见词库，并支持粘贴自定义词库。计分（猜中所用次数越少分越高）、最高分、通关纪念卡与排行榜。',
  guide: {
    zh: `## 玩法

6 次机会猜出 5 字母英文单词。每行输入 5 个字母后回车提交，字母会着色：**绿**=位置正确；**黄**=在词中但位置错；**灰**=不在词中。猜中所用次数越少分越高：1 次 600 分，6 次 100 分；未猜中 0 分。

## 自定义词库

展开"自定义词库"，每行粘贴一个 5 字母词（仅 A-Z），点击应用即覆盖内置词库作为答案来源。作答不强制属于词库（无大词典校验，接受任意 5 字母输入）。

## 说明

- 纯前端实现，词库与作答均在本地；最高分记录在本地浏览器
- 物理键盘或屏上键盘均可输入；通关可生成纪念卡并可上排行榜`,
    en: `## How to play

You have 6 tries to guess a 5-letter English word. Type 5 letters and press Enter; letters color: **green** = correct spot; **yellow** = in the word, wrong spot; **gray** = not in the word. Fewer tries score higher: 1 try = 600, 6 tries = 100; failing = 0.

## Custom word list

Expand "Custom word list", paste one 5-letter word (A-Z only) per line, and apply to override the built-in list as the answer source. Guesses are not required to be in the list (no large dictionary check—any 5 letters are accepted).

## Notes

- Pure front-end; the list and scoring run locally; best score is stored in your browser
- Physical or on-screen keyboard both work; clearing a run generates a memorial card and may enter the leaderboard`,
  },
  component: () => import('./component.js'),
};
