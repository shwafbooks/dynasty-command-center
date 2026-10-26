import vm from 'node:vm';import fs from 'node:fs';import assert from 'node:assert/strict';
const source=fs.readFileSync(new URL('../public/franchise.js',import.meta.url),'utf8');
function boot(saved={},blocked=false){const storage=new Map(Object.entries(saved)),listeners={},events=[],nodes=[];const element=()=>({open:false,innerHTML:'',textContent:'',setAttribute(){},append(){},addEventListener(){},querySelectorAll(){return[];},querySelector(){return element();},showModal(){this.open=true;},close(){this.open=false;}});const context={window:{},document:{createElement(){const n=element();nodes.push(n);return n;},querySelector:element,body:element()},localStorage:{getItem(k){if(blocked)throw Error();return storage.get(k)||null;},setItem(k,v){if(blocked)throw Error();storage.set(k,v);}},addEventListener(n,fn){listeners[n]=fn;},dispatchEvent(e){events.push(e);},CustomEvent:class{constructor(type,args){this.type=type;this.detail=args.detail;}}};vm.runInNewContext(source,context);return{api:context.window.DCCFranchise,storage,events,nodes};}
const teams=[{rosterId:1,ownerId:'owner-a',manager:'a',team:'Alpha'},{rosterId:2,ownerId:'owner-b',manager:'b',team:'Beta'}],key='dcc-franchise-1389344338340761600';
let env=boot();env.api.setTeams(teams);assert.equal(env.api.get(),null);assert(env.nodes[1].open);assert(env.api.select(2));assert.equal(env.api.get(),'2');assert.equal(env.events.at(-1).detail.rosterId,'2');assert(!env.api.select(99));
env=boot(Object.fromEntries(env.storage));env.api.setTeams(teams);assert.equal(env.api.get(),'2');assert(!env.nodes[1].open);
env.api.setTeams([{...teams[1],rosterId:8,team:'Renamed'}]);assert.equal(env.api.get(),'8');
env.api.setTeams([{...teams[1],ownerId:'new-owner'}]);assert.equal(env.api.get(),null);assert(env.nodes[1].open);
env=boot({'dcc-home-team':'1'});env.api.setTeams(teams);assert.equal(env.api.get(),'1');
env=boot({[key]:'broken'});env.api.setTeams(teams);assert.equal(env.api.get(),null);
env=boot({},true);env.api.setTeams(teams);assert(env.api.select(1));assert.equal(env.api.get(),'1');
console.log('Franchise preference: first visit, return visit, stable manager identity, owner replacement, legacy migration, corrupt and unavailable storage passed.');
