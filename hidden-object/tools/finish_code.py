from pathlib import Path
p=Path('hidden-object/assets/app.js');s=p.read_text(encoding='utf-8-sig')
start=s.index('function save(){');end=s.index('\nfunction loadImage',start)
s=s[:start]+'''function save(){if(!level)return;progress.current=current;progress.pages[level.id]={found:targets.map(function(t){return t.found?1:0;}),strokes:strokes.map(function(s){return{mode:s.mode,color:s.color,width:s.width,target:s.target,points:s.points};})};clearTimeout(saveTimer);saveTimer=setTimeout(function(){storageCall('setStorage',{key:KEY,data:JSON.stringify(progress)});},350);}'''+s[end:]
s=s.replace("button.appendChild(c);var tick=", "button.appendChild(c);var name=document.createElement('span');name.className='target-name';name.textContent=t.label;button.appendChild(name);var tick=")
s=s.replace("if(storageReady&&progress.current&&!strokes.length)openLevel(progress.current)","if(storageReady&&!strokes.length)openLevel(progress.current||0)")
p.write_text(s,encoding='utf8')
p=Path('hidden-object/assets/style.css');s=p.read_text(encoding='utf-8-sig');s+='\n.target-name{font-size:10px;font-weight:600;line-height:1.3;display:block;max-width:100%;text-align:center;padding:1px 1px 5px;color:#63735b;pointer-events:none}.target-card canvas{height:65px}.target-card.found .target-name{color:#91a181}.target-card{padding-bottom:9px}@media(max-width:650px){.target-name{font-size:9px;padding-bottom:2px}.target-card canvas{height:59px}.target-card{min-height:92px}}\n';p.write_text(s,encoding='utf8')
