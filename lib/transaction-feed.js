const TYPES=new Set(['trade','waiver','free_agent','commissioner']);
const asId=value=>String(value??'');
const playerName=(players,id)=>{const player=players[id]||{};return player.full_name||[player.first_name,player.last_name].filter(Boolean).join(' ')||`Player ${id}`;};

export function buildTransactionFeed({transactions=[],rosters=[],users=[],players={},limit=100}){
  const usersById=new Map(users.map(user=>[asId(user.user_id),user]));
  const rosterById=new Map(rosters.map(roster=>{
    const user=usersById.get(asId(roster.owner_id))||{};
    return[asId(roster.roster_id),{rosterId:asId(roster.roster_id),team:user.metadata?.team_name||user.display_name||user.username||`Roster ${roster.roster_id}`,manager:user.display_name||user.username||'Unknown manager'}];
  }));
  const identity=id=>rosterById.get(asId(id))||{rosterId:asId(id),team:`Roster ${id}`,manager:'Unknown manager'};
  const events=[],seen=new Set();
  for(const tx of transactions){
    if(!tx||tx.status!=='complete'||!TYPES.has(tx.type)||!tx.transaction_id||seen.has(asId(tx.transaction_id)))continue;
    seen.add(asId(tx.transaction_id));
    const ids=new Set((tx.roster_ids||[]).map(asId));
    for(const rid of Object.values(tx.adds||{}))ids.add(asId(rid));
    for(const rid of Object.values(tx.drops||{}))ids.add(asId(rid));
    for(const pick of tx.draft_picks||[]){ids.add(asId(pick.previous_owner_id));ids.add(asId(pick.owner_id));}
    ids.delete('');ids.delete('null');
    const teams=[...ids].map(id=>({...identity(id),receives:[],sends:[],picksIn:[],picksOut:[]}));
    const byId=new Map(teams.map(team=>[team.rosterId,team]));
    for(const [id,rid] of Object.entries(tx.adds||{}))byId.get(asId(rid))?.receives.push({id,name:playerName(players,id)});
    for(const [id,rid] of Object.entries(tx.drops||{}))byId.get(asId(rid))?.sends.push({id,name:playerName(players,id)});
    for(const pick of tx.draft_picks||[]){
      const label=`${pick.season} Round ${pick.round} (${identity(pick.roster_id).team} original)`;
      byId.get(asId(pick.previous_owner_id))?.picksOut.push(label);
      byId.get(asId(pick.owner_id))?.picksIn.push(label);
    }
    if(!teams.some(team=>team.receives.length||team.sends.length||team.picksIn.length||team.picksOut.length))continue;
    const names=teams.map(team=>team.team);
    const tradedPlayers=[...new Set(Object.keys(tx.adds||{}).map(id=>playerName(players,id)))];
    const tradeAssets=tradedPlayers.length?`${tradedPlayers.slice(0,2).join(' and ')}${tradedPlayers.length>2?` plus ${tradedPlayers.length-2} more players`:''}${(tx.draft_picks||[]).length?' and picks':''}`:'draft picks';
    const headline=tx.type==='trade'?`${names.join(' ↔ ')} exchange ${tradeAssets}`:tx.type==='waiver'?`${names[0]||'A team'} wins a waiver claim`:tx.type==='free_agent'?`${names[0]||'A team'} makes a roster move`:`${names[0]||'A team'} roster update`;
    events.push({id:asId(tx.transaction_id),type:tx.type,headline,occurredAt:Number(tx.status_updated||tx.created)||0,week:Number(tx.leg)||null,teams,waiverBid:tx.type==='waiver'&&Number.isFinite(Number(tx.settings?.waiver_bid))?Number(tx.settings.waiver_bid):null});
  }
  events.sort((a,b)=>b.occurredAt-a.occurredAt||b.id.localeCompare(a.id));
  return{transactions:events.slice(0,limit),total:events.length,counts:{trade:events.filter(e=>e.type==='trade').length,waiver:events.filter(e=>e.type==='waiver').length,free_agent:events.filter(e=>e.type==='free_agent').length},latestTrade:events.find(e=>e.type==='trade')||null};
}
