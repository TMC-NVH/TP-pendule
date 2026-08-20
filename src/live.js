import { drawAngleArc } from './overlays/angleArc.js';
import { kinematics } from './kinematics.js';

let running = false;
let rafId = null;
let detector = null;
let dict = null;

const zero = { theta: null, samples: [], stableSince: null };
let prevK = null;

export function startLive(expId, stream) {
  const { video, canvas, ctx, hud } = ensureDom();
  video.srcObject = stream;
  video.play();
  running = true;
  resetZero();
  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    waitForCv(hud).then(() => {
      dict = cv.getPredefinedDictionary(cv.DICT_4X4_50);
      detector = new cv.aruco_ArucoDetector(dict, new cv.aruco_DetectorParameters());
      rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
    });
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
  zero.theta = null; zero.samples = []; zero.stableSince = null;
  prevK = null;
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
    wrap.appendChild(video);
    wrap.appendChild(canvas);
    wrap.appendChild(hud);
    document.body.appendChild(wrap);
  }
  const video = document.getElementById('live-video');
  const canvas = document.getElementById('live-canvas');
  const hud = document.getElementById('live-hud');
  const ctx = canvas.getContext('2d');
  return { video, canvas, ctx, hud };
}

function waitForCv(hud) {
  return new Promise((resolve) => {
    hud.textContent = 'Chargement de la vision (OpenCV)...';
    const check = () => {
      if (window.cv && cv.Mat && cv.getPredefinedDictionary) resolve();
      else setTimeout(check, 200);
    };
    check();
  });
}

function detectMarkers(video, canvas) {
  const tmp = document.createElement('canvas');
  tmp.width = canvas.width; tmp.height = canvas.height;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(video, 0, 0, tmp.width, tmp.height);
  const src = cv.imread(tmp);
  const gray = new cv.Mat();
  cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
  const corners = new cv.MatVector();
  const ids = new cv.Mat();
  const rejected = new cv.MatVector();
  detector.detectMarkers(gray, corners, ids, rejected);
  const found = {};
  for (let i = 0; i < ids.rows; i++) {
    const id = ids.intAt(i, 0);
    const c = corners.get(i);
    let cx = 0, cy = 0;
    for (let j = 0; j < 4; j++) { cx += c.floatAt(0, j * 2); cy += c.floatAt(0, j * 2 + 1); }
    found[id] = { x: cx / 4, y: cy / 4 };
    c.delete();
  }
  src.delete(); gray.delete(); corners.delete(); ids.delete(); rejected.delete();
  return found;
}

function updateZero(rawTheta, dtheta) {
  if (zero.theta !== null) return;
  const stable = Math.abs(dtheta) < 0.05;
  if (stable) {
    if (zero.stableSince === null) zero.stableSince = performance.now();
    zero.samples.push(rawTheta);
    if (performance.now() - zero.stableSince > 2000) {
      zero.theta = zero.samples.reduce((a, b) => a + b, 0) / zero.samples.length;
    }
  } else {
    zero.stableSince = null; zero.samples = [];
  }
}

function loop(video, canvas, ctx, hud) {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const found = detectMarkers(video, canvas);
  const O = found[0];
  const M = found[1];
  if (!O || !M) {
    hud.textContent = 'Cherche les marqueurs (pivot id=0, masse id=1)...';
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
    return;
  }
  const rawTheta = Math.atan2(M.x - O.x, M.y - O.y);
  const dt = 1 / 60;
  const dtheta = prevK ? (rawTheta - prevK.raw) / dt : 0;
  if (zero.theta === null) {
    updateZero(rawTheta, dtheta);
    hud.textContent = 'Laissez le pendule au repos pour regler la verticale...';
    drawMarker(ctx, O, '#22c55e'); drawMarker(ctx, M, '#22c55e');
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(M.x, M.y); ctx.stroke();
    prevK = { raw: rawTheta };
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
    return;
  }
  const theta = rawTheta - zero.theta;
  const k = kinematics(O, M, prevK ? { theta: prevK.theta, dtheta: prevK.dtheta } : null, dt, 300);
  k.theta = theta;
  prevK = { raw: rawTheta, theta: theta, dtheta: dtheta };
  drawMarker(ctx, O, '#22c55e'); drawMarker(ctx, M, '#22c55e');
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(M.x, M.y); ctx.stroke();
  drawAngleArc(ctx, O, M, theta, { animate: false });
  hud.textContent = 'theta = ' + (theta * 180 / Math.PI).toFixed(1) + ' deg';
  rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud));
}

function drawMarker(ctx, p, color) {
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, 2 * Math.PI); ctx.fill();
}
