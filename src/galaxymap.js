// ---------- The galaxy map (docs/UNIVERSE.md 4.3 and 9; card space-game-u-b2-galaxy-map) ----------
// An overlay scene in the HUD glass: the stars as glowing nodes coloured by kind, a ring on those with a dock, a row of danger pips under each
// name, faint links between stars within the jump range of the ship you fly, a dashed ring for that range round the system you are in, and a card
// for the star you pick: its distance in light years, what the jump costs in fuel, how long the tunnel takes, whether it has a pump, how dangerous
// it is, and when you cannot go, why (out of range by so many ly, or short by so many units of fuel). Known stars only (G.known: the ones you have been to, and
// every one within the jump range of where you are, galaxyChart below); unknown ones near a known star but out of range show as "?" dots.
// It LANDS DARK: nothing opens it but the test hash index.html#galaxy (boot.js; galaxyDemo() below). The G key, the Tab map's button and the jump
// itself arrive with card u-b4; they open the scene with scene.run('Galaxy', { from, onJump }), and onJump(id) is called when Enter is pressed on a
// star the ship can reach. With no onJump Enter does nothing, and the hint says so.
// Data: SYSTEMS (src/data_systems.js) owns the systems that exist. Until card u-b5 authors the other seven, GALAXY_STUB below stands in for them
// with the numbers of docs/UNIVERSE.md 4.2; galaxySystems() uses a system from SYSTEMS when there is one, so b5 changes nothing here.
// What the card reads: distLy and the fuel rules of src/fuel.js (galaxyJump is jumpCheck for systems that are only in the stub), shipStat('range')
// and shipStat('fuelPerLy') of the ship you fly, hyperSecs() of src/hyperspace.js for the time.

const GALAXY = {
  w: 1240, h: 680, cardW: 322, pad: 4,                 // the frame, the card on the right, light years of margin round the stars
  near: 13,                                            // an unknown star shows as "?" when a known one is this close (ly)
  tickEvery: 5                                         // grid lines, light years
};
// kind -> shown name and colour (docs/UNIVERSE.md 4.3: cyan home, green outposts and hubs, amber miners, red nests, grey wilds, white graveyards)
const GALAXY_KINDS = {
  home: ['HOME SYSTEM', CYAN], outpost: ['FRONTIER OUTPOST', GREEN], trade: ['TRADE HUB', GREEN], mining: ['MINING SYSTEM', AMBER], volcanic: ['VOLCANIC MINING', AMBER],
  wild: ['EMPTY WILD', 0x9aa7b3], graveyard: ['DERELICT GRAVEYARD', 0xe8f4ff], nest: ['PIRATE NEST', RED]
};
const GALAXY_DANGER = ['SAFE', 'LOW', 'MODERATE', 'HIGH', 'SEVERE', 'LAWLESS'];
// the eight of docs/UNIVERSE.md 4.2 until card u-b5 authors them: id, name, kind, ly, danger, pump (credits a unit, 0 = none), station (does it have a dock), note
const GALAXY_STUB = [
  { id: 'halcyon', name: 'Halcyon', kind: 'home', ly: [20, 22], danger: 1, pump: 8, station: true, note: 'The home system: Halcyon Station has everything. Kepler-4b, the belt and the wrecks.' },
  { id: 'kestrel', name: 'Kestrel', kind: 'outpost', ly: [25.5, 19], danger: 1, pump: 7, station: true, note: 'A quiet frontier outpost under a ringed gas giant. A good first jump.' },
  { id: 'meridian', name: 'Meridian', kind: 'trade', ly: [29, 24.5], danger: 1, pump: 9, station: true, note: 'The trade hub: a shipyard that sells all six, parts to tier 3, six calls on the board.' },
  { id: 'brass', name: 'Brass Reach', kind: 'mining', ly: [14, 26.5], danger: 2, pump: 6, station: true, note: 'Three belts, one with rich veins. Cargo and tank parts, and the hauler. Raiders hunt miners.' },
  { id: 'hollow', name: 'The Hollow', kind: 'wild', ly: [13.5, 17.5], danger: 2, pump: 0, station: false, note: 'An ice world to land on and a beacon to chart. Nothing to buy: bring fuel home.' },
  { id: 'lethe', name: 'Lethe', kind: 'graveyard', ly: [7.5, 30], danger: 2, pump: 0, station: false, note: 'Fourteen wrecks to salvage, scavenger drones, and one wreck that pays 800.' },
  { id: 'ember', name: 'Ember', kind: 'volcanic', ly: [34, 31], danger: 3, pump: 6, station: true, note: 'A lava world and heavy raiding. Weapons parts to tier 3, and the fighter.' },
  { id: 'roost', name: 'Reaver\'s Roost', kind: 'nest', ly: [37, 15], danger: 5, pump: 15, station: true, note: 'The pirate nest: no police, a 50 cr fee, waves of pirates and the Reaver bounty. They gouge on fuel.' }
];

// the systems the map draws: a real one from SYSTEMS when it exists, else the stub row; always { id, name, kind, ly, danger, pump, station, note }
function galaxySystems() {
  const out = GALAXY_STUB.map(s => {
    const r = typeof SYSTEMS !== 'undefined' ? SYSTEMS[s.id] : null;
    if (!r || !r.ly) return Object.assign({}, s);
    const st = (r.bodies || []).find(b => b.type === 'station'), bare = !(r.bodies || []).length; // a system with nothing in it yet (Kestrel until card u-b5) keeps the stub's pump, dock and note
    return { id: r.id, name: r.name || s.name, kind: GALAXY_KINDS[r.kind] ? r.kind : s.kind, ly: r.ly, danger: r.danger !== undefined ? r.danger : s.danger,
      pump: bare ? s.pump : st && st.dock && st.dock.fuel > 0 ? st.dock.fuel : 0, station: bare ? s.station : !!st, note: s.note };
  });
  if (typeof SYSTEMS !== 'undefined') Object.keys(SYSTEMS).forEach(id => { // a system a later card adds that the stub does not know: it still shows
    const r = SYSTEMS[id]; if (out.some(s => s.id === id) || !r.ly) return;
    const st = (r.bodies || []).find(b => b.type === 'station');
    out.push({ id, name: r.name || id, kind: GALAXY_KINDS[r.kind] ? r.kind : 'wild', ly: r.ly, danger: r.danger | 0, pump: st && st.dock && st.dock.fuel > 0 ? st.dock.fuel : 0, station: !!st, note: '' });
  });
  return out;
}
const galaxyFind = id => galaxySystems().find(s => s.id === id) || null;
const galaxyLy = (a, b) => Math.hypot(a.ly[0] - b.ly[0], a.ly[1] - b.ly[1]);
// The stars within the jump range of the system you are in are CHARTED: named, pickable, and kept in G.known (the save). Called when the map opens and when a jump
// arrives (src/space.js). Without it a new player knew Halcyon and Kestrel only: Brass Reach and The Hollow, inside the dashed ring, were "?" dots that nothing could
// pick, and a star only became known by being picked (card space-game-travel-clarity). Returns the rows of the stars charted just now.
function galaxyChart(rec) {
  const here = galaxyFind(G.system), added = [];
  if (!here) return added;
  const range = shipStat('range', rec || activeShip());
  galaxySystems().forEach(s => { if (!G.known.includes(s.id) && galaxyLy(here, s) <= range + 1e-9) { G.known.push(s.id); added.push(s); } });
  // the system the open call names is charted too: a call to Reaver's Roost that left the Roost a "?" gave the player nothing to plot a route to (card space-game-route-plotter)
  const goal = typeof missionGoalSystem === 'function' ? missionGoalSystem() : null, row = goal ? galaxyFind(goal) : null;
  if (row && !G.known.includes(goal)) { G.known.push(goal); added.push(row); }
  return added;
}

// ---------- the route to the picked star (card space-game-route-plotter) ----------
// galaxyPlan(hereId, selId, rec): the plotted trip to the star you picked, for the card, the lines on the map and Enter. Pure apart from reading the ship.
//   ok       a chain of jumps this ship can fly exists (hops: [{ id, ly, fuel, fill }], n of them); next is the system Enter jumps to, the FIRST hop
//   !ok      none does: hops is the chain that would work with a bigger range or tank, line says why in plain words and what fixes it (src/missions.js routeCheck)
//   none     a star the game has no system for (res null): the old rules, Enter jumps to the pick itself
// title / detail: what the card says for a chain of two or more jumps ("JUMP 1 OF 2: KESTREL, 6.3 LY"); one jump keeps the card's JUMP READY
function galaxyPlan(hereId, selId, rec) {
  const real = id => typeof SYSTEMS !== 'undefined' && Object.prototype.hasOwnProperty.call(SYSTEMS, id) && !!SYSTEMS[id].ly;
  const none = { res: null, ok: false, hops: [], n: 0, next: selId, title: '', detail: '', line: '' };
  if (!selId || hereId === selId || !real(hereId) || !real(selId) || typeof routeCheck !== 'function') return none;
  const way = routeCheck(hereId, selId, rec), nm = id => (galaxyFind(id) || { name: id }).name, hops = way.res.hops || [];
  if (!way.res.ok) return { res: way.res, ok: false, hops, n: hops.length, next: selId, title: '', detail: '', line: way.line };
  const h = hops[0], rest = hops.slice(1).map(x => nm(x.id) + ', ' + fmtLy(x.ly) + ' ly').join(', then ');
  return { res: way.res, ok: true, hops, n: hops.length, next: h.id, line: '',
    title: hops.length > 1 ? 'JUMP 1 OF ' + hops.length + ': ' + nm(h.id).toUpperCase() + ', ' + fmtLy(h.ly) + ' LY' : '',
    detail: (hops.length > 1 ? 'Enter jumps there, then ' + rest + '.' : '') + (h.fill ? (hops.length > 1 ? ' ' : '') + 'Fill up at the pump in ' + nm(hereId) + ' first.' : '') };
}
// can the ship fly from a to b (system rows from galaxySystems)? Same rules and same answer shape as jumpCheck in src/fuel.js, which only knows the systems in SYSTEMS.
function galaxyJump(a, b, rec) {
  rec = rec || activeShip();
  const ly = galaxyLy(a, b), have = fuelHave(rec), cost = fuelRound(ly * shipStat('fuelPerLy', rec)), range = shipStat('range', rec);
  if (ly > range + 1e-9) return { ok: false, why: 'range', ly, cost, have, short: 0, over: Math.round((ly - range) * 10) / 10, range };
  if (cost > have + 1e-9) return { ok: false, why: 'fuel', ly, cost, have, short: fuelRound(cost - have), over: 0, range };
  return { ok: true, why: null, ly, cost, have, short: 0, over: 0, range };
}
const galaxySecs = ly => (typeof hyperSecs === 'function' ? hyperSecs(ly) : Math.min(30, Math.max(6, ly * 1.6)));

// what boot.js passes for #galaxy: five systems known, so three show as "?", you at Halcyon; nothing is saved (meta.js DEV_HASH)
function galaxyDemo() { G.system = 'halcyon'; G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']; return { from: null, demo: true }; }

class Galaxy extends Phaser.Scene {
  constructor() { super('Galaxy'); }
  init(d) {
    this.from = (d && d.from) || null; this.onJump = d && d.onJump; this.want = (d && d.sel) || null; this.closing = false; this.born = performance.now();
    this.sel = null; this.hover = null; this.youTag = null; // a restarted scene keeps its old fields: they point at objects that are gone
  }

  create() {
    const { w, h, cardW } = GALAXY;
    this.ui = panel(this, { w, h, title: 'GALAXY', dim: true, depth: 0 });
    this.box = this.ui.box;
    this.rec = activeShip(); this.here = galaxyFind(G.system) || galaxySystems()[0];
    galaxyChart(this.rec); if (typeof guideMapOpened === 'function') guideMapOpened(); // what is in range is charted; a player who has opened the map no longer needs the "G opens it" line, and the jump step knows it was looked at (src/guide.js)
    this.all = galaxySystems(); this.known = this.all.filter(s => (G.known || []).includes(s.id) || s.id === this.here.id);
    this.dim = this.all.filter(s => !this.known.includes(s) && this.known.some(k => galaxyLy(k, s) <= GALAXY.near)); // the "?" dots
    // the map area (panel coordinates) and the projection from light years to it
    this.ax0 = -w / 2 + 18; this.ax1 = w / 2 - 18 - cardW - 16; this.ay0 = -h / 2 + 40 + 14; this.ay1 = h / 2 - 44 - 12;
    const xs = this.all.map(s => s.ly[0]), ys = this.all.map(s => s.ly[1]), pad = GALAXY.pad;
    const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
    this.k = Math.min((this.ax1 - this.ax0) / (x1 - x0), (this.ay1 - this.ay0) / (y1 - y0));
    this.ox = (this.ax0 + this.ax1) / 2 - (x0 + x1) / 2 * this.k; this.oy = (this.ay0 + this.ay1) / 2 - (y0 + y1) / 2 * this.k;
    this.lyBox = { x0, x1, y0, y1 };
    this.px = s => [this.ox + s.ly[0] * this.k, this.oy + s.ly[1] * this.k];

    this.drawBackdrop();
    this.dyn = this.add.graphics(); this.box.add(this.dyn);     // links, ring, selection: redrawn every frame (it pulses)
    this.nodes = this.buildNodes();
    this.cardBox = this.add.container(0, 0); this.box.add(this.cardBox);
    this.zone();
    // the first thing the card shows: the star asked for (the navigation panel's job row), else the star the open call wants you at, else the nearest
    const goal = typeof missionGoalSystem === 'function' ? missionGoalSystem() : null, ok = id => !!id && id !== this.here.id && this.nodes[id] && !this.nodes[id].unknown;
    this.sel = ok(this.want) ? this.want : ok(goal) ? goal : this.nearestOther() ? this.nearestOther().id : this.here.id;
    this.refresh();
    this.input.keyboard.on('keydown', e => this.onKey(e));
    this.ui.tagText.setText('YOU  ' + this.here.name.toUpperCase() + '   RANGE ' + fmtLy(shipStat('range', this.rec)) + ' LY   FUEL ' + Math.round(fuelHave(this.rec) * 10) / 10 + ' / ' + fuelTank(this.rec));
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  // ---- the frame of the map: dark glass, a grid every five light years with its ticks, the legend ----
  drawBackdrop() {
    const g = this.add.graphics(); this.box.add(g);
    const { ax0, ax1, ay0, ay1 } = this;
    g.fillGradientStyle(0x050c18, 0x050c18, 0x0a1a2c, 0x0a1a2c, 1); g.fillRect(ax0, ay0, ax1 - ax0, ay1 - ay0);
    g.lineStyle(1, CYAN, 0.35); g.strokeRect(ax0, ay0, ax1 - ax0, ay1 - ay0);
    const T = GALAXY.tickEvery, b = this.lyBox;
    for (let x = Math.ceil(b.x0 / T) * T; x <= b.x1; x += T) {
      const sx = this.ox + x * this.k; g.lineStyle(1, CYAN, 0.07); g.lineBetween(sx, ay0, sx, ay1);
      this.box.add(this.add.text(sx + 4, ay1 - 4, x + ' ly', uiFont(10, '#3d5a70')).setOrigin(0, 1));
    }
    for (let y = Math.ceil(b.y0 / T) * T; y <= b.y1; y += T) {
      const sy = this.oy + y * this.k; g.lineStyle(1, CYAN, 0.07); g.lineBetween(ax0, sy, ax1, sy);
      this.box.add(this.add.text(ax1 - 6, sy - 3, y + ' ly', uiFont(10, '#3d5a70')).setOrigin(1, 1)); // on the right, clear of the legend
    }
    for (let i = 0; i < 90; i++) { // a few faint stars in the dark between the systems
      const sx = ax0 + 6 + ((i * 7919) % 1000) / 1000 * (ax1 - ax0 - 12), sy = ay0 + 6 + ((i * 104729) % 1000) / 1000 * (ay1 - ay0 - 12);
      g.fillStyle(0xcfefff, 0.05 + (i % 5) * 0.025); g.fillRect(sx, sy, 1.5, 1.5);
    }
    // the legend, top left of the map where no star is: kinds by colour, and what the two kinds of line mean
    const lx = ax0 + 14, ly0 = ay0 + 14, items = [['HOME', CYAN], ['OUTPOST OR HUB', GREEN], ['MINING', AMBER], ['PIRATE NEST', RED], ['EMPTY WILD', 0x9aa7b3], ['GRAVEYARD', 0xe8f4ff]];
    g.fillStyle(0x050c18, 0.8); g.fillRect(lx - 8, ly0 - 10, 150, items.length * 16 + 66);
    items.forEach(([name, col], i) => {
      const y = ly0 + 6 + i * 16; g.fillStyle(col, 0.3); g.fillCircle(lx + 4, y, 6); g.fillStyle(col, 1); g.fillCircle(lx + 4, y, 3);
      this.box.add(this.add.text(lx + 18, y, name, uiFont(10, '#8fb4c9')).setOrigin(0, 0.5));
    });
    const yl = ly0 + 6 + items.length * 16 + 4;
    g.lineStyle(1.2, CYAN, 0.9); g.lineBetween(lx - 2, yl, lx + 14, yl); this.box.add(this.add.text(lx + 18, yl, 'in range of your ship', uiFont(10, '#8fb4c9')).setOrigin(0, 0.5));
    g.lineStyle(1.2, AMBER, 0.9); g.lineBetween(lx - 2, yl + 16, lx + 5, yl + 16); g.lineBetween(lx + 9, yl + 16, lx + 14, yl + 16); this.box.add(this.add.text(lx + 18, yl + 16, 'your jump range', uiFont(10, '#8fb4c9')).setOrigin(0, 0.5));
    this.box.add(this.add.text(lx + 4, yl + 32, '?', uiFont(12, '#5b7a92', { fontStyle: 'bold' })).setOrigin(0.5)); this.box.add(this.add.text(lx + 18, yl + 32, 'beyond your range', uiFont(10, '#8fb4c9')).setOrigin(0, 0.5));
  }

  // ---- one label per star, made once; the glow and rings are drawn every frame under them ----
  buildNodes() {
    const out = {};
    this.known.forEach(s => {
      const [x, y] = this.px(s), col = GALAXY_KINDS[s.kind][1];
      const name = this.add.text(x, y + 20, s.name.toUpperCase(), uiFont(12, hudCss(col), { fontStyle: 'bold', letterSpacing: 1 })).setOrigin(0.5, 0);
      this.box.add(name); out[s.id] = { s, x, y, col, name };
    });
    this.dim.forEach(s => {
      const [x, y] = this.px(s);
      const q = this.add.text(x, y, '?', uiFont(16, '#5b7a92', { fontStyle: 'bold' })).setOrigin(0.5); this.box.add(q);
      out[s.id] = { s, x, y, col: 0x5b7a92, q, unknown: true };
    });
    return out;
  }
  // a click on a known star picks it; the whole map area listens, so nothing needs a zone of its own
  zone() {
    const z = this.add.rectangle((this.ax0 + this.ax1) / 2, (this.ay0 + this.ay1) / 2, this.ax1 - this.ax0, this.ay1 - this.ay0, 0x000000, 0.001).setInteractive({ useHandCursor: true });
    const at = p => { const lx = p.x - W / 2, ly = p.y - H / 2; let best = null, bd = 28; this.known.forEach(s => { const n = this.nodes[s.id], d = Math.hypot(n.x - lx, n.y - ly); if (d < bd) { bd = d; best = s.id; } }); return best; };
    z.on('pointerdown', p => { const id = at(p); if (id) this.pick(id); });
    z.on('pointermove', p => { this.hover = at(p); });
    z.on('pointerout', () => { this.hover = null; });
    this.box.add(z);
  }

  // ---- choosing ----
  nearestOther() { // the nearest known star that is not the one you are at: the first thing the card shows
    let best = null, bd = 1e9; this.known.forEach(s => { if (s.id === this.here.id) return; const d = galaxyLy(this.here, s); if (d < bd) { bd = d; best = s; } }); return best;
  }
  pick(id) { if (!this.nodes[id] || this.nodes[id].unknown || id === this.sel) return; this.sel = id; beep(520, 0.03, 'square', 0.02); this.refresh(); }
  // the arrow keys and WASD move to the known star nearest in that direction; Tab goes to the next one by distance
  step(dx, dy) {
    const cur = this.nodes[this.sel]; let best = null, bs = 1e9;
    this.known.forEach(s => {
      if (s.id === this.sel) return;
      const n = this.nodes[s.id], vx = n.x - cur.x, vy = n.y - cur.y, d = Math.hypot(vx, vy), along = (vx * dx + vy * dy) / d;
      if (along < 0.35) return; // in that direction, within about 70 degrees
      const score = d * (2 - along); if (score < bs) { bs = score; best = s; }
    });
    if (best) this.pick(best.id); else beep(180, 0.05, 'square', 0.02);
  }
  cycle(d) {
    const order = this.known.slice().sort((a, b) => galaxyLy(this.here, a) - galaxyLy(this.here, b)), i = order.findIndex(s => s.id === this.sel);
    this.pick(order[(i + d + order.length) % order.length].id);
  }
  onKey(e) {
    if (e.repeat || this.closing || performance.now() - this.born < 200) return;
    const c = e.code;
    if (c === 'Escape' || c === 'KeyG') this.close();
    else if (c === 'ArrowLeft' || c === 'KeyA') this.step(-1, 0);
    else if (c === 'ArrowRight' || c === 'KeyD') this.step(1, 0);
    else if (c === 'ArrowUp' || c === 'KeyW') this.step(0, -1);
    else if (c === 'ArrowDown' || c === 'KeyS') this.step(0, 1);
    else if (c === 'Tab') this.cycle(e.shiftKey ? -1 : 1);
    else if (c === 'Enter' || c === 'NumpadEnter') this.go();
  }
  // Enter: only when card u-b4 handed us an onJump and the ship can make this jump
  go() {
    if (!this.onJump || this.sel === this.here.id) return beep(180, 0.08, 'square', 0.03);
    const pl = this.plan = galaxyPlan(this.here.id, this.sel, this.rec), next = pl.ok && pl.next ? pl.next : this.sel; // a plotted chain: Enter jumps the next hop of it, not the far star. The plan of the star picked NOW: the one the card drew last is stale when the pick was set without refresh()
    const j = galaxyJump(this.here, galaxyFind(next), this.rec);
    if (!j.ok) return beep(180, 0.12, 'square', 0.03);
    this.onJump(next, j);
  }
  close() {
    if (this.closing) return; this.closing = true;
    if (typeof JUMPST !== 'undefined') JUMPST.closedAt = performance.now(); // src/jump.js: the same G that closed it must not open it again
    if (this.from) { this.scene.stop(); this.scene.resume(this.from); } else this.scene.start('Title'); // the test hash has nothing to go back to
  }

  // ---- what the card says about the picked star ----
  refresh() {
    const s = galaxyFind(this.sel), here = this.sel === this.here.id, j = here ? null : galaxyJump(this.here, s, this.rec), col = GALAXY_KINDS[s.kind][1], box = this.cardBox;
    box.removeAll(true);
    const { w, h, cardW } = GALAXY, cx = w / 2 - 18 - cardW, cy = -h / 2 + 40 + 14, ch = h - 40 - 44 - 26, g = this.add.graphics(); box.add(g);
    hudPanel(g, cx, cy, cardW, ch, 12, 0.96, col);
    const T = (x, y, str, size, color, o = {}) => { const t = this.add.text(cx + x, cy + y, str, uiFont(size, color, o.style)).setOrigin(o.ox || 0, o.oy === undefined ? 0.5 : o.oy); box.add(t); return t; };
    T(20, 26, s.name.toUpperCase(), 22, hudCss(col), { style: { fontStyle: 'bold', letterSpacing: 1 } });
    T(20, 52, GALAXY_KINDS[s.kind][0], 12, '#8fb4c9', { style: { letterSpacing: 2 } });
    g.lineStyle(1, col, 0.4); g.lineBetween(cx + 16, cy + 70, cx + cardW - 16, cy + 70);
    let y = 94;
    const row = (label, value, vcol = '#cfefff') => { T(20, y, label, 11, '#5b7a92', { style: { letterSpacing: 2 } }); T(cardW - 20, y, value, 16, vcol, { ox: 1, style: { fontStyle: 'bold' } }); y += 34; };
    const tank = fuelTank(this.rec), have = fuelHave(this.rec);
    if (here) {
      T(20, y, 'YOU ARE HERE', 15, '#ffd37a', { style: { fontStyle: 'bold', letterSpacing: 2 } }); y += 40;
      row('JUMP RANGE', fmtLy(shipStat('range', this.rec)) + ' ly'); row('FUEL', Math.round(have * 10) / 10 + ' / ' + tank, hudCss(fuelState(this.rec) === 'ok' ? CYAN : fuelState(this.rec) === 'low' ? AMBER : RED));
      hudBar(g, cx + 20, cy + y - 12, cardW - 40, 8, have / Math.max(1, tank), fuelState(this.rec) === 'ok' ? CYAN : fuelState(this.rec) === 'low' ? AMBER : RED, 20); y += 22;
    } else {
      row('DISTANCE', fmtLy(j.ly) + ' ly');
      row('FUEL COST', fmtFuel(j.cost) + ' units', j.why === 'fuel' ? '#ffb454' : '#cfefff');
      hudBar(g, cx + 20, cy + y - 14, cardW - 40, 8, Math.min(1, j.cost / Math.max(1, tank)), j.why === 'fuel' ? AMBER : j.why === 'range' ? 0x5b7a92 : CYAN, 20); y += 12;
      row('YOU HAVE', fmtFuel(have) + ' / ' + tank, j.why === 'fuel' ? '#ff4d6d' : '#cfefff');
      row('TIME', Math.round(galaxySecs(j.ly)) + ' s');
    }
    row('FUEL PUMP', s.pump ? s.pump + ' cr a unit' : 'none', s.pump ? '#cfefff' : '#ffb454');
    T(20, y, 'DANGER', 11, '#5b7a92', { style: { letterSpacing: 2 } });
    for (let i = 0; i < 5; i++) { g.fillStyle(i < s.danger ? (s.danger >= 4 ? 0xff4d6d : s.danger >= 3 ? AMBER : 0x6dff9c) : 0x1d3b5c, 1); g.fillRect(cx + 120 + i * 16, cy + y - 5, 12, 10); }
    T(cardW - 20, y, GALAXY_DANGER[s.danger] || '', 13, '#cfefff', { ox: 1, style: { fontStyle: 'bold' } }); y += 34;
    if (s.note) T(20, y, s.note, 13, '#8fb4c9', { oy: 0, style: { wordWrap: { width: cardW - 40 }, lineSpacing: 3 } });
    if (typeof missionGoalSystem === 'function' && missionGoalSystem() === s.id) T(20, ch - 126, 'YOUR CALL IS HERE: ' + (missionDef() || {}).title, 12, '#6dff9c', { style: { letterSpacing: 1 } }); // src/missions.js
    // the verdict, at the foot of the card
    // the plotted trip to this star (galaxyPlan): a chain of two or more jumps says the first, a trip this ship cannot make says why, in plain words, and what fixes it
    const pl = this.plan = here ? null : galaxyPlan(this.here.id, this.sel, this.rec), chain = !!pl && pl.ok && pl.n > 1, hopJ = chain ? galaxyJump(this.here, galaxyFind(pl.next), this.rec) : null;
    const stuck = !!pl && !pl.ok && !!pl.line && !!pl.res, by = ch - 98, ok = !here && (chain ? hopJ.ok : !stuck && j.ok);
    const msg = here ? ['AT HOME BASE', '#ffd37a', 'Pick another star.']
      : stuck ? [pl.res.why === 'fuel' ? 'TANK TOO SMALL' : 'OUT OF RANGE BY ' + fmtLy(pl.res.over) + ' LY', '#ff4d6d', pl.line]
      : chain && hopJ.ok ? [pl.title, '#6dff9c', pl.detail]
      : chain ? ['SHORT BY ' + fmtFuel(hopJ.short) + ' UNITS', '#ffb454', this.here.pump ? 'Fill up at the pump here first.' : 'There is no pump here: you need fuel from somewhere else.']
      : j.why === 'range' ? ['OUT OF RANGE BY ' + fmtLy(j.over) + ' LY', '#ff4d6d', 'You reach ' + fmtLy(j.range) + ' ly. A courier, an explorer or an engine part goes further.']
      : j.why === 'fuel' ? ['SHORT BY ' + fmtFuel(j.short) + ' UNITS', '#ffb454', this.here.pump ? 'Fill up at the pump here first.' : 'There is no pump here: you need fuel from somewhere else.']
      : ['JUMP READY', '#6dff9c', this.onJump ? 'Press Enter to jump.' : 'Jumps start from space: launch, then press G.'];
    const vc = parseInt(msg[1].slice(1), 16);
    g.fillStyle(here ? 0x2a1a06 : vc, here ? 0.5 : 0.14); g.fillRect(cx + 12, cy + by - 8, cardW - 24, 90); g.lineStyle(2, vc, 0.9); g.strokeRect(cx + 12, cy + by - 8, cardW - 24, 90); g.fillStyle(vc, 1); g.fillRect(cx + 12, cy + by - 8, 5, 90);
    const head = T(28, by + 10, msg[0], 15, msg[1], { style: { fontStyle: 'bold', letterSpacing: 1 } });
    if (head.width > cardW - 44) head.setScale((cardW - 44) / head.width); // "JUMP 1 OF 2: KESTREL, 6.3 LY" is wider than the card at full size
    T(28, by + 32, msg[2], msg[2].length > 80 ? 11 : 12, '#cfefff', { oy: 0, style: { wordWrap: { width: cardW - 56 } } });
    this.ui.setHints([['←↑↓→', 'Choose a star'], ['Tab', 'Next star'], ['Esc', 'Close']].concat(this.onJump ? [['Enter', chain ? 'Jump 1 of ' + pl.n : 'Jump']] : []));
    this.verdict = ok ? 'ok' : here ? 'here' : stuck ? (pl.res.why === 'fuel' ? 'fuel' : 'range') : chain ? hopJ.why : j.why;
  }

  // the chain to the pick: a line for each hop (green when this ship can fly it, red for a jump longer than its range) and a number on each star it stops at.
  // Returns how many numbers it set. The stars of the chain need not be charted: their places come from the map's own projection.
  drawChain(g, pl, range, here) {
    let px = here.x, py = here.y, k = 0;
    pl.hops.forEach((h, i) => {
      const s = galaxyFind(h.id), [x, y] = s ? this.px(s) : [px, py], long = h.ly > range + 1e-9, c = long ? 0xff4d6d : pl.ok ? 0x6dff9c : AMBER;
      const len = Math.hypot(x - px, y - py), n = Math.max(2, Math.floor(len / 10));
      g.lineStyle(i === 0 ? 3 : 2, c, 0.95);
      for (let d = 0; d < n; d += long ? 2 : 1) g.lineBetween(px + (x - px) * d / n, py + (y - py) * d / n, px + (x - px) * (d + 1) / n, py + (y - py) * (d + 1) / n);
      g.fillStyle(0x050c18, 0.95); g.fillCircle(x, y - 24, 9); g.lineStyle(2, c, 1); g.strokeCircle(x, y - 24, 9);
      if (!this.chainMarks[i]) { this.chainMarks[i] = this.add.text(0, 0, '', uiFont(12, '#e8f6ff', { fontStyle: 'bold' })).setOrigin(0.5); this.box.add(this.chainMarks[i]); }
      this.chainMarks[i].setText(String(i + 1)).setPosition(x, y - 24); k++;
      px = x; py = y;
    });
    return k;
  }

  // ---- every frame: the links, the range ring, the line to the pick, and the glow of each star ----
  update(time) {
    const g = this.dyn; g.clear();
    const here = this.nodes[this.here.id], range = shipStat('range', this.rec), pulse = 0.5 + 0.5 * Math.sin(time / 380);
    // links: any two known stars within range of each other; the ones from where you are brighter
    this.known.forEach((a, i) => this.known.slice(i + 1).forEach(b => {
      const d = galaxyLy(a, b); if (d > range + 1e-9) return;
      const na = this.nodes[a.id], nb = this.nodes[b.id], mine = a.id === this.here.id || b.id === this.here.id;
      g.lineStyle(mine ? 1.6 : 1, CYAN, mine ? 0.5 : 0.16); g.lineBetween(na.x, na.y, nb.x, nb.y);
    }));
    // the dashed ring of your jump range round the system you are in
    const rr = range * this.k, seg = 96;
    g.lineStyle(1.4, AMBER, 0.7);
    const inside = (x, y) => x >= this.ax0 && x <= this.ax1 && y >= this.ay0 && y <= this.ay1; // a long range (an explorer's 18 ly) would run off the map: only the dashes inside it are drawn
    for (let i = 0; i < seg; i += 2) {
      const a0 = i / seg * TAU, a1 = (i + 1) / seg * TAU;
      if (!inside(here.x + Math.cos(a0) * rr, here.y + Math.sin(a0) * rr) || !inside(here.x + Math.cos(a1) * rr, here.y + Math.sin(a1) * rr)) continue;
      g.beginPath(); g.arc(here.x, here.y, rr, a0, a1); g.strokePath();
    }
    // the line from you to the pick, coloured by what the verdict is, with its length on it
    const sel = this.nodes[this.sel], pl = this.plan;
    this.chainMarks = this.chainMarks || [];
    const marks = (pl && this.sel !== this.here.id && pl.hops.length > 1) ? this.drawChain(g, pl, range, here) : 0; // a plotted chain of two or more jumps: numbered hops, not the one straight line
    this.chainMarks.forEach((m, i) => m.setVisible(i < marks));
    if (this.sel !== this.here.id && !marks) {
      const c = this.verdict === 'ok' ? 0x6dff9c : this.verdict === 'fuel' ? AMBER : 0xff4d6d, len = Math.hypot(sel.x - here.x, sel.y - here.y), n = Math.max(2, Math.floor(len / 10));
      g.lineStyle(2, c, 0.9);
      for (let i = 0; i < n; i += 2) g.lineBetween(here.x + (sel.x - here.x) * i / n, here.y + (sel.y - here.y) * i / n, here.x + (sel.x - here.x) * (i + 1) / n, here.y + (sel.y - here.y) * (i + 1) / n);
    }
    // the stars: a halo, the core, a ring on those with a dock, the danger pips under the name; reachable ones bright, the rest dim
    const goal = typeof missionGoalSystem === 'function' ? missionGoalSystem() : null;
    Object.keys(this.nodes).forEach(id => {
      const n = this.nodes[id], s = n.s; if (n.unknown) { g.fillStyle(0x5b7a92, 0.12); g.fillCircle(n.x, n.y, 12); return; }
      const j = id === this.here.id ? null : galaxyJump(this.here, s, this.rec), reach = id === this.here.id || (j && j.why !== 'range'), r = id === this.here.id ? 8 : 6.5, on = id === this.sel || id === this.hover;
      const a = reach ? 1 : 0.5;
      g.fillStyle(n.col, 0.1 * a); g.fillCircle(n.x, n.y, r * 3.6); g.fillStyle(n.col, (on ? 0.32 : 0.2) * a); g.fillCircle(n.x, n.y, r * 2); g.fillStyle(n.col, a); g.fillCircle(n.x, n.y, r);
      g.fillStyle(0xffffff, 0.8 * a); g.fillCircle(n.x - r * 0.25, n.y - r * 0.25, r * 0.35);
      if (s.station) { g.lineStyle(1.5, n.col, 0.9 * a); g.strokeCircle(n.x, n.y, r + 5); }
      for (let p = 0; p < 5; p++) { g.fillStyle(p < s.danger ? (s.danger >= 4 ? 0xff4d6d : s.danger >= 3 ? AMBER : 0x6dff9c) : 0x1d3b5c, a); g.fillRect(n.x - 19 + p * 8, n.y + 36, 6, 4); }
      n.name.setAlpha(a);
      if (id === this.here.id) { g.lineStyle(2, AMBER, 0.5 + 0.5 * pulse); g.strokeCircle(n.x, n.y, r + 11 + pulse * 3); }
      if (id === goal) { g.lineStyle(2, GREEN, 0.95); g.strokePoints([{ x: n.x, y: n.y - r - 22 }, { x: n.x + 7, y: n.y - r - 15 }, { x: n.x, y: n.y - r - 8 }, { x: n.x - 7, y: n.y - r - 15 }], true); } // the call's goal (src/missions.js)
    });
    // "YOU", and the brackets round the pick
    if (!this.youTag) { this.youTag = this.add.text(0, 0, 'YOU', uiFont(11, '#ffb454', { fontStyle: 'bold', letterSpacing: 2 })).setOrigin(0.5, 1); this.box.add(this.youTag); }
    this.youTag.setPosition(here.x, here.y - 24);
    const b = 17; g.lineStyle(2, AMBER, 1);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => { g.lineBetween(sel.x + sx * b, sel.y + sy * b, sel.x + sx * (b - 7), sel.y + sy * b); g.lineBetween(sel.x + sx * b, sel.y + sy * b, sel.x + sx * b, sel.y + sy * (b - 7)); });
  }
}
const fmtLy = v => (Math.round(v * 10) / 10).toString();
const fmtFuel = v => (Math.round(v * 10) / 10).toString();
