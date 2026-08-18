import { t } from '/core/i18n.js';
import { mountProPanel, proHeaders, refreshProPanel } from '/core/pro.js';

// render 文档转换（服务端 LibreOffice，提交后轮询任务状态）
export default function (el) {
  el.innerHTML = `
    <p class="muted">${t('dc.desc')}</p>
    <input id="d-file" type="file" accept=".docx,.doc,.pdf,.odt,.rtf,.txt" />
    <div class="row">
      <select id="d-fmt">
        <option value="pdf">PDF</option>
        <option value="docx">DOCX</option>
        <option value="txt">TXT</option>
        <option value="odt">ODT</option>
        <option value="rtf">RTF</option>
        <option value="html">HTML</option>
      </select>
      <button id="d-submit">${t('dc.submit')}</button>
    </div>
    <div id="d-pro"></div>
    <pre id="d-out" class="muted">${t('dc.waiting')}</pre>`;

  mountProPanel(el.querySelector('#d-pro'));
  const $out = el.querySelector('#d-out');
  let timer = null;

  el.querySelector('#d-submit').onclick = async () => {
    const file = el.querySelector('#d-file').files[0];
    if (!file) { show(t('dc.selectFile'), true); return; }
    const fmt = el.querySelector('#d-fmt').value;
    show(t('dc.uploading'));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('format', fmt);
    const res = await fetch('/api/tools/doc_convert', { method: 'POST', body: fd, headers: proHeaders() });
    if (!res.ok) { show(t('dc.uploadFail') + await res.text(), true); return; }
    const data = await res.json();
    if (data.pro) refreshProPanel();
    poll(data.jobId);
  };

  // poll 轮询任务状态
  function poll(jobId) {
    if (timer) clearInterval(timer);
    timer = setInterval(async () => {
      const r = await fetch('/api/jobs/' + jobId);
      const j = await r.json();
      if (j.status === 'queued' || j.status === 'running') {
        show(t('dc.processing') + j.status + ')');
      } else if (j.status === 'done') {
        clearInterval(timer);
        show(t('dc.done') + j.downloadUrl);
        $out.className = 'ok';
        location.href = j.downloadUrl;
      } else {
        clearInterval(timer);
        show(t('dc.fail') + (j.error || t('dc.unknownErr')), true);
      }
    }, 2000);
  }

  function show(msg, isErr) {
    $out.textContent = msg;
    $out.className = isErr ? 'err' : 'muted';
  }
}
