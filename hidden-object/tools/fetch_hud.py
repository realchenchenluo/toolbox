import requests,base64
from pathlib import Path
r=requests.get('https://api.github.com/repos/threejsassets/game-hud/contents/dist/skins/nature.css',timeout=15);print(r.status_code)
if r.ok:
 t=base64.b64decode(r.json()['content']).decode();Path('hidden-object/third-party/nature.css').write_text(t,encoding='utf8');print(t[:2500])
r=requests.get('https://api.github.com/repos/threejsassets/game-hud/contents/LICENSE',timeout=15)
if r.ok:Path('hidden-object/third-party/LICENSE-game-hud.txt').write_bytes(base64.b64decode(r.json()['content']))
