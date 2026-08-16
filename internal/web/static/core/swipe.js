// bindSwipe 为元素绑定触摸滑动，识别四向后回调 'U'/'D'/'L'/'R'
export function bindSwipe(el, onDir) {
  let sx = 0, sy = 0, tracking = false;
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    tracking = true;
  }, { passive: true });
  el.addEventListener('touchend', (e) => {
    if (!tracking) return;
    tracking = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - sx;
    const dy = t.clientY - sy;
    const ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < 20) return; // 轻点不算
    if (ax > ay) onDir(dx > 0 ? 'R' : 'L');
    else onDir(dy > 0 ? 'D' : 'U');
  }, { passive: true });
}
