import requests
from pathlib import Path
root=Path('hidden-object/third-party');root.mkdir(exist_ok=True)
for repo,path in [('flutter/games','templates/basic/README.md'),('flutter/games','templates/card/README.md'),('threejsassets/game-hud','dist/skins/nature.css'),('threejsassets/game-hud','LICENSE')]:
 r=requests.get(f'https://raw.githubusercontent.com/{repo}/main/{path}',timeout=15);print(repo,path,r.status_code,len(r.content));(root/(repo.split('/')[1]+'-'+path.replace('/','-'))).write_text(r.text,encoding='utf8')
