"""Render the original complete-frame sheep sequences for review, without a release ZIP."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import json

root = Path(__file__).resolve().parents[1]
sprites = root / 'assets' / 'sheep'
output = root.parent / 'release'
output.mkdir(exist_ok=True)
font_path = Path('C:/Windows/Fonts/msyh.ttc')
def font(size): return ImageFont.truetype(str(font_path), size) if font_path.exists() else ImageFont.load_default()
manifest = json.loads((sprites / 'sequences.json').read_text(encoding='utf-8'))
labels = ['待机', '行走', '坐下', '吃草', '喝水', '卧下', '睡觉']
prefixes = ['young-normal-wool', 'adult-normal-wool', 'adult-normal-shorn']
frames = []
for tick in range(32):
    now = tick * 130
    canvas = Image.new('RGB', (600, 676), '#f3f7e8')
    d = ImageDraw.Draw(canvas)
    d.rounded_rectangle((12, 12, 588, 664), radius=14, fill='#e4eed4', outline='#b5cb9c', width=2)
    d.text((30, 24), '牧云羊场 · 羊动作序列', font=font(24), fill='#3f663c')
    d.text((31, 62), '完整帧切换  /  四帧迈腿  /  整体镜像转身', font=font(13), fill='#66835a')
    for x, label in zip((168, 330, 492), ('幼羊', '成年羊', '剪毛后')):
        d.text((x-22, 94), label, font=font(15), fill='#537346')
    for row, spec in enumerate(manifest['sequences']):
        top = 121 + row * 75
        d.rounded_rectangle((26, top, 574, top + 69), radius=7, fill='#f5f8ee' if row % 2 == 0 else '#eaf1de')
        d.text((38, top+18), labels[row], font=font(17), fill='#4f7045')
        pose = spec['name']
        frame = (1 if now % 4200 >= 4060 else 0) if pose in ('idle','sit') else now // spec['frameMs'] % spec['frames']
        for x, prefix in zip((168, 330, 492), prefixes):
            im = Image.open(sprites / f'{prefix}-{pose}-{frame}.png').convert('RGBA').resize((96,96), Image.Resampling.NEAREST)
            d.ellipse((x-29, top+53, x+29, top+61), fill='#cadbb4')
            canvas.paste(im, (x-48,top-17), im)
            if pose == 'sleep': d.text((x+29,top+6-(tick//4)%3), 'z', font=font(14), fill='#7994ac')
    frames.append(canvas)
frames[0].save(output / '牧云羊场-羊动作序列预览.png')
frames[0].save(output / '牧云羊场-羊动作序列预览.gif',save_all=True,append_images=frames[1:],duration=130,loop=0,optimize=True,disposal=2)
print(output / '牧云羊场-羊动作序列预览.gif')
