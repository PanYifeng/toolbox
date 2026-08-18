export default {
  id: 'regex',
  name: { zh: '正则测试', en: 'Regex Tester' },
  category: { zh: '文本', en: 'Text' },
  icon: '🔍',
  keywords: ['regex', 'regexp', '正则', 'pattern', '正则表达式', '匹配', 'test', 'flags'],
  desc: '在线正则表达式测试工具，实时匹配并高亮所有结果，支持标志位与错误提示，纯前端处理。',
  guide: {
    zh: `## 功能

输入正则表达式与待匹配文本，列出全部匹配项并标注序号；支持 g、i、m 等标志位。

## 使用场景

- 编写表单校验规则时快速验证
- 提取日志或文本中的关键片段
- 学习正则语法时即时观察匹配效果

## 常见问题

- **无匹配**：返回提示无结果，可尝试调整标志位或边界符
- **语法错误**：错误信息会显示具体原因，如未闭合的括号
- **标志位**：默认 g 全局匹配，去掉 g 仅返回首个匹配`,
    en: `## Features

Enter a pattern and target text to list all matches with index; supports g, i, m flags.

## Use cases

- Validate form input rules quickly
- Extract key fragments from logs or text
- Learn regex syntax with instant feedback

## FAQ

- **No match**: returns a no-match hint — try adjusting flags or anchors
- **Syntax error**: the message shows the cause, e.g. unclosed parenthesis
- **Flags**: defaults to g for global; remove g to return the first match only`,
  },
  component: () => import('./component.js'),
};
