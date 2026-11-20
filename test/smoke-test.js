// ScoutScope smoke test — run with: node test/smoke-test.js
// No DOM needed: exercises the REAL dataset + the same aggregation math the
// UI uses. Expected numbers come from the GRID extraction (series 2819676,
// Cloud9 vs FURIA, 2025-07-18) — see METHODOLOGY.md and
// ~/workspace/hackathons/grid-work/extraction-report.md.
'use strict';
const fs = require('fs');
const path = require('path');
const { MAPS, TEAMS, REAL, expandReal } = require('../js/data.js');

const root = path.join(__dirname, '..');
let failures = 0;
function check(name, cond, extra) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra !== undefined ? ` — ${extra}` : ''}`);
  if (!cond) failures += 1;
}

// --- files exist ------------------------------------------------------------
for (const f of ['index.html', 'css/style.css', 'js/app.js', 'js/data.js', 'README.md', 'METHODOLOGY.md', 'LICENSE']) {
  check(`file exists: ${f}`, fs.existsSync(path.join(root, f)));
}
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check('index.html loads data.js', html.includes('js/data.js'));
check('index.html loads app.js', html.includes('js/app.js'));
check('index.html loads stylesheet', html.includes('css/style.css'));

// --- dataset shape ----------------------------------------------------------
check('2 maps in the schematic (Bind, Haven — Ascent removed, out of pool since 13.08)', Object.keys(MAPS).length === 2, Object.keys(MAPS).join(', '));
check('2 real teams', TEAMS.length === 2, TEAMS.map((t) => t.id).join(', '));
check('series is 2819676', REAL.meta.seriesId === '2819676');
check('35 rounds won', REAL.meta.roundsWon === 35, String(REAL.meta.roundsWon));
check('1,013 casts kept', REAL.meta.castsKept === 1013, String(REAL.meta.castsKept));
check('Ascent is not in the map list (out of Competitive pool since patch 13.08)', !MAPS.Ascent);
check('Haven Mid Courtyard zone exists (renamed from Mid Lobby)', MAPS.Haven.zones.some((z) => z.label === 'Mid Courtyard'));
check('no Mid Lobby label remains in data.js', !fs.readFileSync(path.join(root, 'js/data.js'), 'utf8').includes('Mid Lobby'));

const DATA = expandReal();
check('utility events = 1,013', DATA.utilityEvents.length === 1013, String(DATA.utilityEvents.length));
check('operator events = 8', DATA.operatorEvents.length === 8, String(DATA.operatorEvents.length));
for (const e of [...DATA.utilityEvents, ...DATA.operatorEvents]) {
  if (!(e.x >= 0 && e.x <= 100 && e.y >= 0 && e.y <= 100)) { check(`event coords in range (id ${e.id})`, false); break; }
}
check('all event coords in 0–100', true);
check('utility events have ability+category', DATA.utilityEvents.every((e) => e.ability && e.category));
check('operator events have angle+roundTime', DATA.operatorEvents.every((e) => e.angle && e.roundTime));

// --- rounds table (denominator) ----------------------------------------------
const R = REAL.rounds;
check('C9 Bind: 12 defensive rounds', R['C9|Bind'].def === 12, String(R['C9|Bind'].def));
check('FUR Haven: 12 defensive rounds', R['FUR|Haven'].def === 12, String(R['FUR|Haven'].def));
check('C9 Haven: 6 defensive rounds', R['C9|Haven'].def === 6, String(R['C9|Haven'].def));
check('FUR Bind: 5 defensive rounds', R['FUR|Bind'].def === 5, String(R['FUR|Bind'].def));
check('35 rounds total across the table (one team per map: 17 Bind + 18 Haven)',
  R['C9|Bind'].total + R['C9|Haven'].total === 35);

// --- insight math (mirrors app.js: casts per defensive round) ---------------
function topTendency(teamId, map) {
  const rounds = R[`${teamId}|${map}`].def;
  const byKey = {};
  for (const e of DATA.utilityEvents.filter((x) => x.team === teamId && x.map === map && x.side === 'def')) {
    const k = `${e.ability} @ ${e.label}`;
    byKey[k] = (byKey[k] || 0) + 1;
  }
  return Object.entries(byKey)
    .map(([k, n]) => ({ k, n, perRound: +(n / rounds).toFixed(2) }))
    .sort((a, b) => b.perRound - a.perRound)[0];
}

const c9Bind = topTendency('C9', 'Bind');
check('Cloud9 / Bind top tendency is Sky Smoke @ B Long', c9Bind.k === 'Sky Smoke @ B Long', `${c9Bind.k} ${c9Bind.perRound}/round`);
check('Cloud9 / Bind top tendency is 1.08 per round', c9Bind.perRound === 1.08, String(c9Bind.perRound));
const furHaven = topTendency('FUR', 'Haven');
check('FURIA / Haven top tendency is Recon Bolt @ A Lobby', furHaven.k === 'Recon Bolt @ A Lobby', `${furHaven.k} ${furHaven.perRound}/round`);
check('FURIA / Haven top tendency exceeds 1 per round (two charges)', furHaven.perRound === 1.25, String(furHaven.perRound));

function opSummary(teamId, map) {
  const ops = DATA.operatorEvents.filter((x) => x.team === teamId && x.map === map && x.side === 'def');
  const rounds = R[`${teamId}|${map}`].def;
  const aggressive = ops.filter((o) => o.angle === 'aggressive').length;
  const early = ops.filter((o) => o.roundTime === '0–20s').length;
  return { n: ops.length, buyRate: Math.round((ops.length / rounds) * 100), aggressivePct: ops.length ? Math.round((aggressive / ops.length) * 100) : 0, earlyPct: ops.length ? Math.round((early / ops.length) * 100) : 0 };
}
const c9BindOp = opSummary('C9', 'Bind');
check('Cloud9 / Bind: 6 Operator rounds in 12 defensive rounds', c9BindOp.n === 6, `${c9BindOp.n} rounds`);
check('Cloud9 / Bind Operator buy rate is 50%', c9BindOp.buyRate === 50, `${c9BindOp.buyRate}%`);
const oxy = DATA.operatorEvents.filter((o) => o.player === 'OXY' && o.map === 'Bind');
check('OXY holds the Operator in 4 Bind rounds', oxy.length === 4, `${oxy.length} rounds`);
const furHavenOp = opSummary('FUR', 'Haven');
check('FURIA / Haven: 1 Operator round (Palla)', furHavenOp.n === 1, `${furHavenOp.n} round`);

// --- determinism: re-require produces identical counts -----------------------
delete require.cache[require.resolve('../js/data.js')];
const DATA2 = require('../js/data.js').expandReal();
check('dataset is deterministic across loads', DATA2.utilityEvents.length === DATA.utilityEvents.length
  && DATA2.operatorEvents.length === DATA.operatorEvents.length);
check('expansion is deterministic per row (same first row)',
  JSON.stringify(DATA2.utilityEvents[0]) === JSON.stringify(DATA.utilityEvents[0]));

console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : `\n${failures} SMOKE TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
