// DCC Conclusion Gate
// Prevents narrative/AI layers from making claims unsupported by publishable audited metrics.
export const CONCLUSION_GATE_VERSION='conclusion-gate-v1';
const ALLOWED=['comparison','trend','record','strength-evidence','weakness-evidence','market-observation','production-observation'];
export function gateConclusion({claimType,metrics=[],requiredMetricIds=[],minimumConfidence=null}={}){
 const reasons=[];if(!ALLOWED.includes(claimType))reasons.push('unsupported-claim-type');
 const ready=metrics.filter(m=>m?.status==='ready'&&m?.publishable===true);const byId=new Map(ready.map(m=>[m.metricId,m]));
 for(const id of requiredMetricIds)if(!byId.has(id))reasons.push(`missing-publishable-metric:${id}`);
 if(Number.isFinite(Number(minimumConfidence))){for(const id of requiredMetricIds){const m=byId.get(id);if(!m)continue;const c=Number(m?.confidence?.confidence);if(!Number.isFinite(c))reasons.push(`missing-confidence:${id}`);else if(c<Number(minimumConfidence))reasons.push(`confidence-below-threshold:${id}`);}}
 const allowed=reasons.length===0;return{status:allowed?'supported':'withheld',allowed,claimType,reasons,evidence:requiredMetricIds.map(id=>{const m=byId.get(id);return m?{metricId:id,label:m.label,value:m.value,classification:m.classification,formulaVersion:m.formulaVersion,confidence:m.confidence??null,sources:m.sources}:null}).filter(Boolean),narrativePolicy:{aiMayExplain:allowed,aiMayInventEvidence:false,aiMayChangeMetricValues:false},provenance:{gateVersion:CONCLUSION_GATE_VERSION,deterministic:true}};
}
