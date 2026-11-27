// ---------- Taking the stick of a pilot's fighter (card space-game-fly-fighter-l1; Troy, 26 Nov 2026: "I love how the Long Haul ship flies": fly a pilot's fighter with the Wren's feel and leave the cruiser heavy) ----------
// The C key takes the stick of a pilot's fighter and hands it back. While he holds it the arrows, Space and Shift fly THAT fighter (the Wren's flight numbers, the pilot's own guns: CAMP.cockpit) and the camera is on it; the
// cruiser keeps flying its last order (the autopilot, or coasting to a stop) and its turrets fire by themselves (CAMP.cockpit.turrets). W, E, Enter, Q, Z and R work as always (they address the cruiser, the other pilots and
// the ships you protect: the fighter he flies is left out of "the pilots"). Behind CAMP.flags.cockpit (and the address ?cockpit=1): with it off nothing here runs and the C key does nothing.
// No Phaser here: tests/campcockpit.mjs runs it in Node. The scene writes C.cockpit.input from the keys (src/campaignscene.js); a bot sets the same five fields.
//   C.cockpit                null, or { id (the fighter), k (the hull multiplier it was taken with), input: { turn (-1 to 1), thrust (0 to 1), brake, boost, fire }, boost: { en, locked, on, until, th, flare, fx } (the store and its
//                            look: the same fields as the cruiser's C.boost, src/campboost.js), vmax (the top speed now, px/s), nextShot (ms), since (ms) }
//   campCockpitOn()          is the switch on (CAMP.flags.cockpit, or ?cockpit=1 in the address; ?cockpit=0 is off whatever the flag says)
//   campCockpitTake(C, id)   take the stick of fighter `id`; with no id the one the W pick names (a pilot), else Red 1 (Wedge), else any fighter that is out. true when it is taken (a second take hands the first back)
//   campCockpitGive(C, why)  hand it back: why 'hand' (the key), 'dead' (the fighter was lost), 'result' (the mission ended). The pilot's own flying carries on from where he is
//   campCockpitStep(C, dt)   once a tick, from campTick right after the cruiser: the fighter's own flight (the Wren's: thrust only while the key is down, the boost store, the drag), its guns, and the hand-back if it was lost
//   campEye(C)               the ship the camera is on and the page HUD reads: the fighter he flies, else the cruiser
//   campCockpitAuto(C)       true while the cruiser's turrets should fire by themselves (he is away and CAMP.cockpit.turrets is 'auto'): campTurrets reads it
// The fighter's hull is CAMP.cockpit.hpK times the pilot's while he flies it, and the current hull is scaled by the same ratio at both ends (taking at 20 of 36 gives 40 of 72, giving at 40 of 72 gives 20 of 36): the stick
// can neither heal nor hurt a pilot. Events (for the scene): { type: 'cockpit', stage: 'take' | 'give' | 'dry', id, why }.
const CAMPCOCKPIT = { addr: 'cockpit', memo: { s: null, v: null } };
function campCockpitAddrVal(search) { // the value of ?cockpit in the address, lower case: null when it is not there, '' for a bare ?cockpit (the last one counts); the page's own address is read again only when it changed
  try {
    const own = typeof search !== 'string', s = own ? (typeof location !== 'undefined' && location && typeof location.search === 'string' ? location.search : '') : search, M = CAMPCOCKPIT.memo;
    if (own && M.s === s) return M.v;
    let v = null; s.replace(/^[?#]/, '').split('&').forEach(p => { const eq = p.indexOf('='), k = (eq < 0 ? p : p.slice(0, eq)).trim().toLowerCase(); if (k === CAMPCOCKPIT.addr) v = eq < 0 ? '' : p.slice(eq + 1).trim().toLowerCase(); });
    if (own) { M.s = s; M.v = v; }
    return v;
  } catch (e) { return null; }
}
const campCockpitAddrOn = search => ['', '1', 'on', 'true', 'yes'].indexOf(campCockpitAddrVal(search)) >= 0;
const campCockpitAddrOff = search => ['0', 'off', 'false', 'no'].indexOf(campCockpitAddrVal(search)) >= 0;
const campCockpitOn = () => !campCockpitAddrOff() && ((typeof campFlag === 'function' && campFlag('cockpit')) || campCockpitAddrOn());

const campCockpitInput = () => ({ turn: 0, thrust: 0, brake: false, boost: false, fire: false });
const campCockpitHull = () => Math.max(0.1, +CAMP.cockpit.hpK || 1); // the hull multiplier a take uses (never zero or negative)
function campEye(C) { const S = C && C.cockpit, u = S && C.by ? C.by[S.id] : null; return u && u.hp > 0 ? u : (C ? C.carrier : null); }
const campEyeSprite = s => { const C = s && s.camp, e = C && C.carrier ? campEye(C) : null; return s && s.sp && e ? s.sp[e.id] || null : null; }; // the sprite of the ship the camera is on (the cruiser's, or the fighter's while he holds its stick): where a camera that comes home (a drag, F, a peek) goes back to
const campCockpitFlown = C => { const S = C && C.cockpit, u = S && C.by ? C.by[S.id] : null; return u && u.hp > 0 ? u : null; }; // the fighter he flies, or null
const campCockpitAuto = C => !!C && !!C.cockpit && CAMP.cockpit.turrets === 'auto';

// the fighter a take with no id names: the pilot the W pick holds (his squad's first ship out), else Red 1 (Wedge), else the first fighter that is out
function campCockpitPick(C) {
  const f = typeof campSelNow === 'function' ? campSelNow(C) : null, own = id => typeof campWingShips === 'function' ? campWingShips(C, id) : [];
  const picked = f && f.kind === 'pilot' && f.unit && f.unit.hp > 0 && !f.unit.cockpit ? f.unit : null;
  if (picked) return picked;
  const red = own('red')[0]; if (red) return red;
  return C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked && !u.cockpit).sort((a, b) => (a.id < b.id ? -1 : 1))[0] || null;
}

function campCockpitTake(C, id) {
  if (!C || !C.carrier || C.carrier.hp <= 0 || C.result || !campCockpitOn()) return false;
  const u = id ? (C.by ? C.by[id] : null) : campCockpitPick(C);
  if (!u || u.kind !== 'fighter' || u.team !== 'earth' || u.hp <= 0 || u.docked) return false;
  if (C.cockpit) { if (C.cockpit.id === u.id) return true; campCockpitGive(C, 'hand'); }
  const K = CAMP.cockpit, k = campCockpitHull();
  C.cockpit = { id: u.id, k, input: campCockpitInput(), boost: { en: K.store.max, locked: false, on: false, until: 0, th: 0, flare: 0, fx: 0 }, vmax: K.speed, nextShot: C.t, since: C.t };
  C.flights = null; C.cockpitTaken = true; // the flights of the tick are made again without this ship; cockpitTaken: once taken, the first-minute tip is not shown
  u.cockpit = true; u.hp *= k; u.maxHp = (u.maxHp || u.hp / k) * k; // the hull is the pilot's times hpK, from where it is
  const m = u.mate && C.by[u.mate]; if (m && m.mate === u.id) m.mate = null; u.mate = null; u.run = null; // out of any duel: nobody is paired with a ship the pilot's own AI is not flying
  const ev = { type: 'cockpit', stage: 'take', id: u.id, x: u.x, y: u.y };
  if (C.level === 1 && C.L && C.L.mid === 'mine' && !C.pricePaid) { C.pricePaid = true; ev.price = 'camp.price.stick'; } // 1.2 only: taking a pilot has a price here (a miner is lost when a pilot leaves the wing) and nothing said so: the first time, once a mission, the scene shows one line (card space-game-chunk11-12-price-line; BRIEF 8 decision 10); shown only, never voiced
  C.events.push(ev);
  return true;
}

function campCockpitGive(C, why) {
  const S = C && C.cockpit; if (!S) return false;
  const u = C.by ? C.by[S.id] : null;
  if (u) {
    u.cockpit = false;
    if (u.hp > 0) { u.hp /= S.k; u.maxHp = (u.maxHp || u.hp * S.k) / S.k; } // back to the pilot's own hull by the same ratio
    u.run = null; u.mate = null; // its own flying starts fresh: the pairing is made again next tick
  }
  C.cockpit = null; C.flights = null; // (the flights are made again with it back in its squad)
  C.events.push({ type: 'cockpit', stage: 'give', id: S.id, why: why || 'hand' });
  return true;
}

function campCockpitStep(C, dt) {
  const S = C && C.cockpit; if (!S) return;
  const u = C.by ? C.by[S.id] : null;
  if (!u || u.hp <= 0) { if (u) u.cockpit = false; C.cockpit = null; C.events.push({ type: 'cockpit', stage: 'give', id: S.id, why: 'dead' }); return; } // lost: the camera goes back to the cruiser (the pilot is lost as always: campKill)
  if (C.result || !C.carrier || C.carrier.hp <= 0) { campCockpitGive(C, 'result'); return; }
  const K = CAMP.cockpit, St = K.store, inp = S.input, B = S.boost;
  u.rot += Math.max(-1, Math.min(1, +inp.turn || 0)) * K.turn * dt; // the Wren's turn: the key's whole rate the moment it is down (classic handling)
  const th = Math.max(0, Math.min(1, +inp.thrust || 0));
  const ok = !!inp.boost && th > 0 && !B.locked && B.en > 0; // Shift with thrust, with energy in the store
  B.on = ok;
  if (ok) { B.en = Math.max(0, B.en - St.drain * dt); B.until = C.t + St.pause; if (B.en <= 0) { B.locked = true; C.events.push({ type: 'cockpit', stage: 'dry', id: u.id }); } }
  else if (C.t >= B.until) B.en = Math.min(St.max, B.en + St.regen * dt);
  if (B.locked && B.en >= St.max * St.back) B.locked = false;
  const target = ok ? K.boost : K.speed;
  S.vmax = target >= S.vmax ? target : Math.max(target, S.vmax - K.fall * dt); // up at once, down at `fall` px/s each second: letting go is a fade, not a wall
  B.flare = th > 0 && B.th <= 0.02 ? 1 : Math.max(0, B.flare - dt * 3); B.th += (th - B.th) * Math.min(1, dt * 8); B.fx += ((ok ? 1 : 0) - B.fx) * Math.min(1, dt * 10); // the look's own numbers, as the cruiser's boost keeps them
  const a = K.accel * (ok ? K.boostAccel : 1) * th;
  u.vx += Math.cos(u.rot) * a * dt; u.vy += Math.sin(u.rot) * a * dt;
  const keep = Math.pow(inp.brake ? K.brakeDrag : K.drag, dt); u.vx *= keep; u.vy *= keep;
  const sp = Math.hypot(u.vx, u.vy); if (sp > S.vmax) { u.vx *= S.vmax / sp; u.vy *= S.vmax / sp; }
  u.x += u.vx * dt; u.y += u.vy * dt;
  if (inp.fire && C.t >= S.nextShot) { // the pilot's own gun: his damage and rate (times damageK, rateK), one shot a mean delay, straight along the nose
    const F = CAMP.fighter;
    const gap = (F.delay[0] + F.delay[1]) / 2 / Math.max(0.1, +K.rateK || 1);
    S.nextShot = Math.max(S.nextShot + gap, C.t); // on a schedule of one gap, so the rate does not depend on the tick (never a burst after a pause: not before now)
    campBullet(C, u, u.rot, F.bullet * C.shot, F.damage * (u.str || 1) * (+K.damageK || 1), 1400, 'earth', 14);
    C.events.push({ type: 'wingshot', x: u.x, y: u.y, kind: u.kind, id: u.id });
  }
}

// Q 7 FROM A FIGHTER: "Cruiser, come to me" (card space-game-b7-hud-q-cockpit; Troy, 26 Nov 2026): the cruiser is on its own while he flies, so its list's last row (Form up on me: the pilots form up on the cruiser) means the other way round: the cruiser flies to the fighter and keeps station
// alongside it (the autopilot's trip to a moving ship of yours, CAMP.nav.stopFriend). how: 'key' (the toast is the caller's), dry: only say whether it can be done. campNo codes and the words of the refusals are the Q list's own (`there`: it is already beside him).
function campCockpitCome(C, how, dry) {
  const f = campCockpitFlown(C); if (!f) return campNo('what');
  if (campDist(f, C.carrier) <= CAMP.nav.stopFriend + (C.carrier.r || 0) + (f.r || 0) + 40) return campNo('there');
  if (dry) return { ok: true, say: '' };
  campNavGo(C, { id: 'ship:' + f.id, of: 'ship:' + f.id, kind: 'ship', ref: f.id, name: typeof campNavUnitName === 'function' ? campNavUnitName(f) : f.id, moving: true, x: f.x, y: f.y }, false);
  return { ok: true, code: 'comehere', say: uiText('camp.corner.comesay') };
}
