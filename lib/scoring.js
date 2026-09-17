// Dynasty Command Center deterministic scoring foundation.
// This module contains no player rankings, age adjustments, projections, or AI judgment.
// A player's score is the sum of recorded statistics multiplied by the league's scoring settings.

const STAT_ALIASES = {
  pass_yd: ['pass_yd', 'pass_yds'],
  pass_td: ['pass_td'],
  pass_2pt: ['pass_2pt', 'pass_2pt_conv'],
  pass_int: ['pass_int', 'int'],
  rush_yd: ['rush_yd', 'rush_yds'],
  rush_td: ['rush_td'],
  rush_2pt: ['rush_2pt', 'rush_2pt_conv'],
  rec: ['rec'],
  rec_yd: ['rec_yd', 'rec_yds'],
  rec_td: ['rec_td'],
  rec_2pt: ['rec_2pt', 'rec_2pt_conv'],
  fum_lost: ['fum_lost']
};

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function statValue(stats, aliases) {
  for (const key of aliases) {
    if (stats?.[key] !== undefined && stats?.[key] !== null) return finiteNumber(stats[key]);
  }
  return 0;
}

export function scoreStatLine(stats = {}, scoringSettings = {}) {
  let total = 0;
  const breakdown = [];

  for (const [scoringKey, aliases] of Object.entries(STAT_ALIASES)) {
    const value = statValue(stats, aliases);
    const multiplier = finiteNumber(scoringSettings[scoringKey]);
    if (!value || !multiplier) continue;
    const points = value * multiplier;
    total += points;
    breakdown.push({ stat: scoringKey, value, multiplier, points });
  }

  return {
    points: Math.round((total + Number.EPSILON) * 100) / 100,
    breakdown,
    method: 'recorded-stats × Sleeper league scoring_settings'
  };
}

export function aggregateSeason(weeklyStats = [], scoringSettings = {}) {
  const byPlayer = new Map();

  for (const week of weeklyStats) {
    const weekNumber = Number(week?.week);
    for (const [playerId, stats] of Object.entries(week?.players || {})) {
      const scored = scoreStatLine(stats, scoringSettings);
      const current = byPlayer.get(playerId) || { playerId, seasonPoints: 0, weeks: [] };
      current.seasonPoints += scored.points;
      current.weeks.push({ week: weekNumber, points: scored.points });
      byPlayer.set(playerId, current);
    }
  }

  return Object.fromEntries([...byPlayer.entries()].map(([playerId, row]) => [playerId, {
    ...row,
    seasonPoints: Math.round((row.seasonPoints + Number.EPSILON) * 100) / 100
  }]));
}

export function validateStarterTotal({ starterIds = [], playerPoints = {}, officialPoints, tolerance = 0.05 }) {
  const calculatedPoints = starterIds.reduce((sum, playerId) => {
    const row = playerPoints[String(playerId)] ?? playerPoints[playerId];
    const points = typeof row === 'number' ? row : row?.points ?? row?.weekPoints ?? 0;
    return sum + finiteNumber(points);
  }, 0);

  const calculated = Math.round((calculatedPoints + Number.EPSILON) * 100) / 100;
  const official = finiteNumber(officialPoints);
  const delta = Math.round((calculated - official + Number.EPSILON) * 100) / 100;

  return {
    valid: Math.abs(delta) <= tolerance,
    calculatedPoints: calculated,
    officialPoints: official,
    delta,
    tolerance,
    method: 'sum of calculated starter points compared with Sleeper matchup points'
  };
}

export const scoringProvenance = Object.freeze({
  classification: 'deterministic',
  sourceOfRules: 'Sleeper league scoring_settings',
  aiAdjusted: false,
  projectionAdjusted: false,
  rankAdjusted: false,
  ageAdjusted: false
});
