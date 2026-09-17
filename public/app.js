const leagueId = '1389344338340761600';
const rosters = document.querySelector('#rosters');
const franchiseGrid = document.querySelector('#franchise-grid');
const rankingList = document.querySelector('#ranking-list');
const error = document.querySelector('#error');
const teamsSubtitle = document.querySelector('#teams-subtitle');
const syncStatus = document.querySelector('#sync-status');
const refresh = document.querySelector('#refresh');
const teamTemplate = document.querySelector('#team-template');
const franchiseTemplate = document.querySelector('#franchise-template');

function playerRow(player) {
  const row = document.createElement('li');
  row.className = 'player';
  row.innerHTML = `<span class="position">${player.position}</span><span class="player-name">${player.name}</span><span class="nfl-team">${player.nflTeam || '—'}</span>`;
  return row;
}

function renderTeam(team) {
  const node = teamTemplate.content.cloneNode(true);
  node.querySelector('h3').textContent = team.team;
  node.querySelector('.manager').textContent = team.manager;
  node.querySelector('.roster-count').textContent = `${team.rosterSize} players`;
  const starters = node.querySelector('.starters');
  const starterNote = node.querySelector('.starter-note');
  if (team.startersSubmitted) team.starters.forEach(player => starters.append(playerRow(player)));
  else {
    starterNote.textContent = 'No Sleeper lineup submitted';
    starters.innerHTML = '<li class="empty">Sleeper has not recorded a starting lineup for this roster.</li>';
  }
  team.bench.forEach(player => node.querySelector('.bench').append(playerRow(player)));
  return node;
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
    item.innerHTML = `<span>${String(index + 1).padStart(2, '0')}</span><strong>${team.team}</strong><small>UNRANKED</small>`;
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
  addEventListener('scroll', update, { passive: true });
  update();
}

async function loadRosters() {
  refresh.disabled = true;
  error.hidden = true;
  try {
    const response = await fetch(`/api/league/${leagueId}/roster-center`, { cache: 'no-store' });
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
  } finally {
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', loadRosters);
setActiveNavigation();
loadRosters();
