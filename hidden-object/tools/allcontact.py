from PIL import Image,ImageDraw
for batch in range(5):
 ids=list(range(batch*24+1,min(112,(batch+1)*24+1)));out=Image.new('RGB',(6*200,4*275),'white');dr=ImageDraw.Draw(out)
 for j,n in enumerate(ids):
  im=Image.open(f'hidden-object/source-images/{n:03}.png').convert('RGB');im.thumbnail((185,245));x=j%6*200+5;y=j//6*275+24;out.paste(im,(x,y));dr.text((x,y-18),str(n),fill='black')
 out.save(f'hidden-object/qa/pages-{batch}.jpg',quality=88)
