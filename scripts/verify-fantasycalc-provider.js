import assert from 'node:assert/strict';
import { fantasyCalcQuery,parseFantasyCalcValues } from '../lib/providers/fantasycalc.js';
const query=fantasyCalcQuery({numTeams:10,ppr:1,numQbs:2});
assert.ok(query.includes('isDynasty=true'));assert.ok(query.includes('numQbs=2'));assert.ok(query.includes('numTeams=10'));assert.ok(query.includes('ppr=1'));
const snapshot=parseFantasyCalcValues([
 {player:{id:101,name:'Alpha QB',position:'QB',maybeTeam:'CHI',sleeperId:'1'},value:9000,overallRank:1,positionRank:1,trend30Day:50},
 {player:{id:102,name:'Beta WR',position:'WR',maybeTeam:'MIN',sleeperId:'2'},value:7000,overallRank:12,positionRank:5},
 {player:{id:103,name:'Kicker',position:'K',sleeperId:'3'},value:100}
],{asOf:'2026-09-18T00:00:00.000Z',numTeams:10,ppr:1,numQbs:2});
assert.equal(snapshot.source,'fantasycalc');assert.equal(snapshot.players.length,2);assert.equal(snapshot.players[0].sleeperId,'1');assert.equal(snapshot.players[0].value,9000);assert.equal(snapshot.format.ppr,1);assert.equal(snapshot.format.superflex,true);assert.equal(snapshot.provenance.rawValuePreserved,true);
console.log(JSON.stringify({source:snapshot.source,players:snapshot.players.length,format:snapshot.format,query},null,2));
