// Verified season scoring aggregation for Dynasty Command Center.
//
// Only weeks that pass DCC's reconciliation gate are allowed into season totals.
// A failed/unavailable week is reported and excluded; it is never estimated.

import { reconcileLeagueWeek } from './scoring-reconciliation.js';

function addPlayerWeek(totals, playerId, points, week) {
  const id = String(playerId);
  const current = totals[id] || { playerId: id, points: 0, weeks: [] };
  current.points = Math.round((current.points + Number(points || 0)) * 100) / 100;
  current.weeks.push({ week: Number(week), points: Number(points || 0) });
  totals[id] = current;
}

export async function buildVerifiedSeasonScoring({
  leagueId,
  throughWeek,
  startWeek = 1,
  tolerance = 0.05,
  api,
  fetchImpl = fetch
}) {
  if (!leagueId) throw new Error('leagueId is required');
  const first = Number(startWeek);
  const last = Number(throughWeek);
  if (!Number.isInteger(first) || first < 1) throw new Error('startWeek must be a positive integer');
  if (!Number.isInteger(last) || last < first) throw new Error('throughWeek must be >= startWeek');

  const totals = {};
  const weeks = [];

  // Run sequentially to avoid hammering Sleeper and to keep diagnostics ordered.
  for (let week = first; week <= last; week += 1) {
    try {
      const report = await reconcileLeagueWeek({ leagueId, week, tolerance, api, fetchImpl });
      weeks.push({
        week,
        status: report.status,
        eligibleForDccScoring: report.eligibleForDccScoring,
        passed: report.passed,
        failed: report.failed,
        rosterCount: report.rosterCount
      });

      if (!report.eligibleForDccScoring || !report.playerPoints) continue;
      for (const [playerId, scored] of Object.entries(report.playerPoints)) {
        addPlayerWeek(totals, playerId, scored.points, week);
      }
    } catch (error) {
      weeks.push({
        week,
        status: 'unavailable',
        eligibleForDccScoring: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  const verifiedWeeks = weeks.filter(row => row.eligibleForDccScoring).map(row => row.week);
  const excludedWeeks = weeks.filter(row => !row.eligibleForDccScoring).map(row => row.week);
  const players = Object.fromEntries(
    Object.entries(totals).map(([playerId, row]) => [playerId, {
      ...row,
      points: Math.round(row.points * 100) / 100,
      verifiedWeekCount: row.weeks.length
    }])
  );

  return {
    leagueId: String(leagueId),
    requestedWeeks: { start: first, through: last },
    status: excludedWeeks.length === 0 ? 'verified' : verifiedWeeks.length ? 'partial' : 'unverified',
    complete: excludedWeeks.length === 0,
    verifiedWeeks,
    excludedWeeks,
    weeks,
    players,
    provenance: {
      classification: 'deterministic verified season aggregation',
      policy: 'only reconciled weeks are included; failed or unavailable weeks are excluded, never estimated',
      aiAdjusted: false,
      projectionAdjusted: false
    }
  };
}
