const assert=require('node:assert/strict');
const boot=require('./farm-harness.cjs');
const settle=()=>new Promise(resolve=>setImmediate(resolve));
function click(t,attributes){
  const target={disabled:false,getAttribute:k=>attributes[k],closest(selector){return selector.slice(1,-1) in attributes?this:null;}};
  t.listeners.click({target});
}
async function expire(t){await settle();const timer=t.timers.filter(x=>x.ms===8000&&!x.canceled).pop();assert.ok(timer);timer.fn();await settle();}
async function run(){
  // A held control survives list refresh; its purchase fires exactly once despite a double tap.
  const t=boot(),g=t.game,s=g.state;s.level=8;s.gold=50000;s.tutorial.done=true;
  const button={closest(){return this;}},container={innerHTML:'',contains:n=>n===button};
  g.listHTML(container,'before');t.listeners.pointerdown({target:button});g.listHTML(container,'after');assert.equal(container.innerHTML,'before');
  g.releaseControls();t.timers.filter(x=>x.ms===0&&!x.canceled).forEach(x=>x.fn());assert.equal(container.innerHTML,'after');
  const count=s.sheep.length,cash=s.gold;click(t,{'data-buy-breed':'normal'});click(t,{'data-buy-breed':'normal'});
  assert.equal(s.sheep.length,count+1);assert.equal(s.gold,cash-g.breedMeta.normal.price);
  // Help and hints are read-only; restarting the tutorial resets guidance, never the farm.
  const resources=JSON.stringify({gold:s.gold,sheep:s.sheep,upgrades:s.upgrades,contracts:s.contracts});
  for(const tab of ['quick','route','breeds','rules'])g.openRules(tab);
  const modalBody=t.nodes.get('modal-body');modalBody._farmPendingHTML='stale sale choices';
  g.openRules('quick');assert.equal(modalBody._farmPendingHTML,null);
  assert.equal(JSON.stringify({gold:s.gold,sheep:s.sheep,upgrades:s.upgrades,contracts:s.contracts}),resources);
  g.restartTutorial();assert.equal(g.tutorialStep(),0);assert.equal(s.gold,cash-160);
  g.closeModal();g.openRules('route');assert.match(t.nodes.get('modal-body').innerHTML,/累计收入达到 ¥120/);
  g.openRules('breeds');assert.match(t.nodes.get('modal-body').innerHTML,/只解锁品种/);assert.match(t.nodes.get('modal-body').innerHTML,/3.15%/);
  s.contracts.pendingRainbow=1;g.render();g.openNursery();assert.match(t.nodes.get('modal-body').innerHTML,/订单奖励/);g.closeModal();
  // Native read timeouts expose retry, never enable overwriting an unread save.
  const behavior={readHang:true},shared={},read=boot(null,640,400,'timeout-reader',shared,behavior);
  const p=read.game.hydratePlatformState();assert.equal(read.game.hydratePlatformState(),p);
  await expire(read);await p;assert.equal(read.nodes.get('save-status').textContent,'存档读取失败');assert.equal(read.nodes.get('storage-notice').hidden,false);
  assert.equal(await read.game.saveState(false),false);assert.equal(Object.keys(shared).length,0);
  behavior.readHang=false;await read.game.hydratePlatformState();assert.equal(read.nodes.get('storage-notice').hidden,true);
  assert.equal(read.game.state.gold,300);
  // A never-returning write releases the save queue, but cannot race a second write.
  const writeBehavior={writeHang:true},writer=boot(null,640,400,'timeout-writer',{},writeBehavior);await writer.game.hydratePlatformState();
  const wp=writer.game.saveState(false);await expire(writer);assert.equal(await wp,false);
  assert.equal(await writer.game.saveState(false),false);writeBehavior.resolveWrite({errMsg:'setStorage:ok'});await settle();writeBehavior.writeHang=false;
  assert.equal(await writer.game.saveState(false),true);
  // A cloud response timeout cannot leave all input and the clock locked forever.
  const cloud=boot();let late;cloud.game.__setCloud({load:()=>new Promise(resolve=>{late=resolve;}),save:()=>Promise.resolve(true)});
  const cp=cloud.game.syncCloudStorage(true);await expire(cloud);assert.equal(await cp,false);
  late({savedAt:999999999,gold:99999,sheep:[]});await settle();assert.equal(cloud.game.state.gold,300);
  const cycle=cloud.game.state.cycle;cloud.game.tick();assert.equal(cloud.game.state.cycle,cycle+1);
  console.log('PASS: click survival, double-tap purchase guard, read-only help, tutorial replay, native read/write timeouts, safe retry, no overlapping writes, and cloud lock recovery.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
