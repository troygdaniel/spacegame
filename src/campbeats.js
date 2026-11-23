// ---------- Campaign: the beats of mission 1.1 (card space-game-l1-1-beats; Troy, 21 Nov 2026) ----------
// Troy found 1.1 boring: lots of flying and fights that were not his. It is now the one finished example of the fleet-command systems, four beats about a minute apart, each a place for the player to direct
// the fleet (docs/CAMPAIGN.md "Mission 1.1 in four beats"). The pure half (no Phaser, no page; tests/campbeats.mjs runs it in Node). The beats are mission DATA; what is here is what the data needs:
//   1  Leaving Luna: a patrol of two flies with the transport and turns back at the edge of safe space.  traffic: [{ kind: 'patrol', escort: { convoy: 't1', until: 0.12, say } }]  (campPatrolAI, src/camppirates.js)
//   2  The distress call: a miner works off the road; at a share of the road a wave of pirates falls on it and the radio says so, one plain line (the wave row's `say`). No pop-up asks what to do (card space-game-no-pilot-popups,
//      Troy, 23 Nov 2026): the player sends help with the ordinary order keys. A wave row says  beat: 'distress', victim: '<traffic id>', thanks: 40 (the ore a saved miner gives) and a cue  { name: 'distress', on: { lane } }.
//   3  The ambush: a wave on the road with fighters and torpedo boats (src/camptorpedo.js). (The road used to fork here, with the ambush on the short lane: cut by card space-game-cut-lane-fork, Troy 22 Nov 2026.)
//   4  The pirate leader: a rival ship near Ceres (src/camprival.js): kill it (the bonus), or get her past.
//   campBeatsNew(C)            at campNew: C.beats = { patrolSaid, thanked }
//   campBeats(C)               each tick: the pirates wear a crippled miner down (the wave row's `harry`: hit points a second for each pirate within CAMP_BEATS.harryNear of it), and a miner that was saved gives its thanks (once: the ore, the radio)
//   campBeatKey(id)            the key a hint names, from the key table (CAMP_PANELS: fleet, ship; the Campaign's CONTROLS rows: map), never a letter of its own
//   campBeatHint(C, id)        the words of a hint with its keys in them (camp.hint.<id>)            campBeatNudge(C, shown)  the hint that is due (CAMPBEATHINTS), which campNudge (src/campnudge.js) asks for

const CAMP_BEATS = { harryNear: 700 }; // px: a pirate this near the crippled miner is on it
function campBeatsNew(C) { C.beats = { patrolSaid: false, thanked: false }; return C.beats; }

// the key of a panel or of a map key, as the key table says it (the panels move: nothing here names a letter)
function campBeatKey(id) {
  const P = typeof CAMP_PANELS === 'object' && CAMP_PANELS.panels.find(p => p.id === id); if (P) return P.key || (typeof campKeyPath === 'function' ? campKeyPath(id) : ''); // a list with no key of its own (the convoy's) is reached through the fleet list: 'Q, Convoy'
  const rows = ((typeof CONTROLS === 'object' && CONTROLS.find(c => c.id === 'campaign')) || { rows: [] }).rows;
  const pick = re => rows.find(r => re.test(r.t));
  if (id === 'map') { const r = pick(/Open or close the map/); return r ? r.k[0] : 'Tab'; }
  return '';
}
const campBeatRow = id => { const r = typeof campKeyRow === 'function' ? campKeyRow(id) : null; return r ? r.label : ''; }; // the words of a row of the fleet list, as the list says them ("Convoy: tuck in")
const campBeatKeys = () => ({ fleet: campBeatKey('fleet'), ship: campBeatKey('ship'), convoy: campBeatKey('convoy'), map: campBeatKey('map'), tuck: campBeatRow('ctuck'), run: campBeatRow('crun') }); // every key a line may name, as the key table says it (the lists' own are {fleetkey} {rowlaunch} ... of src/data_controls.js campKeyVar)
const campBeatHint = (C, id) => uiText('camp.hint.' + id, campBeatKeys());

// beat 2: the thanks of a miner that was saved
function campBeats(C) {
  const B = C.beats; if (!B || B.thanked || !C.cues || C.cues.distress == null) return;
  if (!campFlag('distress')) { B.thanked = true; return; } // the distress call is switched off (the tuning panel): no call, no thanks (the wave scheduler, src/campaign.js, makes no pirates for the beat's wave)
  const w = C.L.waves.findIndex(x => x.beat === 'distress'); if (w < 0 || !C.waves[w] || !C.waves[w].started) return;
  const wv = C.L.waves[w], m = C.ships.find(u => u.team === 'neutral' && u.hp > 0 && u.tid === wv.victim);
  if (!m) { B.thanked = true; return; } // the miner is lost: no thanks
  const foes = C.ships.filter(u => u.team === 'alien' && u.hp > 0 && u.wave === w);
  if (wv.harry > 0 && foes.length) { const near = foes.filter(u => campDist(u, m) < CAMP_BEATS.harryNear).length; if (near) campHurt(C, m, wv.harry * Math.min(near, 3) * (C.dt || 1 / 30), foes[0].id); } // the pirates have him: a crippled miner is wasted, hit points a second for each pirate about him, a shot cannot be counted on to hit a ship that sits still
  if (foes.length) return; // the pirates are still at it
  B.thanked = true; const ore = wv.thanks | 0;
  if (ore > 0) C.ore = Math.min(CAMP.ore.cap, C.ore + ore);
  C.events.push({ type: 'thanks', id: m.id, ore, x: m.x, y: m.y }); campSay(C, 'camp.say.thanks', { ore });
}

// the hints of the mission: plain data like src/campnudge.js's, but each is `wait`ed for until `until` (it shows when it is true, not only at its second), and its words carry keys from the key table.
// campNudge (src/campnudge.js) asks for one when it has none of its own to give; each is shown once, in 1.1 only
const CAMPBEATHINTS = [
  { id: 'b-fast', at: 24, until: 120, hint: 'fast', when: C => !(C.nav && C.nav.on) && campLane(C) < 0.2 && !campAliens(C).length && !!C.carrier && !!campConvoys(C)[0] && campDist(C.carrier, campConvoys(C)[0]) > 2500 }, // (the first fifth of the road only: it was "before the fork" while 1.1 had one)
  { id: 'b-tuck', at: 60, until: 400, hint: 'tuck', when: C => typeof campTorpedoBoats === 'function' && campTorpedoBoats(C).some(u => !u.running) && typeof campConvoyState === 'function' && campConvoyState(C) !== 'tuck' }, // torpedo boats about: tuck the transport in under the shield (src/campconvoy.js)
  { id: 'b-run', at: 60, until: 400, hint: 'run', when: C => !!campRivalOf(C, 'leader') && typeof campConvoyState === 'function' && campConvoyState(C) !== 'run' } // the leader is out: run the transport past it
];
function campBeatNudge(C, shown) {
  try {
    if (!C || C.result || !shown || C.level !== 1 || C.L.mid !== 'escort') return null;
    for (const h of CAMPBEATHINTS) {
      if (shown[h.id] || C.t < h.at * 1000) continue;
      if (!h.when(C)) { if (C.t >= h.until * 1000) shown[h.id] = true; continue; } // not true yet: it waits; its time is up, it is never shown
      shown[h.id] = true; return campBeatHint(C, h.hint);
    }
  } catch (e) { /* a hint is a nicety */ }
  return null;
}
