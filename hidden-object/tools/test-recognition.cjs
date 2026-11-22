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
    constructor(id) { this.id=id; this.style={setProperty(){}}; this.attrs={}; this.listeners={}; this.children=[]; this.scrollTop=0; this.clientWidth=600; this.clientHeight=600; this.width=1000; this.height=1200; this.classList={toggle(){},add(){},remove(){}}; }
    addEventListener(n,f){ this.listeners[n]=f; } setAttribute(n,v){ this.attrs[n]=v; } getAttribute(n){return this.attrs[n];}
    appendChild(c){this.children.push(c);} getBoundingClientRect(){return {left:0,top:0,width:600,height:600};}
    querySelector(){return new Element('inner');} setPointerCapture(){} getContext(){return context;}
  }
  const elements={}, get=id => elements[id] || (elements[id]=new Element(id));
  const doc={getElementById:get,querySelectorAll(){return [];},createElement(tag){return new Element(tag);},createDocumentFragment(){return new Element('fragment');},addEventListener(){},body:new Element('body'),documentElement:new Element('html'),hidden:false};
  const imageControl={fail:[]};
  class FakeImage {set src(s){this._src=s; this.naturalWidth=1000; this.naturalHeight=1200; queueMicrotask(() => { if(imageControl.fail.some(x=>s.includes(x))) { if(this.onerror)this.onerror(); } else if(this.onload)this.onload(); });} get src(){return this._src;}}
  let writes=[], resolver;
  const sandbox={document:doc,Image:FakeImage,Date,Promise,Math,console,setTimeout(){return 1;},clearTimeout(){},requestAnimationFrame(){return 1;},window:{HIDDEN_BOOK:data.window.HIDDEN_BOOK,HiddenRecognition:R,innerWidth:390,innerHeight:844,scrollTo(){},addEventListener(){}}};
  if (saved) sandbox.window.xhs={launchOptions:{miniToolEnv:{buildVersion:9533000}},miniTool:{getStorage(){return storagePending ? new Promise(r => resolver=r) : Promise.resolve({data:JSON.stringify(saved)});},setStorage(v){writes.push(v);return Promise.resolve({errMsg:'setStorage:ok'});}}};
  let source=fs.readFileSync('hidden-object/assets/game.js','utf8');
  source=source.replace('openLevel(0); initStorage();','window.test={pointerDown,pointerMove,finishPointer,openLevel,choose,save,setMode,setExploreMode,renderLibrary,get state(){return {targets,strokes,draft,zoom,progress,current,ready}}}; openLevel(0); initStorage();');
  vm.runInNewContext(source,sandbox);
  const event=(p,id=1)=>({pointerId:id,button:0,clientX:p.x,clientY:p.y,preventDefault(){}});
  const game=sandbox.window.test;
  function toEvent(point,id) {return event({x:point[0]/get('mark-layer').width*600,y:point[1]/get('mark-layer').height*600},id);}
  function tap(point){game.pointerDown(toEvent(point));game.finishPointer(toEvent(point),false);}
  return {game,get,tap,event,toEvent,writes,imageControl,resolve(){resolver({data:JSON.stringify(saved)});}};
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
  g.openLevel(4);g.renderLibrary();await tick();assert.equal(g.state.ready,false,'late load cannot reopen game over library');
  const saved={current:0,pages:{'001':{found:[book[0].items[12].id],strokes:[]}}};
  h=harness(saved);await tick();await tick();assert(h.game.state.targets[12].found,'startup restore must not overwrite saved discoveries');
  h.game.save(true);await tick();assert(h.writes.length>0);assert(Buffer.byteLength(h.writes.at(-1).data,'utf8') < 1048576);
  h=harness(saved,true);await tick();h.game.setExploreMode(true);h.tap(h.game.state.targets[9].anchor);h.game.save();h.resolve();await tick();
  assert(h.game.state.targets[9].found,'late storage cannot erase active play');
  assert(h.game.state.targets[12].found,'late storage must also preserve earlier saved discoveries');
  console.log(`PASS: ${hits} target anchors, ${outside} polygon-vs-box negatives; all 23 chapters reverse-order completion; preview, miss, duplicate, undo, pinch, eraser, cancellation, stale loads, restore and late storage.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
