const DB = "tp_pendule", STORE = "calib";
function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "key" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function saveCalibration(data) {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ key: "camera_calibration", ...data });
    tx.oncomplete = () => res();
  });
}
export async function loadCalibration() {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction(STORE, "readonly");
    const rq = tx.objectStore(STORE).get("camera_calibration");
    rq.onsuccess = () => res(rq.result || null);
    rq.onerror = () => res(null);
  });
}
