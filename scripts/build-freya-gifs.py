"""Stitch Freya expression frames into looping animated GIFs."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src" / "assets" / "freya"
FRAMES = ASSETS / "frames"
OUT_W = 480

MOODS: dict[str, list[tuple[str, int]]] = {
    "welcome": [
        ("01.png", 320),
        ("01.png", 320),
        ("02.png", 100),
        ("03.png", 120),
        ("02.png", 100),
        ("01.png", 300),
        ("04.png", 260),
        ("01.png", 340),
    ],
    "listening": [
        ("01.png", 300),
        ("04.png", 280),
        ("01.png", 290),
        ("02.png", 95),
        ("03.png", 115),
        ("02.png", 95),
        ("01.png", 300),
        ("04.png", 270),
        ("01.png", 300),
    ],
    "thinking": [
        ("01.png", 340),
        ("04.png", 320),
        ("01.png", 330),
        ("02.png", 100),
        ("03.png", 120),
        ("02.png", 100),
        ("04.png", 300),
        ("01.png", 350),
    ],
    "excited": [
        ("01.png", 240),
        ("04.png", 220),
        ("01.png", 230),
        ("02.png", 90),
        ("03.png", 110),
        ("02.png", 90),
        ("04.png", 210),
        ("01.png", 240),
        ("04.png", 220),
    ],
    "wave": [
        ("01.png", 220),
        ("02.png", 200),
        ("03.png", 180),
        ("04.png", 200),
        ("02.png", 190),
        ("01.png", 220),
        ("02.png", 95),
        ("03.png", 115),
        ("02.png", 95),
        ("01.png", 240),
    ],
}


def load_frame(path: Path) -> Image.Image:
    img = Image.open(path).convert("RGBA")
    w, h = img.size
    scale = OUT_W / w
    out_h = max(1, int(h * scale))
    img = img.resize((OUT_W, out_h), Image.Resampling.LANCZOS)
    bg = Image.new("RGBA", (OUT_W, out_h), (255, 247, 237, 255))
    bg.alpha_composite(img)
    return bg.convert("RGB")


def quantize_all(frames: list[Image.Image]) -> list[Image.Image]:
    """Single shared palette — prevents flicker between frames."""
    w, h = frames[0].size
    strip = Image.new("RGB", (w, h * len(frames)))
    for i, frame in enumerate(frames):
        strip.paste(frame, (0, i * h))
    palette_ref = strip.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
    return [
        frame.quantize(palette=palette_ref, dither=Image.Dither.FLOYDSTEINBERG)
        for frame in frames
    ]


def build_gif(mood: str, sequence: list[tuple[str, int]]) -> None:
    mood_dir = FRAMES / mood
    if not mood_dir.is_dir():
        raise FileNotFoundError(f"Missing frames folder: {mood_dir}")

    raw: list[Image.Image] = []
    durations: list[int] = []

    for filename, duration in sequence:
        path = mood_dir / filename
        if not path.exists():
            raise FileNotFoundError(path)
        raw.append(load_frame(path))
        durations.append(duration)

    frames = quantize_all(raw)
    out_path = ASSETS / f"freya-{mood}.gif"
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=False,
        disposal=1,
    )
    kb = out_path.stat().st_size / 1024
    n = Image.open(out_path).n_frames
    print(f"  {out_path.name}: {n} frames, {kb:.0f} KB")


def main() -> None:
    print("Building Freya GIFs…")
    for mood, sequence in MOODS.items():
        build_gif(mood, sequence)
    print("Done.")


if __name__ == "__main__":
    main()
