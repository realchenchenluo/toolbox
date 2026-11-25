(function () {
'use strict';
if (window.history && 'scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
var $ = function(id) { return document.getElementById(id); };
var book = window.HIDDEN_BOOK || [], playable = book.filter(function(l) { return l.calibrated; }), matcher = window.HiddenRecognition;
var current = 0, level, targets = [], strokes = [], draft = null, ready = false, sprite;
var stage = $('scene-stage'), content = $('scene-content'), image = $('scene-image'), canvas = $('mark-layer'), ctx = canvas.getContext('2d');
var fit = 1, zoom = 1, pan = {x:0,y:0}, mode = 'brush', color = '#ed9271', filter = 'all', exploreMode = false;
var pointers = {}, gesture, paintingId = null, generation = 0, toastTimer, fadeHandle = 0, levelCelebrated = false;
var progress = {pages:{},current:0}, account, accountId = null, accountPending = false, saveTimer, interacted = false;
var dirty = false, writing = false, saveRevision = 0, accountEpoch = 0, lastWrite = 0;
var containerTool = null, windowInfoTimer = 0, clientVersion = 0, windowRequest = 0;
var ASSET_VERSION = 'ui9';
function count() { return targets.filter(function(t) { return t.found; }).length; }
function toast(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function() { $('toast').hidden = true; },2200); }
function applyWindowInfo(info) {
  if (!info) return;
  var safe = info.safeArea || {}, top = Math.max(0,Number(safe.top) || 0), menus = info.menuButtons || {};
  function visible(r) { return r && r.width > 0 && r.height > 0; }
  var rects = visible(menus.capsule) ? [menus.capsule] : [menus.back,menus.me,menus.share];
  rects.forEach(function(r) { if (visible(r)) top = Math.max(top,Number(r.bottom) || 0); });
  var bottom = info.windowHeight && Number.isFinite(safe.bottom) ? Math.max(0,Number(info.windowHeight) - safe.bottom) : 0;
  var left = Math.max(0,Number(safe.left) || 0), right = info.windowWidth && Number.isFinite(safe.right) ? Math.max(0,Number(info.windowWidth) - safe.right) : 0;
  var style = document.documentElement.style;
  style.setProperty('--container-left',left + 'px'); style.setProperty('--container-right',right + 'px');
  style.setProperty('--container-top',(top + 8) + 'px'); style.setProperty('--container-bottom',bottom + 'px'); resize();
}
function readWindow(tool) {
  if (typeof tool.getWindowInfo !== 'function') return;
  var request = ++windowRequest;
  try { Promise.resolve(tool.getWindowInfo()).then(function(info) { if (request === windowRequest) applyWindowInfo(info); }).catch(function() {}); } catch (error) {}
}
function cleanProgress(saved) {
  var result = {pages:{},current:Math.min(playable.length - 1,Math.max(0,Math.floor(Number(saved && saved.current) || 0)))};
  playable.forEach(function(l) {
    var page = saved && saved.pages && saved.pages[l.id]; if (!page || !Array.isArray(page.found)) return;
    var ids = l.items.map(function(t) { return t.id; });
    result.pages[l.id] = {found:ids.filter(function(id) { return page.found.indexOf(id) >= 0; }),strokes:Array.isArray(page.strokes) ? page.strokes.slice(-100).filter(function(s) {
      return s && ['brush','eraser'].indexOf(s.mode) >= 0 && typeof s.color === 'string' && /^#[0-9a-f]{6}$/i.test(s.color) && Number(s.width) > 0 && Number(s.width) <= 64 && Array.isArray(s.points) && s.points.length > 0 && s.points.length <= 90 && s.points.every(function(p) { return p && Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= -64 && p.y >= -64 && p.x <= l.width + 64 && p.y <= l.height + 64; });
    }) : []};
  }); return result;
}
function setAccountPending(on) { accountPending = on; document.body.classList.toggle('account-checking',on); }
function sessionOnly(message) {
  setAccountPending(false); $('save-status').textContent = '临时游玩 · 关闭后不保留';
  $('account-notice').textContent = message; $('account-banner').hidden = false; $('sync-save').hidden = true; $('workspace-save').hidden = true;
  $('retry-account').hidden = !(account && account.enabled);
}
function applyAccount(saved,discardedProgress) {
  accountId = saved.id; progress = cleanProgress(saved.progress); dirty = false; saveRevision++;
  openLevel(progress.current,true);
  if (discardedProgress) toast('已切换账号，原账号未保存的进度不会带入');
}
function refreshAccount() {
  if (!account || !account.enabled) return Promise.resolve();
  account.suspend();
  var epoch = ++accountEpoch, previous = accountId; clearTimeout(saveTimer); setAccountPending(true);
  $('save-status').textContent = '正在读取账号存档…';
  return account.load().then(function(saved) {
    if (epoch !== accountEpoch) return;
    var changedAccount = !!(previous && previous !== saved.id);
    if (!previous || changedAccount || !dirty) applyAccount(saved,changedAccount && dirty);
    setAccountPending(false); $('account-banner').hidden = true; $('sync-save').hidden = false; $('workspace-save').hidden = false;
    $('save-status').textContent = dirty ? '有新进度待保存' : '当前账号的专属存档';
    if (dirty) scheduleSave();
  }).catch(function(error) {
    if (epoch !== accountEpoch) return;
    // A failed read is never an empty cloud save. No new cloud write can follow it.
    accountId = null; progress = {pages:{},current:0}; dirty = false; openLevel(0,true);
    sessionOnly(error && (error.errCode === 1006 || error.errCode === 10003) ? '账号存档暂未开放，本次可临时游玩。' : '账号存档未能读取，本次临时游玩不会覆盖原存档。');
  });
}
function initStorage() {
  var xhs = window.xhs, tool = xhs && xhs.miniTool;
  if (!tool) { sessionOnly('网页预览为临时游玩；账号存档需在支持的小红书中打开。'); return; }
  containerTool = tool; document.body.classList.add('in-container'); setAccountPending(true);
  var launch;
  try { launch = xhs.launchOptions && xhs.launchOptions.miniToolEnv && Number(xhs.launchOptions.miniToolEnv.buildVersion) ? xhs.launchOptions : (typeof tool.getLaunchOptions === 'function' ? tool.getLaunchOptions() : null); } catch (error) { launch = null; }
  Promise.race([Promise.resolve(launch),new Promise(function(r) { setTimeout(function() { r(null); },3000); })]).then(function(info) {
    var version = Math.floor(Number(info && info.miniToolEnv && info.miniToolEnv.buildVersion) / 1000);
    clientVersion = version;
    if (version >= 9490) { applyWindowInfo(info && info.miniToolEnv && info.miniToolEnv.windowInfo); readWindow(tool); }
    account = window.PictureAccountSave.create(tool,version);
    if (!account.enabled) { sessionOnly('当前版本暂不支持账号存档，本次可临时游玩。'); return; }
    return refreshAccount();
  }).catch(function() { sessionOnly('账号存档暂不可用，本次可临时游玩。'); });
}
function scheduleSave() {
  clearTimeout(saveTimer);
  if (!accountId || accountPending) return;
  saveTimer = setTimeout(persist,Math.max(1500,60000 - (Date.now() - lastWrite)));
}
function persist() {
  if (!accountId || accountPending || document.hidden || !dirty || writing) return;
  writing = true; lastWrite = Date.now(); var revision = saveRevision, epoch = accountEpoch, failed = false;
  $('save-status').textContent = '正在保存到当前账号…';
  account.write(progress).then(function(result) {
    if (epoch !== accountEpoch) return;
    if (result.changed) applyAccount(result.save,true);
    else if (revision === saveRevision) dirty = false;
    lastWrite = Date.now(); $('save-status').textContent = dirty ? '有新进度待保存' : '已保存到当前账号';
    if (!dirty) toast('已保存到当前账号');
  }).catch(function(error) {
    if (epoch !== accountEpoch) return;
    failed = true; $('save-status').textContent = error && error.errCode === 'UNKNOWN' ? '存档结果待确认，请稍后重试' : '暂未保存，请点保存重试';
    if (error && (error.errCode === 1006 || error.errCode === 10003)) { accountId = null; sessionOnly('账号存档暂不可用，本次进度只在本次游玩保留。'); }
  }).then(function() { writing = false; if (!failed && dirty && accountId) scheduleSave(); });
}
function save(flush) {
  if (!level || !ready || accountPending) return;
  var before = JSON.stringify(progress);
  progress.current = current;
  progress.pages[level.id] = {found:targets.filter(function(t) { return t.found; }).map(function(t) { return t.id; }),strokes:strokes.slice(-100).map(function(s) {
    var points = s.points;
    if (points.length > 90) { var step = (points.length - 1) / 89; points = Array.from({length:90},function(_,i) { return s.points[Math.round(i * step)]; }); }
    return {mode:s.mode,color:s.color,width:s.width,target:s.target,points:points};
  })};
  if (JSON.stringify(progress) !== before) { dirty = true; saveRevision++; }
  clearTimeout(saveTimer); if (flush) persist(); else scheduleSave();
}
function loadImage(src) {
  return new Promise(function(resolve,reject) {
    var img = new Image(), done = false, timer = setTimeout(function() { done = true; reject(new Error('timeout')); },12000);
    img.onload = function() { if (done) return; done = true; clearTimeout(timer); resolve(img); };
    img.onerror = function() { if (done) return; done = true; clearTimeout(timer); reject(new Error('image')); }; img.src = './' + src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=' + ASSET_VERSION;
  });
}
function setExploreMode(on) {
  exploreMode = !!on;
  $('play-view').classList.toggle('explore-mode',exploreMode);
  document.body.classList.toggle('exploring',exploreMode);
  pointers = {}; gesture = null; draft = null; paintingId = null;
  $('enter-explore').hidden = exploreMode;
  $('exit-explore').hidden = !exploreMode;
  if (exploreMode) {
    zoom = 1; pan = {x:0,y:0}; $('scene-status').textContent = '双指放大细节 · 画笔点选或涂色';
  } else {
    zoom = 1; pan = {x:0,y:0}; $('scene-status').textContent = ready ? '先看完整画面，再点击进入找物' : '正在准备场景和全部目标…';
  }
  if (ready) resize();
}
function resize() {
  var viewportHeight = window.visualViewport && window.visualViewport.height ? window.visualViewport.height : window.innerHeight;
  document.documentElement.style.setProperty('--app-height',viewportHeight + 'px');
  if (!ready) return;
  var mobile = window.innerWidth <= 820;
  if (exploreMode) stage.style.height = '';
  else {
    var natural = stage.clientWidth / canvas.width * canvas.height;
    stage.style.height = (mobile ? Math.min(natural,Math.max(300,viewportHeight - 290)) : Math.min(natural,Math.max(420,viewportHeight - 320))) + 'px';
  }
  fit = Math.min(stage.clientWidth / canvas.width,stage.clientHeight / canvas.height);
  content.style.width = canvas.width * fit + 'px'; content.style.height = canvas.height * fit + 'px'; applyTransform();
  $('target-grid').style.maxHeight = mobile || exploreMode ? 'none' : Math.max(300,stage.clientHeight) + 'px';
}
function applyTransform() {
  var maxX = Math.max(0,(canvas.width * fit * zoom - stage.clientWidth) / 2), maxY = Math.max(0,(canvas.height * fit * zoom - stage.clientHeight) / 2);
  pan.x = Math.max(-maxX,Math.min(maxX,pan.x)); pan.y = Math.max(-maxY,Math.min(maxY,pan.y));
  content.style.transform = 'translate(-50%,-50%) translate(' + pan.x + 'px,' + pan.y + 'px) scale(' + zoom + ')'; $('zoom-status').textContent = Math.round(zoom * 100) + '%';
}
function setZoom(z) { if (!ready) return; zoom = Math.max(1,Math.min(5,z)); if (zoom === 1) pan = {x:0,y:0}; applyTransform(); }
function setMode(m) {
  mode = m;
  ['brush','eraser','move'].forEach(function(v) { $(v + '-tool').classList.toggle('active',v === m); $(v + '-tool').setAttribute('aria-pressed',String(v === m)); }); canvas.style.cursor = m === 'move' ? 'grab' : 'crosshair';
}
function point(e) { var r = canvas.getBoundingClientRect(); return {x:Math.round((e.clientX - r.left) / r.width * canvas.width),y:Math.round((e.clientY - r.top) / r.height * canvas.height)}; }
function drawStroke(s,opacity) {
  if (!s.points.length) return;
  ctx.save(); ctx.globalAlpha = opacity; ctx.globalCompositeOperation = s.mode === 'eraser' ? 'destination-out' : 'source-over';
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
  if (s.points.length === 1) { ctx.arc(s.points[0].x,s.points[0].y,s.width / 2,0,Math.PI * 2); ctx.fill(); }
  else { s.points.forEach(function(p,i) { if (!i) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); }); ctx.stroke(); } ctx.restore();
}
function renderInk() {
  ctx.clearRect(0,0,canvas.width,canvas.height); var animate = false, now = Date.now();
  strokes.forEach(function(s) { var opacity = s.time ? Math.max(.55,1 - (now - s.time) / 520 * .45) : .55; if (opacity > .55) animate = true; drawStroke(s,opacity); }); if (draft) drawStroke(draft,1);
  targets.forEach(function(t) {
    if (!t.found) return;
    ctx.save(); ctx.fillStyle = 'rgba(102,156,94,.24)'; ctx.strokeStyle = 'rgba(49,112,69,.75)'; ctx.lineWidth = 2;
    t.polygons.forEach(function(poly) { ctx.beginPath(); poly.forEach(function(p,i) { if (!i) ctx.moveTo(p[0],p[1]); else ctx.lineTo(p[0],p[1]); }); ctx.closePath(); ctx.fill(); ctx.stroke(); }); ctx.restore();
  });
  if (animate && !fadeHandle && !document.hidden) fadeHandle = requestAnimationFrame(function() { fadeHandle = 0; renderInk(); });
}
function pointerList() { return Object.keys(pointers).map(function(k) { return pointers[k]; }); }
function cancelDraft() { draft = null; paintingId = null; renderInk(); }
function pointerDown(e) {
  if (!ready || accountPending || e.button > 0) return;
  if (!exploreMode) { setExploreMode(true); e.preventDefault(); return; }
  interacted = true; pointers[e.pointerId] = {x:e.clientX,y:e.clientY}; try { canvas.setPointerCapture(e.pointerId); } catch (error) {}
  var ps = pointerList();
  if (ps.length === 2) { cancelDraft(); gesture = {distance:Math.hypot(ps[0].x - ps[1].x,ps[0].y - ps[1].y),zoom:zoom,cx:(ps[0].x + ps[1].x) / 2,cy:(ps[0].y + ps[1].y) / 2,panX:pan.x,panY:pan.y}; }
  else if (ps.length === 1) {
    if (mode === 'move') gesture = {cx:e.clientX,cy:e.clientY,panX:pan.x,panY:pan.y};
    else { paintingId = e.pointerId; draft = {mode:mode,color:color,width:mode === 'eraser' ? 32 : 12,target:null,points:[point(e)]}; renderInk(); }
  } e.preventDefault();
}
function pointerMove(e) {
  if (!pointers[e.pointerId]) return;
  pointers[e.pointerId] = {x:e.clientX,y:e.clientY}; var ps = pointerList();
  if (ps.length >= 2 && gesture) {
    zoom = Math.max(1,Math.min(5,gesture.zoom * Math.hypot(ps[0].x - ps[1].x,ps[0].y - ps[1].y) / Math.max(1,gesture.distance)));
    pan.x = gesture.panX + (ps[0].x + ps[1].x) / 2 - gesture.cx; pan.y = gesture.panY + (ps[0].y + ps[1].y) / 2 - gesture.cy; applyTransform();
  } else if (mode === 'move' && gesture) { pan.x = gesture.panX + e.clientX - gesture.cx; pan.y = gesture.panY + e.clientY - gesture.cy; applyTransform(); }
  else if (draft && paintingId === e.pointerId) { var p = point(e), last = draft.points[draft.points.length - 1]; if (Math.hypot(p.x - last.x,p.y - last.y) > 2 && draft.points.length < 500) { draft.points.push(p); renderInk(); } } e.preventDefault();
}
function finishPointer(e,cancel) {
  if (accountPending || document.hidden) { cancelDraft(); delete pointers[e.pointerId]; return; }
  if (draft && paintingId === e.pointerId) {
    if (cancel) cancelDraft();
    else {
      var s = draft, last = point(e), end = s.points[s.points.length - 1]; if (Math.hypot(last.x - end.x,last.y - end.y) > 2) s.points.push(last);
      draft = null; paintingId = null; s.time = Date.now();
      if (s.mode === 'brush') {
        var index = matcher.match(targets,s.points,Math.min(8,3 / (fit * zoom)));
        if (index >= 0) { var t = targets[index]; if (!t.found) { t.found = true; s.target = t.id; $('scene-status').textContent = '找到了 · ' + t.label; toast('✓ 找到了「' + t.label + '」'); } else toast('「' + t.label + '」已经找到了'); }
        else $('scene-status').textContent = '再仔细看看，轻点物体或沿着它涂色';
      }
      strokes.push(s); if (strokes.length > 160) strokes.shift(); renderTargets(); updateProgress(); renderInk(); save();
    }
  } delete pointers[e.pointerId]; if (pointerList().length < 2) gesture = null; e.preventDefault();
}
function makeCard(t,index) {
  var button = document.createElement('button'); button.type = 'button'; button.className = 'target-card' + (t.found ? ' found' : ''); button.setAttribute('data-target',index); button.setAttribute('aria-label',t.label + (t.found ? '，已找到，放大查看' : '，还没找到，放大查看'));
  var c = document.createElement('canvas'); c.width = 144; c.height = 106; c.getContext('2d').drawImage(sprite,t.x,t.y,t.w,t.h,0,0,144,106); button.appendChild(c);
  var name = document.createElement('span'); name.className = 'target-name'; name.textContent = t.label; button.appendChild(name);
  var tick = document.createElement('span'); tick.className = 'found-check'; tick.textContent = '✓'; button.appendChild(tick);
  var number = document.createElement('span'); number.className = 'target-number'; number.textContent = String(index + 1).padStart(2,'0'); button.appendChild(number); return button;
}
function renderTargets() {
  if (!sprite) return;
  var grid = $('target-grid'), scroll = grid.scrollTop, scrollX = grid.scrollLeft, frag = document.createDocumentFragment(); grid.textContent = '';
  targets.forEach(function(t,i) { if (filter === 'left' && t.found) return; frag.appendChild(makeCard(t,i)); }); grid.appendChild(frag); grid.scrollTop = scroll; grid.scrollLeft = scrollX;
  $('empty-targets').hidden = !(filter === 'left' && count() === targets.length);
}
function choose(index) {
  var t = targets[index]; if (!t) return; var c = $('target-preview'), pc = c.getContext('2d'); pc.clearRect(0,0,c.width,c.height); pc.drawImage(sprite,t.x,t.y,t.w,t.h,0,0,c.width,c.height);
  $('target-preview-title').textContent = t.label; $('target-preview-status').textContent = t.found ? '✓ 已经找到，继续寻找其他目标吧' : '记住它的形状，再到画面里找一找'; $('target-modal').hidden = false;
}
function completedTotal() { return playable.filter(function(l) { return progress.pages[l.id] && progress.pages[l.id].found.length === l.items.length; }).length; }
function paintProgress(n,total) {
  var percent = total ? Math.round(n / total * 100) : 0, all = total > 0 && n === total;
  $('workspace-progress').textContent = n + ' / ' + total; $('found-count').textContent = n; $('target-count').textContent = total;
  $('all-count').textContent = total; $('left-count').textContent = total - n; $('remaining-count').textContent = total - n;
  $('progress-percent').textContent = percent + '%';
  $('found-progress').style.width = percent + '%';
  $('progress-ring').style.strokeDashoffset = String(251.3274 * (1 - percent / 100));
  $('level-progress-card').classList.toggle('is-complete',all);
  $('progress-medal-label').textContent = all ? '收集完成' : '收集进度';
  $('progress-message').textContent = all ? '这一页的星光，都被你收集到了' : !n ? '每一次发现，都值得一颗小星星' : percent < 50 ? '好眼力，小惊喜正在一点点出现' : percent < 85 ? '已经过半，再发现一点小惊喜' : '快找齐啦，最后的小目标就在画里';
  $('progress-meter').setAttribute('aria-valuemax',total); $('progress-meter').setAttribute('aria-valuenow',n);
  $('progress-meter').setAttribute('aria-valuetext','已找到 ' + n + ' 个，共 ' + total + ' 个，还剩 ' + (total - n) + ' 个');
}
function updateProgress() {
  var n = count(), all = n === targets.length && n > 0;
  paintProgress(n,targets.length);
  $('next-level-button').disabled = !all; $('undo-button').disabled = !strokes.length; $('collection-status').textContent = all ? '这一幅的所有小东西，都被你发现了' : '自由顺序 · 找到一个，就自动打勾';
  if (all && !levelCelebrated) { levelCelebrated = true; $('success-detail').textContent = '你在「' + level.title + '」里找到了 ' + n + ' 个小东西。'; $('success-modal').hidden = false; }
  if (!all) { levelCelebrated = false; $('success-modal').hidden = true; }
}
function openLevel(index,restoring) {
  if (accountPending && !restoring) return;
  if (!playable.length || !matcher) { $('scene-status').textContent = '关卡资料未加载，请退出后重新打开'; return; }
  if (!restoring) save(true); current = Math.max(0,Math.min(playable.length - 1,index)); level = playable[current]; ready = false;
  var token = ++generation; sprite = null; targets = []; strokes = []; draft = null; paintingId = null; pointers = {}; gesture = null; zoom = 1; pan = {x:0,y:0}; filter = 'all'; levelCelebrated = false;
  $('filter-all').classList.add('active'); $('filter-left').classList.remove('active'); $('play-view').hidden = false; $('play-view').classList.remove('explore-mode'); exploreMode = false; document.body.classList.remove('exploring'); $('enter-explore').hidden = false; $('exit-explore').hidden = true; $('library-view').hidden = true; $('success-modal').hidden = true; $('target-modal').hidden = true;
  $('scene-loading').hidden = false; $('scene-loading').querySelector('strong').textContent = '翻开这一页…'; $('scene-loading').querySelector('small').textContent = '正在准备画面与全部目标'; $('retry-scene').hidden = true; stage.setAttribute('aria-busy','true');
  $('chapter-number').textContent = String(current + 1).padStart(2,'0'); $('chapter-title').textContent = level.title; $('chapter-tag').textContent = level.items.length >= 30 ? '细心挑战' : level.items.length >= 20 ? '慢慢发现' : '轻松一刻'; $('page-counter').textContent = String(current + 1).padStart(2,'0') + ' / ' + playable.length;
  $('scene-status').textContent = '正在准备场景和全部目标…'; $('target-grid').textContent = ''; paintProgress(0,level.items.length); $('empty-targets').hidden = true; $('next-level-button').disabled = true; $('undo-button').disabled = true; setMode('brush');
  Promise.all([loadImage(level.scene),loadImage(level.sprite)]).then(function(results) {
    if (token !== generation) return;
    image.src = results[0].src; image.alt = level.title + '，在画面中寻找目标'; sprite = results[1]; canvas.width = level.width; canvas.height = level.height;
    var saved = progress.pages[level.id];
    targets = level.items.map(function(item) { var t = Object.assign({},item); t.found = !!(saved && Array.isArray(saved.found) && saved.found.indexOf(t.id) >= 0); return t; });
    strokes = saved && Array.isArray(saved.strokes) ? saved.strokes.slice(-160).filter(function(s) { return s && Array.isArray(s.points) && s.points.length && s.points.length <= 501; }) : [];
    levelCelebrated = count() === targets.length; ready = true; resize(); renderInk(); renderTargets(); updateProgress(); $('scene-loading').hidden = true; stage.setAttribute('aria-busy','false'); $('scene-status').textContent = '先看完整画面，再点击进入找物'; window.scrollTo(0,0);
  }).catch(function() { if (token !== generation) return; $('scene-loading').querySelector('strong').textContent = '这一页没有打开'; $('scene-loading').querySelector('small').textContent = '请点重新加载，已有进度会保留'; $('retry-scene').hidden = false; }); window.scrollTo(0,0);
}
function renderLibrary() {
  if (accountPending) return;
  setExploreMode(false); interacted = true; save(true); generation++; ready = false; draft = null; pointers = {}; $('play-view').hidden = true; $('library-view').hidden = false; $('completed-count').textContent = completedTotal();
  $('total-found-count').textContent = playable.reduce(function(sum,l) { return sum + (progress.pages[l.id] && progress.pages[l.id].found.length || 0); },0);
  var grid = $('level-grid'), frag = document.createDocumentFragment(); grid.textContent = '';
  playable.forEach(function(l,i) {
    var found = progress.pages[l.id] && progress.pages[l.id].found.length || 0; var b = document.createElement('button'); b.type = 'button'; b.className = 'level-card' + (found === l.items.length ? ' completed' : found ? ' started' : ''); b.setAttribute('data-level',i);
    // Reuse the verified scene asset for the library preview. Some constrained WebViews
    // defer small WebP thumbnails created at runtime; the scene is already a stable
    // package asset and object-fit crops it into the card without another load path.
    var img = document.createElement('img'); img.src = './' + l.scene + '?v=' + ASSET_VERSION; img.alt = ''; b.appendChild(img);
    var number = document.createElement('span'); number.className = 'level-number'; number.textContent = String(i + 1).padStart(2,'0'); b.appendChild(number);
    var state = document.createElement('span'); state.className = 'level-state'; state.textContent = found === l.items.length ? '✓ 已收齐' : found ? '寻找中' : '待发现'; b.appendChild(state);
    var title = document.createElement('strong'); title.textContent = l.title; b.appendChild(title);
    var sub = document.createElement('small'), label = document.createElement('span'), numbers = document.createElement('span');
    label.textContent = '已发现'; var amount = document.createElement('b'); amount.textContent = found; numbers.appendChild(amount);
    var total = document.createElement('i'); total.textContent = '/ ' + l.items.length; numbers.appendChild(total); sub.appendChild(label); sub.appendChild(numbers); b.appendChild(sub);
    var bar = document.createElement('div'); bar.className = 'level-progress'; var ink = document.createElement('i'); ink.style.width = found / l.items.length * 100 + '%'; bar.appendChild(ink); b.appendChild(bar); frag.appendChild(b);
  }); grid.appendChild(frag); window.scrollTo(0,0);
}
function nextLevel() { openLevel((current + 1) % playable.length); }
canvas.addEventListener('pointerdown',pointerDown); canvas.addEventListener('pointermove',pointerMove); canvas.addEventListener('pointerup',function(e) { finishPointer(e,false); }); canvas.addEventListener('pointercancel',function(e) { finishPointer(e,true); });
stage.addEventListener('click',function(e) { if (!exploreMode && ready && !e.target.closest('button')) setExploreMode(true); });
canvas.addEventListener('lostpointercapture',function(e) { if (draft && paintingId === e.pointerId) finishPointer(e,true); });
stage.addEventListener('wheel',function(e) { if (!ready || (!e.ctrlKey && !e.metaKey)) return; e.preventDefault(); setZoom(zoom + (e.deltaY > 0 ? -.15 : .15)); },{passive:false});
$('target-grid').addEventListener('click',function(e) { var b = e.target.closest('[data-target]'); if (b) choose(Number(b.getAttribute('data-target'))); });
['brush','eraser','move'].forEach(function(m) { $(m + '-tool').addEventListener('click',function() { setMode(m); }); });
document.querySelectorAll('.ink-dot').forEach(function(b) { b.addEventListener('click',function() { color = b.getAttribute('data-color'); setMode('brush'); document.querySelectorAll('.ink-dot').forEach(function(v) { v.classList.toggle('active',v === b); }); }); });
$('undo-button').addEventListener('click',function() { if (accountPending) return; var s = strokes.pop(); if (!s) return; if (s.target) targets.forEach(function(t) { if (t.id === s.target) { t.found = false; toast('已撤销「' + t.label + '」'); } }); renderInk(); renderTargets(); updateProgress(); save(); });
$('zoom-in').addEventListener('click',function() { if (!exploreMode) setExploreMode(true); setZoom(zoom + .5); }); $('zoom-out').addEventListener('click',function() { setZoom(zoom - .5); }); $('zoom-reset').addEventListener('click',function() { setZoom(1); });
$('enter-explore').addEventListener('click',function() { setExploreMode(true); }); $('exit-explore').addEventListener('click',function() { setExploreMode(false); });
['all','left'].forEach(function(f) { $('filter-' + f).addEventListener('click',function() { filter = f; $('filter-all').classList.toggle('active',f === 'all'); $('filter-left').classList.toggle('active',f === 'left'); renderTargets(); }); });
$('library-button').addEventListener('click',renderLibrary); $('back-to-game').addEventListener('click',function() { openLevel(current); }); $('level-grid').addEventListener('click',function(e) { var b = e.target.closest('[data-level]'); if (b) openLevel(Number(b.getAttribute('data-level'))); });
$('previous-button').addEventListener('click',function() { openLevel(Math.max(0,current - 1)); }); $('skip-button').addEventListener('click',nextLevel); $('next-level-button').addEventListener('click',nextLevel); $('success-next').addEventListener('click',nextLevel);
$('retry-scene').addEventListener('click',function() { openLevel(current); }); $('help-button').addEventListener('click',function() { $('help-modal').hidden = false; }); document.querySelectorAll('[data-close]').forEach(function(b) { b.addEventListener('click',function() { $(b.getAttribute('data-close')).hidden = true; }); });
$('sync-save').addEventListener('click',function() { save(true); });
$('workspace-save').addEventListener('click',function() { save(true); });
$('retry-account').addEventListener('click',function() { refreshAccount(); });
function onWindowResize() {
  resize(); clearTimeout(windowInfoTimer);
  if (containerTool && clientVersion >= 9490) windowInfoTimer = setTimeout(function() { readWindow(containerTool); },180);
}
window.addEventListener('resize',onWindowResize); if (window.visualViewport) window.visualViewport.addEventListener('resize',onWindowResize);
document.addEventListener('visibilitychange',function() { if (document.hidden) {
  pointers = {}; gesture = null; cancelDraft(); save(); clearTimeout(saveTimer);
  if (account && account.enabled) { account.suspend(); accountEpoch++; setAccountPending(true); }
} else {
  if (account && account.enabled) refreshAccount();
  if (containerTool && clientVersion >= 9490) readWindow(containerTool);
  if (ready) { resize(); renderInk(); }
} });
document.addEventListener('keydown',function(e) { if (e.key === 'Escape') { var modalOpen = ['help-modal','success-modal','target-modal'].some(function(id) { return !$(id).hidden; }); ['help-modal','success-modal','target-modal'].forEach(function(id) { $(id).hidden = true; }); if (!modalOpen && exploreMode) setExploreMode(false); } });
openLevel(0); initStorage();
}());
