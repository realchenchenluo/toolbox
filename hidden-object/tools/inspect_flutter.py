import requests
r=requests.get('https://api.github.com/repos/flutter/games/contents/templates/basic/lib',timeout=15)
if r.ok:print([(x['name'],x['path']) for x in r.json()])
r=requests.get('https://api.github.com/repos/flutter/games/contents/templates/card/lib',timeout=15)
if r.ok:print([(x['name'],x['path']) for x in r.json()])
