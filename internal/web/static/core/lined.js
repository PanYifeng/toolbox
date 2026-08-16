// enhanceLined 为容器内所有 textarea 自动套上行号槽。
// 已在 .lined 内或已处理的跳过；拦截程序化 value 赋值以同步行号。
export function enhanceLined(scope) {
  scope.querySelectorAll('textarea').forEach((ta) => {
    if (ta.closest('.lined') || ta.dataset.lined) return;
    setupLined(ta);
  });
}

// setupLined 把 textarea 包进 .lined 容器并绑定行号槽
function setupLined(ta) {
  ta.dataset.lined = '1';
  const wrap = document.createElement('div');
  wrap.className = 'lined';
  const gutter = document.createElement('div');
  gutter.className = 'gutter';
  ta.parentNode.insertBefore(wrap, ta);
  wrap.appendChild(gutter);
  wrap.appendChild(ta);

  const update = () => {
    const n = Math.max(1, ta.value.split('\n').length);
    let s = '';
    for (let i = 1; i <= n; i++) s += i + '\n';
    gutter.textContent = s;
  };
  update();
  ta.addEventListener('input', update);
  ta.addEventListener('scroll', () => {
    gutter.scrollTop = ta.scrollTop;
  });

  // 拦截程序化 value 赋值（如工具把结果写入输出框），同步行号
  const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
  if (desc && desc.set) {
    Object.defineProperty(ta, 'value', {
      get: desc.get,
      set(v) {
        desc.set.call(ta, v);
        update();
      },
      configurable: true,
    });
  }
}
