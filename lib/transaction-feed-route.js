import {buildTransactionFeed} from './transaction-feed.js';

const API=process.env.SLEEPER_API_BASE||'https://api.sleeper.app/v1';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'public, s-maxage=60, stale-while-revalidate=300'}});
async function sleeper(path){const response=await fetch(`${API}${path}`);if(!response.ok)throw new Error(`Sleeper ${response.status}: ${path}`);return response.json();}

export default{async fetch(request){
  const parts=new URL(request.url).pathname.split('/').filter(Boolean),leagueId=parts[parts.indexOf('league')+1];
  if(!/^\d+$/.test(leagueId||''))return json({status:'error',message:'Invalid league ID'},400);
  try{
    const [league,rosters,users,players,state]=await Promise.all([sleeper(`/league/${leagueId}`),sleeper(`/league/${leagueId}/rosters`),sleeper(`/league/${leagueId}/users`),sleeper('/players/nfl'),sleeper('/state/nfl')]);
    if(!league?.league_id)return json({status:'error',message:'League not found'},404);
    const currentSeason=String(state.season)===String(league.season);
    const lastWeek=league.status==='complete'?18:currentSeason?Math.max(1,Math.min(18,Number(state.week)||1)):18;
    const weeks=Array.from({length:lastWeek},(_,index)=>index+1);
    const results=await Promise.allSettled(weeks.map(week=>sleeper(`/league/${leagueId}/transactions/${week}`)));
    const failedWeeks=weeks.filter((_,index)=>results[index].status==='rejected');
    const transactions=results.flatMap(result=>result.status==='fulfilled'&&Array.isArray(result.value)?result.value:[]);
    if(failedWeeks.length===weeks.length)return json({status:'error',message:'Sleeper transactions are unavailable',failedWeeks},503);
    const feed=buildTransactionFeed({transactions,rosters,users,players});
    return json({status:failedWeeks.length?'partial':'ready',leagueId,season:String(league.season),source:'Sleeper completed transactions',syncedAt:new Date().toISOString(),coverage:{requestedWeeks:weeks,failedWeeks},...feed});
  }catch(error){return json({status:'error',message:error instanceof Error?error.message:String(error)},502);}
}};
