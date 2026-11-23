const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const boot = require('./farm-harness.cjs');
const context = vm.createContext({window:{},Math,JSON});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/farm-orders.js'),'utf8'),context);
const orders = context.window.FarmOrders;
function seed() {let n=8143;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
async function run(){
  // First entry pauses the simulation, then guides actual paid actions without granting money.
  const fresh=boot(),g=fresh.game,s=g.state;g.maybeStartTutorial();
  assert.equal(fresh.nodes.get('modal').hidden,false);assert.match(fresh.nodes.get('modal-body').innerHTML,/300|welcome-steps/);
  const before=JSON.stringify(s);g.tick();g.animateSheep();assert.equal(JSON.stringify(s),before);
  g.closeModal();assert.equal(s.tutorial.seen,true);assert.equal(g.tutorialStep(),0);
  g.refillSupply('hay');assert.equal(s.gold,298);assert.equal(g.tutorialStep(),1);
  s.sheep[0].wool=100;g.shear();assert.equal(g.tutorialStep(),2);g.pickWool(s.woolDrops[0].id);assert.equal(g.tutorialStep(),3);g.sellWool();assert.equal(s.tutorial.done,true);
  await g.saveState(false);const restored=boot(fresh.saved());restored.game.maybeStartTutorial();assert.notEqual(restored.nodes.get('modal')&&restored.nodes.get('modal').hidden,false);
  const old=boot({calendarVersion:1,day:9,gold:987,sheep:s.sheep});old.game.maybeStartTutorial();assert.equal(old.game.state.tutorial.done,true);assert.equal(old.game.state.gold,987);
  const skipped=boot();skipped.game.maybeStartTutorial();skipped.game.finishTutorial();assert.equal(skipped.game.state.tutorial.done,true);assert.equal(skipped.game.state.gold,300);
  const native=boot(null,640,400,'intro-account',{});native.game.maybeStartTutorial();assert.notEqual(native.nodes.get('modal')&&native.nodes.get('modal').hidden,false);await native.game.hydratePlatformState();assert.equal(native.nodes.get('modal').hidden,false);native.game.closeModal();await native.game.saveState(false);

  // Every special breed is visible at LV1, while buying and unlock gates remain enforced.
  const nursery=boot(),ng=nursery.game,html=ng.breedCards();
  for(const text of ['薄荷羊','蜜桃羊','彩虹羊','LV4','LV5','LV6','1,200','900','2,800','1,600','7,200','4,000','+20%','×4'])assert.ok(html.includes(text),text);
  ng.state.gold=100000;assert.equal(ng.buySheep('rainbow'),false);assert.equal(ng.unlockBreed('mint'),false);
  assert.equal(ng.breedMeta.rainbow.level,8);assert.ok(html.indexOf('绒糖羊')<html.indexOf('薄荷羊'));assert.ok(html.indexOf('星愿羊')<html.indexOf('彩虹羊'));
  ng.state.level=2;ng.unlockBreed('gift');assert.equal(ng.state.workshopUnlocked,false);ng.buySheep('gift');assert.equal(ng.state.workshopUnlocked,true);
  ng.state.level=6;ng.unlockBreed('wish');assert.equal(ng.state.contracts.specialUnlocked,false);ng.buySheep('wish');assert.equal(ng.state.contracts.specialUnlocked,true);assert.equal(ng.unlockBreed('rainbow'),false);

  // Six breeds have complete assets; their own effects never require a missing sprite.
  for(const breed of Object.keys(ng.breedMeta))for(const stage of ['young','adult'])for(const fur of ['wool','shorn'])for(const pose of ['idle','walk','sit','eat','drink','lie','sleep']){
    assert.ok(fs.existsSync(path.join(__dirname,'../assets/sheep',stage+'-'+breed+'-'+fur+'-'+pose+'-0.png')));
  }

  // Both early orders are retained independently; only the submitted ID is replaced.
  const trade=boot(),tg=trade.game,ts=tg.state;ts.level=3;ts.wool=500;ts.meat=100;
  const first=ts.contracts.slots[0],second=JSON.stringify(ts.contracts.slots[1]),cash=ts.gold,quantity=ts.wool;
  const reward=tg.tradeReward(first);assert.equal(tg.deliverTradeOrder(first.id),true);assert.equal(ts.gold,cash+reward);assert.equal(ts.wool,quantity-first.goods.wool);assert.equal(JSON.stringify(ts.contracts.slots[1]),second);
  const completed=JSON.stringify(ts);assert.equal(tg.deliverTradeOrder(first.id),false);assert.equal(JSON.stringify(ts),completed);
  ts.level=4;ts.earned=100000;ts.gold=100000;tg.levelUp();assert.equal(ts.contracts.slots.length,3);assert.equal(ts.contracts.slots[2].lane,'mixed');
  await tg.saveState(false);const reload=boot(trade.saved());assert.equal(JSON.stringify(reload.game.state.contracts),JSON.stringify(ts.contracts));
  const legacy=boot({calendarVersion:1,day:3,gold:111,level:3,progressionVersion:1,tradeOrder:{type:'meat',qty:2.5,completed:9},sheep:s.sheep});assert.equal(legacy.game.state.contracts.completed,9);assert.equal(legacy.game.state.contracts.slots[0].goods.meat,2.5);assert.equal(legacy.game.state.contracts.satisfaction,0);

  // Satisfaction accumulates in small steps and stops at the advertised production caps.
  assert.equal(orders.bonuses(1).yield,1.001);assert.equal(orders.bonuses(1).growth,1.0005);assert.equal(orders.bonuses(999).yield,1.1);assert.equal(orders.bonuses(999).growth,1.05);
  const plain=boot(),happy=boot();happy.game.state.contracts.satisfaction=100;
  for(const game of [plain.game,happy.game]){game.state.sheep.forEach(x=>x.wool=100);game.shear();}
  assert.ok(Math.abs(happy.game.state.woolDrops[0].amount/plain.game.state.woolDrops[0].amount-1.1)<1e-9);
  plain.game.state.sheep[0].wool=0;happy.game.state.sheep[0].wool=0;plain.game.tick();happy.game.tick();assert.ok(Math.abs(happy.game.state.sheep[0].wool/plain.game.state.sheep[0].wool-1.05)<1e-9);

  // Rare rolls require level, deliveries, no other rare order/pending reward, and cooldown.
  let book=orders.normalize(null,8);book.completed=15;book.specialUnlocked=true;
  let rare=orders.complete(book,book.slots[0].id,8,{wool:1000,meat:1000},{wool:56,meat:118},()=>.02).book;
  assert.equal(rare.slots[0].kind,'rainbow');assert.ok(rare.slots[0].goods.wool>=120&&rare.slots[0].goods.meat>=20);
  const kept=orders.normalize(JSON.parse(JSON.stringify(rare)),8);assert.equal(JSON.stringify(kept),JSON.stringify(rare));
  for(const [level,count] of [[5,15],[8,13]]){let b=orders.normalize(null,level);b.completed=count;b.specialUnlocked=true;assert.equal(orders.complete(b,b.slots[0].id,level,{wool:1000,meat:1000},{wool:56,meat:118},()=>0).book.slots[0].kind,'wool');}
  const awarded=orders.complete(rare,rare.slots[0].id,8,{wool:1000,meat:1000},{wool:56,meat:118},()=>0);assert.equal(awarded.book.pendingRainbow,1);assert.equal(orders.eligible(awarded.book,8),false);
  awarded.book.pendingRainbow=0;assert.equal(orders.eligible(awarded.book,8),false);awarded.book.completed+=40;assert.equal(orders.eligible(awarded.book,8),true);
  const blocked=orders.normalize(null,8);blocked.completed=100;assert.equal(orders.eligible(blocked,8),false);blocked.specialUnlocked=true;
  const capOrder=orders.complete(blocked,blocked.slots[0].id,8,{wool:9999,meat:9999},{wool:56,meat:118},()=>.001).book;
  assert.equal(capOrder.slots[0].kind,'rainbow-cap');assert.ok(capOrder.slots[0].goods.wool>=650&&capOrder.slots[0].goods.meat>=140);
  const capReward=orders.complete(capOrder,capOrder.slots[0].id,8,{wool:9999,meat:9999},{wool:56,meat:118},()=>.5);assert.equal(capReward.book.rainbowLimit,3);
  blocked.rainbowLimit=5;assert.equal(orders.complete(blocked,blocked.slots[0].id,8,{wool:9999,meat:9999},{wool:56,meat:118},()=>.001).book.slots[0].kind,'wool');
  const expansion=orders.complete(blocked,blocked.slots[0].id,8,{wool:9999,meat:9999},{wool:56,meat:118},()=>.004).book;assert.equal(expansion.slots[0].kind,'flock-cap');
  const expanded=orders.complete(expansion,expansion.slots[0].id,8,{wool:9999,meat:9999},{wool:56,meat:118},()=>.5).book;assert.equal(expanded.flockBonus,2);
  const enlarged=boot({calendarVersion:1,level:8,progressionVersion:1,contracts:expanded,upgrades:{capacity:7},sheep:s.sheep});assert.equal(enlarged.game.capacity(),22);
  const preRainbow=orders.normalize(null,7);preRainbow.completed=100;preRainbow.specialUnlocked=true;assert.equal(orders.complete(preRainbow,preRainbow.slots[0].id,7,{wool:9999,meat:9999},{wool:56,meat:118},()=>.02).book.slots[0].kind,'wool');
  assert.equal(orders.flockChance,.006);assert.equal(orders.rainbowCapChance,.0015);

  // A full pen holds the reward across reload; collection cannot duplicate it or unlock purchases.
  const full=boot({calendarVersion:1,progressionVersion:1,level:8,gold:10000,breeds:{normal:true},sheep:s.sheep.concat(s.sheep.map((x,i)=>Object.assign({},x,{id:'extra'+i}))),contracts:rare});
  const fg=full.game,fsave=fg.state;fsave.wool=1000;fsave.meat=1000;assert.equal(fg.deliverTradeOrder(fsave.contracts.slots[0].id),true);assert.equal(fsave.contracts.pendingRainbow,1);assert.equal(fsave.sheep.length,6);
  await fg.saveState(false);const back=boot(full.saved());assert.equal(back.game.state.contracts.pendingRainbow,1);back.game.state.upgrades.capacity=1;assert.equal(back.game.claimRainbowReward(),true);assert.equal(back.game.claimRainbowReward(),false);
  const lamb=back.game.state.sheep.find(x=>x.breed==='rainbow');assert.equal(lamb.age,0);assert.equal(back.game.state.breeds.rainbow,false);assert.equal(back.game.sellLiveSheep(lamb.id),false);
  await back.game.saveState(false);assert.equal(boot(back.saved()).game.state.breeds.rainbow,false);

  // Rainbow juveniles take twice as long as ordinary sheep; feeds are paid, timed and non-stacking.
  const feeding=boot(),ff=feeding.game,ffstate=ff.state;ffstate.level=3;ffstate.gold=100000;
  ffstate.sheep[0].breed='normal';ffstate.sheep[1].breed='rainbow';ffstate.sheep[0].age=ffstate.sheep[1].age=0;
  ff.tick();assert.equal(ffstate.sheep[0].age,.9);assert.equal(ffstate.sheep[1].age,.45);
  ffstate.sheep.forEach(x=>x.wool=0);const beforeFeed=ffstate.gold;
  assert.equal(ff.buySpecialFeed('wool'),true);assert.equal(ffstate.gold,beforeFeed-500);assert.equal(ff.buySpecialFeed('wool'),false);assert.equal(ffstate.gold,beforeFeed-500);
  assert.equal(ff.buySpecialFeed('growth'),true);assert.equal(ffstate.gold,beforeFeed-1300);const ageBefore=ffstate.sheep[0].age;ff.tick();assert.ok(Math.abs(ffstate.sheep[0].wool-8.4*1.2)<1e-9);assert.ok(Math.abs(ffstate.sheep[0].age-ageBefore-.9*1.3)<1e-9);
  await ff.saveState(false);const fedBack=boot(feeding.saved());assert.equal(fedBack.game.state.feeds.wool,29);assert.equal(fedBack.game.state.feeds.growth,44);
  for(let i=0;i<44;i++)fedBack.game.tick();assert.equal(fedBack.game.state.feeds.wool,0);assert.equal(fedBack.game.state.feeds.growth,0);
  let previous=0;for(let level=2;level<=8;level++){ffstate.level=level;assert.ok(ff.recipeUnitPrice('wool')>previous);previous=ff.recipeUnitPrice('wool');assert.ok(ff.specialFeedPrice('growth')>=800);}
  const capped=boot();capped.game.state.level=8;capped.game.state.gold=100000;capped.game.state.breeds.rainbow=true;capped.game.buySheep('rainbow');capped.game.buySheep('rainbow');const capCash=capped.game.state.gold;assert.equal(capped.game.buySheep('rainbow'),false);assert.equal(capped.game.state.gold,capCash);

  // Batch selling keeps the dialog open until all adult candidates are gone and never selects lambs.
  const sales=boot(),sg=sales.game,ss=sg.state;ss.sheep[0].age=70;ss.sheep[1].age=80;ss.sheep.push(Object.assign({},ss.sheep[0],{id:'sale-extra',age:90}));
  sg.openButcher();sg.selectSaleSheep(ss.sheep[0].id,true);sg.selectSaleSheep('sale-extra',true);const quote=sg.renderSaleSummary(),wallet=ss.gold;assert.equal(quote.count,2);
  assert.equal(sg.sellSelectedSheep('live'),true);assert.equal(ss.gold,wallet+quote.cash);assert.equal(sales.nodes.get('modal').hidden,false);assert.equal(ss.sheep.length,2);
  sg.selectAllSaleSheep();assert.equal(sg.renderSaleSummary().count,1);assert.equal(sg.sellSelectedSheep('meat'),true);assert.equal(sales.nodes.get('modal').hidden,true);assert.equal(ss.sheep.length,1);assert.ok(ss.sheep[0].age<60);
  const repeat=JSON.stringify(ss);assert.equal(sg.sellSelectedSheep('live'),false);assert.equal(JSON.stringify(ss),repeat);

  // Supply prices rise to 2000, but every grade retains a margin even with ordinary sheep.
  const prices=[2,3,6,15,50,150,500,2000],unitCosts=[];
  for(let level=1;level<=8;level++){
    const farm=boot(),game=farm.game,st=game.state;st.level=level;st.gold=10000;st.hay=0;
    assert.equal(game.refillPrice(),prices[level-1]);const amount=game.hayCapacity()/10;game.refillSupply('hay');assert.equal(st.gold,10000-prices[level-1]);assert.equal(st.hay,amount);
    const unit=prices[level-1]/amount;unitCosts.push(unit);
    const upkeep=((15*2.5/28*.5)+(15*3/32*.5))*unit;
    const income=(1.2+.3*.35)*56*60/48;assert.ok(upkeep/income<.15,'ordinary-sheep supply burden at level '+level);
    st.upgrades.capacity=7;assert.equal(game.capacity(),20);const money=st.gold;game.upgrade('capacity');assert.equal(st.gold,money);
  }
  for(let i=1;i<unitCosts.length;i++)assert.ok(unitCosts[i]>=unitCosts[i-1]);
  const retirement=boot({calendarVersion:1,gold:999,savings:50000000,sheep:s.sheep});assert.equal(retirement.game.state.retired,true);assert.equal(retirement.game.state.savings,50000000);
  const rich=boot({calendarVersion:1,gold:999,savings:100000000,sheep:s.sheep});assert.equal(rich.game.state.savings,100000000);

  // Long order simulation values even newborn rewards as fully grown sheep: still bounded.
  let sim=orders.normalize(null,8),random=seed(),raw=0,paid=0,awards=0,lastAward=-100000;sim.specialUnlocked=true;
  for(let i=0;i<20000;i++){
    const order=sim.slots[i%3],value=orders.rawValue(order,{wool:104,meat:212});raw+=value;
    const result=orders.complete(sim,order.id,8,{wool:1000000,meat:1000000},{wool:104,meat:212},random);assert.equal(result.ok,true);paid+=result.cash;sim=result.book;
    if(result.rainbow){assert.ok(sim.completed-lastAward>=40);lastAward=sim.completed;awards++;sim.pendingRainbow=0;}
    assert.ok(sim.slots.filter(orders.isRare).length<=1);assert.ok(sim.satisfaction<=100);
  }
  assert.ok(awards>0&&awards<20000/40);assert.ok((paid+awards*18000)/raw<1.35);
  console.log('PASS: tutorial, six breeds/assets, independent orders, capped bonuses, 0.6%/0.15% expansions, durable rewards, LV8 rainbows, slower growth, paid timed feeds, batch sales, 50-million goal, and affordable supplies.');
  console.log(JSON.stringify({orders:20000,rainbowAwards:awards,rewardToRawRatio:(paid+awards*18000)/raw,maxYield:sim.satisfaction*.1,maxGrowth:sim.satisfaction*.05}));
}
run().catch(error=>{console.error(error);process.exitCode=1;});
