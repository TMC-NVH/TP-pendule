export function createPeriodMeter(opts = {}) {
  const cfg = {
    minAmplitude: opts.minAmplitude || 0.05,
    smoothN: opts.smoothN || 5,
    minPeriod: opts.minPeriod || 0.2,
  };
  const state = { prevTheta: null, lastUpCrossT: null, periods: [], count: 0, period: null, armed: false };

  function update(theta, t) {
    if (Math.abs(theta) > cfg.minAmplitude) state.armed = true;
    if (!state.armed) { state.prevTheta = theta; return snapshot(); }
    if (state.prevTheta !== null) {
      const crossedUp = state.prevTheta < 0 && theta >= 0;
      if (crossedUp) {
        if (state.lastUpCrossT !== null) {
          const p = t - state.lastUpCrossT;
          if (p > cfg.minPeriod) {
            state.periods.push(p);
            if (state.periods.length > cfg.smoothN) state.periods.shift();
            state.period = state.periods.reduce((a, b) => a + b, 0) / state.periods.length;
            state.count += 1;
          }
          state.lastUpCrossT = t;
        } else { state.lastUpCrossT = t; }
      }
    }
    state.prevTheta = theta;
    return snapshot();
  }

  function snapshot() { return { period: state.period, count: state.count, lastCrossing: state.lastUpCrossT }; }
  function reset() { state.prevTheta = null; state.lastUpCrossT = null; state.periods = []; state.count = 0; state.period = null; state.armed = false; }
  return { update, reset, snapshot };
}

export function theoreticalPeriod(L, g = 9.81) { return 2 * Math.PI * Math.sqrt(L / g); }
