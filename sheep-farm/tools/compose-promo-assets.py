"""Edit the supplied raster cover and derive an icon without changing runtime assets."""
from pathlib import Path
import json
import shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'publishing' / '2026-11-24'
RELEASE = ROOT.parent / 'release' / '牧云羊场-一千万宣传素材'
DEST.mkdir(parents=True, exist_ok=True)
RELEASE.mkdir(parents=True, exist_ok=True)
source = Image.open(DEST / 'reference-cover.png').convert('RGB')
W, H = source.size


def poly_mask(points, size=None):
    mask = Image.new('L', size or source.size)
    ImageDraw.Draw(mask).polygon(points, fill=255)
    return mask


def tint_wool(image, points, colors, excluded=None):
    """Tint only neutral wool pixels; retain the original cube lighting and brown faces."""
    arr = np.asarray(image).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    neutral = (r > 142) & (g > 133) & (b > 103) & (r - g < 48) & (r - b < 98)
    mask = np.asarray(poly_mask(points, image.size)).astype(np.float32) / 255
    mask *= neutral
    if excluded:
        mask *= 1 - np.asarray(poly_mask(excluded, image.size)).astype(np.float32) / 255
    # Feather pixel selection only, leaving the original silhouette completely unchanged.
    mask = np.asarray(Image.fromarray((mask * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(.45))) / 255.
    xs = np.arange(image.width)
    start = min(x for x, y in points)
    span = max(x for x, y in points) - start
    stops = np.linspace(start, start + span, len(colors))
    palette = np.array(colors, dtype=float)
    tone = np.stack([np.interp(xs, stops, palette[:, c]) for c in range(3)], axis=1)
    # A multiplication tint preserves shadows, highlights and the wool's material.
    shaded = arr * (.16 + .84 * tone[None, :, :] / 255.)
    alpha = mask[:, :, None]
    return Image.fromarray(np.clip(arr * (1 - alpha) + shaded * alpha, 0, 255).astype('uint8'))


hero_outline = [(110,1085),(121,1082),(121,1064),(104,1066),(99,1055),(96,1028),(98,1017),(120,1015),(121,986),(128,979),(172,972),(174,946),(180,940),(238,927),(239,911),(248,907),(275,900),(277,882),(284,878),(352,874),(358,877),(364,895),(391,890),(400,892),(405,912),(424,914),(431,923),(435,946),(428,954),(430,969),(441,976),(446,1029),(444,1043),(430,1046),(433,1065),(416,1072),(418,1090),(416,1100),(391,1105),(392,1142),(383,1149),(352,1153),(345,1150),(344,1126),(332,1128),(332,1147),(306,1151),(296,1147),(295,1160),(276,1163),(267,1158),(263,1135),(245,1134),(245,1121),(226,1121),(226,1138),(208,1145),(195,1141),(194,1119),(158,1116),(156,1130),(120,1136),(112,1128),(107,1100)]
hero_wool = hero_outline[:43] + [(345,1120),(285,1139),(244,1113),(159,1111),(120,1062)]
hero_face = [(266,965),(307,949),(310,938),(420,922),(437,968),(449,978),(450,1046),(420,1056),(312,1045),(303,1020),(271,1024)]
mid_outline = [(459,844),(456,841),(457,824),(462,820),(471,818),(470,810),(486,809),(487,804),(511,801),(511,795),(529,795),(533,798),(533,804),(540,805),(543,811),(546,811),(548,819),(550,820),(554,825),(554,843),(548,846),(548,855),(535,857),(535,870),(528,872),(523,871),(521,860),(516,860),(516,872),(507,874),(503,872),(503,860),(492,859),(490,872),(480,873),(476,870),(476,860),(468,857),(464,850),(460,849)]
mid_wool = [(456,844),(456,824),(471,818),(471,810),(487,809),(488,804),(511,801),(511,795),(530,795),(535,804),(544,806),(548,818),(543,824),(549,846),(547,855),(529,860),(492,859),(470,855)]
mid_face = [(512,821),(531,817),(542,818),(543,824),(556,824),(557,847),(527,848),(521,841),(513,835)]
mint_wool = [(94,843),(103,831),(131,828),(131,817),(155,812),(185,814),(191,827),(203,829),(214,843),(208,859),(206,874),(193,879),(193,882),(135,886),(108,878),(97,869)]
gift_wool = [(232,769),(234,758),(246,754),(248,748),(268,747),(280,751),(283,760),(280,780),(241,781)]
palettes = {
    'gift': [(255,235,164)],
    'mint': [(165,228,190)],
    'peach': [(249,180,194)],
    'wish': [(203,177,240)],
    'rainbow': [(247,177,174),(249,217,151),(174,219,173),(151,207,221),(192,177,225),(233,173,209)],
}


def remove_type(image, bounds, predicate, dilation):
    arr = np.asarray(image)
    mask = np.zeros((H, W), dtype='uint8')
    x0, y0, x1, y1 = bounds
    area = arr[y0:y1, x0:x1].astype(float)
    mask[y0:y1, x0:x1] = predicate(area).astype('uint8') * 255
    mask = cv2.dilate(mask, np.ones((dilation, dilation), 'uint8'))
    return Image.fromarray(cv2.inpaint(arr, mask, 12, cv2.INPAINT_TELEA))


def gradient_type(image, text, box, font_path, size, top_color, bottom_color, stroke=0, bevel=False):
    font = ImageFont.truetype(font_path, size)
    bbox = font.getbbox(text, stroke_width=stroke)
    mask = Image.new('L', (bbox[2] - bbox[0] + 8, bbox[3] - bbox[1] + 8))
    ImageDraw.Draw(mask).text((4-bbox[0], 4-bbox[1]), text, font=font, fill=255, stroke_width=stroke)
    mask = mask.crop(mask.getbbox())
    bw, bh = box[2]-box[0], box[3]-box[1]
    mask = mask.resize((bw, bh), Image.Resampling.LANCZOS)
    gradient = np.zeros((bh, bw, 3), dtype='uint8')
    for y in range(bh):
        t=y/max(1,bh-1)
        gradient[y,:,:]=np.array(top_color)*(1-t)+np.array(bottom_color)*t
    if bevel:
        alpha=np.asarray(mask).astype(float)/255
        upper=np.zeros_like(alpha);upper[2:,1:]=alpha[:-2,:-1]
        edge=np.maximum(0,alpha-upper)
        noise=np.random.default_rng(7).normal(0,.5,(bh,bw,1))
        gradient=np.clip(gradient.astype(float)+edge[:,:,None]*24+noise,0,255).astype('uint8')
    image.paste(Image.fromarray(gradient), box[:2], mask)


cover = source.copy()
# Erase the existing orange headline and brown subline, leaving the illustrated boards.
cover = remove_type(cover, (215,294,892,447), lambda a:(a[:,:,0]>130)&(a[:,:,1]<166)&(a[:,:,2]<108)&(a[:,:,0]>a[:,:,1]*1.3), 5)
cover = remove_type(cover, (280,472,816,524), lambda a:(a[:,:,0]<174)&(a[:,:,1]<118)&(a[:,:,2]<80), 4)
gradient_type(cover, '一千万退休', (232,307,880,437), 'C:/Windows/Fonts/simkai.ttf', 160, (207,99,25), (190,77,15), 8, True)
gradient_type(cover, '继承家里的羊场，攒够一千万就退休！', (269,478,818,514), 'C:/Windows/Fonts/simkai.ttf', 45, (110,57,20), (100,49,18), 1)

cover = tint_wool(cover, hero_wool, palettes['rainbow'], hero_face)
cover = tint_wool(cover, mint_wool, palettes['mint'])
cover = tint_wool(cover, mid_wool, palettes['peach'], mid_face)
cover = tint_wool(cover, gift_wool, palettes['gift'])


def mid_cutout(kind):
    colored = tint_wool(source, mid_wool, palettes[kind], mid_face).convert('RGBA')
    colored.putalpha(poly_mask(mid_outline).filter(ImageFilter.GaussianBlur(.45)))
    return colored.crop((450,788,558,880))


def place_sheep(canvas, kind, xy, scale, flip=False):
    sheep = mid_cutout(kind)
    if flip: sheep=sheep.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    sheep=sheep.resize((round(sheep.width*scale),round(sheep.height*scale)),Image.Resampling.LANCZOS)
    shadow=Image.new('RGBA',canvas.size)
    x,y=xy;sw,sh=sheep.size
    ImageDraw.Draw(shadow).ellipse((x+sw*.12,y+sh*.84,x+sw*.95,y+sh*1.02),fill=(55,70,21,62))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(4)))
    canvas.alpha_composite(sheep,xy)


cover=cover.convert('RGBA')
place_sheep(cover,'gift',(300,799),.86)
place_sheep(cover,'wish',(588,840),.92,True)
cover=cover.convert('RGB')
cover.save(DEST/'cover-1102x1428.png',optimize=True)
# The platform crop removes only 1.4% at either side; keep the full original-size PNG too.
fitted=ImageOps.fit(cover,(1080,1440),method=Image.Resampling.LANCZOS,centering=(.5,.5))
fitted.save(DEST/'cover-1080x1440.jpg',quality=96,subsampling=0)

# Icon: extract the original foreground sheep and keep a warm, uncluttered farm palette.
hero=source.convert('RGBA')
hero_alpha=np.asarray(poly_mask(hero_outline)).copy()
rgb=np.asarray(source).astype(float)
# Remove green and yellow background fringes from the photographed outline.
fringe=(rgb[:,:,1]>rgb[:,:,0]*.84)&(rgb[:,:,2]<rgb[:,:,1]*.70)
hero_alpha[fringe]=0
hero_alpha[1072:1110,412:440]=0
wood=(rgb[:,:,2]<142)&(rgb[:,:,0]-rgb[:,:,1]>21)
hero_alpha[1054:1110,395:445][wood[1054:1110,395:445]]=0
hero.putalpha(Image.fromarray(hero_alpha).filter(ImageFilter.GaussianBlur(.35)))
hero=hero.crop((90,868,455,1166))
icon_pixels=np.zeros((1024,1024,3),dtype='uint8')
stops=[0,400,670,1023]
colors=[(178,219,228),(241,239,200),(186,209,139),(139,175,90)]
for y in range(1024):
    icon_pixels[y,:,:]=[np.interp(y,stops,[c[channel] for c in colors]) for channel in range(3)]
scenery=Image.fromarray(icon_pixels)
paint=ImageDraw.Draw(scenery)
paint.ellipse((655,45,1030,420),fill=(255,244,182))
paint.ellipse((-270,462,750,1130),fill=(184,209,142))
paint.ellipse((516,501,1370,1300),fill=(153,189,112))
icon_bg=scenery.filter(ImageFilter.GaussianBlur(8)).convert('RGBA')
shadow=Image.new('RGBA',(1024,1024))
ImageDraw.Draw(shadow).ellipse((158,819,887,936),fill=(76,97,32,85))
icon_bg.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(19)))
hero=hero.resize((906,740),Image.Resampling.LANCZOS)
icon_bg.alpha_composite(hero,(54,153))
icon=icon_bg.convert('RGB')
icon.save(DEST/'icon-1024.png',optimize=True)
icon.resize((512,512),Image.Resampling.LANCZOS).save(DEST/'icon-512.png',optimize=True)
icon.resize((128,128),Image.Resampling.LANCZOS).save(DEST/'icon-preview-128.png')
for name in ['cover-1102x1428.png','cover-1080x1440.jpg','icon-1024.png','icon-512.png']:
    shutil.copyfile(DEST/name,RELEASE/name)
for source_name,release_name in [('cover-1080x1440.jpg','封面-1080x1440.jpg'),('icon-512.png','图标-512x512.png'),('icon-1024.png','图标-1024x1024.png')]:
    shutil.copyfile(DEST/source_name,RELEASE/release_name)
report={name:{'size':list(Image.open(DEST/name).size),'bytes':(DEST/name).stat().st_size} for name in ['cover-1102x1428.png','cover-1080x1440.jpg','icon-1024.png','icon-512.png']}
(DEST/'assets.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
