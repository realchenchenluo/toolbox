const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/sheep/sequences.json'),'utf8'));
const images=[],blits=[],clears=[];
let lastBlit,failCanvas=false;
const document={createElement(tag){
  if(tag==='img'){const image={naturalWidth:128,naturalHeight:224};images.push(image);return image;}
  assert.equal(tag,'canvas');
  return {getContext(){if(failCanvas)return null;return {clearRect(...args){clears.push(args);},drawImage(...args){lastBlit=args.slice(1);blits.push(lastBlit);}};},toDataURL(type){assert.equal(type,'image/png');return 'data:image/png;base64,'+Buffer.from(JSON.stringify(lastBlit)).toString('base64');}};
}};
const context=vm.createContext({window:{},document});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../assets/sheep-frames.js'),'utf8'),context);
const frames=context.window.FarmSheepFrames;
for(const variant of manifest.variants){
  const prefix='./assets/sheep/'+variant.name,first=prefix+'-walk-0.png',count=images.length;
  assert.equal(frames.resolve(first),prefix+'-idle.png');
  const entry=frames.preload(prefix);assert.equal(images.length,count+1);assert.equal(images[count].src,prefix+'-sequence.png');
  assert.ok(fs.existsSync(path.join(__dirname,'..',images[count].src)));
  assert.ok(fs.existsSync(path.join(__dirname,'..',prefix+'-idle.png')));
  images[count].onload();assert.equal(entry.status,'ready');assert.equal(Object.keys(entry.frames).length,18);
  for(const frame of variant.frames){
    const uri=frames.resolve('./assets/sheep/'+frame.path);assert.match(uri,/^data:image\/png;base64,/);
    const args=JSON.parse(Buffer.from(uri.split(',')[1],'base64').toString());
    assert.deepEqual(args,[frame.x,frame.y,32,32,0,0,32,32]);
    assert.ok(args.every(Number.isInteger));
  }
  assert.equal(images.length,count+1,'frame changes must not request independent images');
}
assert.equal(blits.length,432);assert.equal(clears.length,432);assert.ok(clears.every(args=>JSON.stringify(args)==='[0,0,32,32]'));
const other='./assets/sheep/young-normal-wool-idle.png';assert.equal(frames.resolve(other),other);
const loading=frames.preload('./assets/sheep/bad');loading.status='loading';images.at(-1).naturalWidth=31;images.at(-1).onload();assert.equal(loading.status,'fallback');
failCanvas=true;const noCanvas=frames.preload('./assets/sheep/unavailable');images.at(-1).onload();assert.equal(noCanvas.status,'fallback');
const failed=frames.preload('./assets/sheep/missing');images.at(-1).onerror();assert.equal(failed.status,'fallback');
console.log('PASS: 24 atlas loads yield 432 isolated whole frames, integer crops, cleared transparency, cached reuse and whole-sheep fallbacks.');
