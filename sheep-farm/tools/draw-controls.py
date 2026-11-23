"""Original pixel icons for the farm's buttons; generated as complete atlas cells."""
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[1];assets=root/'assets'
names=['shear','sheep','meat','market','upgrade','order','coin','save','hay','water','worker','barn','clover','tree']
ink='#2d463c';gold='#e9bd62';light='#fff1c4';steel='#a7c9be'
sheet=Image.new('RGBA',(24*len(names),24))
for i,name in enumerate(names):
 im=Image.new('RGBA',(24,24));d=ImageDraw.Draw(im)
 def r(box,c):d.rectangle(box,fill=c)
 if name=='sheep':
  sheep=Image.open(assets/'sheep-sprite.png').crop((0,0,32,32));im.alpha_composite(sheep.resize((24,24),Image.Resampling.NEAREST))
 elif name=='shear':
  d.line((8,18,18,4),fill=ink,width=4);d.line((16,18,6,4),fill=ink,width=4)
  d.line((8,17,18,4),fill=steel,width=2);d.line((16,17,6,4),fill='#d9e1cb',width=2)
  for x in [3,13]:r((x,14,x+7,22),ink);r((x+2,16,x+5,19),gold)
  r((10,10,13,13),ink);r((11,11,12,12),light)
 elif name=='meat':
  r((3,11,21,21),ink);r((5,13,19,19),'#a37347');r((5,16,19,17),'#d8b176')
  d.polygon([(5,9),(7,4),(14,3),(19,6),(21,12),(17,15),(10,13)],fill=ink)
  d.polygon([(7,9),(9,6),(14,5),(18,8),(18,11),(16,13),(11,11)],fill='#d5856b');r((15,7,17,9),light)
 elif name=='market':
  r((4,9,20,21),ink);r((6,10,18,19),'#d8bb7d');r((10,13,15,21),ink)
  d.polygon([(1,10),(4,3),(20,3),(23,10),(23,12),(1,12)],fill=ink)
  for x,c in [(3,'#ce8751'),(8,light),(13,'#ce8751'),(18,light)]:r((x,5,x+3,10),c)
 elif name=='upgrade':
  d.line((5,20,17,6),fill=ink,width=6);d.line((5,20,17,6),fill='#c8a467',width=3)
  d.polygon([(9,4),(13,1),(22,8),(18,13)],fill=ink);d.polygon([(12,4),(14,4),(20,8),(18,10)],fill=steel)
 elif name=='order':
  r((5,2,19,22),ink);r((7,4,17,20),light);r((10,1,14,5),'#b48c4f')
  for y in [8,12,16]:r((9,y,15,y+1),'#9ca67c')
  r((8,8,9,9),'#597f52');r((8,12,9,13),'#597f52')
 elif name=='coin':
  d.polygon([(7,2),(17,2),(22,7),(22,17),(17,22),(7,22),(2,17),(2,7)],fill=ink)
  d.polygon([(8,4),(16,4),(20,8),(20,16),(16,20),(8,20),(4,16),(4,8)],fill=gold)
  r((7,6,9,15),light);r((11,7,14,17),'#ac7b3d');r((9,11,16,12),'#ac7b3d')
 elif name=='save':
  r((3,3,20,21),ink);r((5,5,18,19),'#947751');r((7,4,16,10),light);r((13,5,15,8),'#637d61');r((7,13,16,20),'#d3b276')
 elif name=='hay':
  r((3,6,20,21),ink);r((5,8,18,19),gold)
  for x in [7,12,16]:r((x,9,x,18),'#bd9147')
  r((4,12,19,14),'#8d7848')
 elif name=='water':
  d.polygon([(12,1),(20,13),(20,18),(16,22),(8,22),(4,18),(4,13)],fill=ink)
  d.polygon([(12,5),(17,13),(17,17),(14,19),(9,19),(7,16),(7,13)],fill='#80bfcb');r((8,13,9,16),'#d0e4d8')
 elif name=='worker':
  art=Image.open(assets/'farm-worker.png').crop((0,0,24,36)).resize((16,24),Image.Resampling.NEAREST);im.alpha_composite(art,(4,0))
 elif name=='barn':
  im.alpha_composite(Image.open(assets/'wool-shed.png').resize((24,20),Image.Resampling.NEAREST),(0,3))
 elif name=='tree':
  im.alpha_composite(Image.open(assets/'shade-tree.png').resize((20,24),Image.Resampling.NEAREST),(2,0))
 elif name=='clover':
  d.line((10,18,13,10),fill=ink,width=3)
  for x,y in [(3,8),(10,2),(14,10)]:r((x,y,x+7,y+6),ink);r((x+2,y+1,x+6,y+4),'#a0bd6c')
 sheet.alpha_composite(im,(i*24,0))
sheet.save(assets/'controls-atlas.png')
print('Saved',len(names),'pixel control icons.')
