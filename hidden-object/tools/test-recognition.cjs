const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const R = require('../assets/recognition.js');
const data = {window:{}};
vm.runInNewContext(fs.readFileSync('hidden-object/assets/levels.js','utf8'),data);
const book = data.window.HIDDEN_BOOK.filter(l => l.calibrated);
let hits = 0, outside = 0;
for (const l of book) {
  assert(l.items.length > 0);
  for (const [index,item] of l.items.entries()) {
    assert.equal(R.match(l.items,[{x:item.anchor[0],y:item.anchor[1]}],0),index,`${item.id}: interior hit`);
    for (const polygon of item.polygons) for (const [x,y] of polygon) assert(x >= 0 && y >= 0 && x < l.width && y < l.height,`${item.id}: polygon bounds`);
    const [left,top,right,bottom] = item.bounds;
    for (const p of [{x:left,y:top},{x:right,y:top},{x:left,y:bottom},{x:right,y:bottom}]) {
      if (!R.contains(item,p,0)) { assert.equal(R.match([item],[p],0),-1); outside++; break; }
    }
    hits++;
  }
  assert.equal(R.match(l.items,[{x:-20,y:-20}],8),-1,'outside scene must never count');
}
const square = {bounds:[10,10,30,30],polygons:[[[10,10],[30,10],[30,30],[10,30]]]};
assert.equal(R.match([square],[{x:0,y:20},{x:100,y:20}],0),-1,'crossing scribble must fail');
assert.equal(R.match([square],[{x:12,y:20},{x:28,y:20}],0),0,'draw inside object');

function harness(saved,storagePending) {
  const context = {save(){},restore(){},clearRect(){},fillRect(){},beginPath(){},arc(){},fill(){},moveTo(){},lineTo(){},stroke(){},drawImage(){},closePath(){}};
  class Element {
    constructor(id) { this.id=id; this.style={values:{},setProperty(k,v){this.values[k]=v;}}; this.attrs={}; this.listeners={}; this.children=[]; this.scrollTop=0; this.clientWidth=600; this.clientHeight=600; this.width=1000; this.height=1200; this.classList={toggle(){},add(){},remove(){}}; }
    addEventListener(n,f){ this.listeners[n]=f; } setAttribute(n,v){ this.attrs[n]=v; } getAttribute(n){return this.attrs[n];}
    appendChild(c){this.children.push(c);} getBoundingClientRect(){return {left:0,top:0,width:600,height:600};}
    querySelector(){return new Element('inner');} setPointerCapture(){} getContext(){return context;}
  }
  const elements={}, get=id => elements[id] || (elements[id]=new Element(id));
  const doc={getElementById:get,querySelectorAll(){return [];},createElement(tag){return new Element(tag);},createDocumentFragment(){return new Element('fragment');},addEventListener(){},body:new Element('body'),documentElement:new Element('html'),hidden:false};
  const docListeners={};doc.addEventListener=(name,callback)=>{docListeners[name]=callback;};
  const imageControl={fail:[],hang:[],requests:[]},timers=new Map();let timerId=0;
  class FakeImage {set src(s){this._src=s; imageControl.requests.push(s); this.naturalWidth=1000; this.naturalHeight=1200; queueMicrotask(() => { if(imageControl.hang.some(x=>s.includes(x)))return; if(imageControl.fail.some(x=>s.includes(x))) { if(this.onerror)this.onerror(); } else if(this.onload)this.onload(); });} get src(){return this._src;}}
  let writes=[], resolver, cloudSaved=saved, cloudId='account-a';
  const sandbox={document:doc,Image:FakeImage,Date,Promise,Math,console,setTimeout(f,ms){const id=++timerId;timers.set(id,{f,ms});return id;},clearTimeout(id){timers.delete(id);},requestAnimationFrame(){return 1;},window:{HIDDEN_BOOK:data.window.HIDDEN_BOOK,HiddenRecognition:R,innerWidth:390,innerHeight:844,scrollTo(){},addEventListener(){}}};
  if (saved) sandbox.window.xhs={launchOptions:{miniToolEnv:{buildVersion:9533000}},miniTool:{queryCloudStorage(){return storagePending ? new Promise(r => resolver=r) : Promise.resolve({items:[{id:cloudId,content:{schema:1,slot:'primary',progress:cloudSaved}}]});},addCloudStorage(){throw new Error('existing account must not add');},updateCloudStorage(v){writes.push(v);cloudSaved=v.items[0].content.progress;return Promise.resolve({data:[{id:cloudId,status:'SUCCESS'}]});}}};
  vm.runInNewContext(fs.readFileSync('hidden-object/assets/account-save.js','utf8'),sandbox);
  let source=fs.readFileSync('hidden-object/assets/game.js','utf8');
  source=source.replace('openLevel(0); initStorage();','window.test={pointerDown,pointerMove,finishPointer,openLevel,choose,save,setMode,setExploreMode,renderLibrary,readWindow,applyWindowInfo,get state(){return {targets,strokes,draft,zoom,progress,current,ready}}}; openLevel(0); initStorage();');
  vm.runInNewContext(source,sandbox);
  const event=(p,id=1)=>({pointerId:id,button:0,clientX:p.x,clientY:p.y,preventDefault(){}});
  const game=sandbox.window.test;
  function toEvent(point,id) {return event({x:point[0]/get('mark-layer').width*600,y:point[1]/get('mark-layer').height*600},id);}
  function tap(point){game.pointerDown(toEvent(point));game.finishPointer(toEvent(point),false);}
  return {game,get,tap,event,toEvent,writes,imageControl,doc,expireImages(){for(const [id,timer] of [...timers])if(timer.ms===15000){timers.delete(id);timer.f();}},resolve(){storagePending=false;resolver({items:[{id:cloudId,content:{schema:1,slot:'primary',progress:cloudSaved}}]});},switchAccount(value,id){cloudSaved=value;cloudId=id;},resume(){doc.hidden=false;docListeners.visibilitychange();},hide(){doc.hidden=true;docListeners.visibilitychange();}};
}
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
  let h=harness(),g=h.game; await tick();
  assert(g.state.ready); g.choose(15); assert.equal(g.state.targets.filter(t=>t.found).length,0,'preview cannot complete a target'); g.setExploreMode(true);
  h.tap([-20,-20]); assert.equal(g.state.targets.filter(t=>t.found).length,0,'empty tap');
  h.tap(g.state.targets[37].anchor); assert(g.state.targets[37].found,'find target out of order');
  h.tap(g.state.targets[37].anchor); assert.equal(g.state.targets.filter(t=>t.found).length,1,'repeat tap is idempotent');
  h.get('undo-button').listeners.click(); assert(g.state.targets[37].found,'undo duplicate ink keeps discovery');
  h.get('undo-button').listeners.click(); assert(!g.state.targets[37].found,'undo discovery restores target');
  const p=g.state.targets[1].anchor;
  g.pointerDown(h.toEvent(p,1)); g.pointerDown(h.toEvent([p[0]+150,p[1]],2)); assert.equal(g.state.draft,null,'pinch cancels mark');
  g.finishPointer(h.toEvent(p,1),false);g.finishPointer(h.toEvent([p[0]+150,p[1]],2),false);
  assert.equal(g.state.targets.filter(t=>t.found).length,0);
  g.setMode('eraser');h.tap(p);assert.equal(g.state.targets.filter(t=>t.found).length,0,'eraser cannot discover');g.setMode('brush');
  g.pointerDown(h.toEvent(p));g.finishPointer(h.toEvent(p),true);assert.equal(g.state.targets.filter(t=>t.found).length,0,'cancel cannot discover');
  for(let chapter=0;chapter<book.length;chapter++){
    g.openLevel(chapter);await tick(); g.setExploreMode(true);
    const order=[...g.state.targets].reverse();
    for(const t of order) h.tap(t.anchor);
    assert.equal(g.state.targets.filter(t=>t.found).length,book[chapter].items.length,`complete chapter ${chapter+1} in reverse order`);
    assert.equal(h.get('next-level-button').disabled,false);assert.equal(h.get('success-modal').hidden,false);
    h.get('undo-button').listeners.click();assert.equal(h.get('next-level-button').disabled,true,'undo revokes completion gate');
    h.tap(g.state.targets[0].anchor);g.save();
  }
  g.openLevel(0);await tick();assert(g.state.targets.every(t=>t.found),'switching pages restores per-page discoveries');
  g.openLevel(1);g.openLevel(2);await tick();assert.equal(g.state.current,2,'late image loads ignored');
  h.imageControl.fail=['005-scene'];g.openLevel(4);await tick();assert.equal(g.state.ready,false);assert.equal(h.get('retry-scene').hidden,false,'failed scene exposes retry');
  h.imageControl.fail=[];h.get('retry-scene').listeners.click();await tick();assert(g.state.ready,'retry recovers failed scene');
  h=harness();g=h.game;await tick();h.imageControl.fail=[book[1].sprite];g.openLevel(1);await tick();
  assert(g.state.ready,'target sprite failure must not block the scene');assert.equal(h.get('scene-loading').hidden,true);assert.equal(h.get('retry-targets').hidden,false);
  g.setExploreMode(true);h.tap(g.state.targets[3].anchor);assert(g.state.targets[3].found,'scene remains playable without sprite');
  const sceneRequests=h.imageControl.requests.filter(s=>s.includes(book[1].scene)).length;
  h.imageControl.fail=[];h.get('retry-targets').listeners.click();await tick();assert.equal(h.get('target-loading-note').hidden,true);assert(g.state.targets[3].found,'sprite retry keeps discoveries');
  assert.equal(h.imageControl.requests.filter(s=>s.includes(book[1].scene)).length,sceneRequests,'sprite retry does not reload scene');
  h.imageControl.hang=[book[2].scene];g.openLevel(2);await tick();h.expireImages();await tick();h.expireImages();await tick();
  assert.equal(g.state.ready,false);assert.equal(h.get('retry-scene').hidden,false,'a stalled image ends with an actionable retry');
  assert.equal(h.imageControl.requests.filter(s=>s.includes(book[2].scene)).length,2,'automatic retries are bounded');
  h.imageControl.hang=[];h.get('retry-scene').listeners.click();await tick();assert(g.state.ready,'manual retry recovers stalled request');
  g.openLevel(4);g.renderLibrary();await tick();assert.equal(g.state.ready,false,'late load cannot reopen game over library');
  let cards=h.get('level-grid').children.at(-1).children;assert.equal(cards.length,6);assert(cards.every((c,i)=>c.children[0].src==='./'+book[i].thumb),'album uses thumbnails');
  h.get('more-levels').listeners.click();cards=h.get('level-grid').children.at(-1).children;assert.equal(cards.length,12);
  h.get('more-levels').listeners.click();h.get('more-levels').listeners.click();assert.equal(h.get('level-grid').children.at(-1).children.length,23);assert.equal(h.get('more-levels').hidden,true);
  g.applyWindowInfo({windowWidth:390,windowHeight:844,statusBarHeight:47,safeArea:{top:47,bottom:810,left:0,right:390},menuButtons:{capsule:{width:90,height:32,bottom:87}}});
  assert.equal(h.doc.documentElement.style.values['--container-top'],'95px','capsule uses container coordinates, no duplicate status bar');assert.equal(h.doc.documentElement.style.values['--container-bottom'],'34px');
  g.applyWindowInfo({windowWidth:844,windowHeight:390,safeArea:{top:0,bottom:369,left:47,right:797},menuButtons:{back:{width:32,height:32,bottom:38}}});
  assert.equal(h.doc.documentElement.style.values['--container-left'],'47px');assert.equal(h.doc.documentElement.style.values['--container-right'],'47px');assert.equal(h.doc.documentElement.style.values['--container-top'],'46px');
  let oldWindow;g.readWindow({getWindowInfo(){return new Promise(resolve=>oldWindow=resolve);}});g.readWindow({getWindowInfo(){return Promise.resolve({windowHeight:390,safeArea:{top:0,bottom:390},menuButtons:{}});}});await tick();oldWindow({safeArea:{top:100},menuButtons:{}});await tick();assert.equal(h.doc.documentElement.style.values['--container-top'],'8px','late portrait metrics cannot replace landscape metrics');
  const saved={current:0,pages:{'001':{found:[book[0].items[12].id],strokes:[]}}};
  h=harness(saved);await tick();await tick();assert(h.game.state.targets[12].found,'startup restore must not overwrite saved discoveries');
  h.game.setExploreMode(true);h.tap(h.game.state.targets[8].anchor);h.game.save(true);await tick();assert(h.writes.length>0);assert(Buffer.byteLength(JSON.stringify(h.writes.at(-1).items[0].content),'utf8') < 65536);
  h=harness(saved,true);await tick();h.game.setExploreMode(true);h.tap(h.game.state.targets[9].anchor);h.game.save();h.resolve();await tick();
  assert(!h.game.state.targets[9].found,'input is gated until the current account is verified');
  assert(h.game.state.targets[12].found,'delayed account read restores the correct save');
  h.game.setExploreMode(true);h.tap(h.game.state.targets[9].anchor);assert(h.game.state.targets[9].found,'play resumes after account verification');
  h=harness(saved,true);await tick();h.game.renderLibrary();h.resolve();await tick();assert.equal(h.get('library-view').hidden,false,'album request opens after pending account load');
  h.resume();await tick();assert.equal(h.get('library-view').hidden,false,'account refresh preserves album navigation');
  h=harness(saved);await tick();h.switchAccount({current:1,pages:{}},'account-b');h.resume();await tick();assert.equal(h.game.state.current,1);assert(h.game.state.targets.every(t=>!t.found),'resume replaces A with B rather than merging');assert(!h.game.state.progress.pages['001']);h.switchAccount(saved,'account-a');h.resume();await tick();assert(h.game.state.targets[12].found,'returning to A restores only A');
  h.game.setExploreMode(true);h.tap(h.game.state.targets[9].anchor);h.hide();assert.equal(h.writes.length,0,'background entry must not launch an account preflight');h.switchAccount({current:0,pages:{}},'account-c');h.resume();await tick();assert(h.game.state.targets.every(t=>!t.found),'background account change discards old discoveries');assert(h.get('toast').textContent.includes('未保存'),'unsaved account switch is explicit');
  console.log(`PASS: ${hits} target anchors, ${outside} polygon-vs-box negatives; all 23 chapters reverse-order completion; independent scene/sprite failures, bounded stalled-image retries, album thumbnails/pagination/navigation, account restore and gated delayed storage.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
