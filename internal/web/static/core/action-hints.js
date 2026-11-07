// 操作提示条：每回合在操作区顶部列出「现在能做什么 / 为什么做不了」。
// 各游戏在 render 时构造 [{icon,label,ok,count,detail,why}]：
// 可做项显示 ✅ + 可选数量 + 附注（费用等）；不可做项显示 ⛔ + 原因（典型是缺多少资源）。
// 目的：玩家不必靠点棋盘试错，也不会把「按钮缺失」误读成「功能没实现」。
import { getLang, t } from '/core/i18n.js';

// okHint 可用项：count 为可选位置/次数（>1 显示 ×n），detail 为费用等附注
export function okHint(icon, label, count, detail) {
  return { icon: icon || '', label, ok: true, count: count || 0, detail: detail || '' };
}

// noHint 不可用项：why 为原因文案
export function noHint(icon, label, why) {
  return { icon: icon || '', label, ok: false, why: why || '' };
}

// renderActionHints 渲染提示条（无任何项时不占位）
export function renderActionHints(items) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return '';
  const chips = list.map((it) => (it.ok ? okChip(it) : noChip(it))).join('');
  return `<div class="ah-list" title="${esc(t('bg.hint.title'))}">${chips}</div>`;
}

function okChip(it) {
  const n = it.count > 1 ? ` ×${it.count}` : '';
  const detail = it.detail ? ` <i>${esc(it.detail)}</i>` : '';
  return `<span class="ah-chip ah-ok">✅ ${icon(it)}${esc(it.label)}${n}${detail}</span>`;
}

function noChip(it) {
  return `<span class="ah-chip ah-no">⛔ ${icon(it)}${esc(it.label)}${it.why ? ` · ${esc(it.why)}` : ''}</span>`;
}

// lackOf 资源缺口串：pairs 为 [[显示名, 需要, 拥有], ...]，输出「💰×2 👷×1」，无缺口返回空串
export function lackOf(pairs) {
  return (pairs || [])
    .filter(([, need, have]) => (need || 0) > (have || 0))
    .map(([name, need, have]) => `${name}×${need - have}`)
    .join(' ');
}

// reasonLack 缺资源原因文案（无缺口时退回通用「暂不可用」）
export function reasonLack(pairs) {
  const d = lackOf(pairs);
  return d ? fmtArgs(t('bg.hint.lack'), { d }) : t('bg.hint.none');
}

// reasonCap 已达建筑/棋子上限
export function reasonCap() { return t('bg.hint.cap'); }

// reasonNoSpot 成本够但没有合法位置
export function reasonNoSpot() { return t('bg.hint.noSpot'); }

// fmtArgs 极简 {k} 插值（i18n 的 t() 不支持参数）
export function fmtArgs(template, args) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (args && args[k] !== undefined ? String(args[k]) : m));
}

// costStr 费用串：[[显示名, 数量], ...] 只列非零项，如「💰2 👷1」
export function costStr(pairs) {
  return (pairs || []).filter(([, n]) => n > 0).map(([name, n]) => `${name}${n}`).join(' ');
}

function icon(it) { return it.icon ? `${it.icon} ` : ''; }

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// langOf 当前语言标记（供各游戏在动态文案里选词）
export function langOf() { return getLang(); }
