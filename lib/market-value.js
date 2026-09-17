// External dynasty market-value adapter for Dynasty Command Center.
//
// This module does NOT scrape, estimate, or invent market values. It accepts a
// dated external snapshot and matches it to the current Sleeper roster. Keeping
// ingestion separate lets DCC change providers without changing downstream
// Team Intelligence formulas.

export const MARKET_VALUE_ADAPTER_VERSION = 'external-market-value-v1';

const clean = value => String(value ?? '').trim();
const normalizeName = value => clean(value)
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/\b(jr|sr|ii|iii|iv)\b\.?/g, '')
  .replace(/[^a-z0-9]/g, '');

function rosterPlayers(teams = []) {
  const players = new Map();
  for (const team of teams) {
    for (const player of [...(team.starters || []), ...(team.bench || [])]) {
      const sleeperId = clean(player?.id || player?.playerId);
      if (!sleeperId || players.has(sleeperId)) continue;
      players.set(sleeperId, {
        sleeperId,
        name: clean(player?.name || player?.fullName || sleeperId),
        position: clean(player?.position || player?.fantasyPosition).toUpperCase(),
        nflTeam: clean(player?.team || player?.nflTeam).toUpperCase() || null
      });
    }
  }
  return [...players.values()];
}

function validateSnapshot(snapshot = {}) {
  if (!clean(snapshot.source)) throw new Error('Market snapshot requires source');
  if (!clean(snapshot.asOf)) throw new Error('Market snapshot requires asOf timestamp/date');
  if (!Array.isArray(snapshot.players)) throw new Error('Market snapshot requires players array');
  return {
    source: clean(snapshot.source),
    asOf: clean(snapshot.asOf),
    format: snapshot.format || null,
    sourceUrl: snapshot.sourceUrl || null,
    players: snapshot.players
  };
}

export function matchExternalMarketValues({ teams = [], snapshot = {} }) {
  const source = validateSnapshot(snapshot);
  const roster = rosterPlayers(teams);
  const bySleeperId = new Map();
  const byName = new Map();

  for (const row of source.players) {
    const value = Number(row?.value);
    if (!Number.isFinite(value) || value < 0) continue;
    const record = {
      externalId: clean(row?.id) || null,
      sleeperId: clean(row?.sleeperId) || null,
      name: clean(row?.name),
      position: clean(row?.position).toUpperCase() || null,
      value,
      rank: Number.isFinite(Number(row?.rank)) ? Number(row.rank) : null
    };
    if (record.sleeperId) bySleeperId.set(record.sleeperId, record);
    const key = normalizeName(record.name);
    if (key) {
      const list = byName.get(key) || [];
      list.push(record);
      byName.set(key, list);
    }
  }

  const values = {};
  const unmatched = [];
  const ambiguous = [];

  for (const player of roster) {
    let match = bySleeperId.get(player.sleeperId) || null;
    let method = match ? 'sleeper-id' : null;
    if (!match) {
      let candidates = byName.get(normalizeName(player.name)) || [];
      if (player.position) candidates = candidates.filter(row => !row.position || row.position === player.position);
      if (candidates.length === 1) {
        match = candidates[0];
        method = 'normalized-name-position';
      } else if (candidates.length > 1) {
        ambiguous.push({ ...player, candidateCount: candidates.length });
        continue;
      }
    }
    if (!match) {
      unmatched.push(player);
      continue;
    }
    values[player.sleeperId] = {
      sleeperId: player.sleeperId,
      name: player.name,
      position: player.position,
      value: match.value,
      externalRank: match.rank,
      matchMethod: method
    };
  }

  const matchedCount = Object.keys(values).length;
  const rosterPlayerCount = roster.length;
  return {
    status: rosterPlayerCount && matchedCount === rosterPlayerCount && !ambiguous.length ? 'complete' : matchedCount ? 'partial' : 'unavailable',
    adapterVersion: MARKET_VALUE_ADAPTER_VERSION,
    source: { source: source.source, asOf: source.asOf, format: source.format, sourceUrl: source.sourceUrl },
    coverage: {
      rosterPlayerCount,
      matchedCount,
      unmatchedCount: unmatched.length,
      ambiguousCount: ambiguous.length,
      matchedPercent: rosterPlayerCount ? Math.round((matchedCount / rosterPlayerCount) * 10000) / 100 : 0
    },
    values,
    unmatched,
    ambiguous,
    provenance: {
      classification: 'external market value, not DCC player grade',
      matchingPolicy: 'Sleeper player ID first; otherwise unique normalized name plus position',
      excluded: ['AI valuation', 'manual value adjustment', 'age adjustment', 'projection adjustment'],
      publicationPolicy: 'Unmatched or ambiguous players receive no market value. DCC never fills missing values.'
    }
  };
}
