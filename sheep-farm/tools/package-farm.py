from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
target = root.parent / 'release' / 'sheep-farm-minitool.zip'
files = [root / 'index.html'] + sorted((root / 'assets').iterdir())
allowed = {'.js', '.css', '.png', '.json'}
files = [p for p in files if p.name == 'index.html' or p.is_file() and p.suffix in allowed]
with ZipFile(target, 'w', ZIP_DEFLATED) as archive:
    for path in files:
        archive.write(path, path.relative_to(root).as_posix())
with ZipFile(target) as archive:
    assert 'index.html' in archive.namelist()
    assert archive.testzip() is None
print(f'{target}: {len(files)} files, {target.stat().st_size} bytes')
