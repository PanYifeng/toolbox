// renderMemorialCard 在 canvas 上绘制纪念卡（宗教结业 / 游戏通关），返回 PNG dataURL。
// 防伪码由 (姓名+主题键+分数+完成时间) 经 SHA-256 派生，可复算校验，为项目自有防伪标识。
// 二维码图片同源加载，不会污染 canvas。

import { t, getLang } from '/core/i18n.js';

// THEMES 三教 + 通用主题：主色 / 辅色 / 符号 / 标题
const THEMES = {
  // auspicious: 二维码中心头像位替换为的吉祥符号（莲/新月/十字/星），寓意美好
  buddhism: { primary: '#C9A227', secondary: '#8C6D1F', bg: '#FBF7EC', symbol: '☸', auspicious: '🪷', title: { zh: '佛法文化结业纪念卡', en: 'Buddhist Culture Memorial Card' } },
  islam: { primary: '#1F8A4C', secondary: '#0F5C30', bg: '#F1F8F3', symbol: '☪', auspicious: '☪', title: { zh: '伊斯兰文化结业纪念卡', en: 'Islamic Culture Memorial Card' } },
  christianity: { primary: '#2A5DB0', secondary: '#163C7A', bg: '#F2F6FC', symbol: '✝', auspicious: '🕊', title: { zh: '基督文化结业纪念卡', en: 'Christian Culture Memorial Card' } },
  game: { primary: '#6D3BE6', secondary: '#3E1F8A', bg: '#F6F2FE', symbol: '★', auspicious: '★', title: { zh: '通关纪念卡', en: 'Clear Stage Memorial Card' } },
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
  const lang = getLang();
  const theme = THEMES[opts.themeKey] || THEMES.game;
  const W = 1000, H = 1414;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  const iso = opts.completedAt || new Date().toISOString();
  const code = fmtCode(await shaHex(`${opts.name}|${opts.themeKey}|${opts.score}|${iso}`));

  drawBackground(ctx, W, H, theme);
  drawHeader(ctx, W, theme, lang);
  drawSymbol(ctx, W, theme);
  drawBody(ctx, W, opts, theme, lang, iso);
  await drawFooter(ctx, W, H, theme, lang, opts.showDonate);
  drawAntiFake(ctx, W, H, code, lang);

  return { dataUrl: canvas.toDataURL('image/png'), code };
}

// drawBackground 背景 + 双层装饰边框
function drawBackground(ctx, W, H, theme) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = theme.primary;
  ctx.lineWidth = 10;
  ctx.strokeRect(36, 36, W - 72, H - 72);
  ctx.strokeStyle = theme.secondary;
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, W - 112, H - 112);
}

// drawHeader 顶部标题
function drawHeader(ctx, W, theme, lang) {
  ctx.fillStyle = theme.secondary;
  ctx.textAlign = 'center';
  ctx.font = 'bold 52px "PingFang SC","Microsoft YaHei",serif';
  ctx.fillText(theme.title[lang] || theme.title.zh, W / 2, 150);
  ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = theme.primary;
  ctx.fillText('Toolbox · Memorial Card', W / 2, 188);
}

// drawSymbol 大号宗教 / 游戏符号
function drawSymbol(ctx, W, theme) {
  ctx.fillStyle = theme.primary;
  ctx.globalAlpha = 0.18;
  ctx.font = '360px serif';
  ctx.textAlign = 'center';
  ctx.fillText(theme.symbol, W / 2, 720);
  ctx.globalAlpha = 1;
}

// drawBody 中部信息：姓名 / 分数 / 完成时间 / 寄语
function drawBody(ctx, W, opts, theme, lang, iso) {
  ctx.textAlign = 'center';
  ctx.fillStyle = theme.secondary;
  const lines = [
    { label: lang === 'en' ? 'Name' : '姓名', value: opts.name || (lang === 'en' ? 'Anonymous' : '佚名') },
    { label: opts.scoreLabel || (lang === 'en' ? 'Score' : '分数'), value: String(opts.score) },
    { label: lang === 'en' ? 'Completed' : '完成时间', value: fmtTime(iso, lang) },
  ];
  let y = 300;
  ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
  lines.forEach((ln) => {
    ctx.fillStyle = theme.primary;
    ctx.fillText(ln.label, W / 2 - 120, y);
    ctx.fillStyle = theme.secondary;
    ctx.font = 'bold 30px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(ln.value, W / 2 + 60, y);
    ctx.font = '22px "PingFang SC","Microsoft YaHei",sans-serif';
    y += 64;
  });
  drawMessage(ctx, W, theme, opts, lang, y + 30);
}

// drawMessage 寄语区：尊重信仰 / 通关祝贺
function drawMessage(ctx, W, theme, opts, lang, y) {
  ctx.fillStyle = theme.secondary;
  ctx.font = 'italic 24px "PingFang SC","Microsoft YaHei",serif';
  const msg = opts.message || (lang === 'en'
    ? 'Respect for faith matters more than any score.'
    : '尊重每一种信仰，比分数更重要。');
  wrapText(ctx, msg, W / 2, y, W - 220, 36);
}

// drawFooter 底部二维码（通用项目支持，非宗教募捐）。
// 关键：二维码图片保持原样不动（保证可正常扫码支付），吉祥符号作为独立徽章绘制在二维码旁边。
async function drawFooter(ctx, W, H, theme, lang, showDonate) {
  if (!showDonate) return;
  const items = [
    { src: '/img/donate-alipay.jpg', label: lang === 'en' ? 'Alipay' : '支付宝' },
    { src: '/img/donate-wechat.png', label: lang === 'en' ? 'WeChat' : '微信' },
  ];
  const qrSize = 150;
  const gap = 360;
  const startX = W / 2 - gap / 2 - qrSize / 2;
  ctx.textAlign = 'center';
  ctx.font = '20px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillStyle = theme.secondary;
  ctx.fillText(lang === 'en' ? 'Support this project (optional)' : '支持本项目（自愿）', W / 2, H - 260);

  // 居中吉祥徽章（宗教寓意符号，纯装饰，不覆盖二维码）
  drawAuspiciousMedallion(ctx, W / 2, H - 165, 42, theme);

  for (let i = 0; i < items.length; i++) {
    const img = await loadImage(items[i].src);
    const x = startX + i * gap;
    if (img) ctx.drawImage(img, x, H - 240, qrSize, qrSize); // 原样绘制，保证可扫码
    ctx.fillStyle = theme.primary;
    ctx.font = '18px "PingFang SC","Microsoft YaHei",sans-serif';
    ctx.fillText(items[i].label, x + qrSize / 2, H - 70);
  }
}

// drawAuspiciousMedallion 圆形吉祥徽章：底色 + 吉祥符号
function drawAuspiciousMedallion(ctx, cx, cy, r, theme) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = theme.primary;
  ctx.fill();
  ctx.strokeStyle = theme.bg;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '40px serif';
  ctx.fillText(theme.auspicious || theme.symbol, cx, cy + 2);
  ctx.restore();
}

// drawAntiFake 左下角防伪码
function drawAntiFake(ctx, W, H, code, lang) {
  ctx.textAlign = 'left';
  ctx.fillStyle = '#888';
  ctx.font = '16px "PingFang SC","Microsoft YaHei",monospace';
  ctx.fillText(lang === 'en' ? 'Anti-counterfeit' : '项目防伪码', 90, H - 90);
  ctx.fillStyle = '#444';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(code, 90, H - 62);
}

// wrapText 简单中文换行
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
}

// fmtTime ISO 时间转可读
function fmtTime(iso, lang) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  const s = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  return lang === 'en' ? s : s;
}

// downloadPng 触发下载
export function downloadPng(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
