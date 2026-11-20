// ============================================================================
// ScoutScope — REAL match data (GRID, VCT Americas Stage 2 2025)
// ----------------------------------------------------------------------------
// Built-in dataset: Cloud9 vs FURIA, series 2819676, 2025-07-18.
// Haven 13–5, Bind 13–4 (Cloud9 won 2–0). 35 rounds won, 1,013 ability
// casts positioned, 8 Operator rounds. Full provenance + method in
// METHODOLOGY.md. Extraction: ~/workspace/hackathons/grid-work/extract2.py
// (source: the official Cloud9 starter repo — GRID VALORANT feed +
// ability supplement + meta CSVs; no login/API key).
//
// LICENCE: only AGGREGATES are committed here (counts by team/map/side/
// ability/location/player + round-time buckets). No per-event rows, no
// .zst/.jsonl extracts — the starter-repo licence allows aggregates, not
// redistribution of the raw data. The aggregates are expanded back into
// rows at runtime (expandReal) so the analysis engine stays row-based;
// the expansion preserves every marginal exactly (per-key counts,
// per-player counts, timing buckets, angle/spot mix) and jitters markers
// deterministically around the zone centre. See METHODOLOGY.md §4.
// ============================================================================

'use strict';

// Deterministic RNG (seeded) — marker jitter + expansion order.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------
const MAPS = {
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
      { x: 44, y: 44, w: 12, h: 12, label: 'Mid Courtyard', kind: 'lane' },
      { x: 80, y: 24, w: 12, h: 12, label: 'A Lobby', kind: 'lane' },
      { x: 8,  y: 24, w: 12, h: 12, label: 'C Lobby', kind: 'lane' },
    ],
    lanes: [
      [50, 17, 50, 24], [50, 36, 50, 44], [34, 30, 44, 30], [56, 30, 66, 30],
      [88, 17, 88, 24], [14, 17, 14, 24],
    ],
  },
};

// Every ability seen in series 2819676, plus the demo/CSV set (Trapwire,
// Trademark, Flashpoint, FLASH/drive, Aftershock — 0 casts in this series,
// kept so the CSV import still resolves them).
const ABILITIES = {
  Trapwire:   { agent: 'Cypher',    category: 'placeable' },
  Alarmbot:   { agent: 'Killjoy',   category: 'placeable' },
  Turret:     { agent: 'Killjoy',   category: 'placeable' },
  Razorvine:  { agent: 'Vyse',      category: 'placeable' },
  Trademark:  { agent: 'Chamber',   category: 'placeable' },
  'Sonic Sensor': { agent: 'Deadlock', category: 'placeable' },
  'Recon Bolt': { agent: 'Sova',    category: 'recon' },
  'Owl Drone':  { agent: 'Sova',    category: 'recon' },
  Trailblazer:  { agent: 'Skye',    category: 'recon' },
  'Boom Bot':   { agent: 'Raze',    category: 'recon' },
  'Dark Cover': { agent: 'Omen',    category: 'smoke' },
  'Sky Smoke':  { agent: 'Brimstone', category: 'smoke' },
  'Poison Cloud': { agent: 'Viper', category: 'smoke' },
  Cloudburst:   { agent: 'Jett',    category: 'smoke' },
  Flashpoint:   { agent: 'Breach',  category: 'flash' },
  'FLASH/drive': { agent: 'KAY/O',  category: 'flash' },
  'Guiding Light': { agent: 'Skye', category: 'flash' },
  Paranoia:     { agent: 'Omen',    category: 'flash' },
  'Arc Rose':   { agent: 'Vyse',    category: 'flash' },
  'Relay Bolt': { agent: 'Neon',    category: 'damage' },
  'Shock Bolt': { agent: 'Sova',    category: 'damage' },
  'Blast Pack': { agent: 'Raze',    category: 'damage' },
  'Paint Shells': { agent: 'Raze',  category: 'damage' },
  Aftershock:   { agent: 'Breach',  category: 'stall' },
  Nanoswarm:    { agent: 'Killjoy', category: 'stall' },
  'Snake Bite': { agent: 'Viper',   category: 'stall' },
  Incendiary:   { agent: 'Brimstone', category: 'stall' },
  Gravnet:      { agent: 'Deadlock', category: 'stall' },
  'Toxic Screen': { agent: 'Viper', category: 'wall' },
  'Fast Lane':  { agent: 'Neon',    category: 'wall' },
  Shear:        { agent: 'Vyse',    category: 'wall' },
  'Barrier Mesh': { agent: 'Deadlock', category: 'wall' },
  'Shrouded Step': { agent: 'Omen', category: 'movement' },
  Updraft:      { agent: 'Jett',    category: 'movement' },
  Tailwind:     { agent: 'Jett',    category: 'movement' },
  'High Gear':  { agent: 'Neon',    category: 'movement' },
  Lockdown:     { agent: 'Killjoy', category: 'ult' },
  Seekers:      { agent: 'Skye',    category: 'ult' },
  "Hunter's Fury": { agent: 'Sova', category: 'ult' },
  'Steel Garden': { agent: 'Vyse',  category: 'ult' },
  'Orbital Strike': { agent: 'Brimstone', category: 'ult' },
  "Viper's Pit": { agent: 'Viper',  category: 'ult' },
  Showstopper:  { agent: 'Raze',    category: 'ult' },
  'From the Shadows': { agent: 'Omen', category: 'ult' },
  Annihilation: { agent: 'Deadlock', category: 'ult' },
  Regrowth:     { agent: 'Skye',    category: 'support' },
  'Stim Beacon': { agent: 'Brimstone', category: 'support' },
};

const CATEGORY_LABELS = {
  placeable: 'Placeable utility',
  recon: 'Recon',
  smoke: 'Smokes',
  flash: 'Flashes',
  damage: 'Damage utility',
  stall: 'Reactive stall',
  wall: 'Walls',
  movement: 'Movement',
  ult: 'Ultimates',
  support: 'Support',
};

// Real teams, series 2819676. Agent shown is the player's Haven agent
// (Haven had more rounds, 18 vs 17); agents differ per map — see
// METHODOLOGY.md. Roles follow the agent.
const TEAMS = [
  {
    id: 'C9', name: 'Cloud9', tag: 'C9',
    style: 'VCT Americas — Viper-wall defence, OXY on the Operator',
    players: [
      { handle: 'v1c',    agent: 'Omen',    role: 'Controller' },
      { handle: 'OXY',    agent: 'Jett',    role: 'Duelist / Operator' },
      { handle: 'mitch',  agent: 'Skye',    role: 'Initiator' },
      { handle: 'Xeppaa', agent: 'Killjoy', role: 'Sentinel' },
      { handle: 'neT',    agent: 'Viper',   role: 'Controller' },
    ],
  },
  {
    id: 'FUR', name: 'FURIA', tag: 'FUR',
    style: 'VCT Americas — Neon pace, Heat on Viper walls',
    players: [
      { handle: 'tuyz',   agent: 'Omen',    role: 'Controller' },
      { handle: 'Heat',   agent: 'Viper',   role: 'Controller' },
      { handle: 'Urango', agent: 'Killjoy', role: 'Sentinel' },
      { handle: 'adverso', agent: 'Sova',   role: 'Initiator' },
      { handle: 'Palla',  agent: 'Neon',    role: 'Duelist' },
    ],
  },
];

// Operator setup spots per map: [x, y, label, angle]
const OP_SPOTS = {
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

// Counter-play per ability. Every ability in the real series has a specific
// counter here — the Anti-Strat tab must never fall back to the generic
// Default text for a measured tendency.
const ANTISTRAT = {
  Trapwire: {
    title: 'Break the wire before the execute',
    body: 'The wire guards the entry and pings the defence when it trips. Break it from range before the execute — a live wire means the Sentinel hears the hit coming.',
  },
  Alarmbot: {
    title: 'Break the bot before the execute',
    body: 'The Alarmbot pings the defence when it trips. Break it from range before the execute — a live bot means the Sentinel hears the hit coming and the site is already rotating.',
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
  'Sonic Sensor': {
    title: 'Break the sensor before the execute',
    body: 'Sonic Sensor pings the defence when it trips. Break it from range before the execute — a live sensor means the defence hears the hit coming.',
  },
  'Recon Bolt': {
    title: 'Break the dart, keep the execute',
    body: 'Recon darts land in the same 2–3 spots. Pre-aim the dart lineups and shoot them on entry; the defence loses its early info.',
  },
  'Sky Smoke': {
    title: 'Play through the smoke, don’t wait it out',
    body: 'Sky Smoke blocks sightlines on the execute. Push through the smoke with a flash ready instead of waiting for it to fade — the defence is counting on the delay to rotate.',
  },
  'Dark Cover': {
    title: 'Use the smoke window, then reposition',
    body: 'Dark Cover smokes buy the defence time. Take the space the smoke gives you, then reposition before it fades — holding the same angle after the fade is exactly what the Omen wants.',
  },
  'Poison Cloud': {
    title: 'Don’t sit in the cloud',
    body: 'Poison Cloud blocks a choke and decays anyone inside it. Don’t hold the cloud — swing through it fast or take the other lane, because the Viper is watching the cloud’s edge.',
  },
  Cloudburst: {
    title: 'Push through the Cloudburst',
    body: 'Cloudburst smokes the entry on the execute. Push through it with a flash ready instead of waiting — the defence is counting on the delay.',
  },
  'Owl Drone': {
    title: 'Shoot the drone, hide the rotate',
    body: 'The Owl Drone gives the defence early info on your default. Shoot it on sight and vary your timing — a drone that sees nothing forces the defence to guess.',
  },
  Trailblazer: {
    title: 'Let the dog pass, then hit',
    body: 'Trailblazer scouts the lane before the hit. Let it pass without revealing positions, then execute — the defence just spent its early warning.',
  },
  'Boom Bot': {
    title: 'Shoot the Boom Bot',
    body: 'Boom Bot scouts the lane before the hit. Shoot it on sight and vary your timing — a bot that sees nothing forces the defence to guess.',
  },
  Flashpoint: {
    title: 'Turn the flash, keep the execute',
    body: 'Flashpoint blinds through walls on the execute. Pre-turn the flash and keep moving — a team that stops for the flash gives the defence the retake for free.',
  },
  'FLASH/drive': {
    title: 'Dodge the pop-flash, don’t freeze',
    body: 'FLASH/drive pops around corners. Turn away from the flash line and keep the crosshair on the entry — freezing for the flash is what the play is designed to punish.',
  },
  'Guiding Light': {
    title: 'Turn the flash, keep moving',
    body: 'Guiding Light bends around corners before it pops. Turn away from the flash line and keep moving — freezing for the flash is what the play is designed to punish.',
  },
  Paranoia: {
    title: 'Pre-turn the Paranoia',
    body: 'Paranoia blinds a whole lane through walls. Pre-turn it and keep the crosshair on the entry — a team that stops for the flash gives the defence the retake.',
  },
  'Arc Rose': {
    title: 'Turn the Arc Rose',
    body: 'Arc Rose pops around corners on the execute. Turn away from the flash line and keep moving — the Vyse is holding the angle behind it.',
  },
  'Relay Bolt': {
    title: 'Break the Relay Bolt line',
    body: 'Relay Bolt zaps the first target it hits. Break the line with utility before the execute — a live Relay Bolt punishes the entry.',
  },
  'Shock Bolt': {
    title: 'Break the dart line, don’t eat the shock',
    body: 'Shock Bolt clears the common default spots and the plant. Spread the hold so one Shock Bolt can’t clear the whole site — and re-peek only after the wave passes.',
  },
  'Blast Pack': {
    title: 'Don’t stack for the Blast Pack',
    body: 'Blast Pack clears the common default spots and the plant. Spread the hold so one satchel can’t clear the whole site.',
  },
  'Paint Shells': {
    title: 'Break the Paint Shells line',
    body: 'Paint Shells deny the plant spot and the entry. Break the cluster with a long-range tap before committing — pushing into live Paint Shells is a lost round.',
  },
  Aftershock: {
    title: 'Don’t stack the default spot',
    body: 'Aftershock clears the common default spots. Spread the hold across two angles so one Aftershock can’t clear the whole site — and re-peek only after the wave passes.',
  },
  Nanoswarm: {
    title: 'Clear the swarm before the plant',
    body: 'Nanoswarm punishes the post-plant. Break the swarm with a long-range tap before committing to the plant — planting into a live swarm is a lost round.',
  },
  'Snake Bite': {
    title: 'Clear the molly line before the plant',
    body: 'Snake Bite denies the plant spot and the defuse. Break the line with utility or plant on the far side of the site — planting into a live Snake Bite is a lost round.',
  },
  Incendiary: {
    title: 'Don’t stack the molly spot',
    body: 'Incendiary denies the plant and the common default spots. Plant on the far side of the site and spread the hold — stacking the default spot is exactly what the molly punishes.',
  },
  Gravnet: {
    title: 'Don’t group for the Gravnet',
    body: 'Gravnet slows the whole execute in one spot. Spread the hit so one grenade can’t slow the team — and break it with utility before the plant.',
  },
  'Toxic Screen': {
    title: 'Play through the wall, don’t wait it out',
    body: 'The Toxic Screen cuts the map in half on the execute. Push through it with a flash ready instead of waiting for it to drop — the defence is counting on the delay to rotate.',
  },
  'Fast Lane': {
    title: 'Play through the Fast Lane wall',
    body: 'Fast Lane walls the lane on the execute. Push through it with a flash ready instead of waiting — the defence is counting on the delay to rotate.',
  },
  Shear: {
    title: 'Break the wall, don’t go around it',
    body: 'Shear walls off a lane on the execute. Break it fast with utility and take the space — going around it splits the team and the defence picks the stragglers.',
  },
  'Barrier Mesh': {
    title: 'Break the Barrier Mesh',
    body: 'Barrier Mesh walls off a lane on the execute. Break it fast and take the space — going around it splits the team.',
  },
  'Shrouded Step': {
    title: 'Hold the teleport, don’t chase it',
    body: 'Shrouded Step lets the Omen reappear behind the execute. Don’t chase the teleport sound — hold the site angles, because the Omen is coming to you.',
  },
  Updraft: {
    title: 'Watch the Updraft angle',
    body: 'Updraft puts the Jett above the site on the execute. Pre-aim the high angle — the Jett is coming over the top, not through the choke.',
  },
  Tailwind: {
    title: 'Hold the Tailwind exit',
    body: 'Tailwind dashes the Jett out of a bad fight. Don’t chase the dash — hold the exit angle, because the Jett has to re-peek to do damage.',
  },
  'High Gear': {
    title: 'Hold the High Gear lane',
    body: 'High Gear sprints the Neon through the lane. Hold the lane angle and pre-fire the sprint line — the Neon is coming fast and has to slow down to shoot.',
  },
  Lockdown: {
    title: 'Break the Lockdown, don’t run from it',
    body: 'Lockdown detains the whole site if it finishes. Break it the moment it goes down — running from it just gives the defence the site.',
  },
  Seekers: {
    title: 'Shoot the Seekers, don’t run from them',
    body: 'Seekers chase the nearest target and reveal it. Shoot them on sight — running from Seekers just leads the defence to you.',
  },
  "Hunter's Fury": {
    title: 'Move on the Hunter’s Fury call',
    body: 'Hunter’s Fury walls through the site in three waves. Move between the waves — standing in the line is a lost round.',
  },
  'Steel Garden': {
    title: 'Spread out for Steel Garden',
    body: 'Steel Garden strips the team’s primary weapons. Spread the execute so one ultimate can’t disarm the whole hit — and keep a Sheriff in hand.',
  },
  'Orbital Strike': {
    title: 'Move on the orbital call',
    body: 'Orbital Strike zones a whole site area. Move the moment you hear the call — standing in the strike zone is a lost round.',
  },
  "Viper's Pit": {
    title: 'Don’t fight inside the Pit',
    body: 'Viper’s Pit decays anyone inside it. Don’t fight inside the Pit — take the space outside it and wait for the Viper to overextend.',
  },
  Showstopper: {
    title: 'Spread out for the Showstopper',
    body: 'Showstopper one-shots a stacked team. Spread the execute so one rocket can’t wipe the hit — and keep the plant covered from two angles.',
  },
  'From the Shadows': {
    title: 'Hold the site for the teleport',
    body: 'From the Shadows lets the Omen appear behind the execute. Don’t chase the teleport — hold the site angles, because the Omen is coming to you.',
  },
  Annihilation: {
    title: 'Spread out for Annihilation',
    body: 'Annihilation pulls the team into one spot. Spread the execute so one ultimate can’t grab the whole hit.',
  },
  Regrowth: {
    title: 'Punish the heal window',
    body: 'Regrowth heals the team after a fight. Push the advantage while the Skye is healing — a team that waits gives the heal full value.',
  },
  'Stim Beacon': {
    title: 'Take the fight before the stim',
    body: 'Stim Beacon speeds the defence’s retake. Hit the site before the beacon goes up — a fast execute beats a stimmed retake.',
  },
  // Counter for the Operator card in renderAntiStrat (shown when the
  // sniper's aggressive angle share is >= 50%). Must exist — the renderer
  // reads ANTISTRAT.Operator.title directly.
  Operator: {
    title: 'Break the Operator angle, don’t repeek it',
    body: 'The sniper holds the Operator in most rounds, usually on aggressive angles. Pre-smoke the angle or double-peek with a flash — repeeking a held Operator angle one by one is the round the defence wants.',
  },
  // Fallback for any ability without a specific counter — never show the
  // Operator counter for a non-Operator tendency.
  Default: {
    title: 'Answer the tendency, don’t ignore it',
    body: 'This tendency is measured, not guessed — build the round plan around it and verify it on VOD before the match.',
  },
};

// Location-specific counters: the same ability at a different spot needs a
// different answer — two identical cards read as copy-paste.
const ANTISTRAT_SPOT = {
  'Trapwire @ B Main': {
    title: 'Break the B Main wire from B Lobby',
    body: 'The wire guards the B Main entrance. Shoot it from B Lobby before the team groups for the B execute — a live wire on the entry means a lost retake, because the Sentinel hears the whole hit coming.',
  },
  'Trapwire @ B Long': {
    title: 'Clear the B Long choke, don’t wide-swing it',
    body: 'The wire sits across the B Long choke. Break it from Garden with a long-range tap, never by wide-swinging the choke into its line of sight — then take B site while the Sentinel rotates out of Hookah.',
  },
  'Trapwire @ A Short': {
    title: 'Drone A Short, then hit A fast',
    body: 'The wire is the Sentinel’s only early warning on A Short. Send the recon drone up Short five seconds before the execute; once the wire is gone the site is open and the Sentinel has to guess which site you are hitting.',
  },
  // Real top tendencies, series 2819676.
  'Recon Bolt @ A Lobby': {
    title: 'Break the A Lobby dart before the hit',
    body: 'The dart lands in A Lobby on almost every defensive round and gives the defence the whole default. Pre-aim the dart lineup from A Long and shoot it on entry — a defence that loses its early info has to guess.',
  },
  'Toxic Screen @ Mid': {
    title: 'Play around the Mid wall',
    body: 'The wall cuts Mid on the execute. Take A or C instead of forcing Mid through the wall — the Viper is watching the wall’s edge and the rotate is already coming.',
  },
  'Dark Cover @ A Long': {
    title: 'Take the space the smoke gives you',
    body: 'Dark Cover smokes A Long on the execute. Take the space the smoke gives you, then reposition before it fades — holding the same angle after the fade is exactly what the Omen wants.',
  },
  'Sky Smoke @ B Long': {
    title: 'Push through the B Long smoke',
    body: 'Sky Smoke blocks B Long on the execute. Push through the smoke with a flash ready instead of waiting for it to fade — the defence is counting on the delay to rotate.',
  },
  'Toxic Screen @ A Short': {
    title: 'Don’t force A Short through the wall',
    body: 'The wall cuts A Short on the execute. Hit B or Mid instead of forcing Short through the wall — the Viper is holding the wall’s edge.',
  },
  'Guiding Light @ A Short': {
    title: 'Turn the A Short flash',
    body: 'Guiding Light bends around A Short before it pops. Turn away from the flash line and keep moving — freezing for the flash is what the play is designed to punish.',
  },
};

// --- BEGIN GENERATED REAL DATA ---
const REAL = {"meta":{"seriesId":"2819676","event":"VCT Americas Stage 2 2025 — Regular Season","date":"2025-07-18","matchup":"Cloud9 vs FURIA","score":"2–0","maps":{"Haven":"13–5","Bind":"13–4"},"roundsWon":35,"castsKept":1013,"castsExcludedUnwonRound":12,"opKillsTotal":5},"rounds":{"C9|Bind":{"total":17,"def":12,"atk":5},"FUR|Bind":{"total":17,"def":5,"atk":12},"C9|Haven":{"total":18,"def":6,"atk":12},"FUR|Haven":{"total":18,"def":12,"atk":6}},"utility":[{"team":"FUR","map":"Haven","side":"def","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"A Lobby","x":86.0,"y":30.0,"n":15,"players":{"adverso":15},"timings":{"40s+":7,"20–40s":8}},{"team":"FUR","map":"Bind","side":"atk","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"Mid","x":50.0,"y":31.0,"n":14,"players":{"tuyz":14},"timings":{"40s+":14}},{"team":"C9","map":"Haven","side":"atk","ability":"Turret","agent":"Killjoy","category":"placeable","label":"Mid Courtyard","x":50.0,"y":50.0,"n":13,"players":{"Xeppaa":13},"timings":{"40s+":5,"20–40s":8}},{"team":"C9","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"B Long","x":51.0,"y":51.0,"n":13,"players":{"v1c":13},"timings":{"40s+":9,"20–40s":4}},{"team":"FUR","map":"Haven","side":"def","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"Mid","x":50.0,"y":30.0,"n":12,"players":{"Heat":12},"timings":{"0–20s":11,"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"C Long","x":28.0,"y":30.0,"n":12,"players":{"v1c":12},"timings":{"40s+":12}},{"team":"FUR","map":"Bind","side":"atk","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"Garden","x":28.0,"y":31.0,"n":12,"players":{"Heat":12},"timings":{"0–20s":10,"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"A Short","x":51.0,"y":11.0,"n":12,"players":{"neT":12},"timings":{"20–40s":1,"0–20s":9,"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"A Long","x":72.0,"y":30.0,"n":11,"players":{"tuyz":11},"timings":{"40s+":10,"20–40s":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"A Long","x":72.0,"y":30.0,"n":11,"players":{"neT":11},"timings":{"0–20s":9,"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"C Lobby","x":14.0,"y":30.0,"n":10,"players":{"Xeppaa":10},"timings":{"40s+":10}},{"team":"C9","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Short","x":51.0,"y":11.0,"n":10,"players":{"mitch":10},"timings":{"40s+":5,"20–40s":5}},{"team":"FUR","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"Mid","x":50.0,"y":30.0,"n":9,"players":{"tuyz":9},"timings":{"40s+":6,"20–40s":3}},{"team":"FUR","map":"Haven","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"C Long","x":28.0,"y":30.0,"n":9,"players":{"Heat":9},"timings":{"20–40s":3,"0–20s":4,"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"C Lobby","x":14.0,"y":30.0,"n":9,"players":{"Urango":9},"timings":{"0–20s":4,"20–40s":2,"40s+":3}},{"team":"C9","map":"Bind","side":"def","ability":"Shear","agent":"Vyse","category":"wall","label":"Mid","x":50.0,"y":31.0,"n":9,"players":{"Xeppaa":9},"timings":{"0–20s":6,"40s+":2,"20–40s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"A Short","x":51.0,"y":11.0,"n":9,"players":{"neT":9},"timings":{"20–40s":7,"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"Mid Courtyard","x":50.0,"y":50.0,"n":8,"players":{"Xeppaa":8},"timings":{"40s+":1,"0–20s":5,"20–40s":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Shock Bolt","agent":"Sova","category":"damage","label":"A Lobby","x":86.0,"y":30.0,"n":8,"players":{"adverso":8},"timings":{"40s+":4,"20–40s":4}},{"team":"FUR","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"A Lobby","x":86.0,"y":30.0,"n":8,"players":{"tuyz":8},"timings":{"40s+":6,"20–40s":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"C Lobby","x":14.0,"y":30.0,"n":8,"players":{"mitch":8},"timings":{"40s+":8}},{"team":"C9","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"C Lobby","x":14.0,"y":30.0,"n":8,"players":{"v1c":8},"timings":{"40s+":8}},{"team":"FUR","map":"Haven","side":"def","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"C Long","x":28.0,"y":30.0,"n":8,"players":{"Urango":8},"timings":{"40s+":5,"0–20s":1,"20–40s":2}},{"team":"C9","map":"Bind","side":"def","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"A Lobby","x":91.0,"y":30.0,"n":8,"players":{"Xeppaa":8},"timings":{"0–20s":7,"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"A Short","x":51.0,"y":11.0,"n":8,"players":{"tuyz":8},"timings":{"20–40s":2,"40s+":6}},{"team":"C9","map":"Bind","side":"atk","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"Mid","x":50.0,"y":31.0,"n":8,"players":{"v1c":8},"timings":{"40s+":5,"20–40s":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"Mid Courtyard","x":50.0,"y":50.0,"n":7,"players":{"neT":7},"timings":{"40s+":3,"20–40s":4}},{"team":"C9","map":"Bind","side":"def","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"Hookah","x":72.0,"y":31.0,"n":7,"players":{"Xeppaa":7},"timings":{"40s+":7}},{"team":"C9","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"Hookah","x":72.0,"y":31.0,"n":7,"players":{"v1c":7},"timings":{"40s+":7}},{"team":"FUR","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"B Long","x":51.0,"y":51.0,"n":7,"players":{"Urango":7},"timings":{"40s+":4,"20–40s":3}},{"team":"FUR","map":"Haven","side":"def","ability":"Turret","agent":"Killjoy","category":"placeable","label":"C Long","x":28.0,"y":30.0,"n":6,"players":{"Urango":6},"timings":{"20–40s":1,"40s+":2,"0–20s":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"C Long","x":28.0,"y":30.0,"n":6,"players":{"Xeppaa":6},"timings":{"20–40s":2,"0–20s":2,"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"C Long","x":28.0,"y":30.0,"n":6,"players":{"tuyz":6},"timings":{"40s+":6}},{"team":"FUR","map":"Haven","side":"def","ability":"Turret","agent":"Killjoy","category":"placeable","label":"C Lobby","x":14.0,"y":30.0,"n":6,"players":{"Urango":6},"timings":{"40s+":2,"0–20s":4}},{"team":"FUR","map":"Haven","side":"atk","ability":"Turret","agent":"Killjoy","category":"placeable","label":"Mid Courtyard","x":50.0,"y":50.0,"n":6,"players":{"Urango":6},"timings":{"20–40s":4,"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Short","x":51.0,"y":11.0,"n":6,"players":{"Urango":6},"timings":{"20–40s":1,"40s+":5}},{"team":"C9","map":"Bind","side":"def","ability":"Blast Pack","agent":"Raze","category":"damage","label":"Hookah","x":72.0,"y":31.0,"n":6,"players":{"OXY":6},"timings":{"40s+":4,"0–20s":2}},{"team":"C9","map":"Bind","side":"def","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"A Short","x":51.0,"y":11.0,"n":6,"players":{"Xeppaa":6},"timings":{"0–20s":4,"20–40s":1,"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"B Long","x":51.0,"y":51.0,"n":6,"players":{"Heat":6},"timings":{"20–40s":5,"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"Hookah","x":72.0,"y":31.0,"n":6,"players":{"tuyz":6},"timings":{"0–20s":2,"40s+":3,"20–40s":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"C Lobby","x":14.0,"y":30.0,"n":5,"players":{"Urango":5},"timings":{"40s+":4,"20–40s":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"Mid Courtyard","x":50.0,"y":50.0,"n":5,"players":{"v1c":5},"timings":{"40s+":2,"20–40s":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"Mid Courtyard","x":50.0,"y":50.0,"n":5,"players":{"mitch":5},"timings":{"20–40s":3,"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"Mid","x":50.0,"y":30.0,"n":5,"players":{"v1c":5},"timings":{"40s+":5}},{"team":"FUR","map":"Haven","side":"def","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"C Long","x":28.0,"y":30.0,"n":5,"players":{"Urango":5},"timings":{"40s+":2,"20–40s":3}},{"team":"FUR","map":"Haven","side":"atk","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"A Long","x":72.0,"y":30.0,"n":5,"players":{"Heat":5},"timings":{"0–20s":4,"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Gravnet","agent":"Deadlock","category":"stall","label":"A Short","x":51.0,"y":11.0,"n":5,"players":{"adverso":5},"timings":{"20–40s":5}},{"team":"FUR","map":"Bind","side":"atk","ability":"Paint Shells","agent":"Raze","category":"damage","label":"A Short","x":51.0,"y":11.0,"n":5,"players":{"Palla":5},"timings":{"40s+":5}},{"team":"FUR","map":"Bind","side":"atk","ability":"Gravnet","agent":"Deadlock","category":"stall","label":"B Long","x":51.0,"y":51.0,"n":5,"players":{"adverso":5},"timings":{"20–40s":3,"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"B Long","x":51.0,"y":51.0,"n":5,"players":{"v1c":5},"timings":{"40s+":4,"20–40s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"A Short","x":51.0,"y":11.0,"n":5,"players":{"Heat":5},"timings":{"0–20s":5}},{"team":"C9","map":"Bind","side":"atk","ability":"Shear","agent":"Vyse","category":"wall","label":"Garden","x":28.0,"y":31.0,"n":5,"players":{"Xeppaa":5},"timings":{"0–20s":5}},{"team":"C9","map":"Bind","side":"atk","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"Garden","x":28.0,"y":31.0,"n":5,"players":{"neT":5},"timings":{"0–20s":5}},{"team":"FUR","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"A Long","x":72.0,"y":30.0,"n":4,"players":{"tuyz":4},"timings":{"0–20s":1,"40s+":3}},{"team":"FUR","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"A Lobby","x":86.0,"y":30.0,"n":4,"players":{"tuyz":4},"timings":{"0–20s":2,"40s+":1,"20–40s":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"Mid","x":50.0,"y":30.0,"n":4,"players":{"Xeppaa":4},"timings":{"40s+":4}},{"team":"FUR","map":"Haven","side":"def","ability":"Owl Drone","agent":"Sova","category":"recon","label":"A Lobby","x":86.0,"y":30.0,"n":4,"players":{"adverso":4},"timings":{"40s+":4}},{"team":"C9","map":"Haven","side":"atk","ability":"Tailwind","agent":"Jett","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":4,"players":{"OXY":4},"timings":{"40s+":4}},{"team":"C9","map":"Haven","side":"atk","ability":"Cloudburst","agent":"Jett","category":"smoke","label":"Mid","x":50.0,"y":30.0,"n":4,"players":{"OXY":4},"timings":{"40s+":4}},{"team":"C9","map":"Haven","side":"atk","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"Mid Courtyard","x":50.0,"y":50.0,"n":4,"players":{"Xeppaa":4},"timings":{"20–40s":3,"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"A Lobby","x":86.0,"y":30.0,"n":4,"players":{"v1c":4},"timings":{"40s+":4}},{"team":"FUR","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"A Site","x":88.5,"y":10.5,"n":4,"players":{"tuyz":4},"timings":{"40s+":3,"20–40s":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"C Long","x":28.0,"y":30.0,"n":4,"players":{"mitch":4},"timings":{"40s+":4}},{"team":"C9","map":"Haven","side":"atk","ability":"Paranoia","agent":"Omen","category":"flash","label":"C Long","x":28.0,"y":30.0,"n":4,"players":{"v1c":4},"timings":{"40s+":4}},{"team":"FUR","map":"Haven","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"C Long","x":28.0,"y":30.0,"n":4,"players":{"Heat":4},"timings":{"40s+":4}},{"team":"C9","map":"Haven","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"C Lobby","x":14.0,"y":30.0,"n":4,"players":{"neT":4},"timings":{"20–40s":3,"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Cloudburst","agent":"Jett","category":"smoke","label":"C Long","x":28.0,"y":30.0,"n":4,"players":{"OXY":4},"timings":{"40s+":4}},{"team":"C9","map":"Haven","side":"def","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"Mid","x":50.0,"y":30.0,"n":4,"players":{"Xeppaa":4},"timings":{"0–20s":4}},{"team":"C9","map":"Haven","side":"def","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"C Long","x":28.0,"y":30.0,"n":4,"players":{"Xeppaa":4},"timings":{"20–40s":3,"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"Mid Courtyard","x":50.0,"y":50.0,"n":4,"players":{"tuyz":4},"timings":{"20–40s":3,"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"C Long","x":28.0,"y":30.0,"n":4,"players":{"Urango":4},"timings":{"40s+":3,"20–40s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"A Lobby","x":86.0,"y":30.0,"n":4,"players":{"Xeppaa":4},"timings":{"40s+":2,"0–20s":1,"20–40s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"Mid","x":50.0,"y":31.0,"n":4,"players":{"Xeppaa":4},"timings":{"20–40s":1,"0–20s":3}},{"team":"FUR","map":"Bind","side":"atk","ability":"Blast Pack","agent":"Raze","category":"damage","label":"Mid","x":50.0,"y":31.0,"n":4,"players":{"Palla":4},"timings":{"40s+":4}},{"team":"FUR","map":"Bind","side":"atk","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"B Long","x":51.0,"y":51.0,"n":4,"players":{"tuyz":4},"timings":{"40s+":2,"20–40s":2}},{"team":"C9","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Site","x":86.0,"y":11.0,"n":4,"players":{"mitch":4},"timings":{"40s+":4}},{"team":"FUR","map":"Bind","side":"atk","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"A Short","x":51.0,"y":11.0,"n":4,"players":{"tuyz":4},"timings":{"40s+":4}},{"team":"C9","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"A Lobby","x":91.0,"y":30.0,"n":4,"players":{"v1c":4},"timings":{"0–20s":2,"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Sonic Sensor","agent":"Deadlock","category":"placeable","label":"B Long","x":51.0,"y":51.0,"n":4,"players":{"adverso":4},"timings":{"20–40s":1,"40s+":3}},{"team":"FUR","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Short","x":51.0,"y":11.0,"n":4,"players":{"Urango":4},"timings":{"40s+":1,"20–40s":3}},{"team":"FUR","map":"Bind","side":"atk","ability":"Blast Pack","agent":"Raze","category":"damage","label":"A Short","x":51.0,"y":11.0,"n":4,"players":{"Palla":4},"timings":{"40s+":4}},{"team":"FUR","map":"Bind","side":"atk","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"Mid","x":50.0,"y":31.0,"n":4,"players":{"tuyz":4},"timings":{"40s+":4}},{"team":"FUR","map":"Bind","side":"def","ability":"Sonic Sensor","agent":"Deadlock","category":"placeable","label":"B Long","x":51.0,"y":51.0,"n":4,"players":{"adverso":4},"timings":{"20–40s":3,"0–20s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Short","x":51.0,"y":11.0,"n":4,"players":{"Urango":4},"timings":{"40s+":2,"0–20s":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Short","x":51.0,"y":11.0,"n":4,"players":{"mitch":4},"timings":{"40s+":2,"20–40s":2}},{"team":"FUR","map":"Bind","side":"def","ability":"Gravnet","agent":"Deadlock","category":"stall","label":"Hookah","x":72.0,"y":31.0,"n":4,"players":{"adverso":4},"timings":{"40s+":3,"20–40s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"B Long","x":51.0,"y":51.0,"n":4,"players":{"tuyz":4},"timings":{"20–40s":2,"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"Mid Courtyard","x":50.0,"y":50.0,"n":3,"players":{"mitch":3},"timings":{"40s+":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Tailwind","agent":"Jett","category":"movement","label":"A Lobby","x":86.0,"y":30.0,"n":3,"players":{"OXY":3},"timings":{"40s+":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Cloudburst","agent":"Jett","category":"smoke","label":"A Lobby","x":86.0,"y":30.0,"n":3,"players":{"OXY":3},"timings":{"40s+":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"C Lobby","x":14.0,"y":30.0,"n":3,"players":{"neT":3},"timings":{"40s+":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Tailwind","agent":"Jett","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":3,"players":{"OXY":3},"timings":{"40s+":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Cloudburst","agent":"Jett","category":"smoke","label":"C Lobby","x":14.0,"y":30.0,"n":3,"players":{"OXY":3},"timings":{"40s+":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Turret","agent":"Killjoy","category":"placeable","label":"C Lobby","x":14.0,"y":30.0,"n":3,"players":{"Xeppaa":3},"timings":{"40s+":3}},{"team":"C9","map":"Haven","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"C Long","x":28.0,"y":30.0,"n":3,"players":{"mitch":3},"timings":{"40s+":3}},{"team":"FUR","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"C Long","x":28.0,"y":30.0,"n":3,"players":{"tuyz":3},"timings":{"40s+":2,"0–20s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"Mid","x":50.0,"y":30.0,"n":3,"players":{"neT":3},"timings":{"0–20s":3}},{"team":"C9","map":"Haven","side":"def","ability":"Turret","agent":"Killjoy","category":"placeable","label":"C Long","x":28.0,"y":30.0,"n":3,"players":{"Xeppaa":3},"timings":{"20–40s":2,"0–20s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"C Lobby","x":14.0,"y":30.0,"n":3,"players":{"v1c":3},"timings":{"20–40s":2,"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Short","x":51.0,"y":11.0,"n":3,"players":{"mitch":3},"timings":{"40s+":3}},{"team":"C9","map":"Bind","side":"def","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"Hookah","x":72.0,"y":31.0,"n":3,"players":{"v1c":3},"timings":{"40s+":3}},{"team":"FUR","map":"Bind","side":"atk","ability":"Sonic Sensor","agent":"Deadlock","category":"placeable","label":"A Short","x":51.0,"y":11.0,"n":3,"players":{"adverso":3},"timings":{"40s+":2,"20–40s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"Garden","x":28.0,"y":31.0,"n":3,"players":{"Urango":3},"timings":{"20–40s":1,"40s+":1,"0–20s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"Hookah","x":72.0,"y":31.0,"n":3,"players":{"Xeppaa":3},"timings":{"20–40s":2,"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"A Site","x":86.0,"y":11.0,"n":3,"players":{"neT":3},"timings":{"40s+":3}},{"team":"C9","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"A Site","x":86.0,"y":11.0,"n":3,"players":{"v1c":3},"timings":{"40s+":3}},{"team":"C9","map":"Bind","side":"def","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"A Site","x":86.0,"y":11.0,"n":3,"players":{"Xeppaa":3},"timings":{"40s+":3}},{"team":"C9","map":"Bind","side":"def","ability":"Shear","agent":"Vyse","category":"wall","label":"A Short","x":51.0,"y":11.0,"n":3,"players":{"Xeppaa":3},"timings":{"20–40s":1,"0–20s":2}},{"team":"C9","map":"Bind","side":"def","ability":"Trailblazer","agent":"Skye","category":"recon","label":"Hookah","x":72.0,"y":31.0,"n":3,"players":{"mitch":3},"timings":{"40s+":3}},{"team":"C9","map":"Bind","side":"def","ability":"Paint Shells","agent":"Raze","category":"damage","label":"Hookah","x":72.0,"y":31.0,"n":3,"players":{"OXY":3},"timings":{"40s+":3}},{"team":"C9","map":"Bind","side":"def","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"Hookah","x":72.0,"y":31.0,"n":3,"players":{"v1c":3},"timings":{"40s+":2,"20–40s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"B Long","x":51.0,"y":51.0,"n":3,"players":{"Urango":3},"timings":{"40s+":2,"20–40s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Paint Shells","agent":"Raze","category":"damage","label":"Mid","x":50.0,"y":31.0,"n":3,"players":{"Palla":3},"timings":{"40s+":2,"20–40s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"A Short","x":51.0,"y":11.0,"n":3,"players":{"Heat":3},"timings":{"40s+":3}},{"team":"FUR","map":"Bind","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"A Short","x":51.0,"y":11.0,"n":3,"players":{"Heat":3},"timings":{"40s+":1,"20–40s":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"B Long","x":51.0,"y":51.0,"n":3,"players":{"Xeppaa":3},"timings":{"40s+":2,"20–40s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Paint Shells","agent":"Raze","category":"damage","label":"Hookah","x":72.0,"y":31.0,"n":3,"players":{"OXY":3},"timings":{"40s+":3}},{"team":"C9","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"B Long","x":51.0,"y":51.0,"n":3,"players":{"mitch":3},"timings":{"40s+":1,"20–40s":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"B Long","x":51.0,"y":51.0,"n":3,"players":{"v1c":3},"timings":{"40s+":3}},{"team":"FUR","map":"Bind","side":"def","ability":"Sonic Sensor","agent":"Deadlock","category":"placeable","label":"Hookah","x":72.0,"y":31.0,"n":3,"players":{"adverso":3},"timings":{"0–20s":2,"20–40s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"Mid","x":50.0,"y":31.0,"n":3,"players":{"neT":3},"timings":{"20–40s":2,"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Site","x":86.0,"y":11.0,"n":3,"players":{"Urango":3},"timings":{"40s+":1,"0–20s":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Long","x":72.0,"y":30.0,"n":2,"players":{"mitch":2},"timings":{"40s+":1,"20–40s":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Relay Bolt","agent":"Neon","category":"damage","label":"A Lobby","x":86.0,"y":30.0,"n":2,"players":{"Palla":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Paranoia","agent":"Omen","category":"flash","label":"A Lobby","x":86.0,"y":30.0,"n":2,"players":{"v1c":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Paranoia","agent":"Omen","category":"flash","label":"A Long","x":72.0,"y":30.0,"n":2,"players":{"tuyz":2},"timings":{"0–20s":1,"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"Mid","x":50.0,"y":30.0,"n":2,"players":{"mitch":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"Mid","x":50.0,"y":30.0,"n":2,"players":{"mitch":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"C Lobby","x":14.0,"y":30.0,"n":2,"players":{"Xeppaa":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"C Site","x":11.5,"y":10.5,"n":2,"players":{"v1c":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Paranoia","agent":"Omen","category":"flash","label":"C Lobby","x":14.0,"y":30.0,"n":2,"players":{"v1c":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Long","x":72.0,"y":30.0,"n":2,"players":{"mitch":2},"timings":{"20–40s":1,"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":2,"players":{"v1c":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"Mid","x":50.0,"y":30.0,"n":2,"players":{"adverso":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"B Site","x":48.5,"y":10.5,"n":2,"players":{"tuyz":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Turret","agent":"Killjoy","category":"placeable","label":"Mid","x":50.0,"y":30.0,"n":2,"players":{"Urango":2},"timings":{"0–20s":1,"20–40s":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Lobby","x":86.0,"y":30.0,"n":2,"players":{"mitch":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Paranoia","agent":"Omen","category":"flash","label":"B Site","x":48.5,"y":10.5,"n":2,"players":{"tuyz":2},"timings":{"40s+":1,"0–20s":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Hunter's Fury","agent":"Sova","category":"ult","label":"B Site","x":48.5,"y":10.5,"n":2,"players":{"adverso":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Relay Bolt","agent":"Neon","category":"damage","label":"C Long","x":28.0,"y":30.0,"n":2,"players":{"Palla":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"B Site","x":48.5,"y":10.5,"n":2,"players":{"adverso":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Updraft","agent":"Jett","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":2,"players":{"OXY":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Paranoia","agent":"Omen","category":"flash","label":"C Long","x":28.0,"y":30.0,"n":2,"players":{"tuyz":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"High Gear","agent":"Neon","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":2,"players":{"Palla":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":2,"players":{"tuyz":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"atk","ability":"Tailwind","agent":"Jett","category":"movement","label":"C Long","x":28.0,"y":30.0,"n":2,"players":{"OXY":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Shock Bolt","agent":"Sova","category":"damage","label":"C Long","x":28.0,"y":30.0,"n":2,"players":{"adverso":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"C Site","x":11.5,"y":10.5,"n":2,"players":{"neT":2},"timings":{"0–20s":2}},{"team":"C9","map":"Haven","side":"def","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"Mid","x":50.0,"y":30.0,"n":2,"players":{"Xeppaa":2},"timings":{"0–20s":2}},{"team":"C9","map":"Haven","side":"def","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Lobby","x":86.0,"y":30.0,"n":2,"players":{"mitch":2},"timings":{"0–20s":1,"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"C Long","x":28.0,"y":30.0,"n":2,"players":{"v1c":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"atk","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"C Long","x":28.0,"y":30.0,"n":2,"players":{"Urango":2},"timings":{"0–20s":2}},{"team":"C9","map":"Haven","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Lobby","x":86.0,"y":30.0,"n":2,"players":{"mitch":2},"timings":{"20–40s":1,"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"A Long","x":72.0,"y":30.0,"n":2,"players":{"tuyz":2},"timings":{"20–40s":2}},{"team":"C9","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"A Long","x":72.0,"y":30.0,"n":2,"players":{"v1c":2},"timings":{"20–40s":1,"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"Mid Courtyard","x":50.0,"y":50.0,"n":2,"players":{"Urango":2},"timings":{"20–40s":1,"0–20s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"C Long","x":28.0,"y":30.0,"n":2,"players":{"v1c":2},"timings":{"0–20s":1,"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"A Long","x":72.0,"y":30.0,"n":2,"players":{"neT":2},"timings":{"0–20s":2}},{"team":"C9","map":"Haven","side":"def","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"C Site","x":11.5,"y":10.5,"n":2,"players":{"neT":2},"timings":{"20–40s":1,"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Cloudburst","agent":"Jett","category":"smoke","label":"A Long","x":72.0,"y":30.0,"n":2,"players":{"OXY":2},"timings":{"40s+":2}},{"team":"C9","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":2,"players":{"v1c":2},"timings":{"40s+":1,"0–20s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"A Lobby","x":86.0,"y":30.0,"n":2,"players":{"Xeppaa":2},"timings":{"40s+":1,"0–20s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Turret","agent":"Killjoy","category":"placeable","label":"A Lobby","x":86.0,"y":30.0,"n":2,"players":{"Xeppaa":2},"timings":{"40s+":1,"0–20s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"Mid","x":50.0,"y":30.0,"n":2,"players":{"v1c":2},"timings":{"40s+":1,"20–40s":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":2,"players":{"tuyz":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"C Lobby","x":14.0,"y":30.0,"n":2,"players":{"tuyz":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"A Lobby","x":86.0,"y":30.0,"n":2,"players":{"tuyz":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"A Lobby","x":91.0,"y":30.0,"n":2,"players":{"neT":2},"timings":{"0–20s":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Sonic Sensor","agent":"Deadlock","category":"placeable","label":"Garden","x":28.0,"y":31.0,"n":2,"players":{"adverso":2},"timings":{"20–40s":1,"0–20s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"Urango":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"A Short","x":51.0,"y":11.0,"n":2,"players":{"neT":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Paint Shells","agent":"Raze","category":"damage","label":"B Long","x":51.0,"y":51.0,"n":2,"players":{"OXY":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"B Lobby","x":9.0,"y":30.0,"n":2,"players":{"Urango":2},"timings":{"0–20s":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"Garden","x":28.0,"y":31.0,"n":2,"players":{"Urango":2},"timings":{"0–20s":1,"20–40s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"Garden","x":28.0,"y":31.0,"n":2,"players":{"Heat":2},"timings":{"0–20s":1,"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"B Long","x":51.0,"y":51.0,"n":2,"players":{"v1c":2},"timings":{"20–40s":1,"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"A Short","x":51.0,"y":11.0,"n":2,"players":{"tuyz":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"A Site","x":86.0,"y":11.0,"n":2,"players":{"Urango":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"A Site","x":86.0,"y":11.0,"n":2,"players":{"v1c":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"A Lobby","x":91.0,"y":30.0,"n":2,"players":{"Xeppaa":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"Heat":2},"timings":{"20–40s":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"Hookah","x":72.0,"y":31.0,"n":2,"players":{"Urango":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"Garden","x":28.0,"y":31.0,"n":2,"players":{"tuyz":2},"timings":{"20–40s":2}},{"team":"C9","map":"Bind","side":"def","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Site","x":86.0,"y":11.0,"n":2,"players":{"mitch":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Gravnet","agent":"Deadlock","category":"stall","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"adverso":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"B Long","x":51.0,"y":51.0,"n":2,"players":{"mitch":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Blast Pack","agent":"Raze","category":"damage","label":"B Long","x":51.0,"y":51.0,"n":2,"players":{"OXY":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Boom Bot","agent":"Raze","category":"recon","label":"B Long","x":51.0,"y":51.0,"n":2,"players":{"Palla":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"B Long","x":51.0,"y":51.0,"n":2,"players":{"tuyz":2},"timings":{"20–40s":2}},{"team":"C9","map":"Bind","side":"def","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"B Long","x":51.0,"y":51.0,"n":2,"players":{"Xeppaa":2},"timings":{"20–40s":1,"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Steel Garden","agent":"Vyse","category":"ult","label":"Hookah","x":72.0,"y":31.0,"n":2,"players":{"Xeppaa":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"def","ability":"Blast Pack","agent":"Raze","category":"damage","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"OXY":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"Urango":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"def","ability":"Sonic Sensor","agent":"Deadlock","category":"placeable","label":"A Lobby","x":91.0,"y":30.0,"n":2,"players":{"adverso":2},"timings":{"0–20s":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Boom Bot","agent":"Raze","category":"recon","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"OXY":2},"timings":{"40s+":1,"20–40s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"Xeppaa":2},"timings":{"40s+":1,"20–40s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Short","x":51.0,"y":11.0,"n":2,"players":{"Urango":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"def","ability":"Paint Shells","agent":"Raze","category":"damage","label":"Hookah","x":72.0,"y":31.0,"n":2,"players":{"Palla":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"Xeppaa":2},"timings":{"40s+":2}},{"team":"FUR","map":"Bind","side":"def","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"Hookah","x":72.0,"y":31.0,"n":2,"players":{"tuyz":2},"timings":{"40s+":1,"0–20s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"neT":2},"timings":{"20–40s":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Paint Shells","agent":"Raze","category":"damage","label":"A Short","x":51.0,"y":11.0,"n":2,"players":{"OXY":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"mitch":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Short","x":51.0,"y":11.0,"n":2,"players":{"mitch":2},"timings":{"20–40s":1,"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"v1c":2},"timings":{"40s+":1,"20–40s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Sonic Sensor","agent":"Deadlock","category":"placeable","label":"Mid","x":50.0,"y":31.0,"n":2,"players":{"adverso":2},"timings":{"0–20s":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"A Short","x":51.0,"y":11.0,"n":2,"players":{"v1c":2},"timings":{"40s+":2}},{"team":"C9","map":"Bind","side":"atk","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"A Short","x":51.0,"y":11.0,"n":2,"players":{"Xeppaa":2},"timings":{"40s+":2}},{"team":"FUR","map":"Haven","side":"def","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"B Site","x":48.5,"y":10.5,"n":1,"players":{"Urango":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"Heat":1},"timings":{"20–40s":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Toxic Screen","agent":"Viper","category":"wall","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"A Site","x":88.5,"y":10.5,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Shock Bolt","agent":"Sova","category":"damage","label":"A Site","x":88.5,"y":10.5,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"Heat":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"High Gear","agent":"Neon","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Relay Bolt","agent":"Neon","category":"damage","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"High Gear","agent":"Neon","category":"movement","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"0–20s":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Updraft","agent":"Jett","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Paranoia","agent":"Omen","category":"flash","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"v1c":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Paranoia","agent":"Omen","category":"flash","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Turret","agent":"Killjoy","category":"placeable","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"Mid Courtyard","x":50.0,"y":50.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"B Site","x":48.5,"y":10.5,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Seekers","agent":"Skye","category":"ult","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Nanoswarm","agent":"Killjoy","category":"stall","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Lockdown","agent":"Killjoy","category":"ult","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"B Site","x":48.5,"y":10.5,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Relay Bolt","agent":"Neon","category":"damage","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Updraft","agent":"Jett","category":"movement","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"tuyz":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"Heat":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"Heat":1},"timings":{"0–20s":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Seekers","agent":"Skye","category":"ult","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Paranoia","agent":"Omen","category":"flash","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"C Site","x":11.5,"y":10.5,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Fast Lane","agent":"Neon","category":"wall","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Viper's Pit","agent":"Viper","category":"ult","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Relay Bolt","agent":"Neon","category":"damage","label":"B Site","x":48.5,"y":10.5,"n":1,"players":{"Palla":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Turret","agent":"Killjoy","category":"placeable","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"From the Shadows","agent":"Omen","category":"ult","label":"A Site","x":88.5,"y":10.5,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"atk","ability":"Paranoia","agent":"Omen","category":"flash","label":"C Site","x":11.5,"y":10.5,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Lockdown","agent":"Killjoy","category":"ult","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"def","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"0–20s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Updraft","agent":"Jett","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"0–20s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"v1c":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"High Gear","agent":"Neon","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Tailwind","agent":"Jett","category":"movement","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Tailwind","agent":"Jett","category":"movement","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"tuyz":1},"timings":{"20–40s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Shrouded Step","agent":"Omen","category":"movement","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"v1c":1},"timings":{"20–40s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"neT":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"Mid Courtyard","x":50.0,"y":50.0,"n":1,"players":{"adverso":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Relay Bolt","agent":"Neon","category":"damage","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"High Gear","agent":"Neon","category":"movement","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"20–40s":1}},{"team":"C9","map":"Haven","side":"def","ability":"Tailwind","agent":"Jett","category":"movement","label":"A Site","x":88.5,"y":10.5,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Cloudburst","agent":"Jett","category":"smoke","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Tailwind","agent":"Jett","category":"movement","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"High Gear","agent":"Neon","category":"movement","label":"Mid Courtyard","x":50.0,"y":50.0,"n":1,"players":{"Palla":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Shock Bolt","agent":"Sova","category":"damage","label":"Mid Courtyard","x":50.0,"y":50.0,"n":1,"players":{"adverso":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Shock Bolt","agent":"Sova","category":"damage","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Dark Cover","agent":"Omen","category":"smoke","label":"Mid","x":50.0,"y":30.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Owl Drone","agent":"Sova","category":"recon","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Tailwind","agent":"Jett","category":"movement","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Paranoia","agent":"Omen","category":"flash","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"Heat":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Tailwind","agent":"Jett","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"Heat":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Fast Lane","agent":"Neon","category":"wall","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Owl Drone","agent":"Sova","category":"recon","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Paranoia","agent":"Omen","category":"flash","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Hunter's Fury","agent":"Sova","category":"ult","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Relay Bolt","agent":"Neon","category":"damage","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Seekers","agent":"Skye","category":"ult","label":"B Site","x":48.5,"y":10.5,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Shock Bolt","agent":"Sova","category":"damage","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"C Long","x":28.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Paranoia","agent":"Omen","category":"flash","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Updraft","agent":"Jett","category":"movement","label":"C Lobby","x":14.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Alarmbot","agent":"Killjoy","category":"placeable","label":"Mid Courtyard","x":50.0,"y":50.0,"n":1,"players":{"Urango":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Owl Drone","agent":"Sova","category":"recon","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"A Long","x":72.0,"y":30.0,"n":1,"players":{"Heat":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Recon Bolt","agent":"Sova","category":"recon","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"Relay Bolt","agent":"Neon","category":"damage","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Paranoia","agent":"Omen","category":"flash","label":"A Site","x":88.5,"y":10.5,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"FUR","map":"Haven","side":"atk","ability":"High Gear","agent":"Neon","category":"movement","label":"A Lobby","x":86.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"C9","map":"Haven","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"A Site","x":88.5,"y":10.5,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Barrier Mesh","agent":"Deadlock","category":"wall","label":"Garden","x":28.0,"y":31.0,"n":1,"players":{"adverso":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Lobby","x":91.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Lobby","x":91.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"B Lobby","x":9.0,"y":30.0,"n":1,"players":{"Urango":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"Garden","x":28.0,"y":31.0,"n":1,"players":{"Heat":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Barrier Mesh","agent":"Deadlock","category":"wall","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"Heat":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Sonic Sensor","agent":"Deadlock","category":"placeable","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Paint Shells","agent":"Raze","category":"damage","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Blast Pack","agent":"Raze","category":"damage","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Showstopper","agent":"Raze","category":"ult","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Regrowth","agent":"Skye","category":"support","label":"A Lobby","x":91.0,"y":30.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"Heat":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Boom Bot","agent":"Raze","category":"recon","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Boom Bot","agent":"Raze","category":"recon","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Seekers","agent":"Skye","category":"ult","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Barrier Mesh","agent":"Deadlock","category":"wall","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Paint Shells","agent":"Raze","category":"damage","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Blast Pack","agent":"Raze","category":"damage","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"OXY":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Boom Bot","agent":"Raze","category":"recon","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"OXY":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Snake Bite","agent":"Viper","category":"stall","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"Heat":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Regrowth","agent":"Skye","category":"support","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Seekers","agent":"Skye","category":"ult","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Boom Bot","agent":"Raze","category":"recon","label":"B Site","x":14.0,"y":51.0,"n":1,"players":{"Palla":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Annihilation","agent":"Deadlock","category":"ult","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"adverso":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Showstopper","agent":"Raze","category":"ult","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Showstopper","agent":"Raze","category":"ult","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Paint Shells","agent":"Raze","category":"damage","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Orbital Strike","agent":"Brimstone","category":"ult","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Boom Bot","agent":"Raze","category":"recon","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Orbital Strike","agent":"Brimstone","category":"ult","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Heat":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Paint Shells","agent":"Raze","category":"damage","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Boom Bot","agent":"Raze","category":"recon","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"Palla":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Viper's Pit","agent":"Viper","category":"ult","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Xeppaa":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Annihilation","agent":"Deadlock","category":"ult","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Seekers","agent":"Skye","category":"ult","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Boom Bot","agent":"Raze","category":"recon","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"Palla":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Barrier Mesh","agent":"Deadlock","category":"wall","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"atk","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Blast Pack","agent":"Raze","category":"damage","label":"B Lobby","x":9.0,"y":30.0,"n":1,"players":{"OXY":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Blast Pack","agent":"Raze","category":"damage","label":"A Lobby","x":91.0,"y":30.0,"n":1,"players":{"Palla":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Barrier Mesh","agent":"Deadlock","category":"wall","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"Garden","x":28.0,"y":31.0,"n":1,"players":{"neT":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Arc Rose","agent":"Vyse","category":"flash","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Guiding Light","agent":"Skye","category":"flash","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"Urango":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Guiding Light","agent":"Skye","category":"flash","label":"A Lobby","x":91.0,"y":30.0,"n":1,"players":{"Urango":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"tuyz":1},"timings":{"0–20s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"Garden","x":28.0,"y":31.0,"n":1,"players":{"v1c":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"tuyz":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Boom Bot","agent":"Raze","category":"recon","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"OXY":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Barrier Mesh","agent":"Deadlock","category":"wall","label":"A Lobby","x":91.0,"y":30.0,"n":1,"players":{"adverso":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Blast Pack","agent":"Raze","category":"damage","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"Palla":1},"timings":{"0–20s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Blast Pack","agent":"Raze","category":"damage","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"Mid","x":50.0,"y":31.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Trailblazer","agent":"Skye","category":"recon","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Urango":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Blast Pack","agent":"Raze","category":"damage","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"Palla":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Trailblazer","agent":"Skye","category":"recon","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"mitch":1},"timings":{"20–40s":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Razorvine","agent":"Vyse","category":"placeable","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"Xeppaa":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"tuyz":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Annihilation","agent":"Deadlock","category":"ult","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Snake Bite","agent":"Viper","category":"stall","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Heat":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Barrier Mesh","agent":"Deadlock","category":"wall","label":"Hookah","x":72.0,"y":31.0,"n":1,"players":{"adverso":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Poison Cloud","agent":"Viper","category":"smoke","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"Heat":1},"timings":{"0–20s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Barrier Mesh","agent":"Deadlock","category":"wall","label":"B Long","x":51.0,"y":51.0,"n":1,"players":{"adverso":1},"timings":{"20–40s":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Incendiary","agent":"Brimstone","category":"stall","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Stim Beacon","agent":"Brimstone","category":"support","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"FUR","map":"Bind","side":"def","ability":"Sky Smoke","agent":"Brimstone","category":"smoke","label":"A Site","x":86.0,"y":11.0,"n":1,"players":{"tuyz":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Orbital Strike","agent":"Brimstone","category":"ult","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"v1c":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Showstopper","agent":"Raze","category":"ult","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Blast Pack","agent":"Raze","category":"damage","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"OXY":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Steel Garden","agent":"Vyse","category":"ult","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"Xeppaa":1},"timings":{"40s+":1}},{"team":"C9","map":"Bind","side":"atk","ability":"Regrowth","agent":"Skye","category":"support","label":"A Short","x":51.0,"y":11.0,"n":1,"players":{"mitch":1},"timings":{"40s+":1}}],"operator":[{"team":"C9","map":"Bind","side":"def","player":"OXY","agent":"raze","n":4,"angles":{"pixel":2,"passive":2},"spots":{"A Site pixel":2,"Hookah hold":2},"timings":{"0–20s":2,"20–40s":1,"40s+":1}},{"team":"C9","map":"Bind","side":"def","player":"v1c","agent":"brimstone","n":2,"angles":{"pixel":1,"passive":1},"spots":{"A Site pixel":1,"Hookah hold":1},"timings":{"0–20s":2}},{"team":"FUR","map":"Haven","side":"def","player":"Palla","agent":"neon","n":1,"angles":{"passive":1},"spots":{"B Site hold":1},"timings":{"0–20s":1}},{"team":"C9","map":"Haven","side":"def","player":"OXY","agent":"jett","n":1,"angles":{"passive":1},"spots":{"B Site hold":1},"timings":{"0–20s":1}}]};
// --- END GENERATED REAL DATA ---

// ---------------------------------------------------------------------------
// Expansion: aggregates -> rows (the analysis engine is row-based)
// ---------------------------------------------------------------------------
// Expands a {key: count} map into a flat list, each key repeated `count`
// times, ordered by count desc then key asc (deterministic). `order`, when
// given, fixes the key order instead (round-time buckets).
function expandCounts(counts, order) {
  const keys = order || Object.keys(counts).sort((a, b) => (counts[b] - counts[a]) || (a < b ? -1 : 1));
  const out = [];
  for (const k of keys) for (let i = 0; i < (counts[k] || 0); i++) out.push(k);
  return out;
}

// Expands REAL aggregates into the row shape the engine (and the CSV import)
// already use. Every marginal is preserved exactly: per-key counts,
// per-player counts, timing buckets, spot/angle mix. The only thing the
// expansion invents is the pairing inside a cluster (which player got which
// round-time bucket — the joint was not stored) and a deterministic ±3-unit
// jitter around the zone centre so markers in one cluster don't stack on a
// single pixel. Both are documented in METHODOLOGY.md §4.
function expandReal() {
  const utilityEvents = [];
  const operatorEvents = [];
  let id = 1;
  for (const c of REAL.utility) {
    const rngC = mulberry32(hashStr(`${c.team}|${c.map}|${c.side}|${c.ability}|${c.label}`));
    const players = expandCounts(c.players);
    const timings = expandCounts(c.timings, ['0–20s', '20–40s', '40s+']);
    for (let i = 0; i < c.n; i++) {
      const jx = (rngC() - 0.5) * 6;
      const jy = (rngC() - 0.5) * 6;
      utilityEvents.push({
        id: id++, map: c.map, team: c.team, teamName: c.team,
        player: players[i], agent: c.agent, ability: c.ability, category: c.category,
        x: +Math.max(2, Math.min(98, c.x + jx)).toFixed(1),
        y: +Math.max(2, Math.min(60, c.y + jy)).toFixed(1),
        label: c.label, side: c.side, roundTime: timings[i],
      });
    }
  }
  for (const o of REAL.operator) {
    const spots = expandCounts(o.spots);
    const timings = expandCounts(o.timings, ['0–20s', '20–40s', '40s+']);
    for (let i = 0; i < o.n; i++) {
      const spot = OP_SPOTS[o.map].find((s) => s.label === spots[i]);
      const rngO = mulberry32(hashStr(`${o.team}|${o.map}|${o.player}|${spots[i]}|${i}`));
      const jx = (rngO() - 0.5) * 4;
      const jy = (rngO() - 0.5) * 4;
      operatorEvents.push({
        id: id++, map: o.map, team: o.team, teamName: o.team,
        player: o.player, agent: o.agent, ability: 'Operator', weapon: 'Operator',
        x: +Math.max(2, Math.min(98, spot.x + jx)).toFixed(1),
        y: +Math.max(2, Math.min(60, spot.y + jy)).toFixed(1),
        label: spot.label, angle: spot.angle, side: o.side, roundTime: timings[i],
      });
    }
  }
  return {
    utilityEvents, operatorEvents,
    label: 'GRID series 2819676 — Cloud9 vs FURIA (2–0), 2025-07-18',
    rounds: REAL.rounds, meta: REAL.meta,
  };
}

if (typeof module !== 'undefined') module.exports = { MAPS, TEAMS, ABILITIES, CATEGORY_LABELS, REAL, OP_SPOTS, ANTISTRAT, ANTISTRAT_SPOT, expandReal };
