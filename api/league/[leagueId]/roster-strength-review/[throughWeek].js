import {buildLiveTeamComponentMatrix} from '../../../../lib/live-team-component-matrix.js';
import {reviewRosterStrengthFormula} from '../../../../lib/roster-strength-review.js';
const json=(d,s=200)=>new Response(JSON.stringify(d,null,2),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const CANDIDATES=[
 {name:'equal-evidence',weights:{verifiedProduction:1,lineupMarketCore:1,marketDepth:1,replacementAdvantage:1}},
 {name:'performance-forward',weights:{verifiedProduction:2,lineupMarketCore:1,marketDepth:1,replacementAdvantage:1}},
 {name:'market-core-forward',weights:{verifiedProduction:1,lineupMarketCore:2,marketDepth:1,replacementAdvantage:1}},
 {name:'depth-forward',weights:{verifiedProduction:1,lineupMarketCore:1,marketDepth:2,replacementAdvantage:0}},
 {name:'replacement-forward',weights:{verifiedProduction:1,lineupMarketCore:1,marketDepth:0,replacementAdvantage:2}}
];
export default{async fetch(request){try{const p=new URL(request.url).pathname.split('/').filter(Boolean),i=p.indexOf('league'),m=p.indexOf('roster-strength-review'),leagueId=i>=0?p[i+1]:null,throughWeek=m>=0?Number(p[m+1]):NaN;if(!leagueId||!Number.isInteger(throughWeek)||throughWeek<1)return json({status:'error',message:'Expected /api/league/:leagueId/roster-strength-review/:throughWeek'},400);const matrix=await buildLiveTeamComponentMatrix({leagueId,throughWeek});if(matrix.status!=='ready')return json({status:'withheld',reason:'component-matrix-not-ready',matrixStatus:matrix.status},422);const review=reviewRosterStrengthFormula({matrix,candidates:CANDIDATES});return json({leagueId:String(leagueId),throughWeek,market:matrix.market,formulaApproved:false,publishedRanking:false,...review});}catch(e){return json({status:'error',message:e instanceof Error?e.message:String(e)},500);}}};