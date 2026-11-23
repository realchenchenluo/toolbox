# 牧云羊场

一款像素风养羊经营小游戏：回乡继承羊场，照顾小羊、剪毛拾取、售卖货物，逐步升级牧场与羊种，亲手攒够一亿元退休金。

[在线试玩](https://realchenchenluo.github.io/toolbox/sheep-farm/?v=20261123-meadow-6)

## 当前玩法

- 新玩家从第 0 天、300 金币和 3 只普通幼羊开始，已有存档保留进度。
- 点击两侧干草槽、水槽付费补给；羊会走近吃喝，也会坐下、卧下和睡觉。
- 幼羊、成年羊均能长毛剪毛，落地羊毛需拾取后到集市出售；雇工可帮助搬运，60 日龄后才可出栏。
- 等级收入门槛、付费升级、设施购买和特殊羊种购买逐步开放；薄荷羊、蜜桃羊、彩虹羊有独立能力。
- 基础补给保持低价，后续设施费用递增；加工礼盒与订单保留相对原料的收益。
- 白昼 48 秒、夜晚 12 秒，顶部显示时钟与倒计时；草簇随羊和雇工经过弯曲回弹。
- 顶部“玩法”可查规则；每 12 秒自动保存，也可手动保存。退休金存入时扣除等额现金。

## 运行

在仓库根目录执行：

```sh
python -m http.server 8090
```

打开 `http://localhost:8090/sheep-farm/`。游戏使用本地 HTML、CSS、JavaScript 和图片，无需安装前端依赖。普通网页保存到当前浏览器；平台容器下使用平台存储，云存档需相应平台能力和权限。不同网站域名的本机存档独立。

## 验证

```sh
cd sheep-farm
node tests/farm-behavior.cjs
node tests/cloud-save.cjs
node tests/economy-balance.cjs
node tests/interactive-grass.cjs
python tests/sheep-art.py
```

Python 素材检查与绘制脚本需要 Pillow。羊动作包含 16 套年龄/羊种/毛态变体，每套 18 帧、7 个动作；序列坐标与时长在 [`assets/sheep/sequences.json`](assets/sheep/sequences.json)。游戏逐帧切换完整 PNG，并整体镜像转身。

详见 [经营收支模拟](ECONOMY-BALANCE.md)、[界面与动画说明](UI-DIRECTION.md)。当前验证覆盖自动测试与本机浏览器，小红书容器和 Android/iOS 真机需要单独验证。源码更新不自动生成小工具 ZIP。

## 目录

- `index.html`、`assets/`：网页运行文件。
- `tests/`：游戏行为、账号存储、经济、互动草与像素素材检查。
- `tools/`：项目原创素材生成与预览脚本。

GitHub `main` 保存源码；`gh-pages` 的 `/sheep-farm/` 保存在线试玩静态文件。
