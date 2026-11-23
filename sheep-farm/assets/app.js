(function () {
  'use strict';

  var SAVE_KEY = 'muyun-sheep-farm-v2';
  var PLATFORM_SAVE_KEY = 'muyun-sheep-farm-v3';
  var AUTO_SAVE_INTERVAL = 12000;
  var RETIREMENT_GOAL = 100000000;
  var refillPrices = { hay: 12, water: 6 };
  var levelMeta = [
    { cost: 0, income: 0, opens: '添草加水、剪毛售卖、退休金' },
    { cost: 480, income: 150, opens: '草料仓、蓄水池、食槽改良' },
    { cost: 900, income: 500, opens: '雇佣工人、精细剪毛、原料订单' },
    { cost: 1800, income: 1600, opens: '薄荷羊、三叶草地、冷藏仓' },
    { cost: 3600, income: 4000, opens: '蜜桃羊、营养配方、工人装备' },
    { cost: 7200, income: 10000, opens: '彩虹羊、集市商路' },
    { cost: 14400, income: 25000, opens: '树荫休憩、高阶羊群培育' },
    { cost: 28800, income: 60000, opens: '礼盒车间' }
  ];
  var breedMeta = {
    normal: { name: '云朵羊', level: 1, unlock: 0, price: 280, sale: 420, wool: 1, desc: '基础羊种 · 幼羊也能产毛' },
    mint: { name: '薄荷羊', level: 4, unlock: 1800, price: 1000, sale: 1700, wool: 1.5, desc: '全场羊毛生长 +20% · 最多叠加 3 只' },
    peach: { name: '蜜桃羊', level: 5, unlock: 3600, price: 1800, sale: 3200, wool: 1.8, desc: '全场成长速度 +20% · 最多叠加 3 只' },
    rainbow: { name: '彩虹羊', level: 6, unlock: 7200, price: 4000, sale: 18000, wool: 4, desc: '羊毛产量 ×4 · 成年活羊可卖 ¥18,000 起' }
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
    capacity: { icon: '⌂', name: '羊圈扩建', desc: function (level) { return '容量提升至 ' + (6 + level * 2) + ' 只'; }, base: 520, max: 4 },
    feeder: { icon: '✣', name: '食槽改良', desc: function (level) { return '每次进食恢复 +' + level * 6 + ' 饱腹'; }, base: 380, max: 3 },
    wool: { icon: '✦', name: '羊毛品种', desc: function (level) { return '羊毛品质提升 +' + (level * 10) + '%'; }, base: 500, max: 4 },
    growth: { icon: '↗', name: '营养配方', desc: function (level) { return '成长速度提升 +' + (level * 12) + '%'; }, base: 460, max: 4 },
    meat: { icon: '◇', name: '冷藏仓', desc: function (level) { return '羊肉售价提升 +' + (level * 15) + '%'; }, base: 620, max: 3 },
    worker: { icon: '♙', name: '雇佣牧场工', desc: function (level) { return level ? '拾取羊毛，搬回收纳棚' : '一位会拾取、搬运的帮手'; }, base: 1200, max: 1 },
    boots: { icon: '↟', name: '工人靴子', desc: function (level) { return '行走速度 +' + level * 25 + '%'; }, base: 280, max: 3, requires: 'worker' },
    basket: { icon: '▤', name: '搬运背篓', desc: function (level) { return '每趟可搬 ' + (2 + level) + ' 堆羊毛'; }, base: 360, max: 3, requires: 'worker' },
    hayBarn: { icon: '▥', name: '草料仓', desc: function (level) { return '干草容量 +' + level * 12; }, base: 240, max: 3 },
    cistern: { icon: '≈', name: '蓄水池', desc: function (level) { return '清水容量 +' + level * 12; }, base: 220, max: 3 },
    clover: { icon: '♧', name: '三叶草地', desc: function (level) { return '闲逛啃草恢复 ' + level * 4 + ' 饱腹'; }, base: 440, max: 3 },
    shade: { icon: '♠', name: '树荫休憩', desc: function (level) { return '休息恢复幸福度 +' + level * .5; }, base: 320, max: 3 },
    shears: { icon: '✂', name: '精细剪毛', desc: function (level) { return '每次剪毛产量 +' + level * 15 + '%'; }, base: 480, max: 3 },
    merchant: { icon: '¥', name: '集市商路', desc: function (level) { return '原料售价、委托奖励 +' + level * 8 + '%'; }, base: 560, max: 3 },
    workshop: { icon: '▣', name: '礼盒车间', desc: function (level) { return level ? '已解锁礼盒加工' : '牧场 LV8 后解锁礼盒加工'; }, base: 1600, max: 1, unlockAt: 8 }
  };
  var upgradeGroups = { pasture: ['capacity', 'hayBarn', 'cistern', 'feeder', 'clover', 'shade'], flock: ['wool', 'growth', 'shears'], staff: ['worker', 'boots', 'basket'], trade: ['meat', 'merchant', 'workshop'] };
  var activeUpgradeGroup = 'pasture';
  var recipeMeta = {
    wool: { name: '羊毛礼盒', input: 'wool', amount: 2, price: 220, label: '羊毛礼盒' },
    meat: { name: '鲜肉礼盒', input: 'meat', amount: 2.5, price: 380, label: '鲜肉礼盒' }
  };
  var defaultState = {
    calendarVersion: 1, progressionVersion: 1, level: 1, savings: 0, breeds: { normal: true, mint: false, peach: false, rainbow: false }, day: 0, dayPhase: 0, gold: 2380, earned: 0, careDone: false, retired: false, retirementClaimed: false, hay: 26, water: 22, wool: 0, meat: 0, happiness: 88, cycle: 0, savedAt: 0,
    upgrades: { capacity: 0, feeder: 0, wool: 0, growth: 0, meat: 0, worker: 0, workshop: 0, boots: 0, basket: 0, hayBarn: 0, cistern: 0, clover: 0, shade: 0, shears: 0, merchant: 0 },
    worker: { x: 50, y: 88, mode: 'idle', targetId: '', carry: 0, count: 0, direction: 1, until: 0 },
    tradeOrder: { type: 'wool', qty: 3, completed: 0 },
    woolDrops: [], boxes: { wool: 0, meat: 0 }, workshopUnlocked: false, workshop: { recipe: 'wool', progress: 0, running: false }, conveyor: { wool: { progress: 0, running: false }, meat: { progress: 0, running: false } }, order: { type: 'wool', qty: 2, reward: 420 },
    sheep: [
      { id: 's1', name: '棉花糖', age: 8, hunger: 82, thirst: 91, wool: 0, zone: 0, x: 22, y: 28, tx: 22, ty: 28, direction: 1, action: 'idle', actionUntil: 0 },
      { id: 's2', name: '小麦穗', age: 12, hunger: 73, thirst: 69, wool: 15, zone: 1, x: 66, y: 26, tx: 66, ty: 26, direction: -1, action: 'idle', actionUntil: 0 },
      { id: 's3', name: '云朵', age: 16, hunger: 93, thirst: 86, wool: 30, zone: 2, x: 30, y: 68, tx: 30, ty: 68, direction: 1, action: 'idle', actionUntil: 0 },
      { id: 's4', name: '黑豆', age: 20, hunger: 84, thirst: 77, wool: 45, zone: 3, x: 71, y: 68, tx: 71, ty: 68, direction: -1, action: 'idle', actionUntil: 0 }
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
    var ready = !(platformStorage && !storageHydrated) && !cloudBusy;
    var clock = clockSnapshot(state.dayPhase, ready ? Date.now() - clockPhaseStartedAt : 0);
    setText('season-label', '第 ' + state.day + ' 天');
    setText('game-clock', clock.time);
    setText('day-night-icon', clock.night ? '☾' : '☀');
    setText('clock-period', clock.night ? '夜晚' : '白昼');
    setText('clock-countdown', ready ? clock.seconds + ' 秒后' + (clock.night ? '天亮' : '入夜') : '读取进度中');
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
    return Promise.resolve().then(function () { return miniTool.getStorage({ key: platformStorageKey() }); }).then(function (result) {
      if (!result || !Object.prototype.hasOwnProperty.call(result, 'data') || (result.errMsg && result.errMsg !== 'getStorage:ok')) throw new Error('save read failed');
      var data = parseStorageData(result);
      if (data !== null && (!data || !Array.isArray(data.sheep))) throw new Error('invalid save');
      return { ok: true, data: data };
    }).catch(function () { return { ok: false, data: null }; });
  }
  function writePlatformState(snapshot) {
    if (!platformStorage) return Promise.resolve(false);
    return Promise.resolve().then(function () { return miniTool.setStorage({ key: platformStorageKey(), data: snapshot }); }).then(function (result) { return !!result && result.errMsg === 'setStorage:ok'; }).catch(function () { return false; });
  }
  function hydratePlatformState() {
    if (!platformStorage) return;
    return readPlatformState().then(function (result) {
      if (!result.ok) { saveStatus = '存档读取失败'; render(); showToast('账号存档读取失败，已暂停保存，避免覆盖原进度。'); return; }
      if (result.data && Array.isArray(result.data.sheep)) state = mergeState(cloneState(), result.data);
      storageHydrated = true;
      clockPhaseStartedAt = Date.now();
      saveStatus = state.savedAt ? '本机存档已载入' : '全新羊场 · 第 0 天';
      render();
      setupCloudStorage();
      if (pendingPlatformSave) { pendingPlatformSave = false; showToast('账号存档已加载，请再操作一次保存。'); }
    });
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
    cloudBusy = true; setText('save-status', '正在同步云存档');
    var ready = cloudEnabled && !manual ? Promise.resolve(null) : cloudStore.load();
    return ready.then(function (remote) {
      if (remote && (Number(remote.savedAt) || 0) > state.savedAt) {
        state = mergeState(cloneState(), remote); clockPhaseStartedAt = Date.now(); render();
        return saveState(false).then(function (ok) { if (!ok) throw new Error('云端已读取，本机保存失败'); return true; });
      }
      var copy = JSON.parse(JSON.stringify(state)); copy.savedAt = Date.now();
      return cloudStore.save(copy);
    }).then(function () {
      cloudEnabled = true; lastCloudSave = Date.now(); setText('save-status', '云端已同步');
      if (manual) showToast('云存档已同步，同账号换设备可以恢复。'); return true;
    }).catch(function (error) {
      var unauthorized = Number(error.errCode) === 1006;
      if (unauthorized) { document.getElementById('cloud-save-button').hidden = true; cloudStore = null; }
      setText('save-status', unauthorized ? '本机存档 · 云端待开通' : '本机存档 · 云同步未完成');
      if (manual) showToast(unauthorized ? '云存档尚未开通，请先申请平台权限；本机进度仍可保存。' : '云存档未同步成功，本机进度保留；请稍后重试。');
      return false;
    }).then(function (ok) { cloudBusy = false; return ok; });
  }
  function mergeState(base, saved) {
    Object.keys(base).forEach(function (key) { if (saved[key] !== undefined && ['upgrades', 'sheep', 'worker', 'tradeOrder', 'breeds'].indexOf(key) < 0) base[key] = saved[key]; });
    base.day = Math.max(0, (Number(saved.day) || 0) - (saved.calendarVersion === 1 ? 0 : 8));
    base.calendarVersion = 1;
    base.dayPhase = Math.max(0, Math.min(14, Math.floor(Number(base.dayPhase) || 0)));
    if (saved.upgrades) Object.keys(base.upgrades).forEach(function (key) { if (saved.upgrades[key] !== undefined) base.upgrades[key] = Number(saved.upgrades[key]) || 0; });
    base.level = Math.max(1, Math.min(levelMeta.length, Math.floor(Number(saved.level) || 1)));
    if (saved.progressionVersion !== 1) Object.keys(base.upgrades).forEach(function (key) { if (base.upgrades[key]) base.level = Math.max(base.level, upgradeLevels[key] || 1); });
    base.progressionVersion = 1;
    base.savings = Math.max(0, Math.floor(Number(saved.savings) || 0));
    if (saved.retirementClaimed && saved.savings === undefined) base.savings = RETIREMENT_GOAL;
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
    if (saved.tradeOrder) base.tradeOrder = { type: saved.tradeOrder.type === 'meat' ? 'meat' : 'wool', qty: saved.tradeOrder.type === 'meat' ? 1.5 : 3, completed: Number(saved.tradeOrder.completed) || 0 };
    base.sheep = saved.sheep.map(function (sheep, index) {
      var positions = [{ x: 16, y: 24 }, { x: 78, y: 20 }, { x: 41, y: 58 }, { x: 68, y: 68 }], pos = positions[index % positions.length];
      var breed = breedMeta[sheep.breed] ? sheep.breed : 'normal';
      if (breed !== 'normal') base.breeds[breed] = true;
      return { id: sheep.id || 's' + (index + 1), breed: breed, name: sheep.name || sheepNames[index % sheepNames.length], age: Math.max(0, Number(sheep.age) || 0), hunger: Number(sheep.hunger) || 0, thirst: Number(sheep.thirst) || 0, wool: Number(sheep.wool) || 0, zone: Number(sheep.zone) || (index % 4), x: Math.max(13, Math.min(87, Number(sheep.x) || pos.x)), y: Math.max(18, Math.min(78, Number(sheep.y) || pos.y)), direction: Number(sheep.direction) < 0 ? -1 : 1, action: 'idle', actionUntil: 0 };
    });
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
    document.getElementById('modal-kicker').textContent = '一亿退休计划';
    document.getElementById('modal-title').textContent = '羊场交给下一代';
    document.getElementById('modal-copy').textContent = '你带着攒下的积蓄退休，故事停在自己亲手经营好的牧场。';
    document.getElementById('modal-body').innerHTML = '<div class="retirement-ending"><span class="ending-sheep">♧</span><strong>¥' + formatIncome(state.savings) + '</strong><small>这座羊场，会记得你回来过。</small></div>';
    modal.hidden = false;
  }
  function capacity() { return 6 + state.upgrades.capacity * 2; }
  function hayCapacity() { return 40 + state.upgrades.capacity * 5 + state.upgrades.hayBarn * 12; }
  function waterCapacity() { return 40 + state.upgrades.capacity * 5 + state.upgrades.cistern * 12; }
  function tradeBonus() { return 1 + state.upgrades.merchant * .08; }
  function woolPrice() { return Math.round((46 + state.upgrades.wool * 7) * tradeBonus()); }
  function meatPrice() { return Math.round(118 * (1 + state.upgrades.meat * .15) * tradeBonus()); }
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
      button.setAttribute('aria-label', label + '，' + Math.floor(state[type]) + '/' + limit + '，点击花费 ' + refillPrices[type] + ' 金币补充一格');
      button.title = full ? label + '已满' : '点击补一格 · ¥' + refillPrices[type];
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
    renderSheep(); renderDrops(); renderWorker(); renderTable(); renderUpgrades(); renderTradeOrder(); renderWorkshop(); renderControls(); renderProgression(); renderBreeds();
    if (grassField) grassField.attach();
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
    var shearButton = document.querySelector('[data-action="shear"]'), buyButton = document.querySelector('[data-action="buy"]'), butcherButton = document.querySelector('[data-action="butcher"]');
    shearButton.disabled = loading || !ready; shearButton.classList.toggle('is-ready', ready > 0);
    shearButton.title = ready ? '剪下羊毛后，点击草地上的羊毛拾取' : '羊毛生长到 100% 后可剪';
    buyButton.disabled = loading || free <= 0 || state.gold < 280;
    butcherButton.disabled = loading || !adults; butcherButton.classList.toggle('is-ready', adults > 0);
    setText('shear-ready', ready ? ready + ' 只可剪' : '长毛 ' + Math.floor(nextWool) + '%');
    setText('shear-hint', ready ? '剪下后点击草地拾取' : '羊毛长满后再开剪');
    setText('buy-hint', free <= 0 ? '先升级羊圈扩建' : '羊圈还有 ' + free + ' 个空位');
    setText('butcher-ready', adults ? adults + ' 只成年' : '小羊成长中');
    setText('butcher-hint', adults ? '选择成年羊换取羊肉' : '长到 60 日龄可出栏');
    document.getElementById('shear-progress').style.width = Math.min(100, nextWool) + '%';
    ['wool', 'meat'].forEach(function (type) {
      var button = document.querySelector('[data-action="sell-' + type + '"]');
      button.disabled = loading || state[type] <= 0;
      setText(type + '-revenue', state[type] > 0 ? '+¥' + gold(state[type] * (type === 'wool' ? woolPrice() : meatPrice())) : '暂无可售');
    });
    var step = 1, title = '先给羊添一次草或水', copy = '点击两侧槽位，每次补一格并消耗金币。';
    if (!state.sheep.length) { title = '羊圈空了，先购入一只小羊'; copy = '点购入按钮，每只小羊需要 ¥280。'; }
    else if (state.hay < hayCapacity() * .2 || state.water < waterCapacity() * .2) { title = '补给见底了，先添草加水'; }
    else if (state.woolDrops.length) { step = 3; title = '草地上有 ' + state.woolDrops.length + ' 堆羊毛待拾取'; copy = state.upgrades.worker ? '雇工正在搬运，你也可以点击羊毛帮忙。' : '点击草地上的羊毛，收进仓库再卖。'; }
    else if (ready) { step = 2; title = ready + ' 只羊可以剪毛了'; copy = '点金色剪毛按钮，羊毛会掉在草地上。'; }
    else if (state.wool > 0 || state.meat > 0) { step = 4; title = '仓库有货，去集市出售'; copy = '收入进入钱包；可用于升级、购买羊仔或存入退休金。'; }
    else if (state.careDone || state.cycle > 0) { step = 2; title = '羊毛正在生长 · ' + Math.floor(nextWool) + '%'; copy = '羊会自己寻找草和水；长满后剪毛按钮会亮起。'; }
    if (loading) { title = '正在读取你的羊场'; copy = '读取完成后开始经营，避免覆盖已有进度。'; }
    setText('guide-title', title); setText('guide-copy', copy); setText('guide-step', '0' + step + ' / 04');
    document.querySelector('.hay-station').classList.toggle('supply-attention', state.hay < hayCapacity() * .2);
    document.querySelector('.water-station').classList.toggle('supply-attention', state.water < waterCapacity() * .2);
  }
  function relativeSave(time) { var seconds = Math.max(0, Math.floor((Date.now() - time) / 1000)); return seconds < 8 ? '刚刚' : seconds < 60 ? seconds + ' 秒前' : Math.floor(seconds / 60) + ' 分钟前'; }
  function sheepPose(sheep) {
    var action = sheep.action || 'idle';
    return action === 'sitting' ? 'sit' : action === 'lying' ? 'lie' : action === 'sleeping' ? 'sleep' : action === 'drinking' ? 'drink' : action === 'eating' || action === 'grazing' ? 'eat' : 'idle';
  }
  function sheepImage(sheep) {
    return './assets/sheep/' + (isAdult(sheep) ? 'adult' : 'young') + '-' + (sheep.breed || 'normal') + '-' + (sheep.wool > 0 ? 'wool' : 'shorn') + '-' + sheepPose(sheep) + '.png';
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
    field.innerHTML = state.sheep.map(function (sheep, index) {
      return '<div class="' + sheepClass(sheep) + '" style="left:' + sheep.x.toFixed(2) + '%;top:' + sheep.y.toFixed(2) + '%;z-index:' + Math.round(sheep.y * height / 100 + sheepFeet(sheep) - 1) + ';--flip:' + sheep.direction + ';" data-sheep-id="' + esc(sheep.id) + '" title="' + breedMeta[sheep.breed || 'normal'].name + (isAdult(sheep) ? ' · 成年可出栏' : ' · 幼羊成长中') + '"><span class="sheep-emoji" aria-hidden="true"><img class="sheep-art" src="' + sheepImage(sheep) + '" width="52" height="52" alt="" draggable="false"></span><span class="sleep-z" aria-hidden="true">💤</span></div>';
    }).join('');
  }
  function renderDrops() {
    var field = document.getElementById('sheep-field');
    var oldDrops = field.querySelectorAll('.wool-drop'); for (var i = 0; i < oldDrops.length; i += 1) oldDrops[i].remove();
    state.woolDrops.forEach(function (drop) {
      var button = document.createElement('button'); button.type = 'button'; button.className = 'wool-drop'; button.setAttribute('data-drop-id', drop.id); button.style.left = drop.x.toFixed(1) + '%'; button.style.top = drop.y.toFixed(1) + '%'; button.setAttribute('aria-label', '拾取 ' + number(drop.amount, 1) + ' kg 羊毛'); button.innerHTML = '<span class="wool-drop-sprite"></span>'; field.appendChild(button);
    });
  }
  function renderTable() {
    var table = document.getElementById('sheep-table');
    table.innerHTML = state.sheep.map(function (sheep, index) {
      var status = canShear(sheep) ? '<span class="row-tag ready">羊毛可收</span>' : isAdult(sheep) ? '<span class="row-tag adult">已成年</span>' : '<span class="row-tag">成长中</span>';
      var ageLabel = isAdult(sheep) ? '成年 · ' + Math.floor(sheep.age) + ' 日龄' : '幼羊 · ' + Math.floor(sheep.age) + ' 日龄';
      return '<div class="sheep-row"><span class="row-avatar"><img class="flock-portrait" src="' + sheepImage(sheep) + '" alt=""></span><div><span class="row-name">' + breedMeta[sheep.breed || 'normal'].name + ' #' + (index + 1) + '</span><span class="row-meta">' + ageLabel + ' · 饱腹 ' + Math.round(sheep.hunger) + '%</span></div><div class="meter"><span style="width:' + Math.min(100, sheep.wool) + '%"></span></div>' + status + '</div>';
    }).join('');
  }
  function renderUpgrades() {
    var list = document.getElementById('upgrade-list');
    list.innerHTML = upgradeGroups[activeUpgradeGroup].map(function (key) {
      var meta = upgradeMeta[key], level = state.upgrades[key], cost = meta.base * (level + 1), maxed = level >= meta.max, required = featureLevel(key), locked = farmLevel() < required && !level;
      if (locked) return required === farmLevel() + 1 ? '<div class="locked-feature"><span>▣</span><div><strong>' + meta.name + '</strong><small>牧场 LV' + required + ' 后开放 · 再花费 ¥' + cost + ' 解锁</small></div></div>' : '';
      var prerequisite = meta.requires && !state.upgrades[meta.requires];
      var dots = ''; for (var i = 0; i < meta.max; i += 1) dots += '<i class="' + (i < level ? 'filled' : '') + '"></i>';
      var symbols = { capacity: 'barn', feeder: 'hay', wool: 'sheep', growth: 'clover', meat: 'meat', worker: 'worker', boots: 'worker', basket: 'order', hayBarn: 'hay', cistern: 'water', clover: 'clover', shade: 'tree', shears: 'shear', merchant: 'market', workshop: 'barn' };
      var unaffordable = state.gold < cost;
      return '<div class="upgrade-item"><span class="upgrade-symbol"><span class="px-icon icon-' + symbols[key] + '" aria-hidden="true"></span></span><div class="upgrade-copy"><strong>' + meta.name + '<span class="upgrade-level">' + level + '/' + meta.max + '</span></strong><small>' + (maxed ? meta.desc(level) : '下一级：' + meta.desc(level + 1)) + '</small><span class="level-dots">' + dots + '</span></div><button class="upgrade-button" type="button" data-upgrade="' + key + '" ' + (maxed || locked || prerequisite || unaffordable ? 'disabled' : '') + ' title="' + (unaffordable && !maxed ? '还差 ¥' + gold(cost - state.gold) : '升级立即生效') + '">' + (maxed ? (meta.max === 1 ? '已解锁' : '已满级') : prerequisite ? '先雇工' : locked ? '需 LV' + meta.unlockAt : '升级<br>¥' + gold(cost)) + '</button></div>';
    }).join('') || '<p class="progression-note">继续提升牧场等级，逐步开放这里的新设施。</p>';
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
    document.getElementById('late-workshop').hidden = farmLevel() < 8 && !state.workshopUnlocked;
    setText('flock-bonus', '羊毛速度 +' + Math.round((flockBonus('mint') - 1) * 100) + '% · 成长速度 +' + Math.round((flockBonus('peach') - 1) * 100) + '%');
  }
  function breedCards() {
    var html = Object.keys(breedMeta).map(function (key) {
      var meta = breedMeta[key], unlocked = state.breeds[key], locked = farmLevel() < meta.level, loading = platformStorage && !storageHydrated;
      if (locked && meta.level > farmLevel() + 1) return '';
      var canBuy = state.gold >= meta.price && state.sheep.length < capacity();
      return '<div class="breed-card breed-' + key + '"><img src="./assets/sheep/young-' + key + '-wool-idle.png" width="64" height="64" alt="' + meta.name + '羊仔"><div><strong>' + meta.name + '</strong><small>' + meta.desc + '</small><em>LV' + meta.level + ' · 羊仔 ¥' + gold(meta.price) + '</em></div><button type="button" ' + (unlocked ? 'data-buy-breed="' + key + '"' : 'data-unlock-breed="' + key + '"') + (loading || locked || (unlocked ? !canBuy : state.gold < meta.unlock) ? ' disabled' : '') + '>' + (locked ? 'LV' + meta.level + '开放' : unlocked ? '购买羊仔<br>¥' + gold(meta.price) : '解锁品种<br>¥' + gold(meta.unlock)) + '</button></div>';
    }).join('');
    if (farmLevel() < 3) html += '<p class="progression-note">LV4 起逐步发现特殊羊种，先经营普通羊群，提升牧场等级。</p>';
    return html;
  }
  function renderBreeds() {
    var html = breedCards(), inline = document.getElementById('breed-list'), nursery = document.getElementById('nursery-list');
    if (inline) inline.innerHTML = html;
    if (nursery) nursery.innerHTML = html;
  }
  function openNursery() {
    document.getElementById('modal-kicker').textContent = '羊种商店 · LV' + farmLevel();
    document.getElementById('modal-title').textContent = '挑一只羊仔回家';
    document.getElementById('modal-copy').textContent = '幼羊能长毛和剪毛；长到 60 日龄后才可出栏。特殊品种需先解锁，再购买羊仔。';
    document.getElementById('modal-body').innerHTML = '<div id="nursery-list">' + breedCards() + '</div>';
    document.getElementById('modal').hidden = false;
  }
  function renderTradeOrder() {
    var order = state.tradeOrder, label = order.type === 'wool' ? '羊毛' : '羊肉';
    setText('trade-copy', '收购' + label + ' ' + order.qty + ' kg');
    setText('trade-stock', '仓库 ' + number(state[order.type], 1) + ' / ' + order.qty + ' kg');
    document.getElementById('trade-icon').className = 'trade-icon product-icon ' + order.type;
    setText('trade-reward', '¥' + tradeReward()); setText('trade-count', order.completed);
  }
  function tradeReward() { return Math.round(state.tradeOrder.qty * (state.tradeOrder.type === 'wool' ? woolPrice() : meatPrice()) * 1.3); }
  function deliverTradeOrder() {
    if (farmLevel() < 3) { showToast('牧场 LV3 后开放山谷订单。'); return; }
    var order = state.tradeOrder, reward = tradeReward();
    if (state[order.type] < order.qty) { showToast('仓库原料不足，先收集或出栏。'); return; }
    state[order.type] -= order.qty; bookIncome(reward);
    state.tradeOrder = { type: order.type === 'wool' ? 'meat' : 'wool', qty: order.type === 'wool' ? 1.5 : 3, completed: order.completed + 1 };
    saveState(false); showToast('委托完成 · +¥' + reward + '，新的收购单已到。');
  }
  function renderWorkshop() {
    var locked = !state.workshopUnlocked;
    var lockedPanel = document.getElementById('workshop-locked'), unlockedPanel = document.getElementById('workshop-unlocked');
    if (lockedPanel) lockedPanel.hidden = !locked;
    if (unlockedPanel) unlockedPanel.hidden = locked;
    if (locked) return;
    var recipe = recipeMeta[state.workshop.recipe], line = state.conveyor[state.workshop.recipe], stateBadge = document.getElementById('workshop-state');
    stateBadge.textContent = line.running ? '加工中' : line.progress >= 100 ? '已完成' : '待机';
    stateBadge.className = 'workshop-state ' + (line.running ? 'running' : line.progress >= 100 ? 'done' : '');
    setText('workshop-status', line.running ? '正在制作 · ' + recipe.name : line.progress >= 100 ? recipe.name + ' 已出炉' : recipe.name + ' · 需要 ' + number(recipe.amount, 1) + ' kg 原料');
    setText('workshop-progress-label', Math.round(line.progress) + '%');
    var progress = document.getElementById('workshop-progress'); if (progress) progress.style.width = Math.min(100, line.progress) + '%';
    setText('box-stock', state.boxes.wool + state.boxes.meat);
    var orderMeta = recipeMeta[state.order.type]; setText('order-copy', orderMeta.label + ' × ' + state.order.qty); setText('order-reward', '¥' + gold(state.order.reward));
    var tabs = document.querySelectorAll('[data-recipe]'); for (var i = 0; i < tabs.length; i += 1) tabs[i].classList.toggle('active', tabs[i].getAttribute('data-recipe') === state.workshop.recipe);
  }
  function refillSupply(type) {
    var limit = type === 'hay' ? hayCapacity() : waterCapacity();
    var label = type === 'hay' ? '干草' : '清水';
    var price = refillPrices[type];
    if (state[type] >= limit) { showToast(label + '槽已满。'); return; }
    if (state.gold < price) { showToast('补充一格' + label + '需要 ' + price + ' 金币。'); return; }
    state.gold -= price;
    state[type] = Math.min(limit, state[type] + limit / 10);
    state.careDone = true;
    saveState(false);
    showToast(label + '补充一格 · −¥' + price);
  }
  function shear() {
    var ready = readySheep();
    if (!ready.length) { showToast('还没有羊毛长满，等一会儿再来看看。'); return; }
    var amount = ready.reduce(function (sum, sheep) { var wool = (1.2 + state.upgrades.wool * .18 + (state.happiness / 100) * .35) * (1 + state.upgrades.shears * .15) * breedMeta[sheep.breed || 'normal'].wool; sheep.wool = 0; state.woolDrops.push({ id: 'drop-' + sheep.id + '-' + Date.now() + '-' + Math.floor(Math.random() * 999), x: Math.max(14, Math.min(86, sheep.x + (Math.random() * 8 - 4))), y: Math.max(18, Math.min(78, sheep.y + (Math.random() * 8 - 4))), amount: wool }); return sum + wool; }, 0);
    render(); saveState(false); showToast('剪下 ' + number(amount, 1) + ' kg 羊毛，掉在草地上，点击羊毛拾取。');
  }
  function buySheep(key) {
    key = key || 'normal';
    var meta = breedMeta[key];
    if (!meta || !state.breeds[key] || farmLevel() < meta.level) { showToast('先提升牧场等级并解锁这个品种。'); return false; }
    if (state.sheep.length >= capacity()) { showToast('羊圈已经满啦，先升级羊圈扩建。'); return; }
    if (state.gold < meta.price) { showToast('购买' + meta.name + '羊仔需要 ¥' + gold(meta.price) + '。'); return false; }
    var index = state.sheep.length, spawnX = 28 + Math.random() * 42, spawnY = 25 + Math.random() * 42;
    state.gold -= meta.price; state.sheep.push({ id: 's' + Date.now() + '-' + (++sheepSequence), breed: key, name: sheepNames[index % sheepNames.length], age: 0, hunger: 100, thirst: 100, wool: 0, zone: index % 4, x: spawnX, y: spawnY, tx: spawnX, ty: spawnY, direction: 1, action: 'idle', actionUntil: 0 });
    state.happiness = Math.min(100, state.happiness + 1); render(); saveState(false); showToast(meta.name + '羊仔加入羊群。'); return true;
  }
  function sellWool() {
    if (state.wool <= 0) { showToast('仓库里还没有可出售的羊毛。'); return; }
    var revenue = state.wool * woolPrice(); bookIncome(revenue); state.wool = 0; render(); saveState(false); showToast('羊毛卖出 ¥' + gold(revenue) + '，行情不错！');
  }
  function sellMeat() {
    if (state.meat <= 0) { showToast('还没有羊肉库存，先让成年羊出栏。'); return; }
    var revenue = state.meat * meatPrice(); bookIncome(revenue); state.meat = 0; render(); saveState(false); showToast('羊肉卖出 ¥' + gold(revenue) + '，冷鲜仓很值钱。');
  }
  function pickWool(id) {
    var picked = null; state.woolDrops = state.woolDrops.filter(function (drop) { if (drop.id === id) { picked = drop; return false; } return true; });
    if (!picked) return; state.wool += picked.amount; render(); saveState(false); showToast('拾取 ' + number(picked.amount, 1) + ' kg 羊毛，送进仓库。');
  }
  function startConveyor(type) {
    if (!state.workshopUnlocked) { showToast('牧场 LV8 后，在升级面板花费 ¥1600 解锁礼盒车间。'); return; }
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
    var revenue = woolBoxes * recipeMeta.wool.price + meatBoxes * recipeMeta.meat.price; bookIncome(revenue); state.boxes.wool = 0; state.boxes.meat = 0; render(); saveState(false); showToast('礼盒售出 ¥' + gold(revenue) + '，加工比散卖更划算。');
  }
  function deliverOrder() {
    if (!state.workshopUnlocked) { showToast('礼盒车间还未解锁。'); return; }
    var order = state.order, available = state.boxes[order.type];
    if (available < order.qty) { showToast('订单需要 ' + recipeMeta[order.type].label + ' × ' + order.qty + '，车间库存还不够。'); return; }
    state.boxes[order.type] -= order.qty; bookIncome(order.reward); state.order = { type: order.type === 'wool' ? 'meat' : 'wool', qty: order.type === 'wool' ? 1 : 2, reward: order.type === 'wool' ? 520 : 420 }; render(); saveState(false); showToast('订单交付完成，奖励 ¥' + gold(order.reward) + '。');
  }
  function openButcher() {
    var adults = readyAdults(), modal = document.getElementById('modal'), body = document.getElementById('modal-body');
    if (!adults.length) { showToast('还没有成年羊，成长到 60 日龄后才能出栏。'); return; }
    document.getElementById('modal-kicker').textContent = '成年出栏'; document.getElementById('modal-title').textContent = '选择成年羊';
    document.getElementById('modal-copy').textContent = '仅成年羊可出栏。可以出售活羊，或获取羊肉后去集市售卖。特殊羊出售后，全场加成随之减少。';
    body.innerHTML = adults.map(function (sheep, index) { var kg = 1.8 + Math.min(1.4, sheep.age / 60 * .6); return '<div class="adult-choice"><img class="adult-portrait" src="' + sheepImage(sheep) + '" alt=""><div><strong>' + breedMeta[sheep.breed || 'normal'].name + ' #' + (index + 1) + '</strong><small>' + Math.floor(sheep.age) + ' 日龄 · 羊肉 ' + number(kg, 1) + ' kg</small></div><div class="adult-sale-actions"><button type="button" data-live-sale-id="' + esc(sheep.id) + '">卖活羊 ¥' + gold(liveSheepPrice(sheep)) + '</button><button type="button" data-butcher-id="' + esc(sheep.id) + '">获取羊肉</button></div></div>'; }).join('');
    modal.hidden = false;
  }
  function butcher(id) {
    var sheep = find(id); if (!sheep || !isAdult(sheep)) { showToast('幼羊还不能出栏。'); return; }
    var kg = 1.8 + Math.min(1.4, sheep.age / 60 * .6);
    state.meat += kg; state.sheep = state.sheep.filter(function (item) { return item.id !== id; }); state.happiness = Math.max(45, state.happiness - 1); document.getElementById('modal').hidden = true; render(); saveState(false); showToast('一只成年羊已出栏，获得 ' + number(kg, 1) + ' kg 羊肉。');
  }
  function liveSheepPrice(sheep) { return Math.round(breedMeta[sheep.breed || 'normal'].sale * tradeBonus() * (1 + Math.min(.5, Math.max(0, sheep.age - 60) / 240))); }
  function sellLiveSheep(id) {
    var sheep = find(id); if (!sheep || !isAdult(sheep)) { showToast('幼羊还不能出售。'); return false; }
    var price = liveSheepPrice(sheep); state.sheep = state.sheep.filter(function (s) { return s.id !== id; }); bookIncome(price);
    document.getElementById('modal').hidden = true; render(); saveState(false); showToast(breedMeta[sheep.breed || 'normal'].name + '已售出 · +¥' + gold(price)); return true;
  }
  function upgrade(key) {
    var meta = upgradeMeta[key]; if (!meta) return;
    if (!state.upgrades[key] && farmLevel() < featureLevel(key)) { showToast(meta.name + '需要牧场 LV' + featureLevel(key) + ' 后开放。'); return; }
    var level = state.upgrades[key]; if (level >= meta.max) return;
    if (meta.requires && !state.upgrades[meta.requires]) { showToast('先雇佣一位牧场工。'); return; }
    if (meta.unlockAt && farmLevel() < meta.unlockAt) { showToast('先把牧场升到 LV' + meta.unlockAt + '，再解锁礼盒车间。'); return; }
    var cost = meta.base * (level + 1);
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
      var art = node.querySelector('.sheep-art'), source = sheepImage(sheep);
      if (art && art.getAttribute('src') !== source) art.setAttribute('src', source);
    }
  }
  function restPose() { var roll = Math.random(); return roll < .45 ? 'idle' : roll < .72 ? 'sitting' : 'lying'; }
  function animateSheep() {
    if ((platformStorage && !storageHydrated) || cloudBusy) return;
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
    setText('staff-copy', labels[w.mode]); setText('staff-load', w.count + ' / ' + (2 + state.upgrades.basket));
  }
  function nearestWool(worker) {
    return state.woolDrops.slice().sort(function (a, b) {
      var size = fieldSize();
      function distance(d) { return Math.pow((d.x - worker.x) * size.width, 2) + Math.pow((d.y - worker.y) * size.height, 2); }
      return distance(a) - distance(b);
    })[0];
  }
  function animateWorker(now, size) {
    if (!state.upgrades.worker) return;
    var w = state.worker, target = state.woolDrops.filter(function (drop) { return drop.id === w.targetId; })[0];
    if (w.mode === 'picking') {
      if (now < w.until) { renderWorker(); return; }
      if (target) { state.woolDrops = state.woolDrops.filter(function (drop) { return drop.id !== target.id; }); w.carry += target.amount; w.count += 1; renderDrops(); }
      w.targetId = ''; w.mode = 'idle';
    }
    if (w.mode === 'unloading') {
      if (now < w.until) { renderWorker(); return; }
      state.wool += w.carry; var collected = w.carry; w.carry = 0; w.count = 0; w.mode = 'idle';
      saveState(false); showToast('雇工入库 ' + number(collected, 1) + ' kg 羊毛。');
    }
    if (w.mode === 'idle' || (w.mode === 'walking' && !target)) {
      target = nearestWool(w);
      if (w.count && (!target || w.count >= 2 + state.upgrades.basket)) { w.mode = 'carrying'; w.targetId = ''; }
      else if (target) { w.mode = 'walking'; w.targetId = target.id; }
      else { w.mode = w.carry ? 'carrying' : 'idle'; w.targetId = ''; }
    }
    if (w.mode === 'walking' || w.mode === 'carrying') {
      var tx = w.mode === 'carrying' ? 50 : target.x, ty = w.mode === 'carrying' ? 88 : target.y;
      var dx = (tx - w.x) * size.width / 100, dy = (ty - w.y) * size.height / 100, dist = Math.sqrt(dx * dx + dy * dy), step = 6.72 * (1 + state.upgrades.boots * .25);
      if (dist <= step) { w.x = tx; w.y = ty; w.mode = w.mode === 'carrying' ? 'unloading' : 'picking'; w.until = now + 780; }
      else { w.x += dx / dist * step / size.width * 100; w.y += dy / dist * step / size.height * 100; if (Math.abs(dx) > .1) w.direction = dx < 0 ? -1 : 1; }
    }
    renderWorker();
  }
  function tick() {
    if ((platformStorage && !storageHydrated) || cloudBusy) return;
    state.cycle += 1; state.dayPhase = (Number(state.dayPhase) + 1) % 15; if (state.dayPhase === 0) state.day += 1;
    clockPhaseStartedAt = Date.now();
    state.sheep.forEach(function (sheep) {
      sheep.hunger = Math.max(0, sheep.hunger - 2.5); sheep.thirst = Math.max(0, sheep.thirst - 3);
      sheep.age += (.9 + state.upgrades.growth * .2) * flockBonus('peach'); sheep.wool = Math.min(100, sheep.wool + (8.4 + state.upgrades.wool * 1.05) * flockBonus('mint'));
    });
    if (state.workshopUnlocked) { advanceConveyor('wool'); advanceConveyor('meat'); }
    var average = state.sheep.length ? state.sheep.reduce(function (sum, sheep) { return sum + Math.min(sheep.hunger, sheep.thirst); }, 0) / state.sheep.length : 0;
    state.happiness = Math.max(30, Math.min(100, state.happiness + (average > 65 ? .4 : -.8)));
    render(); if (state.cycle % 3 === 0) autoSave();
  }

  document.addEventListener('click', function (event) {
    var actionButton = event.target.closest ? event.target.closest('[data-action]') : null;
    var upgradeButton = event.target.closest ? event.target.closest('[data-upgrade]') : null;
    var butcherButton = event.target.closest ? event.target.closest('[data-butcher-id]') : null;
    var dropButton = event.target.closest ? event.target.closest('[data-drop-id]') : null;
    var breedButton = event.target.closest ? event.target.closest('[data-buy-breed]') : null;
    var unlockButton = event.target.closest ? event.target.closest('[data-unlock-breed]') : null;
    var liveButton = event.target.closest ? event.target.closest('[data-live-sale-id]') : null;
    if ((actionButton || upgradeButton || butcherButton || dropButton || breedButton || unlockButton || liveButton) && ((platformStorage && !storageHydrated) || cloudBusy)) {
      if (actionButton && actionButton.getAttribute('data-action') === 'save' && !cloudBusy) hydratePlatformState();
      showToast('正在读取存档，请稍候再操作。'); return;
    }
    if (actionButton) {
      var action = actionButton.getAttribute('data-action');
      if (action === 'feed') refillSupply('hay'); else if (action === 'water') refillSupply('water'); else if (action === 'shear') shear(); else if (action === 'buy') openNursery(); else if (action === 'sell-wool') sellWool(); else if (action === 'sell-meat') sellMeat(); else if (action === 'butcher') openButcher(); else if (action === 'start-workshop') startWorkshop(); else if (action === 'sell-boxes') sellBoxes(); else if (action === 'deliver-order') deliverOrder(); else if (action === 'retire') retire(); else if (action === 'close-modal') document.getElementById('modal').hidden = true; else if (action === 'save') saveState(true);
      else if (action === 'trade-order') deliverTradeOrder();
      else if (action === 'cloud-save') syncCloudStorage(true);
      else if (action === 'deposit') depositSavings();
      else if (action === 'deposit-all') depositSavings(Math.floor(state.gold));
      else if (action === 'level-up') levelUp();
    }
    if (upgradeButton && !upgradeButton.disabled) upgrade(upgradeButton.getAttribute('data-upgrade'));
    if (butcherButton) butcher(butcherButton.getAttribute('data-butcher-id'));
    if (dropButton) pickWool(dropButton.getAttribute('data-drop-id'));
    if (breedButton && !breedButton.disabled) buySheep(breedButton.getAttribute('data-buy-breed'));
    if (unlockButton && !unlockButton.disabled) unlockBreed(unlockButton.getAttribute('data-unlock-breed'));
    if (liveButton) sellLiveSheep(liveButton.getAttribute('data-live-sale-id'));
    var groupButton = event.target.closest ? event.target.closest('[data-upgrade-group]') : null;
    if (groupButton) {
      activeUpgradeGroup = groupButton.getAttribute('data-upgrade-group');
      document.querySelectorAll('[data-upgrade-group]').forEach(function (button) { button.classList.toggle('active', button === groupButton); });
      renderUpgrades();
    }
    var panelTab = event.target.closest ? event.target.closest('[data-panel-tab]') : null;
    if (panelTab) {
      var panelName = panelTab.getAttribute('data-panel-tab');
      document.querySelectorAll('[data-panel-tab]').forEach(function (tab) { tab.classList.toggle('active', tab === panelTab); });
      document.querySelectorAll('[data-panel-view]').forEach(function (view) { view.classList.toggle('active', view.getAttribute('data-panel-view') === panelName); });
    }
    var recipeButton = event.target.closest ? event.target.closest('[data-recipe]') : null;
    if (recipeButton) chooseRecipe(recipeButton.getAttribute('data-recipe'));
  });
  document.getElementById('modal').addEventListener('click', function (event) { if (event.target === this) this.hidden = true; });
  window.addEventListener('resize', function () {
    state.sheep.forEach(function (sheep) { sheep.tx = undefined; sheep.actionUntil = 0; sheep.action = 'idle'; sheep.actionTarget = ''; sheep.troughSlot = null; });
  });
  if (typeof window.createFarmGrassField === 'function') grassField = window.createFarmGrassField({ field:document.getElementById('sheep-field'), scene:document.getElementById('pasture-scene'), getActors:grassActors });
  render(); hydratePlatformState(); setInterval(tick, 4000); setInterval(autoSave, AUTO_SAVE_INTERVAL); setInterval(animateSheep, 260); setInterval(renderClock, 250);
  if (document.addEventListener) document.addEventListener('visibilitychange', handleVisibilityChange);
  if (window.addEventListener) { window.addEventListener('pagehide', saveOnLifecycle); window.addEventListener('beforeunload', saveOnLifecycle); }
}());
