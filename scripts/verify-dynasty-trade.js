import assert from 'node:assert/strict';
import {dynastyTrade} from '../public/dynasty-trade.js';
const a={rosterId:1,manager:'A',starters:[{id:'1',name:'Outgoing',position:'RB',injuryStatus:null}],bench:[]},b={rosterId:2,manager:'B',starters:[{id:'2',name:'Walker',position:'RB',injuryStatus:'Out'}],bench:[]};
const markets={sources:[{source:'fantasycalc',values:{1:2000,2:4000}},{source:'statsguy',values:{1:1000,2:2200}}]};
const d=dynastyTrade(a,b,new Set(['1']),new Set(['2']),['RB'],markets);assert.equal(d.sources[0].core[0],2000);assert.equal(d.sides[0].core,'Stronger dynasty core');assert.equal(d.sources[0].vote,'a');assert.equal(d.usable,2);
const healthy=structuredClone(b);healthy.starters[0].injuryStatus=null;assert.deepEqual(d.sources.map(s=>s.core),dynastyTrade(a,healthy,['1'],['2'],['RB'],markets).sources.map(s=>s.core));
const missing=dynastyTrade(a,b,['1'],['2'],['RB'],{sources:[{source:'x',values:{1:2000}}]});assert.equal(missing.sources[0].vote,'missing');assert.equal(missing.sources[0].totals[1],null);
const mixed=dynastyTrade(a,b,['1'],['2'],['RB'],{sources:[...markets.sources,{source:'other',values:{1:5000,2:1000}}]});assert(mixed.disagreement);
assert.equal(d.bestAsset[0].receives,'A');console.log('Dynasty trade: separate provider scales, missing values, disagreement and injury-independent future core passed.');
