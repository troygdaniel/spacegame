// smoke: where the first four calls are played comes from their files: system, body, and the pirates that are always there (plain Node, no Chrome)
// Card space-game-call-places-from-files. In code the rescue was on the first planet of halcyon, the escort went to its first gate, the patrol
// was round its station, the bounty at the first planet of roost, and src/space.js put nine pirates at fixed places in Halcyon. Replace Halcyon
// with a system of your own and they still looked for those bodies. Now content/missions/<call>.md says system and body, and rescue.md lists
// the pirates (guards, a Pickets table). This runs the game's own scripts and:
//   reads what the shipped files say and checks the game plays there, with the same nine pirates as before
//   makes a system of its own, points each call at a body of it through the content loader, and checks the call follows:
//     the planet you land on, the gate the MULE flies to, the station the wanted pirates ring, the rock the Reaver hides behind, the pirates
//   names a wrong body (missing, the wrong type, not landable, an unknown system) and checks the file is refused in a plain sentence
// Run: node tests/callplaces.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const file = id => readFileSync(join(ROOT, 'content/missions', id + '.md'), 'utf8');
const front = (id, key) => { const m = new RegExp('^' + key + ': *(.+)$', 'm').exec(file(id).split('\n---')[0]); return m ? m[1].trim() : null; };

g.run(`
  toast = () => {}; sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  Phaser = { Math: { Between: (a, b) => (a + b) / 2, Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) }, Angle: { Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1) } } };
  var __spawned = [];
  spawnPirate = (s, x, y, kind) => { const d = { x, y, kind: typeof kind === 'string' ? kind : 'reaver', active: true }; __spawned.push(d); return d; };
  // the Space scene as the play code reads it: the first station and planet of the system you are in, and a drone maker that remembers
  function __scene() {
    const st = sysBody('station'), pl = sysBody('planet'); __spawned = [];
    return { add: __P, time: { now: 0, delayedCall() {} }, mx: {}, station: st ? { x: st.x, y: st.y } : { x: 0, y: 0 }, planet: pl ? { x: pl.x, y: pl.y } : { x: 0, y: 0 }, ship: { x: 0, y: 0 },
      spawnDrone(x, y) { const d = { x, y, active: true }; __spawned.push(d); return d; } };
  }
  function __take(id, system) { G.missionId = id; G.mission = 'accepted'; G.missionProgress = 0; G.system = system; G.deep = null; }
  var __apply = (id, data) => { try { CONTENT_TABLES.mission.apply(id, Object.assign({ kind: id }, data)); return ''; } catch (e) { return e.message; } };
  var __near = (p, b, lo, hi) => { const d = Math.hypot(p.x - b.x, p.y - b.y); return d >= lo && d <= hi; };
`);

const WANT = { rescue: ['halcyon', 'kepler-4b', 'planet'], escort: ['halcyon', 'perseus-gate', 'gate'], patrol: ['halcyon', 'halcyon-station', 'station'], bounty: ['roost', 'roost-rock', 'planet'] };

console.log('the shipped files say where');
for (const id of Object.keys(WANT)) {
  const [sys, body, type] = WANT[id];
  check(`content/missions/${id}.md: system ${sys}, body ${body}`, front(id, 'system') === sys && front(id, 'body') === body, front(id, 'system') + ' ' + front(id, 'body'));
  const b = J(`(() => { const m = MISSIONS.find(m => m.id === '${id}'), b = missionBody(m); return { sys: m.system, named: m.body, id: b && b.id, type: b && b.type, inSys: !!sysBodies(null, m.system).find(x => x.id === (b && b.id)) }; })()`);
  check(`${id} is played at ${body}, a ${type} of ${sys}`, b.sys === sys && b.named === body && b.id === body && b.type === type && b.inSys, JSON.stringify(b));
  check(`that body is in the system's own file`, new RegExp('^\\| ' + body + ' \\| ' + type + ' ', 'm').test(readFileSync(join(ROOT, 'content/systems', sys + '.md'), 'utf8')));
}
check('the rescue file lists the pirates: 6 guards and three pickets', front('rescue', 'guards') === '6' && /## Pickets\n\| x \| y \|\n\| --- \| --- \|\n\| 5700 \| 2700 \|\n\| 6000 \| 3500 \|\n\| 2500 \| 2200 \|/.test(file('rescue')) && J(`MISSIONS.find(m => m.id === 'rescue').guards`) === 6 && J(`MISSIONS.find(m => m.id === 'rescue').pickets`).join(';') === '5700,2700;6000,3500;2500,2200');
check('the generated content carries them (the game reads this, not the .md)', ['"body":"kepler-4b"', '"body":"perseus-gate"', '"body":"halcyon-station"', '"body":"roost-rock"', '"guards":6', '"pickets":[{"x":5700,"y":2700}'].every(t => readFileSync(join(ROOT, 'content.generated.js'), 'utf8').includes(t)));

console.log('the game as shipped plays where it did');
{
  g.run(`G.system = 'halcyon'; G.deep = null`);
  const pl = J(`sysBody('planet', 'halcyon')`), ps = J('missionPirates()');
  check('nine pirates are always in Halcyon: six in a ring 520 to 740 px round Kepler-4b', ps.length === 9 && ps.slice(0, 6).every(p => { const d = Math.hypot(p.x - pl.x, p.y - pl.y); return d >= 520 && d <= 740; }), ps.length);
  check('and three at the places the old code had, through sysAt', J(`[[5700, 2700], [6000, 3500], [2500, 2200]].map(([x, y]) => [sysAt(x), sysAt(y)])`).join(';') === ps.slice(6).map(p => [p.x, p.y]).join(';'));
  check('a second rescue call at the same planet (a pack\'s copy of the row) does not double them', J(`(() => { G.system = 'halcyon'; MISSIONS.push(Object.assign({}, MISSIONS.find(m => m.id === 'rescue'), { id: 'copy', kind: 'rescue', added: true })); const n = missionPirates().length; MISSIONS.pop(); return n; })()`) === 9);
  check('you can land on Kepler-4b in Halcyon, and nowhere in the other systems', J('missionLandBody().id') === 'kepler-4b' && J(`Object.keys(SYSTEMS).filter(s => s !== 'halcyon').every(s => { G.system = s; return missionLandBody() === null && missionPirates().length === 0; })`));
  g.run(`__take('escort', 'halcyon')`);
  check('the escort flies to the Perseus gate', J('escortGate().id') === 'perseus-gate' && J('[GATE.x, GATE.y]').join() === J(`[sysBody('gate', 'halcyon').x, sysBody('gate', 'halcyon').y]`).join());
  g.run(`__take('patrol', 'halcyon')`);
  const st = J(`sysBody('station', 'halcyon')`), pat = J(`(() => { const s = __scene(); patrolSetup(s); return __spawned; })()`);
  check('the patrol\'s five wanted pirates ring Halcyon Station', pat.length === 5 && pat.every(p => p.wanted && Math.abs(Math.hypot(p.x - st.x, p.y - st.y) - 800) < 1), JSON.stringify(pat.slice(0, 2)));
  g.run(`__take('bounty', 'roost')`);
  const rock = J(`sysBody('planet', 'roost')`), bo = J(`(() => { const s = __scene(); bountySetup(s); return __spawned; })()`);
  check('the Reaver and its two escorts wait south-west of Reaver\'s Rock', bo.length === 3 && bo[0].x === rock.x - 1100 && bo[0].y === rock.y + 650 && bo[0].boss === true, JSON.stringify(bo));
  g.run(`__take('rescue', 'halcyon')`);
  check('the rescue\'s arrow points at Kepler-4b', J(`(() => { const t = missionTarget(__scene()); return [t.x, t.y, t.name]; })()`).join() === [pl.x, pl.y, 'Kepler-4b'].join());
}

console.log('a system of your own: point the files at it and the calls follow');
{
  // a small system with two of everything, so "the first one" and "the one the file names" differ
  g.run(`SYSTEMS.mine = { name: 'Mine', ly: [1, 1], size: 30000, pay: 1, bodies: [
    { id: 'm-dock-a', type: 'station', name: 'First Dock', x: 3000, y: 3000 }, { id: 'm-dock-b', type: 'station', name: 'Second Dock', x: 20000, y: 4000 },
    { id: 'm-world-a', type: 'planet', name: 'Dry World', x: 9000, y: 9000, r: 300, landable: false }, { id: 'm-world-b', type: 'planet', name: 'Green World', x: 15000, y: 21000, r: 400, landable: true },
    { id: 'm-gate-a', type: 'gate', name: 'Near gate', x: 5000, y: 25000, r: 110 }, { id: 'm-gate-b', type: 'gate', name: 'Far gate', x: 27000, y: 26000, r: 110 } ] };`);
  const errs = J(`[__apply('rescue', { system: 'mine', body: 'm-world-b', guards: 4, pickets: [{ x: 100, y: 200 }] }), __apply('escort', { system: 'mine', body: 'm-gate-b' }), __apply('patrol', { system: 'mine', body: 'm-dock-b' }), __apply('bounty', { system: 'mine', body: 'm-world-a' })]`);
  check('the four files are taken', errs.every(e => e === ''), errs.join(' | '));
  g.run(`G.system = 'mine'; G.deep = null`);
  check('rescue: you land on Green World, the second planet, and the arrow points at it', J('missionLandBody().id') === 'm-world-b' && J(`(() => { __take('rescue', 'mine'); const t = missionTarget(__scene()); return [t.x, t.y, t.name]; })()`).join() === '15000,21000,Green World');
  const ps = J('missionPirates()');
  check('its pirates moved with it: four round Green World and the one picket', ps.length === 5 && ps.slice(0, 4).every(p => { const d = Math.hypot(p.x - 15000, p.y - 21000); return d >= 520 && d <= 740; }) && ps[4].x === J('sysAt(100)') && ps[4].y === J('sysAt(200)'), JSON.stringify(ps));
  check('Halcyon has none of them now, and no landing', J(`(() => { G.system = 'halcyon'; const r = [missionPirates().length, missionLandBody()]; G.system = 'mine'; return r; })()`).join() === '0,');
  g.run(`__take('escort', 'mine')`);
  check('escort: the MULE is bound for Far gate, the second gate', J('escortGate().id') === 'm-gate-b' && J('[GATE.x, GATE.y]').join() === '27000,26000' && J(`escortTarget({ mx: { freighter: null } }).name`) === 'Far gate');
  g.run(`__take('patrol', 'mine')`);
  const pat = J(`(() => { const s = __scene(); patrolSetup(s); return __spawned; })()`);
  check('patrol: the wanted pirates ring Second Dock, not the first station of the system', pat.length === 5 && pat.every(p => Math.abs(Math.hypot(p.x - 20000, p.y - 4000) - 800) < 1));
  g.run(`__take('bounty', 'mine')`);
  const bo = J(`(() => { const s = __scene(); bountySetup(s); return __spawned; })()`);
  check('bounty: the Reaver waits by Dry World', bo[0].x === 9000 - 1100 && bo[0].y === 9000 + 650 && J('missionHere(missionDef())') === true);
  check('the colonist aboard: the step is to dock at this system\'s station', J(`(() => { __take('rescue', 'mine'); G.mission = 'rescued'; const t = missionStep().text; G.mission = 'accepted'; return t; })()`) === 'Dock at First Dock');
  check('a file that moves a call and names no body gets the first of its type there', J(`__apply('escort', { system: 'mine' })`) === '' && J(`(() => { const m = MISSIONS.find(m => m.id === 'escort'); m.body = undefined; return missionBody(m).id; })()`) === 'm-gate-a');
}

console.log('a wrong body is refused in a plain sentence, and the call stays where it was');
{
  const was = J(`MISSIONS.filter(m => ['rescue', 'escort', 'patrol', 'bounty'].includes(m.id)).map(m => [m.system, m.body])`).join(';');
  const bad = [
    ['rescue', { system: 'mine', body: 'no-such' }, /there is no body "no-such" in mine/], ['rescue', { system: 'mine', body: 'm-world-a' }, /not landable/],
    ['escort', { system: 'mine', body: 'm-dock-a' }, /is a station, and a escort call needs a gate/], ['patrol', { system: 'nowhere' }, /the system "nowhere" is not in the game/],
    ['bounty', { system: 'mine', body: 'm-gate-a' }, /is a gate, and a bounty call needs a planet/], ['courier-halcyon-kestrel', { body: 'kepler-4b', kind: 'courier' }, /has no body/]
  ];
  for (const [id, data, re] of bad) { const e = J(`__apply('${id}', ${JSON.stringify(data)})`); check(`${id} ${JSON.stringify(data)}: "${e}"`, re.test(e), e); }
  check('nothing moved', J(`MISSIONS.filter(m => ['rescue', 'escort', 'patrol', 'bounty'].includes(m.id)).map(m => [m.system, m.body])`).join(';') === was);
}

console.log('nothing is left pinned in the code');
{
  const space = readFileSync(join(ROOT, 'src/space.js'), 'utf8'), mis = readFileSync(join(ROOT, 'src/missions.js'), 'utf8');
  check('src/space.js names no system and places no pirate by number', !/G\.system === 'halcyon'/.test(space) && !/5700|6000, 3500/.test(space) && /missionPirates\(\)\.forEach/.test(space) && /this\.canLand = !!land;/.test(space));
  const play = mis.slice(mis.indexOf('function escortSend'));
  check('the play code asks for the call\'s body, never the first gate, station or planet', !/sysBody\('gate'\)|sysBody\('planet'\)/.test(play) && !/s\.planet\.x - 1100/.test(play) && !/s\.station\.x \+ Math\.cos/.test(play));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
