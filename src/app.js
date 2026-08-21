import { startLive } from "./live.js";
import { loadCalibration } from './storage.js';
import { requestCameraThen } from './camera.js';
import { loadExperimentConfig } from './config.js';
import { startCalibration as runCalibration, isOpenCvReady } from './calibration.js';

let currentExpId = 'default';
let currentConfig = null;

async function initHomeScreen() {
  const params = new URLSearchParams(location.search);
  const expId = params.get('exp') || 'default';
  currentExpId = expId;
  const config = await loadExperimentConfig(expId);
  currentConfig = config;
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
    // temporaire, le temps de tester la caméra :
    btn.onclick = () => requestCameraThen((s) => startLive(expId, s), config);
    status.className = 'status warn';
    status.textContent = 'Calibration requise (une fois, ~3 min), puis memorisee sur ce telephone.';
    btn.textContent = 'Calibrer ma camera';
    
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
    btn.onclick = () => requestCameraThen((s) => startLive(expId, s), config);
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

function startCalibration(stream) {
  const status = document.getElementById('calib-status');
  const btn = document.getElementById('main-action');

  if (!isOpenCvReady()) {
    status.className = 'status warn';
    status.textContent =
      "OpenCV.js n'est pas encore chargé (ou son module aruco est indisponible). " +
      'Patientez quelques secondes puis réessayez, ou vérifiez votre connexion.';
    stream.getTracks().forEach((t) => t.stop());
    return;
  }

  btn.hidden = true;

  runCalibration(
    stream,
    async (result) => {
      // succès : on relit la calibration stockée et on rafraîchit l'écran d'accueil
      btn.hidden = false;
      const calib = await loadCalibration();
      renderState(calib, currentConfig, currentExpId);
    },
    (errMsg) => {
      btn.hidden = false;
      status.className = 'status warn';
      status.textContent = 'Échec de la calibration : ' + errMsg;
    }
  );
}

document.addEventListener('DOMContentLoaded', initHomeScreen);
