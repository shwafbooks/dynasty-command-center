const leagueId = '1389344338340761600';
const rosters = document.querySelector('#rosters');
const error = document.querySelector('#error');
const subtitle = document.querySelector('#subtitle');
const syncStatus = document.querySelector('#sync-status');
const refresh = document.querySelector('#refresh');
const template = document.querySelector('#team-template');

function playerRow(player) {
  const row = document.createElement('li');
  row.className = 'player';
  row.innerHTML = `<span class="position">${player.position}</span><span class="player-name">${player.name}</span><span class="nfl-team">${player.nflTeam}</span>`;
  return row;
}

function renderTeam(team) {
  const node = template.content.cloneNode(true);
  node.querySelector('h2').textContent = team.team;
  node.querySelector('.manager').textContent = team.manager;
  node.querySelector('.roster-count').textContent = `${team.rosterSize} players`;
  const starters = node.querySelector('.starters');
  const starterNote = node.querySelector('.starter-note');
  if (team.startersSubmitted) {
    team.starters.forEach(player => starters.append(playerRow(player)));
  } else {
    starterNote.textContent = 'No Sleeper lineup submitted';
    starters.innerHTML = '<li class="empty">Sleeper has not recorded a starting lineup for this roster.</li>';
  }
  team.bench.forEach(player => node.querySelector('.bench').append(playerRow(player)));
  return node;
}

async function loadRosters() {
  refresh.disabled = true;
  error.hidden = true;
  try {
    const response = await fetch(`/api/league/${leagueId}/roster-center`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Sleeper data could not be loaded.');
    subtitle.textContent = `${data.league.name || 'League'} · ${data.league.season} · ${data.teams.length} teams`;
    syncStatus.textContent = `Synced ${new Date(data.syncedAt).toLocaleString()}`;
    rosters.replaceChildren(...data.teams.map(renderTeam));
  } catch (cause) {
    error.textContent = `Live roster data is temporarily unavailable: ${cause.message}`;
    error.hidden = false;
  } finally {
    refresh.disabled = false;
  }
}

refresh.addEventListener('click', loadRosters);
loadRosters();
