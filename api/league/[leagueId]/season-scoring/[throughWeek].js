import { buildVerifiedSeasonScoring } from '../../../../lib/season-scoring.js';

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
      const scoringIndex = parts.indexOf('season-scoring');
      const leagueId = leagueIndex >= 0 ? parts[leagueIndex + 1] : null;
      const throughWeek = scoringIndex >= 0 ? Number(parts[scoringIndex + 1]) : NaN;

      if (!leagueId || !Number.isInteger(throughWeek) || throughWeek < 1) {
        return json({
          status: 'error',
          message: 'Expected /api/league/:leagueId/season-scoring/:throughWeek'
        }, 400);
      }

      const report = await buildVerifiedSeasonScoring({ leagueId, throughWeek });
      return json(report, report.status === 'unverified' ? 422 : 200);
    } catch (error) {
      return json({
        status: 'error',
        complete: false,
        message: error instanceof Error ? error.message : String(error)
      }, 500);
    }
  }
};
