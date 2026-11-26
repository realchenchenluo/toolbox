"""Build offline runtime files, including complete sheep animation frames in subfolders."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from html.parser import HTMLParser
from urllib.parse import urlsplit, unquote
import argparse
import hashlib
import json
import re
import shutil
import tempfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--output',type=Path,default=root.parent/'release'/'牧云羊场-小红书上传-v12-彩虹羊自由养.zip')
args = parser.parse_args()
target = args.output.resolve()
target.parent.mkdir(parents=True,exist_ok=True)
work = root/'.work';work.mkdir(exist_ok=True)
stage = Path(tempfile.mkdtemp(prefix='upload-v12-',dir=work)).resolve()
assert stage.parent == work.resolve()
allowed = {'.html','.js','.css','.jpg','.jpeg','.png','.gif','.svg','.webp','.woff','.woff2'}
def runtime_asset(file):
    if not file.is_file() or file.suffix.lower() not in allowed:return False
    if file.parent.name!='sheep':return True
    # Full sheets plus whole idle fallbacks; the welcome screen also uses one seated portrait.
    return file.name.endswith(('-sequence.png','-idle.png')) or file.name=='young-normal-wool-sit.png'
source_files = [root/'index.html'] + sorted(p for p in (root/'assets').rglob('*') if runtime_asset(p))
for source in source_files:
    assert not source.is_symlink()
    destination = stage/source.relative_to(root)
    destination.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(source,destination)

def check_reference(file,reference):
    if reference.startswith(('data:','blob:','#')): return
    parts=urlsplit(reference)
    assert not parts.scheme and not parts.netloc and not parts.path.startswith('/'),reference
    resolved=(file.parent/unquote(parts.path)).resolve()
    assert resolved.is_relative_to(stage) and resolved.is_file(),(str(file),reference)

class EntryAudit(HTMLParser):
    def handle_starttag(self,tag,attributes):
        attributes=dict(attributes)
        assert tag not in ('base','iframe','object'),tag
        assert not any(key.lower().startswith('on') for key in attributes),'inline event'
        if tag=='script': assert attributes.get('src') and attributes.get('type')!='module','classic external scripts only'
        for key in ('src','href'):
            if key in attributes: check_reference(stage/'index.html',attributes[key])

EntryAudit().feed((stage/'index.html').read_text(encoding='utf-8'))
for css in (stage/'assets').rglob('*.css'):
    for reference in re.findall(r'url\([\"\']?([^\"\')]+)',css.read_text(encoding='utf-8')):check_reference(css,reference)
files=sorted(p for p in stage.rglob('*') if p.is_file())
assert len([p for p in files if p.suffix=='.html'])==1
assert len(list((stage/'assets/sheep').glob('*-sequence.png')))==24
assert len(list((stage/'assets/sheep').glob('*-idle.png')))==24
assert not list((stage/'assets/sheep').glob('*-walk-[0-3].png'))
assert len(files)<=200, 'Small-tool package exceeds the 200-file limit'
with ZipFile(target,'w',ZIP_DEFLATED,compresslevel=9) as archive:
    for file in files:archive.write(file,file.relative_to(stage).as_posix())
with ZipFile(target) as archive:
    names=archive.namelist()
    assert len(names)<=200 and all(not name.endswith('/') for name in names)
    assert 'index.html' in names and archive.testzip() is None
    assert all(Path(name).suffix.lower() in allowed for name in names)
    assert not any(name.endswith(('.zip','.py','.md','.json','.cjs')) for name in names)
    for name in names:assert archive.read(name)==(stage/name).read_bytes()
assert target.stat().st_size <= 10*1024*1024
report={'zip':str(target),'stage':str(stage),'files':len(files),'maxFiles':200,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'entry':'index.html','unsupportedTypes':[]}
(work/'latest-build.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
