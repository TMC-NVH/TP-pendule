# tools/build_pdfs.py
# Genere 2 PDF A4 a l'echelle exacte :
#   - markers_aruco_print.pdf : pivot id=4 + masse id=18 (ARUCO original), motif 50 mm
#   - charuco_print.pdf        : planche ChArUco 5x7, carre 30 mm
# Lancer : C:\Python\Python39\python.exe tools\build_pdfs.py
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.utils import ImageReader

OUT = Path("assets")

# Le PNG fait 760 px (motif 600 + 2x80 de quiet zone).
# Pour un motif de 50 mm, l'image entiere doit mesurer 50 * 760/600 mm.
MOTIF_MM = 50.0
TOTAL_MM = MOTIF_MM * 760 / 600  # ~63.3 mm

def build_markers_pdf():
    path = OUT / "markers_aruco_print.pdf"
    c = pdfcanvas.Canvas(str(path), pagesize=A4)
    W, H = A4
    for name, id_ in [("PIVOT", 4), ("MASSE", 18)]:
        img = ImageReader(str(OUT / f"aruco_{name}_id{id_}.png"))
        x = (W - TOTAL_MM * mm) / 2
        y = (H - TOTAL_MM * mm) / 2
        c.drawImage(img, x, y, TOTAL_MM * mm, TOTAL_MM * mm)
        c.setFont("Helvetica-Bold", 13)
        c.drawCentredString(W / 2, y + TOTAL_MM * mm + 20, name + "  (ARUCO id=" + str(id_) + ")")
        c.setFont("Helvetica", 11)
        c.drawCentredString(W / 2, y - 18, "Motif = 50 mm  -  Imprimer a 100% / Taille reelle")
        c.showPage()
    c.save()
    print("ecrit:", path)

def build_charuco_pdf():
    path = OUT / "charuco_print.pdf"
    c = pdfcanvas.Canvas(str(path), pagesize=A4)
    W, H = A4
    ch = ImageReader(str(OUT / "charuco_5x7_calibration.png"))
    board_w, board_h = 150.0, 210.0  # 5x30 mm large, 7x30 mm haut
    x = (W - board_w * mm) / 2
    y = (H - board_h * mm) / 2
    c.drawImage(ch, x, y, board_w * mm, board_h * mm)
    c.setFont("Helvetica", 11)
    c.drawCentredString(W / 2, 15, "ChArUco 5x7  -  carre 30 mm  -  Imprimer a 100% / Taille reelle")
    c.showPage()
    c.save()
    print("ecrit:", path)

build_markers_pdf()
build_charuco_pdf()
print("\nTermine. 2 PDF dans assets/.")