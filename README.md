# ScoutScope — VALORANT Tactical Scouting for Cloud9 Coaches

**Category 1** · Cloud9 × JetBrains: Sky's the Limit Hackathon 2026
**Prize track:** Best of Category 1 — VALORANT Tactical Scouting, Utility Placement & Operator Profiler ($6,000 + GDC trip)
**Built with:** JetBrains **IntelliJ IDEA 2025.3 (free core)** — see [JETBRAINS.md](JETBRAINS.md)

ScoutScope turns opponent match data into visual, coach-ready tactical
insights. Before every match, coaches spend hours scrubbing VODs to track
where opponents place trapwires or where their star Duelist sets up with a
sniper. ScoutScope answers those questions in one glance: clear heatmaps with
hard numbers, an Operator tendency profiler, and data-backed anti-strats.

## What it does

- **Overview** — the top 5 tendencies for the selected opponent + map, each
  with its sample size ("Trapwire at B Main — 80% of defensive rounds,
  16 placements in 20 rounds analysed"), plus an Operator snapshot.
- **Utility Heatmap** — every ability placement plotted on an original
  schematic map, with a density heat overlay and a frequency table
  ("75/100 rounds" style hard numbers). Filter by opponent, map, player,
  agent, ability, utility type and side.
- **Operator Profiler** — who buys the Operator, how often, aggressive vs.
  pixel vs. passive angles, round-time distribution (0–20s / 20–40s / 40s+),
  and favourite setup spots on the map.
- **Anti-Strat** — each measured tendency turns into a concrete counter
  (e.g. clear the trapped lane 5s before the execute), with the evidence
  that supports it. Includes a self-scouting note.
- **Planner** — coaches click the map to draw their own setups, save them
  locally, and export them as JSON for the team.
- **Data & Evidence** — sample sizes, methodology summary, and a
  **GRID-format CSV import** so real telemetry can replace the demo data.

## Run it

No build step, no dependencies, no server required:

```bash
# Option 1 — open directly
open index.html

# Option 2 — serve locally
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Demo data — read this

The built-in dataset is **synthetic and fictional** (fictional teams, fictional
player handles, 240 rounds / 12 matches / 3 maps). Distributions are modelled
on the patterns the Category 1 blueprint asks for. The UI labels it as demo
data everywhere, and the Data & Evidence tab explains how to swap in real
GRID telemetry via CSV import. No real match data is claimed anywhere.

Maps are **original schematic diagrams** drawn for this tool (not to scale,
no Riot artwork or assets). Agent and ability names are used descriptively
for scouting, exactly as the official category blueprint does.

## Project layout

```
index.html          entry point
css/style.css       all styling (no framework)
js/data.js          demo dataset + map schematics + generation model
js/app.js           filters, insights engine, renderers, planner, CSV import
test/smoke-test.js  node smoke test (node test/smoke-test.js)
METHODOLOGY.md      how every number is computed
AI_SHOWCASE.md      bonus-prize write-up (AI-powered workflow story)
DEVPOST_DRAFT.md    submission draft for Devpost
.idea/              IntelliJ IDEA project files (committed as tool-use evidence)
```

## Tests

```bash
node test/smoke-test.js   # dataset integrity + insight math + file checks
```

## JetBrains tools used

- **IntelliJ IDEA 2025.3 (free core)** — the project was created
  and developed in it; its headless code inspection (`bin/inspect.sh`) is
  part of verification. Details in [JETBRAINS.md](JETBRAINS.md).
- No paid JetBrains product, trial, or licence was used. The hackathon's free
  All Products Pack / AI Ultimate codes (issued on registration) were not
  needed for this build.

## License

MIT — see [LICENSE](LICENSE).
