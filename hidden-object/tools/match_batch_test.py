import cv2,json,numpy as np,time
from PIL import Image
from pathlib import Path
root=Path('hidden-object');meta=json.loads((root/'qa/isolated-layout.json').read_text(encoding='utf8'));sift=cv2.SIFT_create(nfeatures=3000,contrastThreshold=.018,edgeThreshold=10); flann=cv2.FlannBasedMatcher(dict(algorithm=1,trees=4),dict(checks=48));
for key in ['001','002','003','004','005','010','016','022']:
 im=Image.open(root/f'source-images/{key}.png').convert('RGB');arr=np.asarray(im);x0,y0,x1,y1=meta[key]['sceneBox'];gray=cv2.cvtColor(arr,cv2.COLOR_RGB2GRAY);scene=gray[y0:y1,x0:x1];kpS,ds=sift.detectAndCompute(scene,None);flann.clear();flann.add([ds]);flann.train();found=[];s=time.time()
 for t in meta[key]['targets']:
  b=t.get('iconBox',t['box']);l,top,r,bot=b;temp=gray[top:bot,l:r];kp,desc=sift.detectAndCompute(temp,None)
  if desc is None or len(desc)<4:continue
  try:kn=flann.knnMatch(desc,k=2)
  except cv2.error:continue
  good=[m for pair in kn if len(pair)==2 for m,n in [pair] if m.distance<.74*n.distance]
  if len(good)<6:continue
  p1=np.float32([kp[m.queryIdx].pt for m in good]).reshape(-1,1,2);p2=np.float32([kpS[m.trainIdx].pt for m in good]).reshape(-1,1,2);H,mask=cv2.findHomography(p1,p2,cv2.RANSAC,5)
  if H is None:continue
  inl=int(mask.sum()) if mask is not None else 0;poly=cv2.perspectiveTransform(np.float32([[[0,0],[temp.shape[1],0],[temp.shape[1],temp.shape[0]],[0,temp.shape[0]]]]),H)[0];poly[:,0]+=x0;poly[:,1]+=y0;xx=poly[:,0];yy=poly[:,1];bw=np.ptp(xx);bh=np.ptp(yy);scale=max(bw/max(1,r-l),bh/max(1,bot-top));area=abs(cv2.contourArea(poly.astype(np.float32)));ratio=area/max(1,(r-l)*(bot-top));
  if inl>=6 and inl/max(1,len(good))>.38 and .45<=scale<=1.8 and .18<=ratio<=3.8 and bw>12 and bh>12:
   found.append((t['name'],inl,len(good),round(scale,2),np.round([xx.min(),yy.min(),xx.max(),yy.max()]).astype(int).tolist()))
 print(key,'targets',len(meta[key]['targets']),'matches',len(found),'elapsed',round(time.time()-s,1),found[:8])
