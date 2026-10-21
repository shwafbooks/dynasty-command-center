import assert from 'node:assert/strict';
import {recordOutlook,forecastRace,seedTeams} from '../lib/playoff-outlook.js';
const team=(id,w,remaining=1,division=null)=>({rosterId:id,wins:w,losses:3-w,ties:0,pointsFor:300,pointsAgainst:300,division,remaining:Array(remaining).fill({})});
let teams=[team(1,3),team(2,1),team(3,0),team(4,0)];
assert.equal(recordOutlook(teams,teams[0],2,false).status,'clinched');
assert.equal(recordOutlook(teams,teams[2],1,false).status,'eliminated');
assert.equal(recordOutlook(teams,teams[1],2,false).winsToGuarantee,1);
// A tied final record never proves a clinch while points can still change.
teams=[team(1,2),team(2,1),team(3,1),team(4,1)];
assert.equal(recordOutlook(teams,teams[0],2,false).status,'alive');
// A weaker division winner retains an automatic path despite stronger wildcards.
teams=[team(1,3,1,1),team(2,3,1,1),team(3,0,1,2),team(4,0,1,2)];
assert.equal(recordOutlook(teams,teams[2],2,true).status,'alive');
assert.equal(seedTeams(teams,true)[1].rosterId,3);
const schedule=Object.fromEntries([1,2,3,4,5].map(w=>[w,[1,2,3,4].map((id,i)=>({roster_id:id,matchup_id:Math.floor(i/2)+1,points:100}))]));
teams=[1,2,3,4].map(id=>({...team(id,id%2?3:0,2),losses:id%2?0:3}));
const args={week:4,start:6,slots:2,divisions:false,simulations:2000};
let f=forecastRace(teams,schedule,schedule,args);
assert(f.available);assert.equal(f.sampleWeeks,3);assert.deepEqual(f,forecastRace(teams,schedule,schedule,args));
assert(Math.abs(f.teams.reduce((s,t)=>s+t.playoffOdds,0)-2)<1e-9);
assert(f.teams.every(t=>Math.abs(t.seedOdds.reduce((a,b)=>a+b,0)-1)<1e-9));
assert.equal(forecastRace(teams,schedule,{...schedule,5:null},args).available,false);
const missing=structuredClone(schedule);missing[2][0].points=null;
assert.equal(forecastRace(teams,missing,schedule,args).available,false);
const stale=structuredClone(teams);stale[0].pointsFor++;
assert.equal(forecastRace(stale,schedule,schedule,args).available,false);
const dup=structuredClone(schedule);dup[4][1].roster_id=1;
assert.equal(forecastRace(teams,schedule,dup,args).available,false);
assert.equal(forecastRace(teams,schedule,schedule,{...args,enabled:false}).available,false);
// A completed season is not simulated.
assert.equal(forecastRace(teams,schedule,schedule,{...args,week:6}).available,false);
console.log('Playoff outlook: conservative clinches, division paths, deterministic simulations, probability totals, missing/stale data passed.');
// Exhaust every win/loss/tie outcome in a small remaining schedule. No bound
// may declare clinched/eliminated (or a guarantee) contrary to a possible finish.
const pairs=[[1,2],[3,4],[1,3],[2,4]];
for(const divisions of [false,true])for(let fixture=0;fixture<12;fixture++){
 const base=[1,2,3,4].map(id=>({...team(id,(fixture*id+id)%4,2,divisions?(id<3?1:2):null),remaining:pairs.flatMap(([a,b],i)=>a===id||b===id?[{week:4+Math.floor(i/2),opponent:{rosterId:a===id?b:a}}]:[])}));
 for(const target of base){const bounds=recordOutlook(base,target,2,divisions);
 for(let code=0;code<81;code++){
  const sim=structuredClone(base);let n=code,wins=0;
  for(const [a,b]of pairs){const x=sim[a-1],y=sim[b-1],result=n%3;n=Math.floor(n/3);if(result===2){x.ties++;y.ties++;}else{const winner=result===0?x:y,loser=result===0?y:x;winner.wins++;loser.losses++;if(winner.rosterId===target.rosterId)wins++;}}
  sim.forEach(t=>t.pointsFor=t.rosterId===target.rosterId?-1e6:1e6);
  const worst=seedTeams(sim,divisions).findIndex(t=>t.rosterId===target.rosterId)<2;
  if(bounds.status==='clinched'||bounds.winsToGuarantee!=null&&wins>=bounds.winsToGuarantee)assert(worst,'false guarantee');
  sim.forEach(t=>t.pointsFor=t.rosterId===target.rosterId?1e6:-1e6);
  if(bounds.status==='eliminated')assert(seedTeams(sim,divisions).findIndex(t=>t.rosterId===target.rosterId)>=2,'false elimination');
 }
 }
}
console.log('Record bounds cross-checked against every win/loss/tie finish in 24 miniature races.');
