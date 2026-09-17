// Run a real DCC scoring reconciliation against one completed league week.
// Usage: node scripts/verify-scoring-week.js [leagueId] [week]

import { reconcileLeagueWeek } from '../lib/scoring-reconciliation.js';

const leagueId = process.argv[2] || process.env.LEAGUE_ID || '1389344338340761600';
const week = Number(process.argv[3] || process.env.WEEK || 1);

try {
  const report = await reconcileLeagueWeek({ leagueId, week });
  const printable = {
    leagueId: report.leagueId,
    season: report.season,
    week: report.week,
    status: report.status,
    eligibleForDccScoring: report.eligibleForDccScoring,
    rosterCount: report.rosterCount,
    passed: report.passed,
    failed: report.failed,
    tolerance: report.tolerance,
    rosters: report.rosters,
    provenance: report.provenance
  };
  console.log(JSON.stringify(printable, null, 2));
  process.exitCode = report.eligibleForDccScoring ? 0 : 2;
} catch (error) {
  console.error(JSON.stringify({
    status: 'error',
    leagueId: String(leagueId),
    week,
    message: error?.message || String(error)
  }, null, 2));
  process.exitCode = 1;
}
