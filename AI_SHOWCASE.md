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
   before the UI, with a documented generation model and a deterministic
   seed. When the first smoke test caught an impossible number — a 155%
   frequency — the bug was in the model, not the UI, and the fix (Poisson
   saturation, `p = 1 − exp(−λ)`) took one edit because the model lived in
   exactly one place.
3. **Verify, don't trust.** Every claim the app makes is re-computed by an
   independent Node smoke test (`test/smoke-test.js`) that asserts dataset
   integrity, insight math, and the exact tendencies the UI shows. The
   IntelliJ headless code inspection (`bin/inspect.sh`) runs over the
   project as a second check. Nothing ships on "it looked fine".
4. **AI where it helps, human judgement where it matters.** The agent
   drafted code, caught its own math bug through testing, and wrote the
   methodology doc. Decisions that needed judgement — which category to
   enter, which blueprint to combine, what counts as honest demo data —
   were made explicitly and written down (this file, METHODOLOGY.md).

## What JetBrains tools did

- **IntelliJ IDEA 2025.3 (free core):** project host, editor,
  code inspection. The `.idea/` folder is committed as evidence.
- No paid JetBrains licence, trial, or AI Ultimate code was used for this
  build — the free core covered a dependency-free web app
  completely.

## What AI accelerated

- ~1,500 lines of app + data + docs in a single session, with the
  requirements verified live from Devpost first.
- The 155% bug: found by an automated test the agent wrote itself, fixed
  with a principled model change, and locked in by a regression assertion —
  the kind of loop that used to take a code review and a day.
