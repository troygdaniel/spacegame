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
  'camp.l1.before.1': 'Ceres belt. The cruiser is mining.',
  'camp.l1.before.2': 'Fly over ore, or press 6 to send the drones.',
  'camp.l1.after.1': 'Mothership destroyed. The belt is clear.',
  'camp.l1.after.2': 'Their wreck holds alien technology.',
  'camp.win.result': 'Won in {time}. Carrier hull {hull} of {max}, {lost} of your ships lost.',
  'camp.win.resultconv': 'Won in {time}. Carrier hull {hull} of {max}, {delivered} of {convoys} convoys delivered, {lost} of your ships lost.',
  'camp.l2.before.1': 'Warp drive ready. Next star: Alpha Centauri.',
  'camp.l2.before.2': 'Something old waits on Proxima b. Find it first.',
  'camp.l2.after.1': 'The relic is a machine from an older race.',
  'camp.l2.after.2': 'It shows where the aliens live. Choose a technology.',
  'camp.l3.before.1': 'Their home world is open. Last battle.',
  'camp.l3.before.2': 'Break the defence towers round their world.',
  'camp.l3.after.1': 'Their defences are down. Earth is safe.',
  'camp.l3.after.2': 'The first step is done. The war is not over.',
  'camp.say.convoy': 'Convoy to {name} is away.',
  'camp.say.delivered': 'The convoy has reached {name}.',
  'camp.say.convoylost': 'The convoy to {name} is lost.',
  'camp.say.wave1': 'Aliens on the Mars lane, pilot.',
  'camp.say.wave2': 'A second wave, heading for Earth.',
  'camp.say.wave3': 'Their mothership has jumped in. Kill it.',
  'camp.say.launch': 'Launching the wing.',
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
  'camp.help.goalbay': 'Your goal: {goal} Press 1, then 1, to launch the wing.',
  'camp.help.keys': 'W A S D fly, Space fires. 1 Fleet, 2 Ship panels.',
  'camp.help.map': 'Tab opens the level map. Tab or Esc closes it.',
  'camp.help.status': 'Hull {hull} of {max}. Earth {earth} percent. {out} out, {bay} in bay.',
  'camp.help.status2': 'Hull {hull} of {max}. {out} out, {bay} in bay.',
  'camp.lose.carrier': 'The carrier is lost.',
  'camp.lose.earth': 'Earth\'s shield has failed.',
  'camp.lose.debug': 'The level was ended with the debug key.',
  'camp.lose.other': 'The level is lost.',
  'camp.lose.reached': 'You lasted {time}: wave {wave} of {total}, {kills} aliens down.',
  'camp.lose.tip.carrier': 'Launch the wing early (1): fighters draw fire. Keep moving.',
  'camp.lose.tip.earth': 'Aliens at Earth shell it. Send fighters (2) or guard (4) early.',
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
  'camp.ui.end': 'THE FIRST CAMPAIGN IS WON     Enter  title',
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
  'chatter.mode.on': 'Chatter on: the wing calls kills, hits and orders about every 3 seconds.',
  'chatter.mode.quiet': 'Chatter quiet: one call in 8 seconds, never over the computer or a warning.',
  'chatter.mode.off': 'Chatter off: the wing is silent.',
  // The title screen's two choices and the pause menu's Title row (card space-game-title-modes, content/text/title.md)
  'title.long.key': 'ENTER',
  'title.long.name': 'LONG HAUL',
  'title.long.sub': 'The trading run, Halcyon Station to Kepler-4b. Any other key starts it too.',
  'title.camp.key': 'K',
  'title.camp.name': 'CAMPAIGN',
  'title.camp.sub': 'Earth\'s fleet against the aliens: fly the carrier, command the wing. Three levels.',
  'title.pause': 'Title screen   (saved; Campaign or Long Haul from there)',
  'camp.say.mine': 'Mining ships are on their way.',
  'camp.say.recharge': 'Carrier shield recharged.',
  'camp.say.rechargeearth': 'Earth\'s shield recharged.',
  'camp.say.build': 'Building {n} {kind}.',
  'camp.say.built': 'A new {kind} is in the bay.',
  'camp.no.noore': 'There is no ore in reach, pilot.',
  'camp.no.noore2': 'Not enough ore: {need} needed, {have} in the store.',
  'camp.no.noearth': 'There is no Earth here, pilot.',
  'camp.no.farearth': 'We are too far from Earth to recharge it.',
  'camp.no.earthfull': 'Earth\'s shield is already full.',
  'camp.no.shieldfull': 'The carrier\'s shield is already full.',
  'camp.no.buildfull': 'The bay cannot hold more of those, pilot.',
  'camp.ui.ore': 'ORE',
  'camp.ui.shield': 'SHIELD',
  'camp.l1.before.3': 'Quiet shift. Fill the store.',
  'camp.l1.after.3': 'Earth recalls the cruiser for a refit.',
  'camp.say.ambush': 'Alarm. Unknown ships, coming for the cruiser.',
  'camp.say.ambush2': 'Mining lasers are weapons now. Hold Space. Drones: press 2.',
  'camp.say.bwave2': 'Second wave, from the north-west.',
  'camp.say.bwave3': 'The mothership is here. Kill it.',
  'camp.say.escortcarrier': 'Escorts are with the cruiser.',
  'camp.ui.refit': 'EARTH REFIT',
  'camp.ui.refitpick': 'Choose a technology:  1  2  3',
  'camp.ui.refitbuy': '4  +1 fighter ({fc} ore)     5  +1 escort ({ec} ore)',
  'camp.ui.refitore': 'ORE  {ore}     EXTRA SHIPS  {xf} fighters  {xe} escorts',
  'camp.ui.refitgot': 'Chosen: {name}.  Enter  continue',
  'camp.lose.convoy': 'The haulers are lost.',
  'camp.lose.base': 'The works are lost.',
  'camp.lose.tip.convoy': 'Keep the wing on the haulers. Press 3.',
  'camp.lose.tip.base': 'Guard the works. Press 4, then hold Space.',
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
  'camp.b.lost': 'Lose at most {n} ships',
  'camp.b.nolost': 'Lose no ships',
  'camp.b.hull': 'Keep the hull above {pct} percent',
  'camp.b.ore': 'Mine {n} ore',
  'camp.b.delivered': 'Deliver every hauler',
  'camp.ui.mission': 'MISSION {n} OF {of}: {title}',
  'camp.ui.briefgo': 'Enter  fly',
  'camp.ui.bonushead': 'BONUS',
  'camp.ui.bonusmet': '+{pts}  {text}',
  'camp.ui.bonusmiss': '--   {text}',
  'camp.ui.debrief': 'MISSION COMPLETE: {title}',
  'camp.ui.score': 'SCORE {score}',
  'camp.ui.debriefstats': 'Time {time}   Hull {hull}   Ships lost {lost}',
  'camp.ui.debriefnext': 'Enter  next mission',
  'camp.ui.retrymission': 'Enter  fly the mission again     T  title',
  'camp.ui.pauseretry': 'R  restart the mission',
  'camp.m.1.1.title': 'Belt survey',
  'camp.m.1.1.b1': 'Scan three rock fields.',
  'camp.m.1.1.b2': 'Expect company.',
  'camp.m.1.2.title': 'Ore haulers',
  'camp.m.1.2.b1': 'Escort the haulers from Vesta to Ceres.',
  'camp.m.1.2.b2': 'Two must arrive.',
  'camp.m.1.3.title': 'The mothership',
  'camp.m.1.3.b1': 'Destroy the alien mothership.',
  'camp.m.1.3.b2': 'Three waves first.',
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
  'camp.ui.title': 'CAMPAIGN',
  'camp.ui.level': 'LEVEL {n}: {name}',
  'camp.ui.won': 'LEVEL {n} WON',
  'camp.ui.lost': 'LEVEL {n} LOST',
  'camp.ui.keys': 'W A S D fly   Space turrets   F missiles   {panels}   Tab Map   H Keys',
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
  'camp.warp.l1': 'Warp drive engaged. Earth and the Sun fall behind us.',
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
  'camp.keys.title': 'CAMPAIGN  -  ALL THE KEYS',
  'camp.keys.footer': 'H or Esc closes this page. The battle waits while it is open.',
  'camp.keys.debug': 'DEBUG KEYS (THE TUNE KIT)',
  'title.camp.keys': 'H  all the keys',
  'camp.ui.pausepanels': '{panels} open the panels; a digit then picks a row. H lists every key.',
  'camp.map.local': 'AREA  {km} km across  Z: whole',
  'camp.map.whole': 'SYSTEM  {km} km across  Z: area',
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
  'camp.nudge.launch': 'Press 1, then 1, to launch the wing.',
  'camp.nudge.attack': 'Press 1, then 2, to send the fighters at the aliens.',
  'camp.ui.mother': 'MOTHERSHIP',
  'camp.ui.missiles': 'F  MISSILES  {n}',
  'camp.ui.missilenext': 'next in {s} s',
  'camp.ui.pausehelp': 'Hold Space: the turrets fire at ships close by. F fires a homing missile at the mothership or the nearest big ship.',
  'camp.tech.shield.name': 'Shield grid',
  'camp.tech.shield.text': 'The carrier takes 40 percent less damage.',
  'camp.tech.beam.name': 'Beam turrets',
  'camp.tech.beam.text': 'The turrets fire beams: twice the damage, further, and through what they hit.',
  'camp.tech.blink.name': 'Warp blink',
  'camp.tech.blink.text': 'Press Q to hop the carrier 1,500 px ahead. Ready again after 20 seconds.',
  'camp.tech.plating.name': 'Hull plating',
  'camp.tech.plating.text': 'The carrier\'s hull is half as strong again.',
  'camp.tech.bay2.name': 'Second bay',
  'camp.tech.bay2.text': 'Four more fighters in the bay.',
  'camp.tech.repair.name': 'Repair field',
  'camp.tech.repair.text': 'The carrier and the ships beside it mend as they fly.',
  // Settings > Sound > Music (card space-game-music, src/music.js): the one sentence under the row
  'music.use': 'Music is made by the game as you fly and steps back when the ship speaks. Effects is the engine, the drone and every shot and click; they ease off a little while music plays. M mutes all.'
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
