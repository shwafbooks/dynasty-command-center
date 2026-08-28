# Dynasty Command Center V20.2

A league-specific dynasty fantasy football front office built around Sleeper read-only data, roster-aware analytics, trade intelligence, storytelling, and an AI media personality.

## V20 highlights
- Front Office Brief: one-screen daily strategic briefing with projected leader, positional pressure, league board, action items, and data-quality disclosure.
- Trade Dossier API: package-trade analysis plus negotiation framing, leverage, questions, confidence, and walk-away guidance.
- League Feed / Headlines / Story / Trade Room / Prediction Ledger carried forward.
- Mock Trade Lab remains simulation-only and never writes to Sleeper.
- Transaction impact tiers keep routine moves from drowning out meaningful events.
- Clear separation between analytics as numerical source of truth and AI as commentary/storytelling.

## Research-informed product principles
1. Do not compete on a generic player-value number alone.
2. Make valuation league-, roster-, and manager-context aware.
3. Optimize for two-sided trades, not just extracting value.
4. Track predictions so the model can be held accountable.
5. Make meaningful league events visible, discussable, and historically persistent.
6. Show data freshness and confidence so managers know what is model baseline vs. confirmed league fact.

## Sleeper note
Sleeper documents its API as read-only and free for non-commercial use; commercial use requires contacting Sleeper about licensing. Respect their API rate guidance and licensing requirements before public/commercial deployment.

## Easiest Windows launch — no command line required

Double-click **START-DYNASTY-COMMAND-CENTER.bat**. It checks for Node.js, attempts to install the Node.js LTS runtime with Windows Package Manager if needed, starts the app, and opens the browser automatically.

The launcher is preconfigured for Sleeper league **1389344338340761600**.

## Manual run
```bash
npm start
```
Then open http://localhost:3000.

## Integration check
With the server running, open a second terminal and run:
```bash
npm run smoke
```
The live check requires outbound HTTPS access to Sleeper.

## Configuration
- `LEAGUE_ID` defaults to `1389344338340761600` (your league).
- `SLEEPER_API_BASE` defaults to `https://api.sleeper.app/v1`.
- `PORT` defaults to `3000`.

Optional environment variables:
- `PORT`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

If no AI key is configured, the site uses its local Commissioner fallback.


## V20 highlights
- Trade Room 2.0 negotiation dossier
- Roster-fit and leverage framing before an offer is sent
- Counteroffer and walk-away guidance
- Commissioner message drafting from supplied dossier context
- Private local deal board for saved negotiations
- V20 UI focused on making trades feel consequential
