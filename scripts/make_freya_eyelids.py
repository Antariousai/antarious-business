"""Eyelids-only overlay from blink assets — open smile/body never swaps."""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

assets = Path(r"e:\Antarious V2\src\assets")


def estimate_shift(
    open_i: Image.Image,
    blink_i: Image.Image,
    face_box: tuple[int, int, int, int] | None = None,
) -> tuple[int, int]:
    if face_box:
        ox, oy, aw, ah = face_box
        a = np.array(open_i.crop((ox, oy, ox + aw, oy + ah)).convert("L"), dtype=np.float32)
        b = np.array(blink_i.crop((ox, oy, ox + aw, oy + ah)).convert("L"), dtype=np.float32)
        lim_h, lim_w = ah, aw
    else:
        a_full = np.array(open_i.convert("L"), dtype=np.float32)
        b_full = np.array(blink_i.convert("L"), dtype=np.float32)
        h, w = a_full.shape
        y0, y1 = int(0.32 * h), int(0.48 * h)
        x0, x1 = int(0.30 * w), int(0.70 * w)
        a = a_full[y0:y1, x0:x1]
        b = b_full[y0:y1, x0:x1]
        lim_h, lim_w = y1 - y0, x1 - x0

    fa = np.fft.fft2(a)
    fb = np.fft.fft2(b)
    cross = fa * np.conj(fb)
    cross /= np.abs(cross) + 1e-8
    shift = np.fft.ifft2(cross)
    peak = np.unravel_index(np.argmax(np.abs(shift)), shift.shape)
    dy, dx = int(peak[0]), int(peak[1])
    if dy > lim_h // 2:
        dy -= lim_h
    if dx > lim_w // 2:
        dx -= lim_w
    if abs(dx) > 20 or abs(dy) > 20:
        return 0, 0
    return dy, dx


def build_eyelids(
    open_name: str,
    blink_name: str,
    out_name: str,
    eyes: list[tuple[float, float, float, float]],
    face_box: tuple[int, int, int, int] | None = None,
) -> None:
    open_i = Image.open(assets / open_name).convert("RGBA")
    blink_i = Image.open(assets / blink_name).convert("RGBA")
    assert open_i.size == blink_i.size
    w, h = open_i.size

    dy, dx = estimate_shift(open_i, blink_i, face_box)
    aligned = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    aligned.paste(blink_i, (dx, dy))
    print(f"  {out_name}: align dx={dx} dy={dy}")

    hard = Image.new("L", (w, h), 0)
    soft = Image.new("L", (w, h), 0)
    dh = ImageDraw.Draw(hard)
    ds = ImageDraw.Draw(soft)
    for cx_n, cy_n, rx_n, ry_n in eyes:
        cx, cy = int(cx_n * w), int(cy_n * h)
        rx, ry = max(8, int(rx_n * w)), max(5, int(ry_n * h))
        ds.ellipse([cx - rx - 2, cy - ry - 2, cx + rx + 2, cy + ry + 2], fill=255)
        dh.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)

    soft = soft.filter(ImageFilter.GaussianBlur(1.2))
    alpha = np.where(np.array(hard) > 0, 255, np.array(soft)).astype(np.uint8)

    blink_arr = np.array(aligned)
    out = blink_arr.copy()
    out[:, :, 3] = np.minimum(blink_arr[:, :, 3], alpha)
    hard_m = np.array(hard) > 0
    out[hard_m, 3] = 255

    lids = Image.fromarray(out)
    lids.save(assets / out_name)
    print("wrote", out_name, "opaque%", round(100 * (out[:, :, 3] > 10).mean(), 2))


# Cover full open iris/sclera inside the round glasses
EYES = [
    (0.403, 0.396, 0.078, 0.048),
    (0.597, 0.396, 0.078, 0.048),
]

build_eyelids("freya-avatar.png", "freya-avatar-blink.png", "freya-eyelids.png", EYES)

aw, ah, ox, oy, pw, ph = 480, 480, 16, 40, 512, 720
portrait_eyes = [
    ((ox + cx * aw) / pw, (oy + cy * ah) / ph, rx * aw / pw, ry * ah / ph)
    for cx, cy, rx, ry in EYES
]
build_eyelids(
    "freya-portrait.png",
    "freya-portrait-blink.png",
    "freya-eyelids-portrait.png",
    portrait_eyes,
    face_box=(ox, oy, aw, ah),
)
print("done")
