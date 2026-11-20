# IntelliJ headless inspection — results

**Tool:** IntelliJ IDEA 2025.3 (unified build, free core), `bin/inspect.sh`,
profile `inspections/scoutscope-profile.xml` (90+ JS / HTML / CSS
inspections; exclusions documented in the profile header).

**Run:** 2026-11-20 ~11:15–11:22 WIB, exit 0. Output in `inspections/out4/`
(22 per-inspection XML files; the 2.3 MB `.descriptions.xml` catalog is
git-ignored). Raw counts: **454 problems** across 13 files — read the
triage below before quoting that number, because most of it is headless
inspection noise, not defects.

## How this run was done right (and what was wrong before)

- **Scope:** the run analysed **only this project** (verified from the log:
  19+ `Analysing code in …/cloud9-jetbrains-2026/` lines, zero files from
  sibling projects). The `-d <project-dir>` flag scopes the run.
- **Profile:** the log confirms `Loaded the 'ScoutScope' profile` — the
  profile actually loaded this time.
- **Earlier runs were broken — do not cite them.** The 2026-11-19 run and
  the first two 2026-11-20 runs used *relative* profile paths; the log
  shows `Using default project profile`, so the 90-rule profile never
  loaded and they wrote only `.descriptions.xml` (no per-inspection
  results). The 19 Nov JETBRAINS.md claim of "zero problems" rested on
  one of those runs and is therefore **unverified by inspection** — it is
  corrected here. A further run with a relative `.iml` content root
  analysed sibling projects (`qnx-2026/.venv`, `pack-a-day-game`, …) and
  zero files of this project; the fix was an absolute content-root URL in
  `.idea/scoutscope.iml` plus the `-d` flag (see the comment in the `.iml`).
- **Negative control (probes, since deleted):** `js/probe-bad.js`
  (2 undefined variables), `probe-bad.html` (unknown tag, missing
  `lang`/`alt`), `probe-bad.css` (unknown property) were planted before
  the run and **all fired** (12 problems across the three files) — the
  pipeline genuinely detects defects. The probe files were deleted after
  the run; they were never part of the app.

## Triage of the 454 problems

### Noise — headless inspection artifacts, not defects (433)

| Count | Inspection | Why it is noise here |
|---:|---|---|
| 275 | `CssBrowserCompatibilityForProperties` | Flags even `color` as "not supported (no MDN compatibility data)" — the MDN compat database is absent in headless mode, so it flags everything. (2 more of the 277 total are the probe-bad.css control hits, counted under the negative control.) |
| 60 | `HtmlPresentationalElement` | `<b>`/`<i>` inside JS template literals in `js/app.js` — presentational tags in generated HTML, stylistic only. |
| 39 | `GrazieInspection` / `GrazieStyle` | Grammar/style suggestions on UI copy and Markdown (VALORANT terms, agent names). Not defects. |
| 16 | `JSUnresolvedReference` (most) | `module` / `require` / `process` / `__dirname` in Node files (`js/data.js:420`, `test/smoke-test.js`) — Node globals without Node type definitions. (The other 2 of the 18 total are the probe-bad.js control hits.) |
| 9 + 9 + 6 + 4 + 2 | `CssInvalidHtmlTagReference`, `CssInvalidPseudoSelector`, `HtmlUnknownAttribute`, `CssMissingSemicolon`, `CssInvalidPropertyValue` in `js/app.js` | All mention `EXTERNAL_FRAGMENT`: the parser chokes on `${…}` interpolations inside CSS-in-JS template literals. Not real CSS. |
| 5 | `CssNonIntegerLengthInPixels` | Sub-pixel values (`0.5px` borders) in `css/style.css` — render correctly in Chromium, verified visually in every screenshot. Accepted. |
| 4 | `JSNonASCIINames` | En-dash in `'0–20s'` string literals. Cosmetic. |
| 1 | `JSCheckFunctionSignatures` (`js/app.js:434`) | Inferred union type vs the imported-team literal (`spotBias: {}`) — a type-inference artifact of untyped JS; the code runs (tab-walk proves it). |
| 1 | `JSJQueryEfficiency` | False positive — the project uses no jQuery. |
| 2 + 1 | `CssUnusedSymbol` `.active` / `.site` | False positives: `.tab.active` is set by `renderTabs()` (`js/app.js:457`), `.map-zone.site` is set by `mapSVG()`. Both are used. |

### Real, minor — fixed after the run (6)

| Finding | Fix |
|---|---|
| `JSUnusedLocalSymbols`: `label` (`js/app.js:74`), `idx` (`js/app.js:364`), `rounds` (`js/app.js:419`) | Dead locals removed. |
| `JSUnusedGlobalSymbols`: `AGENTS`, `TIME_BUCKETS`, `TIME_WEIGHTS` (`js/data.js`) | Dead constants removed (zero references; `pickTimeBucket()` inlines the thresholds — its comment now carries the design note). |

Re-verified after the fixes: `node test/smoke-test.js` → **23/23 PASS**;
`test/tab-walk.py` → **54/54 tab renders, zero JS errors**.

### Real, intentional — kept, documented (3)

- `JSUnusedGlobalSymbols`: `topTendencies`, `operatorSummary`,
  `filteredUtility` (`js/app.js:482`) — exported via `module.exports` as
  a deliberate seam for tests; the Node smoke test requires `data.js`
  directly, so nothing references them today. Harmless, documented in
  the code comment.

## What inspection cannot catch (and what did)

Static inspection did **not** catch the 2026-11-20 Anti-Strat runtime
bug (`ANTISTRAT.Operator` missing → `TypeError` on Iron Wolves /
Ascent, whole tab silently kept the previous tab's content) — property
access on an object literal is invisible to it. The Playwright
tab-walk (`test/tab-walk.py`, 3 teams × 3 maps × 6 tabs) caught it, and
the fix (`Operator` entry + `|| ANTISTRAT.Default` guard) is verified
by the same walk. Inspection and the tab-walk are complementary; neither
alone is the whole story.

## Files with zero problems

`index.html` (0), `tools/annotate.py` (0).
