import { drawAngleArc } from './overlays/angleArc.js';
import { kinematics } from './kinematics.js';
import { createPeriodMeter, theoreticalPeriod } from './period.js';

const PIVOT_ID = 4;
const MASS_ID = 18;

let running = false;
let measuring = true; // mesure de période active par défaut ; bouton Pause/Reprendre pour couper
let rafId = null;
let detector = null;
let lastFrameTs = null;

const zero = {
  theta: null,
  samples: [],
  stableSince: null,
  lastM: null,
  badFrames: 0
};

let prev = null;

const periodMeter = createPeriodMeter();
const PENDULUM_LENGTH = 0.5; // metres, à saisir manuellement pour l'instant

let detectTmpCanvas = null;

export function startLive(expId, stream) {
  const { video, canvas, ctx, hud, stats } = ensureDom();

  if (typeof AR === 'undefined') {
    running = false;
    hud.textContent = 'Erreur : js-aruco2 non chargé (vérifier index.html).';
    return;
  }

  detector = new AR.Detector({ dictionaryName: 'ARUCO' });

  video.srcObject = stream;
  video.muted = true;
  video.setAttribute('playsinline', '');

  running = true;
  measuring = true;
  resetZero();

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      hud.textContent = 'Impossible de démarrer la vidéo. Vérifie les permissions caméra.';
    });
  }

  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    lastFrameTs = null;
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud, stats));
  };
}

export function stopLive() {
  running = false;
  lastFrameTs = null;

  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  const video = document.getElementById('live-video');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}

export function resetZero() {
  zero.theta = null;
  zero.samples = [];
  zero.stableSince = null;
  zero.lastM = null;
  zero.badFrames = 0;
  prev = null;
  periodMeter.reset();
}

export function resetPeriod() {
  periodMeter.reset();
}

export function toggleMeasuring() {
  measuring = !measuring;
  const btn = document.getElementById('period-toggle');
  if (btn) btn.textContent = measuring ? '⏸ Pause mesure' : '▶ Reprendre mesure';
  return measuring;
}

function ensureDom() {
  let wrap = document.getElementById('live-wrap');

  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'live-wrap';
    wrap.style.cssText = 'position:relative;max-width:480px;margin:16px auto;';

    const video = document.createElement('video');
    video.id = 'live-video';
    video.setAttribute('playsinline', '');
    video.muted = true;
    video.style.cssText = 'width:100%;display:block;border-radius:12px;';

    const canvas = document.createElement('canvas');
    canvas.id = 'live-canvas';
    canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';

    const hud = document.createElement('div');
    hud.id = 'live-hud';
    hud.style.cssText =
      'position:absolute;top:8px;left:8px;right:8px;padding:8px 12px;' +
      'background:rgba(15,23,42,.8);color:#e2e8f0;border-radius:8px;font:14px sans-serif;';

    const stats = document.createElement('div');
    stats.id = 'period-stats';
    stats.style.cssText =
      'margin-top:10px;padding:10px 14px;border-radius:10px;' +
      'background:rgba(148,163,184,.12);color:#e2e8f0;font:14px sans-serif;';
    stats.textContent = 'Faites osciller le pendule pour mesurer la période...';

    const controls = document.createElement('div');
    controls.id = 'period-controls';
    controls.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

    const btnToggle = document.createElement('button');
    btnToggle.id = 'period-toggle';
    btnToggle.className = 'btn-primary';
    btnToggle.textContent = '⏸ Pause mesure';
    btnToggle.onclick = () => toggleMeasuring();

    const btnReset = document.createElement('button');
    btnReset.id = 'period-reset';
    btnReset.className = 'btn-link';
    btnReset.textContent = 'Réinitialiser la mesure';
    btnReset.onclick = () => resetPeriod();

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

function detectMarkers(video, canvas) {
  if (!detectTmpCanvas) {
    detectTmpCanvas = document.createElement('canvas');
  }

  detectTmpCanvas.width = canvas.width;
  detectTmpCanvas.height = canvas.height;

  const tctx = detectTmpCanvas.getContext('2d');
  tctx.drawImage(video, 0, 0, detectTmpCanvas.width, detectTmpCanvas.height);

  const imageData = tctx.getImageData(0, 0, detectTmpCanvas.width, detectTmpCanvas.height);
  const markers = detector.detect(imageData);

  if (markers.length) {
    console.log('detecté :', markers.map(m => m.id));
  }

  const found = {};
  for (const mk of markers) {
    let cx = 0;
    let cy = 0;
    for (const p of mk.corners) {
      cx += p.x;
      cy += p.y;
    }
    found[mk.id] = { x: cx / 4, y: cy / 4 };
  }

  return found;
}

function normalizeAngle(a) {
  while (a <= -Math.PI) a += 2 * Math.PI;
  while (a > Math.PI) a -= 2 * Math.PI;
  return a;
}

function updateZero(rawTheta, M, hud, nowMs) {
  if (zero.theta !== null) return;

  const moved = zero.lastM ? Math.hypot(M.x - zero.lastM.x, M.y - zero.lastM.y) : Infinity;
  zero.lastM = { x: M.x, y: M.y };

  const STABLE_PX = 4;   // tolérance de mouvement
  const HOLD_MS = 1500;  // durée de stabilité requise
  const GRACE = 5;       // frames instables tolérées avant reset

  if (moved < STABLE_PX) {
    zero.badFrames = 0;

    if (zero.stableSince === null) {
      zero.stableSince = nowMs;
      zero.samples = [];
    }

    zero.samples.push(rawTheta);

    const held = nowMs - zero.stableSince;
    if (hud) {
      hud.textContent =
        'Verticale : maintenez immobile... ' +
        Math.min(100, Math.round((held / HOLD_MS) * 100)) + '%';
    }

    if (held > HOLD_MS && zero.samples.length > 10) {
      zero.theta = zero.samples.reduce((a, b) => a + b, 0) / zero.samples.length;
      if (hud) {
        hud.textContent = 'Zéro calibré, vous pouvez lancer le pendule.';
      }
    }
  } else {
    zero.badFrames += 1;
    if (zero.badFrames > GRACE) {
      zero.stableSince = null;
      zero.samples = [];
    }
  }
}

function drawMarker(ctx, p, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI);
  ctx.fill();
}

function loop(video, canvas, ctx, hud, stats) {
  if (!running) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const nowMs = performance.now();
  const dt = lastFrameTs !== null ? (nowMs - lastFrameTs) / 1000 : 1 / 60;
  lastFrameTs = nowMs;

  const found = detectMarkers(video, canvas);
  const O = found[PIVOT_ID];
  const M = found[MASS_ID];

  if (!O || !M) {
    hud.textContent = 'Marqueurs non détectés (pivot=' + PIVOT_ID + ', masse=' + MASS_ID + ')...';
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud, stats));
    return;
  }

  const rawTheta = Math.atan2(M.x - O.x, M.y - O.y);

  drawMarker(ctx, O, '#22c55e');
  drawMarker(ctx, M, '#22c55e');
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(O.x, O.y);
  ctx.lineTo(M.x, M.y);
  ctx.stroke();

  if (zero.theta === null) {
    updateZero(rawTheta, M, hud, nowMs);
    prev = { raw: rawTheta };
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud, stats));
    return;
  }

  const theta = normalizeAngle(rawTheta - zero.theta);
  const dtheta = prev && prev.theta !== undefined ? (theta - prev.theta) / dt : 0;

  drawAngleArc(ctx, O, M, theta, { animate: false });

  hud.textContent = 'theta = ' + (theta * 180 / Math.PI).toFixed(1) + ' deg';

  if (measuring) {
    const t = nowMs / 1000;
    const pm = periodMeter.update(theta, t);
    const Tth = theoreticalPeriod(PENDULUM_LENGTH);

    if (stats) {
      if (pm.period) {
        const ecart = (pm.period - Tth) / Tth * 100;
        stats.textContent =
          'T mesurée = ' + pm.period.toFixed(3) + ' s' +
          '  (théo. ' + Tth.toFixed(3) + ' s, écart ' + ecart.toFixed(1) + '%)' +
          '  |  ' + pm.count + ' période(s) comptée(s)';
      } else {
        stats.textContent = 'Faites osciller le pendule pour mesurer la période...';
      }
    }
  } else if (stats) {
    stats.textContent = 'Mesure en pause. Dernière valeur : ' +
      (periodMeter.snapshot().period ? periodMeter.snapshot().period.toFixed(3) + ' s' : 'aucune');
  }

  prev = { raw: rawTheta, theta: theta, dtheta: dtheta };
  rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud, stats));
}
