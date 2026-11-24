// ---------- Content tables: where the markdown meets the game's built-in tables (docs/MODDING.md 5.1 and 8) ----------
// boot.js's contentApply() hands every entry of content.generated.js to the adapter for its type (CONTENT_TABLES, below). An adapter
// changes the built-in row IN PLACE and only the fields the file sets, so a reference to the row (e.def === PIRATES.drone) still
// holds and a field a file leaves out keeps its built-in value. A file that disagrees with the code (a part in the wrong slot, a call
// of another kind) is refused with a message and the row stays as it was: apply() throws, ContentLib.apply reports it.
// The proof set that is read today, one table each (cards m4, m5 add the rest):
//   ship     the pirates in enemies.js PIRATES (raider, drone, gunship): the numbers and the radar colour
//   mission  the rows of MISSIONS in missions.js (rescue today): title, where, reward, count, the board text, progress, steps, failure line
//   text     the interface's words: the help screens, the scene tips and the toasts (key | text)
//   station  the dock: its name and the repair and ore prices
//   poi      the salvage sites (data_systems.js) and the random signal types (poi.js SIGNAL_TYPES): name, note, payout, guard
//   npc      the characters of the bar in shop.js NPCS (juno today): look and place, lines, reactions, persona
//   part     the tiers of PARTS in data_parts.js (shields-1 ... engine-3 today; tank and cargo read too): name, text, price and the tier's numbers
//   system   read and KEPT: the validated fields of each file go into CONTENT_WORLD.system, the docks into CONTENT_WORLD.station and the fixed sites' payouts
//            into CONTENT_WORLD.poi. Nothing in the game's scenes reads them yet; worldAt(systemId) (below) is the one place that puts them together, and
//            cards u-b4 (the jump), u-b5 (the eight systems) and u-e5 (the Station scene) read the world through it
// tests/contentproof.mjs pins that each file under content/ applied over its default changes nothing, and that editing one changes
// exactly what the file says.
const CT_HAS = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const CT_ORIG = new Map(); // the code's own function for a row, kept the first time a file replaces it (so applying twice never wraps a wrapper)
const ctOrig = (row, name) => { const k = row, m = CT_ORIG.get(k) || {}; if (!CT_ORIG.has(k)) CT_ORIG.set(k, m); if (!(name in m)) m[name] = row[name]; return m[name]; };
const ctHex = css => parseInt(String(css).slice(1), 16);                  // '#ffb454' -> 0xffb454
const ctCss = n => '#' + (n >>> 0).toString(16).padStart(6, '0');         // 0xffb454 -> '#ffb454'

// the {placeholders} a text may use (src/content.js PH), filled from the game as it is when the text is shown
function contentVars() {
  const safe = f => { try { const v = f(); return v === undefined || v === null ? '' : v; } catch (e) { return ''; } };
  const m = safe(() => missionDef());
  return {
    reward: safe(() => m ? m.reward : ''), count: safe(() => m && m.count ? m.count : ''), progress: safe(() => G.missionProgress | 0),
    credits: safe(() => G.credits | 0), kills: safe(() => G.stats.drones | 0), ship: safe(() => activeShip().name), system: safe(() => sysDef().name),
    station: safe(() => (sysBody('station') || {}).name),
    hull: safe(() => Math.round(100 * Math.max(0, REAVER_HP - G.missionProgress) / REAVER_HP)) // the bounty target's hull left, percent (missions.js)
  };
}
function contentFill(text, extra) {
  const v = Object.assign(contentVars(), extra || {});
  return String(text).replace(/\{([a-z]+)\}/g, (all, k) => CT_HAS(v, k) ? String(v[k]) : (typeof campKeyVar === 'function' && campKeyVar(k)) || all); // the names it does not know may be the Campaign's key words: {fleetkey}, {nlaunch}, {panels} ... (src/data_controls.js campKeyVar reads them from the panel table)
}

// the closed list of conditions a reaction line, an unlock rule or an appears rule may carry (docs/MODDING.md 3.4). Several joined by " and " must all
// hold, and ! in front of one means not. Anything unreadable is false.
function contentWhen(cond) {
  try { return String(cond).split(' and ').every(part => { const no = part[0] === '!', ok = ctOne(no ? part.slice(1) : part); return no ? !ok : ok; }); } catch (e) { return false; }
}
function ctOne(c) {
  let m;
  if (c === 'always') return true;
  if ((m = /^mission:(none|accepted|rescued|failed)$/.exec(c))) return G.mission === m[1];
  if ((m = /^mission-id:(.+)$/.exec(c))) return G.missionId === m[1];
  if ((m = /^credits>=(\d+)$/.exec(c))) return G.credits >= +m[1];
  if ((m = /^credits<(\d+)$/.exec(c))) return G.credits < +m[1];
  if ((m = /^hull<(\d+)$/.exec(c))) return G.hull * 100 < G.maxHull * +m[1];
  if ((m = /^kills>=(\d+)$/.exec(c))) return (G.stats.drones | 0) >= +m[1];
  if ((m = /^missions>=(\d+)$/.exec(c))) return (G.stats.missions | 0) >= +m[1];
  if ((m = /^upgrade:([a-z0-9-]+)>=(\d)$/.exec(c))) return ctTier(m[1]) >= +m[2];
  if ((m = /^upgrade:([a-z0-9-]+)$/.exec(c))) return ctTier(m[1]) > 0;
  if ((m = /^patrols>=(\d+)$/.exec(c))) return (G.patrolsDone | 0) >= +m[1];
  if ((m = /^system:(.+)$/.exec(c))) return G.system === m[1];
  if ((m = /^ship:(.+)$/.exec(c))) return activeShip().model === m[1];
  return false;
}
const ctTier = k => (CT_HAS(G.upgrades, k) ? G.upgrades[k] : activeShip().parts[k]) | 0; // a slot (shields) or an old v1 key (armor)

// ---- ship: the pirates ----
// content field -> PIRATES field, where the names differ. fireRange is the pirate's shooting range (a ship's own "range" is the jump range).
// name, role, side and the description are read and checked but nothing shows them yet (the hangar and the journal will)
const CT_SHIP_COPY = ['hp', 'speed', 'max', 'turn', 'engage', 'hold', 'aim', 'bullet', 'dmg', 'spread', 'ram', 'bounty', 'credits', 'strafe'];
const CT_SHIP = {
  canAdd: false,
  has: id => CT_HAS(PIRATES, id),
  get: (id, f) => { const d = PIRATES[id]; if (!d) return undefined; return f === 'fireRange' ? d.range : f === 'art' ? d.tex : f === 'radar' ? ctCss(d.radar) : d[f]; },
  apply: (id, data) => {
    const d = PIRATES[id];
    if (data.side !== undefined && data.side !== 'pirate') throw new Error('side is "' + data.side + '" but ' + id + ' is a pirate ship');
    CT_SHIP_COPY.forEach(k => { if (data[k] !== undefined) d[k] = data[k]; });
    if (data.shot !== undefined) d.shot = data.shot.slice();
    if (data.fireRange !== undefined) d.range = data.fireRange;
    if (data.radar !== undefined) d.radar = ctHex(data.radar);
    if (data.art !== undefined) d.tex = data.art;
  }
};

// ---- mission: the calls on the board ----
const CT_MISSION = {
  canAdd: false,
  has: id => MISSIONS.some(m => m.id === id),
  get: (id, f) => { const m = MISSIONS.find(x => x.id === id); return m ? m[f] : undefined; },
  apply: (id, data) => {
    const m = MISSIONS.find(x => x.id === id);
    const kind = missionKind(m); // a built-in call is of the kind it is called; a call a pack adds (src/contentadd.js) says its own
    if (data.kind !== undefined && data.kind !== kind) throw new Error('kind is "' + data.kind + '" but the file is called ' + id + ', so its kind must be ' + kind);
    ['title', 'where', 'reward', 'count'].forEach(k => { if (data[k] !== undefined) m[k] = data[k]; });
    // where it is played (src/missions.js missionBody): the system, the body there, and the pirates that are always in that system
    if (data.system !== undefined || data.body !== undefined) {
      const sys = data.system !== undefined ? data.system : (m.system || 'halcyon');
      if (m.carry || m.site) { if (data.body !== undefined) throw new Error(missionBodyFault(kind, sys, data.body)); } // a run or a site call keeps its own places
      else {
        if (!Object.prototype.hasOwnProperty.call(SYSTEMS, sys)) throw new Error('the system "' + sys + '" is not in the game');
        if (data.body !== undefined) { const fault = missionBodyFault(kind, sys, data.body); if (fault) throw new Error(fault); }
        else if (data.system !== undefined && data.system !== m.system && !sysBody(CALL_BODY[kind], sys)) throw new Error(sys + ' has no ' + CALL_BODY[kind] + ' for a ' + kind + ' call');
        const moved = sys !== (m.system || 'halcyon'); // a call moved to another system with no body named: the first body of its type there
        m.system = sys; m.body = data.body !== undefined ? data.body : moved ? undefined : m.body;
      }
    }
    if (data.guards !== undefined) m.guards = data.guards;
    if (data.pickets !== undefined) m.pickets = data.pickets.map(r => [r.x, r.y]);
    if (data.unlock !== undefined) m.unlock = () => contentWhen(data.unlock); // the board offers the call while this holds
    // {reward} and {count} in this call's own text are this call's, whichever call is open (the board shows them all); {progress}, {credits} and the rest are live
    const fill = text => contentFill(text, { reward: m.reward, count: m.count === undefined ? '' : m.count });
    // the board text and the failure line read as plain properties, so they are live getters
    const live = (prop, text) => { if (text !== undefined) Object.defineProperty(m, prop, { get: () => fill(text), configurable: true, enumerable: true }); };
    live('offer', data.offer !== undefined ? data.offer : data.description);
    live('deathMsg', data.failure);
    if (data.boardLine) {
      const line0 = ctOrig(m, 'line'), bl = data.boardLine;
      m.line = st => { const t = st === 'rescued' ? bl.rescued : st === 'failed' ? bl.failed : bl.active; return t === undefined ? line0(st) : fill(t); };
    }
    if (data.progress !== undefined || data.progressRescued !== undefined) {
      const progress0 = ctOrig(m, 'progress');
      m.progress = () => { const t = G.mission === 'rescued' ? data.progressRescued : data.progress; return t === undefined ? progress0() : fill(t); };
    }
    if (data.steps && typeof HUD_MISSIONS !== 'undefined' && HUD_MISSIONS[id]) HUD_MISSIONS[id].steps = data.steps.map(t => /\{/.test(t) ? () => fill(t) : t);
  }
};

// ---- npc: the bar's characters ----
// content/npcs/ship-computer.md is the ship's computer (src/shipcomputer.js), not a character of the bar: its name, role, voice, Lines and Persona go to SHIPCOMP
const CT_COMPUTER = 'ship-computer';
const CT_NPC = {
  canAdd: false,
  has: id => id === CT_COMPUTER || NPCS.some(n => n.id === id),
  get: (id, f) => { if (id === CT_COMPUTER) return typeof shipcompGet === 'function' ? shipcompGet(f) : undefined; const n = NPCS.find(x => x.id === id); return n ? (f === 'color' ? n.css : n[f]) : undefined; },
  apply: (id, data) => {
    if (id === CT_COMPUTER) { if (typeof shipcompApply === 'function') shipcompApply(data); return; }
    const n = NPCS.find(x => x.id === id);
    if (data.name !== undefined && data.name !== n.name && !n.sprite) n.sprite = n.name.toLowerCase(); // the bar's art is looked up by the old name
    ['name', 'role', 'voice', 'x', 'y', 'face', 'persona'].forEach(k => { if (data[k] !== undefined) n[k] = data[k]; });
    if (data.color !== undefined) { n.css = data.color; n.color = ctHex(data.color); } // the name above them is the same colour unless the file has a label
    if (data.label !== undefined) n.css = data.label;
    if (data.appears !== undefined) n.when = () => contentWhen(data.appears); // in the bar only while this holds
    if (data.lines !== undefined) n.lines.splice(0, n.lines.length, ...data.lines);
    if (data.reactions !== undefined) { // the first row whose condition holds is what they say; none, and they say nothing
      const rows = data.reactions.map(r => ({ when: r.when, line: r.line }));
      n.react = () => { const r = rows.find(x => contentWhen(x.when)); return r ? contentFill(r.line) : null; };
    }
  }
};

// ---- part: the ship parts, one file a tier ----
// shields-1, shields-2, shields-3, weapons-1 ... cargo-3: the slot is the first word, the tier (1 to 3) the number. A file changes that tier's
// name, short form, shop text, price and the numbers in PARTS (src/data_parts.js), which shipStat() in src/fleet.js reads.
// field in the file -> [the PARTS array it writes (index = tier), from the file's value, back to the file's value]
const ctRound = v => Math.round(v * 1e6) / 1e6;
const CT_PART_FX = {
  shields: { points: ['pts'], regen: ['regen'], delay: ['delay'] },
  weapons: { delay: ['delay'], damage: ['damage'] },
  engine: { speedPct: ['speed', p => ctRound(1 + p / 100), v => ctRound((v - 1) * 100)], jump: ['range'], boostAdd: ['boost'], boostTank: ['tank'], boostRegen: ['regen'] },
  tank: { fuelMult: ['mul'] },
  cargo: { holdPlus: ['add'] },
  aim: { range: ['range'] }   // the autotarget's reach in px (src/autotarget.js); the tiers' names, texts and prices work like any part's
};
function ctPart(id) { // 'shields-2' -> { slot: 'shields', tier: 2, P: PARTS.shields }, or null
  const m = /^([a-z]+)-([1-3])$/.exec(id);
  return m && CT_HAS(PARTS, m[1]) ? { slot: m[1], tier: +m[2], P: PARTS[m[1]] } : null;
}
const CT_PART = {
  canAdd: false,
  has: id => !!ctPart(id),
  get: (id, f) => {
    const p = ctPart(id); if (!p) return undefined;
    const i = p.tier - 1, fx = CT_PART_FX[p.slot][f];
    return f === 'name' ? p.P.tiers[i] : f === 'brief' ? p.P.brief[i] : f === 'price' ? p.P.prices[i] : f === 'description' ? p.P.descs[i] : f === 'tier' ? p.tier : f === 'slot' ? p.slot
      : fx ? (fx[2] ? fx[2](p.P[fx[0]][p.tier]) : p.P[fx[0]][p.tier]) : undefined;
  },
  apply: (id, data) => {
    const p = ctPart(id);
    if (data.slot !== p.slot) throw new Error('slot is "' + data.slot + '" but the file is called ' + id + ', so it must be the ' + p.slot + ' slot');
    if (data.tier !== p.tier) throw new Error('tier is ' + data.tier + ' but the file is called ' + id + ', so it must be tier ' + p.tier);
    const i = p.tier - 1;
    if (data.name !== undefined) p.P.tiers[i] = data.name;
    if (data.brief !== undefined) p.P.brief[i] = data.brief;
    if (data.price !== undefined) p.P.prices[i] = data.price;
    if (data.description !== undefined) p.P.descs[i] = data.description;
    Object.keys(CT_PART_FX[p.slot]).forEach(f => { if (data[f] !== undefined) { const fx = CT_PART_FX[p.slot][f]; p.P[fx[0]][p.tier] = fx[1] ? fx[1](data[f]) : data[f]; } });
  }
};

// ---- system, and the stations the game does not have yet (content/systems, content/stations): read and kept, not used ----
// The game has no table to merge another star system into yet, so the adapter only keeps what each file says, by id, in CONTENT_WORLD.system, and
// CT_STATION (below) does the same in CONTENT_WORLD.station for a dock that is not in data_systems.js (every one but Halcyon Station). The validated
// fields, a copy. No scene, test hook or save reads it. It stands there so a shipped file of these types is accepted instead of warned about
// ("does not read systems yet"), and so cards u-b5 and u-e5 have one place to read.
// CONTENT_WORLD.poi holds the payouts of the fixed sites (content/poi/<id>.md), for worldAt to lay over the system's rows.
const CONTENT_WORLD = { system: {}, station: {}, poi: {} };
const ctBuilt = new Map(); // worldAt's cache: one def per system, dropped whenever any adapter takes a new file
const ctWorld = type => ({
  canAdd: true,
  has: id => CT_HAS(CONTENT_WORLD[type], id),
  get: (id, f) => CT_HAS(CONTENT_WORLD[type], id) ? CONTENT_WORLD[type][id][f] : undefined,
  apply: (id, data) => { CONTENT_WORLD[type][id] = JSON.parse(JSON.stringify(data)); ctBuilt.clear(); }
});

// ---- poi: salvage sites and random signals (src/poi.js) ----
// a fixed site is a body of type 'poi' in a system (data_systems.js); a random signal is a row of SIGNAL_TYPES. Where a site is stays in the system's data.
const ctSite = id => { for (const k of Object.keys(SYSTEMS)) { const b = (SYSTEMS[k].bodies || []).find(x => x.type === 'poi' && x.id === id); if (b) return b; } return null; };
const ctSignal = id => { const m = /^signal-([a-z]+)$/.exec(id); return m ? SIGNAL_TYPES.find(t => t.kind === m[1]) || null : null; };
const CT_POI = {
  canAdd: false,
  has: id => !!(ctSite(id) || ctSignal(id)),
  get: (id, f) => {
    const sig = ctSignal(id), p = sig || ctSite(id); if (!p) return undefined;
    return f === 'pays' ? (sig ? p.credits : undefined) : f === 'description' ? p.note : p[f];
  },
  apply: (id, data) => {
    const sig = ctSignal(id), p = sig || ctSite(id);
    if (data.kind !== undefined && data.kind !== p.kind) throw new Error('kind is "' + data.kind + '" but ' + id + ' is a ' + p.kind);
    if (data.name !== undefined) p.name = data.name;
    if (data.description !== undefined) p.note = data.description;
    if (data.hull !== undefined) p.hull = data.hull;
    if (sig) {
      if (data.pays !== undefined) p.credits = data.pays.slice();
      if (data.guardChance !== undefined) p.guardChance = data.guardChance;
      if (data.hullChance !== undefined) p.hullChance = data.hullChance;
    } else {
      if (data.credits !== undefined) p.credits = data.credits;
      if (data.guard !== undefined) p.guard = data.guard;
      CONTENT_WORLD.poi[id] = ctWorldCopy(data); ctBuilt.clear();
    }
  }
};

// ---- station: the dock (today one: Halcyon Station) ----
// name is the station's name; repair is the credits a point of hull at the repair bay (station.js REPAIR_PRICE) and ore the credits an ore pays at the dock
// (asteroids.js ORE_PRICE). Both prices are the game's today, because there is one dock; a second station will carry its own. welcome, shop, services and
// bar sections and fuel are accepted but nothing reads them yet.
const ctStationRow = id => { for (const k of Object.keys(SYSTEMS)) { const b = (SYSTEMS[k].bodies || []).find(x => x.type === 'station' && x.id === id); if (b) return { b, sys: k }; } return null; };
const ctWorldCopy = d => JSON.parse(JSON.stringify(d));
const CT_STATION = {
  canAdd: true, // a dock in a system data_systems.js does not have yet is kept in CONTENT_WORLD.station (nothing reads it); the docks it has are applied below
  has: id => !!ctStationRow(id) || CT_HAS(CONTENT_WORLD.station, id),
  get: (id, f) => {
    const r = ctStationRow(id);
    if (!r) return CT_HAS(CONTENT_WORLD.station, id) ? CONTENT_WORLD.station[id][f] : undefined;
    const home = r.b.id === homeDock(), d = r.b.dock || {}; // the game's one price of repair and of ore is Halcyon Station's; another station's are in its dock (read by card u-e4)
    return f === 'name' ? r.b.name : f === 'system' ? r.sys : f === 'repair' ? (home ? REPAIR_PRICE : d.repair) : f === 'ore' ? (home ? ORE_PRICE : d.ore) : undefined;
  },
  apply: (id, data) => {
    const r = ctStationRow(id);
    if (!r) { // a dock in a system the game has with bodies in it (Halcyon) must be a dock the game has; a dock in a system it does not have yet, or has only as an empty one (Kestrel until u-b5), is kept
      // a dock no row has yet: kept. Its system's file lists it as a body, and worldSync (below) puts both into SYSTEMS at Boot. (Until card
      // space-game-systems-from-markdown this refused a new dock in a system the code had rows for.)
      CONTENT_WORLD.station[id] = ctWorldCopy(data); ctBuilt.clear(); return;
    }
    if (data.system !== undefined && data.system !== r.sys) throw new Error('system is "' + data.system + '" but ' + id + ' is in ' + r.sys);
    if (data.name !== undefined) r.b.name = data.name;
    if (data.repair !== undefined && id === homeDock()) REPAIR_PRICE = data.repair; // the game has one price of each so far: Halcyon Station's. The other docks' prices are
    if (data.ore !== undefined && id === homeDock()) ORE_PRICE = data.ore;          // in their rows of data_systems.js, where card u-e4 reads them; a file for one never moves Halcyon's
    CONTENT_WORLD.station[id] = ctWorldCopy(data); ctBuilt.clear(); // fuel, yard, parts, partMult, fee and the words are kept for worldAt; the game reads the three above
  }
};

// ---- worldAt(systemId): one system, the shape of a row of SYSTEMS (src/data_systems.js), for the cards that jump, draw and dock ----
// worldAt gives the game's own row when the code has one with bodies in it (Halcyon: nothing about the game changes) and otherwise the row the files describe (a code row with no bodies, the Kestrel stub of card u-b4, gives way to its files). worldFromFiles builds
// the row from the files alone, for any system with a file: its fields, its Bodies table (planets by kind and seed, belts, sites, scenery, the gate), its station
// bodies with the dock from their station file, and the pirate table. The two agree for Halcyon, and tests/worldat.mjs pins that, field by field. What a row has
// beyond the code's: seed and star (the system's own), description, and on a station body about (accent, welcome, services, bar, shop: the words for the Station scene).
// A dock is the numbers of the station file under the names the code reads: fuel, repair, ore, yard; and parts as dock.shop and dock.parts the way
// src/data_parts.js reads them (a Parts table means the slots it lists to those tiers and no others), partMult, fee and salvageMult.
// Nothing here throws: a system nobody knows is null, a bad body is left out. The row is cached; treat it as read-only, like SYSTEMS.
// The row itself is made by sysRowFrom in src/data_systems.js: the same function that makes SYSTEMS when the page loads, here over the fields the
// adapters kept (CONTENT_WORLD), so a pack that is switched on is in it. worldFromFiles keeps the home dock's own repair and ore prices (SYSTEMS leaves
// them to the game's two constants).
function worldFromFiles(id) {
  try {
    const def = sysRowFrom(id, CONTENT_WORLD, true);
    return def ? sysScale(def) : null; // the files are in the old units (src/data_systems.js SYSTEM_SCALE)
  } catch (e) { return null; }
}
// The files are the source of the systems the game flies (card space-game-systems-from-markdown). SYSTEMS is made from the core pack when the page
// loads; worldSync runs once at Boot, after the core pack and the packs the player turned on have been applied, and lays what they say over it:
// a system no row has yet is added (a star on the galaxy map, bodies to fly to), one whose fields differ is replaced in place (the object the
// game holds stays the same one). Nothing here throws: a system that cannot be built keeps the row it had.
function worldSync() {
  const done = { added: [], replaced: [] };
  try {
    Object.keys(CONTENT_WORLD.system).forEach(id => {
      let row = null;
      try { row = sysRowFrom(id, CONTENT_WORLD); if (row) sysScale(row); } catch (e) { row = null; }
      if (!row || !Array.isArray(row.bodies)) return;
      if (!CT_HAS(SYSTEMS, id)) { SYSTEMS[id] = row; done.added.push(id); return; }
      if (JSON.stringify(SYSTEMS[id]) === JSON.stringify(row)) return;
      const cur = SYSTEMS[id]; Object.keys(cur).forEach(k => { delete cur[k]; }); Object.assign(cur, row); done.replaced.push(id); // `scaled` is not a key: it stays set, and the new values are already spread
    });
    ctBuilt.clear();
  } catch (e) { /* the rows the page loaded with stand */ }
  return done;
}
function worldAt(id) {
  try {
    if (typeof id !== 'string') return null;
    const code = CT_HAS(SYSTEMS, id) ? SYSTEMS[id] : null;
    if (code && (code.bodies || []).length) return code; // the game's own row, with its bodies in it (Halcyon)
    if (!ctBuilt.has(id)) ctBuilt.set(id, worldFromFiles(id));
    return ctBuilt.get(id) || code; // a row of the code's with no bodies is a stub (Kestrel until card u-b5): the files' row replaces it, and it stays when no file describes it
  } catch (e) { return null; }
}
function worldIds() { // every system the game or a file has, the code's first
  const ids = Object.keys(SYSTEMS);
  Object.keys(CONTENT_WORLD.system).forEach(k => { if (!ids.includes(k)) ids.push(k); });
  return ids;
}

// ---- text: the words the interface says (content/text/ui.md) ----
// One table of key | text. A key is a string the game reads: help.<scene>.<line> (the H screen, src/meta.js HELP), tips.<scene> (src/map.js SCENE_TIPS) or
// toast.<name> (the lines that pop up, UI_TEXT below, read through uiText()) or keys.<provider>.<use|cost|url> and keys.steps (Settings > Keys). Help lines and tips are plain text; a toast may use {placeholders}.
// Files in text/ are applied in name order and the last file to give a key wins, so ui.md beats a file that sorts before it (my-words.md) and loses to one that sorts after (words.md).
// To translate, edit ui.md, or copy it to a name after ui (words-fr.md) and delete the original. A key the game does not read refuses the whole file.
const UI_TEXT = {
  'toast.docked': 'Docked.', 'toast.delivered': 'Colonist delivered safely. +{reward} cr', 'toast.accepted': 'Mission accepted. Board your ship in the hangar.',
  'toast.dropped': 'Mission dropped. The board has other calls.',
  'toast.patrol-down': 'Wanted pirate down  {progress} of {count}', 'toast.patrol-done': 'Patrol complete. All wanted pirates destroyed.',
  'toast.mule-leaving': 'The MULE is leaving. Stay inside her ring: faster, half damage.', 'toast.mule-left': 'You left the MULE behind. Mission failed.',
  'toast.mule-lost': 'The MULE was destroyed. Mission failed.', 'toast.mule-arrived': 'The MULE made the Perseus gate.',
  'toast.mule-half': 'MULE: Hull at half. Get them off me.', 'toast.mule-gate-sight': 'MULE: Gate in sight.', 'toast.mule-spinup': 'MULE: At the gate. Eight seconds to spin up. Hold them off.',
  'toast.mule-wave-port': 'MULE: Raiders, port side.', 'toast.mule-wave-starboard': 'MULE: Raiders, starboard side.', 'toast.mule-wave-ahead': 'MULE: Raiders, dead ahead.',
  'toast.reaver-intro': 'The Reaver waits south-west of Reaver\'s Rock. Watch for its flash.', 'toast.reaver-wing': 'The Reaver calls in its wing.',
  'toast.reaver-burning': 'The Reaver is burning. It fights harder.', 'toast.reaver-dead': 'The Reaver is wreckage. Bounty paid.',
  'toast.signal-new': 'New signal on the radar: {name}', 'toast.signal-found': 'Signal found: {name}', 'toast.signal-lost': 'Signal lost: {name}',
  // The next steps (card space-game-first-ten-minutes, src/guide.js): one line each, with its key, said once. {shop} and {missions} are the number keys of those rows of the station menu
  'hint.dock': 'Slow down near a station and press L to dock. Ore sells and calls are taken there.',
  'hint.jump': 'To jump: G opens the map, pick a star, press Enter. A jump burns fuel; the station pump refills it.',
  'hint.ore': 'Shoot asteroids for ore. It sells for credits when you dock (L).',
  'hint.shop': 'Credits buy parts at the SHOP: press {shop} in the station menu.',
  'hint.calls': 'Courier and haul calls pay to carry cargo: MISSIONS, press {missions}.',
  // Settings > Keys (card space-game-key-links, src/settings.js settingsKeyInfo): for each key what it is for, that it is your own account, and the address of the
  // provider's key page; keys.steps is the three steps. The words and the addresses are content/text/ui.md's and are left empty here on purpose: when a provider
  // moves its page that is a text edit and a reseal, not code. A line left empty is not shown; an address that is not a plain https address is shown as text only.
  'keys.steps': '', 'keys.deepgram.use': '', 'keys.deepgram.cost': '', 'keys.deepgram.url': '', 'keys.openai.use': '', 'keys.openai.cost': '', 'keys.openai.url': '',
  'keys.anthropic.use': '', 'keys.anthropic.cost': '', 'keys.anthropic.url': '',
  // Settings > Listen (card space-game-ship-computer-listens, src/listen.js and src/settings.js): what holding the key does, the cost, and the one-line hint about the microphone. {key} and {minutes}
  'listen.use': '', 'listen.cost': '', 'listen.hint': '', 'listen.early': '',
  // Settings > Sound > Spoken replies (card space-game-voice-shorter, src/voice.js, src/settings.js): the sentence under the row, and what each choice means
  'spoken.use': 'Spoken replies: how much of the computer\'s answer is said aloud. The strip always shows all of it. U, Esc or a click on the strip stops the voice.',
  'spoken.short': 'the first sentence or two is said', 'spoken.full': 'the whole answer is said', 'spoken.off': 'answers are never said aloud',
  // The Campaign (card space-game-campaign-mvp, src/campaign.js, src/campaignscene.js, docs/CAMPAIGN.md): its story lines (camp.l<level>.<before|after>.<n>), the answers to its orders (camp.say, camp.no),
  // the screens (camp.ui) and the techs (camp.tech.<id>.name, .text). {name} is a place, {n} a number
  'camp.l1.before.1': 'Lunar Base. A transport waits to run to Ceres.',
  'camp.l1.before.2': 'Pirates work the lane. Escort her through.',
  'camp.l1.after.1': 'First contact. We beat their scouts and took their tech.',
  'camp.l1.after.2': 'Earth shares it with the fleet. You are drafted, pilot.',
  'camp.win.result': 'Won in {time}. Carrier hull {hull} of {max}, {lost} of your ships lost.',
  'camp.win.resultconv': 'Won in {time}. Carrier hull {hull} of {max}, {delivered} of {convoys} convoys delivered, {lost} of your ships lost.',
  'camp.l2.before.1': 'We are through the warp. This is Alpha Centauri.',
  'camp.l2.before.2': 'Something old waits on Proxima b. Find it first.',
  'camp.l2.after.1': 'The relic is a machine from an older race.',
  'camp.l2.after.2': 'It shows where the aliens live. Choose a technology.',
  'camp.l3.before.1': 'Their home world is open. Last battle.',
  'camp.l3.before.2': 'Break the defence towers round their world.',
  'camp.l3.after.1': 'Their defences are down.',
  'camp.l3.after.2': 'The war is won.',
  'camp.say.convoy': 'Convoy to {name} is away.',
  'camp.say.delivered': 'The convoy has reached {name}.',
  'camp.say.lost': 'Lost them.',
  'camp.nav.k.raider': 'Raider', 'camp.nav.k.drone': 'Drone', 'camp.nav.k.gunship': 'Gunship', 'camp.nav.k.fighter': 'Fighter', 'camp.nav.k.tower': 'Tower', 'camp.nav.k.freighter': 'Freighter',
  'camp.nav.wreck': 'Wreck', 'camp.nav.chunk': 'Ore', 'camp.nav.rock': 'Rock {n}',
  'camp.say.convoylost': 'The convoy to {name} is lost.',
  'camp.say.wave1': 'Aliens on the Mars lane, pilot.',
  'camp.say.wave2': 'A second wave, heading for Earth.',
  'camp.say.wave3': 'Their mothership has jumped in. Kill it.',
  'camp.say.launch': 'Launching the wing.',
  'camp.say.noblink': 'No warp blink yet. It is a technology you can pick.',
  'camp.say.blinkwait': 'The blink is not ready: {s} s.',
  'camp.say.attack': 'Fighters, attack.',
  'camp.say.attackmother': 'Fighters, attack the mothership.',
  'camp.say.escort': 'The squads are with the {name} convoy.',
  'camp.say.guard': 'The wing is guarding.',
  'camp.say.recall': 'Wing, return to the carrier.',
  'camp.say.missiles': 'Missile away.',
  'camp.say.missilesmother': 'Missile away, at the mothership.',
  'camp.say.earthhalf': 'Earth\'s shield is at half, pilot.',
  'camp.say.earthlow': 'Earth\'s shield is nearly gone, pilot.',
  'camp.say.hullhalf': 'The carrier\'s hull is at half.',
  'camp.say.hulllow': 'The carrier\'s hull is critical, pilot.',
  'camp.no.over': 'The battle is over, pilot.',
  'camp.no.bay': 'The bay is empty, pilot.',
  'camp.no.launching': 'The wing is still launching.',
  'camp.no.baydry': 'Everything is already out, pilot.',
  'camp.no.nofighters': 'No fighters are out.',
  'camp.no.noconvoy': 'There is no convoy to escort.',
  'camp.no.nomother': 'The mothership has not come yet.',
  'camp.no.nowing': 'No ships are out.',
  'camp.no.nosquad': 'No ships of that squad are out.',
  'camp.no.what': 'I cannot do that, pilot.',
  'camp.no.nomissiles': 'The magazine is empty, pilot. {keyreload} builds more, for ore.',
  'camp.no.missilewait': 'The launcher is still cycling.',
  'camp.no.nobig': 'No big ship in missile range, pilot.',
  'camp.no.range': 'The mothership is out of missile range, pilot.',
  'camp.help.goal': 'Your goal: {goal}',
  'camp.help.keys': 'The arrow keys fly, Space fires. {panels}.',
  'camp.help.map': 'Tab opens the level map. Tab or Esc closes it.',
  'camp.help.status': 'Hull {hull} of {max}. Earth {earth} percent. {out} out, {bay} in bay.',
  'camp.help.status2': 'Hull {hull} of {max}. {out} out, {bay} in bay.',
  'camp.lose.carrier': 'The carrier is lost.',
  'camp.lose.earth': 'Earth\'s shield has failed.',
  'camp.lose.debug': 'The level was ended with the debug key.',
  'camp.lose.other': 'The level is lost.',
  'camp.lose.reached': 'You lasted {time}: wave {wave} of {total}, kills: {kills}.',
  'camp.lose.tip.towers': 'Fire missiles ({keymissile}) at the towers. Send the wing at them.',
  'camp.lose.tip.carrier': 'Use the pilots early: they draw fire. Keep moving.',
  'camp.lose.tip.earth': 'Aliens at Earth shell it. Attack early: {keynear}, then {keyorder}.',
  'camp.say.l2wave1': 'The aliens followed us through the warp, pilot.',
  'camp.say.l2wave2': 'A second group, coming in from the far side.',
  'camp.say.l3wave1': 'Defenders are launching from the planet.',
  'camp.say.l3wave2': 'More defenders, from the north.',
  'camp.say.l3wave3': 'Their last reserves are coming.',
  'camp.say.cache': 'Resources gathered: {n}.',
  'camp.say.relicon': 'The relic is answering. Hold the ring.',
  'camp.say.relicdone': 'The relic is ours.',
  'camp.obj.mother': 'Destroy the alien mothership.',
  'camp.obj.motherwait': 'Hold off the waves; the mothership comes last.',
  'camp.obj.towers': 'Break the defence towers: {n} left.',
  'camp.obj.caches': 'Gather resources: {n} of {need}.',
  'camp.obj.relic': 'Hold the ring at the relic: {pct}%.',
  'camp.ui.end': 'THE WAR IS NOT OVER     Enter  title',
  // The reveal after the last level (card space-game-campaign-outpost-reveal, content/text/campaign-reveal.md): the ending, and what a replay and the title say after the flag
  'camp.end.1': 'This is not their home. It is an outpost.',
  'camp.end.2': 'The war is not over.',
  'camp.end.3': 'Their data points to {star}.',
  'camp.l3.after.r.1': 'The outpost defences are down.',
  'camp.l3.after.r.2': 'The war goes on.',
  'camp.l3.before.r.1': 'The outpost lies open, pilot.',
  'camp.l3.before.r.2': 'Break the defence towers round it.',
  'title.camp.sub.r': 'The war goes on: fly the carrier, command the wing.',
  // The ship's systems (card space-game-campaign-systems, content/text/campaign-power.md)
  'camp.say.powerweapons': 'Power to weapons.',
  'camp.say.powershields': 'Power to shields.',
  'camp.say.powerengines': 'Power to engines.',
  'camp.say.balance': 'Power balanced.',
  'camp.say.emergency': 'Emergency shields!',
  'camp.say.shieldlow': 'Shields are low, pilot.',
  'camp.say.enginelow': 'Engines are low on power, pilot.',
  'camp.no.powermax': 'That system is at full power.',
  'camp.no.powernone': 'No power left to take.',
  'camp.no.powerwhat': 'Weapons, shields or engines?',
  'camp.no.locked': 'Emergency shields hold the power.',
  'camp.no.cooling': 'Emergency shields ready in {s} seconds.',
  'camp.no.shieldfull': 'The shields are full, pilot.',
  'camp.pow.weapons': 'WEAPONS',
  'camp.pow.shields': 'SHIELDS',
  'camp.pow.engines': 'ENGINES',
  // The scout-escorts (card space-game-campaign-scouts, content/text/campaign-scouts.md)
  'camp.say.anomalyread': 'Anomaly: likely {likely}.',
  'camp.nav.anomalyread': 'Anomaly: likely {likely}',
  // The Campaign's radio chatter (card space-game-campaign-chatter, content/text/chatter.md)
  'camp.chat.splash.1': 'Splash one.',
  'camp.chat.splash.2': 'Got him.',
  'camp.chat.splash.3': 'Target down.',
  'camp.chat.splash.4': 'Good kill.',
  'camp.chat.hit.1': 'Taking fire!',
  'camp.chat.hit.2': 'I\'m hit!',
  'camp.chat.hit.3': 'They\'re on me.',
  'camp.chat.hit.4': 'Need cover here.',
  'camp.chat.copy.1': 'Copy that.',
  'camp.chat.copy.2': 'Wing, on your word.',
  'camp.chat.copy.3': 'Roger. Moving in.',
  'camp.chat.copy.4': 'On it.',
  'camp.chat.home.1': 'Going home.',
  'camp.chat.home.2': 'Heading back to the carrier.',
  'camp.chat.home.3': 'Returning to base.',
  'camp.chat.contact.1': 'Contact! Bandits inbound.',
  'camp.chat.contact.2': 'I have contacts.',
  'camp.chat.contact.3': 'Aliens on the scope.',
  'camp.chat.mother.1': 'Mothership on the scope.',
  'camp.chat.mother.2': 'Big one just arrived.',
  'camp.chat.mother.3': 'That is the mothership.',
  'camp.chat.lowmissiles.1': 'Missiles running low.',
  'camp.chat.lowmissiles.2': 'Magazine nearly dry.',
  'camp.chat.lowmissiles.3': 'Low on missiles.',
  'camp.chat.ore.1': 'Ore aboard.',
  'camp.chat.ore.2': 'Ore secured.',
  'camp.chat.relic.1': 'The relic is lighting up.',
  'camp.chat.relic.2': 'Relic is answering.',
  'camp.chat.convoy.1': 'Convoy is through.',
  'camp.chat.convoy.2': 'The freighters made it.',
  'camp.chat.cache.1': 'Cache secured.',
  'camp.chat.cache.2': 'Got the cache.',
  'camp.chat.shields.1': 'Shields are failing!',
  'camp.chat.shields.2': 'Shields almost gone.',
  'camp.chat.engines.1': 'Engines are sluggish.',
  'camp.chat.engines.2': 'We are crawling here.',
  'camp.chat.anomaly.1': 'Something odd out there.',
  'camp.chat.anomaly.2': 'Sensors show a ripple.',
  'camp.chat.anomaly.3': 'Space is bending ahead.',
  'chatter.mode.on': 'Chatter on: the wing calls kills, hits and orders about every 3 seconds.',
  'chatter.mode.quiet': 'Chatter quiet: one call in 8 seconds, never over the computer or a warning.',
  'chatter.mode.off': 'Chatter off: the wing is silent.',
  // The title screen's two choices and the pause menu's Title row (card space-game-title-modes, content/text/title.md)
  'title.long.key': 'ENTER',
  'title.long.name': 'LONG HAUL',
  'title.long.sub': 'The trading run to Kepler-4b. Enter starts it; the arrows pick.',
  'title.camp.key': 'K',
  'title.camp.name': 'CAMPAIGN',
  'title.camp.sub': 'Earth\'s fleet on the rim: fly the carrier, command the wing.',
  'title.pause': 'Title screen   (saved; Campaign or Long Haul from there)',
  'camp.say.mine': 'Mining ships are on their way.',
  'camp.say.repairoff': 'Fighter hit hard. Breaking off to land.',
  'camp.say.repairback': 'Fighter mended and launching again.',
  'camp.say.repairdone': 'Fighter mended. It is in the bay.',
  'camp.ui.repair': 'REPAIR {n}  {s} s',
  'camp.no.noore': 'There is no ore in reach, pilot.',
  'camp.no.noore2': 'Not enough ore: {need} needed, {have} in the store.',
  'camp.no.noearth': 'There is no Earth here, pilot.',
  'camp.no.shieldauto': 'Shields mend on their own.',
  'camp.ui.listkeys': '{keyup} {keydown}  {keypick} order or open  {keypause} close',
  'camp.ui.listmore': '{n} more below',
  'camp.ui.listkeysub': '{keyup} {keydown}  {keypick} order  Left back  {keypause} close',
  'camp.ui.listnums': '1-{last}  does a row    {keypause} close',
  'camp.ui.candnums': '1-{last}  give the order    {keypause} back',
  'camp.ui.cand.title.enemy': 'PICK A TARGET',
  'camp.ui.cand.title.escort': 'WHICH TO ESCORT',
  'camp.ui.cand.title.field': 'WHICH ROCKS TO MINE',
  'camp.ui.cand.keys': '{keyup} {keydown}  {keypick} give the order  {keypause} back',
  'camp.ui.listkeyback': '{keyup} {keydown}  {keypick} order  {keypause} back',
  'camp.ui.cand.field': 'Rock field {n}',
  'camp.ui.cand.rock1': '1 rock',
  'camp.ui.cand.rocks': '{n} rocks',
  'camp.ui.cand.state.ship': '{name}, {km} km away, hull {hp}%',
  'camp.ui.cand.state.field': '{name}, {km} km away',
  'camp.say.wing.guardlost': '{group}, {name} is lost. Back to the cruiser.',
  'camp.say.wing.guardsafe': '{group}, {name} is safe. Back to the cruiser.',
  'camp.no.noguard': 'Nothing here for the squad to guard.',
  'camp.ui.cand.title.guard': 'WHICH TO GUARD',
  'camp.ui.cand.state.post': '{name}, {km} km away',
  'camp.no.nofoe': 'No hostiles in sight, pilot.',
  'camp.ui.blink': 'BLINK',
  'camp.no.notarget': 'No target, pilot. {keyhostiles} picks one, {keynear} the nearest.',
  'camp.no.tgtrange': 'The target is out of missile range, pilot.',
  'camp.ui.tgt': 'TARGET  {name}  {km} km',
  'camp.ui.tgtnone': 'TARGET  none',
  'camp.ui.tgtkeys': '{keyhostiles} {keynear} pick a target',
  'camp.ui.tgtclear': '{keyclear} clear',
  'camp.ui.tune.title': 'TUNING',
  'camp.ui.tune.sub': 'Change a number or a switch and feel it at once. Kept in this browser; a bot or a test never sees them.',
  'camp.ui.tune.keys1': 'Up Down choose    Left Right change (Shift: ten steps)    Backspace back to the default    Enter flips a switch',
  'camp.ui.tune.keys2': '{keytune} or Esc closes. The battle waits while this is open. A mission flown tuned does not save its score.',
  'camp.ui.tune.copy': 'Copy my settings',
  'camp.ui.tune.reset': 'Reset everything to the defaults',
  'camp.ui.tune.changed': '{n} changed',
  'camp.ui.tune.nochange': 'nothing changed',
  'camp.ui.tune.default': 'default {v}',
  'camp.ui.tune.on': 'ON',
  'camp.ui.tune.off': 'OFF',
  'camp.ui.tune.mark': 'TUNED {n}',
  'camp.ui.tune.notkept': 'Tuned run: the score and the rank are not kept.',
  'camp.ui.tune.msg.copied': 'Copied {n} settings. Paste them to the one who bakes them in.',
  'camp.ui.tune.msg.nothing': 'Nothing is changed yet.',
  'camp.ui.tune.msg.reset': 'Everything is back to the defaults.',
  'camp.ui.tune.msg.noclip': 'This browser would not copy. The settings are kept here all the same.',
  'camp.ui.tune.group.ship': 'The cruiser',
  'camp.ui.tune.group.guns': 'The guns',
  'camp.ui.tune.group.wing': 'The wing and the convoy',
  'camp.ui.tune.group.foes': 'The enemy',
  'camp.ui.tune.group.time': 'Time',
  'camp.ui.tune.group.ore': 'Ore',
  'camp.ui.tune.group.systems': 'Switches: a whole system, in or out',
  'camp.ui.tune.when.now': 'at once',
  'camp.ui.tune.when.next': 'next mission',
  'camp.ui.tune.row.cruiserspeed': 'Cruiser top speed',
  'camp.ui.tune.row.shieldmend': 'Shield mend rate',
  'camp.ui.tune.row.emergencyore': 'Emergency shields: ore',
  'camp.ui.tune.row.emergencycool': 'Emergency shields: wait',
  'camp.ui.tune.row.turretdamage': 'Turret damage a shot',
  'camp.ui.tune.row.orerock': 'Ore in a rock',
  'camp.ui.tune.row.cruiserturn': 'Cruiser turn rate',
  'camp.ui.tune.row.shieldsize': 'Shield size',
  'camp.ui.tune.row.turretdelay': 'Time between a turret\'s shots',
  'camp.ui.tune.row.turretreach': 'Turret reach',
  'camp.ui.tune.row.sensorrange': 'Sensor range (hostiles seen)',
  'camp.ui.tune.row.missilecount': 'Missiles at the start',
  'camp.ui.tune.row.missilereload': 'Missile build time',
  'camp.ui.tune.row.missilecost': 'Ore for a missile',
  'camp.ui.tune.row.lasertank': 'Laser tank size',
  'camp.ui.tune.row.laserrefill': 'Laser refill',
  'camp.ui.tune.row.fighterhull': 'Fighter hull',
  'camp.ui.tune.row.repairbelow': 'Pilot goes home at hull',
  'camp.ui.tune.row.repairtime': 'Pilot\'s mend, seconds',
  'camp.ui.tune.row.fighterdamage': 'Fighter damage a shot',
  'camp.ui.tune.row.convoyspeed': 'Transport and hauler speed',
  'camp.ui.tune.row.enemyhull': 'Enemy hull (times the mission\'s)',
  'camp.ui.tune.row.enemydamage': 'Enemy damage (times the mission\'s)',
  'camp.ui.tune.row.pace': 'Battle pace (1 is Normal)',
  'camp.ui.tune.row.fightpace': 'Fight pace (1 is as fast as travel)',
  'camp.ui.tune.row.marktime': 'Pilot and target squares stay',
  'camp.ui.tune.row.targetrestart': 'Enemy pick starts over',
  'camp.ui.tune.row.wavetime': 'Wave timing (times the mission\'s)',
  'camp.ui.tune.row.startzoom': 'Starting zoom (presses of minus)',
  'camp.ui.tune.row.miningrate': 'Mining rate of a mining ship',
  'camp.ui.tune.row.distress': 'The distress call of mission 1.1',
  'camp.ui.tune.row.tboats': 'Enemy torpedo boats',
  'camp.ui.tune.row.rival': 'The rival ship',
  'camp.ui.tune.row.repair': 'Hurt fighters fly home to be mended',
  'camp.ui.tune.row.convoyorders': 'Convoy orders',
  'camp.ui.tune.row.autofire': 'Turrets fire by themselves',
  'camp.ui.tune.row.laser': 'Turret charge (the lasers run dry)',
  'camp.ui.tune.row.hints': 'The first-minute hints',
  'camp.ui.ore': 'ORE',
  'camp.ui.shield': 'SHIELD',
  'camp.l1.before.3': 'Then mine at the rim and bring the haulers home.',
  'camp.l1.after.3': 'Earth recalls the cruiser for a refit.',
  'camp.say.rimambush': 'Pirates and torpedo boats behind the rocks! Cover the transport.',
  'camp.say.ambush': 'Alarm. Unknown ships, coming for the cruiser.',
  'camp.say.ambush2': 'Mining lasers are weapons now. Hold Space. Drones: fighters attack ({keyorder}).',
  'camp.say.bwave2': 'Second wave, from the north-west.',
  'camp.say.bwave3': 'The mothership is here. Kill it.',
  'camp.say.escortcarrier': 'The squads are with the cruiser.',
  'camp.ui.refit': 'EARTH REFIT',
  'camp.ui.refitpick': 'Choose a technology:  {keys}',
  'camp.ui.refitbuy': '4  +1 fighter ({fc})     credits first, then ore',
  'camp.ui.refitore': 'CREDITS  {credits}   ORE  {ore}     EXTRA SHIPS  {xf} fighters',
  'camp.ui.refitgot': 'Chosen: {name}.  Enter  continue',
  'camp.lose.convoy': 'The haulers are lost.',
  'camp.lose.base': 'The works are lost.',
  'camp.lose.tip.convoy': 'Guard the haulers: pick one ({keyfriendlies}), then {keyorder}.',
  'camp.lose.tip.base': 'Guard the works: pick them ({keyfriendlies}), then {keyorder}. Hold Space.',
  'camp.say.scanned': 'Point scanned: {n} of {of}.',
  'camp.say.hauler': '{name} is under way.',
  'camp.say.raid': 'Raiders on the haulers. Escort them.',
  'camp.say.raid2': 'More raiders. Cover the last hauler.',
  'camp.o.scan': 'Scan the points: {got} of {need}.',
  'camp.o.deliver': 'Haulers delivered: {got} of {need}.',
  'camp.o.kill.mother': 'Destroy the mothership.',
  'camp.o.kill.towers': 'Destroy the towers.',
  'camp.o.kill.guards': 'Destroy the guards.',
  'camp.o.kill.wave': 'Destroy the attackers.',
  'camp.o.hold': 'Hold the works: {got} of {need} seconds.',
  'camp.o.relic': 'Hold the ring at the relic.',
  'camp.o.caches': 'Gather resources: {got} of {need}.',
  'camp.o.clear': 'Survive the attack.',
  'camp.o.done': 'Objectives met.',
  'camp.b.time': 'Finish in {secs} seconds',
  'camp.b.lost': 'Ships lost: {n} or fewer',
  'camp.say.l2wave3': 'Aliens coming for the relic, pilot.',
  'camp.say.l2wave2b': 'A third group, from the other side.',
  'camp.say.shiparrived': '{name} has arrived.',
  'camp.say.shiplost': '{name} is lost.',
  'camp.o.deliverleft': 'Haulers home: {n}. Still flying: {left}.',
  'camp.o.deliver.transport': 'Transport arrived: {got} of {need}.',
  'camp.lose.convoy.transport': 'The transport is lost.',
  'camp.lose.tip.convoy.transport': 'Guard the transport: pick it ({keyfriendlies}), then {keyorder}.',
  'camp.bf.1.1.s1': 'The transport must reach {to}: {km} km, about {mins} minutes. A patrol sees her off.',
  'camp.bf.1.1.s2': 'The patrol turns back at the edge of safe space. You are on your own.',
  'camp.bf.1.1.s3': 'A distress call may come. Pick the attackers ({keynear}), then {keyorder}.',
  'camp.bf.1.1.s4': 'Pirates are likely to ambush the road. Pick the convoy ({keyfriendlies}), then {keyorder}.',
  'camp.bf.1.1.s5': 'A pirate leader waits near {to}. Kill it, or get the transport past.',
  'camp.bf.1.1.s6': 'Get her into {to} and the mission is won. The pirate leader is a bonus.',
  'camp.bw.wing': 'WING',
  'camp.bw.patrol': 'PATROL',
  'camp.bw.m.help': 'CALL?',
  'camp.bw.m.threat': 'PIRATES?',
  'camp.bw.m.leader': 'LEADER?',
  'camp.bw.m.goal': 'ARRIVE',
  'camp.b.nolost': 'Lose no ships',
  'camp.b.noneutrals': 'Lose no miners',
  'camp.b.notorpedoes': 'Take no torpedo hits',
  'camp.b.hull': 'Keep the hull above {pct} percent',
  'camp.b.ore': 'Mine {n} ore',
  'camp.b.delivered': 'Deliver every hauler',
  'camp.ui.mission': 'MISSION {n}: {title}',
  'camp.ui.briefgo': 'Enter  fly',
  'camp.ui.bonushead': 'BONUS',
  'camp.ui.bonusmet': '+{pts}  {text}',
  'camp.ui.bonusmiss': '--   {text}',
  'camp.ui.debrief': 'MISSION COMPLETE: {title}',
  'camp.ui.lostmission': 'MISSION LOST: {title}',
  // The Campaign's ranks (card space-game-campaign-ranks, content/text/campaign-ranks.md)
  'camp.rank.cadet': 'Cadet',
  'camp.rank.ensign': 'Ensign',
  'camp.rank.lieutenant': 'Lieutenant',
  'camp.rank.commander': 'Commander',
  'camp.rank.captain': 'Captain',
  'camp.rank.commodore': 'Commodore',
  'camp.rank.ensign.promo': 'Command has noticed the way you fly.',
  'camp.rank.lieutenant.promo': 'The fleet trusts you with more ships.',
  'camp.rank.commander.promo': 'Pilots ask to serve in your wing.',
  'camp.rank.captain.promo': 'A full wing now. Use it.',
  'camp.rank.commodore.promo': 'The whole fleet answers to you.',
  'camp.ui.promoted': 'PROMOTED: {name}. The wing is {fighters} fighters strong.',
  'camp.ui.rank': 'Rank: {name}   {points} points   next: {next} at {at}',
  'camp.ui.ranktop': 'Rank: {name}   {points} points   the highest rank',
  // The Campaign's anomalies: the cloaked enemy caches (card space-game-campaign-anomalies, content/text/campaign-anomalies.md)
  'camp.nav.anomaly': 'Anomaly',
  'camp.map.anomaly': 'Anomalies ({n})',
  'camp.nav.anomrev': 'Alien cache',
  'camp.nav.no.noanomaly': 'No anomaly is noticed yet.',
  'camp.say.anom.sense': 'Odd readings ahead. Space is bending out there.',
  'camp.say.anom.reveal': 'The cloak is down! It is {what}, guards coming out.',
  'camp.say.anom.done': 'The cache is ours: {list}.',
  'camp.anom.hides.weapons': 'a store of their weapons',
  'camp.anom.hides.tech': 'a lab of their tech',
  'camp.anom.hides.cache': 'a cache',
  'camp.anom.got.missiles': '{n} more missiles in the magazine',
  'camp.anom.got.turret': 'turrets {pct} percent heavier',
  'camp.anom.got.tech': 'the {name} tech for the refit',
  'camp.anom.got.ore': '{n} ore',
  'camp.b.anomaly': 'Find the cloaked cache',
  'camp.tech.overdrive.name': 'Overdrive',
  'camp.tech.overdrive.text': 'From the aliens\' lab: the carrier flies a quarter faster.',
  'camp.tech.lens.name': 'Lens',
  'camp.tech.lens.text': 'From the aliens\' lab: the sensors notice an anomaly twice as far.',
  // The Campaign's wing orders with groups and explicit targets (card space-game-campaign-wing-targets, content/text/campaign-wingorders.md)
  'camp.say.pirate.break': 'They are breaking off.',
  'camp.say.pirate.run': 'A pirate is running.',
  'camp.say.neutral.lost': 'We lost {name}.',
  'camp.nav.pirate': 'Pirate',
  'camp.nav.k.skiff': 'Skiff', 'camp.nav.k.cutter': 'Cutter', 'camp.nav.k.brute': 'Brute', 'camp.nav.k.patrol': 'Patrol', 'camp.nav.k.miner': 'Miner',
  'camp.map.pirate': 'Pirates ({n})', 'camp.map.patrol': 'Patrols ({n})', 'camp.map.miner': 'Miners ({n})',
  // The rival ship (card space-game-rival-duel, content/text/campaign-rival.md)
  'camp.say.rival.leader': 'Pirate leader ahead. Heavy ship.', 'camp.say.rival.dead': '{name} is down.', 'camp.nav.k.pirateleader': 'Pirate leader',
  'camp.say.rival.charge': 'Broadside charging. Get off its line.', 'camp.say.rival.down': 'Its shields are down. Hit it now.', 'camp.say.rival.ram': 'It is ramming. Turn away.',
  'camp.ui.rival.charge': 'BROADSIDE CHARGING', 'camp.ui.rival.down': 'SHIELDS DOWN', 'camp.ui.rival.ram': 'RAMMING', 'camp.ui.rival.run': 'RUNNING', 'camp.map.rival': 'Pirate leader',
  'camp.say.rival.run': 'It is running. Chase it.', 'camp.say.rival.run.final': 'It is running for good. Chase it.', 'camp.say.rival.gone': '{name} got away.',
  // The torpedo boats (card space-game-torpedo-boats, content/text/campaign-torpedo.md)
  'camp.say.torp.arm.name': 'Torpedo boat arming on {name}.',
  'camp.say.torp.arm.us': 'Torpedo boat arming on us.',
  'camp.say.torp.fire.name': 'Torpedo away at {name}. Shoot it down.',
  'camp.say.torp.fire.us': 'Torpedo inbound on us. Shoot it down.',
  'camp.say.torp.down': 'Torpedo down.',
  'camp.say.torp.hit.name': '{name} took a torpedo.',
  'camp.say.torp.hit.us': 'Torpedo hit the cruiser.',
  'camp.nav.k.tboat': 'Torpedo boat', 'camp.nav.k.lancer': 'Lancer',
  'camp.map.tboat': 'Torpedo boats ({n})', 'camp.map.torpedo': 'Torpedoes ({n})',
  // The convoy orders (card space-game-convoy-orders, content/text/campaign-convoy.md)
  'camp.say.ctuck': '{who}, tuck in under our shield.',
  'camp.say.chold': '{who}, hold here.',
  'camp.say.crun': '{who}, run for it. No cover.',
  'camp.say.ccarry': '{who}, carry on.',
  'camp.say.cwho': 'Convoy',
  'camp.no.cnone': 'No escorted ships to command.',
  'camp.no.cwhat': 'Tuck in, hold here, run for it, or carry on?',
  'camp.no.wnogroup': 'Which group? Red, green, yellow or all.',
  'camp.no.wnotarget': 'I cannot find that target.',
  'camp.no.wbadpair': '{group} cannot {verb} {what}.',
  'camp.no.wneed': 'Name a target to {verb}.',
  'camp.no.wnothing': 'Nothing is lying about to fetch.',
  'camp.say.wing.attack': '{group}, attack {name}.',
  'camp.say.wing.attacknear': '{group}, attack the nearest.',
  'camp.say.wing.escort': '{group}, escort {name}.',
  'camp.say.wing.guard': '{group}, guard {name}.',
  'camp.say.wing.guardcarrier': '{group}, guard the carrier.',
  'camp.say.wing.hold': '{group}, hold at {name}.',
  'camp.say.wing.fetch': '{group}, fetch {name}.',
  'camp.say.wing.mine': '{group}, mine {name}.',
  'camp.say.wing.cancel': '{group}, stand by.',
  'camp.say.wing.recall': '{group}, return to the carrier.',
  'camp.ui.score': 'SCORE {score}',
  'camp.ui.debriefstats': 'Time {time}   Hull {hull}   Ships lost {lost}',
  'camp.ui.debriefnext': 'Enter  ready room',
  'camp.ui.retrymission': 'Enter  fly the mission again     T  title',
  'camp.ui.pauseretry': 'R  restart the mission',
  'camp.m.1.1.title': 'Rim escort',
  'camp.m.1.1.b1': 'Escort the transport from the Lunar Base to Ceres.',
  'camp.m.1.1.b2': 'Pirates lie in wait. Fly a squad ahead to see them first.',
  'camp.m.1.2.title': 'Mine and defend',
  'camp.m.1.2.b1': 'Mine ore at Ceres and sell it at the Works.',
  'camp.m.1.2.b2': 'Pirates go for the miners.',
  'camp.m.1.3.title': 'Haulers home',
  'camp.m.1.3.b1': 'Escort the ore haulers home toward Earth.',
  'camp.m.1.3.b2': 'One must arrive. Expect company.',
  'camp.m.2.1.title': 'Resources',
  'camp.m.2.1.b1': 'Gather two resource caches.',
  'camp.m.2.1.b2': 'The aliens followed us.',
  'camp.m.2.2.title': 'The guards',
  'camp.m.2.2.b1': 'Destroy the relic guards.',
  'camp.m.2.2.b2': 'They wait for you.',
  'camp.m.2.3.title': 'The relic',
  'camp.m.2.3.b1': 'Hold the relic ring until it answers.',
  'camp.m.2.3.b2': 'No alien near it.',
  'camp.m.3.1.title': 'Approach',
  'camp.m.3.1.b1': 'Scan three points on the way in.',
  'camp.m.3.1.b2': 'Defenders will come.',
  'camp.m.3.2.title': 'Outer ring',
  'camp.m.3.2.b1': 'Destroy the four outer towers.',
  'camp.m.3.2.b2': 'They are tough.',
  'camp.m.3.3.title': 'Inner ring',
  'camp.m.3.3.b1': 'Destroy the eight inner towers.',
  'camp.m.3.3.b2': 'Last battle.',
  'camp.say.arrived': 'Arrived at {name}.',
  'camp.o.travel': 'Fly to {name}: {km} km.',
  'camp.ui.briefplace': 'PLACE  {name}     {km} km     about {secs} s by Fast',
  'camp.ui.briefhere': 'PLACE  {name}     you start there',
  'camp.ui.outpost': 'Docked at {outpost}, {name}.',
  'camp.ui.title': 'CAMPAIGN',
  'camp.ui.level': 'LEVEL {n}: {name}',
  'camp.ui.won': 'LEVEL {n} WON',
  'camp.ui.lost': 'LEVEL {n} LOST',
  'camp.ui.keys': '{keyfly} fly  {keyfire} turrets  {keymissile} missile  {keymap} Map  {keyhelp} Keys',
  'camp.ui.begin': 'Enter  begin',
  'camp.ui.pick': 'Choose one salvaged technology:  1  2  3',
  'camp.ui.next': 'Enter  continue',
  'camp.ui.retry': 'Enter  try again     T  title',
  'camp.ui.pausetitle': 'PAUSED',
  'camp.ui.paused': 'Esc  resume     T  title     H  all keys',
  'camp.ui.pausegoal': 'Goal: {goal}',
  'camp.ui.pausemap': 'Tab  map of the whole level (the battle goes on behind it)',
  'camp.map.title': 'MAP  -  LEVEL {n}: {name}',
  'camp.map.footer': 'Tab or Esc closes it. The battle goes on behind it.',
  'camp.map.across': '{km} km across',
  'camp.map.carrier': 'Your carrier',
  'camp.map.wing': 'Your ships out ({n})',
  'camp.map.red': 'Wedge',
  'camp.map.green': 'Kara',
  'camp.map.yellow': 'Apollo',
  'camp.say.sight': 'Contact, {dir}: {what}, {km} km.',
  'camp.sight.arrow': '{what}  {km} km',
  'camp.sight.friend': '{name}  {pct}%  {km} km',
  'camp.sight.hostile.one': '{n} hostile',
  'camp.sight.hostile.many': '{n} hostiles',
  'camp.corner.cruiser': 'CRUISER',
  'camp.corner.fleet': 'FLEET',
  'camp.corner.hostiles': 'HOSTILES',
  'camp.corner.friendlies': 'FRIENDLIES',
  'camp.corner.bay': 'in the bay',
  'camp.corner.attack': 'Attack {name}',
  'camp.corner.guard': 'Guard {name}',
  'camp.corner.formup': 'Form up',
  'camp.corner.blocked': '{what}, {why}',
  'camp.corner.why.nofighters': 'none out',
  'camp.corner.why.launching': 'launching',
  'camp.corner.why.nofoe': 'none in sight',
  'camp.corner.why.over': 'battle over',
  'camp.corner.why.else': 'not now',
  'camp.tdisp.hull': 'HULL',
  'camp.tdisp.shield': 'SHIELD',
  'camp.tdisp.noshield': 'no shield',
  'camp.tdisp.km': '{km} km',
  'camp.tdisp.type.post': 'Friendly post',
  'camp.tdisp.key.attack': 'Attack',
  'camp.tdisp.key.guard': 'Guard',
  'camp.tdisp.type': '{side} {what}',
  'camp.tdisp.side.alien': 'Hostile',
  'camp.tdisp.side.pirate': 'Pirate',
  'camp.tdisp.side.neutral': 'Neutral',
  'camp.tdisp.side.earth': 'Friendly',
  'camp.tdisp.who.cruiser': 'the cruiser',
  'camp.tdisp.who.earth': 'Earth',
  'camp.tdisp.who.nearest': 'the nearest hostile',
  'camp.tdisp.do.attack': 'attacking {who}',
  'camp.tdisp.do.run': 'breaking off',
  'camp.tdisp.do.hold': 'holding its post',
  'camp.tdisp.do.lost': 'lost the cruiser',
  'camp.tdisp.do.arm': 'arming a torpedo',
  'camp.tdisp.do.tower': 'guarding the area',
  'camp.tdisp.do.mother.close': 'closing on Earth',
  'camp.tdisp.do.mother.fire': 'firing on {who}',
  'camp.tdisp.do.rival.stalk': 'stalking the cruiser',
  'camp.tdisp.do.rival.charge': 'charging a broadside',
  'camp.tdisp.do.rival.down': 'shield down',
  'camp.tdisp.do.rival.ram': 'ramming the cruiser',
  'camp.tdisp.do.rival.run': 'running for it',
  'camp.tdisp.do.guard': 'guarding the cruiser',
  'camp.tdisp.do.escort': 'escorting {who}',
  'camp.tdisp.do.hold.f': 'holding position',
  'camp.tdisp.do.mine': 'mining ore',
  'camp.tdisp.do.recall': 'returning to the bay',
  'camp.tdisp.do.fetch': 'fetching ore',
  'camp.tdisp.do.repair': 'going home to mend',
  'camp.tdisp.do.tuck': 'tucked in under the shield',
  'camp.tdisp.do.hold.c': 'holding here',
  'camp.tdisp.do.run.c': 'running for it',
  'camp.tdisp.do.road': 'on its way to {where}',
  'camp.tdisp.do.road.none': 'on its way',
  'camp.tdisp.do.work': 'mining',
  'camp.tdisp.do.out': 'heading for the rocks',
  'camp.tdisp.do.home': 'heading home',
  'camp.tdisp.do.dock': 'docked, resting',
  'camp.tdisp.do.flee': 'running from trouble',
  'camp.tdisp.do.stay': 'working where it is',
  'camp.tdisp.do.patrol': 'on patrol',
  'camp.tdisp.do.idle': 'no orders',
  'camp.tdisp.corner.nohostiles': 'NO HOSTILES',
  'camp.tdisp.corner.nofriendlies': 'NO FRIENDLIES',
  'camp.sight.kind.one': '{n} {kind}',
  'camp.sight.kind.many': '{n} {kind}s',
  'camp.sight.dir.north': 'north',
  'camp.sight.dir.north-east': 'north-east',
  'camp.sight.dir.east': 'east',
  'camp.sight.dir.south-east': 'south-east',
  'camp.sight.dir.south': 'south',
  'camp.sight.dir.south-west': 'south-west',
  'camp.sight.dir.west': 'west',
  'camp.sight.dir.north-west': 'north-west',
  'camp.map.convoy': 'Convoys ({n}), course drawn',
  'camp.map.alien': 'Aliens ({n})',
  'camp.map.mother': 'The alien mothership',
  'camp.map.tower': 'Defence towers ({n})',
  'camp.map.cache': 'Caches left ({n})',
  'camp.map.relic': 'The relic',
  'camp.hub.title': 'READY ROOM  -  {name}',
  'camp.hub.row.board': 'MISSIONS',
  'camp.hub.row.refit': 'REFIT',
  'camp.hub.row.rank': 'RANK',
  'camp.hub.row.launch': 'LAUNCH',
  'camp.hub.note.board': '{done} of {all} flown',
  'camp.hub.note.refit': '{credits} credits, {ore} ore',
  'camp.hub.note.points': '{points} points',
  'camp.hub.note.launch': 'mission {n}',
  'camp.hub.note.pick': 'the tech pick',
  'camp.hub.foot.board': 'Enter  open the missions',
  'camp.hub.foot.refit': 'Enter  open the refit',
  'camp.hub.foot.rank': 'Enter  open your rank',
  'camp.hub.foot.launch': 'Enter  LAUNCH',
  'camp.hub.keys': '1 to 4 pick   Up Down move   Enter open   Left back   L launch   Esc title',
  'camp.hub.kind.recon': 'RECON',
  'camp.hub.kind.escort': 'ESCORT',
  'camp.hub.kind.attack': 'ATTACK',
  'camp.hub.kind.defend': 'DEFEND',
  'camp.hub.kind.waves': 'DEFENCE',
  'camp.hub.level': 'LEVEL {n}  -  {name}',
  'camp.hub.next': 'NEXT',
  'camp.hub.score': '{score} pts',
  'camp.hub.bonuses': '{got} of {of} bonus',
  'camp.hub.tries': 'tries {n}',
  'camp.hub.brief.head': 'MISSION {n} OF {of}  -  {title}',
  'camp.hub.brief.kind': '{kind}   par {par} s',
  'camp.hub.brief.obj': 'OBJECTIVES',
  'camp.hub.brief.best': 'Best so far: {score} points, flown {n}',
  'camp.hub.brief.new': 'Not flown yet.',
  'camp.hub.refit.ore': 'Credits: {credits}     Ore in the store: {ore}',
  'camp.hub.refit.wing': 'Wing strength for the next mission: {f}',
  'camp.hub.boughtf': 'A fighter joins the wing. {credits} credits and {ore} ore left.',
  'camp.hub.soldf': 'A fighter given back. {credits} credits and {ore} ore.',
  'camp.hub.noore': 'Not enough: {need} needed, {have} in credits and ore.',
  'camp.hub.most': 'No more: {most} extra at most.',
  'camp.hub.nothing': 'Nothing to give back.',
  'camp.hub.rank.name': 'Rank: {name}  ({n} of {of})',
  'camp.hub.rank.next': 'Next rank {to} at {next} points',
  'camp.hub.rank.top': 'The highest rank.',
  'camp.hub.rank.none': 'No rank yet. Fly a mission.',
  'camp.hub.rank.points': 'Score so far: {points} points',
  'camp.hub.rank.flown': 'Missions flown: {n} of {all}',
  'camp.hub.rank.wing': 'Wing: {f} fighters',
  'camp.hub.launch.head': 'NEXT: MISSION {n} OF {of}  -  {title}',
  'camp.hub.launch.go': 'Enter or L launches the cruiser.',
  'camp.hub.launch.level': 'Level {n} begins with this mission: {name}.',
  'camp.hub.launch.pad': 'The cruiser stands ready on the pad.',
  'camp.hub.pilot': 'YOU',
  'camp.bf.goals': 'GOALS',
  'camp.bf.walk': 'WALKTHROUGH',
  'camp.bf.enemies': 'ENEMIES',
  'camp.bf.readiness': 'READINESS',
  'camp.bf.expect': 'Expect {list}.',
  'camp.bf.expectnone': 'No enemies are listed for this mission.',
  'camp.bf.expectunknown': 'Expect {list}, and unknown ships.',
  'camp.bf.unknownonly': 'Unknown ships may come.',
  'camp.bf.nowalk': 'No walkthrough for this mission. Read the goals and the map.',
  'camp.bf.enemy.raider.one': '{n} raider',
  'camp.bf.enemy.raider.many': '{n} raiders',
  'camp.bf.enemy.drone.one': '{n} drone',
  'camp.bf.enemy.drone.many': '{n} drones',
  'camp.bf.enemy.gunship.one': '{n} gunship',
  'camp.bf.enemy.gunship.many': '{n} gunships',
  'camp.bf.enemy.guard.one': '{n} guard',
  'camp.bf.enemy.guard.many': '{n} guards',
  'camp.bf.enemy.tower.one': '{n} defence tower',
  'camp.bf.enemy.tower.many': '{n} defence towers',
  'camp.bf.enemy.mother.one': 'the mothership',
  'camp.bf.enemy.mother.many': '{n} motherships',
  'camp.bf.ready.bay': 'Wing: Wedge, Kara, Apollo, {f} fighters strong',
  'camp.bf.ready.rank': 'Rank: {name}',
  'camp.bf.ready.stock': 'Missiles {missiles}    Ore {ore}',
  'camp.bf.ready.shield': 'Shield: full, {cap} points',
  'camp.bf.route': 'Route {km} km: {regular} s regular, {fast} s on Fast.',
  'camp.bf.routenear': 'You start at the mission place.',
  'camp.bf.you': 'YOU',
  'camp.bf.mission': 'MISSION',
  'camp.bf.zoomarea': 'M: the mission area',
  'camp.bf.zoomwhole': 'M: the whole system',
  'camp.bf.zoomroute': 'M: the route',
  'camp.bf.head': 'MISSION {n}  -  {title}',
  'camp.bf.ship': 'SHIP:',
  'camp.bf.head.replay': 'REPLAY  -  MISSION {n}  -  {title}',
  'camp.bf.scr.where': 'WHERE AND WHY',
  'camp.bf.scr.what': 'WHAT TO DO',
  'camp.bf.scr.how': 'HOW',
  'camp.bf.where': 'WHERE',
  'camp.bf.why': 'WHY',
  'camp.bf.keyshead': 'KEYS THIS MISSION NEEDS',
  'camp.bf.key.fly': 'Thrust, turn and brake (the arrow keys)',
  'camp.bf.key.fire': 'Hold: the turrets fire at ships in reach',
  'camp.bf.key.map': 'Open the map; click a place, Enter flies',
  'camp.bf.key.zoom': 'Zoom the view or the map; {keyzoomreset} resets',
  'camp.bf.key.attack': 'The pilots attack the picked enemy',
  'camp.bf.key.escort': 'The pilots guard the picked friendly',
  'camp.bf.key.missile': 'Fire a homing missile at the target',
  'camp.bf.key.mine': 'Cruiser list: {rowfmine}',
  'camp.bf.key.dock': 'Dock to build, mend and sell',
  'camp.bf.key.shield': 'Cruiser list: {rowemergency}',
  'camp.bf.keys.next': 'Enter or Right: next    Left: back    L: launch now    Esc: the board',
  'camp.bf.keys.launch': 'Enter or L: launch    Left: back    Esc: the board',
  'camp.bf.keys.zoom': '{keyzoomout} {keyzoomin} zoom',
  'camp.bf.at.relic': 'RELIC',
  'camp.bf.at.tower': 'DEFENCE TOWERS',
  'camp.bf.at.cache': 'RESOURCE POD',
  'camp.bf.at.guards': 'GUARDS',
  'camp.bf.at.mother': 'MOTHERSHIP',
  'camp.bf.1.1.w1': '1 transport flies from the Lunar Base to Ceres.',
  'camp.bf.1.1.w2': 'Pirates wait in the rocks ahead. Shoot the torpedo boats first.',
  'camp.bf.1.1.w3': 'A pirate leader waits near Ceres. Kill it, or get her past.',
  'camp.bf.1.1.w4': 'A miner is jumped on the way. Send a squad.',
  'camp.bf.1.1.n1': 'Welcome aboard, Commander. The transport is ours to bring to Ceres. A patrol sees her off, then she is on her own.',
  'camp.bf.1.1.n2': 'Pirates lie in wait ahead, with torpedo boats. Cover the transport: say or type "tuck in".',
  'camp.bf.1.1.n3': 'The arrows fly the cruiser. {keywho} picks who, {keyorder} gives the order.',
  'camp.bf.1.2.w1': 'Mine the rock fields round Ceres: {viafmine}, then {rowfmine}.',
  'camp.bf.1.2.w2': 'The Works pays three credits an ore. Pirates hunt the miners.',
  'camp.bf.1.2.w3': 'Beat the 5 raids, then dock ({viadock}, {rowdock}).',
  'camp.bf.1.2.w4': 'The Works keeps its doors shut while a pirate is near.',
  'camp.bf.1.3.w1': '3 haulers leave Ceres for Earth, 12 seconds apart.',
  'camp.bf.1.3.w2': '1 must get home. Each hauler lost costs points.',
  'camp.bf.1.3.w3': 'Pirates keep coming. Cover the haulers: pick one ({keyfriendlies}), then {keyorder}.',
  'camp.bf.2.1.w1': 'Find 2 of the 3 resource pods in the system.',
  'camp.bf.2.1.w2': 'Any ship of yours that flies close picks one up.',
  'camp.bf.2.1.w3': 'Aliens come from the west after 20 seconds.',
  'camp.bf.2.1.w4': 'Kill them too: the pods alone do not finish it.',
  'camp.bf.2.2.w1': '7 guards hold the system. Destroy them all.',
  'camp.bf.2.2.w2': 'More aliens join after 18 seconds, from the north-east.',
  'camp.bf.2.2.w3': 'Missiles ({keymissile}) help against the heavy ones.',
  'camp.bf.2.3.w1': 'Fly the carrier into the relic\'s ring at Proxima.',
  'camp.bf.2.3.w2': 'Hold there 14 seconds with no alien near the relic.',
  'camp.bf.2.3.w3': 'Leave the ring, or let aliens close, and it loses ground.',
  'camp.bf.2.3.w4': 'Aliens come from the north-east after 3 seconds.',
  'camp.bf.3.1.w1': 'Fly to each of the 3 marked rings on the map.',
  'camp.bf.3.1.w2': 'Any ship of yours inside a ring scans it: 7 seconds.',
  'camp.bf.3.1.w3': 'Aliens answer your first scan. Keep the wing close.',
  'camp.bf.3.1.w4': 'Finish by destroying every alien that comes.',
  'camp.bf.3.2.w1': 'Destroy all 4 defence towers around the target.',
  'camp.bf.3.2.w2': 'Approach with the wing ahead of the carrier.',
  'camp.bf.3.2.w3': 'More aliens arrive after 25 seconds, from the north-east.',
  'camp.bf.3.3.w1': 'Destroy all 8 defence towers of the inner ring.',
  'camp.bf.3.3.w2': 'Two waves come: at 20 seconds and at 75.',
  'camp.bf.3.3.w3': 'Approach with the wing ahead of the carrier.',
  'camp.hub.replay.set': 'Replay: {title}. Briefing and Launch are for it. X: back.',
  'camp.hub.replay.none': 'Nothing to replay yet: finish a mission first.',
  'camp.hub.replay.cleared': 'Back to the next mission.',
  'camp.hub.replay.mark': '(replay)',
  'camp.hub.replay.keys': 'Up Down choose   Enter or R open the briefing   X back to the next mission',
  'camp.hub.note.replay': 'replay {n}',
  'camp.hub.replay.head': 'REPLAY  -  MISSION {n} OF {of}  -  {title}',
  'camp.hub.replay.rule1': 'Standard start, with your wing, rank and techs.',
  'camp.hub.replay.rule2': 'The story and your progress stay; your best is kept.',
  'camp.hub.board.found': '{got}/{of}',
  'camp.hub.skipped.set': 'Skipped mission: {title}. Briefing and Launch are for it. X: back.',
  'camp.hub.skipped.tag': 'skipped',
  'camp.hub.oldsave': 'This save is from an older version. Missions that changed show as skipped [-]: pick one in Missions and fly it, and a win counts as its score.',
  'camp.hub.restart.row': 'Start the campaign over',
  'camp.hub.restart.desc': 'Erase your scores, ore, techs and ships and begin again at mission 1. It asks first.',
  'camp.hub.restart.ask': 'Start over from mission 1? Your scores, ore and techs go.  Enter again: yes.  Any other key: no.',
  'camp.hub.restart.done': 'Starting over: mission 1 is next.',
  'camp.hub.legend': '[x] flown   [-] skipped   [>] next   [ ] not yet',
  'camp.hub.replay.how': 'To fly a mission again, or one that was skipped: choose it, Enter opens its briefing, then Launch flies it.',
  'camp.ui.replay': 'REPLAY  -  {title}',
  'camp.ui.replayscore': 'Replay: this run {now}, your best was {old}.',
  'camp.ui.replaybest': 'A new best: {best} points.',
  'camp.ui.replaykept': 'Your best stands at {best} points.',
  'camp.no.docked': 'Already docked, pilot.',
  'camp.no.noposts': 'There is no outpost in this system, pilot.',
  'camp.no.whichpost': 'I know no outpost called {name}, pilot.',
  'camp.no.farpost': 'No outpost in range. {name} is {km} km away.',
  'camp.no.hotdock': 'Enemies too close to dock at {name}, pilot.',
  'camp.no.hullfull': 'The hull is sound, pilot.',
  'camp.say.dock': 'Docking at {name}.',
  'camp.say.repair': 'Hull mended: {pts} points for {ore} ore.',
  'camp.say.undock': 'Undocked. Good hunting, pilot.',
  'camp.say.retreat': 'Hull low, no ships. Retreat to {name}: {s} seconds on Fast.',
  'camp.say.retreatnear': 'Hull low, no ships. {name} is in range: {yardkey}, then dock.',
  'camp.hud.retreat': 'Retreat to {name}: {s} s on Fast.',
  'camp.hud.retreathot': '{name} is covered by enemies: no safe dock.',
  'camp.say.retreathot': 'Hull low, no ships. {name} is covered by enemies: no safe dock.',
  'camp.hud.dockhint': '{yardkey}  dock at {name}',
  'camp.hub.row.repair': 'REPAIR',
  'camp.hub.row.undock': 'UNDOCK',
  'camp.hub.dockfoot.repair': 'Enter  the mission board',
  'camp.hub.dockfoot.board': 'Enter  to the undock row',
  'camp.hub.dockfoot.undock': 'Enter  UNDOCK',
  'camp.hub.note.repair': 'hull {pct} percent',
  'camp.hub.note.undock': '{name}',
  'camp.hub.repair.head': 'REPAIR',
  'camp.hub.repair.hull': 'Hull: {hp} of {max}',
  'camp.hub.repair.key': 'R  mend the hull: {ore} ore (half price here)',
  'camp.hub.repair.sound': 'The hull is sound.',
  'camp.hub.undock.head': 'UNDOCK',
  'camp.hub.undock.line': 'Enter or L undocks. The battle goes on where you left it.',
  'camp.hub.undock.at': 'Docked at {name}.',
  'camp.hub.cruiser': 'THE CRUISER',
  'camp.room.desc.board': 'Every mission of the campaign: the ones you have flown, with your scores, and the next one. Open it to read a briefing, or to pick one to fly again.',
  'camp.room.desc.refit': 'Spend credits, then ore, on more ships for the next mission. It shows what each choice changes before you buy.',
  'camp.room.desc.rank': 'Your pilot rank and how far the next one is. A higher rank puts more ships in your wing.',
  'camp.room.desc.launch': 'Take the cruiser out on mission {n} of {of}: {title}. The briefing was read here, so the flight starts at once.',
  'camp.room.desc.replay': 'Fly {title} again for a better score. Nothing in the story moves.',
  'camp.room.foot.close': 'Left or Esc  close',
  'camp.room.hint.board': 'Up Down or click  choose   Enter or click again  open its briefing, then Launch flies it   X  back to next   Left  close',
  'camp.room.hint.refit': 'Up Down  choose     Enter  buy it     Backspace  give the last one back     F E U  the same, at once     Left  close',
  'camp.room.hint.rank': 'Nothing to buy here.     Left  close',
  'camp.room.col.choice': 'CHOICE',
  'camp.room.col.change': 'WHAT IT CHANGES',
  'camp.room.col.cost': 'COST',
  'camp.room.item.fighters': 'Fighter',
  'camp.room.change.fighters': 'Wing strength: {from} to {to} fighters',
  'camp.room.have.ship': 'You have {credits} credits and {ore} ore. Bought here: {n} of {most}.',
  'camp.room.can': 'You can buy it.',
  'camp.room.need': 'Not yet: {need} more credits or ore.',
  'camp.room.most': 'No more: {most} of {most} bought.',
  'camp.room.cost': '{cost} ore',
  'camp.room.refit.techs': 'FITTED TECH',
  'camp.room.refit.notech': 'None yet. You pick one after each level, and the pick shows its numbers.',
  'camp.room.rank.ladder': 'THE RANKS',
  'camp.room.rank.rung': '{name}   from {at} points   fighters +{f}',
  'camp.room.rank.togo': '{n} points to the next rank',
  'camp.room.tech.shield': 'Damage the carrier takes: {from} to {to} percent',
  'camp.room.tech.beam': 'Turret damage x{dmg}, reach {from} to {to} px, and shots go through',
  'camp.room.tech.blink': '{viablink} list: hop the carrier {dist} px ahead, ready again after {secs} seconds',
  'camp.room.tech.plating': 'Carrier hull: {from} to {to}',
  'camp.room.tech.bay2': 'Wing strength: {from} to {to} fighters',
  'camp.room.tech.repair': 'The carrier and ships within {reach} px mend {rate} hit points a second',
  'camp.room.tech.overdrive': 'Carrier top speed: {from} to {to} px a second',
  'camp.room.tech.lens': 'Anomaly sense range: {from} to {to} px',
  'camp.warp.l1': 'Warp drive engaged. Earth and the Sun fall behind us.',
  'camp.warp.l1b': 'Warp drive engaged. Alpha Centauri falls behind us.',
  'camp.warp.l2': '{ly} light years to {dest}. Hold on.',
  'camp.warp.l3': '{dest}. Dropping out of warp.',
  'camp.warp.skip': 'Any key skips',
  'camp.nav.go': 'Autopilot to {name}. Any steering key takes the wheel.',
  'camp.nav.off': 'Autopilot off. You have the wheel.',
  'camp.nav.cleared': 'Destination cleared.',
  'camp.nav.arrived': '{name}: arrived.',
  'camp.nav.lost': 'Autopilot off: {name} is gone.',
  'camp.nav.say': 'Flying to {name}, {km} km.',
  'camp.nav.stopping': 'Autopilot off. You have the wheel, pilot.',
  'camp.nav.there': 'We are already at {name}, pilot.',
  'camp.nav.no.unknown': 'I do not see that on the map, pilot.',
  'camp.nav.no.nogoal': 'There is no goal to fly to yet, pilot.',
  'camp.nav.no.nomother': 'The mothership has not come yet, pilot.',
  'camp.nav.no.norelic': 'There is no relic on this level, pilot.',
  'camp.nav.no.nocache': 'There is no cache left to gather, pilot.',
  'camp.nav.no.notower': 'No tower is left, pilot.',
  'camp.nav.no.noconvoy': 'No convoy is flying, pilot.',
  'camp.nav.no.nowing': 'No ships are out, pilot.',
  'camp.nav.no.nonav': 'I am not flying anywhere, pilot.',
  'camp.nav.convoy': '{name} convoy',
  'camp.nav.cache': 'Cache {n}',
  'camp.nav.relic': 'The relic',
  'camp.nav.mother': 'The mothership',
  'camp.nav.scan': 'Scan point {n}',
  'camp.nav.guard': 'Relic guard',
  'camp.nav.alien': 'Alien',
  'camp.nav.tower': 'Defence tower',
  'camp.nav.wing': 'Your ships ({n})',
  'camp.nav.hud': 'AUTOPILOT  {name}  {km} km',
  'camp.nav.arrow': '{name}  {km} km',
  'camp.nav.cachelabel': 'CACHE',
  'camp.nav.relicmark': 'RELIC',
  'camp.map.keys': 'Up Down choose   Enter fly   X clear',
  'camp.map.zoom': 'ZOOM {pct}%   {keyzoomout} {keyzoomin} zoom   {keyzoomreset} reset',
  'camp.keys.title': 'CAMPAIGN  -  ALL THE KEYS',
  'camp.keys.roomtitle': 'READY ROOM  -  ALL THE KEYS',
  'camp.keys.roomfooter': 'H or Esc closes this page.',
  'camp.keys.footer': 'H or Esc closes this page. The battle waits while it is open.',
  'camp.keys.debug': 'DEBUG KEYS (THE TUNE KIT)',
  'title.camp.keys': 'H  all the keys',
  'camp.sel.all': 'All pilots',
  'camp.ui.pausepanels': '{keywho} picks who, {keyhostiles} an enemy, {keyfriendlies} a friendly, {keyorder} gives the order. {cruiserkey} the cruiser: fly, mine, dock, repair, shields; then 1 to {cruiserlast} does a row. {keyfocus} looks at it. H lists every key.',
  'camp.map.local': 'AREA  {km} km across',
  'camp.map.whole': 'SYSTEM  {km} km across',
  'camp.nav.burnfoe': 'Hostiles near: burn off.',
  'camp.map.on': 'ON',
  'camp.map.fly': 'FLY    Enter          {t}',
  'camp.map.fast': 'FAST   Shift+Enter    {t}',
  'camp.map.set': 'SET: {name}',
  'camp.nav.gofast': 'Autopilot to {name}, full burn. Any steering key takes the wheel.',
  'camp.map.route': '{km} km, about {s} s',
  'camp.map.goalmark': 'GOAL',
  'camp.map.dest': 'Flying: {name}',
  'camp.ui.hull': 'CARRIER',
  'camp.ui.earth': 'EARTH',
  'camp.ui.bay': 'BAY',
  'camp.ui.baywords': 'BAY  fighters {f}   OUT {out}',
  'camp.ui.out': 'OUT',
  'camp.ui.wave': 'WAVE {n} OF {total}',
  'camp.nudge.attack': 'Enemies. Pick one with {keynear}, then {keyorder}: the pilots attack.',
  'camp.ui.mother': 'MOTHERSHIP',
  'camp.ui.pausehelp': 'Hold Space: the turrets fire at ships close by. {keymissile} fires a homing missile at the target.',
  'camp.tech.shield.name': 'Shield grid',
  'camp.tech.shield.text': 'The carrier takes 40 percent less damage.',
  'camp.tech.beam.name': 'Beam turrets',
  'camp.tech.beam.text': 'The turrets fire beams: twice the damage, further, and through what they hit.',
  'camp.tech.blink.name': 'Warp blink',
  'camp.tech.blink.text': 'Hop the carrier 1,500 px ahead: {viablink} list, {rowblink}. Ready again after 20 seconds.',
  'camp.tech.plating.name': 'Hull plating',
  'camp.tech.plating.text': 'The carrier\'s hull is half as strong again.',
  'camp.tech.bay2.name': 'Second bay',
  'camp.tech.bay2.text': 'Four more fighters in the bay.',
  'camp.tech.repair.name': 'Repair field',
  'camp.tech.repair.text': 'The carrier and the ships beside it mend as they fly.',
  // Settings > Sound > Music (card space-game-music, src/music.js): the one sentence under the row
  'music.use': 'Music is made by the game as you fly and steps back when the ship speaks. Effects is the engine, the drone and every shot and click; they ease off a little while music plays. M mutes all.',
  'camp.bf.1.3.w4': 'A torpedo boat hunts them: tuck in, or kill it first.',
  'camp.say.transport': '{name} is under way. Stay with her.',
  'camp.say.rim1': 'Pirates ahead of the transport. Cover her.',
  'camp.say.rim2': 'More pirates, closing on the transport.',
  'camp.say.rim3': 'The last raid. Keep them off her.',
  'camp.say.rim4': 'Pirates at the rim. They want the miners.',
  'camp.say.rim5': 'A second raid. Guard the miners.',
  'camp.say.rim6': 'The heavy raid is coming. Hold them.',
  'camp.say.rim7': 'Pirates ahead. Cover the haulers.',
  'camp.say.rim8': 'They are back. Cover the haulers.',
  'camp.say.rim9': 'Another raid. Hold the line.',
  'camp.say.l1p.west': 'Pirates from the south-west. They want the miners.',
  'camp.say.l1p.second': 'A second group, north-east. Split the squads.',
  'camp.say.l1p.boats': 'Torpedo boats, heading for the miners. Tuck them in.',
  'camp.say.l1p.haulboats': 'A torpedo boat ahead. Tuck the haulers in, or run.',
  'camp.say.l1p.rear': 'Pirates on the last hauler. She is alone back there.',
  'camp.say.l1p.again': 'More of them, on the last hauler again.',
  'camp.hint.l1p.split': 'Two groups, two sides. One pilot each: {keywho} picks a pilot, {keyorder} attack.',
  'camp.hint.l1p.boats': 'Torpedo boats! Tuck the miners in: say or type "tuck in".',
  'camp.hint.l1p.mend': 'Quiet for now. A hurt pilot goes home to be mended, then comes back.',
  'camp.hint.l1p.haulboats': 'A torpedo boat! Say or type "tuck in": it covers the haulers beside you.',
  'camp.hint.l1p.rear': 'The last hauler is alone. Send a squad back to her.',
  'camp.hint.l1p.contact': 'Not pirates. Pick one ({keynear}), then engage: {keyorder}.',
  'camp.bf.1.2.w5': 'Torpedo boats hunt the miners: tuck them in, or send a squad.',
  'camp.bf.1.3.w5': 'Something else is out there. Be ready.',
  'camp.say.rim10': 'They keep coming. Stay on her.',
  // The three gauges (card space-game-systems-gauges, content/text/campaign-gauges.md)
  'camp.gauge.shields': 'SHIELDS',
  'camp.gauge.speed': 'SPEED',
  'camp.gauge.lasers': 'LASERS',
  'camp.gauge.hull': 'HULL',
  'camp.cruiser.shield': 'SHIELD',
  'camp.cruiser.hull': 'HULL',
  'camp.cruiser.ore': 'ORE',
  'camp.cruiser.credits': 'CREDITS',
  'camp.cruiser.missiles': 'MISSILES',
  'camp.cruiser.building': 'building {s} s',
  'camp.cruiser.noore': 'no ore',
  'camp.say.reload': 'Reloading: {n} more, {ore} ore.',
  'camp.say.rackdry': 'Out of ore, pilot. The rack stops at {n}.',
  'camp.no.rackfull': 'The rack is full, pilot.',
  'camp.no.reloading': 'Already building the rack, pilot.',
  'camp.say.lasersdry': 'Lasers are running dry.',
  // The bigger ore bay (card space-game-ore-bay-bigger, content/text/campaign-orebay.md)
  'camp.say.orefull': 'Ore bay full.',
  'camp.say.contact': 'Unknown ships. Not pirates. Weapons hot.',
  'camp.say.sold': 'Sold {ore} ore for {cash} credits.',
  'camp.o.ore': 'Mine ore: {got} of {need}.',
  'camp.o.cashin': 'Sell your ore at the Works: {got} of {need}.',
  'camp.b.sold': 'Sell {n} ore',
  'camp.ui.cash': 'CREDITS',
  'camp.ui.debriefhaulers': 'Haulers lost {n}   (-{pts})',
  'camp.b.neutrals': 'Miners lost: {n} or fewer',
  'camp.bf.enemy.skiff.one': '{n} pirate skiff',
  'camp.bf.enemy.skiff.many': '{n} pirate skiffs',
  'camp.bf.enemy.cutter.one': '{n} pirate cutter',
  'camp.bf.enemy.cutter.many': '{n} pirate cutters',
  'camp.bf.enemy.brute.one': '{n} pirate brute',
  'camp.bf.enemy.brute.many': '{n} pirate brutes',
  'camp.say.fork': 'The road forks ahead. Scout the lanes, then pick one.',
  'camp.say.forkhold': '{name} holds at the fork. Which lane?',
  'camp.say.lanepick': 'Taking the {lane}.',
  'camp.say.laneauto': 'No word. Taking the {lane}.',
  'camp.say.lanefound': 'Scout {n}, {name}: {what}.',
  'camp.no.lanewhat': 'Which lane, pilot?',
  'camp.no.lanelocked': 'Too late, pilot. We are on the {lane}.',
  'camp.no.nolane': 'There is no fork on this road.',
  'camp.route.pirates': 'ambush, {n} pirates',
  'camp.route.aliens': 'ambush, {n} aliens',
  'camp.route.ships': 'ambush, {n} ships',
  'camp.route.cache': 'a cache',
  'camp.route.quiet': 'quiet',
  'camp.route.chosen': '(chosen)',
  'camp.map.take': 'TAKE   T   this lane',
  'camp.say.lanepanic': 'Under fire. Taking the {lane}.',
  'camp.say.patrolleave': 'Patrol turning back. You are on your own from here.',
  'camp.say.distress': 'Miner under attack, west of our course! Pirates on him.',
  'camp.say.thanks': 'The miner is safe and sends {ore} ore. Thanks!',
  'camp.b.rival': 'Destroy the pirate leader',
  'camp.b.torpedoes': 'Torpedo hits: {n} or fewer',
  'camp.hint.fast': 'A long quiet road. On the map ({map}), pick the transport and burn Fast.',
  'camp.hint.fleet': '{keywho} picks who: all pilots or one. {keyorder} gives the order: attack, guard or form up.',
  'camp.bf.enemy.tboat.one': '{n} pirate torpedo boat',
  'camp.bf.enemy.tboat.many': '{n} pirate torpedo boats',
  'camp.bf.enemy.lancer.one': '{n} alien lancer',
  'camp.bf.enemy.lancer.many': '{n} alien lancers',
  'camp.bf.enemy.pirateleader.one': 'the pirate leader, a heavy ship',
  'camp.bf.enemy.pirateleader.many': '{n} pirate leaders',
  'camp.hint.tuck': 'Torpedo boats! Say or type "tuck in".',
  'camp.hint.run': 'The leader blocks the way. Say or type "run for it".',
  'camp.hud.recentre': 'RECENTRE  {keyzoomreset}',
  'camp.say.mendhull': 'Mending the hull: {pts} points, {ore} ore, {s} seconds.',
  'camp.say.mendward': 'Mending {name}: {pts} points, {ore} ore.',
  'camp.no.mending': '{name} is already being mended.',
  'camp.no.noward': 'No ship we protect is hurt.',
  'camp.no.farward': '{name} is {km} km off. Come within {range} km.',
  'camp.no.nobuild': 'Nothing is built now. Mend with ore: {viasrepair}, {rowsrepair}.',
  'camp.hub.repair.ore': 'Credits: {credits}     Ore in the store: {ore}',
  'camp.ui.tune.row.repairprice': 'Repair the hull',
  'camp.ui.tune.row.wardprice': 'Repair a ship we protect',
  'camp.ui.tune.row.fightermend': 'A fighter\'s mend: ore each',
  'camp.hud.focuswatch': 'WATCHING {name}  {keyzoomreset} back',
  'camp.hud.focuscruiser': 'the cruiser',
  'camp.hud.focuscruiserfar': 'Cruiser {km} km',
  'camp.hud.focuslost': '{name} is gone. Back to the cruiser.',
  'camp.w.attack': 'Attack {name}',
  'camp.w.guard': 'Guard {name}',
  'camp.w.all': 'all squads',
  'camp.w.nohostile.state': 'pick one with {keyhostiles} or {keynear}',
  'camp.w.nofriend.state': 'pick a friendly with {keyfriendlies}',
  'camp.no.nohostile': 'No hostile selected. Pick one first.',
  'camp.no.nofriend': 'No ship selected to guard. Pick one first.',
};
function uiText(key, vars) { return contentFill(CT_HAS(UI_TEXT, key) ? UI_TEXT[key] : key, vars); }
function ctTextKeys() { // every string the game reads: key -> { get, set }
  const k = {};
  Object.keys(HELP).forEach(sc => HELP[sc].forEach((x, i) => { k['help.' + sc.toLowerCase() + '.' + (i + 1)] = { get: () => HELP[sc][i], set: v => { HELP[sc][i] = v; } }; }));
  Object.keys(SCENE_TIPS).forEach(sc => { k['tips.' + sc.toLowerCase()] = { get: () => SCENE_TIPS[sc], set: v => { SCENE_TIPS[sc] = v; } }; });
  Object.keys(UI_TEXT).forEach(key => { k[key] = { get: () => UI_TEXT[key], set: v => { UI_TEXT[key] = v; } }; });
  return k;
}
const CT_TEXT = {
  canAdd: true, // any file in text/ is a set of strings (ui.md, or a translation)
  has: () => true,
  get: () => undefined,
  apply: (id, data) => {
    const keys = ctTextKeys(), rows = data.strings || [];
    rows.forEach(r => { // all or nothing: one key the game does not read refuses the file, so a typo is seen
      if (!CT_HAS(keys, r.key)) { const sg = typeof ContentLib !== 'undefined' ? ContentLib.suggest(r.key, Object.keys(keys)) : ''; throw new Error('the key "' + r.key + '" is not a string the game reads' + (sg ? '. Did you mean "' + sg + '"?' : '')); }
    });
    rows.forEach(r => keys[r.key].set(r.text));
  }
};

CONTENT_TABLES.ship = CT_SHIP;
CONTENT_TABLES.mission = CT_MISSION;
CONTENT_TABLES.npc = CT_NPC;
CONTENT_TABLES.part = CT_PART;
CONTENT_TABLES.system = ctWorld('system');
CONTENT_TABLES.poi = CT_POI;
CONTENT_TABLES.text = CT_TEXT;
CONTENT_TABLES.station = CT_STATION;
