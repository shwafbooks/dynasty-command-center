// Sleeper scoring data adapter for Dynasty Command Center.
//
// IMPORTANT: Sleeper's /stats endpoint is useful but is not part of Sleeper's
// officially documented public API. Keep all dependence on it isolated here so
// DCC can replace the source without changing the deterministic scoring engine.

const DEFAULT_API = 'https://api.sleeper.app/v1';

async function getJson(url, fetchImpl = fetch) {
  const response = await fetchImpl(url, {
    headers: { 'User-Agent': 'DynastyCommandCenter/scoring-validation' }
  });
  if (!response.ok) throw new Error(`Sleeper ${response.status} on ${url}`);
  return response.json();
}

export async function getNFLState({ api = DEFAULT_API, fetchImpl = fetch } = {}) {
  return getJson(`${api}/state/nfl`, fetchImpl);
}

export async function getLeagueScoringSettings(leagueId, { api = DEFAULT_API, fetchImpl = fetch } = {}) {
  const league = await getJson(`${api}/league/${leagueId}`, fetchImpl);
  return {
    leagueId: String(leagueId),
    season: Number(league.season),
    scoringSettings: league.scoring_settings || {},
    rosterPositions: league.roster_positions || [],
    source: 'Sleeper league endpoint (documented)'
  };
}

export async function getLeagueMatchups(leagueId, week, { api = DEFAULT_API, fetchImpl = fetch } = {}) {
  const rows = await getJson(`${api}/league/${leagueId}/matchups/${Number(week)}`, fetchImpl);
  return Array.isArray(rows) ? rows : [];
}

export async function getWeeklyPlayerStats(season, week, { api = DEFAULT_API, fetchImpl = fetch } = {}) {
  const players = await getJson(`${api}/stats/nfl/regular/${Number(season)}/${Number(week)}`, fetchImpl);
  return {
    season: Number(season),
    week: Number(week),
    players: players && typeof players === 'object' ? players : {},
    source: 'Sleeper /stats endpoint (undocumented)',
    supportedBySleeperPublicDocs: false
  };
}

export async function getSeasonPlayerStats(season, { api = DEFAULT_API, fetchImpl = fetch } = {}) {
  const players = await getJson(`${api}/stats/nfl/regular/${Number(season)}`, fetchImpl);
  return {
    season: Number(season),
    players: players && typeof players === 'object' ? players : {},
    source: 'Sleeper /stats endpoint (undocumented)',
    supportedBySleeperPublicDocs: false
  };
}

export const sleeperScoringSourceProvenance = Object.freeze({
  leagueRules: 'documented Sleeper API',
  matchupTotals: 'documented Sleeper API',
  playerStats: 'undocumented Sleeper endpoint',
  requiresValidation: true
});
