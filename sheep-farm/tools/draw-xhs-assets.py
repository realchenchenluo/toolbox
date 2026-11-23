"""Make a small Xiaohongshu carousel from the actual game assets and screenshots."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT.parent/'release'/'小红书推荐素材-牧云羊场'; OUT.mkdir(parents=True,exist_ok=True)
INK='#284c3d'; MUTED='#6d7c59'; PAPER='#f5e7bb'; GREEN='#8eae6b'; DARK='#18382f'; GOLD='#dfad4d'; RED='#b86a4e'
FONT='C:/Windows/Fonts/msyhbd.ttc'; REG='C:/Windows/Fonts/msyh.ttc'
def f(size,bold=True): return ImageFont.truetype(FONT if bold else REG,size)
def frame(title,kicker,number):
    im=Image.new('RGB',(1080,1440),PAPER); d=ImageDraw.Draw(im)
    d.rectangle((28,28,1052,1412),outline=INK,width=8)
    d.rectangle((56,55,1024,76),fill=GOLD)
    d.text((65,102),kicker,font=f(28,False),fill=MUTED)
    d.text((65,145),title,font=f(64),fill=INK)
    d.text((938,110),f'{number:02d}',font=f(28),fill=MUTED)
    return im,d
def paste_contain(im, src, box, bg='#e6d8a7'):
    x,y,w,h=box; d=ImageDraw.Draw(im); d.rectangle((x,y,x+w,y+h),fill=bg,outline='#6d8057',width=5)
    s=src.copy(); s.thumbnail((w-24,h-24),Image.Resampling.LANCZOS); im.paste(s,(x+(w-s.width)//2,y+(h-s.height)//2))
def para(d,xy,lines,size=31,fill=INK,gap=13):
    x,y=xy
    for line in lines:
        d.text((x,y),line,font=f(size,False),fill=fill);y+=size+gap
def make_cover():
    src=ROOT.parent/'release'/'sheep-farm-publishing'/'sheep-farm-cover-1080x1440.jpg'
    Image.open(src).convert('RGB').save(OUT/'01-封面-回乡养羊.jpg',quality=96,subsampling=0)
def make_gameplay():
    im,d=frame('羊毛不会自动进仓','真实玩法展示 · 你要照顾、剪、捡、卖',2)
    shot=Image.open(ROOT.parent/'release'/'sheep-farm-preview.jpg').convert('RGB')
    shot.thumbnail((850,890),Image.Resampling.LANCZOS); x=(1080-shot.width)//2
    d.rectangle((x-13,310,x+shot.width+13,310+shot.height+13),fill=DARK)
    im.paste(shot,(x,310))
    d.text((70,1260),'剪下羊毛 → 落在草地 → 手动拾取',font=f(34),fill=INK)
    d.text((70,1320),'雇工解锁后，会自己走过去背回收纳棚。',font=f(28,False),fill=MUTED)
    im.save(OUT/'02-玩法展示-羊群和雇工.jpg',quality=95,subsampling=0)
def make_pixel():
    im,d=frame('最难的不是画羊','开发难点 · 像素角色必须真的连起来',3)
    sprite=Image.open(ROOT/'assets'/'sheep-sprite.png').convert('RGBA').crop((0,0,160,32)).resize((800,160),Image.Resampling.NEAREST)
    d.rectangle((105,320,975,525),fill='#d9e4b8',outline='#6d8057',width=5);im.paste(sprite,(140,340),sprite)
    d.text((76,580),'1. 不能把头、身、腿拆成不同 DOM 元素',font=f(32),fill=INK)
    d.text((76,640),'2. 行走和转身要用完整帧，镜像整个角色',font=f(32),fill=INK)
    d.text((76,700),'3. 吃草喝水要真的走到槽边，不能隔空触发',font=f(32),fill=INK)
    d.rectangle((74,790,1006,1100),fill='#dfe8bd',outline='#6d8057',width=5)
    d.text((105,830),'后来加入了：',font=f(34),fill=INK)
    d.text((105,900),'白毛 / 剪毛后的肉色、行走、吃草、喝水、',font=f(29,False),fill=INK)
    d.text((105,955),'坐下和卧倒，以及不会互相重叠的羊群层级。',font=f(29,False),fill=INK)
    d.text((70,1250),'像素风看似简单，细节其实最容易露馅。',font=f(36),fill=RED)
    im.save(OUT/'03-开发难点-从贴图到像素羊.jpg',quality=95,subsampling=0)
def make_storage():
    im,d=frame('上线前踩到的坑','开发复盘 · 不同账号不能共用存档',4)
    d.rectangle((95,330,985,625),fill='#dfe8bd',outline='#6d8057',width=5)
    d.text((140,390),'旧版本',font=f(38),fill=RED); d.text((140,460),'所有人 → 固定存档键',font=f(28),fill=INK)
    d.rectangle((447,400,633,555),fill='#d8b665',outline=INK,width=7)
    d.rectangle((500,438,580,518),fill=PAPER,outline=INK,width=6)
    d.line((500,440,540,475,580,440),fill=INK,width=6)
    d.text((713,390),'同一份进度',font=f(34),fill=RED)
    d.text((713,460),'账号 A = 账号 B',font=f(28),fill=INK)
    d.line((140,685,940,685),fill=GOLD,width=7)
    d.text((95,760),'修复后',font=f(38),fill=GREEN)
    d.text((95,840),'小红书容器 Storage',font=f(42),fill=INK)
    d.text((95,920),'+ 账号作用域存档键',font=f(42),fill=INK)
    d.text((95,1020),'账号 A → A 的羊场',font=f(34),fill=INK)
    d.text((95,1090),'账号 B → B 的羊场',font=f(34),fill=INK)
    d.text((95,1220),'这次才敢把它交给别人试玩。',font=f(36),fill=RED)
    im.save(OUT/'04-账号存档-上线前检查.jpg',quality=95,subsampling=0)
def make_dev_card():
    im,d=frame('一个人做小游戏的真实流程','开发日记 · 从想法到可上传小工具',5)
    steps=[('01','定玩法','把养鸡场的循环换成：吃草、喝水、剪毛、卖肉'),('02','修像素','用 32×32 帧处理白毛、剪毛和动作'),('03','做经营','升级、订单、雇工和一亿元退休目标'),('04','做上线','离线包、模拟器、账号存档和手机预览')]
    y=330
    for num,title,body in steps:
        d.ellipse((92,y,180,y+88),fill=INK);d.text((112,y+20),num,font=f(27),fill=PAPER)
        d.text((225,y+4),title,font=f(38),fill=INK);d.text((225,y+56),body,font=f(25,False),fill=MUTED)
        if y<1120:d.line((137,y+93,137,y+157),fill=GOLD,width=6)
        y+=190
    d.rectangle((74,1160,1005,1310),fill='#dfe8bd',outline='#6d8057',width=5)
    d.text((105,1202),'下一步：继续听玩家反馈，把羊场做得更有生活感。',font=f(29,False),fill=INK)
    im.save(OUT/'05-开发流程-从想法到上传.jpg',quality=95,subsampling=0)
if __name__=='__main__':
    make_cover();make_gameplay();make_pixel();make_storage();make_dev_card()
    print('generated',len(list(OUT.glob('*.jpg'))),'XHS images')
