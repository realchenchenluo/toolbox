(function (root) {
  'use strict';
  // The service isolates this collection by user x tool. Never pass a guessed user ID.
  root.createFarmCloudSave = function (api, buildVersion) {
    var client = Math.floor((Number(buildVersion) || 0) / 1000);
    if (client < 9510 || !api || ['queryCloudStorage', 'addCloudStorage', 'updateCloudStorage'].some(function (name) { return typeof api[name] !== 'function'; })) return null;
    var collection = 'muyun_farm_save', recordId = null, loaded = false, pending = null, sequence = 0;
    var chain = Promise.resolve();
    function failure(code, message) { var error = new Error(message); error.errCode = code; return error; }
    function allRecords() {
      var records = [], cursors = [];
      function page(cursor) {
        var query = { collection: collection, limit: 20 };
        if (cursor) query.cursor = cursor;
        return Promise.resolve().then(function () { return api.queryCloudStorage(query); }).then(function (result) {
          if (!result || !Array.isArray(result.items)) throw failure('INVALID_RESPONSE', '云端返回的存档格式不正确');
          records = records.concat(result.items);
          if (result.hasMore) {
            if (!result.nextCursor || cursors.indexOf(result.nextCursor) >= 0 || cursors.length >= 30) throw failure('INVALID_CURSOR', '云端存档未读取完整');
            cursors.push(result.nextCursor); return page(result.nextCursor);
          }
          return records.filter(function (row) { return row && row.id && row.content && row.content.kind === 'muyun-farm' && row.content.farm && Array.isArray(row.content.farm.sheep); });
        });
      }
      return page();
    }
    function load() {
      return allRecords().then(function (rows) {
        if (pending) {
          var confirmed = rows.filter(function (row) { return row.content.writeId === pending.writeId; })[0];
          if (!confirmed) throw failure('OUTCOME_UNKNOWN', '云端结果待确认，请稍后再次同步');
          recordId = confirmed.id; pending = null;
        }
        rows.sort(function (a, b) { return (Number(b.content.farm.savedAt) || 0) - (Number(a.content.farm.savedAt) || 0); });
        var row = rows[0]; recordId = row ? row.id : recordId; loaded = true;
        return row ? row.content.farm : null;
      });
    }
    function reconcile() {
      return load().then(function () { return true; }).catch(function (error) {
        if (error.errCode === 'OUTCOME_UNKNOWN') throw error;
        throw failure('OUTCOME_UNKNOWN', '云端保存结果待确认，暂不重复写入');
      });
    }
    function write(snapshot) {
      if (!loaded) return Promise.reject(failure('NOT_LOADED', '先读取云端存档再保存'));
      if (pending) return reconcile();
      var content = { kind: 'muyun-farm', schema: 1, writeId: 'w' + Date.now().toString(36) + '-' + (++sequence) + '-' + Math.floor(Math.random() * 1e9).toString(36), farm: snapshot };
      var bytes = encodeURIComponent(JSON.stringify(content)).replace(/%[A-F\d]{2}/gi, 'x').length;
      if (bytes > 65536) return Promise.reject(failure(1003, '存档超过云存储大小限制'));
      pending = content;
      var method = recordId ? 'updateCloudStorage' : 'addCloudStorage';
      var item = recordId ? { id: recordId, content: content } : { content: content };
      return Promise.resolve().then(function () { return api[method]({ collection: collection, items: [item] }); }).then(function (result) {
        var row = result && result.data && result.data[0];
        if (row && row.status === 'SUCCESS' && (row.id || recordId)) { recordId = row.id || recordId; pending = null; return true; }
        if (row && row.status === 'FAILED') { pending = null; throw failure('WRITE_FAILED', '云端保存失败'); }
        return reconcile();
      }, function (error) {
        // A transport error may follow a committed write. Query before creating again.
        if (error && [1006, 10001, 1001, 1002, 1003, 2001].indexOf(Number(error.errCode)) >= 0) { pending = null; throw error; }
        return reconcile();
      });
    }
    return {
      load: load,
      save: function (farm) {
        var snapshot = JSON.parse(JSON.stringify(farm));
        var operation = chain.then(function () { return write(snapshot); });
        chain = operation.catch(function () {}); return operation;
      }
    };
  };
}(window));
