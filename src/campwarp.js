// ---------- Campaign: the warp from Earth to the new solar system (card space-game-campaign-warp; Troy, 20 Nov 2026) ----------
// When level 2 starts the carrier warps from Earth to Alpha Centauri, and Troy wants to SEE it: Earth and the Sun pull away, the stars stretch into streaks, a bright tunnel, a flash, and the new star
// resolves ahead. 6 to 8 seconds, any key skips it, a line of words and of ship voice over it, the sounds of src/audio.js. Two halves in this one file:
//   THE TIMELINE (pure: no Phaser, no page; tests/campwarp.mjs runs it in Node). The numbers are CAMP.warp in src/campaign.js: campWarpFrame(t, skippedAt) says, for the moment t, where Earth, the Sun
//     and the new star are, how fast the streaks run, how bright the tunnel and the flash are, which line of words is up; campWarpNew / campWarpStep / campWarpSkip hold the clock and the skip.
//   THE SCENE (thin): CampWarp draws what the frame says, with Long Haul's own tunnel (Hyper.prototype.drawTunnel in src/hyperspace.js: streaks, ribbons, gates, the light at the nose), its glow textures, its hum,
//     and the planet drawing of src/art_world.js for Earth and for the star. It adds only the pull-away, the star that resolves, the words, and the skip.
// THE CALL: Campaign.create (src/campaignscene.js) asks campWarpDue(this) first. A level with `warp` data (CAMP.levels[n].warp: { dest, ly, star }) that is not a retry or a debug skip and has not been
// shown for this start goes to CampWarp with the start's own data; CampWarp ends by starting Campaign again with that data plus warped: true. Every way into the level (K on the title, "next" after the
// level before, ?campaign=2) goes through Campaign.create, so none of them changes. Music keeps its rules (src/music.js plays in Space only: nothing starts here).
//   campWarpFrame(t, skippedAt)   one moment of the cinematic: { t, phase, earth, sun, star, companions, speed, tunnel, warm, flash, line, lineAlpha, done }
//   campWarpNew() / campWarpStep(S, dt) / campWarpSkip(S)   the clock: S = { t, skippedAt, done }; a step is at most 0.1 s; a skip is once and only after the grace; both are quiet when it is over
//   campWarpDue(s)                true when the scene s (a Campaign) went to the cinematic and must stop its create
const campWarpSS = (a, b, t) => { const u = Math.max(0, Math.min(1, (t - a) / ((b - a) || 1))); return u * u * (3 - 2 * u); }; // 0 before a, 1 after b, smooth between
const campWarpLerp = (a, b, k) => a + (b - a) * k;

function campWarpFrame(t, skippedAt) {
  const K = CAMP.warp, mid = (K.flash[0] + K.flash[1]) / 2, E = K.earth, S = K.sun;
  const pull = campWarpSS(K.pull[0], K.pull[1], t), away = 1 - campWarpSS(K.tunnel[0] - 0.4, K.tunnel[0] + 0.6, t);
  const speed = campWarpSS(K.stretch[0], K.stretch[1], t) * (1 - campWarpSS(K.resolve[0], K.resolve[1], t));
  const skipped = skippedAt != null, u = skipped ? Math.max(0, Math.min(1, (t - skippedAt) / K.skipFade)) : 0;
  let flash = t < K.flash[0] ? 0 : t < mid ? campWarpSS(K.flash[0], mid, t) : 1 - campWarpSS(mid, K.flash[1], t);
  if (skipped) flash = Math.max(flash, campWarpSS(0, 0.7, u));
  const r = campWarpSS(mid, K.resolve[1], t), shown = campWarpSS(mid, mid + 0.5, t);
  let line = -1, lineAlpha = 0;
  K.lines.forEach((l, i) => { const hold = l.hold != null ? l.hold : K.hold; if (t >= l.at && t < l.at + hold + K.fade) { line = i; lineAlpha = Math.min(campWarpSS(l.at, l.at + K.fade, t), 1 - campWarpSS(l.at + hold, l.at + hold + K.fade, t)); } });
  if (skipped) { line = -1; lineAlpha = 0; }
  const phase = t < K.stretch[0] ? 'pull' : t < K.tunnel[0] ? 'stretch' : t < K.flash[0] ? 'tunnel' : t < K.resolve[0] ? 'flash' : 'resolve';
  return {
    t, phase, skipped,
    earth: { x: campWarpLerp(E.x, E.endX, pull), y: E.y, scale: campWarpLerp(1, E.endScale, pull), alpha: away },
    sun: { x: campWarpLerp(S.x, S.x - 0.14, pull), y: S.y, scale: campWarpLerp(1, S.endScale, pull), alpha: away },
    star: { x: K.star.x, y: K.star.y, scale: campWarpLerp(0.05, 1, r), alpha: shown, glow: campWarpLerp(0.2, 1, r) },
    speed, tunnel: campWarpSS(K.tunnel[0], K.tunnel[0] + 0.8, t) * (1 - campWarpSS(K.flash[0], mid, t)), warm: campWarpSS(K.tunnel[0] + 1.5, K.flash[0], t),
    flash, line, lineAlpha, done: t >= K.total || (skipped && u >= 1)
  };
}

const campWarpNew = () => ({ t: 0, skippedAt: null, done: false });
function campWarpStep(S, dt) {
  if (!S.done) S.t += Math.max(0, Math.min(dt, 0.1)); // a long frame (a tab asleep) is a tenth of a second: the cinematic is never over because the window was
  const f = campWarpFrame(S.t, S.skippedAt); if (f.done) S.done = true;
  return f;
}
function campWarpSkip(S) { // a key: the flash comes up and it ends. Not in the first CAMP.warp.grace seconds (the key that began the level may still be down), not twice, not when it is over
  if (S.done || S.skippedAt != null || S.t < CAMP.warp.grace) return false;
  S.skippedAt = S.t; return true;
}

// the call from Campaign.create: true when the scene went to the cinematic (its create must return at once)
function campWarpDue(s) {
  try {
    const L = CAMP.levels[s.level], w = L && L.warp;
    if (!w || s.warped || s.via === 'retry' || s.via === 'skip' || !s.scene || !s.scene.start) return false;
    s.scene.start('CampWarp', Object.assign({}, s.d0 || {}, { level: s.level, via: s.via, warped: false })); // the start's own data goes there and comes back
    return true;
  } catch (e) { return false; }
}

// ---------- the scene ----------
class CampWarp extends Phaser.Scene {
  constructor() { super('CampWarp'); }
  init(d) { this.d = d || {}; this.S = campWarpNew(); this.went = false; this.said = {}; this.cued = {}; }
  create() {
    const K = CAMP.warp, L = CAMP.levels[this.d.level] || {}, w = L.warp || {}, cam = this.cameras.main;
    this.vars = { dest: w.dest || '', ly: w.ly || '' };
    cam.setBackgroundColor('#03050c'); cam.fadeIn(300, 0, 0, 0); cam.shake(K.total * 1000, K.shake, true);
    // what Long Haul's tunnel (Hyper.prototype.drawTunnel) reads: the streaks in three bins, the graphics, the gates, the ship and its lights
    this.cx = W * K.ship.x; this.cy = H * K.ship.y; this.tint = K.color.tunnel; this.dur = K.total; this.t = 0; this.gates = []; this.gateAcc = -0.3; this.arrived = false; this.coll = 0; this.pose = null; this.mix = 0;
    this.bins = [[], [], []];
    for (let i = 0; i < K.stars; i++) { const near = i < K.near, z = near ? 0.8 + Math.random() * 0.2 : 0.12 + 0.7 * Math.pow(Math.random(), 1.3); this.bins[near ? 2 : z < 0.42 ? 0 : 1].push({ x: Math.random() * W, y: Math.random() * H, z, near }); }
    hyperGlowTex(this, 'hyper-glow', 128); hyperVignetteTex(this, 'hyper-vig');
    const glow = (tint, depth) => this.add.image(0, 0, 'hyper-glow').setBlendMode(Phaser.BlendModes.ADD).setTint(tint).setDepth(depth);
    // the places: Earth and the Sun behind, the new star ahead with its companions, drawn with the same planet art the levels use
    const E = CAMP.places.earth, star = (L.places && L.places[w.star]) || {};
    this.earth = this.add.image(0, 0, planetTexture(this, E.kind || 'ice', E.seed || 7)).setDepth(1);
    this.sun = glow(K.color.sun, 1);
    this.starGlow = glow(K.color.star, 0).setAlpha(0);
    this.star = this.add.image(0, 0, planetTexture(this, star.kind || 'lava', star.seed || 4371)).setDepth(1).setAlpha(0);
    this.core = glow(0xfff4d0, 2).setAlpha(0); // the star is a sun: a white-hot core over the level's own picture of it (its cracked surface shows round the edge)
    this.comp = K.companions.map(c => glow(c.color, 1).setAlpha(0));
    this.g = this.add.graphics().setDepth(2).setBlendMode(Phaser.BlendModes.ADD);
    this.far = glow(K.color.tunnel, 0).setScale(10, 7).setAlpha(0); this.far.setPosition(W + 30, this.cy);
    const carrier = typeof shipPreviewTexture === 'function' ? shipPreviewTexture(this, 'bastion') : 'ship';
    this.ship = this.add.image(this.cx, this.cy, this.textures.exists(carrier) ? carrier : 'ship').setDepth(5).setScale(1.15);
    this.halo = glow(K.color.tunnel, 4).setAlpha(0); this.bloom = glow(0xffffff, 6).setAlpha(0); this.flare = glow(K.color.tunnel, 6).setAlpha(0);
    this.vig = this.add.image(W / 2, H / 2, 'hyper-vig').setDisplaySize(W, H).setDepth(50);
    this.band = this.add.rectangle(W / 2, H * K.textY, 1040, 60, 0x02060d, 1).setDepth(59).setAlpha(0); // a dark band under the words: they are read over a bright tunnel
    this.words = this.add.text(W / 2, H * K.textY, '', uiFont(24, '#e8f6ff', { align: 'center', wordWrap: { width: 900 }, stroke: '#02060d', strokeThickness: 4 })).setOrigin(0.5).setDepth(60).setAlpha(0);
    this.add.text(W - 24, H - 22, uiText('camp.warp.skip'), uiFont(14, '#5b7a92')).setOrigin(1, 1).setDepth(60);
    this.white = this.add.rectangle(W / 2, H / 2, W, H, K.color.flash, 1).setDepth(100).setAlpha(0);
    this.hum = typeof hyperHum === 'function' ? hyperHum(K.total) : null; // Long Haul's own hum: silent in headless Chrome, rises to the end
    this.input.keyboard.on('keydown', e => { if (!e.repeat) campWarpSkip(this.S); });
    this.input.on('pointerdown', () => campWarpSkip(this.S));
    this.events.once('shutdown', () => { if (typeof hyperHumStop === 'function') hyperHumStop(this.hum); this.hum = null; });
  }
  update(time, delta) {
    if (this.went) return;
    const dt = Math.min(delta, 100) / 1000, f = campWarpStep(this.S, dt);
    this.frame(f, dt);
    if (f.done) this.finish();
  }
  frame(f, dt) {
    const K = CAMP.warp, E = K.earth, S = K.sun, T = K.star;
    this.t = f.t;
    this.tint = hyperMix(K.color.tunnel, K.color.warm, f.warm);
    this.mix = f.tunnel; this.ribbonK = f.tunnel; this.gateK = f.tunnel; // the nose bloom, the flare, the glow ahead, the ribbons and the gates come in with the tunnel (drawTunnel multiplies by them); the streaks are the stars and run from the start
    Hyper.prototype.drawTunnel.call(this, f.t, dt, f.speed, 0.12 + 0.88 * f.speed); // Long Haul's tunnel: the streaks, the ribbons, the gates, the ship's flames and lights
    const px = r => Math.max(0.001, r * 2 / 800);
    this.earth.setPosition(W * f.earth.x, H * f.earth.y).setScale(px(E.radius) * f.earth.scale).setAlpha(f.earth.alpha);
    this.sun.setPosition(W * f.sun.x, H * f.sun.y).setScale(S.size / 128 * f.sun.scale).setAlpha(f.sun.alpha);
    this.star.setPosition(W * f.star.x, H * f.star.y).setScale(px(T.radius) * f.star.scale).setAlpha(0.5 * f.star.alpha);
    this.core.setPosition(W * f.star.x, H * f.star.y).setScale(T.radius * 4.4 / 128 * f.star.scale).setAlpha(f.star.alpha);
    this.starGlow.setPosition(W * f.star.x, H * f.star.y).setScale(T.glow / 128 * f.star.glow).setAlpha(0.8 * f.star.alpha);
    K.companions.forEach((c, i) => this.comp[i].setPosition(W * (f.star.x + c.dx), H * (f.star.y + c.dy)).setScale(c.size / 128 * f.star.glow).setAlpha(f.star.alpha));
    this.white.setAlpha(f.flash);
    // the words (and the ship's voice, once each) and the sounds (once each)
    K.lines.forEach((l, i) => { if (f.t >= l.at && !this.said[i]) { this.said[i] = true; if (typeof shipcompSay === 'function') shipcompSay(uiText(l.key, this.vars)); } });
    if (f.line >= 0) { this.words.setText(uiText(K.lines[f.line].key, this.vars)).setAlpha(f.lineAlpha); this.band.setAlpha(0.6 * f.lineAlpha); } else { this.words.setAlpha(0); this.band.setAlpha(0); }
    K.cues.forEach((c, i) => { if (f.t >= c.at && !this.cued[i]) { this.cued[i] = true; if (!HYPER_QUIET && typeof sfx === 'function') sfx(c.sfx); } });
  }
  finish() { // the level begins under the white: Campaign comes back with its own data and warped: true (it then fades in from white, not from black)
    if (this.went) return; this.went = true;
    this.scene.start('Campaign', Object.assign({}, this.d, { warped: true }));
  }
}
