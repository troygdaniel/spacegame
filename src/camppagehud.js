// ---------- The page HUD: the Campaign's flight HUD as page elements over the canvas (card space-game-page-hud; Troy, 24 Nov 2026: "rebuild the Campaign's flight HUD as page elements over the game canvas, in the look of the agent board"; the mock is docs/hud-mock.html) ----------
// The canvas draws bold text and hard outlines, which cannot do soft panels or a good typeface; ordinary page elements styled with CSS can. This file is a VIEW: it reads the same pure functions the canvas HUD reads (campCruiserStatus, campSelList and
// campTdispDoing, the key table) and gives no orders. Ships, fights, the map and every rule stay as they are, and the canvas HUD is KEPT: the page HUD is behind one switch, OFF by default (CAMP.flags.pagehud: a row of the N panel, or the address flag ?pagehud=1).
// While it is on, the canvas parts it replaces are not drawn (campPageHudHides: the shield and hull plate, the Q CRUISER and W rows) and the lists and details that open under those rows open under the page panel instead (CAMP_CORNER_SHIFT, src/campcorner.js).
//   THE LANDINGS  1 the cruiser and the pilots (this file's first panel); 2 the goal and the stock (ore, missiles); 3 the hostiles, the friendlies and the pills in space. Each is a piece of CAMP_PAGEHUD.hides and a panel below.
//   THE RULES     no image files, no libraries, no web font (the typeface is the system one, two weights, 400 and 600: src/camppagehud.css); every key chip reads the key table (src/data_controls.js), no letter is written here;
//                 the HUD is updated 10 times a second at most (CAMP_PAGEHUD.every) and an element is written only when its value changed (a repainted label every frame was a large cost); sizes are em of one font size set from the canvas width
//   campPageHudOn()                    is the page HUD on: the flag of the N panel, or the address
//   campPageHudHides(id)               true when the page HUD has what the canvas shows under this name ('status', or a corner's id): the canvas leaves it out
//   campPageModel(C)                   PURE: what each panel shows now: { ship: { key, label, shield: { frac, n, show }, hull: {...} }, pilots: { key, items: [{ id, name, initial, digit, frac, color, on, pick }], doing, who } }
//   campPageHudBuild(doc)              the elements, made once: { root, ship: {...refs} }
//   campPageHudPaint(R, M)             writes the model into the elements: only what changed
//   campPageHudSync(s, now)            the scene calls it every frame (src/campaignscene.js): at most 10 times a second it builds, places and paints the HUD, and takes it away when the switch is off or the scene is over
const CAMP_PAGEHUD = {
  em: 0.0112,              // the HUD's font size: this share of the canvas width (about 1.1 percent), so it scales with the window
  every: 100,              // ms between two updates: 10 a second
  num: 4000,               // ms (the battle's clock) a shield or hull number stays after the value is full again; below full it shows all the time
  low: 0.6, crit: 0.3,     // a pilot's ring: the good colour, the warning colour under 60 percent of the hull, the hostile colour under 30
  addr: 'pagehud',         // the address flag: index.html?campaign=1&pagehud=1
  hides: ['status', 'cruiser', 'fleet'] // what the canvas leaves out while the page HUD is on: landing 1 (the cruiser panel and the pilots)
};
const CAMP_PAGEHUD_MEM = new WeakMap(); // C -> when each number was last seen below full

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
function campPageHudMem(C) { let m = CAMP_PAGEHUD_MEM.get(C); if (!m) { m = { shield: -1e9, hull: -1e9 }; CAMP_PAGEHUD_MEM.set(C, m); } return m; }
function campPageHudBar(m, id, d, C) { // a meter: its share, its number, and whether the number shows: while below full, and for CAMP_PAGEHUD.num ms after
  if (d.frac < 1) m[id] = C.t;
  return { frac: d.frac, n: d.n, show: d.frac < 1 || C.t - m[id] < CAMP_PAGEHUD.num };
}
const campPageHudCap1 = t => String(t || '').charAt(0).toUpperCase() + String(t || '').slice(1);
function campPageModel(C) {
  if (!C || !C.carrier) return null;
  const S = campCruiserStatus(C), m = campPageHudMem(C);
  const ship = { key: campCornerCap('zoomreset'), label: uiText('camp.corner.cruiser'), shield: campPageHudBar(m, 'shield', S.shield, C), hull: campPageHudBar(m, 'hull', S.hull, C) };
  const rows = typeof campPanelDef === 'function' && campPanelDef('fleet') ? campPanelList(C, 'fleet').filter(r => r.who && r.who !== 'all') : [], stops = typeof campSelList === 'function' ? campSelList(C) : [], now = typeof campSelNow === 'function' ? campSelNow(C) : null, K = CAMP_PAGEHUD;
  const items = rows.map((r, i) => {
    const e = stops.find(x => x.id === r.who), u = e && e.unit, up = !!u && u.hp > 0 && !u.gone, name = e ? e.name : campSelPilotName(null, String(r.who).replace(CAMP_SELPILOT, '')), frac = up ? campTdispHull(u).share : 0;
    return { id: r.who, name, initial: name.charAt(0).toUpperCase(), digit: String(i + 1), frac, color: frac < K.crit ? 'foe' : frac < K.low ? 'warn' : 'good', on: up, pick: !!now && (now.kind === 'all' || now.id === r.who) }; // pick: the digit is lit (All pilots lights every one: card space-game-w4-all-lit)
  });
  const out = now && now.kind === 'pilot' ? [now.unit] : (typeof campSelAllUnits === 'function' ? campSelAllUnits(C) : []), lead = out.find(u => u && u.hp > 0 && !u.gone);
  return { ship, pilots: { key: campCornerCap('who'), items, doing: lead ? campPageHudCap1(campTdispDoing(C, lead)) : uiText('camp.corner.bay'), who: now && now.kind === 'pilot' ? now.name : uiText('camp.sel.all') } };
}

// ---- the elements ----
const CAMP_PAGEHUD_ICON = { // inline SVG (no image files): the shield and the hull of the mock
  shield: '<svg class="ph-ic" viewBox="0 0 16 16" fill="none" stroke="#6fd6ff" stroke-width="1.6"><path d="M8 1.5l5 2v4.2c0 3-2.1 5.4-5 6.8-2.9-1.4-5-3.8-5-6.8V3.5z"/></svg>',
  hull: '<svg class="ph-ic" viewBox="0 0 16 16" fill="none" stroke="#4fe0a6" stroke-width="1.6"><rect x="2" y="5" width="12" height="6" rx="1.5"/><path d="M5 5V3h6v2"/></svg>'
};
function campPageHudEl(doc, tag, cls, parent) { const e = doc.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }
function campPageHudBuild(doc) {
  const root = campPageHudEl(doc, 'div', 'ph-root'), ship = campPageHudEl(doc, 'div', 'ph-p ph-ship', root), R = { root, ship: { el: ship, pilots: [] } };
  const head = campPageHudEl(doc, 'div', 'ph-row', ship); R.ship.key = campPageHudEl(doc, 'span', 'ph-k', head); R.ship.label = campPageHudEl(doc, 'span', 'ph-lab', head);
  ['shield', 'hull'].forEach(id => { const row = campPageHudEl(doc, 'div', 'ph-row', ship), ic = campPageHudEl(doc, 'span', 'ph-icw', row), meter = campPageHudEl(doc, 'div', 'ph-meter', row), fill = campPageHudEl(doc, 'i', 'ph-fill ph-' + id, meter), num = campPageHudEl(doc, 'span', 'ph-num', row); ic.innerHTML = CAMP_PAGEHUD_ICON[id]; R.ship[id] = { fill, num }; });
  const pl = campPageHudEl(doc, 'div', 'ph-pilots', ship); R.ship.plBox = pl; R.ship.pkey = campPageHudEl(doc, 'span', 'ph-k', pl);
  R.ship.doingBox = campPageHudEl(doc, 'div', 'ph-doing', pl); R.ship.doing = campPageHudEl(doc, 'span', '', R.ship.doingBox); R.ship.who = campPageHudEl(doc, 'em', '', R.ship.doingBox);
  return R;
}
// the element's property is written only when its value is not the one it has (a repainted label every frame was a large cost): the last value is kept on the element
function campPageHudSet(el, prop, v) { if (!el) return false; const m = el._ph || (el._ph = {}); if (m[prop] === v) return false; m[prop] = v; if (prop === 'text') el.textContent = v; else if (prop === 'cls') el.className = v; else if (prop.charAt(0) === '-') el.style.setProperty(prop, v); else el.style[prop] = v; return true; }
function campPageHudPilots(doc, R, n) { // the rings: made when the number of pilots is not what is there (once, in a game)
  if (R.ship.pilots.length === n) return;
  R.ship.pilots.forEach(p => p.el.parentNode && p.el.parentNode.removeChild(p.el));
  R.ship.pilots = []; const box = R.ship.plBox;
  for (let i = 0; i < n; i++) { const el = campPageHudEl(doc, 'div', 'ph-pilot'), ring = campPageHudEl(doc, 'div', 'ph-ring', el), letter = campPageHudEl(doc, 'span', '', ring), digit = campPageHudEl(doc, 'small', '', el); box.insertBefore ? box.insertBefore(el, R.ship.doingBox) : box.appendChild(el); R.ship.pilots.push({ el, ring, letter, digit }); }
}
function campPageHudPaint(R, M, doc) {
  if (!R || !M) return;
  const S = R.ship, set = campPageHudSet;
  set(S.key, 'text', M.ship.key); set(S.label, 'text', M.ship.label);
  ['shield', 'hull'].forEach(id => { const b = M.ship[id]; set(S[id].fill, 'width', Math.round(b.frac * 1000) / 10 + '%'); set(S[id].num, 'text', b.show ? String(b.n) : ''); });
  campPageHudPilots(doc, R, M.pilots.items.length);
  set(S.pkey, 'text', M.pilots.key);
  M.pilots.items.forEach((p, i) => { const e = S.pilots[i]; set(e.el, 'cls', 'ph-pilot' + (p.on ? ' on' : '') + (p.pick ? ' pick' : '')); set(e.ring, '--v', String(Math.round(p.frac * 100))); set(e.ring, '--c', 'var(--ph-' + p.color + ')'); set(e.letter, 'text', p.initial); set(e.digit, 'text', p.digit); });
  set(S.doing, 'text', M.pilots.doing); set(S.who, 'text', M.pilots.who);
}

// ---- the scene's call ----
function campPageHudDrop(s) { // the HUD is taken away; the canvas rows and lists are where they were
  const R = s && s.pageHud; if (R && R.root && R.root.parentNode) R.root.parentNode.removeChild(R.root);
  if (s) s.pageHud = null;
  if (typeof CAMP_CORNER_SHIFT === 'object') { CAMP_CORNER_SHIFT.tl = 0; CAMP_CORNER_SHIFT.bl = 0; }
}
function campPageHudSync(s, now) {
  if (!s || typeof document === 'undefined') return false;
  const C = s.camp, on = !!C && !!C.carrier && campPageHudOn() && (s.mode === 'play' || s.mode === 'pause') && !s.mp;
  if (!on) { if (s.pageHud) campPageHudDrop(s); return false; }
  const K = CAMP_PAGEHUD, t = +now || 0, canvas = s.game && s.game.canvas;
  if (!canvas || typeof canvas.getBoundingClientRect !== 'function') return false;
  if (!s.pageHud) { s.pageHud = campPageHudBuild(document); s.pageHud.at = -1e9; document.body.appendChild(s.pageHud.root); if (s.events && s.events.once) { const off = () => campPageHudDrop(s); s.events.once('shutdown', off); s.events.once('destroy', off); } }
  const R = s.pageHud; if (t - R.at < K.every && t >= R.at) return true; // 10 a second at most
  R.at = t;
  const r = canvas.getBoundingClientRect(), set = campPageHudSet; // the HUD sits over the canvas, the same size; the font size is a share of its width
  set(R.root, 'left', Math.round(r.left) + 'px'); set(R.root, 'top', Math.round(r.top) + 'px'); set(R.root, 'width', Math.round(r.width) + 'px'); set(R.root, 'height', Math.round(r.height) + 'px'); set(R.root, 'fontSize', Math.round(r.width * K.em * 100) / 100 + 'px');
  campPageHudPaint(R, campPageModel(C), document);
  // the lists and the details that open under the Q CRUISER and W rows open under the panel: the rows' place moves down to the panel's bottom (game px: the canvas is r.width / W px wide)
  if (R.ship.el.getBoundingClientRect && r.width > 0 && typeof CAMP_CORNER_SHIFT === 'object') {
    const pr = R.ship.el.getBoundingClientRect(), k = r.width / W, bottom = (pr.bottom - r.top) / k, A = CAMP.corner.at, th = CAMP.corner.title.h;
    if (bottom > 0) { CAMP_CORNER_SHIFT.tl = Math.round(bottom - th - A.tl.y); CAMP_CORNER_SHIFT.bl = Math.round(bottom + CAMP.corner.stack - A.bl.y); }
  }
  return true;
}
