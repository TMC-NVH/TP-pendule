export async function requestCameraThen(next, config) {
  const errBox = document.getElementById('perm-error');
  errBox.hidden = true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: config.targetResolution.w },
        height: { ideal: config.targetResolution.h },
      },
    });
    next(stream);
  } catch (err) {
    showPermissionError(err);
  }
}
function showPermissionError(err) {
  const box = document.getElementById('perm-error');
  box.hidden = false;
  const messages = {
    NotAllowedError: "Acces camera refuse. Touchez le cadenas dans la barre d'adresse, puis Autorisations, puis Camera, puis Autoriser, et rechargez la page.",
    NotFoundError: 'Aucune camera detectee sur cet appareil.',
    NotReadableError: 'La camera est deja utilisee par une autre application. Fermez-la et reessayez.',
    OverconstrainedError: "La resolution demandee n'est pas disponible sur cette camera.",
  };
  box.textContent = messages[err.name] || "Impossible d'acceder a la camera. Verifiez les autorisations du navigateur.";
}
