export default {
  id: 'lorem',
  name: { zh: 'Lorem 生成', en: 'Lorem Ipsum' },
  category: { zh: '生成', en: 'Generate' },
  icon: '📃',
  keywords: ['lorem', 'ipsum', 'placeholder', '占位', '文本', 'dummy text', '填充', '假文本', '排版样稿'],
  desc: '在线 Lorem ipsum 占位文本生成器，自定义段落数与每段词数，一键复制，纯前端随机生成。',
  guide: {
    zh: `## 功能

按设定的段落数（1-20）和每段词数（5-200），从内置拉丁词库随机抽取拼成 Lorem ipsum 风格的占位文本，首字母大写、句末加句号，可一键复制。

## 使用场景

- 设计稿、原型图填充占位文字，专注版式而非内容
- 测试长文本在布局、分页、滚动下的表现
- 写示例接口返回数据时填充假文本

## 常见问题

- **生成的是真拉丁文吗**：不是，是拉丁词库随机组合，无实际语义
- **每次结果一样吗**：不一样，每次随机生成
- **能复制吗**：点「复制」按钮即可复制到剪贴板`,
    en: `## Features

Generate Lorem ipsum style placeholder text from a built-in Latin word pool, with configurable paragraph count (1-20) and words per paragraph (5-200). First letter capitalized, period at the end, one-click copy.

## Use cases

- Fill design mockups and prototypes with dummy text so you focus on layout
- Test how long text behaves in pagination, scrolling or responsive layouts
- Populate sample API responses with fake text

## FAQ

- **Is it real Latin**: no, it is randomly assembled from a Latin word pool with no real meaning
- **Is the result the same each time**: no, it is regenerated randomly every time
- **Can I copy it**: click the copy button to copy to the clipboard`,
  },
  component: () => import('./component.js'),
};
