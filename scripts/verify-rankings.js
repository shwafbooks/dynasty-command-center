import assert from 'node:assert/strict';
import {buildPowerRankings} from '../public/rankings-model.js';
const teams=[1,2,3,4].map(rosterId=>({rosterId}));
const fixture=scores=>scores.map((points,i)=>({week:i+1,rosters:points.map((points,j)=>({rosterId:j+1,starters:[{playerId:'p'+j,points}]}))}));
const run=scores=>buildPowerRankings({teams,starterWeeks:fixture(scores),verifiedWeeks:scores.map((_,i)=>i+1),throughWeek:scores.length});
let d=run([[100,90,80,70],[100,90,80,70],[100,90,80,70],[100,90,80,70]]);
assert.equal(d.teams[0].rosterId,1);assert.equal(d.teams[0].powerIndex,100);assert.equal(d.teams[3].powerIndex,0);assert.equal(d.teams[0].allPlayWins,12);assert.equal(d.teams[0].ppg,100);assert.equal(d.teams[0].movement,0);
// All-play ignores lucky opponent schedules; exact ties split credits and rank.
d=run([[20,20,10,0]]);assert.deepEqual(d.teams.map(t=>t.rank),[1,1,3,4]);assert.equal(d.teams[0].allPlayTies,1);assert.equal(d.teams[0].movement,null);
// Recent scoring matters more; losses, ties and negative fantasy points stay real.
d=run([[100,0,-1,-2],[100,0,-1,-2],[0,100,-1,-2],[0,100,-1,-2]]);assert.equal(d.teams[0].rosterId,2);assert.equal(d.teams.at(-1).points,-8);
const more=run([[100,0,-1,-2],[100,0,-1,-2],[0,100,-1,-2],[0,100,-1,-2],[0,100,-1,-2]]);assert.equal(more.teams[0].recentPpg,100);
const missing=fixture([[1,2,3,4]]);missing[0].rosters[0].starters[0].points=null;
assert.equal(buildPowerRankings({teams,starterWeeks:missing,verifiedWeeks:[1],throughWeek:1}).status,'unavailable');
assert.equal(buildPowerRankings({teams,starterWeeks:fixture([[1,2,3,4]]),verifiedWeeks:[1],throughWeek:2}).status,'unavailable');
const duplicate=fixture([[1,2,3,4]]);duplicate[0].rosters[1].rosterId=1;
assert.equal(buildPowerRankings({teams,starterWeeks:duplicate,verifiedWeeks:[1],throughWeek:1}).status,'unavailable');
assert.deepEqual(JSON.parse(JSON.stringify(run([[0,0,0,0]]))).teams.map(t=>t.rank),[1,1,1,1]);
console.log('Rankings: all-play math, ties, recent weighting, movement, negative scores and incomplete-data gates passed.');
const immutable=fixture([[5,4,3,2],[4,5,3,2]]),before=JSON.stringify(immutable);
buildPowerRankings({teams,starterWeeks:immutable,verifiedWeeks:[1,2],throughWeek:2});assert.equal(JSON.stringify(immutable),before);
const withBench=teams.map(t=>({...t,bench:[{name:'Bench rookie',seasonPoints:0}]}));assert.deepEqual(buildPowerRankings({teams:withBench,starterWeeks:immutable,verifiedWeeks:[1,2],throughWeek:2}).teams,buildPowerRankings({teams,starterWeeks:immutable,verifiedWeeks:[1,2],throughWeek:2}).teams);
const duplicateWeek=fixture([[1,2,3,4]]);duplicateWeek.push(duplicateWeek[0]);assert.equal(buildPowerRankings({teams,starterWeeks:duplicateWeek,verifiedWeeks:[1],throughWeek:1}).status,'unavailable');
