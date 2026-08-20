export default {
  id: 'game-flappy',
  name: { zh: 'Flappy Bird', en: 'Flappy Bird' },
  category: { zh: '游戏', en: 'Games' },
  icon: '🐤',
  keywords: ['flappy', 'flappy bird', '飞鸟', '小鸟', 'pixel bird', 'tap game', '点击游戏'],
  desc: 'Flappy Bird 简化版：点按屏幕或空格让小鸟上跳，避开管道，穿越缝隙得分。纯 canvas 实现，无需物理引擎。支持计分、最高分、通关纪念卡与排行榜。',
  guide: {
    zh: `## 玩法

点按画布或按空格，小鸟向上跳一下；松手则受重力下坠。穿越每对管道的缝隙得 1 分，撞管或触地即结束。分数越高越好。

## 说明

- 纯前端 canvas 实现，简化版（无物理引擎、无原版精灵图）
- 最高分记录在本地浏览器，通关可生成纪念卡并可上排行榜
- 触屏点按、鼠标点按、空格键均可操作`,
    en: `## How to play

Tap the canvas or press Space to make the bird hop; release and gravity pulls it down. Pass through each pipe gap for 1 point; hitting a pipe or the ground ends the run. Higher is better.

## Notes

- Pure front-end canvas, a simplified version (no physics engine, no original sprites)
- Best score is stored locally in your browser; clearing a run generates a memorial card and may enter the leaderboard
- Touch, mouse, or Space all work`,
  },
  component: () => import('./component.js'),
};
