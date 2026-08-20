import { drawAngleArc } from './overlays/angleArc.js';
import { kinematics } from './kinematics.js';

const PIVOT_ID = 4;
const MASS_ID = 18;

let running = false;
let rafId = null;
let detector = null;

const zero = { theta: null, samples: [], stableSince: null };
let prev = null;

export function startLive(expId, stream) {
  const { video, canvas, ctx, hud } = ensureDom();
  video.srcObject = stream;
  video.play();
  running = true;
  resetZero();
  if (typeof AR === 'undefined') {
    hud.textContent = 'Erreur : js-aruco2 non charge (verifier index.html).';
    return;
  }
  detector = new AR.Detector();
  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
  };
}

export function stopLive() {
  running = false;
  if (rafId) cancelAnimationFrame(rafId);
  const video = document.getElementById('live-video');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
}

export function resetZero() {
  zero.theta = null; zero.samples = []; zero.stableSince = null; prev = null;
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
    hud.style.cssText = 'position:absolute;top:8px;left:8px;right:8px;padding:8px 12px;background:rgba(15,23,42,.8);color:#e2e8f0;border-radius:8px;font:14px sans-serif;';
    wrap.appendChild(video); wrap.appendChild(canvas); wrap.appendChild(hud);
    document.body.appendChild(wrap);
  }
  const video = document.getElementById('live-video');
  const canvas = document.getElementById('live-canvas');
  const hud = document.getElementById('live-hud');
  return { video, canvas, ctx: canvas.getContext('2d'), hud };
}

function detectMarkers(video, canvas) {
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width; tmp.height = canvas.height;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(video, 0, 0, tmp.width, tmp.height);
  const imageData = tctx.getImageData(0, 0, tmp.width, tmp.height);
  const markers = detector.detect(imageData);
  if (markers.length) console.log("detecte:", markers.map(m => m.id));
  const found = {};
  for (const mk of markers) {
    let cx = 0, cy = 0;
    for (const p of mk.corners) { cx += p.x; cy += p.y; }
    found[mk.id] = { x: cx / 4, y: cy / 4 };
  }
  return found;
}

function updateZero(rawTheta, dtheta) {
  if (zero.theta !== null) return;
  if (Math.abs(dtheta) < 0.05) {
    if (zero.stableSince === null) zero.stableSince = performance.now();
    zero.samples.push(rawTheta);
    if (performance.now() - zero.stableSince > 2000) {
      zero.theta = zero.samples.reduce((a, b) => a + b, 0) / zero.samples.length;
    }
  } else { zero.stableSince = null; zero.samples = []; }
}

function loop(video, canvas, ctx, hud) {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const found = detectMarkers(video, canvas);
  const O = found[PIVOT_ID];
  const M = found[MASS_ID];
  if (!O || !M) {
    hud.textContent = 'Cherche les marqueurs (pivot id=4, masse id=18)...';
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
    return;
  }
  const rawTheta = Math.atan2(M.x - O.x, M.y - O.y);
  const dt = 1 / 60;
  const dtheta = prev ? (rawTheta - prev.raw) / dt : 0;
  drawMarker(ctx, O, '#22c55e'); drawMarker(ctx, M, '#22c55e');
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(M.x, M.y); ctx.stroke();
  if (zero.theta === null) {
    updateZero(rawTheta, dtheta);
    hud.textContent = 'Laissez le pendule au repos pour regler la verticale...';
    prev = { raw: rawTheta };
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
    return;
  }
  const theta = rawTheta - zero.theta;
  drawAngleArc(ctx, O, M, theta, { animate: false });
  hud.textContent = 'theta = ' + (theta * 180 / Math.PI).toFixed(1) + ' deg';
  prev = { raw: rawTheta, theta: theta, dtheta: dtheta };
  rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
}

function drawMarker(ctx, p, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI); ctx.fill();
}
