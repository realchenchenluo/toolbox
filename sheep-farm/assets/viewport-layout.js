(function (root) {
  'use strict';
  var doc=root.document,html=doc.documentElement,tool=root.xhs&&root.xhs.miniTool;
  var pending=0,request=0;
  function positive(value) {value=Number(value);return isFinite(value)&&value>0?value:0;}
  function rectVisible(rect) {return rect&&positive(rect.width)>0&&positive(rect.height)>0;}
  function measurements(info) {
    if(!info||!positive(info.windowWidth)||!positive(info.windowHeight))return null;
    var width=positive(info.windowWidth),height=positive(info.windowHeight),safe=info.safeArea||{},buttons=info.menuButtons||{};
    var rects=rectVisible(buttons.capsule)?[buttons.capsule]:[buttons.back,buttons.me,buttons.share].filter(rectVisible);
    var top=positive(safe.top),left=positive(safe.left),right=positive(safe.right)?Math.max(0,width-safe.right):0,bottom=positive(safe.bottom)?Math.max(0,height-safe.bottom):0;
    rects.forEach(function(rect){top=Math.max(top,positive(rect.bottom)||positive(rect.top)+positive(rect.height));});
    // Coordinates are already relative to the container: never add statusBarHeight again.
    return {top:Math.min(top,Math.max(0,height-160)),bottom:Math.min(bottom,height/3),left:Math.min(left,width/4),right:Math.min(right,width/4)};
  }
  function apply(info) {
    var area=measurements(info);if(!area)return false;
    html.style.setProperty('--farm-content-top',area.top+'px');
    html.style.setProperty('--farm-safe-bottom',area.bottom+'px');
    html.style.setProperty('--farm-safe-left',area.left+'px');
    html.style.setProperty('--farm-safe-right',area.right+'px');
    html.setAttribute('data-window-layout','measured');
    return true;
  }
  function viewport() {
    var view=root.visualViewport,height=view&&positive(view.height)||positive(root.innerHeight),top=view&&positive(view.offsetTop)||0;
    if(height){html.style.setProperty('--farm-viewport-height',height+'px');html.style.setProperty('--farm-viewport-top',top+'px');}
  }
  function lockOuterScroll() {
    // Focus may programmatically scroll overflow:hidden ancestors; only main/modal bodies may scroll.
    if(html.scrollTop)html.scrollTop=0;
    if(doc.body&&doc.body.scrollTop)doc.body.scrollTop=0;
  }
  function read() {
    viewport();
    if(!tool||typeof tool.getWindowInfo!=='function')return;
    var id=++request;
    Promise.resolve().then(function(){return tool.getWindowInfo();}).then(function(info){if(id===request&&(!info.errMsg||info.errMsg==='getWindowInfo:ok'))apply(info);}).catch(function(){/* Keep measured values or CSS safe-area fallback. */});
  }
  function schedule() {viewport();if(pending)root.clearTimeout(pending);pending=root.setTimeout(function(){pending=0;read();},100);}
  if(root.xhs)html.classList.add('platform-container');
  viewport();
  var launch=root.xhs&&root.xhs.launchOptions,initial=launch&&launch.miniToolEnv&&launch.miniToolEnv.windowInfo;
  if(initial)apply(initial);
  read();
  root.addEventListener('resize',schedule);root.addEventListener('orientationchange',schedule);root.addEventListener('pageshow',read);
  if(root.visualViewport){root.visualViewport.addEventListener('resize',viewport);root.visualViewport.addEventListener('scroll',viewport);}
  doc.addEventListener('visibilitychange',function(){if(!doc.hidden)read();});
  doc.addEventListener('scroll',lockOuterScroll,true);
  doc.addEventListener('focusin',function(){root.setTimeout(lockOuterScroll,0);});
  root.FarmViewportLayout={measurements:measurements,refresh:read};
}(window));
