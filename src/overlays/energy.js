import { drawArrow, drawFil, drawGauge } from './primitives.js';
export function overlayEnergy(ctx, O, M, k, m, g) {
  drawFil(ctx, O, M);
  drawArrow(ctx, M, k.et, '#22c55e', 'v', k.L_px * k.dtheta * 0.3);
  const h = k.L_m * (1 - Math.cos(k.theta));
  const Ec = 0.5 * m * k.L_m * k.L_m * k.dtheta * k.dtheta;
  const Ep = m * g * h;
  const Em = Ec + Ep || 1;
  drawGauge(ctx, 20, Ec, Em, '#22c55e', 'Ec');
  drawGauge(ctx, 60, Ep, Em, '#f97316', 'Ep');
  drawGauge(ctx, 100, Em, Em, '#64748b', 'Em');
}
