// Local container overlay test only; excluded from runtime package.
(function(){
 var query=window.location.search,launch=query.indexOf('new=1')>=0,kind=query.indexOf('capsule=1')>=0?'capsule':query.indexOf('none=1')>=0?'none':'buttons';
 var seed={"calendarVersion": 1, "progressionVersion": 1, "level": 8, "gold": 12340, "earned": 190000, "savings": 12400, "day": 5, "dayPhase": 0, "savedAt": 1000, "hay": 2000, "water": 2000, "tutorial": {"seen": true, "done": true, "steps": [true, true, true, true]}, "upgrades": {"capacity": 7, "worker": 1}, "sheep": [{"id": "safe-0", "breed": "normal", "age": 80, "hunger": 90, "thirst": 90, "wool": 20, "x": 22, "y": 30}, {"id": "safe-1", "breed": "gift", "age": 80, "hunger": 90, "thirst": 90, "wool": 20, "x": 45, "y": 30}, {"id": "safe-2", "breed": "mint", "age": 80, "hunger": 90, "thirst": 90, "wool": 20, "x": 68, "y": 30}, {"id": "safe-3", "breed": "peach", "age": 80, "hunger": 90, "thirst": 90, "wool": 20, "x": 22, "y": 55}, {"id": "safe-4", "breed": "wish", "age": 80, "hunger": 90, "thirst": 90, "wool": 20, "x": 45, "y": 55}, {"id": "safe-5", "breed": "rainbow", "age": 80, "hunger": 90, "thirst": 90, "wool": 20, "x": 68, "y": 55}]};
 function info(){var w=window.innerWidth,h=window.innerHeight,land=w>h,top=land?8:28,menu={back:null,me:null,share:null,capsule:null};
  function rect(left,t,width,height){return {left:left,top:t,right:left+width,bottom:t+height,width:width,height:height};}
  if(kind==='capsule')menu.capsule=rect(w-124,top+9,112,34);
  if(kind==='buttons'){menu.back=rect(12,top+22,36,36);menu.me=rect(w-96,top+22,36,36);menu.share=rect(w-48,top+22,36,36);}
  return {windowWidth:w,windowHeight:h,statusBarHeight:top,safeArea:{left:land?28:0,right:w-(land?28:0),top:top,bottom:h-(land?16:24)},menuButtons:menu};}
 window.xhs={launchOptions:{userId:'safe-ui-check',miniToolEnv:{buildVersion:9550000,windowInfo:info()}},miniTool:{getWindowInfo:function(){return Promise.resolve(info());},getStorage:function(){return Promise.resolve({errMsg:'getStorage:ok',data:launch?null:JSON.stringify(seed)});},setStorage:function(){return Promise.resolve({errMsg:'setStorage:ok'});}}};
 if(query.indexOf('noapi=1')>=0){delete window.xhs.launchOptions.miniToolEnv.windowInfo;delete window.xhs.miniTool.getWindowInfo;}
 document.addEventListener('DOMContentLoaded',function(){
  var layer=document.createElement('div');layer.id='native-overlay-test';layer.style.cssText='position:fixed;top:0;left:0;right:0;z-index:9999;pointer-events:none;font-family:sans-serif;';document.body.appendChild(layer);
  function draw(){var data=info();layer.innerHTML='';
   ['capsule','back','me','share'].forEach(function(key){var r=data.menuButtons[key];if(!r)return;var n=document.createElement('div');n.className='native-test-button';n.style.cssText='position:fixed;border-radius:20px;background:rgba(88,97,80,.55);color:white;text-align:center;line-height:'+r.height+'px;font-size:13px;left:'+r.left+'px;top:'+r.top+'px;width:'+r.width+'px;height:'+r.height+'px;pointer-events:auto;';n.textContent=key==='capsule'?'•••  ×':key==='back'?'‹':key==='me'?'人':'↗';layer.appendChild(n);});
   var label=document.createElement('small');label.style.cssText='position:fixed;top:3px;left:12px;color:#6b7960;font-size:10px';label.textContent='测试数据 · 模拟平台顶部按钮';layer.appendChild(label);
  }draw();window.addEventListener('resize',draw);
 });
}());