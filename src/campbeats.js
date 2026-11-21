// ---------- Campaign: the beats of mission 1.1 (card space-game-l1-1-beats; Troy, 21 Nov 2026) ----------
// Troy found 1.1 boring: lots of flying and fights that were not his. It is now the one finished example of the fleet-command systems, four beats about a minute apart, each a place for the player to direct
// the fleet (docs/CAMPAIGN.md "Mission 1.1 in four beats"). The pure half (no Phaser, no page; tests/campbeats.mjs runs it in Node). The beats are mission DATA; what is here is what the data needs:
//   1  Leaving Luna: a patrol of two flies with the transport and turns back at the edge of safe space.  traffic: [{ kind: 'patrol', escort: { convoy: 't1', until: 0.12, say } }]  (campPatrolAI, src/camppirates.js)
//   2  The distress call: a miner works off the route; at a share of the road a wave of pirates falls on it and the pilots ask for orders (an order call, src/camporders.js): send the fighters, send the whole
//      wing (the transport is left to the cruiser), or stay. A wave row says  beat: 'distress', victim: '<traffic id>', thanks: 40 (the ore a saved miner gives) and a cue  { name: 'distress', on: { lane } }.
//   3  The ambush: a lane's wave with fighters and torpedo boats (src/camproute.js, src/camptorpedo.js): the fork and a scout can find it first.
//   4  The pirate leader: a rival ship near Ceres (src/camprival.js): kill it (the bonus), or get her past.
//   campBeatsNew(C)            at campNew: C.beats = { patrolSaid, asked, thanked }
//   campBeats(C)               each tick: the pirates wear a crippled miner down (the wave row's `harry`: hit points a second for each pirate within CAMP_BEATS.harryNear of it), and a miner that was saved gives its thanks (once: the ore, the radio)
//   CAMP_CALL_TYPES / CAMP_CALL_FX  get the scripted call `distress` (rescue, rescueall, stay) when src/camporders.js is there; campBeats opens it (campCallStart)
//   campBeatKey(id)            the key a hint names, from the key table (CAMP_PANELS: fleet, ship, systems; the Campaign's CONTROLS rows: map, scout, take), never a letter of its own
//   campBeatHint(C, id)        the words of a hint with its keys in them (camp.hint.<id>)            campBeatNudge(C, shown)  the hint that is due (CAMPBEATHINTS), which campNudge (src/campnudge.js) asks for

const CAMP_BEATS = { harryNear: 700 }; // px: a pirate this near the crippled miner is on it
function campBeatsNew(C) { C.beats = { patrolSaid: false, asked: false, thanked: false }; return C.beats; }

// the key of a panel or of a map key, as the key table says it (the panels move: nothing here names a letter)
function campBeatKey(id) {
  const P = typeof CAMP_PANELS === 'object' && CAMP_PANELS.panels.find(p => p.id === id); if (P) return P.key;
  const rows = ((typeof CONTROLS === 'object' && CONTROLS.find(c => c.id === 'campaign')) || { rows: [] }).rows;
  const pick = re => rows.find(r => re.test(r.t));
  if (id === 'map') { const r = pick(/Open or close the map/); return r ? r.k[0] : 'Tab'; }
  if (id === 'scout') { const r = pick(/scout/i); return r ? r.k[0] : 'V'; }
  if (id === 'take') { const r = pick(/scout/i); return r && r.k[1] ? r.k[1] : 'T'; }
  return '';
}
const campBeatKeys = () => ({ fleet: campBeatKey('fleet'), ship: campBeatKey('ship'), systems: campBeatKey('systems'), map: campBeatKey('map'), scout: campBeatKey('scout'), take: campBeatKey('take') }); // every key a line may name, as the table says it
const campBeatHint = (C, id) => uiText('camp.hint.' + id, campBeatKeys());

// beat 2: the thanks of a miner that was saved
function campBeats(C) {
  const B = C.beats; if (!B || B.thanked || !C.cues || C.cues.distress == null) return;
  const w = C.L.waves.findIndex(x => x.beat === 'distress'); if (w < 0 || !C.waves[w] || !C.waves[w].started) return;
  const wv = C.L.waves[w], m = C.ships.find(u => u.team === 'neutral' && u.hp > 0 && u.tid === wv.victim);
  if (!m) { B.thanked = true; return; } // the miner is lost: no thanks
  const foes = C.ships.filter(u => u.team === 'alien' && u.hp > 0 && u.wave === w);
  if (!B.asked && foes.length && typeof campCallStart === 'function' && campCallStart(C, 'distress', { who: m.id, ids: campCallIds(foes, m, 3) })) B.asked = true; // the pilots ask for orders (a call that waits is not interrupted: it is tried again)
  if (wv.harry > 0 && foes.length) { const near = foes.filter(u => campDist(u, m) < CAMP_BEATS.harryNear).length; if (near) campHurt(C, m, wv.harry * Math.min(near, 3) * (C.dt || 1 / 30), foes[0].id); } // the pirates have him: a crippled miner is wasted, hit points a second for each pirate about him, a shot cannot be counted on to hit a ship that sits still
  if (foes.length) return; // the pirates are still at it
  B.thanked = true; const ore = wv.thanks | 0;
  if (ore > 0) C.ore = Math.min(CAMP.ore.cap, C.ore + ore);
  C.events.push({ type: 'thanks', id: m.id, ore, x: m.x, y: m.y }); campSay(C, 'camp.say.thanks', { ore });
}

// beat 2 as an order call: a type with scripted: true (src/camporders.js): its trigger is never asked, campBeats opens it with campCallStart when the pirates have fallen on the miner
if (typeof CAMP_CALL_TYPES === 'object' && typeof CAMP_CALL_FX === 'object' && !CAMP_CALL_TYPES.some(t => t.id === 'distress')) {
  CAMP_CALL_FX.rescue = { do: campCallAt('fighters', 'attack') };                // the fighters go for the pirates at the miner
  CAMP_CALL_FX.rescueall = { do: campCallAt('all', 'attack') };                  // everyone goes: the transport is left to the cruiser's turrets
  CAMP_CALL_FX.stay = { do: () => true };                                         // nothing is done: the wing stays with the transport
  CAMP_CALL_TYPES.push({ id: 'distress', scripted: true, pick: ['rescue', 'rescueall', 'stay'], def: 2 });
}

// the hints of the mission: plain data like src/campnudge.js's, but each is `wait`ed for until `until` (it shows when it is true, not only at its second), and its words carry keys from the key table.
// campNudge (src/campnudge.js) asks for one when it has none of its own to give; each is shown once, in 1.1 only
const CAMPBEATHINTS = [
  { id: 'b-scout', at: 14, until: 55, hint: 'scout', when: C => C.orders.scout === 0 && !C.route.lane && !C.route.passed },
  { id: 'b-fast', at: 24, until: 120, hint: 'fast', when: C => !(C.nav && C.nav.on) && !C.route.passed && !campAliens(C).length && !!C.carrier && !!campConvoys(C)[0] && campDist(C.carrier, campConvoys(C)[0]) > 2500 },
  { id: 'b-tuck', at: 60, until: 400, hint: 'tuck', when: C => typeof campTorpedoBoats === 'function' && campTorpedoBoats(C).some(u => !u.running) && typeof campConvoyState === 'function' && campConvoyState(C) !== 'tuck' }, // torpedo boats about: tuck the transport in under the shield (src/campconvoy.js)
  { id: 'b-run', at: 60, until: 400, hint: 'run', when: C => !!campRivalOf(C, 'leader') && typeof campConvoyState === 'function' && campConvoyState(C) !== 'run' }, // the leader is out: run the transport past it
  { id: 'b-take', at: 50, until: 140, hint: 'take', when: C => !C.route.lane && !C.route.passed && !!campRouteHolding(C) }
];
function campBeatNudge(C, shown) {
  try {
    if (!C || C.result || !shown || C.level !== 1 || !C.route || C.L.mid !== 'escort') return null;
    for (const h of CAMPBEATHINTS) {
      if (shown[h.id] || C.t < h.at * 1000) continue;
      if (!h.when(C)) { if (C.t >= h.until * 1000) shown[h.id] = true; continue; } // not true yet: it waits; its time is up, it is never shown
      shown[h.id] = true; return campBeatHint(C, h.hint);
    }
  } catch (e) { /* a hint is a nicety */ }
  return null;
}
