// DCC Metric Confidence Evidence
// Reports support/completeness/stability separately from the metric itself.
// Confidence never changes a player's or team's underlying score.
export const METRIC_CONFIDENCE_VERSION='metric-confidence-v1';
const round=(v,n=4)=>{const p=10**n;return Math.round((Number(v||0)+Number.EPSILON)*p)/p;};
const clamp=v=>Math.max(0,Math.min(1,Number(v)||0));
export function buildMetricConfidence({coverage,sourceAgreement,formulaStability,dataCompleteness}={}){
 const dimensions={coverage:Number.isFinite(Number(coverage))?clamp(coverage):null,sourceAgreement:Number.isFinite(Number(sourceAgreement))?clamp(sourceAgreement):null,formulaStability:Number.isFinite(Number(formulaStability))?clamp(formulaStability):null,dataCompleteness:Number.isFinite(Number(dataCompleteness))?clamp(dataCompleteness):null};
 const present=Object.values(dimensions).filter(v=>v!=null);if(!present.length)return{status:'insufficient-data',confidence:null,dimensions,metricAdjusted:false};
 const confidence=round(present.reduce((a,b)=>a+b,0)/present.length);const label=confidence>=.9?'very-high':confidence>=.75?'high':confidence>=.55?'moderate':'limited';
 return{status:'ready',confidence,label,dimensions,metricAdjusted:false,interpretation:{meaning:'Confidence summarizes how well-supported the evidence is; it is not player quality or team strength.',caution:'Confidence is displayed alongside a metric and never boosts or penalizes that metric.'},provenance:{formulaVersion:METRIC_CONFIDENCE_VERSION,aggregation:'equal mean of available evidence-quality dimensions',missingDimensions:'excluded and disclosed',aiAdjusted:false}};
}
export function stabilityToConfidence({orderSpread,teamCount}={}){const spread=Number(orderSpread),teams=Number(teamCount);if(!Number.isFinite(spread)||!Number.isFinite(teams)||teams<=1)return null;return round(1-Math.min(1,spread/(teams-1)));}
