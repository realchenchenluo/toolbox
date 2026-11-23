"""Draw an original 32px sheep sprite sheet from the supplied sheep pose references."""
from pathlib import Path
from PIL import Image, ImageDraw
import json

ASSETS = Path(__file__).resolve().parents[1] / 'assets'
INK = '#33453d'
SHADOW = '#b4b09a'
WOOL = '#e7e2cf'
WOOL_LIGHT = '#faf5e4'
WOOL_BRIGHT = '#fffbed'
FACE = '#d79f86'
FACE_LIGHT = '#efc1a7'
EAR = '#bd8270'
HOOF = '#725849'
SKIN = '#e0b89c'
SKIN_LIGHT = '#f0ceb2'


def rect(draw, box, color):
    draw.rectangle(box, fill=color)


def leg(draw, x, top, bottom, stride=0, folded=False):
    if folded:
        rect(draw, (x, top, x + 3, top + 3), INK)
        rect(draw, (x + 1, top + 1, x + 2, top + 2), WOOL_LIGHT)
        rect(draw, (x + 2, top + 2, x + 7, top + 3), INK)
        rect(draw, (x + 3, top + 2, x + 6, top + 2), SKIN_LIGHT)
        rect(draw, (x + 6, top + 3, x + 8, top + 5), HOOF)
        return
    x += stride
    rect(draw, (x, top, x + 4, bottom - 2), INK)
    rect(draw, (x + 1, top + 1, x + 2, bottom - 3), WOOL_LIGHT)
    rect(draw, (x + 3, top + 1, x + 3, bottom - 3), SHADOW)
    rect(draw, (x - 1, bottom - 2, x + 5, bottom), INK)
    rect(draw, (x, bottom - 2, x + 4, bottom - 1), HOOF)


def wool_body(draw, pose):
    if pose == 'sit':
        outline = [(4, 19), (5, 15), (7, 13), (7, 10), (10, 10), (10, 8), (14, 8), (14, 6), (18, 6), (18, 8), (22, 9), (23, 12), (23, 17), (21, 22), (17, 25), (8, 25), (5, 23)]
        inner = [(7, 19), (8, 15), (10, 12), (12, 10), (16, 9), (20, 11), (21, 15), (20, 20), (17, 23), (9, 23)]
        shine = [(9, 18), (10, 15), (12, 12), (16, 11), (19, 12), (20, 16), (18, 20), (15, 21), (11, 21)]
    elif pose in ('lie', 'sleep'):
        outline = [(3, 20), (4, 16), (7, 14), (7, 11), (10, 11), (10, 9), (14, 9), (14, 7), (19, 7), (19, 9), (23, 10), (25, 13), (25, 18), (23, 21), (20, 24), (9, 24), (5, 23)]
        inner = [(6, 19), (7, 16), (10, 13), (12, 11), (17, 10), (21, 12), (23, 15), (23, 18), (20, 21), (16, 22), (9, 22)]
        shine = [(9, 18), (10, 15), (13, 13), (17, 12), (20, 13), (21, 16), (20, 19), (17, 20), (12, 20)]
    else:
        outline = [(4, 14), (6, 14), (6, 10), (9, 10), (9, 8), (12, 8), (12, 6), (16, 6), (16, 8), (21, 8), (21, 10), (24, 10), (24, 13), (22, 14), (23, 18), (21, 22), (17, 23), (8, 23), (5, 21), (4, 18)]
        inner = [(6, 15), (8, 12), (11, 10), (13, 8), (17, 9), (21, 10), (22, 14), (21, 19), (18, 21), (9, 21), (6, 19)]
        shine = [(8, 14), (10, 12), (13, 10), (16, 10), (19, 11), (20, 14), (19, 18), (16, 19), (10, 19), (8, 17)]
    draw.polygon(outline, fill=INK)
    draw.polygon(inner, fill=WOOL)
    draw.polygon(shine, fill=WOOL_LIGHT)
    curls = [(8, 14), (12, 12), (17, 11), (20, 15), (15, 17), (10, 18), (18, 20)]
    if pose == 'sit': curls += [(12, 19), (18, 15)]
    if pose in ('lie', 'sleep'): curls = [(8, 18), (12, 15), (16, 13), (20, 16), (15, 19), (10, 20), (19, 20)]
    for x, y in curls:
        rect(draw, (x, y, x + 1, y), SHADOW)
        rect(draw, (x + 1, y - 1, x + 2, y - 1), WOOL_BRIGHT)


def shorn_body(draw, pose):
    if pose == 'sit':
        outline = [(5, 19), (7, 15), (10, 13), (14, 11), (19, 12), (22, 15), (22, 20), (19, 24), (10, 24), (6, 22)]
        body = [(8, 19), (9, 16), (13, 14), (17, 14), (20, 16), (20, 20), (18, 22), (11, 22), (8, 21)]
    elif pose in ('lie', 'sleep'):
        outline = [(4, 20), (6, 16), (10, 13), (15, 11), (20, 12), (24, 15), (25, 19), (22, 23), (16, 25), (8, 24)]
        body = [(7, 20), (9, 17), (12, 15), (17, 14), (21, 16), (22, 19), (20, 21), (16, 23), (10, 22)]
    else:
        outline = [(5, 15), (7, 12), (10, 10), (14, 9), (19, 10), (22, 13), (23, 17), (21, 20), (17, 22), (9, 22), (6, 20)]
        body = [(7, 15), (9, 12), (12, 11), (17, 11), (20, 13), (21, 17), (19, 19), (16, 20), (10, 20), (8, 19)]
    draw.polygon(outline, fill=INK)
    draw.polygon(body, fill=SKIN)
    draw.line([(9, 17), (12, 15), (17, 15), (20, 17)], fill=SKIN_LIGHT, width=2)
    rect(draw, (8, 20, 10, 20), '#c89178')
    rect(draw, (17, 21, 19, 21), '#cc987e')


def head(draw, pose):
    if pose in ('eat', 'drink'):
        # Compact sheep muzzle: continuous neck and a closed, two-pixel pink nose.
        draw.polygon([(20, 12), (23, 12), (25, 14), (26, 17), (29, 19), (30, 22), (29, 24), (26, 24), (23, 22), (21, 20), (19, 17)], fill=INK)
        draw.polygon([(21, 14), (23, 13), (24, 15), (24, 18), (27, 20), (29, 21), (29, 22), (27, 23), (24, 21), (22, 19), (20, 16)], fill=FACE)
        draw.line([(22, 14), (23, 17), (26, 20)], fill=FACE_LIGHT, width=1)
        draw.polygon([(21, 14), (18, 13), (16, 11), (15, 12), (17, 15), (20, 16)], fill=INK)
        draw.polygon([(19, 14), (17, 12), (16, 12), (18, 14), (20, 15)], fill='#e9b7a5')
        rect(draw, (24, 17, 24, 18), INK)
        rect(draw, (28, 21, 29, 22), '#d6a296')
        rect(draw, (28, 23, 29, 23), '#9f796b')
        if pose == 'drink': rect(draw, (29, 24, 30, 24), '#77c4cf')
        return
    if pose in ('lie', 'sleep'):
        draw.polygon([(18, 15), (21, 12), (25, 12), (28, 14), (29, 17), (28, 20), (24, 21), (21, 19), (19, 20), (17, 18)], fill=INK)
        draw.polygon([(21, 15), (23, 13), (26, 14), (27, 16), (27, 18), (24, 19), (22, 18), (20, 18)], fill=FACE)
        rect(draw, (26, 16, 28, 17), FACE_LIGHT)
        draw.polygon([(22, 13), (19, 12), (17, 10), (15, 10), (16, 13), (20, 16)], fill=INK)
        draw.polygon([(21, 14), (19, 13), (17, 11), (16, 11), (17, 13), (20, 15)], fill=EAR)
        if pose == 'sleep': draw.line([(24, 16), (26, 16)], fill=INK, width=1)
        else: rect(draw, (24, 15, 24, 16), INK)
        rect(draw, (28, 19, 29, 20), FACE_LIGHT)
        return
    draw.polygon([(20, 14), (22, 11), (26, 11), (28, 13), (29, 17), (28, 20), (24, 21), (21, 19), (19, 17)], fill=INK)
    draw.polygon([(22, 14), (23, 12), (26, 12), (27, 14), (28, 17), (26, 19), (23, 19), (21, 17)], fill=FACE)
    draw.polygon([(22, 13), (20, 12), (18, 9), (15, 8), (16, 12), (20, 15)], fill=INK)
    draw.polygon([(21, 13), (19, 12), (17, 10), (16, 10), (18, 13), (20, 14)], fill=EAR)
    draw.polygon([(25, 12), (26, 9), (29, 8), (30, 9), (29, 12), (27, 14)], fill=INK)
    draw.polygon([(27, 12), (28, 10), (29, 10), (28, 12)], fill=EAR)
    rect(draw, (25, 14, 26, 15), INK)
    rect(draw, (28, 17, 29, 18), FACE_LIGHT)
    rect(draw, (27, 19, 28, 19), '#bb796d')


def walking_leg(draw, x, top, bottom, stride, lift, young=False):
    # The hip stays attached; only the lower leg swings around the knee.
    width = 2 if young else 3
    knee = bottom - 4 - lift
    draw.polygon([(x, top), (x + width, top), (x + width, top + 3),
                  (x + stride + width, knee), (x + stride + width, bottom - lift),
                  (x + stride, bottom - lift), (x + stride, knee), (x, top + 3)], fill=INK)
    draw.line([(x + 1, top + 1), (x + 1, top + 3), (x + stride + 1, knee)], fill=WOOL_LIGHT)
    rect(draw, (x + stride, bottom - lift - 1, x + stride + width, bottom - lift), HOOF)


def make_frame(pose, woolly, gait=0, phase=None):
    im = Image.new('RGBA', (32, 32))
    d = ImageDraw.Draw(im)
    if pose == 'sit':
        leg(d, 8, 22, 28, folded=True); leg(d, 14, 23, 28, folded=True); leg(d, 18, 21, 28, folded=True)
    elif pose in ('lie', 'sleep'):
        leg(d, 8, 21, 27, folded=True); leg(d, 14, 22, 27, folded=True); leg(d, 19, 21, 27, folded=True)
    elif phase is not None:
        strides = (2, 0, -2, 0)
        for index, x in enumerate((6, 11, 18, 22)):
            p = (phase + (0 if index in (0, 3) else 2)) % 4
            walking_leg(d, x, 19, 29, strides[p], 2 if p == 1 else 0)
    else:
        stride = gait
        leg(d, 6, 19, 29, stride=stride); leg(d, 11, 20, 29, stride=-stride)
        leg(d, 18, 19, 29, stride=-stride); leg(d, 22, 19, 29, stride=stride)
    if woolly: wool_body(d, pose)
    else: shorn_body(d, pose)
    head(d, pose)
    if pose == 'sleep': d.line([(24, 15), (26, 15)], fill='#5a5149', width=1)
    if pose in ('lie', 'sleep', 'sit'): d.line([(6, 29), (25, 29)], fill='#7c9a63', width=1)
    return im


poses = [('stand', 0), ('stand', 1), ('stand', -1), ('sit', 0), ('eat', 0), ('drink', 0), ('lie', 0), ('sleep', 0)]
sheet = Image.new('RGBA', (32 * len(poses) * 2, 32))
for row, woolly in enumerate((True, False)):
    for index, (pose, gait) in enumerate(poses):
        sheet.alpha_composite(make_frame(pose, woolly, gait), ((row * len(poses) + index) * 32, 0))
sheet.save(ASSETS / 'sheep-sprite.png')

def young_frame(pose, woolly, phase=None):
    im = Image.new('RGBA', (32, 32))
    d = ImageDraw.Draw(im)
    resting = pose in ('sit', 'lie', 'sleep')
    # Lambs have a short body and a narrow tan face; horizontal drooping ears, no horns.
    if not resting:
        for index, x in enumerate((9, 13, 18, 21)):
            if phase is not None:
                p = (phase + (0 if index in (0, 3) else 2)) % 4
                walking_leg(d, x, 22, 28, (2, 0, -2, 0)[p], 2 if p == 1 else 0, young=True)
            else:
                rect(d, (x, 22, x + 2, 28), INK)
                rect(d, (x + 1, 23, x + 1, 26), WOOL_LIGHT)
                rect(d, (x, 28, x + 2, 28), HOOF)
    d.polygon([(7, 19), (8, 15), (11, 13), (15, 12), (20, 13), (23, 16), (23, 21), (20, 24), (11, 24), (8, 22)], fill=INK)
    d.polygon([(9, 19), (10, 16), (13, 14), (18, 14), (21, 17), (21, 21), (19, 22), (12, 22), (9, 21)], fill=WOOL if woolly else SKIN)
    d.polygon([(11, 18), (13, 15), (18, 15), (20, 17), (18, 20), (12, 20)], fill=WOOL_LIGHT if woolly else SKIN_LIGHT)
    if woolly:
        rect(d, (11, 19, 12, 19), SHADOW); rect(d, (17, 16, 18, 16), SHADOW)
    if resting:
        rect(d, (13, 25, 24, 26), INK); rect(d, (15, 25, 22, 25), WOOL_LIGHT)
    lowered = pose in ('eat', 'drink')
    if lowered:
        d.polygon([(19, 13), (23, 14), (24, 17), (27, 20), (27, 23), (24, 24), (21, 21), (18, 18)], fill=INK)
        d.polygon([(20, 15), (22, 15), (23, 18), (26, 21), (25, 22), (23, 22), (20, 19)], fill=FACE)
        d.line([(21, 16), (23, 20), (25, 21)], fill=FACE_LIGHT, width=1)
        d.line([(20, 15), (17, 12), (15, 12), (17, 15), (19, 16)], fill=INK, width=2)
        d.point((17, 13), fill='#e9b7a5'); d.point((23, 18), fill=INK)
        rect(d, (25, 21, 26, 22), '#d6a296')
        if pose == 'drink': d.point((27, 23), fill='#77c4cf')
    else:
        y = 2 if pose in ('lie', 'sleep') else 0
        d.polygon([(19, 12+y), (21, 10+y), (24, 10+y), (26, 12+y), (26, 15+y), (28, 17+y), (28, 19+y), (26, 21+y), (23, 20+y), (21, 18+y), (19, 17+y)], fill=INK)
        d.polygon([(21, 12+y), (23, 11+y), (25, 12+y), (25, 16+y), (27, 18+y), (26, 19+y), (24, 19+y), (22, 17+y), (20, 16+y)], fill=FACE)
        d.line([(22, 12+y), (23, 15+y), (25, 17+y)], fill=FACE_LIGHT, width=1)
        # Both ears sit below the crown and hang to the sides rather than pointing up.
        d.polygon([(20, 12+y), (17, 12+y), (14, 14+y), (15, 16+y), (18, 16+y), (21, 14+y)], fill=INK)
        d.line([(16, 14+y), (19, 13+y)], fill=EAR, width=2)
        d.polygon([(25, 12+y), (28, 12+y), (30, 14+y), (28, 15+y), (26, 14+y)], fill=INK)
        d.line([(27, 13+y), (28, 14+y)], fill=EAR)
        if woolly:
            rect(d, (20, 10+y, 23, 11+y), WOOL_LIGHT)
            d.point((22, 9+y), fill=WOOL_LIGHT)
        if pose == 'sleep': d.line([(24, 15+y), (25, 15+y)], fill=INK)
        else: d.point((24, 14+y), fill=INK)
        rect(d, (26, 18+y, 27, 18+y), '#9d7262')
        d.point((26, 19+y), fill='#efb3a0')
    return im


def tint_wool(im, breed):
    palettes = {
        'gift': ['#fff0c2', '#e8cf91', '#c2a775', '#fff9df'],
        'mint': ['#d7f2d4', '#b0d6b0', '#83bca4', '#eef9df'],
        'peach': ['#f7d8d0', '#e9b4b3', '#c994a5', '#fff0dc'],
        'wish': ['#e9dff7', '#c9badf', '#9e8cbd', '#fff0fa'],
        'rainbow': ['#edafa7', '#efd38c', '#acd1a0', '#9ac7cf', '#bbb0d7', '#dfafd0']
    }
    if breed not in palettes: return im
    result = im.copy(); colors = palettes[breed]
    targets = {WOOL, WOOL_LIGHT, WOOL_BRIGHT, SHADOW}
    for y in range(32):
        for x in range(32):
            r, g, b, a = result.getpixel((x, y)); color = '#%02x%02x%02x' % (r, g, b)
            if a and color in targets and x < 23 and y < 25:
                index = min(len(colors) - 1, max(0, (x - 4) // 4)) if breed == 'rainbow' else (0 if color == WOOL_LIGHT else 1 if color == WOOL else 2 if color == SHADOW else 3)
                result.putpixel((x, y), (*tuple(bytes.fromhex(colors[index][1:])), 255))
    return result


out = ASSETS / 'sheep'
out.mkdir(exist_ok=True)
sequences = [('idle', 2, 700), ('walk', 4, 130), ('sit', 2, 800),
             ('eat', 3, 280), ('drink', 3, 320), ('lie', 2, 900), ('sleep', 2, 1000)]
manifest = {'schema': 2, 'frameSize': [32, 32], 'columns': 4,
            'runtime': 'Complete PNG frames; switch img.src discretely and mirror the whole image.',
            'sequences': [{'name': name, 'row': row, 'frames': count, 'frameMs': ms}
                          for row, (name, count, ms) in enumerate(sequences)], 'variants': []}
asset_manifest = {'schema': 2, 'direction': 'Original pixel sheep, warm tan face, drooping ears, complete-frame animation', 'assets': []}
for stage in ('adult', 'young'):
    for breed in ('normal', 'gift', 'mint', 'peach', 'wish', 'rainbow'):
        for woolly in (True, False):
            prefix = f"{stage}-{breed}-{'wool' if woolly else 'shorn'}"
            atlas = Image.new('RGBA', (128, 32 * len(sequences)))
            frames = []
            for row, (pose, count, ms) in enumerate(sequences):
                for index in range(count):
                    actual_pose = 'stand' if pose in ('idle', 'walk') else pose
                    phase = index if pose == 'walk' else None
                    frame = young_frame(actual_pose, woolly, phase) if stage == 'young' else make_frame(actual_pose, woolly, phase=phase)
                    # Small pixel edits give closed-mouth chewing, sipping and blinking.
                    # They never shift or crop the neck/body, and the trough contact point stays fixed.
                    d = ImageDraw.Draw(frame)
                    if pose in ('idle', 'sit') and index == 1:
                        x, y = (24, 14) if stage == 'young' else (25, 14)
                        rect(d, (x, y, x + 1, y + 1), FACE)
                        rect(d, (x, y + 1, x + 1, y + 1), INK)
                    if pose in ('eat', 'drink') and index:
                        x, y = (25, 22) if stage == 'young' else (28, 23)
                        d.point((x, y), fill=FACE_LIGHT if index == 1 else '#9f796b')
                        if pose == 'eat': d.point((x - 1, y), fill='#8da956' if index == 1 else '#b9c57f')
                        else: d.point((x + 1, y + 1), fill='#a4dee1' if index == 1 else '#77c4cf')
                    if pose in ('lie', 'sleep') and index == 1:
                        x, y = (13, 17) if stage == 'young' else (12, 16)
                        rect(d, (x, y, x + 2, y), WOOL_LIGHT if woolly else SKIN_LIGHT)
                    if woolly: frame = tint_wool(frame, breed)
                    elif breed != 'normal':
                        x, y = (18, 15) if stage == 'young' else (17, 11)
                        ImageDraw.Draw(frame).rectangle((x, y, x + 1, y + 1), fill={'gift':'#d3a353','mint':'#83bca4','peach':'#e9b4b3','wish':'#ad91c3','rainbow':'#bbb0d7'}[breed])
                    filename = f"{prefix}-{pose}-{index}.png"
                    frame.save(out / filename)
                    if index == 0 and pose != 'walk': frame.save(out / f"{prefix}-{pose}.png")
                    atlas.alpha_composite(frame, (index * 32, row * 32))
                    frames.append({'pose': pose, 'frame': index, 'x': index * 32, 'y': row * 32, 'path': filename})
                    asset_manifest['assets'].append({'path': 'assets/sheep/' + filename, 'size': [32, 32], 'source': {'kind': 'project-authored', 'tool': 'tools/draw-sheep-sprite.py'}, 'license': 'Original project artwork', 'approval_status': 'user-review'})
            atlas.save(out / f'{prefix}-sequence.png')
            manifest['variants'].append({'name': prefix, 'sheet': prefix + '-sequence.png', 'frames': frames})
(out / 'sequences.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
(ASSETS.parent / 'tools' / 'sheep-asset-manifest.json').write_text(json.dumps(asset_manifest, ensure_ascii=False, indent=2), encoding='utf-8')
print('Saved 432 complete animation frames and 24 sequence sheets; runtime never crops an atlas.')
