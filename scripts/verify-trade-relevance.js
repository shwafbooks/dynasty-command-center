import assert from 'node:assert/strict';
import {relevantShopAsset} from '../public/trade-relevance.js';
import {shopTeam} from '../public/trade-shop.js';
const p=(id,position)=>({id,name:id,position,nflTeam:'NE'}),allen=p('allen','QB'),maye=p('maye','QB'),beck={...p('beck','QB'),injuryStatus:'Out'},jeanty=p('jeanty','RB'),own={rosterId:8,starters:[allen,maye,jeanty],bench:[beck]},reserve=p('reserve','QB'),upgrade=p('upgrade','QB');
const values={allen:100,maye:90,beck:2,jeanty:80,reserve:40,upgrade:95},markets={sources:[{source:'a',values},{source:'b',values:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v*5]))}]},context={projections:{allen:25,maye:21,beck:0,jeanty:16,reserve:15,upgrade:22},games:{}},args={own,sending:[jeanty],markets,slots:['QB','RB','SUPER_FLEX'],context};
assert.equal(relevantShopAsset({...args,asset:reserve}),false);
assert.equal(relevantShopAsset({...args,asset:upgrade}),true);
assert.equal(relevantShopAsset({...args,asset:p('wr','WR')}),true);
assert.equal(relevantShopAsset({...args,asset:reserve,sending:[jeanty,allen]}),true);
assert.equal(relevantShopAsset({...args,asset:reserve,sending:[jeanty,beck]}),false);
assert.equal(relevantShopAsset({...args,asset:reserve,context:{...context,injuries:{maye:'Out'}}}),true);
assert.equal(relevantShopAsset({...args,asset:reserve,context:{...context,games:{NE:{state:'bye'}}}}),false); // incoming QB is on the same bye
assert.equal(relevantShopAsset({...args,asset:reserve,markets:{sources:[markets.sources[0]]}}),true);
assert.equal(relevantShopAsset({...args,asset:reserve,context:{games:{},projections:{}}}),false);
const other={rosterId:2,starters:[reserve],bench:[upgrade]},rows=shopTeam({...args,other,teams:[own,other],targets:[jeanty]});assert(rows.every(o=>!o.receive.some(p=>p.id==='reserve')));
assert.equal(own.starters[0].id,'allen');
console.log('Shopping relevance: redundant QB blocked; real upgrade, starter replacement and injury cover retained; missing data and explicit targets safe.');

const missingRookie={sources:markets.sources.map(s=>({...s,values:Object.fromEntries(Object.entries(s.values).filter(([id])=>id!=='beck'))}))};assert.equal(relevantShopAsset({...args,asset:reserve,markets:missingRookie}),false);
assert.equal(relevantShopAsset({...args,asset:reserve,context:{...context,projections:{allen:25,reserve:15}}}),false);

const dissent={sources:[...markets.sources,{source:'c',values:{...values,reserve:91}}]};assert.equal(relevantShopAsset({...args,asset:reserve,markets:dissent}),false);
