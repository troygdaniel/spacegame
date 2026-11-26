// ---------- The new ship look, fire, trails, missile and kill (landing C of the ship look; card space-game-ship-look-c-fire-trails; the table is src/shiplook.js, the mock docs/ship-look-mock.html, direction 1) ----------
// Everything here is drawn only while the switch is on (slookOn(): CAMP.flags.shiplook, the N panel row, or ?shiplook=1); with it off every function answers "not me" and the scene draws what it always drew.
//   SHOTS     a short lit bolt with a fading tail (the mock's `shot`): your fire mint (SLOOK.C.own), hostile fire PINK whoever fires it (the pirates' amber is gone: amber only ever means a ship you protect), a neutral patrol's its
//             grey-blue. Three small textures baked once ('slook-shot-own', '-foe', '-neutral'); the scene's bullet loop asks slookShotKey(b) and keeps its own sizes (campZoomShotScale), beams and point-defence shots.
//   MISSILES  a white dart with a long fading tail (the mock's `missile`): slookRocket(scene, m, seen) draws one in place of the rectangle, the ember flame and the smoke puffs (no tween, no puff: one sprite and one tail).
//   TRAILS    every moving ship leaves ONE short tapering engine trail (the mock's thrust gradient): one stretched sprite a ship, from the ship's own velocity, no particles. slookTrailSpec(u, dw, side) is the rule (pure),
//             slookTrailFrame the drawing; the colour is the engine's glow: your side's blue, amber for a ship you protect, pink for the hostile, grey-blue for a neutral.
//   KILLS     a white ring, a faint pink ring, a bright core and five pink shards (the mock's `boom`), for a ship's end and a missile's blast (the 'boom', 'mboom' and 'tboom' events): slookKill(scene, x, y, size, r) takes one
//             of a few pooled records (eight sprites each, made once, reused), slookKillAt(age, unit) is the animation (pure). The rock breaks, the anomaly, the shield blink, a hit's spark and a fizzle keep their puffs (fxBoom
//             is shared with the Long Haul and is not touched).
//   GUNS      the gun reach ring, the mounts' dots, their barrels and the muzzle flash go from the HUD's gold to the friend blue (slookGunTone): gold is for goals and the ships you protect. The pirates' and the aliens' torpedo
//             rings, flames and lines go pink (slookTorpTone).
// The scene (src/campaignscene.js, src/camptorpedoscene.js) calls in one line each; slookFxInstall(scene) (create) hangs the frame on the scene's postupdate event, after the ships' sprites are in place. The objects live in
// scene.hud.slfx (a scene that starts again has a new hud: the old are destroyed with it). Only the picture changes: no hit circle, range, speed or rule is read or written here.
const SLOOKFX = {
  shot: { w: 38, h: 8, core: [14, 3.1, 10, 1.8], tail: [5, 14], tailA: 0.6, glow: [[12, 0.5, 14, 7, 3, 0.12], [13, 1.5, 12, 5, 2.5, 0.22]], key: { own: 'slook-shot-own', foe: 'slook-shot-foe', neutral: 'slook-shot-neutral' } }, // the bolt: its texture (centre at the middle: the bolt's core is 10 long and 1.8 thick, its tail 9 long behind it, the glow round it), the tail's alpha, and the keys
  missile: { len: 10, w: 14, h: 8, tail: 34, tailH: 3.2, tailA: 0.8, key: 'slook-missile', tailKey: 'slook-missile-tail', depth: 5 },     // the dart (the mock's outline at 10 px) and its tail (34 long, 1.6 each side at the head, white .8 fading to 0)
  trail: { min: 25, big: 40, short: 0.5, long: 0.9, head: 0.08, start: 0.44, alpha: 0.9, w: 64, h: 16, cols: 32, stop: 0.75, white: 0.75, mid: 0.45, key: 'slook-trail-', speedK: 0.4 }, // min: px/s under which a ship has no trail; a ship longer than `big` px has the short trail, the others the long one (the mock's tl); the head is `head` of the length each side, starting `start` behind the middle
  flame: { key: 'slook-flame', w: 96, h: 24, cols: 48, stop: 0.6, white: 0.95, mid: 0.6, engines: [[-0.5, 0.07], [-0.5, -0.07]], min: 0.04, thrust: 0.55, boost: 0.9, flare: 0.35, wid: 0.1, boostWid: 0.01, flareWid: 0.006, alpha: 0.95, depth: 4.4 }, // THE CRUISER'S ENGINE FLAMES (card space-game-cruiser-boost-flames; Troy, 26 Nov 2026): one stretched sprite for each of its two engines (engines: where each nozzle sits, in lengths of the hull from its middle: x along the nose, y to the side), white at the nozzle fading through the friend's pale blue to nothing (no gold, no amber): `thrust` lengths of the hull long at full thrust, `boost` more while boosting, `flare` more for the brief flare when thrust starts, and wider with each; under `min` lengths it is not drawn (the engines are off)
  kill: { ms: 460, r1: 15, r2: 22, core: 3.5, ring1: 0.9, ring2: 0.55, big: 3, blast: 1.6, cap: 12, depth: 7, from: 0.4, grow: 0.9, // the effect lasts `ms`; the rings are 15 and 22 px (the mock's, on the screen at the start zoom), grow from 0.4 to 1.3 times; a big kill (the cruiser, the mothership) is 3 times, a missile's blast 1.6
         shards: [[12, -9, 0.6], [-10, -13, 2.1], [-16, 6, 3.4], [7, 15, 4.6], [19, 5, 5.2]], shardOut: [0.35, 1.4], keys: { ring1: 'slook-ring-w', ring2: 'slook-ring-p', core: 'slook-core', shard: 'slook-shard' } }, // the five shards: where they end (the mock's offsets and turn), and how far out they fly from
  gun: { gold: 0xffd37a, hot: 0xffe9a0, blue: 0x6fd6ff, blueHot: 0xcfeeff },                                                  // the HUD's gold of the reach ring and the mounts (and the lighter gold of a shot's barrel and the muzzle flash), and the blue and the lighter blue they take
  torp: { gold: 0xffa040, red: 0xff4d6d }                                                                                     // the colours the torpedo scene gave the pirates' and the aliens' torpedo: both are hostile marks now, pink
};

// ---- shots ----
function slookShotSide(b) { // the side of a shot, from the sim's own fields: the Earth side's, a neutral's, the pirates', or the aliens' (a shot has no faction before the alien kind: the sim's `fac`)
  return !b ? 'neutral' : b.team === 'earth' ? 'friend' : b.team === 'neutral' ? 'neutral' : b.fac === 'pirate' ? 'foe' : 'alien';
}
function slookShotKey(b) { // the texture a shot takes while the switch is on, null with it off (the scene keeps its own then): your fire mint, hostile fire pink (a pirate's and an alien's alike), a neutral's grey-blue
  if (typeof slookOn !== 'function' || !slookOn()) return null;
  const s = slookShotSide(b), c = slookFireColor(s), K = SLOOKFX.shot.key;
  return c === SLOOK.C.own ? K.own : c === SLOOK.C.neutral ? K.neutral : K.foe;
}

// ---- engine trails ----
const slookTrailTone = side => side === 'friend' ? 'friend' : side === 'protect' ? 'protect' : side === 'neutral' ? 'neutral' : 'foe'; // the glow's colour family: the hostile and the aliens' engines are pink, a neutral's grey-blue
function slookTrailSpec(u, dw, side) { // the one trail of a ship that moves, or null: { key, x, y, rot, len, wid, alpha }; u: the unit (x, y, rot, vx, vy, vmax, kind), dw: the ship's drawn length in the world (its sprite's displayWidth)
  const T = SLOOKFX.trail; if (!u || !(u.hp > 0) || !(dw > 0)) return null;
  const k = SLOOK.K[u.kind]; if (k && k.still) return null; // a tower is still (the mock marks it): it has no engine trail, whatever its velocity says
  const sp = Math.hypot(u.vx || 0, u.vy || 0); if (!(sp >= T.min)) return null;
  const px = k && k.px > 0 ? k.px : T.big + 1, f = Math.min(1, T.speedK + (1 - T.speedK) * sp / Math.max(u.vmax || 0, sp)); // (a kind with no play size is a big ship)
  const len = dw * (px > T.big ? T.short : T.long) * f, c = Math.cos(u.rot || 0), s = Math.sin(u.rot || 0);
  return { key: T.key + slookTrailTone(side), x: u.x - c * dw * T.start, y: u.y - s * dw * T.start, rot: u.rot || 0, len, wid: dw * T.head * 2, alpha: T.alpha };
}

// the cruiser's two flames (pure): from the boost's own state (campFlameState: the thrust, the boost, the flare), or [] when the engines are off
function slookFlameSpecs(u, dw, f) {
  const F = SLOOKFX.flame; if (!u || !(u.hp > 0) || !(dw > 0) || !f) return [];
  const cl = v => Math.max(0, Math.min(1, +v || 0)), th = cl(f.th), b = cl(f.boost), fl = cl(f.flare), len = dw * (th * F.thrust + b * F.boost + fl * F.flare); if (!(len >= dw * F.min)) return [];
  const wid = dw * (F.wid + b * F.boostWid + fl * F.flareWid), c = Math.cos(u.rot || 0), s = Math.sin(u.rot || 0);
  return F.engines.map(e => ({ key: F.key, x: u.x + c * e[0] * dw - s * e[1] * dw, y: u.y + s * e[0] * dw + c * e[1] * dw, rot: u.rot || 0, len, wid, alpha: F.alpha }));
}

// ---- the kill ----
const slookEase = p => 1 - (1 - p) * (1 - p);
function slookKillAt(age, unit) { // the effect `age` ms after it began, at `unit` world px for each of the mock's px: { done, ring1: { r, a }, ring2: { r, a }, core: { r, a }, shards: [{ x, y, rot, a }] } (r and the places in world px from the centre)
  const K = SLOOKFX.kill, p = age / K.ms, u = unit > 0 ? unit : 1; if (!(p < 1)) return { done: true, ring1: { r: 0, a: 0 }, ring2: { r: 0, a: 0 }, core: { r: 0, a: 0 }, shards: [] };
  const q = Math.max(0, p), e1 = slookEase(q), e2 = slookEase(Math.max(0, q - 0.1) / 0.9), grow = (e, r) => r * u * (K.from + K.grow * e), fade = (a, x) => a * Math.max(0, 1 - Math.pow(x, 1.5));
  return {
    done: false,
    ring1: { r: grow(e1, K.r1), a: fade(K.ring1, q) }, ring2: { r: grow(e2, K.r2), a: fade(K.ring2, q) }, core: { r: K.core * u * (1 + 0.8 * e1), a: Math.max(0, 1 - q * 2.2) },
    shards: K.shards.map(s => { const o = K.shardOut[0] + (K.shardOut[1] - K.shardOut[0]) * e1; return { x: s[0] * u * o, y: s[1] * u * o, rot: s[2] + q * 1.2, a: Math.max(0, 1 - q * q) }; })
  };
}
const slookKillUnit = (S, size, r) => Math.max((S > 0 ? S : 1) * (size > 0 ? size : 1), r > 0 ? r * 0.85 / (SLOOKFX.kill.r1 * (SLOOKFX.kill.from + SLOOKFX.kill.grow)) : 0); // world px for each of the mock's px: the screen's (1 over the zoom when zoomed out) times the size, or the blast's own radius if that is bigger

// ---- the guns' and torpedoes' colours (the amber fixes) ----
function slookGunTone(c) { // the reach ring's, the mounts' and the muzzle flash's colour: the friend blue while the switch is on (gold is for goals and the ships you protect), else what it was
  if (typeof slookOn !== 'function' || !slookOn()) return c;
  return c === SLOOKFX.gun.gold ? SLOOKFX.gun.blue : c === SLOOKFX.gun.hot ? SLOOKFX.gun.blueHot : c;
}
function slookTorpTone(c) { // a torpedo's ring, flame and line (the pirates' amber, the aliens' red): pink while the switch is on, every hostile mark being one colour
  if (typeof slookOn !== 'function' || !slookOn()) return c;
  return c === SLOOKFX.torp.gold || c === SLOOKFX.torp.red ? slookInt(SLOOK.C.foe) : c;
}

// ---- the scene half ----
function slookFxState(scene) { const h = scene && scene.hud; if (!h) return null; return h.slfx || (h.slfx = { trails: {}, kills: [], free: [], made: 0, tex: false }); } // (the scene's hud is new at each start: its sprites go with it)
function slookFxTextures(scene) { // made once, in code: the three bolts, the dart and its tail, the four trails, the two rings, the core and the shard
  const S = slookFxState(scene); if (!S || S.tex || !scene.textures || !scene.make) return;
  const mk = (key, w, h, draw) => { if (scene.textures.exists(key)) return; const g = scene.make.graphics({ x: 0, y: 0, add: false }); draw(g); g.generateTexture(key, w, h); g.destroy(); };
  const st = SLOOKFX.shot, ms = SLOOKFX.missile, tr = SLOOKFX.trail, kl = SLOOKFX.kill, own = slookInt(SLOOK.C.own), foe = slookInt(SLOOK.C.foe), neu = slookInt(SLOOK.C.neutral);
  [[st.key.own, own], [st.key.foe, foe], [st.key.neutral, neu]].forEach(([key, col]) => mk(key, st.w, st.h, g => {
    for (let x = st.tail[0]; x < st.tail[1]; x++) g.fillStyle(col, st.tailA * (x - st.tail[0] + 1) / (st.tail[1] - st.tail[0])).fillRect(x, st.h / 2 - 0.5, 1, 1);
    st.glow.forEach(r => g.fillStyle(col, r[5]).fillRoundedRect(r[0], r[1], r[2], r[3], r[4]));
    g.fillStyle(0xffffff, 1).fillRoundedRect(st.core[0], st.core[1], st.core[2], st.core[3], st.core[3] / 2);
  }));
  mk(ms.key, ms.w, ms.h, g => { const c = ms.w / 2, m = ms.h / 2, L = ms.len; g.fillStyle(0xffffff, 0.18).fillCircle(c, m, 5); g.fillStyle(0xffffff, 1); g.fillTriangle(c + L * 0.5, m, c - L * 0.5, m + L * 0.3, c - L * 0.3, m); g.fillTriangle(c + L * 0.5, m, c - L * 0.3, m, c - L * 0.5, m - L * 0.3); });
  mk(ms.tailKey, ms.tail, 4, g => { const n = ms.tail / 2; for (let i = 0; i < n; i++) { const t = (i + 1) / n; g.fillStyle(0xffffff, ms.tailA * t).fillRect(i * 2, 2 - ms.tailH / 2 * t, 2, ms.tailH * t); } });
  [['friend', slookInt(SLOOK.C.friendHi)], ['protect', slookInt(SLOOK.C.protect)], ['foe', foe], ['neutral', neu]].forEach(([tone, col]) => mk(tr.key + tone, tr.w, tr.h, g => {
    for (let i = 0; i < tr.cols; i++) {
      const t = (i + 1) / tr.cols, wide = tr.w / tr.cols, h = tr.h * t, y = (tr.h - h) / 2;
      let c = col, a; if (t >= tr.stop) { const k = (1 - t) / (1 - tr.stop); a = tr.white + (tr.mid - tr.white) * k; c = slookInt(slookMix('#ffffff', '#' + col.toString(16).padStart(6, '0'), k)); } else a = tr.mid * t / tr.stop; // the mock's gradient: white .75 at the engine, the glow's colour .45 at a quarter of the way, nothing at the tip
      g.fillStyle(c, a).fillRect(i * wide, y, wide, h);
    }
  }));
  const fm = SLOOKFX.flame; mk(fm.key, fm.w, fm.h, g => { // the flame: white at the nozzle (the right end), the friend's pale blue along it, nothing at the tail
    for (let i = 0; i < fm.cols; i++) {
      const t = (i + 1) / fm.cols, wide = fm.w / fm.cols, h = fm.h * (0.25 + 0.75 * t), y = (fm.h - h) / 2;
      let c = slookInt(SLOOK.C.friendHi), a; if (t >= fm.stop) { const k = (1 - t) / (1 - fm.stop); a = fm.white + (fm.mid - fm.white) * k; c = slookInt(slookMix('#ffffff', SLOOK.C.friendHi, k)); } else a = fm.mid * t / fm.stop;
      g.fillStyle(c, a).fillRect(i * wide, y, wide, h);
    }
  });
  mk(kl.keys.ring1, 64, 64, g => g.lineStyle(3.2, 0xffffff, 1).strokeCircle(32, 32, 30));
  mk(kl.keys.ring2, 96, 96, g => g.lineStyle(2, foe, 1).strokeCircle(48, 48, 44));
  mk(kl.keys.core, 24, 24, g => { g.fillStyle(0xffffff, 0.12).fillCircle(12, 12, 11); g.fillStyle(0xffffff, 0.25).fillCircle(12, 12, 7.5); g.fillStyle(0xffffff, 1).fillCircle(12, 12, kl.core); });
  mk(kl.keys.shard, 6, 2, g => g.fillStyle(foe, 1).fillRect(0, 0, 6, 2));
  S.tex = true;
}
function slookRocket(scene, m, seen) { // a missile in flight, the new look: a white dart and a long fading tail in place of the rectangle, the flame and the smoke; true when drawn here (the switch is on), false for the scene's own
  if (typeof slookOn !== 'function' || !slookOn() || !scene || !scene.msp || !scene.add) return false;
  slookFxTextures(scene); const K = SLOOKFX.missile, kb = typeof campZoomShotScale === 'function' && scene.cameras && scene.cameras.main ? campZoomShotScale(scene.cameras.main.zoom) : 1; // (as thick as a shot at the far view)
  let r = scene.msp[m.id];
  if (r && !r.slook) { r.body.destroy(); r.flame.destroy(); delete scene.msp[m.id]; r = null; } // one made before the switch was turned on: drawn again in the new look
  if (!r) r = scene.msp[m.id] = { body: scene.add.image(m.x, m.y, K.key).setDepth(K.depth), flame: scene.add.image(m.x, m.y, K.tailKey).setOrigin(1, 0.5).setDepth(K.depth - 0.1), puff: 0, slook: true }; // (the tail is stored as `flame`: the scene's own clean-up destroys both when the missile is gone)
  r.body.setPosition(m.x, m.y).setRotation(m.rot).setScale(kb); r.flame.setPosition(m.x, m.y).setRotation(m.rot).setScale(kb); seen[m.id] = true;
  return true;
}
function slookKillAcquire(scene, S) { // a pooled record of eight sprites: a free one, a new one while there are fewer than the cap, else the oldest one still going
  if (S.free.length) return S.free.pop();
  const K = SLOOKFX.kill; if (S.made < K.cap) {
    S.made++; const im = (key, blend) => { const o = scene.add.image(0, 0, key).setDepth(K.depth).setVisible(false); if (blend) o.setBlendMode('ADD'); return o; };
    return { ring1: im(K.keys.ring1), ring2: im(K.keys.ring2), core: im(K.keys.core, true), shards: K.shards.map(() => im(K.keys.shard)), born: 0, x: 0, y: 0, unit: 1 };
  }
  return S.kills.shift() || null;
}
function slookKill(scene, x, y, size, r) { // a ship's end or a missile's blast, the new look: true when drawn here (the switch is on), false for the scene's own puffs; size: 1 a ship, SLOOKFX.kill.big the cruiser and the mothership, blast a missile; r: the blast's radius in the world
  if (typeof slookOn !== 'function' || !slookOn() || !scene || !scene.add || !scene.camp) return false;
  const S = slookFxState(scene); if (!S) return false; slookFxTextures(scene);
  const k = slookKillAcquire(scene, S); if (!k) return true;
  const z = scene.cameras && scene.cameras.main && scene.cameras.main.zoom > 0 ? scene.cameras.main.zoom : 1;
  k.born = scene.camp.t; k.x = x; k.y = y; k.unit = slookKillUnit(z < 1 ? 1 / z : 1, size, r); S.kills.push(k);
  slookKillPlace(k, 0);
  return true;
}
function slookKillPlace(k, age) { // the pooled sprites of one effect at its age; the last frame hides them
  const A = slookKillAt(age, k.unit), K = SLOOKFX.kill;
  if (A.done) { [k.ring1, k.ring2, k.core].concat(k.shards).forEach(o => o.setVisible(false)); return false; }
  k.ring1.setPosition(k.x, k.y).setScale(A.ring1.r / 30).setAlpha(A.ring1.a).setVisible(true);
  k.ring2.setPosition(k.x, k.y).setScale(A.ring2.r / 44).setAlpha(A.ring2.a).setVisible(true);
  k.core.setPosition(k.x, k.y).setScale(A.core.r / K.core).setAlpha(A.core.a).setVisible(A.core.a > 0);
  k.shards.forEach((o, i) => { const s = A.shards[i]; o.setPosition(k.x + s.x, k.y + s.y).setRotation(s.rot).setScale(k.unit).setAlpha(s.a).setVisible(s.a > 0); });
  return true;
}
function slookFxFrame(scene) { // once a frame, after the ships' sprites are in place: the kills' animation and the ships' trails; with the switch off everything is hidden and nothing is made
  const S = slookFxState(scene), C = scene && scene.camp; if (!S || !C || !scene.add) return;
  const on = typeof slookOn === 'function' && slookOn();
  for (let i = S.kills.length - 1; i >= 0; i--) { const k = S.kills[i]; if (!on || !slookKillPlace(k, C.t - k.born)) { if (!on) slookKillPlace(k, Infinity); S.kills.splice(i, 1); S.free.push(k); } }
  const trails = S.trails, alive = {};
  if (!on) { Object.keys(trails).forEach(id => trails[id].setVisible(false)); (S.flames || []).forEach(f => f.setVisible(false)); if (typeof campFeelHide === 'function') campFeelHide(S); return; }
  slookFxTextures(scene); const prot = typeof campConvoyShips === 'function' ? campConvoyShips(C) : [], map = !!scene.mp;
  C.ships.forEach(u => {
    const sp = scene.sp && scene.sp[u.id]; if (!sp) return; alive[u.id] = true;
    if (u.kind === 'carrier') { // the cruiser has real flames, one for each engine, and no plain trail (card space-game-cruiser-boost-flames)
      if (typeof campFeelDraw === 'function' && campFeelDraw(scene, S, u, sp, C)) { (S.flames || []).forEach(f => f.setVisible(false)); const t1 = trails[u.id]; if (t1) t1.setVisible(false); return; } // the flight feel (card space-game-cruiser-long-haul-feel, src/campfeel.js): ribbons from both engines and flickering layered flames in place of the steady streaks
      if (typeof campFeelHide === 'function') campFeelHide(S);
      const fs = u.hp > 0 && sp.visible !== false && typeof campFlameState === 'function' ? slookFlameSpecs(u, sp.displayWidth, campFlameState(C)) : [], fl = S.flames || (S.flames = []);
      fs.forEach((e, k) => { let im = fl[k]; if (!im) im = fl[k] = scene.add.image(e.x, e.y, e.key).setOrigin(1, 0.5); im.setDepth(SLOOKFX.flame.depth).setPosition(e.x, e.y).setRotation(e.rot).setDisplaySize(e.len, e.wid).setAlpha(e.alpha).setVisible(!map); });
      for (let k = fs.length; k < fl.length; k++) fl[k].setVisible(false);
      const t0 = trails[u.id]; if (t0) t0.setVisible(false); return;
    }
    const spec = u.hp > 0 && sp.visible !== false ? slookTrailSpec(u, sp.displayWidth, slookSide(u, prot.indexOf(u) >= 0)) : null;
    let t = trails[u.id];
    if (!spec) { if (t) t.setVisible(false); return; }
    if (!t) t = trails[u.id] = scene.add.image(spec.x, spec.y, spec.key).setOrigin(1, 0.5);
    if (t._key !== spec.key) { t._key = spec.key; t.setTexture(spec.key); }
    t.setDepth((u.kind === 'carrier' ? 5 : u.team === 'earth' ? 4 : 3) - 0.5).setPosition(spec.x, spec.y).setRotation(spec.rot).setDisplaySize(spec.len, spec.wid).setAlpha(spec.alpha).setVisible(!map);
  });
  Object.keys(trails).forEach(id => { if (!alive[id]) { trails[id].destroy(); delete trails[id]; } }); // a ship that is gone has no trail
}
function slookFxInstall(scene) { // from the Campaign scene's create(): the frame on the scene's postupdate event (the ships' sprites are in place by then), taken off when the scene shuts down
  if (!scene || !scene.events || typeof scene.events.on !== 'function') return;
  const frame = () => slookFxFrame(scene), off = () => { scene.events.off('postupdate', frame); };
  scene.events.on('postupdate', frame); scene.events.once('shutdown', off);
}
