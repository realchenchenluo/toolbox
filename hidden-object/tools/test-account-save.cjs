const fs = require('fs'), vm = require('vm'), assert = require('node:assert/strict');
const env={window:{},Promise,JSON,Math,Date,setTimeout,clearTimeout};
vm.runInNewContext(fs.readFileSync('hidden-object/assets/account-save.js','utf8'),env);
const create = env.window.PictureAccountSave.create;
const copy=v=>JSON.parse(JSON.stringify(v));
function server() {
  let user='a',serial=0,db={a:[],b:[]},writes=[],queries=0,failRead=false,unknownAdd=false,unknownWrite=false,rejectWrite=false;
  const tool={
    getStorage(){throw Error('must not read the shared legacy save');},
    setStorage(){throw Error('must not write device-wide progress');},
    async queryCloudStorage(args){queries++;if(failRead)throw {errCode:2001};const start=Number(args.cursor)||0,items=db[user].slice(start,start+1).map(copy);return {items,nextCursor:start+1<db[user].length?String(start+1):undefined};},
    async addCloudStorage(args){const rows=args.items.map(item=>{const r={id:(++serial).toString(16).padStart(24,'0'),collection:args.collection,content:copy(item.content)};db[user].push(r);writes.push({user,type:'add',row:copy(r)});return {id:unknownAdd?'':r.id,status:unknownAdd?'UNKNOWN':'SUCCESS'};});return {data:rows};},
    async updateCloudStorage(args){return {data:args.items.map(item=>{if(rejectWrite)throw {errCode:2001};const row=db[user].find(r=>r.id===item.id);assert(row,'must never update a record from another account');row.content=copy(item.content);writes.push({user,type:'update',row:copy(row)});return {id:item.id,status:unknownWrite?'UNKNOWN':'SUCCESS'};})};}
  };
  return {tool,db,writes,get queries(){return queries;},switchTo(v){user=v;},failRead(v){failRead=v;},unknownAdd(){unknownAdd=true;},unknownWrite(){unknownWrite=true;},rejectWrite(v){rejectWrite=v;}};
}
const sample={current:4,pages:{'001':{found:['001-01','001-02'],strokes:[]}}};
(async()=>{
  const s=server(),a=create(s.tool,9533);
  assert(a.enabled);let slot=await a.load();assert.equal(Object.keys(slot.progress.pages).length,0,'first account starts fresh');
  await a.write(sample);assert.equal(s.db.a[0].content.progress.current,4);
  s.switchTo('b');let changed=await a.write(sample);assert(changed.changed,'preflight detects an account change');assert.equal(Object.keys(changed.save.progress.pages).length,0,'new account receives a blank save');assert.equal(Object.keys(s.db.b[0].content.progress.pages).length,0,'old progress must not leak into a new account');
  const b=create(s.tool,9533);await b.load();await b.write({current:0,pages:{'002':{found:['002-01'],strokes:[]}}});
  s.switchTo('a');slot=await create(s.tool,9533).load();assert.equal(slot.progress.current,4,'reopening same account restores it');assert.deepEqual(copy(slot.progress.pages['001'].found),sample.pages['001'].found);assert(!slot.progress.pages['002'],'another account never merges into this save');
  s.failRead(true);const count=s.writes.length;await assert.rejects(()=>a.load());await assert.rejects(()=>a.write(sample));assert.equal(s.writes.length,count,'read failure must not trigger add or overwrite');s.failRead(false);
  const u=server();u.unknownAdd();const c=create(u.tool,9533);await c.load();assert.equal(u.writes.length,1,'unknown add reconciles without duplicate create');u.unknownWrite();await c.write(sample);assert.equal(u.db.a.length,1,'unknown write reconciles one record');
  u.rejectWrite(true);await assert.rejects(()=>c.write(sample));u.rejectWrite(false);await c.write(sample);
  const many=copy(sample);many.pages['001'].strokes=Array.from({length:100},()=>({mode:'brush',color:'#ed9271',width:12,points:Array.from({length:90},()=>({x:400,y:800}))}));await a.write(many);assert(Buffer.byteLength(JSON.stringify(s.db.a[0].content),'utf8')<65536);assert.equal(s.db.a[0].content.progress.pages['001'].found.length,2,'ink trimming preserves discoveries');
  const p=server();p.db.a.push({id:'irrelevant',collection:'picture_hide_seek_v1',content:{schema:0}});p.db.a.push(copy(s.db.a[0]));const paged=await create(p.tool,9533).load();assert.equal(paged.progress.current,4);assert.equal(p.queries,2,'reads every page before selecting the save');
  const race=server(),raceSave=create(race.tool,9550);await raceSave.load();
  const originalQuery=race.tool.queryCloudStorage;let releaseRead;
  race.tool.queryCloudStorage=async args=>{const result=await originalQuery(args);return new Promise(resolve=>{releaseRead=()=>resolve(result);});};
  const delayedWrite=raceSave.write(sample);await new Promise(resolve=>setImmediate(resolve));
  const writesBeforeSwitch=race.writes.length;raceSave.suspend();race.switchTo('b');releaseRead();
  await assert.rejects(()=>delayedWrite,error=>error.errCode==='STALE');assert.equal(race.writes.length,writesBeforeSwitch,'suspended preflight must not dispatch an update for a new account');
  race.tool.queryCloudStorage=originalQuery;const freshB=await raceSave.load();assert.equal(Object.keys(freshB.progress.pages).length,0);
  const reading=server(),reader=create(reading.tool,9550);let releaseEmpty;
  const firstQuery=reading.tool.queryCloudStorage;reading.tool.queryCloudStorage=async args=>{const result=await firstQuery(args);return new Promise(resolve=>{releaseEmpty=()=>resolve(result);});};
  const delayedLoad=reader.load();await new Promise(resolve=>setImmediate(resolve));reader.suspend();reading.switchTo('b');releaseEmpty();
  await assert.rejects(()=>delayedLoad,error=>error.errCode==='STALE');assert.equal(reading.writes.length,0,'suspended empty read must not create a save');
  const no=create({getStorage(){throw Error('legacy');}},9460);assert(!no.enabled,'older clients do not get unscoped fallback');await assert.rejects(()=>no.load());
  console.log('PASS: account A/B isolation, fresh account, reopening, switch before write, read rejection, UNKNOWN reconciliation, pagination, 64 KiB budget, cancelled stale preflights, no shared legacy fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
