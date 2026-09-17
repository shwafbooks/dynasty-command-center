import {buildLineupCapacity} from '../../../../lib/lineup-capacity.js';
import {deriveSleeperLineupSettings} from '../../../../lib/sleeper-league-format.js';
import {buildLeagueAvailability} from '../../../../lib/league-availability.js';
const API='https://api.sleeper.app/v1';
async function get(path){const r=await fetch(API+path,{headers:{'User-Agent':'DynastyCommandCenter/availability-v1'}});if(!r.ok)throw new Error(`Sleeper ${r.status} on ${path}`);return r.json();}
export default async function handler(req,res){
 try{const leagueId=String(req.query?.leagueId||'');if(!leagueId)return res.status(400).json({error:'leagueId required'});
  const [league,rosters,players]=await Promise.all([get(`/league/${leagueId}`),get(`/league/${leagueId}/rosters`),get('/players/nfl')]);
  const format=deriveSleeperLineupSettings(league.roster_positions||[]);
  if(format.status!=='ready')return res.status(422).json({status:'withheld',publicationEligible:false,reason:'unsupported-lineup-slots',format});
  const lineupCapacity=buildLineupCapacity(format.settings);
  const teams=(rosters||[]).map(r=>{const starters=new Set((r.starters||[]).map(String));return{rosterId:r.roster_id,starters:(r.players||[]).filter(id=>starters.has(String(id))).map(playerId=>({playerId})),bench:(r.players||[]).filter(id=>!starters.has(String(id))).map(playerId=>({playerId}))};});
  const availability=buildLeagueAvailability({sleeperPlayers:players,teams,lineupCapacity});
  return res.status(availability.publicationEligible?200:422).json({leagueId,leagueName:league.name||null,format,lineupCapacity,availability,generatedAt:new Date().toISOString()});
 }catch(e){return res.status(502).json({error:e.message});}
}
