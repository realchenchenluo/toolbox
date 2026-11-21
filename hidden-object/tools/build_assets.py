import json,math,cv2,copy,sys
from PIL import Image,ImageOps,ImageEnhance,ImageFilter,ImageDraw
from pathlib import Path
import numpy as np
root=Path('hidden-object');sys.path.insert(0,str(root/'tools'));from segment import captions
meta=json.loads((root/'qa/isolated-layout.json').read_text(encoding='utf8'));orig=json.loads((root/'qa/ocr.json').read_text(encoding='utf-8-sig'));clean=json.loads((root/'qa/ocr-clean.json').read_text(encoding='utf-8-sig'))
first_titles=['丛林健身房','企鹅海滩','短吻鳄聚会','人多手杂','绘画课','夏日演奏会','超级英雄','活力四射','树屋','雪中滑行','乘坐雪橇','池塘文化节']
for p in [root/'assets/scenes',root/'assets/targets']:p.mkdir(exist_ok=True)
book=[]
sift=cv2.SIFT_create(nfeatures=3500,contrastThreshold=.014,edgeThreshold=9)
for key,md in meta.items():
 im=Image.open(root/f'source-images/{key}.png').convert('RGB');w,h=im.size;b=md['sceneBox']
 # Extract original image pixels; suppress gray scan background but retain colored heading.
 scene=im.crop(b);a=np.asarray(scene).astype(np.int32);sat=a.max(2)-a.min(2);gray=(a[:,:,0]*299+a[:,:,1]*587+a[:,:,2]*114)//1000;mono=np.where(gray<155,0,255).astype(np.uint8);out=np.repeat(mono[:,:,None],3,2);colored=sat>28;out[colored]=a[colored].clip(0,255).astype(np.uint8);scene=Image.fromarray(out).quantize(colors=10,dither=Image.Dither.NONE)
 scene.save(root/f'assets/scenes/{key}.webp','WEBP',lossless=True,method=6)
 # use OCR anchors solely to strip caption text from illustration crops; render names crisply in UI
 lines=copy.deepcopy(orig[key]['lines'])
 for line in clean[key]['lines']:
  z=copy.deepcopy(line)
  for q in z['words']:
   for k in ['x','y','w','h']:q[k]/=2
  lines.append(z)
 caps=captions({'lines':lines},b)
 # Pre-locate only clear visual matches; ambiguous shapes remain available for
 # player confirmation rather than being assigned to the wrong target.
 x0,y0,x1,y1=b
 scene_gray=cv2.cvtColor(np.asarray(im.crop((x0,y0,x1,y1))),cv2.COLOR_RGB2GRAY)
 scene_kp,scene_desc=sift.detectAndCompute(scene_gray,None)
 flann=None
 if scene_desc is not None and len(scene_desc)>3:
  flann=cv2.FlannBasedMatcher(dict(algorithm=1,trees=4),dict(checks=64))
  flann.add([scene_desc]);flann.train()
 entries=[];cards=[]
 # Connected illustrations are isolated against white; names are rendered as crisp UI text.
 binary=(np.asarray(im).max(2)<180).astype(np.uint8)
 num,component_labels,stats,_=cv2.connectedComponentsWithStats(binary,8)
 for i,target in enumerate(md['targets']):
  box=target.get('iconBox',target['box']);l,t,r,bot=map(int,box)
  if target.get('iconBox'):
   # Re-identify by bbox; source components may have been split when the page border was removed.
   options=[]
   for ci,(cx,cy,cw,ch,area) in enumerate(stats[1:],1):
    inter=max(0,min(r,cx+cw)-max(l,cx))*max(0,min(bot,cy+ch)-max(t,cy));union=(r-l)*(bot-t)+cw*ch-inter
    if union>0:options.append((inter/union,ci))
   score,ci=max(options) if options else (0,0)
   bw=np.full((max(1,bot-t),max(1,r-l)),255,dtype=np.uint8)
   if score>.15:
    region=component_labels[t:bot,l:r]
    primary=region==ci
    # Also retain disconnected details contained by the main illustration's bounds.
    contained=np.zeros(region.shape,dtype=bool)
    for cj in np.unique(region):
     if cj==0:continue
     cx,cy,cw,ch,area=stats[cj]
     if cx>=l and cy>=t and cx+cw<=r and cy+ch<=bot:contained|=region==cj
    bw[primary|contained]=0
   else:bw=np.where(np.asarray(im.crop((l,t,r,bot)).convert('L'))<175,0,255).astype(np.uint8)
  else:bw=np.where(np.asarray(im.crop((l,t,r,bot)).convert('L'))<175,0,255).astype(np.uint8)
  pic=Image.fromarray(bw).convert('RGB')
  if target.get('unreadable'):
   # Keep the source's printed caption when OCR could not confidently read the name.
   bb=target['box'];pic=im.crop(bb).convert('RGB')
  pic.thumbnail((104,94),Image.Resampling.LANCZOS);card=Image.new('RGB',(120,106),'white');card.paste(pic,((120-pic.width)//2,(106-pic.height)//2));cards.append(card)
  entry={'x':i%5*120,'y':i//5*106,'w':120,'h':106,'label':target['name']}
  if flann is not None:
   tl,tt,tr,tb=map(int,target.get('iconBox',target['box']))
   template=cv2.cvtColor(np.asarray(im.crop((tl,tt,tr,tb))),cv2.COLOR_RGB2GRAY)
   template_kp,template_desc=sift.detectAndCompute(template,None)
   if template_desc is not None and len(template_desc)>=4:
    try:
     pairs=flann.knnMatch(template_desc,k=2)
     good=[first for pair in pairs if len(pair)==2 for first,second in [pair] if first.distance<.77*second.distance]
     if len(good)>=5:
      src=np.float32([template_kp[m.queryIdx].pt for m in good]).reshape(-1,1,2)
      dst=np.float32([scene_kp[m.trainIdx].pt for m in good]).reshape(-1,1,2)
      matrix,inliers=cv2.findHomography(src,dst,cv2.RANSAC,6)
      inlier_count=int(inliers.sum()) if inliers is not None else 0
      if matrix is not None and inlier_count>=7 and inlier_count/len(good)>.34:
       polygon=cv2.perspectiveTransform(np.float32([[[0,0],[template.shape[1],0],[template.shape[1],template.shape[0]],[0,template.shape[0]]]]),matrix)[0]
       polygon[:,0]+=x0;polygon[:,1]+=y0
       width=float(np.linalg.norm(polygon[1]-polygon[0]));height=float(np.linalg.norm(polygon[2]-polygon[1]))
       scale=max(width/max(1,tr-tl),height/max(1,tb-tt))
       area=abs(cv2.contourArea(polygon.astype(np.float32)))/max(1,(tr-tl)*(tb-tt))
       if .45<=scale<=1.8 and .18<=area<=3.8 and width>14 and height>14:
        px=polygon[:,0];py=polygon[:,1]
        entry['match']=[int(max(0,px.min())),int(max(0,py.min())),int(min(w,px.max())),int(min(h,py.max()))]
        entry['confidence']=round(inlier_count/len(good),3)
    except cv2.error:
     pass
  entries.append(entry)
 atlas=Image.new('RGB',(600,max(106,math.ceil(len(cards)/5)*106)),'white')
 for i,card in enumerate(cards):atlas.paste(card,(i%5*120,i//5*106))
 atlas=atlas.quantize(colors=8,dither=Image.Dither.NONE);atlas.save(root/f'assets/targets/{key}.webp','WEBP',lossless=True,method=6)
 title='图画 '+key
 titles=[]
 # title candidates: near top with most glyph height; labels remain smaller
 for line in orig[key]['lines']:
  ws=line['words'];name=''.join(q['text'] for q in ws)
  if ws and len(name)>=3 and len(name)<=12 and min(q['y'] for q in ws)<h*.1 and any('\u4e00'<=c<='\u9fff' for c in name):titles.append((max(q['h'] for q in ws),name))
 if titles:title=max(titles)[1]
 if int(key)<=len(first_titles):title=first_titles[int(key)-1]
 book.append({'id':key,'title':title,'scene':f'assets/scenes/{key}.webp','sprite':f'assets/targets/{key}.webp','items':entries})
 if int(key)%25==0:print(key)
(root/'assets/levels.js').write_text('window.HIDDEN_BOOK='+json.dumps(book,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
print('pages',len(book),'targets',sum(len(l['items']) for l in book),'bytes',sum(p.stat().st_size for p in (root/'assets').rglob('*') if p.is_file()))
