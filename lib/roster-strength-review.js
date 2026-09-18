import {normalizeTeamComponents} from './component-normalization.js';
import {assessComponentRedundancy} from './component-redundancy.js';
import {runFormulaLab} from './formula-lab.js';
import {assessFormulaStability} from './formula-stability.js';
export const ROSTER_STRENGTH_REVIEW_VERSION='roster-strength-review-v1';
export function reviewRosterStrengthFormula({matrix,candidates=[]}={}){
 const normalization=normalizeTeamComponents(matrix);if(normalization.status!=='ready')return{status:'withheld',formulaApproved:false};
 const redundancy=assessComponentRedundancy(normalization),lab=runFormulaLab({matrix,candidates}),stability=assessFormulaStability(lab);
 return{status:'ready',formulaApproved:false,publishedRanking:false,normalization,redundancy,stability,candidateResults:lab.results||[],review:{redundancyReviewRequired:redundancy.reviewRequired,stableEnoughToReview:stability.stableEnoughToReview===true,automaticApproval:false},interpretation:{meaning:'Diagnostic packet for evaluating candidate roster-strength formulas before publication.',caution:'No candidate is selected or published by this module. Weight choice remains an explicit governed formula decision.'},provenance:{formulaVersion:ROSTER_STRENGTH_REVIEW_VERSION,aiSelectedFormula:false,automaticApproval:false}};
}