"""Rasterize the editable SVG logo. Requires CairoSVG and Pillow."""
from pathlib import Path
from io import BytesIO
import cairosvg
from PIL import Image
root = Path(__file__).resolve().parent
png = cairosvg.svg2png(url=str(root / "icon.svg"), output_width=1024, output_height=1024)
image = Image.open(BytesIO(png))
for size in (16, 32, 48, 128, 512):
    image.resize((size,size),Image.Resampling.LANCZOS).save(root / f"icon{size}.png")
print("Generated Image Assist icons")
