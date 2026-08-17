// renderMemorialCard 在 canvas 上绘制纪念卡（宗教结业 / 游戏通关 / 样例预览），返回 PNG dataURL。
// 防伪码由 (姓名+主题键+分数+完成时间) 经 SHA-256 派生，可复算校验，为项目自有防伪标识。
// 卡面文字中英双语；寄语依主题而定，契合各宗教 / 游戏风格。
// 二维码图片同源加载，不会污染 canvas；吉祥符号作为独立徽章绘制在二维码旁边，绝不覆盖码图。

// THEMES 各宗教 + 各游戏独立主题：主色 / 辅色 / 底色 / 主符号 / 吉祥符号 / 标题 / 寄语 / 纹样类型
const THEMES = {
  buddhism: {
    primary: '#C9A227', secondary: '#8C6D1F', bg: '#FBF7EC', symbol: '☸', auspicious: '🪷', pattern: 'lotus',
    title: { zh: '佛法文化结业纪念卡', en: 'Buddhist Culture Memorial Card' },
    message: { zh: '慈悲喜舍，愿正法常明于心。', en: 'May loving-kindness and compassion illuminate your heart.' },
  },
  islam: {
    primary: '#1F8A4C', secondary: '#0F5C30', bg: '#F1F8F3', symbol: '☪', auspicious: '☪', pattern: 'star',
    title: { zh: '伊斯兰文化结业纪念卡', en: 'Islamic Culture Memorial Card' },
    message: { zh: '求知乃信士之担当，愿平安伴随你。', en: 'To seek knowledge is a duty; may peace be with you.' },
  },
  christianity: {
    primary: '#2A5DB0', secondary: '#163C7A', bg: '#F2F6FC', symbol: '✝', auspicious: '🕊', pattern: 'arch',
    title: { zh: '基督文化结业纪念卡', en: 'Christian Culture Memorial Card' },
    message: { zh: '施比受更为有福，愿爱与和平同在。', en: 'It is more blessed to give than to receive; may love and peace abide.' },
  },
  'game-2048': {
    primary: '#E67E22', secondary: '#A8541A', bg: '#FFF6EE', symbol: '▦', auspicious: '★', pattern: 'grid4',
    title: { zh: '2048 通关纪念卡', en: '2048 Clear-Stage Memorial Card' },
    message: { zh: '方寸之间运筹帷幄，愿你于生活中亦能合二为一。', en: 'Strategy within a small grid; may you merge what matters in life.' },
  },
  'game-snake': {
    primary: '#2E8B57', secondary: '#1E6B40', bg: '#F0FBF3', symbol: '🐍', auspicious: '★', pattern: 'wave',
    title: { zh: '贪吃蛇 通关纪念卡', en: 'Snake Clear-Stage Memorial Card' },
    message: { zh: '步步为营，生生不息，愿你越行越远。', en: 'Step by step, endless growth; may you go ever farther.' },
  },
  'game-ttt': {
    primary: '#6D3BE6', secondary: '#3E1F8A', bg: '#F6F2FE', symbol: '#', auspicious: '★', pattern: 'grid3',
    title: { zh: '井字棋 通关纪念卡', en: 'Tic-Tac-Toe Memorial Card' },
    message: { zh: '攻守相宜，落子无悔，愿你常保从容。', en: 'Balance attack and defense; may you stay composed.' },
  },
  game: {
    primary: '#6D3BE6', secondary: '#3E1F8A', bg: '#F6F2FE', symbol: '★', auspicious: '★', pattern: 'grid4',
    title: { zh: '通关纪念卡', en: 'Clear Stage Memorial Card' },
    message: { zh: '玩得开心，愿你常保欢喜之心。', en: 'Well played — may you keep a joyful heart.' },
  },
};

// BILABEL 双语标签：卡面固定文案中英并列
const BILABEL = {
  name: { zh: '姓名', en: 'Name' },
  score: { zh: '分数', en: 'Score' },
  completed: { zh: '完成时间', en: 'Completed' },
  support: { zh: '支持本项目（自愿）', en: 'Support this project (optional)' },
  alipay: { zh: '支付宝', en: 'Alipay' },
  wechat: { zh: '微信', en: 'WeChat' },
  antiFake: { zh: '项目防伪码', en: 'Anti-counterfeit' },
};

// loadImage 同源加载图片，失败返回 null
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// shaHex 计算 SHA-256 十六进制摘要
async function shaHex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// fmtCode 将哈希切成展示用的防伪码 TB-XXXX-XXXX-XXXX
function fmtCode(hex) {
  const s = (hex || '0000').replace(/[^0-9a-f]/gi, '').toUpperCase().padEnd(12, '0').slice(0, 12);
  return `TB-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

// renderMemorialCard 绘制纪念卡，返回 { dataUrl, code }
export async function renderMemorialCard(opts) {
  const theme = THEMES[opts.themeKey] || THEMES.game;
  const W = 1000, H = 1414;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const iso = opts.completedAt || new Date().toISOString();
  const code = fmtCode(await shaHex(`${opts.name}|${opts.themeKey}|${opts.score}|${iso}`));

  drawBackground(ctx, W, H, theme);
  drawHeader(ctx, W, theme);
  drawBody(ctx, W, opts, theme, iso);
  await drawFooter(ctx, W, H, theme, opts.showDonate);
  drawAntiFake(ctx, W, H, code);
  if (opts.preview) drawPreviewWatermark(ctx, W, H);

  return { dataUrl: canvas.toDataURL('image/png'), code };
}

// drawBackground 底色 + 主题专属纹样 + 双层装饰边框
function drawBackground(ctx, W, H, theme) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);
  drawThemePattern(ctx, W, H, theme);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, W - 112, H - 112);
}

// drawThemePattern 按主题绘制淡色装饰纹样，使每款背景各具特色
function drawThemePattern(ctx, W, H, theme) {
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.strokeStyle = theme.primary;
  ctx.fillStyle = theme.primary;
  ctx.lineWidth = 3;
  const pat = theme.pattern;
  if (pat === 'lotus') drawLotusPattern(ctx, W, H);
  else if (pat === 'star') drawStarPattern(ctx, W, H);
  else if (pat === 'arch') drawArchPattern(ctx, W, H);
  else if (pat === 'grid4') drawGridPattern(ctx, W, H, 4);
  else if (pat === 'grid3') drawGridPattern(ctx, W, H, 3);
  else if (pat === 'wave') drawWavePattern(ctx, W, H);
  ctx.restore();
}

// drawLotusPattern 佛教：中部法轮同心圆 + 莲瓣环（居中，不侵入底部二维码区）
function drawLotusPattern(ctx, W, H) {
  const cx = W / 2, cy = 720;
  for (let r = 50; r <= 250; r += 50) {
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 150, cy + Math.sin(a) * 150, 24, 54, a, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// drawStarPattern 伊斯兰：中部八角星几何簇（居中，不侵入底部）
function drawStarPattern(ctx, W, H) {
  const cx = W / 2, cy = 720;
  drawEightStar(ctx, cx, cy, 120);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    drawEightStar(ctx, cx + Math.cos(a) * 220, cy + Math.sin(a) * 220, 48);
  }
}

// drawEightStar 绘制八角星
function drawEightStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.45;
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.stroke();
}

// drawArchPattern 基督教：哥特拱轮廓 + 十字
function drawArchPattern(ctx, W, H) {
  for (let i = 0; i < 5; i++) {
    const cx = 140 + i * 180;
    const cy = 760;
    ctx.beginPath();
    ctx.moveTo(cx - 70, cy + 120);
    ctx.lineTo(cx - 70, cy);
    ctx.arc(cx, cy, 70, Math.PI, 0, false);
    ctx.lineTo(cx + 70, cy + 120);
    ctx.stroke();
  }
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(W / 2, 540); ctx.lineTo(W / 2, 660);
  ctx.moveTo(W / 2 - 50, 580); ctx.lineTo(W / 2 + 50, 580);
  ctx.stroke();
}

// drawGridPattern 游戏方格纹样（2048 用 4×4，井字棋用 3×3）
function drawGridPattern(ctx, W, H, n) {
  const size = 460, x0 = (W - size) / 2, y0 = 560, cell = size / n;
  ctx.strokeRect(x0, y0, size, size);
  for (let i = 1; i < n; i++) {
    ctx.beginPath(); ctx.moveTo(x0 + i * cell, y0); ctx.lineTo(x0 + i * cell, y0 + size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, y0 + i * cell); ctx.lineTo(x0 + size, y0 + i * cell); ctx.stroke();
  }
}

// drawWavePattern 贪吃蛇：折线蛇形路径
function drawWavePattern(ctx, W, H) {
  ctx.beginPath();
  let x = 120, y = 600, dir = 1;
  ctx.moveTo(x, y);
  while (x < W - 120) {
    x += 90; y += dir * 70; ctx.lineTo(x, y);
    dir *= -1;
  }
  ctx.lineWidth = 26;
  ctx.stroke();
}

// drawHeader 顶部圆形徽章 + 中英双语标题 + 副标题 + 分隔线
function drawHeader(ctx, W, theme) {
  ctx.textAlign = 'center';
  ctx.save();
  ctx.beginPath(); ctx.arc(W / 2, 96, 46, 0, Math.PI * 2);
  ctx.fillStyle = theme.primary; ctx.fill();
  ctx.strokeStyle = theme.bg; ctx.lineWidth = 4; ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.font = '44px serif';
  ctx.fillText(theme.symbol, W / 2, 98);
  ctx.restore();

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = theme.secondary;
  ctx.font = 'bold 46px "PingFang SC","Microsoft YaHei",serif';
  ctx.fillText(theme.title.zh, W / 2, 192);
  ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = theme.primary;
  ctx.fillText(theme.title.en, W / 2, 222);
  ctx.font = '15px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = theme.secondary;
  ctx.fillText('Toolbox · 纪念卡 · Memorial Card', W / 2, 248);

  ctx.strokeStyle = theme.primary;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(180, 270); ctx.lineTo(W - 180, 270); ctx.stroke();
  ctx.globalAlpha = 1;
}

// drawBody 中部信息：姓名 / 分数 / 完成时间（双语标签右对齐 + 值左对齐，留足间距）
function drawBody(ctx, W, opts, theme, iso) {
  const labelX = 420, valueX = 460;
  const rows = [
    { label: `${BILABEL.name.zh} · ${BILABEL.name.en}`, value: opts.name || '佚名 Anonymous' },
    { label: `${BILABEL.score.zh} · ${BILABEL.score.en}`, value: String(opts.score) },
    { label: `${BILABEL.completed.zh} · ${BILABEL.completed.en}`, value: fmtTime(iso) },
  ];
  let y = 318;
  ctx.textBaseline = 'middle';
  rows.forEach((ln) => {
    ctx.textAlign = 'right';
    ctx.fillStyle = theme.primary;
    ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(ln.label, labelX, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = theme.secondary;
    ctx.font = 'bold 30px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(ln.value, valueX, y);
    y += 62;
  });
  ctx.textBaseline = 'alphabetic';
  drawMessage(ctx, W, theme, opts, y + 18);
}

// drawMessage 寄语区：中英双语，依主题而定
function drawMessage(ctx, W, theme, opts, y) {
  ctx.textAlign = 'center';
  const msg = opts.message || theme.message;
  ctx.fillStyle = theme.secondary;
  ctx.font = 'italic 24px "PingFang SC","Microsoft YaHei",serif';
  const yEnd = wrapText(ctx, msg.zh, W / 2, y, W - 240, 34);
  ctx.fillStyle = theme.primary;
  ctx.font = 'italic 18px "PingFang SC","Microsoft YaHei",serif';
  wrapText(ctx, msg.en, W / 2, yEnd + 30, W - 240, 26);
}

// drawFooter 底部二维码（通用项目支持，非宗教募捐）。
// 二维码图片保持原样不动（保证可正常扫码支付），吉祥符号作为独立徽章绘制在两码之间。
async function drawFooter(ctx, W, H, theme, showDonate) {
  if (!showDonate) return;
  const items = [
    { src: '/img/donate-alipay.jpg', label: `${BILABEL.alipay.zh} · ${BILABEL.alipay.en}` },
    { src: '/img/donate-wechat.png', label: `${BILABEL.wechat.zh} · ${BILABEL.wechat.en}` },
  ];
  const qrSize = 150;
  const gap = 380;
  const startX = W / 2 - gap / 2 - qrSize / 2;
  const topY = 1065;
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.secondary;
  ctx.font = '19px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`${BILABEL.support.zh} · ${BILABEL.support.en}`, W / 2, topY - 24);

  drawAuspiciousMedallion(ctx, W / 2, topY + qrSize / 2, 38, theme);

  for (let i = 0; i < items.length; i++) {
    const img = await loadImage(items[i].src);
    const x = startX + i * gap;
    if (img) ctx.drawImage(img, x, topY, qrSize, qrSize); // 原样绘制，保证可扫码
    ctx.strokeStyle = theme.primary;
    ctx.lineWidth = 1;
    ctx.strokeRect(x - 4, topY - 4, qrSize + 8, qrSize + 8);
    ctx.fillStyle = theme.primary;
    ctx.font = '17px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(items[i].label, x + qrSize / 2, topY + qrSize + 26);
  }
}

// drawAuspiciousMedallion 圆形吉祥徽章：底色 + 吉祥符号
function drawAuspiciousMedallion(ctx, cx, cy, r, theme) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = theme.primary;
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '36px serif';
  ctx.fillText(theme.auspicious || theme.symbol, cx, cy + 2);
  ctx.restore();
}

// drawAntiFake 底部居中防伪码（双语标签，与边框留足间距）
function drawAntiFake(ctx, W, H, code) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#888';
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`${BILABEL.antiFake.zh} · ${BILABEL.antiFake.en}`, W / 2, H - 116);
  ctx.fillStyle = '#444';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(code, W / 2, H - 84);
}

// drawPreviewWatermark 样例预览水印（中英），防止样例被当作正式纪念卡
function drawPreviewWatermark(ctx, W, H) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-Math.PI / 6);
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = '#888';
  ctx.textAlign = 'center';
  ctx.font = 'bold 80px "PingFang SC","Microsoft YaHei",serif';
  const txt = '样例 SAMPLE';
  for (let i = -2; i <= 2; i++) {
    ctx.fillText(txt, 0, i * 150);
  }
  ctx.restore();
}

// wrapText 简单中文换行，返回末行基线 y
function wrapText(ctx, text, x, y, maxW, lh) {
  let line = '';
  let curY = y;
  for (const ch of text) {
    const test = line + ch;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, curY); line = ch; curY += lh;
    } else { line = test; }
  }
  if (line) ctx.fillText(line, x, curY);
  return curY;
}

// fmtTime ISO 时间转可读
function fmtTime(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// downloadPng 触发下载
export function downloadPng(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
