import {seedTeams,recordOutlook,forecastRace} from './playoff-outlook.js';
const pts=(s,key)=>Number(s[key]||0)+Number(s[key+'_decimal']||0)/100;
const credit=t=>t.wins+t.ties/2;
const compare=(a,b)=>credit(b)-credit(a)||b.pointsFor-a.pointsFor||b.pointsAgainst-a.pointsAgainst||a.rosterId-b.rosterId;
export function buildPlayoffRace(league,rosters,users,state,schedules,history={}){
 const people=new Map(users.map(u=>[u.user_id,u])),slots=Number(league.settings?.playoff_teams||0),start=Number(league.settings?.playoff_week_start||15),current=String(state.season)===String(league.season)?Math.min(start,Math.max(1,Number(state.week)||1)):start;
 const teams=rosters.map(r=>{const s=r.settings||{},u=people.get(r.owner_id);return {rosterId:r.roster_id,team:u?.metadata?.team_name||u?.display_name||`Roster ${r.roster_id}`,manager:u?.display_name||'Unassigned',avatar:u?.metadata?.avatar||(u?.avatar?`https://sleepercdn.com/avatars/${u.avatar}`:null),division:s.division||null,divisionName:league.metadata?.[`division_${s.division}`]||`Division ${s.division}`,wins:s.wins||0,losses:s.losses||0,ties:s.ties||0,pointsFor:pts(s,'fpts'),pointsAgainst:pts(s,'fpts_against')};}).sort(compare);
 const leaders=Number(league.settings?.divisions)>0?[...new Set(teams.map(t=>t.division).filter(Boolean))].map(d=>teams.find(t=>t.division===d)):[];
 const ordered=seedTeams(teams,leaders.length>0),byId=new Map(teams.map(t=>[t.rosterId,t]));
 ordered.forEach((t,i)=>t.seed=i+1);
 const summary=t=>t?{rosterId:t.rosterId,team:t.team,manager:t.manager,avatar:t.avatar,wins:t.wins,losses:t.losses,ties:t.ties,seed:t.seed,divisionLeader:leaders.includes(t)}:null;
 ordered.forEach((t,i)=>{t.seed=i+1;t.divisionLeader=leaders.includes(t);t.inField=i<slots;t.bye=slots===6&&i<2;t.remaining=[];for(let week=current;week<start;week++){const rows=schedules[week];const row=rows?.find(r=>r.roster_id===t.rosterId),opponent=row?.matchup_id!=null?rows.find(r=>r.matchup_id===row.matchup_id&&r.roster_id!==t.rosterId):null;t.remaining.push({week,opponent:opponent?summary(byId.get(opponent.roster_id)):null});}});
 const supported=!Number(league.settings?.league_average_match)&&slots>0&&(!Number(league.settings?.divisions)||leaders.length===Number(league.settings.divisions));
 const forecast=forecastRace(ordered,history,schedules,{week:current,start,slots,divisions:leaders.length>0,enabled:supported});
 ordered.forEach(t=>{t.outlook=supported?recordOutlook(ordered,t,slots,leaders.length>0):{status:"alive",winsToGuarantee:null};t.forecast=forecast.available?forecast.teams.find(f=>f.rosterId===t.rosterId):null;const cut=ordered[slots-1];t.gamesBack=cut?Math.max(0,credit(cut)-credit(t)):null;});
 const cutoff=ordered[slots-1],outside=ordered[slots];const stories=[];
 if(leaders.length)stories.push({title:'The division lead matters',text:leaders.map(t=>`${t.manager} leads ${t.divisionName} at ${t.wins}–${t.losses}${t.ties?'–'+t.ties:''}`).join('. ')+'.'});
 if(cutoff&&outside){const gap=Math.max(0,credit(cutoff)-credit(outside));stories.push({title:gap===0?'The cutoff comes down to points':`${outside.manager} is ${gap} ${gap===1?'win':'wins'} off the cutoff`,text:`${cutoff.manager} holds the last spot. ${outside.manager} is first outside the field.${gap===0?` ${cutoff.pointsFor.toFixed(2)} vs ${outside.pointsFor.toFixed(2)} points scored.`:''}`});}
 const games=(schedules[current]||[]).filter((r,i,rows)=>r.matchup_id!=null&&rows.findIndex(x=>x.matchup_id===r.matchup_id)===i).map(r=>{const opponent=schedules[current].find(x=>x.matchup_id===r.matchup_id&&x.roster_id!==r.roster_id);return {week:current,a:summary(byId.get(r.roster_id)),b:summary(byId.get(opponent?.roster_id))};}).filter(g=>g.a&&g.b).sort((x,y)=>{const relevance=g=>[g.a,g.b].reduce((n,t)=>n+(Math.abs(t.seed-slots)<=1?3:0)+(t.divisionLeader?1:0),0);return relevance(y)-relevance(x);}).slice(0,2);
 return {season:league.season,week:current,playoffStart:start,slots,regularSeasonOver:current>=start,teams:ordered,stories,keyGames:games,forecast:{...forecast,teams:undefined},divisionLeaders:leaders.map(t=>t.rosterId)};
}
export async function fetchPlayoffRace(id,get){
 const [league,rosters,users,state]=await Promise.all([get(`/league/${id}`,60000),get(`/league/${id}/rosters`,60000),get(`/league/${id}/users`,60000),get('/state/nfl',60000)]);
 const start=Number(league.settings?.playoff_week_start||15),week=String(state.season)===String(league.season)?Math.min(start,Math.max(1,Number(state.week)||1)):start;
 const weeks=Object.fromEntries(await Promise.all(Array.from({length:start-1},(_,i)=>i+1).map(async w=>{try{return [w,await get(`/league/${id}/matchups/${w}`,60000)];}catch{return [w,null];}})));
 return buildPlayoffRace(league,rosters,users,state,weeks,weeks);
}
