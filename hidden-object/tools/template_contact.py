from PIL import Image,ImageDraw
import json
from pathlib import Path
m=json.loads(Path('hidden-object/qa/isolated-layout.json').read_text(encoding='utf8'))['001'];im=Image.open('hidden-object/source-images/001.png'); names=['手袋','画笔','香蕉','贝壳','心','螺丝钉'];out=Image.new('RGB',(500,len(names)*190),'white');dr=ImageDraw.Draw(out)
for i,n in enumerate(names):
 t=next(x for x in m['targets'] if x['name']==n); b=t.get('iconBox',t['box']);c=im.crop(b).resize((max(1,(b[2]-b[0])*2),max(1,(b[3]-b[1])*2)));out.paste(c,(0,i*190));dr.text((300,i*190+10),n,fill='black');dr.text((300,i*190+35),str(b),fill='black')
out.save('hidden-object/qa/templates.jpg',quality=88)
