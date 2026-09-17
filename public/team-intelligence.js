// Isolated Team Intelligence UI for the preview Teams workspace.
// Reads only the verified Team Intelligence API; never invents a rating when data is unavailable.

(() => {
  const POSITIONS = ['QB','RB','WR','TE'];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let report = null;
  let throughWeek = null;

  function positionCard(row) {
    const players = (row?.players || []).filter(player => player.hasVerifiedScoring).slice(0,3);
    return `<article class="ti-position-card">
      <div class="ti-position-card__top"><span>${esc(row?.position || '—')}</span><strong>${Number(row?.seasonPoints || 0).toFixed(1)}</strong></div>
      <small>verified roster pts · ${Number(row?.scoringPlayers || 0)}/${Number(row?.rosterCount || 0)} scoring</small>
      <div class="ti-position-card__players">${players.length ? players.map(player => `<span>${esc(player.name)} <b>${Number(player.seasonPoints || 0).toFixed(1)}</b></span>`).join('') : '<span>Insufficient verified production</span>'}</div>
    </article>`;
  }

  function panel(team) {
    const intelligence = (report?.teams || []).find(row => String(row.rosterId) === String(team.rosterId));
    const section = document.createElement('section');
    section.className = 'team-intelligence-panel';
    if (!intelligence) {
      section.innerHTML = '<div class="ti-heading"><div><span class="team-accordion__eyebrow">TEAM INTELLIGENCE</span><h4>Verified Production</h4></div><small>Insufficient data</small></div><p class="ti-empty">DCC will publish this profile only when verified scoring is available.</p>';
      return section;
    }
    section.innerHTML = `<div class="ti-heading"><div><span class="team-accordion__eyebrow">TEAM INTELLIGENCE · V1</span><h4>Verified Positional Production</h4></div><small>Through Week ${esc(throughWeek)} · deterministic</small></div>
      <div class="ti-position-grid">${POSITIONS.map(position => positionCard(intelligence.positions?.[position])).join('')}</div>
      <div class="ti-audit"><strong>${Number(intelligence.totalRosterPoints || 0).toFixed(1)} verified roster points</strong><span>Current-roster production only · not historical points-for</span><details><summary>How DCC calculated this</summary><p>For every player currently on this roster, DCC sums fantasy points from weeks that passed the league-wide Sleeper reconciliation gate, then groups those verified points by the player's listed position. No projections, age adjustments, market values, or AI ratings are used.</p></details></div>`;
    return section;
  }

  async function load(week) {
    throughWeek = Number(week);
    if (!Number.isInteger(throughWeek) || throughWeek < 1) { report = null; return null; }
    try {
      const response = await fetch(`/api/league/${window.DCC_LEAGUE_ID || '1389344338340761600'}/team-intelligence/${throughWeek}`, {cache:'no-store'});
      const data = await response.json();
      report = response.ok && data.status === 'verified-production' ? data : null;
      return report;
    } catch { report = null; return null; }
  }

  window.DCCTeamIntelligence = { load, panel };
})();
