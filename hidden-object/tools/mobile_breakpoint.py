from pathlib import Path
p=Path('hidden-object/assets/style.css');s=p.read_text(encoding='utf-8-sig');s=s.replace('@media(max-width:650px)','@media(max-width:820px)');p.write_text(s,encoding='utf8')
p=Path('hidden-object/assets/app.js');s=p.read_text();s=s.replace('window.innerWidth<=650','window.innerWidth<=820');p.write_text(s,encoding='utf8')
