import assert from 'node:assert/strict';
import { auditLeagueMarketCoverage } from '../lib/league-market-coverage.js';
const teams=[{rosterId:1,starters:[{id:'a',name:'A',position:'QB'},{id:'b',name:'B',position:'WR'}],bench:[{id:'c',name:'C',position:'RB'}]},{rosterId:2,starters:[{id:'d',name:'D',position:'TE'}],bench:[{id:'e',name:'E',position:'WR'}]}];
const providers=[{source:'expert',asOf:'2026-09-18',players:[{playerId:'a',value:1},{playerId:'b',value:1},{playerId:'c',value:1},{playerId:'d',value:1}]},{source:'trades',asOf:'2026-09-18',players:[{playerId:'a',value:1},{playerId:'b',value:1},{playerId:'d',value:1},{playerId:'e',value:1}]}];
const report=auditLeagueMarketCoverage({teams,providerSnapshots:providers});
assert.equal(report.rosterPlayerCount,5);assert.equal(report.providers[0].matched,4);assert.equal(report.providers[1].matched,4);assert.equal(report.overlap.twoPlus,3);assert.equal(report.provenance.missingValuesEstimated,false);assert.equal(report.providers[0].byPosition.WR.coverage,0.5);
console.log(JSON.stringify({rosterPlayers:report.rosterPlayerCount,providers:report.providers.map(p=>({source:p.source,coverage:p.coverage,missing:p.missing})),twoPlus:report.overlap.twoPlus},null,2));
