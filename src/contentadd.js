// ---------- Adding new things from markdown (card space-game-m9-add-new, docs/MODDING.md section 12) ----------
// src/contenttables.js lets a file CHANGE what the game already has. This file lets a file ADD something the game does not have yet: a voice
// line, a character for the bar, a call on the mission board, a ship for sale. Each type keeps to the same promises:
//   - a file with an id the code does not know becomes a new row, built from the file and from safe defaults; a field the file leaves out
//     is filled in from those defaults, so a short file is enough
//   - a new row is checked before it is put in (all or nothing: a file that cannot become a whole row adds nothing) and is counted:
//     CA_MAX is how many of each type a pack may add, and the rest are refused with a message that says so
//   - it never takes the place of a built-in row: an id the code already has is a change to that row, as before
//   - nothing here throws out of an adapter into the game: ContentLib.apply (src/content.js) catches it and reports it with the file's name
// The adapters are the ones registered in contenttables.js, wrapped here, so everything that file does for a change stays as it was.
// The types, in the order of the file:
//   voice    lines the ship computer says for an event (VOICE_ADDED in src/voice.js)
//   ship     a new player ship: a row of SHIP_MODELS (src/data_ships.js) drawn with the hull of one of the six built-in ships, and listed
//            in the yard of the stations its file names. New pirate ships and changes to the six built-in player ships are refused.
//   mission  a new call of one of the four kinds the game plays (rescue, escort, patrol, bounty): a row of MISSIONS that plays as its kind
//            and says what the file says, with its own entry in the HUD checklist (HUD_MISSIONS)
//   npc      a new character in the bar at Halcyon: a row of NPCS (src/shop.js) with a body drawn from their colour, standing on the nearest
//            free spot of the floor, with their lines, reactions and chat persona
const CA_MAX = { voice: 40, ship: 6, mission: 4, npc: 6 };
const caHas = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

// ---- voice: lines for an event ----
// A voice file is not a row of a table: its id (the file name) only keeps one file's lines apart from another's, so applying the same file twice
// replaces its lines instead of adding them again.
const CA_VOICE = {
  canAdd: true,
  has: id => VOICE_ADDED.has(id),
  get: () => undefined,
  apply: (id, data) => {
    if (!Array.isArray(data.lines) || !data.lines.length) throw new Error('a voice file needs a Lines list with at least one line');
    if (!VOICE_ADDED.has(id) && VOICE_ADDED.size >= CA_MAX.voice) throw new Error('a pack may add at most ' + CA_MAX.voice + ' voice files and there are that many already');
    VOICE_ADDED.set(id, { event: data.event, lines: data.lines.slice(), replace: data.replace === true });
  }
};
CONTENT_TABLES.voice = CA_VOICE;

// ---- ship: new player ships ----
// A file with side: player (or no side) and an id that is not one of the six built-in models adds a model. Numbers the file leaves out are the
// Wren's, so a three-line file already flies. The picture is the hull of one of the six built-in ships (art:, the Wren when it says nothing)
// and the role line says which, so the hangar tells the player the art is borrowed: SHIP_LOOK gets an entry of its own with the file's name.
// The ship is sold at the stations in yard: (the home station when it names none), by adding its id to that station's dock.yard.
const CA_SHIP_ART = ['wren', 'kite', 'ox', 'talon', 'pathfinder', 'bastion'];
const CA_SHIP_NUM = ['hull', 'speed', 'boost', 'accel', 'turn', 'tank', 'fuelPerLy', 'range', 'cargo', 'guns', 'sensor', 'price'];
const CA_SHIPS = new Set(); // the ids this file added
const CA_BUILTIN_SHIPS = Object.keys(SHIP_MODELS);
const CA_SHIP = {
  canAdd: true,
  has: id => CT_SHIP.has(id) || caHas(SHIP_MODELS, id),
  get: (id, f) => CT_SHIP.has(id) ? CT_SHIP.get(id, f) : (caHas(SHIP_MODELS, id) && CA_SHIPS.has(id) ? SHIP_MODELS[id][f] : undefined),
  apply: (id, data) => {
    if (CT_SHIP.has(id)) return CT_SHIP.apply(id, data);                       // a pirate of enemies.js: a change, as before
    if (CA_BUILTIN_SHIPS.includes(id)) throw new Error(id + ' is one of the six built-in ships and cannot be changed from a file yet. Use another file name for a new ship');
    if (data.side === 'pirate') throw new Error('new pirate ships cannot be added: how a pirate flies and where it appears is code. Only the raider, drone and gunship can be changed');
    const art = data.art === undefined || data.art === 'ship' ? 'wren' : data.art;
    if (!CA_SHIP_ART.includes(art)) throw new Error('art is "' + art + '" but a player ship takes the hull of one of ' + CA_SHIP_ART.join(', '));
    if (!CA_SHIPS.has(id) && CA_SHIPS.size >= CA_MAX.ship) throw new Error('a pack may add at most ' + CA_MAX.ship + ' ships and there are that many already');
    if (data.price !== undefined && data.price < 1) throw new Error('price is ' + data.price + ' but a ship for sale costs at least 1 (0 is the free starter)');
    const yard = data.yard !== undefined ? data.yard : ['halcyon-station'], at = yard.map(sid => { const st = fleetStation(sid); if (!st) throw new Error('yard names "' + sid + '", which is not a station in this game'); return st; });
    // everything checked: now build the row, then put it in
    const base = SHIP_MODELS.wren, look = SHIP_LOOK[art], row = { id, name: data.name, role: (data.role || 'new ship'), side: 'player', art, added: true, partMult: 1, maxTier: Object.assign({}, base.maxTier) };
    CA_SHIP_NUM.forEach(k => { row[k] = data[k] !== undefined ? data[k] : base[k]; });
    if (data.price === undefined) row.price = 5000;
    if (data.description !== undefined) row.desc = data.description;
    if (data.hangarLine !== undefined) row.line = data.hangarLine;
    SHIP_MODELS[id] = row; CA_SHIPS.add(id);
    SHIP_LOOK[id] = Object.assign({}, look, { name: data.name, role: row.role + ' (' + SHIP_MODELS[art].name + ' hull)' });
    at.forEach(st => {
      const d = st.body.dock || (st.body.dock = {}), list = Array.isArray(d.yard) ? d.yard : FLEET.yardFallback.slice();
      d.yard = list.includes(id) ? list : list.concat(id);
    });
  }
};
CONTENT_TABLES.ship = CA_SHIP;

// ---- mission: new calls of the four kinds the game can play ----
// What a call DOES (where the pod is, what the MULE flies past, which pirates are wanted, the Reaver) is the code of its kind in missions.js,
// surface.js and hud.js; what it SAYS and PAYS is data. A file with kind: patrol and a new id is a second police patrol: its own title, its
// own pay, its own count, its own words. It starts as a copy of the built-in call of that kind, so every text a file leaves out is the kind's
// own, except those that carry a number of the original (the patrol's five), which are rebuilt from this call's count.
// A site call (kind salvage or survey; card space-game-site-calls-from-files) is added too: its file names a system and a site of that
// system (src/missions.js siteRowFrom), so a new system can have a call of its own. It is no copy of a pattern: the row is made from the file.
// Not added: the courier and haul runs are built in (src/missions.js: their routes are code, and a file with their id changes their words and pay), but a pack cannot add a new one yet; the kind is refused by name.
const CA_MISSION_KINDS = ['rescue', 'escort', 'patrol', 'bounty'];
const CA_MISSION_KEYS = ['5', '6', '7', '8']; // the board's number keys for added calls (the four built-in ones use 1 to 4)
const CA_MISSIONS = new Set();
const CA_MISSION = {
  canAdd: true,
  has: id => CT_MISSION.has(id),
  get: (id, f) => CT_MISSION.get(id, f),
  apply: (id, data, isNew) => {
    if (!isNew) return CT_MISSION.apply(id, data);          // a built-in call, or one of ours seen again: a change, as before
    const site = typeof SITE_KINDS !== 'undefined' && SITE_KINDS.includes(data.kind);
    if (!site && !CA_MISSION_KINDS.includes(data.kind)) throw new Error('kind is "' + data.kind + '" but a pack can add only ' + CA_MISSION_KINDS.concat(SITE_KINDS).join(', ') + ' calls so far (the courier and haul runs are built in, with their routes in code: a pack can change them but not add one)');
    if (CA_MISSIONS.size >= CA_MAX.mission) throw new Error('a pack may add at most ' + CA_MAX.mission + ' calls to the board and there are that many already');
    if (!CA_MISSION_KEYS.some(k => !MISSIONS.some(m => m.key === k))) throw new Error('the board has no free number key left for another call');
    if (site) { // a site call: the row is the file's own (it throws, in words, when the system or the site is not there)
      const row = Object.assign(siteRowFrom(id, data), { key: CA_MISSION_KEYS.find(k => !MISSIONS.some(m => m.key === k)), added: true });
      MISSIONS.push(row); CA_MISSIONS.add(id);
      try { CT_MISSION.apply(id, data); } catch (e) { MISSIONS.splice(MISSIONS.indexOf(row), 1); CA_MISSIONS.delete(id); throw e; } // all or nothing
      return;
    }
    const tmpl = MISSIONS.find(m => m.id === data.kind);   // the built-in call of this kind: its row is the pattern
    const row = Object.assign({}, tmpl, {
      id, kind: data.kind, key: CA_MISSION_KEYS.find(k => !MISSIONS.some(m => m.key === k)), added: true,
      title: data.title, where: data.where !== undefined ? data.where : tmpl.where, reward: data.reward,
      line: ctOrig(tmpl, 'line'), progress: ctOrig(tmpl, 'progress')   // the code's own functions of the kind, not a pack's wrapper round them (its {reward} is the pattern's)
    });
    delete row.unlock;                                     // the pattern's own lock (the bounty opens after a patrol) is not this call's
    row.offer = row.title + ' - ' + row.where;             // until the file says better
    if (data.kind === 'patrol') {
      row.count = 5;
      row.line = st => st === 'failed' ? 'Failed. The pirates got away' : row.title + ': ' + (G.missionProgress | 0) + ' of ' + row.count + ' wanted pirates down';
      row.progress = () => 'Wanted pirates destroyed: ' + (G.missionProgress | 0) + ' of ' + row.count + '.\nThey wait on the approach to the station.';
    }
    const hud = typeof HUD_MISSIONS !== 'undefined' ? HUD_MISSIONS[data.kind] : null;
    if (hud) HUD_MISSIONS[id] = Object.assign({}, hud, { steps: hud.steps.slice() });
    MISSIONS.push(row); CA_MISSIONS.add(id);
    try { CT_MISSION.apply(id, data); }                    // the title, the pay and every text of the file, the way a change says them
    catch (e) { MISSIONS.splice(MISSIONS.indexOf(row), 1); CA_MISSIONS.delete(id); if (hud) delete HUD_MISSIONS[id]; throw e; } // all or nothing
  }
};
CONTENT_TABLES.mission = CA_MISSION;

// ---- npc: new characters in the bar ----
// A file with an id the bar does not know adds a character. They need a name and at least one line; everything else has a default: the cyan
// of the HUD, a body drawn from their colour (the coat is the colour, darkened; hair, skin and one extra come from the id, so two new
// characters do not look alike: src/interior.js draws it from the row's look), no reactions, no persona (the chat then uses "name, role, a
// regular on Halcyon Station"). They stand where the file says if that spot is free, and on the nearest free spot if not: the floor of
// the bar is the box below, minus the walls, the counter, the two tables, the doorway lane and a body's width round every other character.
const CA_BAR = { x0: 52, x1: 828, y0: 470, y1: 646 };                       // the walkable floor of the bar, with a margin for the walls (station.js, shop.js)
const CA_BAR_BOXES = [[20, 420, 380, 20], [520, 420, 340, 20], [860, 0, 20, 720], [90, 596, 330, 26], [598, 498, 44, 44], [178, 478, 44, 44]]; // [x, y, w, h] solid
const CA_DOOR = { x0: 376, x1: 544, y1: 540 };                              // the doorway into the bar and the lane below it: nobody stands here
const CA_NPCS = new Set();
function caSpotFree(x, y, self) {
  if (x < CA_BAR.x0 || x > CA_BAR.x1 || y < CA_BAR.y0 || y > CA_BAR.y1) return false;
  if (x > CA_DOOR.x0 && x < CA_DOOR.x1 && y < CA_DOOR.y1) return false;
  if (CA_BAR_BOXES.some(([bx, by, bw, bh]) => x > bx - 30 && x < bx + bw + 30 && y > by - 30 && y < by + bh + 30)) return false;
  return !NPCS.some(n => n !== self && Math.hypot(n.x - x, n.y - y) < 48);
}
function caSpot(x, y, self) { // the free spot nearest to (x, y), looked for in rings of 12 px; null when the bar has no room
  const cx = Math.min(CA_BAR.x1, Math.max(CA_BAR.x0, x)), cy = Math.min(CA_BAR.y1, Math.max(CA_BAR.y0, y));
  for (let r = 0; r <= 800; r += 12) {
    let best = null, bd = Infinity;
    for (let a = 0; a < (r ? 36 : 1); a++) {
      const px = Math.round(cx + Math.cos(a / 36 * Math.PI * 2) * r), py = Math.round(cy + Math.sin(a / 36 * Math.PI * 2) * r);
      if (caSpotFree(px, py, self)) { const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { x: px, y: py }; } }
    }
    if (best) return best;
  }
  return null;
}
function caLook(id, css) { // what interior.js draws for a character a pack adds
  let h = 7; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const col = parseInt(String(css).slice(1), 16), coat = inMix(col, 0x0a0a14, 0.62);
  const extra = [{ visor: col }, { cap: coat }, { goggles: 0xbfffd8 }, { pack: inMix(col, 0x000000, 0.75) }, {}, { bun: true }][(h >> 6) % 6];
  return Object.assign({ coat, edge: col, hair: [0x20150e, 0x2a1408, 0x103018, 0x8a8a94, 0xdcdcec, 0x3a2418][h % 6], skin: [0xd8a47a, 0xb07850, 0xe0b090, 0xc8946a, 0x9a6a48, 0xe8c0a0][(h >> 3) % 6] }, extra);
}
const CA_NPC = {
  canAdd: true,
  has: id => CT_NPC.has(id),
  get: (id, f) => CT_NPC.get(id, f),
  apply: (id, data, isNew) => {
    if (!isNew && !CA_NPCS.has(id)) return CT_NPC.apply(id, data);   // a built-in character: a change, as before
    if (!CA_NPCS.has(id)) {
      if (!Array.isArray(data.lines) || !data.lines.length) throw new Error('a character needs a Lines list with at least one line to say');
      if (CA_NPCS.size >= CA_MAX.npc) throw new Error('a pack may add at most ' + CA_MAX.npc + ' characters to the bar and there are that many already');
      if (data.station !== undefined && data.station !== homeDock()) throw new Error('station is "' + data.station + '" but only the bar at ' + (sysBody('station') || {}).name + ' exists so far');
      const css = data.color !== undefined ? data.color : '#38e1ff';
      const row = { id, name: data.name, role: '', color: ctHex(css), css, x: 0, y: 0, face: 0, lines: [], react: () => null, sprite: 'mod-' + id, added: true };
      row.look = caLook(id, css);
      const spot = caSpot(data.x !== undefined ? data.x : 560, data.y !== undefined ? data.y : 600, row);
      if (!spot) throw new Error('there is no free spot left on the floor of the bar');
      row.x = spot.x; row.y = spot.y;
      NPCS.push(row); CA_NPCS.add(id);
      try { CT_NPC.apply(id, data); }                                // role, voice, face, label, appears, lines, reactions, persona
      catch (e) { NPCS.splice(NPCS.indexOf(row), 1); CA_NPCS.delete(id); throw e; } // all or nothing
      row.x = spot.x; row.y = spot.y;                               // the base apply put the file's own x and y in: back to the free spot
      return;
    }
    const row = NPCS.find(n => n.id === id);                          // one of ours seen again: say it again
    CT_NPC.apply(id, data);
    const at = caSpot(row.x, row.y, row); if (at) { row.x = at.x; row.y = at.y; }  // (an x and y the file gives are looked at again: the nearest free spot)
  }
};
CONTENT_TABLES.npc = CA_NPC;
