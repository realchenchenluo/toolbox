/* Exercise the actual offline game logic with a clock and geometric scene stub. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/app.js'), 'utf8');
function boot(saved, width = 640, height = 400, account = null, sharedPlatformStore = null, behavior = {}) {
  let now = 100000, persisted, legacyReads = 0;
  const nodes = new Map();
  function node(key) {
    if (!nodes.has(key)) nodes.set(key, {
      style: {setProperty(k,v) {this[k]=v;}}, classList: {add(){},remove(){},toggle(){}},
      setAttribute(k,v) {this[k]=v;}, getAttribute(k){return this[k];}, appendChild(){}, remove(){}, addEventListener(){},
      querySelector(sel) {return node(key + sel);}, querySelectorAll() {return [];},
      getBoundingClientRect() {
        if (key.includes('hay-station')) return {left:10,right:33,top:110,bottom:290,width:23,height:180};
        if (key.includes('water-station')) return {left:width-33,right:width-10,top:110,bottom:290,width:23,height:180};
        return {left:0,top:0,width,height,right:width,bottom:height};
      }
    });
    return nodes.get(key);
  }
  const document = {getElementById:node,querySelector:node,querySelectorAll(){return [];},createElement:node,addEventListener(name,fn){listeners[name]=fn;}};
  const storage = {getItem(){legacyReads++;return saved ? JSON.stringify(saved) : null;},setItem(k,v){persisted=JSON.parse(v);}};
  const platformData = sharedPlatformStore || {};
  const xhs = account ? {launchOptions:{userId:account},miniTool:{
    getStorage({key}) { if(behavior.readHang) return new Promise(()=>{}); if(behavior.readError) return Promise.reject(new Error('read failed')); if(behavior.readFailureResponse) return Promise.resolve({errMsg:'getStorage:fail'}); return Promise.resolve({data:behavior.corrupt ? 'broken-json' : platformData[key] === undefined ? null : platformData[key]}); },
    setStorage({key,data}) { if(behavior.writeHang) return new Promise(resolve=>{behavior.resolveWrite=resolve;}); if(behavior.writeError)return Promise.reject(new Error('write failed'));platformData[key]=data; return Promise.resolve({errMsg:'setStorage:ok'}); }
  }} : undefined;
  if(xhs && behavior.missingStorage) delete xhs.miniTool.getStorage;
  const stableMath=Object.assign(Object.create(Math),{random:()=>.25});
  const intervals=[],timers=[],listeners={};
  const context = vm.createContext({document, window:{localStorage:storage,xhs:xhs,addEventListener(){}},setInterval(fn,ms){intervals.push(ms);},setTimeout(fn,ms){const timer={fn,ms};timers.push(timer);return timer;},clearTimeout(timer){if(timer)timer.canceled=true;},Date:class extends Date {static now(){return now;}},Math:stableMath,console});
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/farm-orders.js'),'utf8'),context);
  vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../assets/farm-help.js'),'utf8'),context);
  vm.runInContext((behavior.source || source).replace('if (!window.xhs) maybeStartTutorial();','').replace('render(); hydratePlatformState(); setInterval(tick, 4000);', 'window.__farm = {state:state,helpContext:helpContext,listHTML:listHTML,releaseControls:releaseControls,restartTutorial:restartTutorial,render:render,syncCloudStorage:syncCloudStorage,__setCloud:function(store){cloudStore=store;},specialFeedPrice:specialFeedPrice,buySpecialFeed:buySpecialFeed,recipeUnitPrice:recipeUnitPrice,rainbowCount:rainbowCount,openButcher:openButcher,selectSaleSheep:selectSaleSheep,selectAllSaleSheep:selectAllSaleSheep,sellSelectedSheep:sellSelectedSheep,renderSaleSummary:renderSaleSummary,capacity:capacity,refillPrice:refillPrice,customerBonuses:customerBonuses,maybeStartTutorial:maybeStartTutorial,finishTutorial:finishTutorial,tutorialStep:tutorialStep,claimRainbowReward:claimRainbowReward,breedCards:breedCards,openNursery:openNursery,openRules:openRules,closeModal:closeModal,animateSheepFrames:animateSheepFrames,levelMeta:levelMeta,upgradeMeta:upgradeMeta,breedMeta:breedMeta,woolPrice:woolPrice,meatPrice:meatPrice,recipeUnitPrice:typeof recipeUnitPrice==="function"?recipeUnitPrice:null,orderReward:typeof orderReward==="function"?orderReward:null,upgradeCost:typeof upgradeCost==="function"?upgradeCost:null,refillSupply:refillSupply,upgrade:upgrade,shear:shear,tick:tick,animateSheep:animateSheep,autoSave:autoSave,clockSnapshot:clockSnapshot,saveOnLifecycle:saveOnLifecycle,depositSavings:depositSavings,levelUp:levelUp,unlockBreed:unlockBreed,flockBonus:flockBonus,sheepImage:sheepImage,sellLiveSheep:sellLiveSheep,pickWool:pickWool,saveState:saveState,chooseSheepTarget:chooseSheepTarget,troughTarget:troughTarget,deliverTradeOrder:deliverTradeOrder,tradeReward:tradeReward,hayCapacity:hayCapacity,waterCapacity:waterCapacity,bookIncome:bookIncome,retire:retire,sellWool:sellWool,sellMeat:sellMeat,sellBoxes:sellBoxes,deliverOrder:deliverOrder,buySheep:buySheep,butcher:butcher,startConveyor:startConveyor,advanceConveyor:advanceConveyor,hydratePlatformState:hydratePlatformState,platformStorageKey:platformStorageKey,__markStorageHydrated:function(){storageHydrated=true;}}; Object.defineProperty(window.__farm,"state",{get:function(){return state;}}); render(); setInterval(tick, 4000);'), context);
  return {game:context.window.__farm,step(ms=260){now+=ms;context.window.__farm.animateSheep();},saved(){return persisted;},nodes,intervals,timers,listeners,platformData,legacyReads(){return legacyReads;}};
}

module.exports = boot;
