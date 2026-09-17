// DCC Evidence Claim
// Converts an approved conclusion-gate result into a constrained payload for UI/AI narrative layers.
export const EVIDENCE_CLAIM_VERSION='evidence-claim-v1';
export function buildEvidenceClaim({gate,subject,headlineFact=null,comparison=null,context=[]}={}){
 if(gate?.status!=='supported'||gate?.allowed!==true)return{status:'withheld',narrativeAllowed:false,reasons:gate?.reasons||['conclusion-not-supported']};
 const evidence=(gate.evidence||[]).map(e=>({metricId:e.metricId,label:e.label,value:e.value,classification:e.classification,formulaVersion:e.formulaVersion,confidence:e.confidence??null,sources:e.sources||[]}));
 return{status:'ready',narrativeAllowed:true,subject,claimType:gate.claimType,headlineFact,comparison,context,evidence,constraints:{mustStayWithinEvidence:true,mayAddStyle:true,mayAddUnsupportedFacts:false,mayChangeMetricValues:false,mayInferManagerIntent:false,mayDeclareTradeWinner:false},provenance:{claimVersion:EVIDENCE_CLAIM_VERSION,conclusionGateVersion:gate.provenance?.gateVersion||null}};
}
export function buildNarrativeBrief(claim){if(claim?.status!=='ready'||!claim.narrativeAllowed)return{status:'withheld'};return{status:'ready',subject:claim.subject,claimType:claim.claimType,headlineFact:claim.headlineFact,comparison:claim.comparison,context:claim.context,evidence:claim.evidence,writerInstructions:['Use only supplied evidence for factual analytical claims.','Style and energy are allowed, but do not invent facts or motives.','Do not change numeric values.','If evidence is insufficient for an additional conclusion, omit it.'],constraints:claim.constraints};}
