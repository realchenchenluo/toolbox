from pathlib import Path
p=Path('hidden-object/assets/app.js');s=p.read_text(encoding='utf8').replace('image.naturalWidth','canvas.width').replace('image.naturalHeight','canvas.height');p.write_text(s,encoding='utf8')
