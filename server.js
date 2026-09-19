import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, 'public');
const PORT = process.env.PORT || 3000;
const DEFAULT_LEAGUE_ID = process.env.LEAGUE_ID || '1389344338340761600';
const API = process.env.SLEEPER_API_BASE || 'https://api.sleeper.app/v1';
const cache = new Map();
const DAY = 24 * 60 * 60 * 1000;
const LEAGUE_MAP = {
  shwaf:'Drake Maye', BillClintonArkansas:'Sonny Weaver Jr', stuffy229:'RBuniversity', Simasko:'Simasko',
  '1riggy1':'1.01', jackig:"I'm gonna milk you", karasouel:'Comback SZN', Moosinator:'Giardiniera',
  James1836:'James1836', TUTO:'The Rejects'
};
const FINANCE_HISTORY = {
  buyIn:25, payouts:{1:150,2:75,3:25},
  seasons:{2024:['shwaf','stuffy229','jackig'],2025:['stuffy229','shwaf','BillClintonArkansas']}
};
function financeSummary(){
  const owners=Object.keys(LEAGUE_MAP).map(username=>{
    let buy=0, winnings=0, titles=0;
    for(const year of Object.keys(FINANCE_HISTORY.seasons)){ buy+=25; const top=FINANCE_HISTORY.seasons[year]; const i=top.indexOf(username); if(i>=0){winnings+=FINANCE_HISTORY.payouts[i+1]; if(i===0)titles++;} }
    return {username,team:LEAGUE_MAP[username],buyIns:buy,winnings,profit:winnings-buy,titles};
  }).sort((a,b)=>b.profit-a.profit||b.winnings-a.winnings);
  return {buyIn:25,payouts:FINANCE_HISTORY.payouts,owners,seasons:FINANCE_HISTORY.seasons};
}
function engagementSnapshot(analyses=[]){
  const rows=analyses.slice().sort((a,b)=>b.projectedPoints-a.projectedPoints);
  const top=rows[0], watch=rows[Math.min(2,rows.length-1)], concern=rows[rows.length-1];
  const ownerName=x=>LEAGUE_MAP[x?.owner?.username]||x?.owner?.username||'Unknown';
  const awards=[];
  if(top) awards.push({icon:'🏆',title:'Front Office Favorite',owner:ownerName(top),text:'Highest current baseline lineup projection.'});
  if(watch) awards.push({icon:'📈',title:'Team to Watch',owner:ownerName(watch),text:'A roster sitting in the upper tier of the current model.'});
  if(concern) awards.push({icon:'🚨',title:'Roster Alert',owner:ownerName(concern),text:'Largest immediate gap to the current projection leader.'});
  const money=financeSummary(), leader=money.owners[0];
  return {awards, moneyLeader:leader?{team:leader.team,profit:leader.profit,winnings:leader.winnings}:null, storylines:[
    top?`${ownerName(top)} currently leads the projection board.`:'Live projections are waiting for a Sleeper sync.',
    'Roster-specific value remains the trade engine\'s core idea: a player can be worth more to one manager than another.',
    'The Commissioner is watching for mutually beneficial trades, lineup inefficiency and positional shortages.'
  ], finance:money};
}

async function sleeper(p, ttl = 60_000) {
  const key = `${API}${p}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttl) return hit.data;
  const r = await fetch(key, { headers: { 'User-Agent': 'DynastyCommandCenter/0.3' } });
  if (!r.ok) throw new Error(`Sleeper ${r.status} on ${p}`);
  const data = await r.json();
  cache.set(key, { at: Date.now(), data });
  return data;
}


function buildStorySnapshot(bundle, players, transactions){
  const names=Object.fromEntries(bundle.users.map(u=>[u.user_id,u.username||u.display_name||'Unknown']));
  const ownerForRoster=rid=>names[bundle.rosters.find(r=>String(r.roster_id)===String(rid))?.owner_id]||`Roster ${rid}`;
  const tx=(transactions||[]).filter(x=>x.status!=='failed').sort((a,b)=>(b.created||0)-(a.created||0));
  const major=tx.filter(x=>['major','blockbuster'].includes(x.impact));
  const trades=tx.filter(x=>x.type==='trade');
  const story=[];
  if(major.length){
    const m=major[0];
    story.push({type:'breaking',icon:'🚨',title:'The league has moved',text:`${m.headline} involving ${m.rosters.map(x=>x.owner).join(' ↔ ')} carries a ${m.impactScore} impact index. This is the kind of move that can change the season narrative.`});
  }
  if(trades.length){
    const t=trades[0];
    story.push({type:'trade',icon:'🤝',title:'Trade desk is open',text:`The latest trade moved ${t.adds.map(x=>x.name).join(', ')||'assets'}${t.drops.length?` and involved ${t.drops.map(x=>x.name).join(', ')}`:''}. The Command Center is tracking the fallout.`});
  }
  const money=financeSummary();
  const leader=money.owners[0];
  if(leader) story.push({type:'money',icon:'💰',title:'Money race',text:`${leader.team} currently leads the all-time profit board at ${leader.profit>=0?'+':''}$${leader.profit}. The 2026 season can rewrite the leaderboard.`});
  story.push({type:'identity',icon:'📖',title:'A season is a story',text:'Every meaningful trade, waiver hit, upset, ranking swing and financial result can become part of the league record book.'});
  const chapters=[
    {key:'preseason',title:'Chapter 1 · The Setup',text:'Every contender starts with a plan. The preseason model establishes the baseline—and the league gets to prove it wrong.'},
    {key:'market',title:'Chapter 2 · The Market Opens',text:'The first trades and waiver moves reveal which managers are willing to act and which are waiting for the market to come to them.'},
    {key:'pressure',title:'Chapter 3 · Pressure Builds',text:'As wins, losses and injuries accumulate, roster needs become harder to ignore. This is where trade pressure usually peaks.'},
    {key:'playoffs',title:'Chapter 4 · The Race',text:'Power rankings matter less than surviving the playoff field. Every lineup decision carries consequence.'},
    {key:'legacy',title:'Chapter 5 · The Record',text:'The champion, the money, the trades and the surprises become permanent league history.'}
  ];
  const notable=tx.slice(0,12).map(x=>({id:x.id,type:x.type,impact:x.impact,impactScore:x.impactScore,week:x.week,created:x.created,headline:x.headline,owners:x.rosters.map(r=>r.owner),adds:x.adds.map(a=>a.name),drops:x.drops.map(d=>d.name)}));
  return {season:2026,story,chapters,notable,finance:money,transactionCount:tx.length,majorCount:major.length,tradeCount:trades.length,generatedAt:new Date().toISOString()};
}


function headlineForEvent(x){
  const owners=(x.rosters||[]).map(r=>r.owner).join(' ↔ ') || 'A manager';
  const names=[...(x.adds||[]),...(x.drops||[])].map(p=>p.name).filter(Boolean);
  if(x.type==='trade'){
    if(x.impact==='blockbuster') return `🚨 BLOCKBUSTER: ${owners} just changed the league`; 
    if(x.impact==='major') return `🔥 MAJOR MOVE: ${owners} are reshaping their rosters`;
    return `🤝 TRADE ALERT: ${owners} made a move`;
  }
  if(x.type==='waiver') return x.impact==='major'||x.impact==='blockbuster' ? `📈 WAIVER HEIST: ${owners} found a meaningful piece` : `📈 WAIVER WIRE: ${owners} made a move`;
  if(x.type==='free_agent') return `➕ FREE-AGENT WATCH: ${owners} took a shot`;
  return `🔄 ROSTER MOVE: ${owners} are making adjustments`;
}
function tradeRoomFromCandidates(candidates){
  return candidates.slice(0,12).map((x,i)=>({
    rank:i+1, partner:x.partner, partnerRosterId:x.partnerRosterId, incoming:x.incoming?.full_name||pname(x.incoming), outgoing:x.outgoing?.full_name||pname(x.outgoing),
    yourWeekly:Number(x.targetProjectionDelta||0), partnerWeekly:Number(x.partnerProjectionDelta||0), yourDynasty:Number(x.targetDynastyDelta||0), partnerDynasty:Number(x.partnerDynastyDelta||0),
    fairness:Number(x.fairness||0), fit:Number(Math.min(99,Math.max(1,(x.score||0)/5)).toFixed(0)), reasons:x.reasons||[], headline:x.partnerWeekly>0&&x.targetWeekly>0?'Both sides can improve their lineup.':'Potential fit—review the roster context before proposing.'
  }));
}
function headlineBoard(events){
  const sorted=events.slice().sort((a,b)=>b.impactScore-a.impactScore || b.created-a.created);
  return sorted.slice(0,12).map((x,i)=>({
    id:x.id, rank:i+1, headline:headlineForEvent(x), subhead:x.story, impact:x.impact, impactScore:x.impactScore, type:x.type, week:x.week||null, created:x.created||0,
    owners:x.rosters||[], adds:x.adds||[], drops:x.drops||[], commissioner:x.impact==='blockbuster'?'THIS ONE MATTERS. The league conversation just changed.':x.impact==='major'?'Pay attention. This move has real competitive weight.':'The tape is telling us how this manager is thinking.'
  }));
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function scorePlayer(p) {
  const rank = Number(p?.search_rank);
  const rankScore = Number.isFinite(rank) && rank > 0 ? Math.max(0, 100 - Math.min(rank, 1000) / 10) : 25;
  const age = Number(p?.age);
  const ageAdj = Number.isFinite(age) ? Math.max(-8, Math.min(8, (28 - age) * 0.7)) : 0;
  const statusAdj = p?.status === 'Active' ? 4 : p?.status === 'Inactive' ? -8 : 0;
  const injuryAdj = p?.injury_status ? -3 : 0;
  return Math.max(1, Math.min(100, rankScore + ageAdj + statusAdj + injuryAdj));
}
function eligibility(p) { return new Set(p?.fantasy_positions || (p?.position ? [p.position] : [])); }
const HANDCUFF_PAIRS = {
  'Jahmyr Gibbs': ['Isiah Pacheco'],
  'Bijan Robinson': ['Brian Robinson Jr.'],
  'James Cook III': ['Ray Davis'],
  'Derrick Henry': ['Justice Hill'],
  "D'Andre Swift": ['Kyle Monangai'],
  'Chase Brown': ['Samaje Perine'],
  'Quinshon Judkins': ['Dylan Sampson'],
  'Javonte Williams': ['Jaydon Blue'],
  'J.K. Dobbins': ['RJ Harvey'],
};
function pname(p){return p?.full_name || [p?.first_name,p?.last_name].filter(Boolean).join(' ')}
function normalizeName(n){return String(n||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function handcuffRelation(starter, candidate){
  const a=pname(starter), b=pname(candidate);
  const direct=(HANDCUFF_PAIRS[a]||[]).some(x=>normalizeName(x)===normalizeName(b));
  const reverse=Object.entries(HANDCUFF_PAIRS).some(([k,vs])=>normalizeName(k)===normalizeName(b) && vs.some(x=>normalizeName(x)===normalizeName(a)));
  return direct || reverse;
}
function optimizeRoster(roster, playersById, rosterPositions) {
  const pool = (roster.players || []).map(id => playersById[id]).filter(Boolean).filter(p => !['DEF','K','DST'].includes(p.position));
  const scored = pool.map(p => ({p, value:scorePlayer(p), pos:eligibility(p)})).sort((a,b)=>b.value-a.value);
  const used = new Set(), starters=[];
  const take=(slot, allowed, count)=>{ for(let i=0;i<count;i++){ const x=scored.find(x=>!used.has(x.p.player_id)&&[...allowed].some(pos=>x.pos.has(pos))); if(!x) break; used.add(x.p.player_id); starters.push({slot,player:x.p,value:x.value}); } };
  take('QB', new Set(['QB']), 1); take('RB',new Set(['RB']),2); take('WR',new Set(['WR']),2); take('TE',new Set(['TE']),1); take('FLEX',new Set(['RB','WR','TE']),2); take('SUPERFLEX',new Set(['QB','RB','WR','TE']),1);
  const starterScore=starters.reduce((s,x)=>s+x.value,0), depthScore=scored.filter(x=>!used.has(x.p.player_id)).slice(0,12).reduce((s,x)=>s+x.value,0);
  return {starters,benchTop:scored.filter(x=>!used.has(x.p.player_id)).slice(0,12),allPlayers:pool,starterScore,depthScore,rosterSize:pool.length,qbCount:pool.filter(p=>eligibility(p).has('QB')).length,rbCount:pool.filter(p=>eligibility(p).has('RB')).length,wrCount:pool.filter(p=>eligibility(p).has('WR')).length,teCount:pool.filter(p=>eligibility(p).has('TE')).length,configuredPositions:rosterPositions};
}


function projectedPoints(p) {
  const pos = (p?.fantasy_positions?.[0] || p?.position || '').toUpperCase();
  const rank = Number(p?.search_rank);
  const r = Number.isFinite(rank) && rank > 0 ? Math.min(rank, 500) : 250;
  const age = Number(p?.age);
  const ageFactor = Number.isFinite(age) ? Math.max(0.78, Math.min(1.08, 1 + (27-age)*0.012)) : 1;
  const rankFactor = Math.max(0.35, 1 - (r-1)/360);
  const base = {QB:285,RB:205,WR:205,TE:170}[pos] || 120;
  const volatility = {QB:0.95,RB:1.0,WR:1.0,TE:0.94}[pos] || 1;
  return Math.max(25, Math.round(base * (0.62 + 0.38*rankFactor) * ageFactor * volatility));
}
function optimizeProjected(roster, playersById) {
  const pool=(roster.players||[]).map(id=>playersById[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
  const scored=pool.map(p=>({p,proj:projectedPoints(p),pos:eligibility(p)})).sort((a,b)=>b.proj-a.proj);
  const used=new Set(), starters=[];
  const take=(slot,allowed,count)=>{for(let i=0;i<count;i++){const x=scored.find(x=>!used.has(x.p.player_id)&&[...allowed].some(pos=>x.pos.has(pos)));if(!x)break;used.add(x.p.player_id);starters.push({slot,player:x.p,projection:x.proj});}};
  take('QB',new Set(['QB']),1);take('RB',new Set(['RB']),2);take('WR',new Set(['WR']),2);take('TE',new Set(['TE']),1);take('FLEX',new Set(['RB','WR','TE']),2);take('SUPERFLEX',new Set(['QB','RB','WR','TE']),1);
  return {starters,projectedPoints:starters.reduce((s,x)=>s+x.projection,0),benchProjected:scored.filter(x=>!used.has(x.p.player_id)).slice(0,12).reduce((s,x)=>s+x.proj,0)};
}

function dynastyValue(p){
  const rank=Number(p?.search_rank), age=Number(p?.age), pos=(p?.fantasy_positions?.[0]||p?.position||'').toUpperCase();
  const market=Number.isFinite(rank)&&rank>0?Math.max(5,100-(Math.min(rank,500)-1)*0.18):18;
  const ageBonus=Number.isFinite(age)?Math.max(-18,Math.min(14,(27-age)*1.35)):0;
  const scarcity=pos==='QB'?12:pos==='TE'?5:pos==='RB'?2:0;
  const elite=Number.isFinite(rank)&&rank<=50?8:0;
  return Math.max(1,Math.min(100,market+ageBonus+scarcity+elite));
}
function contextBoost(player, rosterPlayers, opponentPlayers){
  let boost=0, reasons=[];
  const sameTeam=rosterPlayers.filter(x=>x.team && player.team && x.team===player.team && eligibility(x).has((player.fantasy_positions?.[0]||player.position)));
  if(player.position==='RB' || eligibility(player).has('RB')){
    for(const starter of sameTeam){
      if(handcuffRelation(starter,player)) { boost += 7; reasons.push(`handcuff to ${pname(starter)}`); }
    }
  }
  // If the acquiring roster already has a strong starter at the same position, reduce marginal value.
  const pos=(player.fantasy_positions?.[0]||player.position||'').toUpperCase();
  const samePos=rosterPlayers.filter(x=>(x.fantasy_positions?.[0]||x.position||'').toUpperCase()===pos).sort((a,b)=>dynastyValue(b)-dynastyValue(a));
  if(samePos.length>=4){ boost-=3; reasons.push('positionally crowded'); }
  if(samePos.length<=1){ boost+=3; reasons.push('thin positional room'); }
  // Opponent concentration: a player is slightly more valuable to an owner who can use the player as a direct hedge against an asset already on their roster.
  if(player.team && rosterPlayers.some(x=>x.team===player.team && x.player_id!==player.player_id)){
    boost+=1; reasons.push('same-offense correlation');
  }
  return {boost,reasons};
}
function rosterProjection(rosterPlayers){
  const fake={players:rosterPlayers.map(x=>x.player_id)};
  return optimizeProjected(fake,Object.fromEntries(rosterPlayers.map(p=>[p.player_id,p])));
}
function tradeAnalysis(giverPlayers, receiverPlayers, giveId, getId){
  const give=giverPlayers.find(p=>p.player_id===giveId), get=receiverPlayers.find(p=>p.player_id===getId);
  if(!give||!get) throw new Error('Player not found on selected roster');
  const giveBase=dynastyValue(give), getBase=dynastyValue(get);
  const giveCtx=contextBoost(give,giverPlayers,receiverPlayers), getCtx=contextBoost(get,giverPlayers,receiverPlayers);
  const giverBefore=rosterProjection(giverPlayers), receiverBefore=rosterProjection(receiverPlayers);
  const giverAfterPlayers=giverPlayers.filter(p=>p.player_id!==giveId).concat(get);
  const receiverAfterPlayers=receiverPlayers.filter(p=>p.player_id!==getId).concat(give);
  const giverAfter=rosterProjection(giverAfterPlayers), receiverAfter=rosterProjection(receiverAfterPlayers);
  const giverValueDelta=(getBase+getCtx.boost)-giveBase;
  const receiverValueDelta=(giveBase+giveCtx.boost)-getBase;
  const giverProjDelta=giverAfter.projectedPoints-giverBefore.projectedPoints;
  const receiverProjDelta=receiverAfter.projectedPoints-receiverBefore.projectedPoints;
  const giverLineupChange=giverProjDelta, receiverLineupChange=receiverProjDelta;
  const giverVerdict=giverLineupChange>2 && giverValueDelta>0 ? 'ACCEPT' : giverLineupChange<-2 && giverValueDelta<0 ? 'DECLINE' : 'CONSIDER';
  const receiverVerdict=receiverLineupChange>2 && receiverValueDelta>0 ? 'ACCEPT' : receiverLineupChange<-2 && receiverValueDelta<0 ? 'DECLINE' : 'CONSIDER';
  return {give:{id:giveId,name:pname(give),baseValue:giveBase,contextBoost:giveCtx.boost,reasons:giveCtx.reasons},get:{id:getId,name:pname(get),baseValue:getBase,contextBoost:getCtx.boost,reasons:getCtx.reasons},giver:{dynastyDelta:Number(giverValueDelta.toFixed(1)),projectionBefore:giverBefore.projectedPoints,projectionAfter:giverAfter.projectedPoints,projectionDelta:giverProjDelta,verdict:giverVerdict},receiver:{dynastyDelta:Number(receiverValueDelta.toFixed(1)),projectionBefore:receiverBefore.projectedPoints,projectionAfter:receiverAfter.projectedPoints,projectionDelta:receiverProjDelta,verdict:receiverVerdict},handcuffDetected:getCtx.reasons.filter(x=>x.startsWith('handcuff')).concat(giveCtx.reasons.filter(x=>x.startsWith('handcuff')))};
}


function tradeFinder(leagueRosters, users, playersById, targetRosterId) {
  const byUser=Object.fromEntries(users.map(u=>[u.user_id,u]));
  const target=leagueRosters.find(r=>String(r.roster_id)===String(targetRosterId));
  if(!target) throw new Error('Target roster not found');
  const targetPlayers=(target.players||[]).map(id=>playersById[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
  const targetBefore=rosterProjection(targetPlayers);
  const candidates=[];
  for(const other of leagueRosters){
    if(String(other.roster_id)===String(targetRosterId)) continue;
    const otherPlayers=(other.players||[]).map(id=>playersById[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
    const otherBefore=rosterProjection(otherPlayers);
    const otherName=byUser[other.owner_id]?.username||byUser[other.owner_id]?.display_name||'Unknown';
    const candidatePool=otherPlayers.slice().sort((a,b)=>dynastyValue(b)-dynastyValue(a)).slice(0,22);
    const outgoingPool=targetPlayers.slice().sort((a,b)=>dynastyValue(a)-dynastyValue(b)).slice(0,22);
    for(const incoming of candidatePool){
      const incomingCtx=contextBoost(incoming,targetPlayers,otherPlayers);
      const targetAfter=rosterProjection(targetPlayers.filter(p=>p.player_id!==targetPlayers[0]?.player_id).concat(incoming));
      // Find the best plausible outgoing asset for the target roster.
      let best=null;
      for(const outgoing of outgoingPool){
        if(outgoing.player_id===incoming.player_id) continue;
        const tAfter=rosterProjection(targetPlayers.filter(p=>p.player_id!==outgoing.player_id).concat(incoming));
        const oAfter=rosterProjection(otherPlayers.filter(p=>p.player_id!==incoming.player_id).concat(outgoing));
        const tProj=tAfter.projectedPoints-targetBefore.projectedPoints;
        const oProj=oAfter.projectedPoints-otherBefore.projectedPoints;
        const tDyn=(dynastyValue(incoming)+incomingCtx.boost)-dynastyValue(outgoing);
        const oCtx=contextBoost(outgoing,otherPlayers,targetPlayers);
        const oDyn=(dynastyValue(outgoing)+oCtx.boost)-dynastyValue(incoming);
        const fairness=100-Math.min(100,Math.abs((tDyn-oDyn)*2.2));
        const score=tProj*4 + oProj*2 + fairness*0.15 + incomingCtx.boost*1.5;
        if(!best || score>best.score) best={score,outgoing,tProj,oProj,tDyn,oDyn,fairness,oCtx};
      }
      if(best){
        candidates.push({targetRosterId,partnerRosterId:other.roster_id,partner:otherName,incoming, outgoing:best.outgoing, targetProjectionDelta:Number(best.tProj.toFixed(1)), partnerProjectionDelta:Number(best.oProj.toFixed(1)), targetDynastyDelta:Number(best.tDyn.toFixed(1)), partnerDynastyDelta:Number(best.oDyn.toFixed(1)), fairness:Number(best.fairness.toFixed(0)), contextBoost:Number(incomingCtx.boost.toFixed(1)), reasons:incomingCtx.reasons, score:best.score});
      }
    }
  }
  return candidates.sort((a,b)=>b.score-a.score).slice(0,30);
}



function inferHandcuff(starter, candidate){
  if(!starter||!candidate) return false;
  const spos=(starter.fantasy_positions?.[0]||starter.position||'').toUpperCase();
  const cpos=(candidate.fantasy_positions?.[0]||candidate.position||'').toUpperCase();
  if(spos!=='RB'||cpos!=='RB'||!starter.team||starter.team!==candidate.team) return false;
  const sd=Number(starter.depth_chart_position), cd=Number(candidate.depth_chart_position);
  return Number.isFinite(sd)&&Number.isFinite(cd)&&sd===1&&cd===2;
}
function contextBoostV2(player, rosterPlayers){
  let boost=0; const reasons=[];
  const pos=(player.fantasy_positions?.[0]||player.position||'').toUpperCase();
  if(pos==='RB'){
    for(const p of rosterPlayers){
      if(handcuffRelation(p,player)||inferHandcuff(p,player)){
        boost+=7; reasons.push(`backfield protection for ${pname(p)}`);
      }
    }
  }
  const pc=positionalContext(player,rosterPlayers);
  boost+=pc.boost; reasons.push(...pc.reasons);
  const rosterProj=rosterProjection(rosterPlayers).projectedPoints;
  const after=rosterProjection(rosterPlayers.concat(player)).projectedPoints;
  const marginal=after-rosterProj;
  if(marginal>=12){boost+=5;reasons.push('immediate starter/FLEX impact');}
  else if(marginal>=5){boost+=2;reasons.push('meaningful lineup improvement');}
  else if(marginal<=0){boost-=2;reasons.push('little immediate lineup impact');}
  return {boost:Number(boost.toFixed(1)),reasons:[...new Set(reasons)],marginalProjection:Number(marginal.toFixed(1))};
}
function playerIntelligence(player, rosters, users, playersById){
  const nameById=Object.fromEntries(users.map(u=>[u.user_id,u.username||u.display_name||'Unknown']));
  const allRosters=rosters.map(r=>({r,players:(r.players||[]).map(id=>playersById[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position))}));
  const owner=allRosters.find(x=>x.players.some(p=>p.player_id===player.player_id));
  const contexts=allRosters.map(({r,players})=>{
    const owns=players.some(p=>p.player_id===player.player_id);
    if(owns) return {rosterId:r.roster_id,owner:nameById[r.owner_id]||'Unknown',owns:true,marketValue:Number(dynastyValue(player).toFixed(1)),contextValue:Number(dynastyValue(player).toFixed(1)),premium:0,marginalProjection:0,reasons:['already rostered']};
    const c=contextBoostV2(player,players);
    return {rosterId:r.roster_id,owner:nameById[r.owner_id]||'Unknown',owns:false,marketValue:Number(dynastyValue(player).toFixed(1)),contextValue:Number(Math.max(1,dynastyValue(player)+c.boost).toFixed(1)),premium:c.boost,marginalProjection:c.marginalProjection,reasons:c.reasons};
  }).sort((a,b)=>b.contextValue-a.contextValue);
  return {player:{id:player.player_id,name:pname(player),position:(player.fantasy_positions?.[0]||player.position||'').toUpperCase(),team:player.team||'FA',age:player.age??null,status:player.status||null,injuryStatus:player.injury_status||null,depthChartPosition:player.depth_chart_position??null,marketValue:Number(dynastyValue(player).toFixed(1)),baselineProjection:projectedPoints(player)},contexts,topTargets:contexts.filter(x=>!x.owns).slice(0,5),owner:owner?nameById[owner.r.owner_id]||'Unknown':null};
}
function smartTargets(rosters,users,playersById,targetRosterId){
  const target=rosters.find(r=>String(r.roster_id)===String(targetRosterId)); if(!target) throw new Error('Target roster not found');
  const names=Object.fromEntries(users.map(u=>[u.user_id,u.username||u.display_name||'Unknown']));
  const tp=(target.players||[]).map(id=>playersById[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
  const before=rosterProjection(tp);
  const targetNeeds=lineupNeeds(tp);
  const results=[];
  for(const other of rosters){
    if(String(other.roster_id)===String(targetRosterId)) continue;
    const op=(other.players||[]).map(id=>playersById[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
    const otherBefore=rosterProjection(op);
    const incomingPool=op.slice().sort((a,b)=>dynastyValue(b)-dynastyValue(a)).slice(0,30);
    const outgoingPool=tp.slice().sort((a,b)=>dynastyValue(a)-dynastyValue(b)).slice(0,20);
    for(const inc of incomingPool){
      const ctx=contextBoostV2(inc,tp);
      for(const out of outgoingPool){
        if(out.player_id===inc.player_id) continue;
        const after=rosterProjection(tp.filter(p=>p.player_id!==out.player_id).concat(inc));
        const otherAfter=rosterProjection(op.filter(p=>p.player_id!==inc.player_id).concat(out));
        const myProj=after.projectedPoints-before.projectedPoints;
        const theirProj=otherAfter.projectedPoints-otherBefore.projectedPoints;
        const myDyn=(dynastyValue(inc)+ctx.boost)-dynastyValue(out);
        const theirCtx=contextBoostV2(out,op);
        const theirDyn=(dynastyValue(out)+theirCtx.boost)-dynastyValue(inc);
        const mutual=Math.min(myProj,theirProj);
        const fairness=Math.max(0,Math.round(100-Math.min(100,Math.abs(myDyn-theirDyn)*2+Math.abs(myProj-theirProj)*1.1)));
        const score=mutual*6 + myProj*2 + theirProj*2 + myDyn + theirDyn + fairness*.08 + ctx.boost*1.5;
        results.push({partner:names[other.owner_id]||'Unknown',partnerRosterId:other.roster_id,send:{id:out.player_id,name:pname(out)},receive:{id:inc.player_id,name:pname(inc)},yourProjectionDelta:Number(myProj.toFixed(1)),partnerProjectionDelta:Number(theirProj.toFixed(1)),yourDynastyDelta:Number(myDyn.toFixed(1)),partnerDynastyDelta:Number(theirDyn.toFixed(1)),fairness,contextPremium:ctx.boost,reasons:ctx.reasons,score});
      }
    }
  }
  return results.filter(x=>x.yourProjectionDelta>0 && x.partnerProjectionDelta>0).sort((a,b)=>b.score-a.score).slice(0,25);
}

function lineupNeeds(players) {
  const posCounts={QB:0,RB:0,WR:0,TE:0};
  for(const p of players){const pos=(p?.fantasy_positions?.[0]||p?.position||'').toUpperCase(); if(posCounts[pos]!=null)posCounts[pos]++;}
  const needs={QB:Math.max(0,2-posCounts.QB),RB:Math.max(0,2-posCounts.RB),WR:Math.max(0,2-posCounts.WR),TE:Math.max(0,1-posCounts.TE)};
  const flexPool=posCounts.RB+posCounts.WR+posCounts.TE;
  needs.FLEX=Math.max(0,4-flexPool);
  return needs;
}
function positionalContext(player, rosterPlayers){
  const pos=(player?.fantasy_positions?.[0]||player?.position||'').toUpperCase();
  const same=rosterPlayers.filter(p=>(p?.fantasy_positions?.[0]||p?.position||'').toUpperCase()===pos).sort((a,b)=>dynastyValue(b)-dynastyValue(a));
  const need=lineupNeeds(rosterPlayers);
  let boost=0,reasons=[];
  if(need[pos]>0){boost+=Math.min(10,need[pos]*4);reasons.push(`${pos} need`)}
  if((pos==='RB'||pos==='WR'||pos==='TE')&&need.FLEX>0){boost+=Math.min(5,need.FLEX*2);reasons.push('flex depth need')}
  if(same.length>=5){boost-=5;reasons.push('deep position room')}
  if(same.length>=4){boost-=2;reasons.push('crowded position')}
  return {boost,reasons};
}
function packageTradeAnalysis(aPlayers,bPlayers,giveIds,getIds){
  const giveSet=new Set(giveIds),getSet=new Set(getIds);
  const give=aPlayers.filter(p=>giveSet.has(p.player_id)),get=bPlayers.filter(p=>getSet.has(p.player_id));
  if(!give.length||!get.length) throw new Error('Each side needs at least one player.');
  if(give.length>3||get.length>3) throw new Error('Package size is limited to 3 players per side.');
  const aBefore=rosterProjection(aPlayers),bBefore=rosterProjection(bPlayers);
  const aAfter=rosterProjection(aPlayers.filter(p=>!giveSet.has(p.player_id)).concat(get));
  const bAfter=rosterProjection(bPlayers.filter(p=>!getSet.has(p.player_id)).concat(give));
  const aBaseGive=give.reduce((s,p)=>s+dynastyValue(p),0), bBaseGive=get.reduce((s,p)=>s+dynastyValue(p),0);
  const aIncomingCtx=get.map(p=>({...p,ctx:{...contextBoost(p,aPlayers,bPlayers),pos:positionalContext(p,aPlayers)}}));
  const bIncomingCtx=give.map(p=>({...p,ctx:{...contextBoost(p,bPlayers,aPlayers),pos:positionalContext(p,bPlayers)}}));
  const aContext=aIncomingCtx.reduce((s,x)=>s+x.ctx.boost+x.pos.boost,0), bContext=bIncomingCtx.reduce((s,x)=>s+x.ctx.boost+x.pos.boost,0);
  const aDyn=(bBaseGive+aContext)-aBaseGive, bDyn=(aBaseGive+bContext)-bBaseGive;
  const aProj=aAfter.projectedPoints-aBefore.projectedPoints,bProj=bAfter.projectedPoints-bBefore.projectedPoints;
  const fairness=Math.max(0,Math.round(100-Math.min(100,Math.abs((aDyn-bDyn)*2.0)+Math.abs(aProj-bProj)*1.2)));
  const aScore=aProj*4+aDyn*2+fairness*.12, bScore=bProj*4+bDyn*2+fairness*.12;
  const verdict=(proj,dyn)=>proj>=3&&dyn>=0?'ACCEPT':proj<=-3&&dyn<0?'DECLINE':'CONSIDER';
  return {give:give.map(p=>({id:p.player_id,name:pname(p),value:dynastyValue(p)})),get:get.map(p=>({id:p.player_id,name:pname(p),value:dynastyValue(p)})),sender:{projectionDelta:Number(aProj.toFixed(1)),dynastyDelta:Number(aDyn.toFixed(1)),before:aBefore.projectedPoints,after:aAfter.projectedPoints,verdict:verdict(aProj,aDyn),context:aIncomingCtx.map(x=>({name:pname(x),reasons:[...x.ctx.reasons,...x.pos.reasons],boost:x.ctx.boost+x.pos.boost}))},receiver:{projectionDelta:Number(bProj.toFixed(1)),dynastyDelta:Number(bDyn.toFixed(1)),before:bBefore.projectedPoints,after:bAfter.projectedPoints,verdict:verdict(bProj,bDyn),context:bIncomingCtx.map(x=>({name:pname(x),reasons:[...x.ctx.reasons,...x.pos.reasons],boost:x.ctx.boost+x.pos.boost}))},fairness,score:Number((aScore+bScore).toFixed(1)),lineup:{sender:aAfter.starters.map(x=>({slot:x.slot,name:pname(x.player),projection:x.projection})),receiver:bAfter.starters.map(x=>({slot:x.slot,name:pname(x.player),projection:x.projection}))}};
}
function generatePackageTargets(leagueRosters,users,playersById,targetRosterId){
  const target=leagueRosters.find(r=>String(r.roster_id)===String(targetRosterId)); if(!target) throw new Error('Target roster not found');
  const nameById=Object.fromEntries(users.map(u=>[u.user_id,u.username||u.display_name||'Unknown']));
  const tp=(target.players||[]).map(id=>playersById[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
  const out=tp.slice().sort((a,b)=>dynastyValue(a)-dynastyValue(b)).slice(0,10);
  const results=[];
  for(const other of leagueRosters){
    if(String(other.roster_id)===String(targetRosterId))continue;
    const op=(other.players||[]).map(id=>playersById[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
    const incoming=op.slice().sort((a,b)=>dynastyValue(b)-dynastyValue(a)).slice(0,18);
    const outgoing=out;
    for(const inc of incoming){
      for(const out1 of outgoing){
        if(out1.player_id===inc.player_id)continue;
        const one=packageTradeAnalysis(tp,op,[out1.player_id],[inc.player_id]);
        results.push({partner:nameById[other.owner_id]||'Unknown',partnerRosterId:other.roster_id,send:one.give,receive:one.get,analysis:one,type:'1-for-1'});
        for(const out2 of outgoing){
          if(out2.player_id===out1.player_id||out2.player_id===inc.player_id)continue;
          const two=packageTradeAnalysis(tp,op,[out1.player_id,out2.player_id],[inc.player_id]);
          results.push({partner:nameById[other.owner_id]||'Unknown',partnerRosterId:other.roster_id,send:two.give,receive:two.get,analysis:two,type:'2-for-1'});
        }
      }
    }
  }
  return results.sort((a,b)=>b.analysis.score-a.analysis.score).slice(0,40);
}


function frontOfficeBrief(bundle, players) {
  const userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
  const analyses=bundle.rosters.map(r=>{
    const owner=userById[r.owner_id]||{};
    const ps=(r.players||[]).map(id=>players[id]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
    const opt=rosterProjection(ps);
    const needs=lineupNeeds(ps);
    const dynasty=ps.reduce((s,p)=>s+dynastyValue(p),0);
    return {rosterId:r.roster_id,team:owner.metadata?.team_name||owner.display_name||owner.username||`Roster ${r.roster_id}`,username:owner.username||'',projectedPoints:opt.projectedPoints, dynastyValue:Number(dynasty.toFixed(1)),needs,counts:{QB:ps.filter(p=>eligibility(p).has('QB')).length,RB:ps.filter(p=>eligibility(p).has('RB')).length,WR:ps.filter(p=>eligibility(p).has('WR')).length,TE:ps.filter(p=>eligibility(p).has('TE')).length}};
  }).sort((a,b)=>b.projectedPoints-a.projectedPoints).map((x,i)=>({...x,rank:i+1}));
  const edgeRows=[];
  for(const a of analyses){
    const posNeeds=Object.entries(a.needs).filter(([k,v])=>v>0 && k!=='FLEX').sort((x,y)=>y[1]-x[1]);
    edgeRows.push({team:a.team,rank:a.rank,pressure:posNeeds[0]?.[0]||'None',pressureScore:posNeeds.reduce((s,[,v])=>s+v,0),projectedPoints:a.projectedPoints});
  }
  const strongest=analyses.slice().sort((a,b)=>b.projectedPoints-a.projectedPoints)[0];
  const riskiest=analyses.slice().sort((a,b)=>(b.needs.RB+b.needs.WR+b.needs.QB+b.needs.TE)-(a.needs.RB+a.needs.WR+a.needs.QB+a.needs.TE))[0];
  return {
    league:{name:bundle.league.name,season:bundle.league.season,rosters:bundle.league.total_rosters,rosterPositions:bundle.league.roster_positions,scoring:bundle.league.scoring_settings},
    dataQuality:{source:'Sleeper read-only API',playerCache:'24h',leagueRosterCache:'60s',draftPicks:'excluded by league instruction',generatedAt:new Date().toISOString(),confidence:'directional — player projections are model baselines, not official projections'},
    standings:analyses,
    strategicLeaders:{projectedLeader:strongest?.team||null,mostPressure:riskiest?.team||null},
    pressure:edgeRows.sort((a,b)=>b.pressureScore-a.pressureScore).slice(0,10),
    nextActions:[
      strongest?`Pressure-test ${strongest.team}'s roster against the league's best trade targets.`:null,
      riskiest?`${riskiest.team} has the largest positional pressure signal; they may be the league's best trade partner.`:null,
      'Use Mock Trade Lab before sending a real offer.',
      'Track major moves in the Trade Room and let the league vote on the outcome.'
    ].filter(Boolean)
  };
}
function tradeDossier(aPlayers,bPlayers,giveIds,getIds, names={a:'Team A',b:'Team B'}) {
  const analysis=packageTradeAnalysis(aPlayers,bPlayers,giveIds,getIds);
  const senderNames=analysis.give.map(x=>x.name).join(', '), receiverNames=analysis.get.map(x=>x.name).join(', ');
  const gap=Math.abs(analysis.sender.projectionDelta-analysis.receiver.projectionDelta);
  const leverage=analysis.sender.projectionDelta>analysis.receiver.projectionDelta?'Sender has the stronger immediate lineup case.':analysis.receiver.projectionDelta>analysis.sender.projectionDelta?'Receiver has the stronger immediate lineup case.':'Both sides have similar projected lineup impact.';
  return {...analysis,dossier:{headline:`${names.a} sends ${senderNames} to ${names.b} for ${receiverNames}.`,leverage,negotiation:{opening:`Lead with the roster fit rather than raw player values. Explain the specific problem this solves for ${names.b}.`,counter:`If they counter, protect the asset that is hardest to replace on your roster and move the secondary piece first.`,walkAway:`Do not cross the point where the trade makes your own starting lineup or dynasty value materially worse.`},questions:[`Does this trade improve both starting lineups?`,`Is either side giving up scarce positional insulation?`,`Does the receiving manager have a roster-specific reason to value the incoming assets more than the market?`,`What happens if the deal is delayed one week?`],confidence:Number(Math.max(55,Math.min(94,92-gap*3)).toFixed(0))}};
}

async function leagueBundle(id) {
  const [league, rosters, users] = await Promise.all([sleeper(`/league/${id}`,300000),sleeper(`/league/${id}/rosters`,60000),sleeper(`/league/${id}/users`,60000)]);
  return {league,rosters,users,syncedAt:new Date().toISOString()};
}

// This is intentionally a presentation-shaped endpoint rather than an analytics
// endpoint.  Starter flags come directly from Sleeper's roster `starters` field;
// when no lineup has been submitted (common before the season), that uncertainty
// is surfaced instead of substituting an optimized projected lineup.
function rosterCenter(bundle, players) {
  const usersById = Object.fromEntries(bundle.users.map(user => [user.user_id, user]));
  const playerView = (playerId, starterIds, starterOrder) => {
    const player = players[playerId];
    if (!player) return { id: String(playerId), name: `Unknown player (${playerId})`, position: '—', nflTeam: '—', starter: starterIds.has(String(playerId)) };
    return {
      id: String(playerId),
      name: pname(player) || `Unknown player (${playerId})`,
      position: player.fantasy_positions?.[0] || player.position || '—',
      nflTeam: player.team || '—',
      status: player.status || null,
      starter: starterIds.has(String(playerId)),
      starterOrder: starterOrder.get(String(playerId)) ?? null
    };
  };
  const positionOrder = { QB: 1, RB: 2, WR: 3, TE: 4, K: 5, DEF: 6, DST: 6 };
  const teams = bundle.rosters.map(roster => {
    const owner = usersById[roster.owner_id] || {};
    const starterOrder = new Map((roster.starters || []).map((id, index) => [String(id), index]));
    const starterIds = new Set(starterOrder.keys());
    const allPlayers = (roster.players || []).map(id => playerView(id, starterIds, starterOrder));
    const sortPlayers = (left, right) => (left.starterOrder ?? 99) - (right.starterOrder ?? 99)
      || (positionOrder[left.position] ?? 99) - (positionOrder[right.position] ?? 99)
      || left.name.localeCompare(right.name);
    return {
      rosterId: roster.roster_id,
      team: owner.metadata?.team_name || owner.display_name || owner.username || `Roster ${roster.roster_id}`,
      manager: owner.display_name || owner.username || 'Unknown manager',
      username: owner.username || null,
      startersSubmitted: starterIds.size > 0,
      starters: allPlayers.filter(player => player.starter).sort(sortPlayers),
      bench: allPlayers.filter(player => !player.starter).sort(sortPlayers),
      rosterSize: allPlayers.length
    };
  }).sort((left, right) => left.team.localeCompare(right.team));
  return {
    league: {
      id: bundle.league.league_id,
      name: bundle.league.name,
      season: bundle.league.season,
      totalRosters: bundle.league.total_rosters,
      rosterPositions: bundle.league.roster_positions || [],
      scoring: bundle.league.scoring_settings || {}
    },
    teams,
    source: 'Sleeper read-only API',
    syncedAt: bundle.syncedAt
  };
}


function stripHtml(s){return String(s||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
async function aiAnalyst(prompt, context={}) {
  const key=process.env.OPENAI_API_KEY;
  if(!key) return {configured:false, text: localAnalyst(prompt, context), model:null};
  const model=process.env.OPENAI_MODEL || 'gpt-5.6-luna';
  const system=`You are the original AI media personality for a private dynasty fantasy football league called Dynasty Command Center. You are NOT impersonating a real person. Your style is energetic sports-TV analysis: confident, witty, occasionally savage, but never hateful, harassing, or personally cruel. Use only the supplied league data; never invent stats. Separate facts from opinion. Keep player/trade recommendations grounded in the provided analytics. Your job is to increase league engagement, explain the numbers, create debate, and make managers want to act. Avoid claiming certainty. When discussing a trade, explain both sides. Do not reveal hidden reasoning or chain-of-thought.`;
  const user=`League data/context:\n${JSON.stringify(context)}\n\nManager request:\n${prompt}`;
  const body={model,input:[{role:'system',content:system},{role:'user',content:user}],max_output_tokens:900};
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok){const t=await r.text(); throw new Error(`OpenAI ${r.status}: ${t.slice(0,300)}`)}
  const d=await r.json();
  const text=d.output_text || (d.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').join('\n').trim();
  return {configured:true,text:text||'The analyst has no comment.',model};
}
function localAnalyst(prompt, context){
  const a=context?.analysis||{}; const top=(a.analyses||[]).slice(0,3); const p=stripHtml(prompt).toLowerCase();
  if(p.includes('trade')) return `THE COMMISSIONER'S TAKE: I want a trade that improves both rosters, not a fake “win” that leaves one manager dead on arrival. The current model has ${context?.tradeCount ?? 0} viable league-wide opportunities. Start with the deals that improve both starting lineups. And yes—roster context matters: a player can be worth more to the manager who can actually use him.`;
  if(p.includes('roast')) return `THE COMMISSIONER'S TAKE: I have reviewed the numbers, and somebody is about to catch a stray. The data says the league has ${top.length} teams currently occupying the top tier. I’ll save the full roast for when the live weekly results are loaded.`;
  return `THE COMMISSIONER'S TAKE: Welcome to the front office. The model currently has ${top.length} teams in the top tier of the available analysis. The big idea is simple: market value is only the starting point. Lineup fit, positional scarcity, handcuffs, depth and the other manager's incentives determine what a player is really worth in this league.`;
}

async function route(req, res, url) {
  const parts=url.pathname.split('/').filter(Boolean);
  try {
    if (url.pathname === '/api/analyst' && req.method==='POST') {
      let body=''; for await (const chunk of req) body+=chunk;
      const payload=JSON.parse(body||'{}');
      return json(res,200,await aiAnalyst(payload.prompt||'Give the league a morning report.',payload.context||{}));
    }
    if (url.pathname === '/api/analyst/status') return json(res,200,{configured:Boolean(process.env.OPENAI_API_KEY),model:process.env.OPENAI_MODEL||'gpt-5.6-luna'});
    if (url.pathname === '/api/health') {
      const live=url.searchParams.get('live')==='1';
      if(!live) return json(res,200,{ok:true,service:'Dynasty Command Center',version:'1.20.1',leagueId:DEFAULT_LEAGUE_ID,sleeperApi:API});
      try {
        const league=await sleeper(`/league/${DEFAULT_LEAGUE_ID}`,15000);
        return json(res,200,{ok:true,live:true,leagueId:DEFAULT_LEAGUE_ID,league:{name:league.name,season:league.season,total_rosters:league.total_rosters,status:league.status},checkedAt:new Date().toISOString()});
      } catch(e) {
        return json(res,503,{ok:false,live:false,leagueId:DEFAULT_LEAGUE_ID,error:String(e.message||e),hint:'The app needs outbound HTTPS access to api.sleeper.app.'});
      }
    }
    if (parts[0]==='api' && parts[1]==='players' && parts[2]==='nfl') return json(res,200,await sleeper('/players/nfl',DAY));
    if (parts[0]==='api' && parts[1]==='league' && parts[2]) {
      const id=decodeURIComponent(parts[2]) || DEFAULT_LEAGUE_ID;
      if(parts.length===3) return json(res,200,await leagueBundle(id));
      if(parts[3]==='roster-center') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        return json(res,200,rosterCenter(bundle,players));
      }
      if(parts[3]==='analysis') {
        return json(res,410,{status:'withheld',reason:'legacy-heuristic-analysis-disabled',replacement:`/api/league/${id}/team-component-matrix/1`,policy:'Unverified search-rank projections cannot publish DCC roster scores or rankings.'});
        /* LEGACY_DISABLED
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const byId=players,userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
        const analyses=bundle.rosters.map(r=>({rosterId:r.roster_id,ownerId:r.owner_id,owner:userById[r.owner_id]||null,...optimizeRoster(r,byId,bundle.league.roster_positions||[]),...optimizeProjected(r,byId)})).sort((a,b)=>b.projectedPoints-a.projectedPoints);
        const max=analyses[0]?.starterScore||1; analyses.forEach((a,i)=>{a.liveRosterScore=Number((70+30*a.starterScore/max).toFixed(1));a.rank=i+1;});
        return json(res,200,{league:bundle.league,analyses,syncedAt:new Date().toISOString(),playerCache:'24h'});
      }
        */
      }
      if(parts[3]==='matchups' && parts[4]) return json(res,200,await sleeper(`/league/${id}/matchups/${encodeURIComponent(parts[4])}`,60000));
      if(parts[3]==='transactions' && parts[4]) return json(res,200,await sleeper(`/league/${id}/transactions/${encodeURIComponent(parts[4])}`,60000));
      if(parts[3]==='engagement') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const byId=players,userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
        const analyses=bundle.rosters.map(r=>({rosterId:r.roster_id,ownerId:r.owner_id,owner:userById[r.owner_id]||null,...optimizeProjected(r,byId)})).sort((a,b)=>b.projectedPoints-a.projectedPoints);
        return json(res,200,{snapshot:engagementSnapshot(analyses),syncedAt:new Date().toISOString(),league:bundle.league});
      }
      if(parts[3]==='player-intelligence') {
        const playerId=url.searchParams.get('playerId');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const p=players[playerId]; if(!p) throw new Error('Player not found in Sleeper database');
        return json(res,200,playerIntelligence(p,bundle.rosters,bundle.users,players));
      }
      if(parts[3]==='smart-targets') {
        const targetRosterId=url.searchParams.get('rosterId');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        return json(res,200,{targets:smartTargets(bundle.rosters,bundle.users,players,targetRosterId),syncedAt:new Date().toISOString()});
      }
      if(parts[3]==='trade-targets') {
        const targetRosterId=url.searchParams.get('rosterId');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        return json(res,200,{targets:tradeFinder(bundle.rosters,bundle.users,players,targetRosterId),syncedAt:new Date().toISOString()});
      }
      if(parts[3]==='trade-package' && req.method==='POST') {
        let body=''; for await (const chunk of req) body+=chunk; const payload=JSON.parse(body||'{}');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const a=bundle.rosters.find(r=>String(r.roster_id)===String(payload.giverRosterId)); const b=bundle.rosters.find(r=>String(r.roster_id)===String(payload.receiverRosterId));
        if(!a||!b) throw new Error('Both roster IDs are required');
        const ap=(a.players||[]).map(x=>players[x]).filter(Boolean), bp=(b.players||[]).map(x=>players[x]).filter(Boolean);
        return json(res,200,packageTradeAnalysis(ap,bp,payload.givePlayerIds||[],payload.getPlayerIds||[]));
      }
      if(parts[3]==='trade-packages') {
        const targetRosterId=url.searchParams.get('rosterId');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        return json(res,200,{targets:generatePackageTargets(bundle.rosters,bundle.users,players,targetRosterId),syncedAt:new Date().toISOString()});
      }
      if(parts[3]==='mock-trade' && req.method==='POST') {
        let body=''; for await (const chunk of req) body+=chunk; const payload=JSON.parse(body||'{}');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const a=bundle.rosters.find(r=>String(r.roster_id)===String(payload.giverRosterId)); const b=bundle.rosters.find(r=>String(r.roster_id)===String(payload.receiverRosterId));
        if(!a||!b) throw new Error('Both roster IDs are required');
        const ap=(a.players||[]).map(x=>players[x]).filter(Boolean), bp=(b.players||[]).map(x=>players[x]).filter(Boolean);
        const giveIds=new Set(payload.givePlayerIds||[]), getIds=new Set(payload.getPlayerIds||[]);
        if(!giveIds.size||!getIds.size) throw new Error('Select at least one player on each side');
        if([...giveIds].some(x=>!ap.some(p=>String(p.player_id)===String(x)))||[...getIds].some(x=>!bp.some(p=>String(p.player_id)===String(x)))) throw new Error('One or more selected players are not on the expected roster');
        const analysis=packageTradeAnalysis(ap,bp,[...giveIds],[...getIds]);
        const makeRoster=(before,remove,add)=>{
          const ids=before.filter(p=>!remove.has(String(p.player_id))).concat(add);
          const opt=rosterProjection(ids);
          const starters=new Set(opt.starters.map(x=>String(x.player.player_id)));
          const all=ids.slice().sort((x,y)=>dynastyValue(y)-dynastyValue(x));
          return {starters:opt.starters.map(x=>({id:x.player.player_id,name:pname(x.player),position:x.player?.fantasy_positions?.[0]||x.player?.position||'—',points:Number(x.projection.toFixed(1))})),players:all.map(x=>({id:x.player_id,name:pname(x),position:x.fantasy_positions?.[0]||x.position||'—',starter:starters.has(String(x.player_id)),value:Number(dynastyValue(x).toFixed(1))}))};
        };
        const give=ap.filter(p=>giveIds.has(String(p.player_id))), get=bp.filter(p=>getIds.has(String(p.player_id)));
        return json(res,200,{...analysis,teamA:{rosterId:a.roster_id,before:makeRoster(ap,new Set(),[]),after:makeRoster(ap,giveIds,get)},teamB:{rosterId:b.roster_id,before:makeRoster(bp,new Set(),[]),after:makeRoster(bp,getIds,give)},generatedAt:new Date().toISOString()});
      }
      if(parts[3]==='headlines') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
        const ownerByRoster=Object.fromEntries(bundle.rosters.map(r=>[String(r.roster_id),userById[r.owner_id]||{}]));
        const txs=(await Promise.all(Array.from({length:18},(_,i)=>sleeper(`/league/${id}/transactions/${i+1}`,60000).catch(()=>[])))).flat();
        const seen=new Set(),events=[];
        for(const tx of txs){if(!tx||seen.has(tx.transaction_id)||tx.status==='failed')continue;seen.add(tx.transaction_id);
          const adds=Object.entries(tx.adds||{}).map(([pid,rid])=>({pid,rid,name:pname(players[pid]),value:dynastyValue(players[pid]||{})}));
          const drops=Object.entries(tx.drops||{}).map(([pid,rid])=>({pid,rid,name:pname(players[pid]),value:dynastyValue(players[pid]||{})}));
          const score=tx.type==='trade'?adds.concat(drops).reduce((a,x)=>a+x.value,0)/2:adds.reduce((a,x)=>a+x.value,0)+(tx.type==='waiver'?2:0);
          const impact=score>=75?'blockbuster':score>=45?'major':score>=20?'significant':score>=8?'notable':'routine';
          const rosterIds=[...(tx.roster_ids||[]),...adds.map(x=>x.rid),...drops.map(x=>x.rid)].map(String);
          const rosters=[...new Set(rosterIds)].map(rid=>({rosterId:rid,owner:ownerByRoster[rid]?.display_name||ownerByRoster[rid]?.username||`Roster ${rid}`}));
          const story=impact==='blockbuster'?`${rosters.map(r=>r.owner).join(' ↔ ')} just made a blockbuster-level move involving ${adds.concat(drops).map(x=>x.name).filter(Boolean).slice(0,6).join(', ')||'major assets'}.`:impact==='major'?`${rosters.map(r=>r.owner).join(' ↔ ')} made a meaningful ${tx.type||'roster'} move with enough asset weight to affect the competitive picture.`:tx.type==='waiver'?`${rosters.map(r=>r.owner).join(' · ')} added ${adds.map(x=>x.name).filter(Boolean).join(', ')||'a player'} through the waiver wire.`:`${rosters.map(r=>r.owner).join(' · ')} made a roster adjustment.`;
          events.push({id:tx.transaction_id,type:tx.type||'transaction',impact,impactScore:Number(Math.min(100,score).toFixed(1)),created:tx.created||0,week:tx.leg||null,rosters,adds,drops,story});
        }
        return json(res,200,{headlines:headlineBoard(events),generatedAt:new Date().toISOString()});
      }
      if(parts[3]==='trade-room') {
        const targetRosterId=url.searchParams.get('rosterId');
        if(!targetRosterId) throw new Error('rosterId is required');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const candidates=tradeFinder(bundle.rosters,bundle.users,players,targetRosterId);
        return json(res,200,{targetRosterId,opportunities:tradeRoomFromCandidates(candidates),generatedAt:new Date().toISOString(),methodology:['Roster need','Starting-lineup impact','Dynasty value','Partner improvement','Roster-specific context','Trade fairness']});
      }
      if(parts[3]==='prediction-ledger') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const analyses=bundle.rosters.map(r=>({rosterId:r.roster_id,ownerId:r.owner_id,...optimizeProjected(r,players)})).sort((a,b)=>b.projectedPoints-a.projectedPoints);
        return json(res,200,{predictions:[
          {id:'preseason-top',type:'season',label:'Preseason favorite',prediction:'The current projection leader enters 2026 as the team to beat.',status:'open',leader:analyses[0]?.rosterId||null},
          {id:'market',type:'market',label:'Trade market',prediction:'The first meaningful blockbuster trade will materially change at least one team\'s championship path.',status:'open'},
          {id:'gm',type:'gm',label:'GM challenge',prediction:'At least one manager will outperform the preseason model by a meaningful margin.',status:'open'}
        ],generatedAt:new Date().toISOString()});
      }
      if(parts[3]==='feed') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
        const ownerByRoster=Object.fromEntries(bundle.rosters.map(r=>[String(r.roster_id),userById[r.owner_id]||{}]));
        const txs=(await Promise.all(Array.from({length:18},(_,i)=>sleeper(`/league/${id}/transactions/${i+1}`,60000).catch(()=>[])))).flat();
        const seen=new Set(), events=[];
        const playerName=pid=>pname(players[pid])||'Unknown player';
        for(const tx of txs){ if(!tx||seen.has(tx.transaction_id)||tx.status==='failed') continue; seen.add(tx.transaction_id);
          const adds=Object.entries(tx.adds||{}).map(([pid,rid])=>({pid,rid,name:playerName(pid),value:dynastyValue(players[pid]||{})}));
          const drops=Object.entries(tx.drops||{}).map(([pid,rid])=>({pid,rid,name:playerName(pid),value:dynastyValue(players[pid]||{})}));
          const raw=tx.type==='trade'?adds.concat(drops).reduce((a,x)=>a+x.value,0)/2:adds.reduce((a,x)=>a+x.value,0)+(tx.type==='waiver'?2:0);
          const impactScore=Number(Math.min(100,raw).toFixed(1));
          const impact=impactScore>=75?'blockbuster':impactScore>=45?'major':impactScore>=20?'significant':impactScore>=8?'notable':'routine';
          const rosters=[...(tx.roster_ids||[]),...adds.map(x=>x.rid),...drops.map(x=>x.rid)].map(String).filter(Boolean);
          const owners=[...new Set(rosters)].map(rid=>ownerByRoster[rid]?.display_name||ownerByRoster[rid]?.username||`Roster ${rid}`);
          let story='A routine roster move with limited immediate league-wide impact.';
          if(impact==='blockbuster') story=`${owners.join(' ↔ ')} just made a blockbuster-level move involving ${adds.concat(drops).map(x=>x.name).slice(0,6).join(', ')||'major assets'}. The Command Center is flagging this as a potential season-defining event.`;
          else if(impact==='major') story=`${owners.join(' ↔ ')} made a meaningful ${tx.type||'roster'} move. The assets involved are strong enough that this deserves attention beyond the transaction log.`;
          else if(tx.type==='waiver') story=`${owners.join(' · ')} added ${adds.map(x=>x.name).join(', ')||'a player'} through the waiver wire. Small moves become important when the player earns a larger role.`;
          else if(tx.type==='free_agent') story=`${owners.join(' · ')} made a free-agent pickup. The model is watching whether the move becomes a real roster gain.`;
          events.push({id:tx.transaction_id,type:tx.type||'transaction',impact,impactScore,created:tx.created||0,week:tx.leg||null,rosters:rosters.map(rid=>({rosterId:rid,owner:ownerByRoster[rid]?.display_name||ownerByRoster[rid]?.username||`Roster ${rid}`})),adds:adds.slice(0,10),drops:drops.slice(0,10),story});
        }
        events.sort((a,b)=>(b.impactScore-a.impactScore)||(b.created-a.created));
        return json(res,200,{events:events.slice(0,80),generatedAt:new Date().toISOString()});
      }
      if(parts[3]==='story') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const weeks=Array.from({length:18},(_,i)=>i+1);
        const txs=(await Promise.all(weeks.map(w=>sleeper(`/league/${id}/transactions/${w}`,60000).catch(()=>[])))).flat();
        const seen=new Set(); const feed=[];
        const userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
        const ownerByRoster=Object.fromEntries(bundle.rosters.map(r=>[String(r.roster_id),userById[r.owner_id]||{}]));
        const pnameLocal=pid=>players[pid]?.full_name||[players[pid]?.first_name,players[pid]?.last_name].filter(Boolean).join(' ')||'Unknown player';
        const val=pid=>Number(dynastyValue(players[pid]||{})||0);
        for(const tx of txs){ if(!tx||seen.has(tx.transaction_id)||tx.status==='failed') continue; seen.add(tx.transaction_id);
          const adds=Object.entries(tx.adds||{}).map(([pid,rid])=>({pid,rid,name:pnameLocal(pid),value:val(pid)}));
          const drops=Object.entries(tx.drops||{}).map(([pid,rid])=>({pid,rid,name:pnameLocal(pid),value:val(pid)}));
          const score=tx.type==='trade'?adds.concat(drops).reduce((a,x)=>a+x.value,0)/2:adds.reduce((a,x)=>a+x.value,0);
          const impact=score>=75?'blockbuster':score>=45?'major':score>=20?'significant':score>=8?'notable':'routine';
          const rosterIds=[...(tx.roster_ids||[]),...adds.map(x=>x.rid),...drops.map(x=>x.rid)].map(String);
          feed.push({id:tx.transaction_id,type:tx.type||'transaction',impact,impactScore:Number(score.toFixed(1)),created:tx.created||0,week:tx.leg||null,headline:tx.type==='trade'?'Trade':tx.type==='waiver'?'Waiver claim':tx.type==='free_agent'?'Free-agent pickup':(tx.type||'Transaction').replace(/_/g,' '),status:tx.status,rosters:[...new Set(rosterIds)].map(rid=>({rosterId:rid,owner:ownerByRoster[rid]?.display_name||ownerByRoster[rid]?.username||`Roster ${rid}`})),adds,drops});
        }
        return json(res,200,buildStorySnapshot(bundle,players,feed));
      }
      if(parts[3]==='transaction-feed') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
        const ownerByRoster=Object.fromEntries(bundle.rosters.map(r=>[String(r.roster_id),userById[r.owner_id]||{}]));
        const weeks=Array.from({length:18},(_,i)=>i+1);
        const txs=(await Promise.all(weeks.map(w=>sleeper(`/league/${id}/transactions/${w}`,60000).catch(()=>[])))).flat();
        const seen=new Set(); const feed=[];
        for(const tx of txs){ if(!tx||seen.has(tx.transaction_id)||tx.status==='failed') continue; seen.add(tx.transaction_id);
          const adds=tx.adds||{}, drops=tx.drops||{}; const involved=[...(tx.roster_ids||[])].map(x=>String(x));
          const nameForRoster=rid=>ownerByRoster[String(rid)]?.display_name||ownerByRoster[String(rid)]?.username||`Roster ${rid}`;
          const playerInfo=pid=>players[pid]||{};
          const value=pid=>Number(dynastyValue(playerInfo(pid))||0);
          const addList=Object.entries(adds).map(([pid,rid])=>({pid,rid,name:pname(playerInfo(pid)),value:value(pid)}));
          const dropList=Object.entries(drops).map(([pid,rid])=>({pid,rid,name:pname(playerInfo(pid)),value:value(pid)}));
          let kind=tx.type||'transaction'; let headline='Roster move'; let impact='routine'; let impactScore=0;
          if(kind==='trade') { headline='Trade'; impactScore=addList.concat(dropList).reduce((a,x)=>a+x.value,0)/2; }
          else if(kind==='waiver') { headline='Waiver claim'; impactScore=addList.reduce((a,x)=>a+x.value,0); }
          else if(kind==='free_agent') { headline='Free-agent pickup'; impactScore=addList.reduce((a,x)=>a+x.value,0); }
          else { headline=kind.replace(/_/g,' '); impactScore=addList.concat(dropList).reduce((a,x)=>a+x.value,0)/3; }
          if(impactScore>=75) impact='blockbuster'; else if(impactScore>=45) impact='major'; else if(impactScore>=20) impact='significant'; else if(impactScore>=8) impact='notable';
          const rosters=[...new Set(involved.concat(addList.map(x=>String(x.rid)),dropList.map(x=>String(x.rid))))].filter(Boolean);
          feed.push({id:tx.transaction_id,type:kind,headline,impact,impactScore:Number(impactScore.toFixed(1)),created:tx.created||0,week:tx.leg||null,status:tx.status,rosters:rosters.map(rid=>({rosterId:rid,owner:nameForRoster(rid)})),adds:addList.slice(0,12),drops:dropList.slice(0,12),waiverBid:tx.waiver_bid??null});
        }
        feed.sort((a,b)=>b.created-a.created);
        return json(res,200,{transactions:feed.slice(0,100),syncedAt:new Date().toISOString(),weeks:18});
      }
      if(parts[3]==='trade' && req.method==='POST') {
        let body=''; for await (const chunk of req) body+=chunk; const payload=JSON.parse(body||'{}');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const byId=players; const a=bundle.rosters.find(r=>String(r.roster_id)===String(payload.giverRosterId)); const b=bundle.rosters.find(r=>String(r.roster_id)===String(payload.receiverRosterId));
        if(!a||!b) throw new Error('Both roster IDs are required');
        const ap=(a.players||[]).map(x=>byId[x]).filter(Boolean), bp=(b.players||[]).map(x=>byId[x]).filter(Boolean);
        return json(res,200,tradeAnalysis(ap,bp,payload.givePlayerId,payload.getPlayerId));
      }
      if(parts[3]==='edge') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const byId=players, userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
        const reqs={QB:2,RB:3,WR:3,TE:1};
        const teamRows=bundle.rosters.map(r=>{
          const owner=userById[r.owner_id]||{}; const team=owner.metadata?.team_name||owner.display_name||owner.username||`Roster ${r.roster_id}`;
          const ps=(r.players||[]).map(x=>byId[x]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
          const counts={QB:0,RB:0,WR:0,TE:0}; ps.forEach(p=>{const pos=(p.fantasy_positions?.[0]||p.position||'').toUpperCase(); if(counts[pos]!=null)counts[pos]++;});
          const pressure=[]; for(const pos of Object.keys(reqs)){const depth=counts[pos]; const score=Math.max(0,(reqs[pos]-depth)*18 + (depth<=reqs[pos]?10:0)); if(score>=10) pressure.push({position:pos,score,depth,reason:`${team} has ${depth} ${pos}s against an approximate ${reqs[pos]}-player functional depth target for this format.`});}
          return {rosterId:r.roster_id,team,counts,pressure,players:ps};
        });
        const needs=[]; teamRows.forEach(t=>t.pressure.forEach(p=>needs.push({team:t.team,...p,needScore:Number(p.score.toFixed(1))}))); needs.sort((a,b)=>b.needScore-a.needScore);
        const partners=[];
        for(let i=0;i<teamRows.length;i++) for(let j=i+1;j<teamRows.length;j++){
          const a=teamRows[i],b=teamRows[j]; let score=0, reasons=[];
          for(const pos of Object.keys(reqs)){const aNeed=Math.max(0,reqs[pos]-a.counts[pos]); const bNeed=Math.max(0,reqs[pos]-b.counts[pos]); const aSur=Math.max(0,a.counts[pos]-reqs[pos]-1); const bSur=Math.max(0,b.counts[pos]-reqs[pos]-1); if(aNeed&&bSur){score+=aNeed*bSur*8;reasons.push(`${a.team} needs ${pos} while ${b.team} has depth`);} if(bNeed&&aSur){score+=bNeed*aSur*8;reasons.push(`${b.team} needs ${pos} while ${a.team} has depth`);}}
          if(score>=16) partners.push({a:a.team,b:b.team,score:Math.min(99,Math.round(score)),reason:[...new Set(reasons)].slice(0,2).join(' · ')});
        }
        partners.sort((a,b)=>b.score-a.score);
        const recommendedMoves=needs.slice(0,8).map(x=>`${x.team} should explore ${x.position} targets`).concat(partners.slice(0,4).map(x=>`Explore a deal between ${x.a} and ${x.b}`));
        return json(res,200,{format:bundle.league.roster_positions,pressureCount:needs.length,needs:needs.slice(0,12),partners:partners.slice(0,12),recommendedMoves,generatedAt:new Date().toISOString(),methodology:{marketBaseline:'external dynasty consensus is a reference layer',leagueContext:'Sleeper roster + settings',rosterFit:'position depth and lineup economics',ai:'commentary only; not the source of numerical truth'}});
      }
      if(parts[3]==='front-office-brief') {
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        return json(res,200,frontOfficeBrief(bundle,players));
      }
      if(parts[3]==='trade-dossier' && req.method==='POST') {
        let body=''; for await (const chunk of req) body+=chunk; const payload=JSON.parse(body||'{}');
        const [bundle,players]=await Promise.all([leagueBundle(id),sleeper('/players/nfl',DAY)]);
        const a=bundle.rosters.find(r=>String(r.roster_id)===String(payload.giverRosterId)); const b=bundle.rosters.find(r=>String(r.roster_id)===String(payload.receiverRosterId));
        if(!a||!b) throw new Error('Both roster IDs are required');
        const ap=(a.players||[]).map(x=>players[x]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
        const bp=(b.players||[]).map(x=>players[x]).filter(Boolean).filter(p=>!['DEF','K','DST'].includes(p.position));
        const userById=Object.fromEntries(bundle.users.map(u=>[u.user_id,u]));
        const name=r=>userById[r.owner_id]?.metadata?.team_name||userById[r.owner_id]?.display_name||userById[r.owner_id]?.username||`Roster ${r.roster_id}`;
        return json(res,200,tradeDossier(ap,bp,payload.givePlayerIds||[],payload.getPlayerIds||[],{a:name(a),b:name(b)}));
      }
      if(parts[3]==='state') return json(res,200,await sleeper('/state/nfl',60000));
    }
    if(req.method==='GET') {
      let file=url.pathname==='/'?'index.html':url.pathname.slice(1);
      file=path.normalize(file);
      if(file.startsWith('..')||path.isAbsolute(file)) return json(res,403,{error:'Forbidden'});
      const full=path.join(PUBLIC,file); const data=await fs.readFile(full); const ext=path.extname(full); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
      res.writeHead(200,{'Content-Type':types[ext]||'application/octet-stream'}); return res.end(data);
    }
    json(res,404,{error:'Not found'});
  } catch(e) { json(res,502,{error:e.message}); }
}

const server=http.createServer((req,res)=>{const url=new URL(req.url,`http://${req.headers.host||'localhost'}`);route(req,res,url);});

// Vercel imports `route` from api/[...path].js.  Only listen when this file is
// invoked directly so importing it as a serverless function does not create a
// second HTTP server inside the function runtime.
const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectExecution) server.listen(PORT,()=>console.log(`Dynasty Command Center v1.0 running at http://localhost:${PORT}`));

export { route };
