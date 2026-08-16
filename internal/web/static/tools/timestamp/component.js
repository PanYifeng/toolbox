import { t } from '/core/i18n.js';

// render 时间戳 <-> 日期 双向转换
export default function (el) {
  el.innerHTML = `
    <p class="muted">${t('ts.now')}<code id="t-now"></code>
      <button id="t-copy" class="btn-soft">${t('ts.copy')}</button>
    </p>
    <h3>${t('ts.ts2date')}</h3>
    <div class="row">
      <input id="t-ts" type="text" placeholder="${t('ts.tsPlaceholder')}" />
      <button id="t-toDate">${t('json.fmt')}</button>
    </div>
    <pre id="t-date" class="muted">-</pre>
    <h3>${t('ts.date2ts')}</h3>
    <div class="row">
      <input id="t-d" type="text" placeholder="${t('ts.datePlaceholder')}" />
      <button id="t-toTs">${t('json.fmt')}</button>
    </div>
    <pre id="t-ts-out" class="muted">-</pre>`;

  const $now = el.querySelector('#t-now');
  const tick = () => ($now.textContent = Math.floor(Date.now() / 1000));
  tick();
  setInterval(tick, 1000);

  // 复制当前时间戳
  el.querySelector('#t-copy').onclick = async (e) => {
    const btn = e.currentTarget;
    try {
      await navigator.clipboard.writeText($now.textContent);
      btn.textContent = t('ts.copied');
    } catch {
      btn.textContent = t('ts.copied');
    }
    setTimeout(() => (btn.textContent = t('ts.copy')), 1200);
  };

  el.querySelector('#t-toDate').onclick = () => {
    const raw = el.querySelector('#t-ts').value.trim();
    let n = Number(raw);
    if (!raw || Number.isNaN(n)) return err('t-date', t('ts.invalidNum'));
    if (raw.length >= 13) n = Math.floor(n);
    else n = n * 1000;
    const d = new Date(n);
    el.querySelector('#t-date').textContent =
      `${t('ts.local')}${d.toLocaleString()}\n${t('ts.utc')}${d.toISOString()}`;
    el.querySelector('#t-date').className = 'ok';
  };

  el.querySelector('#t-toTs').onclick = () => {
    const s = el.querySelector('#t-d').value.trim();
    const d = new Date(s.replace(' ', 'T'));
    if (isNaN(d.getTime())) return err('t-ts-out', t('ts.invalidDate'));
    el.querySelector('#t-ts-out').textContent =
      `${t('ts.sec')}${Math.floor(d.getTime() / 1000)}\n${t('ts.ms')}${d.getTime()}`;
    el.querySelector('#t-ts-out').className = 'ok';
  };

  function err(id, msg) {
    const e = el.querySelector('#' + id);
    e.textContent = msg;
    e.className = 'err';
  }
}
