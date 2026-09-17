# DCC Multi-Source Intelligence Architecture

DCC must not copy one calculator. It should extract useful evidence from multiple independent methodologies, preserve provenance, and calculate its own transparent league-specific outputs.

## Evidence families

### 1. Community sentiment
Example: KeepTradeCut crowdsourced values.
Useful for: fast-moving perception, rookies, breaking news, market momentum.
Risk: popularity/sentiment can move faster than actual trade behavior.

### 2. Observed trade market
Example: FantasyCalc real-trade-derived values; KTC tradesourced values.
Useful for: what managers actually exchange in real leagues, actionable market prices.
Risk: sparse trade volume for some players and slower response to news.

### 3. Expert consensus
Example: FantasyPros ECR as transformed by DynastyProcess.
Useful for: independent expert-ranking signal and another view of long-term player quality.
Risk: expert consensus is still opinion and may update less rapidly than market data.

### 4. League-specific verified performance
Source: DCC deterministic scoring reconciled to Sleeper matchup totals.
Useful for: what players actually produced under this league's exact scoring rules.
Risk: past production is not future dynasty value.

### 5. League-specific roster context
Source: Sleeper rosters, lineup requirements, transactions and eventually history.
Useful for: scarcity, lineup fit, depth, handcuffs, surplus/need, trade-partner matching.
Risk: context must never silently change the underlying external market values.

## Features worth learning from

- KTC: crowd + trade source selection, player/pick trends, league landscape, positional roster comparisons, recent trade database, configurable league size/TE premium/future picks.
- FantasyCalc: values learned from large numbers of real completed trades with recency weighting; searchable trade evidence.
- DynastyProcess: explicit controls for QB format, league size, depth/star preference, rookie optimism and future-pick discount; open-data mindset.

DCC should reproduce concepts only through our own implementation and formulas, not copy proprietary code, text, branding, or hidden algorithms.

## Provider contract

Every external provider adapter should return:

- provider ID and methodology family
- source timestamp
- source format (1QB/SF, PPR setting, TEP, league size when known)
- player ID/name/position
- raw provider value/rank
- match method to Sleeper ID
- coverage and ambiguity report
- license/usage note when known

Raw provider values stay raw. Provider-specific normalization happens in a separate versioned layer.

## Consensus rule

DCC should not average raw numbers from different scales. First convert each provider into a comparable league-relative signal (for example percentile or normalized rank within position/overall). Then publish:

1. each provider independently,
2. provider agreement/disagreement,
3. a versioned DCC consensus only when minimum-source coverage is met.

Initial publication gate proposal:

- at least 2 independent external methodology families for a player before publishing DCC Market Consensus;
- no invented value for missing providers;
- source coverage displayed;
- consensus formula and weights visible;
- no AI adjustment to numeric values;
- AI may explain why sources disagree but cannot change the score.

## Trade calculator direction

DCC Trade Center should eventually combine distinct evidence rather than one magic value:

- Market Consensus: what the wider dynasty market says.
- League Fit: how the assets affect this exact roster and lineup.
- Production: verified performance under exact league scoring.
- Liquidity: breadth/consistency of market evidence and source agreement.
- Historical league behavior: what this league/managers have actually traded for, once enough history exists.

The calculator must expose these separately before any combined DCC trade result. This prevents a contextual roster need from being disguised as a universal player-value change.

## Non-negotiable rule

**DCC doesn't pick favorites. Sources provide evidence; deterministic formulas produce results; DCC explains them.**
