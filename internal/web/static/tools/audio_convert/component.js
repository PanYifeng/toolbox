import { t } from '/core/i18n.js';

// render 音频转换（服务端 ffmpeg，提交后轮询任务状态）
export default function (el) {
  el.innerHTML = `
    <p class="muted">${t('ac.desc')}</p>
    <input id="a-file" type="file" accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac,.opus" />
    <div class="row">
      <select id="a-fmt">
        <option value="mp3">MP3</option>
        <option value="wav">WAV</option>
        <option value="flac">FLAC</option>
        <option value="ogg">OGG</option>
        <option value="m4a">M4A (AAC)</option>
      </select>
      <button id="a-submit">${t('ac.submit')}</button>
    </div>
    <pre id="a-out" class="muted">${t('ac.waiting')}</pre>`;

  const $out = el.querySelector('#a-out');
  let timer = null;

  el.querySelector('#a-submit').onclick = async () => {
    const file = el.querySelector('#a-file').files[0];
    if (!file) { show(t('ac.selectFile'), true); return; }
    const fmt = el.querySelector('#a-fmt').value;
    show(t('ac.uploading'));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('format', fmt);
    const res = await fetch('/api/tools/audio_convert', { method: 'POST', body: fd });
    if (!res.ok) { show(t('ac.uploadFail') + await res.text(), true); return; }
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
        show(t('ac.processing') + j.status + ')');
      } else if (j.status === 'done') {
        clearInterval(timer);
        show(t('ac.done') + j.downloadUrl);
        $out.className = 'ok';
        location.href = j.downloadUrl;
      } else {
        clearInterval(timer);
        show(t('ac.fail') + (j.error || t('ac.unknownErr')), true);
      }
    }, 2000);
  }

  function show(msg, isErr) {
    $out.textContent = msg;
    $out.className = isErr ? 'err' : 'muted';
  }
}
