from pathlib import Path
from PIL import Image
import hashlib
import json
import zipfile
import shutil

base = Path(__file__).resolve().parents[2]
root = base / 'release' / '找找找-上传资料'
root.mkdir(exist_ok=True)
shutil.copy2(base / 'release' / '找找找-小工具.zip', root / '找找找-小工具.zip')
shutil.copy2(base / 'hidden-object' / 'assets' / 'app-icon.png', root / 'icon.png')
pkg = root / '找找找-小工具.zip'
# Short ASCII filenames also work in clients that misparse Chinese attachment paths.
shutil.copy2(base / 'release' / '找找找-发布素材' / 'cover.jpg', root / 'cover.jpg')
icon = root / 'icon.png'
cover = root / 'cover.jpg'
portable = base / 'release' / 'hidden-object-upload'
portable.mkdir(exist_ok=True)
for src, name in [(icon, 'icon.png'), (cover, 'cover.jpg'), (pkg, 'game.zip')]:
    shutil.copy2(src, portable / name)

def sums(path):
    data = path.read_bytes()
    return {'bytes': len(data), 'md5': hashlib.md5(data).hexdigest(), 'sha256': hashlib.sha256(data).hexdigest()}

with Image.open(icon) as image:
    icon_info = {'format': image.format, 'width': image.width, 'height': image.height, **sums(icon)}
with Image.open(cover) as image:
    cover_info = {'format': image.format, 'width': image.width, 'height': image.height, **sums(cover)}
with zipfile.ZipFile(pkg) as archive:
    zip_info = {**sums(pkg), 'entries': len(archive.namelist()), 'rootEntry': archive.namelist()[0], 'integrity': archive.testzip() is None}

info = {
    'appName': '找找找',
    'slogan': '找到细节，收集惊喜',
    'version': '1.1.4',
    'description': '自由顺序寻找画里的隐藏物，发现后自动确认并点亮进度。',
    'categorySuggestion': '益智 / 休闲游戏（请在上传页选择当前可用的实际类目）',
    'authorizations': [],
    'package': {'file': pkg.name, **zip_info},
    'icon': {'file': icon.name, **icon_info, 'limit': 'PNG/JPG/JPEG，≤5 MiB，1:1'},
    'cover': {'file': cover.name, **cover_info, 'limit': 'PNG/JPG/JPEG，≤10 MiB，3:4'},
    'content': '23幅可玩画面，520个隐藏目标；后续88幅素材暂未开放。',
    'localValidation': [
        'ZIP根目录含index.html', '离线包完整性通过', '图标与封面尺寸通过',
        'ui11关卡独立加载及重试、画册分页与同步导航回归测试通过',
        '520个目标识别与23关回归测试通过', '模拟账号A/B隔离、恢复与异常存档测试通过'
    ],
    'accountSave': '使用平台用户×小工具云存储隔离，需9.51+及云存储内测授权；未开放时仅临时游玩。旧共用设备存档不迁移。',
    'pendingValidation': ['创服平台模拟器', 'Android真机扫码', 'iOS真机扫码', '真实账号A/B及跨设备恢复', 'Chrome 61兼容性及真机性能'],
    'uploadState': '本地资料已准备，尚未上传'
}
(root / '上传填写信息.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')

check = f'''# 找找找 · 小红书上传清单

## 上传文件

- 代码包：{pkg.name}
- 图标：{icon.name}
- 封面：{cover.name}

## 表单填写

- 名称：找找找（3/14）
- 简介：找到细节，收集惊喜（9/14）
- 版本：1.1.4
- 类目建议：益智 / 休闲游戏；请以上传页当前实际类目为准
- 权限：不需要设备权限
- 代码包：ZIP 根目录直接包含 index.html

## 已检查

- ZIP：{zip_info['bytes']} bytes，{zip_info['entries']} 个文件，完整性通过，入口为 {zip_info['rootEntry']}
- 图标：{icon_info['format']} {icon_info['width']}×{icon_info['height']}，{icon_info['bytes']} bytes
- 封面：{cover_info['format']} {cover_info['width']}×{cover_info['height']}，{cover_info['bytes']} bytes
- 本次UI：暖色配色、单排工具筛选、深色高亮；本地浏览器390×700、320×667、844×390、1280×900检查通过，实际找物、撤销、预览和缩放通过；不代表小红书容器或真机验收
- ui11加载修复：场景与目标图独立加载、各自重试；超时自动重试一次，仍失败显示手动重试。画册每次展示6幅缩略图，首次图片约114KiB，旧版全部大图约2MiB；账号读取完成保留画册导航。新增故障、超时、分页与同步导航回归通过；本地390×700确认关卡与40个目标正常显示，无控制台错误。
- 英文短文件名：release/hidden-object-upload内提供icon.png、cover.jpg和game.zip，内容与命名版相同
- 模拟账号：A/B隔离、新用户空档、重新打开恢复、读取失败不覆盖、写入UNKNOWN对账、进入后台后未完成的读档不能继续发起写入
- 代码包：离线资源检查和目标识别回归测试通过

## 账号存档前提

客户端需9.51+，小工具需开通云存储内测权限（官方文档仍标为内测）。平台按用户与小工具隔离数据，无需采集昵称。旧设备共用存档归属不明，不导入任何账号；旧数据不删除。未开放、旧版本或读取失败时可临时游玩，界面明确提示，禁止覆盖云端原档。云端只保存发现ID、当前页及受限笔迹，合并节流写入，支持手动保存和切关保存；进入后台取消尚未完成的写前请求，返回后重新核对账号，未保存内容不会跨账号迁移。多设备同时游玩遵循平台最后写入生效规则。

## 待验证

同一ZIP还需在创服平台模拟器、Android真机扫码、iOS真机扫码验证，特别检查真实账号A/B切换、新用户及同账号跨设备恢复；Chrome 61兼容性和真机性能未实测。

## 交付范围

本资料只完成上传前准备，没有执行远程上传、手机二维码预览或送审。
'''
(root / '上传检查清单.md').write_text(check, encoding='utf-8')
print(json.dumps(info, ensure_ascii=False, indent=2))

(portable / 'info.txt').write_text('名称：找找找\n简介：找到细节，收集惊喜\n代码包：game.zip\n图标：icon.png\n封面：cover.jpg\n', encoding='utf-8')
