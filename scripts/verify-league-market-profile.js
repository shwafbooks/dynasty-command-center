import assert from 'node:assert/strict';
import { buildLeagueMarketProfile } from '../lib/league-market-profile.js';
const teams=[{rosterId:1,team:'A',starters:[{id:'1',name:'QB One',position:'QB'},{id:'2',name:'WR One',position:'WR'}],bench:[{id:'3',name:'WR Two',position:'WR'}]}];
const withheld=buildLeagueMarketProfile({teams,marketIntelligence:{publicationEligible:false}});assert.equal(withheld.status,'withheld');assert.equal(withheld.provenance.rankingPublished,false);
const ready=buildLeagueMarketProfile({teams,marketIntelligence:{publicationEligible:true,consensus:{players:{'1':{consensusPercentile:.9,agreement:.95,sourceCount:3},'2':{consensusPercentile:.7,agreement:.82,sourceCount:2},'3':{consensusPercentile:.5,agreement:.6,sourceCount:2}}}}});
assert.equal(ready.status,'ready');assert.equal(ready.teams[0].overall.coverage,1);assert.equal(ready.teams[0].overall.meanConsensusPercentile,.7);assert.equal(ready.teams[0].positions.WR.meanConsensusPercentile,.6);assert.equal(ready.provenance.rankingPublished,false);assert.equal(ready.provenance.aiAdjusted,false);
console.log(JSON.stringify({status:ready.status,overall:ready.teams[0].overall,wr:ready.teams[0].positions.WR,rankingPublished:ready.provenance.rankingPublished},null,2));
