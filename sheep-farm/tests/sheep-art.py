"""Check exported sprites, sheet coordinates, and continuous head/body across walking frames."""
import json
from pathlib import Path
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
folder = root / 'assets' / 'sheep'
manifest = json.loads((folder / 'sequences.json').read_text(encoding='utf-8'))
assert len(manifest['variants']) == 24
assert [x['name'] for x in manifest['sequences']] == ['idle', 'walk', 'sit', 'eat', 'drink', 'lie', 'sleep']
for variant in manifest['variants']:
    sheet = Image.open(folder / variant['sheet']).convert('RGBA')
    assert sheet.size == (128, 224)
    assert len(variant['frames']) == 18
    walking = []
    for record in variant['frames']:
        im = Image.open(folder / record['path']).convert('RGBA')
        assert im.size == (32, 32)
        assert im.getpixel((0, 0))[3] == 0
        assert len(im.getcolors(256)) <= 32
        assert im.getbbox()[0] > 0 and im.getbbox()[2] < 32
        assert im.tobytes() == sheet.crop((record['x'], record['y'], record['x']+32, record['y']+32)).tobytes()
        if record['pose'] == 'walk': walking.append(im)
    assert len({im.tobytes() for im in walking}) == 4
    for im in walking:
        # Frame changes are confined to the legs; the upper torso and head stay identical.
        assert im.crop((0, 0, 32, 19)).tobytes() == walking[0].crop((0, 0, 32, 19)).tobytes()
        solid = {(x, y) for y in range(32) for x in range(32) if im.getpixel((x, y))[3]}
        connected = {(15, 18)}
        pending = list(connected)
        while pending:
            x, y = pending.pop()
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    point = (x+dx, y+dy)
                    if point in solid and point not in connected:
                        connected.add(point); pending.append(point)
        assert (24, 14) in connected, 'head must remain attached to the body'
        assert any(y >= 28 and x < 16 for x, y in connected), 'rear foot stays attached'
        assert any(y >= 28 and x >= 16 for x, y in connected), 'front foot stays attached'
print('PASS: 432 complete frames, 24 matching sequence sheets, transparent padding, limited palette, four distinct gaits, and attached head/body/legs.')
