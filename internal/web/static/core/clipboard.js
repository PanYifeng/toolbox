// 剪贴板兼容层：navigator.clipboard 只在安全上下文（HTTPS / localhost）暴露，
// 用普通 IP 经 HTTP 访问时是 undefined。这里统一降级到 textarea + execCommand，
// 并把「是否真的复制成功」如实返回，避免按钮显示「已复制」而实际什么都没发生。
import { t } from '/core/i18n.js';

// copyText 复制文本，返回 Promise<boolean>（true = 确实写入了剪贴板）。
export async function copyText(text) {
  const s = String(text ?? '');
  if (!s) return false;
  const clip = navigator.clipboard;
  if (clip && typeof clip.writeText === 'function') {
    try {
      await clip.writeText(s);
      return true;
    } catch { /* 权限被拒/非安全上下文 → 走降级 */ }
  }
  return execCopy(s);
}

// execCopy 降级路径：临时 textarea + document.execCommand('copy')。
// readOnly 防移动端键盘弹出，fixed 定位防页面滚动跳动。
export function execCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.position = 'fixed';
  ta.style.top = '-1000px';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  let done = false;
  try {
    ta.select();
    ta.setSelectionRange(0, text.length); // iOS 下 select 对 readonly 文本不生效
    done = document.execCommand('copy');
  } catch {
    done = false;
  }
  ta.remove();
  return done;
}

// flashCopy 复制并在按钮上给出如实反馈：成功显示「已复制 ✓」，失败显示「复制失败」。
// 返回实际结果，调用方可据此追加 toast 等提示。
export async function flashCopy(btn, text, restore, ms = 1400) {
  const ok = await copyText(text);
  if (btn) {
    btn.textContent = ok ? t('common.copied') : t('common.copyFail');
    setTimeout(() => { btn.textContent = restore; }, ms);
  }
  return ok;
}
