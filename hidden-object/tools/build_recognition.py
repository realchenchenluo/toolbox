"""Build offline hit polygons and isolated cards from the supplied answer scans.

The numbered components are kept in qa/answers/*-regions.jpg for review.
Manual merges join ink separated by printed black outlines, not unrelated objects.
"""
from pathlib import Path
import json, math, shutil
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
QA = ROOT / 'qa/answers'
LABELS = {
 '001': '音符 针 扇子 书 铅笔 合上的伞 梯子 鼓 螺丝钉 马蹄铁 一片面包 闪电 蛇 羽毛球 橡实 灯泡 蝴蝶 信号旗 箭头 箭头 画笔 钥匙 蜗牛 香蕉 剪刀 盐瓶 毛毛虫 钓钩 帆船 菠萝 戒指 王冠 贝壳 梨 爆米花 一块派 图钉 新月 手袋 心 梳子',
 '002': '一块比萨饼 衣架 信封 爆米花 椒盐卷饼 王冠 铃铛 碗 曲别针 热狗 戒指 钢笔 冰棍 分指手套 袜子 叉骨 发刷 发梳 直尺 冰棍 心 书 平底锅 箭头 餐刀 星星 棒球棍 簸箕 梨 蝴蝶 梯子 蜗牛 柠檬 杯子 一片面包 香蕉 马蹄铁 领带',
 '003': '螺丝刀 新月 高顶礼帽 豪猪 黄油刀 高尔夫球钉 棒棒糖 针 王冠 闪电 橄榄 蜡烛 棉花糖 软糖 画笔 蝴蝶 棉花糖 心 高尔夫球杆 西洋跳棋棋子 梨 戒指 高跟鞋 台灯 螺丝钉 磁铁 书 放大镜 鸡蛋 创可贴 顶针 回旋镖 牙刷 扇子 杯子蛋糕 黄油刀 茶杯 镊子 冰棍 蘑菇 茶杯 斧头 连指手套 帆船 豆子 针织帽 小圆片 拐杖糖 柠檬 葡萄 苹果 一瓣橙子',
 '004': '钥匙 餐刀 放大镜 钉子 气球 试管 信封 高尔夫球杆 独木舟 回旋镖 铅笔 旗子 纸飞机 口香糖 发夹 香蕉 吸管 袜子 小鸟 斧头 创可贴 手提箱 新月 口哨 纽扣 图钉 泥铲 钓钩',
 '005': '甜筒 帆船 针织帽 香蕉 肉桂卷 帐篷 飞鱼 帆船 棒球棍 信封 苹果 靴子 茶杯 铃铛 叶子 长笛 蜡烛 蜗牛 铁锤 风筝',
 '006': '一块派 漏斗 贝壳 分指手套 旗子 戒指 纸飞机 曲棍球杆 盐瓶 棒球棍 喇叭 手摇铃 蜡笔 棒棒糖 锯子 直尺 香蕉 甜筒 钉子 靴子 一块比萨饼 狗食盆 一块蛋糕 苹果 轮子',
 '007': '三叶草 心 一块派 眼镜 豆荚 领结 杯子 眼镜 胡萝卜 手电筒 虫子 戒指 一块派 口琴 拖鞋 帆船 创可贴 吸管 多米诺骨牌 桶 苹果核',
 '008': '铅笔 心 连指手套 梯子 一块比萨饼 复活节彩蛋 闪电 钢笔 蛇 汉堡包 汉堡包 戒指 蜡烛 吸管 帐篷 羽毛球 叉子 衣夹 橄榄 羽毛球 眼镜 桶 玻璃水杯 叉骨 小弧线 手链 一块肥皂 高尔夫球杆 爆米花 杯子 画笔 画笔 溜冰鞋 杯子蛋糕 花 毛毛虫 三叶草 豆荚 扇子 怀表 手电筒 棒棒糖 磁铁 高脚杯 码尺',
 '009': '一块派 胡萝卜 帆船 螺丝刀 钉子 叉子 戒指 便鞋 油漆刷 曲棍球杆 分指手套 量匙 牙刷 叉骨 钓钩 手套 勺子 螺丝钉 棒球棍 蜡烛 手杖 靴子 直尺 新月 棒棒糖',
 '010': '叶子 老鼠 针 曲棍球杆 甜筒 曲别针 打开的书 鱼 发刷 花生 新月 王冠 线轴 帽子 一块派 消防员头盔 调色板 信封 一块奶酪 一块比萨饼',
 '011': '鲸鱼 镊子 计算尺 甜甜圈 羽毛 钢琴键 针 梳子 搋子 麦芬蛋糕 香蕉 单人沙发 木锤 帆船 风筝 小弧线 胡萝卜 国际象棋棋子 回旋镖 土豆削皮器',
 '012': '棒棒糖 叉子 甜筒 勺子 钉子 香蕉 分指手套 抹刀 扩音器 王冠 一片柠檬 一块派 长柄勺 铲子 牙刷 一块比萨饼 梨 胡萝卜',
 '013': '油漆刷 乒乓球拍 信号旗 扩音器 针 钓钩 幽灵 虫子 王冠 音符 袜子 羽毛球 独木舟 香蕉 新月',
 '014': '图钉 葡萄 西蓝花 花束 草莓 海绵 土豆 一条鱼 兔子 两条蛇 圆形果实 一块比萨饼 芭蕾舞鞋 新月 甜甜圈 猫头鹰 茶杯 便鞋',
 '015': '勺子 旗子 手电筒 冰棍 多米诺骨牌 打开的书 高尔夫球棒 一块西瓜 杯子 杯子 胡萝卜 牙刷 心 手电筒 新月 腰带 蛇 戒指 棒棒糖 蛇 曲棍球棒 油漆刷 铁锤 图钉 蛇 碗 松糕',
 '016': '甜筒 闪电 针织帽 扇子 蛇 骨头 高尔夫球棒 手套 一块比萨饼 鸡蛋 蜡烛 鞋子',
 '017': '老鼠 蛇 勺子 针织帽 打开的书 新月 扇子 杯子 扇子 高尔夫球棒 小鸟 手套 蜻蜓',
 '018': '香蕉 镊子 一块馅饼 帆船 蛇 帽子 鱼 戒指 一片柠檬 玩具汽车 针 心',
 '019': '长柄锅 香蕉 帽子 叉子 橡子 铃铛 手提袋 茶杯 图钉 蜡烛 冰棍 勺子 牙刷 冰棍 月牙儿',
 '020': '虫子 月牙儿 针 字母E 保龄球瓶 独木舟 字母E 斧头 鱼钩 回旋镖 贝壳 剪刀 百吉饼 香蕉 钉子',
 '021': '花 页框 信封 鸡腿 铃铛 梳子 铁锤 盐瓶 牙刷 打开的书 杯子蛋糕 一片柠檬 叉子 碗 心 太阳 油漆刷 雪人 蛇 蜡烛 棒球棍 梯子 四叶草 页框 页框',
 '022': '高尔夫球杆 锯子 铅笔 箭头 搋子 火箭船 手摇铃 风筝 帽子 木锤 腕表 铁锹 老虎钳 打开的伞 短裤',
 '023': '烤面包机 页框 泥铲 独木舟 老虎钳 雪糕 靴子 熨斗 铁锹 闪电 一块派 梨 干草叉 曲棍球杆',
}
# Component numbers refer to the checked region sheets, starting at one.
MERGES = {'001': [[19,20]], '007': [[4,8]], '008': [[10,11],[31,32]],
          '015': [[9,10],[17,20,25]], '017': [[7,9]]}
DROPS = {'008': [25], '011': [16], '021': [2,24,25], '023': [2]}
TITLES = ['丛林健身房','企鹅海滩','短吻鳄聚会','人多手杂','绘画课','夏日演奏会','超级英雄','活力四射',
          '树屋','雪中滑行','乘坐雪橇','池塘文化节','游泳课','潮池','老鼠镇','西部旅途','修路工','爆米花',
          '森林会餐','我们最喜欢的老师','举国欢庆','下一个是谁？·钟楼','下一个是谁？·教室']

def build():
    prior = ROOT/'qa/legacy-levels.js'
    if not prior.exists(): shutil.copy2(ROOT/'assets/levels.js', prior)
    book = json.loads(prior.read_text(encoding='utf8').split('=',1)[1].strip().rstrip(';'))
    regions = json.loads((QA/'regions.json').read_text())
    folder = ROOT/'assets/calibrated'
    folder.mkdir(exist_ok=True)
    review = {}
    for key, data in regions.items():
        raw = data['regions']; names = LABELS[key].split()
        assert len(names) == len(raw), (key,len(names),len(raw))
        grouped = {a: group for group in MERGES.get(key,[]) for a in group}
        skip = set(DROPS.get(key,[])); used = set(); items = []
        x0,y0,x1,y1 = data['sceneBox']
        source = Image.open(ROOT/f'source-images/{key}.png').convert('RGB').crop((x0,y0,x1,y1))
        pixels = np.array(source.convert('L'))
        # Crisp scan with antialiasing retained around ink edges.
        mono = np.clip((pixels.astype(float)-95)*255/115,0,255).astype('uint8')
        scene = Image.fromarray(mono).quantize(colors=4,dither=Image.Dither.NONE).convert('RGB')
        scene.save(folder/f'{key}-scene.webp','WEBP',lossless=True,method=6)
        thumb = scene.copy(); thumb.thumbnail((210,240)); thumb.save(folder/f'{key}-thumb.webp','WEBP',quality=65,method=6)
        for i,r in enumerate(raw,1):
            if i in used or i in skip: continue
            ids = grouped.get(i,[i]); used.update(ids)
            polygons = [raw[j-1]['poly'] for j in ids]
            mask = np.zeros((scene.height,scene.width),np.uint8)
            cv2.fillPoly(mask,[np.array(poly,np.int32) for poly in polygons],255)
            # Find an interior click point, including concave shapes.
            dist = cv2.distanceTransform(mask,cv2.DIST_L2,5)
            ay,ax = np.unravel_index(np.argmax(dist),dist.shape)
            ys,xs = np.where(mask>0); l,t,rr,b = int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1)
            assert rr>l and b>t
            expanded = cv2.dilate(mask,np.ones((7,7),np.uint8))
            isolated = np.where(expanded>0,mono,255).astype('uint8')
            pic = Image.fromarray(isolated).crop((max(0,l-4),max(0,t-4),min(scene.width,rr+4),min(scene.height,b+4))).convert('RGB')
            pic.thumbnail((132,94),Image.Resampling.LANCZOS)
            card = Image.new('RGB',(144,106),'white'); card.paste(pic,((144-pic.width)//2,(106-pic.height)//2))
            index = len(items)
            label='两条蛇' if key=='015' and i==17 else names[i-1]
            item={'id':key+'-'+str(i),'label':label,'x':index%5*144,'y':index//5*106,'w':144,'h':106,
                  'polygons':polygons,'anchor':[int(ax),int(ay)],'bounds':[l,t,rr,b], '_card':card}
            items.append(item)
        atlas = Image.new('RGB',(720,math.ceil(len(items)/5)*106),'white')
        for i,it in enumerate(items):atlas.paste(it.pop('_card'),(it['x'],it['y']))
        atlas.quantize(colors=4,dither=Image.Dither.NONE).save(folder/f'{key}-targets.webp','WEBP',lossless=True,method=6)
        level = book[int(key)-1]
        level.update(title=TITLES[int(key)-1], scene=f'assets/calibrated/{key}-scene.webp',
                     sprite=f'assets/calibrated/{key}-targets.webp',thumb=f'assets/calibrated/{key}-thumb.webp',
                     items=items, calibrated=True, width=scene.width,height=scene.height)
        # A readable numbered overlay is part of QA, never shipped as an answer.
        overlay=scene.copy();dr=ImageDraw.Draw(overlay);font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',16)
        for i,it in enumerate(items):
            for poly in it['polygons']:dr.line([tuple(p) for p in poly]+[tuple(poly[0])],fill='#c98126',width=2)
            ax,ay=it['anchor'];dr.rectangle((ax-4,ay-4,ax+36,ay+20),fill='#173d32');dr.text((ax,ay-4),str(i+1),font=font,fill='white')
        overlay.thumbnail((850,1100));overlay.save(QA/f'{key}-final.jpg')
        review[key]={'title':level['title'],'targets':len(items),'components':len(raw),'merges':MERGES.get(key,[]),'dropped':DROPS.get(key,[])}
        print(key,level['title'],len(items),flush=True)
    for level in book[23:]:
        level.update(calibrated=False,expectedTargetCount=len(level['items']),items=[])
        level.pop('sprite',None); level.pop('scene',None)
    (ROOT/'assets/levels.js').write_text('window.HIDDEN_BOOK='+json.dumps(book,ensure_ascii=False,separators=(',',':'))+';\n',encoding='utf8')
    (QA/'calibration-report.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf8')
    print('Playable',23,'targets',sum(len(l['items']) for l in book))

if __name__=='__main__': build()
