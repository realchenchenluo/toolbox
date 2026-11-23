/* Real production and paid inputs at the highest supply price, including timed feed costs. */
const assert=require('node:assert/strict');
const boot=require('./farm-harness.cjs');
async function simulate({advanced=false,feed=false,boxes=false}={}){
  const t=boot(),g=t.game,s=g.state;s.level=8;s.gold=100000;s.sheep=[];s.hay=0;s.water=0;s.happiness=30;s.upgrades.capacity=7;
  if(advanced){s.upgrades.wool=4;s.upgrades.shears=3;s.upgrades.merchant=3;s.upgrades.hayBarn=3;s.upgrades.cistern=3;}
  for(let i=0;i<20;i++)s.sheep.push({id:'budget-'+i,breed:advanced?(i<3?'mint':i<6?'peach':i<8?'rainbow':i===8?'gift':i===9?'wish':'normal'):'normal',age:90,wool:0,hunger:95,thirst:95,zone:i%4,x:20+i%5*15,y:24+Math.floor(i/5)*14,direction:1,action:'idle',actionUntil:0});
  s.workshopUnlocked=boxes;let inputCost=0;
  function expense(fn){const cash=s.gold;fn();inputCost+=cash-s.gold;}
  expense(()=>g.refillSupply('hay'));expense(()=>g.refillSupply('water'));
  if(feed){expense(()=>g.buySpecialFeed('wool'));expense(()=>g.buySpecialFeed('growth'));}
  let nextTick=4000;
  for(let ms=260;ms<=600000+260;ms+=260){
    t.step();if(ms<nextTick)continue;nextTick+=4000;g.tick();
    for(const type of ['hay','water'])if(s[type]<(type==='hay'?g.hayCapacity():g.waterCapacity())*.05)expense(()=>g.refillSupply(type));
    if(s.sheep.some(x=>x.wool>=100)){g.shear();s.woolDrops.slice().forEach(drop=>g.pickWool(drop.id));await g.saveState(false);}
    if(boxes){g.sellBoxes();if(!s.conveyor.wool.running&&s.wool>=2)g.startConveyor('wool');if(!s.conveyor.meat.running&&s.meat>=2.5)g.startConveyor('meat');}
    if(s.wool>0)g.sellWool();assert.ok(s.gold>=0);
  }
  await g.saveState(false);
  assert.ok(Math.abs(s.gold-(100000+s.earned-inputCost))<1e-6);
  assert.ok(s.gold>100000,'ten-minute net margin must stay positive');
  assert.equal(s.feeds.wool,0);assert.equal(s.feeds.growth,0);
  return {income:Math.round(s.earned),paidInputs:inputCost,net:Math.round(s.gold-100000),sheep:s.sheep.length};
}
(async()=>{
  const report={ordinary20:await simulate(),advanced20:await simulate({advanced:true}),advancedWithFeedsAndBoxes:await simulate({advanced:true,feed:true,boxes:true})};
  console.log('PASS: highest supply prices retain positive ten-minute margins; paid accelerators and processing conserve currency.');
  console.log(JSON.stringify(report));
})().catch(error=>{console.error(error);process.exitCode=1;});
