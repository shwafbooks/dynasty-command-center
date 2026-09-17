import assert from 'node:assert/strict';import{assessRosterStrengthReadiness}from'../lib/roster-strength-readiness.js';
const team=(id,coverage=1)=>({rosterId:id,team:`T${id}`,overall:{coverage},positions:{QB:{rosterPlayers:2,consensusPlayers:2},RB:{rosterPlayers:4,consensusPlayers:4},WR:{rosterPlayers:5,consensusPlayers:5},TE:{rosterPlayers:2,consensusPlayers:2}}});
const base={productionEvidence:{complete:true},rosterEvidence:{status:'evidence-ready'},marketProfile:{status:'ready',publicationEligible:true,teams:[team(1),team(2)]}};
const ready=assessRosterStrengthReadiness(base);assert.equal(ready.status,'formula-design-ready');assert.equal(ready.formulaDesignEligible,true);assert.equal(ready.strengthScorePublished,false);assert.equal(ready.teamRankingPublished,false);
const low=assessRosterStrengthReadiness({...base,marketProfile:{...base.marketProfile,teams:[team(1,.89),team(2)]}});assert.equal(low.formulaDesignEligible,false);assert.equal(low.checks.find(c=>c.id==='team-market-coverage').pass,false);
const noProduction=assessRosterStrengthReadiness({...base,productionEvidence:{complete:false,status:'partial'}});assert.equal(noProduction.formulaDesignEligible,false);
console.log(JSON.stringify({ready:ready.status,lowCoverage:low.status,noProduction:noProduction.status,publishesScore:ready.strengthScorePublished,publishesRanking:ready.teamRankingPublished},null,2));
