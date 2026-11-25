// ---------- The page HUD: the Campaign's flight HUD as page elements over the canvas (card space-game-page-hud; Troy, 24 Nov 2026: "rebuild the Campaign's flight HUD as page elements over the game canvas, in the look of the agent board"; the mock is docs/hud-mock.html) ----------
// The canvas draws bold text and hard outlines, which cannot do soft panels or a good typeface; ordinary page elements styled with CSS can. This file is a VIEW: it reads the same pure functions the canvas HUD reads (campCruiserStatus, campSelList and
// campTdispDoing, the key table) and gives no orders. Ships, fights, the map and every rule stay as they are, and the canvas HUD is KEPT: the page HUD is behind one switch, OFF by default (CAMP.flags.pagehud: a row of the N panel, or the address flag ?pagehud=1).
// While it is on, the canvas parts it replaces are not drawn (campPageHudHides: the shield and hull plate, the Q CRUISER and W rows) and the lists and details that open under those rows open under the page panel instead (CAMP_CORNER_SHIFT, src/campcorner.js).
//   THE LANDINGS  1 the cruiser and the pilots (this file's first panel); 2 the goal and the stock (ore, missiles); 3 the hostiles, the friendlies and the pills in space. Each is a piece of CAMP_PAGEHUD.hides and a panel below.
//   THE RULES     no image files, no libraries, no web font (the typeface is the system one, two weights, 400 and 600: src/camppagehud.css); every key chip reads the key table (src/data_controls.js), no letter is written here;
//                 the HUD is updated 10 times a second at most (CAMP_PAGEHUD.every) and an element is written only when its value changed (a repainted label every frame was a large cost); sizes are em of one font size set from the canvas width
//   campPageHudOn()                    is the page HUD on: the flag of the N panel, or the address
//   campPageHudHides(id)               true when the page HUD has what the canvas shows under this name ('status', or a corner's id): the canvas leaves it out
//   campPageModel(C)                   PURE: what each panel shows now: { ship: { key, label, shield: { frac, n, show }, hull: {...} }, pilots: { key, items: [{ id, name, initial, digit, frac, color, on, pick }], doing, who },
//                                      goal: { label, value, frac (null: no meter), tone } | null, stock: { ore: { frac }, missiles: { n, cap, building, key } },
//                                      foes: { key, label, what, dir, km } | null (the nearest group of hostiles seen), friend: { key, label, name, frac, km } | null (a friendly is picked),
//                                      edge: { n, km, angle, x, y } | null (hostiles off the screen: the nearest group's arrow), places: [{ name, x, y }] (the places in view, in game px; needs `view`: { x, y, zoom }) } }
//   campPageHudBuild(doc)              the elements, made once: { root, ship: {...refs} }
//   campPageHudPaint(R, M)             writes the model into the elements: only what changed
//   campPageHudSync(s, now)            the scene calls it every frame (src/campaignscene.js): at most 10 times a second it builds, places and paints the HUD, and takes it away when the switch is off or the scene is over; while a full card is up (the pause card, the H page, the N panel, Settings, the ready room) the panels are hidden, not taken away (campPageHudCovered)
const CAMP_PAGEHUD = {
  em: 0.0112,              // the HUD's font size: this share of the canvas width (about 1.1 percent), so it scales with the window
  every: 100,              // ms between two updates: 10 a second
  low: 0.6, crit: 0.3,     // a pilot's ring: the good colour, the warning colour under 60 percent of the hull, the hostile colour under 30
  addr: 'pagehud',         // the address flag: index.html?campaign=1&pagehud=1
  pills: 6,                // the most place pills at once
  first: { level: 1, mission: 0, secs: 60, fade: 3, ids: ['fly', 'fire', 'missile'] }, // the first-minute chips (card space-game-page-hud-first-minute-chips): mission 1.1 only (level 1, mission index 0), the mission clock's first 60 s, faded out over the last 3; the ids are the key table's, in the order they sit
  hides: ['status', 'cruiser', 'fleet', 'goal', 'stock', 'hostiles', 'friendlies', 'sight', 'contact', 'places', 'keys', 'box:friendlies', 'box:fleet', 'box:hostiles'] // what the canvas leaves out while the page HUD is on: landing 1 (the cruiser panel and the pilots), 2 (the goal line and the wave line; the ore and missiles block), 3 (the rows of the HOSTILES and FRIENDLIES corners (their details stay, under the panels, except the friendlies' box and the W box of the pilots' pick, which the grown rings replace, and the hostiles' box, whose details are in the hostiles panel: box:friendlies, box:fleet, box:hostiles), the edge arrows of the hostiles, the labels of the places in the world, the bottom key line)
};

// ---- the switch ----
function campPageHudAddr(search) { // ?pagehud, ?pagehud=1, =on, =true, =yes
  try {
    const s = typeof search === 'string' ? search : (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '');
    return s.replace(/^[?#]/, '').split('&').some(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(), v = eq < 0 ? '' : p.slice(eq + 1).trim().toLowerCase(); return k === CAMP_PAGEHUD.addr && (v === '' || v === '1' || v === 'on' || v === 'true' || v === 'yes'); });
  } catch (e) { return false; }
}
const campPageHudOn = () => (typeof campFlag === 'function' && campFlag('pagehud')) || campPageHudAddr();
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
  const open = typeof campCornerPanelId === 'function' ? campCornerPanelId() || '' : '', ships = campPageHudShips(C); // open: the pick that is open now, '' none (the rings of that group grow in place)
  return { first: campPageHudFirst(C), ship, goal: campPageHudGoal(C), stock: campPageHudStock(C), foes: campPageHudFoes(C), edge: campPageHudEdge(C, view), places: campPageHudPlaces(C, view),
    pilots: { key: campCornerCap('who'), items, open: open === 'fleet' },
    friends: { key: campCornerCap('friendlies'), items: ships, open: open === 'friends', enter: ships.some(x => x.pick) ? campPageHudEnter(C, 'guard') : null } }; // enter: the Enter chip and Guard, while a ship you protect is picked
}

// the first minute of mission 1.1 (card space-game-page-hud-first-minute-chips; Troy, 25 Nov 2026): one dim row of three key chips, each with a word (the arrows: fly, Space: fire, M: missile), for the first CAMP_PAGEHUD.first.secs of the mission clock (it stands still while a card or the pause is up), then gone for the rest of the mission. Mission 1.1 only (not 1.2 or 1.3), and not when the hints are switched off (the tuning panel: it is a hint). The caps are the key table's (campCornerCap of its ids), the words are the text keys camp.corner.chip.<id>; a key with no cap is left out. a is the share of the dim that is left (it fades over the last seconds); null when it is not the time
function campPageHudFirst(C) {
  const F = CAMP_PAGEHUD.first, left = C ? F.secs - C.t / 1000 : 0;
  if (!C || C.result || C.level !== F.level || !C.L || C.L.mission !== F.mission || !(left > 0) || (typeof campFlag === 'function' && !campFlag('hints'))) return null;
  const items = F.ids.map(id => ({ id, key: campCornerCap(id), word: uiText('camp.corner.chip.' + id) })).filter(x => x.key);
  return items.length ? { items, a: Math.round(Math.min(1, left / F.fade) * 100) / 100 } : null;
}

// the goal (landing 2): the objective sentence of the level (campObjective: the first objective not done yet, so a second one shows only when it is the next thing to do) split at its colon into a label and a value ("Mine ore: 120 of 450." is "Mine ore" and
// "120 / 450"), with a meter when the objective is counted (campObjectives: got of need, and a value to show); no wave count (the wave line is gone). null when the level has no goal line (nothing is drawn)
function campPageHudGoal(C) {
  const full = typeof campObjective === 'function' ? campObjective(C) : ''; if (!full) return null;
  const objs = C.L && C.L.objectives && typeof campObjectives === 'function' ? campObjectives(C) : null, o = objs ? objs.find(x => !x.done) : null, i = full.indexOf(': ');
  const label = i > 0 ? full.slice(0, i) : full.replace(/\.$/, ''), value = i > 0 ? full.slice(i + 2).split(/\.\s/)[0].replace(/\.$/, '').replace(/ of /, ' / ') : '', need = o && o.need >= 1 && value ? o.need : 0; // a meter when the objective is counted (it has a value to show)
  return { label, value, frac: need ? Math.max(0, Math.min(1, o.got / need)) : null, tone: o && (o.type === 'ore' || o.type === 'cashin') ? 'ore' : 'good' };
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
function campPageHudFoes(C) {
  const gs = typeof campSightGroups === 'function' ? campSightGroups(C, true) : [], t = campPageHudTarget(C); if (!gs.length && !t) return null;
  const c = C.carrier, g = gs[0] || { kinds: { [t.u.kind]: 1 }, x: t.u.x, y: t.u.y, dist: Math.hypot(t.u.x - c.x, t.u.y - c.y) }; // a picked ship nothing groups (a tower: always seen) is its own group
  return { key: campCornerCap('hostiles'), label: uiText('camp.corner.hostiles'), enter: campPageHudEnter(C, 'attack'), what: campSightWhat(g.kinds, typeof campSightKnown === 'function' ? campSightKnown(C, g.x, g.y) : false), dir: campSightDir(g.x - c.x, g.y - c.y), km: uiText('camp.tdisp.km', { km: campNavKm(g.dist) }), target: t };
}
// the picked target's details (card space-game-page-hud-target-details; Troy, 25 Nov 2026): what the canvas box of the HOSTILES showed (it is hidden while the page HUD is on), as meters in the look of the cruiser's: its hull, its shield (a word saying "no shield" when it has none) and what it is doing, in a few words (campTdispDoing: "Attacking the cruiser"). The ship the canvas box shows: the target held, or the ship an order's list is on (campTcornerInfo 'host'); null when there is none, and the panel is its short form
function campPageHudTarget(C) {
  const info = typeof campTcornerInfo === 'function' ? campTcornerInfo(C, 'host') : null, sub = info && info.subject, u = sub && sub.side === 'hostile' ? sub.u : null; if (!u || !(u.hp > 0)) return null;
  const sh = typeof campTdispShield === 'function' ? campTdispShield(C, u) : null, doing = typeof campTdispDoing === 'function' ? String(campTdispDoing(C, u) || '') : '';
  return { id: u.id, u, hull: campPageHudBar({ frac: campTdispHull(u).share }, 'hull'), shield: sh ? campPageHudBar({ frac: sh.share }, 'shield') : null, noshield: sh ? '' : uiText('camp.tdisp.noshield'), doing: doing.charAt(0).toUpperCase() + doing.slice(1) };
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
  const a = campSightArrows(C, { x: view.x, y: view.y }, W, H, view.zoom > 0 ? view.zoom : 1)[0]; if (!a) return null;
  return { n: a.n, km: uiText('camp.tdisp.km', { km: campNavKm(a.dist) }), angle: a.angle, x: a.x, y: a.y };
}
// the places in view: one pill each, in place of the two labels the world draws (the place and its outpost): "Ceres · Occator Works"; game px of the pill (above the place); only near enough to read (not at the far marks' zoom)
function campPageHudPlaces(C, view) {
  if (!view || typeof campPlaces !== 'function' || !C.level) return [];
  const z = view.zoom > 0 ? view.zoom : 1; if (typeof CAMPZOOM === 'object' && z < CAMPZOOM.view.markZ) return [];
  const pl = campPlaces(C.level), out = [];
  Object.keys(pl).forEach(id => {
    const p = pl[id]; if (!p || p.hidden) return;
    const sx = (p.x - view.x - W / 2) * z + W / 2, sy = (p.y - (p.r || 60) - 36 - view.y - H / 2) * z + H / 2;
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
  R.goal.meter = campPageHudEl(doc, 'div', 'ph-meter ph-fixed', goal); R.goal.fill = campPageHudEl(doc, 'i', 'ph-fill', R.goal.meter);
  const stock = campPageHudEl(doc, 'div', 'ph-p ph-stock', root), o1 = campPageHudEl(doc, 'div', 'ph-row', stock), oic = campPageHudEl(doc, 'span', 'ph-icw', o1), olab = campPageHudEl(doc, 'span', 'ph-lab ph-mw', o1), ometer = campPageHudEl(doc, 'div', 'ph-meter', o1); oic.innerHTML = CAMP_PAGEHUD_ICON.ore;
  const m1 = campPageHudEl(doc, 'div', 'ph-row', stock), mic = campPageHudEl(doc, 'span', 'ph-icw', m1), mlab = campPageHudEl(doc, 'span', 'ph-lab ph-mw', m1); mic.innerHTML = CAMP_PAGEHUD_ICON.missile;
  const foes = campPageHudEl(doc, 'div', 'ph-p ph-foes', root), f1 = campPageHudEl(doc, 'div', 'ph-row', foes);
  R.foes = { el: foes, key: campPageHudEl(doc, 'span', 'ph-k', f1), label: campPageHudEl(doc, 'span', 'ph-lab', f1), what: campPageHudEl(doc, 'div', 'ph-big', foes), sub: campPageHudEl(doc, 'div', 'ph-sub', foes) }; R.foes.ent = campPageHudEnterRow(doc, foes); const tg = campPageHudEl(doc, 'div', 'ph-tg', foes), tgm = campPageHudEl(doc, 'div', 'ph-row ph-tgm', tg); R.foes.tg = { el: tg, hull: campPageHudMeterEl(doc, tgm, 'hull'), shield: campPageHudMeterEl(doc, tgm, 'shield'), none: campPageHudEl(doc, 'span', 'ph-lab ph-none', tgm), act: campPageHudEl(doc, 'div', 'ph-act', tg) }; // the picked target's meters and what it does (only while one is picked)
  R.first = { el: campPageHudEl(doc, 'div', 'ph-p ph-first', root), items: [] }; // the first-minute chips: the pairs are made when they are first shown
  const edge = campPageHudEl(doc, 'div', 'ph-p ph-edge', root); R.edge = { el: edge, ic: campPageHudEl(doc, 'span', 'ph-icw ph-edgeic', edge), text: campPageHudEl(doc, 'span', '', edge) }; R.edge.ic.innerHTML = CAMP_PAGEHUD_ICON.arrow;
  R.pills = [];
  R.stock = { el: stock, oreLab: olab, missLab: mlab, oreFill: campPageHudEl(doc, 'i', 'ph-fill ph-ore', ometer), pipsBox: campPageHudEl(doc, 'div', 'ph-pips', m1), queue: campPageHudEl(doc, 'span', 'ph-q', m1), key: campPageHudEl(doc, 'span', 'ph-k', m1), pips: [] };
  return R;
}
// the element's property is written only when its value is not the one it has (a repainted label every frame was a large cost): the last value is kept on the element
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
  const G = R.goal; set(G.el, 'display', M.goal ? '' : 'none');
  if (M.goal) { set(G.label, 'text', M.goal.label); set(G.value, 'text', M.goal.value); set(G.meter, 'display', M.goal.frac === null ? 'none' : ''); set(G.fill, 'width', M.goal.frac === null ? '0%' : Math.round(M.goal.frac * 1000) / 10 + '%'); set(G.fill, 'cls', 'ph-fill ph-' + M.goal.tone); }
  const F = R.foes; set(F.el, 'display', M.foes ? '' : 'none');
  if (M.foes) { set(F.key, 'text', M.foes.key); set(F.label, 'text', M.foes.label); set(F.what, 'text', M.foes.what); set(F.sub, 'text', M.foes.dir + ' \u00b7 ' + M.foes.km); campPageHudPaintEnter(F.ent, M.foes.enter); const tm = M.foes.target, T = F.tg; set(T.el, 'display', tm ? '' : 'none'); if (tm) { campPageHudPaintMeter(T.hull, tm.hull); set(T.shield.el, 'display', tm.shield ? '' : 'none'); if (tm.shield) campPageHudPaintMeter(T.shield, tm.shield); set(T.none, 'display', tm.shield ? 'none' : ''); set(T.none, 'text', tm.noshield); set(T.act, 'text', tm.doing); } }
  const E = R.edge; set(E.el, 'display', M.edge ? '' : 'none');
  if (M.edge) { set(E.text, 'text', M.edge.n + ' \u00b7 ' + M.edge.km); set(E.ic, '--a', String(Math.round(M.edge.angle * 180 / Math.PI)) + 'deg'); }
  const FI = R.first, fm = M.first; set(FI.el, 'display', fm ? '' : 'none');
  if (fm) { while (FI.items.length < fm.items.length) { const grp = campPageHudEl(doc, 'div', 'ph-fc', FI.el); FI.items.push({ key: campPageHudEl(doc, 'span', 'ph-k', grp), word: campPageHudEl(doc, 'span', 'ph-lab', grp) }); } set(FI.el, 'opacity', String(Math.round(0.72 * fm.a * 100) / 100)); fm.items.forEach((x, i) => { set(FI.items[i].key, 'text', x.key); set(FI.items[i].word, 'text', x.word); }); }
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
  if (s) { s.pageHud = null; s.pageHudHeld = false; }
  if (typeof CAMP_CORNER_SHIFT === 'object') { CAMP_CORNER_SHIFT.tl = 0; CAMP_CORNER_SHIFT.bl = 0; CAMP_CORNER_SHIFT.tr = 0; }
  if (s) { s.pageHudStack = 0; campPageHudHideLines(s, false); if (R && R.backAlpha !== undefined && s.hudBack && s.hudBack.setAlpha) s.hudBack.setAlpha(R.backAlpha); }
}
function campPageHudHideLines(s, on) { // the canvas lines the page HUD replaces that the scene keeps as objects: the bottom key line and its strip, and the labels the world draws at the places (landing 3)
  const off = on && campPageHudHides('keys'), put = (o, v) => { if (o && typeof o.setVisible === 'function' && o.visible !== v) o.setVisible(v); };
  if (s.hud && s.hudOn !== false) put(s.hud.keys, !off); put(s.keysBack, !off);
  const offG = on && campPageHudHides('goal'); if (s.hud) { put(s.hud.obj, !offG); put(s.hud.wave, !offG); } // the goal line and the wave line of the canvas (their words are still set: the column's flow is as it was)
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
  const K = CAMP_PAGEHUD, t = +now || 0, canvas = s.game && s.game.canvas;
  if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return false;
  if (campPageHudCovered(s)) { if (s.pageHud) campPageHudSet(s.pageHud.root, 'display', 'none'); return false; } // a card is up: nothing is built, placed or painted, the panels wait hidden
  if (!s.pageHud) { s.pageHud = campPageHudBuild(document); s.pageHud.at = -1e9; document.body.appendChild(s.pageHud.root); if (s.events && s.events.once) { const off = () => campPageHudDrop(s); s.events.once('shutdown', off); s.events.once('destroy', off); } if (s.events && s.events.on && !s.pageHudEv) { s.pageHudEv = true; s.events.on('pause', () => campPageHudCover(s, true)); s.events.on('resume', () => campPageHudCover(s, false)); } }
  const R = s.pageHud; if (t - R.at < K.every && t >= R.at) return true; // 10 a second at most
  R.at = t;
  const r = canvas.getBoundingClientRect(), set = campPageHudSet, cam = s.cameras && s.cameras.main, fs = r.width * K.em; // the HUD sits over the canvas, the same size; the font size is a share of its width
  set(R.root, 'display', ''); // shown again when a card closes (set 'none' while one is up)
  set(R.root, 'left', Math.round(r.left) + 'px'); set(R.root, 'top', Math.round(r.top) + 'px'); set(R.root, 'width', Math.round(r.width) + 'px'); set(R.root, 'height', Math.round(r.height) + 'px'); set(R.root, 'fontSize', Math.round(fs * 100) / 100 + 'px');
  const view = cam ? { x: cam.scrollX, y: cam.scrollY, zoom: cam.zoom } : null;
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
    if (s.hudBack && s.hudBack.setAlpha) { if (R.backAlpha === undefined) R.backAlpha = s.hudBack.alpha; s.hudBack.setAlpha(0); }
    // in space: the pill at the edge for the hostiles off the screen, and a pill for each place in view (world px to the canvas's px)
    const M = R.last = campPageModel(C, view);
    if (M.edge) { set(R.edge.el, 'left', Math.round(Math.max(70, Math.min(W - 70, M.edge.x)) * k) + 'px'); set(R.edge.el, 'top', Math.round(Math.max(30, Math.min(H - 30, M.edge.y)) * k) + 'px'); }
    R.pills.forEach((p, i) => { const pl = M.places[i]; if (pl) { set(p, 'left', Math.round(pl.x * k) + 'px'); set(p, 'top', Math.round(pl.y * k) + 'px'); } });
  }
  return true;
}
