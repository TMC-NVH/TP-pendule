const angleAnim = { shown: 0 };
export function drawAngleArc(ctx, O, M, theta, opts = {}) {
  const { animate = true, ease = 0.25 } = opts;
  angleAnim.shown += animate ? (theta - angleAnim.shown) * ease : (theta - angleAnim.shown);
  const th = angleAnim.shown;
  const R = Math.min(80, Math.hypot(M.x - O.x, M.y - O.y) * 0.6);
  const start = Math.PI / 2;
  ctx.save();
  ctx.setLineDash([6, 6]); ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(O.x, O.y + R + 25); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "rgba(14,165,233,0.15)";
  ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.arc(O.x, O.y, R, start, start - th, th > 0); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#0ea5e9"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(O.x, O.y, R, start, start - th, th > 0); ctx.stroke();
  const deg = th * 180 / Math.PI;
  ctx.font = "bold 18px sans-serif"; ctx.fillStyle = "#0ea5e9";
  const mid = start - th / 2;
  ctx.fillText("theta = " + deg.toFixed(1) + " deg", O.x + (R + 16) * Math.cos(mid), O.y + (R + 16) * Math.sin(mid));
  ctx.restore();
}
