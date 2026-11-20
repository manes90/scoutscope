# Methodology — how ScoutScope computes every number

## The question

Category 1 asks for a tool that helps Cloud9's VALORANT and Game Changers
coaches reduce manual VOD review by visualising opponent utility and weapon
tendencies — with supporting evidence (sample size, rounds analysed, event
frequency) for every claim.

## The data (real, not demo)

Built-in dataset: **Cloud9 vs FURIA, VCT Americas Stage 2 2025 — Regular
Season, 2025-07-18, series 2819676**. Haven 13–5, Bind 13–4 (Cloud9 won
2–0). Source: the official Cloud9 starter repo
(`cloud9esports/stl-hackathon-2026-grid-starter`) — the GRID VALORANT feed
(`val/events_2819676_grid.jsonl.zst`, 2,812 envelopes), the ability
supplement (`val-ability-supplements/2819676.jsonl.zst`, 1,091 rows), and
the meta CSVs (`val/series.csv`, `meta/games.csv`, `meta/rosters.csv`). No
login or API key was used. Extraction: `extract2.py` (kept outside this
repo at `~/workspace/hackathons/grid-work/`); the committed dataset is
aggregates only — see §5.

Sample size (all verified from the feed, not assumed):

| What | Count |
|---|---|
| Rounds won (denominator base) | **35** (Haven 18, Bind 17) |
| Ability casts in the feed | 1,025 |
| Casts kept in the dataset | **1,013** |
| Casts excluded (abandoned round, §3) | 12 |
| Casts positioned from the supplement | 1,009 (98.4%) |
| Casts positioned from the feed (fallback) | 16 |
| Defence casts / attack casts | 506 / 507 |
| Operator rounds (round-start holdings) | **8** |
| Operator kills | 5 |

Rounds per team per map (the denominator for every rate):

| Team | Map | Rounds | Defence | Attack |
|---|---|---|---|---|
| Cloud9 | Haven | 18 | 6 | 12 |
| Cloud9 | Bind | 17 | 12 | 5 |
| FURIA | Haven | 18 | 12 | 6 |
| FURIA | Bind | 17 | 5 | 12 |

Sides swap after round 12. **The feed is authoritative for sides**: it
records Cloud9 attacking Haven rounds 1–12 and defending 13–18. The
starter repo's `games.csv`/`rosters.csv` list the opposite (second-half)
side for each team. The feed is confirmed by the Spike: Cloud9's neT
carried the Spike in round 1 on Haven while the feed marks Cloud9 as the
attacking side — only attackers carry the Spike.

## Data in, insight out

1. **Events.** The unit of analysis is one ability cast (or one Operator
   round): `{map, team, player, agent, ability, x, y, side, roundTime}`.
   Casts come from `player-used-ability` events (ability slug in
   `target.id`); the caster's team/side/player come from the actor state.
2. **Cast location.** The supplement gives an interpolated position (cm)
   for 1,009 of 1,025 casts; the other 16 use the actor's position from
   the feed. Positions are normalised to the app's 100×62 schematic via
   the map bounds from the feed (Haven x[−3700, 7450] y[−14100, −1800];
   Bind x[100, 16100] y[−7300, 6050]) and assigned to the nearest named
   schematic zone. The y orientation was **calibrated, not assumed**:
   round-start positions show Haven defenders at mean ny≈4 (top of the
   schematic, at the sites) and attackers at ny≈60 (bottom, spawn), so no
   y-flip is applied. **Zone containment is 35%** (359/1,025 casts fell
   inside a zone rectangle; the rest were assigned to the nearest zone
   centre — the schematic's zones are small rectangles with corridors
   between them). The zone label is therefore "nearest named area", not a
   pixel-exact location.
3. **Round time.** Elapsed seconds from the `game-started-round` envelope
   to the cast envelope (`occurredAt`), bucketed 0–20s / 20–40s / 40s+
   (blueprint buckets). Real distribution in this series: 0–20s 180,
   20–40s 202, 40s+ 631 — **late-round utility dominates (62% at 40s+)**,
   the opposite of the blueprint's "80% early" example. The tool reports
   the real distribution; it does not force the blueprint's assumption.
4. **Frequency.** Every rate on the site is:

   ```
   rate = events matching the current filter ÷ rounds analysed
   ```

   shown as **casts per round**, with the numerator and denominator next
   to every claim (e.g. "15 placements in 12 rounds analysed"). Rates can
   exceed 1.0 — a player can cast the same ability twice in one round
   (two charges), e.g. FURIA's Recon Bolt @ A Lobby is 1.25 per defensive
   round. There is no hidden model and no smoothing: what you see is the
   count.
5. **Heat overlay.** The heat blobs are a density summary of the same
   plotted points (one radial blob per location label, radius and opacity
   scaled by event count). They never introduce data the dots don't show.
6. **Operator profile.** An Operator round = a round where a player held
   an Operator in the **round-start inventory** (full state at
   `game-started-round`). Buy rate = Operator rounds ÷ rounds analysed.
   Angle (aggressive / pixel / passive) = the nearest Operator setup spot
   to the holder's round-start position. Timing = the bucket of the
   holder's first Operator kill in that round, or 0–20s if they held it
   without a kill (they set up at round start). 8 Operator rounds in this
   series (OXY 5, v1c 2, Palla 1); 5 Operator kills. The Operator was rare
   — the profiler shows that honestly instead of inflating it.

### The abandoned round (Haven round 13)

The feed has **19 round starts but 18 round wins on Haven**: round 13
started 21:40:51 WIB and produced no `team-won-round`; round 14 started
21:49:32 (an 8½-minute gap — a pause/restart). The 12 ability casts in
that round are **excluded** from the dataset, and the rounds denominator
counts won rounds only (35). If the feed is ever corrected, re-run the
extraction — the exclusion is by rule (a round counts only if it was won),
not by hand.

## Licence: aggregates only, and the runtime expansion

The starter repo's data is proprietary, licensed only for building this
hackathon project — no redistribution, no commercial use, no betting. So
**only aggregates are committed** (`REAL` in `js/data.js`): counts by
(team, map, side, ability, location, player) plus round-time buckets, and
the rounds table. No per-event rows, no `.zst`/`.jsonl`/parquet files, no
starter-repo files in this repo (they are git-ignored; the clone lives
next to the project, never inside it). "Your code, charts, screenshots
and aggregate results are fine to commit" — this dataset is the aggregate
results.

Because the analysis engine is row-based, `expandReal()` (in `js/data.js`)
expands the aggregates back into rows at runtime. The expansion preserves
**every marginal exactly**: per-key counts, per-player counts, timing
buckets, spot/angle mix — the smoke test asserts the key numbers
(1,013 utility rows, 8 Operator rows, top tendencies, buy rates). Two
things are invented at expansion time and documented here:

- **Marker jitter**: rows in one cluster share a zone centre, so each
  marker is jittered deterministically (±3 schematic units, seeded by the
  cluster key) so they don't stack on a single pixel. The underlying
  counts are exact; the jitter is display-only.
- **Player × timing pairing**: the aggregates store per-player counts and
  per-bucket counts separately, not the joint distribution, so a row's
  player and its round-time bucket are paired arbitrarily (deterministically).
  No displayed number depends on the joint — tendencies, timing mixes and
  angle mixes are all marginals.

## Landing locations (blueprint note)

GRID provides cast location and time, not the ability's final landing
location. ScoutScope plots cast locations and labels them as such; exact
landing reconstruction is not claimed, per the blueprint's own note.

## Anti-strat derivation

Each counter-strategy is a fixed playbook entry (`ANTISTRAT` in `js/data.js`)
keyed to the detected ability, attached to the tendency that triggered it
with its sample size — and a location-specific entry (`ANTISTRAT_SPOT`)
for the top tendencies (e.g. Recon Bolt @ A Lobby). Every ability in this
series has its own counter; the tool does not invent counters from thin
air, and a counter is only shown when its underlying tendency is measured
in the current filter.

## Uncertainty: what 12 rounds can and cannot say

A rate like "1.08 per round" hides how the casts are spread across rounds.
Sky Smoke @ Mid (FURIA/Bind attack) has 14 casts but they land in only 6 of
12 rounds — clustered, not a habit. So every headline tendency is also
reported as *presence*: the share of rounds with at least one cast, with a
95% Wilson score interval (the honest interval for a small proportion; the
Wald interval would be narrower and wrong here).

| Tendency | Casts | Present (rounds) | 95% Wilson CI |
|---|---|---|---|
| FURIA Haven def — Recon Bolt @ A Lobby | 15 (1.25/round) | 12/12 (100%) | 76–100% |
| FURIA Bind atk — Sky Smoke @ Mid | 14 (1.17/round) | 6/12 (50%) | 25–75% |
| Cloud9 Haven atk — Turret @ Mid Courtyard | 13 (1.08/round) | 12/12 (100%) | 76–100% |
| Cloud9 Bind def — Sky Smoke @ B Long | 13 (1.08/round) | 10/12 (83%) | 55–95% |
| FURIA Haven def — Toxic Screen @ Mid | 12 (1.00/round) | 12/12 (100%) | 76–100% |
| Cloud9 Haven atk — Dark Cover @ C Long | 12 (1.00/round) | 7/12 (58%) | 32–81% |
| FURIA Bind atk — Toxic Screen @ Garden | 12 (1.00/round) | 12/12 (100%) | 76–100% |
| Cloud9 Bind def — Toxic Screen @ A Short | 12 (1.00/round) | 12/12 (100%) | 76–100% |
| FURIA Haven def — Dark Cover @ A Long | 11 (0.92/round) | 7/12 (58%) | 32–81% |
| Cloud9 Haven atk — Toxic Screen @ A Long | 11 (0.92/round) | 11/12 (92%) | 65–99% |
| Cloud9 Haven atk — Nanoswarm @ C Lobby | 10 (0.83/round) | 6/12 (50%) | 25–75% |
| Cloud9 Bind def — Guiding Light @ A Short | 10 (0.83/round) | 8/12 (67%) | 39–86% |

Operator buy rates (round-start holdings, won defensive rounds): OXY on Bind
4/12 (33%, CI 14–61%); v1c on Bind 2/12 (17%, CI 5–45%); OXY on Haven 1/6
(17%, CI 3–56%); Palla on Haven 1/12 (8%, CI 1–35%).

Even a 12/12 presence only pins the true rate to 76–100%. A ±10-point claim
would need 62 rounds at p=0.80 (97 at p=0.50) — one series cannot give that,
which is why the tool shows the interval instead of a bare percentage.
Computed by `~/workspace/hackathons/grid-work/wilson.py` from the raw feed
(Wilson(16/20) = [58.4, 91.9], matching statsmodels); the Data & Evidence tab
shows the two headline intervals.

## Limitations (honest)

- **One series, 35 rounds.** The strongest defensive sample is 12 rounds
  (Cloud9/Bind, FURIA/Haven); the thinnest is 5–6 rounds (FURIA/Bind,
  Cloud9/Haven). Every claim shows its n — a tendency from 5 rounds is
  not the same evidence as one from 12.
- **Ascent was removed from the map list.** Ascent left the Competitive
  pool in patch 13.08 (13 Oct 2026) and has no matches in this series —
  the tool only lists maps that are both in-pool and have real data
  (Bind, Haven). A future series on Lotus or Sunset would add a third
  map the same way.
- **Zone labels are "nearest named area"** (35% containment, §2) and the
  schematic is an original diagram, not to scale; coordinates are
  relative (0–100), not in-game metres.
- **Agents differ per map.** The roster shows the player's Haven agent;
  on Bind, v1c plays Brimstone (not Omen), OXY plays Raze (not Jett),
  Xeppaa plays Vyse (not Killjoy), tuyz plays Brimstone, Urango plays
  Skye, adverso plays Deadlock, Palla plays Raze. The player filter shows
  the agent for the current map, read from the data.
- **No win-rate prediction is claimed:** the tool reports what opponents
  *do*, not whether it wins rounds.

## Reproducing the dataset

1. Clone the starter repo next to this project (never inside it):
   `git clone --filter=blob:none --sparse https://github.com/cloud9esports/stl-hackathon-2026-grid-starter`
   (sparse set: `val val-ability-supplements meta`).
2. Run the extraction (needs `zstandard`):
   `python3 extract2.py` — writes `real-aggregates.json`.
3. Regenerate the committed section: `python3 tools/build-data.py`
   (replaces only the marked `REAL` block in `js/data.js`).
4. Verify: `node test/smoke-test.js` (38 checks) and
   `python3 test/tab-walk.py` (24 renders, zero JS errors).
