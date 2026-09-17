// DCC Metric Audit Contract
// Standard envelope for any derived DCC metric shown to a user.
export const METRIC_AUDIT_VERSION='metric-audit-v1';
const VALID_CLASSIFICATIONS=new Set(['measured-fact','derived-metric','projection','external-market','descriptive-evidence']);
export function buildMetricAudit({metricId,label,value,classification,formulaVersion=null,inputs=[],sources=[],confidence=null,completeness=null,asOf=null,scope=null,notes=[]}={}){
 const errors=[];if(!metricId)errors.push('missing-metric-id');if(!label)errors.push('missing-label');if(!VALID_CLASSIFICATIONS.has(classification))errors.push('invalid-classification');if(classification==='derived-metric'&&!formulaVersion)errors.push('missing-formula-version');if((classification==='derived-metric'||classification==='external-market')&&!sources.length)errors.push('missing-sources');
 if(errors.length)return{status:'invalid',errors,publishable:false};
 return{status:'ready',metricId,label,value,classification,formulaVersion,inputs,sources,confidence,completeness,asOf,scope,notes,publishable:true,audit:{contractVersion:METRIC_AUDIT_VERSION,aiCanExplain:true,aiCanModifyValue:false,manualOverride:false,sourceTraceRequired:true},interpretation:{measuredVsDerived:classification==='measured-fact'?'Value is a recorded fact from the cited source.':classification==='projection'?'Value is explicitly a projection, not an observed result.':'Value is derived/descriptive and must be interpreted with its formula, inputs, sources, and completeness.'}};
}
export function auditMetricCollection(metrics=[]){const valid=[],invalid=[];for(const metric of metrics){const row=buildMetricAudit(metric);(row.status==='ready'?valid:invalid).push(row);}return{status:invalid.length?'review-required':'ready',publishable:invalid.length===0,valid,invalid,contractVersion:METRIC_AUDIT_VERSION};}
