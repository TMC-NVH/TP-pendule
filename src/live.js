import { drawAngleArc } from './overlays/angleArc.js';
import { kinematics } from './kinematics.js';
import { createPeriodMeter, theoreticalPeriod } from './period.js';

const PIVOT_ID = 4;
const MASS_ID = 18;

let running = false;
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
  const { video, canvas, ctx, hud } = ensureDom();

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
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
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

    wrap.appendChild(video);
    wrap.appendChild(canvas);
    wrap.appendChild(hud);
    document.body.appendChild(wrap);
  }

  const video = document.getElementById('live-video');
  const canvas = document.getElementById('live-canvas');
  const hud = document.getElementById('live-hud');

  return { video, canvas, ctx: canvas.getContext('2d'), hud };
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
        hud.textContent = 'Zero calibré, vous pouvez lancer l