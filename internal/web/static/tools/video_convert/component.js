import { t } from '/core/i18n.js';

// render 视频转码（服务端 ffmpeg，提交后轮询任务状态）
export default function (el) {
  el.innerHTML = `
    <p class="muted">${t('vc.desc')}</p>
    <input id="v-file" type="file" accept="video/*" />
    <div class="row">
      <select id="v-fmt">
        <option value="mp4">MP4 (H.264)</option>
        <option value="webm">WebM</option>
        <option value="mkv">MKV</option>
        <option value="mov">MOV</option>
      </select>
      <button id="v-submit">${t('vc.submit')}</button>
    </div>
    <pre id="v-out" class="muted">${t('vc.waiting')}</pre>`;

  const $out = el.querySelector('#v-out');
  let timer = null;

  el.querySelector('#v-submit').onclick = async () => {
    const file = el.querySelector('#v-file').files[0];
    if (!file) { show(t('vc.selectFile'), true); return; }
    const fmt = el.querySelector('#v-fmt').value;
    show(t('vc.uploading'));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('format', fmt);
    const res = await fetch('/api/tools/video_convert', { method: 'POST', body: fd });
    if (!res.ok) { show(t('vc.uploadFail') + await res.text(), true); return; }
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
        show(t('vc.processing') + j.status + ')');
      } else if (j.status === 'done') {
        clearInterval(timer);
        show(t('vc.done') + j.downloadUrl);
        $out.className = 'ok';
        location.href = j.downloadUrl;
      } else {
        clearInterval(timer);
        show(t('vc.fail') + (j.error || t('vc.unknownErr')), true);
      }
    }, 2000);
  }

  function show(msg, isErr) {
    $out.textContent = msg;
    $out.className = isErr ? 'err' : 'muted';
  }
}
