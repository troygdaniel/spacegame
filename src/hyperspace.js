// ---------- Hyperspace: the watched tunnel (Universe B3) ----------
// The Hyper scene. Nothing to do, everything to look at. Seen from above like the rest of the game: the ship points right at
// 35% of the screen, star streaks rush past it to the left, gates (thin tall rings) come out of the distance, pass the ship and
// leave behind it, two ribbons of colour twist along the path, a light bleeds from the nose, a soft camera shake. The readout
// shows destination, time left and fuel burned. It lasts ly x HYPER.secPerLy seconds, clamped to 6..30 (UNIVERSE.md 2.3, 9).
//
// LANDS DARK (UNIVERSE.md 10.1 rule 2): nothing in the game opens it yet and it never touches G or the save. The only way in is
// the test hash:  index.html#hyper  (Kestrel, 6.3 ly, 10 s, cyan)  or  index.html#hyper<ly>  (#hyper14 white, #hyper24 amber, 30 s).
// B4 (the jump) will start it with  scene.start('Hyper', { dest, ly, fuel, tank, next: 'Space', nextData })  (demo: false).
//
// Cheap to draw: the tunnel is ONE Graphics redrawn each frame (about a thousand short segments, the polyline helpers of hud.js);
// the soft lights (nose bloom, lens flare, the glow ahead, the edge vignette) are three small canvas textures made once.
// Sound is a synthesized hum that rises toward arrival (audio.js building blocks); silent in headless Chrome.

const HYPER = {
  secPerLy: 1.6, minSec: 6, maxSec: 30,            // the knob: seconds of tunnel per light year, and its limits
  shipX: 0.35, stars: 220, near: 26,               // the ship's place across the screen; streaks, of which `near` are long and close
  gateEvery: 0.3, gateLife: 1.3,                   // a gate every 0.3 s; each crosses the screen in 1.3 s
  shake: 0.0015, ramp: 1.2, tail: 0.9,             // camera shake; seconds to build speed at the start and to slow down at the end
  fuelPerLy: 1, tank: 40,                          // demo numbers only: the real ones come with the jump card (B1, B4)
  demo: { dest: 'KESTREL OUTPOST', ly: 6.3 },
  pull: { flicker: 1.1, collapse: 0.9, red: 0xff3b3b } // a pull-out (src/pullout.js): seconds of flicker and alarm, then of the rings collapsing; the alarm colour
};
const HYPER_QUIET = /HeadlessChrome/.test(navigator.userAgent); // no sound in headless runs

function hyperSecs(ly) { return Phaser.Math.Clamp(ly * HYPER.secPerLy, HYPER.minSec, HYPER.maxSec); }

function hyperMix(a, b, k) { // blend two 0xRRGGBB colours, k = 0 gives a and 1 gives b
  const ch = s => { const x = (a >> s) & 255, y = (b >> s) & 255; return Math.round(x + (y - x) * k); };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}
// the tunnel's colour grows warmer with distance: cyan for a short hop, white for a medium one, amber for a long one
function hyperTint(ly) {
  const t = Phaser.Math.Clamp((ly - 4) / 20, 0, 1);
  return t < 0.5 ? hyperMix(CYAN, 0xffffff, t * 2) : hyperMix(0xffffff, AMBER, (t - 0.5) * 2);
}

// what boot.js passes for #hyper (a light-year count after the word is optional)
function hyperDemo(lyStr) {
  const ly = lyStr ? Math.max(1, +lyStr) : HYPER.demo.ly;
  const dest = !lyStr ? HYPER.demo.dest : ly <= 12 ? 'MERIDIAN' : 'LETHE';
  return { dest, ly, fuel: Math.round(ly * HYPER.fuelPerLy), tank: HYPER.tank, demo: true };
}

// ---- sound: a low hum, a rush of air and a whine that climbs until arrival ----
function hyperHum(dur) {
  if (HYPER_QUIET || !audioReady()) return null;
  const out = AC.createGain(), list = [], t0 = AC.currentTime;
  out.gain.value = 0; out.connect(AUD.master);
  const flt = AC.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 520; flt.Q.value = 0.9; flt.connect(out);
  aOsc(list, 'sawtooth', 46, flt, 0.45); aOsc(list, 'triangle', 92, flt, 0.22);
  const whine = aOsc(list, 'sine', 380, out, 0.05), rush = aNoise(list, out, 'bandpass', 1100, 0.7, 0.25);
  out.gain.linearRampToValueAtTime(0.16, t0 + HYPER.ramp);
  out.gain.setValueAtTime(0.16, t0 + Math.max(HYPER.ramp, dur - HYPER.tail));
  out.gain.linearRampToValueAtTime(0, t0 + dur);
  whine.frequency.linearRampToValueAtTime(980, t0 + dur); rush.frequency.linearRampToValueAtTime(2800, t0 + dur);
  return { out, list };
}
function hyperHumStop(h) {
  if (!h) return;
  try { h.out.gain.cancelScheduledValues(0); h.out.gain.setTargetAtTime(0, AC.currentTime, 0.05); } catch (e) { /* audio is optional */ }
  setTimeout(() => h.list.forEach(o => { try { o.stop(); } catch (e) { /* already stopped */ } }), 500);
}

// a soft round light as a texture: white in the middle, nothing at the edge (tinted and added with blend mode ADD)
function hyperGlowTex(scene, key, size) {
  if (scene.textures.exists(key)) return;
  const c = scene.textures.createCanvas(key, size, size), x = c.getContext(), r = size / 2;
  const gr = x.createRadialGradient(r, r, 0, r, r, r);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.5)');
  gr.addColorStop(0.55, 'rgba(255,255,255,0.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = gr; x.fillRect(0, 0, size, size); c.refresh();
}
function hyperVignetteTex(scene, key) { // dark at the edges, clear in the middle; drawn small and stretched over the screen
  if (scene.textures.exists(key)) return;
  const w = 160, h = 90, c = scene.textures.createCanvas(key, w, h), x = c.getContext();
  const gr = x.createRadialGradient(w / 2, h / 2, 26, w / 2, h / 2, 98);
  gr.addColorStop(0, 'rgba(2,4,10,0)'); gr.addColorStop(1, 'rgba(2,4,10,0.88)');
  x.fillStyle = gr; x.fillRect(0, 0, w, h); c.refresh();
}

class Hyper extends Phaser.Scene {
  constructor() { super('Hyper'); }

  init(d) {
    d = d || {};
    this.d = d;
    this.dest = d.dest || HYPER.demo.dest;
    this.ly = d.ly || HYPER.demo.ly;
    this.dur = d.secs || hyperSecs(this.ly);
    this.tank = d.tank || HYPER.tank;
    this.fuel = Math.min(d.fuel == null ? Math.round(this.ly * HYPER.fuelPerLy) : d.fuel, this.tank);
    this.tint = hyperTint(this.ly);
    this.t = 0; this.k = 0; this.gates = []; this.gateAcc = -0.3; this.arrived = false; this.leaving = false;
    this.pull = d.pull || null; this.frac0 = d.frac0 || 0; // a pull-out to come at this fraction of the tunnel; or how far along a resumed tunnel starts (src/pullout.js)
    this.pulled = false; this.pullT = 0; this.coll = 0;
  }

  create() {
    shipRefresh(this); // the ship shows the upgrade tiers you own
    const cam = this.cameras.main;
    cam.setBackgroundColor('#03050c'); cam.fadeIn(500, 0, 0, 0);
    cam.shake((this.dur + 1) * 1000, HYPER.shake, true);
    this.cx = W * HYPER.shipX; this.cy = H / 2;

    // streaks in three depth bins (far, middle, near), one line style per bin
    this.bins = [[], [], []];
    for (let i = 0; i < HYPER.stars; i++) {
      const near = i < HYPER.near, z = near ? 0.8 + Math.random() * 0.2 : 0.12 + 0.7 * Math.pow(Math.random(), 1.3);
      this.bins[near ? 2 : z < 0.42 ? 0 : 1].push({ x: Math.random() * W, y: Math.random() * H, z, near });
    }
    this.g = this.add.graphics().setDepth(1).setBlendMode(Phaser.BlendModes.ADD); // the whole tunnel: streaks, ribbons, gates, flames

    hyperGlowTex(this, 'hyper-glow', 128); hyperVignetteTex(this, 'hyper-vig');
    this.far = this.add.image(W + 30, this.cy, 'hyper-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(this.tint).setScale(10, 7).setDepth(0).setAlpha(0);
    this.ship = this.add.image(this.cx, this.cy, 'ship').setScale(1.15).setDepth(5);
    this.halo = this.add.image(this.cx, this.cy, 'hyper-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(this.tint).setDepth(4).setAlpha(0);
    this.bloom = this.add.image(this.cx, this.cy, 'hyper-glow').setBlendMode(Phaser.BlendModes.ADD).setDepth(6).setAlpha(0);
    this.flare = this.add.image(this.cx, this.cy, 'hyper-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(this.tint).setDepth(6).setAlpha(0);
    this.add.image(W / 2, H / 2, 'hyper-vig').setDisplaySize(W, H).setDepth(50);

    this.hg = this.add.graphics().setScrollFactor(0).setDepth(100);
    this.h = { s: this, g: this.hg, t: {}, seen: {} }; // what hudPut (hud.js) wants for its text pool

    this.hum = hyperHum(this.dur);
    if (!HYPER_QUIET) { sfx('hyperCharge'); this.time.delayedCall(HYPER.ramp * 1000 + 100, () => { if (!this.arrived) sfx('hyperJump'); }); } // the charge, then the jump as the tunnel reaches speed (the jump card B4 calls the same two)
    this.events.once('shutdown', () => { hyperHumStop(this.hum); this.hum = null; });
    this.input.keyboard.on('keydown-ESC', () => this.leave());
    this.input.keyboard.on('keydown-R', () => { if (!this.leaving) this.scene.restart(this.d); });
  }

  leave() {
    if (this.leaving) return;
    go(this, this.d.demo ? 'Title' : (this.d.next || 'Space'), this.d.nextData);
  }

  update(time, delta) {
    const dt = Math.min(delta, 100) / 1000;
    if (!this.arrived) this.t += dt;
    const t = this.t, dur = this.dur;
    // k: how fast the tunnel runs, 0..1: builds up over the first 1.2 s, slows over the last 0.9 s
    const up = Phaser.Math.Clamp(t / HYPER.ramp, 0, 1), down = Phaser.Math.Clamp((dur - t) / HYPER.tail, 0, 1);
    const ease = Phaser.Math.Easing.Sine.InOut;
    let k = ease(up) * ease(down);
    if (this.pull && !this.pulled && t / dur >= this.pull.at) this.pullBegin();
    if (this.pulled) k = this.pullFrame(dt, k);
    this.k = k; const v = 0.12 + 0.88 * k;
    this.drawTunnel(t, dt, k, v);
    this.drawHud(t);
    if (t >= dur && !this.arrived && !this.pulled) this.arrive();
  }

  // ---- the pull-out (src/pullout.js; docs/UNIVERSE.md 5.2): the tunnel flickers, an alarm sounds, the rings collapse, and deep space takes over ----
  pullBegin() {
    this.pulled = true; this.pullT = 0;
    this.tint = hyperMix(this.tint, HYPER.pull.red, 0.85); // every colour drawn from here on is the alarm's
    [this.far, this.halo, this.flare].forEach(im => im.setTint(HYPER.pull.red));
    this.cameras.main.shake(HYPER.pull.flicker * 1000, 0.01, true);
    if (!HYPER_QUIET) sfx('interdict'); // the alarm (src/audio.js sound pass)
  }
  // one frame of it: returns the tunnel speed k to draw with. Flicker first (the speed stutters), then the collapse (it dies away and the gates shrink)
  pullFrame(dt, k) {
    const P = HYPER.pull;
    this.pullT += dt;
    if (this.pullT < P.flicker) return k * (Math.sin(this.pullT * 53) * Math.sin(this.pullT * 29 + 1) > -0.15 ? 1 : 0.15);
    if (!this.pullEnding) { // the rings begin to collapse: the hum goes with them
      this.pullEnding = true; hyperHumStop(this.hum); this.hum = null;
    }
    this.coll = Phaser.Math.Clamp((this.pullT - P.flicker) / P.collapse, 0, 1);
    if (this.coll >= 1 && !this.leaving) this.pullGo();
    return k * (1 - Phaser.Math.Easing.Cubic.Out(this.coll));
  }
  // the hand-over: a red flash, then the Space scene with the pirates (it reads the record pullRecord makes)
  pullGo() {
    this.cameras.main.flash(500, 255, 90, 90);
    go(this, 'Space', { from: 'pullout', deep: pullRecord(this.d, this.pull, this.dur) });
  }

  drawTunnel(t, dt, k, v) {
    const g = this.g, tint = this.tint, cy = this.cy;
    g.clear();

    // star streaks: faster and longer the nearer they are
    const look = [[0.3, 1.1, tint], [0.55, 1.6, hyperMix(tint, 0xffffff, 0.55)], [0.9, 2.4, 0xffffff]];
    this.bins.forEach((list, b) => {
      g.lineStyle(look[b][1], look[b][2], look[b][0] * (0.4 + 0.6 * v));
      list.forEach(s => {
        const sp = 2600 * v * (0.25 + 1.4 * s.z);
        s.x -= sp * dt;
        const len = sp * (s.near ? 0.07 : 0.045) + 2;
        if (s.x + len < -20) { s.x = W + 20 + Math.random() * 300; s.y = Math.random() * H; }
        g.lineBetween(s.x, s.y, s.x + len, s.y);
      });
    });

    // two ribbons of colour twisting along the path, drifting left slowly
    for (let r = 0; r < 2; r++) {
      const pts = [], top = [], bot = [], col = r ? hyperMix(tint, 0xb06bff, 0.65) : tint, f = 0.25 + 0.75 * k;
      for (let x = -20; x <= W + 20; x += 24) {
        const env = Math.sin(Math.PI * (x + 20) / (W + 40)); // calm at the screen edges
        const y = cy + (Math.sin(x * 0.0042 + t * (0.5 + r * 0.17) + r * 2.4) * (80 + r * 26) + Math.sin(x * 0.011 - t * 0.8 + r) * 24) * (0.3 + 0.7 * env);
        const hw = (7 + 15 * Math.pow(Math.sin(x * 0.005 + t * 0.7 + r * 1.7), 2)) * (0.4 + 0.6 * env); // the band swells and pinches
        pts.push([x, y]); top.push({ x, y: y - hw }); bot.push({ x, y: y + hw });
      }
      g.fillStyle(col, 0.13 * f); g.fillPoints(top.concat(bot.reverse()), true);
      hudGlowPath(g, pts, col, 0.5 * f, false, 2.4 - r * 0.7);
    }

    // gates: a thin tall ring every 0.3 s, small and faint in the distance, brightest as it passes the ship
    if (!this.arrived && t < this.dur - HYPER.tail * 0.5 && k > 0.05) this.gateAcc += dt;
    while (this.gateAcc >= HYPER.gateEvery) { this.gateAcc -= HYPER.gateEvery; this.gates.push(0); }
    for (let i = this.gates.length - 1; i >= 0; i--) {
      this.gates[i] += dt / HYPER.gateLife * (0.35 + 0.65 * v);
      if (this.gates[i] >= 1) this.gates.splice(i, 1);
    }
    this.gates.forEach(u => {
      const x = W + 40 - (W + 120) * Math.pow(u, 1.6); // accelerates as it comes near
      const sh = 1 - 0.92 * this.coll; // a pull-out: the rings shrink to nothing
      const ry = (60 + 380 * Math.pow(u, 1.3)) * sh, rx = (5 + 15 * u) * sh;
      const near = Math.exp(-Math.pow((x - this.cx) / 230, 2));
      const a = Math.min(1, u / 0.08, (1 - u) / 0.1) * (0.2 + 0.8 * near) * (1 - this.coll);
      const pts = [], poly = [], col = hyperMix(tint, 0xffffff, 0.3 + 0.55 * near);
      for (let i = 0; i < 36; i++) { const px = x + Math.cos(TAU * i / 36) * rx, py = cy + Math.sin(TAU * i / 36) * ry; pts.push([px, py]); poly.push({ x: px, y: py }); }
      g.fillStyle(col, 0.06 * near * a); g.fillPoints(poly, true);
      hudGlowPath(g, pts, col, a * (0.35 + 0.65 * v), true, 1.6 + 1.4 * near);
    });

    // the ship: hovers, surges forward as the tunnel builds, flames out of its nozzles
    const ship = this.ship, sc = ship.scaleX, breath = Math.sin(t * 1.3);
    ship.x = this.cx - 14 + 28 * k; ship.y = cy + Math.sin(t * 1.6) * 3.5; ship.rotation = Math.sin(t * 1.1) * 0.025;
    const r = ship.rotation, c = Math.cos(r), n = Math.sin(r), flame = hyperMix(0x9fe9ff, tint, 0.3);
    (SHIPS.nozzles.ship || [[-14, 0, 1]]).forEach(([dx, dy, size]) => {
      shipsFlame(g, ship.x + (c * dx - n * dy) * sc, ship.y + (n * dx + c * dy) * sc, r, 0.55 + 0.45 * v, size * sc, flame, 1.1 + 1.3 * v);
    });

    // the light: a bloom bleeding from the nose that breathes, a thin lens flare across it, the glow of the distance ahead
    const nx = ship.x + 24 * sc, ny = ship.y;
    this.halo.setPosition(ship.x, ship.y).setScale(1.9, 1.1).setAlpha(0.32 * (0.3 + 0.7 * k));
    this.bloom.setPosition(nx, ny).setScale((1.6 + 0.25 * breath) * (0.5 + 0.5 * k)).setAlpha((0.65 + 0.25 * breath) * (0.3 + 0.7 * k));
    this.flare.setPosition(nx, ny).setScale(7 + 0.5 * breath, 0.22).setAlpha(0.4 * k * (0.7 + 0.3 * breath));
    this.far.setAlpha((0.3 + 0.1 * Math.sin(t * 0.7)) * (0.2 + 0.8 * k));
  }

  drawHud(t) {
    const g = this.hg, h = this.h, left = Math.max(0, this.dur - t), frac = Phaser.Math.Clamp(this.frac0 + (1 - this.frac0) * t / this.dur, 0, 1); // a resumed tunnel (after a pull-out) starts where it was cut
    const tag = { size: HT.tag, color: HUD_DIM, spacing: 3 };
    g.clear();

    // top: where you are going, and a thin line for how far along
    const x = W / 2 - 240, y = 24, w = 480, ht = 92;
    hudPanel(g, x, y, w, ht, 12, 0.92, CYAN);
    hudPut(h, 'tag', x + 24, y + 22, 'HYPERSPACE TRANSIT', tag);
    hudPut(h, 'ly', x + w - 24, y + 22, this.ly.toFixed(1) + ' LY', { size: HT.tag, color: '#9fe9ff', spacing: 2, ox: 1 });
    hudPut(h, 'dest', x + w / 2, y + 47, this.dest, { size: 22, bold: true, color: '#e8faff', spacing: 4, ox: 0.5, glow: 6 });
    const px0 = x + 24, px1 = x + w - 24, py = y + ht - 16, px = px0 + (px1 - px0) * frac;
    g.lineStyle(2, HUD_LINE, 0.8); g.lineBetween(px0, py, px1, py);
    if (px - px0 > 1) hudGlowPath(g, [[px0, py], [px, py]], CYAN, 0.95, false, 1.5);
    hudDiamond(g, px, py, 4, 0xe8faff);

    // bottom: time left, fuel burned (and what is left in the tank)
    const bx = W / 2 - 250, by = H - 112, bw = 500, bh = 80;
    hudPanel(g, bx, by, bw, bh, 12, 0.92, CYAN);
    g.lineStyle(1, HUD_LINE, 0.6); g.lineBetween(bx + 250, by + 16, bx + 250, by + bh - 16);
    hudPut(h, 'tl', bx + 28, by + 22, 'TIME LEFT', tag);
    hudPut(h, 'tlv', bx + 28, by + 52, left.toFixed(1) + ' s', { size: HT.num, bold: true, color: '#e8faff' });
    hudPut(h, 'fl', bx + 276, by + 22, 'FUEL BURNED', tag);
    hudPut(h, 'flv', bx + 276, by + 52, String(this.fuel), { size: HT.num, bold: true, color: '#e8faff' });
    hudBar(g, bx + 326, by + 38, 150, 12, (this.tank - this.fuel) / this.tank, CYAN, 20);
    hudPut(h, 'tank', bx + 326, by + 64, 'TANK ' + (this.tank - this.fuel) + ' / ' + this.tank, { size: HT.tag, color: HUD_DIM, spacing: 2 });

    if (this.pulled) hudPut(h, 'alarm', W / 2, 150, 'DRIVE FAULT  -  PULLED OUT OF HYPERSPACE', { size: 20, bold: true, color: '#ff6b6b', spacing: 4, ox: 0.5, glow: 8, alpha: Math.floor(this.pullT * 6) % 2 === 0 ? 1 : 0.15 }); // blinks at 3 Hz while the tunnel collapses
    if (this.d.demo) hudPut(h, 'hint', 24, H - 24, (this.d.pull ? 'TEST HASH #pullout' : 'TEST HASH #hyper') + '  -  NO GAME EFFECT  -  ESC LEAVE  -  R REPLAY', { size: HT.tag, color: HUD_DIM, spacing: 2 });
  }

  // the end: a white flash, then back where the demo started (a real jump will hand over to the arrival scene)
  arrive() {
    this.arrived = true;
    if (!HYPER_QUIET) sfx('hyperArrive');
    this.cameras.main.flash(650, 255, 255, 255);
    this.time.delayedCall(700, () => this.leave());
  }
}
