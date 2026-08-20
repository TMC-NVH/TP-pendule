import { drawArrow, drawFil, drawDashed } from './primitives.js';
export function overlayNewton(ctx, O, M, k, m, g) {
  drawFil(ctx, O, M);
  drawArrow(ctx, M, k.er, '#f59e0b', 'er', 50);
  drawArrow(ctx, M, k.et, '#22c55e', 'etheta', 50);
  drawArrow(ctx, M, { x: 0, y: m * g }, '#ef4444', 'P', 40);
  const Pr = -g * Math.cos(k.theta);
  const Pt = -g * Math.sin(k.theta);
  drawDashed(ctx, M, k.er, Pr * 40, '#ef4444');
  drawDashed(ctx, M, k.et, Pt * 40, '#ef4444');
  drawArrow(ctx, M, { x: -k.er.x, y: -k.er.y }, '#3b82f6', 'T', 60);
}
