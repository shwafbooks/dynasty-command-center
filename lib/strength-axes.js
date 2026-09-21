// DCC Strength Axes
// Separates current competitive evidence from dynasty asset evidence before any overall score is considered.
export const STRENGTH_AXES_VERSION='strength-axes-v1';
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
const finite=v=>v!==null&&v!==undefined&&!(typeof v==='string'&&v.trim()==='')&&Number.isFinite(Number(v));
export function buildStrengthAxes(matrix){
 if(matrix?.status!=='ready')return{status:'withheld',axesPublished:false,overallScorePublished:false,overallRankingPublished:false,teams:[]};
 const teams=(matrix.teams||[]).map(t=>({
  rosterId:t.rosterId,team:t.team,manager:t.manager,
  competitiveEvidence:{
   verifiedProduction:finite(t.verifiedProduction)?Number(t.verifiedProduction):null,
   status:finite(t.verifiedProduction)?'measured':'insufficient-data'
  },
  dynastyAssetEvidence:{
   lineupMarketCore:finite(t.lineupMarketCore)?Number(t.lineupMarketCore):null,
   ownedDepth:finite(t.marketDepth)?Number(t.marketDepth):null,
   replacementContext:finite(t.replacementAdvantage)?Number(t.replacementAdvantage):null,
   status:finite(t.lineupMarketCore)&&finite(t.marketDepth)?'descriptive-evidence':'insufficient-data'
  }
 }));
 return{status:'ready',axesPublished:true,overallScorePublished:false,overallRankingPublished:false,teams,
  interpretation:{
   competitiveStrength:'Verified fantasy production is current-season competitive evidence. It is not treated as dynasty asset value.',
   dynastyAssetStrength:'Market core and owned depth describe roster asset evidence. Replacement context remains contextual evidence and is not independently added to owned depth while redundancy is unresolved.',
   caution:'These axes intentionally remain separate. No cross-axis weights or overall roster-strength ranking are approved.'
  },
  provenance:{formulaVersion:STRENGTH_AXES_VERSION,competitiveFormula:'verified production evidence only',dynastyCompositePublished:false,replacementDoubleCounted:false,crossAxisWeightsApplied:false,aiAdjusted:false}
 };
}
