(function () {
  'use strict';

  var SAVE_KEY = 'muyun-sheep-farm-v2';
  var PLATFORM_SAVE_KEY = 'muyun-sheep-farm-v3';
  var AUTO_SAVE_INTERVAL = 12000;
  var RETIREMENT_GOAL = 10000000;
  var contractsEngine = window.FarmOrders;
  var supplyPrices = [2,3,6,15,50,150,500,2000];
  var supplyScales = [1,1.3,2,3,5,12,30,80];
  function refillPrice() { return supplyPrices[Math.max(0,Math.min(7,state.level-1))]; }
  function supplyScale() { return supplyScales[Math.max(0,Math.min(7,state.level-1))]; }
  var levelMeta = [
    { cost: 0, income: 0, opens: '添草加水、剪毛售卖、退休金' },
    { cost: 160, income: 120, opens: '绒糖羊、礼盒工坊、补给设施' },
    { cost: 420, income: 450, opens: '雇佣工人、精细剪毛、订单、特殊精料' },
    { cost: 1200, income: 1600, opens: '薄荷羊、三叶草地、冷藏仓' },
    { cost: 2800, income: 4000, opens: '蜜桃羊、营养配方、工人装备' },
    { cost: 6500, income: 10000, opens: '星愿羊、扩容委托、集市商路' },
    { cost: 16000, income: 25000, opens: '树荫休憩、高阶羊群培育' },
    { cost: 34000, income: 60000, opens: '彩虹羊、彩虹羊仔奖励、珍品礼盒' }
  ];
  var breedMeta = {
    normal: { name: '云朵羊', level: 1, unlock: 0, price: 160, sale: 420, wool: 1, desc: '普通羊。幼羊也可剪毛。' },
    gift: { name: '绒糖羊', level: 2, unlock: 480, price: 320, sale: 680, wool: 1.2, desc: '首次购入：永久开启礼盒工坊。产毛 ×1.2。' },
    mint: { name: '薄荷羊', level: 4, unlock: 1200, price: 900, sale: 1700, wool: 1.5, desc: '在场每只：全场长毛 +20%，最多 +60%。产毛 ×1.5。' },
    peach: { name: '蜜桃羊', level: 5, unlock: 2800, price: 1600, sale: 3200, wool: 1.8, desc: '在场每只：全场成长 +20%，最多 +60%。产毛 ×1.8。' },
    wish: { name: '星愿羊', level: 6, unlock: 5500, price: 3000, sale: 5200, wool: 2.2, desc: '首次购入：永久开启订单特殊奖励。产毛 ×2.2。' },
    rainbow: { name: '彩虹羊', level: 8, unlock: 7200, price: 4000, sale: 18000, wool: 4, desc: '产毛 ×4，长大耗时翻倍。成年活羊 ¥18,000 起。' }
  };
  var upgradeLevels = { capacity: 1, hayBarn: 2, cistern: 2, feeder: 2, worker: 3, wool: 3, shears: 3, clover: 4, meat: 4, growth: 5, boots: 5, basket: 5, merchant: 6, shade: 7, workshop: 8 };
  var sheepNames = ['棉花糖', '小麦穗', '云朵', '黑豆', '露珠', '山风', '奶盖', '星星'];
  var tips = [
    '先补水再剪毛，幸福度高的羊会产出更轻、更值钱的羊毛。',
    '羊毛达到 100% 就能剪，剪完会重新开始生长。',
    '成年羊可以出栏卖肉，留下优秀的羊继续产毛会更划算。',
    '雇工会走到羊毛旁拾取，装满背篓后送回收纳棚。',
    '升级草料仓和蓄水池，每次补充的一格也会变大。',
    '山谷收购站有原料委托，按订单交货可以多赚一些。'
  ];
  var upgradeMeta = {
    capacity: { icon: '⌂', name: '羊圈扩建', desc: function (level) { return '基础名额 ' + Math.min(20,6 + level * 2) + ' 只' + (state.contracts.flockBonus ? ' · 订单 +' + state.contracts.flockBonus : ''); }, base: 180, max: 7 },
    feeder: { icon: '✣', name: '食槽改良', desc: function (level) { return '每次进食恢复 +' + level * 6 + ' 饱腹'; }, base: 120, max: 3 },
    wool: { icon: '✦', name: '羊毛品种', desc: function (level) { return '羊毛品质提升 +' + (level * 10) + '%'; }, base: 220, max: 4 },
    growth: { icon: '↗', name: '营养配方', desc: function (level) { return '成长速度提升 +' + (level * 12) + '%'; }, base: 460, max: 4 },
    meat: { icon: '◇', name: '冷藏仓', desc: function (level) { return '羊肉售价提升 +' + (level * 15) + '%'; }, base: 620, max: 3 },
    worker: { icon: '♙', name: '雇佣牧场工', desc: function (level) { return level ? '每趟搬 4 堆起，附近每次拾 2 堆' : '自动拾取羊毛，搬回收纳棚'; }, base: 480, max: 1 },
    boots: { icon: '↟', name: '工人靴子', desc: function (level) { return '行走速度 +' + level * 25 + '%'; }, base: 280, max: 3, requires: 'worker' },
    basket: { icon: '▤', name: '搬运背篓', desc: function (level) { return '每趟可搬 ' + workerCapacity(level) + ' 堆羊毛'; }, base: 360, max: 3, requires: 'worker' },
    hayBarn: { icon: '▥', name: '草料仓', desc: function (level) { return '干草容量 +' + Math.round(level * 12 * supplyScale()); }, base: 80, max: 3 },
    cistern: { icon: '≈', name: '蓄水池', desc: function (level) { return '清水容量 +' + Math.round(level * 12 * supplyScale()); }, base: 70, max: 3 },
    clover: { icon: '♧', name: '三叶草地', desc: function (level) { return '闲逛啃草恢复 ' + level * 4 + ' 饱腹'; }, base: 440, max: 3 },
    shade: { icon: '♠', name: '树荫休憩', desc: function (level) { return '休息恢复幸福度 +' + level * .5; }, base: 320, max: 3 },
    shears: { icon: '✂', name: '精细剪毛', desc: function (level) { return '每次剪毛产量 +' + level * 15 + '%'; }, base: 200, max: 3 },
    merchant: { icon: '¥', name: '集市商路', desc: function (level) { return '原料售价、委托奖励 +' + level * 8 + '%'; }, base: 560, max: 3 },
    workshop: { icon: '▣', name: '礼盒车间', desc: function (level) { return level ? '已解锁礼盒加工' : '牧场 LV8 后解锁礼盒加工'; }, base: 1600, max: 1, unlockAt: 8 }
  };
  var upgradeGroups = { pasture: ['capacity', 'hayBarn', 'cistern', 'feeder', 'clover', 'shade'], flock: ['wool', 'growth', 'shears'], staff: ['worker', 'boots', 'basket'], trade: ['meat', 'merchant'] };
  var activeUpgradeGroup = 'pasture';
  var recipeMeta = {
    wool: { name: '羊毛礼盒', input: 'wool', amount: 2, price: 220, label: '羊毛礼盒' },
    meat: { name: '鲜肉礼盒', input: 'meat', amount: 2.5, price: 380, label: '鲜肉礼盒' }
  };
  var defaultState = {
    calendarVersion: 1, progressionVersion: 1, level: 1, savings: 0, breeds: { normal: true, gift:false, mint: false, peach: false, wish:false, rainbow: false }, day: 0, dayPhase: 0, gold: 300, earned: 0, careDone: false, retired: false, retirementClaimed: false, hay: 26, water: 22, wool: 0, meat: 0, happiness: 88, cycle: 0, savedAt: 0,
    upgrades: { capacity: 0, feeder: 0, wool: 0, growth: 0, meat: 0, worker: 0, workshop: 0, boots: 0, basket: 0, hayBarn: 0, cistern: 0, clover: 0, shade: 0, shears: 0, merchant: 0 },
    worker: { x: 50, y: 88, mode: 'idle', targetId: '', carry: 0, count: 0, direction: 1, until: 0 },
    contracts: contractsEngine.normalize(null,1),
    feeds: {wool:0,growth:0},
    tutorial: {seen:false,done:false,steps:[false,false,false,false],supplies:{hay:false,water:false}},
    woolDrops: [], boxes: { wool: 0, meat: 0 }, workshopUnlocked: false, workshop: { recipe: 'wool', progress: 0, running: false }, conveyor: { wool: { progress: 0, running: false }, meat: { progress: 0, running: false } }, order: { type: 'wool', qty: 2, reward: 420 },
    sheep: [
      { id: 's1', name: '棉花糖', age: 8, hunger: 82, thirst: 91, wool: 0, zone: 0, x: 22, y: 28, tx: 22, ty: 28, direction: 1, action: 'idle', actionUntil: 0 },
      { id: 's2', name: '小麦穗', age: 12, hunger: 73, thirst: 69, wool: 15, zone: 1, x: 66, y: 26, tx: 66, ty: 26, direction: -1, action: 'idle', actionUntil: 0 },
      { id: 's3', name: '云朵', age: 16, hunger: 93, thirst: 86, wool: 30, zone: 2, x: 30, y: 68, tx: 30, ty: 68, direction: 1, action: 'idle', actionUntil: 0 }
    ]
  };
  var miniTool = window.xhs && window.xhs.miniTool;
  var platformStorage = !!(miniTool && typeof miniTool.getStorage === 'function' && typeof miniTool.setStorage === 'function');
  var accountScope = accountStorageScope();
  var state = window.xhs ? cloneState() : loadState();
  var toastTimer = null;
  var storageHydrated = !platformStorage;
  var pendingPlatformSave = false;
  var cloudStore = null, cloudEnabled = false, cloudBusy = false, lastCloudSave = 0;
  var saveQueue = Promise.resolve(), saveStatus = platformStorage ? '正在读取存档' : state.savedAt ? '本机存档已载入' : '新羊场';
  var lastLifecycleSave = 0, lastAutoSaveRequest = 0;
  var sheepSequence = 0;
  var clockPhaseStartedAt = Date.now();
  var grassField = null;
  var modalReturnFocus = null;
  var onboardingOpen = false;
  var saleModalOpen = false, saleSelection = Object.create(null);
  var sheepAnimations = {}, sheepArtCache = {};
  var sheepSequences = {idle:[2,700],walk:[4,130],sit:[2,800],eat:[3,280],drink:[3,320],lie:[2,900],sleep:[2,1000]};
  var pressedControl = null, pendingLists = [], pressSequence=0, hydrationFlight = null, platformWritePending = null, cloudRequest = 0;
  function deadline(work) {
    return new Promise(function(resolve,reject){
      var timer=setTimeout(function(){var e=new Error('存储响应超时');e.errCode='TIMEOUT';reject(e);},8000);
      Promise.resolve().then(work).then(function(v){clearTimeout(timer);resolve(v);},function(e){clearTimeout(timer);reject(e);});
    });
  }
  function listHTML(node,html) {
    if(!node)return;
    if(pressedControl && typeof node.contains==='function' && node.contains(pressedControl)) {
      node._farmPendingHTML=html;if(pendingLists.indexOf(node)<0)pendingLists.push(node);return;
    }
    if(node._farmHTML===html){node._farmPendingHTML=null;return;}
    node.innerHTML=html;node._farmHTML=html;node._farmPendingHTML=null;
  }
  function releaseControls() {
    pressSequence+=1;
    pressedControl=null;
    setTimeout(function(){var nodes=pendingLists.slice();pendingLists=[];nodes.forEach(function(n){if(n._farmPendingHTML!==null)listHTML(n,n._farmPendingHTML);});},0);
  }

  function cloneState() { return JSON.parse(JSON.stringify(defaultState)); }
  function isNight() { return Number(state.dayPhase) >= 12; }
  function clockSnapshot(phase, elapsed) {
    phase = Math.max(0, Math.min(14, Number(phase) || 0));
    var fraction = Math.max(0, Math.min(.999, (Number(elapsed) || 0) / 4000));
    var night = phase >= 12;
    var minutes = Math.floor((night ? 1080 + (phase - 12 + fraction) * 240 : 360 + (phase + fraction) * 60) % 1440);
    var seconds = Math.max(1, Math.ceil(((night ? 15 : 12) - phase - fraction) * 4));
    function pad(value) { return value < 10 ? '0' + value : String(value); }
    return { time: pad(Math.floor(minutes / 60)) + ':' + pad(minutes % 60), night: night, seconds: seconds, progress: (phase + fraction) / 15 * 100 };
  }
  function renderClock() {
    var ready = !(platformStorage && !storageHydrated) && !cloudBusy && !onboardingOpen;
    var clock = clockSnapshot(state.dayPhase, ready ? Date.now() - clockPhaseStartedAt : 0);
    setText('season-label', '第 ' + state.day + ' 天');
    setText('game-clock', clock.time);
    setText('day-night-icon', clock.night ? '☾' : '☀');
    setText('clock-period', clock.night ? '夜晚' : '白昼');
    setText('clock-countdown', ready ? clock.seconds + ' 秒后' + (clock.night ? '天亮' : '入夜') : onboardingOpen ? '开始放牧后计时' : '读取进度中');
    var fill = document.getElementById('clock-fill'), widget = document.getElementById('game-clock-widget');
    if (fill) fill.style.width = clock.progress.toFixed(1) + '%';
    if (widget) { widget.classList.toggle('is-night', clock.night); widget.setAttribute('aria-label', '第 ' + state.day + ' 天，' + clock.time + '，' + (clock.night ? '夜晚' : '白昼') + '，' + clock.seconds + ' 秒后' + (clock.night ? '天亮' : '入夜')); }
  }
  function loadState() {
    var fresh = cloneState();
    try {
      var raw = window.localStorage && window.localStorage.getItem(SAVE_KEY);
      if (!raw) return fresh;
      var saved = JSON.parse(raw);
      if (!saved || !Array.isArray(saved.sheep)) return fresh;
      return mergeState(fresh, saved);
    } catch (error) { return fresh; }
  }
  function accountStorageScope() {
    var xhs = window.xhs || {}, launch = xhs.launchOptions || {}, env = launch.miniToolEnv || {};
    var candidates = [launch.userId, launch.openId, launch.accountId, launch.uid, env.userId, env.openId, env.accountId, env.userDataPath];
    for (var i = 0; i < candidates.length; i += 1) {
      if (typeof candidates[i] === 'string' && candidates[i].trim()) return 'acct-' + stableHash(candidates[i].trim());
    }
    return 'acct-platform';
  }
  function stableHash(value) {
    var hash = 2166136261;
    for (var i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24); }
    return (hash >>> 0).toString(36);
  }
  function platformStorageKey() { return PLATFORM_SAVE_KEY + ':' + accountScope; }
  function parseStorageData(result) {
    var data = result && result.data;
    if (data === null || data === undefined || data === '') return null;
    if (typeof data === 'string') { return JSON.parse(data); }
    return data;
  }
  function readPlatformState() {
    if (!platformStorage) return Promise.resolve({ ok: false, data: null });
    return deadline(function () { return miniTool.getStorage({ key: platformStorageKey() }); }).then(function (result) {
      if (!result || !Object.prototype.hasOwnProperty.call(result, 'data') || (result.errMsg && result.errMsg !== 'getStorage:ok')) throw new Error('save read failed');
      var data = parseStorageData(result);
      if (data !== null && (!data || !Array.isArray(data.sheep))) throw new Error('invalid save');
      return { ok: true, data: data };
    }).catch(function () { return { ok: false, data: null }; });
  }
  function writePlatformState(snapshot) {
    if (!platformStorage) return Promise.resolve(false);
    // A timed-out native write may still finish: never overlap it with a newer write.
    if(platformWritePending)return Promise.resolve(false);
    var nativeWrite=Promise.resolve().then(function(){return miniTool.setStorage({key:platformStorageKey(),data:snapshot});});
    platformWritePending=nativeWrite;
    nativeWrite.then(function(){if(platformWritePending===nativeWrite)platformWritePending=null;},function(){if(platformWritePending===nativeWrite)platformWritePending=null;});
    return deadline(function(){return nativeWrite;}).then(function(result){return !!result&&result.errMsg==='setStorage:ok';}).catch(function(){return false;});
  }
  function hydratePlatformState() {
    if (!platformStorage) return;
    if(storageHydrated)return Promise.resolve(true);
    if(hydrationFlight)return hydrationFlight;
    hydrationFlight=readPlatformState().then(function (result) {
      if (!result.ok) { saveStatus = '存档读取失败'; render(); showToast('账号存档读取失败，已暂停保存，避免覆盖原进度。'); return; }
      if (result.data && Array.isArray(result.data.sheep)) state = mergeState(cloneState(), result.data);
      storageHydrated = true;
      clockPhaseStartedAt = Date.now();
      saveStatus = state.savedAt ? '本机存档已载入' : '全新羊场 · 第 0 天';
      render();
      setupCloudStorage();
      maybeStartTutorial();
      if (pendingPlatformSave) { pendingPlatformSave = false; showToast('账号存档已加载，请再操作一次保存。'); }
    }).then(function(){hydrationFlight=null;},function(){hydrationFlight=null;saveStatus='存档读取失败';render();});
    return hydrationFlight;
  }
  function setupCloudStorage() {
    if (!miniTool || typeof window.createFarmCloudSave !== 'function') return;
    var launch = window.xhs.launchOptions || {}, build = Number(launch.miniToolEnv && launch.miniToolEnv.buildVersion) || 0;
    var launchPromise = build || typeof miniTool.getLaunchOptions !== 'function' ? Promise.resolve(launch) : Promise.resolve().then(function () { return miniTool.getLaunchOptions(); });
    launchPromise.then(function (options) {
      var env = options && options.miniToolEnv;
      cloudStore = window.createFarmCloudSave(miniTool, env && env.buildVersion);
      document.getElementById('cloud-save-button').hidden = !cloudStore;
    }).catch(function () {});
  }
  function syncCloudStorage(manual) {
    if (!cloudStore || cloudBusy) return Promise.resolve(false);
    cloudBusy = true; setText('save-status', '正在同步云存档');render();
    var token=++cloudRequest;
    var ready = cloudEnabled && !manual ? Promise.resolve(null) : deadline(function(){return cloudStore.load();});
    return ready.then(function (remote) {
      if(token!==cloudRequest)throw new Error('过期同步');
      if (remote && (Number(remote.savedAt) || 0) > state.savedAt) {
        state = mergeState(cloneState(), remote); clockPhaseStartedAt = Date.now(); render();
        return saveState(false).then(function (ok) { if (!ok) throw new Error('云端已读取，本机保存失败'); return true; });
      }
      var copy = JSON.parse(JSON.stringify(state)); copy.savedAt = Date.now();
      return deadline(function(){return cloudStore.save(copy);});
    }).then(function () {
      cloudEnabled = true; lastCloudSave = Date.now(); setText('save-status', '云端已同步');
      if (manual) showToast('云存档已同步，同账号换设备可以恢复。'); return true;
    }).catch(function (error) {
      var unauthorized = Number(error.errCode) === 1006;
      if (unauthorized) { document.getElementById('cloud-save-button').hidden = true; cloudStore = null; }
      setText('save-status', unauthorized ? '本机存档 · 云端待开通' : '本机存档 · 云同步未完成');
      if (manual) showToast(unauthorized ? '云存档尚未开通，请先申请平台权限；本机进度仍可保存。' : '云存档未同步成功，本机进度保留；请稍后重试。');
      return false;
    }).then(function (ok) { cloudBusy = false;cloudRequest+=1;render();return ok; });
  }
  function mergeState(base, saved) {
    Object.keys(base).forEach(function (key) { if (saved[key] !== undefined && ['upgrades', 'sheep', 'worker', 'contracts', 'tutorial', 'breeds','feeds'].indexOf(key) < 0) base[key] = saved[key]; });
    base.day = Math.max(0, (Number(saved.day) || 0) - (saved.calendarVersion === 1 ? 0 : 8));
    base.calendarVersion = 1;
    base.dayPhase = Math.max(0, Math.min(14, Math.floor(Number(base.dayPhase) || 0)));
    if (saved.upgrades) Object.keys(base.upgrades).forEach(function (key) { if (saved.upgrades[key] !== undefined) base.upgrades[key] = Number(saved.upgrades[key]) || 0; });
    base.level = Math.max(1, Math.min(levelMeta.length, Math.floor(Number(saved.level) || 1)));
    if (saved.progressionVersion !== 1) Object.keys(base.upgrades).forEach(function (key) { if (base.upgrades[key]) base.level = Math.max(base.level, upgradeLevels[key] || 1); });
    base.progressionVersion = 1;
    base.savings = Math.max(0, Math.floor(Number(saved.savings) || 0));
    // Legacy retired saves without a stored amount used the former 100-million goal.
    if (saved.retirementClaimed && saved.savings === undefined) base.savings = 100000000;
    base.retired = base.savings >= RETIREMENT_GOAL;
    Object.keys(breedMeta).forEach(function (key) { base.breeds[key] = key === 'normal' || !!(saved.breeds && saved.breeds[key]); });
    if (Array.isArray(saved.woolDrops)) base.woolDrops = saved.woolDrops.map(function (drop) { return { id: drop.id || 'drop-' + Date.now(), x: Number(drop.x) || 50, y: Number(drop.y) || 50, amount: Number(drop.amount) || .8 }; });
    if (saved.boxes) Object.keys(base.boxes).forEach(function (key) { if (saved.boxes[key] !== undefined) base.boxes[key] = Number(saved.boxes[key]) || 0; });
    base.workshopUnlocked = Boolean(saved.workshopUnlocked || (saved.upgrades && saved.upgrades.workshop > 0));
    if (saved.workshop) { base.workshop.recipe = saved.workshop.recipe === 'meat' ? 'meat' : 'wool'; base.workshop.progress = Number(saved.workshop.progress) || 0; base.workshop.running = Boolean(saved.workshop.running); }
    if (saved.conveyor) ['wool', 'meat'].forEach(function (key) { if (saved.conveyor[key]) { base.conveyor[key].progress = Number(saved.conveyor[key].progress) || 0; base.conveyor[key].running = Boolean(saved.conveyor[key].running); } });
    if (saved.order) { base.order.type = saved.order.type === 'meat' ? 'meat' : 'wool'; base.order.qty = Number(saved.order.qty) || 2; base.order.reward = Number(saved.order.reward) || (base.order.type === 'meat' ? 720 : 420); }
    if (saved.worker) {
      Object.keys(base.worker).forEach(function (key) { if (saved.worker[key] !== undefined) base.worker[key] = saved.worker[key]; });
      if (['idle', 'walking', 'picking', 'carrying', 'unloading'].indexOf(base.worker.mode) < 0) base.worker.mode = 'idle';
      base.worker.carry = Math.max(0, Number(base.worker.carry) || 0); base.worker.count = Math.max(0, Number(base.worker.count) || 0);
    }
    base.contracts = contractsEngine.normalize(saved.contracts,base.level,saved.tradeOrder);
    ['wool','growth'].forEach(function (kind) {base.feeds[kind] = Math.max(0,Math.min(kind==='wool'?30:45,Math.floor(Number(saved.feeds && saved.feeds[kind]) || 0)));});
    base.tutorial = saved.tutorial ? {seen:!!saved.tutorial.seen,done:!!saved.tutorial.done,steps:[0,1,2,3].map(function (i) {return !!(saved.tutorial.steps && saved.tutorial.steps[i]);})} : {seen:true,done:true,steps:[true,true,true,true]};
    base.tutorial.supplies={hay:!!(base.tutorial.steps[0] || saved.tutorial&&saved.tutorial.supplies&&saved.tutorial.supplies.hay),water:!!(base.tutorial.steps[0] || saved.tutorial&&saved.tutorial.supplies&&saved.tutorial.supplies.water)};
    base.sheep = saved.sheep.map(function (sheep, index) {
      var positions = [{ x: 16, y: 24 }, { x: 78, y: 20 }, { x: 41, y: 58 }, { x: 68, y: 68 }], pos = positions[index % positions.length];
      var breed = breedMeta[sheep.breed] ? sheep.breed : 'normal';
      if (breed !== 'normal' && !saved.breeds) base.breeds[breed] = true;
      return { id: sheep.id || 's' + (index + 1), breed: breed, name: sheep.name || sheepNames[index % sheepNames.length], age: Math.max(0, Number(sheep.age) || 0), hunger: Number(sheep.hunger) || 0, thirst: Number(sheep.thirst) || 0, wool: Number(sheep.wool) || 0, zone: Number(sheep.zone) || (index % 4), x: Math.max(13, Math.min(87, Number(sheep.x) || pos.x)), y: Math.max(18, Math.min(78, Number(sheep.y) || pos.y)), direction: Number(sheep.direction) < 0 ? -1 : 1, action: 'idle', actionUntil: 0 };
    });
    if(base.sheep.some(function (s) {return s.breed==='gift';})) base.workshopUnlocked = true;
    if(base.sheep.some(function (s) {return s.breed==='wish';})) base.contracts.specialUnlocked = true;
    // Existing flocks keep their rainbow sheep; future purchases still respect the new cap.
    base.contracts.rainbowLimit = Math.min(5,Math.max(base.contracts.rainbowLimit,base.sheep.filter(function (s) {return s.breed==='rainbow';}).length));
    return base;
  }
  function saveState(showMessage, reason) {
    if (platformStorage && !storageHydrated) { pendingPlatformSave = true; if (showMessage) showToast('正在读取账号进度，请稍候。'); return Promise.resolve(false); }
    var snapshot = JSON.parse(JSON.stringify(state)), savedAt = Date.now(); snapshot.savedAt = savedAt;
    var serialized = JSON.stringify(snapshot);
    var automatic = reason === 'auto' || reason === 'lifecycle';
    saveStatus = automatic ? '自动保存中' : '保存中';
    var operation = saveQueue.then(function () {
      if (platformStorage) return writePlatformState(serialized);
      // This branch is only for the separate local browser preview.
      if (window.xhs) return false;
      try { if (!window.localStorage) return false; window.localStorage.setItem(SAVE_KEY, serialized); return true; } catch (error) { return false; }
    }).then(function (ok) {
      if (ok) { state.savedAt = Math.max(state.savedAt, savedAt); saveStatus = automatic ? '自动已保存' : '本机已保存'; setText('last-save', relativeSave(state.savedAt)); }
      else saveStatus = '保存失败，请重试';
      setText('save-status', saveStatus);
      if (showMessage) showToast(ok ? '进度已保存。' : '保存失败，当前进度尚未落盘，请稍后重试。');
      if (ok && cloudEnabled && !cloudBusy && Date.now() - lastCloudSave >= 60000) syncCloudStorage(false);
      return ok;
    });
    saveQueue = operation.catch(function () { return false; });
    render();
    return operation;
  }
  function autoSave() {
    if ((platformStorage && !storageHydrated) || cloudBusy) return Promise.resolve(false);
    var now = Date.now();
    if (now - lastAutoSaveRequest < AUTO_SAVE_INTERVAL - 1000) return Promise.resolve(false);
    lastAutoSaveRequest = now;
    return saveState(false, 'auto');
  }
  function saveOnLifecycle() {
    var now = Date.now();
    if (now - lastLifecycleSave < 2000) return;
    lastLifecycleSave = now;
    saveState(false, 'lifecycle');
  }
  function handleVisibilityChange() {
    if (document.visibilityState === 'hidden') saveOnLifecycle();
  }
  function number(value, digits) { return Number(value).toFixed(digits === undefined ? 0 : digits); }
  function gold(value) { return Math.round(value).toLocaleString('zh-CN'); }
  function formatIncome(value) { return gold(Math.floor(value)); }
  function bookIncome(amount) {
    var income = Math.max(0, Number(amount) || 0);
    state.gold += income; state.earned += income;
  }
  function depositSavings(amount) {
    var text = String(amount === undefined ? document.getElementById('deposit-amount').value : amount).trim();
    if (!/^\d+$/.test(text)) { showToast('请输入要存入的整数金额。'); return false; }
    var value = Number(text);
    if (!Number.isSafeInteger(value) || !Number.isSafeInteger(state.savings + value) || value <= 0 || value > Math.floor(state.gold)) { showToast('存入金额需要大于 0，且不能超过钱包余额。'); return false; }
    state.gold -= value; state.savings += value;
    state.retired = state.savings >= RETIREMENT_GOAL;
    document.getElementById('deposit-amount').value = '';
    render(); saveState(false); showToast('已存入退休金 ¥' + gold(value) + (state.retired ? ' · 退休目标达成！' : '。'));
    return true;
  }
  function levelUp() {
    var next = levelMeta[farmLevel()];
    if (!next) return false;
    if (state.earned < next.income) { showToast('累计营业收入达到 ¥' + gold(next.income) + ' 后才能升级。'); return false; }
    if (state.gold < next.cost) { showToast('牧场升级需要钱包余额 ¥' + gold(next.cost) + '。'); return false; }
    state.gold -= next.cost; state.level += 1;
    contractsEngine.ensureSlots(state.contracts,state.level);
    render(); saveState(false); showToast('牧场升至 LV' + state.level + ' · 可解锁' + next.opens);
    return true;
  }
  function unlockBreed(key) {
    var meta = breedMeta[key];
    if (!meta || state.breeds[key]) return false;
    if (farmLevel() < meta.level || state.gold < meta.unlock) { showToast('需要 LV' + meta.level + ' 和 ¥' + gold(meta.unlock) + ' 解锁费。'); return false; }
    state.gold -= meta.unlock; state.breeds[key] = true;
    render(); saveState(false); showToast(meta.name + '品种已解锁，现在可以购买羊仔。'); return true;
  }
  function retire() {
    if (state.savings < RETIREMENT_GOAL) { showToast('退休积蓄还差 ¥' + formatIncome(RETIREMENT_GOAL - state.savings) + '。'); return; }
    state.retired = true; state.retirementClaimed = true; saveState(false);
    var modal = document.getElementById('modal');
    document.getElementById('modal-kicker').textContent = '一千万退休计划';
    document.getElementById('modal-title').textContent = '羊场交给下一代';
    document.getElementById('modal-copy').textContent = '你带着攒下的积蓄退休，故事停在自己亲手经营好的牧场。';
    document.getElementById('modal-body').innerHTML = '<div class="retirement-ending"><span class="ending-sheep">♧</span><strong>¥' + formatIncome(state.savings) + '</strong><small>这座羊场，会记得你回来过。</small></div>';
    modal.hidden = false;resetModalScroll();
  }
  function capacity() { return Math.min(20,6 + state.upgrades.capacity * 2) + state.contracts.flockBonus; }
  function rainbowCount() { return state.sheep.filter(function (s) {return s.breed==='rainbow';}).length; }
  function hayCapacity() { return Math.round((40 + state.upgrades.capacity * 5 + state.upgrades.hayBarn * 12) * supplyScale()); }
  function waterCapacity() { return Math.round((40 + state.upgrades.capacity * 5 + state.upgrades.cistern * 12) * supplyScale()); }
  function tradeBonus() { return 1 + state.upgrades.merchant * .08; }
  function woolPrice() { return Math.round((56 + state.upgrades.wool * 7) * tradeBonus()); }
  function meatPrice() { return Math.round(118 * (1 + state.upgrades.meat * .15) * tradeBonus()); }
  function customerBonuses() { return contractsEngine.bonuses(state.contracts.satisfaction); }
  function upgradeCost(key) { return Math.round(upgradeMeta[key].base * [1,2.25,4.5,8,12,18,26][Math.min(6,state.upgrades[key])] / 10) * 10; }
  function recipeUnitPrice(type) { var meta = recipeMeta[type],stage=Math.max(0,farmLevel()-1); return Math.max(Math.ceil(meta.price*(1+stage*.04)),Math.ceil(meta.amount * (type === 'wool' ? woolPrice() : meatPrice()) * (1.25+stage*.03))); }
  function specialFeedPrice(kind) { return (kind==='wool'?500:800)*[1,1,1,2,4,8,16,32][Math.min(7,Math.max(0,farmLevel()-1))]; }
  function buySpecialFeed(kind) {
    if(['wool','growth'].indexOf(kind)<0||farmLevel()<3) {showToast('牧场 LV3 后开放特殊精料。');return false;}
    if(state.feeds[kind]>0) {showToast('这份精料正在生效，效果不叠加。');return false;}
    var price=specialFeedPrice(kind);if(state.gold<price) {showToast('特殊精料需要 ¥'+gold(price)+'，先留好日常补给钱。');return false;}
    state.gold-=price;state.feeds[kind]=kind==='wool'?30:45;render();saveState(false);showToast(kind==='wool'?'长绒精料生效：长毛速度 +20%，持续 120 秒。':'成长精料生效：幼羊成长 +30%，持续 180 秒。');return true;
  }
  function renderSpecialFeeds() {
    var panel=document.getElementById('special-feed-panel');if(panel)panel.hidden=farmLevel()<3;
    ['wool','growth'].forEach(function(kind){var active=state.feeds[kind]>0,button=document.querySelector('[data-feed-kind="'+kind+'"]');setText(kind+'-feed-price','¥'+gold(specialFeedPrice(kind)));setText(kind+'-feed-time',active?'剩余 '+state.feeds[kind]*4+' 秒':'未使用');if(button){button.disabled=!!(platformStorage&&!storageHydrated)||active||state.gold<specialFeedPrice(kind);button.textContent=active?'生效中':'购买使用';}});
  }
  function orderReward() { return Math.max(state.order.reward,Math.ceil(state.order.qty * recipeUnitPrice(state.order.type) * 1.15)); }
  function farmLevel() { return state.level; }
  function featureLevel(key) { return upgradeLevels[key] || 1; }
  function flockBonus(breed) { return 1 + Math.min(3, state.sheep.filter(function (s) { return s.breed === breed; }).length) * .2; }
  function isAdult(sheep) { return sheep.age >= 60; }
  function canShear(sheep) { return sheep.wool >= 100; }
  function readyAdults() { return state.sheep.filter(isAdult); }
  function readySheep() { return state.sheep.filter(canShear); }
  function find(id) { return state.sheep.filter(function (sheep) { return sheep.id === id; })[0]; }
  function esc(value) { return String(value).replace(/[&<>"']/g, function (char) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]; }); }

  function showToast(message) {
    var toast = document.getElementById('toast');
    toast.textContent = message; toast.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2500);
  }
  function setText(id, text) { var node = document.getElementById(id); if (node) node.textContent = text; }
  function setFill(id, value) {
    var node = document.getElementById(id);
    if (node) node.style.height = Math.max(0, Math.min(100, value)).toFixed(1) + '%';
  }
  function renderSupplies() {
    ['hay', 'water'].forEach(function (type) {
      var limit = type === 'hay' ? hayCapacity() : waterCapacity();
      var label = type === 'hay' ? '干草槽' : '清水槽';
      var button = document.querySelector('.' + type + '-station');
      var full = state[type] >= limit;
      setText(type + '-value', Math.floor(state[type]));
      setText(type + '-capacity', limit);
      setFill(type + '-fill', state[type] / limit * 100);
      var price = refillPrice(), priceNode = button.querySelector('.refill-price');
      if(priceNode) priceNode.textContent = '+1格 ¥' + price;
      button.setAttribute('aria-label', label + '，' + Math.floor(state[type]) + '/' + limit + '，点击花费 ' + price + ' 金币补充一格');
      button.title = full ? label + '已满' : '点击补一格 · ¥' + price + ' · +' + number(limit/10,1);
      button.classList.toggle('full', full);
    });
  }

  function render() {
    renderClock();
    setText('weather-icon', isNight() ? '☾' : '☀');
    if (document.body && document.body.classList) document.body.classList.toggle('night-mode', isNight());
    if (document.getElementById('pasture-scene')) document.getElementById('pasture-scene').classList.toggle('night-mode', isNight());
    setText('gold-value', gold(state.gold)); setText('sheep-count', state.sheep.length); setText('sheep-capacity', '/ ' + capacity());
    setText('happiness-value', Math.round(state.happiness) + '%');
    renderSupplies();
    setText('wool-stock', number(state.wool, 1)); setText('meat-stock', number(state.meat, 1)); setText('wool-price', woolPrice()); setText('meat-price', meatPrice());
    setText('wool-quality', '+' + (state.upgrades.wool * 10) + '%'); setText('meat-quality', '+' + (state.upgrades.meat * 15) + '%'); setText('farm-level', farmLevel());
    setText('shear-ready', readySheep().length + ' 只可剪'); setText('butcher-ready', readyAdults().length + ' 只可出栏');
    setText('last-save', state.savedAt ? relativeSave(state.savedAt) : '尚未保存'); setText('save-status', saveStatus);
    var progress = Math.min(100, Math.max(0, state.savings / RETIREMENT_GOAL * 100));
    setText('retirement-income', '¥' + formatIncome(state.savings));
    setText('savings-short', '¥' + formatIncome(state.savings));
    setText('deposit-available', '钱包可用 ¥' + gold(Math.floor(state.gold)));
    setText('lifetime-income', '累计收入 ¥' + gold(Math.floor(state.earned)));
    setText('retirement-percent', progress >= 100 ? '目标达成' : (progress < .1 && state.savings > 0 ? '<0.1%' : progress.toFixed(1) + '%'));
    document.getElementById('retirement-fill').style.width = progress + '%';
    document.querySelector('.retirement-meter').setAttribute('aria-valuenow', Math.floor(Math.min(RETIREMENT_GOAL, state.savings)));
    document.getElementById('retire-action').hidden = state.savings < RETIREMENT_GOAL || state.retirementClaimed;
    renderSheep(); renderDrops(); renderWorker(); renderTable(); renderUpgrades(); renderTradeOrder(); renderWorkshop(); renderControls(); renderProgression(); renderBreeds();renderSpecialFeeds();
    if (grassField) grassField.attach();
    if (saleModalOpen) renderButcherChoices();
    document.getElementById('pasture-clover').hidden = !state.upgrades.clover;
    document.getElementById('shade-tree').hidden = !state.upgrades.shade;
    var tip = tips[state.cycle % tips.length]; setText('tip-text', tip);
    var sleeping = state.sheep.filter(function (s) { return s.action === 'sleeping'; }).length;
    var sceneStatus = state.sheep.some(function (s) { return s.hunger < 35 || s.thirst < 35; }) ? '有羊羔口渴了，记得照看它们' : (isNight() ? state.sheep.length && sleeping === state.sheep.length ? '夜深了，羊群正在睡觉' : '夜幕降临，羊群准备休息' : (readySheep().length ? '羊毛蓬松得像云朵，可以开剪啦' : '羊群正在自由吃草'));
    setText('scene-status', sceneStatus);
  }
  function renderControls() {
    var ready = readySheep().length, adults = readyAdults().length, free = capacity() - state.sheep.length;
    var nextWool = state.sheep.reduce(function (max, sheep) { return Math.max(max, sheep.wool); }, 0);
    var loading = platformStorage && !storageHydrated;
    var notice=document.getElementById('storage-notice');if(notice)notice.hidden=!(loading||cloudBusy);
    var retry=document.querySelector('[data-action="retry-storage"]');if(retry)retry.disabled=cloudBusy;
    setText('storage-notice-copy',cloudBusy?'正在同步云存档，请稍候；超时会自动恢复操作。':saveStatus==='存档读取失败'?'读档未完成，经营已暂停以保护旧进度。请点重试。':'正在读取账号进度，完成后即可经营。');
    var shearButton = document.querySelector('[data-action="shear"]'), buyButton = document.querySelector('[data-action="buy"]'), butcherButton = document.querySelector('[data-action="butcher"]');
    shearButton.disabled = loading || !ready; shearButton.classList.toggle('is-ready', ready > 0);
    shearButton.title = ready ? '剪下羊毛后，点击草地上的羊毛拾取' : '羊毛生长到 100% 后可剪';
    // Browsing the nursery stays available even when the pen or wallet is full/empty.
    buyButton.disabled = loading;
    setText('buy-price', '选羊种 · ¥' + breedMeta.normal.price + ' 起');
    butcherButton.disabled = loading || !adults; butcherButton.classList.toggle('is-ready', adults > 0);
    setText('shear-ready', ready ? ready + ' 只可剪' : '长毛 ' + Math.floor(nextWool) + '%');
    setText('shear-hint', ready ? '剪下后点击草地拾取' : '羊毛长满后再开剪');
    setText('buy-hint', free <= 0 ? '羊圈已满，仍可查看羊种' : '羊圈还有 ' + free + ' 个空位');
    setText('butcher-ready', adults ? adults + ' 只成年' : '小羊成长中');
    setText('butcher-hint', adults ? '选择成年羊换取羊肉' : '长到 60 日龄可出栏');
    document.getElementById('shear-progress').style.width = Math.min(100, nextWool) + '%';
    ['wool', 'meat'].forEach(function (type) {
      var button = document.querySelector('[data-action="sell-' + type + '"]');
      button.disabled = loading || state[type] <= 0;
      setText(type + '-revenue', state[type] > 0 ? '+¥' + gold(state[type] * (type === 'wool' ? woolPrice() : meatPrice())) : '暂无可售');
    });
    var step = 1, title = '先给羊添一次草或水', copy = '点击两侧槽位，每次补一格并消耗金币。';
    if (!state.sheep.length) { title = '羊圈空了，先购入一只小羊'; copy = '点购入按钮，每只小羊需要 ¥' + breedMeta.normal.price + '。'; }
    else if (state.hay < hayCapacity() * .2 || state.water < waterCapacity() * .2) { title = '补给见底了，先添草加水'; }
    else if (state.woolDrops.length) { step = 3; title = '草地上有 ' + state.woolDrops.length + ' 堆羊毛待拾取'; copy = state.upgrades.worker ? '雇工正在搬运，你也可以点击羊毛帮忙。' : '点击草地上的羊毛，收进仓库再卖。'; }
    else if (ready) { step = 2; title = ready + ' 只羊可以剪毛了'; copy = '点金色剪毛按钮，羊毛会掉在草地上。'; }
    else if (state.wool > 0 || state.meat > 0) { step = 4; title = '仓库有货，去集市出售'; copy = '收入进入钱包；可用于升级、购买羊仔或存入退休金。'; }
    else if (state.careDone || state.cycle > 0) { step = 2; title = '羊毛正在生长 · ' + Math.floor(nextWool) + '%'; copy = '羊会自己寻找草和水；长满后剪毛按钮会亮起。'; }
    if (loading) { title = '正在读取你的羊场'; copy = '读取完成后开始经营，避免覆盖已有进度。'; }
    setText('guide-title', title); setText('guide-copy', copy); setText('guide-step', '0' + step + ' / 04');
    renderTutorialGuide();
    document.querySelector('.hay-station').classList.toggle('supply-attention', state.hay < hayCapacity() * .2);
    document.querySelector('.water-station').classList.toggle('supply-attention', state.water < waterCapacity() * .2);
  }
  function relativeSave(time) { var seconds = Math.max(0, Math.floor((Date.now() - time) / 1000)); return seconds < 8 ? '刚刚' : seconds < 60 ? seconds + ' 秒前' : Math.floor(seconds / 60) + ' 分钟前'; }
  function sheepPose(sheep) {
    var action = sheep.action || 'idle';
    return action === 'walking' ? 'walk' : action === 'sitting' ? 'sit' : action === 'lying' ? 'lie' : action === 'sleeping' ? 'sleep' : action === 'drinking' ? 'drink' : action === 'eating' || action === 'grazing' ? 'eat' : 'idle';
  }
  function sheepArtPrefix(sheep) { return './assets/sheep/' + (isAdult(sheep) ? 'adult' : 'young') + '-' + (sheep.breed || 'normal') + '-' + (sheep.wool > 0 ? 'wool' : 'shorn'); }
  function sheepImage(sheep, time) {
    var now = typeof time === 'number' ? time : Date.now(), pose = sheepPose(sheep), key = sheepArtPrefix(sheep) + '-' + pose;
    var animation = sheepAnimations[sheep.id];
    if (!animation || animation.key !== key) animation = sheepAnimations[sheep.id] = {key:key, started:now};
    var elapsed = Math.max(0, now - animation.started), sequence = sheepSequences[pose];
    var frame = pose === 'idle' || pose === 'sit' ? (elapsed % 4200 >= 4060 ? 1 : 0) : Math.floor(elapsed / sequence[1]) % sequence[0];
    return key + '-' + frame + '.png';
  }
  function sheepArtSource(sheep,time) {var path=sheepImage(sheep,time);return window.FarmSheepFrames ? window.FarmSheepFrames.resolve(path) : path;}
  function preloadSheepArt(sheep) {
    var prefix = sheepArtPrefix(sheep);
    if(window.FarmSheepFrames){window.FarmSheepFrames.preload(prefix);return;}
    if (sheepArtCache[prefix]) return;
    sheepArtCache[prefix] = [];
    Object.keys(sheepSequences).forEach(function (pose) {
      for (var i = 0; i < sheepSequences[pose][0]; i += 1) {
        var image = document.createElement('img'); image.src = prefix + '-' + pose + '-' + i + '.png'; sheepArtCache[prefix].push(image);
      }
    });
  }
  function animateSheepFrames() {
    if (document.hidden || (platformStorage && !storageHydrated) || cloudBusy) return;
    state.sheep.forEach(function (sheep) {
      var art = document.querySelector('[data-sheep-id="' + sheep.id.replace(/"/g, '') + '"] .sheep-art');
      var source = sheepArtSource(sheep);
      if (art && art.getAttribute('src') !== source) art.setAttribute('src', source);
    });
  }
  function sheepClass(sheep) { return 'sheep ' + (sheep.action || 'idle') + (sheep.wool > 0 ? ' woolly' : ' sheared') + (isAdult(sheep) ? ' adult-sheep' : ' young-sheep') + ' breed-' + (sheep.breed || 'normal'); }
  function sheepFeet(sheep) { return isAdult(sheep) ? 21 : 20; }
  function grassActors() {
    var actors = state.sheep.map(function (sheep) { return { id:'sheep-' + sheep.id, x:sheep.x, y:sheep.y, feet:sheepFeet(sheep), direction:sheep.direction }; });
    if (state.upgrades.worker) actors.push({ id:'farm-worker', x:state.worker.x, y:state.worker.y, feet:8, direction:state.worker.direction });
    return actors;
  }
  function renderSheep() {
    var field = document.getElementById('sheep-field');
    var height = field.getBoundingClientRect().height;
    var alive = {}; state.sheep.forEach(function (sheep) { alive[sheep.id] = true; preloadSheepArt(sheep); });
    Object.keys(sheepAnimations).forEach(function (id) { if (!alive[id]) delete sheepAnimations[id]; });
    var nodes=Object.create(null);
    Array.prototype.forEach.call(field.querySelectorAll('[data-sheep-id]'),function(n){var id=n.getAttribute('data-sheep-id');if(!alive[id])n.remove();else nodes[id]=n;});
    state.sheep.forEach(function(sheep){
      var node=nodes[sheep.id];
      if(!node){node=document.createElement('div');node.setAttribute('data-sheep-id',sheep.id);node.innerHTML='<span class="sheep-emoji" aria-hidden="true"><img class="sheep-art" width="52" height="52" alt="" draggable="false"></span><span class="sleep-z" aria-hidden="true">💤</span>';field.appendChild(node);}
      node.className=sheepClass(sheep);node.style.left=sheep.x.toFixed(2)+'%';node.style.top=sheep.y.toFixed(2)+'%';node.style.zIndex=Math.round(sheep.y*height/100+sheepFeet(sheep)-1);node.style.setProperty('--flip',sheep.direction);
      var img=node.querySelector('.sheep-art'),src=sheepArtSource(sheep);if(img.getAttribute('src')!==src)img.setAttribute('src',src);
    });
  }
  function renderDrops() {
    var field = document.getElementById('sheep-field');
    var nodes=Object.create(null);
    Array.prototype.forEach.call(field.querySelectorAll('.wool-drop'),function(n){var id=n.getAttribute('data-drop-id');if(!state.woolDrops.some(function(d){return d.id===id;}))n.remove();else nodes[id]=n;});
    state.woolDrops.forEach(function (drop) {
      var button = nodes[drop.id];if(!button){button=document.createElement('button');button.type='button';button.className='wool-drop';button.setAttribute('data-drop-id',drop.id);button.innerHTML='<span class="wool-drop-sprite"></span>';field.appendChild(button);}button.style.left=drop.x.toFixed(1)+'%';button.style.top=drop.y.toFixed(1)+'%';button.setAttribute('aria-label','拾取 '+number(drop.amount,1)+' kg 羊毛');
    });
  }
  function renderTable() {
    var table = document.getElementById('sheep-table');
    table.innerHTML = state.sheep.map(function (sheep, index) {
      var status = canShear(sheep) ? '<span class="row-tag ready">羊毛可收</span>' : isAdult(sheep) ? '<span class="row-tag adult">已成年</span>' : '<span class="row-tag">成长中</span>';
      var ageLabel = isAdult(sheep) ? '成年 · ' + Math.floor(sheep.age) + ' 日龄' : '幼羊 · ' + Math.floor(sheep.age) + ' 日龄';
      return '<div class="sheep-row"><span class="row-avatar"><img class="flock-portrait" src="' + sheepArtSource(sheep) + '" alt=""></span><div><span class="row-name">' + breedMeta[sheep.breed || 'normal'].name + ' #' + (index + 1) + '</span><span class="row-meta">' + ageLabel + ' · 饱腹 ' + Math.round(sheep.hunger) + '%</span></div><div class="meter"><span style="width:' + Math.min(100, sheep.wool) + '%"></span></div>' + status + '</div>';
    }).join('');
  }
  function renderUpgrades() {
    var list = document.getElementById('upgrade-list');
    var html = upgradeGroups[activeUpgradeGroup].map(function (key) {
      var meta = upgradeMeta[key], level = state.upgrades[key], cost = upgradeCost(key), maxed = level >= meta.max, required = featureLevel(key), locked = farmLevel() < required && !level;
      if (locked) return required === farmLevel() + 1 ? '<div class="locked-feature"><span>▣</span><div><strong>' + meta.name + '</strong><small>牧场 LV' + required + ' 后开放 · 再花费 ¥' + cost + ' 解锁</small></div></div>' : '';
      var prerequisite = meta.requires && !state.upgrades[meta.requires];
      var dots = ''; for (var i = 0; i < meta.max; i += 1) dots += '<i class="' + (i < level ? 'filled' : '') + '"></i>';
      var symbols = { capacity: 'barn', feeder: 'hay', wool: 'sheep', growth: 'clover', meat: 'meat', worker: 'worker', boots: 'worker', basket: 'order', hayBarn: 'hay', cistern: 'water', clover: 'clover', shade: 'tree', shears: 'shear', merchant: 'market', workshop: 'barn' };
      var unaffordable = state.gold < cost;
      return '<div class="upgrade-item"><span class="upgrade-symbol"><span class="px-icon icon-' + symbols[key] + '" aria-hidden="true"></span></span><div class="upgrade-copy"><strong>' + meta.name + '<span class="upgrade-level">' + level + '/' + meta.max + '</span></strong><small>' + (maxed ? meta.desc(level) : '下一级：' + meta.desc(level + 1)) + '</small><span class="level-dots">' + dots + '</span></div><button class="upgrade-button" type="button" data-upgrade="' + key + '" ' + (maxed || locked || prerequisite || unaffordable ? 'disabled' : '') + ' title="' + (unaffordable && !maxed ? '还差 ¥' + gold(cost - state.gold) : '升级立即生效') + '">' + (maxed ? (meta.max === 1 ? '已解锁' : '已满级') : prerequisite ? '先雇工' : locked ? '需 LV' + meta.unlockAt : '升级<br>¥' + gold(cost)) + '</button></div>';
    }).join('') || '<p class="progression-note">继续提升牧场等级，逐步开放这里的新设施。</p>';
    listHTML(list,html);
    document.getElementById('staff-status').hidden = activeUpgradeGroup !== 'staff' || !state.upgrades.worker;
  }
  function renderProgression() {
    var next = levelMeta[farmLevel()], loading = platformStorage && !storageHydrated;
    setText('current-level', 'LV' + farmLevel());
    setText('level-next-title', next ? '下一等级 · LV' + (farmLevel() + 1) : '牧场已达最高等级');
    setText('level-next-copy', next ? '开放：' + next.opens : '全部成长路线已开放，继续经营攒退休金。');
    setText('level-requirement', next ? '累计收入 ¥' + gold(Math.floor(state.earned)) + ' / ¥' + gold(next.income) : '全部等级达成');
    var button = document.getElementById('level-up-button');
    button.disabled = loading || !next || state.earned < next.income || state.gold < next.cost;
    button.textContent = next ? '升到 LV' + (farmLevel() + 1) + ' · ¥' + gold(next.cost) : '等级已满';
    var ordersLocked = farmLevel() < 3;
    document.getElementById('order-content').hidden = ordersLocked;
    document.getElementById('order-locked').hidden = !ordersLocked;
    document.getElementById('late-workshop').hidden = !state.workshopUnlocked;
    setText('flock-bonus', '羊种光环：长毛 +' + Math.round((flockBonus('mint') - 1) * 100) + '% · 成长 +' + Math.round((flockBonus('peach') - 1) * 100) + '%；客户加成：产毛 +' + number((customerBonuses().yield-1)*100,1) + '% · 长毛 +' + number((customerBonuses().growth-1)*100,2) + '%');
  }
  function breedCards() {
    var loading=platformStorage && !storageHydrated;
    var html = Object.keys(breedMeta).map(function (key) {
      var meta = breedMeta[key], unlocked = state.breeds[key], locked = farmLevel() < meta.level;
      var canBuy = state.gold >= meta.price && state.sheep.length < capacity() && (key!=='rainbow'||rainbowCount()<state.contracts.rainbowLimit);
      var reason=loading?'存档读取中':locked?'需要牧场 LV'+meta.level:unlocked?state.sheep.length>=capacity()?'羊圈已满':key==='rainbow'&&rainbowCount()>=state.contracts.rainbowLimit?'彩虹名额已满':state.gold<meta.price?'还差 ¥'+gold(meta.price-state.gold):'':state.gold<meta.unlock?'解锁还差 ¥'+gold(meta.unlock-state.gold):'';
      return '<div class="breed-card breed-' + key + (locked ? ' future-breed' : '') + '"><img src="./assets/sheep/young-' + key + '-wool-idle.png" width="64" height="64" alt="' + meta.name + '羊仔"><div><strong>' + meta.name + '</strong><small>' + meta.desc + (key==='rainbow'?'<br>当前名额 '+rainbowCount()+'/'+state.contracts.rainbowLimit+'（订单最多扩至 5 只）':'') + '</small><details class="breed-tip"><summary>什么时候值得买？</summary><p>'+esc(window.FarmHelp.breedTip(key))+'</p></details><em>LV' + meta.level + (meta.unlock ? ' · 解锁 ¥' + gold(meta.unlock) : ' · 无需解锁') + '<br>羊仔 ¥' + gold(meta.price) + ' / 只</em>'+(reason?'<span class="purchase-reason">'+reason+'</span>':'')+'</div><button type="button" ' + (unlocked ? 'data-buy-breed="' + key + '"' : 'data-unlock-breed="' + key + '"') + (loading || locked || (unlocked ? !canBuy : state.gold < meta.unlock) ? ' disabled' : '') + '>' + (locked ? 'LV' + meta.level + '开放' : unlocked ? key==='rainbow'&&rainbowCount()>=state.contracts.rainbowLimit?'彩虹羊名额已满':'购买羊仔<br>¥' + gold(meta.price) : '解锁品种<br>¥' + gold(meta.unlock)) + '</button></div>';
    }).join('');
    if (state.contracts.pendingRainbow) html = '<div class="rainbow-claim"><img src="./assets/sheep/young-rainbow-wool-idle.png" alt="彩虹羊仔"><div><strong>订单奖励 · 彩虹羊仔 ×1</strong><small>' + (farmLevel()<8?'奖励已保留，达到 LV8 后领取。':rainbowCount()>=state.contracts.rainbowLimit?'彩虹羊名额已满，先扩容或腾出名额。':state.sheep.length >= capacity() ? '羊圈已满，扩建或腾出空位后领取。' : '已为你保留，领取后加入羊群。') + '</small></div><button type="button" data-action="claim-rainbow"' + (farmLevel()<8 || rainbowCount()>=state.contracts.rainbowLimit || state.sheep.length >= capacity() || loading ? ' disabled' : '') + '>领取羊仔</button></div>' + html;
    return html;
  }
  function renderBreeds() {
    var html = breedCards(), inline = document.getElementById('breed-list'), nursery = document.getElementById('nursery-list');
    listHTML(inline,html);listHTML(nursery,html);
  }
  function openNursery() {
    document.getElementById('modal-kicker').textContent = '羊种商店 · LV' + farmLevel();
    document.getElementById('modal-title').textContent = '挑一只羊仔回家';
    document.getElementById('modal-copy').textContent = '幼羊能长毛和剪毛；长到 60 日龄后才可出栏。特殊品种需先解锁，再购买羊仔。';
    document.getElementById('modal-body').innerHTML = '<div id="nursery-list">' + breedCards() + '</div>';
    document.getElementById('modal').hidden = false;resetModalScroll();
  }
  function tutorialStep() { return state.tutorial.steps.indexOf(false) < 0 ? 4 : state.tutorial.steps.indexOf(false); }
  function advanceTutorial(index,supply) {
    if (state.tutorial.done) return;
    if(index===0){state.tutorial.supplies[supply]=true;if(!state.tutorial.supplies.hay||!state.tutorial.supplies.water)return;}
    state.tutorial.steps[index] = true;
    if (tutorialStep() === 4) {state.tutorial.done = true;state.tutorial.seen = true;}
  }
  function maybeStartTutorial() {
    if ((platformStorage && !storageHydrated) || cloudBusy || state.tutorial.seen || state.tutorial.done || onboardingOpen) return;
    onboardingOpen = true; modalReturnFocus = document.activeElement;
    var modal = document.getElementById('modal');
    document.getElementById('modal-kicker').textContent = '欢迎回家';
    document.getElementById('modal-title').textContent = '从三只小羊开始';
    document.getElementById('modal-copy').textContent = '你继承了家里的羊场。用 300 金币起步，攒够 1000 万退休。';
    document.getElementById('modal-body').innerHTML = '<div class="welcome-flock"><img src="./assets/sheep/young-normal-wool-idle.png" alt="小羊"><img src="./assets/sheep/young-normal-wool-sit.png" alt=""><img src="./assets/sheep/young-normal-wool-idle.png" alt=""></div><ol class="welcome-steps"><li><b>1</b><div><strong>左边添草，右边加水</strong><small>各点一次就够，每次补一格，花 2 金币。</small></div></li><li><b>2</b><div><strong>毛满 100% 后点“剪羊毛”</strong><small>幼羊也能剪，不用等成年；等按钮亮起。</small></div></li><li><b>3</b><div><strong>点草地上的羊毛，把它捡起来</strong><small>剪完只是掉在地上，捡起才进入仓库。</small></div></li><li><b>4</b><div><strong>去集市，出售羊毛</strong><small>卖出才有现金。先留补给钱，再升级或买羊。</small></div></li></ol><button class="welcome-start" type="button" data-action="start-tutorial">带我赚第一笔金币</button><button class="welcome-skip" type="button" data-action="skip-tutorial">我会玩了，跳过指引</button>';
    modal.classList.add('onboarding-open');modal.hidden = false;resetModalScroll();renderClock();
    var start = modal.querySelector('.welcome-start');if (start && typeof start.focus === 'function') start.focus();
  }
  function finishTutorial() {
    state.tutorial.done = true;state.tutorial.seen = true;
    if (onboardingOpen) closeModal(); else {render();saveState(false);}
  }
  function restartTutorial() {
    state.tutorial={seen:true,done:false,steps:[false,false,false,false],supplies:{hay:false,water:false}};
    closeModal();render();pointTutorial();saveState(false);
  }
  function renderTutorialGuide() {
    var active = state.tutorial.seen && !state.tutorial.done, step = tutorialStep(), guide = document.querySelector('.farm-guide');
    guide.classList.toggle('learning',active);
    var actions = document.getElementById('tutorial-actions');if (actions) actions.hidden = !active;
    var targets = ['.hay-station','.water-station','[data-action="shear"]','[data-panel-tab="market"]','[data-action="sell-wool"]','.wool-drop'];
    targets.forEach(function (selector) {var node = document.querySelector(selector);if(node) node.classList.toggle('tutorial-focus',active && (step === 0 ? selector.indexOf('station') >= 0 : step === 1 ? selector.indexOf('shear') >= 0 : step === 3 ? selector.indexOf('market') >= 0 || selector.indexOf('sell-wool') >= 0 : false));});
    if (!active) return;
    var maxWool=state.sheep.reduce(function(max,s){return Math.max(max,s.wool);},0);
    var titles = [state.tutorial.supplies.hay?'再点右边的蓝色水槽':'先点左边的黄色草槽',readySheep().length?'毛满了，点“剪羊毛”':'等羊毛长满 · '+Math.floor(maxWool)+'%','点击草地上的奶白色毛团','去集市，点“出售羊毛”'];
    var copies = ['草和水各补一次；每次 ' + refillPrice() + ' 金币，不用反复补满。','长到 100% 按钮会亮起；羊会自己吃喝，幼羊也能剪。','捡起后才进仓库。羊毛都被雇工捡走时，等它搬回收纳棚。','在草场下方找到“集市”，卖出才会增加现金。'];
    setText('guide-title',(step+1) + '/4 · ' + titles[step]);setText('guide-copy',copies[step]);
    setText('tutorial-go',step === 3 ? '去卖羊毛' : '带我操作');
    document.querySelectorAll('.wool-drop').forEach(function(n){n.classList.toggle('tutorial-focus',step===2);});
  }
  function showPanel(name) {
    document.querySelectorAll('[data-panel-tab]').forEach(function (tab) {tab.classList.toggle('active',tab.getAttribute('data-panel-tab') === name);});
    document.querySelectorAll('[data-panel-view]').forEach(function (view) {view.classList.toggle('active',view.getAttribute('data-panel-view') === name);});
  }
  function pointTutorial() {
    var step = tutorialStep();if (step === 3) showPanel('market');
    var target = document.querySelector(step === 0 ? state.tutorial.supplies.hay?'.water-station':'.hay-station' : step === 1 ? '[data-action="shear"]' : step === 2 ? '.wool-drop' : '[data-action="sell-wool"]');
    if (target && typeof target.scrollIntoView === 'function') target.scrollIntoView({block:'nearest',inline:'nearest'});
  }
  function helpContext(){return {level:farmLevel(),breeds:breedMeta,levels:levelMeta,workerCost:upgradeMeta.worker.base};}
  function helpTabs(tab){return '<nav class="help-tabs" aria-label="玩法分类">'+[['quick','四步入门'],['route','发育路线'],['breeds','羊种能力'],['rules','详细规则']].map(function(t){return '<button type="button" data-help-tab="'+t[0]+'" aria-pressed="'+(tab===t[0])+'">'+t[1]+'</button>';}).join('')+'</nav>';}
  function openRules(tab) {
    tab=typeof tab==='string'?tab:'quick';
    var modal = document.getElementById('modal');
    modalReturnFocus = document.activeElement;
    var rules = [
      ['从小羊场开始', '新玩家从第 0 天开始，带着 ' + defaultState.gold + ' 金币和 ' + defaultState.sheep.length + ' 只普通幼羊。钱包里的金币用来添草、加水、买羊和升级。'],
      ['添草加水', '点击草场两侧的槽位，一次补一格。草和水从每格 2 金币起，随等级依次为 2、3、6、15、50、150、500、2000。当前每格 ' + refillPrice() + ' 金币。槽容量和每格补给量也随等级扩大，槽内高度代表余量。'],
      ['剪羊毛，捡起来，再卖出', '幼羊和成年羊都能长毛。羊毛达到 100% 后点击“剪羊毛”，再点击草地上的羊毛拾取，最后到“集市”出售换取金币。LV' + featureLevel('worker') + ' 后可付费雇工帮忙搬运。'],
      ['长大后才能出栏', '在“羊群”里查看成长情况。达到 60 日龄会变成成年模型，才能卖活羊，或获取羊肉后到集市出售。幼羊可以剪毛，不能出栏。'],
      ['一步步升级牧场', '累计营业收入达标后，花金币提升牧场等级，再付费购买设施和羊种。基础羊圈最多扩建到 20 只，订单扩容可继续增加名额。购羊界面从开局就能查看全部羊种的等级、效果和价格。'],
      ['礼盒与精料', 'LV2 购入绒糖羊，永久开启礼盒工坊；礼盒随等级和原料价提高，至少比直接卖原料多赚 25%。LV3 可购买长绒精料（长毛 +20%，120 秒）或成长精料（幼羊成长 +30%，180 秒）。初始价格 500/800 金币，随等级提高。立即生效、同类不叠加，剩余时间随存档保留。'],
      ['订单与客户满意度', 'LV3 同时有 2 单，LV5 增加第 3 单。普通订单满意度 +1，每点使产毛量 +0.1%、长毛速度 +0.05%，最多 +10% 和 +5%。普通原料订单按货物市价加 15%（合购单 18%）付款；稀有单返还八成货款，另给特殊奖励。'],
      ['稀有订单概率', '购入 LV6 星愿羊，且累计完成至少 15 单后，符合条件的交付刷新才会抽取：羊圈扩容 +2 概率 0.6%；彩虹羊名额 +1 概率 0.15%（初始 2 只，最多 5 只）；LV8 起另有彩虹羊仔 ×1 概率 3%。同一时间最多 1 张稀有单；领奖后至少再交付 40 单，才有机会再出现。刷新或读档不重新抽取。'],
      ['稀有订单需求', '彩虹羊仔单从羊毛 120 kg、羊肉 20 kg 起；羊圈扩容单从 350 kg、80 kg 起；彩虹名额单从 650 kg、140 kg 起，随等级再提高。彩虹羊名额已满 5 只时不再抽取对应扩容单。羊仔奖励在羊圈或彩虹名额满时暂存，到购羊或订单界面领取；领取不等于解锁品种商店。'],
      ['认识特殊羊', 'LV2 绒糖羊开启礼盒；LV4 薄荷羊每只使全场长毛 +20%；LV5 蜜桃羊每只使全场成长 +20%，这两种光环各最多 +60%，离场后减少。LV6 星愿羊开启订单特殊奖励。LV8 彩虹羊产毛 ×4，长大耗时翻倍，成年活羊基础售价 18,000 金币。首次购入的解锁效果永久保留。'],
      ['经营收支', '普通羊仔 '+breedMeta.normal.price+' 金币，当前羊毛价 '+woolPrice()+' 金币/kg。先留好补给钱，再升级扩张；雇工负责拾取，卖货由你决定。账本中存退休金会等额扣现金。出栏可勾选多只成年羊批量出售，卖完一批仍可继续选，没有成年羊时自动关闭。'],
      ['雇工搬运', 'LV3 雇佣后自动拾取羊毛，每趟可搬 4 堆；背篓升级后为 6、8、10 堆。每次可拾取脚边最多 2 堆，搬回收纳棚才入库。靴子可继续提高移动速度。'],
      ['亲手攒退休金', '售卖收入先进入钱包。打开“账本”，输入金额存入退休金，钱包会等额扣除；存入后不再用于经营。累计收入用于解锁等级，退休金存够 1000 万元才能退休。记得留些金币照顾羊群。'],
      ['昼夜、草地和存档', '游戏时间 06:00 日出、18:00 入夜；现实中白天约 48 秒、夜晚约 12 秒，顶部时钟会倒计时。夜里羊会休息，走过草簇时草叶会弯下、回弹。进度每 12 秒自动保存，也可以手动点击“保存”；退出前留意保存状态。']
    ];
    document.getElementById('modal-kicker').textContent = '牧场手册';
    document.getElementById('modal-title').textContent = '玩法说明';
    document.getElementById('modal-copy').textContent = '从照顾第一只小羊，到慢慢攒下退休金。随时点草场标题旁的“玩法”回来查看。';
    var content=tab==='rules'?null:window.FarmHelp.render(tab,helpContext());
    if(content){setText('modal-copy',content.copy);}
    document.getElementById('modal-body').innerHTML = helpTabs(tab)+(content?content.html:'<ol class="game-rules">' + rules.map(function (rule,index) { return '<li><span class="rule-number">' + (index + 1) + '</span><div><h4>' + esc(rule[0]) + '</h4><p>' + esc(rule[1]) + '</p></div></li>'; }).join('') + '</ol>');
    modal.classList.add('rules-open'); modal.hidden = false;resetModalScroll();
    var close = modal.querySelector('.modal-close'); if (close && typeof close.focus === 'function') close.focus();
  }
  function resetModalScroll() {
    var scroll=document.getElementById('modal-scroll'),body=document.getElementById('modal-body');
    if(scroll)scroll.scrollTop=0;
    // Discard an older list update when a different dialog takes over this body.
    body._farmHTML=null;body._farmPendingHTML=null;
  }
  function closeModal() {
    var modal = document.getElementById('modal'); modal.hidden = true; modal.classList.remove('rules-open');
    modal.classList.remove('sale-open');saleModalOpen=false;saleSelection=Object.create(null);
    modal.classList.remove('onboarding-open');
    var wasOnboarding = onboardingOpen; onboardingOpen = false;
    if (wasOnboarding) {state.tutorial.seen = true;clockPhaseStartedAt = Date.now();render();saveState(false);}
    if (modalReturnFocus && typeof modalReturnFocus.focus === 'function') modalReturnFocus.focus();
    modalReturnFocus = null;
  }
  function renderTradeOrder() {
    var book = state.contracts, bonus = customerBonuses(), locked = farmLevel() < 3, loading = platformStorage && !storageHydrated;
    setText('trade-count',book.completed);setText('customer-score',book.satisfaction + '/100');
    setText('customer-yield','+' + number((bonus.yield-1)*100,1) + '%');setText('customer-growth','+' + number((bonus.growth-1)*100,2) + '%');
    document.getElementById('customer-fill').style.width = book.satisfaction + '%';
    var contractsHTML = book.slots.slice(0,contractsEngine.slotsForLevel(farmLevel())).map(function (order,index) {
      var rare = contractsEngine.isRare(order), ready = Object.keys(order.goods).every(function (key) {return state[key]+1e-9 >= order.goods[key];});
      var specialTitle = order.kind==='flock-cap'?'扩建委托 · 草场合作社':order.kind==='rainbow-cap'?'珍稀委托 · 彩虹牧场':'稀有委托 · 彩虹牧场';
      var specialReward = order.kind==='flock-cap'?'永久羊圈名额 +2':order.kind==='rainbow-cap'?'彩虹羊名额 +1（最高5只）':'彩虹羊仔 ×1';
      var goods = Object.keys(order.goods).map(function (key) {var label=key==='wool'?'羊毛':'羊肉',enough=state[key]+1e-9>=order.goods[key];return '<div class="contract-goods'+(enough?' enough':'')+'"><span class="product-icon '+key+'" aria-hidden="true"></span><span>'+label+' <strong>'+number(order.goods[key],1)+' kg</strong><small>仓库 '+number(state[key],1)+' kg</small></span><b>'+(enough?'✓':'待备货')+'</b></div>';}).join('');
      return '<article class="contract-card'+(rare?' rainbow-contract':'')+'"><header><span>'+(rare?specialTitle:order.lane==='mixed'?'邻里合购':order.lane==='meat'?'山谷餐馆':'织物小铺')+'</span><small>NO. '+(index+1)+'</small></header>'+goods+'<footer><div><strong>¥'+gold(tradeReward(order))+'</strong><small>'+(rare?specialReward+' · 满意度 +2':'客户满意度 +1')+'</small></div><button type="button" data-contract-id="'+esc(order.id)+'"'+(locked||loading||!ready?' disabled':'')+'>'+(locked?'LV3 开放':ready?'交付订单':'备货中')+'</button></footer>'+(rare?'<p class="rare-order-note">高额交付，返还八成货款，另获上述奖励。</p>':'')+'</article>';
    }).join('') + (farmLevel()<5?'<p class="contract-slot-note">牧场 LV5 开放第 3 张合购订单</p>':'')+'<p class="contract-slot-note">羊圈 '+capacity()+' 只（订单扩容 +'+book.flockBonus+'） · 彩虹名额 '+book.rainbowLimit+'/5</p><p class="contract-slot-note">'+(book.specialUnlocked?'特殊奖励已开启 · 羊圈扩容 0.6% / 彩虹名额 0.15%<br>LV8 起另有彩虹羊仔 3%。满足交付次数、40单间隔且无其他稀有单时才会抽取。':'购入星愿羊后，开启订单特殊奖励。')+'</p>';
    listHTML(document.getElementById('contract-list'),contractsHTML);
    var pending = document.getElementById('pending-rainbow');if(pending) pending.hidden = !book.pendingRainbow;
    if(pending){var claim=pending.querySelector('button');if(claim){claim.disabled=farmLevel()<8||rainbowCount()>=book.rainbowLimit||state.sheep.length>=capacity()||loading;claim.textContent=farmLevel()<8?'LV8 领取':'领取';}}
  }
  function tradeReward(order) { return contractsEngine.reward(order || state.contracts.slots[0],{wool:woolPrice(),meat:meatPrice()}); }
  function placeRainbowReward() {
    if (!state.contracts.pendingRainbow || farmLevel()<8 || state.sheep.length>=capacity() || rainbowCount()>=state.contracts.rainbowLimit) return false;
    state.contracts.pendingRainbow -= 1;addSheep('rainbow');return true;
  }
  function claimRainbowReward() {
    if(farmLevel()<8){showToast('彩虹羊仔奖励已保留，牧场 LV8 后可领取。');return false;}
    if (!placeRainbowReward()) {showToast(rainbowCount()>=state.contracts.rainbowLimit?'彩虹羊名额已满，先扩容或腾出彩虹羊名额。':'先给彩虹羊仔腾一个羊圈空位。');return false;}
    render();saveState(false);showToast('彩虹羊仔加入羊群，继续长大吧！');return true;
  }
  function deliverTradeOrder(id) {
    var target = id || state.contracts.slots[0].id;
    var result = contractsEngine.complete(state.contracts,target,farmLevel(),{wool:state.wool,meat:state.meat},{wool:woolPrice(),meat:meatPrice()},Math.random);
    if (!result.ok) {if(result.reason==='level')showToast('牧场 LV3 后开放山谷订单。');else if(result.reason==='stock')showToast('仓库原料不足，先准备这张订单的货物。');return false;}
    Object.keys(result.goods).forEach(function (key) {state[key]=Math.max(0,state[key]-result.goods[key]);});
    state.contracts=result.book;bookIncome(result.cash);var placed=result.rainbow&&placeRainbowReward();
    var extra=result.rewardKind==='flock-cap'?' · 永久羊圈名额 +2！':result.rewardKind==='rainbow-cap'?' · 彩虹羊名额提升至 '+state.contracts.rainbowLimit+' 只！':result.rainbow?placed?' · 彩虹羊仔已入住！':' · 彩虹羊仔已暂存，可到购羊界面领取。':' · 客户满意度 +1';
    render();saveState(false);showToast('订单完成 · +¥'+gold(result.cash)+extra);return true;
  }
  function renderWorkshop() {
    var locked = !state.workshopUnlocked;
    var lockedPanel = document.getElementById('workshop-locked'), unlockedPanel = document.getElementById('workshop-unlocked');
    if (lockedPanel) lockedPanel.hidden = !locked;
    if (unlockedPanel) unlockedPanel.hidden = locked;
    if (locked) return;
    var recipe = recipeMeta[state.workshop.recipe], line = state.conveyor[state.workshop.recipe], stateBadge = document.getElementById('workshop-state');
    ['wool','meat'].forEach(function(type){var label=document.querySelector('[data-recipe="'+type+'"] small');if(label)label.textContent=recipeMeta[type].amount+' kg → ¥'+gold(recipeUnitPrice(type));});
    stateBadge.textContent = line.running ? '加工中' : line.progress >= 100 ? '已完成' : '待机';
    stateBadge.className = 'workshop-state ' + (line.running ? 'running' : line.progress >= 100 ? 'done' : '');
    setText('workshop-status', line.running ? '正在制作 · ' + recipe.name : line.progress >= 100 ? recipe.name + ' 已出炉' : recipe.name + ' · 需要 ' + number(recipe.amount, 1) + ' kg 原料');
    setText('workshop-progress-label', Math.round(line.progress) + '%');
    var progress = document.getElementById('workshop-progress'); if (progress) progress.style.width = Math.min(100, line.progress) + '%';
    setText('box-stock', state.boxes.wool + state.boxes.meat);
    var orderMeta = recipeMeta[state.order.type]; setText('order-copy', orderMeta.label + ' × ' + state.order.qty); setText('order-reward', '¥' + gold(orderReward()));
    var tabs = document.querySelectorAll('[data-recipe]'); for (var i = 0; i < tabs.length; i += 1) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-recipe') === state.workshop.recipe);
  }
  function refillSupply(type) {
    var limit = type === 'hay' ? hayCapacity() : waterCapacity();
    var label = type === 'hay' ? '干草' : '清水';
    var price = refillPrice();
    if (state[type] >= limit) { advanceTutorial(0,type);renderControls();showToast(label + '槽已满，无需补充。'); return; }
    if (state.gold < price) { showToast('补充一格' + label + '需要 ' + price + ' 金币。'); return; }
    state.gold -= price;
    state[type] = Math.min(limit, state[type] + limit / 10);
    state.careDone = true;
    advanceTutorial(0,type);
    render(); saveState(false);
    showToast(label + '补充一格 · −¥' + price);
  }
  function shear() {
    var ready = readySheep();
    if (!ready.length) { showToast('还没有羊毛长满，等一会儿再来看看。'); return; }
    var amount = ready.reduce(function (sum, sheep) { var wool = (1.2 + state.upgrades.wool * .18 + (state.happiness / 100) * .35) * (1 + state.upgrades.shears * .15) * breedMeta[sheep.breed || 'normal'].wool * customerBonuses().yield; sheep.wool = 0; state.woolDrops.push({ id: 'drop-' + sheep.id + '-' + Date.now() + '-' + Math.floor(Math.random() * 999), x: Math.max(14, Math.min(86, sheep.x + (Math.random() * 8 - 4))), y: Math.max(18, Math.min(78, sheep.y + (Math.random() * 8 - 4))), amount: wool }); return sum + wool; }, 0);
    advanceTutorial(1);
    render(); saveState(false); showToast('剪下 ' + number(amount, 1) + ' kg 羊毛，掉在草地上，点击羊毛拾取。');
  }
  function addSheep(key) {
    var index = state.sheep.length, spawnX = 28 + Math.random() * 42, spawnY = 25 + Math.random() * 42;
    state.sheep.push({ id: 's' + Date.now() + '-' + (++sheepSequence), breed: key, name: sheepNames[index % sheepNames.length], age: 0, hunger: 100, thirst: 100, wool: 0, zone: index % 4, x: spawnX, y: spawnY, tx: spawnX, ty: spawnY, direction: 1, action: 'idle', actionUntil: 0 });
  }
  function buySheep(key) {
    key = key || 'normal';
    var meta = breedMeta[key];
    if (!meta || !state.breeds[key] || farmLevel() < meta.level) { showToast('先提升牧场等级并解锁这个品种。'); return false; }
    if (state.sheep.length >= capacity()) { showToast('羊圈已经满啦，先升级羊圈扩建。'); return; }
    if (key==='rainbow' && rainbowCount()>=state.contracts.rainbowLimit) {showToast('彩虹羊名额已满，特殊订单可扩至最多 5 只。');return false;}
    if (state.gold < meta.price) { showToast('购买' + meta.name + '羊仔需要 ¥' + gold(meta.price) + '。'); return false; }
    state.gold -= meta.price;addSheep(key);
    if(key==='gift')state.workshopUnlocked=true;
    if(key==='wish')state.contracts.specialUnlocked=true;
    state.happiness = Math.min(100, state.happiness + 1); render(); saveState(false); showToast(meta.name + '羊仔加入羊群。'+(key==='gift'?'礼盒工坊已永久开启。':key==='wish'?'订单特殊奖励已永久开启。':'')); return true;
  }
  function sellWool() {
    if (state.wool <= 0) { showToast('仓库里还没有可出售的羊毛。'); return; }
    var revenue = state.wool * woolPrice(); bookIncome(revenue); state.wool = 0; advanceTutorial(3); render(); saveState(false); showToast('羊毛卖出 ¥' + gold(revenue) + '，行情不错！');
  }
  function sellMeat() {
    if (state.meat <= 0) { showToast('还没有羊肉库存，先让成年羊出栏。'); return; }
    var revenue = state.meat * meatPrice(); bookIncome(revenue); state.meat = 0; render(); saveState(false); showToast('羊肉卖出 ¥' + gold(revenue) + '，冷鲜仓很值钱。');
  }
  function pickWool(id) {
    var picked = null; state.woolDrops = state.woolDrops.filter(function (drop) { if (drop.id === id) { picked = drop; return false; } return true; });
    if (!picked) return; state.wool += picked.amount; advanceTutorial(2); render(); saveState(false); showToast('拾取 ' + number(picked.amount, 1) + ' kg 羊毛，送进仓库。');
  }
  function startConveyor(type) {
    if (!state.workshopUnlocked) { showToast('先在购羊界面购入绒糖羊，开启礼盒工坊。'); return; }
    var meta = recipeMeta[type], line = state.conveyor[type];
    if (line.running) { showToast('这条包装线正在工作。'); return; }
    if (state[meta.input] < meta.amount) { showToast(meta.name + ' 需要 ' + number(meta.amount, 1) + ' kg 原料。'); return; }
    state[meta.input] -= meta.amount; line.progress = 1; line.running = true; render(); saveState(false); showToast(meta.name + ' 已开始包装。');
  }
  function advanceConveyor(type) {
    var line = state.conveyor[type]; if (!line.running) return;
    line.progress = Math.min(100, line.progress + 25);
    if (line.progress >= 100) { line.running = false; state.boxes[type] += 1; showToast(recipeMeta[type].name + ' 包装完成。'); }
  }
  function chooseRecipe(type) {
    if (!state.workshopUnlocked || !recipeMeta[type] || state.conveyor[type].running) return;
    state.workshop.recipe = type; render();
  }
  function startWorkshop() {
    startConveyor(state.workshop.recipe);
  }
  function sellBoxes() {
    if (!state.workshopUnlocked) { showToast('礼盒车间还未解锁。'); return; }
    var woolBoxes = state.boxes.wool, meatBoxes = state.boxes.meat;
    if (!woolBoxes && !meatBoxes) { showToast('还没有完成的礼盒，先开工制作一批。'); return; }
    var revenue = woolBoxes * recipeUnitPrice('wool') + meatBoxes * recipeUnitPrice('meat'); bookIncome(revenue); state.boxes.wool = 0; state.boxes.meat = 0; render(); saveState(false); showToast('礼盒售出 ¥' + gold(revenue) + '，加工比散卖更划算。');
  }
  function deliverOrder() {
    if (!state.workshopUnlocked) { showToast('礼盒车间还未解锁。'); return; }
    var order = state.order, available = state.boxes[order.type];
    if (available < order.qty) { showToast('订单需要 ' + recipeMeta[order.type].label + ' × ' + order.qty + '，车间库存还不够。'); return; }
    var reward = orderReward();
    state.boxes[order.type] -= order.qty; bookIncome(reward);state.contracts.completed += 1;state.contracts.satisfaction = Math.min(100,state.contracts.satisfaction+1); state.order = { type: order.type === 'wool' ? 'meat' : 'wool', qty: order.type === 'wool' ? 1 : 2, reward: order.type === 'wool' ? 520 : 420 }; render(); saveState(false); showToast('订单交付完成，奖励 ¥' + gold(reward) + ' · 客户满意度 +1。');
  }
  function openButcher() {
    var adults = readyAdults(), modal = document.getElementById('modal');
    if (!adults.length) { showToast('还没有成年羊，成长到 60 日龄后才能出栏。'); return; }
    saleModalOpen=true;saleSelection=Object.create(null);modalReturnFocus=document.activeElement;
    document.getElementById('modal-kicker').textContent='成年羊出栏';document.getElementById('modal-title').textContent='选好这一批，再出栏';
    document.getElementById('modal-copy').textContent='勾选成年羊，可卖活羊或换取羊肉。卖完可继续选择，右上角随时关闭；幼羊不会被选中。';
    modal.classList.add('sale-open');modal.hidden=false;renderButcherChoices();resetModalScroll();
  }
  function meatYield(sheep) { return 1.8+Math.min(1.4,sheep.age/60*.6); }
  function renderButcherChoices() {
    var adults=readyAdults();
    Object.keys(saleSelection).forEach(function(id){if(!adults.some(function(s){return s.id===id;}))delete saleSelection[id];});
    var saleHTML='<div class="sale-tools"><span>可出栏 '+adults.length+' 只</span><button type="button" data-action="sale-select-all">全选 / 取消</button></div><div class="sale-flock-list">'+adults.map(function(sheep,index){return '<label class="sale-sheep"><input type="checkbox" data-sale-id="'+esc(sheep.id)+'"'+(saleSelection[sheep.id]?' checked':'')+'><img src="'+sheepArtSource(sheep)+'" alt=""><span><strong>'+breedMeta[sheep.breed||'normal'].name+' #'+(index+1)+'</strong><small>'+Math.floor(sheep.age)+' 日龄 · 肉品 '+number(meatYield(sheep),1)+' kg</small></span><b>¥'+gold(liveSheepPrice(sheep))+'</b></label>';}).join('')+'</div><div class="sale-summary"><p id="sale-total"></p><div><button type="button" data-action="sale-live-selected">卖出选中活羊</button><button type="button" data-action="sale-meat-selected">选中羊换肉品</button></div><small>薄荷羊、蜜桃羊离场后，其加成也会减少。</small></div>';
    listHTML(document.getElementById('modal-body'),saleHTML);
    renderSaleSummary();
  }
  function selectSaleSheep(id,checked) {if(find(id)&&isAdult(find(id))) {if(checked)saleSelection[id]=true;else delete saleSelection[id];}renderSaleSummary();}
  function renderSaleSummary() {
    var selected=readyAdults().filter(function(s){return !!saleSelection[s.id];}),cash=0,kg=0;
    selected.forEach(function(s){cash+=liveSheepPrice(s);kg+=meatYield(s);});
    setText('sale-total','已选 '+selected.length+' 只 · 活羊 ¥'+gold(cash)+' / 肉品 '+number(kg,1)+' kg');
    ['live','meat'].forEach(function(mode){var button=document.querySelector('[data-action="sale-'+mode+'-selected"]');if(button)button.disabled=!selected.length;});
    return {count:selected.length,cash:cash,meat:kg};
  }
  function selectAllSaleSheep() {
    var adults=readyAdults(),all=adults.every(function(s){return saleSelection[s.id];});saleSelection=Object.create(null);
    if(!all)adults.forEach(function(s){saleSelection[s.id]=true;});renderButcherChoices();
  }
  function sellSelectedSheep(mode) { return processSheepSale(Object.keys(saleSelection),mode); }
  function processSheepSale(ids,mode) {
    var selected=readyAdults().filter(function(s){return ids.indexOf(s.id)>=0;});
    if(!selected.length) {showToast('先勾选要出栏的成年羊。');return false;}
    var cash=0,kg=0;selected.forEach(function(s){cash+=liveSheepPrice(s);kg+=meatYield(s);});
    state.sheep=state.sheep.filter(function(s){return !selected.some(function(chosen){return chosen.id===s.id;});});
    if(mode==='meat'){state.meat+=kg;state.happiness=Math.max(30,state.happiness-selected.length);}else bookIncome(cash);
    saleSelection=Object.create(null);if(saleModalOpen&&!readyAdults().length)closeModal();
    render();saveState(false);showToast(mode==='meat'?selected.length+' 只羊已出栏，获得 '+number(kg,1)+' kg 羊肉。':'已出售 '+selected.length+' 只成年羊 · +¥'+gold(cash));return true;
  }
  function butcher(id) { var sheep=find(id);if(!sheep||!isAdult(sheep)){showToast('幼羊还不能出栏。');return false;}return processSheepSale([id],'meat'); }
  function liveSheepPrice(sheep) { return Math.round(breedMeta[sheep.breed || 'normal'].sale * tradeBonus() * (1 + Math.min(.5, Math.max(0, sheep.age - 60) / 240))); }
  function sellLiveSheep(id) {
    var sheep = find(id); if (!sheep || !isAdult(sheep)) { showToast('幼羊还不能出售。'); return false; }
    return processSheepSale([id],'live');
  }
  function upgrade(key) {
    var meta = upgradeMeta[key]; if (!meta) return;
    if (!state.upgrades[key] && farmLevel() < featureLevel(key)) { showToast(meta.name + '需要牧场 LV' + featureLevel(key) + ' 后开放。'); return; }
    var level = state.upgrades[key]; if (level >= meta.max) return;
    if (meta.requires && !state.upgrades[meta.requires]) { showToast('先雇佣一位牧场工。'); return; }
    if (meta.unlockAt && farmLevel() < meta.unlockAt) { showToast('先把牧场升到 LV' + meta.unlockAt + '，再解锁礼盒车间。'); return; }
    var cost = upgradeCost(key);
    if (state.gold < cost) { showToast('升级还差 ¥' + gold(cost - state.gold) + '，继续经营攒一攒。'); return; }
    state.gold -= cost; state.upgrades[key] += 1; if (key === 'workshop') state.workshopUnlocked = true; render(); saveState(false); showToast(meta.name + '升级完成，效果已生效。');
  }
  function chooseSheepTarget(sheep) {
    var needFood = sheep.hunger < 70 && state.hay >= .5, needWater = sheep.thirst < 70 && state.water >= .5;
    var action = needFood && (!needWater || sheep.hunger <= sheep.thirst) ? 'eating' : needWater ? 'drinking' : '';
    var slot = action ? troughTarget(sheep, action) : null;
    if (!slot && needFood && needWater) { action = action === 'eating' ? 'drinking' : 'eating'; slot = troughTarget(sheep, action); }
    if (slot) { sheep.tx = slot.x; sheep.ty = slot.y; sheep.troughSlot = slot.slot; sheep.actionTarget = action; return; }
    var zones = [{ x: 22, y: 21, w: 21, h: 21 }, { x: 55, y: 20, w: 20, h: 23 }, { x: 24, y: 53, w: 21, h: 23 }, { x: 55, y: 53, w: 20, h: 23 }];
    // Let sheep change grazing areas as well as rest in place.
    var zone = zones[Math.random() < .35 ? Math.floor(Math.random() * zones.length) : sheep.zone % zones.length];
    var candidate, attempts = 0, size = fieldSize();
    do {
      candidate = { x: zone.x + Math.random() * zone.w, y: zone.y + Math.random() * zone.h };
      attempts += 1;
    } while (attempts < 12 && state.sheep.some(function (other) {
      var dx = ((typeof other.tx === 'number' ? other.tx : other.x) - candidate.x) * size.width / 100;
      var dy = ((typeof other.ty === 'number' ? other.ty : other.y) - candidate.y) * size.height / 100;
      return other !== sheep && dx * dx + dy * dy < 58 * 58;
    }));
    sheep.tx = candidate.x; sheep.ty = candidate.y; sheep.actionTarget = 'grass'; sheep.troughSlot = null;
  }
  function fieldSize() { return document.getElementById('sheep-field').getBoundingClientRect(); }
  function troughTarget(sheep, action) {
    var field = fieldSize(), trough = document.querySelector(action === 'eating' ? '.hay-station .station-meter' : '.water-station .station-meter').getBoundingClientRect();
    var type = action === 'eating' ? 'hay' : 'water', limit = type === 'hay' ? hayCapacity() : waterCapacity();
    var filled = Math.max(.1, state[type] / limit);
    var usable = Math.max(18, trough.height * filled - 12), slots = Math.max(1, Math.floor(usable / 32)), occupied = {};
    state.sheep.forEach(function (other) { if (other !== sheep && other.actionTarget === action && (typeof other.tx === 'number' || other.action === action)) occupied[other.troughSlot] = true; });
    var free = -1;
    for (var i = 0; i < slots; i += 1) { if (!occupied[i]) { free = i; break; } }
    if (free < 0) return null;
    // Mouth coordinates come from the complete single-frame PNG, for each age group.
    var young = !isAdult(sheep), mouthX = young ? 26 : 29, mouthY = young ? 22 : 23;
    var mouthOffsetX = (mouthX - 16) * 52 / 32, mouthOffsetY = (mouthY - 16) * 52 / 32;
    var x = action === 'eating' ? trough.right + mouthOffsetX - 1 : trough.left - mouthOffsetX + 1;
    var y = trough.bottom - 16 - free * (usable - 18) / Math.max(1, slots - 1) - mouthOffsetY;
    return { x: (x - field.left) / field.width * 100, y: (y - field.top) / field.height * 100, slot: free };
  }
  function updateSheepNode(sheep, size) {
    var node = document.querySelector('[data-sheep-id="' + sheep.id.replace(/"/g, '') + '"]');
    if (node) {
      node.style.left = sheep.x.toFixed(2) + '%'; node.style.top = sheep.y.toFixed(2) + '%'; node.style.zIndex = Math.round(sheep.y * size.height / 100 + sheepFeet(sheep) - 1); node.style.setProperty('--flip', sheep.direction); node.className = sheepClass(sheep);
      var art = node.querySelector('.sheep-art'), source = sheepArtSource(sheep);
      if (art && art.getAttribute('src') !== source) art.setAttribute('src', source);
    }
  }
  function restPose() { var roll = Math.random(); return roll < .45 ? 'idle' : roll < .72 ? 'sitting' : 'lying'; }
  function animateSheep() {
    if ((platformStorage && !storageHydrated) || cloudBusy || onboardingOpen) return;
    var now = Date.now(), size = fieldSize();
    state.sheep.forEach(function (sheep) {
      var needsFood = sheep.hunger < 70 && state.hay >= .5, needsWater = sheep.thirst < 70 && state.water >= .5;
      if (isNight() && !needsFood && !needsWater) {
        sheep.action = 'sleeping'; sheep.actionUntil = 0; sheep.tx = sheep.x; sheep.ty = sheep.y; sheep.actionTarget = ''; sheep.troughSlot = null;
        updateSheepNode(sheep, size); return;
      }
      if (!isNight() && sheep.action === 'sleeping') { sheep.action = 'idle'; sheep.tx = undefined; sheep.actionUntil = 0; }
      if (sheep.actionUntil && now < sheep.actionUntil) { updateSheepNode(sheep, size); return; }
      if (sheep.actionUntil && now >= sheep.actionUntil) { sheep.actionUntil = 0; sheep.action = 'walking'; sheep.tx = undefined; }
      if (typeof sheep.tx !== 'number' || !isFinite(sheep.tx)) {
        chooseSheepTarget(sheep);
        sheep.action = 'walking';
      }
      var dx = (sheep.tx - sheep.x) * size.width / 100, dy = (sheep.ty - sheep.y) * size.height / 100, distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 3.5) {
        sheep.x = sheep.tx; sheep.y = sheep.ty;
        if (sheep.actionTarget === 'eating' && state.hay >= .5) { state.hay -= .5; sheep.hunger = Math.min(100, sheep.hunger + 28 + state.upgrades.feeder * 6); sheep.action = 'eating'; sheep.direction = -1; }
        else if (sheep.actionTarget === 'drinking' && state.water >= .5) { state.water -= .5; sheep.thirst = Math.min(100, sheep.thirst + 32); sheep.action = 'drinking'; sheep.direction = 1; }
        else if (state.upgrades.clover && sheep.hunger < 85 && Math.random() < .5) { sheep.action = 'grazing'; sheep.hunger = Math.min(100, sheep.hunger + state.upgrades.clover * 4); }
        else { sheep.action = restPose(); state.happiness = Math.min(100, state.happiness + state.upgrades.shade * .5); }
        sheep.actionUntil = now + (sheep.action === 'eating' || sheep.action === 'drinking' || sheep.action === 'grazing' ? 3400 : 2400 + Math.random() * 5000);
        sheep.tx = undefined;
        renderSupplies();
      } else { var step = 4.2; sheep.x += dx / distance * step / size.width * 100; sheep.y += dy / distance * step / size.height * 100; if (Math.abs(dx) > .1) sheep.direction = dx < 0 ? -1 : 1; sheep.action = 'walking'; }
      updateSheepNode(sheep, size);
    });
    animateWorker(now, size);
    if (grassField) grassField.refresh();
  }
  function renderWorker() {
    var depot = document.getElementById('worker-depot'); depot.hidden = !state.upgrades.worker;
    var field = document.getElementById('sheep-field'), worker = document.getElementById('farm-worker');
    if (!state.upgrades.worker) { if (worker) worker.remove(); return; }
    if (!worker) { worker = document.createElement('div'); worker.id = 'farm-worker'; worker.innerHTML = '<span class="worker-sprite" aria-hidden="true"></span><span class="worker-cargo" aria-hidden="true"></span>'; field.appendChild(worker); }
    var w = state.worker, moving = w.mode === 'walking' || w.mode === 'carrying';
    worker.className = 'farm-worker ' + w.mode + (w.count ? ' loaded' : '') + (w.direction < 0 ? ' facing-left' : '');
    worker.style.left = w.x.toFixed(2) + '%'; worker.style.top = w.y.toFixed(2) + '%'; worker.style.zIndex = Math.round(w.y * field.getBoundingClientRect().height / 100 + 7);
    worker.style.setProperty('--flip', w.direction);
    var frame = w.mode === 'picking' ? 3 : w.mode === 'unloading' ? 4 : moving ? 1 + Math.floor(Date.now() / 180) % 2 : 0;
    worker.querySelector('.worker-sprite').style.backgroundPosition = (-frame * 36) + 'px 0';
    var labels = { idle: '等候羊毛', walking: '前往拾取', picking: '弯腰拾取', carrying: '搬回收纳棚', unloading: '卸下羊毛' };
    worker.setAttribute('aria-label', '牧场雇工 · ' + labels[w.mode]);
    setText('staff-copy', labels[w.mode]); setText('staff-load', w.count + ' / ' + workerCapacity());
  }
  function nearestWool(worker) {
    return state.woolDrops.slice().sort(function (a, b) {
      var size = fieldSize();
      function distance(d) { return Math.pow((d.x - worker.x) * size.width, 2) + Math.pow((d.y - worker.y) * size.height, 2); }
      return distance(a) - distance(b);
    })[0];
  }
  function workerCapacity(level) { return (2 + (level === undefined ? state.upgrades.basket : level)) * 2; }
  function animateWorker(now, size) {
    if (!state.upgrades.worker) return;
    var w = state.worker, target = state.woolDrops.filter(function (drop) { return drop.id === w.targetId; })[0];
    if (w.mode === 'picking') {
      if (now < w.until) { renderWorker(); return; }
      if (target) {
        var nearby = state.woolDrops.filter(function (drop) {
          var dx=(drop.x-w.x)*size.width/100,dy=(drop.y-w.y)*size.height/100;
          return drop.id!==target.id && dx*dx+dy*dy<=40*40;
        });
        var picked=[target].concat(nearby).slice(0,Math.min(2,workerCapacity()-w.count));
        picked.forEach(function(drop){w.carry+=drop.amount;w.count+=1;});
        state.woolDrops=state.woolDrops.filter(function(drop){return !picked.some(function(item){return item.id===drop.id;});});
        renderDrops();
      }
      w.targetId = ''; w.mode = 'idle';
    }
    if (w.mode === 'unloading') {
      if (now < w.until) { renderWorker(); return; }
      state.wool += w.carry; var collected = w.carry; w.carry = 0; w.count = 0; w.mode = 'idle';
      if(collected>0)advanceTutorial(2);
      saveState(false); showToast('雇工入库 ' + number(collected, 1) + ' kg 羊毛。');
    }
    if (w.mode === 'idle' || (w.mode === 'walking' && !target)) {
      target = nearestWool(w);
      if (w.count && (!target || w.count >= workerCapacity())) { w.mode = 'carrying'; w.targetId = ''; }
      else if (target) { w.mode = 'walking'; w.targetId = target.id; }
      else { w.mode = w.carry ? 'carrying' : 'idle'; w.targetId = ''; }
    }
    if (w.mode === 'walking' || w.mode === 'carrying') {
      var tx = w.mode === 'carrying' ? 50 : target.x, ty = w.mode === 'carrying' ? 88 : target.y;
      var dx = (tx - w.x) * size.width / 100, dy = (ty - w.y) * size.height / 100, dist = Math.sqrt(dx * dx + dy * dy), step = 6.72 * 1.3 * 2 * (1 + state.upgrades.boots * .25);
      if (dist <= step) { w.x = tx; w.y = ty; w.mode = w.mode === 'carrying' ? 'unloading' : 'picking'; w.until = now + 780; }
      else { w.x += dx / dist * step / size.width * 100; w.y += dy / dist * step / size.height * 100; if (Math.abs(dx) > .1) w.direction = dx < 0 ? -1 : 1; }
    }
    renderWorker();
  }
  function tick() {
    if ((platformStorage && !storageHydrated) || cloudBusy || onboardingOpen) return;
    state.cycle += 1; state.dayPhase = (Number(state.dayPhase) + 1) % 15; if (state.dayPhase === 0) state.day += 1;
    clockPhaseStartedAt = Date.now();
    state.sheep.forEach(function (sheep) {
      sheep.hunger = Math.max(0, sheep.hunger - 2.5); sheep.thirst = Math.max(0, sheep.thirst - 3);
      var juvenile=!isAdult(sheep),ageRate=(sheep.breed==='rainbow' ? .45 : .9)+state.upgrades.growth*(sheep.breed==='rainbow' ? .1 : .2);
      sheep.age += ageRate * flockBonus('peach') * (juvenile&&state.feeds.growth>0?1.3:1); sheep.wool = Math.min(100, sheep.wool + (8.4 + state.upgrades.wool * 1.05) * flockBonus('mint') * customerBonuses().growth * (state.feeds.wool>0?1.2:1));
    });
    ['wool','growth'].forEach(function(kind){state.feeds[kind]=Math.max(0,state.feeds[kind]-1);});
    if (state.workshopUnlocked) { advanceConveyor('wool'); advanceConveyor('meat'); }
    var average = state.sheep.length ? state.sheep.reduce(function (sum, sheep) { return sum + Math.min(sheep.hunger, sheep.thirst); }, 0) / state.sheep.length : 0;
    state.happiness = Math.max(30, Math.min(100, state.happiness + (average > 65 ? .4 : -.8)));
    render(); if (state.cycle % 3 === 0) autoSave();
  }

  function holdControl(event){pressSequence+=1;pressedControl=event.target.closest?event.target.closest('button,input,summary,label'):null;}
  ['pointerdown','mousedown','touchstart'].forEach(function(name){document.addEventListener(name,holdControl,true);});
  ['pointerup','mouseup','touchend'].forEach(function(name){document.addEventListener(name,function(){var sequence=pressSequence;setTimeout(function(){if(sequence===pressSequence)releaseControls();},450);},true);});
  ['pointercancel','touchcancel'].forEach(function(name){document.addEventListener(name,releaseControls,true);});
  document.addEventListener('click',function(){var sequence=pressSequence;setTimeout(function(){if(sequence===pressSequence)releaseControls();},0);},true);
  window.addEventListener('blur',releaseControls);
  document.addEventListener('visibilitychange',function(){if(document.hidden)releaseControls();});
  var lastPaidAction='',lastPaidAt=0;
  document.addEventListener('click', function (event) {
    var helpTab=event.target.closest?event.target.closest('[data-help-tab]'):null;
    if(helpTab){openRules(helpTab.getAttribute('data-help-tab'));return;}
    var helpGo=event.target.closest?event.target.closest('[data-help-go]'):null;
    if(helpGo){
      var destination=helpGo.getAttribute('data-help-go');
      if(destination==='route'){openRules('route');return;}
      closeModal();if(destination==='nursery'){openNursery();return;}
      var panelName=destination==='staff'||destination==='upgrades'?'upgrade':destination==='orders'?'order':destination;showPanel(panelName);
      if(destination==='staff'){activeUpgradeGroup='staff';renderUpgrades();}
      var panel=document.querySelector('[data-panel-view="'+panelName+'"]');
      if(panel&&panel.scrollIntoView)panel.scrollIntoView({block:'start',inline:'nearest'});return;
    }
    var actionButton = event.target.closest ? event.target.closest('[data-action]') : null;
    var upgradeButton = event.target.closest ? event.target.closest('[data-upgrade]') : null;
    var butcherButton = event.target.closest ? event.target.closest('[data-butcher-id]') : null;
    var dropButton = event.target.closest ? event.target.closest('[data-drop-id]') : null;
    var breedButton = event.target.closest ? event.target.closest('[data-buy-breed]') : null;
    var unlockButton = event.target.closest ? event.target.closest('[data-unlock-breed]') : null;
    var liveButton = event.target.closest ? event.target.closest('[data-live-sale-id]') : null;
    var contractButton = event.target.closest ? event.target.closest('[data-contract-id]') : null;
    var feedButton = event.target.closest ? event.target.closest('[data-feed-kind]') : null;
    if (actionButton && actionButton.getAttribute('data-action') === 'rules') { openRules(); return; }
    if (actionButton && actionButton.getAttribute('data-action') === 'retry-storage') { hydratePlatformState();return; }
    if (actionButton && actionButton.getAttribute('data-action') === 'replay-tutorial') {restartTutorial();return;}
    if (actionButton && actionButton.getAttribute('data-action') === 'close-modal') { closeModal(); return; }
    if (actionButton && actionButton.getAttribute('data-action') === 'start-tutorial') {closeModal();pointTutorial();return;}
    if (actionButton && actionButton.getAttribute('data-action') === 'skip-tutorial') {finishTutorial();return;}
    if ((actionButton || upgradeButton || butcherButton || dropButton || breedButton || unlockButton || liveButton || contractButton || feedButton) && ((platformStorage && !storageHydrated) || cloudBusy)) {
      if (actionButton && actionButton.getAttribute('data-action') === 'save' && !cloudBusy) hydratePlatformState();
      showToast('正在读取存档，请稍候再操作。'); return;
    }
    var paidKey=breedButton?'buy:'+breedButton.getAttribute('data-buy-breed'):unlockButton?'breed:'+unlockButton.getAttribute('data-unlock-breed'):upgradeButton?'upgrade:'+upgradeButton.getAttribute('data-upgrade'):contractButton?'order:'+contractButton.getAttribute('data-contract-id'):feedButton?'feed:'+feedButton.getAttribute('data-feed-kind'):actionButton&&['deposit','deposit-all','level-up','sale-live-selected','sale-meat-selected','retire'].indexOf(actionButton.getAttribute('data-action'))>=0?actionButton.getAttribute('data-action'):'';
    if(paidKey){if(lastPaidAction===paidKey&&Date.now()-lastPaidAt<300)return;lastPaidAction=paidKey;lastPaidAt=Date.now();}
    if (actionButton) {
      var action = actionButton.getAttribute('data-action');
      if (action === 'feed') refillSupply('hay'); else if (action === 'water') refillSupply('water'); else if (action === 'shear') shear(); else if (action === 'buy') openNursery(); else if (action === 'sell-wool') sellWool(); else if (action === 'sell-meat') sellMeat(); else if (action === 'butcher') openButcher(); else if (action === 'start-workshop') startWorkshop(); else if (action === 'sell-boxes') sellBoxes(); else if (action === 'deliver-order') deliverOrder(); else if (action === 'retire') retire(); else if (action === 'close-modal') document.getElementById('modal').hidden = true; else if (action === 'save') saveState(true);
      else if (action === 'trade-order') deliverTradeOrder();
      else if (action === 'cloud-save') syncCloudStorage(true);
      else if (action === 'deposit') depositSavings();
      else if (action === 'deposit-all') depositSavings(Math.floor(state.gold));
      else if (action === 'level-up') levelUp();
      else if (action === 'tutorial-go') pointTutorial();
      else if (action === 'claim-rainbow') claimRainbowReward();
      else if (action === 'sale-select-all') selectAllSaleSheep();
      else if (action === 'sale-live-selected') sellSelectedSheep('live');
      else if (action === 'sale-meat-selected') sellSelectedSheep('meat');
    }
    if (upgradeButton && !upgradeButton.disabled) upgrade(upgradeButton.getAttribute('data-upgrade'));
    if (butcherButton) butcher(butcherButton.getAttribute('data-butcher-id'));
    if (dropButton) pickWool(dropButton.getAttribute('data-drop-id'));
    if (breedButton && !breedButton.disabled) buySheep(breedButton.getAttribute('data-buy-breed'));
    if (unlockButton && !unlockButton.disabled) unlockBreed(unlockButton.getAttribute('data-unlock-breed'));
    if (liveButton) sellLiveSheep(liveButton.getAttribute('data-live-sale-id'));
    if (contractButton && !contractButton.disabled) deliverTradeOrder(contractButton.getAttribute('data-contract-id'));
    if (feedButton && !feedButton.disabled) buySpecialFeed(feedButton.getAttribute('data-feed-kind'));
    var groupButton = event.target.closest ? event.target.closest('[data-upgrade-group]') : null;
    if (groupButton) {
      activeUpgradeGroup = groupButton.getAttribute('data-upgrade-group');
      document.querySelectorAll('[data-upgrade-group]').forEach(function (button) { button.classList.toggle('active', button === groupButton); });
      renderUpgrades();
    }
    var panelTab = event.target.closest ? event.target.closest('[data-panel-tab]') : null;
    if (panelTab) {
      showPanel(panelTab.getAttribute('data-panel-tab'));
    }
    var recipeButton = event.target.closest ? event.target.closest('[data-recipe]') : null;
    if (recipeButton) chooseRecipe(recipeButton.getAttribute('data-recipe'));
  });
  document.getElementById('modal').addEventListener('click', function (event) { if (event.target === this) closeModal(); });
  document.addEventListener('change',function(event){var input=event.target;if(input&&input.getAttribute&&input.getAttribute('data-sale-id'))selectSaleSheep(input.getAttribute('data-sale-id'),input.checked);});
  document.addEventListener('keydown',function (event) {
    var modal = document.getElementById('modal'); if (modal.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    var focusable = Array.prototype.slice.call(modal.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex="0"]')).filter(function (node) { return node.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1], active = document.activeElement;
    if (event.shiftKey && (active === first || focusable.indexOf(active) < 0)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (active === last || focusable.indexOf(active) < 0)) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener('resize', function () {
    state.sheep.forEach(function (sheep) { sheep.tx = undefined; sheep.actionUntil = 0; sheep.action = 'idle'; sheep.actionTarget = ''; sheep.troughSlot = null; });
  });
  if (typeof window.createFarmGrassField === 'function') grassField = window.createFarmGrassField({ field:document.getElementById('sheep-field'), scene:document.getElementById('pasture-scene'), getActors:grassActors });
  render(); hydratePlatformState(); setInterval(tick, 4000); setInterval(autoSave, AUTO_SAVE_INTERVAL); setInterval(animateSheep, 260); setInterval(animateSheepFrames, 80); setInterval(renderClock, 250);
  if (document.addEventListener) document.addEventListener('visibilitychange', handleVisibilityChange);
  if (window.addEventListener) { window.addEventListener('pagehide', saveOnLifecycle); window.addEventListener('beforeunload', saveOnLifecycle); }
  if (!window.xhs) maybeStartTutorial();
}());
