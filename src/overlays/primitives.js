export function drawArrow(ctx, from, vec, color, label, scale = 1) {
  const to = { x: from.x + vec.x * scale, y: from.y + vec.y * scale };
  ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(to.x, to.y); ctx.stroke();
  const a = Math.atan2(to.y - from.y, to.x - from.x), h = 10;
  ctx.beginPath(); ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - h * Math.cos(a - 0.4), to.y - h * Math.sin(a - 0.4));
  ctx.lineTo(to.x - h * Math.cos(a + 0.4), to.y - h * Math.sin(a + 0.4));
  ctx.closePath(); ctx.fill();
  if (label) ctx.fillText(label, to.x + 6, to.y);
}
export function drawFil(ctx, O, M) {
  ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(O.x, O.y); ctx.lineTo(M.x, M.y); ctx.stroke();
}
export function drawDashed(ctx, from, unit, scale, color) {
  ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(from.x, from.y);
  ctx.lineTo(from.x + unit.x * scale, from.y + unit.y * scale); ctx.stroke(); ctx.restore();
}
export function drawDashedLine(ctx, a, b, color) {
  ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
}
export function drawLabel(ctx, at, text, color) {
  ctx.fillStyle = color; ctx.font = '13px sans-serif'; ctx.fillText(text, at.x + 8, at.y - 8);
}
export function drawGauge(ctx, x, value, max, color, label) {
  const H = 100, W = 24, base = 160;
  ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.strokeRect(x, base - H, W, H);
  const frac = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  ctx.fillStyle = color; ctx.fillRect(x, base - H * frac, W, H * frac);
  ctx.fillStyle = '#e2e8f0'; ctx.font = '11px sans-serif'; ctx.fillText(label, x, base + 14);
}
export function drawSpinGlyph(ctx, at, dtheta, color, label) {
  const r = 12 + Math.min(20, Math.abs(dtheta) * 10);
  ctx.strokeStyle = ctx.fillStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(at.x, at.y, r, 0, 2 * Math.PI); ctx.stroke();
  if (dtheta >= 0) {
    ctx.beginPath(); ctx.arc(at.x, at.y, 2, 0, 2 * Math.PI); ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(at.x - r * 0.7, at.y - r * 0.7); ctx.lineTo(at.x + r * 0.7, at.y + r * 0.7);
    ctx.moveTo(at.x + r * 0.7, at.y - r * 0.7); ctx.lineTo(at.x - r * 0.7, at.y + r * 0.7);
    ctx.stroke();
  }
  ctx.fillText(label, at.x + r + 4, at.y);
}
