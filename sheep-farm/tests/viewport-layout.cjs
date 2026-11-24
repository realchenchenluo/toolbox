const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/viewport-layout.js'),'utf8');
async function boot({info,api=true,fail=false,platform=true}={}){
  const styles={},attributes={},listeners={},visualListeners={};let calls=0;
  const html={style:{setProperty(k,v){styles[k]=v;}},classList:{add(k){attributes.class=k;}},setAttribute(k,v){attributes[k]=v;}};
  const root={document:{documentElement:html,hidden:false,addEventListener(k,fn){listeners['doc:'+k]=fn;}},innerHeight:844,addEventListener(k,fn){listeners[k]=fn;},setTimeout(fn){fn();return 1;},clearTimeout(){},visualViewport:{height:844,offsetTop:0,addEventListener(k,fn){visualListeners[k]=fn;}}};
  if(platform)root.xhs={launchOptions:{miniToolEnv:{windowInfo:info}},miniTool:api?{getWindowInfo(){calls++;return fail?Promise.reject(new Error('unavailable')):Promise.resolve(info);}}:{}};
  vm.runInNewContext(source,{window:root});await Promise.resolve();await Promise.resolve();await Promise.resolve();
  return {root,styles,attributes,listeners,visualListeners,calls:()=>calls};
}
(async()=>{
  const separate={windowWidth:390,windowHeight:844,statusBarHeight:28,safeArea:{left:0,top:28,right:390,bottom:810},menuButtons:{back:{left:12,top:50,width:36,height:36,bottom:86},me:{left:300,top:50,width:36,height:36,bottom:86},share:{left:342,top:50,width:36,height:36,bottom:86}}};
  const t=await boot({info:separate});assert.equal(t.styles['--farm-content-top'],'86px');assert.equal(t.styles['--farm-safe-bottom'],'34px');assert.equal(t.calls(),1);
  const capsule=JSON.parse(JSON.stringify(separate));capsule.menuButtons.capsule={left:260,top:38,width:112,height:32,bottom:70};capsule.menuButtons.back.bottom=200;
  const m=t.root.FarmViewportLayout.measurements(capsule);assert.equal(m.top,70); // Capsule supersedes hidden legacy buttons, no status bar double count.
  capsule.safeArea.top=90;assert.equal(t.root.FarmViewportLayout.measurements(capsule).top,90);
  const invalid=t.root.FarmViewportLayout.measurements({windowWidth:390,windowHeight:844,safeArea:{top:22},menuButtons:{capsule:{width:0,height:40,bottom:900}}});assert.equal(invalid.top,22);
  assert.equal(t.root.FarmViewportLayout.measurements(null),null);
  const landscape=t.root.FarmViewportLayout.measurements({windowWidth:844,windowHeight:390,safeArea:{left:44,top:0,right:800,bottom:369},menuButtons:{capsule:{top:8,bottom:40,width:100,height:32}}});assert.equal(landscape.left,44);assert.equal(landscape.right,44);assert.equal(landscape.bottom,21);
  const fallback=await boot({api:false});assert.equal(fallback.attributes.class,'platform-container');assert.equal(fallback.styles['--farm-content-top'],undefined);
  const failure=await boot({info:separate,fail:true});assert.equal(failure.styles['--farm-content-top'],'86px');
  t.root.visualViewport.height=480;t.root.visualViewport.offsetTop=20;t.visualListeners.resize();assert.equal(t.styles['--farm-viewport-height'],'480px');assert.equal(t.styles['--farm-viewport-top'],'20px');
  t.listeners.pageshow();await Promise.resolve();assert.equal(t.calls(),2);
  t.root.document.documentElement.scrollTop=32;t.root.document.body={scrollTop:90};t.listeners['doc:scroll']();assert.equal(t.root.document.documentElement.scrollTop,0);assert.equal(t.root.document.body.scrollTop,0);
  const browser=await boot({platform:false});assert.equal(browser.attributes.class,undefined);assert.equal(browser.calls(),0);
  console.log('PASS: native button/capsule avoidance, launch snapshot, safe-area coordinates, no double status bar, landscape insets, API fallback, keyboard viewport and resume.');
})().catch(e=>{console.error(e);process.exitCode=1;});
