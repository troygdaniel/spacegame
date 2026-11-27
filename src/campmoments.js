// ---------- The moments of a fight: the hit, the kill and the wave that arrives (BRIEF 7, decision 8; card space-game-b7-hit-kill-wave; the tiles are docs/pace-and-polish.html, which is right where this file differs) ----------
// Troy said yes to all fifteen decisions of the cloud session's brief 7 (docs/pace-and-polish.html). This file is the first three of its seven moments; the torpedo, the boost and the win and loss beat are the next card
// (space-game-b7-torpedo-boost-beat) and use the same pool and the same camera offset. Everything here is the PICTURE: no hit circle, range, speed, rule or number of the sim is read or written (the sim's events carry a few more
// fields for it: `hit` has by, side and a; `boom` has team, fac and by; a new `wave` event says a wave came out of the dark, src/campaign.js). Drawn only while the new ship look is on (slookOn(): CAMP.flags.shiplook,
// ?shiplook=0 is today's picture) and, for the wave, while the page HUD is up (the edge glow, the chevrons and the sliding pill are its elements, src/camppagehud.js).
//   A HIT      the ship hit flashes white for two frames (34 ms), three sparks fly off along the shot in the colour of the side that fired (your mint, hostile pink), a bright notch drops off the end of its hull arc and fades
//              (src/shiplookmarks.js asks campMomentsNotch). Three pooled sprites a hit, at most CAMPMOM.spark.cap (30) on the screen, each alive 0.2 s. A hit the cruiser's shield took keeps the shield's arc (src/campshieldhit.js)
//              and draws no sparks; a hit that got through to the cruiser's hull keeps its red blink (the scene's flash) and has the sparks and the notch.
//   A KILL     one white frame (the ship's own picture, filled white, 40 ms), six shards in the ship's colour, a fast thin ring, a 2 px nudge of the view toward it (a camera follow offset: the one number, campMomentsOffset),
//              and the ring of the pilot whose shot it was pulses in the page HUD (s.momPulse, read by the model). One pooled record of eight sprites a kill for 0.6 s, CAMPMOM.kill.cap records at most (the oldest is reused). It
//              replaces the ship look's kill (slookKill) for ships; a missile's blast (mboom) keeps that one.
//   A WAVE     the edge of the screen it comes from glows pink for a third of a second, three chevrons run inward once, and the hostiles' pill slides in (all page elements, campPageHudWave, CSS keyframes: nothing while no wave
//              comes). campMomentsEdge(sx, sy, W, H) says which edge and how far along it.
// Reduced motion (the page's own rule, prefers-reduced-motion): nothing moves. The flash, the notch and the glow stay (a still change of colour, no travel); the sparks, the shards, the ring's growth, the nudge, the chevrons and
// the slide are not drawn. Sizes are in screen px (as the ship look's marks are): they read at every zoom.
//   campMomentsOn()                  is the picture on now: the ship look is on
//   campMomentsStill()               does the player want no motion (prefers-reduced-motion: reduce)
//   campMomentsSide(e)               the side a dead ship was drawn as, from the boom event's team and fac and its kind: 'friend', 'protect', 'neutral', 'foe' or 'alien'
//   campMomentsHit(s, e)             the scene's 'hit' handler, for a hit the shield did not take whole (src/campshieldhit.js campShieldHitSkip): the flash, the sparks, the notch; true when drawn (the scene's puff is left out)
//   campMomentsKill(s, e)            the scene's 'boom' handler: true when the new kill is drawn (false: the scene draws the ship look's or the old puffs)
//   campMomentsWave(s, e)            the scene's 'wave' handler: asks the page HUD for the glow and the slide; true when it did
//   campMomentsFrame(s)              once a frame, after the ships' sprites are in place: the sparks, the kills, the flashes, the view's nudge
//   campMomentsNotch(g, s, u, R, w, f)   the hull arc's notch of a ship hit a moment ago, on the arc's Graphics (src/shiplookmarks.js slookArcDraw)
//   campMomentsOffset(s)             the camera's follow offset in world px now: the nudge plus s.camLead (the view's lead, which another card sets), in the sign Phaser takes
const CAMPMOM = {
  flash: 34,                                   // ms the hit's white flash holds: two frames at 60 a second
  spark: { n: 3, life: 200, cap: 30, w: 8, h: 3, out: 24, spread: 0.55, depth: 7.2, key: 'mom-spark' }, // three a hit, each 0.2 s; at most 30 up; they fly `out` screen px along the shot's way back, spread by `spread` rad
  notch: { life: 450, span: 0.07, w: 1.8 },    // the hull arc's notch: ms, the share of the turn it covers (the part the hull just lost), and how much thicker than the arc it is
  kill: { ms: 600, cap: 6, flashMs: 40, shards: 6, shardOut: 46, ring: [10, 80], ringW: 2, depth: 7.4, keys: { shard: 'mom-shard', ring: 'mom-ring', disc: 'mom-disc' }, big: 2 }, // 0.6 s; records at once; the white frame; six shards out `shardOut` px; the ring from 10 to 80 px; a big ship (the cruiser, the mothership) is `big` times larger
  nudge: { px: 2, gain: 2, ms: 180 },          // the view moves 2 px toward the kill and settles in 0.18 s; the follow's own lag (0.12) takes about half of an offset this short, so the offset is `gain` times the px
  pulse: 450,                                  // ms a pilot's ring in the HUD stays bright after his kill
  wave: { glow: 330, chev: 3, run: 320, step: 80, slide: 250, hold: 2500 }, // ms the edge glows; three chevrons, each running inward `run` ms, `step` ms apart; the pill slides in over `slide` ms, only for `hold` ms after a wave came
  colors: { white: 0xffffff }
};

// ---- the pure rules ----
const campMomentsOn = () => typeof slookOn === 'function' && slookOn();
function campMomentsStill() { try { return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches === true; } catch (e) { return false; } }
function campMomentsSide(e) { // a dead ship's side: your cruiser and pilots 'friend', a freighter 'protect', a patrol or a miner 'neutral', the pirates 'foe', the aliens 'alien'
  if (!e) return 'neutral';
  if (e.team === 'earth') return e.kind === 'freighter' ? 'protect' : 'friend';
  if (e.team === 'neutral') return 'neutral';
  if (e.team === 'alien') return e.fac === 'pirate' ? 'foe' : 'alien';
  return 'neutral';
}
const campMomentsInt = hex => parseInt(String(hex).replace('#', ''), 16) || 0;
function campMomentsColor(side) { return campMomentsInt(typeof SLOOK === 'object' && SLOOK.C ? SLOOK.C[side === 'friend' ? 'friend' : side] || SLOOK.C.neutral : '#9fb3c8'); } // the ship's colour: the look table's
function campMomentsFireColor(side) { return campMomentsInt(typeof SLOOK === 'object' && SLOOK.C ? (side === 'own' ? SLOOK.C.own : SLOOK.C.foe) : side === 'own' ? '#7df0c0' : '#ff6fa8'); } // the firing side's: your mint, hostile fire pink
// where on the screen's border a wave comes from: the point (sx, sy) on a W by H screen (the group's place, may be far outside it) is seen from the middle; the edge the line crosses and how far along that edge (0 to 1: left to
// right on the top and bottom, top to bottom on the sides); null for a wave seen from exactly the middle
function campMomentsEdge(sx, sy, W_, H_) {
  const dx = sx - W_ / 2, dy = sy - H_ / 2; if (!(W_ > 0) || !(H_ > 0) || (!dx && !dy)) return null;
  const side = Math.abs(dx) / W_ >= Math.abs(dy) / H_;
  if (side) { const y = H_ / 2 + dy * (W_ / 2) / Math.abs(dx); return { edge: dx > 0 ? 'r' : 'l', p: Math.max(0.08, Math.min(0.92, y / H_)) }; }
  const x = W_ / 2 + dx * (H_ / 2) / Math.abs(dy); return { edge: dy > 0 ? 'b' : 't', p: Math.max(0.08, Math.min(0.92, x / W_)) };
}
// the nudge's size at an age (ms): up fast and back to nothing, a half sine; 0 outside its time
const campMomentsNudgeAt = age => age > 0 && age < CAMPMOM.nudge.ms ? Math.sin(Math.PI * age / CAMPMOM.nudge.ms) : 0;
// the hull arc's notch: from the end of the arc (the hull share f) over the part just lost, as a pair of shares of the turn; null when it is over or the hull is full
function campMomentsNotchSpan(f, age) {
  const K = CAMPMOM.notch; if (!(age >= 0) || age >= K.life || !(f < 1)) return null;
  return { a0: Math.max(0, f), a1: Math.min(1, f + K.span), alpha: 1 - age / K.life };
}
// the pieces of a kill at an age (ms) in screen px from its centre, the sizes of the tile: { done, flash: bool, ring: { r, a }, shards: [{ x, y, rot, a }] }. `out` is a result to write into and give back (the scene asks every frame
// for every kill that is up and keeps one: nothing is allocated in the busiest fight); with none a new one is made (the tests)
function campMomentsKillAt(age, unit, out) {
  const K = CAMPMOM.kill, u = unit > 0 ? unit : 1, p = age / K.ms, o = out || { done: false, flash: false, ring: { r: 0, a: 0 }, shards: [] };
  if (!(p < 1)) { o.done = true; o.flash = false; o.ring.r = 0; o.ring.a = 0; o.shards.length = 0; return o; }
  const q = Math.max(0, p), e = 1 - Math.pow(1 - Math.min(1, q * 2.2), 3), eo = 1 - Math.pow(1 - q, 2);
  o.done = false; o.flash = age < K.flashMs; o.ring.r = (K.ring[0] + (K.ring[1] - K.ring[0]) * e) * u; o.ring.a = Math.max(0, 1 - Math.pow(q, 1.2)); o.shards.length = K.shards;
  for (let i = 0; i < K.shards; i++) { const a = i * Math.PI * 2 / K.shards + 0.4, d = K.shardOut * (0.7 + (i % 3) * 0.25) * eo * u, sh = o.shards[i] || (o.shards[i] = { x: 0, y: 0, rot: 0, a: 0 }); sh.x = Math.cos(a) * d; sh.y = Math.sin(a) * d; sh.rot = a + q * 3; sh.a = Math.max(0, 1 - q); }
  return o;
}
// a spark's place at an age: out along its way, fading ({ x, y, a, done }; `out` as above)
function campMomentsSparkAt(age, ang, unit, out) { const K = CAMPMOM.spark, q = Math.max(0, Math.min(1, age / K.life)), d = K.out * (1 - Math.pow(1 - q, 2)) * (unit > 0 ? unit : 1), o = out || {}; o.x = Math.cos(ang) * d; o.y = Math.sin(ang) * d; o.a = 1 - q; o.done = q >= 1; return o; }

// ---- the scene half ----
function campMomentsState(s) { const h = s && s.hud; if (!h) return null; return h.mom || (h.mom = { sparks: [], freeSparks: [], madeSparks: 0, kills: [], freeKills: [], madeKills: 0, tex: false, flash: {}, nudge: null }); } // (the scene's hud is new at each start: its sprites go with it)
function campMomentsTextures(s) { // made once, in code, white (tinted at use): the spark, the shard, the thin ring, the disc for a ship with no picture
  const S = campMomentsState(s); if (!S || S.tex || !s.textures || !s.make) return;
  const mk = (key, w, h, draw) => { if (s.textures.exists(key)) return; const g = s.make.graphics({ x: 0, y: 0, add: false }); draw(g); g.generateTexture(key, w, h); g.destroy(); }, K = CAMPMOM;
  mk(K.spark.key, K.spark.w, K.spark.h, g => { g.fillStyle(0xffffff, 0.35).fillRoundedRect(0, 0, K.spark.w, K.spark.h, 1.5); g.fillStyle(0xffffff, 1).fillRoundedRect(K.spark.w * 0.4, 0.5, K.spark.w * 0.6, K.spark.h - 1, 1); });
  mk(K.kill.keys.shard, 7, 3, g => g.fillStyle(0xffffff, 1).fillRect(0, 0, 7, 3));
  mk(K.kill.keys.ring, 132, 132, g => g.lineStyle(K.kill.ringW, 0xffffff, 1).strokeCircle(66, 66, 64));
  mk(K.kill.keys.disc, 32, 32, g => g.fillStyle(0xffffff, 1).fillCircle(16, 16, 15));
  S.tex = true;
}
const campMomentsUnit = s => { const z = s && s.cameras && s.cameras.main && s.cameras.main.zoom > 0 ? s.cameras.main.zoom : 1; return z < 1 ? 1 / z : 1; }; // world px for each screen px (as the ship look's kill has it): the sizes are the screen's when zoomed out
const campMomentsNow = s => s && s.camp ? s.camp.t : 0;
function campMomentsHit(s, e) {
  if (!campMomentsOn() || !s || !e || !s.add || !s.camp) return false;
  const S = campMomentsState(s); if (!S) return false;
  const C = s.camp, car = C.carrier, still = campMomentsStill();
  (s.momHitAt || (s.momHitAt = {}))[e.id] = C.t; // the notch on its hull arc
  if (!(car && e.id === car.id && e.hull)) S.flash[e.id] = C.t + CAMPMOM.flash; // the white frames (the cruiser's hull hit keeps its red blink)
  if (still) return true; // reduced motion: the white frames and the notch only, no sparks
  const K = CAMPMOM.spark, base = typeof e.a === 'number' && isFinite(e.a) ? e.a : (e.x * 7.31 + e.y * 3.17), col = campMomentsFireColor(e.side), z = campMomentsUnit(s);
  campMomentsTextures(s);
  for (let i = 0; i < K.n; i++) {
    let sp = S.freeSparks.pop();
    if (!sp) { if (S.madeSparks < K.cap) { S.madeSparks++; sp = { im: s.add.image(0, 0, K.key).setDepth(K.depth).setVisible(false), born: 0, x: 0, y: 0, ang: 0, unit: 1 }; } else { sp = S.sparks.shift(); if (!sp) break; } }
    sp.born = C.t; sp.x = e.x; sp.y = e.y; sp.ang = base + (i - (K.n - 1) / 2) * K.spread; sp.unit = z; sp.im.setTint(col); S.sparks.push(sp);
    campMomentsSparkPlace(sp, 0);
  }
  return true;
}
const CAMPMOM_SA = {}, CAMPMOM_KA = { done: false, flash: false, ring: { r: 0, a: 0 }, shards: [] }; // the results the frame writes into (one pair for every sprite: nothing is made per frame)
function campMomentsSparkPlace(sp, age) {
  const A = campMomentsSparkAt(age, sp.ang, sp.unit, CAMPMOM_SA); if (A.done) { sp.im.setVisible(false); return false; }
  sp.im.setPosition(sp.x + A.x, sp.y + A.y).setRotation(sp.ang).setScale(sp.unit).setAlpha(A.a).setVisible(true); return true;
}
function campMomentsKillAcquire(s, S) {
  if (S.freeKills.length) return S.freeKills.pop();
  const K = CAMPMOM.kill; if (S.madeKills < K.cap) {
    S.madeKills++; const im = (key, d) => s.add.image(0, 0, key).setDepth(K.depth + (d || 0)).setVisible(false);
    return { flash: im(K.keys.disc, 0.2), ring: im(K.keys.ring), shards: Array.from({ length: K.shards }, () => im(K.keys.shard)), born: 0, x: 0, y: 0, unit: 1, still: false, hasPic: false };
  }
  return S.kills.shift() || null;
}
function campMomentsKill(s, e) {
  if (!campMomentsOn() || !s || !e || !s.add || !s.camp || e.big || e.kind === 'carrier' || e.kind === 'mother') return false; // the cruiser and the mothership keep the big kill of the ship look (their end is a moment of its own)
  const S = campMomentsState(s); if (!S) return false; campMomentsTextures(s);
  const C = s.camp, K = CAMPMOM.kill, k = campMomentsKillAcquire(s, S); if (!k) return true;
  const side = campMomentsSide(e), col = campMomentsColor(side), still = campMomentsStill(), sp = s.sp && s.sp[e.id], z = campMomentsUnit(s);
  k.born = C.t; k.x = e.x; k.y = e.y; k.unit = z; k.still = still; S.kills.push(k);
  const key = sp && sp.texture && sp.texture.key && s.textures.exists(sp.texture.key) ? sp.texture.key : K.keys.disc;
  k.hasPic = key !== K.keys.disc; k.flash.setTexture(key); // the white frame: the ship's own picture filled white; a ship with none is a disc
  if (k.hasPic && typeof k.flash.setTintFill === 'function') k.flash.setTintFill(CAMPMOM.colors.white); else k.flash.setTint(CAMPMOM.colors.white);
  if (sp && k.hasPic) { k.flash.setPosition(sp.x, sp.y).setRotation(sp.rotation).setScale(sp.scaleX, sp.scaleY); } else k.flash.setPosition(e.x, e.y).setRotation(0).setScale(z * 0.9);
  k.shards.forEach(o => o.setTint(col)); k.ring.setTint(CAMPMOM.colors.white);
  k.ringDone = false;
  campMomentsKillPlace(k, 0);
  if (!still) { // the view's nudge toward the kill (a unit vector from the middle of the view; the size is the number of the frame)
    const cam = s.cameras && s.cameras.main, mid = cam && cam.midPoint, dx = mid ? e.x - mid.x : 0, dy = mid ? e.y - mid.y : 0, d = Math.hypot(dx, dy); // (the camera's own middle: the scroll is read in the files that own it, src/camzoom.js)
    if (d > 1) S.nudge = { x: dx / d, y: dy / d, t0: C.t };
  }
  if (e.by !== undefined && e.by !== null) { const m = s.momPulse || (s.momPulse = {}); m[e.by] = (typeof performance !== 'undefined' ? performance.now() : 0) + CAMPMOM.pulse; } // the pilot whose shot it was: his ring in the page HUD pulses (campPageModel reads it)
  return true;
}
function campMomentsKillPlace(k, age) { // the pooled sprites of one kill at its age; the last frame hides them
  const A = campMomentsKillAt(age, k.unit, CAMPMOM_KA);
  if (A.done) { k.flash.setVisible(false); k.ring.setVisible(false); k.shards.forEach(o => o.setVisible(false)); return false; }
  k.flash.setVisible(A.flash).setAlpha(1);
  if (k.still) { k.ring.setPosition(k.x, k.y).setScale(CAMPMOM.kill.ring[1] * 0.5 * k.unit / 64).setAlpha(A.ring.a * 0.8).setVisible(true); k.shards.forEach(o => o.setVisible(false)); return true; } // reduced motion: the ring stays where it is and fades
  k.ring.setPosition(k.x, k.y).setScale(A.ring.r / 64).setAlpha(A.ring.a).setVisible(true);
  k.shards.forEach((o, i) => { const p = A.shards[i]; o.setPosition(k.x + p.x, k.y + p.y).setRotation(p.rot).setScale(k.unit).setAlpha(p.a).setVisible(p.a > 0); });
  return true;
}
function campMomentsWave(s, e) {
  if (!s || !e || !s.pageHudOn || typeof campPageHudWave !== 'function' || typeof campPageHudWaveEdge !== 'function' || !s.camp) return false;
  const at = campPageHudWaveEdge(s, e.x, e.y); if (!at) return false; // (the page's own geometry, as its pills use it: src/camppagehud.js)
  s.momWaveAt = typeof performance !== 'undefined' ? performance.now() : 0; // the hostiles' pill slides in if it first shows within `hold` ms of this
  return campPageHudWave(s, at, campMomentsStill());
}
function campMomentsOffset(s) { // the follow offset now (world px, Phaser's sign: the camera aims at the ship minus it): the nudge (toward the kill, so the offset is against it) plus the lead another card sets
  const S = campMomentsState(s), lead = (s && s.camLead) || null, cam = s && s.cameras && s.cameras.main, z = cam && cam.zoom > 0 ? cam.zoom : 1; let x = 0, y = 0;
  if (S && S.nudge && s.camp) { const n = campMomentsNudgeAt(s.camp.t - S.nudge.t0), m = n * CAMPMOM.nudge.px * CAMPMOM.nudge.gain / z; x = -S.nudge.x * m; y = -S.nudge.y * m; }
  if (lead) { x -= lead.x || 0; y -= lead.y || 0; }
  return { x, y };
}
function campMomentsFrame(s) { // once a frame, after the ships' sprites are in place
  const S = s && s.hud && s.hud.mom; if (!S || !s.camp) return;
  const C = s.camp, t = C.t, on = campMomentsOn();
  for (let i = S.sparks.length - 1; i >= 0; i--) { const sp = S.sparks[i]; if (!on || !campMomentsSparkPlace(sp, t - sp.born)) { sp.im.setVisible(false); S.sparks.splice(i, 1); S.freeSparks.push(sp); } }
  for (let i = S.kills.length - 1; i >= 0; i--) { const k = S.kills[i]; if (!on || !campMomentsKillPlace(k, t - k.born)) { campMomentsKillPlace(k, Infinity); S.kills.splice(i, 1); S.freeKills.push(k); } }
  for (const id in S.flash) { const sp = s.sp && s.sp[id], until = S.flash[id]; // the white frames: filled white while they last, then the sprite's own look back (no list is made: nothing is allocated in a quiet frame)
    if (!sp) { delete S.flash[id]; continue; }
    if (on && t < until) { if (!sp._mf) { sp._mf = true; if (typeof sp.setTintFill === 'function') sp.setTintFill(CAMPMOM.colors.white); } }
    else { if (sp._mf) { sp._mf = false; if (typeof sp.clearTint === 'function') sp.clearTint(); } delete S.flash[id]; }
  }
  if (s.momHitAt) for (const id in s.momHitAt) if (t - s.momHitAt[id] >= CAMPMOM.notch.life) delete s.momHitAt[id]; // the notches that are over (a ship that died has no arc to ask)
  const cam = s.cameras && s.cameras.main;
  if (cam && typeof cam.setFollowOffset === 'function') {
    const live = !!S.nudge && t - S.nudge.t0 < CAMPMOM.nudge.ms;
    if (live) { const o = campMomentsOffset(s); cam.setFollowOffset(o.x, o.y); S.offsetSet = true; }
    else if (S.offsetSet) { const o = campMomentsOffset(s); cam.setFollowOffset(o.x, o.y); S.offsetSet = false; S.nudge = null; } // the nudge is over: the offset goes back to the lead's alone (nothing, today)
  }
}
function campMomentsNotch(g, s, u, R, w, f) { // on the hull arc's Graphics, the part the hull just lost: a short bright white run from the end of the arc that fades; true when drawn
  const t0 = s && s.momHitAt && u ? s.momHitAt[u.id] : undefined, C = s && s.camp; if (t0 === undefined || !C || !g) return false;
  const N = campMomentsNotchSpan(f, C.t - t0); if (!N) { if (C.t - t0 >= CAMPMOM.notch.life) delete s.momHitAt[u.id]; return false; }
  g.lineStyle(w * CAMPMOM.notch.w, 0xffffff, N.alpha);
  g.strokePoints(typeof slookArcSpan === 'function' ? slookArcSpan(u.x, u.y, R, N.a0, N.a1) : [], false, false);
  return true;
}
