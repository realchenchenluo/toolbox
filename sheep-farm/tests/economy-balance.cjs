/* Simulate actual tick, movement, feeding, shearing, sales and purchases; no bonus income. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const boot = require('./farm-harness.cjs');
function simulate({seconds=1200,invest=false,empty=false}={}) {
  const t=boot(),g=t.game,s=g.state;
  if(empty){s.gold=0;s.hay=0;s.water=0;}
  const start=s.gold, events={}, checkpoints={}, spend={supplies:0,levels:0,facilities:0,sheep:0,breeds:0};
  let nextTick=4000,earned=0,firstSale=null;
  function pay(category,fn){const cash=s.gold;fn();spend[category]+=cash-s.gold;}
  function cost(key){return g.upgradeCost?g.upgradeCost(key):g.upgradeMeta[key].base*(s.upgrades[key]+1);}
  function afford(amount){return s.gold>=amount+24;}
  for(let ms=260;ms<=seconds*1000+260;ms+=260){
    t.step();
    if(ms<nextTick)continue;
    nextTick+=4000;g.tick();
    for(const type of ['hay','water']) {
      const cap=type==='hay'?g.hayCapacity():g.waterCapacity();
      if(s[type]<cap*.25)pay('supplies',()=>g.refillSupply(type));
    }
    if(s.sheep.some(x=>x.wool>=100))g.shear();
    s.woolDrops.slice().forEach(x=>g.pickWool(x.id));
    if(s.wool>0)g.sellWool();
    if(s.earned>earned){if(firstSale===null)firstSale=Math.round(ms/1000);earned=s.earned;}
    if(invest){
      const next=g.levelMeta[s.level];
      if(s.level<3&&next&&s.earned>=next.income&&afford(next.cost))pay('levels',()=>g.levelUp());
      for(const key of ['hayBarn','cistern','worker']){
        const gate=key==='worker'?3:2;
        if(s.level>=gate&&!s.upgrades[key]&&afford(cost(key)))pay('facilities',()=>g.upgrade(key));
      }
      if(s.sheep.length<6&&afford(g.breedMeta.normal.price))pay('sheep',()=>g.buySheep());
      for(const key of ['wool','shears'])if(s.level>=3&&!s.upgrades[key]&&afford(cost(key)))pay('facilities',()=>g.upgrade(key));
      if(s.level>=3&&s.level<8){const n=g.levelMeta[s.level];if(s.earned>=n.income&&afford(n.cost))pay('levels',()=>g.levelUp());}
      for(const breed of ['mint','peach','rainbow']){
        const meta=g.breedMeta[breed];
        if(s.level<meta.level)continue;
        if(!s.breeds[breed]&&afford(meta.unlock))pay('breeds',()=>g.unlockBreed(breed));
        if(s.breeds[breed]&&!s.sheep.some(x=>x.breed===breed)){
          if(s.sheep.length>=6+s.upgrades.capacity*2&&afford(cost('capacity')))pay('facilities',()=>g.upgrade('capacity'));
          if(afford(meta.price)&&s.sheep.length<6+s.upgrades.capacity*2)pay('sheep',()=>g.buySheep(breed));
        }
      }
    }
    if(!events['LV'+s.level])events['LV'+s.level]=Math.round(ms/1000);
    if(s.upgrades.worker&&!events.worker)events.worker=Math.round(ms/1000);
    for(const b of ['mint','peach','rainbow'])if(s.sheep.some(x=>x.breed===b)&&!events[b])events[b]=Math.round(ms/1000);
    for(const sec of [60,180,300,600,1200])if(ms>=sec*1000&&!checkpoints[sec])checkpoints[sec]={cash:Math.round(s.gold),earned:Math.round(s.earned),level:s.level,sheep:s.sheep.length};
    assert.ok(s.gold>=0,'wallet cannot go negative');
  }
  assert.ok(Math.abs(start+s.earned-s.gold-Object.values(spend).reduce((a,b)=>a+b,0))<.00001,'no money created by purchases');
  return {firstSale,events,checkpoints,cash:Math.round(s.gold),earned:Math.round(s.earned),spend};
}
const report={starter:simulate({seconds:600}),progression:simulate({seconds:5400,invest:true}),recovery:simulate({seconds:180,empty:true})};
if(!process.argv.includes('--baseline')&&!process.argv.includes('--measure')){
  assert.ok(report.starter.firstSale<=40);
  assert.ok(report.starter.checkpoints[60].cash>=450);
  assert.ok(report.starter.cash>report.starter.spend.supplies*10);
  assert.ok(report.progression.events.LV2<=90);
  assert.ok(report.progression.events.worker<=300);
  assert.ok(report.progression.events.LV6<=1200);
  assert.ok(report.progression.events.rainbow<=5400);
  assert.ok(report.recovery.cash>0);
  console.log('PASS: positive starter margin, affordable early upgrades, progressive spending, no-cash recovery, and conservation of currency.');
}
fs.writeFileSync(path.join(__dirname,process.argv.includes('--baseline')?'economy-before.json':'economy-after.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
