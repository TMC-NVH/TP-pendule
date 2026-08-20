import { drawAngleArc } from './overlays/angleArc.js';

let running = false;
let rafId = null;

export function startLive(expId, stream) {
  const { video, canvas, ctx } = ensureDom();
  video.srcObject = stream;
  video.play();
  running = true;
  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx));
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
    wrap.appendChild(video);
    wrap.appendChild(canvas);
    document.body.appendChild(wrap);
  }
  const video = document.getElementById('live-video');
  const canvas = document.getElementById('live-canvas');
  const ctx = canvas.getContext('2d');
  return { video, canvas, ctx };
}

function loop(video, canvas, ctx) {
  if (!running) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- overlay de test : marqueurs simules pour valider l'affichage ---
  // TODO: remplacer par la detection ArUco reelle (OpenCV.js)
  const t = performance.now() / 1000;
  const O = { x: canvas.width / 2, y: canvas.height * 0.15 };
  const L = canvas.height * 0.5;
  const theta = (15 * Math.PI / 180) * Math.cos(2 * t);
  const M = { x: O.x + L * Math.sin(theta), y: O.y + L * Math.cos(theta) };

  ctx.fillStyle = '#22c55e';
  ctx.beginPath(); ctx.arc(O.x, O.y, 8, 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(M.x, M.y, 8, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(M.x, M.y); ctx.stroke();

  drawAngleArc(ctx, O, M, theta, { animate: false });

  rafId = requestAnimationFrame(() => loop(video, canvas, ctx));
}
