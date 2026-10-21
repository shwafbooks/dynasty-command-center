import {estimateWinChance} from './win-chance.js';
const same=(a,b)=>String(a)===String(b);
const alias=t=>({WSH:'WAS',JAC:'JAX',LA:'LAR'}[t]||t);
export function buildHomeDashboard({teams=[],rosterId,power,production,evidence,race,matchup}={}){
 const team=teams.find(t=>same(t.rosterId,rosterId));if(!team)return null;
 const powerRow=power?.status==='ready'?power.teams.find(t=>same(t.rosterId,rosterId)):null;
 const outlook=evidence?.rosterOutlook?.status==='ready'?evidence.rosterOutlook.teams.find(t=>same(t.rosterId,rosterId)):null;
 const need=outlook?.needs?.find(n=>n.rank>Math.ceil(n.of/2))||null;
 const raceRow=race?.teams?.find(t=>same(t.rosterId,rosterId))||null;
 const divisionLeader=race?.teams?.find(t=>t.division===raceRow?.division&&t.divisionLeader&&!same(t.rosterId,rosterId));
 const future=(raceRow?.remaining||[]).filter(g=>g.week>race.week&&g.opponent);
 const divisionGame=divisionLeader?future.find(g=>same(g.opponent.rosterId,divisionLeader.rosterId)):null;
 const raceGame=divisionGame?{...divisionGame,label:'DIVISION RIVAL'}:future.find(g=>g.opponent.seed<=3)?{...future.find(g=>g.opponent.seed<=3),label:'UPCOMING TEST'}:future[0]?{...future[0],label:'NEXT UP'}:null;
 let game=null;
 if(matchup?.currentWeek!=null&&matchup.week===matchup.currentWeek&&matchup.currentSeason===matchup.season&&Array.isArray(matchup.rows)){
  const ownRows=matchup.rows.filter(r=>same(r.roster_id,rosterId)),own=ownRows[0];
  if(ownRows.length===1&&own.matchup_id!=null){
   const otherRows=matchup.rows.filter(r=>r.matchup_id===own.matchup_id&&!same(r.roster_id,rosterId)),other=otherRows[0],opponent=teams.find(t=>same(t.rosterId,other?.roster_id));
   if(otherRows.length===1&&opponent){
    const players=new Map(teams.flatMap(t=>[...(t.starters||[]),...(t.bench||[]),...(t.ir||[])]).map(p=>[String(p.id),p]));
    const context=matchup.context||{},odds=estimateWinChance(own,other,players,context),states=[own,other].flatMap(r=>(r.starters||[]).map(id=>context.games?.[alias(players.get(String(id))?.nflTeam)]?.state));
    const phase=odds?.final?'final':states.includes('playing')?'playing':states.some(s=>s==='upcoming')?'upcoming':'unknown';
    const actual=phase==='playing'||phase==='final'||(own.starters_points||[]).some(p=>Number.isFinite(p)&&p!==0);
    const starters=(own.starters||[]).map((id,i)=>{const player=players.get(String(id));if(!player)return null;return {...player,value:actual?own.starters_points?.[i]:context.projections?.[String(id)]};}).filter(Boolean);
    const featured=starters.filter(p=>Number.isFinite(p.value)).sort((a,b)=>b.value-a.value).slice(0,3);
    game={week:matchup.week,season:matchup.season,own,other,opponent,odds,phase,featured:featured.length?featured:starters.slice(0,3),featuredMode:featured.length?(actual?'points':'projected'):'watch',updatedAt:matchup.updatedAt};
   }
  }else if(ownRows.length===1)game={week:matchup.week,bye:true};
 }
 const movers=power?.status==='ready'?[...power.teams].filter(r=>r.movement!==null&&r.movement!==0).sort((a,b)=>Math.abs(b.movement)-Math.abs(a.movement)||b.movement-a.movement).slice(0,3):[];
 const topScorers=production?.teams?.find(t=>same(t.rosterId,rosterId))?.topScorers||[];
 return {team,power:powerRow,race:raceRow,raceComplete:Boolean(race?.regularSeasonOver),raceGame,game,need,outlook,movers,topScorers};
}
