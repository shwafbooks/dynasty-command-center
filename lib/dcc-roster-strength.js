// Legacy DCC roster-strength entry point.
// Retained only to prevent older imports from breaking. The former 60/25/15 formula was never approved
// under current DCC governance and must not publish scores or rankings.
export const DCC_ROSTER_STRENGTH_VERSION='dcc-roster-strength-legacy-disabled-v2';
export const DCC_ROSTER_STRENGTH_WEIGHTS=null;
export function buildDccRosterStrength(){
 return{
  status:'withheld',
  formulaVersion:DCC_ROSTER_STRENGTH_VERSION,
  score:null,
  rankings:null,
  teams:[],
  weights:null,
  formulaApproved:false,
  publishedRanking:false,
  reason:'Legacy roster-strength formula disabled. Use the governed roster-strength review pipeline; no composite formula is approved.',
  provenance:{legacyFormulaDisabled:true,aiAdjusted:false,manualOverride:false}
 };
}
