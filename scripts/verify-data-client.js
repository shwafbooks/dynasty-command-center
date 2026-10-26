import assert from 'node:assert/strict';import vm from 'node:vm';import fs from 'node:fs';
let now=0,calls=0,mode='ok',release;
const scope={window:{},location:{origin:'https://dcc.test'},URL,AbortController,setTimeout,clearTimeout,Date:{now:()=>now},fetch:async(url,{signal})=>{calls++;if(mode==='sync-fail')throw Error('offline');if(mode==='timeout')return new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(Error('aborted'))));if(mode==='wait')await new Promise(resolve=>release=resolve);return{ok:mode!=='http-fail',status:503,json:async()=>({url,sequence:calls})};}};
vm.runInNewContext(fs.readFileSync(new URL('../public/data-client.js',import.meta.url),'utf8'),scope);const client=scope.window.DCCData;
mode='wait';const first=client.json('/api/rosters'),second=client.json('https://dcc.test/api/rosters');await Promise.resolve();assert.equal(calls,1);release();assert.deepEqual(await first,await second);
mode='ok';await client.json('/api/rosters');assert.equal(calls,1);now=16000;await client.json('/api/rosters');assert.equal(calls,2);await client.json('/api/rosters',{force:true});assert.equal(calls,3);
mode='http-fail';await assert.rejects(client.json('/api/fail'));mode='ok';await client.json('/api/fail');assert.equal(calls,5);
mode='sync-fail';await assert.rejects(client.json('/api/offline'));mode='ok';await client.json('/api/offline');assert.equal(calls,7);
mode='timeout';await assert.rejects(client.json('/api/slow',{timeoutMs:5}),/took too long/);mode='ok';await client.json('/api/slow');assert.equal(calls,9);
client.clear('/api/rosters');await client.json('/api/rosters');assert.equal(calls,10);
// An explicit refresh shares a request already in flight rather than doubling it.
client.clear();mode='wait';const a=client.json('/api/refresh'),b=client.json('/api/refresh',{force:true});await Promise.resolve();assert.equal(calls,11);release();await Promise.all([a,b]);
console.log('Data client: request sharing, expiry, explicit refresh, retry after HTTP/network errors, timeout and invalidation passed.');
