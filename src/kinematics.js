export function kinematics(O, M, prev, dt, pxPerMeter) {
  const dx = M.x - O.x, dy = M.y - O.y;
  const L_px = Math.hypot(dx, dy);
  const theta = Math.atan2(dx, dy);
  const er = { x: dx / L_px, y: dy / L_px };
  const et = { x: Math.cos(theta), y: -Math.sin(theta) };
  const dtheta = prev ? (theta - prev.theta) / dt : 0;
  const ddtheta = prev ? (dtheta - prev.dtheta) / dt : 0;
  return { L_px, L_m: L_px / pxPerMeter, theta, er, et, dtheta, ddtheta };
}
