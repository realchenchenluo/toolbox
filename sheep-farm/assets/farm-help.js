(function(root){
  'use strict';
  function esc(value){return String(value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function money(value){return Math.floor(value).toLocaleString('en-US');}
  function go(label,target){return '<button type="button" class="help-go" data-help-go="'+target+'">'+label+' ↗</button>';}
  var tips={
    normal:'适合前期稳稳积累羊毛。幼羊也能剪毛，不必等到成年。',
    gift:'想做礼盒时先买 1 只。只解锁品种不会开工坊，首次买入羊仔才开启；之后卖掉也保留入口。',
    mint:'想更快剪毛时再买。必须留在羊场才有全场长毛加成；3 只达到 +60%，更多只数不再增加光环。',
    peach:'想让幼羊更快成年时再买。必须在场；3 只达到全场成长 +60%，满场成年羊时不必急着添。',
    wish:'想挑战稀有订单时买 1 只。首次购入永久开启资格；还要完成至少 15 单，稀有奖励并非每单必出。',
    rainbow:'后期留有经营余钱再买。产毛量是普通羊 4 倍，长大时间也更长；并不会加速全场长毛。'
  };
  function breedTip(key){return tips[key]||tips.normal;}
  function render(tab,c){
    var html='',copy='',title='玩法说明',level=c.level,meta=c.breeds;
    if(tab==='route'){
      title='先赚到钱，再慢慢扩张';copy='这是一条参考路线，可以按喜好调整。先留补给钱，解锁和买入都要另外花钱。';
      html='<div class="help-now"><strong>你现在是 LV'+level+'</strong><p>'+esc(level<2?'先完成剪毛 → 拾取 → 集市卖出，积累第一笔收入。':level<3?'可先改善补给设施，再攒钱升 LV3，开放雇工和订单。':level<4?'雇工负责拾取，羊毛仍需到集市出售；先做能完成的普通订单。':level<6?'按需养薄荷羊和蜜桃羊，升级后记得预留上涨的补给费用。':'按当前羊圈和补给能力扩张，彩虹羊与退休储蓄放在经营稳定之后。')+'</p></div>';
      var stages=[
        [1,'先学会赚钱','补草、补水；毛满后剪，点地上羊毛捡起，再去集市出售。幼羊不用等成年就能剪。','market','去集市'],
        [2,'先升等级，再买设施','累计收入达到 ¥'+money(c.levels[1].income)+'，再花 ¥'+money(c.levels[1].cost)+' 升 LV2。先按需改善草料仓、水池；礼盒路线可选购绒糖羊。','upgrades','看升级'],
        [3,'雇工减轻拾取负担','升 LV3 后花 ¥'+money(c.workerCost)+' 雇工。集市卖货仍由你点；有订单时先预留交货原料。','staff','看雇工'],
        [4,'按需要搭配特殊羊','LV4 薄荷羊帮全场更快长毛；LV5 蜜桃羊帮幼羊更快长大。两种光环都各最多 +60%。','nursery','看羊种'],
        [6,'经营稳定再挑战稀有单','LV6 买入星愿羊开启资格。LV8 才能买彩虹羊；它产毛多、长大慢，先保证补给和空位。','orders','看订单'],
        [8,'存退休金，保留周转钱','在账本输入要存的金额，现金会等额扣除。实际存够 1000 万退休；累计收入只是升级门槛。','ledger','去账本']
      ];
      html+='<ol class="help-route">'+stages.map(function(s){return '<li><span class="help-level">LV'+s[0]+(level>=s[0]?' · 已开放':'')+'</span><h3>'+s[1]+'</h3><p>'+s[2]+'</p>'+go(s[4],s[3])+'</li>';}).join('')+'</ol>';
    }else if(tab==='breeds'){
      title='特殊羊怎么用';copy='先升到对应等级 → 花金币解锁品种 → 再花金币买羊仔。只解锁品种，还没有获得羊的效果。';
      html='<div class="help-breeds">'+Object.keys(meta).map(function(key){var m=meta[key];return '<article><img src="./assets/sheep/young-'+key+'-wool-idle.png" width="56" height="56" alt="'+m.name+'"><div><strong>'+m.name+' · LV'+m.level+'</strong><p>'+esc(m.desc)+'</p><small>'+esc(breedTip(key))+'</small><em>解锁 ¥'+money(m.unlock)+' · 羊仔 ¥'+money(m.price)+'/只</em></div></article>';}).join('')+'</div><div class="help-note">稀有订单条件满足后，羊圈扩容概率 0.6%，彩虹名额 0.15%，LV8 彩虹羊仔 3%。同场最多一单，领奖后至少再完成 40 单；完整条件见详细规则。</div>'+go('去购入羊仔','nursery');
    }else{
      title='照着这四步，赚第一笔';copy='羊会自己吃喝、走动。你主要负责补给、剪毛、捡羊毛和卖货。';
      var steps=[['左草右水，各点一下','先点左侧黄色干草槽，再点右侧蓝色水槽。每次只补一格并扣金币，不用一次加满。'],['等到 100%，点“剪羊毛”','剪毛按钮亮起就能剪，幼羊也能剪。羊毛会掉在草地上，此时还不能卖。'],['点地上的羊毛，把它捡起来','点草地上的奶白色毛团。仓库增加后，集市里才有可卖的羊毛。'],['去“集市”，点“出售羊毛”','在草场下方的功能区选集市，点击出售。金币先进入现金，接着可升级或买羊。']];
      html='<ol class="help-quick">'+steps.map(function(s,i){return '<li><b>'+ (i+1)+'</b><div><h3>'+s[0]+'</h3><p>'+s[1]+'</p></div></li>';}).join('')+'</ol><div class="help-note">新档：第 0 天、300 金币、3 只幼羊。先别把现金全部存退休金，留钱添草加水。</div><button type="button" class="welcome-start" data-action="replay-tutorial">带我操作一遍</button>'+go('看看推荐发育路线','route');
    }
    return {title:title,copy:copy,html:html};
  }
  root.FarmHelp={render:render,breedTip:breedTip};
}(window));
