// renderMemorialCard 在 canvas 上绘制纪念卡（宗教结业 / 游戏通关 / 样例预览），返回 PNG dataURL。
// 防伪码由 (姓名+主题键+分数+完成时间) 经 SHA-256 派生，可复算校验，为项目自有防伪标识。
// 卡面文字中英双语；寄语依主题而定，契合各宗教 / 游戏风格。
// 二维码图片同源加载，不会污染 canvas；吉祥符号作为独立徽章绘制在二维码旁边，绝不覆盖码图。

// THEMES 各宗教 + 各游戏独立主题：主色 / 辅色 / 底色 / 主符号 / 吉祥符号 / 标题 / 寄语 / 纹样类型
export const THEMES = {
  buddhism: {
    primary: '#C9A227', secondary: '#8C6D1F', bg: '#FBF7EC', symbol: '☸', auspicious: '🪷', pattern: 'lotus',
    title: { zh: '佛法文化结业纪念卡', en: 'Buddhist Culture Memorial Card' },
    message: { zh: '慈悲喜舍，愿正法常明于心。', en: 'May loving-kindness and compassion illuminate your heart.' },
    // 样例完成时间：佛诞日（日本传统花祭，定为公历 4 月 8 日）
    sampleDate: '2025-04-08',
  },
  islam: {
    primary: '#1F8A4C', secondary: '#0F5C30', bg: '#F1F8F3', symbol: '☪', auspicious: '☪', pattern: 'star',
    title: { zh: '伊斯兰文化结业纪念卡', en: 'Islamic Culture Memorial Card' },
    message: { zh: '求知乃信士之担当，愿平安伴随你。', en: 'To seek knowledge is a duty; may peace be with you.' },
    // 样例完成时间：开斋节 Eid al-Fitr（2025 年 3 月 30 日，沙特公布）
    sampleDate: '2025-03-30',
  },
  christianity: {
    primary: '#2A5DB0', secondary: '#163C7A', bg: '#F2F6FC', symbol: '✝', auspicious: '🕊', pattern: 'arch',
    title: { zh: '基督文化结业纪念卡', en: 'Christian Culture Memorial Card' },
    message: { zh: '施比受更为有福，愿爱与和平同在。', en: 'It is more blessed to give than to receive; may love and peace abide.' },
    // 样例完成时间：圣诞节 Christmas（12 月 25 日）
    sampleDate: '2025-12-25',
  },
  'knowledge-quiz': {
    primary: '#7c3aed', secondary: '#5b21b6', bg: '#F6F2FE', symbol: '🧠', auspicious: '📚', pattern: 'grid4',
    title: { zh: '趣味知识问答纪念卡', en: 'Knowledge Quiz Memorial Card' },
    message: { zh: '学海无涯，知行合一，愿求知之心长存。', en: 'Boundless learning, knowledge in action; may your curiosity endure.' },
    // 样例完成时间：首次诺贝尔奖颁发（1901 年 12 月 10 日，致敬知识的传承）
    sampleDate: '1901-12-10',
  },
  'game-2048': {
    primary: '#E67E22', secondary: '#A8541A', bg: '#FFF6EE', symbol: '▦', auspicious: '★', pattern: 'grid4',
    title: { zh: '2048 通关纪念卡', en: '2048 Clear-Stage Memorial Card' },
    message: { zh: '方寸之间运筹帷幄，愿你于生活中亦能合二为一。', en: 'Strategy within a small grid; may you merge what matters in life.' },
    // 样例完成时间：2048 首次发布日（Cirulli，2014 年 3 月 9 日）
    sampleDate: '2014-03-09',
  },
  'game-snake': {
    primary: '#2E8B57', secondary: '#1E6B40', bg: '#F0FBF3', symbol: '🐍', auspicious: '★', pattern: 'wave',
    title: { zh: '贪吃蛇 通关纪念卡', en: 'Snake Clear-Stage Memorial Card' },
    message: { zh: '步步为营，生生不息，愿你越行越远。', en: 'Step by step, endless growth; may you go ever farther.' },
    // 样例完成时间：贪吃蛇类街机鼻祖 Blockade 上市（Gremlin，1976 年 10 月）
    sampleDate: '1976-10-01',
  },
  'game-ttt': {
    primary: '#6D3BE6', secondary: '#3E1F8A', bg: '#F6F2FE', symbol: '#', auspicious: '★', pattern: 'grid3',
    title: { zh: '井字棋 通关纪念卡', en: 'Tic-Tac-Toe Memorial Card' },
    message: { zh: '攻守相宜，落子无悔，愿你常保从容。', en: 'Balance attack and defense; may you stay composed.' },
    // 样例完成时间：最早的井字棋电子游戏之一 OXO（A.S. Douglas，EDSAC，1952 年）
    sampleDate: '1952-01-01',
  },
  'game-spider': {
    primary: '#8B2C5C', secondary: '#5C1D3C', bg: '#FBF2F6', symbol: '♠', auspicious: '★', pattern: 'grid4',
    title: { zh: '蜘蛛纸牌 通关纪念卡', en: 'Spider Solitaire Memorial Card' },
    message: { zh: '抽丝剥茧，运筹帷幄，愿你于纷繁中理出头绪。', en: 'Untangle the threads and plan ahead; may you find clarity in complexity.' },
    // 样例完成时间：蜘蛛纸牌随 Windows 98 Plus! 广泛流传（1998 年 6 月）
    sampleDate: '1998-06-25',
  },
  'game-minesweeper': {
    primary: '#1F6F8B', secondary: '#134A5E', bg: '#F0F7FA', symbol: '💣', auspicious: '★', pattern: 'grid4',
    title: { zh: '扫雷 通关纪念卡', en: 'Minesweeper Memorial Card' },
    message: { zh: '步步推理，谨慎前行，愿你避开暗礁抵达彼岸。', en: 'Reason step by step and proceed with care; may you steer past hidden reefs.' },
    // 样例完成时间：扫雷随 Windows 3.1 发布（1992 年 4 月）
    sampleDate: '1992-04-06',
  },
  'game-tetris': {
    primary: '#3b82f6', secondary: '#1E40AF', bg: '#F0F6FE', symbol: '🟦', auspicious: '★', pattern: 'grid4',
    title: { zh: '俄罗斯方块 通关纪念卡', en: 'Tetris Memorial Card' },
    message: { zh: '方寸之间进退有度，愿你于纷至沓来中从容不迫。', en: 'Order within the falling blocks; may you stay composed as things pile up.' },
    // 样例完成时间：俄罗斯方块诞生（Aleksej Pažitnov，1984 年 6 月 6 日）
    sampleDate: '1984-06-06',
  },
  game: {
    primary: '#6D3BE6', secondary: '#3E1F8A', bg: '#F6F2FE', symbol: '★', auspicious: '★', pattern: 'grid4',
    title: { zh: '通关纪念卡', en: 'Clear Stage Memorial Card' },
    message: { zh: '玩得开心，愿你常保欢喜之心。', en: 'Well played — may you keep a joyful heart.' },
    sampleDate: '2025-01-01',
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

// SHA256_K SHA-256 常量表（纯 JS 回退实现用）
const SHA256_K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];

// rotr 32 位循环右移
function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

// sha256Bytes 纯 JS SHA-256，返回 8 个 32 位字（HTTP 非安全上下文下 crypto.subtle 不可用时的回退）
function sha256Bytes(msg) {
  const H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const l = msg.length;
  const bitLen = l * 8;
  const withOne = l + 1;
  const k = (56 - (withOne % 64) + 64) % 64;
  const total = withOne + k + 8;
  const buf = new Uint8Array(total);
  buf.set(msg);
  buf[l] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(total - 4, bitLen >>> 0, false);
  dv.setUint32(total - 8, Math.floor(bitLen / 0x100000000), false);
  const W = new Array(64);
  for (let i = 0; i < total; i += 64) {
    for (let t = 0; t < 16; t++) W[t] = dv.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(W[t - 15], 7) ^ rotr(W[t - 15], 18) ^ (W[t - 15] >>> 3);
      const s1 = rotr(W[t - 2], 17) ^ rotr(W[t - 2], 19) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) | 0;
    }
    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const t1 = (h + S1 + ch + SHA256_K[t] + W[t]) | 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const t2 = (S0 + maj) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
  }
  return H;
}

// shaHex 计算 SHA-256 十六进制摘要。
// 优先 crypto.subtle（安全上下文 / localhost），不可用时回退纯 JS，保证 HTTP 下也能生成纪念卡。
async function shaHex(text) {
  const msg = new TextEncoder().encode(text);
  if (globalThis.crypto && globalThis.crypto.subtle && globalThis.crypto.subtle.digest) {
    try {
      const buf = await globalThis.crypto.subtle.digest('SHA-256', msg);
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch (_) { /* 回退纯 JS */ }
  }
  return sha256Bytes(msg).map((x) => (x >>> 0).toString(16).padStart(8, '0')).join('');
}

// ANTI_ALPHABET 防伪码字符表：去掉易混的 0/O/1/I/L，
// 编码后形如产品序列号而非 hex hash，既可复算校验又不一眼看穿。
const ANTI_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// fmtCode 将 SHA-256 hex 编码为 TB-XXXX-XXXX-XXXX 序列号风格防伪码。
// 每 2 hex 当 1 字节，取前 12 字节，按 ANTI_ALPHABET（31 字符）取模映射。
function fmtCode(hex) {
  const clean = (hex || '').replace(/[^0-9a-f]/gi, '').toLowerCase();
  let code = '';
  for (let i = 0; i < 12; i++) {
    const byte = parseInt(clean.slice(i * 2, i * 2 + 2) || '0', 16) || 0;
    code += ANTI_ALPHABET[byte % ANTI_ALPHABET.length];
  }
  return `TB-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}

// computeAntiFake 由卡面四要素（姓名/主题/分数/完成时间到分钟）派生防伪码，生成与验真复用同一逻辑
export async function computeAntiFake(name, themeKey, score, displayTime) {
  return fmtCode(await shaHex(`${name}|${themeKey}|${score}|${displayTime}`));
}

// normalizeCode 规范化防伪码用于比对：去横线/空格/前缀，转大写，取 12 位核心
export function normalizeCode(input) {
  const s = (input || '').toUpperCase().replace(/^TB-?/, '').replace(/[^A-Z0-9]/g, '');
  return s.slice(0, 12);
}

// renderMemorialCard 绘制纪念卡，返回 { dataUrl, code }
export async function renderMemorialCard(opts) {
  const theme = THEMES[opts.themeKey] || THEMES.game;
  const W = 1000, H = 1414;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // 完成时间：显式传入优先；否则预览样例用主题的喜庆/纪念日，正式卡用当前时间。
  // 日期串按本地时间解析再转 ISO，保证样例日期在各时区显示一致。
  let iso = opts.completedAt;
  if (!iso) {
    iso = opts.preview && theme.sampleDate
      ? new Date(`${theme.sampleDate}T00:00:00`).toISOString()
      : new Date().toISOString();
  }
  // 卡面显示的完成时间字符串（到分钟）。防伪码基于此字符串，
  // 这样用户凭卡面四要素即可复算验真；找回时可直接传 displayTime 跳过 iso 转换，跨时区一致。
  const displayTime = opts.displayTime || fmtTime(iso);
  // 金版卡（破纪录/满分/待核验）用金色边框与防伪码，区别于普通通关卡。
  const gold = !!(opts.recordCode || opts.recordPending || opts.perfect);
  // 破纪录卡由服务端签发 TB-R- 码（opts.recordCode），跳过前端复算，直接用作防伪码。
  // 待核验态（opts.recordPending）：防伪码位占位，不发真码，核验通过后才下发。
  let code;
  if (opts.recordPending) code = '待核验 · PENDING';
  else code = opts.recordCode || await computeAntiFake(opts.name, opts.themeKey, opts.score, displayTime);

  drawBackground(ctx, W, H, theme, gold);
  if (opts.recordCode || opts.recordPending) drawRecordBanner(ctx, W, H, theme);
  else if (opts.perfect) drawPerfectBanner(ctx, W, H, theme);
  drawHeader(ctx, W, theme);
  drawBody(ctx, W, opts, theme, displayTime);
  await drawFooter(ctx, W, H, theme, opts.showDonate);
  drawAntiFake(ctx, W, H, code, gold);
  if (opts.preview) drawPreviewWatermark(ctx, W, H);

  return { dataUrl: canvas.toDataURL('image/png'), code };
}

// drawBackground 底色 + 主题专属纹样 + 双层装饰边框（金版卡用全金边框）
function drawBackground(ctx, W, H, theme, gold) {
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);
  drawThemePattern(ctx, W, H, theme);
  if (gold) {
    // 金版卡：外围整圈实心金框（深金填充 + 亮金内描边收口），金框外部不留主题底色
    const M = 60; // 金框宽度：从画布边缘到内容区，覆盖原双层描边位置
    ctx.fillStyle = '#C99A2E';
    ctx.fillRect(0, 0, W, M);                 // 上
    ctx.fillRect(0, H - M, W, M);             // 下
    ctx.fillRect(0, M, M, H - 2 * M);         // 左
    ctx.fillRect(W - M, M, M, H - 2 * M);     // 右
    ctx.strokeStyle = '#F6C453';
    ctx.lineWidth = 3;
    ctx.strokeRect(M + 1.5, M + 1.5, W - 2 * (M + 1.5), H - 2 * (M + 1.5)); // 亮金内描边，金框与内容区分界
    return;
  }
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
function drawBody(ctx, W, opts, theme, displayTime) {
  const labelX = 420, valueX = 460;
  const rows = [
    { label: `${BILABEL.name.zh} · ${BILABEL.name.en}`, value: opts.name || '佚名 Anonymous' },
    { label: `${BILABEL.score.zh} · ${BILABEL.score.en}`, value: String(opts.score) },
    { label: `${BILABEL.completed.zh} · ${BILABEL.completed.en}`, value: displayTime },
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

// drawAntiFake 底部居中防伪码（双语标签；金版卡用金色码，普通卡用深灰）
function drawAntiFake(ctx, W, H, code, gold) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = gold ? '#8C6D1F' : '#888';
  ctx.font = '14px "PingFang SC","Microsoft YaHei",sans-serif';
  ctx.fillText(`${BILABEL.antiFake.zh} · ${BILABEL.antiFake.en}`, W / 2, H - 116);
  ctx.fillStyle = gold ? '#8C6D1F' : '#444';
  ctx.font = 'bold 22px monospace';
  ctx.fillText(code, W / 2, H - 84);
}

// drawRecordBanner 破纪录卡专属标识：顶部金色绶带 + 四角星纹。
// 仅当 opts.recordCode（服务端签发码）时绘制，使金版破纪录卡与普通通关卡一眼可辨。
function drawRecordBanner(ctx, W, H, theme) {
  // 顶部金色绶带
  const grad = ctx.createLinearGradient(0, 0, 0, 40);
  grad.addColorStop(0, '#F6C453');
  grad.addColorStop(1, '#C99A2E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 40);
  ctx.fillStyle = '#5C3D00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",serif';
  ctx.fillText('🏆 破纪录 · NEW RECORD', W / 2, 20);
  // 四角星纹（避开顶部绶带与底部二维码区）
  ctx.fillStyle = '#C99A2E';
  ctx.globalAlpha = 0.5;
  ctx.font = '28px serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', 80, 120);
  ctx.fillText('✦', W - 80, 120);
  ctx.fillText('✦', 80, H - 150);
  ctx.fillText('✦', W - 80, H - 150);
  ctx.globalAlpha = 1;
}

// drawPerfectBanner 满分特别版卡专属标识：顶部金色绶带 + 四角星纹。
// 仅当 opts.perfect（客户端满分标记）时绘制，与破纪录绶带同结构、文案区分。
// 满分卡防伪码仍为前端 computeAntiFake 复算的普通 TB- 码（与破纪录卡服务端签发的 TB-R- 区分）。
function drawPerfectBanner(ctx, W, H, theme) {
  const grad = ctx.createLinearGradient(0, 0, 0, 40);
  grad.addColorStop(0, '#F6C453');
  grad.addColorStop(1, '#C99A2E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 40);
  ctx.fillStyle = '#5C3D00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 22px "PingFang SC","Microsoft YaHei",serif';
  ctx.fillText('🏆 满分 · PERFECT SCORE', W / 2, 20);
  ctx.fillStyle = '#C99A2E';
  ctx.globalAlpha = 0.5;
  ctx.font = '28px serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('✦', 80, 120);
  ctx.fillText('✦', W - 80, 120);
  ctx.fillText('✦', 80, H - 150);
  ctx.fillText('✦', W - 80, H - 150);
  ctx.globalAlpha = 1;
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
