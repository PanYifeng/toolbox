// 趣味知识问答题库（data.js）：聚合各学科子库 + 辟谣专场，共约 1000+ 题。
// 各 bank-*.js 由策展静态双语起草，项结构见各文件头部：
//   { q:{zh,en}, options:[{zh,en}×4], answer:0..3, subject:<学科>, explanation:{zh,en}, myth?:bool }
// component.js 经此模块取题；filterBank('all')=全科，filterBank('myth')=辟谣专场，filterBank(<subject>)=单科。
// 辟谣题 myth=true 且 subject 取真实领域，故单科考试亦可能含辟谣题（更多样），辟谣专场聚合所有 myth 题。

import nature from './bank-nature.js';
import physics from './bank-physics.js';
import chemistry from './bank-chemistry.js';
import biology from './bank-biology.js';
import geography from './bank-geography.js';
import history from './bank-history.js';
import law from './bank-law.js';
import myth from './bank-myth.js';

export default [
  ...nature,
  ...physics,
  ...chemistry,
  ...biology,
  ...geography,
  ...history,
  ...law,
  ...myth,
];
