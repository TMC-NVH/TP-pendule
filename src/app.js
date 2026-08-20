import { loadCalibration } from './storage.js';
import { requestCameraThen } from './camera.js';
import { loadExperimentConfig } from './config.js';

async function initHomeScreen() {
  const params = new URLSearchParams(location.search);
  const expId = params.get('exp') || 'default';
  const config = await loadExperimentConfig(expId);
  document.getElementById('exp-title').textContent = config.title;
  document.getElementById('exp-goal').textContent = config.goal;
  wakeBackend();
  const calib = await loadCalibration();
  renderState(calib, config, expId);
}

function renderState(calib, config, expId) {
  const btn = document.getElementById('main-action');
  const status = document.getElementById('calib-status');
  const recal = document.getElementById('recalibrate');
  btn.disabled = false;
  const resMismatch = calib && (calib.resolution.w !== config.targetResolution.w || calib.resolution.h !== config.targetResolution.h);
  if (!calib) {
    status.className = 'status warn';
    status.textContent = 'Calibration requise (une fois, ~3 min), puis memorisee sur ce telephone.';
    btn.textContent = 'Calibrer ma camera';
    btn.onclick = () => requestCameraThen(startCalibration, config);
  } else if (resMismatch) {
    status.className = 'status warn';
    status.textContent = 'Recalibration conseillee : la calibration ne correspond pas a cette camera.';
    btn.textContent = 'Recalibrer, puis demarrer';
    btn.onclick = () => requestCameraThen(startCalibration, config);
  } else {
    const d = new Date(calib.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
    status.className = 'status ok';
    status.textContent = 'Camera prete - calibree le ' + d + ' - precision ' + calib.reprojectionError.toFixed(2) + ' px.';
    btn.textContent = "Demarrer l'experience";
    btn.onclick = () => requestCameraThen((s) => startExperiment(expId, s), config);
    recal.hidden = false;
    recal.onclick = () => requestCameraThen(startCalibration, config);
  }
}

function wakeBackend() {
  const hint = document.getElementById('backend-hint');
  hint.textContent = 'Connexion au serveur en cours...';
  const url = (window.BACKEND_URL || '') + '/health';
  fetch(url).then(() => { hint.textContent = ''; }).catch(() => { hint.textContent = 'Serveur en cours de reveil (~30 s).'; });
}

function startCalibration(stream) { console.log('TODO calibration', stream); }
function startExperiment(expId, stream) { console.log('TODO experiment', expId, stream); }

document.addEventListener('DOMContentLoaded', initHomeScreen);
