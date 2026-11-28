// LONG HAUL (working title) - station, rescue mission, planet landing. MVP v0.1.
const W = 1280, H = 720;
const CYAN = 0x38e1ff, AMBER = 0xffb454, RED = 0xff4d6d, GREEN = 0x6dff9c;
const GOLD = 0xffd24a, GOLD_S = '#ffd24a'; // credits are always this gold, with a coin beside them (the HUD strip, the panels, the map)
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

// ---- toasts: one box, in a band of its own ----
// A toast is the line that pops up top centre. They used to stack down from y 96, three deep, over whatever was under them: the autopilot
// and cruise readout, the assist's line, the right half of the navigation panel's pinned destination (docs/FIRSTLOOK.md, 17 Nov 2026). An
// order raises two or three at once, so the readout was hidden exactly when it started. Now there is one box and it never leaves its band:
//   the band     TOAST.top (or, in the Campaign, just below the HUD lines stacked at the top centre, wherever that is: the scene's toastTop(), cards space-game-toast-over-topcentre and space-game-toast-gap) down the screen, TOAST.w + 2 * TOAST.pad wide at most, centred: clear of the HUD strip above it,
//                the mission box and the navigation panel to its left, the radar to its right, and the readouts, which sit under it
//                (TOAST.readY for the autopilot and cruise line, ASSIST.readY in src/assist.js for the assist's)
//   two lines    at most. A message is wrapped to the band's width; one that needs more than two lines is set smaller (TOAST.sizes), and
//                at the smallest size it is cut to two lines
//   one box      a new toast takes the place of the one showing. If that one came less than TOAST.pair ms ago and both are one line, the
//                box shows both, the older on top, so a pair that belongs together (the reward, then "Docked.") is still read
// s.toasts keeps its shape for the files that read it (src/assist.js, src/hud.js, the tests): [{ t, bg, tab, y, h }], now one entry at most.
// toastFit and toastBox are pure (tests/toastband.mjs): the type is monospace, 0.6 of its size wide, and a line is its size + 3 px high.
// A scene that has HUD lines at the top centre (the Campaign's column of wave, goal, Earth, repair and outpost lines, with the mothership's or the rival's bars under it) gives toastTop(): the y a toast starts at (just under the column, CAMP.hud.toastGap px; not held to TOAST.top: card space-game-toast-gap). A toast already up
// follows it (toastKeep, called by the scene every frame), so a line that comes after the toast does not end up under it. A scene with no toastTop (the Long Haul) keeps TOAST.top.
const TOAST = {
  top: 86, bottom: 150,        // px down the screen: the band
  w: 520, pad: 16,             // px: the widest line of text, and the box's margin around it
  sizes: [20, 16, 14],         // px: the type, and what a long message steps down to
  pair: 1500,                  // ms: a toast this soon after another shares the box with it
  hold: 2800, fade: 600,       // ms it stays, ms it takes to go
  readY: 166                   // px: the autopilot and cruise readout's line, just under the band (src/autopilot.js, src/cruise.js)
};
function toastWrap(msg, cols) {
  const out = [];
  String(msg).split('\n').forEach(par => {
    let cur = '';
    par.split(' ').forEach(word => {
      while (word.length > cols) { if (cur) { out.push(cur); cur = ''; } out.push(word.slice(0, cols)); word = word.slice(cols); } // a word longer than a line
      if (cur && cur.length + 1 + word.length > cols) { out.push(cur); cur = word; } else cur = cur ? cur + ' ' + word : word;
    });
    out.push(cur);
  });
  return out;
}
// the type and the lines of one message: two lines at most
function toastFit(msg) {
  let fit = null;
  for (const size of TOAST.sizes) {
    const cols = Math.floor(TOAST.w / (0.6 * size)), lines = toastWrap(msg, cols);
    fit = { size, cols, lines };
    if (lines.length <= 2) return fit;
  }
  const keep = fit.lines.slice(0, 2); keep[1] = keep[1].slice(0, fit.cols - 3) + '...';
  return { size: fit.size, cols: fit.cols, lines: keep };
}
// what the box shows: the new message, with the one before it on top when the two belong together (and say something else: the same line twice is one line). prev: { msg, at } or null
function toastPlan(prev, msg, now) {
  const fit = toastFit(msg);
  if (prev && now - prev.at < TOAST.pair && fit.lines.length === 1) {
    const before = toastFit(prev.last || prev.msg);
    if (before.lines.length === 1 && before.lines[0] !== fit.lines[0]) { const size = Math.min(fit.size, before.size); return { size, lines: [before.lines[0], fit.lines[0]] }; }
  }
  return { size: fit.size, lines: fit.lines };
}
// where the box of those lines is: { x, y } its centre, w and h its size
function toastBox(plan, top = TOAST.top) { // top: where the box starts (TOAST.top, or lower: the scene's toastTop)
  const chars = Math.max(1, ...plan.lines.map(l => l.length)), lh = plan.size + 3;
  const w = Math.min(TOAST.w, Math.ceil(chars * 0.6 * plan.size)) + 2 * TOAST.pad, h = plan.lines.length * lh + 2 * 8;
  return { x: W / 2, y: top + h / 2, w, h, top, bottom: top + h, left: W / 2 - w / 2, right: W / 2 + w / 2 };
}
function toastKeep(s, top) { // the box that is up moves to the scene's toastTop when that has changed (the column above it grew or shrank); a gone one is left alone
  (s.toasts || []).forEach(o => { if (!o || !o.t || !o.t.active || o.top === undefined || o.top === top) return; const d = top - o.top; o.top = top; o.y += d; o.t.y += d; o.bg.y += d; o.tab.y += d; });
}
function toast(s, msg, color = '#ffd37a', hold = 0) { // hold: ms this one stays up when longer than TOAST.hold (a radio line the player must read: src/campsayhold.js)
  if (s.mp && typeof campMapToast === 'function' && campMapToast(s, msg, color, hold) === true) return; // the Tab map open in the panel look: the line is the map's radio panel's, in its column (src/campmappanel.js; card space-game-b3-f-tab-map-build)
  if (typeof s.toastPanel === 'function' && s.toastPanel(msg, color, hold) === true) return; // a scene whose page HUD has a panel for it (the Campaign's radio panel, src/camppagehud.js; card space-game-b3-c-radio-panel) shows the message there, and no box is made
  if (typeof lhEarthSay === 'function') msg = lhEarthSay(msg, s); // with ?longhaul=new a line Long Haul shows says the home system's new names (src/lhnew.js); the same line without it
  const now = s.time && typeof s.time.now === 'number' ? s.time.now : 0;
  const old = (s.toasts || []).filter(o => o && o.t && o.t.active);
  const prev = old.length ? old[old.length - 1] : null;
  const plan = toastPlan(prev && prev.at !== undefined ? prev : null, msg, now), box = toastBox(plan, typeof s.toastTop === 'function' ? s.toastTop() : TOAST.top);
  old.forEach(o => { o.t.destroy(); o.bg.destroy(); o.tab.destroy(); }); // one box: whatever was up goes
  const t = s.add.text(box.x, box.y, plan.lines.join('\n'), { fontFamily: 'monospace', fontSize: plan.size + 'px', color, align: 'center' }).setOrigin(0.5).setScrollFactor(0).setDepth(300);
  const edge = Phaser.Display.Color.HexStringToColor(color).color; // thin frame in the message colour, amber tab on the left
  const bg = s.add.rectangle(box.x, box.y, box.w, box.h, 0x04101c, 0.92).setStrokeStyle(1, edge, 0.9).setScrollFactor(0).setDepth(299);
  const tab = s.add.rectangle(box.left + 2, box.y, 3, box.h, AMBER, 1).setScrollFactor(0).setDepth(299);
  s.toasts = [{ t, bg, tab, y: box.y, h: box.h, top: box.top, msg: String(msg), last: String(msg), at: now }]; // last: the message that came last, whole (the last LINE of a message that wrapped is a fragment: it was paired with the next toast as if it were a message, and the box showed "Q, CONVOY, 3 is Run for it." with the start of the sentence cut off)
  s.tweens.add({ targets: [t, bg, tab], alpha: 0, delay: Math.max(TOAST.hold, hold | 0), duration: TOAST.fade, onComplete: () => { t.destroy(); bg.destroy(); tab.destroy(); } });
}

function go(s, key, data) {
  if (s.leaving) return;
  s.leaving = true;
  s.cameras.main.fadeOut(280, 0, 0, 0);
  s.cameras.main.once('camerafadeoutcomplete', () => s.scene.start(key, data));
}

function label(s, x, y, text, color = '#9fe9ff', size = 14) {
  const t = s.add.text(x, y, text, { fontFamily: 'monospace', fontSize: size + 'px', color })
    .setOrigin(0.5).setPadding(8).setShadow(0, 0, color, 6, false, true); // soft neon glow (padding keeps the glow from being clipped)
  (s._wl = s._wl || []).push(t); // hud.js fades world labels that sit under a HUD panel
  return t;
}

function hudText(s, x, y, color = '#9fe9ff', size = 16) {
  return s.add.text(x, y, '', { fontFamily: 'monospace', fontSize: size + 'px', color })
    .setStroke('#02060d', 3).setScrollFactor(0).setDepth(100); // dark outline keeps it readable over stars and ground
}

function missionLine() {
  const m = missionDef(); // src/missions.js
  if (!m || G.mission === 'none') return 'MISSION  None. Take a call at the MISSIONS terminal';
  return 'MISSION  ' + m.line(G.mission);
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
