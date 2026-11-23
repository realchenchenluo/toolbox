/* Grass physics, pixel stability and lifecycle checks; no game-save data is involved. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname,'../assets/interactive-grass.js'),'utf8');
const root = {};
vm.runInNewContext(source,{window:root});
const physics = root.FarmGrassPhysics;
function tuft(edge=false) { return {x:100,y:100,lean:0,velocity:0,press:0,side:0,pusher:'',touch:-10,edge}; }
// Placement is stable across reloads, remains bounded and adapts its cost to the field size.
for (const [width,height] of [[280,332],[640,434],[1200,500]]) {
  const plants = physics.makeTufts(width,height);
  assert.deepEqual(plants,physics.makeTufts(width,height));
  assert.ok(plants.length>=42&&plants.length<=108);
  assert.ok(plants.every(t=>t.x>=55&&t.x<=width-55&&t.y>=height*.19&&t.y<=height*.81));
}
assert.ok(physics.makeTufts(280,332).length<physics.makeTufts(1200,500).length);
// The push direction stays stable under a passing foot; the spring settles again after it leaves.
{
  const t=tuft(), actor={id:'sheep',x:93,y:103,direction:1};
  for(let i=0;i<60;i++)physics.stepTuft(t,[actor],1/60,i/60,false);
  assert.ok(t.lean>2);const side=t.side;actor.x=101;
  physics.stepTuft(t,[actor],1/60,1,false);assert.equal(t.side,side);
  for(let i=0;i<150;i++)physics.stepTuft(t,[],1/60,1+i/60,false);
  assert.ok(Math.abs(t.lean)<.05);assert.equal(t.press,0);assert.equal(t.side,0);
}
// A direct step compresses a tuft quickly; it regrows in less than one second. Patch edges remain standing.
{
  const t=tuft(),edge=tuft(true),actor={id:'worker',x:100,y:103,direction:-1};
  for(let i=0;i<8;i++){physics.stepTuft(t,[actor],1/60,i/60,false);physics.stepTuft(edge,[actor],1/60,i/60,false);}
  assert.equal(t.press,1);assert.equal(edge.press,0);
  for(let i=0;i<43;i++)physics.stepTuft(t,[],1/60,1+i/60,false);
  assert.equal(t.press,0);
}
// Multiple passers and slow frames cannot destabilize the spring or mutate the actors themselves.
{
  const t=tuft();
  for(let i=0;i<500;i++){
    const actors=[{id:'a',x:100+Math.sin(i/9)*25,y:102,direction:1},{id:'b',x:105,y:100+Math.cos(i/7)*15,direction:-1}];
    const before=JSON.stringify(actors);physics.stepTuft(t,actors,i%11===0?.08:1/30,i/30,false);
    assert.equal(JSON.stringify(actors),before);assert.ok(Number.isFinite(t.lean)&&Math.abs(t.lean)<=6);assert.ok(t.press>=0&&t.press<=1);
  }
}
// A rendering stub verifies integer row drawing, remount after game render, and background/resume cleanup.
{
  let now=100000,nextId=1,night=false,rowDraws=0;
  const frames=new Map(),events=new Map(),documentEvents=new Map(),children=[];
  function listen(map,name,fn){map.set(name,fn);}function unlisten(map,name,fn){if(map.get(name)===fn)map.delete(name);}
  const context={fillStyle:'',fillRect(){},clearRect(){this.rows=[];},save(){this.savedTransform=[this.originX||0,this.scaleX||1];},restore(){[this.originX,this.scaleX]=this.savedTransform;},translate(x){this.originX=(this.originX||0)+x*(this.scaleX||1);},scale(x){this.scaleX=(this.scaleX||1)*x;},drawImage(...args){assert.ok(args.slice(1).every(Number.isInteger));this.rows.push({x:(this.originX||0)+(this.scaleX||1)*(args[5]+args[7]/2),y:args[6]});rowDraws++;}};
  const document={visibilityState:'visible',createElement(){return {style:{},parentNode:null,getContext(){return Object.create(context);},setAttribute(k,v){this[k]=v;}};},addEventListener(n,fn){listen(documentEvents,n,fn);},removeEventListener(n,fn){unlisten(documentEvents,n,fn);}};
  const window={matchMedia(){return {matches:false};},requestAnimationFrame(fn){const id=nextId++;frames.set(id,fn);return id;},cancelAnimationFrame(id){frames.delete(id);},addEventListener(n,fn){listen(events,n,fn);},removeEventListener(n,fn){unlisten(events,n,fn);}};
  const field={getBoundingClientRect(){return {width:640,height:400};},setAttribute(k,v){this[k]=v;},appendChild(n){if(!children.includes(n))children.push(n);n.parentNode=this;},removeChild(n){children.splice(children.indexOf(n),1);n.parentNode=null;}};
  vm.runInNewContext(source,{window,document,Date:class extends Date{static now(){return now;}}});
  const positions=window.FarmGrassPhysics.makeTufts(640,400),firstIndex=positions.findIndex(t=>t.flip),first=positions[firstIndex];
  let actors=[{id:'test-sheep',x:first.x/640*100,y:(first.y+3)/400*100,feet:0,direction:1}];
  const renderer=window.createFarmGrassField({field,scene:{classList:{contains(){return night;}}},getActors(){return actors;}});
  function advance(count){for(let i=0;i<count;i++){now+=34;const ready=Array.from(frames.values());frames.clear();ready.forEach(fn=>fn());assert.equal(frames.size,1);}}
  renderer.attach();const count=children.length;assert.equal(count,Number(field['data-grass-count']));assert.ok(rowDraws>0);
  advance(12);assert.ok(Number(children[firstIndex]['data-press'])>.6);assert.ok(Number(field['data-grass-bent'])>0);
  assert.ok(Number(children[firstIndex]['data-lean'])>2);
  const rows=children[firstIndex]._grassContext.rows;assert.ok(rows[0].x>rows[rows.length-1].x,'mirrored tufts must still bend away in world space');
  assert.ok(children.every(n=>Number(n.style.zIndex)===Math.round(Number(n.style.top.replace('px','')))));
  const existing=children.slice();children.forEach(n=>n.parentNode=null);children.length=0;renderer.attach();assert.equal(children.length,count);assert.ok(children.every((n,i)=>n===existing[i]));
  actors=[];advance(90);assert.equal(Number(children[firstIndex]['data-press']),0);
  night=true;advance(1);assert.equal(field['data-grass-night'],'true');
  renderer.setEnabled(false);advance(10);assert.ok(children.every(n=>Number(n['data-lean'])===0&&Number(n['data-press'])===0));
  document.visibilityState='hidden';documentEvents.get('visibilitychange')();assert.equal(frames.size,0);
  document.visibilityState='visible';documentEvents.get('visibilitychange')();assert.equal(frames.size,1);
  events.get('pagehide')();assert.equal(frames.size,0);events.get('pageshow')();assert.equal(frames.size,1);
  renderer.destroy();assert.equal(frames.size,0);assert.equal(children.length,0);assert.equal(events.size,0);assert.equal(documentEvents.size,0);
}
console.log('PASS: sparse seeded grass, spring bending, stable push direction, trampling/regrowth, pixel-aligned drawing, sorting anchors, remount, pause/resume, and cleanup.');
