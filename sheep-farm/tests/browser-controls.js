(function(){
 var run=document.createElement('button');run.id='qa-run';run.textContent='运行按钮回归测试';run.style.cssText='position:fixed;bottom:4px;left:4px;z-index:10000;font-size:12px';document.body.appendChild(run);
 var out=document.createElement('pre');out.id='qa-results';out.hidden=true;document.body.appendChild(out);
 run.addEventListener('click',async function(){
  var q=window.FarmQA,reports=[];
  function assert(v,label){if(!v)throw Error(label);reports.push(label);}
  function click(selector){var n=document.querySelector(selector);if(!n||n.disabled)throw Error('不可点击 '+selector);n.click();return n;}
  function action(name){return click('[data-action="'+name+'"]');}
  function pause(){return new Promise(function(resolve){setTimeout(resolve,330);});}
  function s(){return q.state;}
  try{
   q.reset(1);s().hay=0;s().water=0;q.render();var cash=s().gold;
   action('feed');action('water');assert(s().gold===cash-4,'草/水实际扣费');
   action('shear');assert(s().woolDrops.length===3,'剪毛落地');
   var drop=document.querySelector('.wool-drop');q.tick();assert(drop.isConnected,'刷新保留羊毛按钮');
   click('[data-drop-id]');assert(s().woolDrops.length===2,'羊毛拾取响应');
   action('sell-wool');assert(s().wool===0,'出售羊毛');action('sell-meat');assert(s().meat===0,'出售羊肉');
   action('level-up');assert(s().level===2,'等级升级');
   for(var tab of ['market','upgrade','order','flock','ledger']){click('.control-tab[data-panel-tab="'+tab+'"]');assert(document.querySelector('[data-panel-view="'+tab+'"]').classList.contains('active'),'功能标签 '+tab);}
   action('buy');var b=document.querySelector('[data-buy-breed="normal"]');b.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));
   s().gold-=1;q.tick();assert(b.isConnected,'跨刷新长按保留购羊按钮');
   b.dispatchEvent(new PointerEvent('pointerup',{bubbles:true}));cash=s().gold;var count=s().sheep.length;b.click();b.click();
   assert(s().sheep.length===count+1&&s().gold===cash-160,'双击购羊只扣一次');action('close-modal');await pause();
   q.reset(8);action('buy');
   for(var key of ['gift','mint','peach','wish','rainbow']){click('[data-unlock-breed="'+key+'"]');assert(s().breeds[key],'解锁 '+key);await pause();click('[data-buy-breed="'+key+'"]');assert(s().sheep.some(function(x){return x.breed===key;}),'购买 '+key);}
   assert(s().workshopUnlocked&&s().contracts.specialUnlocked,'绒糖/星愿入口生效');action('close-modal');
   for(var group of ['pasture','flock','staff','trade']){click('[data-upgrade-group="'+group+'"]');var keys=Array.from(document.querySelectorAll('[data-upgrade]')).map(function(b){return b.getAttribute('data-upgrade');});for(var key of keys){var button=document.querySelector('[data-upgrade="'+key+'"]');if(button.disabled)continue;var before=s().upgrades[key];button.click();assert(s().upgrades[key]===before+1,'设施 '+key);}}
   click('[data-feed-kind="wool"]');assert(s().feeds.wool>0,'长毛精料');click('[data-feed-kind="growth"]');assert(s().feeds.growth>0,'成长精料');
   click('[data-recipe="wool"]');action('start-workshop');for(var i=0;i<4;i++)q.tick();assert(s().boxes.wool>0,'羊毛礼盒加工');action('sell-boxes');assert(s().boxes.wool===0,'礼盒出售');
   click('[data-recipe="meat"]');action('start-workshop');for(var i=0;i<4;i++)q.tick();assert(s().boxes.meat>0,'羊肉礼盒加工');
   s().boxes[s().order.type]=s().order.qty;q.render();var completed=s().contracts.completed;action('deliver-order');assert(s().contracts.completed===completed+1,'礼盒订单交付');
   var order=document.querySelector('[data-contract-id]'),completed=s().contracts.completed;order.click();assert(s().contracts.completed===completed+1,'原料订单交付');
   s().contracts.pendingRainbow=1;q.render();action('claim-rainbow');assert(s().contracts.pendingRainbow===0,'彩虹奖励领取');
   action('butcher');var checkbox=document.querySelector('[data-sale-id]');checkbox.click();assert(!document.querySelector('[data-action="sale-live-selected"]').disabled,'出栏勾选');
   var count=s().sheep.length;action('sale-live-selected');assert(s().sheep.length===count-1&&!document.querySelector('#modal').hidden,'单只出栏窗口保持');await pause();
   action('sale-select-all');action('sale-meat-selected');assert(document.querySelector('#modal').hidden,'全出栏自动关闭');
   q.reset(8);document.querySelector('#deposit-amount').value='123';cash=s().gold;action('deposit');assert(s().savings===123&&s().gold===cash-123,'输入金额存退休金');
   action('deposit-all');assert(s().gold===0&&s().savings===cash,'全部存入守恒');s().savings=10000000;q.render();action('retire');assert(s().retirementClaimed,'1000万退休');action('close-modal');
   action('save');await pause();assert(document.querySelector('#save-status').textContent.includes('保存'),'手动存档反馈');
   for(var tab of ['quick','route','breeds','rules']){action('rules');click('[data-help-tab="'+tab+'"]');assert(document.querySelector('#modal-body').textContent.length>100,'帮助 '+tab);action('close-modal');}
   action('rules');action('replay-tutorial');assert(!s().tutorial.done,'重新体验引导');action('tutorial-go');action('skip-tutorial');assert(s().tutorial.done,'跳过引导');
   q.reset(1);s().tutorial.seen=false;s().tutorial.done=false;action('rules');action('close-modal');
   q.render();assert(getComputedStyle(document.querySelector('#modal')).display==='none','隐藏弹窗不拦截页面');
   out.textContent=JSON.stringify({ok:true,count:reports.length,checks:reports});run.textContent='PASS · '+reports.length+' 项';
  }catch(error){out.textContent=JSON.stringify({ok:false,error:error.message,checks:reports});run.textContent='FAIL · '+error.message;}
 });
}());
