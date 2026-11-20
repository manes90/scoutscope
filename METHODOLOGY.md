# Methodology — how ScoutScope computes every number

## The question

Category 1 asks for a tool that helps Cloud9's VALORANT and Game Changers
coaches reduce manual VOD review by visualising opponent utility and weapon
tendencies — with supporting evidence (sample size, rounds analysed, event
frequency) for every claim.

## Data in, insight out

1. **Events.** The unit of analysis is one ability placement (or one
   Operator round): `{map, team, player, agent, ability, x, y, side,
   roundTime}`. The demo set is generated in `js/data.js` from a cluster
   table (where each ability tends to land) and a per-team tendency profile
   (which spots each fictional team favours). Real GRID telemetry has the
   same shape — cast location + time — and can be imported as CSV from the
   Data & Evidence tab.
2. **Frequency.** Every percentage on the site is:

   ```
   frequency = events matching the current filter ÷ defensive rounds analysed
   ```

   The numerator and denominator are shown next to every claim
   (e.g. "16 placements in 20 rounds analysed"). There is no hidden model
   and no smoothing: what you see is the count.
3. **Heat overlay.** The heat blobs are a density summary of the same
   plotted points (one radial blob per location label, radius and opacity
   scaled by event count). They never introduce data the dots don't show.
4. **Round-time buckets.** 0–20s / 20–40s / 40s+, following the blueprint's
   example ("80% between 0-20s in the round, and only 10% between 20-40s").
5. **Operator profile.** Buy rate = Operator rounds ÷ rounds analysed.
   Angle mix (aggressive / pixel / passive) and timing split are shares of
   the team's Operator rounds, with the raw counts available in the table.

## The demo dataset's generation model

- 20 defensive rounds per team per map; 3 fictional teams × 3 maps = 240
  rounds, 12 matches.
- For each ability × location, the per-round placement probability is a
  Poisson saturation model: `p = 1 − exp(−λ)`, `λ = (base/40) × teamBias`,
  where `base` is the expected placements per 40 rounds for an average team.
  This guarantees frequencies stay within 0–100% no matter how strong a
  team's bias is — an earlier linear model produced an impossible 155% and
  was fixed during verification (see `test/smoke-test.js`, which asserts the
  top tendency is within 50–100%).
- Deterministic seed (`mulberry32(20261119)`): every load shows the same
  numbers, so a judge can re-verify any claim by re-running the smoke test.

## Landing locations (blueprint note)

GRID provides cast location and time, not the ability's final landing
location. ScoutScope plots cast locations and labels them as such; exact
landing reconstruction is not claimed, per the blueprint's own note.

## Anti-strat derivation

Each counter-strategy is a fixed playbook entry (`ANTISTRAT` in `js/data.js`)
keyed to the detected ability, attached to the tendency that triggered it
with its sample size. The tool does not invent counters from thin air: a
counter is only shown when its underlying tendency is measured in the
current filter.

## Limitations (honest)

- Demo data is synthetic — tendencies describe fictional teams, not real
  opponents. The engine is data-agnostic; feed it GRID data and the same
  pages describe real opponents.
- Schematic maps are original diagrams, not to scale; coordinates are
  relative (0–100), not in-game metres.
- No win-rate prediction is claimed: the tool reports what opponents *do*,
  not whether it wins rounds.
