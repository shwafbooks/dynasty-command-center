// DCC Roster Strength Readiness Gate
// Determines whether evidence is complete enough to DESIGN a strength formula.
// It does not calculate, rank, grade, or publish roster strength.
export const ROSTER_STRENGTH_READINESS_VERSION='roster-strength-readiness-v1';
const POSITIONS=['QB','RB','WR','TE'];
export function assessRosterStrengthReadiness({productionEvidence,rosterEvidence,marketProfile,requiredMarketCoverage=0.9}={}){
 const checks=[];
 checks.push({id:'verified-production',pass:Boolean(productionEvidence?.complete||productionEvidence?.status==='verified'||productionEvidence?.status==='evidence-ready'),detail:'Verified DCC scoring evidence must exist.'});
 checks.push({id:'roster-construction',pass:Boolean(rosterEvidence?.status==='evidence-ready'||rosterEvidence?.teams?.length),detail:'Current Sleeper roster/depth evidence must exist.'});
 checks.push({id:'market-publication-gate',pass:Boolean(marketProfile?.publicationEligible&&marketProfile?.status==='ready'),detail:'Multi-source market evidence must pass upstream publication gates.'});
 const teams=marketProfile?.teams||[];
 const lowCoverage=teams.filter(t=>Number(t?.overall?.coverage||0)<requiredMarketCoverage).map(t=>({rosterId:t.rosterId,team:t.team,coverage:t?.overall?.coverage||0}));
 checks.push({id:'team-market-coverage',pass:teams.length>0&&lowCoverage.length===0,detail:`Every team requires at least ${Math.round(requiredMarketCoverage*100)}% market-consensus coverage.`,failures:lowCoverage});
 const positionalGaps=[];for(const t of teams)for(const p of POSITIONS){const row=t?.positions?.[p];if(row?.rosterPlayers>0&&row?.consensusPlayers===0)positionalGaps.push({rosterId:t.rosterId,team:t.team,position:p});}
 checks.push({id:'positional-market-evidence',pass:positionalGaps.length===0,detail:'No occupied core position may have zero market-consensus players.',failures:positionalGaps});
 const ready=checks.every(c=>c.pass);
 return{status:ready?'formula-design-ready':'not-ready',formulaDesignEligible:ready,strengthScorePublished:false,teamRankingPublished:false,checks,requiredMarketCoverage,provenance:{formulaVersion:ROSTER_STRENGTH_READINESS_VERSION,purpose:'Evidence readiness only; no strength calculation.',aiAdjusted:false,manualOverride:false}};
}
