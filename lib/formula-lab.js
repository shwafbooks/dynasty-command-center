// DCC Formula Lab
// PRIVATE diagnostic utility. Uses the canonical normalization layer so diagnostics cannot drift from published methodology.
import {normalizeTeamComponents,COMPONENT_KEYS} from './component-normalization.js';
export const FORMULA_LAB_VERSION='formula-lab-v2';
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v||0)+Number.EPSILON)*p)/p;};
export function runFormulaLab({matrix,candidates=[]}={}){
 if(matrix?.status!=='ready')return{status:'withheld',published:false,results:[]};
 const normalization=normalizeTeamComponents(matrix);
 if(normalization.status!=='ready')return{status:'withheld',published:false,results:[]};
 const normalized=(normalization.teams||[]).map(t=>({rosterId:t.rosterId,team:t.team,components:Object.fromEntries(COMPONENT_KEYS.map(c=>[c,t.components?.[c]?.percentile??null]))}));
 const results=candidates.map(candidate=>{const weights={};let total=0;for(const c of COMPONENT_KEYS){const w=Math.max(0,Number(candidate?.weights?.[c]||0));weights[c]=w;total+=w;}if(total<=0)return{name:candidate?.name||'unnamed',status:'invalid-weights'};for(const c of COMPONENT_KEYS)weights[c]/=total;const teams=normalized.map(t=>{let weighted=0,used=0;for(const c of COMPONENT_KEYS){const v=t.components[c];if(v==null||weights[c]===0)continue;weighted+=v*weights[c];used+=weights[c];}return{rosterId:t.rosterId,team:t.team,diagnosticScore:used?round(weighted/used):null,components:t.components};}).sort((a,b)=>(Number(b.diagnosticScore)||-1)-(Number(a.diagnosticScore)||-1)||String(a.rosterId).localeCompare(String(b.rosterId)));return{name:candidate?.name||'unnamed',status:'diagnostic-only',weights,teams:teams.map((t,i)=>({...t,diagnosticOrder:i+1}))};});
 return{status:'ready',published:false,formulaVersion:FORMULA_LAB_VERSION,results,interpretation:{purpose:'Compare how candidate weight systems behave before any DCC roster-strength formula is approved.',warning:'Diagnostic scores/orders are internal sensitivity outputs, not DCC rankings.'},provenance:{componentNormalization:normalization.provenance?.formulaVersion,normalizationMethod:normalization.provenance?.method,aiSelectedWeights:false,publishedRanking:false}};
}
