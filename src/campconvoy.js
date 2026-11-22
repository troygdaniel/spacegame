// ---------- Campaign: orders for the escorted ships (card space-game-convoy-orders; Troy, 21 Nov 2026) ----------
// Troy: the escorts were boring and he wants to direct the fleet more. The ships an escort mission is about (the transport, the haulers, the neutral miners) take four orders now, to all of them or to one by name:
//   TUCK IN     fly to the cruiser and stay inside its shield bubble (CAMP.convoyOrders.bubble px): a hit on a tucked ship is a hit on the cruiser, its shield first and then its hull (so a shot, a pirate's
//               and an alien's, a torpedo's blast: src/campaign.js campHurt asks campConvoyCover). The convoy ship goes on along its road, but only while it stays inside the bubble: the cruiser sets the pace. A miner lies under the
//               cruiser in a slot of its own.
//   HOLD HERE   stop where it is (it brakes in a second or so) and wait, with no cover.
//   RUN FOR IT  full speed to its goal (CAMP.convoyOrders.run times its own speed; a miner goes home), with no cover: it is out from under the shield, and the escorts must keep the way clear.
//   CARRY ON    back to its own course: the order is cancelled.
// The cruiser's hull blocks, too, as it always did: a shot or a torpedo flies on until it touches a ship, and the cruiser between the shooter and the ship behind it is the first it touches (tests/campconvoy.mjs).
// The pure half (no Phaser, no page; tests/campconvoy.mjs runs it in Node). The same rules for the convoy rows of the fleet list (src/data_controls.js CAMP_PANELS), the strip and the ship's voice: all of them are
// campOrder(C, 'convoy', words).
//   campConvoyOrder(C, words, dry)   the order: words say the verb ('tuck in', 'hold here', 'run for it', 'carry on') and may name a ship ('tuck in Hauler 2'); { ok, code, say } (codes ctuck chold crun ccarry; refusals cnone cwhat);
//                                    dry: the answer and nothing done (campCheck)
//   campConvoyShips(C, one)          the ships that take orders (alive): the convoys and the neutral miners, or just `one`      campConvoyState(C)  'tuck' | 'hold' | 'run' | 'carry' | 'mixed' ('' when there are none)
//   campConvoyCover(C, u, quiet)     the cruiser, when u is close enough to it to be under its shield (a 'convoy' event stage 'cover' says so unless quiet), else null
//   campConvoyStep(C, u, ang, dt)    one tick of a convoy ship that is under an order (campConvoyAI calls it);  campConvoyMiner(C, u, dt)  the same for a neutral miner: true when the order moved it
// A ship under an order has u.cord: 'tuck' | 'hold' | 'run' (none: carry on). Events: { type: 'convoy', stage: 'order', verb, n } and { type: 'convoy', stage: 'cover', id, x, y }.

const campConvoyShips = (C, one) => C.ships.filter(u => u.hp > 0 && CAMP.convoyOrders.kinds.indexOf(u.kind) >= 0 && (u.kind !== 'miner' || u.team === 'neutral') && (!one || u === one));

// the verb of the words: the cancelling words first, then tuck, run and hold ("hold here", "stop"); null when there is none
function campConvoyVerb(q) {
  if (/\b(?:carry on|as you were|resume|release|cancel|own course|own way)\b/.test(q)) return 'carry';
  if (/\b(?:tuck|snug|close up|cover|shield)\b/.test(q)) return 'tuck';
  if (/\b(?:run|flee|dash|full speed)\b/.test(q)) return 'run';
  if (/\b(?:hold|stop|halt|stay|wait|park)\b/.test(q)) return 'hold';
  return null;
}
function campConvoySet(C, u, verb) {
  if (u.vmax0 == null) u.vmax0 = u.vmax; // the speed it was made with (a miner's run is a faster speed of its own; a convoy ship's is done in campConvoyStep)
  u.cord = verb === 'carry' ? null : verb;
  u.vmax = u.vmax0 * (u.kind === 'miner' && verb === 'run' ? CAMP.convoyOrders.run : 1);
}
function campConvoyOrder(C, arg, dry) {
  const q = String(arg == null ? '' : arg).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(), verb = campConvoyVerb(q);
  if (!verb) return campNo('cwhat');
  const t = campFind(C, q), one = t && t.kind === 'convoy' && C.by[t.id] && C.by[t.id].hp > 0 ? C.by[t.id] : null; // "tuck in Hauler 2": that ship only
  const ships = campConvoyShips(C, one);
  if (!ships.length) return campNo('cnone');
  const who = ships.length === 1 ? (ships[0].kind === 'freighter' ? campConvoyName(ships[0]) : (ships[0].cname || uiText('camp.say.cwho'))) : uiText('camp.say.cwho');
  if (dry) return campYes('c' + verb, { who });
  ships.forEach(u => campConvoySet(C, u, verb));
  C.orders.convoy++; C.events.push({ type: 'convoy', stage: 'order', verb, n: ships.length });
  return campYes('c' + verb, { who });
}
function campConvoyState(C) {
  const ships = campConvoyShips(C); if (!ships.length) return '';
  const v = {}; ships.forEach(u => { v[u.cord || 'carry'] = 1; });
  const k = Object.keys(v); return k.length === 1 ? k[0] : 'mixed';
}

// the cover: a tucked ship within the bubble of the cruiser is under its shield, and a hit on it is the cruiser's
function campConvoyCover(C, u, quiet) {
  const c = C.carrier; if (!c || c.hp <= 0 || u === c || campDist(u, c) > CAMP.convoyOrders.bubble) return null;
  if (!quiet) C.events.push({ type: 'convoy', stage: 'cover', id: u.id, x: u.x, y: u.y });
  return c;
}

// a convoy ship under an order: it goes at the speed the order says, gaining and losing it at CAMP.convoyOrders.accel; ang is the bearing of its goal
function campConvoyStep(C, u, ang, dt) {
  const K = CAMP.convoyOrders, c = C.carrier;
  let sp = u.vmax, dir = ang;
  if (u.cord === 'run') sp = u.vmax * K.run;
  else if (u.cord === 'hold') sp = 0;
  else if (u.cord === 'tuck' && c && c.hp > 0) {
    const dc = campDist(u, c), lim = K.bubble * 0.8;
    if (dc > lim) dir = Math.atan2(c.y - u.y, c.x - u.x); // outside the bubble: to the cruiser
    else { // inside: along its road, but never out of the bubble
      const nx = u.x + Math.cos(ang) * sp * dt, ny = u.y + Math.sin(ang) * sp * dt, nd = Math.hypot(nx - c.x, ny - c.y);
      if (nd > lim && nd > dc) { u.vx = 0; u.vy = 0; u.rot = ang; return; }
    }
  }
  const cur = Math.hypot(u.vx, u.vy), nv = cur < sp ? Math.min(sp, cur + K.accel * dt) : Math.max(sp, cur - K.accel * dt);
  if (nv > 1e-6) u.rot = dir;
  u.vx = Math.cos(dir) * nv; u.vy = Math.sin(dir) * nv; u.x += u.vx * dt; u.y += u.vy * dt;
}

// a neutral miner under an order: held, running home, or lying under the cruiser in its slot; false when it has none (its own work goes on)
function campConvoyMiner(C, u, dt) {
  const K = CAMP.convoyOrders, c = C.carrier;
  if (u.cord === 'hold') { u.beam = ''; campSeek(u, u.x, u.y, dt); return true; }
  if (u.cord === 'run' && u.home) { u.phase = 'run'; u.beam = ''; campSeek(u, u.home.x, u.home.y, dt); return true; }
  if (u.cord === 'tuck' && c && c.hp > 0) {
    const s = K.slots[(u.slot | 0) % K.slots.length], cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    u.beam = ''; campSeek(u, c.x + cs * s[0] - sn * s[1], c.y + sn * s[0] + cs * s[1], dt); return true;
  }
  return false;
}
