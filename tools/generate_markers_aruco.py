# tools/generate_markers_aruco.py
# Genere pivot (id=4) et masse (id=18) en DICT_ARUCO_ORIGINAL, compatibles js-aruco2.
import cv2
from cv2 import aruco
import numpy as np
from pathlib import Path

OUT = Path("assets")
OUT.mkdir(parents=True, exist_ok=True)

D = aruco.getPredefinedDictionary(aruco.DICT_ARUCO_ORIGINAL)
PX = 600
det = aruco.ArucoDetector(D, aruco.DetectorParameters())

for id_, name in [(4, "PIVOT"), (18, "MASSE")]:
    img = aruco.generateImageMarker(D, id_, PX)
    b = 80  # quiet zone blanche
    canvas = np.full((PX + 2 * b, PX + 2 * b), 255, np.uint8)
    canvas[b:b + PX, b:b + PX] = img
    cv2.imwrite(str(OUT / f"aruco_{name}_id{id_}.png"), canvas)
    _, ids, _ = det.detectMarkers(canvas)
    print("ecrit + verif:", name, "id", id_, "->", ids.ravel().tolist() if ids is not None else None)

print("\nTermine. Marqueurs ARUCO original dans assets/.")