const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const path=require('node:path');
const context=vm.createContext({window:{},console,Date,Math,Promise});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/cloud-save.js'),'utf8'),context);
const create=context.window.createFarmCloudSave;
const farm=(gold,savedAt)=>({day:0,savedAt,gold,sheep:[]});
function server(db,user,behavior={}) {
 let adds=0,updates=0;
 const rows=()=>db[user]||(db[user]=[]);
 const api={
  async queryCloudStorage(query){if(behavior.queryError)throw behavior.queryError;return {items:JSON.parse(JSON.stringify(rows())),hasMore:false};},
  async addCloudStorage(request){adds++;const id=user+'-'+adds;const item=request.items[0];if(!behavior.noCommit)rows().push({id,collection:request.collection,content:item.content});return {data:[{id:behavior.emptyId?'':id,status:behavior.unknown?'UNKNOWN':'SUCCESS'}]};},
  async updateCloudStorage(request){updates++;const item=request.items[0],row=rows().find(x=>x.id===item.id);if(behavior.updateFailed)return {data:[{id:item.id,status:'FAILED'}]};row.content=item.content;return {data:[{id:item.id,status:'SUCCESS'}]};}
 };
 return {api,get adds(){return adds;},get updates(){return updates;}};
}
async function run(){
 const db={},a=server(db,'A'),b=server(db,'B');
 assert.equal(create(a.api,9509000),null);assert.equal(create({},9510000),null);
 const alice=create(a.api,9510000),bob=create(b.api,9510000);
 await assert.rejects(alice.save(farm(1,1)),e=>e.errCode==='NOT_LOADED');
 assert.equal(await alice.load(),null);await alice.save(farm(711,10));
 assert.equal(await bob.load(),null);await bob.save(farm(922,20));
 assert.equal((await alice.load()).gold,711);assert.equal((await bob.load()).gold,922);
 await alice.save(farm(800,30));assert.equal(a.adds,1);assert.equal(a.updates,1);assert.equal(db.A.length,1);assert.equal((await alice.load()).gold,800);
 const unknownServer=server({},'unknown',{unknown:true,emptyId:true}),unknown=create(unknownServer.api,9510000);
 await unknown.load();await unknown.save(farm(123,40));assert.equal(unknownServer.adds,1);assert.equal((await unknown.load()).gold,123);
 const absentServer=server({},'absent',{unknown:true,noCommit:true,emptyId:true}),absent=create(absentServer.api,9510000);
 await absent.load();await assert.rejects(absent.save(farm(2,50)),e=>e.errCode==='OUTCOME_UNKNOWN');
 await assert.rejects(absent.save(farm(3,60)),e=>e.errCode==='OUTCOME_UNKNOWN');assert.equal(absentServer.adds,1);
 const denied=create(server({},'denied',{queryError:{errCode:1006}}).api,9510000);
 await assert.rejects(denied.load(),e=>e.errCode===1006);await assert.rejects(denied.save(farm(4,70)),e=>e.errCode==='NOT_LOADED');
 const failedServer=server({},'failed',{updateFailed:true}),failed=create(failedServer.api,9510000);await failed.load();await failed.save(farm(8,80));
 await assert.rejects(failed.save(farm(9,90)),e=>e.errCode==='WRITE_FAILED');assert.equal((await failed.load()).gold,8);
 const oversized=farm(0,100);oversized.text='很长的存档'.repeat(10000);
 await assert.rejects(alice.save(oversized),e=>e.errCode===1003);
 // Concurrent requests are committed in call order, keeping the newest snapshot.
 await Promise.all([alice.save(farm(11,101)),alice.save(farm(12,102)),alice.save(farm(13,103))]);assert.equal((await alice.load()).gold,13);
 console.log('PASS: cloud permission/version gates, per-user restore, update, unknown-write reconciliation, no duplicate creation, read failure, size limits and write ordering.');
}
run().catch(e=>{console.error(e);process.exitCode=1;});
