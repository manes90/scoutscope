// ScoutScope smoke test — run with: node test/smoke-test.js
// No DOM needed: exercises the dataset + the same aggregation math the UI uses.
'use strict';
const fs = require('fs');
const path = require('path');
const { MAPS, TEAMS, DEMO } = require('../js/data.js');

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
check('3 maps', Object.keys(MAPS).length === 3, Object.keys(MAPS).join(', '));
check('3 demo teams', TEAMS.length === 3, TEAMS.map((t) => t.id).join(', '));
check('utility events > 400', DEMO.utilityEvents.length > 400, DEMO.utilityEvents.length);
check('operator events > 100', DEMO.operatorEvents.length > 100, DEMO.operatorEvents.length);
for (const e of [...DEMO.utilityEvents, ...DEMO.operatorEvents]) {
  if (!(e.x >= 0 && e.x <= 100 && e.y >= 0 && e.y <= 100)) { check(`event coords in range (id ${e.id})`, false); break; }
}
check('all event coords in 0–100', true);
check('utility events have ability+category', DEMO.utilityEvents.every((e) => e.ability && e.category));
check('operator events have angle+roundTime', DEMO.operatorEvents.every((e) => e.angle && e.roundTime));

// --- insight math (mirrors app.js: events / 20 defensive rounds) ------------
function topTendency(teamId, map) {
  const rounds = 20;
  const byKey = {};
  for (const e of DEMO.utilityEvents.filter((x) => x.team === teamId && x.map === map && x.side === 'def')) {
    const k = `${e.ability} @ ${e.label}`;
    byKey[k] = (byKey[k] || 0) + 1;
  }
  return Object.entries(byKey)
    .map(([k, n]) => ({ k, n, pct: Math.round((n / rounds) * 100) }))
    .sort((a, b) => b.pct - a.pct)[0];
}

const iwAscent = topTendency('IW', 'Ascent');
check('Iron Wolves / Ascent top tendency is Trapwire @ B Main', iwAscent.k === 'Trapwire @ B Main', `${iwAscent.k} ${iwAscent.pct}%`);
check('top tendency pct is 50–100%', iwAscent.pct >= 50 && iwAscent.pct <= 100, `${iwAscent.pct}%`);

function opSummary(teamId, map) {
  const ops = DEMO.operatorEvents.filter((x) => x.team === teamId && x.map === map);
  const aggressive = ops.filter((o) => o.angle === 'aggressive').length;
  const early = ops.filter((o) => o.roundTime === '0–20s').length;
  return { n: ops.length, buyRate: Math.round((ops.length / 20) * 100), aggressivePct: Math.round((aggressive / ops.length) * 100), earlyPct: Math.round((early / ops.length) * 100) };
}
const sf = opSummary('SF', 'Ascent');
check('Solar Flare buys Operator often (>70%)', sf.buyRate > 70, `${sf.buyRate}%`);
check('Solar Flare Operator play is aggressive (>60%)', sf.aggressivePct > 60, `${sf.aggressivePct}%`);
const iw = opSummary('IW', 'Ascent');
check('Iron Wolves Operator play is less aggressive than Solar Flare', iw.aggressivePct < sf.aggressivePct, `IW ${iw.aggressivePct}% vs SF ${sf.aggressivePct}%`);

// --- determinism: re-require produces identical counts -----------------------
delete require.cache[require.resolve('../js/data.js')];
const DEMO2 = require('../js/data.js').DEMO;
check('dataset is deterministic across loads', DEMO2.utilityEvents.length === DEMO.utilityEvents.length
  && DEMO2.operatorEvents.length === DEMO.operatorEvents.length);

console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : `\n${failures} SMOKE TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
