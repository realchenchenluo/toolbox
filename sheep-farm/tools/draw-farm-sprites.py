"""Original pixel art. Runtime only needs the generated PNGs."""
from pathlib import Path
from PIL import Image, ImageDraw
A = Path(__file__).resolve().parents[1] / 'assets'
INK = '#293d39'
def worker(frame):
    im = Image.new('RGBA', (24, 36)); d = ImageDraw.Draw(im)
    def r(box, color): d.rectangle(box, fill=color)
    bend = 3 if frame == 3 else 0
    stride = 1 if frame == 1 else -1 if frame == 2 else 0
    r((7,24,16,29),INK); r((8-stride,27,11-stride,32),'#3f646e'); r((13+stride,27,16+stride,32),'#547f85')
    r((7-stride,32,11-stride,34),INK); r((13+stride,32,18+stride,34),INK); r((8,30,10,31),'#72989a')
    r((7,15+bend,17,25),INK); r((8,15+bend,16,24),'#477d66'); r((9,16+bend,11,23),'#78a077')
    r((8,23,16,25),'#ac8250'); r((12,23,13,24),'#e0bc70')
    r((6,17+bend,8,23+bend),INK); r((7,17+bend,8,21+bend),'#568b6b'); r((7,22+bend,9,24+bend),'#c89263')
    r((16,16+bend,19,22+bend),INK); r((16,17+bend,18,20+bend),'#5d936f'); r((17,21+bend,19,24+bend),'#dfae7e')
    if frame == 3: r((18,24,21,29),INK); r((19,24,21,27),'#e3b98b')
    if frame == 4: r((17,18,21,21),'#dfae7e'); r((20,15,22,20),'#dfae7e')
    r((8,7+bend,17,15+bend),INK); r((10,8+bend,17,14+bend),'#dbac7c'); r((17,10+bend,19,12+bend),'#dbac7c')
    r((9,7+bend,17,9+bend),'#75573e'); r((8,9+bend,10,13+bend),'#75573e'); r((10,11+bend,11,12+bend),'#edc79a')
    r((16,10+bend,16,11+bend),INK); r((16,14+bend,18,14+bend),'#91694b')
    r((8,2+bend,16,6+bend),INK); r((9,3+bend,15,5+bend),'#d7b369'); r((7,6+bend,18,8+bend),INK)
    r((6,6+bend,20,6+bend),'#ad834b'); r((8,5+bend,17,5+bend),'#f0cf81'); r((10,3+bend,12,4+bend),'#efd18d')
    return im
sheet = Image.new('RGBA',(120,36))
for f in range(5): sheet.alpha_composite(worker(f),(f*24,0))
sheet.save(A/'farm-worker.png')
im = Image.new('RGBA',(48,40)); d=ImageDraw.Draw(im)
d.rectangle((3,15,44,37),fill=INK); d.rectangle((6,17,41,35),fill='#986e47'); d.rectangle((7,18,40,19),fill='#c29861')
for x in [8,17,30,39]: d.rectangle((x,20,x+1,34),fill='#79563b')
d.polygon([(1,15),(9,4),(35,4),(47,15),(47,18),(1,18)],fill=INK)
d.polygon([(4,14),(11,6),(34,6),(44,14)],fill='#536a53'); d.line((11,7,34,7),fill='#82976b',width=2)
d.rectangle((16,22,30,36),fill=INK); d.rectangle((18,23,28,35),fill='#443e32')
d.rectangle((9,28,14,35),fill='#b59960'); d.rectangle((10,29,14,30),fill='#e1c88b')
d.rectangle((32,27,40,35),fill='#a58955'); d.rectangle((32,26,39,29),fill='#e4dec0'); d.rectangle((34,24,37,27),fill='#faf0d3')
d.rectangle((34,30,39,31),fill='#84774e'); d.rectangle((2,37,45,39),fill='#466b3e'); im.save(A/'wool-shed.png')
# Sheep poses are drawn separately so this prop generator cannot overwrite the sprite sheet.
print('Saved worker and wool shed; regenerate sheep with draw-sheep-sprite.py.')
im=Image.new('RGBA',(96,96)); d=ImageDraw.Draw(im)
for x,y,c in [(12,21,'#5c934f'),(64,9,'#a1c77a'),(45,68,'#719f55'),(82,50,'#a2c779'),(9,84,'#6a9d51'),(36,36,'#99c171')]:
    d.rectangle((x,y,x+5,y+1),fill=c); d.rectangle((x+2,y-2,x+3,y),fill=c)
im.save(A/'pasture-grass.png')
im=Image.new('RGBA',(40,48)); d=ImageDraw.Draw(im)
d.rectangle((18,23,23,44),fill='#594f37'); d.rectangle((20,22,23,43),fill='#9b784a')
d.polygon([(19,34),(11,28),(12,26),(21,30),(28,23),(30,25),(23,35)],fill='#765d3e')
d.polygon([(3,12),(8,12),(8,6),(14,6),(14,2),(27,2),(27,6),(33,6),(33,12),(37,12),(37,26),(31,26),(31,32),(9,32),(9,28),(3,28)],fill='#3c5e39')
d.polygon([(6,13),(11,13),(11,8),(17,8),(17,5),(25,5),(25,9),(31,9),(31,15),(34,15),(34,24),(28,24),(28,28),(11,28),(11,25),(6,25)],fill='#5b8445')
d.polygon([(8,14),(14,14),(14,9),(23,9),(23,13),(28,13),(28,18),(20,18),(20,22),(9,22)],fill='#799d54')
d.rectangle((14,11,19,13),fill='#94b368'); d.rectangle((26,23,30,25),fill='#4c733e')
d.rectangle((12,43,29,45),fill='#577e43'); d.rectangle((9,45,33,46),fill='#6b9450')
im.save(A/'shade-tree.png')
im=Image.new('RGBA',(80,80)); d=ImageDraw.Draw(im)
for x,y in [(13,17),(57,48)]:
    d.rectangle((x,y,x+1,y+5),fill='#608b47')
    for dx,dy in [(-2,-2),(1,-3),(2,0)]: d.rectangle((x+dx,y+dy,x+dx+2,y+dy+2),fill='#69994e')
    d.point((x+1,y),fill='#9eb769')
im.save(A/'pasture-clover.png')
