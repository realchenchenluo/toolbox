import cv2,json,numpy as np,re
from pathlib import Path
from PIL import Image,ImageDraw
root=Path('hidden-object'); ocr=json.loads((root/'qa/ocr.json').read_text(encoding='utf-8-sig'))
def detect_scene(im):
 a=np.asarray(im).astype(np.int32); h,w=a.shape[:2]; sat=a.max(2)-a.min(2)
 mask=((sat>45)&(a.mean(2)<190)&(a.min(2)<155)).astype(np.uint8)
 opened=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((9,max(40,w//3)),np.uint8))
 n,lab,stats,_=cv2.connectedComponentsWithStats(opened,8)
 headers=[(int(x),int(y),int(ww),int(hh)) for x,y,ww,hh,ar in stats[1:] if ww>.6*w and hh>18 and y<h*.38]
 if headers: x,y,ww,hh=max(headers,key=lambda b:b[2]*b[3]); x0=x; x1=x+ww; y0=y
 else: x0=int(w*.14);x1=int(w*.985);y0=0;y=0;hh=int(h*.09)
 col=(sat>25)[:,max(0,x0-12):min(w,x0+12)].mean(0); # title bounds often within a few px of frame
 row=(sat>25)[:,x0+5:x1-5].mean(1)
 runs=[]; active=False
 for j,v in enumerate(row):
  if v>.48 and not active:s=j;active=True
  if active and (v<=.48 or j==h-1):
   e=j
   if e-s>=2 and s>h*.55:runs.append((s,e))
   active=False
 y1=runs[0][0] if runs else h-12
 return [x0,y0,x1,y1]
def captions(info,bbox):
 x0,y0,x1,y1=bbox; out=[]
 for line in info['lines']:
  words=sorted(line['words'],key=lambda q:q['x']); chunks=[]; curr=[];prev=None
  for word in words:
   if prev and word['x']-(prev['x']+prev['w'])>max(word['h'],prev['h'])*.9:
    if curr:chunks.append(curr)
    curr=[]
   curr.append(word);prev=word
  if curr:chunks.append(curr)
  for ws in chunks:
   name=''.join(t['text'] for t in ws).replace(' ','')
   if not re.search(r'[\u4e00-\u9fff]',name) or len(name)>8 or any(q['h']>43 for q in ws):continue
   x=min(q['x'] for q in ws);y=min(q['y'] for q in ws);xx=max(q['x']+q['w'] for q in ws);yy=max(q['y']+q['h'] for q in ws)
   cx=(x+xx)/2;cy=(y+yy)/2
   if x0<cx<x1 and y0<cy<y1:continue
   if any(c in name for c in ['找到','东西','藏起','这些','吗','能找']):continue
   out.append({'name':name,'box':[x,y,xx,yy]})
 return out
def target_boxes(im,info,bbox):
 caps=captions(info,bbox);a=np.asarray(im);ink=((a.max(2)<180)).astype(np.uint8);h,w=ink.shape;x0,y0,x1,y1=bbox
 ink[max(0,y0-3):min(h,y1+5),max(0,x0-4):min(w,x1+5)]=0
 sat=a.astype(np.int32).max(2)-a.astype(np.int32).min(2); ink[sat>24]=0
 ink[:6]=0;ink[-8:]=0;ink[:,:8]=0;ink[:,-8:]=0
 for line in info['lines']:
  for q in line['words']:
   x,y,ww,hh=[int(q[k]) for k in ['x','y','w','h']];ink[max(0,y-2):min(h,y+hh+3),max(0,x-2):min(w,x+ww+3)]=0
 ink=cv2.morphologyEx(ink,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
 n,lab,stats,cent=cv2.connectedComponentsWithStats(ink,8);assigned=[[] for _ in caps]
 for x,y,ww,hh,area in stats[1:]:
  x,y,ww,hh,area=map(int,(x,y,ww,hh,area))
  if area<45 or ww>400 or hh>430 or (ww<4 or hh<4):continue
  best=None
  for j,cap in enumerate(caps):
   l,t,r,b=cap['box'];cx=(l+r)/2; dist=abs((x+ww/2)-cx);dy=t-(y+hh)
   if dy< -8 or dy>350 or dist>max(85,ww*.7,(r-l)*.7):continue
   score=max(0,dy)*.48+dist*1.5
   if best is None or score<best[0]:best=(score,j)
  if best and best[0]<180:assigned[best[1]].append([x,y,x+ww,y+hh])
 out=[]
 for j,c in enumerate(caps):
  parts=assigned[j]; l,t,r,b=c['box'];
  # discard apparent captions that have no associated illustration
  valid=[p for p in parts if (p[2]-p[0])*(p[3]-p[1])>150]
  if not valid:continue
  l=min([l]+[p[0] for p in valid]);t=min([t]+[p[1] for p in valid]);r=max([r]+[p[2] for p in valid]);b=max([b]+[p[3] for p in valid])
  out.append({'name':c['name'],'box':[max(0,l-5),max(0,t-5),min(w,r+5),min(h,b+5)]})
 return out
if __name__=='__main__':
 meta={}
 for f in sorted((root/'source-images').glob('*.png')):
  im=Image.open(f).convert('RGB');b=detect_scene(im); ts=target_boxes(im,ocr[f.stem],b);meta[f.stem]={'sceneBox':b,'targets':ts}
  if int(f.stem)<=12:
   out=Image.new('RGB',(900,max(150,((len(ts)+5)//6)*140)),'white');dr=ImageDraw.Draw(out)
   for j,item in enumerate(ts):
    c=im.crop(item['box']);c.thumbnail((140,108));xx=j%6*150;yy=j//6*140;out.paste(c,(xx+(140-c.width)//2,yy+20));dr.text((xx,yy),str(j+1),fill='black')
   out.save(root/f'qa/captions-{f.stem}.jpg',quality=87)
 (root/'qa/layout.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2),encoding='utf8')
 print('pages',len(meta),'targets',sum(len(v['targets']) for v in meta.values()))
 print({k:(v['sceneBox'],len(v['targets'])) for k,v in list(meta.items())[:12]})

