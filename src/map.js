// ---------- Sector map (Tab), help page (H) and the key reminder strip ----------
// One overlay scene with two modes, opened over a paused gameplay scene, the same way the pause menu is.
// installMap(game) catches Tab and H on the window and hooks scene create events, so the scenes need no code.

const SENSOR = 1600;          // a drone this close to your ship counts as seen; farther ones keep their last spot
const STRIP_MS = 60000;       // the "Tab map  H help" reminder fades out after the first minute of play
const MAPUI = { t0: 0, seen: new Map(), tracker: null, trackScene: null, nextAt: 0 };
const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

const SCENE_TIPS = {
  Station: 'Walk up to a terminal, the bar or the hangar shop and press E. Board your ship in the hangar to launch.',
  Space: 'The amber arrow points at your objective and the radar is top right. Slow down near the station or the planet, then press L.',
  Ship: 'Look your ship over, then press Enter to launch. Esc goes back to the station to take a mission or repair first.',
  Surface: 'Aim with the mouse and click to fire. Walk back to the landing pad and press E to lift off.'
};

function mapText(s, x, y, str, size, color, wrap) {
  const t = s.add.text(x, y, str, { fontFamily: 'monospace', fontSize: size + 'px', color, lineSpacing: 6 });
  if (wrap) t.setWordWrapWidth(wrap);
  return t;
}

const MAP_LEG_Y = 380, MAP_LEG_STEP = 27; // legend rows: 9 of them still end above the footer line
function mapHex(g, x, y, r) { // Kestrel Outpost mark: a hexagon, so it is not mistaken for a salvage circle
  const p = []; for (let i = 0; i < 6; i++) p.push({ x: x + Math.cos(i * Math.PI / 3 + Math.PI / 6) * r, y: y + Math.sin(i * Math.PI / 3 + Math.PI / 6) * r });
  g.fillStyle(GREEN, 0.3); g.lineStyle(2, GREEN, 1); g.fillPoints(p, true); g.strokePoints(p, true);
}

// ---------- the overlay scene ----------
class Overlay extends Phaser.Scene {
  constructor() { super('Overlay'); }
  init(d) { this.from = (d && d.from) || 'Station'; this.mode = (d && d.mode) || 'map'; }
  create() {
    const cx = W / 2, cy = H / 2;
    // where things are: the bodies of the current system (src/universe.js), not tables kept here
    this.D = { st: sysBody('station'), pl: sysBody('planet'), op: sysBodies('scenery').find(b => b.art === 'outpost') || null, gate: sysBody('gate') };
    const D = this.D;
    this.MX = 100; this.MY = 100; this.MS = 560; this.SX = 706; // map square and the side column
    this.add.rectangle(cx, cy, W, H, 0x02050c, 0.78).setInteractive(); // swallows clicks
    hudPanel(this.add.graphics(), cx - 570, cy - 325, 1140, 650, 20, 0.97, CYAN); // src/hud.js: the same glass panel as the HUD
    this.g = this.add.graphics();
    this.title = mapText(this, 100, 46, '', 26, '#38e1ff');
    const x = mapText(this, 1180, 50, 'Close  [x]', 15, '#9fe9ff').setOrigin(1, 0).setInteractive({ useHandCursor: true });
    x.on('pointerdown', () => this.close());
    this.footer = mapText(this, this.SX, 638, '', 14, '#5b7a92');

    // map mode
    const SX = this.SX;
    this.mapObjs = [];
    const m = o => { this.mapObjs.push(o); return o; };
    this.lbPlanet = m(mapText(this, 0, 0, D.pl.name.toUpperCase(), 13, '#ffb454').setOrigin(0.5, 1));
    this.lbStation = m(mapText(this, 0, 0, D.st.name.toUpperCase(), 13, '#38e1ff').setOrigin(0.5, 1));
    this.lbOutpost = m(mapText(this, 0, 0, D.op ? D.op.name.toUpperCase() : '', 13, '#6dff9c').setOrigin(0.5, 1));
    this.lbGate = m(mapText(this, 0, 0, D.gate ? D.gate.name.toUpperCase() : '', 13, '#ffb454').setOrigin(0.5, 1));
    this.lbShip = m(mapText(this, 0, 0, 'YOU', 13, '#ffffff').setOrigin(0.5, 0));
    this.lbMule = m(mapText(this, 0, 0, 'MULE', 12, '#6dff9c').setOrigin(0.5, 0));
    this.tCr = m(mapText(this, SX + 30, 98, '', 20, GOLD_S).setFontStyle('bold')); // credits: a gold coin (drawn in update) and N CR
    this.tHud = m(mapText(this, SX + 250, 101, '', 16, '#9fe9ff'));
    this.tMissionH = m(mapText(this, SX, 142, 'MISSION', 13, '#5b7a92'));
    this.tMission = m(mapText(this, SX, 162, '', 18, '#ffd37a', 470));
    this.tObjH = m(mapText(this, SX, 250, 'OBJECTIVE', 13, '#5b7a92'));
    this.tObj = m(mapText(this, SX, 270, '', 18, '#ffb454', 470));
    this.tLegH = m(mapText(this, SX, 352, 'LEGEND', 13, '#5b7a92'));
    // the rest of the system: planets, belts and scenery besides the ones the legend names, each with its name on the map (far space, src/cruise.js)
    this.far = sysBodies().filter(b => (b.type === 'planet' && b !== D.pl) || b.type === 'belt' || (b.type === 'scenery' && b !== D.op))
      .map(b => ({ b, lb: m(mapText(this, 0, 0, b.name, 12, '#9fb4c9').setOrigin(0.5, 1)) }));
    this.legend = [
      ['you', 'ship'], [D.st.name, 'station'], [D.op ? D.op.name : 'outpost', 'outpost'], [D.pl.name, 'planet'], ['objective', 'target'],
      ['drone in sensor range', 'live'], ['drone, where you last saw it', 'stale'], ['wanted pirate', 'wanted'], ['salvage site', 'poi']
    ];
    this.legend.forEach(([name], i) => m(mapText(this, SX + 40, MAP_LEG_Y + i * MAP_LEG_STEP, name, 15, '#cfefff')));

    this.poiLabels = []; // names of salvage sites you have found (poi.js fills them in)
    for (let i = 0; i < (typeof poiSites === 'function' ? poiSites().length + SIGNAL_MAX : 0); i++) this.poiLabels.push(m(mapText(this, 0, 0, '', 12, '#6dff9c').setOrigin(0.5, 0)));

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
  }

  setMode(mode) {
    this.mode = mode;
    const map = mode === 'map';
    this.title.setText(map ? 'SECTOR MAP' : 'HELP  -  ' + this.from.toUpperCase());
    this.footer.setText(map ? 'Tab or Esc: close     H: help' : 'H or Esc: close     Tab: sector map');
    this.mapObjs.forEach(o => o.setVisible(map));
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
    if (S.live && typeof missionTarget === 'function') { try { return missionTarget(S.sp); } catch (e) { /* fall through */ } }
    if (typeof missionActive === 'function') {
      if (missionActive('rescue')) return { x: S.pl.x, y: S.pl.y, name: this.D.pl.name };
      if (missionActive('escort') && this.D.gate) return { x: this.D.gate.x, y: this.D.gate.y, name: this.D.gate.name };
    }
    return S.live ? { x: S.st.x, y: S.st.y, name: this.D.st.name } : null; // no call taken: nothing to point at
  }

  update(time) {
    if (this.mode === 'help') {
      this.g.clear();
      this.hMission.setText(typeof missionLine === 'function' ? missionLine().replace(/^MISSION\s+/, '') : '');
      return;
    }
    this.drawMap(time);
  }

  drawMap(time) {
    const g = this.g, S = this.state(), MX = this.MX, MY = this.MY, MS = this.MS, sc = MS / S.ws;
    const X = x => MX + x * sc, Y = y => MY + y * sc;
    g.clear();
    g.fillStyle(0x03070f, 1); g.fillRect(MX, MY, MS, MS);
    g.lineStyle(1, CYAN, 0.12);
    const gs = S.ws / 8; // eight grid cells across, whatever the size of the system
    for (let i = 1; i < 8; i++) { g.lineBetween(X(i * gs), MY, X(i * gs), MY + MS); g.lineBetween(MX, Y(i * gs), MX + MS, Y(i * gs)); }
    // a scan band drifts down the map; the frame glows, has ticks on the grid lines and amber brackets outside its corners
    const sy0 = MY + 30 + ((time / 4200) % 1) * (MS - 30);
    g.fillGradientStyle(CYAN, CYAN, CYAN, CYAN, 0, 0, 0.09, 0.09); g.fillRect(MX, sy0 - 30, MS, 30);
    hudGlowPath(g, [[MX, MY], [MX + MS, MY], [MX + MS, MY + MS], [MX, MY + MS]], CYAN, 0.85, true, 1.25);
    g.lineStyle(1, CYAN, 0.55);
    for (let i = 1; i < 8; i++) { g.lineBetween(X(i * gs), MY - 6, X(i * gs), MY); g.lineBetween(MX - 6, Y(i * gs), MX, Y(i * gs)); }
    g.lineStyle(3, AMBER, 1);
    [[0, 0, 1, 1], [MS, 0, -1, 1], [0, MS, 1, -1], [MS, MS, -1, -1]].forEach(([ox, oy, sx, sy]) => {
      const x = MX + ox - sx * 6, y = MY + oy - sy * 6;
      g.beginPath(); g.moveTo(x, y + sy * 20); g.lineTo(x, y); g.lineTo(x + sx * 20, y); g.strokePath();
    });

    // planet and station
    const pr = Math.max(7, S.pl.r * sc);
    g.fillStyle(AMBER, 0.85); g.fillCircle(X(S.pl.x), Y(S.pl.y), pr);
    g.lineStyle(1, AMBER, 0.5); g.strokeCircle(X(S.pl.x), Y(S.pl.y), pr + 5);
    this.lbPlanet.setPosition(X(S.pl.x), Y(S.pl.y) - pr - 8);
    const sx = X(S.st.x), sy = Y(S.st.y);
    g.fillStyle(CYAN, 0.3); g.lineStyle(2, CYAN, 1);
    g.fillPoints([{ x: sx, y: sy - 9 }, { x: sx + 9, y: sy }, { x: sx, y: sy + 9 }, { x: sx - 9, y: sy }], true);
    g.strokePoints([{ x: sx, y: sy - 9 }, { x: sx + 9, y: sy }, { x: sx, y: sy + 9 }, { x: sx - 9, y: sy }], true);
    this.lbStation.setPosition(sx, sy - 14);
    if (this.D.op) { // Kestrel Outpost (src/stationart.js): scenery, no docking, but worth finding
      const ox = X(this.D.op.x), oy = Y(this.D.op.y); mapHex(g, ox, oy, 8); this.lbOutpost.setPosition(ox, oy - 12);
    } else this.lbOutpost.setVisible(false);

    // belts, far planets and far scenery: a ring for a belt, a smaller disc for a planet, a small diamond for a wreck
    this.far.forEach(({ b, lb }) => {
      const fx = X(b.x), fy = Y(b.y);
      if (b.type === 'belt') { g.lineStyle(1, 0x9fb4c9, 0.6); g.strokeCircle(fx, fy, Math.max(4, b.r * sc)); }
      else if (b.type === 'planet') { g.fillStyle(AMBER, 0.55); g.fillCircle(fx, fy, Math.max(4, b.r * sc)); }
      else { g.lineStyle(1, 0x9aa7b3, 0.9); g.strokePoints([{ x: fx, y: fy - 5 }, { x: fx + 5, y: fy }, { x: fx, y: fy + 5 }, { x: fx - 5, y: fy }], true); }
      lb.setPosition(fx, fy - Math.max(4, b.type === 'scenery' ? 5 : b.r * sc) - 3);
    });

    // the Perseus gate, only while an escort is on
    const gate = typeof missionActive === 'function' && missionActive('escort') && this.D.gate;
    this.lbGate.setVisible(!!gate);
    if (gate) {
      g.lineStyle(3, AMBER, 0.9); g.strokeCircle(X(gate.x), Y(gate.y), Math.max(6, gate.r * sc));
      this.lbGate.setPosition(X(gate.x), Y(gate.y) - 14);
    }

    // drones: bright where they are now (in sensor range), hollow where you last saw them
    for (const [o, p] of MAPUI.seen) {
      if (!o.active) { MAPUI.seen.delete(o); continue; }
      const live = S.live && Phaser.Math.Distance.Between(S.ship.x, S.ship.y, o.x, o.y) <= SENSOR;
      const x = X(live ? o.x : p.x), y = Y(live ? o.y : p.y);
      if (live) { g.fillStyle(RED, 1); g.fillRect(x - 3, y - 3, 6, 6); }
      else { g.lineStyle(1, RED, 0.55); g.strokeRect(x - 3, y - 3, 6, 6); }
      if (o.wanted) { g.lineStyle(2, AMBER, live ? 0.95 : 0.5); g.strokeCircle(x, y, 8); }
    }

    if (typeof poiMapMarks === 'function') poiMapMarks(g, X, Y, this.poiLabels);

    // the MULE in an escort
    const fr = S.live && S.sp.mx && S.sp.mx.freighter;
    const showMule = !!(fr && fr.active);
    this.lbMule.setVisible(showMule);
    if (showMule) {
      g.fillStyle(GREEN, 1); g.fillRect(X(fr.x) - 4, Y(fr.y) - 3, 8, 6);
      this.lbMule.setPosition(X(fr.x), Y(fr.y) + 6);
    }

    // sensor range, then the dashed route to the objective with a pulsing ring, then you
    const ship = S.ship, ox = X(ship.x), oy = Y(ship.y);
    if (S.live) { g.lineStyle(1, CYAN, 0.28); g.strokeCircle(ox, oy, SENSOR * sc); }
    let objLine = 'No objective. Take a call at the MISSIONS terminal.';
    if (S.obj) {
      const tx = X(S.obj.x), ty = Y(S.obj.y), len = Phaser.Math.Distance.Between(ox, oy, tx, ty);
      g.lineStyle(2, AMBER, 0.55);
      const ux = (tx - ox) / (len || 1), uy = (ty - oy) / (len || 1);
      for (let d = 12; d < len - 14; d += 12) g.lineBetween(ox + ux * d, oy + uy * d, ox + ux * Math.min(d + 6, len - 14), oy + uy * Math.min(d + 6, len - 14));
      g.lineStyle(2, AMBER, 0.95); g.strokeCircle(tx, ty, 13 + 3 * Math.sin(time / 220));
      const km = Phaser.Math.Distance.Between(ship.x, ship.y, S.obj.x, S.obj.y) / 10 | 0;
      const deg = (Phaser.Math.RadToDeg(Math.atan2(S.obj.y - ship.y, S.obj.x - ship.x)) + 90 + 360) % 360;
      objLine = S.obj.name + '\n' + (km < 20 ? 'you are here' : km + ' km  ' + COMPASS[Math.round(deg / 45) % 8]);
    }
    tri(g, ox, oy, ship.rot, 9, 0xffffff);
    this.lbShip.setText(ship.tag).setPosition(ox, oy + 12);

    this.tCr.setText(hudFmt(G.credits) + ' CR'); hudCoin(g, this.SX + 10, 110, 0.85, 0);
    this.tHud.setText('HULL ' + Math.round(G.hull) + '/' + G.maxHull);
    this.tMission.setText(typeof missionLine === 'function' ? missionLine().replace(/^MISSION\s+/, '') : '');
    this.tObj.setText(objLine);
    this.drawLegend(g);
  }

  drawLegend(g) {
    const x = this.SX + 14;
    this.legend.forEach(([, kind], i) => {
      const y = MAP_LEG_Y + i * MAP_LEG_STEP + 9;
      if (kind === 'ship') tri(g, x, y, -Math.PI / 2, 8, 0xffffff);
      else if (kind === 'station') {
        g.fillStyle(CYAN, 0.3); g.lineStyle(2, CYAN, 1);
        const p = [{ x, y: y - 8 }, { x: x + 8, y }, { x, y: y + 8 }, { x: x - 8, y }];
        g.fillPoints(p, true); g.strokePoints(p, true);
      } else if (kind === 'outpost') { mapHex(g, x, y, 8);
      } else if (kind === 'planet') { g.fillStyle(AMBER, 0.85); g.fillCircle(x, y, 7); }
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
  if (mode === 'help' && !G.guideDone && s._gh && s._gh.visible) return;   // first-run tips: H still hides them
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
