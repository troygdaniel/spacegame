// ---------- The new Long Haul: the Campaign's page HUD in flight (PROMPT 23, piece 8 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// The Campaign's flight HUD is page elements over the canvas (src/camppagehud.js and its stylesheet: dark rounded panels, thin meters, key chips, pills at the screen's edge). Long Haul's is drawn on the canvas in cyan
// neon (src/hud.js: two dials, a frame of corner brackets, a line of thirteen keys). With the switch on, the flight's own readouts are the Campaign's panels, built and painted by the Campaign's OWN functions
// (campPageHudBuild makes the elements, campPageHudPaint paints a model into them, campPageHudBar makes a meter's row): this file only makes the MODEL from Long Haul's state and says where the panels stand.
//   the ship panel, top left     Hull, Shields (when a shield part is fitted), Boost (the energy store; "Refilling" while it is locked), Speed
//   the hostiles panel, right    how many pirates of which kinds are near, which way and how far, under the radar; a pink pill at the screen's edge points at them while none is on the screen
//   the key row, bottom centre   six chips in place of the line of thirteen keys: fly, fire, boost, dock, places, keys (every other key is on the H page as before)
// ONE STYLE (card space-game-lh-hud-one-style; Troy, 28 Nov 2026: yes, the layout picture): the old canvas pieces are page panels in the same look too, with every number and key they had:
//   the supplies panel, top right    Cr (the figure counts to the real value, +N or -N floats, a gold or red flash), the fuel meter (amber under a quarter, red and beating under a tenth), the ore meter (red and beating when the hold is full), the six parts SHD WPN ENG TNK CRG AIM with a pip a tier (AIM red while R has it off)
//   the mission panel, top centre    slim: the step you are on (or NO ACTIVE MISSION and the next line) and the T cap; open: Mission, T Hide, the reward, the title and place, a cell a step, the steps, the next line, the meter; a click or T opens and shuts it
//   the tip, above the key row       the same words and the H Hide tips cap
//   the talk cap, left               src/listen.js draws it in the same look under the switch
// The radar moves down under the supplies panel (src/hud.js h.radarCy), the hostiles panel with it; the panels say where they stand to the rest of the HUD (h.zones) and to the toasts (scene.toastTop).
// What stays on the canvas, because the Campaign's HUD has no panel for it: the radar, the target's brackets, the place marker, the navigation panel and the prompts. The Campaign's own panels that
// Long Haul has nothing for (the pilots' rings, the goal, the ore and missiles) are not shown. No word is new except the three chips Dock, Places and Keys (content/text/longhaul.md: lh.chip.*).
// The model is pure (tests/lhpagehud.mjs runs it in Node); the sync needs a page and is asked first by src/hud.js, which then leaves its two dials, its frame and the key line out.
//   LHHUD.keys                the key row: [id, the cap as Long Haul's keyboard has it, the word's content key]
//   lhPageModel(v)            PURE: the model campPageHudPaint takes, from a plain view v { hull, maxHull, shield: { pts, max } | null, en, enMax, boosting, locked, speed, vmax, foes: [{ kind, name, dx, dy }], onScreen (a foe is on it), view: { w, h } }
//   lhPageHudView(scene)      that view, read from a Long Haul flight
//   lhPageHudSync(scene, now) once a frame from hudTick: builds the panels once, paints the model ten times a second, places the hostiles panel and the edge pill. true while the page HUD is up (hud.js then skips its dials)
//   lhPageHudDrop(scene)      takes the panels off the page (the scene's shutdown)
//   lhSupplyModel(v), lhMissionModel(v), lhTipsModel(v)   PURE: what the supplies, mission and tip panels show, from a plain view (lhSideView reads it from the game); lhPageHudSide(scene, h, now) builds and paints them once a frame from hudTick
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
function lhPageHudDrop(scene) { const R = scene && scene.lhHud; if (R && R.root && R.root.parentNode) R.root.parentNode.removeChild(R.root); if (scene) { scene.lhHud = null; if (scene.toastTop && scene.toastTop.lh) delete scene.toastTop; } }
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
  set(R.foes.el, 'top', Math.round((scene._hud && scene._hud.radarCy ? scene._hud.radarCy + 188 : LHHUD.foesTop) * k) + 'px'); // under the radar, which the supplies panel moved down
  if (M.edge) { // the pill stands on the line from the middle of the screen to the nearest pirate, inside the screen's edge, and its arrow points along that line
    const I = LHHUD.inset, a = M.edge.angle, hw = r.width * (0.5 - I[0]), up = r.height * (0.5 - I[1]), down = r.height * (I[2] - 0.5), c = Math.cos(a), s = Math.sin(a);
    const kx = Math.abs(c) > 1e-6 ? hw / Math.abs(c) : 1e9, ky = Math.abs(s) > 1e-6 ? (s < 0 ? up : down) / Math.abs(s) : 1e9, d = Math.min(kx, ky);
    set(R.edge.el, 'left', Math.round(r.width / 2 + c * d) + 'px'); set(R.edge.el, 'top', Math.round(r.height / 2 + s * d) + 'px');
  }
  return true;
}

// ---------- the supplies, the mission and the tip (card space-game-lh-hud-one-style) ----------
const lhClamp01 = x => Math.max(0, Math.min(1, +x || 0));
// the supplies: v { now, cr: { show, gain: { v, t } | null, flash (ms), pulse (ms), pulseRed }, fuel: { frac, state }, ore, cap, parts: [{ short, tier, off }] }
function lhSupplyModel(v) {
  const now = +v.now || 0, cr = v.cr || {}, gain = cr.gain && now - cr.gain.t < 1300 ? cr.gain : null, pulse = cr.pulse > now ? (cr.pulse - now) / 650 : 0;
  const ore = Math.max(0, +v.ore || 0), cap = Math.max(0, +v.cap || 0), fuel = v.fuel || { frac: 0, state: 'ok' };
  return {
    cr: { text: hudFmt(cr.show || 0), glow: Math.round(pulse * 100) / 100, loss: !!cr.pulseRed && pulse > 0, flash: now < (cr.flash || 0), delta: gain ? { text: (gain.v > 0 ? '+' : '-') + hudFmt(Math.abs(gain.v)), loss: gain.v < 0, alpha: Math.round((1 - Math.pow((now - gain.t) / 1300, 2)) * 100) / 100 } : null },
    fuel: { frac: lhClamp01(fuel.frac), state: fuel.state === 'crit' ? 'crit' : fuel.state === 'ok' ? 'ok' : 'low' },
    ore: { n: ore, cap, frac: cap > 0 ? lhClamp01(ore / cap) : 0, full: cap > 0 && ore >= cap },
    parts: (v.parts || []).map(p => ({ short: p.short, tier: Math.max(0, Math.min(3, p.tier | 0)), off: !!p.off })),
    words: { cr: uiText('lh.hud.cr'), fuel: uiText('lh.hud.fuel'), ore: uiText('lh.hud.ore') }
  };
}
// the mission: v { m: hudMission's answer { kind: none | failed | active, head, sub, reward, cur, next, steps }, meter: { name, frac } | null, open }
function lhMissionModel(v) {
  const m = v.m || { kind: 'none', head: '', next: '' }, steps = m.steps || [], tone = m.kind === 'failed' ? 'bad' : m.kind === 'none' ? 'none' : 'live';
  const meter = v.meter ? { name: String(v.meter.name || ''), frac: lhClamp01(v.meter.frac), low: lhClamp01(v.meter.frac) < 0.3 } : null;
  if (!v.open) { // slim: the step you are on (the title when there are no steps), and the key that opens it; no steps: the next line under it
    const cur = m.steps && m.steps[m.cur] ? m.steps[m.cur].text : m.head;
    return { open: false, tone, key: 'T', head: String(cur || ''), next: m.steps ? '' : String(m.next || ''), meter };
  }
  return { open: true, tone, key: 'T', label: uiText('lh.hud.mission'), hide: uiText('lh.hud.hide'), reward: m.reward ? '+' + m.reward + ' cr' : '', head: String(m.head || ''), sub: String(m.sub || ''),
    steps: steps.map(s => ({ text: String(s.text), state: s.state })), next: String(m.next || ''), meter };
}
// the tip: v { text, hide (the H cap), away (the command strip is up) }
function lhTipsModel(v) {
  const text = String(v.text || ''), on = !!text && !v.away;
  return { on, text: on ? text : '', hide: on && !!v.hide, key: 'H', word: uiText('lh.hud.tips') };
}
function lhSideView(scene, h, now) {
  const slots = typeof PART_ORDER !== 'undefined' ? PART_ORDER : [], st = fuelState(), ml = h.lhMission || { m: { kind: 'none', head: '', next: '' }, meter: null, open: false };
  return {
    sup: { now, cr: { show: h.crShow == null ? G.credits : h.crShow, gain: h.gain || null, flash: h.flash || 0, pulse: h.pulse || 0, pulseRed: h.pulseCol === RED }, fuel: { frac: fuelFrac(), state: st }, ore: G.ore | 0, cap: holdCap(),
      parts: slots.map(slot => { const tier = partTier(slot); return { short: PARTS[slot].short, tier, off: slot === 'aim' && tier > 0 && !!G.aimOff }; }) },
    mis: ml,
    tips: { text: scene._gtext || '', hide: !!scene._gkOn, away: !!scene._gaway }
  };
}
const lhPageHudOwnsTips = scene => lhPageHudOn() && !!scene && !!scene.scene && scene.scene.key === 'Space'; // src/guide.js: the page draws the tip, the canvas leaves its text out
function lhSideBuild(scene, h) {
  const R = scene.lhHud, doc = document, E = (tag, cls, parent) => campPageHudEl(doc, tag, cls, parent || R.root), L = { at: -1e9, misSig: '', zones: [] };
  L.mis = E('div', 'ph-p ph-lhmis'); L.misBody = E('div', 'ph-lhmb', L.mis);
  L.mis.addEventListener('mousedown', ev => { if (ev.preventDefault) ev.preventDefault(); });
  L.mis.addEventListener('click', () => { if (typeof hudToggle === 'function' && scene._hud) hudToggle(scene._hud, scene, true); }); // the checklist is a button: a click (or T) opens or shuts it, the shot held back
  L.res = E('div', 'ph-p ph-lhres');
  L.crRow = E('div', 'ph-lhcr', L.res); E('i', 'ph-coin', L.crRow); L.crLab = E('span', 'ph-lab', L.crRow); L.crVal = E('b', '', L.crRow); L.crDelta = E('span', 'ph-lhd', L.crRow);
  const meter = (label, fillCls) => { const row = E('div', 'ph-row ph-lhrow', L.res), lab = E('span', 'ph-lab', row), m = E('div', 'ph-meter', row), fill = E('i', 'ph-fill ' + fillCls, m); return { row, lab, fill }; };
  L.fuel = meter('fuel', 'ph-fuel'); L.ore = meter('ore', 'ph-ore');
  L.parts = E('div', 'ph-parts', L.res); L.part = [];
  for (let i = 0; i < 6; i++) { const c = E('div', 'ph-part', L.parts), n = E('span', '', c), pp = E('span', 'pp', c); L.part.push({ c, n, pips: [E('i', '', pp), E('i', '', pp), E('i', '', pp)] }); }
  L.tips = E('div', 'ph-p ph-lhtips gone'); L.tipText = E('span', '', L.tips); L.tipKey = E('span', 'ph-lhtk', L.tips); L.tipCap = E('i', 'ph-k', L.tipKey); L.tipWord = E('span', '', L.tipKey);
  scene.toastTop = () => Math.max(typeof TOAST === 'object' ? TOAST.top : 86, Math.ceil((L.misBottom || 0) + 6)); scene.toastTop.lh = true; // a toast starts under the mission panel, slim or open (src/common.js toast)
  return L;
}
function lhSideMission(L, M, R) { // the mission panel's rows, made again when what they say changes
  const sig = JSON.stringify(M); if (sig === L.misSig) return; L.misSig = sig;
  const E = (tag, cls, parent) => campPageHudEl(document, tag, cls, parent), body = L.misBody; while (body.firstChild) body.removeChild(body.firstChild);
  const txt = (el, t) => { el.textContent = t; return el; };
  if (!M.open) {
    const row = E('div', 'ph-lhm1', body); txt(E('span', 'ph-lhstep ' + M.tone, row), M.head); txt(E('i', 'ph-k', row), M.key);
    if (M.next) txt(E('div', 'ph-hint ' + M.tone, body), M.next);
  } else {
    const r1 = E('div', 'ph-lhm1', body), lab = txt(E('span', 'ph-lab', r1), M.label), hide = E('span', 'ph-lhhide', r1); txt(E('i', 'ph-k', hide), M.key); txt(E('span', '', hide), M.hide);
    if (M.reward) txt(E('b', 'ph-lhrew', r1), M.reward);
    const hd = E('div', 'ph-lhhead ' + M.tone, body); txt(E('b', '', hd), M.head); if (M.sub) txt(E('span', 'ph-lhsub', hd), M.sub);
    if (M.steps.length) {
      const pr = E('div', 'ph-lhprog', body); M.steps.forEach(st => E('i', st.state, pr));
      const ls = E('div', 'ph-lhsteps', body); M.steps.forEach(st => { const r = E('div', 'ph-lhstp ' + st.state, ls); E('span', 'ph-lhbox', r); txt(E('span', '', r), st.text); });
    }
    if (M.next) txt(E('div', 'ph-hint ' + M.tone, body), M.next);
  }
  if (M.meter) { const mr = E('div', 'ph-lhmeter' + (M.meter.low ? ' low' : ''), body); txt(E('span', 'ph-lab', mr), M.meter.name); const mt = E('div', 'ph-meter', mr), f = E('i', 'ph-fill', mt); f.style.width = Math.round(M.meter.frac * 1000) / 10 + '%'; }
}
function lhPageHudSide(scene, h, now) {
  const R = scene && scene.lhHud; if (!R || !h || typeof document === 'undefined') return;
  if (!R.lh) R.lh = lhSideBuild(scene, h);
  const L = R.lh, set = campPageHudSet, t = +now || 0, canvas = scene.game && scene.game.canvas;
  if (t - L.at >= LHHUD.every || t < L.at) {
    L.at = t;
    const V = lhSideView(scene, h, t), S = lhSupplyModel(V.sup), M = lhMissionModel(V.mis), P = lhTipsModel(V.tips);
    set(L.res, 'cls', 'ph-p ph-lhres' + (S.cr.glow > 0 ? (S.cr.loss ? ' loss' : '') : '') + (S.cr.flash ? ' flash' : '')); set(L.res, '--g', String(S.cr.glow));
    set(L.crLab, 'text', S.words.cr); set(L.crVal, 'text', S.cr.text);
    set(L.crDelta, 'text', S.cr.delta ? S.cr.delta.text : ''); set(L.crDelta, 'cls', 'ph-lhd' + (S.cr.delta && S.cr.delta.loss ? ' loss' : '')); set(L.crDelta, 'opacity', S.cr.delta ? String(S.cr.delta.alpha) : '0');
    set(L.fuel.lab, 'text', S.words.fuel); set(L.fuel.fill, 'cls', 'ph-fill ph-fuel' + (S.fuel.state === 'ok' ? '' : ' ' + S.fuel.state)); set(L.fuel.fill, 'width', Math.round(S.fuel.frac * 1000) / 10 + '%');
    set(L.ore.lab, 'text', S.words.ore); set(L.ore.fill, 'cls', 'ph-fill ph-ore' + (S.ore.full ? ' full' : '')); set(L.ore.fill, 'width', Math.round(S.ore.frac * 1000) / 10 + '%');
    S.parts.forEach((p, i) => { const c = L.part[i]; if (!c) return; set(c.c, 'cls', 'ph-part' + (p.tier > 0 ? ' have' : '') + (p.off ? ' off' : '')); set(c.n, 'text', p.short); c.pips.forEach((pip, j) => set(pip, 'cls', p.tier > j ? 'on' : '')); });
    lhSideMission(L, M, R);
    set(L.tips, 'cls', 'ph-p ph-lhtips' + (P.on ? '' : ' gone')); set(L.tipText, 'text', P.text); set(L.tipKey, 'display', P.hide ? '' : 'none'); set(L.tipCap, 'text', P.key); set(L.tipWord, 'text', P.word);
    // where they stand, in the canvas HUD's numbers: the rest of the HUD keeps clear of them (h.zones), the radar goes under the supplies, a toast under the mission panel
    const r = canvas && canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : null, k = r && r.height > 0 ? r.height / (typeof H === 'number' && H > 0 ? H : 720) : 0;
    L.zones = [];
    if (r && k > 0) {
      [L.mis, L.res, L.tips].forEach((el, i) => {
        if (!el || !el.getBoundingClientRect || (i === 2 && !P.on)) return;
        const b = el.getBoundingClientRect(); if (!(b.width > 0)) return;
        const z = { x0: (b.left - r.left) / k, y0: (b.top - r.top) / k, x1: (b.right - r.left) / k, y1: (b.bottom - r.top) / k }; L.zones.push(z);
        if (i === 0) L.misBottom = z.y1; else if (i === 1) h.radarCy = Math.max(112, Math.ceil(z.y1) + 8 + 88);
      });
    }
  }
  (L.zones || []).forEach(z => h.zones.push(z));
  if (scene.toastTop && scene.toastTop.lh && typeof toastKeep === 'function') toastKeep(scene, scene.toastTop()); // a toast that is up follows the mission panel when it opens or shuts (src/common.js)
}
