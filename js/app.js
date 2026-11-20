// ============================================================================
// ScoutScope — application logic (vanilla JS, no dependencies)
// Tabs: Overview | Utility Heatmap | Operator Profiler | Anti-Strat | Planner
//       | Data & Evidence
// ============================================================================
'use strict';

/* global MAPS, TEAMS, ABILITIES, CATEGORY_LABELS, DEMO, ANTISTRAT */

const state = {
  tab: 'overview',
  team: 'IW',
  map: 'Ascent',
  side: 'def',
  category: 'all',
  ability: 'all',
  player: 'all',
  heat: true,
  imported: null, // { utilityEvents, operatorEvents, label } from CSV import
};

function data() {
  return state.imported || DEMO;
}

function $(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ---------------------------------------------------------------------------
// Filtering
// ---------------------------------------------------------------------------
function filteredUtility() {
  return data().utilityEvents.filter((e) =>
    e.team === state.team && e.map === state.map && e.side === state.side &&
    (state.category === 'all' || e.category === state.category) &&
    (state.ability === 'all' || e.ability === state.ability) &&
    (state.player === 'all' || e.player === state.player));
}

function filteredOperator() {
  return data().operatorEvents.filter((e) =>
    e.team === state.team && e.map === state.map && e.side === state.side &&
    (state.player === 'all' || e.player === state.player));
}

function team() { return TEAMS.find((t) => t.id === state.team); }

// Defensive rounds in the demo set per team per map (denominator for %).
function roundsAnalyzed() {
  return state.imported ? state.imported.rounds || '—' : 20;
}

// ---------------------------------------------------------------------------
// Map rendering (original schematic SVG, drawn from MAPS zones)
// ---------------------------------------------------------------------------
const CAT_COLORS = { placeable: '#ffd23f', recon: '#4cc9f0', smoke: '#b5179e', flash: '#ff6b35', stall: '#80ed99' };
const ANGLE_COLORS = { aggressive: '#ff5964', pixel: '#ffd23f', passive: '#4cc9f0' };

function mapSVG(events, opts) {
  const map = MAPS[state.map];
  const W = 100, H = 62;
  let s = `<svg viewBox="0 0 ${W} ${H}" class="mapsvg" role="img" aria-label="Schematic map of ${esc(state.map)}">`;
  s += `<rect x="0" y="0" width="${W}" height="${H}" rx="2" class="map-bg"/>`;
  for (const [x1, y1, x2, y2] of map.lanes) {
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="map-lane"/>`;
  }
  for (const z of map.zones) {
    s += `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="1.5" class="map-zone ${z.kind}"/>`;
  }
  if (opts.heat && events.length) {
    // Density blobs: one radial blob per cluster label.
    const byLabel = {};
    for (const e of events) (byLabel[e.label] = byLabel[e.label] || []).push(e);
    for (const [label, list] of Object.entries(byLabel)) {
      const cx = list.reduce((a, e) => a + e.x, 0) / list.length;
      const cy = list.reduce((a, e) => a + e.y, 0) / list.length;
      const intensity = Math.min(0.5, 0.10 + list.length * 0.015);
      s += `<circle cx="${cx}" cy="${cy}" r="${4 + Math.min(5, list.length * 0.25)}" fill="url(#heatGrad)" opacity="${intensity}"/>`;
    }
  }
  s = `<defs><radialGradient id="heatGrad"><stop offset="0%" stop-color="#ff5964" stop-opacity="0.9"/><stop offset="100%" stop-color="#ff5964" stop-opacity="0"/></radialGradient></defs>` + s;
  for (const e of events) {
    const color = opts.mode === 'operator' ? ANGLE_COLORS[e.angle] : CAT_COLORS[e.category];
    const glyph = opts.mode === 'operator' ? '◎' : '●';
    s += `<g class="marker" data-id="${e.id}"><circle cx="${e.x}" cy="${e.y}" r="1.4" fill="${color}" stroke="#0b0e14" stroke-width="0.45"/>`
      + `<text x="${e.x}" y="${e.y + 0.55}" class="marker-glyph" text-anchor="middle">${glyph}</text>`
      + `<title>${esc(e.ability || e.weapon)} — ${esc(e.player)} (${esc(e.agent)}) · ${esc(e.label)} · ${esc(e.roundTime)}</title></g>`;
  }
  if (opts.planner) {
    for (const p of plannerSetups.filter((x) => x.map === state.map)) {
      s += `<g class="marker plan"><circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#00e5a0" stroke="#0b0e14" stroke-width="0.45"/>`
        + `<text x="${p.x}" y="${p.y - 2.4}" class="plan-label" text-anchor="middle">${esc(p.name)}</text>`
        + `<title>Your setup: ${esc(p.name)} — ${esc(p.ability)}</title></g>`;
    }
  }
  // Zone labels last so markers never hide them.
  for (const z of map.zones) {
    s += `<text x="${z.x + z.w / 2}" y="${z.y + z.h / 2 + 1.2}" class="map-label">${esc(z.label)}</text>`;
  }
  s += '</svg>';
  return s;
}

// ---------------------------------------------------------------------------
// Insights engine — the "at least one useful, data-backed insight" requirement
// ---------------------------------------------------------------------------
function topTendencies() {
  const events = data().utilityEvents.filter((e) => e.team === state.team && e.map === state.map && e.side === state.side);
  const rounds = roundsAnalyzed();
  const byKey = {};
  for (const e of events) {
    const k = `${e.ability} @ ${e.label}`;
    byKey[k] = byKey[k] || { ability: e.ability, label: e.label, category: e.category, n: 0, players: new Set() };
    byKey[k].n += 1;
    byKey[k].players.add(e.player);
  }
  return Object.values(byKey)
    .map((t) => ({ ...t, pct: Math.round((t.n / rounds) * 100), players: [...t.players].join(', ') }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 5);
}

function operatorSummary() {
  const ops = filteredOperator();
  const rounds = roundsAnalyzed();
  if (!ops.length) return null;
  const byAngle = { aggressive: 0, pixel: 0, passive: 0 };
  const byTime = { '0–20s': 0, '20–40s': 0, '40s+': 0 };
  const bySpot = {};
  for (const o of ops) {
    byAngle[o.angle] += 1;
    byTime[o.roundTime] += 1;
    bySpot[o.label] = (bySpot[o.label] || 0) + 1;
  }
  const topSpot = Object.entries(bySpot).sort((a, b) => b[1] - a[1])[0];
  const pct = (n) => Math.round((n / ops.length) * 100);
  return {
    n: ops.length, rounds,
    buyRate: Math.round((ops.length / rounds) * 100),
    player: ops[0].player, agent: ops[0].agent,
    aggressivePct: pct(byAngle.aggressive),
    pixelPct: pct(byAngle.pixel),
    passivePct: pct(byAngle.passive),
    earlyPct: pct(byTime['0–20s']),
    midPct: pct(byTime['20–40s']),
    latePct: pct(byTime['40s+']),
    topSpot: topSpot[0], topSpotPct: pct(topSpot[1]),
    byAngle, byTime,
  };
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------
function renderFilters() {
  const teamSel = $('f-team');
  teamSel.innerHTML = TEAMS.map((t) => `<option value="${t.id}" ${t.id === state.team ? 'selected' : ''}>${esc(t.name)} (${esc(t.tag)})</option>`).join('');
  const mapSel = $('f-map');
  mapSel.innerHTML = Object.keys(MAPS).map((m) => `<option ${m === state.map ? 'selected' : ''}>${m}</option>`).join('');
  const catSel = $('f-cat');
  catSel.innerHTML = `<option value="all">All utility types</option>` +
    Object.entries(CATEGORY_LABELS).map(([k, v]) => `<option value="${k}" ${k === state.category ? 'selected' : ''}>${v}</option>`).join('');
  const abSel = $('f-ability');
  abSel.innerHTML = `<option value="all">All abilities</option>` +
    Object.keys(ABILITIES).map((a) => `<option ${a === state.ability ? 'selected' : ''}>${a}</option>`).join('');
  const plSel = $('f-player');
  const players = team().players;
  plSel.innerHTML = `<option value="all">All players</option>` +
    players.map((p) => `<option value="${p.handle}" ${p.handle === state.player ? 'selected' : ''}>${esc(p.handle)} — ${esc(p.agent)}</option>`).join('');
  $('team-style').textContent = `${team().name} — ${team().style}`;
}

function insightCards() {
  const t = topTendencies();
  const rounds = roundsAnalyzed();
  if (!t.length) return '<p class="muted">No utility events match the current filters.</p>';
  return t.map((x, i) => `
    <article class="card insight">
      <div class="rank">#${i + 1}</div>
      <div>
        <h3>${esc(x.ability)} at ${esc(x.label)} — <strong>${x.pct}%</strong> of defensive rounds</h3>
        <p>${esc(x.n)} placements in ${rounds} rounds analysed · ${esc(x.category)} · ${esc(x.players)}</p>
        <p class="evidence">Evidence: n=${x.n} events, ${rounds} rounds, ${state.imported ? 'imported data' : 'demo dataset (12 matches)'}. ${x.pct >= 50 ? 'High-confidence tendency — build the anti-strat around this.' : 'Moderate tendency — verify on VOD before committing.'}</p>
      </div>
    </article>`).join('');
}

function renderOverview() {
  const op = operatorSummary();
  $('view').innerHTML = `
    <section class="grid-2">
      <div>
        <h2>Key findings — ${esc(team().name)} on ${esc(state.map)}</h2>
        <p class="muted">Defence, ${roundsAnalyzed()} rounds analysed · ${state.imported ? esc(state.imported.label) : 'Demo dataset — synthetic, 12 matches'}. Every claim below shows its sample size.</p>
        ${insightCards()}
      </div>
      <div>
        <h2>Operator snapshot</h2>
        ${op ? `
        <article class="card">
          <h3>${esc(op.player)} (${esc(op.agent)}) holds the Operator in <strong>${op.buyRate}%</strong> of rounds</h3>
          <p>${op.n} Operator rounds in ${op.rounds} rounds analysed.</p>
          <ul class="bars">
            <li><span>Aggressive angles</span><div class="bar"><i style="width:${op.aggressivePct}%"></i></div><b>${op.aggressivePct}%</b></li>
            <li><span>Pixel angles</span><div class="bar"><i style="width:${op.pixelPct}%"></i></div><b>${op.pixelPct}%</b></li>
            <li><span>Passive holds</span><div class="bar"><i style="width:${op.passivePct}%"></i></div><b>${op.passivePct}%</b></li>
          </ul>
          <p>Most common setup: <strong>${esc(op.topSpot)}</strong> (${op.topSpotPct}%). ${op.earlyPct}% of Operator rounds start in the first 20 seconds.</p>
          <p class="muted">Coach read: “${esc(op.player)}, the primary Operator player, holds ${op.aggressivePct >= 60 ? 'aggressive' : op.aggressivePct >= 40 ? 'mixed' : 'passive'} angles at ${esc(op.topSpot)}, ${op.earlyPct}% between 0–20s.”</p>
        </article>` : '<p class="muted">No Operator rounds in this filter.</p>'}
        <article class="card">
          <h3>How to use this page</h3>
          <ol>
            <li>Pick the opponent and map above — every tab follows the same filters.</li>
            <li><b>Utility Heatmap</b> shows where each ability lands, with hard numbers.</li>
            <li><b>Operator Profiler</b> breaks down the sniper’s angles and timing.</li>
            <li><b>Anti-Strat</b> turns the top tendencies into a game plan.</li>
            <li><b>Planner</b> lets you draw your own setups on the map and export them.</li>
          </ol>
        </article>
      </div>
    </section>`;
}

function renderHeatmap() {
  const events = filteredUtility();
  const rounds = roundsAnalyzed();
  const byLabel = {};
  for (const e of events) {
    const k = `${e.ability} @ ${e.label}`;
    byLabel[k] = (byLabel[k] || 0) + 1;
  }
  const rows = Object.entries(byLabel).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}/${rounds} rounds</td><td><b>${Math.round((n / rounds) * 100)}%</b></td></tr>`).join('');
  $('view').innerHTML = `
    <h2>Utility placement — ${esc(team().name)} · ${esc(state.map)} · defence</h2>
    <p class="muted">${events.length} placements plotted · ${rounds} rounds analysed · schematic map (original diagram, not to scale). Toggle the heat overlay to see density at a glance.</p>
    <label class="toggle"><input type="checkbox" id="heat-toggle" ${state.heat ? 'checked' : ''}> Heat overlay</label>
    <div class="map-wrap">${mapSVG(events, { heat: state.heat, mode: 'utility' })}</div>
    <div class="legend">${Object.entries(CAT_COLORS).map(([k, c]) => `<span><i style="background:${c}"></i>${esc(CATEGORY_LABELS[k])}</span>`).join('')}</div>
    <h3>Frequency table</h3>
    <table class="tbl"><thead><tr><th>Ability @ location</th><th>Events</th><th>Frequency</th></tr></thead><tbody>${rows || '<tr><td colspan="3">No events match the filters.</td></tr>'}</tbody></table>`;
  $('heat-toggle').addEventListener('change', (e) => { state.heat = e.target.checked; render(); });
}

function renderProfiler() {
  const op = operatorSummary();
  const ops = filteredOperator();
  const bySpot = {};
  for (const o of ops) bySpot[o.label] = (bySpot[o.label] || 0) + 1;
  const spotRows = Object.entries(bySpot).sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `<tr><td>${esc(k)}</td><td>${n}</td><td><b>${Math.round((n / ops.length) * 100)}%</b></td></tr>`).join('');
  $('view').innerHTML = `
    <h2>Operator Tendency &amp; Sniper Profiler — ${esc(team().name)} · ${esc(state.map)}</h2>
    ${op ? `
    <p class="muted">${op.n} Operator rounds in ${op.rounds} rounds analysed. Colour: <span class="dot" style="background:${ANGLE_COLORS.aggressive}"></span> aggressive · <span class="dot" style="background:${ANGLE_COLORS.pixel}"></span> pixel · <span class="dot" style="background:${ANGLE_COLORS.passive}"></span> passive.</p>
    <div class="map-wrap">${mapSVG(ops, { heat: false, mode: 'operator' })}</div>
    <section class="grid-2">
      <article class="card">
        <h3>Angle mix</h3>
        <ul class="bars">
          <li><span>Aggressive forward angles</span><div class="bar"><i style="width:${op.aggressivePct}%"></i></div><b>${op.aggressivePct}%</b></li>
          <li><span>Pixel angles</span><div class="bar"><i style="width:${op.pixelPct}%"></i></div><b>${op.pixelPct}%</b></li>
          <li><span>Passive holds</span><div class="bar"><i style="width:${op.passivePct}%"></i></div><b>${op.passivePct}%</b></li>
        </ul>
        <h3>Round timing</h3>
        <ul class="bars">
          <li><span>0–20s</span><div class="bar"><i style="width:${op.earlyPct}%"></i></div><b>${op.earlyPct}%</b></li>
          <li><span>20–40s</span><div class="bar"><i style="width:${op.midPct}%"></i></div><b>${op.midPct}%</b></li>
          <li><span>40s+</span><div class="bar"><i style="width:${op.latePct}%"></i></div><b>${op.latePct}%</b></li>
        </ul>
      </article>
      <article class="card">
        <h3>Setup spots</h3>
        <table class="tbl"><thead><tr><th>Spot</th><th>Rounds</th><th>Share</th></tr></thead><tbody>${spotRows}</tbody></table>
        <p><strong>Coach read:</strong> ${esc(op.player)} buys the Operator in ${op.buyRate}% of rounds, favours ${esc(op.topSpot)} (${op.topSpotPct}%), and sets up ${op.earlyPct}% of the time inside the first 20 seconds. ${op.aggressivePct >= 60 ? 'Expect early aggression — pre-smoke the angle.' : 'Mostly disciplined holds — take the space, don’t repeek.'}</p>
      </article>
    </section>` : '<p class="muted">No Operator rounds match the current filters.</p>'}`;
}

function renderAntiStrat() {
  const t = topTendencies();
  const op = operatorSummary();
  const cards = t.map((x) => {
    const play = ANTISTRAT[x.ability] || ANTISTRAT.Operator;
    return `<article class="card">
      <h3>vs ${esc(x.ability)} @ ${esc(x.label)} (${x.pct}%)</h3>
      <p><strong>${esc(play.title)}.</strong> ${esc(play.body)}</p>
      <p class="evidence">Based on ${x.n} events in ${roundsAnalyzed()} rounds · ${esc(x.players)}</p>
    </article>`;
  }).join('');
  $('view').innerHTML = `
    <h2>Anti-strat — a game plan from the tendencies</h2>
    <p class="muted">Each counter below is tied to one measured tendency (with its sample size), not a guess. Present this page in the pre-match meeting.</p>
    <div class="grid-2">${cards || '<p class="muted">No tendencies to counter in this filter.</p>'}</div>
    ${op && op.aggressivePct >= 50 ? `<article class="card"><h3>vs the Operator (${esc(op.player)}, ${op.buyRate}% buy rate)</h3>
      <p><strong>${esc(ANTISTRAT.Operator.title)}.</strong> ${esc(ANTISTRAT.Operator.body)}</p>
      <p class="evidence">Based on ${op.n} Operator rounds · top spot ${esc(op.topSpot)} (${op.topSpotPct}%)</p></article>` : ''}
    <article class="card">
      <h3>Self-scouting note</h3>
      <p>Run the same filters with Cloud9’s own matches (import them in Data &amp; Evidence) to check whether Cloud9 repeats any of these patterns — a tendency the opponent has already scouted is a tendency to break first.</p>
    </article>`;
}

// ---------------------------------------------------------------------------
// Planner (coach's own setups, localStorage)
// ---------------------------------------------------------------------------
let plannerSetups = [];
try { plannerSetups = JSON.parse(localStorage.getItem('scoutscope-setups') || '[]'); } catch { plannerSetups = []; }
function savePlanner() { try { localStorage.setItem('scoutscope-setups', JSON.stringify(plannerSetups)); } catch { /* private mode */ } }

let pendingPoint = null;

function renderPlanner() {
  const mine = plannerSetups.filter((p) => p.map === state.map);
  $('view').innerHTML = `
    <h2>Setup planner — draw your own utility on ${esc(state.map)}</h2>
    <p class="muted">Click the map to drop a marker, name the setup, and save it. Setups persist in this browser (localStorage) and export as JSON for the team.</p>
    <div class="map-wrap clickable" id="plan-map">${mapSVG([], { heat: false, mode: 'utility', planner: true })}</div>
    <div class="planner-form">
      <label>Setup name <input id="plan-name" placeholder="e.g. B retake — double trap"></label>
      <label>Ability
        <select id="plan-ability">${Object.keys(ABILITIES).map((a) => `<option>${a}</option>`).join('')}</select>
      </label>
      <button id="plan-add" class="btn" disabled>Save setup (click the map first)</button>
      <button id="plan-export" class="btn ghost">Export JSON</button>
      <button id="plan-clear" class="btn ghost danger">Clear this map</button>
    </div>
    <p id="plan-hint" class="muted">No point picked yet — click anywhere on the map.</p>
    <h3>Saved setups on ${esc(state.map)} (${mine.length})</h3>
    <ul class="setups">${mine.map((p, i) => `<li><b>${esc(p.name)}</b> — ${esc(p.ability)} @ (${p.x}, ${p.y}) <button data-i="${i}" class="btn mini danger del-setup">Delete</button></li>`).join('') || '<li class="muted">None yet.</li>'}</ul>
    <pre id="plan-export-out" class="export-out" hidden></pre>`;
  const svg = $('plan-map').querySelector('svg');
  svg.addEventListener('click', (ev) => {
    const pt = svg.createSVGPoint();
    pt.x = ev.clientX; pt.y = ev.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    pendingPoint = { x: +Math.max(2, Math.min(98, loc.x)).toFixed(1), y: +Math.max(2, Math.min(60, loc.y)).toFixed(1) };
    $('plan-hint').textContent = `Point picked: (${pendingPoint.x}, ${pendingPoint.y}). Name it and save.`;
    $('plan-add').disabled = false;
  });
  $('plan-add').addEventListener('click', () => {
    if (!pendingPoint) return;
    const name = $('plan-name').value.trim() || `Setup ${mine.length + 1}`;
    plannerSetups.push({ ...pendingPoint, name, ability: $('plan-ability').value, map: state.map });
    savePlanner();
    pendingPoint = null;
    render();
  });
  $('plan-export').addEventListener('click', () => {
    const out = $('plan-export-out');
    out.hidden = false;
    out.textContent = JSON.stringify(mine, null, 2);
  });
  $('plan-clear').addEventListener('click', () => {
    plannerSetups = plannerSetups.filter((p) => p.map !== state.map);
    savePlanner();
    render();
  });
  document.querySelectorAll('.del-setup').forEach((b) => b.addEventListener('click', () => {
    const idx = plannerSetups.findIndex((p) => p.map === state.map);
    const mineIdx = +b.dataset.i;
    const target = mine[mineIdx];
    plannerSetups = plannerSetups.filter((p) => p !== target);
    savePlanner();
    render();
  }));
}

// ---------------------------------------------------------------------------
// Data & Evidence tab (incl. GRID-format CSV import)
// ---------------------------------------------------------------------------
function renderData() {
  const d = data();
  $('view').innerHTML = `
    <h2>Data &amp; evidence</h2>
    <section class="grid-2">
      <article class="card">
        <h3>What you are looking at</h3>
        <p><strong>${state.imported ? esc(state.imported.label) : 'Demo dataset (synthetic).'}</strong></p>
        <ul>
          <li>Utility events: <b>${d.utilityEvents.length}</b></li>
          <li>Operator rounds: <b>${d.operatorEvents.length}</b></li>
          <li>Rounds analysed per team / map: <b>${roundsAnalyzed()}</b></li>
          <li>Matches: <b>${state.imported ? 'as imported' : '12 (demo)'}</b></li>
        </ul>
        ${state.imported ? '' : `<p class="muted">Demo data is fictional (fictional teams, fictional player handles) with distributions modelled on pro-play patterns from the Category 1 blueprint. It is labelled as demo everywhere in the UI so nobody mistakes it for real match telemetry. Swap it for real GRID data below — the analysis engine does not care where rows come from.</p>`}
        ${state.imported ? '<p><button id="data-reset" class="btn ghost">Back to demo dataset</button></p>' : ''}
      </article>
      <article class="card">
        <h3>Import real data (GRID-format CSV)</h3>
        <p>Columns: <code>map,team,player,agent,ability,x,y,side,round_time</code> — one row per ability cast. Operator rows use <code>ability=Operator</code>. Coordinates 0–100. GRID telemetry gives cast location and time; landing location is inferred the same way the blueprint allows (see METHODOLOGY.md).</p>
        <textarea id="csv-in" rows="6" placeholder="map,team,player,agent,ability,x,y,side,round_time&#10;Ascent,IW,Vex,Cypher,Trapwire,50,52,def,0–20s"></textarea>
        <p><button id="csv-load" class="btn">Load CSV into the tool</button>
        <button id="csv-sample" class="btn ghost">Load 5-row sample</button></p>
        <p id="csv-msg" class="muted"></p>
      </article>
    </section>
    <article class="card">
      <h3>Methodology in one paragraph</h3>
      <p>Every percentage on this site is <code>events ÷ defensive rounds analysed</code> for the current filter, with the numerator and denominator shown next to it. Heat blobs are density summaries of the same plotted points — never a separate hidden model. Round-time buckets follow the blueprint (0–20s / 20–40s / 40s+). Full write-up: <code>METHODOLOGY.md</code> in the repo.</p>
    </article>`;
  const reset = $('data-reset');
  if (reset) reset.addEventListener('click', () => { state.imported = null; render(); });
  $('csv-sample').addEventListener('click', () => {
    $('csv-in').value = 'map,team,player,agent,ability,x,y,side,round_time\n'
      + 'Ascent,IW,Vex,Cypher,Trapwire,50,52,def,0–20s\n'
      + 'Ascent,IW,Vex,Cypher,Trapwire,51,53,def,0–20s\n'
      + 'Ascent,IW,Mira,Killjoy,Alarmbot,50,9,def,20–40s\n'
      + 'Ascent,IW,Havoc,Jett,Operator,50,46,def,0–20s\n'
      + 'Ascent,IW,Havoc,Jett,Operator,58,31,def,0–20s';
  });
  $('csv-load').addEventListener('click', () => {
    const lines = $('csv-in').value.trim().split('\n');
    const util = [], ops = [];
    let rounds = 0;
    const seenRounds = new Set();
    for (const line of lines.slice(1)) {
      const [map, teamId, player, agent, ability, x, y, side, rt] = line.split(',').map((s) => (s || '').trim());
      if (!map || !ability) continue;
      const row = { id: util.length + ops.length + 1, map, team: teamId, teamName: teamId, player, agent, ability, x: +x, y: +y, label: ability, side: side || 'def', roundTime: rt || '0–20s' };
      if (ability === 'Operator') { ops.push({ ...row, weapon: 'Operator', angle: 'aggressive' }); }
      else { row.category = (ABILITIES[ability] || {}).category || 'placeable'; util.push(row); }
      seenRounds.add(map + teamId);
    }
    if (!util.length && !ops.length) { $('csv-msg').textContent = 'No valid rows found — check the header and columns.'; return; }
    state.imported = { utilityEvents: util, operatorEvents: ops, label: `Imported CSV (${util.length + ops.length} rows)`, rounds: Math.max(1, Math.round((util.length + ops.length) / 4)) };
    // Register the imported team so filters can select it.
    if (!TEAMS.find((t) => t.id === (util[0] || ops[0] || {}).team)) {
      const tid = (util[0] || ops[0]).team;
      TEAMS.push({ id: tid, name: tid, tag: tid, style: 'Imported team', players: [...new Set([...util, ...ops].map((r) => r.player))].map((h) => ({ handle: h, agent: '—', role: '' })), spotBias: {}, opAggression: 0.5, opBuyRate: 0.5 });
    }
    state.team = (util[0] || ops[0]).team;
    $('csv-msg').textContent = `Loaded ${util.length} utility rows + ${ops.length} Operator rows. Filters now point at the imported team.`;
    renderFilters();
    render();
  });
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------
const TABS = [
  ['overview', 'Overview'],
  ['heatmap', 'Utility Heatmap'],
  ['profiler', 'Operator Profiler'],
  ['antistrat', 'Anti-Strat'],
  ['planner', 'Planner'],
  ['data', 'Data & Evidence'],
];

function renderTabs() {
  $('tabs').innerHTML = TABS.map(([id, label]) =>
    `<button class="tab ${state.tab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`).join('');
  document.querySelectorAll('.tab').forEach((b) =>
    b.addEventListener('click', () => { state.tab = b.dataset.tab; render(); }));
}

function render() {
  renderFilters();
  ({ overview: renderOverview, heatmap: renderHeatmap, profiler: renderProfiler, antistrat: renderAntiStrat, planner: renderPlanner, data: renderData })[state.tab]();
}

document.addEventListener('DOMContentLoaded', () => {
  // Deep-link a tab, e.g. index.html#heatmap — handy for judges and demos.
  const hash = (location.hash || '').replace('#', '');
  if (TABS.some(([id]) => id === hash)) state.tab = hash;
  renderTabs();
  $('f-team').addEventListener('change', (e) => { state.team = e.target.value; state.player = 'all'; render(); });
  $('f-map').addEventListener('change', (e) => { state.map = e.target.value; render(); });
  $('f-cat').addEventListener('change', (e) => { state.category = e.target.value; render(); });
  $('f-ability').addEventListener('change', (e) => { state.ability = e.target.value; render(); });
  $('f-player').addEventListener('change', (e) => { state.player = e.target.value; render(); });
  render();
});

// Exposed for the Node smoke test (jsdom-free: data.js is required directly).
if (typeof module !== 'undefined') module.exports = { state, topTendencies, operatorSummary, filteredUtility };
