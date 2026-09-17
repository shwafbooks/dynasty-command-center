// Dynasty Command Center Team Intelligence foundation.
//
// This module derives team production facts from VERIFIED DCC scoring only.
// It does not rank players, project future performance, or use AI judgment.

const CORE_POSITIONS = ['QB', 'RB', 'WR', 'TE'];

function round(value) {
  return Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
}

function positionOf(player = {}) {
  return String(player.position || player.fantasyPosition || '').toUpperCase();
}

export function buildTeamProductionProfile({ team, seasonPlayers = {}, verifiedWeeks = [] }) {
  if (!team) throw new Error('team is required');
  const roster = [...(team.starters || []), ...(team.bench || [])];
  const seen = new Set();
  const players = [];

  for (const player of roster) {
    const playerId = String(player?.id || player?.playerId || '');
    if (!playerId || seen.has(playerId)) continue;
    seen.add(playerId);
    const scored = seasonPlayers[playerId];
    const position = positionOf(player);
    players.push({
      playerId,
      name: player.fullName || player.name || player.playerName || playerId,
      position,
      nflTeam: player.team || player.nflTeam || null,
      seasonPoints: scored ? round(scored.points) : 0,
      verifiedWeekCount: scored?.verifiedWeekCount || 0,
      hasVerifiedScoring: Boolean(scored)
    });
  }

  players.sort((a, b) => b.seasonPoints - a.seasonPoints || a.name.localeCompare(b.name));
  const byPosition = Object.fromEntries(CORE_POSITIONS.map(position => {
    const group = players.filter(player => player.position === position);
    return [position, {
      position,
      rosterCount: group.length,
      seasonPoints: round(group.reduce((sum, player) => sum + player.seasonPoints, 0)),
      scoringPlayers: group.filter(player => player.hasVerifiedScoring).length,
      players: group
    }];
  }));

  return {
    rosterId: team.rosterId,
    team: team.team,
    manager: team.manager,
    verifiedWeeks: [...verifiedWeeks],
    verifiedWeekCount: verifiedWeeks.length,
    totalRosterPoints: round(players.reduce((sum, player) => sum + player.seasonPoints, 0)),
    positions: byPosition,
    topScorers: players.filter(player => player.hasVerifiedScoring).slice(0, 5),
    completeness: verifiedWeeks.length ? 'verified-weeks-only' : 'insufficient-data',
    provenance: {
      classification: 'deterministic roster production profile',
      scoringInput: 'DCC verified season scoring only',
      formula: 'sum verified player fantasy points currently on roster, grouped by listed position',
      caveat: 'Roster production is not a historical points-for measure because current rosters may include players acquired after earlier verified weeks.',
      aiAdjusted: false,
      projectionAdjusted: false,
      marketValueAdjusted: false
    }
  };
}

export function buildLeagueTeamIntelligence({ teams = [], seasonScoring }) {
  if (!seasonScoring) throw new Error('seasonScoring is required');
  const verifiedWeeks = seasonScoring.verifiedWeeks || [];
  return {
    status: verifiedWeeks.length ? 'verified-production' : 'insufficient-data',
    verifiedWeeks,
    excludedWeeks: seasonScoring.excludedWeeks || [],
    teams: teams.map(team => buildTeamProductionProfile({
      team,
      seasonPlayers: seasonScoring.players || {},
      verifiedWeeks
    })),
    provenance: {
      classification: 'Team Intelligence foundation',
      comparisonPolicy: 'No strength ranking is emitted by this module. It publishes auditable production inputs first.',
      aiAdjusted: false
    }
  };
}
