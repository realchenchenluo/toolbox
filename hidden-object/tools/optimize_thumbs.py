from pathlib import Path
from PIL import Image
root=Path('hidden-object')
for p in (root/'assets/scenes').glob('*.webp'):
 im=Image.open(p).convert('RGB');im.thumbnail((140,180));im.save(root/'assets/thumbs'/p.name,'WEBP',quality=40,method=6)
f=root/'assets/manifest.json'
if f.exists():f.replace(root/'qa/retired-manifest.json')
print('thumbs',sum(p.stat().st_size for p in (root/'assets/thumbs').glob('*')),'assets',sum(p.stat().st_size for p in (root/'assets').rglob('*') if p.is_file()))
