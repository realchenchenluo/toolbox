"""Build the playful 图画捉迷藏 brand mark and Xiaohongshu artwork."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import shutil

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT.parent / "release"

svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs>
  <linearGradient id="bg" x1="64" y1="42" x2="446" y2="470" gradientUnits="userSpaceOnUse">
    <stop stop-color="#ff6f70"/><stop offset=".52" stop-color="#d95791"/><stop offset="1" stop-color="#7555b5"/>
  </linearGradient>
  <linearGradient id="lens" x1="252" y1="223" x2="367" y2="344" gradientUnits="userSpaceOnUse">
    <stop stop-color="#9ee8dd"/><stop offset="1" stop-color="#55b9cb"/>
  </linearGradient>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="10" stdDeviation="8" flood-color="#402053" flood-opacity=".22"/></filter>
</defs>
<rect width="512" height="512" rx="112" fill="url(#bg)"/>
<circle cx="446" cy="64" r="118" fill="#ffd665" opacity=".9"/>
<circle cx="57" cy="449" r="104" fill="#ffad7f" opacity=".48"/>
<path d="M120 120h164l66 66v202H120a24 24 0 0 1-24-24V144a24 24 0 0 1 24-24Z" fill="#fff8ed" filter="url(#shadow)"/>
<path d="M284 120v66h66" fill="#ffd665"/>
<path d="M129 151v193" stroke="#f5b6ad" stroke-width="9" stroke-linecap="round"/>
<path d="M170 235c24-30 58-31 81 0-23 31-57 30-81 0Z" fill="#ffe5b1" stroke="#583a78" stroke-width="8"/>
<circle cx="211" cy="235" r="17" fill="#583a78"/><circle cx="216" cy="229" r="5" fill="#fff8ed"/>
<path d="m170 294h70M170 320h44" stroke="#f0c0b5" stroke-width="9" stroke-linecap="round"/>
<circle cx="319" cy="294" r="71" fill="url(#lens)" stroke="#fff8ed" stroke-width="17" filter="url(#shadow)"/>
<circle cx="319" cy="294" r="33" fill="#fbe4a3" stroke="#583a78" stroke-width="8"/>
<circle cx="319" cy="294" r="14" fill="#583a78"/><circle cx="325" cy="288" r="4" fill="#fff8ed"/>
<path d="m371 347 53 53" stroke="#ffd665" stroke-width="25" stroke-linecap="round"/>
<path d="m410 136 8 22 22 8-22 8-8 22-8-22-22-8 22-8Z" fill="#fff8ed"/>
<circle cx="80" cy="110" r="7" fill="#fff8ed" opacity=".85"/><circle cx="418" cy="246" r="6" fill="#ffd665"/>
</svg>'''
(ROOT / "assets/brand.svg").write_text(svg, encoding="utf8")


def font(size: int, bold: bool = False):
    path = "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"
    return ImageFont.truetype(path, size)


S = 4
W = 512 * S
im = Image.new("RGBA", (W, W), (0, 0, 0, 0))
d = ImageDraw.Draw(im)

for y in range(W):
    for x in range(W):
        t = (x + y) / (W * 2)
        if t < .5:
            q = t * 2
            a, b = (255, 111, 112), (217, 87, 145)
        else:
            q = (t - .5) * 2
            a, b = (217, 87, 145), (117, 85, 181)
        col = tuple(round(a[i] * (1 - q) + b[i] * q) for i in range(3)) + (255,)
        d.point((x, y), fill=col)


def box(values):
    return tuple(round(v * S) for v in values)


def points(values):
    return [(round(x * S), round(y * S)) for x, y in values]


def line(values, fill, width):
    p = points(values)
    d.line(p, fill=fill, width=round(width * S), joint="curve")
    r = width * S / 2
    for x, y in (p[0], p[-1]):
        d.ellipse((round(x-r), round(y-r), round(x+r), round(y+r)), fill=fill)

# Decorative blobs and the paper card.
d.ellipse(box((328, -54, 564, 182)), fill="#ffd665")
d.ellipse(box((-48, 345, 162, 555)), fill="#ffad7f")
d.rounded_rectangle(box((0, 0, 512, 512)), radius=112*S, outline="#ffffff42", width=2*S)
shadow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle(box((99, 110, 371, 405)), radius=25*S, fill="#3d1d55aa")
shadow = shadow.filter(ImageFilter.GaussianBlur(11*S))
im.alpha_composite(shadow)
d = ImageDraw.Draw(im)
d.rounded_rectangle(box((96, 120, 350, 388)), radius=24*S, fill="#fff8ed")
d.polygon(points([(284, 120), (350, 186), (284, 186)]), fill="#ffd665")
line([(129, 151), (129, 344)], "#f5b6ad", 9)
d.polygon(points([(170, 235), (181, 218), (204, 207), (230, 212), (251, 235), (230, 258), (204, 263), (181, 252)]), fill="#ffe5b1", outline="#583a78")
d.ellipse(box((194, 218, 228, 252)), fill="#583a78")
d.ellipse(box((205, 224, 215, 234)), fill="#fff8ed")
line([(170, 294), (240, 294)], "#f0c0b5", 9)
line([(170, 320), (214, 320)], "#f0c0b5", 9)
d.ellipse(box((248, 223, 390, 365)), fill="#55b9cb", outline="#fff8ed", width=17*S)
d.ellipse(box((286, 261, 352, 327)), fill="#fbe4a3", outline="#583a78", width=8*S)
d.ellipse(box((305, 280, 333, 308)), fill="#583a78")
d.ellipse(box((319, 287, 327, 295)), fill="#fff8ed")
line([(371, 347), (424, 400)], "#ffd665", 25)
d.polygon(points([(410, 136), (418, 158), (440, 166), (418, 174), (410, 196), (402, 174), (380, 166), (402, 158)]), fill="#fff8ed")
d.ellipse(box((73, 103, 87, 117)), fill="#fff8ed")
d.ellipse(box((412, 240, 424, 252)), fill="#ffd665")

im = im.resize((512, 512), Image.Resampling.LANCZOS)
im.save(ROOT / "assets/app-icon.png", optimize=True)
out = RELEASE / "图画捉迷藏-发布素材"
out.mkdir(exist_ok=True)
shutil.copy2(ROOT / "assets/app-icon.png", out / "图画捉迷藏-图标.png")
shutil.copy2(ROOT / "assets/brand.svg", out / "图画捉迷藏-图标.svg")

cover = Image.new("RGB", (900, 1200), "#fff4e9")
dr = ImageDraw.Draw(cover)
dr.ellipse((-250, -260, 500, 480), fill="#ffd9b2")
dr.ellipse((575, 820, 1170, 1420), fill="#e6ddff")
mark = Image.open(ROOT / "assets/app-icon.png").resize((170, 170), Image.Resampling.LANCZOS)
cover.paste(mark, (365, 58), mark)


def center(text, y, f, color):
    width = dr.textbbox((0, 0), text, font=f)[2]
    dr.text(((900 - width) / 2, y), text, font=f, fill=color)

center("图画捉迷藏", 260, font(76, True), "#4a2c68")
center("找到它，就会亮起来", 374, font(28), "#a75f76")
for key, angle, x, y, title in [
    ("002", -9, 50, 532, "企鹅海滩"),
    ("004", 8, 539, 548, "人多手杂"),
    ("001", 0, 252, 475, "丛林健身房"),
]:
    card = Image.new("RGBA", (310, 462), (0, 0, 0, 0))
    cd = ImageDraw.Draw(card)
    cd.rounded_rectangle((0, 0, 309, 461), radius=24, fill="#fffdf6", outline="#e6c6c6", width=2)
    pic = Image.open(ROOT / f"assets/calibrated/{key}-scene.webp").convert("RGB")
    pic.thumbnail((278, 348))
    card.paste(pic, ((310 - pic.width) // 2, 21))
    cd.text((22, 390), title, font=font(23, True), fill="#4a2c68")
    cd.rounded_rectangle((22, 433, 288, 440), radius=4, fill="#f3ded2")
    cd.rounded_rectangle((22, 433, 180, 440), radius=4, fill="#f07b75")
    card = card.rotate(angle, Image.Resampling.BICUBIC, expand=True)
    cover.paste(card, (x, y), card)
dr.rounded_rectangle((125, 1030, 775, 1103), radius=36, fill="#4a2c68")
center("23 个小世界 · 520 个隐藏目标", 1048, font(25), "#fff0c7")
center("轻点发现  /  自由顺序  /  慢慢收集", 1137, font(20), "#a47289")
cover.save(out / "图画捉迷藏-封面.jpg", quality=94, optimize=True)
print("Icon", (ROOT / "assets/app-icon.png").stat().st_size)
print("Cover", (out / "图画捉迷藏-封面.jpg").stat().st_size)
print(out)
