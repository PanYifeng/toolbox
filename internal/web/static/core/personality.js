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

// renderChoice 渲染免费版/完整版二选一卡片；点击触发对应回调进入测试
export function renderChoice(el, { freeN, fullN, onFree, onFull }) {
  el.innerHTML = `
    <div class="rel-intro">
      <p class="muted">${t('ps.intro')}</p>
      <div class="ps-choice">
        <button class="ps-card" id="ps-free">
          <b class="ps-card-title">${t('ps.freeTitle')}</b>
          <span class="muted">${t('ps.freeDesc').replace('{n}', freeN)}</span>
        </button>
        <button class="ps-card ps-card-primary" id="ps-full">
          <b class="ps-card-title">${t('ps.fullTitle')}</b>
          <span class="muted">${t('ps.fullDesc').replace('{n}', fullN)}</span>
        </button>
      </div>
      <p class="muted ps-foot">${t('ps.foot')}</p>
    </div>`;
  el.querySelector('#ps-free').onclick = onFree;
  el.querySelector('#ps-full').onclick = onFull;
}
