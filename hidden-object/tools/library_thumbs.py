from pathlib import Path
from PIL import Image
import json
root=Path('hidden-object');(root/'assets/thumbs').mkdir(exist_ok=True)
p=root/'assets/levels.js';s=p.read_text(encoding='utf8');book=json.loads(s[len('window.HIDDEN_BOOK='):].strip().rstrip(';'))
for l in book:
 im=Image.open(root/l['scene']).convert('RGB');im.thumbnail((180,230));im.save(root/f"assets/thumbs/{l['id']}.webp",'WEBP',quality=52,method=6);l['thumb']=f"assets/thumbs/{l['id']}.webp"
p.write_text('window.HIDDEN_BOOK='+json.dumps(book,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
p=root/'index.html';s=p.read_text(encoding='utf-8-sig').replace('<div id="level-grid" class="level-grid"></div>','<div id="level-grid" class="level-grid"></div><button id="more-levels" class="more-levels btn btn-ok" type="button">继续翻开后面的关卡</button>');p.write_text(s,encoding='utf8')
p=root/'assets/app.js';s=p.read_text(encoding='utf8');start=s.index('function renderLibrary(){');end=s.index('\ncanvas.addEventListener',start)
s=s[:start]+'''var shownLevels=0;
function appendLevels(){var grid=$('level-grid'),frag=document.createDocumentFragment();book.slice(shownLevels,shownLevels+24).forEach(function(l,j){var i=shownLevels+j;var button=document.createElement('button');button.type='button';button.className='level-card'+(progress.completed[l.id]?' completed':'');button.setAttribute('data-level',i);var img=document.createElement('img');img.alt='';img.setAttribute('loading','lazy');img.src='./'+l.thumb;var title=document.createElement('strong');title.textContent=String(i+1).padStart(2,'0')+' / '+l.title;var sub=document.createElement('small');sub.textContent=l.items.length+' 个小东西';button.appendChild(img);button.appendChild(title);button.appendChild(sub);frag.appendChild(button);});grid.appendChild(frag);shownLevels=Math.min(shownLevels+24,book.length);$('more-levels').hidden=shownLevels>=book.length;}
function renderLibrary(){save();$('play-view').hidden=true;$('library-view').hidden=false;$('completed-count').textContent=Object.keys(progress.completed).length;$('level-grid').textContent='';shownLevels=0;appendLevels();window.scrollTo(0,0);}
$('more-levels').addEventListener('click',appendLevels);
''' +s[end:];p.write_text(s,encoding='utf8')
p=root/'assets/style.css';s=p.read_text(encoding='utf8')+'\n.more-levels{display:block;margin:30px auto 15px;font-size:12px!important}\n';p.write_text(s,encoding='utf8')
print('thumbnail bytes',sum(p.stat().st_size for p in (root/'assets/thumbs').glob('*')))
