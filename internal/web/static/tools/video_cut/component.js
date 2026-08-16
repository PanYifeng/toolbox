import { t } from '/core/i18n.js';

// render 视频截断（服务端 ffmpeg -ss/-to 流复制，提交后轮询任务状态）
export default function (el) {
  el.innerHTML = `
    <p class="muted">${t('vcut.desc')}</p>
    <input id="c-file" type="file" accept="video/*" />
    <div class="row">
      <input id="c-start" type="text" placeholder="${t('vcut.startPh')}" />
      <input id="c-end" type="text" placeholder="${t('vcut.endPh')}" />
      <button id="c-submit">${t('vcut.submit')}</button>
    </div>
    <pre id="c-out" class="muted">${t('vcut.waiting')}</pre>`;

  const $out = el.querySelector('#c-out');
  let timer = null;

  el.querySelector('#c-submit').onclick = async () => {
    const file = el.querySelector('#c-file').files[0];
    if (!file) { show(t('vcut.selectFile'), true); return; }
    const start = el.querySelector('#c-start').value.trim();
    const end = el.querySelector('#c-end').value.trim();
    if (!start && !end) { show(t('vcut.needTime'), true); return; }
    show(t('vcut.uploading'));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('start', start);
    fd.append('end', end);
    const res = await fetch('/api/tools/video_cut', { method: 'POST', body: fd });
    if (!res.ok) { show(t('vcut.uploadFail') + await res.text(), true); return; }
    const { jobId } = await res.json();
    poll(jobId);
  };

  // poll 轮询任务状态
  function poll(jobId) {
    if (timer) clearInterval(timer);
    timer = setInterval(async () => {
      const r = await fetch('/api/jobs/' + jobId);
      const j = await r.json();
      if (j.status === 'queued' || j.status === 'running') {
        show(t('vcut.processing') + j.status + ')');
      } else if (j.status === 'done') {
        clearInterval(timer);
        show(t('vcut.done') + j.downloadUrl);
        $out.className = 'ok';
        location.href = j.downloadUrl;
      } else {
        clearInterval(timer);
        show(t('vcut.fail') + (j.error || t('vcut.unknownErr')), true);
      }
    }, 2000);
  }

  function show(msg, isErr) {
    $out.textContent = msg;
    $out.className = isErr ? 'err' : 'muted';
  }
}
