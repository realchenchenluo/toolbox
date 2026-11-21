import json
from PIL import Image,ImageOps
from pathlib import Path
root=Path('hidden-object');m=json.loads((root/'qa/manual-layout.json').read_text())
(root/'qa/bands').mkdir(exist_ok=True);trans={}
for key,md in m.items():
 im=Image.open(root/f'source-images/{key}.png').convert('L');w,h=im.size;x0,y0,x1,y1=md['sceneBox']
 bands={'L':[0,0,x0,h],'R':[x1,0,w,h],'T':[x0,0,x1,y0],'B':[x0,y1,x1,h]}
 for k,b in bands.items():
  if b[2]-b[0]<65 or b[3]-b[1]<65:continue
  cr=ImageOps.autocontrast(im.crop(b),cutoff=.3);s=min(3,3800/max(cr.size));cr=cr.resize((round(cr.width*s),round(cr.height*s)),Image.Resampling.LANCZOS)
  id=key+k;cr.save(root/f'qa/bands/{id}.png');trans[id]={'page':key,'box':b,'scale':s}
(root/'qa/band-transforms.json').write_text(json.dumps(trans))
print('bands',len(trans))
