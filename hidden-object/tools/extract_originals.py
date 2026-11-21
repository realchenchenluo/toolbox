import fitz
from pathlib import Path
p=next(Path(r'D:\document\xwechat_files\wxid_i6lmyykg2y3b12_58f4\msg\file\2026-11').glob('*图画捉迷藏111*'))
doc=fitz.open(p)
for i,page in enumerate(doc,1):
 pix=fitz.Pixmap(doc,page.get_images(full=True)[0][0]); pix.save(f'hidden-object/source-images/{i:03}.png')
print('extracted',len(doc))
