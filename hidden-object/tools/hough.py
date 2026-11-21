import cv2,numpy as np
from PIL import Image
for n in [1,4,16,18,22,40,77,99]:
 im=np.asarray(Image.open(f'hidden-object/source-images/{n:03}.png').convert('RGB'));h,w=im.shape[:2]
 ed=cv2.Canny(cv2.cvtColor(im,cv2.COLOR_RGB2GRAY),60,150)
 lines=cv2.HoughLinesP(ed,1,np.pi/180,100,minLineLength=int(w*.6),maxLineGap=15)
 hs=[];vs=[]
 if lines is not None:
  for x1,y1,x2,y2 in lines.reshape(-1,4):
   if abs(y2-y1)<5 and abs(x2-x1)>.6*w:hs.append((int((y1+y2)/2),int(min(x1,x2)),int(max(x1,x2))))
   if abs(x2-x1)<5 and abs(y2-y1)>.5*h:vs.append((int((x1+x2)/2),int(min(y1,y2)),int(max(y1,y2))))
 print(n,'h',sorted(hs),'v',sorted(vs))

