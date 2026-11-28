// ---------- The new Long Haul: the bridge to the Campaign's fighter (PROMPT 23, pieces 4 to 6 of docs/longhaul-earth.html; behind ?longhaul=new, src/lhnew.js) ----------
// Troy wants Long Haul's ship to feel like the fighter he flies with C in the Campaign. That fighter's gun, its aim help, its mark and its effects are functions of the Campaign's pure simulation: they read a game `C`
// (its ships, its clock, the flown fighter's state C.cockpit) and a scene that holds one (scene.camp, scene.hud, scene.sp). Long Haul's flight is a Phaser scene with sprites and arcade bodies. So this file shows the
// one to the other: lhBridge(scene, now) builds, once a frame, a small `C` out of Long Haul's own sprites (your ship as the flown fighter, every pirate as a hostile), and a VIEW of the scene that has the three fields the
// Campaign's scene functions look for. Then the Campaign's OWN functions are called on them, unchanged and uncopied:
//   campCockpitAim(C)          src/campcockpitaim.js: the hostile in the 20 degree cone (CAMP.cockpit.aimCone) and in reach, the lead point to it, whether the nose is on it
//   campCockpitAimSync(view)   the thin mint ring at the lead point, bright when the nose is on it
//   slookFxTextures(view)      src/shiplookfx.js: the mint bolt and the pink bolt (and the kill effect's pictures, piece 6)
// The bridge reads Long Haul's sprites and writes nothing to them. What Long Haul does with the answer is in its own files, one asked-first line each (src/space.js: the shot's angle, speed, life and damage).
// YOUR SHOT, with the switch on, is the Campaign fighter's: CAMP.fighter.bullet px/s (700), alive CAMP_COCKPIT_LIFE ms (1,400), keeping campDrift (0.3) of your own speed, so the Campaign's lead and reach are true for
// it. Its damage and its rate stay the weapons part's (the upgrades you buy still count); a shot the help steered does CAMP.cockpit.aimK of it (0.32), the Campaign's own price for the help. R turns the help off and on
// as it always did (G.aimOff); with it off the ring still shows where the lead is and no shot is steered. The autotarget part is not needed for the help (src/autotarget.js aimFitted).
// No Phaser at load; tests/lhbridge.mjs runs the pure half in plain Node.
//   lhBridgeOn()               the switch is on and the Campaign's aim code is loaded
//   lhBridgeKind(tex)          the Campaign kind a Long Haul texture key is drawn as (src/lhlook.js LHLOOK.map), 'skiff' for one it does not know
//   lhBridgeGame(S, me, foes, now)   PURE: fills the bridge's game S.C from plain rows: me { x, y, rot, vx, vy, hp, maxHp }, foes [{ id, tex, x, y, rot, vx, vy, hp, r }]; keeps C.cockpit (the aim's memory) between frames
//   lhBridge(scene, now)       the bridge of a Long Haul scene, refreshed for this frame: { C, view }, or null (off, or no ship)
//   lhAimSync(scene, ship, off, now)   once a frame, in place of aimUpdate: the Campaign's aim on the bridge and its mint ring; scene.aimTarget is the pirate's sprite. true when it ran (the switch is on)
//   lhAimCone(tier)            PURE: the cone in degrees with the autotarget part at that tier (0: none): the Campaign's 20, plus LHAIM.widen; lhPartWords(slot, i, text): the part's shop and panel words with the switch on
//   lhFire(scene, ship, now)   when a shot leaves: { rot, speed, life, k, vx, vy } (the angle, px/s, ms, the damage's multiplier, the drift to add), or null for Long Haul's own shot
//   lhShot(scene, b, f)        dresses the bullet lhFire answered for: its drift and its life
//   lhShotLook(scene, b, own)  a bullet's picture: the Campaign's mint bolt (yours) or pink bolt (a pirate's); from the scene's shoot()
const LHBRIDGE = { me: 'lh-me', r: 16, body: [14, 4] }; // the flown fighter's id in the bridge, its radius for the Campaign's maths, and a bullet's hit box (the old picture's size: the bolt is larger, the box is not)
// THE AUTOTARGET PART WIDENS THE CONE (card space-game-lh-giant-and-aim-part, BRIEF 16 item 6; ORCH's default under Troy's "assume defaults", 28 Nov 2026). With the switch on the aim help is on every ship (the Campaign's 20 degree cone), so the part, which
// used to switch the help on, would give nothing. It now WIDENS the cone: `widen` is the degrees the part's tier adds to CAMP.cockpit.aimCone (tier 1, 2, 3), so the cone is 20 degrees with no part and 24, 27 and 30 with it. Nothing else of the aim changes (the reach,
// the lead, the damage price). The Campaign's own function reads the cone from its table, so the bridge puts the wider one there for the one call and puts the table back: the Campaign never sees it.
const LHAIM = { widen: [0, 4, 7, 10] };
const lhAimTier = () => typeof partTier === 'function' ? partTier('aim') | 0 : 0;   // the tier of the autotarget part fitted to the active ship (src/fleet.js)
function lhAimCone(tier) { const base = +CAMP.cockpit.aimCone || 0; return base > 0 ? base + (LHAIM.widen[Math.min(3, Math.max(0, tier | 0))] || 0) : 0; } // degrees; the Campaign's cone at 0 (the tuning slider) stays 0: no help, part or none
// the part's words in the shop and on the ship panel while the switch is on (shown only; nothing is spoken): `i` is the tier's place in the part's lists (0 to 2), `text` what the part says today; anything but the autotarget part, or the switch off, is `text`
function lhPartWords(slot, i, text) {
  if (slot !== 'aim' || typeof lhNewOn !== 'function' || !lhNewOn() || typeof CAMP !== 'object') return text;
  const w = LHAIM.widen[(i | 0) + 1], base = +CAMP.cockpit.aimCone || 0; if (!(w > 0) || !(base > 0)) return text;
  return 'aim cone ' + (base + w) + ' degrees' + (i === 0 ? ', from ' + base : i === 2 ? ', the widest' : '');
}
const lhBridgeOn = () => typeof lhNewOn === 'function' && lhNewOn() && typeof campCockpitAim === 'function' && typeof CAMP === 'object';
const lhBridgeKind = tex => (typeof LHLOOK === 'object' && LHLOOK.map[tex] ? LHLOOK.map[tex][0] : 'skiff');
function lhBridgeGame(S, me, foes, now) {
  const C = S.C || (S.C = { level: 0, L: {}, shot: 1, result: '', tgt: '', bullets: [], events: [], ships: [], by: {}, carrier: null, cockpit: null });
  const f = C.by[LHBRIDGE.me] && C.carrier ? C.carrier : { id: LHBRIDGE.me, kind: 'fighter', team: 'earth', cockpit: true, r: LHBRIDGE.r };
  f.x = me.x; f.y = me.y; f.rot = me.rot; f.vx = me.vx || 0; f.vy = me.vy || 0; f.hp = me.hp > 0 ? me.hp : 0; f.maxHp = me.maxHp > 0 ? me.maxHp : 1;
  C.t = now; C.carrier = f; C.ships.length = 0; C.ships.push(f); C.by = {}; C.by[f.id] = f; C.bullets.length = 0; C.events.length = 0;
  (foes || []).forEach(e => { const u = { id: e.id, kind: lhBridgeKind(e.tex), team: 'alien', faction: 'pirate', x: e.x, y: e.y, rot: e.rot || 0, vx: e.vx || 0, vy: e.vy || 0, hp: e.hp > 0 ? e.hp : 0, r: e.r > 0 ? e.r : 12 }; if (u.hp > 0) { C.ships.push(u); C.by[u.id] = u; } });
  if (!C.cockpit) C.cockpit = { id: f.id, k: 1, input: {}, boost: { en: 0, locked: false, on: false, until: 0, th: 0, flare: 0, fx: 0 }, vmax: 0, nextShot: 0, since: now, aim: null };
  return C;
}
function lhBridge(scene, now) {
  if (!lhBridgeOn() || !scene || !scene.ship || !scene.ship.body) return null;
  let S = scene.lhB; const ship = scene.ship, t = +now || 0;
  if (!S) { // made once a flight: a scene that starts again has a new game and a new view (the Graphics and the pooled sprites went with the old display list)
    S = scene.lhB = { C: null, view: Object.create(scene), n: 0, at: -1 }; S.view.hud = {}; S.view.sp = {}; S.view.mode = 'play'; S.view.mp = null;
    if (scene.events && scene.events.once) scene.events.once('shutdown', () => { scene.lhB = null; });
  }
  if (S.at === t && S.C) return S;
  S.at = t;
  const foes = [], sp = S.view.sp; Object.keys(sp).forEach(k => { delete sp[k]; });
  if (scene.enemies) scene.enemies.getChildren().forEach(e => {
    if (!e.active || !e.body || !(e.hp > 0)) return;
    if (!e.lhId) e.lhId = 'lh-p' + (++S.n);
    const def = e.def || {}, v = e.body.velocity;
    foes.push({ id: e.lhId, tex: def.tex || 'drone', x: e.x, y: e.y, rot: e.rotation, vx: v.x, vy: v.y, hp: e.hp, r: def.body ? def.body[0] : 12 }); sp[e.lhId] = e;
  });
  const v = ship.body.velocity;
  lhBridgeGame(S, { x: ship.x, y: ship.y, rot: ship.rotation, vx: v.x, vy: v.y, hp: scene.dead ? 0 : Math.max(1, G.hull), maxHp: G.maxHull }, foes, t);
  sp[LHBRIDGE.me] = ship; S.view.camp = S.C;
  return S;
}
function lhAimSync(scene, ship, off, now) {
  const S = lhBridge(scene, now); if (!S) return false;
  const C = S.C;
  if (off || scene.dead) C.cockpit.aim = null; else { const K = CAMP.cockpit, was = K.aimCone; K.aimCone = lhAimCone(lhAimTier()); try { campCockpitAim(C); } finally { K.aimCone = was; } } // the part's cone for this one call (LHAIM)
  const A = C.cockpit.aim; scene.aimTarget = A ? S.view.sp[A.id] || null : null;
  if (A && typeof G !== 'undefined' && G.aimOff) A.steer = false; // R: the help is off, the ring still shows the lead
  if (typeof campCockpitAimSync === 'function') campCockpitAimSync(S.view);
  if (scene.aimG && scene.aimG.scene) scene.aimG.clear(); // Long Haul's own reticle, if an earlier frame drew one
  return true;
}
function lhFire(scene, ship, now) {
  const S = lhBridge(scene, now); if (!S) return null;
  const A = S.C.cockpit.aim, helped = !!(A && A.steer), v = ship.body.velocity, d = typeof campDrift === 'number' ? campDrift : 0;
  return { rot: helped ? A.rot : ship.rotation, speed: CAMP.fighter.bullet * (S.C.shot || 1), life: typeof CAMP_COCKPIT_LIFE === 'number' ? CAMP_COCKPIT_LIFE : 1400, k: helped ? (+CAMP.cockpit.aimK || 1) : 1, vx: v.x * d, vy: v.y * d, helped };
}
function lhShot(scene, b, f) {
  if (!b || !f || !b.body) return;
  b.body.velocity.x += f.vx; b.body.velocity.y += f.vy; b.life = f.life;
}
function lhShotLook(scene, b, own) {
  if (!lhBridgeOn() || !b || typeof slookFxTextures !== 'function' || typeof SLOOKFX !== 'object') return false;
  const S = scene.lhB && scene.lhB.view ? scene.lhB : lhBridge(scene, scene.time ? scene.time.now : 0); if (!S) return false;
  slookFxTextures(S.view);
  const key = own ? SLOOKFX.shot.key.own : SLOOKFX.shot.key.foe;
  if (!scene.textures.exists(key)) return false;
  if (!b.texture || b.texture.key !== key) { b.setTexture(key); if (b.body && b.body.setSize) b.body.setSize(LHBRIDGE.body[0], LHBRIDGE.body[1], true); } // the bolt is 38 by 8 px; the hit box stays the old shot's, in its middle
  return true;
}
