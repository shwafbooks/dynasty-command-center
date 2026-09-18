// DCC Component Normalization
// Converts unlike component units into a common within-league empirical scale without choosing weights.
export const COMPONENT_NORMALIZATION_VERSION='component-normalization-v1';
export const COMPONENT_KEYS=['verifiedProduction','lineupMarketCore','marketDepth','replacementAdvantage'];
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v)+Number.EPSILON)*p)/p;};
function percentile(values,value){const sorted=[...values].sort((a,b)=>a-b);if(sorted.length===1)return 0.5;const below=sorted.filter(v=>v<value).length,equal=sorted.filter(v=>v===value).length;return round((below+(equal-1)/2)/(sorted.length-1));}
export function normalizeTeamComponents(matrix){
 if(matrix?.status!=='ready')return{status:'withheld',teams:[],scorePublished:false};
 const populations=Object.fromEntries(COMPONENT_KEYS.map(k=>[k,(matrix.teams||[]).map(t=>Number(t[k])).filter(Number.isFinite)]));
 const teams=(matrix.teams||[]).map(t=>({rosterId:t.rosterId,team:t.team,manager:t.manager,components:Object.fromEntries(COMPONENT_KEYS.map(k=>{const raw=Number(t[k]),pop=populations[k];return[k,{raw:Number.isFinite(raw)?raw:null,percentile:Number.isFinite(raw)&&pop.length?percentile(pop,raw):null,eligibleTeams:pop.length}];}))}));
 return{status:'ready',teams,scorePublished:false,rankingPublished:false,weightsApplied:false,interpretation:{meaning:'Each component is expressed as an empirical percentile within the current league, preserving its original raw value.',caution:'Normalization makes unlike units comparable; it does not determine how important a component should be.'},provenance:{formulaVersion:COMPONENT_NORMALIZATION_VERSION,method:'within-league empirical percentile rank with midpoint ties',crossLeagueAbsoluteComparison:false,weightsSelected:false,aiAdjusted:false}};
}