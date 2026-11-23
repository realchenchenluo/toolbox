# 像素羊场参考记录

采集日期：2026-11-20

## 参考项目

- [DevStudio-AI/GreenValley_](https://github.com/DevStudio-AI/GreenValley_)：README 展示了从零实现的像素农场模拟器，重点参考了 Canvas 的像素绘制、关闭平滑、精灵帧动画、地图分区、HUD、商店和制作链。
- [MingfengHong/pixel-art-studio](https://github.com/MingfengHong/pixel-art-studio)：README 展示了包含 HUD、商店、任务、背包和像素边框的完整 UI kit，参考了“同一面板用标签展开”的信息组织方式。
- [JaiGod/rpg-pixel-pack](https://github.com/JaiGod/rpg-pixel-pack)：README 标明 PNG/GIF 美术为 CC0，参考了 32px 网格、干净轮廓、统一左上光源和分帧动画的视觉规范。
- [Tiddybub/2d-assets](https://github.com/Tiddybub/2d-assets)：README 标明收录的 2D 资源为 CC0，参考了农场、自然、UI 资源需要统一素材风格的做法。
- [Orama-Interactive/Pixelorama](https://github.com/Orama-Interactive/Pixelorama)：MIT 开源像素编辑器，README 强调像素网格、有限调色板、图层明暗、帧动画和 spritesheet 导出；本项目按这些原则整理羊的 32px 帧和调色板元数据。

## 本项目落地

- 牧场改成视频式水平布局：左侧草场，右侧同层管理面板。
- 顶部只保留名称、日期、现金、羊群和幸福度，去掉大段说明。
- 右侧通过「集市 / 升级 / 订单 / 羊群」标签在同一面板内展开内容。
- 羊使用本地 4 帧 PNG spritesheet，具有像素轮廓、明暗层次和行走/进食帧。
- 羊会根据饥饿和口渴自动移动到干草槽或清水池；加工车间默认锁定，需牧场 LV6 且支付解锁费用后才出现。

本项目没有复制上述仓库的代码或受限素材，只借鉴公开 README 中的界面组织与像素表现原则。
