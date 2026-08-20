export default {
  id: 'knowledge-quiz',
  name: { zh: '趣味知识问答', en: 'Fun Knowledge Quiz' },
  category: { zh: '知识 · 趣味', en: 'Knowledge & Fun' },
  icon: '🧠',
  keywords: [
    'quiz', 'trivia', 'knowledge', '问答', '测验', '知识',
    'nature', '自然', 'physics', '物理', 'chemistry', '化学',
    'biology', '生物', 'geography', '地理', 'history', '历史',
    'law', '法律', 'myth', '辟谣', '科普', '冷知识',
  ],
  desc: '涵盖自然、物理、化学、生物、地理、历史、法律与辟谣的趣味知识问答，及格发纪念卡，错题可付费看解析，纯前端本地作答不上传。',
  guide: {
    zh: `## 功能

分科趣味知识问答，涵盖**自然 / 物理 / 化学 / 生物 / 地理 / 历史 / 法律**七大领域，并设**辟谣专场**（澄清常见误区）。可选单科考试或全科综合，50 题制（题库不足时自动取满），每题 2 分、满分 100、60 分及格。

- **及格**：生成可下载、可验真的纪念卡
- **满分**：可选普通纪念卡（免费）或满分特别版金卡（¥1，自觉打赏解锁）
- **非满分**：可付费查看错题解析（列出错题、你的错选、正确答案与解析，0.2 元/题）

## 使用场景

- 通识自测与科普学习，尤其辟谣题帮你纠正长期误解
- 课堂或团建的趣味答题活动
- 凑满 60 分收藏一张专属纪念卡

## 常见问题

- **题目来源**：综合维基百科、教科书与权威公开资料整理，辟谣题尽量注明依据；仅供学习参考，不替代专业意见
- **数据上传吗**：作答与计分均在浏览器本地完成，不上传服务器
- **题库会重复吗**：题库持续扩充，单科题量较少时该科考试题数自动取满；综合与辟谣专场题量充足
- **错题解析为何付费**：解析为自愿付费项，打赏支持小站即可解锁；不打赏也祝学有所获`,
    en: `## Features

A categorized fun-knowledge quiz spanning **Nature / Physics / Chemistry / Biology / Geography / History / Law**, plus a **Myth-Busting Special** that corrects common misconceptions. Pick one subject or a comprehensive mix; 50-question format (auto-fills when a subject bank is smaller), 2 pts each, 100 max, pass at 60.

- **Pass**: generate a downloadable, verifiable memorial card
- **Perfect score**: choose a free normal card OR a gold perfect-score special card (¥1, honor-system tip to unlock)
- **Non-perfect**: optionally pay for error analysis — your wrong picks, correct answers, and explanations (0.2 RMB/question)

## Use cases

- General-knowledge self-test and science popularization, especially the myth-busting set
- Fun quiz activity for classrooms or team building
- Collect a personalized memorial card by scoring 60+

## FAQ

- **Sources**: compiled from Wikipedia, textbooks and authoritative public references; myth-busting items cite evidence where possible. For learning only, not professional advice
- **Data upload**: answering and scoring run locally in your browser; nothing is uploaded
- **Repetition**: the bank keeps growing; smaller subject banks auto-fill to their full size, while comprehensive and myth modes have ample questions
- **Why paid analysis**: analysis is an optional paid feature — tip to support this indie site to unlock. No tip, no problem, enjoy learning`,
  },
  component: () => import('./component.js'),
};
