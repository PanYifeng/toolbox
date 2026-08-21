// 人格类型人物形象系统：各类型男女一对，canvas 几何绘制，用于金卡和报告
// 人物为简化几何风格（圆头 + 圆角矩形身 + 发饰），颜色编码区分类型
// 无外部依赖，纯 canvas 原语绘制

// CHARACTER_DATA 各类型人物配色
// 键为 typeCode：MBTI 四字母 / DISC 单字母 / 大五单字母
export const CHARACTER_DATA = {
  // === MBTI 16 型（按气质分组）===
  // NT 分析师
  INTJ: { color: '#4A6FA5', accent: '#2D4373', skin: '#F0D5BE', hair: '#2C2C2C', hairF: '#5C3A1E' },
  INTP: { color: '#7B6BA5', accent: '#4A2E6B', skin: '#F0D5BE', hair: '#3D3D3D', hairF: '#4A2A5A' },
  ENTJ: { color: '#C0392B', accent: '#7B241C', skin: '#F0D5BE', hair: '#1A1A1A', hairF: '#2C1810' },
  ENTP: { color: '#E67E22', accent: '#A05500', skin: '#F0D5BE', hair: '#4A3520', hairF: '#6B3A1A' },
  // NF 外交家
  INFJ: { color: '#1ABC9C', accent: '#0E6B5E', skin: '#F0D5BE', hair: '#2C2C2C', hairF: '#3A1A1A' },
  INFP: { color: '#2ECC71', accent: '#1A7A42', skin: '#F0D5BE', hair: '#4A3A2C', hairF: '#5C2A3A' },
  ENFJ: { color: '#27AE60', accent: '#145A32', skin: '#F0D5BE', hair: '#2C1A1A', hairF: '#3A1A2C' },
  ENFP: { color: '#8BC34A', accent: '#558B2F', skin: '#F0D5BE', hair: '#4A2C1A', hairF: '#6B3A2C' },
  // SJ 守护者
  ISTJ: { color: '#2C3E50', accent: '#1A252F', skin: '#F0D5BE', hair: '#1A1A1A', hairF: '#2C1A1A' },
  ISFJ: { color: '#E91E63', accent: '#8B0A3A', skin: '#F0D5BE', hair: '#3A1A2C', hairF: '#4A1A2C' },
  ESTJ: { color: '#A0522D', accent: '#5C2A1A', skin: '#F0D5BE', hair: '#2C1A0A', hairF: '#3A1A0A' },
  ESFJ: { color: '#FF6F61', accent: '#B53A2E', skin: '#F0D5BE', hair: '#4A2A1A', hairF: '#5C2A1A' },
  // SP 探险家
  ISTP: { color: '#5D7B93', accent: '#2C4A5E', skin: '#F0D5BE', hair: '#2C2C2C', hairF: '#3A2A2C' },
  ISFP: { color: '#9B59B6', accent: '#5B2E6B', skin: '#F0D5BE', hair: '#3A1A3A', hairF: '#4A1A4A' },
  ESTP: { color: '#FF9800', accent: '#B36B00', skin: '#F0D5BE', hair: '#3A2C1A', hairF: '#5C3A1A' },
  ESFP: { color: '#FF4081', accent: '#B32A5A', skin: '#F0D5BE', hair: '#4A1A2C', hairF: '#6B2A3A' },

  // === DISC 4 型 ===
  D: { color: '#D9762A', accent: '#A05618', skin: '#F0D5BE', hair: '#2C1A0A', hairF: '#3A1A0A' },
  I: { color: '#F4D03F', accent: '#B89B1A', skin: '#F0D5BE', hair: '#4A3A1A', hairF: '#5C2A1A' },
  S: { color: '#2ECC71', accent: '#1A7A42', skin: '#F0D5BE', hair: '#2C2C2C', hairF: '#3A1A2C' },
  C: { color: '#3498DB', accent: '#1A5276', skin: '#F0D5BE', hair: '#1A2C3A', hairF: '#2C1A3A' },

  // === 大五 5 维 ===
  O: { color: '#0E7C86', accent: '#095560', skin: '#F0D5BE', hair: '#2C2C2C', hairF: '#3A1A2C' },
  C: { color: '#E67E22', accent: '#A05518', skin: '#F0D5BE', hair: '#2C1A0A', hairF: '#3A1A0A' },
  E: { color: '#E74C3C', accent: '#8B1A1A', skin: '#F0D5BE', hair: '#2C1A1A', hairF: '#3A1A1A' },
  A: { color: '#27AE60', accent: '#145A32', skin: '#F0D5BE', hair: '#2C2C1A', hairF: '#3A2A1A' },
  N: { color: '#8E44AD', accent: '#5B2E6B', skin: '#F0D5BE', hair: '#2C1A3A', hairF: '#3A1A3A' },
};

// 获取某类型的人物数据（无匹配时回退 INTJ）
export function getCharacter(typeCode) {
  return CHARACTER_DATA[typeCode] || CHARACTER_DATA.INTJ;
}

// drawRoundRect 辅助：绘制圆角矩形路径
function drawRoundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// drawCharacter 绘制单个人物（男/女），x,y 为底部中心
// charDef: { color, accent, skin, hair, hairF }
// gender: 'male' | 'female'
// size: 总高度（约值，默认 60）
export function drawCharacter(ctx, x, y, charDef, gender, size = 60) {
  const s = size;
  const headR = s * 0.2;       // 头半径
  const bodyH = s * 0.42;       // 身体高度
  const bodyW = s * 0.28;       // 身体半宽
  const headY = y - bodyH - headR; // 头中心 y
  const isMale = gender === 'male';
  const hairColor = isMale ? charDef.hair : charDef.hairF;

  ctx.save();

  // —— 身体：圆角矩形 ——
  const bx = x - bodyW, by = y - bodyH, bw = bodyW * 2, bh = bodyH;
  const cr = bw * 0.2; // 圆角半径
  drawRoundRect(ctx, bx, by, bw, bh, cr);
  ctx.fillStyle = charDef.color;
  ctx.fill();
  ctx.strokeStyle = charDef.accent;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // —— 头：圆形 ——
  ctx.beginPath();
  ctx.arc(x, headY, headR, 0, Math.PI * 2);
  ctx.fillStyle = charDef.skin;
  ctx.fill();
  ctx.strokeStyle = '#C9A88A';
  ctx.lineWidth = 1;
  ctx.stroke();

  // —— 头发 ——
  ctx.fillStyle = hairColor;
  if (isMale) {
    // 男性短发：头顶半圆
    ctx.beginPath();
    ctx.arc(x, headY - headR * 0.08, headR, Math.PI, 0);
    ctx.fill();
    // 两侧鬓角
    ctx.fillRect(x - headR - 1, headY - headR * 0.2, 3, headR * 0.5);
    ctx.fillRect(x + headR - 2, headY - headR * 0.2, 3, headR * 0.5);
  } else {
    // 女性长发：头顶半圆
    ctx.beginPath();
    ctx.arc(x, headY - headR * 0.08, headR, Math.PI, 0);
    ctx.fill();
    // 两侧长发
    const lw = Math.max(3, headR * 0.18);
    ctx.fillRect(x - headR - lw * 0.3, headY - headR * 0.3, lw, headR * 1.8);
    ctx.fillRect(x + headR - lw * 0.7, headY - headR * 0.3, lw, headR * 1.8);
  }

  // —— 眼睛 ——
  const eyeOff = headR * 0.3;
  const eyeR = Math.max(1.5, headR * 0.1);
  ctx.fillStyle = '#444';
  ctx.beginPath();
  ctx.arc(x - eyeOff, headY + headR * 0.1, eyeR, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + eyeOff, headY + headR * 0.1, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // —— 微笑 ——
  ctx.beginPath();
  ctx.arc(x, headY + headR * 0.35, headR * 0.2, 0.1, Math.PI - 0.1);
  ctx.strokeStyle = '#C9A88A';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  ctx.restore();
}

// drawCharacterPair 绘制男女一对人物，居中于 cx
// 返回底部 y 坐标（与传入 y 相同，方便链式调用）
export function drawCharacterPair(ctx, cx, y, charDef, size = 60) {
  const spacing = size * 0.5; // 男女间距（中心距）
  drawCharacter(ctx, cx - spacing, y, charDef, 'male', size);
  drawCharacter(ctx, cx + spacing, y, charDef, 'female', size);
  return y;
}

export default { CHARACTER_DATA, getCharacter, drawCharacter, drawCharacterPair };