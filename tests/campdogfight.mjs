// smoke: the Campaign's DOGFIGHTS (card space-game-fighter-dogfights; Troy, 21 Nov 2026), in plain Node, no Chrome: the fighters (the wing's and the aliens' raiders) fly like Vipers, one on one, and the fights last
//   A. the table CAMP.dog and the file loads                  B. the flight: the engine along the nose, retro and side a share of it, the drag, the fast turn
//   C. the moves: approach, attack, break (past it), flip (target behind), jink (its nose on me), each with its time; the aim leads a crossing target
//   D. the pairs: one on one, the nearest first, held until a ship is lost, nothing random      E. who flies it: not a gunship, the mothership, Earth or the carrier; a stance or a named target wins
//   F. the fights in the sim: they end (a fight of the old pirate steering went on and on), last a good while, show flips and breaks, repeat exactly for a seed, and are one on one
//   G. the pictures: the fighter and the raider are drawn with three engines in a row at the stern, the engine flames of the raider are three
// Run: node tests/campdogfight.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
g.run('CAMP.pilotStrength = 3;'); // the duels of this suite are one lone fighter against one pirate: a pilot as strong as one fighter (card space-game-three-pilots: the game's pilots are 3, 3 and 2 times that)
g.run('CAMP.pace.fight = 1'); // this suite pins the dogfight's own moves (how often a ship flips, breaks and jinks, how long a duel lasts) at the pace's own numbers: the fight pace of card space-game-slower-fights (0.5: every duel twice as long, so a third of these pins would move for a reason that is not the dogfight) is off here, and tests/campfightpace.mjs flies a duel with it on
g.run(`CAMP.levels.duelfix = Object.assign({}, CAMP.levels[1], { missions: [] });`); // level 1's own numbers (the earth, the pirates, the scales) with none of its missions' rows
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

// ---- A. the table
console.log('A. the table');
const K = J('CAMP.dog');
check('CAMP.dog: fighters and raiders fly it; retro and side are shares of the accel; the drag keeps more than the game\'s half; a break, a flip and a jink have their times', JSON.stringify(K.kinds) === '["fighter","raider"]' && K.retro > 0 && K.retro < 1 && K.side > 0 && K.side < 1 && K.drag > 0.5 && K.drag < 1 && K.snap > 1 && K.breakOff.time.length === 2 && K.flip.time.length === 2 && K.jink.time.length === 2, JSON.stringify(K).slice(0, 160));
check('every number of the table is a finite number (or a pair of them)', (function f(o) { return Object.values(o).every(v => typeof v === 'number' ? isFinite(v) : Array.isArray(v) ? v.every(isFinite) : typeof v === 'object' ? f(v) : typeof v === 'string' ? false : true); })(Object.assign({}, K, { kinds: undefined })));
check('the functions are there: campDogSteer, campDogMove, campDogPair, campDogFoe, campDogOn, campDogLead', ['campDogSteer', 'campDogMove', 'campDogPair', 'campDogFoe', 'campDogOn', 'campDogLead', 'campDogThreat'].every(n => J(`typeof ${n}`) === 'function'));

// ---- B. the flight
console.log('B. the flight');
g.run(`window.__ship = (rot, o) => Object.assign({ x: 0, y: 0, vx: 0, vy: 0, rot, accel: 400, vmax: 1000, turn: 3, kind: 'fighter', team: 'earth' }, o || {});
window.__push = (ang, rot, o, m) => { const u = __ship(rot, o); campDogMove({}, u, Object.assign({ ang, face: rot, thrust: 1, snap: false }, m || {}), 0.01); return u; };`);
const fwd = J('(() => { const u = __push(0, 0); return [u.vx, u.vy]; })()'), back = J('(() => { const u = __push(Math.PI, 0); return [u.vx, u.vy]; })()'), side = J('(() => { const u = __push(Math.PI / 2, 0); return [u.vx, u.vy]; })()');
const drag1 = Math.pow(K.drag, 0.01);
check('pushed along the nose it gains the whole accel (less the drag of the step)', near(fwd[0], 400 * 0.01 * drag1, 1e-9) && near(fwd[1], 0, 1e-9), JSON.stringify(fwd));
check('pushed straight back it has only CAMP.dog.retro of the accel: to stop, the nose must come round and the main engine burn', near(back[0], -400 * K.retro * 0.01 * drag1, 1e-9), JSON.stringify(back));
check('pushed sideways it has only CAMP.dog.side of the accel', near(side[1], 400 * K.side * 0.01 * drag1, 1e-9) && near(side[0], 0, 1e-9), JSON.stringify(side));
check('the push follows the NOSE, not the world: a ship with its nose north asked to go north gains the whole accel northwards', (() => { const v = J('(() => { const u = __push(-Math.PI / 2, -Math.PI / 2); return [u.vx, u.vy]; })()'); return near(v[1], -400 * 0.01 * drag1, 1e-9) && near(v[0], 0, 1e-9); })());
check('a push at an angle is the nose part and the side part: 45 degrees off the nose gets cos of the accel along it and sin times the side share across', (() => { const v = J('(() => { const u = __push(Math.PI / 4, 0); return [u.vx, u.vy]; })()'), c = Math.SQRT1_2; return near(v[0], 400 * 0.01 * c * drag1, 1e-9) && near(v[1], 400 * 0.01 * c * K.side * drag1, 1e-9); })());
check('thrust 0 is no push; the drag keeps the share CAMP.dog.drag of the speed after a second', (() => { const v = J('(() => { const u = __ship(0, { vx: 100 }); for (let i = 0; i < 100; i++) campDogMove({}, u, { ang: 0, face: 0, thrust: 0, snap: false }, 0.01); return u.vx; })()'); return near(v, 100 * K.drag, 1e-6); })());
check('the top speed holds', J('(() => { const u = __ship(0, { vmax: 300 }); for (let i = 0; i < 400; i++) campDogMove({}, u, { ang: 0, face: 0, thrust: 1, snap: false }, 0.01); return Math.hypot(u.vx, u.vy); })()') <= 300 + 1e-9);
const slow = J('(() => { const u = __push(0, 0, { turn: 3 }, { face: 3 }); return u.rot; })()'), fast = J('(() => { const u = __push(0, 0, { turn: 3 }, { face: 3, snap: true }); return u.rot; })()');
check('the nose turns at the ship\'s turn rate, and CAMP.dog.snap times it for a break, a flip or a jink', near(slow, 3 * 0.01, 1e-9) && near(fast, 3 * K.snap * 0.01, 1e-9), slow + ' ' + fast);

// ---- C. the moves
console.log('C. the moves');
g.run(`window.__new = seed => campNew(1, [], { seed, mission: 0, pace: 'brisk' });
window.__S = (C, u, tg) => campDogSteer(C, u, tg, 650);
window.__u = (o) => Object.assign({ x: 0, y: 0, vx: 0, vy: 0, rot: 0, hp: 20, team: 'earth', kind: 'fighter', id: 'f-1', accel: 500, vmax: 400, turn: 4, side: 1 }, o || {});
window.__t = (o) => Object.assign({ x: 300, y: 0, vx: 0, vy: 0, rot: Math.PI, hp: 20, team: 'alien', kind: 'raider', id: 'r-1' }, o || {});`);
const far = J('(() => { const C = __new(1); C.t = 1000; const u = __u(), m = __S(C, u, __t({ x: 3000 })); return [m.mode, m.fire, m.thrust, m.ang, m.face]; })()');
check('far off (over CAMP.dog.far) it flies in, burning, with the nose and the push on the target, not firing', far[0] === 'approach' && far[1] === false && far[2] === 1 && near(far[3], 0, 1e-6) && near(far[4], 0, 1e-6), JSON.stringify(far));
const atk = J('(() => { const C = __new(1); C.t = 1000; const u = __u(), m = __S(C, u, __t({ x: 400 })); return [m.mode, m.fire, m.aim, m.face, m.ang, m.thrust]; })()');
check('in the gun range it attacks: the nose on the aim, firing, the push toward the target', atk[0] === 'attack' && atk[1] === true && near(atk[2], 0, 1e-6) && near(atk[3], 0, 1e-6) && Math.abs(atk[4]) < 1e-6 && atk[5] > 0, JSON.stringify(atk));
const lead0 = J('(() => { const u = __u({ x: 0, y: 0 }), t = __t({ x: 300, y: 0, vy: 200 }); return [campDogLead(u, t, 650, 0), campDogLead(u, t, 650, 1), campDogLead(u, t, 650, 0.5)]; })()');
check('the aim leads a target that crosses: none of the lead is the line to it, all of it is ahead of it, half is between', near(lead0[0], 0, 1e-9) && lead0[1] > 0.2 && near(lead0[2], lead0[1] / 2, 1e-9), JSON.stringify(lead0));
check('and the lead is exact: a shot of that speed along that bearing meets the target', (() => { const L = J('(() => { const u = __u(), t = __t({ x: 300, y: 0, vy: 200 }); return campDogLead(u, t, 650, 1); })()'); const vx = Math.cos(L) * 650, vy = Math.sin(L) * 650; /* meets where 300 + 0 t = vx t, 200 t = vy t */ const t1 = 300 / vx; return near(vy * t1, 200 * t1, 1e-6); })());
const brk = J('(() => { const C = __new(2); C.t = 1000; const u = __u(), m = __S(C, u, __t({ x: 90 })); return [m.mode, m.fire, m.snap, u.dog.until - C.t, u.dog.side]; })()');
check('past it (inside CAMP.dog.near) it breaks away: a hard turn to one side of the line, not firing, for the time the table says', brk[0] === 'break' && brk[1] === false && brk[2] === true && brk[3] >= K.breakOff.time[0] * 1000 && brk[3] <= K.breakOff.time[1] * 1000 && Math.abs(brk[4]) === 1, JSON.stringify(brk));
check('the break turns away: the push is off the line to the target by the angle of the table, on the side it chose', J('(() => { const C = __new(2); C.t = 1000; const u = __u(), m = __S(C, u, __t({ x: 90 })), want = Math.PI - u.dog.side * CAMP.dog.breakOff.angle; return Math.abs(campWrap(m.ang - want)) < 1e-9 && Math.abs(campWrap(m.face - m.ang)) < 1e-9; })()'));
const afterBreak = J('(() => { const C = __new(2); C.t = 1000; const u = __u(), t = __t({ x: 90 }); __S(C, u, t); C.t += 5000; t.x = 700; return __S(C, u, t).mode; })()');
check('the break ends (by its time, or when it is far enough off) and the ship comes round again: attack', afterBreak === 'attack', afterBreak);
const flip = J('(() => { const C = __new(3); C.t = 5000; const u = __u({ rot: Math.PI }), m = __S(C, u, __t({ x: 250 })); return [m.mode, m.fire, m.thrust, m.snap, m.ang, m.face, u.dog.until - C.t]; })()');
check('the target is behind (the nose over CAMP.dog.flip.off away from it) and near: it flips: nose round to it at the fast turn, the main engine burning toward it, firing as it comes round', flip[0] === 'flip' && flip[1] === true && flip[2] === 1 && flip[3] === true && near(flip[4], 0, 1e-6) && near(flip[5], 0, 1e-6) && flip[6] >= K.flip.time[0] * 1000 && flip[6] <= K.flip.time[1] * 1000, JSON.stringify(flip));
const again = J('(() => { const C = __new(3); C.t = 5000; const u = __u({ rot: Math.PI }), t = __t({ x: 250 }); __S(C, u, t); C.t += (CAMP.dog.flip.time[1] + 0.1) * 1000; u.rot = Math.PI; return __S(C, u, t).mode; })()');
check('a flip is not made twice in CAMP.dog.flip.every seconds', again !== 'flip', again);
const noflip = J('(() => { const C = __new(3); C.t = 5000; const u = __u({ rot: Math.PI }), m = __S(C, u, __t({ x: 900 })); return m.mode; })()');
check('and not from far off (over its range)', noflip === 'attack', noflip);
const jink = J('(() => { let n = 0, modes = {}; for (let s = 1; s <= 60; s++) { const C = __new(s); C.t = 5000; C.dt = 1 / 30; const u = __u(), t = __t({ x: 300, rot: Math.PI }); C.ships.push(u, t); for (let i = 0; i < 90; i++) { C.t += 33; const m = __S(C, u, t); modes[m.mode] = (modes[m.mode] || 0) + 1; if (m.mode === \'jink\') { n++; break; } } } return [n, modes]; })()');
check('an enemy has its nose on it (within CAMP.dog.jink.aspect) and is near: it jinks, some of the time (not every frame: a chance a second)', jink[0] > 20 && jink[0] <= 60, JSON.stringify(jink));
const nojink = J('(() => { let n = 0; for (let s = 1; s <= 40; s++) { const C = __new(s); C.t = 5000; C.dt = 1 / 30; const u = __u(), t = __t({ x: 300, rot: 0 }); C.ships.push(u, t); for (let i = 0; i < 90; i++) { C.t += 33; if (__S(C, u, t).mode === \'jink\') { n++; break; } } } return n; })()');
check('an enemy that is not pointing at it is no reason to jink', nojink === 0, nojink);
const other = J('(() => { const C = __new(4); C.t = 5000; C.dt = 1 / 30; const u = __u(), t = __t({ x: 900, rot: 0 }), gun = __t({ x: 300, y: 80, rot: Math.PI, kind: \'gunship\', id: \'gunship-9\' }); C.ships.push(u, t, gun); let n = 0, dir = null; for (let i = 0; i < 120 && !n; i++) { C.t += 33; const m = __S(C, u, t); if (m.mode === \'jink\') { n++; dir = campWrap(m.ang - Math.atan2(gun.y - u.y, gun.x - u.x)); } } return [n, dir]; })()');
check('and it jinks from ANY enemy that has its nose on it, a gunship\'s or a drone\'s as well as its partner\'s (the hit points go to whoever hits), and aside from THAT one: the push is square to the line to it', other[0] === 1 && other[1] !== null && Math.abs(Math.abs(other[1]) - (Math.PI / 2 + 0.25)) < 1e-6, JSON.stringify(other));
check('the mothership, a tower or a hauler pointing its nose is no threat to dodge (they aim without turning, or do not shoot)', J('(() => { const C = __new(4); const u = __u({ x: 0 }); const m = __t({ x: 300, rot: Math.PI, kind: \'mother\', id: \'mother-1\' }), tw = __t({ x: 300, y: 50, rot: Math.PI, kind: \'tower\', id: \'tower-1\' }); C.ships.push(u, m, tw); return campDogThreat(C, u); })()') === null);
const rep = () => J('(() => { const C = __new(9); C.t = 5000; C.dt = 1 / 30; const u = __u(), t = __t({ x: 300, rot: Math.PI }), out = []; for (let i = 0; i < 300; i++) { C.t += 33; const m = __S(C, u, t); out.push(m.mode + m.ang.toFixed(3)); campDogMove(C, u, m, 1 / 30); t.x += 3; } return out.join(); })()');
check('the moves draw their times from the battle\'s seeded numbers: the same seed flies the same', rep() === rep());

// ---- D. the pairs
console.log('D. the pairs');
g.run(`window.__fight = (seed, f, a) => { const C = __new(seed); C.ships.filter(u => u.kind !== 'carrier').forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.kind === 'carrier'); C.by = { [C.carrier.id]: C.carrier }; C.carrier.x = 20000; C.carrier.y = 20000; C.arrivedAt = null;
  const wing = f.map(p => campSpawn(C, 'fighter', p[0], p[1])), al = a.map(p => campSpawn(C, 'raider', p[0], p[1])); return { C, wing, al }; };`);
const pairs = J('(() => { const F = __fight(1, [[0, 0], [0, 400]], [[500, 0], [500, 400]]); campDogPair(F.C); return [F.wing[0].mate === F.al[0].id, F.wing[1].mate === F.al[1].id, F.al[0].mate === F.wing[0].id, F.al[1].mate === F.wing[1].id]; })()');
check('two fighters and two raiders: each pair is the nearest to each, and it is mutual', pairs.every(Boolean), JSON.stringify(pairs));
const cross = J('(() => { const F = __fight(1, [[0, 0], [0, 100]], [[300, 0], [900, 100]]); campDogPair(F.C); return [F.wing[0].mate === F.al[0].id, F.wing[1].mate === F.al[1].id]; })()');
check('the nearest pair goes first, and the other two are a pair, not the other way', cross.every(Boolean), JSON.stringify(cross));
const odd = J('(() => { const F = __fight(1, [[0, 0]], [[400, 0], [500, 50], [600, 0]]); campDogPair(F.C); return [F.wing[0].mate, F.al.map(a => a.mate)]; })()');
check('one fighter against three raiders: one pair, the other two raiders have no partner (they go on as the pirates did)', odd[0] === 'raider-' + J('(() => { const F = __fight(1, [[0, 0]], [[400, 0]]); return F.al[0].id.split("-")[1]; })()') || odd[1].filter(Boolean).length === 1, JSON.stringify(odd));
const far2 = J('(() => { const F = __fight(1, [[0, 0]], [[CAMP.dog.pair.range + 200, 0]]); campDogPair(F.C); return [F.wing[0].mate, F.al[0].mate]; })()');
check('farther apart than CAMP.dog.pair.range: no pair', far2[0] === null && far2[1] === null, JSON.stringify(far2));
const hold = J('(() => { const F = __fight(1, [[0, 0]], [[500, 0]]); campDogPair(F.C); const m = F.wing[0].mate; F.al[0].x = CAMP.dog.pair.range + 600; F.C.t += 1000; campDogPair(F.C); return [m, F.wing[0].mate, F.al[0].id]; })()');
check('a pair holds when they are farther apart than the range to start with, up to CAMP.dog.pair.keep', hold[0] === hold[2] && hold[1] === hold[2], JSON.stringify(hold));
const drop = J('(() => { const F = __fight(1, [[0, 0]], [[500, 0]]); campDogPair(F.C); F.al[0].x = CAMP.dog.pair.keep + 100; F.C.t += 1000; campDogPair(F.C); return [F.wing[0].mate, F.al[0].mate]; })()');
check('and ends when they are farther apart than keep', drop[0] === null && drop[1] === null, JSON.stringify(drop));
const lost = J('(() => { const F = __fight(1, [[0, 0], [0, 900]], [[500, 0]]); campDogPair(F.C); const a = F.al[0].id; F.al[0].hp = 0; F.C.t += 1000; F.al.push(campSpawn(F.C, \'raider\', 500, 900)); campDogPair(F.C); return [F.wing[0].mate, F.wing[1].mate === F.al[1].id, F.al[1].mate === F.wing[1].id]; })()');
check('a ship that is lost leaves its partner free, and the next pairing takes a new one', lost[0] === null && lost[1] && lost[2], JSON.stringify(lost));
check('the pairing looks every CAMP.dog.pair.every ms, no oftener (it is a cost), and draws no random number', J('(() => { const F = __fight(1, [[0, 0]], [[500, 0]]); const r = F.C.rng; let n = 0; F.C.rng = () => { n++; return r(); }; F.C.t = 5000; campDogPair(F.C); const at = F.C.dogPairAt; F.C.t += 10; campDogPair(F.C); return [n, at - 5000, F.C.dogPairAt === at]; })()').join() === '0,' + K.pair.every + ',true');
const foe = J('(() => { const F = __fight(1, [[0, 0]], [[500, 0], [200, 50]]); campDogPair(F.C); const w = F.wing[0], p = F.al[1], other = F.al[0]; return [w.mate === p.id, campDogFoe(F.C, w, other).id === p.id, campDogFoe(F.C, p, F.C.carrier) === F.C.carrier, campDogFoe(F.C, other, w).id === w.id]; })()');
check('campDogFoe: the dogfighter a ship picked as the nearest is swapped for its partner while it has one', foe.every(Boolean), JSON.stringify(foe));
check('a nearest foe that is no dogfighter (a drone, a gunship, the carrier, a hauler) is NOT swapped for the partner: it is fought as it always was (the wing must not walk past a drone to a duel: the haulers died of it)', J('(() => { const F = __fight(1, [[0, 0]], [[500, 0]]); campDogPair(F.C); const dr = campSpawn(F.C, \'drone\', 100, 0), w = F.wing[0], r = F.al[0]; return [campDogFoe(F.C, w, dr) === dr, campDogFoe(F.C, r, F.C.carrier) === F.C.carrier, campDogFoe(F.C, w, null) === r]; })()').every(Boolean));
check('a ship that is not a dogfighter (a hauler, a gunship) keeps its foe', J('(() => { const F = __fight(1, [[0, 0]], [[500, 0]]); const e = campSpawn(F.C, \'freighter\', 10, 10), x = F.al[0]; e.mate = F.wing[0].id; return campDogFoe(F.C, e, x) === x; })()'));

// ---- E. who flies it
console.log('E. who flies it');
const on = J('(() => { const F = __fight(1, [[0, 0]], [[500, 0]]), w = F.wing[0], r = F.al[0], gs = campSpawn(F.C, \'gunship\', 0, 0), dr = campSpawn(F.C, \'drone\', 0, 0), es = campSpawn(F.C, \'freighter\', 0, 0), mo = campSpawn(F.C, \'mother\', 0, 0); return [campDogOn(F.C, w, r), campDogOn(F.C, r, w), campDogOn(F.C, w, dr), campDogOn(F.C, r, es), campDogOn(F.C, w, gs), campDogOn(F.C, w, mo), campDogOn(F.C, r, F.C.carrier), campDogOn(F.C, w, w), campDogOn(F.C, es, r), campDogOn(F.C, gs, w)]; })()');
check('a fighter and a raider fly a dogfight against each other and ONLY each other: not against a drone, a hauler, a gunship or the mothership, not at the carrier, not at their own side; a hauler or a gunship does not fly it', JSON.stringify(on) === JSON.stringify([true, true, false, false, false, false, false, false, false, false]), JSON.stringify(on));
const sk = J('(() => { const F = __fight(1, [[0, 0]], [[500, 0]]), w = F.wing[0], s = campSpawn(F.C, \'skiff\', 400, 0), c = campSpawn(F.C, \'cutter\', 400, 50), b = campSpawn(F.C, \'brute\', 400, 90), pat = F.C.ships.find(u => u.team === \'neutral\'); return [campDogIs(s), campDogRole(s), campDogOn(F.C, w, s), campDogOn(F.C, s, w), campDogIs(c), campDogIs(b), campDogOn(F.C, w, c), campDogOn(F.C, w, b), campDogRole(w), campDogRole(F.al[0])]; })()');
check('a pirate whose base is the raider (the skiff) is a dogfighter with the raider\'s role, and flies it against the wing\'s fighters; the cutter (a drone) and the brute (a gunship) are not', JSON.stringify(sk) === JSON.stringify([true, 'raider', true, true, false, false, false, false, 'fighter', 'raider']), JSON.stringify(sk));
const foes = J('(() => { const F = __fight(1, [[0, 0]], [[500, 0]]), w = F.wing[0], r = F.al[0], pat = { id: \'patrol-1\', kind: \'patrol\', team: \'neutral\', x: 300, y: 0, vx: 0, vy: 0, rot: Math.PI, hp: 100 }; return [campDogFoes(w, r), campDogFoes(r, w), campDogFoes(r, pat), campDogFoes(pat, r), campDogFoes(w, pat), campDogFoes(w, w)]; })()');
check('who is at war: the aliens and pirates against the wing and against the neutrals (a patrol or a miner); the wing and the neutrals are not at war with each other, and nobody with their own side', JSON.stringify(foes) === JSON.stringify([true, true, true, true, false, false]), JSON.stringify(foes));
check('a neutral patrol that points its nose at the wing\'s fighter is no threat to dodge (it is shooting the pirates)', J('(() => { const C = __new(4); const u = __u({ x: 0 }); const pat = __t({ x: 300, rot: Math.PI, team: \'neutral\', kind: \'patrol\', id: \'patrol-1\' }); C.ships.push(u, pat); return campDogThreat(C, u); })()') === null);
const order = J('(() => { const F = __fight(2, [[0, 0]], [[400, 0], [-1400, 300]]); const w = F.wing[0], a = F.al[1]; a.hold = true; w.order = { type: \'attack\', target: a.id }; const d0 = Math.hypot(a.x - w.x, a.y - w.y); let mate = null; for (let i = 0; i < 60; i++) { campStep(F.C, 1 / 30); if (w.mate) mate = w.mate; } return [d0 - Math.hypot(a.x - w.x, a.y - w.y), mate === F.al[0].id]; })()');
check('an Attack on a named alien is flown at that alien: the order wins over the partner (it has a partner behind it, and flies off at the one it was told to, 1,400 px the other way)', order[0] > 300 && order[1], JSON.stringify(order));
const st = J('(() => { const F = __fight(2, [[0, 0]], [[400, 0]]); const w = F.wing[0]; w.order = { type: \'attack\', target: null }; for (let i = 0; i < 60; i++) campStep(F.C, 1 / 30); return [!!w.dog, F.al[0].dog && F.al[0].dog.mode]; })()');
check('there are no stances (card space-game-fighter-flight): the wing\'s fighter on an Attack flies the dogfight against the raider, as the raider does against it', st[0] === true && typeof st[1] === 'string', JSON.stringify(st));
const rg = J('(() => { const F = __fight(2, [], []); const r = campSpawn(F.C, \'raider\', 300, 0); F.C.carrier.x = 700; F.C.carrier.y = 0; F.C.carrier.hp = 600; for (let i = 0; i < 60; i++) campStep(F.C, 1 / 30); return !!r.dog; })()');
check('a raider that comes at the carrier (not a fighter) flies the pirates\' pass, not a dogfight', rg === false, rg);

// ---- F. the fights
console.log('F. the fights in the sim');
g.run(`window.__duel = (seed, nw, na, pace) => {
  const C = campNew('duelfix', [], { seed, mission: 0, pace: pace || 'normal' }); // (a level of its own: 1.1 of the rim run has a patrol, a miner and beats now, which are not what a duel tests: card space-game-l1-1-beats)
  C.ships.filter(u => u.kind !== 'carrier').forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.kind === 'carrier'); C.by = { [C.carrier.id]: C.carrier };
  C.carrier.x = 20000; C.carrier.y = 20000; C.carrier.hp = 9999; C.carrier.maxHp = 9999; C.arrivedAt = null;
  const wing = [], al = [];
  for (let i = 0; i < nw; i++) { const u = campSpawn(C, 'fighter', i * 80, i * 60); u.rot = C.rng() * 6.28; u.order = { type: 'attack', target: null }; wing.push(u); }
  for (let i = 0; i < na; i++) { const u = campSpawn(C, 'raider', 520 + i * 90, 100 + i * 70); u.rot = C.rng() * 6.28; al.push(u); }
  let flips = 0, breaks = 0, jinks = 0, paired = 0, frames = 0, alive = 0; const was = {}, shots = {};
  for (let i = 0; i < 30 * 100; i++) {
    campStep(C, 1 / 30); frames++;
    wing.concat(al).forEach(u => { if (u.hp <= 0) return; const m = u.dog && u.dog.mode; if (m !== was[u.id]) { if (m === 'flip') flips++; if (m === 'break') breaks++; if (m === 'jink') jinks++; was[u.id] = m; } });
    { const aw = wing.filter(u => u.hp > 0), aa = al.filter(u => u.hp > 0); if (aw.length && aa.length) { alive++; if (aw.filter(u => u.mate && C.by[u.mate] && C.by[u.mate].hp > 0).length >= Math.min(aw.length, aa.length) - 1) paired++; } }
    C.events.length = 0;
    if (!wing.some(u => u.hp > 0) || !al.some(u => u.hp > 0)) break;
  }
  return { t: C.t / 1000, wingLeft: wing.filter(u => u.hp > 0).length, alLeft: al.filter(u => u.hp > 0).length, flips, breaks, jinks, paired, alive, frames, pos: wing.concat(al).map(u => [Math.round(u.x), Math.round(u.y)]) };
};`);
const duels = []; for (let s = 1; s <= 24; s++) duels.push(J(`__duel(${s}, 1, 1, 'normal')`));
const done = duels.filter(d => d.wingLeft === 0 || d.alLeft === 0), ts = duels.map(d => d.t).sort((a, b) => a - b), med = ts[ts.length >> 1];
check('one on one at Normal: the fight ENDS, in 24 of 24 seeds, in under 100 s (the pirates\' own steering left half of them going on and on)', done.length === 24, done.length + ' of 24, longest ' + ts[ts.length - 1].toFixed(1) + ' s');
check('and it lasts a good while: the middle duel is over 12 s, none is over 90 s (a fighter and a raider used to meet and be done in a few seconds, or never)', med >= 12 && ts[ts.length - 1] < 90, 'median ' + med.toFixed(1) + ' s, from ' + ts[0].toFixed(1) + ' to ' + ts[ts.length - 1].toFixed(1));
check('the wing\'s fighter wins most of them (it has 36 hit points to the raider\'s 20) and the raider does win some or hit hard', duels.filter(d => d.alLeft === 0).length >= 16 && duels.some(d => d.wingLeft === 0 || d.alLeft === 0), duels.filter(d => d.alLeft === 0).length + ' of 24');
check('the fighters flip and break and jink as they fight: every duel has at least two of the moves, on average four or more of each of flip and break', duels.every(d => d.flips + d.breaks + d.jinks >= 2) && duels.reduce((a, d) => a + d.flips, 0) / 24 >= 2 && duels.reduce((a, d) => a + d.breaks, 0) / 24 >= 2, 'flips ' + (duels.reduce((a, d) => a + d.flips, 0) / 24).toFixed(1) + ' breaks ' + (duels.reduce((a, d) => a + d.breaks, 0) / 24).toFixed(1) + ' jinks ' + (duels.reduce((a, d) => a + d.jinks, 0) / 24).toFixed(1));
g.run(`window.__duelK = (seed, kind) => { const C = campNew('duelfix', [], { seed, mission: 0, pace: 'normal' }); C.ships.filter(u => u.kind !== 'carrier').forEach(u => { u.hp = 0; }); C.ships = C.ships.filter(u => u.kind === 'carrier'); C.by = { [C.carrier.id]: C.carrier }; C.rng = campRng(seed); // (1.1 has a patrol and a miner of its own now: the stream of the duel is the seed's again, card space-game-l1-1-beats) C.carrier.x = 20000; C.carrier.y = 20000; C.arrivedAt = null;
  const w = campSpawn(C, 'fighter', 0, 0), a = campSpawn(C, kind, 520, 100); w.rot = C.rng() * 6.28; a.rot = C.rng() * 6.28; w.order = { type: 'attack', target: null }; let modes = 0, was = null;
  for (let i = 0; i < 30 * 100 && w.hp > 0 && a.hp > 0 && !a.gone; i++) { campStep(C, 1 / 30); C.events.length = 0; const m = a.dog && a.dog.mode; if (m !== was) { modes++; was = m; } } return { t: C.t / 1000, wing: w.hp > 0, alien: a.hp > 0 && !a.gone, gone: !!a.gone, modes, mated: !!a.mate || !!w.mate }; };`);
const sk1 = []; for (let s = 1; s <= 16; s++) sk1.push(J(`__duelK(${s}, 'skiff')`));
check('a pirate skiff fights the wing\'s fighter as a dogfight too (the rim run\'s level 1 has pirates, no raiders): every duel is over (a kill, or the skiff breaks off and runs: that is the pirates\' own rule at 35 percent), it changes its moves again and again, and the pair is made', sk1.every(d => !d.wing || !d.alien) && sk1.every(d => d.modes >= 3) && sk1.every(d => d.mated), sk1.map(d => d.t.toFixed(0) + (d.gone ? 'g' : '')).join(' '));
const cu = []; for (let s = 1; s <= 6; s++) cu.push(J(`__duelK(${s}, 'cutter')`));
check('a pirate cutter (a drone) is not a dogfight: no moves, no pair, as before', cu.every(d => d.modes <= 1 && !d.mated), JSON.stringify(cu.map(d => d.modes)));
check('the same seed is the same fight, to the pixel', JSON.stringify(J(`__duel(7, 3, 3, 'normal')`)) === JSON.stringify(J(`__duel(7, 3, 3, 'normal')`)));
const six = []; for (let s = 1; s <= 12; s++) six.push(J(`__duel(${s}, 3, 3, 'normal')`));
check('three against three: they pair off (all but at most one fighter has a living partner for most of the fight), and the fight is decided in under 60 s in every seed', six.every(d => d.paired / d.alive > 0.6 && d.t < 60), six.map(d => (d.paired / d.alive).toFixed(2) + '/' + d.t.toFixed(0)).join(' '));
const pace = ['calm', 'normal', 'brisk'].map(p => { const r = []; for (let s = 1; s <= 10; s++) r.push(J(`__duel(${s}, 1, 1, '${p}')`)); return r.filter(d => d.wingLeft === 0 || d.alLeft === 0).length; });
check('at every pace of the P key (Calm, Normal, Brisk) the duels end', pace.every(n => n >= 9), JSON.stringify(pace));

// ---- G. the pictures
console.log('G. the pictures');
g.run(`window.__rec = fn => { const ops = []; const gfx = new Proxy({}, { get: (t, name) => (...a) => { ops.push([name].concat(a)); return gfx; } }); window[fn](gfx); return ops; };`);
const H = J('CAMP_HULL'), fo = J('__rec(\'campFighterDraw\')'), W = J('campArtSize(\'fighter\')');
let col = 0; const engines = []; fo.forEach(([n, a, b, c, d]) => { if (n === 'fillStyle') col = a; if (n === 'fillRect' && col === H.engine) engines.push([a / 4 - W[0] / 8, b / 4 - W[1] / 8, c / 4, d / 4]); });
check('the fighter: three engines in a row at the stern (the glowing cans): one in the middle and one each side of it, behind the wings\' trailing edge', engines.length === 3 && engines.filter(e => Math.abs(e[1] + e[3] / 2) < 0.3).length === 1 && engines.filter(e => e[1] + e[3] / 2 > 3).length === 1 && engines.filter(e => e[1] + e[3] / 2 < -3).length === 1 && engines.every(e => e[0] < -9), JSON.stringify(engines.map(e => e.map(v => +v.toFixed(1)))));
const ro = J('__rec(\'shRaiderDraw\')'), hotRects = ro.filter(o => o[0] === 'fillRect' && o[1] <= 14 && o[1] >= 5), inside = ro.every(o => o[0] !== 'fillRect' || (o[1] >= 0 && o[2] >= 0 && o[1] + o[3] <= 40 && o[2] + o[4] <= 30));
check('the raider: drawn as a function of its own (shRaiderDraw), three engine nozzles (three small boxes of its pink in a column at the tail), every box inside the 40 x 30 picture', typeof J('typeof shRaiderDraw') === 'string' && ro.filter(o => o[0] === 'fillRect').length >= 6 && inside && hotRects.length >= 3, hotRects.length + ' rects');
check('the raider has three engine flames, one in the middle and one each side (SHIPS.nozzles)', J('SHIPS.nozzles.raider.length') === 3 && J('SHIPS.nozzles.raider[0][1]') === 0 && J('SHIPS.nozzles.raider[1][1]') === -J('SHIPS.nozzles.raider[2][1]'));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
