import {tradeSnapshotProblem} from '../lib/trade-markets.js';
import {fetchLiveMarketSnapshots} from '../lib/providers/live-market-sources.js';
import assert from 'node:assert/strict';
import {buildOffers} from '../public/offer-builder.js';
import {assessOffer} from '../public/offer-quality.js';
import {parseFantasyCalcValues} from '../lib/providers/fantasycalc.js';
import {parseStatsGuyPlayers} from '../lib/providers/statsguy.js';
import {parseDynastyProcessValues} from '../lib/providers/dynastyprocess.js';
import {matchExternalMarketValues} from '../lib/market-value.js';
const p=(id,position)=>({id,name:id,position,nflTeam:'NE'}),a={rosterId:1,starters:[p('aq','QB'),p('aw','WR')],bench:[p('aq2','QB')]},b={rosterId:2,starters:[p('bq','QB'),p('bw','WR')],bench:[p('bw2','WR')]};
const values={aq:100,aw:40,aq2:90,bq:40,bw:100,bw2:90},markets={sources:[{source:'a',values},{source:'b',values:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v*10]))}]},context={projections:Object.fromEntries(Object.entries(values).map(([k,v])=>[k,v/10])),games:{}},args={a,b,targets:[b.starters[1]],markets,slots:['QB','WR'],context};
const offers=buildOffers(args).offers;assert(offers.length>0);assert(offers.every(o=>o.quality.eligible&&o.quality.sourceCount===2));assert(offers.some(o=>o.quality.label==='Helps both lineups'));assert.equal(buildOffers({...args,markets:{sources:[markets.sources[0]]}}).offers.length,0);
const first=offers[0],qargs={dynasty:first.dynasty,weekly:first.weekly,assetsA:first.assets,assetsB:args.targets,context};
assert(assessOffer(qargs).eligible);
assert(!assessOffer({...qargs,dynasty:{sources:first.dynasty.sources.map(s=>({...s,relative:.3}))}}).eligible);
assert(!assessOffer({...qargs,dynasty:{sources:first.dynasty.sources.map(s=>({...s,core:[10,-50]}))}}).eligible);
assert(!assessOffer({...qargs,goalB:'Contend',weekly:first.weekly.map((s,i)=>i?{...s,delta:null}:s)}).eligible);
assert(!assessOffer({...qargs,context:{rosterLimit:1}}).eligible);
assert(!assessOffer({...qargs,weekly:first.weekly.map((s,i)=>i?{...s,after:{...s.after,open:1}}:s)}).eligible);
const pick={id:'pick',position:'PICK'},capitalSource={source:'a',complete:true,relative:0,core:[10,-50],values:{pick:100,bw:100}};
const capital={...qargs,dynasty:{sources:[capitalSource]},assetsA:[pick],assetsB:args.targets,goalB:'Rebuild'};
assert(assessOffer(capital).eligible);assert.equal(assessOffer(capital).coverage,'Single-source pick estimate');
assert(!assessOffer({...capital,goalB:'Balanced'}).eligible);
assert(!assessOffer({...capital,dynasty:{sources:[{...capitalSource,values:{pick:10,bw:100}}]}}).eligible);
const fc=parseFantasyCalcValues([null,'',0].map((value,i)=>({value,player:{name:'P'+i,position:'QB',sleeperId:String(i)}})));assert.equal(fc.players.length,1);assert.equal(fc.players[0].value,0);
const sg=parseStatsGuyPlayers({players:[null,'',0].map((v,i)=>({id:String(i+1),position:'QB',value:{sf_dynasty:v}}))});assert.equal(sg.players.length,1);
const dp=parseDynastyProcessValues('player,pos,value_2qb,scrape_date\nMissing,QB,,2026-10-19\nZero,QB,0,2026-10-19');assert.equal(dp.players.length,1);assert.equal(dp.players[0].value,0);
assert.equal(Object.keys(matchExternalMarketValues({teams:[a],snapshot:{source:'test',asOf:'2026-10-19',players:[{sleeperId:'aq',value:null}]}}).values).length,0);
console.log('Offer quality: mutual roster fit, source corroboration, scale isolation, market gaps, capacity, strategy, pick compensation, null/zero parsing passed.');

const now=Date.parse('2026-10-19T18:00:00Z');assert.equal(tradeSnapshotProblem({source:'dynastyprocess',asOf:'2026-10-16'},{now}),null);assert(tradeSnapshotProblem({source:'a',asOf:'2026-09-01'},{now}));assert(tradeSnapshotProblem({source:'a',asOf:'2026-11-01'},{now}));assert(tradeSnapshotProblem({source:'statsguy',asOf:'2026-10-19'},{now,numQbs:1}));
const feeds=await fetchLiveMarketSnapshots({numQbs:1,fetchImpl:async url=>({ok:true,json:async()=>String(url).includes('fantasycalc')?[]:{players:[]},text:async()=> 'player,pos,value_1qb,value_2qb,scrape_date\nTest,QB,50,500,2026-10-19'})});assert.equal(feeds.snapshots.find(s=>s.source==='dynastyprocess').format,'1qb');assert.equal(feeds.snapshots.find(s=>s.source==='dynastyprocess').players[0].value,50);
console.log('Market audit: stale/future dates, SF compatibility, requested 1QB scale passed.');

assert(!assessOffer({...qargs,goalB:'Contend',weekly:first.weekly.map((s,i)=>i?{...s,delta:.2}:s)}).eligible);assert(assessOffer({...qargs,goalB:'Contend'}).eligible);

assert(!assessOffer({...capital,assetsA:[pick,{id:'filler',position:'WR'}],dynasty:{sources:[{...capitalSource,core:[10,-5],values:{pick:10,filler:90,bw:100}}]}}).eligible);
