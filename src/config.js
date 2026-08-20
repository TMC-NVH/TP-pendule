const CONFIGS = {
  "pendule-01": {
    title: "Pendule simple",
    goal: "Mesurez la periode du pendule, puis comparez au modele theorique.",
    targetResolution: { w: 1280, h: 720 },
    markerSizeMeters: 0.05,
    markers: { pivot: 0, mass: 1 },
  },
  "default": {
    title: "Pendule simple",
    goal: "Experience de pendule.",
    targetResolution: { w: 1280, h: 720 },
    markerSizeMeters: 0.05,
    markers: { pivot: 0, mass: 1 },
  },
};
export async function loadExperimentConfig(expId) {
  return CONFIGS[expId] || CONFIGS["default"];
}
