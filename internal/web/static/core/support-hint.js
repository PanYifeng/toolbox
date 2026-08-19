// 场景化赞助提示：在重资源工具完成时柔和展示，不打断下载。
// 频率控制：localStorage 24h 冷却；Pro 用户跳过；可手动关闭。
import { t, tr } from '/core/i18n.js';

const COOLDOWN_KEY = 'supportHintCooldown';
const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 小时冷却，避免反复打扰

// isProUser 是否已开通 Pro（已付费用户不再提示赞助）
function isProUser() {
  return !!localStorage.getItem('pro_token');
}

// inCooldown 是否在冷却期内（已展示过且未过冷却窗口）
function inCooldown() {
  const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
  return last > 0 && Date.now() - last < COOLDOWN_MS;
}

// markShown 记录本次展示时间，启动冷却
function markShown() {
  try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch (e) {}
}

// showSupportHint 在工具完成容器末尾追加轻量赞助提示
export function showSupportHint(container) {
  if (!container) return;
  const d = window.BOOT && window.BOOT.donation;
  if (!d || !d.enabled) return;                          // 赞助未开启
  if (isProUser()) return;                               // Pro 用户跳过
  if (inCooldown()) return;                              // 冷却期内跳过
  if (container.querySelector('.support-hint')) return;  // 已存在不重复
  const links = (d.links || []).filter((l) => l.sponsored);
  if (!links.length) return;
  const items = links
    .map((l) => {
      const label = tr(l.label);
      const hint = tr(l.hint);
      return `<a class="sh-link" href="${l.url}" target="_blank" rel="nofollow sponsored noopener noreferrer">${label}${hint ? ` <span class="sh-hint">${hint}</span>` : ''}</a>`;
    })
    .join('');
  const node = document.createElement('div');
  node.className = 'support-hint';
  node.innerHTML = `<span class="sh-text">💡 ${t('support.hint')}</span><div class="sh-links">${items}</div><button class="sh-close" type="button" aria-label="${t('support.close')}">✕</button>`;
  container.appendChild(node);
  markShown();
  node.querySelector('.sh-close').onclick = () => node.remove();
}
