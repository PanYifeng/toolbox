// 人格测试公共模块：测试前"免费版/完整版"选择卡 + 维度均衡抽题。
// 免费版取每维度前 perDim 题（题少、快速出结果）；完整版用全部题（更准确，完成后可付费看详解）。
// 复用于 MBTI / 大五人格 / DISC，避免三处重复选择 UI 与抽题逻辑。
import { t } from '/core/i18n.js';

// subsetPerDim 按维度分组，每组取前 perDim 题，再按维度出现顺序拼回数组
// （保持各维度题数均衡，免费版仍能覆盖所有维度）
export function subsetPerDim(items, perDim) {
  const byDim = {};
  const order = [];
  for (const it of items) {
    const d = it.dim;
    if (!(d in byDim)) { byDim[d] = []; order.push(d); }
    if (byDim[d].length < perDim) byDim[d].push(it);
  }
  const out = [];
  for (const d of order) out.push(...byDim[d]);
  return out;
}

// featsHTML 把 i18n 中以换行分隔的"含什么"清单拆成 <li>，缺失键返回空串
function featsHTML(key) {
  const s = t(key);
  if (!s || s === key) return '';
  return s.split('\n').filter((f) => f.trim()).map((f) => `<li>${f.trim()}</li>`).join('');
}

// renderChoice 渲染免费版/完整版二选一卡片；每张卡含"能拿到什么"清单，凸显完整版优势
export function renderChoice(el, { freeN, fullN, onFree, onFull }) {
  el.innerHTML = `
    <div class="rel-intro">
      <p class="muted">${t('ps.intro')}</p>
      <div class="ps-choice">
        <button class="ps-card" id="ps-free">
          <b class="ps-card-title">${t('ps.freeTitle')}</b>
          <span class="muted ps-card-sub">${t('ps.freeDesc').replace('{n}', freeN)}</span>
          <ul class="ps-feats">${featsHTML('ps.freeFeats')}</ul>
          <span class="muted ps-card-note">${t('ps.freeFeatsNote')}</span>
        </button>
        <button class="ps-card ps-card-primary" id="ps-full">
          <b class="ps-card-title">${t('ps.fullTitle')}</b>
          <span class="muted ps-card-sub">${t('ps.fullDesc').replace('{n}', fullN)}</span>
          <ul class="ps-feats">${featsHTML('ps.fullFeats')}</ul>
          <span class="ps-card-note ps-card-price">${t('ps.fullFeatsNote')}</span>
        </button>
      </div>
      <p class="muted ps-foot">${t('ps.foot')}</p>
    </div>`;
  el.querySelector('#ps-free').onclick = onFree;
  el.querySelector('#ps-full').onclick = onFull;
}
