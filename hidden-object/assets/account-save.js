/* Personal saves use the platform's user × mini-tool cloud scope. No device-wide save migration. */
(function(root) {
'use strict';
var COLLECTION = 'picture_hide_seek_v1';
function blank() { return {pages:{},current:0}; }
function valid(row) { return row && row.id && row.content && row.content.schema === 1 && row.content.slot === 'primary' && row.content.progress && row.content.progress.pages; }
function failure(message,code) { var error = new Error(message); error.errCode = code; return error; }
function utf8Size(text) {
  var bytes = 0;
  for (var i = 0; i < text.length; i++) {
    var code = text.charCodeAt(i);
    if (code < 128) bytes++;
    else if (code < 2048) bytes += 2;
    else if (code >= 55296 && code <= 56319 && i + 1 < text.length && text.charCodeAt(i + 1) >= 56320 && text.charCodeAt(i + 1) <= 57343) { bytes += 4; i++; }
    else bytes += 3;
  } return bytes;
}
function create(tool,version) {
  var id = null, pendingCreate = null, pendingWrite = null, context = 0;
  var enabled = version >= 9510 && tool && ['queryCloudStorage','addCloudStorage','updateCloudStorage'].every(function(method) { return typeof tool[method] === 'function'; });
  function call(method,args) {
    return new Promise(function(resolve,reject) {
      var timer = setTimeout(function() { reject(failure('账号存档请求超时','TIMEOUT')); },8000);
      try { Promise.resolve(tool[method](args)).then(function(result) { clearTimeout(timer); if (!result) reject(failure('账号存档响应无效')); else resolve(result); },function(error) { clearTimeout(timer); reject(error); }); }
      catch (error) { clearTimeout(timer); reject(error); }
    });
  }
  function check(token) { if (token !== context) throw failure('账号环境已变化，本次请求已取消','STALE'); }
  function query(token) {
    var rows = [], cursors = {};
    function page(cursor) {
      check(token);
      var args = {collection:COLLECTION,limit:100}; if (cursor) args.cursor = cursor;
      return call('queryCloudStorage',args).then(function(result) {
        check(token);
        if (!Array.isArray(result.items)) throw failure('账号存档读取失败');
        rows = rows.concat(result.items);
        if (result.nextCursor) {
          if (cursors[result.nextCursor]) throw failure('存档分页异常');
          cursors[result.nextCursor] = true; return page(result.nextCursor);
        }
        if (result.hasMore) throw failure('存档分页不完整');
        return rows;
      });
    }
    return page();
  }
  function latest(rows) { return rows.filter(valid).sort(function(a,b) { return (Number(b.content.updatedAt) || 0) - (Number(a.content.updatedAt) || 0); })[0]; }
  function envelope(progress) {
    var result = {schema:1,slot:'primary',revision:Date.now().toString(36) + Math.random().toString(36).slice(2),updatedAt:Date.now(),progress:JSON.parse(JSON.stringify(progress))};
    var keys = Object.keys(result.progress.pages);
    // ASCII identifiers and bounded numeric strokes keep UTF-8 content below the platform's 64 KiB/row cap.
    while (utf8Size(JSON.stringify(result)) > 60000) {
      var biggest = keys.reduce(function(a,b) { return (result.progress.pages[b].strokes || []).length > (result.progress.pages[a].strokes || []).length ? b : a; },keys[0]);
      if (!biggest || !result.progress.pages[biggest].strokes.length) throw failure('存档内容过大');
      result.progress.pages[biggest].strokes.shift();
    }
    return result;
  }
  function from(row) { if (id && id !== row.id) pendingWrite = null; id = row.id; return {id:id,progress:row.content.progress}; }
  function load() {
    if (!enabled) return Promise.reject(failure('当前环境不支持账号存档','UNAVAILABLE'));
    var token = context;
    return query(token).then(function(rows) {
      check(token);
      var row;
      if (pendingCreate) {
        row = rows.filter(function(r) { return valid(r) && r.content.revision === pendingCreate.revision; })[0];
        if (!row) throw failure('新存档结果待确认，请稍后重新打开','UNKNOWN');
        pendingCreate = null; return from(row);
      }
      row = latest(rows);
      if (row) return from(row);
      if (rows.length) throw failure('账号存档格式暂不兼容');
      pendingCreate = envelope(blank());
      return call('addCloudStorage',{collection:COLLECTION,items:[{content:pendingCreate}]}).then(function(result) {
        check(token);
        var item = result.data && result.data[0];
        if (item && item.status === 'SUCCESS' && item.id) { var saved = {id:item.id,content:pendingCreate}; pendingCreate = null; return from(saved); }
        if (item && item.status === 'FAILED') { pendingCreate = null; throw failure('账号存档创建失败'); }
        return load(); // UNKNOWN: query by the operation token, never blindly add again.
      },function(error) {
        check(token);
        if (error && typeof error.errCode === 'number' && error.errCode !== 2004) pendingCreate = null;
        throw error;
      });
    });
  }
  function write(progress) {
    if (!enabled || !id) return Promise.reject(failure('账号存档尚未就绪'));
    var token = context, expected = id, content = envelope(progress);
    return query(token).then(function(rows) {
      check(token);
      var row = rows.filter(function(r) { return valid(r) && r.id === expected; })[0];
      if (!row) return load().then(function(save) { return {changed:true,save:save}; });
      if (pendingWrite) {
        if (row.content.revision !== pendingWrite.revision) throw failure('上次存档结果仍待确认','UNKNOWN');
        pendingWrite = null;
      }
      pendingWrite = content;
      return call('updateCloudStorage',{collection:COLLECTION,items:[{id:expected,content:content}]}).then(function(result) {
        check(token);
        var item = result.data && result.data[0];
        if (item && item.status === 'SUCCESS') { pendingWrite = null; return {saved:true}; }
        if (item && item.status === 'FAILED') { pendingWrite = null; throw failure('账号存档保存失败'); }
        return query(token).then(function(after) {
          var confirmed = after.some(function(r) { return r.id === expected && r.content && r.content.revision === content.revision; });
          if (!confirmed) throw failure('账号存档结果待确认','UNKNOWN');
          pendingWrite = null; return {saved:true};
        });
      },function(error) {
        check(token);
        if (error && typeof error.errCode === 'number' && error.errCode !== 2004) pendingWrite = null;
        throw error;
      });
    });
  }
  // Invalidate any preflight still awaiting its response before an account can change in the host app.
  return {enabled:!!enabled,load:load,write:write,suspend:function() { context++; }};
}
root.PictureAccountSave = {create:create,blank:blank};
}(typeof window !== 'undefined' ? window : this));
