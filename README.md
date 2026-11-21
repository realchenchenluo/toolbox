# 轻工具箱 · 小红书小工具复刻版

这是一个按用户提供截图复刻的离线 H5 工具箱：薄荷绿方格背景、手写风口号、胶囊分类栏、四列工具网格、底部导航和单页工具面板。首页视觉使用开源 Lucide 风格线性图标（MIT），不引用外部 CDN、后端或网络字体，既可以作为 GitHub Pages 静态站点，也可以按小红书小工具规范打包成 ZIP。

## 已实现

- 日常：时间屏幕、番茄钟、白噪音入口、BMI、记账、决定器、计时器、记分牌。
- 好玩：数独、舒尔特方格、补光灯、拼豆网格、MBTI 轻测试、弹幕和人生小格入口。
- 图片：本地图片拼接、证件照背景预览；OCR 与每日壁纸保留清楚的离线降级说明。
- 计算：计算器、函数 Canvas、工资个税估算、单位换算、房贷月供、日期计算。
- 文字：离线短语翻译、随机数、设备语音、摩斯电码、中文转拼音、文本编辑器。
- 查询 / 设备：对需要网络、全量数据库、磁力计或系统级权限的功能保留入口和能力边界说明，不伪造实时结果。

## 本地运行

```powershell
python -m http.server 8080
```

打开 `http://127.0.0.1:8080/`。页面也可被小红书小工具模拟器加载。

## 小红书小工具包

`release/toolbox-minitool.zip` 的根目录直接包含 `index.html`，所有脚本和样式均为相对路径。容器 API（保存相册、分享、Storage）均做存在性检查；未注入 API 时仍能运行核心工具。

打包前运行：

```powershell
node "$env:USERPROFILE\.codex\skills\minitool-zip-builder\scripts\audit_artifact.mjs" .
```

## GitHub Pages

项目会发布一个只包含静态页面的 `gh-pages` 分支。仓库设置中将 Pages 来源设为 `Deploy from a branch`、`gh-pages`、`/ (root)` 即可；这样不需要给 GitHub CLI token 增加 Actions workflow 权限。

## 能力与取舍

页面按 `minitool-zip-builder` 1.11.1 约束编写：无 `fetch`、外部资源、`eval`、Worker、剪贴板、外链跳转或网络 OCR。小工具在线文档中新增的窗口信息、分享、振动、定位、陀螺仪等能力需通过容器注入并满足客户端版本；本项目只接入分享 / 保存相册的可选路径，没有用角速度冒充指南针或分贝仪。

GitHub 方案调研参考了 MIT 许可的 [pocketjoso/sudokuJS](https://github.com/pocketjoso/sudokuJS) 与 [mcarbonell/sudoku-solver-js](https://github.com/mcarbonell/sudoku-solver-js)，最终使用小型无依赖实现以保持离线包轻量，不复制第三方代码。图标路径采用 [lucide-icons/lucide](https://github.com/lucide-icons/lucide) 的开源线性图标风格，项目没有打入外部图标库运行时。

## 图画捉迷藏

隐藏物寻找小游戏位于 [`hidden-object/`](./hidden-object/)，使用离线资源运行，当前包含 23 个可玩画面和 520 个隐藏目标。小红书上传包、图标、封面和填写资料位于 [`release/`](./release/)。

在线试玩：<https://realchenchenluo.github.io/toolbox/hidden-object/>
