import assert from 'node:assert/strict';
import {buildDccRosterStrength} from '../lib/dcc-roster-strength.js';
import {normalizeTeamComponents} from '../lib/component-normalization.js';
import {runFormulaLab} from '../lib/formula-lab.js';
import {canonicalFranchise} from '../lib/franchise-identity.js';
import {ingestProviderSnapshots} from '../lib/provider-ingestion.js';
import {buildStrengthAxes} from '../lib/strength-axes.js';

const legacy=buildDccRosterStrength();
assert.equal(legacy.status,'withheld');
assert.equal(legacy.formulaApproved,false);
assert.equal(legacy.publishedRanking,false);

const matrix={status:'ready',teams:[
 {rosterId:'1',team:'A',verifiedProduction:10,lineupMarketCore:.2,marketDepth:.3,replacementAdvantage:.4},
 {rosterId:'2',team:'B',verifiedProduction:20,lineupMarketCore:.8,marketDepth:.7,replacementAdvantage:.6}
]};
const normalized=normalizeTeamComponents(matrix);
assert.equal(normalized.status,'ready');
assert.equal(normalized.scorePublished,false);
assert.equal(normalized.rankingPublished,false);
const lab=runFormulaLab({matrix,candidates:[{name:'test',weights:{verifiedProduction:1,lineupMarketCore:1}}]});
assert.equal(lab.status,'ready');
assert.equal(lab.published,false);
assert.equal(lab.formulaVersion,'formula-lab-v2');

const foreign=canonicalFranchise({leagueId:'other-league',manager:'shwaf',liveTeam:'Foreign Team',rosterId:1});
assert.equal(foreign.team,'Foreign Team');
assert.equal(foreign.canonicalTeam,null);
const home=canonicalFranchise({leagueId:'1389344338340761600',manager:'shwaf',liveTeam:'Return of the Jedi',rosterId:8});
assert.equal(home.team,'Return of the Jedi');
assert.equal(home.canonicalTeam,'Drake Maye');

const sameFamily=ingestProviderSnapshots({snapshots:[
 {source:'fantasycalc',independenceGroup:'completed-trades',asOf:'2026-09-18',players:[{playerId:'1',value:10}]},
 {source:'statsguy',independenceGroup:'completed-trades',asOf:'2026-09-18',players:[{playerId:'1',value:20}]}
],minimumIndependentSources:2});
assert.equal(sameFamily.publicationEligible,false);

const axes=buildStrengthAxes(matrix);
assert.equal(axes.status,'ready');
assert.equal(axes.axesPublished,true);
assert.equal(axes.overallScorePublished,false);
assert.equal(axes.overallRankingPublished,false);
assert.equal(axes.provenance.replacementDoubleCounted,false);
assert.equal(axes.teams[0].competitiveEvidence.verifiedProduction,10);
assert.equal(axes.teams[0].dynastyAssetEvidence.lineupMarketCore,.2);

console.log('DCC foundation smoke checks passed');
