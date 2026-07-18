"""Build eyelids-only overlay for login Freya (base body never swaps)."""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

assets = Path(__file__).resolve().parents[1] / "src" / "assets"

EYES_OPEN = [(0.436, 0.231), (0.578, 0.225)]
EYES_BLINK = [(0.428, 0.242), (0.570, 0.238)]


def main() -> None:
    open_i = Image.open(assets / "freya-anim-folded.png").convert("RGBA")
    blink_i = Image.open(assets / "freya-anim-blink.png").convert("RGBA")
    w, h = open_i.size
    o = np.array(open_i).astype(np.float32)

    dx = int(round(np.mean([a[0] - b[0] for a, b in zip(EYES_OPEN, EYES_BLINK)]) * w))
    dy = int(round(np.mean([a[1] - b[1] for a, b in zip(EYES_OPEN, EYES_BLINK)]) * h))
    aligned = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    aligned.paste(blink_i, (dx, dy))
    ba = np.array(aligned)

    r, g, bl, a = o[:, :, 0], o[:, :, 1], o[:, :, 2], o[:, :, 3]
    bri = (r + g + bl) / 3
    sat = np.maximum(np.maximum(r, g), bl) - np.minimum(np.minimum(r, g), bl)
    yy, xx = np.mgrid[:h, :w]
    out = np.zeros((h, w, 4), dtype=np.uint8)

    for ocx, ocy in EYES_OPEN:
        ocx_i, ocy_i = ocx * w, ocy * h
        orx_i, ory_i = 0.039 * w, 0.023 * h
        ellipse = ((xx - ocx_i) / orx_i) ** 2 + ((yy - ocy_i) / ory_i) ** 2 <= 1.0
        sclera = (bri > 160) & (sat < 70) & (a > 200)
        iris = (bri > 35) & (bri < 180) & (a > 200) & (sat > 12)
        pupil = (bri < 70) & (a > 200)
        eye = ndimage.binary_dilation(ellipse & (sclera | iris | pupil), iterations=3)
        bound = ((xx - ocx_i) / (orx_i * 1.05)) ** 2 + (
            (yy - (ocy_i + 1.5)) / (ory_i * 1.15)
        ) ** 2 <= 1.0
        eye = eye & bound & (ba[:, :, 3] > 200)
        ys, xs = np.where(eye)
        out[ys, xs] = ba[ys, xs]
        out[ys, xs, 3] = 255

    cover = out[:, :, 3] > 0
    dist = ndimage.distance_transform_edt(cover)
    alpha = np.where(
        cover,
        np.clip(
            np.maximum(dist / 1.5 * 255, np.where(dist >= 1.2, 255, dist / 1.5 * 255)),
            0,
            255,
        ),
        0,
    ).astype(np.uint8)
    out[:, :, 3] = alpha

    out_path = assets / "freya-anim-eyelids.png"
    Image.fromarray(out).save(out_path)
    print(f"wrote {out_path} ({int(cover.sum())} px, shift={dx},{dy})")


if __name__ == "__main__":
    main()
