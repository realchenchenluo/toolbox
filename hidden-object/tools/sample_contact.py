from pathlib import Path
from PIL import Image,ImageDraw
ids=[15,16,17,18,20,22,26,32,40,64,77,84,93,99,108,111]
out=Image.new('RGB',(4*230,4*280),'white');dr=ImageDraw.Draw(out)
for j,n in enumerate(ids):
 im=Image.open(f'hidden-object/source-images/{n:03}.png').convert('RGB');im.thumbnail((210,250));x=j%4*230+10;y=j//4*280+24;out.paste(im,(x,y));dr.text((x,y-18),str(n),fill='black')
out.save('hidden-object/qa/full-samples.jpg',quality=90)
