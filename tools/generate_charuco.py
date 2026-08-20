# tools/generate_charuco.py — planche ChArUco 5x7 en DICT_4X4_50
import cv2
from cv2 import aruco
from pathlib import Path

OUT = Path("assets")
OUT.mkdir(parents=True, exist_ok=True)

D = aruco.getPredefinedDictionary(aruco.DICT_4X4_50)
board = aruco.CharucoBoard((5, 7), 0.030, 0.022, D)  # carre 30 mm, marqueur 22 mm
img = board.generateImage((1500, 2100), marginSize=40)
cv2.imwrite(str(OUT / "charuco_5x7_calibration.png"), img)
print("ecrit: charuco_5x7_calibration.png")