# 藏在画里 · 答案识别版

本次从用户提供的答案截图继续制作，开放原图前 23 页，合计 520 个寻找目标。原有后 88 页源码与图片保留在工作区，未开放为可玩关卡，也未塞入上传包。

## 已实现

- 本关全部目标直接列出，可滚动查看；点卡片只放大预览。
- 任意顺序点中或沿物体涂色，按答案轮廓确认具体目标，立即高亮并打勾。
- 外接矩形内但轮廓外的点不算命中；横穿许多物体的长线不会批量完成目标。
- 重复点击不重复计数；每笔最多确认一个目标。
- 双指缩放和平移、独立移动工具、颜色选择、擦笔迹、撤销。
- 全部找齐才开放通关；撤销发现后同步撤回通关状态。
- 图册展示 23 幅缩略图、每页进度和完成印章。
- 小红书 Storage 持久化，版本和方法检测；未知环境仅保留当前会话。异步存档读取会合并本次发现，不覆盖正在游玩的进度。
- 新版使用 `hidden-object-answers-v4` 存档键。旧版的手动勾选不能验证位置，因此不转为新版本的已找到目标；旧键数据保留。
- 持久笔迹有数量和体积预算；完整已找到目标 ID 优先保留。

## 判定方式与内容范围

`tools/calibrate_answers.py` 利用构建期图形特征将答案截图对齐到原始线稿。`tools/build_recognition.py` 把彩色答案区域转换为轮廓、目标小图与内部验证点，并合并被黑线分开的同一目标。游戏运行时由 `assets/recognition.js` 在原图坐标中检查点击或涂画，不联网，不加载视觉模型。

目标小图来自场景中的答案轮廓；名称采用图形的简短描述。接触的色块、极细的物体和命名仍适合逐关体验复核。QA 编号图在 `qa/answers/001-final.jpg` 至 `023-final.jpg`，不进入上传包。通关检查覆盖本次整理的答案区域，不代表能识别任意新图片中的物品。

## 开发与交付

从工作区根目录执行：

```powershell
python -X utf8 hidden-object/tools/build_recognition.py
node hidden-object/tools/test-recognition.cjs
python -X utf8 hidden-object/tools/package.py
python -X utf8 C:/Users/33183/.codex/skills/minitool-zip-builder/scripts/audit_artifact.py release/hidden-object-minitool.zip
```

入口为 `index.html`，运行代码为 `assets/game.js`、`assets/recognition.js`、`assets/game.css`，数据为 `assets/levels.js`，资源在 `assets/calibrated/`。旧版 `app.js`、`style.css` 仅作为历史源码保留，不进入发布包。

本地预览：`http://127.0.0.1:8785/hidden-object/`。

新版上传包：`release/hidden-object-minitool.zip`。打包前版本保存在 `qa/before-recognition.zip`。包只包含运行必需的 75 个文件，线稿采用 4 色无损 WebP；包约 2.73 MiB，低于 10 MiB 上限，略高于 2 MiB 建议值，保留了放大线稿所需的分辨率。

测试覆盖 520 个目标内部点、520 个外接框与轮廓差异的负例、23 关倒序通关、误点、重复、预览、撤销、双指取消绘画、擦除、取消事件、切关、资源加载失败与重试、过期加载、存档恢复与异步合并。另在普通浏览器检查了桌面、390px 手机和 320px 窄屏布局。

浏览器检查与 Node 测试不等于小红书容器验收。交付后还需将同一 ZIP 在创服平台模拟器、Android 真机和 iOS 真机中验证。Chrome 61 兼容性、真机首屏时间、帧率和内存尚未实测。在线规则核对来源：https://miniapp-sandbox.xiaohongshu.com/minitool/doc（2026-11-21 获取，页面版本 2026-11-19）。

原版 Nature 主题的 MIT 许可保留在 `assets/hud-nature.css` 文件头。
