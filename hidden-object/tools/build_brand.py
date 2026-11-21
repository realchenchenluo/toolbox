"""Build the premium 图画捉迷藏 brand mark and submission artwork."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import shutil

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT.parent / "release"

svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
<defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="9" stdDeviation="7" flood-color="#0b1320" flood-opacity=".3"/></filter></defs>
<rect width="512" height="512" rx="112" fill="#1e2938"/>
<rect x="19" y="19" width="474" height="474" rx="94" fill="none" stroke="#c7a45b" stroke-width="4" opacity=".75"/>
<circle cx="424" cy="88" r="72" fill="#2c3a4c"/>
<path d="M119 104h168l72 72v220H119a22 22 0 0 1-22-22V126a22 22 0 0 1 22-22Z" fill="#f7f0df" filter="url(#shadow)"/>
<path d="M287 104v72h72" fill="#e5c982"/>
<path d="M126 135v209" stroke="#d5a794" stroke-width="8" stroke-linecap="round"/>
<path d="M163 232c22-27 53-28 75 0-22 28-53 27-75 0Z" fill="none" stroke="#273448" stroke-width="8"/>
<circle cx="201" cy="232" r="15" fill="#c45c4b"/><circle cx="206" cy="227" r="4" fill="#f7f0df"/>
<path d="M163 287h90M163 314h56" stroke="#cfaa92" stroke-width="8" stroke-linecap="round"/>
<circle cx="322" cy="292" r="70" fill="#c45c4b" stroke="#f7f0df" stroke-width="17" filter="url(#shadow)"/>
<circle cx="322" cy="292" r="37" fill="#f7f0df" stroke="#273448" stroke-width="8"/>
<circle cx="322" cy="292" r="14" fill="#273448"/><circle cx="327" cy="287" r="4" fill="#f7f0df"/>
<path d="m373 345 52 53" stroke="#e5c982" stroke-width="24" stroke-linecap="round"/>
<path d="m411 134 7 20 20 7-20 7-7 20-7-20-20-7 20-7Z" fill="#e5c982"/>
<circle cx="81" cy="102" r="6" fill="#e5c982"/><circle cx="419" cy="247" r="5" fill="#c45c4b"/>
</svg>'''
(ROOT / "assets/brand.svg").write_text(svg, encoding="utf8")


def font(size: int, bold: bool = False):
    path = "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"
    return ImageFont.truetype(path, size)

S = 4
W = 512 * S
im = Image.new("RGBA", (W, W), "#1e2938")
d = ImageDraw.Draw(im)

def box(v): return tuple(round(x * S) for x in v)
def pts(v): return [(round(x*S), round(y*S)) for x,y in v]
def line(v, fill, width):
    p = pts(v); d.line(p, fill=fill, width=round(width*S), joint="curve")
    r = width*S/2
    for x,y in (p[0],p[-1]): d.ellipse((round(x-r),round(y-r),round(x+r),round(y+r)), fill=fill)

# Deep ink canvas, brass keyline, and a soft card shadow.
d.rounded_rectangle(box((19,19,493,493)), radius=94*S, outline="#c7a45b", width=4*S)
d.ellipse(box((352,16,496,160)), fill="#2c3a4c")
shadow = Image.new("RGBA", (W,W), (0,0,0,0)); sd = ImageDraw.Draw(shadow)
sd.rounded_rectangle(box((98,99,372,408)), radius=24*S, fill="#0b1320aa")
shadow = shadow.filter(ImageFilter.GaussianBlur(9*S)); im.alpha_composite(shadow); d = ImageDraw.Draw(im)
d.rounded_rectangle(box((97,104,359,396)), radius=22*S, fill="#f7f0df")
d.polygon(pts([(287,104),(359,176),(287,176)]), fill="#e5c982")
line([(126,135),(126,344)], "#d5a794", 8)
d.polygon(pts([(163,232),(174,215),(196,205),(219,209),(238,232),(219,255),(196,259),(174,249)]), outline="#273448", fill=None)
d.ellipse(box((186,217,216,247)), fill="#c45c4b"); d.ellipse(box((200,222,208,230)), fill="#f7f0df")
line([(163,287),(253,287)], "#cfaa92", 8); line([(163,314),(219,314)], "#cfaa92", 8)
d.ellipse(box((252,222,392,362)), fill="#c45c4b", outline="#f7f0df", width=17*S)
d.ellipse(box((285,255,359,329)), fill="#f7f0df", outline="#273448", width=8*S)
d.ellipse(box((308,278,336,306)), fill="#273448"); d.ellipse(box((318,283,326,291)), fill="#f7f0df")
line([(373,345),(425,398)], "#e5c982", 24)
d.polygon(pts([(411,134),(418,154),(438,161),(418,168),(411,188),(404,168),(384,161),(404,154)]), fill="#e5c982")
d.ellipse(box((75,96,87,108)), fill="#e5c982"); d.ellipse(box((414,242,424,252)), fill="#c45c4b")
im.resize((512,512), Image.Resampling.LANCZOS).save(ROOT / "assets/app-icon.png", optimize=True)

out = RELEASE / "图画捉迷藏-发布素材"; out.mkdir(exist_ok=True)
shutil.copy2(ROOT / "assets/app-icon.png", out / "图画捉迷藏-图标.png")
shutil.copy2(ROOT / "assets/brand.svg", out / "图画捉迷藏-图标.svg")

cover = Image.new("RGB", (900,1200), "#f3efe6"); cd = ImageDraw.Draw(cover)
cd.rectangle((0,0,900,470), fill="#1e2938")
cd.ellipse((-270,-300,450,420), fill="#2c3a4c")
mark = Image.open(ROOT / "assets/app-icon.png").resize((172,172), Image.Resampling.LANCZOS)
cover.paste(mark, (364,58), mark)

def center(text, y, f, color):
    w = cd.textbbox((0,0),text,font=f)[2]; cd.text(((900-w)/2,y),text,font=f,fill=color)
center("图画捉迷藏", 260, font(76, True), "#f7f0df")
center("找到细节，收集惊喜", 375, font(28), "#d8c18a")
for key, angle, x, y, title in [("002",-7,42,560,"企鹅海滩"),("004",7,548,574,"人多手杂"),("001",0,260,514,"丛林健身房")]:
    card=Image.new("RGBA",(310,462),(0,0,0,0)); c=ImageDraw.Draw(card)
    c.rounded_rectangle((0,0,309,461),radius=18,fill="#fffdf7",outline="#d8cdbd",width=2)
    pic=Image.open(ROOT/f"assets/calibrated/{key}-scene.webp").convert("RGB"); pic.thumbnail((278,348)); card.paste(pic,((310-pic.width)//2,21))
    c.text((22,390),title,font=font(23,True),fill="#273448")
    c.rounded_rectangle((22,433,288,440),radius=4,fill="#e6ded3"); c.rounded_rectangle((22,433,180,440),radius=4,fill="#c45c4b")
    cover.paste(card.rotate(angle,Image.Resampling.BICUBIC,expand=True),(x,y),card.rotate(angle,Image.Resampling.BICUBIC,expand=True))
cd.rounded_rectangle((125,1032,775,1104),radius=32,fill="#273448")
center("23 个小世界 · 520 个隐藏目标",1051,font(25),"#f7f0df")
center("轻点发现  /  自由顺序  /  慢慢收集",1137,font(20),"#937d6e")
cover.save(out/"图画捉迷藏-封面.jpg",quality=94,optimize=True)
print("brand assets rebuilt")
