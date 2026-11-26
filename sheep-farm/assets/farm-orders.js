(function (root) {
  'use strict';
  var MAX_SATISFACTION = 100, RAINBOW_CHANCE = .0315, FLOCK_CHANCE = .006, RARE_GAP = 40;
  function isRare(order) { return ['rainbow','flock-cap','rainbow-cap'].indexOf(order.kind) >= 0; }
  function integer(value, max) { return Math.max(0, Math.min(max, Math.floor(Number(value) || 0))); }
  function slotsForLevel(level) { return level >= 5 ? 3 : 2; }
  function bonuses(satisfaction) {
    var points = integer(satisfaction, MAX_SATISFACTION);
    return { yield: 1 + points * .001, growth: 1 + points * .0005 };
  }
  function pricesValue(order, prices) { return (order.goods.wool || 0) * prices.wool + (order.goods.meat || 0) * prices.meat; }
  function reward(order, prices) { return Math.round(pricesValue(order, prices) * (isRare(order) ? .8 : order.lane === 'mixed' ? 1.18 : 1.15)); }
  function eligible(book, level) {
    return !!book.specialUnlocked && level >= 6 && book.completed >= 15 && book.completed - book.lastRainbowAt >= RARE_GAP && !book.slots.some(isRare);
  }
  function makeOrder(book, lane, level, random, allowRare) {
    var serial = book.nextId++, stage = Math.max(0, Math.min(5, level - 3));
    var rare = '', rollRare = allowRare && eligible(book, level) ? random() : 1;
    if (rollRare < FLOCK_CHANCE) rare = 'flock-cap';
    else if (rollRare < FLOCK_CHANCE + RAINBOW_CHANCE && level >= 8 && !book.pendingRainbow) rare = 'rainbow';
    var roll = Math.floor(Math.max(0, Math.min(.999999, random())) * 3), offset = (serial - 1 + roll) % 3;
    var wool = [3,4,6][offset] + stage * 3, meat = [1.5,2,2.5][offset] + stage * .75;
    var tier = Math.max(0,level-6), goods = rare === 'flock-cap' ? {wool:350+tier*50,meat:80+tier*10} : rare === 'rainbow' ? {wool:120+tier*20,meat:20+tier*4} : lane === 'wool' ? {wool:wool} : lane === 'meat' ? {meat:meat} : {wool:wool+3, meat:meat};
    return {id:'contract-' + serial,lane:lane,kind:rare || lane,goods:goods};
  }
  function normalize(saved, level, legacy) {
    var book = {version:1,nextId:1,completed:0,satisfaction:0,lastRainbowAt:-RARE_GAP,pendingRainbow:0,rainbowAwards:0,specialUnlocked:false,flockBonus:0,rainbowLimit:2,slots:[]};
    if (saved && saved.version === 1) {
      book.nextId = Math.max(1,integer(saved.nextId,1000000000));
      book.completed = integer(saved.completed,1000000000); book.satisfaction = integer(saved.satisfaction,MAX_SATISFACTION);
      book.lastRainbowAt = Math.max(-RARE_GAP,Math.min(book.completed,Math.floor(Number(saved.lastRainbowAt) || 0)));
      book.pendingRainbow = integer(saved.pendingRainbow,1000000); book.rainbowAwards = integer(saved.rainbowAwards,1000000000);
      book.specialUnlocked = !!saved.specialUnlocked;book.flockBonus = integer(saved.flockBonus,1000000);book.rainbowLimit = Math.max(2,integer(saved.rainbowLimit,5));
      var seen = {};
      if (Array.isArray(saved.slots)) saved.slots.slice(0,3).forEach(function (order,index) {
        if (!order || !order.goods) return;
        var lane = ['wool','meat','mixed'].indexOf(order.lane) >= 0 ? order.lane : ['wool','meat','mixed'][index], goods = {};
        var kind=order.kind==='rainbow-cap'?'rainbow':isRare(order)?order.kind:lane, rare=isRare({kind:kind});
        ['wool','meat'].forEach(function (key) { var qty = Number(order.goods[key]); if (isFinite(qty) && qty > 0 && qty <= 2000) goods[key] = qty; });
        var id = typeof order.id === 'string' && /^contract-\d+$/.test(order.id) ? order.id : 'contract-' + book.nextId++;
        if (!Object.keys(goods).length || seen[id] || (rare && (level < 6 || book.slots.some(isRare)))) return;
        seen[id] = true; book.nextId = Math.max(book.nextId,Number(id.slice(9))+1);
        book.slots.push({id:id,lane:lane,kind:rare ? kind : lane,goods:goods});
      });
    } else if (legacy) {
      book.completed = integer(legacy.completed,1000000000);
      var type = legacy.type === 'meat' ? 'meat' : 'wool', qty = Number(legacy.qty) || (type === 'meat' ? 1.5 : 3), goods = {};
      goods[type] = Math.max(.5,Math.min(500,qty));
      book.slots.push({id:'contract-' + book.nextId++,lane:type,kind:type,goods:goods});
    }
    return ensureSlots(book,level);
  }
  function ensureSlots(book, level) {
    while (book.slots.length < slotsForLevel(level)) {
      var lane = ['wool','meat','mixed'][book.slots.length];
      // A migrated meat order keeps its contents; use wool for the second slot.
      if (lane === 'meat' && book.slots[0] && book.slots[0].kind === 'meat') lane = 'wool';
      book.slots.push(makeOrder(book,lane,level,function () {return .25;},false));
    }
    return book;
  }
  function complete(book, id, level, stock, prices, random) {
    if (level < 3) return {ok:false,reason:'level'};
    var index = book.slots.findIndex(function (o) {return o.id === id;});
    if (index < 0 || index >= slotsForLevel(level)) return {ok:false,reason:'missing'};
    var order = book.slots[index];
    if (!Object.keys(order.goods).every(function (key) {return (Number(stock[key]) || 0) + 1e-9 >= order.goods[key];})) return {ok:false,reason:'stock'};
    var next = JSON.parse(JSON.stringify(book)), cash = reward(order,prices), normalizedKind = order.kind === 'rainbow-cap' ? 'rainbow' : order.kind, rainbow = normalizedKind === 'rainbow', rare = isRare(order);
    next.completed += 1; next.satisfaction = Math.min(MAX_SATISFACTION,next.satisfaction + (rare ? 2 : 1));
    if (rainbow) {next.pendingRainbow += 1;next.rainbowAwards += 1;}
    if (normalizedKind === 'flock-cap') next.flockBonus += 2;
    if (rare) next.lastRainbowAt = next.completed;
    // Keep the fulfilled ID in place while rolling: it prevents back-to-back rare orders.
    next.slots[index] = makeOrder(next,order.lane,level,random || Math.random,!rare);
    return {ok:true,book:next,cash:cash,goods:order.goods,rainbow:rainbow,rewardKind:rare ? normalizedKind : ''};
  }
  root.FarmOrders = {normalize:normalize,ensureSlots:ensureSlots,complete:complete,reward:reward,rawValue:pricesValue,bonuses:bonuses,eligible:eligible,isRare:isRare,slotsForLevel:slotsForLevel,rainbowChance:RAINBOW_CHANCE,flockChance:FLOCK_CHANCE,rareGap:RARE_GAP};
}(window));
