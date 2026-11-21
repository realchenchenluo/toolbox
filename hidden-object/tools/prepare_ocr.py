from pathlib import Path
import json,numpy as np
from PIL import Image,ImageEnhance,ImageOps
root=Path('hidden-object');types='A A A B B A B A B C D B A A A C A E A E A C D A B B C D B B B A E A E A E A E E B A B A D C A B A B D C B B A D C A A B A D C B A B B D C B B B A D C A E A E F F A A E E A E A A E E A C A E E A A E A A E E A E A A E E E A'.split()
assert len(types)==111,len(types)
boxes={'A':[.14,.025,.985,.817],'B':[.02,.18,.86,.975],'C':[.0,.02,.85,.82],'D':[.155,.025,1,.82],'E':[.015,.20,.845,.98],'F':[.15,.22,1,.98]}
m={}
for i,t in enumerate(types,1):
 im=Image.open(root/f'source-images/{i:03}.png').convert('RGB');w,h=im.size;b=[round(v*s) for v,s in zip(boxes[t],[w,h,w,h])]
 if i<=14:
  old=json.loads((root/'qa/layout.json').read_text(encoding='utf8'))[f'{i:03}']['sceneBox']
  if old[2]-old[0]>w*.65 and old[3]-old[1]>h*.65:b=old
 # exact requested first scene, retaining full title
 if i==1:b=[174,39,1260,1310]
 if i==3:b=[174,0,1276,1295]
 m[f'{i:03}']={'sceneBox':b,'type':t}
 x0,y0,x1,y1=b;a=np.asarray(im).copy();a[max(0,y0-3):min(h,y1+5),max(0,x0-3):min(w,x1+5)]=255
 # remove colored frames and title, preserve black captions/icons
 aa=a.astype(np.int32);sat=aa.max(2)-aa.min(2); a[sat>30]=255
 result=Image.fromarray(a);result=ImageOps.autocontrast(result.convert('L'),cutoff=.5); result=result.resize((w*2,h*2),Image.Resampling.LANCZOS);result.save(root/f'qa/ocr-input/{i:03}.png')
(root/'qa/manual-layout.json').write_text(json.dumps(m),encoding='utf8')
Image.open(root/'source-images/001.png').crop((0,1307,1290,1612)).save(root/'qa/first-bottom.png')
