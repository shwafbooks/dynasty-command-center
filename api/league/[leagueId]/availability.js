import {buildLineupCapacity} from '../../../lib/lineup-capacity.js';
import {deriveSleeperLineupSettings} from '../../../lib/sleeper-league-format.js';
import {buildLeagueAvailability} from '../../../lib/league-availability.js';
const API='https://api.sleeper.app/v1';
const json=(data,status=200)=>new Response(JSON.stringify(data,null,2),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
async function get(path){const r=await fetch(API+path,{headers:{'User-Agent':'DynastyCommandCenter/availability-v1'}});if(!r.ok)throw new Error(`Sleeper ${r.status} on ${path}`);return r.json();}
export default {async fetch(request){try{
 const url=new URL(request.url),parts=url.pathname.split('/').filter(Boolean),i=parts.indexOf('league'),leagueId=i>=0?parts[i+1]:null;
 if(!leagueId)return json({status:'error',message:'Expected /api/league/:leagueId/availability'},400);
 const [league,rosters,players]=await Promise.all([get(`/league/${leagueId}`),get(`/league/${leagueId}/rosters`),get('/players/nfl')]);
 const format=deriveSleeperLineupSettings(league.roster_positions||[]);
 if(format.status!=='ready')return json({status:'withheld',publicationEligible:false,reason:'unsupported-lineup-slots',format},422);
 const lineupCapacity=buildLineupCapacity(format.settings);
 const teams=(rosters||[]).map(r=>{const starters=new Set((r.starters||[]).map(String));return{rosterId:r.roster_id,starters:(r.players||[]).filter(id=>starters.has(String(id))).map(playerId=>({playerId})),bench:(r.players||[]).filter(id=>!starters.has(String(id))).map(playerId=>({playerId}))};});
 const availability=buildLeagueAvailability({sleeperPlayers:players,teams,lineupCapacity});
 return json({leagueId,leagueName:league.name||null,format,lineupCapacity,availability,generatedAt:new Date().toISOString()},availability.publicationEligible?200:422);
}catch(e){return json({status:'error',publicationEligible:false,message:e instanceof Error?e.message:String(e)},500);}}};
