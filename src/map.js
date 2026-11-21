// ---------- Sector map (Tab), help page (H) and the key reminder strip ----------
// One overlay scene with two modes, opened over a paused gameplay scene, the same way the pause menu is.
// installMap(game) catches Tab and H on the window and hooks scene create events, so the scenes need no code.
// The map has no picker of its own (card space-game-one-way-to-target). A place is picked in the navigation panel (N, src/navpanel.js) or by
// a click in space; over the Space scene the map rings that destination and says how far it is. Card space-game-hunt-pirates (Troy, 18 Nov 2026): a click on
// a place of the map FLIES there, by the navigation panel's own rule (navpanelFly): the map only says which place is under the pointer.
// The map opens on a LOCAL view: the square that holds you, your objective and your destination (never less than MAP_MIN px
// across), so the home cluster of a 36000 px system fills the map and is not six marks in one corner. Z shows the whole system and
// back; the view grows by itself when the destination or the objective is far away. Names never sit on each other or leave the frame:
// mapPlace puts each one on a free side of its mark. The legend lists what is on the map now, and nothing else.
// The rules are the pure functions mapView, mapPlace and mapLegendRows (tests/sectormap.mjs, plain Node).

const SENSOR = 1600;          // a drone this close to your ship counts as seen; farther ones keep their last spot
const STRIP_MS = 60000;       // the "Tab map  H help" reminder fades out after the first minute of play
const MAPUI = { t0: 0, seen: new Map(), tracker: null, trackScene: null, nextAt: 0 };
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const MAP_CLICK = 24;         // px on the map around a mark that count as a click on it

const SCENE_TIPS = {
  Station: 'Pick from the station menu, bottom right: a number, or W S and Enter. Your ship is the last row: board it to launch. The SHOP sells parts; MISSIONS has courier and haul calls.',
  Space: 'N lists the places and B the ships: Enter or a click flies there; on the Tab map a click sets the place, then Enter flies there and Shift+Enter flies fast. Near a station, slow down and press L: ore sells there. G opens the galaxy map: pick a star, press Enter to jump.',
  Ship: 'Look your ship over, then press Enter to launch. Esc goes back to the station to take a mission or repair first.',
  Surface: 'Aim with the mouse and click to fire. Walk back to the landing pad and press E to lift off.'
};

function mapText(s, x, y, str, size, color, wrap) {
  const t = s.add.text(x, y, str, { fontFamily: 'monospace', fontSize: size + 'px', color, lineSpacing: 6 });
  if (wrap) t.setWordWrapWidth(wrap);
  return t;
}

const MAP_LEG_Y = 380, MAP_LEG_STEP = 27, MAP_LEG_MAX = 11; // legend rows: 9 at this step end above the footer line; with more the step shrinks (mapLegStep)
const MAP_MIN = sysAt(9000), MAP_PAD = 1.45, MAP_WHOLE = 0.7; // the local view: its smallest width in px, the room round what it holds, and the share of the system past which it is just the whole map (9000 is in the units the data is written in: src/data_systems.js SYSTEM_SCALE)
function mapLegStep(n) { return Math.min(MAP_LEG_STEP, Math.floor((638 - 22 - MAP_LEG_Y) / Math.max(1, n - 1))); }

// the square of the system the map shows: { x, y, size } in px. pts: what must be in it ({ x, y }); ws: the system's width; whole: Z asked for all of it
// the grid of the map: about eight cells across. The whole system is cut in eight; a local view takes the first round number (1, 2, 2.5, 5
// times a power of ten, from 500 px) that gives nine cells or fewer. The list used to stop at 10,000 px, so a local view wider than
// 90,000 px fell back to an eighth of the system: in a system 3,000,000 px wide that was one line or none (tests/bigsystems.mjs).
function mapGridStep(viewSize, ws) {
  if (viewSize >= ws) return ws / 8;
  for (let p = 100; p <= 1e9; p *= 10) for (const m of [1, 2, 2.5, 5]) { const n = m * p; if (n >= 500 && n >= viewSize / 9) return n; }
  return ws / 8;
}
function mapView(pts, ws, whole) {
  pts = (pts || []).filter(p => p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y));
  if (whole || !pts.length) return { x: 0, y: 0, size: ws };
  const x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
  const size = Math.max(MAP_MIN, Math.max(x1 - x0, y1 - y0) * MAP_PAD);
  if (size >= ws * MAP_WHOLE) return { x: 0, y: 0, size: ws };
  const cl = v => Math.max(0, Math.min(ws - size, v));
  return { x: cl((x0 + x1) / 2 - size / 2), y: cl((y0 + y1) / 2 - size / 2), size };
}

// where each name goes. items: [{ x, y, r, w, h, side }] in order of importance: the mark's centre and radius on the screen, the size of its
// name, and the side it would like ('below'; anything else: above). frame: { x, y, w, h }. Answers one { x, y } per item: the CENTRE of the name,
// on the first of above, below, right, left (then further out) that is inside the frame and touches no name already placed and no other mark.
function mapPlace(items, frame) {
  const placed = [], out = [];
  const hit = (a, b) => Math.max(0, Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2)) * Math.max(0, Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2));
  const marks = items.map(it => ({ x: it.x, y: it.y, w: it.r * 2, h: it.r * 2 }));
  items.forEach((it, i) => {
    const up = g => ({ x: it.x, y: it.y - it.r - it.h / 2 - g }), dn = g => ({ x: it.x, y: it.y + it.r + it.h / 2 + g });
    const rt = g => ({ x: it.x + it.r + it.w / 2 + g + 2, y: it.y }), lf = g => ({ x: it.x - it.r - it.w / 2 - g - 2, y: it.y });
    const first = it.side === 'below' ? [dn, up] : [up, dn];
    const cands = [first[0](3), first[1](3), rt(3), lf(3), first[0](3 + it.h), first[1](3 + it.h), rt(3 + it.h), lf(3 + it.h), first[0](3 + it.h * 2), first[1](3 + it.h * 2)];
    let best = null, bestBad = Infinity;
    for (const c of cands) {
      const box = { x: Math.max(frame.x + it.w / 2 + 3, Math.min(frame.x + frame.w - it.w / 2 - 3, c.x)), y: Math.max(frame.y + it.h / 2 + 3, Math.min(frame.y + frame.h - it.h / 2 - 3, c.y)), w: it.w, h: it.h };
      let bad = 0;
      placed.forEach(q => { bad += hit(box, q); });
      marks.forEach((q, j) => { bad += hit(box, q) * (j === i ? 2 : 1); }); // pushed back over its own mark by the frame is the worst place
      if (bad < bestBad) { bestBad = bad; best = box; }
      if (!bad) break;
    }
    placed.push(best); out.push({ x: best.x, y: best.y, bad: bestBad }); // bad: how much of it still lies over another name or mark (0: clear): a map zoomed far out leaves such a name out (src/campmapdraw.js)
  });
  return out;
}

// the legend: a row for each kind of thing that is on the map now, [name, kind]. on: { station, outpost (names, or ''), planet, belt, wreck,
// objective, live, stale, wanted, poi } (true when one is drawn)
function mapLegendRows(on) {
  const rows = [['you', 'ship']];
  if (on.station) rows.push([on.station, 'station']);
  if (on.outpost) rows.push([on.outpost, 'outpost']);
  if (on.planet) rows.push(['planet', 'planet']);
  if (on.belt) rows.push(['asteroid belt', 'belt']);
  if (on.wreck) rows.push(['wreck or ruin', 'wreck']);
  if (on.objective) rows.push(['objective', 'target']);
  if (on.live) rows.push(['pirate in sensor range', 'live']);
  if (on.stale) rows.push(['pirate, where you last saw it', 'stale']);
  if (on.wanted) rows.push(['wanted pirate', 'wanted']);
  if (on.poi) rows.push(['salvage site', 'poi']);
  return rows;
}

function mapHex(g, x, y, r) { // Kestrel Outpost mark: a hexagon, so it is not mistaken for a salvage circle
  const p = []; for (let i = 0; i < 6; i++) p.push({ x: x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * r, y: y + Math.sin(i * Math.PI / 3 + Math.PI / 6) * r });
  g.fillStyle(GREEN, 0.3); g.lineStyle(2, GREEN, 1); g.fillPoints(p, true); g.strokePoints(p, true);
}

// a system with no station or no planet (Kestrel until card u-b5): the map has a stand-in far outside the square, that is not drawn
const MAP_NONE = { name: '', x: -60000, y: -60000, r: 0, none: true };
// ---------- the overlay scene ----------
class Overlay extends Phaser.Scene {
  constructor() { super('Overlay'); }
  init(d) { this.from = (d && d.from) || 'Station'; this.mode = (d && d.mode) || 'map'; }
  create() {
    const cx = W / 2, cy = H / 2;
    // where things are: the bodies of the current system (src/universe.js), not tables kept here
    this.D = { st: (typeof spaceHomeDock === 'function' ? spaceHomeDock() : sysBody('station')) || MAP_NONE, // the dock you launched from, which is what the Space scene calls its station
       pl: sysBody('planet') || MAP_NONE, op: sysBodies('scenery').find(b => b.art === 'outpost') || null, gate: sysBody('gate') };
    const D = this.D;
    this.MX = 100; this.MY = 100; this.MS = 560; this.SX = 706; // map square and the side column
    this.add.rectangle(cx, cy, W, H, 0x02050c, 0.78).setInteractive(); // swallows clicks
    hudPanel(this.add.graphics(), cx - 570, cy - 325, 1140, 650, 20, 0.97, CYAN); // src/hud.js: the same glass panel as the HUD
    this.g = this.add.graphics();
    this.gm = this.add.graphics(); // the marks on the map: cut off at the frame, so a belt or a sensor ring half in view does not run over the panel
    const cut = this.make.graphics(); cut.fillStyle(0xffffff, 1); cut.fillRect(this.MX + 1, this.MY + 1, this.MS - 2, this.MS - 2);
    this.gm.setMask(cut.createGeometryMask());
    this.view = null; this.whole = false; this.marks = [];
    this.title = mapText(this, 100, 46, '', 26, '#38e1ff');
    const x = mapText(this, 1180, 50, 'Close  [x]', 15, '#9fe9ff').setOrigin(1, 0).setInteractive({ useHandCursor: true });
    x.on('pointerdown', () => this.close());
    this.footer = mapText(this, this.SX, 638, '', 14, '#5b7a92');
    // the galaxy map (src/jump.js): a button beside the footer, in map mode only. It closes this map and opens that one over the same scene
    this.galaxyBtn = mapText(this, 100, 638, 'G   Galaxy map', 14, '#38e1ff').setInteractive({ useHandCursor: true });
    this.galaxyBtn.on('pointerdown', () => { const game = this.game; this.close(); setTimeout(() => { if (typeof jumpMapOpen === 'function') jumpMapOpen(game); }, 120); });

    // map mode
    const SX = this.SX;
    this.mapObjs = [];
    const m = o => { this.mapObjs.push(o); return o; };
    this.lbPlanet = m(mapText(this, 0, 0, D.pl.name.toUpperCase(), 13, '#ffb454').setOrigin(0.5));
    this.lbStation = m(mapText(this, 0, 0, D.st.name.toUpperCase(), 13, '#38e1ff').setOrigin(0.5));
    this.lbOutpost = m(mapText(this, 0, 0, D.op ? D.op.name.toUpperCase() : '', 13, '#6dff9c').setOrigin(0.5));
    this.lbGate = m(mapText(this, 0, 0, D.gate ? D.gate.name.toUpperCase() : '', 13, '#ffb454').setOrigin(0.5));
    this.lbShip = m(mapText(this, 0, 0, 'YOU', 13, '#ffffff').setOrigin(0.5));
    this.lbMule = m(mapText(this, 0, 0, 'MULE', 12, '#6dff9c').setOrigin(0.5));
    this.tCr = m(mapText(this, SX + 30, 98, '', 20, GOLD_S).setFontStyle('bold')); // credits: a gold coin (drawn in update) and N CR
    this.tHud = m(mapText(this, SX + 250, 101, '', 16, '#9fe9ff'));
    this.tMissionH = m(mapText(this, SX, 142, 'MISSION', 13, '#5b7a92'));
    this.tMission = m(mapText(this, SX, 162, '', 18, '#ffd37a', 470));
    this.tObjH = m(mapText(this, SX, 250, 'OBJECTIVE', 13, '#5b7a92'));
    this.tObj = m(mapText(this, SX, 270, '', 18, '#ffb454', 470));
    this.tLegH = m(mapText(this, SX, 352, 'LEGEND', 13, '#5b7a92'));
    // the rest of the system: planets, belts and scenery besides the ones the legend names, each with its name on the map (far space, src/cruise.js)
    this.far = sysBodies().filter(b => (b.type === 'planet' && b !== D.pl) || b.type === 'belt' || (b.type === 'scenery' && b !== D.op))
      .map(b => ({ b, lb: m(mapText(this, 0, 0, b.name, 12, '#9fb4c9').setOrigin(0.5)) }));
    this.legend = []; // [name, kind] of the rows shown: drawLegend fills it every frame from what is on the map (mapLegendRows)
    this.legT = []; for (let i = 0; i < MAP_LEG_MAX; i++) this.legT.push(m(mapText(this, SX + 40, 0, '', 15, '#cfefff')));
    this.tView = m(mapText(this, this.MX + this.MS - 10, this.MY + 8, '', 12, '#5b7a92').setOrigin(1, 0));

    this.poiLabels = []; // names of salvage sites you have found (poi.js fills them in)
    for (let i = 0; i < (typeof poiSites === 'function' ? poiSites().length + SIGNAL_MAX : 0); i++) this.poiLabels.push(m(mapText(this, 0, 0, '', 12, '#6dff9c').setOrigin(0.5)));

    // a click on a place of the map flies there (map mode, over the live Space scene): the zone is nearly clear, since Phaser skips a game object that is fully clear
    this.hit = m(this.add.rectangle(this.MX + this.MS / 2, this.MY + this.MS / 2, this.MS, this.MS, 0xffffff, 0.002).setInteractive({ useHandCursor: true }));
    this.hit.on('pointerdown', p => this.flyAt(p.x, p.y));
    this.pk = this.input.keyboard.addKeys('Z');
    this.tPick = m(mapText(this, SX, 326, '', 13, '#ffffff'));
    // the two small buttons by the destination's mark (card space-game-map-click-fly): Fly is regular speed, Fast is cruise; Enter and Shift+Enter are the same two, a second click on the mark is Fly
    const btn = fast => { const t = m(mapText(this, 0, 0, '', 13, '#ffffff').setBackgroundColor('#0a3a4a').setPadding(7, 3, 7, 3).setDepth(5).setVisible(false).setInteractive({ useHandCursor: true })); t.on('pointerdown', (p, lx, ly, e) => { if (e && e.stopPropagation) e.stopPropagation(); this.go(fast); }); return t; };
    this.btnFly = btn(false); this.btnFast = btn(true);
    this.input.keyboard.on('keydown-ENTER', e => { if (this.mode === 'map') this.go(!!(e && e.shiftKey)); });

    // help mode
    this.helpObjs = [];
    const h = o => { this.helpObjs.push(o); return o; };
    h(mapText(this, 100, 112, 'KEYS', 13, '#5b7a92'));
    this.hKeys = h(mapText(this, 100, 140, '', 20, '#cfefff', 520));
    h(mapText(this, SX, 112, 'THIS SCENE', 13, '#5b7a92'));
    this.hTips = h(mapText(this, SX, 140, '', 19, '#cfefff', 470));
    h(mapText(this, SX, 330, 'MISSION', 13, '#5b7a92'));
    this.hMission = h(mapText(this, SX, 358, '', 19, '#ffd37a', 470));
    h(mapText(this, 100, 400, 'ANYWHERE', 13, '#5b7a92'));
    h(mapText(this, 100, 428, 'Tab   sector map\nH   this help page\nEsc   pause menu, saves, volume', 20, '#cfefff'));

    this.setMode(this.mode);
    this.btnFly.setVisible(false); this.btnFast.setVisible(false); // destFrame shows them once there is a destination
  }

  // a click on a place: the navigation panel's own list says which (navpanelPlaceAt, by the view the map is drawn with). It SETS the destination (the ring, the dashed route and the distance
  // are drawn, and the two buttons by it offer Fly and Fast); a second click on the destination flies there at regular speed (card space-game-map-click-fly; it used to fly at once)
  flyAt(px, py) {
    const sp = this.from === 'Space' ? this.scene.get('Space') : null, v = this.view;
    if (this.mode !== 'map' || !sp || !sp.ship || !sp.cr || !v || typeof navpanelPlaceAt !== 'function') return;
    const sc = this.MS / v.size, b = navpanelPlaceAt(sp, v.x + (px - this.MX) / sc, v.y + (py - this.MY) / sc, MAP_CLICK / sc);
    if (!b) return;
    if (sp.cr.target && sp.cr.target.id === b.id) { this.go(false); return; }
    navpanelPick(sp, b, true); // the one way to set a place (src/navpanel.js), with no toast: the game is paused under the map
  }
  // fly to the destination: fast false is regular speed (the autopilot's local leg), true is the autopilot as it always was (cruise for the middle of a long leg; the same as regular on a short one)
  go(fast) {
    const sp = this.from === 'Space' ? this.scene.get('Space') : null, t = sp && sp.cr ? sp.cr.target : null;
    if (this.mode !== 'map' || !sp || !sp.ship || !t || typeof navpanelFly !== 'function') return;
    const b = (typeof navpanelPlaceAt === 'function' ? navpanelPlaceAt(sp, t.x, t.y, 5) : null) || Object.assign({ dist: Math.hypot(t.x - sp.ship.x, t.y - sp.ship.y) }, t); // the panel's own row of that place (it has the distance)
    this.close(); sfx('tick');
    setTimeout(() => { try { navpanelFly(sp, b, fast ? undefined : false); } catch (e) { /* the panel says when it cannot */ } }, 80); // after the scene runs again
  }

  setMode(mode) {
    this.mode = mode;
    const map = mode === 'map';
    this.title.setText(map ? 'SECTOR MAP' : 'HELP  -  ' + this.from.toUpperCase());
    this.footer.setText(map ? 'Z: zoom     Tab or Esc: close     H: help' : 'H or Esc: close     Tab: sector map');
    this.mapObjs.forEach(o => o.setVisible(map)); this.galaxyBtn.setVisible(map);
    this.helpObjs.forEach(o => o.setVisible(!map));
    if (!map) {
      this.hKeys.setText((typeof HELP !== 'undefined' && HELP[this.from] || []).join('\n'));
      this.hTips.setText(SCENE_TIPS[this.from] || '');
    }
  }

  close() {
    const sc = this.scene.get(this.from); // keys released while paused are never seen: clear them so nothing sticks
    if (sc && sc.input && sc.input.keyboard) sc.input.keyboard.resetKeys();
    this.scene.stop(); this.scene.resume(this.from);
  }

  // where everything is right now, from the live Space scene when it is running, else the fixed sector layout
  state() {
    const sp = this.scene.get('Space'), live = this.from === 'Space' && sp && sp.ship && sp.station && sp.planet;
    const st = live ? sp.station : this.D.st, pl = live ? sp.planet : this.D.pl;
    const S = { ws: (sp && sp.WS) || sysDef().size, live, sp, st: { x: st.x, y: st.y }, pl: { x: pl.x, y: pl.y, r: this.D.pl.r } };
    if (live) S.ship = { x: sp.ship.x, y: sp.ship.y, rot: sp.ship.rotation, tag: 'YOU' };
    else if (this.from === 'Surface') S.ship = { x: S.pl.x - 150, y: S.pl.y + 60, rot: -Math.PI / 2, tag: 'LANDED' };
    else S.ship = { x: S.st.x + 120, y: S.st.y, rot: 0, tag: 'DOCKED' };
    S.obj = this.objective(S);
    return S;
  }

  objective(S) {
    if (S.live && S.sp.cr && S.sp.cr.target) return S.sp.cr.target; // a target picked in the nav list (src/cruise.js) comes first
    if (typeof missionFar === 'function' && missionFar()) return null; // the call's goal is in another system: no arrow, the line below says where (src/missions.js)
    if (S.live && typeof missionTarget === 'function') { try { return missionTarget(S.sp); } catch (e) { /* fall through */ } }
    if (typeof missionActive === 'function') {
      if (missionActive('rescue')) return { x: S.pl.x, y: S.pl.y, name: this.D.pl.name };
      if (missionActive('escort') && this.D.gate) return { x: this.D.gate.x, y: this.D.gate.y, name: this.D.gate.name };
    }
    return S.live && !this.D.st.none ? { x: S.st.x, y: S.st.y, name: this.D.st.name } : null; // no call taken: nothing to point at
  }

  update(time) {
    if (this.mode === 'help') {
      this.g.clear(); this.gm.clear();
      this.hMission.setText(typeof missionLine === 'function' ? missionLine().replace(/^MISSION\s+/, '') : '');
      return;
    }
    this.drawMap(time);
  }

  // a name for a mark: where the mark is on the screen and how big, then mapPlace finds the name a free place (names of marks outside the frame are hidden)
  mark(lb, x, y, r, side) {
    const inside = x >= this.MX && x <= this.MX + this.MS && y >= this.MY && y <= this.MY + this.MS;
    lb.setVisible(inside && !!lb.text);
    if (inside && lb.text) this.marks.push({ lb, x, y, r, side, w: lb.width, h: lb.height - 6 }); // 6: the line spacing mapText adds under the last line
  }

  drawMap(time) {
    const g = this.g, gm = this.gm, S = this.state(), MX = this.MX, MY = this.MY, MS = this.MS;
    if (Phaser.Input.Keyboard.JustDown(this.pk.Z)) { this.whole = !this.whole; sfx('tick'); }
    // the view: you and the objective (your destination when you have one); it slides to a new square, it does not jump
    const want = mapView([S.ship, S.obj], S.ws, this.whole), v = this.view || (this.view = Object.assign({}, want));
    ['x', 'y', 'size'].forEach(k => { v[k] += (want[k] - v[k]) * 0.25; if (Math.abs(want[k] - v[k]) < want.size * 0.003) v[k] = want[k]; }); // the last few px in one step, so it comes to rest (about 20 frames)
    const sc = MS / v.size, X = x => MX + (x - v.x) * sc, Y = y => MY + (y - v.y) * sc;
    this.marks = [];
    g.clear(); gm.clear();
    g.fillStyle(0x03070f, 1); g.fillRect(MX, MY, MS, MS);
    g.lineStyle(1, CYAN, 0.12);
    const gs = mapGridStep(v.size, S.ws);
    const lines = []; for (let w = Math.ceil(v.x / gs) * gs; w < v.x + v.size; w += gs) if (w > v.x) lines.push(w);
    const rows = []; for (let w = Math.ceil(v.y / gs) * gs; w < v.y + v.size; w += gs) if (w > v.y) rows.push(w);
    lines.forEach(w => g.lineBetween(X(w), MY, X(w), MY + MS)); rows.forEach(w => g.lineBetween(MX, Y(w), MX + MS, Y(w)));
    // a faint scan band drifts down the map; the frame glows, has ticks on the grid lines and amber brackets outside its corners
    const sy0 = MY + 30 + ((time / 4200) % 1) * (MS - 30);
    g.fillGradientStyle(CYAN, CYAN, CYAN, CYAN, 0, 0, 0.04, 0.04); g.fillRect(MX, sy0 - 30, MS, 30);
    hudGlowPath(g, [[MX, MY], [MX + MS, MY], [MX + MS, MY + MS], [MX, MY + MS]], CYAN, 0.85, true, 1.25);
    g.lineStyle(1, CYAN, 0.55);
    lines.forEach(w => g.lineBetween(X(w), MY - 6, X(w), MY)); rows.forEach(w => g.lineBetween(MX - 6, Y(w), MX, Y(w)));
    g.lineStyle(3, AMBER, 1);
    [[0, 0, 1, 1], [MS, 0, -1, 1], [0, MS, 1, -1], [MS, MS, -1, -1]].forEach(([ox, oy, sx, sy]) => {
      const x = MX + ox - sx * 6, y = MY + oy - sy * 6;
      g.beginPath(); g.moveTo(x, y + sy * 20); g.lineTo(x, y); g.lineTo(x + sx * 20, y); g.strokePath();
    });
    this.tView.setText(v.size >= S.ws ? 'WHOLE SYSTEM   ' + hudFmt(S.ws / 10) + ' km across   Z: local' : 'LOCAL   ' + hudFmt(Math.round(v.size / 100) * 10) + ' km across   Z: whole system');
    const on = { station: '', outpost: '', planet: false, belt: false, wreck: false, objective: false, live: false, stale: false, wanted: false, poi: false }; // what the legend must explain
    const seen = (x, y) => x >= MX && x <= MX + MS && y >= MY && y <= MY + MS;

    // the ship first: its name has the first pick of a place, then the objective's body, then the rest
    const ship = S.ship, ox = X(ship.x), oy = Y(ship.y);
    this.lbShip.setText(ship.tag); this.mark(this.lbShip, ox, oy, 12, 'below');

    // planet and station
    const pr = Math.max(7, S.pl.r * sc);
    if (!this.D.pl.none) {
      gm.fillStyle(AMBER, 0.85); gm.fillCircle(X(S.pl.x), Y(S.pl.y), pr);
      gm.lineStyle(1, AMBER, 0.5); gm.strokeCircle(X(S.pl.x), Y(S.pl.y), pr + 5);
      this.mark(this.lbPlanet, X(S.pl.x), Y(S.pl.y), pr + 6); if (seen(X(S.pl.x), Y(S.pl.y))) on.planet = true;
    } else this.lbPlanet.setVisible(false);
    const sx = X(S.st.x), sy = Y(S.st.y);
    if (!this.D.st.none) {
      gm.fillStyle(CYAN, 0.3); gm.lineStyle(2, CYAN, 1);
      gm.fillPoints([{ x: sx, y: sy - 9 }, { x: sx + 9, y: sy }, { x: sx, y: sy + 9 }, { x: sx - 9, y: sy }], true);
      gm.strokePoints([{ x: sx, y: sy - 9 }, { x: sx + 9, y: sy }, { x: sx, y: sy + 9 }, { x: sx - 9, y: sy }], true);
      this.mark(this.lbStation, sx, sy, 11); if (seen(sx, sy)) on.station = this.D.st.name;
    } else this.lbStation.setVisible(false);
    if (this.D.op) { // Kestrel Outpost (src/stationart.js): scenery, no docking, but worth finding
      const px = X(this.D.op.x), py = Y(this.D.op.y); mapHex(gm, px, py, 8); this.mark(this.lbOutpost, px, py, 10); if (seen(px, py)) on.outpost = this.D.op.name;
    } else this.lbOutpost.setVisible(false);

    // the Perseus gate, only while an escort is on
    const gate = typeof missionActive === 'function' && missionActive('escort') && this.D.gate;
    this.lbGate.setVisible(false);
    if (gate) {
      const gr = Math.max(6, gate.r * sc);
      gm.lineStyle(3, AMBER, 0.9); gm.strokeCircle(X(gate.x), Y(gate.y), gr);
      this.mark(this.lbGate, X(gate.x), Y(gate.y), gr + 2);
    }

    // the MULE in an escort
    const fr = S.live && S.sp.mx && S.sp.mx.freighter;
    this.lbMule.setVisible(false);
    if (fr && fr.active) {
      gm.fillStyle(GREEN, 1); gm.fillRect(X(fr.x) - 4, Y(fr.y) - 3, 8, 6);
      this.mark(this.lbMule, X(fr.x), Y(fr.y), 6, 'below');
    }

    // belts, far planets and far scenery: a ring for a belt, a smaller disc for a planet, a small diamond for a wreck
    this.far.forEach(({ b, lb }) => {
      const fx = X(b.x), fy = Y(b.y), r = b.type === 'scenery' ? 5 : Math.max(4, b.r * sc);
      if (b.type === 'belt') { gm.lineStyle(1, 0x9fb4c9, 0.6); gm.strokeCircle(fx, fy, r); }
      else if (b.type === 'planet') { gm.fillStyle(AMBER, 0.55); gm.fillCircle(fx, fy, r); }
      else { gm.lineStyle(1, 0x9aa7b3, 0.9); gm.strokePoints([{ x: fx, y: fy - 5 }, { x: fx + 5, y: fy }, { x: fx, y: fy + 5 }, { x: fx - 5, y: fy }], true); }
      this.mark(lb, fx, fy, Math.min(r, 40) + 1); // a belt that fills the view keeps its name near its middle
      if (seen(fx, fy)) on[b.type === 'belt' ? 'belt' : b.type === 'planet' ? 'planet' : 'wreck'] = true;
    });

    // pirates: bright where they are now (in sensor range), hollow where you last saw them
    for (const [o, p] of MAPUI.seen) {
      if (!o.active) { MAPUI.seen.delete(o); continue; }
      const live = S.live && Phaser.Math.Distance.Between(S.ship.x, S.ship.y, o.x, o.y) <= SENSOR;
      const x = X(live ? o.x : p.x), y = Y(live ? o.y : p.y);
      if (live) { gm.fillStyle(RED, 1); gm.fillRect(x - 3, y - 3, 6, 6); }
      else { gm.lineStyle(1, RED, 0.55); gm.strokeRect(x - 3, y - 3, 6, 6); }
      if (o.wanted) { gm.lineStyle(2, AMBER, live ? 0.95 : 0.5); gm.strokeCircle(x, y, 8); }
      if (seen(x, y)) { on[live ? 'live' : 'stale'] = true; if (o.wanted) on.wanted = true; }
    }

    if (typeof poiMapMarks === 'function') {
      poiMapMarks(gm, X, Y, this.poiLabels); // it puts each name 9 px under its site: the site is where the name is, less that
      this.poiLabels.forEach(lb => { if (!lb.visible) return; const px = lb.x, py = lb.y - 9; this.mark(lb, px, py, 8, 'below'); if (seen(px, py)) on.poi = true; });
    }
    this.destFrame(gm, X, Y, time);

    // sensor range, then the dashed route to the objective with a pulsing ring, then you
    if (S.live) { gm.lineStyle(1, CYAN, 0.28); gm.strokeCircle(ox, oy, SENSOR * sc); }
    let objLine = 'No objective. Take a call at the MISSIONS terminal.';
    if (S.obj) {
      const tx = X(S.obj.x), ty = Y(S.obj.y), len = Phaser.Math.Distance.Between(ox, oy, tx, ty);
      gm.lineStyle(2, AMBER, 0.55);
      const ux = (tx - ox) / (len || 1), uy = (ty - oy) / (len || 1);
      for (let d = 12; d < len - 14; d += 12) gm.lineBetween(ox + ux * d, oy + uy * d, ox + ux * Math.min(d + 6, len - 14), oy + uy * Math.min(d + 6, len - 14));
      gm.lineStyle(2, AMBER, 0.95); gm.strokeCircle(tx, ty, 13 + 3 * Math.sin(time / 220));
      on.objective = true;
      const km = Phaser.Math.Distance.Between(ship.x, ship.y, S.obj.x, S.obj.y) / 10 | 0;
      const deg = (Phaser.Math.RadToDeg(Math.atan2(S.obj.y - ship.y, S.obj.x - ship.x)) + 90 + 360) % 360;
      objLine = S.obj.name + '\n' + (km < 20 ? 'you are here' : km + ' km  ' + COMPASS[Math.round(deg / 45) % 8]);
    } else if (typeof missionFarLine === 'function' && missionFarLine()) objLine = missionFarLine().replace('  -  G opens the galaxy map', '\nG opens the galaxy map');
    tri(gm, ox, oy, ship.rot, 9, 0xffffff);

    // every name on a free side of its mark, inside the frame
    const at = mapPlace(this.marks, { x: MX, y: MY, w: MS, h: MS });
    this.marks.forEach((k, i) => k.lb.setPosition(Math.round(at[i].x), Math.round(at[i].y + 3))); // 3: half the line spacing under the last line

    this.tCr.setText(hudFmt(G.credits) + ' CR'); hudCoin(g, this.SX + 10, 110, 0.85, 0);
    this.tHud.setText('HULL ' + Math.round(G.hull) + '/' + G.maxHull);
    this.tMission.setText(typeof missionLine === 'function' ? missionLine().replace(/^MISSION\s+/, '') : '');
    this.tObj.setText(objLine);
    this.drawLegend(g, mapLegendRows(on));
  }

  // the destination picked in the navigation panel or by a click: a white ring on it and a line with its distance.
  destFrame(g, X, Y, time) {
    const sp = this.from === 'Space' ? this.scene.get('Space') : null, b = sp && sp.ship && sp.cr ? sp.cr.target : null;
    this.tPick.setText(sp && sp.cr ? 'Click a place on the map to set it as the destination.' : '');
    [this.btnFly, this.btnFast].forEach(t => t.setVisible(!!b));
    if (!b) return;
    const x = X(b.x), y = Y(b.y), r = 14 + 2 * Math.sin(time / 180);
    g.lineStyle(2, 0xffffff, 0.95); g.strokeCircle(x, y, r);
    g.lineStyle(1, 0xffffff, 0.5); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dy]) => g.lineBetween(x + dx * (r + 3), y + dy * (r + 3), x + dx * (r + 10), y + dy * (r + 10)));
    this.tPick.setText('Destination: ' + b.name + '   ' + (Math.hypot(b.x - sp.ship.x, b.y - sp.ship.y) / 10 | 0) + ' km   (click it again to fly)');
    const T = typeof autopilotLegTimes === 'function' ? autopilotLegTimes(sp, b) : { slow: 0, fast: null }, eta = typeof cruiseEtaText === 'function' ? cruiseEtaText : String;
    const going = sp.ap && sp.ap.on && sp.ap.target && sp.ap.target.id === b.id, flyOn = going && sp.ap.local, fastOn = going && !sp.ap.local; // the one that is on is marked
    this.btnFly.setText('FLY    Enter          ' + eta(T.slow) + (flyOn ? '  ON' : '')).setBackgroundColor(flyOn ? '#1f7f95' : '#0a3a4a'); this.btnFast.setText(T.fast == null ? 'FAST   too near to cruise' : 'FAST   Shift+Enter    ' + eta(T.fast) + (fastOn ? '  ON' : '')).setAlpha(T.fast == null ? 0.55 : 1).setBackgroundColor(fastOn ? '#1f7f95' : '#0a3a4a');
    const w = Math.max(this.btnFly.width, this.btnFast.width), hh = this.btnFly.height, right = x + r + 14 + w <= this.MX + this.MS - 4; // beside the mark, on the side that has room, inside the frame
    const bx = right ? x + r + 14 : Math.max(this.MX + 4, x - r - 14 - w), by = Math.max(this.MY + 4, Math.min(this.MY + this.MS - 2 * hh - 8, y - hh - 2));
    this.btnFly.setPosition(bx, by); this.btnFast.setPosition(bx, by + hh + 4);
  }

  drawLegend(g, rows) {
    const x = this.SX + 14, step = mapLegStep(rows.length);
    this.legend = rows;
    this.legT.forEach((t, i) => { t.setVisible(i < rows.length); if (i < rows.length) t.setText(rows[i][0]).setPosition(this.SX + 40, MAP_LEG_Y + i * step); });
    rows.forEach(([, kind], i) => {
      const y = MAP_LEG_Y + i * step + 9;
      if (kind === 'ship') tri(g, x, y, -Math.PI / 2, 8, 0xffffff);
      else if (kind === 'station') {
        g.fillStyle(CYAN, 0.3); g.lineStyle(2, CYAN, 1);
        const p = [{ x, y: y - 8 }, { x: x + 8, y }, { x, y: y + 8 }, { x: x - 8, y }];
        g.fillPoints(p, true); g.strokePoints(p, true);
      } else if (kind === 'outpost') { mapHex(g, x, y, 8);
      } else if (kind === 'planet') { g.fillStyle(AMBER, 0.85); g.fillCircle(x, y, 7); }
      else if (kind === 'belt') { g.lineStyle(1, 0x9fb4c9, 0.8); g.strokeCircle(x, y, 8); }
      else if (kind === 'wreck') { g.lineStyle(1, 0x9aa7b3, 0.9); g.strokePoints([{ x, y: y - 6 }, { x: x + 6, y }, { x, y: y + 6 }, { x: x - 6, y }], true); }
      else if (kind === 'target') { g.lineStyle(2, AMBER, 0.95); g.strokeCircle(x, y, 8); }
      else if (kind === 'live') { g.fillStyle(RED, 1); g.fillRect(x - 3, y - 3, 6, 6); }
      else if (kind === 'stale') { g.lineStyle(1, RED, 0.55); g.strokeRect(x - 3, y - 3, 6, 6); }
      else if (kind === 'poi') { g.lineStyle(2, GREEN, 1); g.strokeCircle(x, y, 6); g.fillStyle(GREEN, 1); g.fillCircle(x, y, 2); }
      else if (kind === 'wanted') { g.fillStyle(RED, 1); g.fillRect(x - 3, y - 3, 6, 6); g.lineStyle(2, AMBER, 0.95); g.strokeCircle(x, y, 8); }
    });
  }
}

// ---------- wiring ----------
function trackDrones(sc) { // remember where each drone was the last time it was in sensor range
  MAPUI.seen.clear();
  untrackDrones();
  MAPUI.trackScene = sc;
  MAPUI.tracker = time => {
    if (time < MAPUI.nextAt || !sc.ship || !sc.enemies) return;
    MAPUI.nextAt = time + 250;
    sc.enemies.getChildren().forEach(e => {
      if (e.active && Phaser.Math.Distance.Between(sc.ship.x, sc.ship.y, e.x, e.y) <= SENSOR) MAPUI.seen.set(e, { x: e.x, y: e.y });
    });
  };
  sc.events.on('update', MAPUI.tracker);
}
function untrackDrones() {
  if (MAPUI.trackScene && MAPUI.tracker) MAPUI.trackScene.events.off('update', MAPUI.tracker);
  MAPUI.tracker = null; MAPUI.trackScene = null;
}

function keyStrip(sc) { // "Tab map  H help", gone after the first minute of play
  if (!MAPUI.t0) MAPUI.t0 = performance.now();
  const age = performance.now() - MAPUI.t0;
  if (age >= STRIP_MS) return;
  // bottom right, level with the controls line on the left: the top centre belongs to the HUD credits strip (hud.js)
  const t = sc.add.text(W - 24, H - 48, 'Tab map     H help', {
    fontFamily: 'monospace', fontSize: '14px', color: '#9fe9ff', backgroundColor: '#000000aa', padding: { x: 10, y: 4 }
  }).setOrigin(1, 0).setScrollFactor(0).setDepth(250).setAlpha(0.8);
  sc.tweens.add({ targets: t, alpha: 0, delay: STRIP_MS - age, duration: 2500, onComplete: () => t.destroy() });
}

function toggleOverlay(game, mode) {
  if (game.scene.isActive('Pause')) return;
  if (game.scene.isActive('Overlay')) {
    const ov = game.scene.getScene('Overlay');
    if (ov.mode === mode) ov.close(); else ov.setMode(mode);
    return;
  }
  const s = game.scene.getScenes(true).find(sc => SCREENS.includes(sc.scene.key));
  if (!s || s.leaving || s.dead || s.panel || s.talk || s.shopOpen) return; // fading out, wrecked, or a panel owns the keys
  if (mode === 'help' && s._gh && s._gh.visible && (!G.guideDone || (typeof LADDER !== 'undefined' && LADDER.id))) return;   // first-run tips and a next step (src/guide.js): H still hides them
  s.scene.pause();
  game.scene.run('Overlay', { from: s.scene.key, mode });
}

function installMap(game) {
  const hook = sc => {
    if (!GAMEPLAY.includes(sc.scene.key)) return;
    sc.events.on('create', () => { keyStrip(sc); if (sc.scene.key === 'Space') trackDrones(sc); });
    sc.events.on('shutdown', () => { if (sc.scene.key === 'Space') untrackDrones(); });
  };
  const wire = () => game.scene.scenes.forEach(hook);
  if (game.scene.scenes.length) wire(); else game.events.once('ready', wire);
  window.addEventListener('keydown', e => {
    if (e.code === 'Tab') e.preventDefault(); // never let Tab move browser focus off the game
    if (e.repeat) return;
    if (e.code === 'Tab') toggleOverlay(game, 'map');
    else if (e.code === 'KeyH') toggleOverlay(game, 'help');
    else if (e.code === 'Escape' && game.scene.isActive('Overlay')) game.scene.getScene('Overlay').close();
  });
}
