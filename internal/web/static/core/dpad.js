// mountDpad 挂载屏上方向键，供触屏设备操作方向类游戏。
// onDir 回调接收 'U'/'D'/'L'/'R'。CSS 默认仅在触屏/窄屏显示（见 style.css .dpad）。
export function mountDpad(container, onDir) {
  const wrap = document.createElement('div');
  wrap.className = 'dpad';
  wrap.setAttribute('role', 'group');
  wrap.setAttribute('aria-label', 'direction pad');
  const btn = (d, label, cls) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `dpad-btn ${cls}`;
    b.dataset.d = d;
    b.textContent = label;
    const fire = (e) => { e.preventDefault(); onDir(d); };
    b.addEventListener('click', fire);
    // touchstart 即时响应，避免移动端点击延迟
    b.addEventListener('touchstart', fire, { passive: false });
    return b;
  };
  wrap.appendChild(btn('U', '▲', 'dpad-up'));
  wrap.appendChild(btn('L', '◀', 'dpad-left'));
  wrap.appendChild(btn('D', '▼', 'dpad-down'));
  wrap.appendChild(btn('R', '▶', 'dpad-right'));
  container.appendChild(wrap);
}
