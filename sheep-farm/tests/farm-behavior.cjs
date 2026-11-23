/* Exercise the actual offline game logic with a clock and geometric scene stub. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const boot = require('./farm-harness.cjs');
async function run() {
// Supply charges, full/poor guards, capacity upgrades and higher-yield shearing.
{
  const t=boot(), g=t.game, s=g.state;
  const cash=s.gold, hay=s.hay; g.refillSupply('hay');
  assert.equal(s.gold,cash-4); assert.equal(s.hay,hay+4);
  s.hay=g.hayCapacity(); const fullCash=s.gold; g.refillSupply('hay'); assert.equal(s.gold,fullCash);
  s.gold=1; s.water=0; g.refillSupply('water'); assert.equal(s.water,0); assert.equal(s.gold,1);
  s.gold=100000; s.level=3; g.upgrade('hayBarn'); g.upgrade('cistern'); assert.equal(g.hayCapacity(),52); assert.equal(g.waterCapacity(),52);
  s.hay=0; g.refillSupply('hay'); assert.equal(s.hay,5.2);
  g.upgrade('shears'); s.sheep.forEach(x=>x.wool=100); g.shear();
  assert.equal(s.woolDrops.length,3); assert.ok(s.woolDrops[0].amount>1.7);
  s.wool=3; const reward=g.tradeReward(); g.deliverTradeOrder(); assert.equal(s.tradeOrder.completed,1); assert.equal(s.tradeOrder.type,'meat'); assert.ok(reward>3*g.woolPrice());
}
// A genuine new farm starts at day zero with no pre-sold wool or adult sheep.
{
  const t=boot(),g=t.game,s=g.state;
  assert.equal(s.day,0);assert.equal(s.cycle,0);assert.equal(s.wool,0);assert.equal(s.meat,0);assert.equal(s.earned,0);
  assert.equal(s.gold,300);assert.equal(s.sheep.length,3);assert.equal(s.savings,0);assert.equal(s.level,1);
  assert.ok(s.sheep.every(x=>x.age<60&&x.wool<100));assert.equal(t.nodes.get('[data-action="shear"]').disabled,true);
  assert.equal(t.nodes.get('[data-action="butcher"]').disabled,true);assert.match(t.nodes.get('guide-title').textContent,/添一次/);
  for(let i=0;i<14;i++)g.tick();assert.equal(s.day,0);assert.equal(s.dayPhase,14);g.tick();assert.equal(s.day,1);assert.equal(s.dayPhase,0);
  await g.saveState(false);const restored=boot(t.saved());assert.equal(restored.game.state.day,1);
}
// Automatic saves persist the current local preview state and are scheduled separately from the game clock.
// Reading the handbook is available before storage hydrates and never changes game progress.
{
  const t=boot(null,640,400,'rules-reader',{}, {readError:true}),g=t.game;
  const before=JSON.stringify(g.state);g.openRules();
  assert.equal(t.nodes.get('modal').hidden,false);assert.equal(t.nodes.get('modal-title').textContent,'玩法说明');
  assert.match(t.nodes.get('modal-body').innerHTML,/300 金币和 3 只/);assert.match(t.nodes.get('modal-body').innerHTML,/经营收支/);
  assert.equal(JSON.stringify(g.state),before);g.closeModal();assert.equal(t.nodes.get('modal').hidden,true);
}
// New defaults do not replace an established four-sheep save.
{
  const old={calendarVersion:1,day:9,gold:2380,sheep:[0,1,2,3].map(i=>({id:'kept-'+i,age:70,wool:10,x:20+i*15,y:50,hunger:80,thirst:80}))};
  const t=boot(old);assert.equal(t.game.state.gold,2380);assert.equal(t.game.state.sheep.length,4);assert.equal(t.game.state.day,9);
  await t.game.saveState(false);const restored=boot(t.saved());assert.equal(restored.game.state.gold,2380);assert.equal(restored.game.state.sheep.length,4);
}
{
  const t=boot(),g=t.game;
  assert.ok(t.intervals.includes(12000));
  await g.autoSave();
  assert.equal(t.saved().day,0);
  assert.equal(g.state.savedAt,100000);
}
{
  const shared={}, t=boot(null,640,400,'auto-platform',shared), g=t.game;
  assert.equal(await g.autoSave(),false);
  await g.hydratePlatformState();
  assert.equal(await g.autoSave(),true);
  assert.equal(JSON.parse(shared[g.platformStorageKey()]).day,0);
}
// Walk frames change discretely; direction mirrors the whole image without changing its frame.
{
  const t=boot(),g=t.game,s=g.state,sheep=s.sheep[0];
  sheep.wool=50; sheep.action='walking';
  const image=g.sheepImage(sheep,100000),frames=[];
  for(let i=0;i<4;i++) {const frame=g.sheepImage(sheep,100000+i*130);frames.push(frame);assert.match(frame,/young-normal-wool-walk-[0-3]\.png$/);assert.ok(fs.existsSync(require('node:path').join(__dirname,'..',frame)));}
  assert.equal(new Set(frames).size,4);assert.equal(g.sheepImage(sheep,100520),image);
  const unchanged=JSON.stringify(s);g.animateSheepFrames();assert.equal(JSON.stringify(s),unchanged); // Drawing frames cannot move sheep or advance the economy.
  sheep.direction=-1;assert.equal(g.sheepImage(sheep,100520),image);
  sheep.action='idle';assert.match(g.sheepImage(sheep,101000),/idle-0/);assert.match(g.sheepImage(sheep,101130),/idle-0/);
  for(let i=0;i<30;i++) {t.step(); if(sheep.action==='walking') assert.match(g.sheepImage(sheep),/walk-[0-3]\.png$/);}
  sheep.action='idle';
  sheep.age=60;assert.match(g.sheepImage(sheep),/adult-normal-wool-idle/);
  sheep.action='drinking';assert.match(g.sheepImage(sheep),/drink/);
}
// Clock matches the simulation boundaries, including midnight and the short night.
{
  const t=boot(),g=t.game;
  const cases=[[0,0,'06:00',false,48],[0,2000,'06:30',false,46],[11,3999,'17:59',false,1],[12,0,'18:00',true,12],[13,0,'22:00',true,8],[14,0,'02:00',true,4],[14,3000,'05:00',true,1]];
  for(const [phase,elapsed,time,night,seconds] of cases){const c=g.clockSnapshot(phase,elapsed);assert.equal(c.time,time);assert.equal(c.night,night);assert.equal(c.seconds,seconds);}
  g.state.dayPhase=14;g.tick();assert.equal(g.state.dayPhase,0);assert.equal(g.state.day,1);assert.equal(t.nodes.get('game-clock').textContent,'06:00');
  assert.ok(t.intervals.includes(250));
}
// Daylight lasts twelve phases; the three-phase night pauses hungry-free sheep in a sleeping pose.
// Deposits conserve money, reject invalid/overdrawn amounts, and survive reload independently from earned revenue.
{
  const t=boot(),g=t.game,s=g.state;
  g.bookIncome(500); const cash=s.gold,earned=s.earned;
  for(const value of ['',0,-1,1.5,'1e3','Infinity',cash+1]) {assert.equal(g.depositSavings(value),false);assert.equal(s.gold,cash);}
  assert.equal(g.depositSavings(125),true);assert.equal(s.savings,125);assert.equal(s.gold,cash-125);assert.equal(s.earned,earned);
  await g.saveState(false);const restored=boot(t.saved()).game.state;assert.equal(restored.savings,125);assert.equal(restored.gold,cash-125);
  const legacy=boot({gold:1000,earned:90000,sheep:[]}).game.state;assert.equal(legacy.savings,0);assert.equal(legacy.earned,90000);
}
// Level-ups require both lifetime revenue and spendable cash; facilities cannot bypass their level gate.
// Late processing always beats raw material sales; orders always beat direct box sales.
{
  const t=boot(),g=t.game,s=g.state;
  for(let wool=0;wool<=4;wool++)for(let meat=0;meat<=3;meat++)for(let merchant=0;merchant<=3;merchant++){
    s.upgrades.wool=wool;s.upgrades.meat=meat;s.upgrades.merchant=merchant;
    assert.ok(g.recipeUnitPrice('wool')>=2*g.woolPrice()*1.25);
    assert.ok(g.recipeUnitPrice('meat')>=2.5*g.meatPrice()*1.25);
    for(const type of ['wool','meat']){s.order={type,qty:2,reward:1};assert.ok(g.orderReward()>=2*g.recipeUnitPrice(type)*1.15);}
  }
  for(const key of ['capacity','wool','hayBarn']){
    const costs=[];for(let n=0;n<g.upgradeMeta[key].max;n++){s.upgrades[key]=n;costs.push(g.upgradeCost(key));}
    for(let n=1;n<costs.length;n++)assert.ok(costs[n]>costs[n-1]);
  }
}
{
  const t=boot(),g=t.game,s=g.state;assert.equal(s.level,1);
  const cash=s.gold;g.upgrade('worker');g.upgrade('hayBarn');assert.equal(s.gold,cash);assert.equal(s.upgrades.worker,0);
  assert.equal(g.levelUp(),false);g.bookIncome(120);s.gold=159;assert.equal(g.levelUp(),false); // Revenue reached, cash still short.
  s.gold=160;assert.equal(g.levelUp(),true);assert.equal(s.level,2);assert.equal(s.gold,0);
  g.bookIncome(500);g.upgrade('hayBarn');assert.equal(s.upgrades.hayBarn,1);s.gold=419;assert.equal(g.levelUp(),false);
  g.bookIncome(1);assert.equal(g.levelUp(),true);s.gold=479;g.upgrade('worker');assert.equal(s.upgrades.worker,0);
  g.bookIncome(2000);g.upgrade('worker');assert.equal(s.upgrades.worker,1);
}
// Special breeds require level, a one-time unlock, then separate payment for each newborn.
{
  const t=boot(),g=t.game,s=g.state;s.gold=100000;
  assert.equal(g.unlockBreed('rainbow'),false);assert.equal(g.buySheep('rainbow'),false);
  s.level=6;const start=s.gold;assert.equal(g.unlockBreed('rainbow'),true);assert.equal(s.gold,start-7200);
  assert.equal(g.unlockBreed('rainbow'),false);assert.equal(g.buySheep('rainbow'),true);assert.equal(s.gold,start-7200-4000);
  const lamb=s.sheep[s.sheep.length-1];assert.equal(lamb.age,0);assert.match(g.sheepImage(lamb),/young-rainbow/);
  const count=s.sheep.length;g.butcher(lamb.id);assert.equal(g.sellLiveSheep(lamb.id),false);assert.equal(s.sheep.length,count);
  s.sheep.forEach(x=>x.wool=0);lamb.wool=100;g.shear();assert.equal(lamb.wool,0);assert.ok(s.woolDrops[0].amount>5); // Juveniles can be sheared.
  lamb.age=60;const wallet=s.gold;assert.equal(g.sellLiveSheep(lamb.id),true);assert.equal(s.gold,wallet+18000);
  assert.equal(s.sheep.some(x=>x.id===lamb.id),false);assert.equal(s.savings,0);
  await g.saveState(false);const restored=boot(t.saved()).game.state;assert.equal(restored.breeds.rainbow,true);assert.equal(restored.level,6);
}
// Breed bonuses apply to the whole flock and disappear when the supporting sheep leaves.
{
  const t=boot(),g=t.game,s=g.state;s.level=6;s.gold=100000;
  g.unlockBreed('mint');g.buySheep('mint');g.unlockBreed('peach');g.buySheep('peach');
  const normal=s.sheep[0],age=normal.age;normal.wool=0;g.tick();
  assert.ok(Math.abs(normal.wool-10.08)<.00001);assert.ok(Math.abs(normal.age-age-1.08)<.00001);
  s.sheep=s.sheep.filter(x=>x.breed!=='mint');assert.equal(g.flockBonus('mint'),1);
  assert.equal(g.flockBonus('peach'),1.2);
  const adult=s.sheep.find(x=>x.breed==='peach');adult.age=60;g.sellLiveSheep(adult.id);assert.equal(g.flockBonus('peach'),1);
}
{
  const t=boot(),g=t.game,s=g.state;s.sheep.forEach(x=>{x.hunger=100;x.thirst=100;});s.dayPhase=12;g.animateSheep();
  assert.ok(s.sheep.every(x=>x.action==='sleeping'));
  s.dayPhase=0;g.animateSheep();assert.ok(s.sheep.every(x=>x.action!=='sleeping'));
}
// Calendar migration removes the old +8 offset once and retains earned resources.
{
  const old={day:11,gold:999,earned:75,sheep:[{id:'migration',age:70,wool:80,hunger:90,thirst:90,x:35,y:55}]};
  const t=boot(old);assert.equal(t.game.state.day,3);assert.equal(t.game.state.gold,999);assert.equal(t.game.state.sheep[0].age,70);
  await t.game.saveState(false);assert.equal(boot(t.saved()).game.state.day,3);
  assert.equal(boot({day:8,sheep:[]}).game.state.day,0);
}
// Worker must physically visit drops, carry them, and only credit at the shed.
{
  const t=boot(),g=t.game,s=g.state; s.upgrades.worker=1; s.sheep=[]; s.wool=0;
  s.woolDrops=[{id:'a',x:21,y:35,amount:1.5},{id:'b',x:25,y:36,amount:2}];
  let sawPickup=false,sawCarry=false,saveDuringCarry;
  for(let i=0;i<600&&s.wool<3.5;i++) {
    t.step();
    if(s.worker.count){sawPickup=true;assert.equal(s.wool,0);}
    if(s.worker.mode==='carrying'){sawCarry=true;await g.saveState(false);saveDuringCarry=t.saved();}
    assert.ok(s.worker.count<=2);
    assert.equal(s.wool+s.worker.carry+s.woolDrops.reduce((a,d)=>a+d.amount,0),3.5);
  }
  assert.ok(sawPickup&&sawCarry); assert.equal(s.wool,3.5); assert.equal(s.worker.carry,0);
  const restored=boot(saveDuringCarry); for(let i=0;i<600;i++)restored.step(); assert.equal(restored.game.state.wool,3.5);
}
// Player collects the worker's target first; worker must retarget without duplication.
{
  const t=boot(),g=t.game,s=g.state;s.upgrades.worker=1;s.sheep=[];s.wool=0;s.woolDrops=[{id:'race',x:15,y:20,amount:2}];
  t.step();g.pickWool('race');for(let i=0;i<250;i++)t.step();assert.equal(s.wool,2);assert.equal(s.worker.mode,'idle');
}
// Both viewports: mouths touch trough lips; eating restores only after arriving.
for(const width of [320,640]) {
  const t=boot(null,width),g=t.game,s=g.state;s.sheep=s.sheep.slice(0,2);s.hay=40;s.water=40;
  const a=s.sheep[0],b=s.sheep[1];a.hunger=5;a.thirst=100;b.hunger=100;b.thirst=5;
  [a,b].forEach(x=>{x.x=50;x.y=45;x.tx=undefined;x.actionUntil=0;g.chooseSheepTarget(x);});
  assert.ok(Math.abs((a.tx*width/100-(26-16)*52/32)-33)<=1.01);
  assert.ok(Math.abs((b.tx*width/100+(26-16)*52/32)-(width-33))<=1.01);
  g.tick();assert.equal(a.hunger,2.5); // feeder cannot feed remotely.
  for(let i=0;i<120;i++) {t.step();if(a.action==='eating'&&b.action==='drinking')break;}
  assert.equal(a.action,'eating');assert.equal(a.direction,-1);assert.equal(b.action,'drinking');assert.equal(b.direction,1);
  assert.equal(s.hay,39.5);assert.equal(s.water,39.5);assert.ok(a.hunger>2.5&&b.thirst>2);
}
// Old saves acquire defaults without losing gold, existing upgrades or sheep.
{
  const t=boot({gold:987,upgrades:{wool:2,worker:1},sheep:[{id:'old',age:75,x:31,y:52,hunger:0,thirst:0,wool:100}]});
  assert.equal(t.game.state.gold,987);assert.equal(t.game.state.earned,0);assert.equal(t.game.state.upgrades.wool,2);assert.equal(t.game.state.upgrades.hayBarn,0);assert.equal(t.game.state.sheep[0].id,'old');assert.equal(t.game.state.worker.carry,0);
}
// Platform Storage keys are account-scoped; two users never overwrite one another.
{
  const shared={};
  const alice=boot(null,640,400,'user-alice',shared),bob=boot(null,640,400,'user-bob',shared);
  alice.game.__markStorageHydrated(); bob.game.__markStorageHydrated(); alice.game.state.gold=711; await alice.game.saveState(false); bob.game.state.gold=922; await bob.game.saveState(false);
  const keys=Object.keys(shared); assert.equal(keys.length,2); assert.notEqual(keys[0],keys[1]);
  const values=keys.map((key)=>JSON.parse(shared[key]).gold).sort((a,b)=>a-b); assert.deepEqual(values,[711,922]);
  assert.equal(alice.saved(),undefined); assert.equal(bob.saved(),undefined);
}
// Boots shorten a real route, a larger basket changes trips, and locked gear cannot be bought.
// Actual asynchronous hydration round-trips account A, account B and account A again.
{
  const shared={},a=boot({day:100,gold:99999,sheep:[]},640,400,'hydrate-A',shared);
  a.game.tick();assert.equal(a.game.state.day,0);assert.equal(await a.game.saveState(true),false);assert.equal(Object.keys(shared).length,0);
  await a.game.hydratePlatformState();assert.equal(a.game.state.day,0);assert.equal(a.game.state.gold,300);assert.equal(a.game.state.sheep.length,3);assert.equal(a.legacyReads(),0);
  a.game.state.gold=711;assert.equal(await a.game.saveState(true),true);
  const b=boot(null,640,400,'hydrate-B',shared);await b.game.hydratePlatformState();assert.equal(b.game.state.day,0);assert.equal(b.game.state.gold,300);assert.equal(b.game.state.sheep.length,3);
  b.game.state.gold=922;await b.game.saveState(false);
  const back=boot(null,640,400,'hydrate-A',shared);await back.game.hydratePlatformState();assert.equal(back.game.state.gold,711);
  for(const behavior of [{readError:true},{corrupt:true},{readFailureResponse:true}]) {
    const broken=boot(null,640,400,'hydrate-A',shared,behavior);await broken.game.hydratePlatformState();
    assert.equal(await broken.game.saveState(true),false);assert.equal(JSON.parse(shared[back.game.platformStorageKey()]).gold,711);
  }
  const rejected=boot(null,640,400,'reject',shared,{writeError:true});await rejected.game.hydratePlatformState();
  assert.equal(await rejected.game.saveState(true),false);assert.equal(rejected.game.state.savedAt,0);assert.match(rejected.nodes.get('save-status').textContent,/失败/);
  const missing=boot({day:100,gold:99999,sheep:[]},640,400,'missing',shared,{missingStorage:true});
  assert.equal(missing.game.state.day,0);assert.equal(missing.legacyReads(),0);assert.equal(await missing.game.saveState(true),false);
}
function haul(boots,basket) {
  const t=boot(),g=t.game,s=g.state;s.sheep=[];s.wool=0;s.upgrades.worker=1;s.upgrades.boots=boots;s.upgrades.basket=basket;
  s.woolDrops=[0,1,2].map((v)=>({id:'load'+v,x:20+v,y:28,amount:1}));
  let steps=0,maxLoad=0;while(s.wool<3&&steps<1000){t.step();maxLoad=Math.max(maxLoad,s.worker.count);steps++;}assert.equal(s.wool,3);return {steps,maxLoad};
}
// Purchase, adult butchering and the late workshop flow all move real inventory and revenue.
{
  const t=boot(),g=t.game,s=g.state;
  s.gold=1000;const count=s.sheep.length;g.buySheep();assert.equal(s.sheep.length,count+1);assert.equal(s.gold,840);
  const adult=s.sheep[0];adult.age=80;const beforeMeat=s.meat;g.butcher(adult.id);assert.equal(s.sheep.some(x=>x.id===adult.id),false);assert.ok(s.meat>beforeMeat);
  s.workshopUnlocked=true;s.upgrades.workshop=1;s.wool=2;s.boxes.wool=0;g.startConveyor('wool');assert.equal(s.wool,0);assert.equal(s.conveyor.wool.running,true);
  for(let i=0;i<4;i++)g.advanceConveyor('wool');assert.equal(s.boxes.wool,1);const earned=s.earned;g.sellBoxes();assert.equal(s.boxes.wool,0);assert.ok(s.earned>earned);
}
// Sales record lifetime revenue; only explicit deposits contribute to retirement.
{
  const t=boot(),g=t.game,s=g.state;
  s.wool=2;const cash=s.gold;g.sellWool();assert.equal(s.earned,112);assert.equal(s.gold,cash+112);
  s.meat=1;g.sellMeat();assert.equal(s.earned,230);s.workshopUnlocked=true;s.upgrades.workshop=1;s.boxes.wool=1;g.sellBoxes();assert.equal(s.earned,450);
  s.boxes.wool=2;s.order={type:'wool',qty:2,reward:420};g.deliverOrder();assert.equal(s.earned,956);
  s.earned=99999980;g.bookIncome(20);assert.equal(s.earned,100000000);assert.equal(s.retired,false);
  s.gold=100000000;g.depositSavings(100000000);assert.equal(s.savings,100000000);assert.equal(s.retired,true);
  g.retire();assert.equal(s.retirementClaimed,true);assert.equal(t.nodes.get('modal').hidden,false);
}
// Both movement rates, wool growth and the game day clock are accelerated exactly as requested.
{
  const t=boot(),g=t.game,s=g.state,field=640,sheep=s.sheep[0];
  assert.equal(t.intervals[0],4000);
  s.sheep=[sheep];sheep.x=50;sheep.y=50;sheep.tx=70;sheep.ty=50;sheep.action='walking';sheep.actionTarget='grass';
  const sheepBefore=sheep.x;g.animateSheep();assert.ok(Math.abs((sheep.x-sheepBefore)*field/100-4.2)<.001);
  s.upgrades.worker=1;s.sheep=[];s.worker={x:40,y:45,mode:'carrying',targetId:'',carry:1,count:1,direction:1,until:0};
  const workerBefore={x:s.worker.x,y:s.worker.y};g.animateSheep();
  const travelled=Math.hypot((s.worker.x-workerBefore.x)*field/100,(s.worker.y-workerBefore.y)*400/100);
  assert.ok(Math.abs(travelled-6.72)<.001);
  s.sheep=[sheep];sheep.wool=0;g.tick();assert.equal(sheep.wool,8.4);assert.equal(sheep.age,8.9);
}
{
  const slow=haul(0,0),fast=haul(3,0),big=haul(0,1);
  assert.ok(fast.steps<slow.steps);assert.equal(slow.maxLoad,2);assert.equal(big.maxLoad,3);assert.ok(big.steps<slow.steps);
  const t=boot();t.game.state.gold=10000;t.game.upgrade('boots');assert.equal(t.game.state.upgrades.boots,0);
}
// Clover feeds in the field, shade benefits rest, and low troughs reserve only one place.
{
  const t=boot(),g=t.game,s=g.state;s.sheep=s.sheep.slice(0,2);const a=s.sheep[0],b=s.sheep[1];
  s.upgrades.clover=1;s.upgrades.shade=1;s.happiness=50;s.hay=0;s.water=0;
  a.x=a.tx=50;a.y=a.ty=50;a.actionUntil=0;a.hunger=50;a.thirst=100;a.actionTarget='grass';
  t.step();assert.equal(a.action,'grazing');assert.equal(a.hunger,54);
  a.hunger=100;a.tx=a.x;a.ty=a.y;a.actionUntil=0;t.step();assert.equal(a.action,'idle');assert.ok(s.happiness>50);
  s.hay=2;a.hunger=b.hunger=5;a.thirst=b.thirst=100;a.tx=b.tx=undefined;a.action='idle';a.actionTarget='';
  g.chooseSheepTarget(a);g.chooseSheepTarget(b);assert.equal(a.actionTarget,'eating');assert.equal(b.actionTarget,'grass');
  assert.ok(a.ty*400/100+(22-16)*52/32>270); // Mouth meets the visible low fill, not the empty top.
}
console.log('PASS: complete walking PNGs, young/adult models, deposits, retirement, level gates, paid breed unlocks, newborn purchases, breed bonuses, economy, auto-save, account storage, trough contact, cloud-safe legacy migration.');

}
run().catch(error => { console.error(error); process.exitCode=1; });
