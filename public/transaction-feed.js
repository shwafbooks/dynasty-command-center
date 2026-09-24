(()=>{
const root=document.querySelector('#transaction-feed');if(!root)return;
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
let events=[],active='all',visible=12;
const typeLabel={trade:'TRADE',waiver:'WAIVER',free_agent:'FREE AGENT',commissioner:'COMMISSIONER'};
const stamp=value=>value?new Date(value).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Time unavailable';
const portrait=player=>`https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(player.id)}.jpg`;
const assets=(players,picks)=>`<div class="wire-assets">${players.map(player=>`<span class="wire-asset wire-asset--player"><span class="wire-portrait"><img src="${portrait(player)}" alt="" loading="lazy" decoding="async"><span class="wire-portrait__fallback" aria-hidden="true">${esc((player.name||'?').split(' ').map(part=>part[0]).slice(0,2).join('').toUpperCase())}</span></span><span>${esc(player.name)}</span></span>`).join('')}${picks.map(pick=>`<span class="wire-asset wire-asset--pick"><span class="wire-pick-icon" aria-hidden="true">P</span><span>${esc(pick)}</span></span>`).join('')}</div>`;
function card(event,featured=false){
  const movement=event.teams.map(team=>{
    const incoming=team.receives.length||team.picksIn.length,outgoing=team.sends.length||team.picksOut.length;
    return `<div class="wire-team"><div class="wire-team__header"><strong>${esc(team.team)}</strong><small>${esc(team.manager)}</small></div>${incoming?`<div class="wire-movement wire-movement--in"><b>IN</b>${assets(team.receives,team.picksIn)}</div>`:''}${outgoing?`<div class="wire-movement wire-movement--out"><b>OUT</b>${assets(team.sends,team.picksOut)}</div>`:''}</div>`;
  }).join('');
  return `<article class="wire-card${featured?' wire-card--featured':''}"><div class="wire-card__meta"><span class="wire-type wire-type--${esc(event.type)}">${esc(typeLabel[event.type]||event.type)}</span><span>Week ${esc(event.week||'—')} · ${esc(stamp(event.occurredAt))}</span></div><h3>${esc(event.headline)}</h3><div class="wire-card__teams">${movement}</div>${event.waiverBid!==null?`<small class="wire-bid">Waiver bid: $${esc(event.waiverBid)}</small>`:''}</article>`;
}
function render(){
  const filtered=active==='all'?events:events.filter(event=>event.type===active);
  const list=root.querySelector('#wire-list');
  list.innerHTML=filtered.length?filtered.slice(0,visible).map(event=>card(event)).join(''):'<p class="wire-empty">No completed moves in this category yet.</p>';
  root.querySelectorAll('.wire-portrait img').forEach(img=>{if(!img.complete)img.addEventListener('error',()=>img.remove(),{once:true});else if(!img.naturalWidth)img.remove();});
  const more=root.querySelector('#wire-more');more.hidden=filtered.length<=visible;more.textContent=`Show more · ${filtered.length-visible} remaining`;
  root.querySelectorAll('[data-wire-filter]').forEach(button=>{const selected=button.dataset.wireFilter===active;button.classList.toggle('is-active',selected);button.setAttribute('aria-pressed',String(selected));});
}
async function load(){
  root.innerHTML='<p class="wire-empty">Syncing completed Sleeper transactions…</p>';
  try{
    const response=await fetch(`/api/league/${window.DCC_LEAGUE_ID||'1389344338340761600'}/roster-center?view=transactions`,{cache:'no-store'}),data=await response.json();
    if(!response.ok||!['ready','partial'].includes(data.status))throw Error(data.message||'Transaction feed unavailable');
    events=data.transactions||[];active='all';visible=12;
    const feature=data.latestTrade?`<div class="wire-feature-label">LATEST TRADE · VERIFIED MOVEMENT</div>${card(data.latestTrade,true)}`:'';
    const coverage=data.status==='partial'?'<p class="wire-warning">Some Sleeper weeks could not be loaded. This feed may be incomplete.</p>':'';
    root.innerHTML=`<div class="wire-topline"><p>${esc(data.total)} completed moves · ${esc(data.counts.trade)} trades · ${esc(data.season)} season</p><button class="wire-refresh" type="button">Refresh feed</button></div>${coverage}${feature}<div class="wire-filters" aria-label="Filter transactions"><button type="button" data-wire-filter="all">All</button><button type="button" data-wire-filter="trade">Trades</button><button type="button" data-wire-filter="waiver">Waivers</button><button type="button" data-wire-filter="free_agent">Free agents</button></div><div id="wire-list" class="wire-list" aria-live="polite"></div><button id="wire-more" class="wire-more" type="button" hidden>Show more</button><small class="wire-source">Completed transactions from Sleeper, sorted by completion time. Player movement and traded picks are shown without a trade grade or winner.</small>`;
    root.querySelectorAll('.wire-card--featured .wire-portrait img').forEach(img=>{if(!img.complete)img.addEventListener('error',()=>img.remove(),{once:true});else if(!img.naturalWidth)img.remove();});
    root.querySelector('.wire-refresh').addEventListener('click',load);
    root.querySelector('#wire-more').addEventListener('click',()=>{visible+=12;render();});
    root.querySelectorAll('[data-wire-filter]').forEach(button=>button.addEventListener('click',()=>{active=button.dataset.wireFilter;visible=12;render();}));
    render();
  }catch{root.innerHTML='<p class="wire-empty">Sleeper activity is temporarily unavailable. <button class="wire-refresh" type="button">Try again</button></p>';root.querySelector('button').addEventListener('click',load);}
}
load();
})();
