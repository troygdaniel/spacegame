// ---------- Points of interest: derelict wrecks and a distress beacon to find and salvage ----------
// Fly within sensor range and a signal is found (a green dot on the radar and the Tab map). Slow down beside it and
// press E to salvage. Each site pays once per game. Two sites are guarded by pirates.
// Wired by installPoi(game) from scene events, so space.js needs no edits. G.poi saves through meta.js.

// The fixed sites are bodies of type 'poi' in the system data (src/data_systems.js): wrecks and a beacon, two of them guarded.
const poiSites = () => sysBodies('poi'); // src/universe.js
const POI_FIND = 1600;   // same reach as the sensor ring on the Tab map
const POI_RANGE = 140;   // how close you must be to salvage
const POI_SPEED = 220;   // and how slowly

G.poi = {};              // id -> 1 found, 2 salvaged (saved by meta.js)

function poiSnapshot() { return { poi: Object.assign({}, G.poi) }; }
function poiRestore(s) {
  G.poi = {};
  if (s && s.poi && typeof s.poi === 'object') poiSites().forEach(p => { const v = s.poi[p.id]; if (v === 1 || v === 2) G.poi[p.id] = v; });
}
function poiReset() { G.poi = {}; }

// ---------- art, drawn once with shapes ----------
function poiTextures(sc) {
  if (sc.textures.exists('poi-wreck')) return;
  const mk = (key, w, h, fn) => { const g = sc.make.graphics({ x: 0, y: 0, add: false }); fn(g); g.generateTexture(key, w, h); g.destroy(); };
  mk('poi-wreck', 100, 64, g => {
    g.fillStyle(0x14202e, 1); g.lineStyle(2, 0x6f8aa3, 1);
    g.beginPath(); g.moveTo(6, 34); g.lineTo(30, 12); g.lineTo(62, 8); g.lineTo(94, 26); g.lineTo(86, 46); g.lineTo(58, 58); g.lineTo(26, 54); g.closePath();
    g.fillPath(); g.strokePath();
    g.lineStyle(2, 0x3a4f66, 1); g.lineBetween(30, 12, 26, 54); g.lineBetween(62, 8, 58, 58); g.lineBetween(14, 34, 88, 34);
    g.lineStyle(4, 0x02050c, 1); // the tear
    g.beginPath(); g.moveTo(46, 9); g.lineTo(52, 22); g.lineTo(44, 34); g.lineTo(53, 46); g.lineTo(47, 57); g.strokePath();
    g.fillStyle(RED, 1); g.fillCircle(20, 36, 3); g.fillCircle(76, 28, 3);
  });
  mk('poi-beacon', 44, 56, g => {
    g.fillStyle(0x0b2236, 1); g.lineStyle(2, CYAN, 1);
    g.fillTriangle(22, 18, 8, 52, 36, 52); g.strokeTriangle(22, 18, 8, 52, 36, 52);
    g.lineStyle(2, 0x6f8aa3, 1); g.lineBetween(22, 18, 22, 6);
    g.fillStyle(GREEN, 1); g.fillCircle(22, 6, 4);
  });
}

// ---------- one Space run ----------
const SIGNAL_MAX = 2;          // random signals on the radar at once
const SIGNAL_LIFE = 240000;    // each one fades after four minutes if you ignore it
const SIGNAL_FIRST = 20000;    // the first call comes 20 s into a flight, then every 45 to 75 s
const SIGNAL_TYPES = [
  { kind: 'beacon', name: 'Distress call', note: 'A stranded crew sent their thanks, and a payment.', credits: [100, 200], guardChance: 0.5 },
  { kind: 'wreck', name: 'Drifting derelict', note: 'Scrap and spares recovered.', credits: [80, 160], hullChance: 0.4, hull: 30 }
];
let POIRUN = null;             // the current Space run: { sig: [signals], objs: {id: display objects}, nextAt, n, prompt }

const siteState = p => p.sig ? p.state : (G.poi[p.id] || 0);
const setSiteState = (p, v) => { if (p.sig) p.state = v; else G.poi[p.id] = v; };
const liveSites = () => poiSites().concat(POIRUN ? POIRUN.sig.filter(q => q.state === 1) : []);

function makeSite(sc, p, done) { // sprite, name label, and a pulsing ring on beacons
  const spr = sc.add.image(p.x, p.y, p.kind === 'wreck' ? 'poi-wreck' : 'poi-beacon').setDepth(3);
  const o = { spr, label: label(sc, p.x, p.y + 52, p.name, '#6dff9c', 13).setVisible(false) };
  if (p.kind === 'wreck') {
    spr.setAngle(Phaser.Math.Between(-30, 30));
    o.drift = sc.tweens.add({ targets: spr, angle: spr.angle + 12, yoyo: true, repeat: -1, duration: Phaser.Math.Between(6000, 9000), ease: 'Sine.easeInOut' });
  } else if (!done) {
    o.ring = sc.add.circle(p.x, p.y - 20, 16).setStrokeStyle(2, GREEN, 0.9).setDepth(3);
    o.pulse = sc.tweens.add({ targets: o.ring, scale: 4, alpha: 0, duration: 1500, repeat: -1 });
  }
  if (done) spr.setTint(0x445566).setAlpha(0.55);
  return o;
}

function removeSite(sc, p) { // a signal that faded or was salvaged and has finished fading
  const o = POIRUN && POIRUN.objs[p.id];
  if (!o) return;
  [o.drift, o.pulse].forEach(t => t && t.stop());
  [o.spr, o.label, o.ring].forEach(x => x && x.destroy());
  delete POIRUN.objs[p.id];
}

function poiSpawnSignal(sc, typeIndex) { // a new random signal 1400 to 2200 units from you, so it shows on the 2400 radar
  const R = POIRUN, ship = sc.ship;
  if (!R || !ship || R.sig.filter(q => q.state === 1).length >= SIGNAL_MAX) return null;
  const ws = sc.WS || sysDef().size, d = (x, y, o) => Phaser.Math.Distance.Between(x, y, o.x, o.y);
  let x = 0, y = 0, ok = false;
  for (let i = 0; i < 25 && !ok; i++) {
    const a = Math.random() * Math.PI * 2, r = Phaser.Math.Between(1400, 2200);
    x = ship.x + Math.cos(a) * r; y = ship.y + Math.sin(a) * r;
    ok = x > 400 && x < ws - 400 && y > 400 && y < ws - 400
      && d(x, y, sc.station) > 1000 && d(x, y, sc.planet) > 900
      && liveSites().every(q => d(x, y, q) > 600);
  }
  if (!ok) return null;
  const t = SIGNAL_TYPES[typeIndex === undefined ? Math.floor(Math.random() * SIGNAL_TYPES.length) : typeIndex];
  const p = { sig: true, id: 'sig-' + (++R.n), kind: t.kind, x, y, name: t.name, note: t.note, state: 1, born: sc.time.now };
  if (t.hullChance && Math.random() < t.hullChance) p.hull = t.hull; else p.credits = Phaser.Math.Between(t.credits[0], t.credits[1]);
  if (t.guardChance && Math.random() < t.guardChance) sc.spawnDrone(x + 260, y); // pirates followed the signal
  R.sig.push(p); R.objs[p.id] = makeSite(sc, p, false);
  toast(sc, uiText('toast.signal-new', { name: p.name }), '#9fe9ff'); sfx('tick');
  return p;
}

function poiSetup(sc) {
  poiTextures(sc);
  const R = POIRUN = { sig: [], objs: {}, nextAt: 0, n: 0, prompt: floatPrompt(sc, null) };
  poiSites().forEach(p => {
    const done = G.poi[p.id] === 2;
    R.objs[p.id] = makeSite(sc, p, done);
    if (!done && p.guard) { // pirates lie in wait around the unsalvaged guarded sites
      for (let i = 0; i < p.guard; i++) {
        const a = i / p.guard * Math.PI * 2 + 0.6;
        sc.spawnDrone(p.x + Math.cos(a) * 240, p.y + Math.sin(a) * 240);
      }
    }
  });
  const JD = Phaser.Input.Keyboard.JustDown, prompt = R.prompt;
  const tick = () => {
    const pressed = sc.k && sc.k.E ? JD(sc.k.E) : false; // read every frame so an old press never counts later
    if (!sc.ship || !sc.ship.body || sc.dead || sc.leaving) { prompt.setText(''); return; }
    const ship = sc.ship, cam = sc.cameras.main, spd = ship.body.speed, now = sc.time.now;

    // random signals: one now and then, and the old ones fade
    if (!R.nextAt) R.nextAt = now + SIGNAL_FIRST;
    if (now >= R.nextAt) R.nextAt = now + (poiSpawnSignal(sc) ? Phaser.Math.Between(45000, 75000) : 15000);
    R.sig.forEach(q => {
      if (q.state === 1 && now > q.born + SIGNAL_LIFE) {
        q.state = 0; removeSite(sc, q); toast(sc, uiText('toast.signal-lost', { name: q.name }), '#5b7a92');
      }
    });

    let near = null;
    liveSites().forEach(p => {
      const d = Phaser.Math.Distance.Between(ship.x, ship.y, p.x, p.y), o = R.objs[p.id];
      if (!o) return;
      if (!siteState(p) && d <= POI_FIND) { setSiteState(p, 1); toast(sc, uiText('toast.signal-found', { name: p.name }), '#9fe9ff'); sfx('tick'); }
      if (siteState(p) === 1) hudBlip(sc, p.x, p.y, GREEN, 4);
      o.label.setVisible(d < 900);
      if (siteState(p) === 1 && d < POI_RANGE && (!near || d < near.d)) near = { p, d, o };
    });
    if (!near) { prompt.setText(''); return; }
    prompt.at(near.p.x - cam.scrollX, near.p.y - cam.scrollY - 70);
    if (spd > POI_SPEED) { prompt.setText('Too fast to salvage. Hold S to brake'); return; }
    prompt.setText('E  Salvage ' + near.p.name);
    if (pressed) poiSalvage(sc, near.p, near.o, prompt);
  };
  R.tick = tick;
  sc._poi = R;
  sc.events.on('update', tick);
}

function poiSalvage(sc, p, o, prompt) {
  setSiteState(p, 2);
  const gains = [];
  if (p.credits) { G.credits += p.credits; gains.push('+' + p.credits + ' cr'); }
  if (p.hull) { G.hull = Math.min(G.maxHull, G.hull + p.hull); gains.push('hull +' + p.hull); }
  sfx('chime');
  toast(sc, p.name + ': ' + p.note + '\n' + gains.join('   '), '#6dff9c');
  if (typeof feelNumber === 'function') feelNumber(sc, p.x, p.y - 40, gains.join('  '), '#ffb454', 18);
  if (typeof missionSite === 'function') missionSite(sc, p); // src/missions.js: a salvage or survey call that named this site ends here
  o.spr.setTint(0x445566).setAlpha(0.55);
  if (o.ring) { if (o.pulse) o.pulse.stop(); o.ring.destroy(); o.ring = null; }
  if (p.sig) sc.tweens.add({ targets: [o.spr, o.label], alpha: 0, delay: 1500, duration: 1500, onComplete: () => removeSite(sc, p) }); // a signal is used up
  prompt.setText('');
}

// ---------- the Tab map (map.js calls this with its drawing helpers and a pool of text labels) ----------
function poiMapMarks(g, X, Y, labels) {
  const list = poiSites().concat(POIRUN ? POIRUN.sig.filter(q => q.state === 1) : []);
  (labels || []).forEach(lb => lb.setVisible(false));
  list.forEach((p, i) => {
    const lb = labels && labels[i], st = siteState(p);
    if (!st) return;
    const x = X(p.x), y = Y(p.y), done = st === 2;
    g.lineStyle(2, done ? 0x5b7a92 : GREEN, done ? 0.7 : 1); g.strokeCircle(x, y, 6);
    if (!done) { g.fillStyle(GREEN, 1); g.fillCircle(x, y, 2); }
    if (lb) lb.setText(done ? 'salvaged' : p.name).setColor(done ? '#5b7a92' : '#6dff9c').setPosition(x, y + 9).setVisible(true);
  });
}

// ---------- wiring ----------
function installPoi(game) {
  const hook = sc => {
    if (sc.scene.key !== 'Space') return;
    sc.events.on('create', () => poiSetup(sc));
    sc.events.on('shutdown', () => { if (sc._poi) { sc.events.off('update', sc._poi.tick); sc._poi = null; } POIRUN = null; });
  };
  const wire = () => game.scene.scenes.forEach(hook);
  if (game.scene.scenes.length) wire(); else game.events.once('ready', wire);
}
