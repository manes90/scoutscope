# AI-Powered Workflow Story — how ScoutScope was built
*(Bonus prize entry: Best AI-Powered Workflow Story)*

## The workflow

ScoutScope was built by one developer working with an AI coding agent
(Muse, an agentic coding assistant) inside **JetBrains IntelliJ IDEA 2025.3 (free core)** — the free IDE. The loop:

1. **Spec first, code second.** The agent read the official Devpost rules
   and Submission Specifics live, then wrote the category requirements down
   as a checklist before touching code. That kept the build pointed at what
   judges actually score (evidence-backed insights, coach-friendly visuals,
   JetBrains tool use) instead of drifting into a generic dashboard.
2. **Data model as the contract.** The dataset (`js/data.js`) was written
   before the UI, with a documented method and a deterministic seed. When
   the first smoke test caught an impossible number — a 155% frequency in
   the original synthetic demo data — the bug was in the model, not the
   UI, and the fix (Poisson saturation, `p = 1 − exp(−λ)`) took one edit
   because the model lived in exactly one place. The demo data has since
   been replaced by real GRID telemetry (see step 5), but the loop stayed:
   the smoke test now asserts the real extraction's numbers (35 rounds,
   1,013 casts, the top tendencies, the Operator buy rates).
3. **Verify, don't trust — three independent checks.** Every claim the app
   makes is re-computed by an independent Node smoke test
   (`test/smoke-test.js`, 35 checks) that asserts dataset integrity,
   insight math, and the exact tendencies the UI shows. IntelliJ's
   headless code inspection (`bin/inspect.sh`) runs over the project with
   a 90+ inspection profile as a second check
   (`inspections/RESULTS.md`). And a headless-Chromium capture
   (Playwright) screenshots every tab and records the whole interaction
   with zero JS errors — that third check is what caught the bugs the
   first two could not see: a frozen tab highlight, zone labels buried
   under marker dots, and a map overflowing its viewport. Nothing ships
   on "it looked fine".
4. **AI where it helps, human judgement where it matters.** The agent
   drafted code, caught its own math bug through testing, and wrote the
   methodology doc. Decisions that needed judgement — which category to
   enter, which blueprint to combine, what counts as honest data —
   were made explicitly and written down (this file, METHODOLOGY.md).
5. **Real data, verified like code.** The agent pulled one VCT series
   (Cloud9 vs FURIA, 2025-07-18) from the official starter repo, joined
   the feed to the ability supplement (98.4%), and checked the result
   against the repo's own CSVs — finding a real discrepancy (the CSVs
   list the second-half side; the feed is authoritative, proved by the
   Spike carrier) and an abandoned round (19 starts, 18 wins) whose casts
   are excluded by rule. The starter licence allows aggregates, not raw
   rows, so the committed dataset holds counts only and the engine
   expands them at runtime with every marginal preserved exactly.

## What JetBrains tools did

- **IntelliJ IDEA 2025.3 (free core):** project host, editor,
  code inspection. The `.idea/` folder is committed as evidence, and the
  inspection profile (`inspections/scoutscope-profile.xml`, 90+ JS/HTML/
  CSS inspections) plus its results (`inspections/RESULTS.md`) are in
  the repo.
- No paid JetBrains licence, trial, or AI Ultimate code was used for this
  build — the free core covered a dependency-free web app completely.

## Junie / JetBrains Air status (honest)

- **Not used.** The hackathon issues free All Products Pack / AI Ultimate
  codes by email after Devpost registration. As of 20 Nov 2026 no such
  code has arrived in the registered Gmail inbox (checked — only the
  Devpost welcome mail). So no Junie and no JetBrains Air were used in
  this build, and this file does not claim otherwise. If a code arrives
  before the submission deadline, the workflow story will be updated
  with what Junie/Air actually did — not before.

## What AI accelerated

- ~1,460 lines of app + data + styling + tests and ~800 lines of docs,
  with the requirements verified live from Devpost first.
- The 155% bug: found by an automated test the agent wrote itself, fixed
  with a principled model change, and locked in by a regression assertion
  — the kind of loop that used to take a code review and a day.
- The real-data import: feed + supplement joined, positions calibrated
  against round-start spawns, sides cross-checked against the Spike, and
  the licence constraint (aggregates only) designed around — all verified
  by the same smoke test that guards the UI numbers.
- The screenshot audit: 7 frames looked at, not just rendered — three
  real UI bugs found and fixed in the same session (tab highlight, map
  labels, map viewport), plus a wrong fallback that showed Operator
  advice on a smoke-tendency card.
