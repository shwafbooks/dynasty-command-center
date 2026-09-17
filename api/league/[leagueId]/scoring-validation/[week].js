import { reconcileLeagueWeek } from '../../../../lib/scoring-reconciliation.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export default {
  async fetch(request) {
    try {
      const url = new URL(request.url);
      const parts = url.pathname.split('/').filter(Boolean);
      const leagueIndex = parts.indexOf('league');
      const validationIndex = parts.indexOf('scoring-validation');
      const leagueId = leagueIndex >= 0 ? parts[leagueIndex + 1] : null;
      const week = validationIndex >= 0 ? Number(parts[validationIndex + 1]) : NaN;

      if (!leagueId || !Number.isInteger(week) || week < 1) {
        return json({
          status: 'error',
          message: 'Expected /api/league/:leagueId/scoring-validation/:week'
        }, 400);
      }

      const report = await reconcileLeagueWeek({ leagueId, week });

      // Diagnostic endpoint intentionally returns validation evidence only.
      // Individual player points remain behind the verification gate and are
      // not exposed here until the scoring pipeline has been proven reliable.
      const { playerPoints, ...safeReport } = report;
      return json(safeReport, report.eligibleForDccScoring ? 200 : 422);
    } catch (error) {
      return json({
        status: 'error',
        eligibleForDccScoring: false,
        message: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  }
};
