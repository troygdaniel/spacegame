// ---------- The new Long Haul: the Campaign's page HUD in flight (PROMPT 23, piece 8 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// The Campaign's flight HUD is page elements over the canvas (src/camppagehud.js and its stylesheet: dark rounded panels, thin meters, key chips, pills at the screen's edge). Long Haul's is drawn on the canvas in cyan
// neon (src/hud.js: two dials, a frame of corner brackets, a line of thirteen keys). With the switch on, the flight's own readouts are the Campaign's panels, built and painted by the Campaign's OWN functions
// (campPageHudBuild makes the elements, campPageHudPaint paints a model into them, campPageHudBar makes a meter's row): this file only makes the MODEL from Long Haul's state and says where the panels stand.
//   the ship panel, top left     Hull, Shields (when a shield part is fitted), Boost (the energy store; "Refilling" while it is locked), Speed
//   the hostiles panel, right    how many pirates of which kinds are near, which way and how far, under the radar; a pink pill at the screen's edge points at them while none is on the screen
//   the key row, bottom centre   six chips in place of the line of thirteen keys: fly, fire, boost, dock, places, keys (every other key is on the H page as before)
// What stays on the canvas, because the Campaign's HUD has no panel for it: the fuel, credits, parts and ore strip, the mission box, the radar, the target's brackets and the prompts. The Campaign's own panels that
// Long Haul has nothing for (the pilots' rings, the goal, the ore and missiles) are not shown. No word is new except the three chips Dock, Places and Keys (content/text/longhaul.md: lh.chip.*).
// The model is pure (tests/lhpagehud.mjs runs it in Node); the sync needs a page and is asked first by src/hud.js, which then leaves its two dials, its frame and the key line out.
//   LHHUD.keys                the key row: [id, the cap as Long Haul's keyboard has it, the word's content key]
//   lhPageModel(v)            PURE: the model campPageHudPaint takes, from a plain view v { hull, maxHull, shield: { pts, max } | null, en, enMax, boosting, locked, speed, vmax, foes: [{ kind, name, dx, dy }], onScreen (a foe is on it), view: { w, h } }
//   lhPageHudView(scene)      that view, read from a Long Haul flight
//   lhPageHudSync(scene, now) once a frame from hudTick: builds the panels once, paints the model ten times a second, places the hostiles panel and the edge pill. true while the page HUD is up (hud.js then skips its dials)
//   lhPageHudDrop(scene)      takes the panels off the page (the scene's shutdown)
const LHHUD = {
  every: 100,                 // ms between two paints (the Campaign's own rate)
  near: 2600,                 // px: a pirate this near is in the hostiles panel (a timed spawn appears 1,600 px away and engages from about 1,000)
  shipW: '17em',              // the ship panel's least width
  foesTop: 300,               // game px from the top: the hostiles panel stands under Long Haul's radar and its two lines
  inset: [0.05, 0.22, 0.88],  // the edge pill keeps inside the screen: this share from the left and right edges, and between these shares of the height (clear of the panels at the top and the key row)
  keys: [['fly', 'WASD', 'camp.corner.chip.fly'], ['fire', 'Space', 'camp.corner.chip.fire'], ['boost', 'Shift', 'camp.corner.chip.boost'], ['dock', 'L', 'lh.chip.dock'], ['places', 'N', 'lh.chip.places'], ['keys', 'H', 'lh.chip.keys']]
};
const lhPageHudOn = () => typeof lhNewOn === 'function' && lhNewOn() && typeof campPageHudBuild === 'function' && typeof campPageHudPaint === 'function';
function lhPageModel(v) {
  const bar = (frac, id) => campPageHudBar({ frac: Math.max(0, Math.min(1, +frac || 0)) }, id);
  const bf = v.enMax > 0 ? Math.max(0, Math.min(1, v.en / v.enMax)) : 1;
  const ship = { key: '', hull: bar(v.maxHull > 0 ? v.hull / v.maxHull : 0, 'hull'), shield: v.shield && v.shield.max > 0 ? bar(v.shield.pts / v.shield.max, 'shield') : null, cruiser: null,
    boost: { frac: bf, pct: Math.max(0, Math.min(99, Math.floor(bf * 100))), show: bf < 1, word: uiText('camp.corner.m.boost'), on: !!v.boosting, locked: !!v.locked, full: bf >= 1, pctText: v.locked ? uiText('camp.corner.m.refilling') : undefined },
    speed: { word: uiText('camp.corner.m.speed'), n: Math.round(v.speed || 0), show: (v.speed || 0) >= 1, over: v.vmax > 0 && v.speed > v.vmax * 1.02 } };
  const fs = (v.foes || []).map(f => Object.assign({ d: Math.hypot(f.dx, f.dy) }, f)).filter(f => f.d <= LHHUD.near).sort((a, b) => a.d - b.d);
  let foes = null, edge = null;
  if (fs.length) {
    const kinds = {}, names = {}; fs.forEach(f => { kinds[f.kind] = (kinds[f.kind] || 0) + 1; names[f.kind] = f.name; });
    const what = Object.keys(kinds).sort((a, b) => kinds[b] - kinds[a] || (a < b ? -1 : 1)).map(k => uiText('camp.sight.kind.' + (kinds[k] === 1 ? 'one' : 'many'), { n: kinds[k], kind: names[k] })).join(', ');
    const n0 = fs[0], km = uiText('camp.tdisp.km', { km: Math.round(n0.d / 10) });
    foes = { key: '', label: uiText('camp.corner.hostiles'), enter: null, what, dir: campSightDir(n0.dx, n0.dy), km, target: null };
    if (!v.onScreen) edge = { n: fs.length, km, angle: Math.atan2(n0.dy, n0.dx), dx: n0.dx, dy: n0.dy };
  }
  return { first: { a: 1, items: LHHUD.keys.map(k => ({ id: k[0], key: k[1], word: uiText(k[2]) })) }, ship, goal: null, hint: null, mother: null, foes, edge, fedges: [], was: {}, places: [],
    stock: { ore: { frac: 0 }, missiles: { cap: 0, n: 0, queued: 0, building: false, loading: false, progress: 0, key: '' } },
    pilots: { key: '', items: [], open: false }, friends: { key: '', items: [], open: false, enter: null } };
}
function lhPageHudView(scene) {
  const ship = scene.ship, cam = scene.cameras.main, wv = cam.worldView, foes = []; let onScreen = false;
  if (scene.enemies) scene.enemies.getChildren().forEach(e => {
    if (!e.active || !(e.hp > 0)) return;
    const def = e.def || {}, key = def.key || def.tex || 'pirate', name = def.name || key.charAt(0).toUpperCase() + key.slice(1);
    foes.push({ kind: key, name, dx: e.x - ship.x, dy: e.y - ship.y });
    if (wv && e.x >= wv.x && e.x <= wv.x + wv.width && e.y >= wv.y && e.y <= wv.y + wv.height) onScreen = true;
  });
  return { hull: G.hull, maxHull: G.maxHull, shield: scene.sh || null, en: scene.en, enMax: scene.enMax, boosting: !!scene.boosting, locked: !!scene.boostLocked, speed: ship.body ? ship.body.speed : 0, vmax: typeof shipStat === 'function' ? shipStat('vmax') : 0, foes, onScreen };
}
function lhPageHudDrop(scene) { const R = scene && scene.lhHud; if (R && R.root && R.root.parentNode) R.root.parentNode.removeChild(R.root); if (scene) scene.lhHud = null; }
function lhPageHudSync(scene, now) {
  if (!lhPageHudOn() || typeof document === 'undefined' || !scene || !scene.ship || !scene.game) return false;
  const canvas = scene.game.canvas; if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return false;
  const set = campPageHudSet, t = +now || 0;
  if (scene.dead || scene.leaving) { if (scene.lhHud) set(scene.lhHud.root, 'display', 'none'); return true; } // a docking or landing move, or your ship's end: the panels wait hidden
  if (!scene.lhHud) {
    const R = scene.lhHud = campPageHudBuild(document); R.at = -1e9; document.body.appendChild(R.root);
    [R.ship.key, R.foes.key, R.fleet.el, R.stock.el, R.goal.el, R.radio.el, R.sent.el, R.qrow.el, R.list.el].forEach(el => { if (el) el.style.display = 'none'; }); // the Campaign's panels Long Haul has nothing for (the rule line over the pilots' row goes with it, below)
    const hr = R.ship.el.querySelector ? R.ship.el.querySelector('.ph-hr') : null; if (hr) hr.style.display = 'none';
    R.ship.el.style.minWidth = LHHUD.shipW; // (the Campaign's panel is as wide as its pilots' row; with no row the meters would be a few px long)
    if (scene.events && scene.events.once) scene.events.once('shutdown', () => lhPageHudDrop(scene));
  }
  const R = scene.lhHud; if (t - R.at < LHHUD.every && t >= R.at) return true;
  R.at = t;
  const r = canvas.getBoundingClientRect(), M = lhPageModel(lhPageHudView(scene));
  set(R.root, 'display', ''); set(R.root, 'left', Math.round(r.left) + 'px'); set(R.root, 'top', Math.round(r.top) + 'px'); set(R.root, 'width', Math.round(r.width) + 'px'); set(R.root, 'height', Math.round(r.height) + 'px');
  set(R.root, 'fontSize', Math.round(r.width * CAMP_PAGEHUD.em * 100) / 100 + 'px');
  campPageHudPaint(R, M, document);
  [R.stock.el, R.goal.el, R.fleet.el].forEach(el => { el.style.display = 'none'; }); // (the painter shows a panel its model has a row for: these three stay out)
  const k = r.height / (typeof H === 'number' && H > 0 ? H : 720);
  set(R.foes.el, 'top', Math.round(LHHUD.foesTop * k) + 'px');
  if (M.edge) { // the pill stands on the line from the middle of the screen to the nearest pirate, inside the screen's edge, and its arrow points along that line
    const I = LHHUD.inset, a = M.edge.angle, hw = r.width * (0.5 - I[0]), up = r.height * (0.5 - I[1]), down = r.height * (I[2] - 0.5), c = Math.cos(a), s = Math.sin(a);
    const kx = Math.abs(c) > 1e-6 ? hw / Math.abs(c) : 1e9, ky = Math.abs(s) > 1e-6 ? (s < 0 ? up : down) / Math.abs(s) : 1e9, d = Math.min(kx, ky);
    set(R.edge.el, 'left', Math.round(r.width / 2 + c * d) + 'px'); set(R.edge.el, 'top', Math.round(r.height / 2 + s * d) + 'px');
  }
  return true;
}
