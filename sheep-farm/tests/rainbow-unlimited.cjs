const assert=require('node:assert/strict');
const boot=require('./farm-harness.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
async function run(){
  const seed=copy(boot().game.state);
  Object.assign(seed,{day:143,dayPhase:9,level:8,gold:98000,earned:750000,savings:123456,wool:9999,meat:9999,savedAt:50000,workshopUnlocked:true});
  seed.breeds.rainbow=true;seed.upgrades.capacity=7;seed.upgrades.worker=1;seed.upgrades.wool=3;
  seed.contracts.completed=120;seed.contracts.satisfaction=57;seed.contracts.rainbowLimit=2;seed.contracts.specialUnlocked=true;
  seed.sheep.forEach((s,i)=>Object.assign(s,{breed:i<2?'rainbow':'mint',age:80+i,wool:66+i}));
  const existing=seed.sheep.map(s=>({id:s.id,breed:s.breed,age:s.age,wool:s.wool}));
  const game=boot(seed),g=game.game,s=g.state;
  for(const key of ['day','dayPhase','level','gold','earned','savings','wool','meat','savedAt'])assert.equal(s[key],seed[key]);
  assert.equal(s.contracts.completed,120);assert.equal(s.contracts.satisfaction,57);assert.equal(s.upgrades.wool,3);
  assert.deepEqual(copy(s.sheep.map(x=>({id:x.id,breed:x.breed,age:x.age,wool:x.wool}))),existing);
  for(let i=0;i<6;i++)assert.equal(g.buySheep('rainbow'),true);
  assert.equal(g.rainbowCount(),8);assert.equal(s.gold,74000);assert.equal(s.earned,seed.earned);assert.equal(s.savings,seed.savings);
  assert.match(g.breedCards(),/品种数量不限/);assert.doesNotMatch(g.breedCards(),/彩虹名额已满|最多扩至 5|当前名额/);
  await g.saveState(false);const reload=boot(game.saved());assert.equal(reload.game.rainbowCount(),8);assert.equal(reload.game.state.gold,74000);assert.equal(reload.game.state.day,143);
  // Original platform account keys restore an existing flock and remain unchanged after saving.
  const shared={},a=boot(null,640,400,'existing-A',shared),key=a.game.platformStorageKey();shared[key]=JSON.stringify(seed);
  await a.game.hydratePlatformState();assert.equal(a.game.state.day,143);assert.equal(a.game.state.gold,98000);assert.equal(a.game.rainbowCount(),2);
  assert.equal(a.game.buySheep('rainbow'),true);await a.game.saveState(false);assert.deepEqual(Object.keys(shared),[key]);
  const a2=boot(null,640,400,'existing-A',shared);await a2.game.hydratePlatformState();assert.equal(a2.game.state.gold,94000);assert.equal(a2.game.rainbowCount(),3);
  // Preserve the old order ID, requirements, cooldown and pending reward while changing its reward.
  const legacy=copy(seed);legacy.contracts.pendingRainbow=1;
  legacy.contracts.slots[0]={id:'contract-901',lane:'wool',kind:'rainbow-cap',goods:{wool:810,meat:170}};
  const migrated=boot(legacy),mg=migrated.game,ms=mg.state,order=ms.contracts.slots[0];
  assert.equal(order.id,'contract-901');assert.equal(order.kind,'rainbow');assert.equal(order.goods.wool,810);assert.equal(order.goods.meat,170);
  assert.equal(ms.contracts.completed,120);assert.equal(ms.contracts.satisfaction,57);
  const cash=ms.gold,expected=mg.tradeReward(order);assert.equal(mg.deliverTradeOrder(order.id),true);
  assert.equal(ms.gold,cash+expected);assert.equal(ms.wool,legacy.wool-810);assert.equal(ms.meat,legacy.meat-170);
  assert.equal(mg.rainbowCount(),3);assert.equal(ms.contracts.pendingRainbow,1);assert.equal(ms.contracts.rainbowAwards,legacy.contracts.rainbowAwards+1);
  assert.equal(mg.deliverTradeOrder(order.id),false);assert.equal(mg.claimRainbowReward(),true);assert.equal(mg.rainbowCount(),4);assert.equal(mg.claimRainbowReward(),false);
  // Full total capacity still blocks spending and holds every pending lamb across reloads.
  const full=boot(seed),fg=full.game;while(fg.state.sheep.length<fg.capacity())assert.equal(fg.buySheep('rainbow'),true);
  const fullCash=fg.state.gold;fg.buySheep('rainbow');assert.equal(fg.state.gold,fullCash);
  fg.state.contracts.pendingRainbow=2;assert.equal(fg.claimRainbowReward(),false);await fg.saveState(false);
  const fullBack=boot(full.saved());assert.equal(fullBack.game.state.contracts.pendingRainbow,2);fullBack.game.state.sheep.pop();
  assert.equal(fullBack.game.claimRainbowReward(),true);assert.equal(fullBack.game.state.contracts.pendingRainbow,1);
  fullBack.game.state.level=7;fullBack.game.state.sheep.pop();assert.equal(fullBack.game.claimRainbowReward(),false);assert.equal(fullBack.game.buySheep('rainbow'),false);
  fullBack.game.state.level=8;fullBack.game.state.gold=0;assert.equal(fullBack.game.buySheep('rainbow'),false);
  console.log('PASS: old web/platform saves preserved, 8+ rainbow sheep, exact purchase costs, migrated order IDs/goods/rewards, pending rewards retained, and level/cash/total-capacity gates.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
