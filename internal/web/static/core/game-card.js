// mountGameCard 为小游戏挂载"通关纪念卡 + 排行榜"入口：一键生成卡即自动入榜，
// 破纪录直接展示金版卡预览（锁定，防伪码占位）+ 站主确认门核验下载。前十榜单常驻。
// 普通卡沿用前端复算，始终免费；破纪录金版卡由服务端 HMAC 签发 TB-R- 码，经核验通过后才下发下载。

import { t } from '/core/i18n.js';
import { renderMemorialCard, downloadPng } from '/core/cert.js';
import { genTxid, remarkHint } from '/core/pay-notify.js';

// featOn 读功能开关（app.js 把 BOOT 挂到 window，模块经 window.BOOT 读取）
function featOn(key) {
  return !!(window.BOOT && window.BOOT.features && window.BOOT.features[key]);
}

// escapeHTML 转义榜单用户输入，防注入
function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

const NAME_KEY = 'tb-lb-name';
function loadName() { return localStorage.getItem(NAME_KEY) || ''; }
function saveName(n) { localStorage.setItem(NAME_KEY, n); }
function claimKey(gameId) { return `tb-record-claim-${gameId}`; }
function loadClaim(gameId) {
  try { return JSON.parse(localStorage.getItem(claimKey(gameId)) || 'null'); } catch { return null; }
}
function saveClaim(gameId, ctx) { localStorage.setItem(claimKey(gameId), JSON.stringify(ctx)); }

// mountGameCard 挂载排行榜 + 纪念卡入口
export function mountGameCard(container, getScore, gameName) {
  if (!featOn('memorialCard')) return;
  const gameId = `game-${gameName}`;
  const lbOn = featOn('leaderboard');
  const wrap = document.createElement('div');
  wrap.className = 'game-card-wrap';
  wrap.innerHTML = renderShell(lbOn);
  container.appendChild(wrap);
  const $form = wrap.querySelector('#gc-form');
  wrap.querySelector('#gc-name').value = loadName();
  // 不在进游戏时自动展开纪念卡表单、不自动拉取历史破纪录卡。
  // 此前每次进游戏都会展开表单并重新渲染旧战绩卡（localStorage 里的 claim 跨刷新仍在），
  // 体验上像缓存 bug；改为用户点击展开时按需恢复核验态。
  let restored = false;
  wrap.querySelector('#gc-toggle').onclick = () => {
    const open = $form.style.display === 'none';
    $form.style.display = open ? 'block' : 'none';
    if (open && !restored && lbOn) { restored = true; restoreClaim(wrap, gameId, gameName); }
  };
  wrap.querySelector('#gc-gen').onclick = () => onGenerate(wrap, gameId, gameName, getScore);
  if (lbOn) loadLeaderboard(wrap, gameId);
}

// renderShell 排行榜 + 折叠表单骨架（姓名 + 一键生成卡按钮，无单独提交按钮）
function renderShell(lbOn) {
  return `
    ${lbOn ? `
    <div class="lb-section">
      <h4 class="lb-title">🏆 ${t('lb.title')}</h4>
      <div id="lb-list" class="lb-list"><p class="muted">${t('lb.loading')}</p></div>
    </div>` : ''}
    <button id="gc-toggle" class="btn-soft">${t('game.genCard')}</button>
    <div id="gc-form" class="gc-form" style="display:none">
      <p class="muted">${t('game.cardDesc')}</p>
      <label>${t('rel.name')} <input id="gc-name" type="text" maxlength="30"></label>
      <button id="gc-gen" class="btn">${t('game.genCard')}</button>
      ${lbOn ? `<p class="muted lb-autorec">${t('lb.autoRecorded')}</p>` : ''}
      <div id="gc-result"></div>
      <div id="gc-out"></div>
    </div>`;
}

// onGenerate 一键：存名 → 自动提交榜单 → 破纪录展示金版预览+核验门 / 否则普通卡
async function onGenerate(wrap, gameId, gameName, getScore) {
  const name = wrap.querySelector('#gc-name').value.trim();
  if (!name) { alert(t('rel.needName')); return; }
  saveName(name);
  const score = getScore();
  const $res = wrap.querySelector('#gc-result');
  wrap.querySelector('#gc-out').innerHTML = '';
  const card = { gameId, gameName, name, score };
  if (!featOn('leaderboard')) { renderNormalCard(wrap, card); return; }
  $res.innerHTML = `<p class="muted">${t('lb.submitting')}</p>`;
  let d;
  try {
    const r = await fetch(`/api/leaderboard/${gameId}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, score }),
    });
    d = await r.json();
    if (d.entries) renderLeaderboard(wrap.querySelector('#lb-list'), d.entries);
    if (!r.ok) { $res.innerHTML = `<p class="err">${d.message || t('lb.loadFail')}</p>`; return; }
  } catch (err) {
    $res.innerHTML = `<p class="err">${t('lb.loadFail')}</p>`;
    return;
  }
  if (d.isRecord) {
    const ctx = rvCtx(gameId, gameName, name, score, d.claimId, d.recordTime);
    saveClaim(gameId, ctx);
    renderRecordFlow(wrap, ctx);
  } else {
    $res.innerHTML = `<p class="muted">${t('lb.rankN').replace('{n}', d.rank)} · ${t('lb.keepGoing')}</p>`;
    renderNormalCard(wrap, card);
  }
}

// rvCtx 构造破纪录核验上下文（前端持有，用于渲染预览/表单/最终卡）
function rvCtx(gameId, gameName, name, score, claimId, recordTime) {
  return { gameId, gameName, name, score, claimId, recordTime, txid: null };
}

// renderRecordFlow 破纪录：直接展示金版卡预览（锁定，防伪码占位）+ 核验表单 + 普通卡入口
async function renderRecordFlow(wrap, ctx) {
  const $res = wrap.querySelector('#gc-result');
  $res.innerHTML = `<p class="ok">🏆 ${t('lb.newRecord')}</p><div id="rv-preview"></div>`;
  const $prev = $res.querySelector('#rv-preview');
  $prev.innerHTML = `<p class="muted">${t('rel.gening')}</p>`;
  try {
    const { dataUrl } = await renderMemorialCard({
      themeKey: ctx.gameId, name: ctx.name, score: ctx.score,
      displayTime: ctx.recordTime, recordPending: true,
    });
    $prev.innerHTML = `<img class="rc-preview" src="${dataUrl}" alt="gold card preview">`;
  } catch (err) {
    $prev.innerHTML = `<p class="err">${t('rel.genFail')}</p>`;
  }
  renderVerifyForm(wrap, ctx);
  const $alt = document.createElement('p');
  $alt.className = 'muted';
  $alt.innerHTML = `<a href="#" id="rv-normal">${t('lb.normalCardHint')}</a>`;
  $res.appendChild($alt);
  $alt.querySelector('#rv-normal').onclick = (e) => {
    e.preventDefault();
    renderNormalCard(wrap, { gameId: ctx.gameId, gameName: ctx.gameName, name: ctx.name, score: ctx.score });
  };
}

// renderVerifyForm 金版卡核验表单：收款码 + TXID 备注 + 邮箱 + 提交按钮
function renderVerifyForm(wrap, ctx) {
  if (!ctx.txid) { ctx.txid = genTxid('RD'); saveClaim(ctx.gameId, ctx); }
  const $res = wrap.querySelector('#gc-result');
  const $form = document.createElement('div');
  $form.className = 'lb-upgrade';
  $form.innerHTML = `
    <p class="lb-upgrade-desc">${t('lb.verifyDesc')}</p>
    <div class="lb-qr">
      <div><img src="/img/donate-alipay.jpg" alt="Alipay"><p class="lb-pay-name">${t('pay.alipay')}</p><p class="muted">${t('lb.payHint')}</p></div>
      <div><img src="/img/donate-wechat.png" alt="WeChat Pay"><p class="lb-pay-name">${t('pay.wechat')}</p><p class="muted">${t('lb.payHint')}</p></div>
    </div>
    ${remarkHint(ctx.txid)}
    <label>${t('lb.verifyEmail')} <input id="rv-email" type="email" placeholder="${t('lb.verifyEmailPh')}"></label>
    <button id="rv-submit" class="btn">${t('lb.verifySubmit')}</button>`;
  $res.appendChild($form);
  $form.querySelector('#rv-submit').onclick = () => submitClaim(wrap, ctx);
}

// submitClaim 提交核验申请：校验邮箱 → POST /api/game/record-claim → 待核验态
async function submitClaim(wrap, ctx) {
  const email = wrap.querySelector('#rv-email').value.trim();
  if (!email || !/.+@.+\..+/.test(email)) { alert(t('lb.verifyNeedEmail')); return; }
  const $btn = wrap.querySelector('#rv-submit');
  if ($btn) $btn.disabled = true;
  try {
    const r = await fetch('/api/game/record-claim', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ claimId: ctx.claimId, email, txId: ctx.txid }),
    });
    const d = await r.json();
    if (!r.ok) { if ($btn) $btn.disabled = false; alert(d.message || t('lb.verifyClaimFail')); return; }
    renderPending(wrap, ctx);
  } catch (err) {
    if ($btn) $btn.disabled = false;
    alert(t('lb.verifyClaimFail'));
  }
}

// renderPending 待核验态：提示 + 刷新状态按钮（用户收到通过邮件后回页点）
function renderPending(wrap, ctx) {
  const $res = wrap.querySelector('#gc-result');
  $res.innerHTML = `
    <p class="ok">🏆 ${t('lb.newRecord')}</p>
    <p class="muted">${t('lb.verifyPending')}</p>
    <button id="rv-refresh" class="btn-soft">${t('lb.verifyRefresh')}</button>`;
  $res.querySelector('#rv-refresh').onclick = () => checkStatus(wrap, ctx);
}

// checkStatus 查询核验状态：通过则渲染完整金版卡 + 下载；已填表回待核验，未填回表单
async function checkStatus(wrap, ctx) {
  const $res = wrap.querySelector('#gc-result');
  $res.innerHTML = `<p class="muted">${t('lb.verifyChecking')}</p>`;
  let d;
  try {
    const r = await fetch(`/api/game/record-status?id=${encodeURIComponent(ctx.claimId)}`);
    d = await r.json();
    if (!r.ok) { $res.innerHTML = `<p class="err">${t('lb.loadFail')}</p>`; return; }
  } catch (err) {
    $res.innerHTML = `<p class="err">${t('lb.loadFail')}</p>`;
    return;
  }
  if (d.status === 'approved') {
    ctx.name = d.name; ctx.score = d.score; ctx.recordTime = d.time;
    renderApprovedCard(wrap, ctx, d.signedCode);
  } else if (d.filled) {
    renderPending(wrap, ctx);
  } else {
    renderVerifyForm(wrap, ctx);
  }
}

// renderApprovedCard 核验通过：渲染完整金版卡（服务端签发码）+ 下载按钮
async function renderApprovedCard(wrap, ctx, code) {
  const $res = wrap.querySelector('#gc-result');
  const $out = wrap.querySelector('#gc-out');
  $res.innerHTML = `<p class="ok">${t('lb.verifyApproved')}</p>`;
  $out.innerHTML = `<p class="muted">${t('rel.gening')}</p>`;
  try {
    const { dataUrl } = await renderMemorialCard({
      themeKey: ctx.gameId, name: ctx.name, score: ctx.score,
      displayTime: ctx.recordTime, recordCode: code, showDonate: true,
    });
    $out.innerHTML = `
      <p class="ok">${t('lb.serverSigned')}</p>
      <img class="rc-preview" src="${dataUrl}" alt="gold record card">
      <button id="gc-dl" class="btn">${t('rel.download')}</button>`;
    $out.querySelector('#gc-dl').onclick = () => downloadPng(dataUrl, `${ctx.gameName}-record.png`);
  } catch (err) {
    $out.innerHTML = `<p class="err">${t('rel.genFail')}</p>`;
  }
}

// restoreClaim 回访：若本地有破纪录核销申请，展开表单并恢复状态（通过则直接出卡）
function restoreClaim(wrap, gameId, gameName) {
  const saved = loadClaim(gameId);
  if (!saved || !saved.claimId) return;
  const ctx = {
    gameId, gameName, name: saved.name, score: saved.score,
    claimId: saved.claimId, recordTime: saved.recordTime, txid: saved.txid || null,
  };
  // 表单已由 toggle 展开；此处仅恢复核验状态，不再强制展开（避免每次进游戏弹出旧战绩）
  wrap.querySelector('#gc-result').innerHTML = `<p class="muted">${t('lb.verifyRestored')}</p>`;
  checkStatus(wrap, ctx);
}

// renderNormalCard 普通通关纪念卡（普通防伪码，前端复算，始终免费）渲染到 #gc-out
async function renderNormalCard(wrap, card) {
  const $out = wrap.querySelector('#gc-out');
  $out.innerHTML = `<p class="muted">${t('rel.gening')}</p>`;
  try {
    const { dataUrl } = await renderMemorialCard({
      themeKey: card.gameId, name: card.name, score: card.score, showDonate: true,
    });
    $out.innerHTML = `
      <img class="rc-preview" src="${dataUrl}" alt="memorial card">
      <button id="gc-dl" class="btn">${t('rel.download')}</button>`;
    $out.querySelector('#gc-dl').onclick = () => downloadPng(dataUrl, `${card.gameName}-memorial.png`);
  } catch (err) {
    $out.innerHTML = `<p class="err">${t('rel.genFail')}</p>`;
  }
}

// loadLeaderboard 拉取并渲染前十名
async function loadLeaderboard(wrap, gameId) {
  const $list = wrap.querySelector('#lb-list');
  try {
    const r = await fetch(`/api/leaderboard/${gameId}`);
    const d = await r.json();
    renderLeaderboard($list, d.entries || []);
  } catch (err) {
    $list.innerHTML = `<p class="muted">${t('lb.loadFail')}</p>`;
  }
}

// renderLeaderboard 渲染前十名表
function renderLeaderboard($list, entries) {
  if (!entries.length) {
    $list.innerHTML = `<p class="muted">${t('lb.empty')}</p>`;
    return;
  }
  $list.innerHTML = `
    <table class="lb-table">
      <thead><tr><th>#</th><th>${t('lb.colName')}</th><th>${t('lb.colScore')}</th><th>${t('lb.colTime')}</th></tr></thead>
      <tbody>${entries.map((e, i) => `
        <tr><td>${i + 1}</td><td>${escapeHTML(e.name)}</td><td>${e.score}</td><td>${escapeHTML(e.time)}</td></tr>`).join('')}
      </tbody>
    </table>`;
}
