const leagueId = '1389344338340761600';
const rosters = document.querySelector('#rosters');
const franchiseGrid = document.querySelector('#franchise-grid');
const rankingList = document.querySelector('#ranking-list');
const error = document.querySelector('#error');
const teamsSubtitle = document.querySelector('#teams-subtitle');
const syncStatus = document.querySelector('#sync-status');
const refresh = document.querySelector('#refresh');
const franchiseTemplate = document.querySelector('#franchise-template');

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const initials = name => String(name || 'DCC').split(/\s+/).filter(Boolean).slice(0,2).map(x => x[0]).join('').toUpperCase();
const playerImage = player => player?.id ? `https://sleepercdn.com/content/nfl/players/thumb/${encodeURIComponent(player.id)}.jpg` : '';

function playerRow(player) {
  const row = document.createElement('li');
  row.className = 'player player--visual';
  const image = playerImage(player);
  row.innerHTML = `<div class="player-photo">${image ? `<img src="${image}" alt="" loading="lazy">` : `<span>${esc(player.position || '—')}</span>`}</div><span class="position">${esc(player.position || '—')}</span><span class="player-name">${esc(player.name)}</span><span class="nfl-team">${esc(player.nflTeam || 'FA')}</span>`;
  const img = row.querySelector('img');
  if (img) img.addEventListener('error', () => { img.parentElement.innerHTML = `<span>${esc(player.position || '—')}</span>`; }, { once:true });
  return row;
}

function lineupGroup(title, players, note = '') {
  const details = document.createElement('details');
  details.className = 'roster-group';
  details.open = title === 'Starters';
  const summary = document.createElement('summary');
  summary.innerHTML = `<span>${esc(title)}</span><small>${players.length} players${note ? ` · ${esc(note)}` : ''}</small><b aria-hidden="true">+</b>`;
  const list = document.createElement('ul');
  list.className = 'player-list';
  if (players.length) players.forEach(player => list.append(playerRow(player)));
  else list.innerHTML = '<li class="empty">Sleeper has not recorded players in this group.</li>';
  details.append(summary, list);
  return details;
}

function renderTeam(team, index) {
  const details = document.createElement('details');
  details.className = 'team-accordion';
  details.dataset.teamIndex = index;
  const summary = document.createElement('summary');
  summary.className = 'team-accordion__summary';
  summary.innerHTML = `<div class="team-logo" aria-hidden="true">${esc(initials(team.team))}</div><div class="team-accordion__identity"><span class="team-accordion__eyebrow">FRANCHISE ${String(index + 1).padStart(2,'0')}</span><strong>${esc(team.team)}</strong><small>${esc(team.manager)}</small></div><div class="team-accordion__meta"><span>${team.rosterSize} PLAYERS</span><span class="live-dot">LIVE</span><b class="accordion-chevron" aria-hidden="true">⌄</b></div>`;
  const body = document.createElement('div');
  body.className = 'team-accordion__body';
  const featurePlayers = (team.starters?.length ? team.starters : team.bench || []).slice(0,4);
  const feature = document.createElement('div');
  feature.className = 'featured-players';
  feature.innerHTML = featurePlayers.map(player => `<article class="featured-player"><div class="featured-player__photo">${playerImage(player) ? `<img src="${playerImage(player)}" alt="${esc(player.name)}" loading="lazy">` : `<span>${esc(player.position)}</span>`}</div><div><small>${esc(player.position)} · ${esc(player.nflTeam || 'FA')}</small><strong>${esc(player.name)}</strong></div></article>`).join('');
  feature.querySelectorAll('img').forEach(img => img.addEventListener('error', () => { img.parentElement.innerHTML = '<span>PLAYER</span>'; }, { once:true }));
  const groups = document.createElement('div');
  groups.className = 'roster-groups';
  groups.append(lineupGroup('Starters', team.starters || [], team.startersSubmitted ? '' : 'No lineup submitted'), lineupGroup('Bench', team.bench || []));
  body.append(feature, groups);
  details.append(summary, body);
  details.addEventListener('toggle', () => {
    if (!details.open) return;
    document.querySelectorAll('.team-accordion[open]').forEach(other => { if (other !== details) other.open = false; });
  });
  return details;
}

function renderFranchise(team, index) {
  const node = franchiseTemplate.content.cloneNode(true);
  node.querySelector('.franchise-card__number').textContent = String(index + 1).padStart(2, '0');
  node.querySelector('h3').textContent = team.team;
  node.querySelector('.manager').textContent = team.manager;
  const players = team.starters.slice(0, 3).map(player => player.name);
  node.querySelector('.franchise-card__players').textContent = players.length ? players.join(' · ') : `${team.rosterSize} players on roster`;
  return node;
}

function renderUnrankedTeams(teams) {
  rankingList.replaceChildren(...teams.map((team, index) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${esc(team.team)}</strong><small>UNRANKED</small>`;
    return item;
  }));
}

function updatePulse(data) {
  const teams = data.teams || [];
  const players = teams.reduce((total, team) => total + team.rosterSize, 0);
  const lineups = teams.filter(team => team.startersSubmitted).length;
  document.querySelector('#league-name').textContent = data.league.name || 'Dynasty League';
  document.querySelector('#league-season').textContent = `${data.league.season || 'Current'} season · Sleeper`;
  document.querySelector('#team-count').textContent = teams.length;
  document.querySelector('#player-count').textContent = players;
  document.querySelector('#lineup-count').textContent = `${lineups}/${teams.length}`;
}

function setActiveNavigation() {
  const links = [...document.querySelectorAll('.primary-nav a')];
  const sections = links.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const update = () => {
    const current = sections.reduce((closest, section) => Math.abs(section.getBoundingClientRect().top - 120) < Math.abs(closest.getBoundingClientRect().top - 120) ? section : closest, sections[0]);
    links.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${current.id}`));
  };
  addEventListener('scroll', update, { passive:true });
  update();
}

async function loadRosters() {
  refresh.disabled = true;
  error.hidden = true;
  try {
    const response = await fetch(`/api/league/${leagueId}/roster-center`, { cache:'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sleeper data could not be loaded.');
    const teams = data.teams || [];
    teamsSubtitle.textContent = `${data.league.name || 'League'} · ${data.league.season || 'Current season'} · ${teams.length} teams`;
    syncStatus.textContent = `Synced ${new Date(data.syncedAt).toLocaleString()}`;
    updatePulse(data);
    franchiseGrid.replaceChildren(...teams.map(renderFranchise));
    renderUnrankedTeams(teams);
    rosters.replaceChildren(...teams.map(renderTeam));
  } catch (cause) {
    error.textContent = `Live roster data is temporarily unavailable: ${cause.message}`;
    error.hidden = false;
    syncStatus.textContent = 'Live roster data unavailable';
  } finally { refresh.disabled = false; }
}

refresh.addEventListener('click', loadRosters);
setActiveNavigation();
loadRosters();
