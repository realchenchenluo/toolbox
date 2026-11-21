import cv2,json,numpy as np
from PIL import Image
from pathlib import Path
root=Path('hidden-object');meta=json.loads((root/'qa/isolated-layout.json').read_text(encoding='utf8'))['001'];im=np.asarray(Image.open(root/'source-images/001.png').convert('RGB'));x0,y0,x1,y1=meta['sceneBox'];scene=cv2.cvtColor(im[y0:y1,x0:x1],cv2.COLOR_RGB2GRAY);sift=cv2.SIFT_create(nfeatures=10000,contrastThreshold=.012,edgeThreshold=10);kpS,ds=sift.detectAndCompute(scene,None);bf=cv2.BFMatcher(cv2.NORM_L2)
for t in meta['targets']:
 b=t.get('iconBox',t['box']);l,top,r,bot=b;tmp=cv2.cvtColor(im[top:bot,l:r],cv2.COLOR_RGB2GRAY);k,dsc=sift.detectAndCompute(tmp,None)
 if dsc is None:print('NONE',t['name']);continue
 good=[m for m,n in bf.knnMatch(dsc,ds,k=2) if m.distance<.72*n.distance]
 if len(good)<6:print('LOW',t['name'],len(k),len(good));continue
 p1=np.float32([k[m.queryIdx].pt for m in good]).reshape(-1,1,2);p2=np.float32([kpS[m.trainIdx].pt for m in good]).reshape(-1,1,2);H,mask=cv2.findHomography(p1,p2,cv2.RANSAC,5);inl=int(mask.sum()) if mask is not None else 0
 if H is None or inl<7:print('FAIL',t['name'],len(k),len(good),inl);continue
 poly=cv2.perspectiveTransform(np.float32([[[0,0],[tmp.shape[1],0],[tmp.shape[1],tmp.shape[0]],[0,tmp.shape[0]]]]),H)[0];poly[:,0]+=x0;poly[:,1]+=y0;ww=np.linalg.norm(poly[1]-poly[0]);hh=np.linalg.norm(poly[2]-poly[1]);ratio=ww/max(1,tmp.shape[1]);print('OK',t['name'],'kp',len(k),'good',len(good),'inl',inl,'box',np.round(poly).astype(int).tolist(),'scale',round(ratio,2),round(hh/tmp.shape[0],2))
