# 亲手设计羊的像素图

使用 [Pixelorama](https://github.com/Orama-Interactive/Pixelorama) 的桌面版或 Web 版。

## 羊的图片与动作

游戏现在使用 `assets/sheep/` 中的独立完整 PNG，每张 32×32 像素、透明背景。不再运行横向图集切帧动画。

文件名规则：`年龄-品种-羊毛-姿势.png`。

- 年龄：`young` 幼羊 / `adult` 成年羊。幼羊有独立的短身、大头模型，60 日龄变成成年模型。
- 品种：`normal` 云朵羊 / `mint` 薄荷羊 / `peach` 蜜桃羊 / `rainbow` 彩虹羊。
- 羊毛：`wool` 有毛 / `shorn` 剪毛后。任何年龄都能长毛和剪毛。
- 姿势：`idle` 站立与移动 / `sit` 坐下 / `eat` 吃草 / `drink` 喝水 / `lie` 卧下 / `sleep` 睡觉。

共 96 张 PNG，生成脚本为 `tools/draw-sheep-sprite.py`。手工设计时，在 Pixelorama 中编辑对应 PNG 并覆盖，关闭平滑缩放。

行走使用完整站姿图片进行平移，转向只改变整个角色的镜像。禁止恢复对 `background-position` 的插值，否则会再次出现相邻半帧拼接、看似头身断开的错误。最后加载的 `assets/progression.css` 关闭所有旧图集背景和羊身动画。

`assets/sheep-sprite.png`、`assets/sheep-sprite.json` 只保留为设计参考，已不参与角色渲染。场景夜色由 `assets/sheep-night.css` 控制；每天白天 48 秒、夜晚 12 秒。

草场微光由 `assets/pixel-ambience.js` 在本地 Canvas 绘制。

## 经营递进与退休金

- 现金 `gold` 用于购买、升级和存钱；累计营业收入 `earned` 用于等级门槛；退休金 `savings` 只在玩家主动存钱时增加。
- 输入正整数存款，现金等额减少、退休金等额增加。不得透支，不把累计收入自动计入存款。退休金达到 1 亿元可退休。
- LV1 是基础经营；LV2 补给设施；LV3 雇工与订单；LV4 薄荷羊；LV5 蜜桃羊；LV6 彩虹羊与商路；LV7 树荫；LV8 礼盒车间。
- 牧场升级同时需要累计收入门槛与现金。等级只开放购买资格；设施和羊种仍需额外付费解锁，羊仔另行购买。
- 薄荷羊每只为全场长毛速度 +20%；蜜桃羊每只为全场成长速度 +20%。各自最多按 3 只叠加；出售后立即失去加成。
- 彩虹羊产毛量 ×4，成年活羊基础售价 ¥18,000。所有幼羊禁止直接出售/出栏，羊毛剪取不受成年条件限制。
- 旧存档保留现金、已购买设施和羊群，按已购设施补足对应等级；未领取过退休结局的旧累计收入不会凭空变成存款。

## 雇工与场景

- `assets/farm-worker.png`：120 × 36，5 帧，每帧 24 × 36，依次为站立、迈左脚、迈右脚、弯腰拾取、卸货。修改时保证整个人在单帧里，运行时使用整数帧切换。
- `assets/wool-shed.png`：48 × 40 的羊毛收纳棚。
- `assets/pasture-grass.png`：96 × 96 的稀疏草地纹理。
- `assets/pasture-clover.png`、`assets/shade-tree.png`：三叶草与树荫升级后出现的场景素材。
- `tools/draw-farm-sprites.py` 是这些原创像素素材的生成源文件；手工编辑 PNG 后，不要再次运行生成器覆盖自己的作品。
- 干草槽、水槽由 `assets/farm-items.css` 绘制，靠两侧围栏嵌入，内部只显示填充高度，不再铺满横线。每次点击仍然付金币补 1/10 容量。

底部流水线已移除，雇工把羊毛搬回收纳棚后直接加入仓库。

## 存档与账号隔离

- 正式小工具运行时优先使用 `window.xhs.miniTool` 的容器 Storage，不再把正式进度写入浏览器 `localStorage`。
- 存档键使用 `muyun-sheep-farm-v3` 加上启动环境中可用的标识。当前公开文档未保证提供用户 ID，也未保证本机缓存随账号切换隔离，因此本机缓存不能当作已经验证的账号云存档。缺少标识时不能宣称账号隔离已经完成。
- 浏览器直接打开页面时才保留旧 `localStorage` 兼容路径，方便本地调试；该路径不代表小红书容器里的正式存档实现。
- 容器存档读取完成前不会覆盖旧存档；过早点击保存会等待账号存档完成并提示再次保存。
- 云存档通过 `queryCloudStorage` / `addCloudStorage` / `updateCloudStorage` 使用平台提供的“用户 × 小工具”隔离，客户端需 9.51+ 且作品获得平台授权。按钮仅在能力检查通过后显示；真实授权与 Android/iOS 两账号切换仍需真机验证。
- 新档从第 0 天开始，库存和升级均未预置进度。旧档只去掉旧版本多加的 8 天天数偏移，并保存 `calendarVersion: 1` 避免重复扣减；金币、羊群、升级保留。
- `assets/controls-atlas.png` 是 14 个原创 24×24 像素操作图标；`assets/controls.css` 定义操作按钮、就绪高亮、按压反馈和新手步骤。
- `assets/market-goods.png`：64×32，左侧 32×32 为篮装羊毛，右侧为木板上的羊排；用于集市报价和原料委托。生成源文件是 `tools/draw-market-goods.py`。
