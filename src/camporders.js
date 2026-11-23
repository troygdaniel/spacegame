// ---------- Campaign: the pilots ask for orders (card space-game-order-calls; Troy, 21 Nov 2026) ----------
// "The fights were not interactive and the escorts were boring: I want to direct the fleet more." A pilot of the wing radios what he sees and asks what to do. The fight goes on; a small prompt
// (src/camporderdraw.js) shows three choices as a small list (Up, Down, Enter) and the pilot waits a few seconds. No answer, and he takes the cautious one himself and says so. Each choice is a real order or a real cost in the sim:
// the wing's own orders (src/campwing.js), a missile out of the magazine, ore for the shield, the emergency power, or the enemy turned on the cruiser. At most one call in CAMP_CALLS.gap seconds.
// The sim half: plain numbers and strings (no Phaser, no page; tests/camporders.mjs runs it in Node), and nothing in it rolls a die: the same flight makes the same calls.
//
// THE TABLE is data. A call TYPE is { id, when, pick: [fx, fx, fx], def }: `when(C, S)` is its trigger (a context { who, ids } of ship ids when it holds, else null), `pick` is the choices (three, or up to five when a call
// offers the squads) by the id of their effect in CAMP_CALL_FX, `def` is the cautious one (an index into pick) that is taken when the pilot hears nothing. An EFFECT is { do(C, ctx) } and says whether it could be done: a pick that cannot be
// done (no missile, the target is gone) is not done and the cautious one is. The words of a type are camp.call.line.<id>, of an effect camp.call.fx.<id> (the label on the prompt) and camp.call.r.<id> (the
// pilot's answer, said on the radio), and camp.call.late and camp.call.fail are the answers to no answer and to a pick that could not be done (content/text/camporders.md).
//   SQUADS (card space-game-distress-send-squads; Troy, 22 Nov 2026: "let him send squads, all or specific"): a call may offer the fighters' squads. campCallSquadFx(prefix, make) puts the effects prefix+all, prefix+red, prefix+green and
//   prefix+yellow in CAMP_CALL_FX and returns their ids for a type's `pick`; make(C, ctx, group) does the order (campCallSend: fly to the ship the call is about and fight there, then take up the old order). An effect may carry
//   ok(C, ctx): '' when it can be done now, else the code of why not (nosquad, nofighters, launching: the game's own refusals). The prompt shows that row grey with the reason and Enter on it is refused: the call stays open.
//   C.call = { n, next, open, last, seen, log }  made at the first tick:  n calls made, next: the battle clock (ms) before which none opens, open: the call that waits { id, ctx, pilot, at, left, total, def, held }
//   THE HOLD (card space-game-call-timer-stops; Troy, 22 Nov: "stop the selection timer if the user hits a key, otherwise keep it"): a call opens with its CAMP_CALLS.answer seconds running. When the player touches the prompt (Up or Down on
//   it: campCallHold, called by the scene's campCallKey) the seconds stop where they are (`held` is 0 and counts up) and the call waits for Enter. Nothing else holds it (a fire, power, target or list key is not the prompt's), and a call
//   nobody touches runs out to the cautious pick as ever. A held call does not block the others for ever: CAMP_CALLS.held seconds after the hold the pilot takes the cautious pick (a late answer, said so); no call opens while one waits.
//   campCallsTick(C, dt)        every tick (campTick): the waiting call's clock, the call that may open now
//   C.call.mood = { until, deal, take, rate }  the answer's worth (CAMP_CALLS.mood, CAMP_CALL_RATE): until the battle clock `until` the wing (fighters and escorts) deals `deal` times the damage and takes `take` times (campHurt, src/campaign.js)
//   campCallStart(C, id, ctx)   a script opens a call of a type that has `scripted: true` (its trigger is not asked); false while one waits
//   campCallHold(C)            the player touched the prompt: the clock stops (true when it was held by this); an event { type: 'call', stage: 'hold', id }
//   campCallAnswer(C, n, how)   n: 1 to the number of rows (0: the pilot's own pick); how: 'key', 'bot', 'late'; { ok, id, pick } and an event { type: 'call', stage: 'answer', ... }. A key on a grey row is refused ({ ok: false, off: true, code, say }) and the call stays open
//   campCallView(C)             what the prompt draws: null, or { id, pilot, line, left, total, held, def, rows: [{ n, pick, label, def, off, why, say }] }  (off: the row cannot be done now; why: a word or two, say: the sentence)  (held: the clock is stopped, `left` is what it stopped at)
//   campCallOpen(C)             a call is waiting for an answer (the scene reads this: a call has the arrows and Enter, and the lists are dimmed behind it; the battle is NOT slowed)
const CAMP_CALLS = {
  first: 40,       // s of the mission's clock before the first call may come (the first minute's hints, src/campnudge.js, are said first: a call at 20 s took their turn)
  gap: 25,         // s from one call opening to the next one that may open
  answer: 8,       // s the pilot waits for an answer, until the player touches the prompt (Up or Down: then the clock stops)
  held: 30,        // s a call the player has touched waits for Enter before the pilot takes the cautious pick himself (the others wait behind it: one call at a time)
  grace: 0.7,      // s after a call closed BY ITSELF (the ship it was about is gone, or its time ran out) in which Enter is still the call's and does nothing: without it an Enter meant as an answer fired a missile (card space-game-hunt-l1-pacing)
  again: 70,       // s before the same type of call is made again
  pilots: 4,       // the callsigns of src/campchatter.js, taking turns
  wound: 0.4,      // a wingman at this share of his hull or less is "hit and burning"
  woundNear: 650,  // px: with an enemy this close to him
  convoyNear: 800, // px: an enemy this close to a convoy ship is "breaking for the convoy"
  convoyFar: 900,  // px: with the cruiser farther than this from that ship (nearer, its turrets have it) ...
  covered: 350,    // px: ... and none of the wing within this of it (an escort beside her has it)
  fresh: 9,        // s a wave counts as a second group after it came, while the first is still about
  fightNear: 2500, // px: the first group is about when it is this close to the cruiser
  runNear: 1600,   // px: a pirate that breaks off and runs is the pilot's to report while it is this close to the cruiser
  solo: 700,       // px: a big ship is alone when no other enemy is this close to it
  shield: 0.4,     // the cruiser's shield at this share of its cap or less, with an enemy in reach
  shieldNear: 900, // px: "in reach"
  draw: 8,         // s the enemy keeps its eye on the cruiser after "leave them to the cruiser's turrets" (and its own goal is dropped: it stays on the cruiser)
  mood: {          // what an answer is worth (card space-game-fleet-command-tune; Troy: what does the player decide, and what does it cost?): the wing (fighters and escorts) fights by it for `secs` after an answer
    good: { secs: 25, deal: 1.8, take: 0.6 },   // the right pick for the moment (CAMP_CALL_RATE): the wing hits 1.8 times as hard and takes 0.6 of the damage
    bad:  { secs: 20, deal: 0.6, take: 1.6 }    // the wrong pick: it hits 0.6 as hard and takes 1.6 times the damage. The cautious pick, and no answer, are neither: nothing changes
  }
};

// ---- who is about ----
const campCallWing = C => C.ships.filter(u => u.team === 'earth' && u.hp > 0 && u.kind === 'fighter');
const campCallFoes = C => campAliens(C).filter(u => u.kind !== 'tower' && u.kind !== 'mother' && !u.running);
const campCallByDist = (list, p) => list.slice().sort((a, b) => campDist(a, p) - campDist(b, p) || (a.id < b.id ? -1 : 1));
const campCallIds = (list, p, n) => campCallByDist(list, p).slice(0, n).map(u => u.id);
const campCallFoe = (C, x) => { for (const id of (x && x.ids) || []) { const u = C.by[id]; if (u && u.hp > 0) return u; } return null; };

// ---- which picks are right and which are wrong (indexes into a type's `pick`; the cautious pick `def` and the rest are neither) ----
const CAMP_CALL_RATE = {
  cruiser:     { good: [2], bad: [1] },  // the shield is going: the emergency power is the right answer (it costs the weapons and the engines for a while); sending the fighters off is wrong
  wounded:     { good: [2], bad: [0] },  // a wingman is hit: the pilot who keeps fighting is right (the repair brings him in by himself when he is low); the whole wing standing guard over him is wrong
  breakaway:   { good: [0], bad: [2] },  // enemies on a convoy ship: the fighters intercept; leaving them to the cruiser's turrets is wrong
  second:      { good: [2], bad: [] },   // a second group: everyone attacks; holding, the cautious pick, and the fighters alone are neither
  running:     { good: [0], bad: [2] },  // pirates run: the fighters give chase; a missile after a runner is wasted
  opportunity: { good: [0], bad: [1] },  // a big ship alone: the missile; the fighters alone on it are wrong
  distress:    { good: [1, 2, 3], bad: [0] } // the miner (beat 2 of 1.1; picks: all squads, Red, Green, Yellow, stay): one squad is the right-sized answer; all three leave the cruiser's side bare
};

// ---- the effects: each says whether it could be done ----
const campCallAt = (group, verb) => (C, x) => { const f = campCallFoe(C, x); return !!f && campWingOrder(C, group, verb, f.id, 'call').ok; };
const CAMP_CALL_FX = {
  intercept: { do: campCallAt('fighters', 'attack') },                          // the fighters go for the nearest of them
  chase: { do: campCallAt('fighters', 'attack') },
  strike: { do: campCallAt('fighters', 'attack') },
  allin: { do: campCallAt('all', 'attack') },                                    // fighters and escorts both: nobody is left beside the cruiser
  guard: { do: C => campWingCancel(C, 'all', 'call').ok },                       // every order dropped: the wing flies back to guard the cruiser
  cover: { do: (C, x) => { const u = x && C.by[x.who]; return !!u && u.hp > 0 && campWingOrder(C, 'all', 'guard', u.id, 'call').ok; } }, // the wing guards the wounded ship, wherever he is
  home: { do: (C, x) => { const u = x && C.by[x.who]; if (!u || u.hp <= 0) return false; u.order = { type: 'recall' }; u.move = null; C.orders.recall++; return true; } }, // he lands, and is whole when he is next launched
  draw: { do: (C, x) => { // the enemy turns on the cruiser: its goal is dropped, it hunts the carrier (a pirate takes its prey, an alien its target) and for a few seconds it is on the ship that hit it
    let n = 0; ((x && x.ids) || []).forEach(id => { const u = C.by[id]; if (u && u.hp > 0 && u.team === 'alien') { u.goal = ''; u.prey = 'carrier'; u.hitBy = C.carrier.id; u.distractedUntil = C.t + CAMP_CALLS.draw * 1000; if (u.lost) { u.lost = false; u.seenAt = C.t; } n++; } });
    return n > 0; } },
  missile: { do: (C, x) => { const f = campCallFoe(C, x); if (!f || C.missiles <= 0 || C.t < C.nextRocket || campDist(f, C.carrier) > CAMP.missile.lock) return false; campFire(C, f); C.orders.missiles++; return true; } }, // one missile out of the magazine
  emergency: { do: C => campOrder(C, 'emergency', '', 'call').ok },             // the emergency power: shields up, weapons and engines down for a while, and the cooldown
  hold: { do: () => true },                                                      // nothing is done: the wing stays as it is, nobody breaks off
  fight: { do: () => true },                                                     // nothing is done: the pilot goes on
  letgo: { do: () => true },
  leave: { do: () => true }
};

// ---- squad choices (the fighters' three squads, src/campwing.js) ----
const campCallSquadWhy = (C, group) => campWingShips(C, group, true).some(u => u.kind === 'fighter') ? '' : C.launchQ.length ? 'launching' : group === 'fighters' ? 'nofighters' : 'nosquad'; // '' when the squad has a ship out to send
function campCallSquadFx(prefix, make) { // the four choices of a call that offers the squads: all of them, Red, Green, Yellow (the ids prefix+all, prefix+red ...)
  return ['fighters'].concat(CAMP.wing.squads).map(gr => { const id = prefix + (gr === 'fighters' ? 'all' : gr); CAMP_CALL_FX[id] = { squad: gr, ok: C => campCallSquadWhy(C, gr), do: (C, x) => make(C, x, gr) }; return id; });
}
// the squad (or all three) flies to the ship the call is about (ctx.who) and fights the pirates at it; when none is left it takes up the order it had (campWingRescue, src/campwing.js): the other squads keep theirs, the escorts stay
function campCallSend(C, x, group) {
  const m = x && C.by[x.who]; if (!m || m.hp <= 0) return false;
  const ships = campWingShips(C, group, true).filter(u => u.kind === 'fighter'); if (!ships.length) return false;
  const tg = campWingShipTarget(C, m);
  ships.forEach(u => {
    const old = u.order && u.order.rescue ? u.order.back : u.order; // a squad sent twice goes back to the order it had before the first
    u.order = { type: 'attack', target: '', rescue: m.id, back: old || { type: 'guard', at: { kind: 'carrier' } }, tg: { kind: tg.kind, id: tg.id, ref: tg.ref, name: tg.name, x: tg.x, y: tg.y } }; u.move = null;
  });
  C.orders.attack = (C.orders.attack | 0) + 1;
  C.events.push({ type: 'wingorder', group, verb: 'attack', target: { kind: tg.kind, id: tg.id, name: tg.name }, n: ships.length, how: 'call' });
  return true;
}

// ---- the call types ----
const CAMP_CALL_TYPES = [
  { id: 'cruiser', pick: ['guard', 'strike', 'emergency'], def: 0, // the cruiser's shield is going and an enemy is in reach: the wing comes home to guard it / the fighters go for the nearest enemy / the emergency power (shields up, weapons and engines down for a while)
    when: C => { if (C.carrier.hp <= 0 || !(C.shield <= campShieldMax(C) * CAMP_CALLS.shield)) return null; const f = campNearest(campAliens(C), C.carrier, CAMP_CALLS.shieldNear); return f ? { ids: [f.id] } : null; } },
  { id: 'wounded', pick: ['cover', 'home', 'fight'], def: 1, // a wingman is hit and an enemy is on him (not one who is already flying home to be mended: src/camprepair.js)
    when: C => { const foes = campCallFoes(C), w = campCallWing(C).filter(u => u.hp <= u.maxHp * CAMP_CALLS.wound && !(u.order && u.order.type === 'recall') && !u.repair && foes.some(f => campDist(f, u) < CAMP_CALLS.woundNear)); return w.length ? { who: campCallByDist(w, C.carrier)[0].id, ids: campCallIds(foes, w[0], 3) } : null; } },
  { id: 'breakaway', pick: ['intercept', 'hold', 'draw'], def: 1, // enemies close on a convoy ship with the cruiser away from her: two or more of them, or one with none of the wing beside her
    when: C => { const foes = campCallFoes(C), wing = campCallWing(C), K = CAMP_CALLS;
      for (const f of campConvoys(C)) { const near = foes.filter(u => campDist(u, f) < K.convoyNear); if (near.length && campDist(f, C.carrier) > K.convoyFar && (near.length >= 2 || !wing.some(u => campDist(u, f) < K.covered))) return { who: f.id, ids: campCallIds(near, f, 3) }; }
      return null; } },
  { id: 'second', pick: ['intercept', 'hold', 'allin'], def: 1, // a second group has come in while the first is still about
    when: (C, S) => { const foes = campCallFoes(C), K = CAMP_CALLS, fresh = foes.filter(u => u.wave != null && S.seen[u.wave] != null && C.t - S.seen[u.wave] <= K.fresh * 1000);
      const first = foes.filter(u => fresh.indexOf(u) < 0 && campDist(u, C.carrier) < K.fightNear); return fresh.length >= 2 && first.length ? { ids: campCallIds(fresh, C.carrier, 4) } : null; } },
  { id: 'running', pick: ['chase', 'letgo', 'missile'], def: 1, // pirates break off and run
    when: C => { const run = campAliens(C).filter(u => u.running && !u.gone && campDist(u, C.carrier) < CAMP_CALLS.runNear); return run.length ? { ids: campCallIds(run, C.carrier, 3) } : null; } },
  { id: 'opportunity', pick: ['missile', 'strike', 'leave'], def: 2, // a big ship (a gunship, a tower) alone and in reach, and a missile to send
    when: C => { if (C.missiles <= 0) return null; const all = campAliens(C), big = all.filter(u => campBig(u) && u.kind !== 'mother' && campDist(u, C.carrier) <= CAMP.missile.lock * 0.8 && !all.some(o => o !== u && campDist(o, u) < CAMP_CALLS.solo)); return big.length ? { ids: campCallIds(big, C.carrier, 1) } : null; } }
];
const campCallType = id => CAMP_CALL_TYPES.find(t => t.id === id) || null;

// ---- the state and the tick ----
function campCallsNew(C) { return { n: 0, next: 0, open: null, last: {}, seen: {}, log: [] }; }
function campCallGrace(C) { const S = C && C.call; return !!(S && !S.open && S.selfAt != null && C.t - S.selfAt >= 0 && C.t - S.selfAt < CAMP_CALLS.grace * 1000); } // a call has just closed by itself: Enter is not yet the missile's
function campCallOpen(C) { return !!(C && C.call && C.call.open); } // (a function declaration: the command-time card's test puts its own in its place)

function campCallsTick(C, dt) {
  if (!C || C.result) return;
  const S = C.call || (C.call = campCallsNew(C));
  C.waves.forEach((st, i) => { if (st && st.started && S.seen[i] == null) S.seen[i] = C.t; }); // when each wave came: "a second group" is one that has just come
  const o = S.open;
  if (!campFlag('calls')) { if (o) { S.open = null; C.events.push({ type: 'call', stage: 'gone', id: o.id }); } return; } // the pilots' calls switched off (the tuning panel): none opens, and one that waits is dropped
  if (o) {
    const ids = [].concat(o.ctx.who || [], o.ctx.ids || []);
    if (ids.length && !ids.some(id => C.by[id] && C.by[id].hp > 0)) { S.open = null; S.selfAt = C.t; C.events.push({ type: 'call', stage: 'gone', id: o.id }); return; } // the ship he was calling about is gone: there is nothing to order
    if (o.held != null) { o.held += dt; if (o.held >= CAMP_CALLS.held) campCallAnswer(C, 0, 'late'); return; } // touched: the seconds are stopped; it waits for Enter, for CAMP_CALLS.held at the most
    o.left -= dt;
    if (o.left <= 0) campCallAnswer(C, 0, 'late');
    return;
  }
  if (C.arrivedAt == null || campMissionClock(C) < CAMP_CALLS.first || C.t < S.next || C.carrier.hp <= 0) return;
  for (const T of CAMP_CALL_TYPES) {
    if (T.scripted) continue; // a call a script opens itself (campCallStart), never by its trigger
    if (S.last[T.id] != null && C.t - S.last[T.id] < CAMP_CALLS.again * 1000) continue;
    const ctx = campTry(() => T.when(C, S), null); if (!ctx) continue;
    S.n++; S.last[T.id] = C.t; S.next = C.t + CAMP_CALLS.gap * 1000;
    S.open = { id: T.id, ctx, pilot: (S.n - 1) % CAMP_CALLS.pilots, at: C.t, left: CAMP_CALLS.answer, total: CAMP_CALLS.answer, def: T.def, held: null };
    C.events.push({ type: 'call', stage: 'open', id: T.id, pilot: S.open.pilot });
    return;
  }
}

// a script opens a call by hand (a type with `scripted: true` in the table: its trigger is never asked): true when it opened (none waits, the type is in the table)
function campCallStart(C, id, ctx) {
  const T = campCallType(id); if (!C || C.result || !T || !campFlag('calls')) return false;
  const S = C.call || (C.call = campCallsNew(C)); if (S.open) return false;
  S.n++; S.last[T.id] = C.t; S.next = Math.max(S.next, C.t + CAMP_CALLS.gap * 1000);
  S.open = { id: T.id, ctx: ctx || {}, pilot: (S.n - 1) % CAMP_CALLS.pilots, at: C.t, left: CAMP_CALLS.answer, total: CAMP_CALLS.answer, def: T.def, held: null };
  C.events.push({ type: 'call', stage: 'open', id: T.id, pilot: S.open.pilot });
  return true;
}

// the player touched the prompt (Up or Down on it): the pilot's seconds stop where they are and the call waits for Enter (CAMP_CALLS.held s at the most). true when this held it; false when none waits or it is held already
function campCallHold(C) {
  const o = C && !C.result && C.call && C.call.open; if (!o || o.held != null) return false;
  o.held = 0; C.events.push({ type: 'call', stage: 'hold', id: o.id });
  return true;
}

// the answer: 1, 2 or 3; 0 (or anything else) is no answer: the pilot's own, cautious pick. A pick that cannot be done is not done: the cautious one is, and the answer says so.
function campCallAnswer(C, n, how) {
  const S = C && C.call, o = S && S.open; if (!o) return { ok: false, code: 'nocall' };
  const T = campCallType(o.id), asked = n >= 1 && n <= T.pick.length ? n - 1 : -1; let i = asked >= 0 ? asked : T.def, failed = false;
  const fx0 = asked >= 0 ? CAMP_CALL_FX[T.pick[asked]] : null, why = fx0 && fx0.ok ? campTry(() => fx0.ok(C, o.ctx), '') : '';
  if (why && how === 'key') return { ok: false, off: true, code: why, say: uiText('camp.no.' + why) }; // a grey row, picked by the player: refused with the reason, and the call goes on waiting (the clock runs as it was)
  if (!campTry(() => CAMP_CALL_FX[T.pick[i]].do(C, o.ctx), false) && i !== T.def) { failed = true; i = T.def; campTry(() => CAMP_CALL_FX[T.pick[i]].do(C, o.ctx), false); }
  S.open = null; S.next = Math.max(S.next, C.t + 3000); // a quiet moment after an answer: its own radio line is said first
  const way = asked < 0 ? 'late' : failed ? 'fail' : (how || 'key');
  if (way === 'late') S.selfAt = C.t; // it closed by itself: for CAMP_CALLS.grace an Enter is still the call's (campCallGrace)
  const R = CAMP_CALL_RATE[T.id], rate = way === 'late' || way === 'fail' || i === T.def || !R ? '' : R.good.indexOf(i) >= 0 ? 'good' : R.bad.indexOf(i) >= 0 ? 'bad' : ''; // the pick the pilot was asked for and got, rated: right, wrong, or neither
  if (rate) { const M = CAMP_CALLS.mood[rate]; S.mood = { until: C.t + M.secs * 1000, deal: M.deal, take: M.take, rate }; C.events.push({ type: 'say', key: 'camp.say.call' + rate, vars: {} }); }
  S.log.push({ id: T.id, pick: T.pick[i], way, at: Math.round(C.t) });
  C.events.push({ type: 'call', stage: 'answer', id: T.id, pick: T.pick[i], n: i + 1, pilot: o.pilot, how: way, rate });
  return { ok: true, id: T.id, pick: T.pick[i], n: i + 1, how: way, rate };
}

const campCallWhy = code => (typeof CAMP_PANELS === 'object' && CAMP_PANELS.shortWhy && CAMP_PANELS.shortWhy[code]) || code; // a word or two beside a grey row (the lists' own: 'none out')
function campCallView(C) {
  const o = C && C.call && C.call.open; if (!o) return null;
  const T = campCallType(o.id); if (!T) return null;
  return { id: o.id, pilot: o.pilot, line: 'camp.call.line.' + o.id, left: Math.max(0, o.left), total: o.total, held: o.held != null, def: T.def + 1, rows: T.pick.map((p, i) => { const fx = CAMP_CALL_FX[p], code = fx && fx.ok ? campTry(() => fx.ok(C, o.ctx), '') : ''; return { n: i + 1, pick: p, label: 'camp.call.fx.' + p, def: i === T.def, off: !!code, why: code ? campCallWhy(code) : '', say: code ? uiText('camp.no.' + code) : '' }; }) };
}
