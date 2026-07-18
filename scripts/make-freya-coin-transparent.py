from PIL import Image, ImageFilter, ImageDraw, ImageChops
import math

src = r"C:\Users\DELL\.cursor\projects\e-Antarious-V2\assets\c__Users_DELL_AppData_Roaming_Cursor_User_workspaceStorage_089f736be47cbeb9ce2bb9464ee226a4_images_Gemini_Generated_Image_4nz8h44nz8h44nz8-fee882b5-ae4f-4d45-8d42-b27ed1ec750c.png"
out_path = r"e:\Antarious V2\src\assets\freya-coin.png"

img = Image.open(src).convert("RGBA")
w, h = img.size
pix = img.load()

out = Image.new("RGBA", (w, h))
op = out.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = pix[x, y]
        brightness = (r + g + b) / 3
        if r > 240 and g > 240 and b > 235 and abs(r - g) < 12 and abs(g - b) < 12:
            op[x, y] = (r, g, b, 0)
        elif r > 230 and g > 230 and b > 225 and brightness > 232:
            strength = (brightness - 220) / 35
            strength = max(0, min(1, strength))
            op[x, y] = (r, g, b, int(a * (1 - strength)))
        else:
            op[x, y] = (r, g, b, a)

bbox = out.getbbox()
print("bbox", bbox)

cx = (bbox[0] + bbox[2]) / 2
cy = (bbox[1] + bbox[3]) / 2
max_r = 0
op2 = out.load()
for y in range(bbox[1], bbox[3]):
    for x in range(bbox[0], bbox[2]):
        if op2[x, y][3] > 40:
            d = math.hypot(x - cx, y - cy)
            if d > max_r:
                max_r = d
radius = max_r * 0.995
print("center", cx, cy, "radius", radius)

mask = Image.new("L", (w, h), 0)
draw = ImageDraw.Draw(mask)
draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(0.8))

r, g, b, a = out.split()
a = ImageChops.multiply(a, mask)
out = Image.merge("RGBA", (r, g, b, a))

pad = 4
side = int(radius * 2) + pad * 2
scx, scy = int(cx), int(cy)
half = side // 2
left = max(0, scx - half)
top = max(0, scy - half)
right = min(w, left + side)
bottom = min(h, top + side)
left = max(0, right - side)
top = max(0, bottom - side)
cropped = out.crop((left, top, right, bottom))
cropped = cropped.resize((512, 512), Image.Resampling.LANCZOS)
cropped.save(out_path, "PNG")
print("saved", out_path, cropped.size)
print("corner", cropped.getpixel((0, 0)), "mid-edge", cropped.getpixel((256, 2)))
