from PIL import Image

src = r"e:\Antarious V2\src\assets\antarious-logo.png"
img = Image.open(src).convert("RGBA")
pixels = img.load()
w, h = img.size
print("size", w, h)
print("corners", pixels[2, 2], pixels[w - 3, 2], pixels[2, h - 3], pixels[w - 3, h - 3])

out = Image.new("RGBA", (w, h))
op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        # near-black / dark charcoal background -> transparent
        if r < 45 and g < 45 and b < 45:
            op[x, y] = (0, 0, 0, 0)
        else:
            op[x, y] = (r, g, b, a)

out.save(src, "PNG")

dark = Image.new("RGBA", (w, h))
dp = dark.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = out.getpixel((x, y))
        if a < 20:
            dp[x, y] = (0, 0, 0, 0)
        elif r > 210 and g > 210 and b > 210:
            dp[x, y] = (11, 19, 30, a)
        else:
            dp[x, y] = (r, g, b, a)

dark_path = r"e:\Antarious V2\src\assets\antarious-logo-dark.png"
dark.save(dark_path, "PNG")
print("saved transparent + dark")
