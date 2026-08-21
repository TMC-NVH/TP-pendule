function ensureDom() {
  let wrap = document.getElementById('live-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'live-wrap';
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:#000;overflow:hidden;';

    const video = document.createElement('video');
    video.id = 'live-video';
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;';

    const canvas = document.createElement('canvas');
    canvas.id = 'live-canvas';
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;';

    const hud = document.createElement('div');
    hud.id = 'live-hud';
    hud.style.cssText = 'position:absolute;top:12px;left:12px;right:12px;padding:8px 12px;background:rgba(15,23,42,.75);color:#e2e8f0;border-radius:8px;font:14px sans-serif;text-align:center;';

    const stats = document.createElement('div');
    stats.id = 'period-stats';
    stats.style.cssText = 'position:absolute;left:12px;right:12px;bottom:76px;padding:10px 14px;border-radius:10px;background:rgba(15,23,42,.8);color:#e2e8f0;font:14px sans-serif;text-align:center;';
    stats.textContent = 'Faites osciller le pendule pour mesurer la periode...';

    const controls = document.createElement('div');
    controls.id = 'period-controls';
    controls.style.cssText = 'position:absolute;left:12px;right:12px;bottom:12px;display:flex;gap:8px;justify-content:center;';

    const btnStop = document.createElement('button');
    btnStop.id = 'live-stop';
    btnStop.textContent = 'Arreter';
    btnStop.style.cssText = 'flex:1;max-width:160px;padding:12px;border:0;border-radius:10px;background:#ef4444;color:#fff;font:600 15px sans-serif;';
    btnStop.onclick = () => stopLive();

    const btnToggle = document.createElement('button');
    btnToggle.id = 'period-toggle';
    btnToggle.textContent = 'Pause mesure';
    btnToggle.style.cssText = 'flex:1;max-width:160px;padding:12px;border:0;border-radius:10px;background:#3b82f6;color:#fff;font:600 15px sans-serif;';
    btnToggle.onclick = () => toggleMeasuring();

    const btnReset = document.createElement('button');
    btnReset.id = 'period-reset';
    btnReset.textContent = 'Reset';
    btnReset.style.cssText = 'flex:1;max-width:120px;padding:12px;border:0;border-radius:10px;background:rgba(148,163,184,.3);color:#e2e8f0;font:600 15px sans-serif;';
    btnReset.onclick = () => resetPeriod();

    controls.appendChild(btnStop);
    controls.appendChild(btnToggle);
    controls.appendChild(btnReset);

    wrap.appendChild(video);
    wrap.appendChild(canvas);
    wrap.appendChild(hud);
    wrap.appendChild(stats);
    wrap.appendChild(controls);
    document.body.appendChild(wrap);
  }

  const video = document.getElementById('live-video');
  const canvas = document.getElementById('live-canvas');
  const hud = document.getElementById('live-hud');
  const stats = document.getElementById('period-stats');

  return { video, canvas, ctx: canvas.getContext('2d'), hud, stats };
}
