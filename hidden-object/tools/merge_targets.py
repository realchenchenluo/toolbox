import json,copy,sys,cv2,re
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
import numpy as np
root=Path('hidden-object');sys.path.insert(0,str(root/'tools'));from segment import target_boxes,captions
orig=json.loads((root/'qa/ocr.json').read_text(encoding='utf-8-sig'));clean=json.loads((root/'qa/ocr-clean.json').read_text(encoding='utf-8-sig'));bands=json.loads((root/'qa/ocr-bands.json').read_text(encoding='utf-8-sig'));trans=json.loads((root/'qa/band-transforms.json').read_text());layout=json.loads((root/'qa/manual-layout.json').read_text())
merged={}
for key in layout:
 lines=copy.deepcopy(orig[key]['lines'])
 for line in clean[key]['lines']:
  z=copy.deepcopy(line)
  for q in z['words']:
   for k in ['x','y','w','h']:q[k]/=2
  lines.append(z)
 for id,tr in trans.items():
  if tr['page']!=key:continue
  for line in bands[id]['lines']:
   z=copy.deepcopy(line)
   for q in z['words']:
    q['x']=q['x']/tr['scale']+tr['box'][0];q['y']=q['y']/tr['scale']+tr['box'][1];q['w']/=tr['scale'];q['h']/=tr['scale']
   lines.append(z)
 # split and deduplicate caption anchors before assigning illustration pieces
 info={'lines':lines}; caps=captions(info,layout[key]['sceneBox']); unique=[]
 for c in caps:
  l,t,r,b=c['box'];cx=(l+r)/2;cy=(t+b)/2
  matches=[(j,e) for j,e in enumerate(unique) if abs(cx-(e['box'][0]+e['box'][2])/2)<20 and abs(cy-(e['box'][1]+e['box'][3])/2)<16]
  if matches:
   j,e=matches[0]
   if len(c['name'])>len(e['name']):unique[j]=c
  else:unique.append(c)
 # first page: manually checked source captions missing from OCR
 if key=='001':
  adds=[('心',[110,266,143,294]),('鼓',[77,741,104,766]),('书',[126,1383,153,1412]),('蜗牛',[120,1450,174,1482]),('戒指',[520,1467,570,1494]),('闪电',[650,1500,703,1527]),('梳子',[772,1460,822,1491]),('扇子',[885,1478,941,1507]),('一块派',[143,1553,215,1577])]
  for name,box in adds:
   if not any(e['name']==name for e in unique):unique.append({'name':name,'box':box})
 # treat each caption as one word, but keep all recognized text erased from component image
 # segment.target_boxes calls captions again; override function lookup for merged anchors.
 import segment
 old=segment.captions;segment.captions=lambda *args:unique
 im=Image.open(root/f'source-images/{key}.png').convert('RGB'); ts=segment.target_boxes(im,info,layout[key]['sceneBox']);segment.captions=old
 # remove duplicate targets from overlapping caption OCRs
 final=[]
 for t in ts:
  bb=t['box']; cx=(bb[0]+bb[2])/2;cy=(bb[1]+bb[3])/2
  if any(e['name']==t['name'] and abs(cx-(e['box'][0]+e['box'][2])/2)<90 and abs(cy-(e['box'][1]+e['box'][3])/2)<85 for e in final):continue
  final.append(t)
 merged[key]={'sceneBox':layout[key]['sceneBox'],'targets':final}
(root/'qa/final-layout.json').write_text(json.dumps(merged,ensure_ascii=False,indent=2),encoding='utf8')
print('pages',len(merged),'targets',sum(len(v['targets']) for v in merged.values()),'min',min(len(v['targets']) for v in merged.values()))
print([(k,len(v['targets'])) for k,v in merged.items() if len(v['targets'])<10])
for key in ['001','004','022','040','099']:
 im=Image.open(root/f'source-images/{key}.png');ts=merged[key]['targets'];out=Image.new('RGB',(900,max(150,((len(ts)+5)//6)*150)),'white');dr=ImageDraw.Draw(out)
 for j,t in enumerate(ts):
  c=im.crop(t['box']);c.thumbnail((140,125));xx=j%6*150;yy=j//6*150;out.paste(c,(xx+(140-c.width)//2,yy+18));dr.text((xx,yy),str(j+1),fill='black')
 out.save(root/f'qa/merged-{key}.jpg',quality=88)
