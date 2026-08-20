# tools/build_pdf.py  -  genere le PDF A4 a l'echelle exacte depuis les PNG de assets/
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas as pdfcanvas
from reportlab.lib.utils import ImageReader

OUT = Path("assets")
pdf_path = OUT / "markers_a4_print.pdf"
c = pdfcanvas.Canvas(str(pdf_path), pagesize=A4)
W, H = A4

motif_mm = 50.0
total_mm = motif_mm * 760 / 600  # compense la quiet zone de 80 px

for name, id_ in [("PIVOT", 0), ("MASSE", 1)]:
    img = ImageReader(str(OUT / f"aruco_{name}_id{id_}.png"))
    x = (W - total_mm * mm) / 2
    y = (H - total_mm * mm) / 2
    c.drawImage(img, x, y, total_mm * mm, total_mm * mm)
    c.setFont("Helvetica", 12)
    c.drawCentredString(W / 2, y - 20, "ArUco " + name + " id=" + str(id_) + " (motif 50 mm)")
    c.drawCentredString(W / 2, 20, "Imprimer a 100% / Taille reelle")
    c.showPage()

ch = ImageReader(str(OUT / "charuco_5x7_calibration.png"))
board_w, board_h = 150.0, 210.0
x = (W - board_w * mm) / 2
y = (H - board_h * mm) / 2
c.drawImage(ch, x, y, board_w * mm, board_h * mm)
c.setFont("Helvetica", 12)
c.drawCentredString(W / 2, 15, "ChArUco 5x7 - carre 30 mm - Imprimer a 100%")
c.showPage()

c.save()
print("ecrit:", pdf_path)