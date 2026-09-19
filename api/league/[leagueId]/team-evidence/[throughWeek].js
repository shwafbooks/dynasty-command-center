import {buildLiveTeamComponentMatrix} from '../../../../../lib/live-team-component-matrix.js';
import {buildStrengthAxes} from '../../../../../lib/strength-axes.js';
const json=(d,s=200)=>new Response(JSON.stringify(d,null,2),{status:s,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-robots-tag':'noindex'}});
export default{async fetch(request){try{
 const p=new URL(request.url).pathname.split('/').filter(Boolean),i=p.indexOf('league'),m=p.indexOf('team-evidence'),leagueId=i>=0?p[i+1]:null,throughWeek=m>=0?Number(p[m+1]):NaN;
 if(!leagueId||!Number.isInteger(throughWeek)||throughWeek<1)return json({status:'error',message:'Expected /api/league/:leagueId/team-evidence/:throughWeek'},400);
 const matrix=await buildLiveTeamComponentMatrix({leagueId,throughWeek});
 if(matrix.status!=='ready')return json({leagueId:String(leagueId),throughWeek,status:'withheld',reason:matrix.reason||'component-matrix-unavailable'},422);
 const axes=buildStrengthAxes(matrix);
 return json({leagueId:String(leagueId),throughWeek,status:axes.status,verifiedWeeks:matrix.verifiedWeeks||[],market:matrix.market,lineupCapacity:matrix.lineupCapacity,teams:axes.teams,interpretation:axes.interpretation,publication:{axesPublished:axes.axesPublished,overallScorePublished:false,overallRankingPublished:false},provenance:{formulaVersion:axes.provenance.formulaVersion,componentMatrix:matrix.provenance?.formulaVersion,replacementDoubleCounted:false,crossAxisWeightsApplied:false,aiAdjusted:false}});
 }catch(e){return json({status:'error',message:e instanceof Error?e.message:String(e)},500);}}};
