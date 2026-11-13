// ---------- Points of interest: derelict wrecks and a distress beacon to find and salvage ----------
// Fly within sensor range and a signal is found (a green dot on the radar and the Tab map). Slow down beside it and
// press E to salvage. Each site pays once per game. Two sites are guarded by pirates.
// Wired by installPoi(game) from scene events, so space.js needs no edits. G.poi saves through meta.js.

const POI = [
  { id: 'wreck-nw', kind: 'wreck', x: 1400, y: 1300, name: 'Derelict freighter', credits: 120,
    note: 'Strongbox recovered.' },
  { id: 'wreck-w', kind: 'wreck', x: 1000, y: 3300, name: 'Wrecked patrol cutter', hull: 40,
    note: 'A repair kit was still sealed.' },
  { id: 'wreck-se', kind: 'wreck', x: 6900, y: 6500, name: 'Drifting survey rig', credits: 150,
    note: 'Sold the data core.' },
  { id: 'wreck-s', kind: 'wreck', x: 3800, y: 7100, name: 'Cargo hulk', credits: 250, guard: 2,
    note: 'The pirates were guarding this.' },
  { id: 'beacon-e', kind: 'beacon', x: 7300, y: 4200, name: 'Distress beacon', credits: 200, guard: 1,
    note: 'The crew is long gone. The vault code still works.' }
];
const POI_FIND = 1600;   // same reach as the sensor ring on the Tab map
const POI_RANGE = 140;   // how close you must be to salvage
const POI_SPEED = 220;   // and how slowly

G.poi = {};              // id -> 1 found, 2 salvaged (saved by meta.js)

function poiSnapshot() { return { poi: Object.assign({}, G.poi) }; }
function poiRestore(s) {
  G.poi = {};
  if (s && s.poi && typeof s.poi === 'object') POI.forEach(p => { const v = s.poi[p.id]; if (v === 1 || v === 2) G.poi[p.id] = v; });
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
function poiSetup(sc) {
  poiTextures(sc);
  const objs = {};
  const prompt = floatPrompt(sc, null);
  POI.forEach(p => {
    const done = G.poi[p.id] === 2;
    const spr = sc.add.image(p.x, p.y, p.kind === 'wreck' ? 'poi-wreck' : 'poi-beacon').setDepth(3);
    const o = { spr, label: label(sc, p.x, p.y + 52, p.name, '#6dff9c', 13).setVisible(false) };
    if (p.kind === 'wreck') {
      spr.setAngle(Phaser.Math.Between(-30, 30));
      sc.tweens.add({ targets: spr, angle: spr.angle + 12, yoyo: true, repeat: -1, duration: Phaser.Math.Between(6000, 9000), ease: 'Sine.easeInOut' });
    } else if (!done) {
      o.ring = sc.add.circle(p.x, p.y - 20, 16).setStrokeStyle(2, GREEN, 0.9).setDepth(3);
      sc.tweens.add({ targets: o.ring, scale: 4, alpha: 0, duration: 1500, repeat: -1 });
    }
    if (done) spr.setTint(0x445566).setAlpha(0.55);
    else if (p.guard) { // pirates lie in wait around the unsalvaged guarded sites
      for (let i = 0; i < p.guard; i++) {
        const a = i / p.guard * Math.PI * 2 + 0.6;
        sc.spawnDrone(p.x + Math.cos(a) * 240, p.y + Math.sin(a) * 240);
      }
    }
    objs[p.id] = o;
  });
  const JD = Phaser.Input.Keyboard.JustDown;
  const tick = () => {
    const pressed = sc.k && sc.k.E ? JD(sc.k.E) : false; // read every frame so an old press never counts later
    if (!sc.ship || !sc.ship.body || sc.dead || sc.leaving) { prompt.setText(''); return; }
    const ship = sc.ship, cam = sc.cameras.main, spd = ship.body.speed;
    let near = null;
    POI.forEach(p => {
      const d = Phaser.Math.Distance.Between(ship.x, ship.y, p.x, p.y), o = objs[p.id];
      if (!G.poi[p.id] && d <= POI_FIND) { G.poi[p.id] = 1; toast(sc, 'Signal found: ' + p.name, '#9fe9ff'); sfx('tick'); }
      if (G.poi[p.id] === 1) hudBlip(sc, p.x, p.y, GREEN, 4);
      o.label.setVisible(d < 900);
      if (G.poi[p.id] !== 2 && d < POI_RANGE && (!near || d < near.d)) near = { p, d, o };
    });
    if (!near) { prompt.setText(''); return; }
    const px = near.p.x - cam.scrollX, py = near.p.y - cam.scrollY - 70;
    prompt.at(px, py);
    if (spd > POI_SPEED) { prompt.setText('Too fast to salvage. Hold S to brake'); return; }
    prompt.setText('E  Salvage ' + near.p.name);
    if (pressed) poiSalvage(sc, near.p, near.o, prompt);
  };
  sc._poi = { objs, tick, prompt };
  sc.events.on('update', tick);
}

function poiSalvage(sc, p, o, prompt) {
  G.poi[p.id] = 2;
  const gains = [];
  if (p.credits) { G.credits += p.credits; gains.push('+' + p.credits + ' cr'); }
  if (p.hull) { G.hull = Math.min(G.maxHull, G.hull + p.hull); gains.push('hull +' + p.hull); }
  sfx('chime');
  toast(sc, p.name + ': ' + p.note + '\n' + gains.join('   '), '#6dff9c');
  if (typeof feelNumber === 'function') feelNumber(sc, p.x, p.y - 40, gains.join('  '), '#ffb454', 18);
  o.spr.setTint(0x445566).setAlpha(0.55);
  if (o.ring) { sc.tweens.killTweensOf(o.ring); o.ring.destroy(); o.ring = null; }
  prompt.setText('');
}

// ---------- the Tab map (map.js calls this with its drawing helpers and a pool of text labels) ----------
function poiMapMarks(g, X, Y, labels) {
  POI.forEach((p, i) => {
    const lb = labels && labels[i], st = G.poi[p.id] || 0;
    if (lb) lb.setVisible(false);
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
    sc.events.on('shutdown', () => { if (sc._poi) { sc.events.off('update', sc._poi.tick); sc._poi = null; } });
  };
  const wire = () => game.scene.scenes.forEach(hook);
  if (game.scene.scenes.length) wire(); else game.events.once('ready', wire);
}
