export default {
  id: 'cert-verify',
  name: { zh: '纪念卡验真', en: 'Memorial Card Verify' },
  category: { zh: '纪念卡', en: 'Memorial' },
  icon: '🛡',
  keywords: ['verify', 'cert', 'memorial', 'card', '验真', '防伪', '纪念卡', 'anti-counterfeit', '找回', '复算'],
  desc: '纪念卡验真工具，输入卡面四要素与防伪码复算比对，纯前端验真并重新渲染原卡。',
  guide: {
    zh: `## 功能

输入卡面四要素（姓名、主题、分数、完成时间）和防伪码，前端用与生成时相同的算法复算并比对，通过后重新渲染原纪念卡供下载。

## 使用场景

- 校验一张纪念卡是否被篡改或伪造
- 找回并重新下载之前生成的纪念卡
- 确认卡面信息与防伪码一致后再分享

## 常见问题

- **防伪码原理**：防伪码是卡面内容的内容指纹而非秘密，纯前端复算即可验真，无需服务端存储
- **验真失败**：请逐项核对姓名、主题、分数和完成时间是否与卡面完全一致，时间格式为「YYYY-MM-DD HH:MM」
- **数据安全**：所有计算在浏览器本地完成，卡面信息不上传服务器`,
    en: `## Features

Enter the four card fields (name, theme, score, completion time) plus the anti-counterfeit code; the page recomputes it with the same algorithm used at generation and compares, then re-renders the original card for download on match.

## Use cases

- Verify a memorial card has not been tampered with or forged
- Recover and re-download a previously generated card
- Confirm the card fields and anti-counterfeit code match before sharing

## FAQ

- **How the code works**: it is a content fingerprint, not a secret — recomputation runs purely client-side, no server storage needed
- **Verification failed**: double-check that name, theme, score and completion time exactly match the card; time format is YYYY-MM-DD HH:MM
- **Privacy**: all computation runs locally in your browser, card data is never uploaded`,
  },
  component: () => import('./component.js'),
};
