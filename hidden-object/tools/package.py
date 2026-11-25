"""Create the upload artifact from referenced runtime files only."""
from pathlib import Path
from html.parser import HTMLParser
import json, re, shutil, zipfile, hashlib
from PIL import Image
from urllib.parse import urlsplit
BASE = Path(__file__).resolve().parents[2]
ROOT = BASE/'hidden-object'
OUT = BASE/'release/hidden-object-minitool.zip'
book = json.loads((ROOT/'assets/levels.js').read_text(encoding='utf8').split('=',1)[1].strip().rstrip(';'))
playable = [l for l in book if l.get('calibrated')]
assert len(playable) == 23
files = {ROOT/'index.html'}
class Audit(HTMLParser):
 def handle_starttag(self,tag,attrs):
  a = dict(attrs)
  assert not any(k.startswith('on') for k in a), 'inline event handler'
  assert tag not in ['iframe','object','base']
  assert not (tag=='meta' and a.get('http-equiv','').lower()=='content-security-policy')
  if tag == 'script': assert a.get('src') and a.get('type') != 'module'
  for attr in ['src','href']:
   if a.get(attr):
    if tag=='use' and a[attr].startswith('#'):continue
    assert a[attr].startswith('./'), a[attr]
    p = ROOT/urlsplit(a[attr][2:]).path; assert p.is_file(), p; files.add(p)
Audit().feed((ROOT/'index.html').read_text(encoding='utf-8-sig'))
for l in playable:
 for key in ['scene','sprite','thumb']:
  p=ROOT/l[key]; assert p.is_file(),p;files.add(p)
 with Image.open(ROOT/l['scene']) as im: assert im.size==(l['width'],l['height'])
 with Image.open(ROOT/l['sprite']) as im:
  for t in l['items']:
   assert t['x']>=0 and t['y']>=0 and t['x']+t['w']<=im.width and t['y']+t['h']<=im.height
   assert t['polygons'] and all(len(p)>=3 for p in t['polygons'])
for p in files:
 if p.suffix=='.js':
  code=p.read_text(encoding='utf-8-sig')
  for pattern in [r'\bfetch\s*\(',r'XMLHttpRequest',r'\beval\s*\(',r'new\s+Function',r'WebAssembly',r'localStorage',r'sessionStorage',r'indexedDB',r'window\.open\s*\(',r'new\s+Worker',r'\?\.',r'\?\?']:
   assert not re.search(pattern,code),(p,pattern)
  if p.name=='game.js':
   ids=set(re.findall(r"\$\('([^']+)'\)",code))
   html=(ROOT/'index.html').read_text(encoding='utf-8-sig')
   assert all('id="'+i+'"' in html for i in ids),ids
 if p.suffix=='.css':
  code=p.read_text(encoding='utf-8-sig')
  assert not re.search(r'@import|url\(\s*[\'\"]?https?://',code)
assert all(p.suffix in {'.html','.js','.css','.webp','.png','.jpg','.svg','.json','.woff','.woff2'} for p in files)
OUT.parent.mkdir(exist_ok=True)
brand_backup=ROOT/'qa/before-ui-refresh.zip'
if OUT.exists() and not brand_backup.exists():shutil.copy2(OUT,brand_backup)
backup=ROOT/'qa/before-recognition.zip'
if OUT.exists() and not backup.exists():shutil.copy2(OUT,backup)
ordered=[ROOT/'index.html']+sorted(files-{ROOT/'index.html'})
with zipfile.ZipFile(OUT,'w',zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in ordered:z.write(p,p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(OUT) as z:
 assert z.namelist()[0]=='index.html' and z.testzip() is None
 assert len([n for n in z.namelist() if n.endswith('.html')])==1
assert OUT.stat().st_size <= 10*1024*1024
named=OUT.parent/'找找找-小工具.zip'
shutil.copy2(OUT,named)
runtime=OUT.parent/'hidden-object-runtime'
runtime.mkdir(exist_ok=True)
for p in ordered:
 target=runtime/p.relative_to(ROOT);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,target)
report={
 'name':'找找找','slogan':'找到细节，收集惊喜',
 'playableLevels':len(playable),'reservedLevels':len(book)-len(playable),'targets':sum(len(l['items']) for l in playable),
 'files':len(files),'zipBytes':OUT.stat().st_size,'zipMiB':round(OUT.stat().st_size/1024/1024,2),
 'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'textBytes':sum(p.stat().st_size for p in files if p.suffix in ['.html','.js','.css','.json']),
 'recognition':'Offline position matching against answer-derived object polygons. Any target order; no target selection required.',
 'validation':'ui11 Node regression: independent scene/sprite failure recovery, bounded stalled-image retries, thumbnail pagination, navigation during account refresh, 520 target anchors, all 23 chapters and account isolation. Local browser at 390x700: six thumbnails, expand to twelve, scene and forty targets, no console errors. Platform and device acceptance pending.',
 'accountSave':'Platform user × mini-tool cloud storage, client 9.51+ and beta entitlement required. No shared-device save migration or persistent fallback.',
 'pending':['Creator platform simulator','Android device','iOS device','Real account switching and cross-device restore','Chrome 61 compatibility and performance on devices'],
 'contentReview':'Supplied answer components reviewed as contact sheets; labels are short visual descriptions. This is not a general-purpose semantic image classifier.'}
(ROOT/'qa/package-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps(report,ensure_ascii=False,indent=2));print(OUT)
print(runtime)


