"""Create the level-art-derived app icon and upload cover."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
import shutil

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT.parent / "release"
SCENE = ROOT / "assets/calibrated/001-scene.webp"


def font(size: int, bold: bool = False):
    path = "C:/Windows/Fonts/msyhbd.ttc" if bold else "C:/Windows/Fonts/msyh.ttc"
    return ImageFont.truetype(path, size)


def make_icon():
    scene = Image.open(SCENE).convert("L")
    scene = ImageOps.autocontrast(scene).filter(ImageFilter.UnsharpMask(radius=1.2, percent=130, threshold=2))
    side = 430
    scene = ImageOps.fit(scene, (side, side), method=Image.Resampling.LANCZOS, centering=(.5, .52))

    icon = Image.new("RGB", (512, 512), "#1e2938")
    draw = ImageDraw.Draw(icon)
    draw.rounded_rectangle((16, 16, 496, 496), radius=92, outline="#c7a45b", width=4)
    panel = Image.new("RGB", (side, side), "#f7f0df")
    panel.paste(scene, (0, 0))
    panel = ImageOps.colorize(panel.convert("L"), black="#182333", white="#fbf7ed")

    # A slim warm tint makes the real line art readable as an icon instead of a
    # generic logo while the red lens points at the hidden-object action.
    icon.paste(panel, (41, 41))
    overlay = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    od = ImageDraw.Draw(overlay)
    od.rounded_rectangle((41, 41, 471, 471), radius=35, outline=(255, 253, 248, 210), width=3)
    od.rectangle((41, 41, 471, 95), fill=(30, 41, 56, 190))
    od.rounded_rectangle((54, 54, 155, 84), radius=12, fill=(30, 41, 56, 218))
    od.text((73, 58), "01 / 23", font=font(16, True), fill="#f3e3b7")
    # Highlight an actual area of the first level with the same vermilion used
    # for the game's discovery state.
    cx, cy, radius = 287, 308, 48
    od.ellipse((cx-radius, cy-radius, cx+radius, cy+radius), outline="#c45c4b", width=8)
    od.ellipse((cx-7, cy-7, cx+7, cy+7), fill="#c45c4b")
    od.line((cx+34, cy+34, cx+92, cy+92), fill="#e5c982", width=15)
    od.ellipse((cx+82, cy+82, cx+104, cy+104), fill="#e5c982")
    icon = Image.alpha_composite(icon.convert("RGBA"), overlay).convert("RGB")
    icon.quantize(colors=128, method=Image.Quantize.MEDIANCUT).save(ROOT / "assets/app-icon.png", optimize=True)


def make_svg_fallback():
    # Keep a tiny code-native fallback for environments that do not render PNG
    # in a loading placeholder. The app itself uses the PNG icon above.
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#1e2938"/><rect x="28" y="28" width="456" height="456" rx="84" fill="none" stroke="#c7a45b" stroke-width="4"/><path d="M120 118h176l65 65v210H120a20 20 0 0 1-20-20V138a20 20 0 0 1 20-20Z" fill="#f7f0df"/><path d="M296 118v65h65" fill="#e5c982"/><path d="M143 232c23-28 55-28 78 0-23 28-55 28-78 0Z" fill="none" stroke="#273448" stroke-width="9"/><circle cx="182" cy="232" r="14" fill="#c45c4b"/><circle cx="332" cy="306" r="67" fill="none" stroke="#c45c4b" stroke-width="22"/><path d="m381 355 57 57" stroke="#e5c982" stroke-width="24" stroke-linecap="round"/><path d="m161 292h102M161 318h58" stroke="#cfaa92" stroke-width="8" stroke-linecap="round"/></svg>'''
    (ROOT / "assets/brand.svg").write_text(svg, encoding="utf-8")


def make_cover():
    out = RELEASE / "图画捉迷藏-发布素材"
    out.mkdir(exist_ok=True)
    shutil.copy2(ROOT / "assets/app-icon.png", out / "图画捉迷藏-图标.png")
    shutil.copy2(ROOT / "assets/brand.svg", out / "图画捉迷藏-图标.svg")

    cover = Image.new("RGB", (900, 1200), "#f3f0e9")
    draw = ImageDraw.Draw(cover)
    draw.rectangle((0, 0, 900, 390), fill="#1e2938")
    mark = Image.open(ROOT / "assets/app-icon.png").resize((170, 170), Image.Resampling.LANCZOS)
    cover.paste(mark, (365, 50))

    def center(text, y, f, color):
        width = draw.textbbox((0, 0), text, font=f)[2]
        draw.text(((900 - width) / 2, y), text, font=f, fill=color)

    center("图画捉迷藏", 240, font(74, True), "#f7f0df")
    center("真实关卡 · 细节找物 · 沉浸探索", 347, font(24), "#d8c18a")
    for key, angle, x, y, title in [("002", -7, 44, 545, "企鹅海滩"), ("004", 7, 548, 560, "人多手杂"), ("001", 0, 260, 500, "丛林健身房")]:
        card = Image.new("RGBA", (310, 462), (0, 0, 0, 0))
        cd = ImageDraw.Draw(card)
        cd.rounded_rectangle((0, 0, 309, 461), radius=18, fill="#fffdf7", outline="#d8cdbd", width=2)
        picture = Image.open(ROOT / f"assets/calibrated/{key}-scene.webp").convert("RGB")
        picture.thumbnail((278, 348))
        card.paste(picture, ((310 - picture.width) // 2, 21))
        cd.text((22, 390), title, font=font(23, True), fill="#273448")
        cd.rounded_rectangle((22, 433, 288, 440), radius=4, fill="#e6ded3")
        cd.rounded_rectangle((22, 433, 180, 440), radius=4, fill="#c45c4b")
        rotated = card.rotate(angle, Image.Resampling.BICUBIC, expand=True)
        cover.paste(rotated, (x, y), rotated)
    draw.rounded_rectangle((125, 1032, 775, 1104), radius=32, fill="#273448")
    center("23 个小世界 · 520 个隐藏目标", 1051, font(25), "#f7f0df")
    center("轻点发现  /  自由顺序  /  慢慢收集", 1137, font(20), "#937d6e")
    cover.save(out / "图画捉迷藏-封面.jpg", quality=94, optimize=True)


make_icon()
make_svg_fallback()
make_cover()
print("level-art icon rebuilt")
