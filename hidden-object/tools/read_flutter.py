import requests,base64
from pathlib import Path
root=Path('hidden-object/third-party')
for path in ['templates/basic/lib/router.dart','templates/basic/lib/player_progress/player_progress.dart']:
 r=requests.get('https://api.github.com/repos/flutter/games/contents/'+path,timeout=15)
 if r.ok:
  text=base64.b64decode(r.json()['content']).decode();(root/Path(path).name).write_text(text,encoding='utf8');print(path,'\n',text[:1800])
