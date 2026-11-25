"""Create an isolated local UI fixture; never include this page in the runtime ZIP."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
qa=root/'.work'/'ui-check'
qa.mkdir(parents=True,exist_ok=True)
base='/sheep-farm/'
testbase=base+'.work/ui-check/'
entry=(root/'index.html').read_text(encoding='utf-8')
entry=entry.replace('<head>','<head>\n<base href="'+base+'">\n<script src="'+testbase+'native.js"></script>')
entry=entry.replace('./assets/app.js?v=20261125-guide-11',testbase+'app-qa.js')
entry=entry.replace('</body>','<script defer src="'+testbase+'checks.js"></script>\n</body>')
(qa/'index.html').write_text(entry,encoding='utf-8')
(qa/'native.js').write_text((root/'tests/fixtures/native-window.js').read_text(encoding='utf-8'),encoding='utf-8')
(qa/'checks.js').write_text((root/'tests/browser-controls.js').read_text(encoding='utf-8'),encoding='utf-8')
app=(root/'assets/app.js').read_text(encoding='utf-8')
api="""window.FarmQA={get state(){return state;},render:render,tick:tick,
reset:function(level){closeModal();state=cloneState();storageHydrated=true;state.level=level;state.gold=100000;state.earned=100000;state.tutorial.seen=true;state.tutorial.done=true;state.upgrades.capacity=7;state.hay=200;state.water=200;state.wool=1000;state.meat=1000;lastPaidAction='';lastPaidAt=0;state.sheep.forEach(function(s){s.age=80;s.wool=100;});render();},setCloud:function(x){cloudStore=x;}};"""
needle='  render(); hydratePlatformState(); setInterval(tick, 4000);'
assert needle in app
(qa/'app-qa.js').write_text(app.replace(needle,'  '+api+'\n'+needle),encoding='utf-8')
print('http://127.0.0.1:8090/sheep-farm/.work/ui-check/index.html')
