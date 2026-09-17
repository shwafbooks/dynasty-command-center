// Dynasty Command Center scoring reconciliation.
//
// A scoring result is not trusted because DCC calculated it. It becomes eligible
// for downstream use only when calculated starter totals reconcile with Sleeper's
// official matchup totals within the configured tolerance.

import { scoreStatLine, validateStarterTotal, scoringProvenance } from './scoring.js';
import {
  getLeagueScoringSettings,
  getLeagueMatchups,
  getWeeklyPlayerStats,
  sleeperScoringSourceProvenance
} from './sleeper-scoring-source.js';

function weeklyPointsByPlayer(players = {}, scoringSettings = {}) {
  return Object.fromEntries(
    Object.entries(players).map(([playerId, stats]) => {
      const scored = scoreStatLine(stats, scoringSettings);
      return [String(playerId), { points: scored.points, breakdown: scored.breakdown }];
    })
  );
}

export async function reconcileLeagueWeek({
  leagueId,
  week,
  tolerance = 0.05,
  api,
  fetchImpl = fetch
}) {
  if (!leagueId) throw new Error('leagueId is required');
  if (!Number.isInteger(Number(week)) || Number(week) < 1) throw new Error('week must be a positive integer');

  const league = await getLeagueScoringSettings(leagueId, { api, fetchImpl });
  const [matchups, statFeed] = await Promise.all([
    getLeagueMatchups(leagueId, week, { api, fetchImpl }),
    getWeeklyPlayerStats(league.season, week, { api, fetchImpl })
  ]);

  const playerPoints = weeklyPointsByPlayer(statFeed.players, league.scoringSettings);
  const rosters = matchups.map(row => {
    const validation = validateStarterTotal({
      starterIds: row.starters || [],
      playerPoints,
      officialPoints: row.points,
      tolerance
    });

    return {
      rosterId: row.roster_id,
      matchupId: row.matchup_id,
      starterCount: (row.starters || []).filter(Boolean).length,
      ...validation
    };
  });

  const passed = rosters.filter(row => row.valid).length;
  const failed = rosters.length - passed;
  const allValid = rosters.length > 0 && failed === 0;

  return {
    leagueId: String(leagueId),
    season: league.season,
    week: Number(week),
    status: allValid ? 'verified' : 'unverified',
    eligibleForDccScoring: allValid,
    rosterCount: rosters.length,
    passed,
    failed,
    tolerance,
    rosters,
    playerPoints: allValid ? playerPoints : null,
    provenance: {
      scoring: scoringProvenance,
      source: sleeperScoringSourceProvenance,
      validation: 'calculated starter totals vs Sleeper official matchup points',
      policy: 'player scoring is withheld unless every roster in the requested week validates'
    }
  };
}
