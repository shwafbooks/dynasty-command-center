import {rankShopOffers} from '../public/trade-shop.js';
import assert from 'node:assert/strict';
import {describeOfferFit,describeRosterFit,compareRosterOffers} from '../public/trade-relevance.js';
import {dynastyTrade} from '../public/dynasty-trade.js';
import {evaluateTrade} from '../public/trade-engine.js';
import {rosterNeeds} from '../public/trade-planning.js';
const p=(id,position)=>({id,name:id,position,nflTeam:'NE'}),slots=['QB','RB','WR','TE','FLEX','SUPER_FLEX'],a={rosterId:1,starters:[p('qa','QB'),p('qb','QB'),p('rb','RB'),p('wr','WR'),p('te','TE'),p('flex','WR')],bench:[p('depth','TE')]},b={rosterId:2,starters:[p('target','TE'),p('brb','RB'),p('bwr','WR'),p('bq','QB'),p('bq2','QB')],bench:[p('bte','TE'),p('bflex','WR')]};
const values={qa:100,qb:90,rb:80,wr:100,te:20,flex:70,depth:5,target:60,brb:40,bwr:40,bq:100,bq2:90,bte:15,bflex:30},markets={sources:[{source:'a',values},{source:'b',values:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v*5]))}]},context={projections:values,games:{}};
const test=(give,get,needsA=[],goals={})=>{const dynasty=dynastyTrade(a,b,give.map(x=>x.id),get.map(x=>x.id),slots,markets),weekly=evaluateTrade(a,b,give.map(x=>x.id),get.map(x=>x.id),slots,context);return describeOfferFit({dynasty,weekly,assetsA:give,assetsB:get,needsA,...goals});};
const te=test([a.bench[0]],[b.starters[0]],[{position:'TE',rank:9,of:10}]);assert.equal(te.sides[0].kind,'need');assert.equal(te.sides[0].label,'Strengthens TE');
const rb=test([a.starters[2]],[b.starters[1]]);assert.equal(rb.sides[0].kind,'replacement');assert.equal(rb.sides[0].label,'RB replacement');
const wr=test([a.starters[5]],[b.starters[2]]);assert(wr.sides[0].positions.find(p=>p.position==='WR').starts); // incoming receiver can occupy FLEX
const depth=test([a.bench[0]],[b.bench[0]]);assert.equal(depth.sides[0].kind,'depth');
const pick={id:'pick',position:'PICK'},capital=describeRosterFit({incoming:[pick],outgoing:[a.starters[0]],side:0,dynasty:{sources:[{complete:true,totals:[100,100],values:{pick:100}}]},weekly:[{delta:-10}],goal:'Rebuild'});assert.equal(capital.kind,'capital');assert.equal(capital.priority,4);
const needs=rosterNeeds(a,[a,b],markets,slots);assert(needs.some(n=>n.position==='TE'));assert(needs.every(n=>n.of===2));
const fake=(priority,mutual)=>({quality:{tier:'negotiation',score:1},rosterFit:{priority,mutual},score:0});assert(compareRosterOffers(fake(6,3),fake(1,0))<0);
assert.equal(describeRosterFit({incoming:[b.starters[0]],outgoing:[],side:0,dynasty:{sources:[]},weekly:[]}).kind,'unknown');
for(const side of te.sides)assert(!side.text.includes('undefined'));
console.log('All-position fit: TE needs, RB replacement, WR FLEX role, depth, draft capital, symmetric ranking and missing data passed.');

const cases=[...Array.from({length:5},(_,i)=>['need','Strengthens TE',100-i]),...Array.from({length:2},()=>['replacement','RB replacement',30]),...Array.from({length:2},()=>['starter','Starter option',20]),...Array.from({length:2},()=>['capital','Draft capital',10])].map(([kind,label,score],i)=>({other:{rosterId:i+1},send:[{id:'sold'}],receive:[{id:'return'+i}],score,quality:{tier:'negotiation'},rosterFit:{sides:[{priority:1},{kind,label,priority:kind==='need'?4:2}]}}));
const diverse=rankShopOffers(cases);assert.equal(diverse.length,8);assert.equal(diverse.filter(o=>o.rosterFit.sides[1].kind==='need').length,2);assert.equal(new Set(diverse.map(o=>o.rosterFit.sides[1].kind)).size,4);
console.log('Balanced search diversity: useful paths precede repeated same-position packages without an empty-result hard cap.');
