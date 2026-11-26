// ---------- The page HUD: the Campaign's flight HUD as page elements over the canvas (card space-game-page-hud; Troy, 24 Nov 2026: "rebuild the Campaign's flight HUD as page elements over the game canvas, in the look of the agent board"; the mock is docs/hud-mock.html) ----------
// The canvas draws bold text and hard outlines, which cannot do soft panels or a good typeface; ordinary page elements styled with CSS can. This file is a VIEW: it reads the same pure functions the canvas HUD reads (campCruiserStatus, campSelList and
// campTdispDoing, the key table) and gives no orders. Ships, fights, the map and every rule stay as they are, and the canvas HUD is KEPT: the page HUD is behind one switch, OFF by default (CAMP.flags.pagehud: a row of the N panel, or the address flag ?pagehud=1).
// While it is on, the canvas parts it replaces are not drawn (campPageHudHides: the shield and hull plate, the Q CRUISER and W rows) and the lists and details that open under those rows open under the page panel instead (CAMP_CORNER_SHIFT, src/campcorner.js).
//   THE LANDINGS  1 the cruiser and the pilots (this file's first panel); 2 the goal and the stock (ore, missiles); 3 the hostiles, the friendlies and the pills in space. Each is a piece of CAMP_PAGEHUD.hides and a panel below.
//   THE RULES     no image files, no libraries, no web font (the typeface is the system one, two weights, 400 and 600: src/camppagehud.css); every key chip reads the key table (src/data_controls.js), no letter is written here;
//                 the HUD is updated 10 times a second at most (CAMP_PAGEHUD.every) and an element is written only when its value changed (a repainted label every frame was a large cost); sizes are em of one font size set from the canvas width
//   campPageHudOn()                    is the page HUD on: always, for a player (the flag CAMP.flags.pagehud is true in the table; no row of the N panel, nothing is remembered: card space-game-page-hud-default-on); off only by ?pagehud=0 (also off, false, no) in the address, for the tests and a comparison, or by a test setting the flag false; ?pagehud=1 is on whatever the flag says
//   campPageHudHides(id)               true when the page HUD has what the canvas shows under this name ('status', or a corner's id): the canvas leaves it out
//   campPageModel(C)                   PURE: what each panel shows now: { ship: { key, label, shield: { frac, n, show }, hull: {...} }, pilots: { key, items: [{ id, name, initial, digit, frac, color, on, pick }], doing, who },
//                                      goal: { label, value, frac (null: no meter), tone } | null, stock: { ore: { frac }, missiles: { n, cap, building, key } },
//                                      foes: { key, label, what, dir, km } | null (the nearest group of hostiles seen), friend: { key, label, name, frac, km } | null (a friendly is picked),
//                                      edge: { n, km, angle, x, y } | null (hostiles off the screen: the nearest group's arrow), fedges: [{ id, n, name, km, text, hot, angle, x, y }] (the ships you protect that are off the screen: one pill each, in game px, slid along the edge off each other and off the hostiles' pill; needs `view`), places: [{ name, x, y }] (the places in view, in game px; needs `view`: { x, y, zoom }) } }
//   campPageHudBuild(doc)              the elements, made once: { root, ship: {...refs} }
//   campPageHudPaint(R, M)             writes the model into the elements: only what changed
//   campPageHudSync(s, now)            the scene calls it every frame (src/campaignscene.js): at most 10 times a second it builds, places and paints the HUD, and takes it away when the switch is off or the scene is over; while a full card is up (the pause card, the H page, the N panel, Settings, the ready room) the panels are hidden, not taken away (campPageHudCovered)
const CAMP_PAGEHUD = {
  em: 0.0112,              // the HUD's font size: this share of the canvas width (about 1.1 percent), so it scales with the window
  every: 100,              // ms between two updates: 10 a second
  low: 0.6, crit: 0.3,     // a pilot's ring: the good colour, the warning colour under 60 percent of the hull, the hostile colour under 30
  addr: 'pagehud',         // the address flag: index.html?campaign=1&pagehud=0 draws the canvas HUD (tests and comparison only); =1 is on whatever the flag says
  memo: { s: null, v: null }, // the address as last read and its value (campPageHudAddrVal)
  pills: 6,                // the most place pills at once
  fedges: 4,               // the most pills at the edge for the ships you protect (card space-game-page-hud-friend-edge-pill): the nearest first
  kinds: 2,                // the most kinds of hostile the HOSTILES panel names (card space-game-b3-d-panel-cap-pill-goal; Troy's decision 7): the two most dangerous, then +N for the ships of the others
  first: { ids: ['fly', 'fire', 'missile'] }, // the bottom key row (card space-game-page-hud-first-minute-chips made it a row of the first minute of mission 1.1; card space-game-bottom-row-enter-chip, Troy, 25 Nov 2026: it stays up all the time, in every mission, with a fourth chip, Enter and its verb): the ids of its first three chips are the key table's, in the order they sit
  hides: ['status', 'cruiser', 'fleet', 'goal', 'stock', 'hostiles', 'friendlies', 'sight', 'contact', 'places', 'keys', 'box:friendlies', 'box:fleet', 'box:hostiles', 'mother', 'post', 'chat'] // what the canvas leaves out while the page HUD is on: landing 1 (the cruiser panel and the pilots), 2 (the goal line and the wave line; the ore and missiles block), 3 (the rows of the HOSTILES and FRIENDLIES corners (their details stay, under the panels, except the friendlies' box and the W box of the pilots' pick, which the grown rings replace, and the hostiles' box, whose details are in the hostiles panel: box:friendlies, box:fleet, box:hostiles), the edge arrows of the hostiles and of the ships you protect (pills at the edge of the page: the hostiles' and a pill for each ship off the screen), the labels of the places in the world, the bottom key line)
};

// ---- the switch ----
function campPageHudAddrVal(search) { // the value of ?pagehud in the address, lower case: null when it is not there, '' for a bare ?pagehud (the last one counts); the page's own address is read again only when it changed (this is asked many times a frame)
  try {
    const own = typeof search !== 'string', s = own ? (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '') : search, M = CAMP_PAGEHUD.memo;
    if (own && M.s === s) return M.v;
    let v = null; s.replace(/^[?#]/, '').split('&').forEach(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(); if (k === CAMP_PAGEHUD.addr) v = eq < 0 ? '' : p.slice(eq + 1).trim().toLowerCase(); });
    if (own) { M.s = s; M.v = v; }
    return v;
  } catch (e) { return null; }
}
function campPageHudAddr(search) { return ['', '1', 'on', 'true', 'yes'].indexOf(campPageHudAddrVal(search)) >= 0; } // ?pagehud, ?pagehud=1, =on, =true, =yes: on whatever the flag says
function campPageHudAddrOff(search) { return ['0', 'off', 'false', 'no'].indexOf(campPageHudAddrVal(search)) >= 0; } // ?pagehud=0, =off, =false, =no: off whatever the flag says (the tests' and the comparison's way to the canvas HUD; not shown to a player)
const campPageHudOn = () => !campPageHudAddrOff() && ((typeof campFlag === 'function' && campFlag('pagehud')) || campPageHudAddr());
const campPageHudHides = id => CAMP_PAGEHUD.hides.indexOf(id) >= 0 && campPageHudOn();

// ---- the model (pure) ----
function campPageHudBar(d, id) { // a meter: its share, its word, and a percentage that shows ONLY while it is below 100 (card space-game-page-hud-3, option D of docs/hud-mock-2.html)
  const frac = d.frac, pct = Math.max(0, Math.min(99, Math.floor(frac * 100)));
  return { frac, pct, show: frac < 1, word: uiText('camp.corner.m.' + id) };
}
const campPageHudColor = frac => frac < CAMP_PAGEHUD.crit ? 'foe' : frac < CAMP_PAGEHUD.low ? 'warn' : 'good';
// a ring of the fleet row (a pilot or a ship you protect): the ring is the hull in the usual colours; what is INSIDE it is ONE switch (the flag 'pagedigit' of the N panel; Troy, 25 Nov 2026: the DIGIT, so the key is always on the screen; false: the initial);
// what is under it, only while its pick is open, is the name alone when the digit is inside (the initial inside: the digit and the name, "1 Wedge")
function campPageHudRing(name, number, frac, on, pick, alive) { // on: out in space (dim is resting: in the bay); alive: false only for a ship you protect that is lost (it is dark, and keeps its number)
  const digit = String(number), initial = String(name).charAt(0).toUpperCase() || digit, inner = typeof campFlag === 'function' && campFlag('pagedigit');
  return { name, initial, digit, text: inner ? digit : initial, under: inner ? name : digit + ' ' + name, frac, color: campPageHudColor(frac), on, alive, pick };
}
// the ships you protect as numbered rings: 2-GEN's pure list (card space-game-keys8-e-digit, src/camptarget.js campFriNumbered: { id, name, number, alive, hull, picked }); a ship that is lost keeps its number and is dark
function campPageHudShips(C) {
  const L = typeof campFriNumbered === 'function' ? campFriNumbered(C) : [];
  return L.map(e => Object.assign(campPageHudRing(String(e.name || ''), e.number, e.alive ? e.hull : 0, !!e.alive, !!e.picked, !!e.alive), { id: e.id }));
}
function campPageModel(C, view) {
  if (!C || !C.carrier) return null;
  const S = campCruiserStatus(C);
  const ship = { key: campCornerCap('zoomreset'), shield: campPageHudBar(S.shield, 'shield'), hull: campPageHudBar(S.hull, 'hull') };
  const rows = typeof campPanelDef === 'function' && campPanelDef('fleet') ? campPanelList(C, 'fleet').filter(r => r.who && r.who !== 'all') : [], stops = typeof campSelList === 'function' ? campSelList(C) : [], now = typeof campSelNow === 'function' ? campSelNow(C) : null;
  const items = rows.map((r, i) => {
    const e = stops.find(x => x.id === r.who), u = e && e.unit, up = !!u && u.hp > 0 && !u.gone, name = e ? e.name : campSelPilotName(null, String(r.who).replace(CAMP_SELPILOT, '')), frac = up ? campTdispHull(u).share : 0;
    return Object.assign(campPageHudRing(name, i + 1, frac, up, !!now && (now.kind === 'all' || now.id === r.who), true), { id: r.who }); // pick: the ring has its outline and the digit is lit (All pilots outlines every one: card space-game-w4-all-lit); on: out in space (dim is resting, in the bay)
  });
  const open = typeof campCornerPanelId === 'function' ? campCornerPanelId() || '' : '', ships = campPageHudShips(C), edge = campPageHudEdge(C, view), fedges = campPageHudFriendEdges(C, view, edge); // open: the pick that is open now, '' none (the rings of that group grow in place)
  const was = {}; if (edge) was.hostiles = true; fedges.forEach(f => { was[f.id] = true; }); // the pills that show now: the next look at the ships (view.was) keeps them a little longer (campEdgeOffscreen: no flicker at the edge)
  return { first: campPageHudFirst(C), ship, goal: campPageHudGoal(C), stock: campPageHudStock(C), foes: campPageHudFoes(C), mother: campPageHudMother(C), hint: campPageHudHint(C), edge: edge, fedges, was, places: campPageHudPlaces(C, view),
    pilots: { key: campCornerCap('who'), items, open: open === 'fleet' },
    friends: { key: campCornerCap('friendlies'), items: ships, open: open === 'friends', enter: ships.some(x => x.pick) ? campPageHudEnter(C, 'guard') : null } }; // enter: the Enter chip and Guard, while a ship you protect is picked
}

// the order Enter gives now, for the bottom row's fourth chip (card space-game-bottom-row-enter-chip; Troy, 25 Nov 2026): the SAME dry run the left panel's Enter chip asks (campPageHudEnter), here for all three verbs: Attack (a hostile picked), Guard (a friendly picked) and Form up (nothing picked); null while no order can be given (no pilot out and none to launch, nothing in sight to attack ...). The word is the left panel's (camp.corner.enter.attack and .guard) and the form-up row's (camp.corner.formup); the chip is the key table's order key
function campPageHudEnterNow(C) {
  if (typeof campSelOrder !== 'function' || !C) return null;
  const r = campSelOrder(C, 'engage', 'key', true); if (!r || !r.ok) return null;
  const verb = r.formup ? 'formup' : r.verb, key = campCornerCap('order'); if (!key) return null;
  return { key, word: uiText(verb === 'formup' ? 'camp.corner.formup' : 'camp.corner.enter.' + verb), verb };
}
// the bottom key row (cards space-game-page-hud-first-minute-chips and space-game-bottom-row-enter-chip; Troy, 25 Nov 2026): one dim row of key chips, each with a word (the arrows: fly, Space: fire, M: missile, and Enter with the verb it gives now, campPageHudEnterNow), UP ALL THE TIME in every mission (it was the first minute of mission 1.1 only: Troy, playing, asked for it to stay, with the fourth chip). It hides as the other panels do: the page HUD is drawn only in play and pause with the map closed, so a card, the briefing or the map covers it; and not when the hints are switched off (the tuning panel: it is a hint) or once the battle has a result. The caps are the key table's (campCornerCap of its ids), the words are the text keys camp.corner.chip.<id>; a key with no cap is left out. a is its strength (1: it no longer fades out; the dim is the view's); null when it is not shown. (The model keeps its first-minute name: the card names, the tests and the view call it `first`.)
function campPageHudFirst(C) {
  const F = CAMP_PAGEHUD.first;
  if (!C || C.result || (typeof campFlag === 'function' && !campFlag('hints'))) return null;
  const items = F.ids.map(id => ({ id, key: campCornerCap(id), word: uiText('camp.corner.chip.' + id) })).filter(x => x.key), en = campPageHudEnterNow(C);
  if (en) items.push({ id: 'enter', key: en.key, word: en.word, verb: en.verb }); // a fourth chip, Enter and its verb, only while an Enter action is available; it follows the pick (card space-game-bottom-row-enter-chip)
  return items.length ? { items, a: 1 } : null;
}

// the goal (landing 2): the objective sentence of the level (campObjective: the first objective not done yet, so a second one shows only when it is the next thing to do) split at its colon into a label and a value ("Mine ore: 120 of 450." is "Mine ore" and
// "120 / 450"), with a meter when the objective is counted (campObjectives: got of need, and a value to show); no wave count (the wave line is gone). null when the level has no goal line (nothing is drawn)
function campPageHudGoal(C) {
  const full = typeof campObjective === 'function' ? campObjective(C) : ''; if (!full) return null;
  const objs = C.L && C.L.objectives && typeof campObjectives === 'function' ? campObjectives(C) : null, o = objs ? objs.find(x => !x.done) : null, i = full.indexOf(': ');
  const label = i > 0 ? full.slice(0, i) : full.replace(/\.$/, ''), value = i > 0 ? full.slice(i + 2).split(/\.\s/)[0].replace(/\.$/, '').replace(/ of /, ' / ') : '', need = o && o.need >= 1 && value ? o.need : 0; // a meter when the objective is counted (it has a value to show)
  return { label, value, frac: need ? Math.max(0, Math.min(1, o.shown / need)) : null, tone: o && (o.type === 'ore' || o.type === 'cashin') ? 'ore' : 'good' };
}
// the stock (landing 2): the ore as a meter, the missiles as one pip each with the reload key's chip (the key table's). The credits are not shown in flight
// the build under way (card space-game-page-hud-reload-progress; Troy, 25 Nov 2026): how far the missile being built is, 0 to 1 (C.reloadAt is when it is done, the build time is campReload(C), CAMP.missile.reload: nothing typed here; src/campmissilebuild.js), 0 when none is building. The next empty pip fills with it and turns solid when it lands; queued (C.queued) is the builds waiting behind it, shown as +N to the right of the pips. What R does, its cost and its time are not touched
function campPageHudReloadFrac(C) {
  if (!(C.reloadAt > 0)) return 0;
  const total = typeof campReload === 'function' ? campReload(C) : CAMP.missile.reload;
  return total > 0 ? Math.max(0, Math.min(1, 1 - (C.reloadAt - C.t) / total)) : 1;
}
function campPageHudStock(C) {
  const S = campCruiserStatus(C), M = S.missiles;
  return { ore: { frac: S.ore.cap > 0 ? Math.max(0, Math.min(1, S.ore.n / S.ore.cap)) : 0, full: !!S.ore.full, word: uiText('camp.corner.m.ore') }, missiles: { n: M.n, cap: M.cap, building: M.state === 'building', progress: campPageHudReloadFrac(C), queued: Math.max(0, Math.floor(C.queued || 0)), key: campCruiserMissileKey(), word: uiText('camp.corner.m.missiles') } };
}

// the hostiles (landing 3): drawn ONLY when a hostile is seen: the nearest group, what it is ("3 Skiffs" or "6 hostiles", the sight's own words), where (a compass point, the sight's words) and how far
// the mothership's hull (card space-game-b3-c-radio-panel; the cloud brief 3, Troy: item 5): the canvas drew its bar and the word MOTHERSHIP at the top centre, under the column of lines, for as long as it lives; now a hull meter in the hostiles panel, in the aliens' violet, with the same word: { frac, pct, show, word } or null when there is none. The panel is up for it
// even when no hostile is seen yet or none is picked (the canvas bar was there at once), as its own group: campPageHudFoesAlone
const campPageHudMotherShip = C => (C && C.ships ? C.ships.find(u => u.kind === 'mother' && u.hp > 0) : null) || null;
function campPageHudMother(C) {
  const m = campPageHudMotherShip(C); if (!m) return null;
  return Object.assign(campPageHudBar({ frac: Math.max(0, Math.min(1, m.hp / (m.maxHp || m.hp || 1))) }, 'hull'), { word: uiText('camp.ui.mother') });
}
function campPageHudFoesAlone(C) {
  const m = campPageHudMotherShip(C); if (!m || !C.carrier) return null;
  const c = C.carrier, g = { kinds: { mother: 1 }, x: m.x, y: m.y, dist: Math.hypot(m.x - c.x, m.y - c.y) };
  return { key: campCornerCap('hostiles'), label: uiText('camp.corner.hostiles'), enter: campPageHudEnter(C, 'attack'), what: campPageHudWhat(g.kinds, typeof campSightKnown === 'function' ? campSightKnown(C, g.x, g.y) : false), dir: campSightDir(g.x - c.x, g.y - c.y), km: uiText('camp.tdisp.km', { km: campNavKm(g.dist) }), target: null };
}
// the second line of the goal panel (item 10 of the brief): what the canvas wrote under the goal at the top centre in amber, the hint to dock where an outpost is in reach and worth it (ore to sell, a hurt hull) and the retreat line when the hull is low with no ship left
// (src/campoutpost.js: the same functions the canvas asked: campRetreat, campDockHint): { text, tone: 'warn' (the dock hint) | 'foe' (the retreat) } or null
function campPageHudHint(C) {
  if (!C) return null;
  const rt = typeof campRetreat === 'function' ? campRetreat(C) : null; if (rt && rt.line) return { text: rt.line, tone: 'foe' };
  const nr = typeof campDockHint === 'function' ? campDockHint(C) : ''; return nr ? { text: nr, tone: 'warn' } : null;
}
function campPageHudFoes(C) {
  const gs = typeof campSightGroups === 'function' ? campSightGroups(C, true) : [], t = campPageHudTarget(C); if (!gs.length && !t) return campPageHudFoesAlone(C);
  const c = C.carrier, g = gs[0] || { kinds: { [t.u.kind]: 1 }, x: t.u.x, y: t.u.y, dist: Math.hypot(t.u.x - c.x, t.u.y - c.y) }; // a picked ship nothing groups (a tower: always seen) is its own group
  return { key: campCornerCap('hostiles'), label: uiText('camp.corner.hostiles'), enter: campPageHudEnter(C, 'attack'), what: campPageHudWhat(g.kinds, typeof campSightKnown === 'function' ? campSightKnown(C, g.x, g.y) : false), dir: campSightDir(g.x - c.x, g.y - c.y), km: uiText('camp.tdisp.km', { km: campNavKm(g.dist) }), target: t };
}
// how dangerous a kind of hostile is, read from the game's own tables (card space-game-b3-d-panel-cap-pill-goal): its hull (a rival ship's: hull and shield) times what one volley takes off: a shot's damage times the shots of a spread, or a torpedo boat's torpedoes' damage times its tubes; 0 for a kind no table has
function campPageHudDanger(kind) {
  const B = CAMP.torpedo && CAMP.torpedo.boats[kind], R = CAMP.rival && CAMP.rival.kinds[kind], P = CAMP.pirate && CAMP.pirate.kinds[kind], A = typeof PIRATES === 'object' ? PIRATES[kind] : null, spread = row => (row && row.spread) || 1;
  if (B) return B.hp * CAMP.torpedo.torp.dmg * B.tube.n;
  if (R) return (R.hull + (R.shield || 0)) * R.dmg * spread(typeof PIRATES === 'object' ? PIRATES[R.base] : null);
  if (P) return P.hp * P.dmg * spread(typeof PIRATES === 'object' ? PIRATES[P.base] : null);
  return A ? A.hp * A.dmg * spread(A) : 0;
}
// what the hostiles panel says the group is: at most CAMP_PAGEHUD.kinds kinds, the most dangerous (campPageHudDanger; the more of them, then the name, when they are as dangerous), in the order the sight and the radio give them (the most of them first), then +N, the ships of the kinds left out ("4 Skiffs, 2 Cutters +3"). The radio's call (campSightWhat) keeps every kind; with the kinds not known ("6 hostiles") the sight's own words
function campPageHudWhat(kinds, named) {
  if (!named) return campSightWhat(kinds, named);
  const ks = Object.keys(kinds).sort((a, b) => campPageHudDanger(b) - campPageHudDanger(a) || kinds[b] - kinds[a] || (a < b ? -1 : 1)), keep = ks.slice(0, CAMP_PAGEHUD.kinds), rest = ks.slice(keep.length).reduce((n, k) => n + kinds[k], 0);
  const shown = keep.sort((a, b) => kinds[b] - kinds[a] || (a < b ? -1 : 1)).map(k => uiText('camp.sight.kind.' + (kinds[k] === 1 ? 'one' : 'many'), { n: kinds[k], kind: campSightKindName(k) })).join(', ');
  return rest > 0 ? shown + ' ' + uiText('camp.sight.more', { n: rest }) : shown;
}
// the picked target's details (card space-game-page-hud-target-details; Troy, 25 Nov 2026): what the canvas box of the HOSTILES showed (it is hidden while the page HUD is on), as meters in the look of the cruiser's: its hull, its shield (a word saying "no shield" when it has none) and what it is doing, in a few words (campTdispDoing: "Attacking the cruiser"). The ship the canvas box shows: the target held, or the ship an order's list is on (campTcornerInfo 'host'); null when there is none, and the panel is its short form
// the picked target's flat-cut picture (card space-game-page-hud-target-picture; Troy's decision 8 of the ship look): { kind, side } of the ship's look (src/shiplook.js: a pirate pink, an alien violet), drawn as an inline SVG by slookPicSvg (src/shiplookpic.js), while the new look's switch is on; null (no picture) with it off or for a kind the table has no row for
function campPageHudTargetPic(u) { return u && typeof slookOn === 'function' && slookOn() && typeof slookPicSvg === 'function' && SLOOK.K[u.kind] ? { kind: u.kind, side: slookSide(u, false) } : null; }
function campPageHudTarget(C) {
  const info = typeof campTcornerInfo === 'function' ? campTcornerInfo(C, 'host') : null, sub = info && info.subject, u = sub && sub.side === 'hostile' ? sub.u : null; if (!u || !(u.hp > 0)) return null;
  const sh = typeof campTdispShield === 'function' ? campTdispShield(C, u) : null, doing = typeof campTdispDoing === 'function' ? String(campTdispDoing(C, u) || '') : '';
  return { id: u.id, u, pic: campPageHudTargetPic(u), hull: campPageHudBar({ frac: campTdispHull(u).share }, 'hull'), shield: sh ? campPageHudBar({ frac: sh.share }, 'shield') : null, noshield: sh ? '' : uiText('camp.tdisp.noshield'), doing: doing.charAt(0).toUpperCase() + doing.slice(1) };
}
// the Enter chip and the word of the order Enter gives now: the SAME function the key runs (campSelOrder 'engage', asked as a dry run: it gives no order), so the word is the order model's, the chip is the key table's; shown with a picked hostile (attack) or a picked friendly (guard); with nothing picked Enter forms up and there is no hint
function campPageHudEnter(C, verb) {
  if (typeof campSelOrder !== 'function' || !C) return null;
  const r = campSelOrder(C, 'engage', 'key', true); if (!r || r.formup || r.verb !== verb) return null;
  return { key: campCornerCap('order'), word: uiText('camp.corner.enter.' + verb), verb };
}
// hostiles off the screen: ONE pill at the edge with an arrow, the count and how far (the nearest group's arrow, src/campsight.js); null when none is off the screen or the camera is not known
function campPageHudEdge(C, view) {
  if (!view || typeof campSightArrows !== 'function') return null;
  const a = campSightArrows(C, { x: view.x, y: view.y }, W, H, view.zoom > 0 ? view.zoom : 1, { was: view.was || {} })[0]; if (!a) return null; // the pill's own rule: off the screen only (card space-game-edge-pills-position), no HUD rectangles
  const km = uiText('camp.tdisp.km', { km: campNavKm(a.dist) }), z = campPageHudPillSize(a.n + ' \u00b7 ' + km), px = Math.max(z.w / 2 + 6, Math.min(W - z.w / 2 - 6, a.x)), py = Math.max(z.h / 2 + 6, Math.min(H - z.h / 2 - 6, a.y)); // where the pill's middle ends up (whole on the screen): the arrow points at the group from there
  return { n: a.n, km, angle: Math.atan2(a.ty - py, a.tx - px), x: a.x, y: a.y, tx: a.tx, ty: a.ty }; // tx, ty: where the group is on the screen (a pill slid along the edge turns to it)
}
// a pill's size in game px, from its words (no DOM at the model: the font is CAMP_PAGEHUD.em of the width, the pill's .86 em; about .6 em a letter, its padding and the arrow; the height is the line and the padding, 2.6 of its em, as measured in a browser)
const campPageHudPillSize = text => { const em = W * CAMP_PAGEHUD.em * 0.86; return { w: (String(text).length * 0.6 + 3.4) * em, h: 2.6 * em }; };
// the pills at the edge keep clear of each other (card space-game-page-hud-friend-edge-pill): in order, the first keeps its place; each next one that would touch one put before it (the fixed ones first: the hostiles' pill) slides ALONG the border, the nearer way first, until it touches none (campEdgeT and campEdgeAt, src/campedgespread.js). items [{ x, y, w, h }], fixed [{ x, y, w, h }] (centres); returns [{ x, y, moved }]: the centre of each, kept whole on the screen (half its width and 6 px in from the sides, half its height and 6 from the top and bottom; a pill is as wide as its words)
function campPageHudEdgeFit(items, fixed) {
  const m = CAMP.nav.arrow.margin, pad = 4, step = 6, clamp = (p, it) => ({ x: Math.max(it.w / 2 + 6, Math.min(W - it.w / 2 - 6, p.x)), y: Math.max(it.h / 2 + 6, Math.min(H - it.h / 2 - 6, p.y)) }), can = typeof campEdgeT === 'function' && typeof campEdgeAt === 'function';
  const box = (p, it) => [p.x - it.w / 2, p.y - it.h / 2, p.x + it.w / 2, p.y + it.h / 2], meets = (a, b) => a[0] < b[2] + pad && a[2] > b[0] - pad && a[1] < b[3] + pad && a[3] > b[1] - pad;
  const taken = (fixed || []).map(it => box(it, it)), per = 2 * ((W - 2 * m) + (H - 2 * m));
  return items.map(it => {
    const p0 = clamp(it, it), t0 = can ? campEdgeT(p0.x, p0.y, W, H, m) : 0; let pick = null;
    for (let d = 0; d <= (can ? per / 2 : 0) && !pick; d += step) for (let s = 0; s < (d ? 2 : 1) && !pick; s++) {
      const p = d ? clamp(campEdgeAt(t0 + (s ? -d : d), W, H, m), it) : p0, b = box(p, it);
      if (!taken.some(r => meets(b, r))) pick = { x: p.x, y: p.y, moved: d > 0, b };
    }
    const r = pick || { x: p0.x, y: p0.y, moved: false, b: box(p0, it) }; taken.push(r.b); return { x: r.x, y: r.y, moved: r.moved };
  });
}
// does the page have the hostiles' pill now? (the last model: s.pageHud.last.edge): the canvas's amber goal arrow for the nearest hostile (src/campaignscene.js paintHud: "Pirate 201 km") is not drawn then, the pill carries it (card space-game-edge-pills-position)
function campPageHudHasFoePill(s) { const L = s && s.pageHud && s.pageHud.last; return !!L && !!L.edge; }
// does the page have a pill for this ship now? (the last model the scene's sync wrote, 10 a second: s.pageHud.last.fedges): the canvas's amber goal arrow (src/campaignscene.js paintHud) is not drawn for a ship that has one
function campPageHudHasPill(s, id) { const L = s && s.pageHud && s.pageHud.last; return !!id && !!L && Array.isArray(L.fedges) && L.fedges.some(f => f.id === id); }
// the pills at the edge keep clear of the page's PANELS too (card space-game-goal-panel-hides-text; Troy, playing 1.2: the hostiles' pill stood on the text of the HOSTILES panel at the right edge): the hostiles' pill and the ships' pills are fitted once more, in that order, against the rectangles of the panels that are
// up (panels: [{ x, y, w, h }], centres, game px: the page's own, read from the elements in campPageHudSync), each sliding along the border off them (campPageHudEdgeFit) and turning to its ship from where it ends. M: the model (edge, fedges); returns { edge: { x, y, angle } | null, fedges: [{ x, y, angle }] } in the same order.
function campPageHudEdgesClear(M, panels) {
  const items = [], z = t => campPageHudPillSize(t);
  if (M && M.edge) items.push(Object.assign({ x: M.edge.x, y: M.edge.y, tx: M.edge.tx, ty: M.edge.ty, angle: M.edge.angle }, z(M.edge.n + ' \u00b7 ' + M.edge.km)));
  ((M && M.fedges) || []).forEach(f => items.push(Object.assign({ x: f.x, y: f.y, tx: f.tx, ty: f.ty, angle: f.angle }, z(f.text))));
  const put = campPageHudEdgeFit(items, panels || []), out = items.map((it, i) => ({ x: put[i].x, y: put[i].y, angle: it.tx != null ? Math.atan2(it.ty - put[i].y, it.tx - put[i].x) : it.angle })); // every pill points at its ship from where it ends (card space-game-edge-pills-position)
  return { edge: M && M.edge ? out[0] : null, fedges: out.slice(M && M.edge ? 1 : 0) };
}
// the rectangles of the panels that are up now, in game px as centres { x, y, w, h }: every element of the root that is a panel (ph-p), not a pill (the edge pills and the place pills), shown; a rectangle as wide as the screen is no panel (a stand-in page's)
function campPageHudPanelRects(R, r, k) {
  const out = [], els = R && R.root && R.root.children ? Array.prototype.slice.call(R.root.children) : [];
  els.forEach(el => {
    const cls = String(el.className || ''); if (!/(^|\s)ph-p(\s|$)/.test(cls) || /(^|\s)ph-(edge|place)(\s|$)/.test(cls) || (el.style && el.style.display === 'none') || typeof el.getBoundingClientRect !== 'function') return;
    const rc = el.getBoundingClientRect(), x0 = (rc.left - r.left) / k, y0 = (rc.top - r.top) / k, w = rc.width / k, h = rc.height / k;
    if (!(w > 0) || !(h > 0) || w > W * 0.6 || h > H * 0.6) return;
    out.push({ x: x0 + w / 2, y: y0 + h / 2, w, h });
  });
  return out;
}
// the ships you protect that are off the screen: ONE pill each at the edge, in the amber of the ships you protect (the canvas drew an amber arrow for the ones in trouble only; the miner had none): the arrow, its E digit, its name and how far, "2 Miner \u00b7 12 km"; `hot` is the bar's: under attack or nearly lost. Nearest the cruiser first, at most CAMP_PAGEHUD.fedges; slid along the edge off each other and off the hostiles' pill; empty when the camera is not known
function campPageHudFriendEdges(C, view, edge) {
  if (!view || typeof campSightFriends !== 'function' || typeof campFriNumbered !== 'function') return [];
  const num = {}; campFriNumbered(C).forEach(e => { if (e.alive) num[e.id] = e; });
  const list = campSightFriends(C, { x: view.x, y: view.y }, W, H, view.zoom > 0 ? view.zoom : 1, true, { was: view.was || {} }).filter(a => num[a.id]).slice(0, CAMP_PAGEHUD.fedges).map(a => {
    const e = num[a.id], km = uiText('camp.tdisp.km', { km: campNavKm(a.dist) }), text = e.number + ' ' + e.name + ' \u00b7 ' + km, label = e.name + ' \u00b7 ' + km; // text: the whole line (its width is the pill's); label: what the pill writes after the digit's ring (card space-game-b3-d-panel-cap-pill-goal)
    return Object.assign({ id: a.id, n: e.number, name: e.name, km, text, label, hot: !!a.hot, angle: a.angle, x: a.x, y: a.y, tx: a.tx, ty: a.ty }, campPageHudPillSize(text));
  });
  const ed = edge === undefined ? campPageHudEdge(C, view) : edge, fixed = ed ? [Object.assign({ x: Math.max(70, Math.min(W - 70, ed.x)), y: Math.max(30, Math.min(H - 30, ed.y)) }, campPageHudPillSize(ed.n + ' \u00b7 ' + ed.km))] : [];
  const put = campPageHudEdgeFit(list, fixed);
  return list.map((f, i) => ({ id: f.id, n: f.n, name: f.name, km: f.km, text: f.text, label: f.label, hot: f.hot, x: put[i].x, y: put[i].y, angle: f.tx != null ? Math.atan2(f.ty - put[i].y, f.tx - put[i].x) : f.angle, tx: f.tx, ty: f.ty })); // it points at its ship from where it ends (slid along the edge or kept whole on the screen: not the way the arrow's point on the border pointed)
}
// the places in view: one pill each, in place of the two labels the world draws (the place and its outpost): "Ceres · Occator Works"; game px of the pill (above the place); only near enough to read (not at the far marks' zoom)
function campPageHudPlaces(C, view) {
  if (!view || typeof campPlaces !== 'function' || !C.level) return [];
  const z = view.zoom > 0 ? view.zoom : 1; if (typeof CAMPZOOM === 'object' && z < CAMPZOOM.view.markZ) return [];
  const pl = campPlaces(C.level), out = [];
  Object.keys(pl).forEach(id => {
    const p = pl[id]; if (!p || p.hidden) return;
    const r = p.r || 60, up = Math.max((r + 36) * z, Math.max(r * z, CAMPZOOM.view.worldLeast || 0) + 16); // above the world: 36 world px clear of its edge, and never nearer than the pill's half height clear of the disc as it is drawn on the screen (a moon drawn up to its least size, src/campzoom.js: the pill sat on it when the view was out)
    const sx = (p.x - view.x - W / 2) * z + W / 2, sy = (p.y - view.y - H / 2) * z + H / 2 - up;
    if (sx > 40 && sx < W - 40 && sy > 40 && sy < H - 40) out.push({ name: p.base ? p.name + ' \u00b7 ' + p.base : String(p.name), x: sx, y: sy });
  });
  return out.slice(0, CAMP_PAGEHUD.pills);
}

// ---- the elements ----
const CAMP_PAGEHUD_ICON = { // inline SVG (no image files): the shield and the hull of the mock
  shield: '<svg class="ph-ic" viewBox="0 0 16 16" fill="none" stroke="#6fd6ff" stroke-width="1.6"><path d="M8 1.5l5 2v4.2c0 3-2.1 5.4-5 6.8-2.9-1.4-5-3.8-5-6.8V3.5z"/></svg>',
  hull: '<svg class="ph-ic" viewBox="0 0 16 16" fill="none" stroke="#4fe0a6" stroke-width="1.6"><rect x="2" y="5" width="12" height="6" rx="1.5"/><path d="M5 5V3h6v2"/></svg>',
  ore: '<svg class="ph-ic" viewBox="0 0 16 16" fill="#e9b872"><path d="M3 10l3-6 5 1 2 5-4 3z"/></svg>',
  arrow: '<svg class="ph-arrow" viewBox="0 0 10 10" fill="#ff6fa8"><path d="M1 1l8 4-8 4 2-4z"/></svg>',
  arrowF: '<svg class="ph-arrow" viewBox="0 0 10 10" fill="#ffb454"><path d="M1 1l8 4-8 4 2-4z"/></svg>',
  missile: '<svg class="ph-ic" viewBox="0 0 16 16" fill="#e6edf7"><path d="M8 1l2 4v7l-2 3-2-3V5z"/></svg>'
};
function campPageHudEl(doc, tag, cls, parent) { const e = doc.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
function campPageHudEnterRow(doc, parent, cls) { const row = campPageHudEl(doc, 'div', cls || 'ph-row ph-enter', parent); return { el: row, key: campPageHudEl(doc, 'span', 'ph-k', row), word: campPageHudEl(doc, 'span', 'ph-lab', row) }; } // the Enter chip and the word of what Enter does (Attack, Guard)
function campPageHudMeterEl(doc, parent, id) { // a meter with its word and its percentage (id: shield or hull: the fill's colour): the cruiser's two, and the target's two (card space-game-page-hud-target-details)
  const m = campPageHudEl(doc, 'div', 'ph-m', parent), head = campPageHudEl(doc, 'span', 'ph-lab ph-mh', m), word = campPageHudEl(doc, 'span', '', head), pct = campPageHudEl(doc, 'b', '', head), track = campPageHudEl(doc, 'div', 'ph-meter', m), fill = campPageHudEl(doc, 'i', 'ph-fill ph-' + id, track);
  return { el: m, word, pct, fill };
}
function campPageHudPaintMeter(Me, b) { const set = campPageHudSet; set(Me.fill, 'width', Math.round(b.frac * 1000) / 10 + '%'); set(Me.word, 'text', b.word); set(Me.pct, 'text', b.show ? b.pct + '%' : ''); }
function campPageHudBuild(doc) {
  // the left panel, option D of docs/hud-mock-2.html (card space-game-page-hud-3): two thin rows: the Q chip with Shields and Hull; then the W chip with a small ring for each pilot, a divider, the E chip with a small ring for each ship you protect
  const root = campPageHudEl(doc, 'div', 'ph-root'), ship = campPageHudEl(doc, 'div', 'ph-p ph-ship', root), R = { root, ship: { el: ship } };
  const top = campPageHudEl(doc, 'div', 'ph-row', ship); R.ship.key = campPageHudEl(doc, 'span', 'ph-k', top);
  ['shield', 'hull'].forEach(id => { R.ship[id] = campPageHudMeterEl(doc, top, id); });
  campPageHudEl(doc, 'div', 'ph-hr', ship);
  const fl = campPageHudEl(doc, 'div', 'ph-row ph-fleet', ship); R.fleet = { el: fl, pilots: [], ships: [] };
  R.fleet.pkey = campPageHudEl(doc, 'span', 'ph-k', fl); R.fleet.pBox = campPageHudEl(doc, 'div', 'ph-grp', fl); campPageHudEl(doc, 'span', 'ph-sep', fl);
  R.fleet.ekey = campPageHudEl(doc, 'span', 'ph-k', fl); R.fleet.sBox = campPageHudEl(doc, 'div', 'ph-grp', fl); R.fleet.ent = campPageHudEnterRow(doc, fl, 'ph-g ph-ent');
  const goal = campPageHudEl(doc, 'div', 'ph-p ph-goal', root), g1 = campPageHudEl(doc, 'div', 'ph-row ph-between', goal); R.goal = { el: goal, label: campPageHudEl(doc, 'span', 'ph-lab', g1), value: campPageHudEl(doc, 'b', '', g1) };
  R.goal.meter = campPageHudEl(doc, 'div', 'ph-meter ph-fixed', goal); R.goal.fill = campPageHudEl(doc, 'i', 'ph-fill', R.goal.meter); R.goal.row = g1; R.goal.hint = campPageHudEl(doc, 'div', 'ph-hint', goal); // the hint: the second line (the dock hint, the retreat line)
  const stock = campPageHudEl(doc, 'div', 'ph-p ph-stock', root), o1 = campPageHudEl(doc, 'div', 'ph-row', stock), oic = campPageHudEl(doc, 'span', 'ph-icw', o1), olab = campPageHudEl(doc, 'span', 'ph-lab ph-mw', o1), ometer = campPageHudEl(doc, 'div', 'ph-meter', o1); oic.innerHTML = CAMP_PAGEHUD_ICON.ore;
  const m1 = campPageHudEl(doc, 'div', 'ph-row', stock), mic = campPageHudEl(doc, 'span', 'ph-icw', m1), mlab = campPageHudEl(doc, 'span', 'ph-lab ph-mw', m1); mic.innerHTML = CAMP_PAGEHUD_ICON.missile;
  const foes = campPageHudEl(doc, 'div', 'ph-p ph-foes', root), f1 = campPageHudEl(doc, 'div', 'ph-row', foes);
  R.foes = { el: foes, key: campPageHudEl(doc, 'span', 'ph-k', f1), label: campPageHudEl(doc, 'span', 'ph-lab', f1), what: campPageHudEl(doc, 'div', 'ph-big', foes), sub: campPageHudEl(doc, 'div', 'ph-sub', foes) }; R.foes.ent = campPageHudEnterRow(doc, foes); R.foes.mother = campPageHudMeterEl(doc, foes, 'hull'); R.foes.mother.el.className = 'ph-m ph-mothr'; R.foes.mother.fill.className = 'ph-fill ph-alien'; const tg = campPageHudEl(doc, 'div', 'ph-tg', foes), tgm = campPageHudEl(doc, 'div', 'ph-row ph-tgm', tg); R.foes.tg = { el: tg, hull: campPageHudMeterEl(doc, tgm, 'hull'), shield: campPageHudMeterEl(doc, tgm, 'shield'), none: campPageHudEl(doc, 'span', 'ph-lab ph-none', tgm), act: campPageHudEl(doc, 'div', 'ph-act', tg), pic: campPageHudEl(doc, 'span', 'ph-tpic', foes) }; // the picked target's meters and what it does (only while one is picked)
  R.first = { el: campPageHudEl(doc, 'div', 'ph-p ph-first', root), items: [] }; // the first-minute chips: the pairs are made when they are first shown
  const edge = campPageHudEl(doc, 'div', 'ph-p ph-edge', root); R.edge = { el: edge, ic: campPageHudEl(doc, 'span', 'ph-icw ph-edgeic', edge), text: campPageHudEl(doc, 'span', '', edge) }; R.edge.ic.innerHTML = CAMP_PAGEHUD_ICON.arrow;
  R.pills = []; R.fedges = []; // the pills of the ships you protect: made when they are first needed
  const radio = campPageHudEl(doc, 'div', 'ph-p ph-radio', root); R.radio = { el: radio, line: campPageHudEl(doc, 'div', 'ph-rad', radio), chat: campPageHudEl(doc, 'div', 'ph-chat', radio) }; // the radio panel: the toast box of the Campaign (the last radio line) and the wing's chatter, under the goal panel
  R.stock = { el: stock, oreLab: olab, missLab: mlab, oreFill: campPageHudEl(doc, 'i', 'ph-fill ph-ore', ometer), pipsBox: campPageHudEl(doc, 'div', 'ph-pips', m1), queue: campPageHudEl(doc, 'span', 'ph-q', m1), key: campPageHudEl(doc, 'span', 'ph-k', m1), pips: [] };
  return R;
}
// the element's property is written only when its value is not the one it has (a repainted label every frame was a large cost): the last value is kept on the element
// the radio panel (card space-game-b3-c-radio-panel; the cloud brief 3, Troy: item 1): the Campaign's toast box (the bordered box under the top centre: the radio lines and the other notices of the game) as a panel in the page HUD's look, the same words, the same pairing of two lines that come together, the same time up and the same fade
// (TOAST.hold, a kept radio line's hold, TOAST.fade: src/common.js) on the scene's own clock; common.js toast() asks the scene first (s.toastPanel) and the Campaign gives the message to campPageHudToast, which keeps it in s.radioToast; campPageHudRadioPaint (10 a second) shows it. The wing's chatter (s.hud.chat: "ROOK: Ore aboard.", which stood at the
// bottom left) is the panel's second, dimmer row, on the scene's clock for it (s.chatUntil), fading over its last 500 ms as it did. A map over the view takes the page HUD away, so a message that comes while it is open is the old box, over the map.
function campPageHudToast(s, msg, color, hold) {
  if (!s || !s.camp || s.mp || typeof toastPlan !== 'function' || typeof TOAST !== 'object' || !campPageHudOn()) return false;
  const T0 = TOAST, now = s.time && typeof s.time.now === 'number' ? s.time.now : 0, old = s.radioToast, prev = old && now < old.until + T0.fade ? old : null;
  const plan = toastPlan(prev, msg, now); // (a message that comes soon after one that said something else shares the box with it: two lines at most)
  s.radioToast = { msg: String(msg), last: String(msg), at: now, until: now + Math.max(T0.hold, hold | 0), lines: plan.lines, color: color || '#ffd37a' };
  return true;
}
function campPageHudRadioPaint(R, s, now, k) {
  if (typeof TOAST !== 'object') return;
  const set = campPageHudSet, RD = R.radio, T0 = TOAST, T = s.radioToast;
  const left = T ? T.until + T0.fade - now : 0, a = left > 0 ? Math.min(1, left / T0.fade) : 0; // 1 while it is up, then down to 0 over TOAST.fade
  const cl = (+s.chatUntil || 0) - (typeof performance !== 'undefined' ? performance.now() : 0), ct = s.hud && s.hud.chat && s.hud.chat.text ? String(s.hud.chat.text) : '', ca = s.mode === 'play' && cl > 0 && ct ? Math.min(1, cl / 500) : 0; // the line fades over its last half second; a card, the pause and the map hide it
  const show = a > 0 || ca > 0; set(RD.el, 'display', show ? '' : 'none'); if (!show) return;
  set(RD.line, 'display', a > 0 ? '' : 'none'); if (a > 0) { set(RD.line, 'text', T.lines.join('\n')); set(RD.line, '--rc', T.color); set(RD.line, 'opacity', String(Math.round(a * 100) / 100)); }
  set(RD.chat, 'display', ca > 0 ? '' : 'none'); if (ca > 0) { set(RD.chat, 'text', ct); set(RD.chat, 'opacity', String(Math.round(ca * 100) / 100)); }
  const top = typeof s.toastTop === 'function' ? s.toastTop() : (s.pageHudStack || 0) + (CAMP.hud.toastGap || 6); set(RD.el, 'top', Math.round(top * k * 10) / 10 + 'px');
}
function campPageHudSet(el, prop, v) { if (!el) return false; const m = el._ph || (el._ph = {}); if (m[prop] === v) return false; m[prop] = v; if (prop === 'text') el.textContent = v; else if (prop === 'cls') el.className = v; else if (prop.charAt(0) === '-') el.style.setProperty(prop, v); else el.style[prop] = v; return true; }
function campPageHudRings(doc, box, list, n) { // the rings of a group: made when the number is not what is there (a ship you protect comes into sight: once)
  if (list.length === n) return;
  list.forEach(g => g.el.parentNode && g.el.parentNode.removeChild(g.el)); list.length = 0;
  for (let i = 0; i < n; i++) { const el = campPageHudEl(doc, 'div', 'ph-g', box), rw = campPageHudEl(doc, 'div', 'ph-rw', el), ring = campPageHudEl(doc, 'div', 'ph-ring', rw), text = campPageHudEl(doc, 'span', '', ring), under = campPageHudEl(doc, 'small', '', el); list.push({ el, ring, text, under }); }
}
function campPageHudPaintRings(doc, box, list, G) { // one group: the class says picked, dim (resting) or dark (lost); the ring is the hull share in its colour; under it, only while the group is open, the digit and the name
  const set = campPageHudSet; campPageHudRings(doc, box, list, G.items.length); set(box, 'cls', 'ph-grp' + (G.open ? ' open' : ''));
  G.items.forEach((p, i) => { const e = list[i]; set(e.el, 'cls', 'ph-g' + (G.open ? ' open' : '') + (p.pick ? ' pick' : '') + (!p.alive ? ' dead' : !p.on ? ' dim' : '')); set(e.ring, '--v', String(Math.round(p.frac * 100))); set(e.ring, '--c', 'var(--ph-' + p.color + ')'); set(e.text, 'text', p.text); set(e.under, 'text', G.open ? p.under : ''); });
}
function campPageHudPips(doc, R, n) { // one pip for each missile the rack holds
  const S = R.stock; if (S.pips.length === n) return;
  S.pips.forEach(p => p.parentNode && p.parentNode.removeChild(p)); S.pips = [];
  for (let i = 0; i < n; i++) S.pips.push(campPageHudEl(doc, 'i', 'ph-pip', S.pipsBox));
}
function campPageHudPaintEnter(E, e) { const set = campPageHudSet; set(E.el, 'display', e ? '' : 'none'); if (e) { set(E.key, 'text', e.key); set(E.word, 'text', e.word); } }
function campPageHudPaint(R, M, doc) {
  if (!R || !M) return;
  const S = R.ship, set = campPageHudSet;
  const G = R.goal; set(G.el, 'display', M.goal || M.hint ? '' : 'none'); set(G.row, 'display', M.goal ? '' : 'none'); if (!M.goal) set(G.meter, 'display', 'none'); set(G.hint, 'display', M.hint ? '' : 'none'); if (M.hint) { set(G.hint, 'text', M.hint.text); set(G.hint, 'cls', 'ph-hint ph-' + M.hint.tone); }
  if (M.goal) { set(G.label, 'text', M.goal.label); set(G.value, 'text', M.goal.value); set(G.meter, 'display', M.goal.frac === null ? 'none' : ''); set(G.fill, 'width', M.goal.frac === null ? '0%' : Math.round(M.goal.frac * 1000) / 10 + '%'); set(G.fill, 'cls', 'ph-fill ph-' + M.goal.tone); }
  const F = R.foes; set(F.el, 'display', M.foes ? '' : 'none');
  if (M.foes) { set(F.key, 'text', M.foes.key); set(F.label, 'text', M.foes.label); set(F.what, 'text', M.foes.what); set(F.sub, 'text', M.foes.dir + ' \u00b7 ' + M.foes.km); campPageHudPaintEnter(F.ent, M.foes.enter); const tm = M.foes.target, T = F.tg; set(T.el, 'display', tm ? '' : 'none'); if (tm) { campPageHudPaintMeter(T.hull, tm.hull); set(T.shield.el, 'display', tm.shield ? '' : 'none'); if (tm.shield) campPageHudPaintMeter(T.shield, tm.shield); set(T.none, 'display', tm.shield ? 'none' : ''); set(T.none, 'text', tm.noshield); set(T.act, 'text', tm.doing); }
    const pc = tm && tm.pic, pk = pc ? pc.kind + '|' + pc.side : ''; set(T.pic, 'display', pc ? '' : 'none'); set(F.el, 'cls', 'ph-p ph-foes' + (pc ? ' pic' : '')); if (T.pic._pk !== pk) { T.pic._pk = pk; T.pic.innerHTML = pc ? slookPicSvg(pc.kind, pc.side) : ''; } } // the picture: written only when the ship's kind or side changes
  const E = R.edge; set(E.el, 'display', M.edge ? '' : 'none');
  if (M.edge) { set(E.text, 'text', M.edge.n + ' \u00b7 ' + M.edge.km); set(E.ic, '--a', String(Math.round(M.edge.angle * 180 / Math.PI)) + 'deg'); }
  while (R.fedges.length < M.fedges.length) { const el = campPageHudEl(doc, 'div', 'ph-p ph-edge ph-fedge', R.root), ic = campPageHudEl(doc, 'span', 'ph-icw ph-edgeic', el); ic.innerHTML = CAMP_PAGEHUD_ICON.arrowF; const num = campPageHudEl(doc, 'span', 'ph-fnum', el); R.fedges.push({ el, ic, num, text: campPageHudEl(doc, 'span', '', el) }); }
  R.fedges.forEach((p, i) => { const f = M.fedges[i]; set(p.el, 'display', f ? '' : 'none'); if (f) { set(p.el, 'cls', 'ph-p ph-edge ph-fedge' + (f.hot ? ' hot' : '')); set(p.num, 'text', String(f.n)); set(p.text, 'text', f.label); set(p.ic, '--a', String(Math.round(f.angle * 180 / Math.PI)) + 'deg'); } });
  set(F.mother.el, 'display', M.mother ? '' : 'none'); if (M.mother) campPageHudPaintMeter(F.mother, M.mother);
  const FI = R.first, fm = M.first; set(FI.el, 'display', fm ? '' : 'none');
  if (fm) { while (FI.items.length < fm.items.length) { const grp = campPageHudEl(doc, 'div', 'ph-fc', FI.el); FI.items.push({ el: grp, key: campPageHudEl(doc, 'span', 'ph-k', grp), word: campPageHudEl(doc, 'span', 'ph-lab', grp) }); } set(FI.el, 'opacity', String(Math.round(0.72 * fm.a * 100) / 100)); FI.items.forEach((it, i) => { const x = fm.items[i]; set(it.el, 'display', x ? '' : 'none'); if (x) { set(it.key, 'text', x.key); set(it.word, 'text', x.word); } }); } // (a pair with no chip now, the Enter one when no order can be given, is hidden, not left with the old words)
  while (R.pills.length < M.places.length) R.pills.push(campPageHudEl(doc, 'div', 'ph-p ph-place', R.root));
  R.pills.forEach((p, i) => { const pl = M.places[i]; set(p, 'display', pl ? '' : 'none'); if (pl) set(p, 'text', pl.name); });
  const T = R.stock, k = M.stock; set(T.oreFill, 'width', Math.round(k.ore.frac * 1000) / 10 + '%'); campPageHudPips(doc, R, k.missiles.cap);
  T.pips.forEach((p, i) => { const b = i === k.missiles.n && k.missiles.building; set(p, 'cls', 'ph-pip' + (i < k.missiles.n ? ' on' : '') + (b ? ' build' : '')); set(p, '--p', (b ? Math.round(k.missiles.progress * 100) : 0) + '%'); }); set(T.queue, 'text', k.missiles.queued > 0 ? '+' + k.missiles.queued : ''); set(T.queue, 'display', k.missiles.queued > 0 ? '' : 'none'); set(T.key, 'text', k.missiles.key); set(T.key, 'display', k.missiles.key ? '' : 'none'); set(T.oreLab, 'text', k.ore.word); set(T.missLab, 'text', k.missiles.word);
  set(S.key, 'text', M.ship.key);
  ['shield', 'hull'].forEach(id => campPageHudPaintMeter(S[id], M.ship[id]));
  const F2 = R.fleet; set(F2.pkey, 'text', M.pilots.key); set(F2.ekey, 'text', M.friends.key);
  campPageHudPaintRings(doc, F2.pBox, F2.pilots, M.pilots); campPageHudPaintRings(doc, F2.sBox, F2.ships, M.friends); campPageHudPaintEnter(F2.ent, M.friends.enter);
}

// ---- the scene's call ----
function campPageHudDrop(s) { // the HUD is taken away; the canvas rows and lists are where they were
  const R = s && s.pageHud; if (R && R.root && R.root.parentNode) R.root.parentNode.removeChild(R.root);
  if (s) { s.pageHud = null; s.pageHudHeld = false; s.pageHudOn = false; }
  if (typeof CAMP_CORNER_SHIFT === 'object') { CAMP_CORNER_SHIFT.tl = 0; CAMP_CORNER_SHIFT.bl = 0; CAMP_CORNER_SHIFT.tr = 0; }
  if (s) { s.pageHudStack = 0; campPageHudHideLines(s, false); if (R && R.backAlpha !== undefined && s.hudBack && s.hudBack.setAlpha) s.hudBack.setAlpha(R.backAlpha); }
}
function campPageHudHideLines(s, on) { // the canvas lines the page HUD replaces that the scene keeps as objects: the bottom key line and its strip, and the labels the world draws at the places (landing 3)
  const off = on && campPageHudHides('keys'), put = (o, v) => { if (o && typeof o.setVisible === 'function' && o.visible !== v) o.setVisible(v); };
  if (s.hud && s.hudOn !== false) put(s.hud.keys, !off); put(s.keysBack, !off);
  const offG = on && campPageHudHides('goal'); if (s.hud) { put(s.hud.obj, !offG); put(s.hud.wave, !offG); } // the goal line and the wave line of the canvas (their words are still set: the column's flow is as it was)
  const offM = on && campPageHudHides('mother'), offH = on && campPageHudHides('post'), offC = on && campPageHudHides('chat'); if (s.hud) { put(s.hud.mother, !offM); put(s.hud.post, !offH); put(s.hud.chat, !offC); } // the mothership's label, the dock and retreat line, the wing's chatter: in the hostiles panel, the goal panel and the radio panel now (card space-game-b3-c-radio-panel)
  const offP = on && campPageHudHides('places'); (s.placeLabels || []).forEach(o => { if (o && o.active !== false) put(o, !offP); });
}
// a full card is up over the battle: the pause card (the H page and the N panel are the pause card's own mode), the H page, and a scene that holds the battle still (Settings, the ready room: Phaser pauses the Campaign, so its frame, and this sync, do not run). The panels are hidden while it is, and come back as they were; the result cards (won, lost, debrief, refit, pick, the ending) take the HUD away already (the mode is not play or pause). With the switch off nothing here runs (card space-game-page-hud-hide-on-cards)
const campPageHudCovered = s => !!s && (s.mode === 'pause' || s.pageHudHeld === true || (typeof campKeysIsOpen === 'function' && campKeysIsOpen(s)));
function campPageHudCover(s, on) { // the scene's own pause and resume events: while the scene is paused no frame runs, so the panels are hidden at once here and shown again by the first frame after the resume
  if (!s) return; s.pageHudHeld = !!on;
  if (on && s.pageHud && s.pageHud.root) campPageHudSet(s.pageHud.root, 'display', 'none');
}
function campPageHudSync(s, now) {
  if (!s || typeof document === 'undefined') return false;
  const C = s.camp, on = !!C && !!C.carrier && campPageHudOn() && (s.mode === 'play' || s.mode === 'pause') && !s.mp;
  if (!on) { if (s.pageHud) campPageHudDrop(s); return false; }
  s.pageHudOn = true; // the scene asks it (the mothership's canvas bar and its place in the stack are not drawn while the HUD is up)
  const K = CAMP_PAGEHUD, t = +now || 0, canvas = s.game && s.game.canvas;
  if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return false;
  if (campPageHudCovered(s)) { if (s.pageHud) campPageHudSet(s.pageHud.root, 'display', 'none'); return false; } // a card is up: nothing is built, placed or painted, the panels wait hidden
  if (!s.pageHud) { s.pageHud = campPageHudBuild(document); s.pageHud.at = -1e9; document.body.appendChild(s.pageHud.root); if (s.events && s.events.once) { const off = () => campPageHudDrop(s); s.events.once('shutdown', off); s.events.once('destroy', off); } if (s.events && s.events.on && !s.pageHudEv) { s.pageHudEv = true; s.events.on('pause', () => campPageHudCover(s, true)); s.events.on('resume', () => campPageHudCover(s, false)); } }
  const R = s.pageHud; if (t - R.at < K.every && t >= R.at) return true; // 10 a second at most
  R.at = t;
  const r = canvas.getBoundingClientRect(), set = campPageHudSet, cam = s.cameras && s.cameras.main, fs = r.width * K.em; // the HUD sits over the canvas, the same size; the font size is a share of its width
  set(R.root, 'display', ''); // shown again when a card closes (set 'none' while one is up)
  set(R.root, 'left', Math.round(r.left) + 'px'); set(R.root, 'top', Math.round(r.top) + 'px'); set(R.root, 'width', Math.round(r.width) + 'px'); set(R.root, 'height', Math.round(r.height) + 'px'); set(R.root, 'fontSize', Math.round(fs * 100) / 100 + 'px');
  const view = cam ? { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom, was: R.was || {} } : null; // was: which edge pills showed at the last look (a pill stays until its ship is well inside the screen)
  campPageHudPaint(R, campPageModel(C, view), document);
  campPageHudHideLines(s, true);
  if (R.ship.el.getBoundingClientRect && r.width > 0 && typeof CAMP_CORNER_SHIFT === 'object') {
    const k = r.width / W, A = CAMP.corner.at, th = CAMP.corner.title.h, gap = CAMP.corner.stack, bot = el => (el.getBoundingClientRect().bottom - r.top) / k, shown = el => el.style.display !== 'none';
    const shipB = bot(R.ship.el), dyF = (s.cornerDy && s.cornerDy.friendlies) || 0;
    // the rows of the canvas that the panels replace keep their PLACE (the lists and the details open under it): the Q CRUISER row's under the ship panel; the FRIENDLIES row's under the friend panel (which slides down with the Q list); the HOSTILES row's under the lowest of the stock and hostiles panels
    CAMP_CORNER_SHIFT.tl = Math.round(shipB - th - A.tl.y);
    const friendB = shipB + dyF + gap + th; // a friendly's details are inside the ship panel now: shipB already has them
    CAMP_CORNER_SHIFT.bl = Math.round(friendB - th - A.bl.y - dyF);
    const stockB = bot(R.stock.el); set(R.foes.el, 'top', Math.round((stockB + gap) * k * 10) / 10 + 'px');
    const rightB = shown(R.foes.el) ? bot(R.foes.el) : stockB;
    CAMP_CORNER_SHIFT.tr = Math.round(rightB - th - A.tr.y);
    // toasts start under the goal panel; the dim plate of the canvas column is not wanted under it
    const gb = shown(R.goal.el) ? bot(R.goal.el) : 0;
    s.pageHudStack = gb > 0 ? Math.ceil(gb) : 0;
    campPageHudRadioPaint(R, s, t, k); // the radio panel, under whatever is stacked at the top centre (the goal panel, then the canvas lines under it: the scene's toastTop)
    if (s.hudBack && s.hudBack.setAlpha) { if (R.backAlpha === undefined) R.backAlpha = s.hudBack.alpha; s.hudBack.setAlpha(0); }
    // in space: the pill at the edge for the hostiles off the screen, and a pill for each place in view (world px to the canvas's px)
    const M = R.last = campPageModel(C, view); R.was = M.was; // (the same view as the paint above: both looks gave the same pills)
    const PC = campPageHudEdgesClear(M, campPageHudPanelRects(R, r, k)); // the pills are put clear of the panels (and of each other) now that the panels are in place
    if (PC.edge) { set(R.edge.el, 'left', Math.round(PC.edge.x * k) + 'px'); set(R.edge.el, 'top', Math.round(PC.edge.y * k) + 'px'); set(R.edge.ic, '--a', String(Math.round(PC.edge.angle * 180 / Math.PI)) + 'deg'); }
    R.fedges.forEach((p, i) => { const f = PC.fedges[i]; if (f) { set(p.el, 'left', Math.round(f.x * k) + 'px'); set(p.el, 'top', Math.round(f.y * k) + 'px'); set(p.ic, '--a', String(Math.round(f.angle * 180 / Math.PI)) + 'deg'); } });
    R.pills.forEach((p, i) => { const pl = M.places[i]; if (pl) { set(p, 'left', Math.round(pl.x * k) + 'px'); set(p, 'top', Math.round(pl.y * k) + 'px'); } });
  }
  return true;
}
