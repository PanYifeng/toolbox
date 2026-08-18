export default {
  id: 'duration',
  name: { zh: '时间长度换算', en: 'Duration Convert' },
  category: { zh: '时间', en: 'Time' },
  icon: '⏳',
  keywords: ['duration', 'time', 'convert', '时间', '时长', '换算', '年月日时分秒', '毫秒', 'ms'],
  desc: '在线时间长度换算工具，输入数值与单位输出复合分解及各单位等价，纯前端计算。',
  guide: {
    zh: `## 功能

输入一个数值并选择单位（年 / 月 / 周 / 天 / 时 / 分 / 秒 / 毫秒），输出复合分解形式（如 31 年 251 天 7 小时 46 分 40 秒）以及换算到各单位的等价值。

## 使用场景

- 计算一段总时长（毫秒或秒）对应多少天多少小时
- 把年、月单位换算成更细的小时或秒用于排期
- 验证时间戳或定时器间隔的单位换算结果

## 常见问题

- **年月近似**：年为 365.25 天，月为 30.4375 天，复合分解时跳过月和周以保证确定性
- **超大数值**：当数值过大或过小时自动用科学计数法展示，避免显示一长串零
- **数据安全**：换算在浏览器本地完成，不上传服务器`,
    en: `## Features

Enter a value and a unit (year / month / week / day / hour / minute / second / millisecond) to get a compound breakdown (e.g. 31 years 251 days 7 hours 46 minutes 40 seconds) plus the equivalent in every unit.

## Use cases

- Convert a total duration (ms or seconds) into days and hours
- Break year or month values into finer hours or seconds for scheduling
- Verify unit conversions for timestamps or timer intervals

## FAQ

- **Year and month are approximate**: a year is 365.25 days and a month is 30.4375 days; compound breakdown skips month and week for determinism
- **Very large values**: extremely large or small numbers are shown in scientific notation to avoid long strings of zeros
- **Privacy**: conversion runs locally in your browser, nothing is uploaded`,
  },
  component: () => import('./component.js'),
};
