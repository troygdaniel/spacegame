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
  const t = s.add.text(W / 2, 96, msg, {
    fontFamily: 'monospace', fontSize: '20px', color, align: 'center'
  }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
  const edge = Phaser.Display.Color.HexStringToColor(color).color; // thin frame in the message colour, amber tab on the left
  const bg = s.add.rectangle(W / 2, 96, t.width + 32, t.height + 16, 0x04101c, 0.92).setStrokeStyle(1, edge, 0.9).setScrollFactor(0).setDepth(299);
  const tab = s.add.rectangle(W / 2 - (t.width + 32) / 2 + 2, 96, 3, t.height + 16, AMBER, 1).setScrollFactor(0).setDepth(299);
  s.tweens.add({ targets: [t, bg, tab], alpha: 0, delay: 2800, duration: 600, onComplete: () => { t.destroy(); bg.destroy(); tab.destroy(); } });
}

function go(s, key, data) {
  if (s.leaving) return;
  s.leaving = true;
  s.cameras.main.fadeOut(280, 0, 0, 0);
  s.cameras.main.once('camerafadeoutcomplete', () => s.scene.start(key, data));
}

function label(s, x, y, text, color = '#9fe9ff', size = 14) {
  return s.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size + 'px', color })
    .setOrigin(0.5).setPadding(8).setShadow(0, 0, color, 6, false, true); // soft neon glow (padding keeps the glow from being clipped)
}

function hudText(s, x, y, color = '#9fe9ff', size = 16) {
  return s.add.text(x, y, '', { fontFamily: 'monospace', fontSize: size + 'px', color })
    .setStroke('#02060d', 3).setScrollFactor(0).setDepth(100); // dark outline keeps it readable over stars and ground
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
  const f = Phaser.Math.Clamp(frac, 0, 1), fw = Math.max(0, w * f);
  g.fillStyle(0x02101c, 0.8); g.fillRect(x, y, w, h);
  g.fillStyle(color, 0.9); g.fillRect(x, y, fw, h);
  g.fillStyle(0xffffff, 0.2); g.fillRect(x, y, fw, Math.max(1, h * 0.3)); // sheen along the top
  g.lineStyle(1, 0x02101c, 0.5);
  for (let i = 1; i < 10; i++) g.lineBetween(x + w * i / 10, y, x + w * i / 10, y + h); // a tick every 10 percent
  g.lineStyle(1, CYAN, 0.6); g.strokeRect(x - 1.5, y - 1.5, w + 3, h + 3);             // thin cyan frame
  g.fillStyle(AMBER, 1); g.fillRect(x - 4, y - 1, 2, h + 2);                              // amber tab on the left
}

// small triangle pointing along angle a, with a soft halo and a dark edge
function tri(g, x, y, a, size, color) {
  const p = (ang, r) => [x + Math.cos(a + ang) * r, y + Math.sin(a + ang) * r];
  const pts = k => [p(0, size * k), p(2.5, size * 0.8 * k), p(-2.5, size * 0.8 * k)];
  let [[x1, y1], [x2, y2], [x3, y3]] = pts(1.6);
  g.fillStyle(color, 0.2); g.fillTriangle(x1, y1, x2, y2, x3, y3);
  [[x1, y1], [x2, y2], [x3, y3]] = pts(1);
  g.fillStyle(color, 1); g.fillTriangle(x1, y1, x2, y2, x3, y3);
  g.lineStyle(1, 0x02060d, 0.9); g.strokeTriangle(x1, y1, x2, y2, x3, y3);
}

function rectWall(s, x, y, w, h, fill = 0x13263d, stroke = CYAN) {
  const r = s.add.rectangle(x + w / 2, y + h / 2, w, h, fill).setStrokeStyle(2, stroke, 0.7);
  s.physics.add.existing(r, true);
  return r;
}
