import assert from 'node:assert/strict';
import { buildMarketConsensus } from '../lib/market-consensus.js';
import { buildMarketDisagreementReport } from '../lib/market-disagreement.js';

const sources=[
 {source:'community',asOf:'2026-09-18',players:[{playerId:'a',value:100},{playerId:'b',value:80},{playerId:'c',value:60}]},
 {source:'trade-market',asOf:'2026-09-18',players:[{playerId:'b',value:100},{playerId:'a',value:80},{playerId:'c',value:60}]},
 {source:'expert',asOf:'2026-09-18',players:[{playerId:'a',value:100},{playerId:'c',value:80},{playerId:'b',value:60}]}
];
const consensus=buildMarketConsensus({sources,minimumSources:2});
assert.equal(consensus.status,'consensus-ready');
assert.equal(consensus.sourceCount,3);
assert.equal(Object.keys(consensus.players).length,3);
assert.equal(consensus.provenance.rawValuesAveraged,false);
const disagreement=buildMarketDisagreementReport(consensus);
assert.equal(disagreement.status,'ready');
assert.equal(disagreement.playerCount,3);
assert.equal(disagreement.provenance.sourceWinnerDeclared,false);
assert.ok(disagreement.players.a.percentileSpread>=0);
assert.ok(['low','moderate','high'].includes(disagreement.players.a.disagreementLevel));

// v2: two provider websites from the same evidence family must NOT create consensus.
const sameFamily=buildMarketConsensus({sources:[
 {source:'trade-a',independenceGroup:'completed-trades',asOf:'2026-09-18',players:[{playerId:'x',value:100}]},
 {source:'trade-b',independenceGroup:'completed-trades',asOf:'2026-09-18',players:[{playerId:'x',value:90}]}
],minimumSources:2});
assert.equal(sameFamily.status,'insufficient-data');
const independent=buildMarketConsensus({sources:[
 {source:'trade-a',independenceGroup:'completed-trades',asOf:'2026-09-18',players:[{playerId:'x',value:100}]},
 {source:'expert',independenceGroup:'expert-rankings',asOf:'2026-09-18',players:[{playerId:'x',value:90}]}
],minimumSources:2});
assert.equal(independent.status,'consensus-ready');
assert.equal(independent.players.x.independentSourceCount,2);

console.log(JSON.stringify({consensusStatus:consensus.status,players:Object.values(consensus.players).map(p=>({playerId:p.playerId,consensusPercentile:p.consensusPercentile,agreement:p.agreement})),disagreementStatus:disagreement.status,distribution:disagreement.distribution},null,2));
