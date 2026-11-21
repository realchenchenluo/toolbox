"""Register supplied answer scans to the original art; export reviewable regions."""
from pathlib import Path
import json, shutil, cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / 'qa/answers'
QA.mkdir(parents=True, exist_ok=True)
INPUTS = {
1:'d14d12dc-6e85-45ed-90c5-d7f57dfaeeaf',2:'08229bc8-0f88-4871-a687-0950a0952568',
3:'6f9324ed-7104-4fcf-a448-6c501579bfa7',4:'a0e0e3b7-f9e5-4bf2-a2ae-7bae766b0866',
5:'dda2973b-d171-4335-bccc-145c4a6ff49d',6:'f60a8030-01c8-4664-8a20-87687d4c1cfc',
7:'64120493-7410-484d-888b-b04aad391faf',8:'d84d28d6-cadb-4f23-902c-e3043847c428',
9:'3e8bc2db-3793-43ac-8561-53b804c6c9a6',10:'b78eb1b6-93b8-4c1a-8200-ced5734e0dd3',
11:'d81c9533-5848-4460-b0e2-2c551f19a63a',12:'b3a5d425-c1f0-48ce-99b3-3d7ca81446c6',
13:'a3e46f40-3b85-4546-8cb3-5d9f7095c0e2',14:'3b9cb5d3-e8a2-4abb-a85a-a94a1542aa49',
15:'f3a2e7e6-5811-4641-822d-de95379a75b2',16:'89e994a7-b08d-42e4-b37c-44f4f1e7d9d9',
17:'667380cd-f85c-490c-859b-d9b39c022885',18:'3196fcc6-31dc-4154-a144-400d96d76440',
19:'6baae385-edfd-4d98-b5ea-95e1f17b1c4a',20:'8cb9b43c-cdbb-4672-87b7-3bd99702ede6',
21:'60baca3a-34af-4b86-8f27-4f25e85795d7',22:'5b70c6fc-d52b-4612-8422-fa67ebe4d61e',
23:'d307bfed-6814-4dee-a4ea-e785ef972a19'}

def read(path):
    return cv2.imdecode(np.fromfile(str(path), np.uint8), cv2.IMREAD_COLOR)

def run():
    layout = json.loads((ROOT/'qa/isolated-layout.json').read_text(encoding='utf8'))
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
    sift = cv2.SIFT_create(nfeatures=14000, contrastThreshold=.018)
    report = {}
    for n, name in INPUTS.items():
        key = f'{n:03}'
        dest = QA/f'{key}-answer.png'
        if not dest.exists():
            shutil.copy2(Path('C:/Users/33183/AppData/Local/Temp')/f'codex-clipboard-{name}.png', dest)
        original = read(ROOT/f'source-images/{key}.png')
        answer = read(dest)
        cache = QA/f'{key}-transform.npy'
        if cache.exists():
            H = np.load(cache)
        else:
            k1,d1=sift.detectAndCompute(cv2.cvtColor(answer,cv2.COLOR_BGR2GRAY),None)
            k2,d2=sift.detectAndCompute(cv2.cvtColor(original,cv2.COLOR_BGR2GRAY),None)
            pairs=cv2.BFMatcher().knnMatch(d1,d2,k=2)
            good=[m for m,s in pairs if m.distance<.7*s.distance]
            H,inliers=cv2.findHomography(np.float32([k1[m.queryIdx].pt for m in good]),np.float32([k2[m.trainIdx].pt for m in good]),cv2.RANSAC,3)
            assert H is not None and inliers.sum()>50,(key,len(good))
            np.save(cache,H)
        aligned=cv2.warpPerspective(answer,H,(original.shape[1],original.shape[0]),borderValue=(255,255,255))
        overrides={15:[230,112,1263,1330],16:[0,78,997,1304],17:[286,92,1286,1253],18:[26,386,1055,1598],19:[220,65,1248,1274],20:[22,365,1050,1620],22:[0,151,1093,1292]}
        x0,y0,x1,y1=overrides.get(n,layout[key]['sceneBox'])
        # Remove the printed chapter strip from the playable art.
        hsv0=cv2.cvtColor(original,cv2.COLOR_BGR2HSV)
        for yy in range(y0,min(y0+180,y1)):
            if np.mean(hsv0[yy,x0:x1,1]>90)>.65:
                newtop=yy+3
        y0=max(y0,locals().get('newtop',y0));newtop=0
        x0+=4;x1-=4;y1-=4
        hsv=cv2.cvtColor(aligned,cv2.COLOR_BGR2HSV)
        # Bright annotation ink is saturated; original scene is monochrome.
        hue={1:145,2:30,3:0,4:19,5:19,6:19,7:107,8:23,9:140,10:140,11:140,12:60,13:96,14:150,15:20,16:60,17:60,18:30,19:90,20:2,21:96,22:140,23:140}[n]
        delta=np.abs(hsv[:,:,0].astype(int)-hue)
        mask=((hsv[:,:,1]>24)&(hsv[:,:,2]>105)&(np.minimum(delta,180-delta)<12)).astype(np.uint8)*255
        crop=mask[y0:y1,x0:x1].copy()
        crop[:3]=0;crop[-3:]=0;crop[:,:3]=0;crop[:,-3:]=0
        crop=cv2.morphologyEx(crop,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
        np.save(QA/f'{key}-mask.npy',crop)
        count,labels,stats,_=cv2.connectedComponentsWithStats(crop,8)
        regions=[]
        for ci,(x,y,w,h,area) in enumerate(stats[1:],1):
            if area<65 or w*h<140:continue
            region=(labels==ci).astype(np.uint8)*255
            contours,_=cv2.findContours(region,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
            poly=cv2.approxPolyDP(max(contours,key=cv2.contourArea),1.5,True).reshape(-1,2).tolist()
            regions.append({'box':[int(x),int(y),int(w),int(h)],'area':int(area),'poly':poly})
        regions.sort(key=lambda r:(r['box'][1]//75,r['box'][0]))
        rgb=cv2.cvtColor(aligned[y0:y1,x0:x1],cv2.COLOR_BGR2RGB)
        overlay=Image.fromarray(rgb);draw=ImageDraw.Draw(overlay)
        tiles=Image.new('RGB',(800,160*((len(regions)+5)//6)), '#e9edee')
        td=ImageDraw.Draw(tiles)
        for i,r in enumerate(regions):
            x,y,w,h=r['box'];draw.rectangle((x-3,y-3,x+w+3,y+h+3),outline='#0479ff',width=2)
            draw.rectangle((x,y,x+32,y+26),fill='white');draw.text((x+2,y),str(i+1),font=font,fill='#005bd3')
            pic=Image.fromarray(rgb[max(0,y-8):y+h+8,max(0,x-8):x+w+8]);pic.thumbnail((125,125))
            tx=i%6*133;ty=i//6*160;tiles.paste(pic,(tx+(133-pic.width)//2,ty+26+(125-pic.height)//2));td.text((tx+5,ty+1),str(i+1),font=font,fill='black')
        overlay.thumbnail((760,1100));overlay.save(QA/f'{key}-overview.jpg')
        tiles.save(QA/f'{key}-regions.jpg')
        report[key]={'sceneBox':[x0,y0,x1,y1],'regions':regions}
        print(key,len(regions),flush=True)
    (QA/'regions.json').write_text(json.dumps(report,separators=(',',':')),encoding='utf8')

if __name__=='__main__':run()

