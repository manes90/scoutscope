# ScoutScope — demo video script (90 seconds, on-screen text only)

**Format:** 1280×720, 30 fps, no voiceover in this cut — every beat is an
on-screen title card or a caption over live footage. Narration will be
recorded later on a phone and mixed in with ffmpeg (see `video/README.md`).
No music (no copyrighted tracks), no Riot artwork — all maps are original
schematic diagrams, all data is real GRID telemetry (Cloud9 vs FURIA,
VCT Americas Stage 2 2025, series 2819676).

## 0:00–0:03 — Title card
- **On screen:** `ScoutScope` (large) — `VALORANT tactical scouting`
- **Sub:** `Cloud9 × JetBrains Hackathon 2026 · Category 1`
- **Footage:** static title card (Remotion), dark background, cyan accent.

## 0:03–0:15 — Hook + problem
- **On screen:** `Coaches guess. ScoutScope measures.`
- **Sub:** `Every tendency is a number — with its sample size next to it.`
- **Footage:** slow pan across the Overview tab (top-5 tendencies list).

## 0:15–0:70 — Five live demo scenes (~11 s each)

### Scene 1 (0:15–0:26) — Overview: top 5
- **Caption:** `1 · Overview — the five strongest tendencies`
- **Footage:** Overview tab, Cloud9 on Bind.
- **Callout:** `#1 Sky Smoke at B Long — 13 placements in 12 defensive rounds (1.08 per round)`

### Scene 2 (0:26–0:37) — Heatmap
- **Caption:** `2 · Heatmap — where the utility actually lands`
- **Footage:** Utility Heatmap tab, Cloud9 on Bind, heat overlay on.
- **Callout:** `Sky Smoke clusters at B Long — the same 1.08 per round from a different angle`

### Scene 3 (0:37–0:48) — Operator Profiler
- **Caption:** `3 · Operator Profiler — the sniper, quantified`
- **Footage:** Operator Profiler tab, Cloud9 on Bind.
- **Callout:** `OXY (Raze) holds the Operator in 50% of rounds on Bind defence — 6 rounds, pixel + passive holds`

### Scene 4 (0:48–0:59) — Anti-Strat
- **Caption:** `4 · Anti-Strat — a game plan, not a guess`
- **Footage:** Anti-Strat tab, FURIA on Haven.
- **Callout:** `Recon Bolt at A Lobby — 15 casts in 12 rounds (1.25 per round). “Break the A Lobby dart before the hit.”`

### Scene 5 (0:59–0:70) — Planner + real-data import
- **Caption:** `5 · Planner + Data — draw your own setup, bring real telemetry`
- **Footage:** Planner tab (click the map, drop a marker), then Data &amp; Evidence
  tab showing the real dataset (series 2819676, 1,013 casts, 35 rounds) and the
  GRID-format CSV import box.
- **Callout:** `Setups persist in the browser and export as JSON`

## 0:70–0:85 — How it was built
- **On screen:** `How it was built`
- **Bullets (one at a time):**
  - `Real GRID telemetry — Cloud9 vs FURIA, VCT Americas Stage 2 2025, 35 rounds`
  - `Node smoke test — 38/38 checks on the data model and the insight math`
  - `IntelliJ IDEA 2025.3 — free core, headless inspection, 90+ checks`
  - `Deterministic data model — no server, no build step, no framework`
- **Footage:** title card with bullets fading in; small inset of the inspection
  results (inspections/RESULTS.md) and the smoke-test output.

## 0:85–0:90 — End card
- **On screen:** `ScoutScope`
- **Sub:** `Live demo: manes90.github.io/scoutscope · Source: github.com/manes90/scoutscope`
- **Sub 2:** `Built for the Cloud9 × JetBrains Hackathon 2026`

## Production notes
- Capture: `headless-screencast` skill — Playwright, 1280×720 viewport,
  one take per scene, zero JS errors (verified in the capture log).
- Title/end cards: `remotion-demo-video` skill (Remotion 4.0.542 template
  in `~/workspace/remotion-demo/`).
- Assembly: ffmpeg concat of scene clips + title/end cards, 30 fps.
- Output: `video/clip.mp4` (this file). Actual 87.40 s (3 + 69.4 + 10 + 5),
  under the 3-minute rules limit.
- Narration draft: `video/narration.md` — 132 words, 7 beats, timed to this
  cut (Yu records on his phone; title + build cards stay text-only).
- Upload: NOT done here — YouTube upload needs Yu's channel. Steps are in
  `video/README.md`.
