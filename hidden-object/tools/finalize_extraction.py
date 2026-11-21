from pathlib import Path
p=Path('hidden-object/assets/app.js');s=p.read_text(encoding='utf8').replace('window.innerWidth<=650','window.innerWidth<=820');p.write_text(s,encoding='utf8')
p=Path('hidden-object/tools/build_assets.py');s=p.read_text(encoding='utf8').replace('qa/final-layout.json','qa/isolated-layout.json')
s=s.replace(" # use OCR anchors solely", " # use OCR anchors solely")
start=s.index(" for i,target in enumerate(md['targets']):")
end=s.index(" atlas=Image.new",start)
s=s[:start]+''' # Connected illustrations are isolated against white; names are rendered as crisp UI text.
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
  entries.append({'x':i%5*120,'y':i//5*106,'w':120,'h':106,'label':target['name']})
''' + s[end:]
# Remove abandoned title selection stub.
start=s.index(' titles=[]');end=s.index(' # title candidates',start);s=s[:start]+' titles=[]\n'+s[end:]
p.write_text(s,encoding='utf8')
