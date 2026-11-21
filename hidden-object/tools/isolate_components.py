import json,cv2,numpy as np
from PIL import Image
from pathlib import Path
root=Path('hidden-object');meta=json.loads((root/'qa/final-layout.json').read_text(encoding='utf8'))
for key,md in meta.items():
 im=Image.open(root/f'source-images/{key}.png').convert('RGB');a=np.asarray(im).astype(np.int32);h,w=a.shape[:2];ink=(a.max(2)<180).astype(np.uint8);x0,y0,x1,y1=md['sceneBox'];ink[max(0,y0-3):min(h,y1+4),max(0,x0-4):min(w,x1+5)]=0;ink[:5]=0;ink[-5:]=0;ink[:,:5]=0;ink[:,-5:]=0
 n,labels,stats,_=cv2.connectedComponentsWithStats(ink,8);comps=[]
 for index,(x,y,ww,hh,area) in enumerate(stats[1:],1):
  x,y,ww,hh,area=map(int,(x,y,ww,hh,area))
  if area<70 or ww<8 or hh<9 or ww>400 or hh>430:continue
  comps.append((index,[x,y,x+ww,y+hh],area))
 def iou(a,b):
  x=max(a[0],b[0]);y=max(a[1],b[1]);r=min(a[2],b[2]);bot=min(a[3],b[3]);inter=max(0,r-x)*max(0,bot-y);return inter/max(1,(a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter)
 taken=[]
 for t in md['targets']:
  candidates=[(iou(t['box'],b),index,b,ar) for index,b,ar in comps]
  if not candidates:continue
  score,index,b,ar=max(candidates)
  if score>.08:
   t['component']=int(index);t['iconBox']=b;taken.append(b)
 if key!='001':
  for index,b,ar in comps:
   ww=b[2]-b[0];hh=b[3]-b[1]
   if not(hh>=38 or ww>=56) or ar<170:continue
   if ww>330 or hh>350 or ww/hh>6 or hh/ww>15:continue
   if any(iou(b,known)>.16 or (known[0]-5<=b[0] and known[1]-5<=b[1] and known[2]+5>=b[2] and known[3]+5>=b[3]) for known in taken):continue
   # illustration with an unreadable name: retain the actual printed caption below the cutout
   md['targets'].append({'name':'小物件 '+str(len(md['targets'])+1),'box':[max(0,b[0]-5),max(0,b[1]-5),min(w,b[2]+5),min(h,b[3]+36)],'iconBox':b,'component':index,'unreadable':True})
   taken.append(b)
meta_path=root/'qa/isolated-layout.json';meta_path.write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8');print('targets',sum(len(md['targets']) for md in meta.values()),'counts',[(k,len(md['targets'])) for k,md in list(meta.items())[:12]])
