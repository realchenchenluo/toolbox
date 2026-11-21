from pathlib import Path
from PIL import Image
import hashlib
import json
import zipfile

root = Path(__file__).resolve().parents[2] / 'release' / '图画捉迷藏-上传资料'
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
    'slogan': '每一页都有新发现',
    'version': '1.0.0',
    'description': '自由顺序寻找画里的隐藏物，发现后自动确认并点亮进度。',
    'categorySuggestion': '益智 / 休闲游戏（请在上传页选择当前可用的实际类目）',
    'authorizations': [],
    'package': {'file': pkg.name, **zip_info},
    'icon': {'file': icon.name, **icon_info, 'limit': 'PNG/JPG/JPEG，≤5 MiB，1:1'},
    'cover': {'file': cover.name, **cover_info, 'limit': 'PNG/JPG/JPEG，≤10 MiB，3:4'},
    'content': '23幅可玩画面，520个隐藏目标；后续88幅素材暂未开放。',
    'localValidation': [
        'ZIP根目录含index.html', '离线包完整性通过', '图标与封面尺寸通过',
        '小红书本地模拟器iPhone全屏预览通过', '目标识别回归测试通过'
    ],
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
- 简介：每一页都有新发现（9/14）
- 版本：1.0.0
- 类目建议：益智 / 休闲游戏；请以上传页当前实际类目为准
- 权限：不需要设备权限
- 代码包：ZIP 根目录直接包含 index.html

## 已检查

- ZIP：{zip_info['bytes']} bytes，{zip_info['entries']} 个文件，完整性通过，入口为 {zip_info['rootEntry']}
- 图标：{icon_info['format']} {icon_info['width']}×{icon_info['height']}，{icon_info['bytes']} bytes
- 封面：{cover_info['format']} {cover_info['width']}×{cover_info['height']}，{cover_info['bytes']} bytes
- 本地模拟器：iPhone 全屏场景已验证
- 代码包：离线资源检查和目标识别回归测试通过

## 交付范围

本资料只完成上传前准备，没有执行远程上传、手机二维码预览或送审。
'''
(root / '上传检查清单.md').write_text(check, encoding='utf-8')
print(json.dumps(info, ensure_ascii=False, indent=2))
