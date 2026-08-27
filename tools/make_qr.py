#!/usr/bin/env python3
"""Generate the BMS QR-menu code (SVG + print PNG).

Usage: python3 make_qr.py [url]
Regenerate with the final domain if the site ever moves.
"""
import sys
import qrcode
import qrcode.image.svg
from PIL import Image

URL = sys.argv[1] if len(sys.argv) > 1 else "https://maisoninfuze-star.github.io/BMS/menu-qr.html"
INK = "#0e2a1c"

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=4)
qr.add_data(URL)
qr.make(fit=True)
m = qr.get_matrix()
n = len(m)

# Hand-rolled SVG: one path, ink modules on white, 4-module quiet zone included.
cells = []
for y, row in enumerate(m):
    for x, v in enumerate(row):
        if v:
            cells.append(f"M{x} {y}h1v1h-1z")
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {n} {n}" '
       f'shape-rendering="crispEdges"><rect width="{n}" height="{n}" fill="#ffffff"/>'
       f'<path d="{"".join(cells)}" fill="{INK}"/></svg>')
with open("../img/qr-menu.svg", "w") as f:
    f.write(svg)

# Print PNG: 2000 px, nearest-neighbour so modules stay razor sharp.
img = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H, border=4)
img.add_data(URL)
img.make(fit=True)
pil = img.make_image(fill_color=INK, back_color="white").get_image()
scale = max(1, 2000 // pil.width)
pil = pil.resize((pil.width * scale, pil.height * scale), Image.NEAREST)
pil.save("../img/qr-menu.png")
print(f"encoded: {URL}")
print(f"modules: {n}x{n} (quiet zone included), png: {pil.width}px")
