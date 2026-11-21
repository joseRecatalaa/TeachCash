"""
Monta el PowerPoint de la presentación a partir de lo que exporta
`scripts/exportar-presentacion.mts`: una diapositiva 16:9 por imagen, a sangre,
y SIN notas del orador: el PowerPoint es para entregar, y las notas son un
guion para quien presenta (solo en la web, con la tecla N).

Las diapositivas son imágenes y no cajas de texto editables a propósito: el
diseño (pixel art, tipografía de recreativa, el cielo) vive en la web, y un
PowerPoint "editable" lo perdería al primer clic. Se cambia en
`src/presentation/components/Presentacion/` y se vuelve a exportar.

    pip install python-pptx
    python scripts/presentacion-pptx.py
"""

from pathlib import Path

from pptx import Presentation
from pptx.util import Emu

CARPETA = Path(__file__).resolve().parent.parent / "docs" / "presentacion"

# 16:9 a 13,333 x 7,5 pulgadas, el tamaño de "Panorámica" de PowerPoint.
ANCHO = Emu(12192000)
ALTO = Emu(6858000)

presentacion = Presentation()
presentacion.slide_width = ANCHO
presentacion.slide_height = ALTO
en_blanco = presentacion.slide_layouts[6]

imagenes = sorted((CARPETA / "diapositivas").glob("*.png"))
for imagen in imagenes:
    diapositiva = presentacion.slides.add_slide(en_blanco)
    diapositiva.shapes.add_picture(str(imagen), 0, 0, width=ANCHO, height=ALTO)

salida = CARPETA / "TeachCash-presentacion.pptx"
presentacion.save(salida)
print(f"{len(imagenes)} diapositivas en {salida}")
