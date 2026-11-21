import json,cv2,numpy as np
from pathlib import Path
from PIL import Image
root=Path('hidden-object');md=json.loads((root/'qa/isolated-layout.json').read_text(encoding='utf8'))['001'];im=Image.open(root/'source-images/001.png').convert('RGB');a=np.asarray(im).astype(np.int32);sat=a.max(2)-a.min(2);binary=((a.max(2)<180)&(sat<25)).astype(np.uint8)
n,labels,stats,_=cv2.connectedComponentsWithStats(binary,8)
atlas=Image.new('RGB',(600,8*106),'white')
for i,t in enumerate(md['targets']):
 box=t.get('iconBox',t['box']);l,y,r,b=box
 if t['name']=='剪刀':
  l,y,r,b=1152,1430,1270,1568
  bw=binary[y:b,l:r].copy();bw[1542-y:1568-y,1198-l:]=0
  nn,ll,ss,_=cv2.connectedComponentsWithStats(bw,8);ci=1+int(np.argmax(ss[1:,4]));bw=(ll==ci).astype(np.uint8)*255;bw=255-bw
 else:
  opts=[]
  for ci,(x,yy,w,h,area) in enumerate(stats[1:],1):
   inter=max(0,min(r,x+w)-max(l,x))*max(0,min(b,yy+h)-max(y,yy));union=(r-l)*(b-y)+w*h-inter
   if union>0:opts.append((inter/union,ci))
  score,ci=max(opts) if opts else (0,0);region=labels[y:b,l:r];mask=region==ci
  for cj in np.unique(region):
   if cj==0:continue
   x,yy,w,h,area=stats[cj]
   if x>=l and yy>=y and x+w<=r and yy+h<=b and area<65:mask|=region==cj
  bw=np.where(mask,0,255).astype(np.uint8)
 pic=Image.fromarray(bw).convert('RGB');pic.thumbnail((104,94),Image.Resampling.LANCZOS);card=Image.new('RGB',(120,106),'white');card.paste(pic,((120-pic.width)//2,(106-pic.height)//2));atlas.paste(card,(i%5*120,i//5*106))
atlas.quantize(colors=8,dither=Image.Dither.NONE).save(root/'assets/targets/001.webp','WEBP',lossless=True,method=6)
