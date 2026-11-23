"""Compose publishing art from the game's actual sheep and original pixel scenery.

No model or image API is used. Pixel art is drawn at 360 x 480, then enlarged
with nearest-neighbour filtering; Chinese type is added at output resolution.
"""
from pathlib import Path
import math
import random
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT.parent / 'release' / 'sheep-farm-publishing'
OUT.mkdir(exist_ok=True)
ASSETS = ROOT / 'assets'
RNG = random.Random(4129)
INK = '#284c3d'
CREAM = '#f4e7bd'
GOLD = '#e7b75b'
FONT = 'C:/Windows/Fonts/msyhbd.ttc'
REGULAR = 'C:/Windows/Fonts/msyh.ttc'

sheep = Image.open(ASSETS / 'sheep-sprite.png').convert('RGBA').crop((0, 0, 32, 32))
sheep = sheep.crop(sheep.getbbox())
worker = Image.open(ASSETS / 'farm-worker.png').convert('RGBA').crop((0, 0, 24, 36))
tree = Image.open(ASSETS / 'shade-tree.png').convert('RGBA')


def paste(im, asset, xy, scale=1, flip=False):
    if flip:
        asset = ImageOps.mirror(asset)
    art = asset.resize((round(asset.width * scale), round(asset.height * scale)), Image.Resampling.NEAREST)
    im.alpha_composite(art, xy)


def pixel_circle(d, cx, cy, r, color, step=3):
    for y in range(-r, r + 1, step):
        w = int(math.sqrt(max(0, r*r - y*y)) / step) * step
        d.rectangle((cx - w, cy + y, cx + w, cy + y + step - 1), fill=color)


def cloud(d, x, y, scale=1):
    for box in [(0, 7, 47, 12), (7, 3, 38, 15), (15, 0, 29, 15)]:
        d.rectangle(tuple(int(v * scale + (x if i % 2 == 0 else y)) for i, v in enumerate(box)), fill='#faf1ce')


def grass(d, x, y, color, s=1):
    d.rectangle((x, y, x + 7*s, y + s), fill=color)
    d.rectangle((x + 3*s, y - 3*s, x + 4*s, y), fill=color)
    d.rectangle((x + s, y - s, x + 2*s, y), fill=color)


def fence(d, x, y, length, scale=1):
    d.rectangle((x, y + 5*scale, x + length, y + 8*scale), fill='#786b43')
    d.rectangle((x, y + 3*scale, x + length, y + 5*scale), fill='#d7b97b')
    d.rectangle((x, y + 13*scale, x + length, y + 15*scale), fill='#9a8150')
    for px in range(x + 2, x + length, 24*scale):
        d.rectangle((px, y, px + 5*scale, y + 20*scale), fill='#73613e')
        d.rectangle((px, y, px + 3*scale, y + 18*scale), fill='#c6a56d')


def flower(d, x, y):
    d.rectangle((x, y, x+1, y+6), fill='#557948')
    for a,b in [(-2,-2),(2,-2),(0,-4),(0,0)]:
        d.rectangle((x+a,y+b,x+a+2,y+b+2),fill='#f5edc7')
    d.rectangle((x,y-2,x+1,y-1),fill='#deb458')


def barn(d, x, y):
    d.rectangle((x+4,y+23,x+81,y+80),fill=INK)
    d.rectangle((x+7,y+25,x+78,y+77),fill='#ddc488')
    d.rectangle((x+7,y+70,x+78,y+77),fill='#bea673')
    for px in range(x+10,x+78,9): d.line((px,y+29,px,y+70),fill='#c8ab75',width=1)
    d.polygon([(x,y+24),(x+20,y),(x+67,y),(x+87,y+24),(x+87,y+30),(x,y+30)],fill='#5b5941')
    d.polygon([(x+4,y+23),(x+23,y+3),(x+64,y+3),(x+82,y+23)],fill='#ad6a48')
    for yy in range(y+7,y+25,5): d.line((x+21-(yy-y)//2,yy,x+67+(yy-y)//2,yy),fill='#cf8960',width=2)
    d.rectangle((x+50,y-8,x+59,y+7),fill='#7d7152')
    d.rectangle((x+51,y-9,x+60,y-6),fill='#bfa16c')
    d.rectangle((x+18,y+42,x+48,y+78),fill=INK)
    d.rectangle((x+21,y+45,x+45,y+77),fill='#805d3d')
    d.line((x+22,y+48,x+44,y+75),fill='#c5a36a',width=3)
    d.line((x+44,y+48,x+22,y+75),fill='#c5a36a',width=3)
    d.rectangle((x+57,y+40,x+70,y+54),fill='#557b69')
    d.line((x+63,y+40,x+63,y+54),fill='#f0d99f',width=2)
    d.line((x+57,y+47,x+70,y+47),fill='#f0d99f',width=2)
    d.rectangle((x+10,y+33,x+50,y+36),fill='#efd69a')


def text(im, xy, value, size, fill, regular=False, shadow=None, spacing=0):
    font=ImageFont.truetype(REGULAR if regular else FONT,round(size*3))
    d=ImageDraw.Draw(im)
    pos=(round(xy[0]*3),round(xy[1]*3))
    if shadow: d.text((pos[0]+3,pos[1]+5),value,font=font,fill=shadow)
    if spacing:
        x=pos[0]
        for char in value:
            d.text((x,pos[1]),char,font=font,fill=fill)
            x+=d.textlength(char,font=font)+spacing*3
    else: d.text(pos,value,font=font,fill=fill)


def icon():
    im=Image.new('RGBA',(128,128),INK); d=ImageDraw.Draw(im)
    d.rectangle((4,4,123,123),fill='#e1d39e')
    d.rectangle((8,8,119,119),fill='#c8d5a1')
    pixel_circle(d,95,30,19,'#ecd38b',2)
    d.polygon([(8,60),(25,46),(45,46),(66,65),(89,50),(108,50),(119,59),(119,120),(8,120)],fill='#9bb978')
    d.rectangle((8,88,119,119),fill='#84a164')
    d.rectangle((12,113,115,117),fill='#72915a')
    d.rectangle((29,103,104,109),fill='#658450')
    d.rectangle((36,101,96,105),fill='#5e7c4b')
    paste(im,sheep,(19,30),3)
    for x,y in [(13,104),(104,93),(13,83)]:grass(d,x,y,'#afc682')
    for x,y in [(106,108),(17,35)]:
        d.rectangle((x,y-3,x+1,y+4),fill='#fff1b4');d.rectangle((x-3,y,x+4,y+1),fill='#fff1b4')
    im.convert('RGB').resize((1024,1024),Image.Resampling.NEAREST).save(OUT/'sheep-farm-icon-1024.png')
    im.convert('RGB').resize((512,512),Image.Resampling.NEAREST).save(OUT/'sheep-farm-icon-512.png')


def cover():
    im=Image.new('RGBA',(360,480),CREAM); d=ImageDraw.Draw(im)
    d.rectangle((9,9,350,470),outline=INK,width=2)
    # Editorial cream heading with one clean, layered countryside illustration.
    d.rectangle((18,194,341,452),fill='#d9e3b3')
    pixel_circle(d,283,214,35,'#efd58c',3)
    cloud(d,38,210,.65);cloud(d,180,193,.6)
    d.polygon([(18,248),(51,229),(77,229),(103,246),(145,219),(172,219),(205,245),(237,226),(266,226),(304,250),(341,236),(341,330),(18,330)],fill='#a8bd8e')
    d.polygon([(18,273),(58,255),(97,255),(135,275),(187,248),(222,248),(270,277),(306,263),(341,273),(341,340),(18,340)],fill='#8da778')
    d.polygon([(18,300),(74,278),(144,278),(190,287),(238,279),(290,290),(341,288),(341,390),(18,390)],fill='#799a68')
    for x in range(20,345,17):
        h=RNG.randrange(13,28)
        d.rectangle((x,275-h,x+8,281),fill='#68885e')
        d.rectangle((x-3,278-h,x+11,272),fill='#7d9d6a')
    barn(d,233,229)
    # Winding ochre footpath links the home to the foreground flock.
    d.polygon([(263,306),(278,306),(279,322),(256,340),(236,356),(232,379),(254,402),(279,428),(251,452),(215,452),(235,427),(219,405),(204,377),(211,349),(238,332),(261,317)],fill='#c3b782')
    d.polygon([(268,308),(272,308),(270,322),(249,339),(227,355),(222,377),(239,402),(258,424),(237,450),(225,450),(248,425),(229,402),(213,377),(220,352),(242,334),(265,320)],fill='#d8c993')
    d.polygon([(18,326),(69,315),(130,317),(183,337),(204,360),(189,390),(210,417),(197,452),(18,452)],fill='#9db574')
    d.polygon([(279,340),(310,328),(341,330),(341,452),(274,452),(283,429),(257,402),(244,378)],fill='#8aa362')
    fence(d,25,294,177,1)
    fence(d,283,326,58,1)
    # Little sheep and keeper establish the farm theme; foreground uses the exact game sheep.
    paste(im,sheep,(161,279),1.2,True)
    paste(im,sheep,(203,297),1.1)
    paste(im,tree,(26,240),1.2)
    paste(im,worker,(286,338),1.35,True)
    d.rectangle((276,375,310,378),fill='#6c8751')
    for _ in range(110):
        x,y=RNG.randrange(22,337),RNG.randrange(311,447)
        if not (205<x<280):grass(d,x,y,RNG.choice(['#77945a','#b8c98a','#8ea96b']))
    # Crisp pixel shadow and a hero silhouette, with every body pixel preserved.
    d.rectangle((54,418,197,428),fill='#71894e')
    d.rectangle((67,414,184,431),fill='#71894e')
    paste(im,sheep,(39,310),5)
    for x,y in [(25,430),(189,443),(305,410),(322,385),(91,446)]: flower(d,x,y)
    d.rectangle((18,449,341,452),fill='#6a8651')
    # Small corners and border are part of the poster, never UI chrome.
    for x,y in [(17,17),(335,17),(17,456),(335,456)]:d.rectangle((x,y,x+7,y+7),fill='#b5a06b')
    large=im.convert('RGB').resize((1080,1440),Image.Resampling.NEAREST)
    text(large,(28,24),'牧云羊场',14,INK,spacing=2)
    text(large,(242,28),'像素牧场 · 轻经营',7.5,'#778361')
    text(large,(25,56),'回乡养羊',43,INK,shadow='#d7c99b')
    text(large,(25,108),'一亿退休',43,INK,shadow='#d7c99b')
    # One gold mark keeps the target memorable at thumbnail sizes.
    ld=ImageDraw.Draw(large)
    ld.rectangle((28*3,163*3,102*3,167*3),fill=GOLD)
    text(large,(27,174),'继承家里的羊场，攒够一亿就退休',10,'#667858',regular=True)
    text(large,(27,457),'剪羊毛  ·  雇帮手  ·  升级羊场',8.5,INK)
    text(large,(282,458),'离线可玩',8,'#748260')
    large.save(OUT/'sheep-farm-cover-1080x1440.png')
    large.save(OUT/'sheep-farm-cover-1080x1440.jpg',quality=96,subsampling=0)
    large.resize((540,720),Image.Resampling.LANCZOS).save(OUT/'cover-preview.jpg',quality=94)


if __name__=='__main__':
    icon();cover()
    slogan='回乡养羊，赚够一亿退休'
    print('Slogan:',slogan,len(slogan),'/14')
    for path in sorted(OUT.glob('*')):
        with Image.open(path) as im: print(path.name,im.size,path.stat().st_size)
