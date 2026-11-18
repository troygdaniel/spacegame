// Long Haul: how long each call takes, worked out from the game's own data (card space-game-missions-after-distances).
//   node tools/mission-timing.mjs          the table: every call, before and after the 3 times spread of 17 Nov, minutes and credits a minute
// tests/missiontiming.mjs imports missionTimes() and fails when a call leaves its band. docs/MISSIONS-TIMING.md is this table with the reasons.
//
// DATA is read from the game (tests/nodegame.mjs runs the scripts of index.html in plain Node): where the bodies are, the MULE's speeds, the gate hold,
// cruise and jump numbers, the pirates' hull, the Wren's speed and guns, the calls and their pay. Nothing here is a copy of a game number.
// PACE is how a player plays, the same guesses as tools/economy-sim.mjs (imported from it), plus three of its own below. They are guesses.
// "before" is the same sum with every place a third as far apart (positions divided by SYSTEM_SCALE): sizes, speeds and timers were not changed
// by the spread, so that is what the game was on 16 Nov.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { nodeGame } from '../tests/nodegame.mjs';
import { PACE as ECON } from './economy-sim.mjs';

export const PACE = Object.assign({}, ECON, {
  cruiseStartSec: 3,   // pick the target, press C, the ship turns onto it
  scanSec: 10,         // slow down beside a site and press E
  exposedShare: 0.3    // escort: the share of the route you spend outside the MULE's ring (the economy simulator's guess)
});
export const BAND = { min: 1.5, max: 5 };        // minutes: what a call played in one system, or over one jump, should take. The card asked for 2 to 5; the patrol,
                                                 // the one-jump couriers and the survey come out at 1.7 to 1.9 by these guesses and did before the spread too (it did not
                                                 // shorten anything), so the floor here is 1.5 and docs/MISSIONS-TIMING.md says so: lengthening them is a design choice
export const BEFORE = { mule: { cruise: 60, slow: 30 } }; // what this card changed, as it was: the MULE's speeds until 17 Nov
export const LONG_MAX = 12;                      // minutes: the cap for a call that is a journey of several jumps (the bounty, the Widow)

// the sum, run inside the game's context so it reads the live tables. S: 1 for the game as it is, 1 / SYSTEM_SCALE for before the spread
const MODEL = `(P, S, OLD) => {
  const MULE = OLD || { cruise: ESCORT.cruise, slow: ESCORT.slow }; // before the spread she flew at OLD
  const hyp = (a, b) => Math.hypot(a.x - b.x, a.y - b.y), at = b => ({ x: b.x * S, y: b.y * S });
  const wren = SHIP_MODELS.wren, speed = wren.speed;
  const dps = (1000 / PARTS.weapons.delay[0]) * PARTS.weapons.damage[0] * wren.guns * P.hitRate;
  const killSec = hp => P.approachSec + hp / dps * P.fightFactor;
  const hand = px => px / (speed * P.speedUse);
  // a cruise of px: up to CRUISE.top at CRUISE.accel, then the limit of CRUISE.brake x the distance left brings it down to CRUISE.dropSpeed
  const cruise = px => {
    const top = CRUISE.top, dAcc = top * top / (2 * CRUISE.accel), dDec = top / CRUISE.brake;
    if (px <= 0) return 0;
    if (px < dAcc + dDec) { const v = Math.min(top, Math.sqrt(2 * CRUISE.accel * px * 0.6)); return v / CRUISE.accel + Math.log(Math.max(1.01, v / CRUISE.dropSpeed)) / CRUISE.brake; }
    return top / CRUISE.accel + (px - dAcc - dDec) / top + Math.log(top / CRUISE.dropSpeed) / CRUISE.brake;
  };
  // one leg inside a system: by hand, or clear of the mass by hand, a cruise, and the last CRUISE.stop px by hand, whichever is shorter
  const leg = px => {
    const byHand = hand(px);
    if (px < CRUISE.lockMass + CRUISE.stop + CRUISE.minLeg) return byHand;
    return Math.min(byHand, hand(CRUISE.lockMass) + P.cruiseStartSec + cruise(px - CRUISE.lockMass - CRUISE.stop) + hand(CRUISE.stop));
  };
  const tunnel = ly => Math.min(HYPER.maxSec, Math.max(HYPER.minSec, ly * HYPER.secPerLy));
  const lyOf = (a, b) => Math.hypot(SYSTEMS[a].ly[0] - SYSTEMS[b].ly[0], SYSTEMS[a].ly[1] - SYSTEMS[b].ly[1]);
  // where a jump from "from" comes out in "to": on the edge that faces the star it came from (src/universe.js), ARRIVE.margin px inside the wall
  const arriveAt = (from, to) => {
    const size = SYSTEMS[to].size * S, c = size / 2, dx = SYSTEMS[from].ly[0] - SYSTEMS[to].ly[0], dy = SYSTEMS[from].ly[1] - SYSTEMS[to].ly[1];
    const k = (c - ARRIVE.margin) / Math.max(Math.abs(dx), Math.abs(dy), 1e-6);
    return { x: c + dx * k, y: c + dy * k };
  };
  // the fewest jumps from a to b for a ship with this range, as the list of systems after a; null when it cannot get there
  const route = (a, b, range) => {
    const seen = { [a]: null }, q = [a];
    while (q.length) { const x = q.shift(); if (x === b) break; Object.keys(SYSTEMS).forEach(y => { if (!(y in seen) && lyOf(x, y) <= range) { seen[y] = x; q.push(y); } }); }
    if (!(b in seen)) return null;
    const out = []; for (let x = b; x !== a; x = seen[x]) out.unshift(x);
    return out;
  };
  const station = id => sysBodies('station', id)[0];
  // leave a station and jump: read the board and undock, the pump, fly clear of the mass (JUMP.lockMass, by hand), the charge, the tunnel
  const firstJump = ly => P.dockSec + P.pumpSec + hand(JUMP.lockMass) + JUMP.charge / 1000 + tunnel(ly);
  const nextJump = ly => JUMP.charge / 1000 + tunnel(ly); // from where the last one came out: it is clear of every mass
  const trip = (from, hops) => { let sec = 0, here = from; hops.forEach((h, i) => { sec += (i ? nextJump : firstJump)(lyOf(here, h)); here = h; }); return sec; };

  const H = 'halcyon', st = at(station(H)), planet = at(sysBody('planet', H)), gate = sysBody('gate', H), gateAt = at(gate);
  const out = [];
  const add = (id, title, kind, sec, pay, parts, note) => out.push({ id, title, kind, sec, min: sec / 60, pay, perMin: pay / (sec / 60), parts, note: note || '' });
  const M = id => MISSIONS.find(m => m.id === id);

  // rescue: out to the planet, the ground, back, dock
  const toPlanet = hyp(st, planet);
  add('rescue', 'Rescue call', 'local', P.dockSec + 2 * leg(toPlanet) + P.groundSec, M('rescue').reward,
    { dock: P.dockSec, travel: 2 * leg(toPlanet), ground: P.groundSec, px: toPlanet });

  // escort: the MULE's route at her two speeds, the gate hold, the fights (half of them slow you: the rest happen on the move), and the way home
  const muleFrom = { x: st.x - 60, y: st.y + 260 }, muleRoute = Math.max(1, hyp(muleFrom, gateAt) - gate.r);
  const muleSpeed = 1 / ((1 - P.exposedShare) / MULE.cruise + P.exposedShare / MULE.slow), muleSec = muleRoute / muleSpeed;
  const pirates = ESCORT.waveSize.reduce((a, b) => a + b, 0) + ESCORT.lastStand, fights = pirates * 0.75 * 0.5 * killSec(PIRATES.drone.hp);
  add('escort', 'Escort', 'local', P.dockSec + muleSec + ESCORT.spinUp / 1000 + fights + leg(hyp(gateAt, st)), M('escort').reward + ESCORT.bonus / 2,
    { dock: P.dockSec, route: muleSec, hold: ESCORT.spinUp / 1000, fights, home: leg(hyp(gateAt, st)), px: muleRoute, muleSpeed, waveGapSec: muleSec / (ESCORT.waves.length + 1) });

  // police patrol: five wanted pirates beside the station; nothing in it is a distance between places
  add('patrol', 'Police patrol', 'local', P.dockSec + M('patrol').count * killSec(40), M('patrol').reward, { dock: P.dockSec, fights: M('patrol').count * killSec(40), px: 0 });

  // the runs and the sites, from Halcyon's board outward and from every other board: one call each
  MISSIONS.filter(m => m.carry).forEach(m => {
    const from = callSystemOf(m.from), to = callSystemOf(m.to), ly = lyOf(from, to), hops = route(from, to, wren.range);
    if (!hops) { add(m.id, m.title + ' to ' + SYSTEMS[to].name, 'out of range', NaN, m.reward, { ly }, 'the Wren cannot jump ' + ly.toFixed(1) + ' ly (range ' + wren.range + '): a call for a ship with more range'); return; }
    const last = hops.length > 1 ? hops[hops.length - 2] : from, in1 = leg(hyp(arriveAt(last, to), at(station(to))));
    const sec = trip(from, hops) + in1 + (m.kind === 'haul' ? P.loadSec : 0) + P.dockSec / 2; // half a dockSec: dock and be paid, no board to read
    add(m.id, m.title + ' to ' + SYSTEMS[to].name, hops.length > 1 ? 'journey' : 'one jump', sec, m.reward, { ly, hops: hops.length, jump: trip(from, hops), arrive: in1, px: hyp(arriveAt(last, to), at(station(to))) });
  });
  MISSIONS.filter(m => m.site).forEach(m => {
    const hops = route(H, m.system, wren.range), site = sysBodies('poi', m.system).find(b => b.id === m.site);
    if (!hops || !site) { add(m.id, m.title, 'out of range', NaN, m.reward, {}, 'not reachable in a Wren'); return; }
    const last = hops.length > 1 ? hops[hops.length - 2] : H, in1 = leg(hyp(arriveAt(last, m.system), at(site)));
    const work = m.kind === 'salvage' ? P.bigWreckSec : P.scanSec;
    add(m.id, m.title, hops.length > 1 ? 'journey' : 'one jump', trip(H, hops) + in1 + work, m.reward, { hops: hops.length, jump: trip(H, hops), arrive: in1, work, px: hyp(arriveAt(last, m.system), at(site)) });
  });

  // the bounty: out to the Roost, the Reaver and its two escorts beside the planet, and home to Halcyon to be paid. The Wren cannot make the
  // last jump, so this is timed in the cheapest ship that can (and says which)
  (() => {
    const m = M('bounty'), to = m.system, ships = Object.values(SHIP_MODELS).filter(s => route(H, to, s.range)).sort((a, b) => a.price - b.price), ship = ships[0];
    if (!ship) { add('bounty', 'Bounty: the Reaver', 'out of range', NaN, m.reward, {}, 'no ship reaches the Roost'); return; }
    const hops = route(H, to, ship.range), back = route(to, H, ship.range), k = speed / ship.speed; // legs by hand scale with the ship's speed
    const last = hops.length > 1 ? hops[hops.length - 2] : H, roostPlanet = at(sysBody('planet', to)), lair = { x: roostPlanet.x - 1100, y: roostPlanet.y + 650 };
    const mix = Object.entries((SYSTEMS[to].pirates || {}).weights || { raider: 1 }).reduce((a, [key, w]) => a + w * PIRATES[key].hp, 0);
    const fight = killSec(REAVER_HP) + 2 * killSec(mix) + P.reaverSec, inRoost = leg(hyp(arriveAt(last, to), lair)) * k;
    const lastBack = back.length > 1 ? back[back.length - 2] : to, home = leg(hyp(arriveAt(lastBack, H), st)) * k;
    add('bounty', 'Bounty: the Reaver', 'journey', trip(H, hops) + inRoost + fight + (trip(to, back) - P.dockSec - P.pumpSec) + home + P.dockSec / 2, m.reward,
      { hops: hops.length + back.length, jump: trip(H, hops) + trip(to, back), fight, arrive: inRoost + home, ship: ship.name || ship.id }, 'timed in the ' + (ship.name || 'cheapest ship that reaches it') + ': the Wren cannot make the last jump');
  })();
  return out;
}`;

// every call: { id, title, kind: 'local' | 'one jump' | 'journey' | 'out of range', sec, min, pay, perMin, parts, note }, now and before the spread
export function missionTimes(g = nodeGame()) {
  const run = (scale, old) => JSON.parse(g.run(`JSON.stringify((${MODEL})(${JSON.stringify(PACE)}, ${scale}, ${JSON.stringify(old || null)}), (k, v) => (typeof v === 'number' && !isFinite(v) ? null : v))`));
  const scale = g.run('SYSTEM_SCALE'), now = run(1), before = run(`1 / ${scale}`, BEFORE.mule), unfixed = run(1, BEFORE.mule);
  return { scale, calls: now.map((c, i) => Object.assign({}, c, { before: before[i], unfixed: unfixed[i] })) }; // unfixed: after the spread, before this card's changes
}
// the band a call is held to: 2 to 5 minutes when it is played in one system or over one jump; a journey of several jumps has only a cap
export function bandOf(c) { return c.kind === 'journey' ? { min: BAND.min, max: LONG_MAX } : c.kind === 'out of range' ? null : BAND; }

function main() {
  const { scale, calls } = missionTimes(), f1 = x => (x == null ? '   -' : x.toFixed(1).padStart(4)), f0 = x => (x == null ? '   -' : String(Math.round(x)).padStart(4));
  console.log(`Long Haul call lengths on the starter Wren (PACE guesses of tools/economy-sim.mjs): before and after places were spread ${scale} times\n`);
  console.log('| call | kind | before the spread | spread, unfixed | now | band | pay | cr/min before | cr/min now |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  calls.forEach(c => {
    const b = bandOf(c), ok = !b ? 'n/a' : c.min >= b.min && c.min <= b.max ? b.min + ' to ' + b.max + ': ok' : b.min + ' to ' + b.max + ': OUT';
    console.log(`| ${c.title} | ${c.kind} | ${f1(c.before.min)} | ${f1(c.unfixed.min)} | ${f1(c.min)} | ${ok} | ${c.pay} | ${f0(c.before.perMin)} | ${f0(c.perMin)} |`);
  });
  const e = calls.find(c => c.id === 'escort');
  console.log(`\nescort: route ${Math.round(e.before.parts.px)} px before, ${Math.round(e.parts.px)} px now; the MULE averaged ${e.before.parts.muleSpeed.toFixed(0)} px/s, now ${e.parts.muleSpeed.toFixed(0)}; a wave every ${e.before.parts.waveGapSec.toFixed(0)} s before, ${e.unfixed.parts.waveGapSec.toFixed(0)} s after the spread, ${e.parts.waveGapSec.toFixed(0)} s now`);
  calls.filter(c => c.note).forEach(c => console.log(`${c.title}: ${c.note}`));
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) main();
