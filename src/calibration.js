import { saveCalibration } from './storage.js';

// Doit correspondre exactement à tools/generate_charuco.py
const BOARD_SQUARES_X = 5;
const BOARD_SQUARES_Y = 7;
const SQUARE_LENGTH_M = 0.030;
const MARKER_LENGTH_M = 0.022;
const DICTIONARY_NAME = 'DICT_4X4_50';

const MIN_VIEWS = 15;
const MIN_CORNERS_PER_VIEW = 6;     // en dessous, la vue est trop partielle/instable
const CAPTURE_COOLDOWN_MS = 700;    // évite de capturer 2x la même pose

let running = false;
let rafId = null;
let cvReadyChecked = false;

let board = null;
let detector = null;

const captured = { objectPoints: [], imagePoints: [] };
let lastCaptureTs = 0;
let imageSize = null;

export function isOpenCvReady() {
  return typeof cv !== 'undefined' && !!cv.Mat && typeof cv.aruco !== 'undefined';
}

export function startCalibration(stream, onDone, onError) {
  if (!isOpenCvReady()) {
    onError && onError(
      "OpenCV.js (module aruco) n'est pas disponible dans ce navigateur. " +
      'Vérifiez que le script opencv.js a bien fini de charger, ou testez avec ' +
      'un navigateur/version plus récent.'
    );
    return;
  }

  try {
    const dictionary = cv.aruco.getPredefinedDictionary(cv.aruco[DICTIONARY_NAME]);
    board = new cv.aruco.CharucoBoard(
      new cv.Size(BOARD_SQUARES_X, BOARD_SQUARES_Y),
      SQUARE_LENGTH_M,
      MARKER_LENGTH_M,
      dictionary
    );
    const detectorParams = new cv.aruco.DetectorParameters();
    const charucoParams = new cv.aruco.CharucoParameters();
    detector = new cv.aruco.CharucoDetector(board, charucoParams, detectorParams);
  } catch (e) {
    onError && onError(
      'Impossible d\'initialiser le détecteur ChArUco (API OpenCV.js indisponible ou incompatible) : ' + e.message
    );
    return;
  }

  captured.objectPoints = [];
  captured.imagePoints = [];
  lastCaptureTs = 0;
  imageSize = null;

  const { video, canvas, ctx, hud } = ensureDom();
  video.srcObject = stream;
  video.muted = true;
  video.setAttribute('playsinline', '');

  running = true;

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch(() => {
      hud.textContent = 'Impossible de démarrer la vidéo. Vérifiez les permissions caméra.';
    });
  }

  video.onloadedmetadata = () => {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    imageSize = new cv.Size(video.videoWidth, video.videoHeight);
    rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud, onDone, onError));
  };
}

export function stopCalibration() {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  const video = document.getElementById('calib-video');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  }
  const wrap = document.getElementById('calib-wrap');
  if (wrap) wrap.remove();
}

function ensureDom() {
  let wrap = document.getElementById('calib-wrap');
  if (wrap) wrap.remove(); // repart propre à chaque démarrage

  wrap = document.createElement('div');
  wrap.id = 'calib-wrap';
  wrap.style.cssText = 'position:relative;max-width:480px;margin:16px auto;';

  const video = document.createElement('video');
  video.id = 'calib-video';
  video.setAttribute('playsinline', '');
  video.muted = true;
  video.style.cssText = 'width:100%;display:block;border-radius:12px;';

  const canvas = document.createElement('canvas');
  canvas.id = 'calib-canvas';
  canvas.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';

  const hud = document.createElement('div');
  hud.id = 'calib-hud';
  hud.style.cssText =
    'position:absolute;top:8px;left:8px;right:8px;padding:8px 12px;' +
    'background:rgba(15,23,42,.8);color:#e2e8f0;border-radius:8px;font:14px sans-serif;';
  hud.textContent = 'Présentez la planche ChArUco face à la caméra...';

  const controls = document.createElement('div');
  controls.id = 'calib-controls';
  controls.style.cssText = 'display:flex;gap:8px;margin-top:10px;';

  const btnCapture = document.createElement('button');
  btnCapture.id = 'calib-capture';
  btnCapture.className = 'btn-primary';
  btnCapture.textContent = 'Capturer cette vue';

  const btnCancel = document.createElement('button');
  btnCancel.id = 'calib-cancel';
  btnCancel.className = 'btn-link';
  btnCancel.textContent = 'Annuler';
  btnCancel.onclick = () => stopCalibration();

  controls.appendChild(btnCapture);
  controls.appendChild(btnCancel);

  wrap.appendChild(video);
  wrap.appendChild(canvas);
  wrap.appendChild(hud);
  document.body.appendChild(wrap);
  document.body.appendChild(controls);

  return { video, canvas, ctx: canvas.getContext('2d'), hud, btnCapture, controls };
}

function loop(video, canvas, ctx, hud, onDone, onError) {
  if (!running) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  let src = null;
  let gray = null;
  let charucoCorners = null;
  let charucoIds = null;
  let markerCorners = null;
  let markerIds = null;

  try {
    src = cv.imread(canvas);
    gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    charucoCorners = new cv.Mat();
    charucoIds = new cv.Mat();
    markerCorners = new cv.MatVector();
    markerIds = new cv.Mat();

    detector.detectBoard(gray, charucoCorners, charucoIds, markerCorners, markerIds);

    const nCorners = charucoIds.rows || 0;
    drawCorners(ctx, charucoCorners, nCorners);

    const nCaptured = captured.objectPoints.length;
    const canCapture = nCorners >= MIN_CORNERS_PER_VIEW &&
      (performance.now() - lastCaptureTs) > CAPTURE_COOLDOWN_MS;

    const btnCapture = document.getElementById('calib-capture');
    if (btnCapture) {
      btnCapture.disabled = !canCapture;
      btnCapture.onclick = canCapture
        ? () => captureView(gray, charucoCorners, charucoIds, hud, onDone, onError)
        : null;
    }

    hud.textContent =
      'Vues capturées : ' + nCaptured + ' / ' + MIN_VIEWS +
      '  |  coins détectés : ' + nCorners +
      (nCaptured >= MIN_VIEWS ? '  — vous pouvez terminer.' : '');

    ensureFinishButton(nCaptured, gray.size(), hud, onDone, onError);
  } catch (e) {
    hud.textContent = 'Erreur de détection : ' + e.message;
  } finally {
    src && src.delete();
    gray && gray.delete();
    charucoCorners && charucoCorners.delete();
    charucoIds && charucoIds.delete();
    markerCorners && markerCorners.delete();
    markerIds && markerIds.delete();
  }

  rafId = requestAnimationFrame(() => loop(video, canvas, ctx, hud, onDone, onError));
}

function drawCorners(ctx, charucoCorners, nCorners) {
  ctx.fillStyle = '#22c55e';
  for (let i = 0; i < nCorners; i++) {
    const x = charucoCorners.floatAt(i, 0);
    const y = charucoCorners.floatAt(i, 1);
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, 2 * Math.PI);
    ctx.fill();
  }
}

function captureView(gray, charucoCorners, charucoIds, hud, onDone, onError) {
  try {
    const objP = new cv.Mat();
    const imgP = new cv.Mat();
    board.matchImagePoints(charucoCorners, charucoIds, objP, imgP);

    if (objP.rows < MIN_CORNERS_PER_VIEW) {
      objP.delete();
      imgP.delete();
      return;
    }

    captured.objectPoints.push(objP);
    captured.imagePoints.push(imgP);
    lastCaptureTs = performance.now();

    if (!imageSize) imageSize = gray.size();
  } catch (e) {
    hud.textContent = 'Erreur de capture : ' + e.message;
  }
}

function ensureFinishButton(nCaptured, size, hud, onDone, onError) {
  let btn = document.getElementById('calib-finish');
  const controls = document.getElementById('calib-controls');
  if (!controls) return;

  if (nCaptured >= MIN_VIEWS && !btn) {
    btn = document.createElement('button');
    btn.id = 'calib-finish';
    btn.className = 'btn-primary';
    btn.textContent = 'Terminer la calibration (' + nCaptured + ' vues)';
    btn.onclick = () => finishCalibration(size, hud, onDone, onError);
    controls.appendChild(btn);
  } else if (btn) {
    btn.textContent = 'Terminer la calibration (' + nCaptured + ' vues)';
  }
}

function finishCalibration(size, hud, onDone, onError) {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  hud.textContent = 'Calcul de la calibration en cours...';

  try {
    const objectPointsVec = new cv.MatVector();
    const imagePointsVec = new cv.MatVector();
    for (let i = 0; i < captured.objectPoints.length; i++) {
      objectPointsVec.push_back(captured.objectPoints[i]);
      imagePointsVec.push_back(captured.imagePoints[i]);
    }

    const cameraMatrix = new cv.Mat();
    const distCoeffs = new cv.Mat();
    const rvecs = new cv.MatVector();
    const tvecs = new cv.MatVector();

    const reprojError = cv.calibrateCamera(
      objectPointsVec, imagePointsVec, size,
      cameraMatrix, distCoeffs, rvecs, tvecs
    );

    const cameraMatrixArr = Array.from(cameraMatrix.data64F);
    const distCoeffsArr = Array.from(distCoeffs.data64F);

    const result = {
      resolution: { w: size.width, h: size.height },
      cameraMatrix: cameraMatrixArr,
      distCoeffs: distCoeffsArr,
      reprojectionError: reprojError,
      createdAt: Date.now(),
    };

    objectPointsVec.delete();
    imagePointsVec.delete();
    cameraMatrix.delete();
    distCoeffs.delete();
    rvecs.delete();
    tvecs.delete();
    captured.objectPoints.forEach((m) => m.delete());
    captured.imagePoints.forEach((m) => m.delete());
    captured.objectPoints = [];
    captured.imagePoints = [];

    saveCalibration(result).then(() => {
      stopCalibration();
      onDone && onDone(result);
    });
  } catch (e) {
    hud.textContent = 'Échec du calcul de calibration : ' + e.message;
    onError && onError(e.message);
  }
}
