import { drawArrow, drawFil, drawDashedLine, drawLabel, drawSpinGlyph } from './primitives.js';
export function overlayAngularMomentum(ctx, O, M, k, m, g) {
  drawFil(ctx, O, M);
  const foot = { x: M.x, y: O.y };
  drawDashedLine(ctx, O, foot, '#a855f7');
  drawArrow(ctx, M, { x: 0, y: m * g }, '#ef4444', 'P', 40);
  drawSpinGlyph(ctx, O, k.dtheta, '#a855f7', 'L_O');
  drawArrow(ctx, M, { x: -k.er.x, y: -k.er.y }, '#3b82f6', 'T', 40);
  drawLabel(ctx, O, 'M_O(T) = 0', '#3b82f6');
}
