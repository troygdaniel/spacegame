// ---------- The Campaign's radio chatter (card space-game-campaign-chatter; Troy: yes to the fighters' radio, the X-Wing wingman feel) ----------
// The wing talks: "Splash one.", "Taking fire!", "Copy that.", "Going home.", "Missiles running low." One short fixed line each (content/text/chatter.md: about 6 words, no number and no
// placeholder, so the voice pack can record each line once), said by one of a few pilots, each a callsign and an Aura voice of his own (never the computer's, never a bar character's).
// QUIET by default (Settings > Sound > Chatter: On, Quiet, Off): in Quiet the radio carries one line in 8 seconds and the same kind of call is not made twice in 24 s; On is livelier (3 s,
// 10 s). Nothing is queued: a call that cannot be said when it falls due (the ship's computer spoke in the last 2.5 s, a line is playing, a warning) is dropped. The words are shown
// bottom left, beside the command strip, with the callsign, and said with voiceSay at prio 0: it never waits behind the computer and never talks over it or a warning.
// Everything here is plain numbers and strings (no Phaser), so tests/campchatter.mjs runs it in Node:
//   chatterEventOf(C, e)    PURE: which call a sim event is (src/campaign.js events, C.events), or null
//   chatterNew()            a fresh radio state S: { last, hold, at, q, pilot, line }
//   chatterOrderDiff(seen, orders)  PURE: the calls the orders given since the last look bring (C.orders counters): copy for a launch, attack, escort or guard, home for a recall
//   chatterHear(sc, e)      the scene's one call for each sim event (the computer's lines hold the radio; the rest may be a call); a scene with no radio hears nothing
//   chatterHold(S, now)     the ship's computer spoke: the radio is quiet for CHATTER.hold ms (the scene calls it for every 'say' event)
//   chatterPush(S, ev, now) a call is made: true when the radio takes it (mode, the 8 s, the same kind of call, one at a time), it is said CHATTER.events[ev].delay ms later
//   chatterTick(S, now, busy) the call that is due and can be said now: { ev, call, voice, text }, else null (nothing due, or it was dropped); busy: a line is playing
//   chatterPlay(line)       one voiceSay of prio 0 in the pilot's own voice; false when there is no voice (the words are still shown)
//   chatterMode() / chatterSetMode(m)  the setting, kept in this browser (longhaul.chatter), Quiet until the player picks another
const CHATTER_MODES = [['on', 'ON'], ['quiet', 'QUIET'], ['off', 'OFF']];
const CHATTER = {
  key: 'longhaul.chatter', mode: 'quiet', loaded: false,
  gap: { on: 3000, quiet: 8000 },       // ms between two lines on the radio
  same: { on: 10000, quiet: 24000 },    // ms before the same kind of call is made again
  hold: 2500,                            // ms of quiet after the ship's computer spoke
  show: 4200,                            // ms a line stays on the screen
  pilots: [['HAWK', 'aura-perseus-en'], ['ROOK', 'aura-angus-en'], ['VEGA', 'aura-orpheus-en'], ['LANCE', 'aura-zeus-en']], // callsign, Aura voice: none is a voice the computer can have or a bar character has
  events: {                              // delay: ms between the call and the line. A call that answers a computer line waits until its hold is over
    splash: { delay: 400 }, hit: { delay: 200 }, ore: { delay: 200 },
    copy: { delay: 1200 }, home: { delay: 1200 },       // an order given: the answer comes a beat later (the computer's own line, if it speaks one, is not a sim event: the radio is busy, not held)
    contact: { delay: 2800 }, mother: { delay: 2800 }, lowmissiles: { delay: 2800 }, relic: { delay: 2800 }, convoy: { delay: 2800 }, cache: { delay: 2800 },
    shields: { delay: 2800 }, engines: { delay: 2800 }   // the ship's systems (card space-game-campaign-systems): the computer's low-shields and low-engines lines
  },
  says: {                                // the computer's own line (a 'say' event of the sim) -> the call it brings
    'camp.say.wave1': 'contact', 'camp.say.wave2': 'contact', 'camp.say.l2wave1': 'contact', 'camp.say.l2wave2': 'contact',
    'camp.say.l3wave1': 'contact', 'camp.say.l3wave2': 'contact', 'camp.say.l3wave3': 'contact', 'camp.say.wave3': 'mother',
    'camp.say.ambush': 'contact', 'camp.say.bwave2': 'contact', 'camp.say.bwave3': 'mother', // the belt level's (content/text/campaign-belt.md); its ambush2 line is a hint, not a call
    'camp.say.relicon': 'relic', 'camp.say.delivered': 'convoy', 'camp.say.cache': 'cache', 'camp.say.shieldlow': 'shields', 'camp.say.enginelow': 'engines'
  },
  earth: ['carrier', 'fighter', 'escort', 'freighter'] // the kinds on Earth's side: anything else that blows up is theirs (splash)
};

// the setting: read once (a lazy read, inside try: storage is optional), kept when it is set
function chatterMode() {
  if (!CHATTER.loaded) {
    CHATTER.loaded = true;
    try { const m = localStorage.getItem(CHATTER.key); CHATTER.mode = CHATTER_MODES.some(x => x[0] === m) ? m : 'quiet'; } catch (e) { CHATTER.mode = 'quiet'; }
  }
  return CHATTER.mode;
}
function chatterSetMode(m) {
  if (!CHATTER_MODES.some(x => x[0] === m)) return false;
  CHATTER.mode = m; CHATTER.loaded = true;
  try { localStorage.setItem(CHATTER.key, m); } catch (e) { /* storage is optional */ }
  return true;
}

function chatterNew() { return { last: -1e9, hold: -1e9, at: {}, q: [], pilot: -1, line: {} }; }

// which call a sim event is. The carrier's own hits are the computer's to warn about (hull half, critical), so only the wing's are "taking fire"
function chatterEventOf(C, e) {
  if (!e) return null;
  if (e.type === 'boom') return CHATTER.earth.includes(e.kind) ? null : 'splash';
  if (e.type === 'hit') { const u = ((C && C.ships) || []).find(s => s.id === e.id); return u && u.team === 'earth' && (u.kind === 'fighter' || u.kind === 'escort') ? 'hit' : null; }
  if (e.type === 'say') return CHATTER.says[e.key] || null;
  if (e.type === 'missile') return C && typeof C.missiles === 'number' && C.missiles <= 1 ? 'lowmissiles' : null;
  if (e.type === 'ore') return 'ore';
  return null;
}

// the orders given since the last look (C.orders counts each one that was carried out, from a key, the strip or the map): the wing answers the first, a recall with "going home"
function chatterOrderDiff(seen, orders) {
  const out = [], up = k => seen && orders && (orders[k] | 0) > (seen[k] | 0);
  if (['launch', 'attack', 'escort', 'guard'].some(up)) out.push('copy');
  if (up('recall')) out.push('home');
  return out;
}

// the scene's one call for each sim event: the computer's own lines hold the radio, the rest may be a call. A stand-in scene with no radio (a test's) hears nothing
function chatterHear(sc, e) {
  if (!sc || !sc.radio || !e) return;
  const now = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
  if (e.type === 'say') chatterHold(sc.radio, now);
  const ev = chatterEventOf(sc.camp, e); if (ev) chatterPush(sc.radio, ev, now);
}

function chatterHold(S, now) { if (S) S.hold = now + CHATTER.hold; }

// the lines of a call: camp.chat.<call>.1, .2, ... in content/text/chatter.md
function chatterPool(ev) {
  const out = [];
  for (let i = 1; i < 20; i++) { const k = 'camp.chat.' + ev + '.' + i, t = uiText(k); if (t === k) break; out.push(t); }
  return out;
}

function chatterPush(S, ev, now) {
  const mode = chatterMode(), def = CHATTER.events[ev];
  if (!S || !def || mode === 'off') return false;
  if (S.q.length) return false;                                          // one at a time: nothing is queued behind a call
  if (now - (S.at[ev] === undefined ? -1e9 : S.at[ev]) < CHATTER.same[mode]) return false;
  const due = now + def.delay;
  if (due - S.last < CHATTER.gap[mode]) return false;                    // one line in 8 s (Quiet)
  S.at[ev] = now; S.q.push({ ev, due });
  return true;
}

function chatterTick(S, now, busy) {
  if (!S || !S.q.length || now < S.q[0].due) return null;
  const p = S.q.shift(), mode = chatterMode();
  if (now > p.due + CHATTER.show) return null;                           // stale (the game was paused or held): not worth saying
  if (mode === 'off' || busy || now < S.hold) return null;              // the computer, a warning or any line has the radio: this call is dropped, not kept
  if (now - S.last < CHATTER.gap[mode]) return null;
  const pool = chatterPool(p.ev); if (!pool.length) return null;
  S.pilot = (S.pilot + 1) % CHATTER.pilots.length;                       // the pilots take turns: never the same voice twice in a row
  let i = Math.floor(Math.random() * pool.length);
  if (pool.length > 1 && i === S.line[p.ev]) i = (i + 1) % pool.length; // and the same line is not said twice running
  S.line[p.ev] = i; S.last = now;
  const pl = CHATTER.pilots[S.pilot];
  return { ev: p.ev, call: pl[0], voice: pl[1], text: pool[i] };
}

// said in the pilot's voice at prio 0: voiceSay drops it when anything is playing, and it is never queued; false when there is no voice (the scene shows the words anyway)
function chatterPlay(line) {
  if (!line || typeof voiceSay !== 'function') return false;
  try { return !!voiceSay(line.text, 0, line.voice); } catch (e) { return false; }
}
