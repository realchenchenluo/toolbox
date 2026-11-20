from __future__ import annotations

import pathlib
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "release" / "toolbox-minitool.zip"
INCLUDE = [ROOT / "index.html", ROOT / "assets" / "app.js", ROOT / "assets" / "style.css"]

OUT.parent.mkdir(parents=True, exist_ok=True)
with zipfile.ZipFile(OUT, "w", compression=zipfile.ZIP_DEFLATED) as archive:
    for path in INCLUDE:
        if not path.is_file():
            raise SystemExit(f"missing artifact file: {path}")
        archive.write(path, path.relative_to(ROOT).as_posix())
print(OUT)
