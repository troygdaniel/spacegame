// ---------- The cruiser's other Long Haul flight effects: spark dots, turn puffs, braking jets, damage smoke, the engine glow, the velocity line, boost star streaks (card space-game-cruiser-all-long-haul-effects; Troy, 26 Nov 2026: "cranked and as crazy as the regular game, with all the same effects") ----------
// src/campfeel.js (card space-game-cruiser-long-haul-feel) gave the cruiser the Long Haul ship's ribbons, layered flames and soft camera. This file brings the rest of what the Long Haul ship shows in flight, for the CRUISER only and in the flat cut
// (pale blue and white, ADD blend for light; never gold, amber or pink: colour meanings hold). The list, read from src/space.js, src/feel.js, src/boost.js, src/title.js and src/hud.js, is on the card. NEW Campaign functions only: the Long Haul's files are
// read for the idea and never changed. Pictures only: the cruiser's sim (campCarrier) is read (position, heading, velocity, the inputs, hull) and never written. Behind CAMP.flags.feel and ?feel=0 like the rest of the feel (src/campfeel.js campFeelOn).
//   DOTS     bright pale-blue sparks left behind each engine, strung along the ribbon (space.js: the 'trail' emitter, 2 a frame and 3 on boost, 380 ms, ADD): campFxEmitDots
//   PUFFS    the thrusters at work (feel.js feelBurn): small soft puffs at the nose and the tail while the cruiser turns, two jets forward when it brakes (amber there, pale blue here), and the hull's smoke from an engine under 60 percent (ships.js): campFxEmitPuffs
//   GLOW     the engine that builds (feelBurn: slower on the heavy ship): a soft disc at each nozzle that rises with the burn: campFxBurn
//   LINE     a long faint line ahead of the ship with a dot at its end, 0.35 s of travel (feel.js feelSpace): campFxVelLine
//   STREAKS  while boosting (and on the map's Fast burn) the screen is crossed by faint lines sliding against the flight, stronger with speed (title.js installLookFx, 46 lines): campFxStreaksStep
// THE SHIP HE FLIES: the cruiser, or the fighter whose stick he holds (card space-game-fly-fighter-l2: campFeelShip, campFeelInput, campFeelLook in src/campfeel.js): nothing here is the cruiser's by name.
//   PUNCH    a launch punch: the view starts a little closer and eases out (feel.js feelLaunch: 1.6 to 1 in 900 ms; here 1.3, in the camera's base zoom with the boost's): campFxPunchK
// The state is one object (campFxNew), the step pure (campFxStep: tests/campfeelfx.mjs flies it in plain Node, from the clock, no Math.random); campFxDraw puts it on three Graphics: the light (ADD), the soft puffs (normal blend, under the
// cruiser) and the streaks (screen space, behind the world: the bg camera of src/camzoom.js, like the Long Haul's).
const CAMPFX = {
  dots: { life: 520, rate: 30, boostRate: 48, speed: [4, 20], r: 0.012, minPx: 1, cap: 70, color: 0x6fd6ff, hot: 0xb8ecff, a: 0.85, back: 0.04 }, // life ms (380 in the Long Haul, the ribbon's 600 here); rate: dots a second for each engine at full thrust, boostRate on boost; speed: world px/s they drift off in a random direction (the Long Haul's 20 to 70 for a smaller ship); r: the first radius as a share of the cruiser's length, shrinking to nothing; minPx: never smaller than this on the screen; back: how far behind the nozzle they start, as a share of the length
  puff: { minPx: 1, life: 380, every: 50, turnMin: 0.3, turnFull: 2.4, out: 70, r: 0.02, grow: 1.2, cap: 60, color: 0xdff6ff, a: 0.42, nose: 0.46, tail: 0.5, side: 0.07, brakeMin: 45, brakeFull: 450, brakeJet: 140 }, // minPx: never smaller than this on the screen (a fighter's puffs at its own size are under a pixel); every: ms between two puffs (feelBurn's puffEvery 50); turnMin and turnFull: rad/s under which a turn shows nothing and over which it is a full puff (BURN.turnMin 0.3, turnFull 2.4); out: px/s the puffs leave sideways; r: a puff's radius as a share of the length, growing to 1 + grow times; nose and tail: where the turn puffs are, along the ship from the middle; brakeMin, brakeFull: px/s of speed under which there is nothing to brake and at which the jets are full; brakeJet: px/s the jets go forward
  smoke: { hull: 0.6, heavy: 0.3, rate: 0.12, heavyRate: 0.5, life: 800, r: 0.035, grow: 1.6, color: 0x9fb3c8, a: 0.4, rise: 12 }, // the damage smoke from an engine under 60 percent hull (ships.js): a chance each frame (0.12, and 0.5 under 30 percent), a soft grey-blue puff that grows and fades
  glow: { rise: 850, fall: 200, r: 0.17, a: 0.3, color: 0x6fd6ff, hot: 0xcfe6ff },   // the engine that builds from nothing to full in 850 ms (the heavy ship's, BURN.rise.heavy) and drops in 200; the disc's radius as a share of the length, and its opacity at full burn
  vel: { s: 0.35, min: 30, w: 1.5, a: 0.45, dot: 2.5, dotA: 0.75, color: 0x6fd6ff },  // the line: 0.35 s of travel ahead, over 30 px/s, 1.5 px wide on the screen, the dot 2.5 px at its end (feelSpace)
  streak: { n: 46, w: 1.3, a: 0.26, len: [30, 90], slide: 4, on: 0.6, rate: 7, color: 0x9fe9ff, depth: -8 }, // 46 lines (installLookFx), 1.5 px wide, opacity 0.35 at full strength, a length of 30 + 90 times the line's own factor (0.5 to 1.5), sliding against the flight at `slide` times the cruiser's speed on the screen, shown from `on` of the boost's top speed up; rate: how fast the strength eases (per second)
  edge: { w: 2, a: 0.35, inset: [20, 18], color: 0x6fd6ff },                          // the two thin speed lines at the screen's edges while boosting (BRIEF 7, decision 10; card space-game-b7-torpedo-boost-beat): 2 px, 0.35 at full strength (the streaks' own strength k), the pale blue of the cruiser's glow, inset 20 and 18 px from the border
  punch: { zoom: 1.3, ms: 900 },                                                      // the launch punch: 1.3 times closer, eased out over 900 ms (feelLaunch: 1.6 and 900)
  depth: { light: 4.45, puff: 4.2 }
};

// ---- the state and its random numbers (pure) ----
const campFxNew = () => ({ seed: 12345, dots: [], puffs: [], acc: [0, 0], puffAt: 0, rotPrev: null, turn: 0, burn: 0, k: 0, streaks: null, t: 0 });
function campFxRnd(F) { F.seed = (F.seed * 1664525 + 1013904223) >>> 0; return F.seed / 4294967296; } // an LCG: 0 to 1, the same every run for the same frames (the Long Haul uses Math.random)
const campFxClamp = (v, a, b) => v < a ? a : v > b ? b : v;
// a particle into a ring of at most `cap`: the oldest goes when it is full (no object is made once the ring is full)
function campFxPush(list, cap, p) { if (list.length < cap) list.push(p); else { const o = list.shift(); Object.assign(o, p); list.push(o); } return p; }

// the dots: emit for one frame (dt ms) from each nozzle (the places noz: [{ x, y }]); th the thrust 0 to 1, b the boost 0 to 1, rot the heading, dw the cruiser's drawn length, t the clock in ms
function campFxEmitDots(F, noz, rot, th, b, dw, t, dt) {
  const K = CAMPFX.dots, c = Math.cos(rot), s = Math.sin(rot); if (!(th > 0.04) || !(dw > 0)) return 0;
  const rate = (K.rate + (K.boostRate - K.rate) * campFxClamp(b, 0, 1)) * campFxClamp(th, 0, 1); let n = 0;
  noz.forEach((p, i) => {
    F.acc[i] = (F.acc[i] || 0) + rate * dt / 1000;
    while (F.acc[i] >= 1) {
      F.acc[i] -= 1; const a = campFxRnd(F) * Math.PI * 2, v = K.speed[0] + (K.speed[1] - K.speed[0]) * campFxRnd(F), back = campFxRnd(F) * dt / 1000; // (spread inside the frame, so a dot does not stand where the last one did)
      campFxPush(F.dots, K.cap, { x: p.x - c * dw * K.back + Math.cos(a) * 0 - c * back * 60, y: p.y - s * dw * K.back - s * back * 60, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t0: t, r0: dw * K.r, b: campFxClamp(b, 0, 1) }); n++;
    }
  });
  return n;
}
// the dots as they are at clock t: [{ x, y, r, a, color }] (the screen's least radius is zoom z); the old ones are dropped from the ring
function campFxDotsAt(F, t, z) {
  const K = CAMPFX.dots, out = [], zz = z > 0 ? z : 1;
  for (let i = F.dots.length - 1; i >= 0; i--) { if (t - F.dots[i].t0 > K.life) F.dots.splice(i, 1); }
  F.dots.forEach(d => { const age = t - d.t0, p = age / K.life; if (!(p >= 0 && p < 1)) return; out.push({ x: d.x + d.vx * age / 1000, y: d.y + d.vy * age / 1000, r: Math.max(d.r0 * (1 - p), K.minPx / zz * (1 - p)), a: K.a * (1 - p), color: campFxMix(K.color, K.hot, d.b) }); });
  return out;
}
const campFxMix = (a, b, k) => typeof campFeelMix === 'function' ? campFeelMix(a, b, k) : a; // the pale blue part of the way to the white (src/campfeel.js)

// the puffs: the turn's, the brake's and the hull's smoke, for one frame. u: { x, y, rot, vx, vy, hp, maxHp }; inp: { turn, brake }; the turn rate is read from the heading itself, as feelBurn reads it (nothing asks who is flying)
// z the zoom and sk the ship's own size multiplier (campFeelLook's wid: 1 for the cruiser) are optional: with them a puff is never under CAMPFX.puff.minPx on the screen and a small ship's are bigger
function campFxEmitPuffs(F, u, inp, dw, t, dt, z, sk) {
  const K = CAMPFX.puff, S = CAMPFX.smoke, rot = u.rot || 0, c = Math.cos(rot), s = Math.sin(rot), kk = sk > 0 ? sk : 1, flo = z > 0 ? K.minPx / z : 0; if (!(dw > 0) || !(dt > 0) || dt > 250) { F.rotPrev = rot; return 0; } // a frame longer than 250 ms is a hitch, not a manoeuvre
  let d = F.rotPrev === null ? 0 : Math.atan2(Math.sin(rot - F.rotPrev), Math.cos(rot - F.rotPrev)); F.rotPrev = rot;
  F.turn += (d / (dt / 1000) - F.turn) * Math.min(1, dt / 70); // smoothed rad/s (feelBurn's turnEase 70 ms)
  const turn = campFxClamp((Math.abs(F.turn) - K.turnMin) / (K.turnFull - K.turnMin), 0, 1), side = F.turn >= 0 ? 1 : -1, sp = Math.hypot(u.vx || 0, u.vy || 0); let n = 0;
  if (turn > 0 && t >= F.puffAt) { // the nose and the tail push apart, so the ship swings: puffs go off the nose one way and off the tail the other
    F.puffAt = t + K.every; const r0 = Math.max(dw * K.r * kk * (1 + turn), flo), px = -s, py = c;
    campFxPush(F.puffs, K.cap, { x: u.x + c * dw * K.nose, y: u.y + s * dw * K.nose, vx: (u.vx || 0) * 0.6 + px * side * K.out, vy: (u.vy || 0) * 0.6 + py * side * K.out, t0: t, r0, life: K.life, a: K.a, color: K.color, grow: K.grow }); n++;
    campFxPush(F.puffs, K.cap, { x: u.x - c * dw * K.tail, y: u.y - s * dw * K.tail, vx: (u.vx || 0) * 0.6 - px * side * K.out, vy: (u.vy || 0) * 0.6 - py * side * K.out, t0: t, r0, life: K.life, a: K.a, color: K.color, grow: K.grow }); n++;
  }
  const brake = inp && inp.brake && sp > K.brakeMin ? campFxClamp((sp - K.brakeMin) / (K.brakeFull - K.brakeMin), 0, 1) : 0;
  if (brake > 0 && t >= (F.brakeAt || 0)) { // two jets forward, one off each side of the nose, against the way it is going
    F.brakeAt = t + K.every; const r0 = Math.max(dw * K.r * kk * (1 + brake), flo), px = -s, py = c;
    [-1, 1].forEach(sd => { campFxPush(F.puffs, K.cap, { x: u.x + c * dw * K.nose + px * sd * dw * K.side, y: u.y + s * dw * K.nose + py * sd * dw * K.side, vx: (u.vx || 0) + c * K.brakeJet, vy: (u.vy || 0) + s * K.brakeJet, t0: t, r0, life: K.life, a: K.a, color: K.color, grow: K.grow }); n++; });
  }
  const frac = u.maxHp > 0 ? u.hp / u.maxHp : 1;
  if (frac < S.hull && frac > 0) { // the smoke of a hurt ship, from an engine
    const heavy = frac < S.heavy, rate = (heavy ? S.heavyRate : S.rate) * Math.min(1, dt / 16.7);
    if (campFxRnd(F) < rate) { const sd = campFxRnd(F) < 0.5 ? 1 : -1; campFxPush(F.puffs, K.cap, { x: u.x - c * dw * 0.4 - s * sd * dw * 0.07, y: u.y - s * dw * 0.4 + c * sd * dw * 0.07, vx: (u.vx || 0) * 0.3 - c * S.rise, vy: (u.vy || 0) * 0.3 - s * S.rise, t0: t, r0: Math.max(dw * S.r * kk, flo), life: S.life, a: S.a, color: S.color, grow: S.grow }); n++; }
  }
  return n;
}
// the puffs at clock t: [{ x, y, r, a, color }] (they drift on their own velocity, grow and fade); the old ones are dropped
function campFxPuffsAt(F, t) {
  const out = []; for (let i = F.puffs.length - 1; i >= 0; i--) { if (t - F.puffs[i].t0 > F.puffs[i].life) F.puffs.splice(i, 1); }
  F.puffs.forEach(p => { const age = t - p.t0, k = age / p.life; if (!(k >= 0 && k < 1)) return; out.push({ x: p.x + p.vx * age / 1000, y: p.y + p.vy * age / 1000, r: p.r0 * (1 + p.grow * k), a: p.a * (1 - k), color: p.color }); });
  return out;
}

// the engine that builds (0 to 1): it rises to the target at 1 / rise per ms and falls at 1 / fall; th the thrust, b the boost
function campFxBurn(F, th, b, dt) {
  const K = CAMPFX.glow, target = th > 0.02 ? campFxClamp(0.6 + 0.4 * th + 0.2 * b, 0, 1) : 0;
  F.burn = target > F.burn ? Math.min(target, F.burn + dt / K.rise) : Math.max(target, F.burn - dt / K.fall);
  return F.burn;
}
const campFxGlow = (burn, dw, b) => burn > 0.02 ? { r: dw * CAMPFX.glow.r * (0.6 + 0.4 * burn), a: CAMPFX.glow.a * burn, color: campFxMix(CAMPFX.glow.color, CAMPFX.glow.hot, b) } : null;

// the long faint line ahead: from the cruiser along its velocity, 0.35 s of travel, with a dot at the end; zoom z keeps the width on the screen. null when it hardly moves
function campFxVelLine(u, z) {
  const K = CAMPFX.vel, sp = Math.hypot(u.vx || 0, u.vy || 0), zz = z > 0 ? z : 1; if (!(sp > K.min)) return null;
  return { x0: u.x, y0: u.y, x1: u.x + u.vx * K.s, y1: u.y + u.vy * K.s, w: K.w / zz, a: K.a, dot: { r: K.dot / zz, a: K.dotA }, color: K.color };
}

// the boost star streaks: lines in screen space, each with its own factor l (0.5 to 1.5), sliding against the flight. W and H the screen's size, dx and dy the flight's direction, sp the screen speed in px/s, dt ms, k the strength 0 to 1
function campFxStreaksNew(n) { const F = { seed: 777 }, out = []; for (let i = 0; i < n; i++) out.push({ x: campFxRnd(F) * 1280, y: campFxRnd(F) * 720, l: 0.5 + campFxRnd(F) }); return out; }
function campFxStreaksStep(list, W, H, dx, dy, sp, dt, k) {
  const K = CAMPFX.streak, out = [];
  list.forEach(p => {
    p.x -= dx * sp * dt / 1000 * p.l; p.y -= dy * sp * dt / 1000 * p.l;
    if (p.x < -40) p.x += W + 80; else if (p.x > W + 40) p.x -= W + 80;
    if (p.y < -40) p.y += H + 80; else if (p.y > H + 40) p.y -= H + 80;
    const len = (K.len[0] + K.len[1] * p.l) * k; out.push({ x0: p.x, y0: p.y, x1: p.x + dx * len, y1: p.y + dy * len, w: p.l > 1.2 ? K.w * 1.4 : K.w, a: K.a * (0.6 + 0.4 * p.l) * k });
  });
  return out;
}
// the strength the streaks aim at: the boost's own share (campFlameState.boost) once the cruiser is going fast enough (the share `on` of the boost's top speed), or 1 on the map's Fast burn; sp the cruiser's speed, top the boost's top speed
const campFxStreakTarget = (boost, fast, sp, top) => campFxClamp(Math.max(campFxClamp(boost, 0, 1), fast ? 1 : 0) * campFxClamp((sp / Math.max(1, top) - CAMPFX.streak.on) / (1 - CAMPFX.streak.on), 0, 1), 0, 1);

// the two thin pale-blue speed lines at the screen's edges while boosting (pure): the flight's more horizontal on the screen and they are the top and the bottom edge's, the more vertical and they are the left and the right's; each runs the
// length of its edge, inside the inset. W and H the screen (the bg camera's), (dx, dy) the unit direction of the flight; the answer is a list of two { x0, y0, x1, y1 } that the next call writes again (read it at once)
const CAMPFX_EDGE = [{ x0: 0, y0: 0, x1: 0, y1: 0 }, { x0: 0, y0: 0, x1: 0, y1: 0 }];
function campFxEdgeLines(W, H, dx, dy) {
  const K = CAMPFX.edge, o = CAMPFX_EDGE, horiz = Math.abs(dx) / (W > 0 ? W : 1) >= Math.abs(dy) / (H > 0 ? H : 1), a = K.inset[0], b = K.inset[1];
  if (horiz) { o[0].x0 = a; o[0].x1 = W - a; o[0].y0 = o[0].y1 = b; o[1].x0 = a; o[1].x1 = W - a; o[1].y0 = o[1].y1 = H - b; }
  else { o[0].y0 = a; o[0].y1 = H - a; o[0].x0 = o[0].x1 = b; o[1].y0 = a; o[1].y1 = H - a; o[1].x0 = o[1].x1 = W - b; }
  return o;
}

// the launch punch: the multiplier of the camera's base zoom p seconds... p is the share left (1 at the launch, 0 when done); a Sine ease out as the Long Haul's zoomTo
const campFxPunchK = p => 1 + (CAMPFX.punch.zoom - 1) * Math.sin(campFxClamp(p, 0, 1) * Math.PI / 2);

// ---- drawing (Phaser) ----
// the three Graphics of the cruiser's effects, made once per scene start (in the ship look's state S: S.fxG light, S.fxP puffs, S.fxS streaks)
function campFxGraphics(scene, S) {
  if (!S.fxG) S.fxG = scene.add.graphics().setDepth(CAMPFX.depth.light).setBlendMode(Phaser.BlendModes.ADD);
  if (!S.fxP) S.fxP = scene.add.graphics().setDepth(CAMPFX.depth.puff);
  if (!S.fxS) S.fxS = scene.add.graphics().setScrollFactor(0).setDepth(CAMPFX.streak.depth).setBlendMode(Phaser.BlendModes.ADD);
  return S;
}
// once a frame, from campFeelDraw (src/campfeel.js) after the ribbons and the flames: noz the nozzles, f the boost's flame state, dw the drawn length, z the zoom, t the clock in ms, dt the frame in ms, C the sim
function campFxDraw(scene, S, u, noz, f, dw, z, t, dt, C, look) {
  campFxGraphics(scene, S); const F = S.fxs || (S.fxs = campFxNew()), g = S.fxG, p = S.fxP, st = S.fxS, inp = typeof campFeelInput === 'function' ? campFeelInput(C) : C.input || {}, map = !!scene.mp, sp = Math.hypot(u.vx || 0, u.vy || 0), K = CAMPFX; // inp: the stick of the ship he flies (the fighter's while he holds it)
  g.setVisible(!map); p.setVisible(!map); g.clear(); p.clear(); // (both are drawn again each frame: a Graphics that is not cleared keeps every frame it ever drew)
  campFxEmitDots(F, noz, u.rot || 0, f.th, f.boost, dw, t, dt); campFxEmitPuffs(F, { x: u.x, y: u.y, rot: u.rot, vx: u.vx, vy: u.vy, hp: u.hp, maxHp: u.maxHp }, inp, dw, t, dt, z, look && look.wid);
  const burn = campFxBurn(F, f.th, f.boost, dt), glow = campFxGlow(burn, dw, f.boost), vel = campFxVelLine(u, z);
  noz.forEach(n => { if (glow) { g.fillStyle(glow.color, glow.a); g.fillCircle(n.x, n.y, glow.r); } });
  campFxDotsAt(F, t, z).forEach(d => { g.fillStyle(d.color, d.a); g.fillCircle(d.x, d.y, d.r); });
  campFxPuffsAt(F, t).forEach(q => { p.fillStyle(q.color, q.a); p.fillCircle(q.x, q.y, q.r); });
  if (vel) { g.lineStyle(vel.w, vel.color, vel.a); g.lineBetween(vel.x0, vel.y0, vel.x1, vel.y1); g.fillStyle(vel.color, vel.dot.a); g.fillCircle(vel.x1, vel.y1, vel.dot.r); }
  // the streaks: strength eased to its target, drawn in screen space behind the world
  const top = typeof campFeelTop === 'function' ? campFeelTop(C, u) : 0, fast = !C.cockpit && !!(C.nav && C.nav.on && C.nav.fast); // (the map's Fast burn is the cruiser's: with a fighter flown it is not his speed)
  F.k += (campFxStreakTarget(f.boost, fast, sp, top) - F.k) * (1 - Math.exp(-dt / 1000 * K.streak.rate)); if (F.k < 0.002) F.k = 0;
  st.clear(); st.setVisible(!map && F.k > 0.02);
  if (F.k > 0.02 && sp > 1) {
    const cam = scene._cz && scene._cz.bg ? scene._cz.bg : scene.cameras.main, W2 = cam.width || 1280, H2 = cam.height || 720; if (!F.streaks) F.streaks = campFxStreaksNew(K.streak.n);
    campFxStreaksStep(F.streaks, W2, H2, u.vx / sp, u.vy / sp, sp * K.streak.slide * Math.max(z, 0.3), dt, F.k).forEach(l => { st.lineStyle(l.w, K.streak.color, l.a); st.lineBetween(l.x0, l.y0, l.x1, l.y1); });
    campFxEdgeLines(W2, H2, u.vx / sp, u.vy / sp).forEach(l => { st.lineStyle(K.edge.w, K.edge.color, K.edge.a * F.k); st.lineBetween(l.x0, l.y0, l.x1, l.y1); }); // the two thin lines at the edges (BRIEF 7): they come and go with the streaks' own strength
  }
}
function campFxHide(S) { ['fxG', 'fxP', 'fxS'].forEach(k => { if (S && S[k]) S[k].setVisible(false); }); if (S && S.fxs) { S.fxs.dots.length = 0; S.fxs.puffs.length = 0; S.fxs.k = 0; S.fxs.rotPrev = null; } }
