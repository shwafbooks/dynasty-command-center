import fs from 'node:fs/promises';
import { buildMarketSnapshot, auditMarketCoverage } from '../lib/market-snapshot.js';
const leagueId=process.argv[2]||'1389344338340761600',snapshotPath=process.argv[3];
if(!snapshotPath){console.error('Usage: node scripts/audit-market-snapshot.js <leagueId> <snapshot.json>');process.exit(2);}
const API='https://api.sleeper.app/v1';
async function get(path){const r=await fetch(`${API}${path}`);if(!r.ok)throw new Error(`Sleeper ${r.status} ${path}`);return r.json();}
const[rosters,users,players,raw]=await Promise.all([get(`/league/${leagueId}/rosters`),get(`/league/${leagueId}/users`),get('/players/nfl'),fs.readFile(snapshotPath,'utf8').then(JSON.parse)]);
const usersById=Object.fromEntries(users.map(u=>[u.user_id,u]));
const teams=rosters.map(r=>{const owner=usersById[r.owner_id]||{},starters=new Set((r.starters||[]).map(String)),all=(r.players||[]).map(id=>{const p=players[String(id)]||{};return{id:String(id),name:p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' ')||String(id),position:p.fantasy_positions?.[0]||p.position||'',nflTeam:p.team||null};});return{rosterId:r.roster_id,team:owner.metadata?.team_name||owner.display_name||owner.username||`Roster ${r.roster_id}`,manager:owner.display_name||owner.username||'Unknown manager',starters:all.filter(p=>starters.has(p.id)),bench:all.filter(p=>!starters.has(p.id))};});
const snapshot=buildMarketSnapshot({source:raw.source||'KeepTradeCut',sourceUrl:raw.sourceUrl||null,asOf:raw.asOf,format:raw.format,rows:raw.players||raw.rows||[]}),audit=auditMarketCoverage({teams,snapshot});
console.log(JSON.stringify({leagueId,snapshot:{source:snapshot.source,asOf:snapshot.asOf,format:snapshot.format,rowCount:snapshot.players.length},status:audit.status,coverage:audit.coverage,publicationGate:audit.publicationGate,unmatched:audit.unmatched,ambiguous:audit.ambiguous},null,2));
if(!audit.publicationGate.passes)process.exitCode=1;
