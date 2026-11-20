# Devpost Submission Draft — ScoutScope
**Status: DRAFT — NOT submitted. Do not submit without Yu's go-ahead.**
**Hackathon:** Cloud9 x JetBrains: Sky's The Limit Hackathon 2026 — https://cloud9.devpost.com/
**Category:** 1 (VAL/GC): VALORANT Tactical Scouting, Utility Placement & Operator Profiler
**Devpost account:** manes99 (https://devpost.com/manes99)

## Project title
ScoutScope — VALORANT Tactical Scouting for Cloud9 Coaches

## Tagline
Scout smarter: utility heatmaps, Operator tendency profiles and data-backed anti-strats — built with JetBrains IntelliJ IDEA 2025.3 (free core).

## Description (for the Devpost form)
Before every match, Cloud9's VALORANT and Game Changers coaches spend hours
scrubbing VODs to track where opponents place trapwires or where their star
Duelist sets up with a sniper. ScoutScope answers those questions in one
glance.

Pick an opponent and a map, and ScoutScope shows: the top 5 tendencies with
hard numbers and sample sizes ("Trapwire at B Main — 80% of defensive
rounds, 16 placements in 20 rounds analysed"); a utility heatmap on an
original schematic map with a frequency table; an Operator Tendency &
Sniper Profiler (buy rate, aggressive/pixel/passive angle mix, round-time
split, favourite setup spots); and an Anti-Strat page that turns each
measured tendency into a concrete counter with its evidence. Coaches can
also draw their own setups on the map in the Planner and export them as
JSON, and import real GRID telemetry as CSV from the Data & Evidence tab —
the analysis engine is data-source agnostic.

**JetBrains tools used:** IntelliJ IDEA 2025.3 (free core) —
the project was created and developed in it, and its headless code
inspection is part of verification. The `.idea/` folder is committed in the
repo as evidence. No paid JetBrains product, trial, or licence was used.

**Data note:** the built-in dataset is synthetic and fictional (fictional
teams, 240 rounds / 12 matches), labelled as demo data throughout the UI.
Maps are original schematic diagrams (no Riot artwork). Agent and ability
names are used descriptively for scouting, as in the official blueprint.

## Methodology write-up (short)
Every percentage is `events ÷ defensive rounds analysed` for the current
filter, with numerator and denominator shown. Heat blobs are density
summaries of the same plotted points. Round-time buckets follow the
blueprint (0–20s / 20–40s / 40s+). Demo data uses a Poisson saturation
model so frequencies stay within 0–100%, with a deterministic seed so any
number can be re-verified. Full write-up: `METHODOLOGY.md` in the repo.

## Links to fill at submit time (all pending Yu's go-ahead)
- [ ] Code repository (public GitHub under manes90): _pending — push needs Yu's go-ahead_
- [ ] Working demo link (GitHub Pages or other static host): _pending_
- [ ] Demo video (≤3 min, public YouTube): _pending — needs screen recording + upload_
- [ ] Bonus prize (Best AI-Powered Workflow Story): `AI_SHOWCASE.md` in the repo — _link to repo file at submit time_

## Screenshots (in the repo, verified rendering)
- `screenshot-overview.png` — Overview tab (top tendencies + Operator snapshot)
- `screenshot-heatmap.png` — Utility Heatmap tab (Ascent, Iron Wolves)
- `screenshot-profiler.png` — Operator Profiler tab

## Submission checklist (from the official rules)
- [x] Built with at least one JetBrains tool (IntelliJ IDEA 2025.3 (free core), free)
- [x] Public repo + open-source licence (MIT) at the root
- [x] `.idea/` folder committed as supporting evidence
- [x] Text description explains features + JetBrains tools used
- [x] Methodology write-up included
- [ ] Working demo link — pending hosting decision
- [ ] Demo video ≤3 min on YouTube — pending recording
- [ ] Category selected on the form — at submit time
- [ ] Register / Join Hackathon on Devpost — **browser step, pending parent**

## Deadline
Submission closes **12 Jan 2027, 11:00 am Pacific Time = 13 Jan 2027, 02:00 WIB**.
Judging 27 Jan–3 Feb 2027; winners announced ~8 Feb 2027.
