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
  return String(text).replace(/\{([a-z]+)\}/g, (all, k) => CT_HAS(v, k) ? String(v[k]) : all);
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
  'camp.nav.k.raider': 'Raider', 'camp.nav.k.drone': 'Drone', 'camp.nav.k.gunship': 'Gunship', 'camp.nav.k.fighter': 'Fighter', 'camp.nav.k.escort': 'Escort', 'camp.nav.k.tower': 'Tower', 'camp.nav.k.freighter': 'Freighter',
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
  'camp.say.escort': 'Escorts are with the {name} convoy.',
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
  'camp.no.nofighters': 'No fighters are out. Launch first.',
  'camp.no.noescorts': 'No escorts are out. Launch first.',
  'camp.no.noconvoy': 'There is no convoy to escort.',
  'camp.no.nomother': 'The mothership has not come yet.',
  'camp.no.nowing': 'No ships are out. Launch first.',
  'camp.no.what': 'I cannot do that, pilot.',
  'camp.no.nomissiles': 'The magazine is empty, pilot. It reloads slowly.',
  'camp.no.missilewait': 'The launcher is still cycling.',
  'camp.no.nobig': 'No big ship in missile range, pilot.',
  'camp.no.range': 'The mothership is out of missile range, pilot.',
  'camp.help.goal': 'Your goal: {goal}',
  'camp.help.goalbay': 'Your goal: {goal} Press Q, then 1, to launch the wing.',
  'camp.help.keys': 'W A S D fly, Space fires. Q Fleet, E Ship panels.',
  'camp.help.map': 'Tab opens the level map. Tab or Esc closes it.',
  'camp.help.status': 'Hull {hull} of {max}. Earth {earth} percent. {out} out, {bay} in bay.',
  'camp.help.status2': 'Hull {hull} of {max}. {out} out, {bay} in bay.',
  'camp.lose.carrier': 'The carrier is lost.',
  'camp.lose.earth': 'Earth\'s shield has failed.',
  'camp.lose.debug': 'The level was ended with the debug key.',
  'camp.lose.other': 'The level is lost.',
  'camp.lose.reached': 'You lasted {time}: wave {wave} of {total}, kills: {kills}.',
  'camp.lose.tip.towers': 'Fire missiles (F) at the towers. Send the wing at them.',
  'camp.lose.tip.carrier': 'Launch the wing early (FLEET panel): fighters draw fire. Keep moving.',
  'camp.lose.tip.earth': 'Aliens at Earth shell it. FLEET panel: Attack or Guard early.',
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
  'camp.say.emergencyend': 'Emergency shields off.',
  'camp.say.shieldlow': 'Shields are low, pilot.',
  'camp.say.enginelow': 'Engines are low on power, pilot.',
  'camp.no.powermax': 'That system is at full power.',
  'camp.no.powernone': 'No power left to take.',
  'camp.no.powerwhat': 'Weapons, shields or engines?',
  'camp.no.locked': 'Emergency shields hold the power.',
  'camp.no.cooling': 'Emergency shields ready in {s} seconds.',
  'camp.pow.weapons': 'WEAPONS',
  'camp.pow.shields': 'SHIELDS',
  'camp.pow.engines': 'ENGINES',
  // The scout-escorts (card space-game-campaign-scouts, content/text/campaign-scouts.md)
  'camp.say.scout': 'Scout {n} is going to {name}.',
  'camp.say.scoutnothing': 'Scout {n}, nothing at {name}.',
  'camp.say.scoutfound': 'Scout {n}, {name}: likely {likely}.',
  'camp.say.scouthome': 'Scout {n} is back aboard.',
  'camp.say.scoutleft': 'A scout was left behind.',
  'camp.say.anomalyread': 'Anomaly: likely {likely}.',
  'camp.nav.anomalyread': 'Anomaly: likely {likely}',
  'camp.no.noscout': 'This mission has no scouting.',
  'camp.no.scoutsbusy': 'No escort is free to scout.',
  'camp.no.noscoutplace': 'I do not see that place, pilot.',
  'camp.ui.scouts': 'SCOUTS {n}',
  'camp.map.scout': 'SCOUT   V   {t}',
  'camp.map.scoutkey': 'V  scout',
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
  'camp.chat.scouts.1': 'Scout reports: nothing there.',
  'camp.chat.scouts.2': 'Scout is clear.',
  'camp.chat.scouts.3': 'Nothing out there.',
  'camp.chat.scoutlost.1': 'We lost a scout.',
  'camp.chat.scoutlost.2': 'Scout is gone.',
  'camp.chat.anomaly.1': 'Something odd out there.',
  'camp.chat.anomaly.2': 'Sensors show a ripple.',
  'camp.chat.anomaly.3': 'Space is bending ahead.',
  'chatter.mode.on': 'Chatter on: the wing calls kills, hits and orders about every 3 seconds.',
  'chatter.mode.quiet': 'Chatter quiet: one call in 8 seconds, never over the computer or a warning.',
  'chatter.mode.off': 'Chatter off: the wing is silent.',
  // The title screen's two choices and the pause menu's Title row (card space-game-title-modes, content/text/title.md)
  'title.long.key': 'ENTER',
  'title.long.name': 'LONG HAUL',
  'title.long.sub': 'The trading run, Halcyon Station to Kepler-4b. Enter starts it; the arrows pick.',
  // The pilots' calls for orders (card space-game-order-calls, content/text/camporders.md)
  'camp.call.line.cruiser': 'Your shields are failing. Orders?',
  'camp.call.line.wounded': 'Wingman hit and burning. Orders?',
  'camp.call.line.breakaway': 'Hostiles breaking for the convoy. Orders?',
  'camp.call.line.second': 'Second group sighted. Orders?',
  'camp.call.line.running': 'They are breaking off and running. Orders?',
  'camp.call.line.opportunity': 'Big ship alone and in reach. Orders?',
  'camp.call.fx.intercept': 'Fighters intercept',
  'camp.call.fx.chase': 'Fighters give chase',
  'camp.call.fx.strike': 'Fighters strike it',
  'camp.call.fx.allin': 'All ships attack',
  'camp.call.fx.guard': 'Wing guards the cruiser',
  'camp.call.fx.cover': 'Cover him',
  'camp.call.fx.home': 'Bring him home',
  'camp.call.fx.draw': 'Cruiser\'s turrets',
  'camp.call.fx.missile': 'Fire a missile',
  'camp.call.fx.emergency': 'Emergency power',
  'camp.call.fx.hold': 'Hold formation',
  'camp.call.fx.fight': 'Keep fighting',
  'camp.call.fx.letgo': 'Let them go',
  'camp.call.fx.leave': 'Leave it',
  'camp.call.r.intercept': 'Copy. Fighters going in.',
  'camp.call.r.chase': 'Copy. Giving chase.',
  'camp.call.r.strike': 'Copy. Striking now.',
  'camp.call.r.allin': 'Copy. Everyone goes in.',
  'camp.call.r.guard': 'Copy. Back to the cruiser.',
  'camp.call.r.cover': 'Copy. Covering him.',
  'camp.call.r.home': 'Copy. He is heading home.',
  'camp.call.r.draw': 'Copy. They are coming for you.',
  'camp.call.r.missile': 'Copy. Missile away.',
  'camp.call.r.emergency': 'Emergency power. Hold on.',
  'camp.call.r.hold': 'Copy. Holding formation.',
  'camp.call.r.fight': 'Copy. Fighting on.',
  'camp.call.r.letgo': 'Copy. Letting them go.',
  'camp.call.r.leave': 'Copy. Leaving it.',
  'camp.call.late': 'No orders. I will play it safe.',
  'camp.call.fail': 'Cannot do that. Playing it safe.',
  'camp.call.hud.def': 'no answer',
  'camp.call.hud.keys': '1 2 3 answer',
  'title.camp.key': 'K',
  'title.camp.name': 'CAMPAIGN',
  'title.camp.sub': 'Earth\'s fleet on the rim: fly the carrier, command the wing. Three levels.',
  'title.pause': 'Title screen   (saved; Campaign or Long Haul from there)',
  // The wing's stances (card space-game-campaign-stances, content/text/campaign-stances.md)
  'camp.say.stance.free': 'Wing, fight as you see fit.',
  'camp.say.stance.orbit': 'Wing, circle your target.',
  'camp.say.stance.keep': 'Wing, keep your distance.',
  'camp.say.stance.match': 'Wing, match speed and form on me.',
  'camp.say.stance.hold': 'Wing, hold your position.',
  'camp.say.stance.orbit.mother': 'Wing, orbit the mothership.',
  'camp.say.stance.keep.mother': 'Wing, keep your distance from the mothership.',
  'camp.no.stance': 'Which stance, pilot? Free, orbit, keep distance, match speed or hold.',
  'camp.say.mine': 'Mining ships are on their way.',
  'camp.say.build': 'Building {n} {kind}.',
  'camp.say.built': 'A new {kind} is in the bay.',
  'camp.say.repairoff': 'Fighter hit hard. Breaking off to land.',
  'camp.say.repairback': 'Fighter mended and launching again.',
  'camp.say.repairdone': 'Fighter mended. It is in the bay.',
  'camp.ui.repair': 'REPAIR {n}  {s} s',
  'camp.no.noore': 'There is no ore in reach, pilot.',
  'camp.no.noore2': 'Not enough ore: {need} needed, {have} in the store.',
  'camp.no.noearth': 'There is no Earth here, pilot.',
  'camp.no.shieldauto': 'Shields mend on their own. More pips on shields mend faster.',
  'camp.slow.sign': 'COMMAND TIME  x{scale}',
  'camp.slow.hint': 'Time slows while you give orders.',
  'camp.no.buildfull': 'The bay cannot hold more of those, pilot.',
  'camp.ui.ore': 'ORE',
  'camp.ui.shield': 'SHIELD',
  'camp.l1.before.3': 'Then mine at the rim and bring the haulers home.',
  'camp.l1.after.3': 'Earth recalls the cruiser for a refit.',
  'camp.say.ambush': 'Alarm. Unknown ships, coming for the cruiser.',
  'camp.say.ambush2': 'Mining lasers are weapons now. Hold Space. Drones: FLEET panel, Attack.',
  'camp.say.bwave2': 'Second wave, from the north-west.',
  'camp.say.bwave3': 'The mothership is here. Kill it.',
  'camp.say.escortcarrier': 'Escorts are with the cruiser.',
  'camp.ui.refit': 'EARTH REFIT',
  'camp.ui.refitpick': 'Choose a technology:  {keys}',
  'camp.ui.refitbuy': '4  +1 fighter ({fc} ore)     5  +1 escort ({ec} ore)',
  'camp.ui.refitore': 'ORE  {ore}     EXTRA SHIPS  {xf} fighters  {xe} escorts',
  'camp.ui.refitgot': 'Chosen: {name}.  Enter  continue',
  'camp.lose.convoy': 'The haulers are lost.',
  'camp.lose.base': 'The works are lost.',
  'camp.lose.tip.convoy': 'Keep the wing on the haulers: FLEET panel, Escort.',
  'camp.lose.tip.base': 'Guard the works: FLEET panel, Guard, then hold Space.',
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
  'camp.b.nolost': 'Lose no ships',
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
  'camp.ui.promoted': 'PROMOTED: {name}. The bay holds {fighters} fighters and {escorts} escorts.',
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
  // The torpedo boats (card space-game-torpedo-boats, content/text/campaign-torpedo.md)
  'camp.say.torp.arm.name': 'Torpedo boat arming on {name}.',
  'camp.say.torp.arm.us': 'Torpedo boat arming on us.',
  'camp.say.torp.fire.name': 'Torpedo away at {name}. Shoot it down.',
  'camp.say.torp.fire.us': 'Torpedo inbound on us. Shoot it down.',
  'camp.say.torp.down': 'Torpedo down.',
  'camp.say.torp.hit.name': '{name} took a torpedo.',
  'camp.say.torp.hit.us': 'Torpedo hit the cruiser.',
  'camp.nav.k.tboat': 'Torpedo boat', 'camp.nav.k.lancer': 'Lancer',
  'camp.no.wnogroup': 'Which group? Fighters, escorts or all.',
  'camp.no.wnotarget': 'I cannot find that target.',
  'camp.no.wbadpair': '{group} cannot {verb} {what}.',
  'camp.no.wneed': 'Name a target to {verb}.',
  'camp.no.wnoscout': 'No scouts are aboard.',
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
  'camp.ui.score': 'SCORE {score}',
  'camp.ui.debriefstats': 'Time {time}   Hull {hull}   Ships lost {lost}',
  'camp.ui.debriefnext': 'Enter  ready room',
  'camp.ui.retrymission': 'Enter  fly the mission again     T  title',
  'camp.pace.line': 'Pace: {pace}',
  'camp.pace.toast': 'Pace: {pace}.',
  'camp.pace.key': 'P changes the battle pace.',
  'camp.pace.head': 'BATTLE PACE',
  'camp.pace.note.calm': 'Small ships fly at six tenths: time to read every pass and to give orders.',
  'camp.pace.note.normal': 'Small ships fly at 72 in 100. The default.',
  'camp.pace.note.brisk': 'The quickest: small ships at 85 in 100 of full speed.',
  'camp.pace.fine': 'Only the small ships change: the fighters, the escorts and the enemy\'s small ships. Your carrier, the big ships, the towers, Fast and the warp are the same. Shots fly a little slower, hits count the same.',
  'camp.pace.stays': 'The choice stays in this browser and takes hold at once, in a battle too.',
  'camp.keys.pace': 'Battle pace: {pace}  (P)',
  'camp.ui.pauseretry': 'R  restart the mission',
  'camp.m.1.1.title': 'Rim escort',
  'camp.m.1.1.b1': 'Escort the transport from the Lunar Base to Ceres.',
  'camp.m.1.1.b2': 'Pirates will raid her on the way.',
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
  'camp.ui.keys': 'W A S D fly   Space turrets   F missiles   {panels}   Tab Map   + - Zoom   H Keys',
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
  'camp.map.convoy': 'Convoys ({n}), course drawn',
  'camp.map.alien': 'Aliens ({n})',
  'camp.map.mother': 'The alien mothership',
  'camp.map.tower': 'Defence towers ({n})',
  'camp.map.cache': 'Caches left ({n})',
  'camp.map.relic': 'The relic',
  'camp.hub.title': 'READY ROOM  -  {name}',
  'camp.hub.row.board': 'MISSIONS',
  'camp.hub.row.brief': 'BRIEFING',
  'camp.hub.row.refit': 'REFIT',
  'camp.hub.row.rank': 'RANK',
  'camp.hub.row.launch': 'LAUNCH',
  'camp.hub.note.board': '{done} of {all} flown',
  'camp.hub.note.refit': '{ore} ore',
  'camp.hub.note.points': '{points} points',
  'camp.hub.note.launch': 'mission {n}',
  'camp.hub.note.pick': 'the tech pick',
  'camp.hub.foot.board': 'Enter  the briefing',
  'camp.hub.foot.brief': 'Enter  the refit',
  'camp.hub.foot.refit': 'Enter  your rank',
  'camp.hub.foot.rank': 'Enter  to the launch pad',
  'camp.hub.foot.launch': 'Enter  LAUNCH',
  'camp.hub.keys': '1 to 5 pick   W S move   Enter next   L launch   Esc title',
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
  'camp.hub.refit.head': 'REFIT',
  'camp.hub.refit.ore': 'Ore in the store: {ore}',
  'camp.hub.refit.tech': 'Tech: {list}',
  'camp.hub.refit.notech': 'Tech: none yet. The refit after a level gives one.',
  'camp.hub.refit.wing': 'Wing for the next mission: {f} fighters, {e} escorts',
  'camp.hub.refit.extra': 'Bought here: {xf} fighters, {xe} escorts (at most {most} of each)',
  'camp.hub.refit.buy': 'F  fighter {fc} ore     E  escort {ec} ore     Backspace  give one back',
  'camp.hub.boughtf': 'A fighter joins the wing. {ore} ore left.',
  'camp.hub.boughte': 'An escort joins the wing. {ore} ore left.',
  'camp.hub.soldf': 'A fighter given back. {ore} ore.',
  'camp.hub.solde': 'An escort given back. {ore} ore.',
  'camp.hub.noore': 'Not enough ore: {need} needed, {have} in the store.',
  'camp.hub.most': 'No more: {most} extra of each at most.',
  'camp.hub.nothing': 'Nothing to give back.',
  'camp.hub.rank.head': 'RANK',
  'camp.hub.rank.name': 'Rank: {name}  ({n} of {of})',
  'camp.hub.rank.next': 'Next rank {to} at {next} points',
  'camp.hub.rank.top': 'The highest rank.',
  'camp.hub.rank.none': 'No rank yet. Fly a mission.',
  'camp.hub.rank.points': 'Score so far: {points} points',
  'camp.hub.rank.flown': 'Missions flown: {n} of {all}',
  'camp.hub.rank.wing': 'Wing: {f} fighters, {e} escorts',
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
  'camp.bf.ready.bay': 'Bay: {f} fighters, {e} escorts',
  'camp.bf.ready.rank': 'Rank: {name}',
  'camp.bf.ready.stance': 'Stance: {name}',
  'camp.bf.ready.stock': 'Missiles {missiles}    Ore {ore}',
  'camp.bf.ready.power': 'Power: weapons {w}, shields {s}, engines {e}',
  'camp.bf.ready.shield': 'Shield: full, {cap} points',
  'camp.bf.stance.free': 'Free',
  'camp.bf.stance.orbit': 'Orbit',
  'camp.bf.stance.keep': 'Keep distance',
  'camp.bf.stance.match': 'Match speed',
  'camp.bf.stance.hold': 'Hold',
  'camp.bf.warn.hold': 'Stance is Hold: the wing will not attack on its own.',
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
  'camp.bf.key.fly': 'Thrust, turn and brake (arrows too)',
  'camp.bf.key.fire': 'Hold: the turrets fire at ships in reach',
  'camp.bf.key.wing': 'Q then 1: launch the wing',
  'camp.bf.key.map': 'Open the map; click a place, Enter flies',
  'camp.bf.key.zoom': 'Zoom the view or the map; 0 resets',
  'camp.bf.key.attack': 'Q then 2: the fighters attack',
  'camp.bf.key.escort': 'Q then 3: the escorts go to a convoy',
  'camp.bf.key.missile': 'Fire a homing missile',
  'camp.bf.key.mine': 'E then 1: the wing mines ore',
  'camp.bf.key.dock': 'E then 5: dock to build, mend and sell',
  'camp.bf.key.shield': 'C then 5: emergency shields',
  'camp.bf.keys.next': 'Enter or Right: next    Left: back    L: launch now    Esc: the board',
  'camp.bf.keys.launch': 'Enter or L: launch    Left: back    Esc: the board',
  'camp.bf.keys.zoom': '+ - 0 zoom',
  'camp.bf.at.relic': 'RELIC',
  'camp.bf.at.tower': 'DEFENCE TOWERS',
  'camp.bf.at.cache': 'RESOURCE POD',
  'camp.bf.at.guards': 'GUARDS',
  'camp.bf.at.mother': 'MOTHERSHIP',
  'camp.bf.1.1.w1': '1 transport flies from the Lunar Base to Ceres.',
  'camp.bf.1.1.w2': 'Pirates raid her again and again on the way. Stay close.',
  'camp.bf.1.1.w3': 'Hold Space to fire. Q then 3: escorts guard her.',
  'camp.bf.1.1.w4': 'She must arrive. If she dies, the mission is lost.',
  'camp.bf.1.1.n1': 'Welcome aboard, Commander. The transport is ours to bring to Ceres. Stay close to her.',
  'camp.bf.1.1.n2': 'Pirates will come at her from ahead. Hold Space to fire the turrets, and shoot what comes.',
  'camp.bf.1.1.n3': 'W A S D fly the cruiser. Q opens the fleet panel: 1 launches the wing, 3 sends the escorts to her. Tab opens the map.',
  'camp.bf.1.2.w1': 'Mine the rock fields round Ceres. E then 1 sends the wing.',
  'camp.bf.1.2.w2': 'Ore sells for triple at the Works. Pirates hunt the miners.',
  'camp.bf.1.2.w3': 'Beat the 3 raids, then dock at Occator Works: SHIP panel, Dock.',
  'camp.bf.1.2.w4': 'The Works keeps its doors shut while a pirate is near.',
  'camp.bf.1.3.w1': '3 haulers leave Ceres for Earth, 12 seconds apart.',
  'camp.bf.1.3.w2': '1 must get home. Each hauler lost costs points.',
  'camp.bf.1.3.w3': 'Pirates raid them twice. Q then 3: escorts cover them.',
  'camp.bf.2.1.w1': 'Find 2 of the 3 resource pods in the system.',
  'camp.bf.2.1.w2': 'Any ship of yours that flies close picks one up.',
  'camp.bf.2.1.w3': 'Aliens come from the west after 20 seconds.',
  'camp.bf.2.1.w4': 'Kill them too: the pods alone do not finish it.',
  'camp.bf.2.2.w1': '7 guards hold the system. Destroy them all.',
  'camp.bf.2.2.w2': 'More aliens join after 18 seconds, from the north-east.',
  'camp.bf.2.2.w3': 'Missiles (F) help against the heavy ones.',
  'camp.bf.2.3.w1': 'Fly the carrier into the relic\'s ring at Proxima.',
  'camp.bf.2.3.w2': 'Hold there 14 seconds with no alien near the relic.',
  'camp.bf.2.3.w3': 'Leave the ring, or let aliens close, and it loses ground.',
  'camp.bf.2.3.w4': 'Aliens come from the north-east after 6 seconds.',
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
  'camp.hub.replay.keys': 'A D choose   Enter or R open the briefing   X back to the next mission',
  'camp.hub.note.replay': 'replay {n}',
  'camp.hub.replay.head': 'REPLAY  -  MISSION {n} OF {of}  -  {title}',
  'camp.hub.replay.rule1': 'Standard start, with your wing, rank and techs.',
  'camp.hub.replay.rule2': 'The story and your progress stay; your best is kept.',
  'camp.hub.board.found': '{got}/{of}',
  'camp.ui.replay': 'REPLAY  -  {title}',
  'camp.ui.replayscore': 'Replay: this run {now}, your best was {old}.',
  'camp.ui.replaybest': 'A new best: {best} points.',
  'camp.ui.replaykept': 'Your best stands at {best} points.',
  'camp.no.nodock': 'Dock at an outpost to build.',
  'camp.no.norepair': 'Dock at an outpost to repair.',
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
  'camp.say.retreatnear': 'Hull low, no ships. {name} is in range: E, then 5.',
  'camp.hud.retreat': 'Retreat to {name}: {s} s on Fast.',
  'camp.hud.retreathot': '{name} is covered by enemies: no safe dock.',
  'camp.say.retreathot': 'Hull low, no ships. {name} is covered by enemies: no safe dock.',
  'camp.hud.dockhint': 'E 5  dock at {name}',
  'camp.tech.fabricator.name': 'Fabricator',
  'camp.tech.fabricator.text': 'Build fighters and escorts anywhere, not only docked.',
  'camp.hub.row.build': 'BUILD',
  'camp.hub.row.repair': 'REPAIR',
  'camp.hub.row.upgrade': 'REFIT',
  'camp.hub.row.undock': 'UNDOCK',
  'camp.hub.dockfoot.build': 'Enter  the repair bay',
  'camp.hub.dockfoot.repair': 'Enter  the refit',
  'camp.hub.dockfoot.upgrade': 'Enter  the mission board',
  'camp.hub.dockfoot.board': 'Enter  to the undock row',
  'camp.hub.dockfoot.undock': 'Enter  UNDOCK',
  'camp.hub.note.build': 'ore {ore}',
  'camp.hub.note.repair': 'hull {pct} percent',
  'camp.hub.note.fab': '{cost} ore for the Fabricator',
  'camp.hub.note.fabbed': 'Fabricator fitted',
  'camp.hub.note.undock': '{name}',
  'camp.hub.build.head': 'BUILD  -  {name}',
  'camp.hub.build.ore': 'Ore in the store: {ore}',
  'camp.hub.build.wing': 'Wing: {f} fighters, {e} escorts (bay and out); {q} in the yard',
  'camp.hub.build.keys': 'F  fighter {fc} ore     E  escort {ec} ore',
  'camp.hub.build.room': 'Builds take {ft} s and {et} s each and join the bay.',
  'camp.hub.repair.head': 'REPAIR',
  'camp.hub.repair.hull': 'Hull: {hp} of {max}',
  'camp.hub.repair.key': 'R  mend the hull: {ore} ore',
  'camp.hub.repair.sound': 'The hull is sound.',
  'camp.hub.upgrade.head': 'REFIT',
  'camp.hub.upgrade.ore': 'Ore in the store: {ore}',
  'camp.hub.upgrade.fab': 'U  Fabricator, {cost} ore: build ships anywhere, not only docked',
  'camp.hub.upgrade.fitted': 'Fabricator fitted: this ship builds anywhere.',
  'camp.hub.upgrade.have': 'Tech: {list}',
  'camp.hub.upgrade.none': 'Tech: none yet.',
  'camp.hub.upgrade.bought': 'Fabricator fitted. {ore} ore left.',
  'camp.hub.upgrade.no': 'Not enough ore for the Fabricator: {need} needed, {have} in the store.',
  'camp.hub.undock.head': 'UNDOCK',
  'camp.hub.undock.line': 'Enter or L undocks. The battle goes on where you left it.',
  'camp.hub.undock.at': 'Docked at {name}.',
  'camp.hub.refit.fab': 'U  Fabricator, {cost} ore: build ships anywhere, not only docked',
  'camp.hub.refit.fitted': 'Fabricator fitted: this ship builds anywhere.',
  'camp.hub.refit.fabbought': 'Fabricator fitted. {ore} ore left.',
  'camp.hub.cruiser': 'THE CRUISER',
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
  'camp.map.keys': 'W S choose   Enter fly   X clear',
  'camp.map.zoom': 'ZOOM {pct}%   + - zoom   0 reset',
  'camp.keys.title': 'CAMPAIGN  -  ALL THE KEYS',
  'camp.keys.roomtitle': 'READY ROOM  -  ALL THE KEYS',
  'camp.keys.roomfooter': 'H or Esc closes this page.',
  'camp.keys.footer': 'H or Esc closes this page. The battle waits while it is open.',
  'camp.keys.debug': 'DEBUG KEYS (THE TUNE KIT)',
  'title.camp.keys': 'H  all the keys',
  'camp.ui.pausepanels': '{panels} open the panels; a digit then picks a row. H lists every key.',
  'camp.map.local': 'AREA  {km} km across  Z: whole',
  'camp.map.whole': 'SYSTEM  {km} km across  Z: area',
  'camp.nav.no.wingout': 'Wing is out: recall it first. Press again to recall and burn.',
  'camp.nav.no.wingout2': 'Recalling the wing, then the burn.',
  'camp.nav.recalling': 'Recalling... {n} out.',
  'camp.nav.recalltimeout': 'Recall timed out. Still out: {names}.',
  'camp.nav.burnoff': 'Wing launched: burn off.',
  'camp.map.fastout': 'FAST   Shift+Enter    wing is out',
  'camp.map.fastask': 'FAST   press again: recall, then burn',
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
  'camp.ui.baywords': 'BAY  fighters {f}  escorts {e}   OUT {out}',
  'camp.ui.out': 'OUT',
  'camp.ui.wave': 'WAVE {n} OF {total}',
  'camp.nudge.launch': 'Press Q, then 1, to launch the wing.',
  'camp.nudge.attack': 'Press Q, then 2, to send the fighters at the enemy.',
  'camp.ui.mother': 'MOTHERSHIP',
  'camp.ui.missiles': 'F  MISSILES  {n}',
  'camp.ui.missilenext': 'next in {s} s',
  'camp.ui.pausehelp': 'Hold Space: the turrets fire at ships close by. F fires a homing missile at the nearest big ship.',
  'camp.tech.shield.name': 'Shield grid',
  'camp.tech.shield.text': 'The carrier takes 40 percent less damage.',
  'camp.tech.beam.name': 'Beam turrets',
  'camp.tech.beam.text': 'The turrets fire beams: twice the damage, further, and through what they hit.',
  'camp.tech.blink.name': 'Warp blink',
  'camp.tech.blink.text': 'Press B to hop the carrier 1,500 px ahead. Ready again after 20 seconds.',
  'camp.tech.plating.name': 'Hull plating',
  'camp.tech.plating.text': 'The carrier\'s hull is half as strong again.',
  'camp.tech.bay2.name': 'Second bay',
  'camp.tech.bay2.text': 'Four more fighters in the bay.',
  'camp.tech.repair.name': 'Repair field',
  'camp.tech.repair.text': 'The carrier and the ships beside it mend as they fly.',
  // Settings > Sound > Music (card space-game-music, src/music.js): the one sentence under the row
  'music.use': 'Music is made by the game as you fly and steps back when the ship speaks. Effects is the engine, the drone and every shot and click; they ease off a little while music plays. M mutes all.',
  'camp.bf.1.3.w4': 'Something else is out there. Be ready.',
  'camp.say.transport': '{name} is under way. Stay with her.',
  'camp.say.rim1': 'Pirates ahead of the transport. Cover her.',
  'camp.say.rim2': 'More pirates, closing on the transport.',
  'camp.say.rim3': 'The last raid. Keep them off her.',
  'camp.say.rim4': 'Pirates at the rim. They want the miners.',
  'camp.say.rim5': 'A second raid. Guard the miners.',
  'camp.say.rim6': 'A third raid, and heavier. Hold them.',
  'camp.say.rim7': 'Pirates ahead. Cover the haulers.',
  'camp.say.rim8': 'They are back. Cover the haulers.',
  'camp.say.rim9': 'Another raid. Hold the line.',
  'camp.say.rim10': 'They keep coming. Stay on her.',
  // The three gauges (card space-game-systems-gauges, content/text/campaign-gauges.md)
  'camp.gauge.shields': 'SHIELDS',
  'camp.gauge.speed': 'SPEED',
  'camp.gauge.lasers': 'LASERS',
  'camp.gauge.hull': 'HULL',
  'camp.say.lasersdry': 'Lasers are running dry. More power to weapons.',
  'camp.say.contact': 'Unknown ships. Not pirates. Weapons hot.',
  'camp.say.sold': 'Sold {ore} ore for {cash}.',
  'camp.o.ore': 'Mine ore: {got} of {need}.',
  'camp.o.cashin': 'Sell your ore at the Works: {got} of {need}.',
  'camp.b.sold': 'Sell {n} ore',
  'camp.ui.cash': 'CASH',
  'camp.ui.debriefhaulers': 'Haulers lost {n}   (-{pts})',
  'camp.b.neutrals': 'Miners lost: {n} or fewer',
  'camp.bf.enemy.skiff.one': '{n} pirate skiff',
  'camp.bf.enemy.skiff.many': '{n} pirate skiffs',
  'camp.bf.enemy.cutter.one': '{n} pirate cutter',
  'camp.bf.enemy.cutter.many': '{n} pirate cutters',
  'camp.bf.enemy.brute.one': '{n} pirate brute',
  'camp.bf.enemy.brute.many': '{n} pirate brutes',
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
