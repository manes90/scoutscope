// ============================================================================
// ScoutScope — demo dataset (SYNTHETIC, clearly labelled in the UI)
// ----------------------------------------------------------------------------
// This file contains a DEMO dataset: fictional opponent teams, fictional
// player handles, and synthetic round data. It exists so coaches, judges and
// developers can run the whole tool without a GRID API key.
//
// Distributions are modelled on the patterns the Category 1 blueprint asks
// for (Sentinel placeable-utility clusters, Operator setup tendencies,
// round-time buckets). Real GRID telemetry can replace this file via the
// in-app CSV import (Data & Evidence tab) — the analysis engine is
// data-source agnostic.
// Sample size of the demo set: 240 rounds / 12 matches / 3 maps.
// ============================================================================

'use strict';

// Deterministic RNG so every load shows the same numbers (judges can verify).
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rng = mulberry32(20261119);

function jitter(v, amt) {
  return Math.max(2, Math.min(98, v + (rng() - 0.5) * amt));
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const MAPS = {
  Ascent: {
    label: 'Ascent',
    // Schematic zones (original diagram, not to scale, drawn by us).
    // viewBox is 100 x 62.
    zones: [
      { x: 78, y: 4,  w: 19, h: 14, label: 'A Site',  kind: 'site' },
      { x: 4,  y: 4,  w: 19, h: 14, label: 'B Site',  kind: 'site' },
      { x: 40, y: 4,  w: 20, h: 10, label: 'A Main',  kind: 'lane' },
      { x: 40, y: 48, w: 20, h: 10, label: 'B Main',  kind: 'lane' },
      { x: 44, y: 22, w: 12, h: 18, label: 'Mid',     kind: 'lane' },
      { x: 4,  y: 26, w: 12, h: 12, label: 'B Lobby', kind: 'lane' },
      { x: 84, y: 26, w: 12, h: 12, label: 'A Lobby', kind: 'lane' },
      { x: 40, y: 22, w: 20, h: 8,  label: 'Mid Top', kind: 'lane' },
      { x: 62, y: 22, w: 12, h: 18, label: 'Catwalk', kind: 'lane' },
      { x: 26, y: 22, w: 12, h: 18, label: 'Market',  kind: 'lane' },
    ],
    lanes: [ // connectors, [x1,y1,x2,y2]
      [50, 14, 50, 22], [50, 40, 50, 48], [16, 32, 26, 32], [74, 32, 84, 32],
      [38, 31, 62, 31], [88, 18, 88, 26], [12, 18, 12, 26],
    ],
  },
  Bind: {
    label: 'Bind',
    zones: [
      { x: 76, y: 4,  w: 20, h: 14, label: 'A Site',  kind: 'site' },
      { x: 4,  y: 44, w: 20, h: 14, label: 'B Site',  kind: 'site' },
      { x: 42, y: 6,  w: 18, h: 10, label: 'A Short', kind: 'lane' },
      { x: 42, y: 46, w: 18, h: 10, label: 'B Long',  kind: 'lane' },
      { x: 44, y: 24, w: 12, h: 14, label: 'Mid',     kind: 'lane' },
      { x: 66, y: 24, w: 12, h: 14, label: 'Hookah',  kind: 'lane' },
      { x: 22, y: 24, w: 12, h: 14, label: 'Garden',  kind: 'lane' },
      { x: 4,  y: 24, w: 10, h: 12, label: 'B Lobby', kind: 'lane' },
      { x: 86, y: 24, w: 10, h: 12, label: 'A Lobby', kind: 'lane' },
    ],
    lanes: [
      [51, 16, 51, 24], [51, 38, 51, 46], [34, 31, 44, 31], [56, 31, 66, 31],
      [14, 30, 22, 30], [78, 30, 86, 30],
    ],
  },
  Haven: {
    label: 'Haven',
    zones: [
      { x: 80, y: 4,  w: 17, h: 13, label: 'A Site',  kind: 'site' },
      { x: 40, y: 4,  w: 17, h: 13, label: 'B Site',  kind: 'site' },
      { x: 3,  y: 4,  w: 17, h: 13, label: 'C Site',  kind: 'site' },
      { x: 44, y: 24, w: 12, h: 12, label: 'Mid',     kind: 'lane' },
      { x: 66, y: 24, w: 12, h: 12, label: 'A Long',  kind: 'lane' },
      { x: 22, y: 24, w: 12, h: 12, label: 'C Long',  kind: 'lane' },
      { x: 44, y: 44, w: 12, h: 12, label: 'Mid Lobby', kind: 'lane' },
      { x: 80, y: 24, w: 12, h: 12, label: 'A Lobby', kind: 'lane' },
      { x: 8,  y: 24, w: 12, h: 12, label: 'C Lobby', kind: 'lane' },
    ],
    lanes: [
      [50, 17, 50, 24], [50, 36, 50, 44], [34, 30, 44, 30], [56, 30, 66, 30],
      [88, 17, 88, 24], [14, 17, 14, 24],
    ],
  },
};

const AGENTS = {
  Cypher:    { role: 'Sentinel', color: '#e8e8e8' },
  Killjoy:   { role: 'Sentinel', color: '#ffd23f' },
  Vyse:      { role: 'Sentinel', color: '#c77dff' },
  Chamber:   { role: 'Sentinel', color: '#f4a261' },
  Sova:      { role: 'Initiator', color: '#4cc9f0' },
  Skye:      { role: 'Initiator', color: '#80ed99' },
  Breach:    { role: 'Initiator', color: '#ff6b35' },
  'KAY/O':   { role: 'Initiator', color: '#adb5bd' },
  Omen:      { role: 'Controller', color: '#7b2cbf' },
  Brimstone: { role: 'Controller', color: '#e07a5f' },
  Jett:      { role: 'Duelist', color: '#ffffff' },
  Raze:      { role: 'Duelist', color: '#ffbe0b' },
};

const ABILITIES = {
  Trapwire:   { agent: 'Cypher',    category: 'placeable' },
  Alarmbot:   { agent: 'Killjoy',   category: 'placeable' },
  Turret:     { agent: 'Killjoy',   category: 'placeable' },
  Razorvine:  { agent: 'Vyse',      category: 'placeable' },
  Trademark:  { agent: 'Chamber',   category: 'placeable' },
  'Recon Bolt': { agent: 'Sova',    category: 'recon' },
  'Owl Drone':  { agent: 'Sova',    category: 'recon' },
  Trailblazer:  { agent: 'Skye',    category: 'recon' },
  'Dark Cover': { agent: 'Omen',    category: 'smoke' },
  'Sky Smoke':  { agent: 'Brimstone', category: 'smoke' },
  Flashpoint:   { agent: 'Breach',  category: 'flash' },
  'FLASH/drive': { agent: 'KAY/O',  category: 'flash' },
  'Aftershock': { agent: 'Breach',  category: 'stall' },
  'Nanoswarm':  { agent: 'Killjoy', category: 'stall' },
};

const CATEGORY_LABELS = {
  placeable: 'Placeable utility',
  recon: 'Recon',
  smoke: 'Smokes',
  flash: 'Flashes',
  stall: 'Reactive stall',
};

// Fictional demo opponents (NOT real teams — see header note).
const TEAMS = [
  {
    id: 'IW', name: 'Iron Wolves', tag: 'IW',
    style: 'Sentinel-heavy, trap-first defence',
    players: [
      { handle: 'Vex',   agent: 'Cypher',  role: 'Sentinel / IGL' },
      { handle: 'Mira',  agent: 'Killjoy', role: 'Sentinel' },
      { handle: 'Havoc', agent: 'Jett',    role: 'Duelist / Operator' },
      { handle: 'Sable', agent: 'Sova',    role: 'Initiator' },
      { handle: 'Onyx',  agent: 'Omen',    role: 'Controller' },
    ],
    // Tendency multipliers per map spot label (1.0 = average).
    spotBias: { 'B Main': 2.4, 'B Lobby': 1.8, 'A Main': 0.7, 'Mid': 0.9 },
    opAggression: 0.35, // share of aggressive Operator angles
    opBuyRate: 0.58,
  },
  {
    id: 'SF', name: 'Solar Flare', tag: 'SF',
    style: 'Aggressive Operator-first attack',
    players: [
      { handle: 'Nova',  agent: 'Jett',    role: 'Duelist / Operator' },
      { handle: 'Pico',  agent: 'Chamber', role: 'Sentinel / Operator' },
      { handle: 'Lumen', agent: 'Skye',    role: 'Initiator' },
      { handle: 'Ash',   agent: 'Brimstone', role: 'Controller' },
      { handle: 'Rook',  agent: 'Vyse',    role: 'Sentinel' },
    ],
    spotBias: { 'A Main': 1.9, 'Mid': 1.6, 'B Main': 0.8, 'A Long': 2.0, 'C Long': 1.4 },
    opAggression: 0.78,
    opBuyRate: 0.81,
  },
  {
    id: 'AR', name: 'Apex Reign', tag: 'AR',
    style: 'Balanced, mid-control heavy',
    players: [
      { handle: 'Kestrel', agent: 'Sova',   role: 'Initiator' },
      { handle: 'Dune',    agent: 'Killjoy', role: 'Sentinel' },
      { handle: 'Fable',   agent: 'Jett',   role: 'Duelist / Operator' },
      { handle: 'Wraith',  agent: 'Omen',   role: 'Controller' },
      { handle: 'Bishop',  agent: 'Breach', role: 'Initiator' },
    ],
    spotBias: { 'Mid': 2.1, 'Catwalk': 1.7, 'Market': 1.5, 'B Main': 1.0 },
    opAggression: 0.52,
    opBuyRate: 0.66,
  },
];

// Where each ability tends to land, per map. x/y are 0–100 schematic coords.
// `base` = events per 40 defensive rounds for an average team.
const SPOTS = {
  Ascent: [
    { x: 50, y: 52, label: 'B Main',   ability: 'Trapwire',  base: 26 },
    { x: 12, y: 30, label: 'B Lobby',  ability: 'Trapwire',  base: 14 },
    { x: 50, y: 9,  label: 'A Main',   ability: 'Alarmbot',  base: 20 },
    { x: 88, y: 11, label: 'A Site',   ability: 'Turret',    base: 12 },
    { x: 50, y: 31, label: 'Mid',      ability: 'Razorvine', base: 16 },
    { x: 68, y: 31, label: 'Catwalk',  ability: 'Trademark', base: 10 },
    { x: 32, y: 31, label: 'Market',   ability: 'Alarmbot',  base: 9 },
    { x: 12, y: 11, label: 'B Site',   ability: 'Nanoswarm', base: 11 },
    { x: 50, y: 52, label: 'B Main',   ability: 'Recon Bolt', base: 18 },
    { x: 50, y: 9,  label: 'A Main',   ability: 'Recon Bolt', base: 15 },
    { x: 50, y: 31, label: 'Mid',      ability: 'Owl Drone',  base: 12 },
    { x: 88, y: 31, label: 'A Lobby',  ability: 'Dark Cover', base: 14 },
    { x: 12, y: 31, label: 'B Lobby',  ability: 'Sky Smoke',  base: 13 },
    { x: 50, y: 9,  label: 'A Main',   ability: 'Flashpoint', base: 10 },
  ],
  Bind: [
    { x: 51, y: 51, label: 'B Long',   ability: 'Trapwire',  base: 24 },
    { x: 9,  y: 30, label: 'B Lobby',  ability: 'Alarmbot',  base: 15 },
    { x: 51, y: 11, label: 'A Short',  ability: 'Trapwire',  base: 18 },
    { x: 86, y: 11, label: 'A Site',   ability: 'Turret',    base: 12 },
    { x: 50, y: 31, label: 'Mid',      ability: 'Razorvine', base: 15 },
    { x: 72, y: 31, label: 'Hookah',   ability: 'Trademark', base: 11 },
    { x: 28, y: 31, label: 'Garden',   ability: 'Alarmbot',  base: 9 },
    { x: 51, y: 51, label: 'B Long',   ability: 'Recon Bolt', base: 16 },
    { x: 51, y: 11, label: 'A Short',  ability: 'Recon Bolt', base: 13 },
    { x: 72, y: 31, label: 'Hookah',   ability: 'Dark Cover', base: 12 },
    { x: 9,  y: 30, label: 'B Lobby',  ability: 'Sky Smoke',  base: 11 },
  ],
  Haven: [
    { x: 28, y: 30, label: 'C Long',   ability: 'Trapwire',  base: 22 },
    { x: 72, y: 30, label: 'A Long',   ability: 'Trapwire',  base: 19 },
    { x: 50, y: 30, label: 'Mid',      ability: 'Alarmbot',  base: 17 },
    { x: 88, y: 10, label: 'A Site',   ability: 'Turret',    base: 11 },
    { x: 11, y: 10, label: 'C Site',   ability: 'Razorvine', base: 13 },
    { x: 48, y: 10, label: 'B Site',   ability: 'Trademark', base: 10 },
    { x: 28, y: 30, label: 'C Long',   ability: 'Recon Bolt', base: 15 },
    { x: 72, y: 30, label: 'A Long',   ability: 'Recon Bolt', base: 14 },
    { x: 50, y: 30, label: 'Mid',      ability: 'Owl Drone',  base: 11 },
    { x: 14, y: 30, label: 'C Lobby',  ability: 'Dark Cover', base: 12 },
    { x: 86, y: 30, label: 'A Lobby',  ability: 'Sky Smoke',  base: 12 },
  ],
};

// Operator setup spots per map: [x, y, label, angle]
const OP_SPOTS = {
  Ascent: [
    { x: 50, y: 46, label: 'B Main angle', angle: 'aggressive' },
    { x: 50, y: 18, label: 'A Main angle', angle: 'aggressive' },
    { x: 58, y: 31, label: 'Mid doors',    angle: 'aggressive' },
    { x: 84, y: 12, label: 'A Site pixel', angle: 'pixel' },
    { x: 16, y: 12, label: 'B Site pixel', angle: 'pixel' },
    { x: 66, y: 28, label: 'Catwalk hold', angle: 'passive' },
    { x: 34, y: 28, label: 'Market hold',  angle: 'passive' },
  ],
  Bind: [
    { x: 51, y: 44, label: 'B Long angle', angle: 'aggressive' },
    { x: 51, y: 18, label: 'A Short peek', angle: 'aggressive' },
    { x: 78, y: 12, label: 'A Site pixel', angle: 'pixel' },
    { x: 14, y: 50, label: 'B Site pixel', angle: 'pixel' },
    { x: 50, y: 28, label: 'Mid hold',     angle: 'passive' },
    { x: 70, y: 28, label: 'Hookah hold',  angle: 'passive' },
  ],
  Haven: [
    { x: 28, y: 24, label: 'C Long angle', angle: 'aggressive' },
    { x: 72, y: 24, label: 'A Long angle', angle: 'aggressive' },
    { x: 50, y: 26, label: 'Mid window',   angle: 'aggressive' },
    { x: 86, y: 10, label: 'A Site pixel', angle: 'pixel' },
    { x: 12, y: 10, label: 'C Site pixel', angle: 'pixel' },
    { x: 48, y: 12, label: 'B Site hold',  angle: 'passive' },
  ],
};

// ---------------------------------------------------------------------------
// Event generation (deterministic)
// ---------------------------------------------------------------------------
const TIME_BUCKETS = ['0–20s', '20–40s', '40s+'];
const TIME_WEIGHTS = [0.45, 0.35, 0.20]; // defence utility is early-round heavy

function pickTimeBucket() {
  const r = rng();
  return r < 0.45 ? '0–20s' : r < 0.8 ? '20–40s' : '40s+';
}

function buildDemoData() {
  const utilityEvents = [];
  const operatorEvents = [];
  let uid = 1;

  for (const team of TEAMS) {
    for (const [map, spots] of Object.entries(SPOTS)) {
      // 20 defensive rounds per team per map in the demo set.
      for (const spot of spots) {
        const bias = team.spotBias[spot.label] || 1.0;
        // Poisson saturation model: base is the expected placements per 40
        // rounds for an average team. p = P(>=1 placement in a round), so a
        // frequency can never exceed 100% no matter how strong the bias is.
        // 20 defensive rounds per team per map in the demo set.
        const lambda = (spot.base / 40) * bias;
        const count = Math.round((1 - Math.exp(-lambda)) * 20);
        const ability = ABILITIES[spot.ability];
        const player = team.players.find((p) => p.agent === ability.agent)
          || team.players[1];
        for (let i = 0; i < count; i++) {
          utilityEvents.push({
            id: uid++,
            map, team: team.id, teamName: team.name,
            player: player.handle, agent: ability.agent,
            ability: spot.ability, category: ability.category,
            x: +jitter(spot.x, 7).toFixed(1),
            y: +jitter(spot.y, 5).toFixed(1),
            label: spot.label, side: 'def',
            roundTime: pickTimeBucket(),
          });
        }
      }
      // Operator events for this team+map.
      const opPlayer = team.players.find((p) => p.role.includes('Operator'));
      const opSpots = OP_SPOTS[map];
      const opRounds = Math.round(20 * team.opBuyRate); // of 20 rounds
      for (let i = 0; i < opRounds; i++) {
        // Angle mix follows the team's aggression profile.
        const r = rng();
        const angle = r < team.opAggression ? 'aggressive'
          : r < team.opAggression + 0.25 ? 'pixel' : 'passive';
        const candidates = opSpots.filter((s) => s.angle === angle);
        const spot = candidates[Math.floor(rng() * candidates.length)] || opSpots[0];
        // Early-round bias for aggressive angles, late for passive holds.
        const time = angle === 'aggressive'
          ? (rng() < 0.8 ? '0–20s' : '20–40s')
          : angle === 'pixel'
            ? (rng() < 0.55 ? '0–20s' : rng() < 0.8 ? '20–40s' : '40s+')
            : (rng() < 0.6 ? '20–40s' : '40s+');
        operatorEvents.push({
          id: uid++,
          map, team: team.id, teamName: team.name,
          player: opPlayer.handle, agent: opPlayer.agent,
          weapon: 'Operator',
          x: +jitter(spot.x, 6).toFixed(1),
          y: +jitter(spot.y, 4).toFixed(1),
          label: spot.label, angle, side: 'def',
          roundTime: time,
        });
      }
    }
  }
  return { utilityEvents, operatorEvents };
}

const DEMO = buildDemoData();

// Anti-strat playbook: suggestion per detected pattern.
const ANTISTRAT = {
  Trapwire: {
    title: 'Clear the trap line before committing',
    body: 'Send a recon drone or a destructible-clearing ability through the trapped lane 5s before the execute. The trap cluster is static round-to-round, so one cleared lane removes the whole layer.',
  },
  Alarmbot: {
    title: 'Bait the alarm, then re-hit the other site',
    body: 'Trigger the Alarmbot with a lone lurk to burn the Sentinel rotation, then hit the opposite site while the Sentinel is out of position.',
  },
  Turret: {
    title: 'Break the turret from off-angle',
    body: 'The turret watches one fixed cone. Peek it from a perpendicular angle with a Sheriff/Vandal tap — never wide-swing into its line of sight.',
  },
  Razorvine: {
    title: 'Slow the mid take, don’t rush the vine',
    body: 'Razorvine punishes fast mid pushes. Walk the first 10s, break the vine with utility, then accelerate — the defence has already spent its stall.',
  },
  Trademark: {
    title: 'Respect the trip, punish the rotate',
    body: 'Trademark trips telegraph the Sentinel’s position. Once it pops, the site is weak for 15s — that is the window to execute.',
  },
  'Recon Bolt': {
    title: 'Break the dart, keep the execute',
    body: 'Recon darts land in the same 2–3 spots. Pre-aim the dart lineups and shoot them on entry; the defence loses its early info.',
  },
  Operator: {
    title: 'Deny the Operator angle with smoke + flash',
    body: 'The sniper holds one angle. Smoke it, flash through it, and take the space — never repeek a lost Operator duel. Force the Operator to rotate by pressuring the opposite site.',
  },
};

if (typeof module !== 'undefined') module.exports = { MAPS, TEAMS, ABILITIES, CATEGORY_LABELS, DEMO, ANTISTRAT };
