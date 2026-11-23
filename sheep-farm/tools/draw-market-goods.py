"""Original 32px market goods: curly fleece in a basket and lamb chops on a board."""
from pathlib import Path
from PIL import Image, ImageDraw

assets = Path(__file__).resolve().parents[1] / 'assets'
atlas = Image.new('RGBA', (64, 32))

def fleece():
    im = Image.new('RGBA', (32, 32))
    d = ImageDraw.Draw(im)
    def r(box, color): d.rectangle(box, fill=color)
    # Shallow wooden basket, with a dark rim and a woven front.
    r((5, 26, 27, 28), '#9e9060')
    d.polygon([(3, 19), (29, 19), (27, 27), (6, 27)], fill='#584d35')
    d.polygon([(5, 21), (27, 21), (25, 25), (7, 25)], fill='#bc8b50')
    r((7, 23, 25, 24), '#dfb477')
    for x in (9, 15, 21): r((x, 21, x+1, 25), '#8e663d')
    # One continuous, stepped fleece outline, built from overlapping tufts.
    d.polygon([(2, 14), (4, 14), (4, 9), (8, 9), (8, 6), (12, 6),
               (12, 3), (19, 3), (19, 6), (24, 6), (24, 8), (28, 8),
               (28, 12), (30, 12), (30, 18), (27, 18), (27, 21),
               (22, 21), (22, 23), (9, 23), (9, 21), (4, 21),
               (4, 18), (2, 18)], fill='#777552')
    d.polygon([(4, 14), (6, 14), (6, 10), (10, 10), (10, 7), (14, 7),
               (14, 5), (18, 5), (18, 8), (23, 8), (23, 10), (26, 10),
               (26, 14), (28, 14), (28, 17), (25, 17), (25, 20),
               (20, 20), (20, 21), (10, 21), (10, 19), (6, 19),
               (6, 17), (4, 17)], fill='#ddd8b8')
    r((10, 9, 21, 17), '#f4eed3')
    r((7, 12, 11, 17), '#f4eed3'); r((20, 11, 25, 15), '#f4eed3')
    r((13, 6, 17, 10), '#fff9e6'); r((10, 10, 16, 12), '#fff9e6')
    r((7, 12, 8, 14), '#fff9e6'); r((21, 10, 23, 11), '#fff9e6')
    # Short curls rather than a flat white blob.
    for x, y in ((9, 14), (17, 10), (20, 16), (13, 18)):
        r((x, y, x+2, y), '#b7b393')
        r((x+2, y+1, x+2, y+2), '#b7b393')
        r((x, y+2, x+1, y+2), '#e9e3c6')
    r((4, 22, 28, 23), '#705336'); r((5, 22, 27, 22), '#dab17b')
    return im

def chops():
    im = Image.new('RGBA', (32, 32))
    d = ImageDraw.Draw(im)
    def r(box, color): d.rectangle(box, fill=color)
    # Butcher's cutting board, two handles and a warm oak edge.
    r((3, 24, 28, 28), '#a48d5d')
    r((2, 18, 29, 26), '#684d37'); r((1, 20, 30, 23), '#684d37')
    r((4, 19, 27, 24), '#cda06a'); r((4, 19, 26, 19), '#f0cb8b')
    r((7, 23, 25, 23), '#ac784b'); r((24, 21, 26, 21), '#ebc284')
    # Rear chop: ivory bone neck with a readable rounded knuckle.
    r((20, 2, 24, 5), '#7b6449'); r((23, 4, 27, 7), '#7b6449')
    r((21, 3, 23, 5), '#fff3d4'); r((24, 5, 26, 6), '#fff3d4')
    d.polygon([(22, 6), (25, 8), (20, 15), (17, 13)], fill='#7b6449')
    d.line((23, 7, 19, 13), fill='#eddfbb', width=2)
    d.polygon([(14, 9), (19, 9), (22, 12), (22, 17), (19, 20),
               (13, 20), (10, 17), (10, 13)], fill='#783f35')
    d.polygon([(14, 11), (18, 11), (20, 13), (20, 17), (18, 18),
               (14, 18), (12, 16), (12, 13)], fill='#e8b79a')
    r((14, 13, 18, 16), '#bb6150'); r((15, 12, 18, 12), '#f9d9bb')
    # Foreground chop: pink fat cap, red center, cream marbling.
    d.polygon([(7, 11), (13, 10), (18, 13), (20, 17), (19, 21),
               (15, 24), (8, 23), (4, 20), (4, 15)], fill='#783f35')
    d.polygon([(8, 13), (13, 12), (17, 15), (18, 18), (17, 21),
               (14, 22), (8, 21), (6, 19), (6, 16)], fill='#f0c9a7')
    d.polygon([(9, 14), (12, 14), (16, 16), (16, 19), (14, 20),
               (10, 20), (8, 18), (8, 16)], fill='#c56b57')
    r((9, 14, 12, 14), '#f9dcc0'); r((8, 15, 9, 17), '#e79777')
    r((12, 16, 14, 16), '#eeaa89'); r((14, 17, 14, 18), '#eeaa89')
    r((10, 20, 13, 20), '#a44f43')
    return im

atlas.alpha_composite(fleece(), (0, 0))
atlas.alpha_composite(chops(), (32, 0))
atlas.save(assets / 'market-goods.png')
print('Saved two original 32px market goods.')
