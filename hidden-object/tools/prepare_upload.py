from pathlib import Path
from PIL import Image
import hashlib
import json
import zipfile
import shutil

base = Path(__file__).resolve().parents[2]
root = base / 'release' / '图画捉迷藏-上传资料'
root.mkdir(exist_ok=True)
shutil.copy2(base / 'release' / '图画捉迷藏-小工具.zip', root / '图画捉迷藏-小工具.zip')
shutil.copy2(base / 'hidden-object' / 'assets' / 'app-icon.png', root / '图画捉迷藏-图标.png')
pkg = root / '图画捉迷藏-小工具.zip'
icon = root / '图画捉迷藏-图标.png'
cover = root / '图画捉迷藏-封面.jpg'

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
    'appName': '图画捉迷藏',
    'slogan': '找到细节，收集惊喜',
    'version': '1.1.0',
    'description': '自由顺序寻找画里的隐藏物，发现后自动确认并点亮进度。',
    'categorySuggestion': '益智 / 休闲游戏（请在上传页选择当前可用的实际类目）',
    'authorizations': [],
    'package': {'file': pkg.name, **zip_info},
    'icon': {'file': icon.name, **icon_info, 'limit': 'PNG/JPG/JPEG，≤5 MiB，1:1'},
    'cover': {'file': cover.name, **cover_info, 'limit': 'PNG/JPG/JPEG，≤10 MiB，3:4'},
    'content': '23幅可玩画面，520个隐藏目标；后续88幅素材暂未开放。',
    'localValidation': [
        'ZIP根目录含index.html', '离线包完整性通过', '图标与封面尺寸通过',
        '本地浏览器390×844、320×667、844×390及桌面布局检查',
        '520个目标识别与23关回归测试通过', '模拟账号A/B隔离、恢复与异常存档测试通过'
    ],
    'accountSave': '使用平台用户×小工具云存储隔离，需9.51+及云存储内测授权；未开放时仅临时游玩。旧共用设备存档不迁移。',
    'pendingValidation': ['创服平台模拟器', 'Android真机扫码', 'iOS真机扫码', '真实账号A/B及跨设备恢复', 'Chrome 61兼容性及真机性能'],
    'uploadState': '本地资料已准备，尚未上传'
}
(root / '上传填写信息.json').write_text(json.dumps(info, ensure_ascii=False, indent=2), encoding='utf-8')

check = f'''# 图画捉迷藏 · 小红书上传清单

## 上传文件

- 代码包：{pkg.name}
- 图标：{icon.name}
- 封面：{cover.name}

## 表单填写

- 名称：图画捉迷藏（5/14）
- 简介：找到细节，收集惊喜（9/14）
- 版本：1.1.0
- 类目建议：益智 / 休闲游戏；请以上传页当前实际类目为准
- 权限：不需要设备权限
- 代码包：ZIP 根目录直接包含 index.html

## 已检查

- ZIP：{zip_info['bytes']} bytes，{zip_info['entries']} 个文件，完整性通过，入口为 {zip_info['rootEntry']}
- 图标：{icon_info['format']} {icon_info['width']}×{icon_info['height']}，{icon_info['bytes']} bytes
- 封面：{cover_info['format']} {cover_info['width']}×{cover_info['height']}，{cover_info['bytes']} bytes
- 本地浏览器：390×844、320×667、844×390及桌面布局检查；不等于平台验收
- 模拟账号：A/B隔离、新用户空档、重新打开恢复、读取失败不覆盖、写入UNKNOWN对账
- 代码包：离线资源检查和目标识别回归测试通过

## 账号存档前提

客户端需9.51+，小工具需开通云存储内测权限（官方文档仍标为内测）。平台按用户与小工具隔离数据，无需采集昵称。旧设备共用存档归属不明，不导入任何账号；旧数据不删除。未开放、旧版本或读取失败时可临时游玩，界面明确提示，禁止覆盖云端原档。云端只保存发现ID、当前页及受限笔迹，合并节流写入，支持手动保存、切关及进入后台时尝试保存。多设备同时游玩遵循平台最后写入生效规则。

## 待验证

同一ZIP还需在创服平台模拟器、Android真机扫码、iOS真机扫码验证，特别检查真实账号A/B切换、新用户及同账号跨设备恢复；Chrome 61兼容性和真机性能未实测。

## 交付范围

本资料只完成上传前准备，没有执行远程上传、手机二维码预览或送审。
'''
(root / '上传检查清单.md').write_text(check, encoding='utf-8')
print(json.dumps(info, ensure_ascii=False, indent=2))
