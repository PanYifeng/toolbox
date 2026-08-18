export default {
  id: 'radix',
  name: { zh: '进制转换', en: 'Radix Converter' },
  category: { zh: '数学', en: 'Math' },
  icon: '🔢',
  keywords: ['radix', 'hex', 'bin', 'oct', 'dec', '进制', 'binary', '十进制', '十六进制', '进制转换'],
  desc: '在线进制转换工具，支持二进制、八进制、十进制、十六进制互转，实时计算纯前端处理。',
  guide: {
    zh: `## 功能

输入任一进制的数字，自动换算出 BIN、OCT、DEC、HEX 四种进制表示。

## 使用场景

- 调试代码时查看颜色值或位掩码的十六进制与十进制对照
- 阅读网络协议字段、内存地址时快速换算
- 学习计算机基础时验证手工转换结果

## 常见问题

- **解析失败**：输入与所选进制不符会提示无效，例如 HEX 下出现 G
- **负数与小数**：仅支持非负整数，小数与负号会被判为无效
- **大小写**：十六进制字母不区分大小写`,
    en: `## Features

Enter a number in any base and instantly get its BIN, OCT, DEC and HEX forms.

## Use cases

- Inspect color values or bitmasks while debugging
- Convert network protocol fields and memory addresses
- Verify manual conversions when learning computer science

## FAQ

- **Parse error**: input must match the chosen base, e.g. G is invalid under HEX
- **Negatives and decimals**: only non-negative integers are supported
- **Letter case**: hex letters are case-insensitive`,
  },
  component: () => import('./component.js'),
};
