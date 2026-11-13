// LONG HAUL (working title) - station, rescue mission, planet landing. MVP v0.1.
const W = 1280, H = 720;
const CYAN = 0x38e1ff, AMBER = 0xffb454, RED = 0xff4d6d, GREEN = 0x6dff9c;
const G = { credits: 0, hull: 100, maxHull: 100, mission: 'none', upgrades: { armor: 0, rapid: 0, booster: 0 }, volume: 1, muted: false }; // mission: none | accepted | rescued | failed; volume 0..1
const REWARD = 500;

// ---------- helpers ----------
let AC = null;
function beep(f = 440, d = 0.08, type = 'square', v = 0.03, slide = 0) {
  if (G.muted || G.volume <= 0) return;
  v *= G.volume;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + d);
  } catch (e) { /* audio is optional */ }
}
window.addEventListener('keydown', () => { if (AC && AC.state === 'suspended') AC.resume(); });

function toast(s, msg, color = '#ffd37a') {
  // two toasts at once used to draw on top of each other: each takes the first free slot, 44 px apart, three at most
  const Y0 = 96, STEP = 44;
  s.toasts = (s.toasts || []).filter(o => o.active);
  let slot = 0;
  while (s.toasts.some(o => o.y === Y0 + slot * STEP)) slot++;
  if (slot >= 3) { const old = s.toasts.shift(); slot = Math.round((old.y - Y0) / STEP); old.destroy(); }
  const t = s.add.text(W / 2, Y0 + slot * STEP, msg, {
    fontFamily: 'monospace', fontSize: '20px', color, align: 'center',
    backgroundColor: '#000000bb', padding: { x: 14, y: 8 }
  }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
  s.toasts.push(t);
  s.tweens.add({ targets: t, alpha: 0, delay: 2800, duration: 600, onComplete: () => t.destroy() });
}

function go(s, key, data) {
  if (s.leaving) return;
  s.leaving = true;
  s.cameras.main.fadeOut(280, 0, 0, 0);
  s.cameras.main.once('camerafadeoutcomplete', () => s.scene.start(key, data));
}

function label(s, x, y, text, color = '#9fe9ff', size = 14) {
  return s.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size + 'px', color }).setOrigin(0.5);
}

function hudText(s, x, y, color = '#9fe9ff', size = 16) {
  return s.add.text(x, y, '', { fontFamily: 'monospace', fontSize: size + 'px', color })
    .setScrollFactor(0).setDepth(100);
}

function missionLine() {
  switch (G.mission) {
    case 'accepted': return 'MISSION  Rescue the colonist on Kepler-4b';
    case 'rescued': return 'MISSION  Colonist aboard: dock at the station';
    case 'failed': return 'MISSION  Failed. Ask the station for another call';
    default: return 'MISSION  None. Take a call at the MISSIONS terminal';
  }
}

function bar(g, x, y, w, h, frac, color) {
  g.fillStyle(0x000000, 0.55); g.fillRect(x, y, w, h);
  g.fillStyle(color, 1); g.fillRect(x, y, Math.max(0, w * Phaser.Math.Clamp(frac, 0, 1)), h);
  g.lineStyle(1, color, 0.8); g.strokeRect(x, y, w, h);
}

// small triangle pointing along angle a
function tri(g, x, y, a, size, color) {
  const p = (ang, r) => [x + Math.cos(a + ang) * r, y + Math.sin(a + ang) * r];
  const [x1, y1] = p(0, size), [x2, y2] = p(2.5, size * 0.8), [x3, y3] = p(-2.5, size * 0.8);
  g.fillStyle(color, 1); g.fillTriangle(x1, y1, x2, y2, x3, y3);
}

function rectWall(s, x, y, w, h, fill = 0x13263d, stroke = CYAN) {
  const r = s.add.rectangle(x + w / 2, y + h / 2, w, h, fill).setStrokeStyle(2, stroke, 0.7);
  s.physics.add.existing(r, true);
  return r;
}
