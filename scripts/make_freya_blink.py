from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

assets = Path(r"e:\Antarious V2\src\assets")


def make_blink(src_path: Path, out_path: Path, eyes: list[tuple[float, float, float, float]]) -> None:
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    for cx_n, cy_n, rx_n, ry_n in eyes:
        cx, cy = int(cx_n * w), int(cy_n * h)
        rx, ry = max(4, int(rx_n * w)), max(2, int(ry_n * h))
        sx = min(w - 1, max(0, cx))
        sy = min(h - 1, max(0, cy + ry + 6))
        skin = img.getpixel((sx, sy))[:3]
        lid = tuple(max(0, min(255, c - 10)) for c in skin) + (250,)
        crease = tuple(max(0, min(255, c - 40)) for c in skin) + (200,)
        box = [cx - rx, cy - ry, cx + rx, cy + ry]
        draw.ellipse(box, fill=lid)
        draw.arc(
            [cx - rx, cy - max(2, ry // 2), cx + rx, cy + max(2, ry // 2)],
            0,
            180,
            fill=crease,
            width=max(2, ry // 2),
        )

    blurred = overlay.filter(ImageFilter.GaussianBlur(radius=max(1.2, w / 200)))
    out = Image.alpha_composite(img, blurred)
    out.save(out_path, "PNG")
    print("wrote", out_path.name, out.size)


make_blink(
    assets / "freya-avatar.png",
    assets / "freya-avatar-blink.png",
    eyes=[
        (0.36, 0.41, 0.095, 0.038),
        (0.66, 0.41, 0.095, 0.038),
    ],
)

make_blink(
    assets / "freya-portrait.png",
    assets / "freya-portrait-blink.png",
    eyes=[
        (0.36, 0.202, 0.085, 0.022),
        (0.66, 0.202, 0.085, 0.022),
    ],
)

print("done")
