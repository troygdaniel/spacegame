// smoke: in 1.1 a torpedo can only be shot down from within 250 px of the shooter (card space-game-fighter-job-11, BRIEF 8 proposal C): a shot, a beam and a missile from farther go through it, the turrets do not aim at it; the other missions are as they were
// The rule is the mission row's torpReach (src/campaign.js, 1.1's row) and campTorpedoInReach (src/camptorpedo.js). The numbers of what it does to the missions are on the card (tools/campaign-bot.mjs, 12 seeds).
//   A  the row: 1.1 has torpReach 250, the other missions of level 1, 2 and 3 have none
//   B  a bullet: from within 250 px it hurts the torpedo and is spent; from farther it goes through (the torpedo is whole, the bullet is not spent)
//   C  a beam, a missile's fuze and its blast: the same
//   D  the turrets: a torpedo beyond 250 px is not their target (the pick), one inside is
//   E  a mission with no torpReach: every one of these is as it was (a shot from far hurts it)
//   F  the bot: the fighter bot goes for the torpedo boats and the torpedoes in a mission that has the rule (tools/campaign-bot.mjs)
// Run: node tests/camptorpreach.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`{
  window.__new = (level, mission) => { const C = window.C = campNew(level, [], { seed: 3, mission }); C.arrivedAt = 0; C.god = true; C.t = 1000; C.ships = C.ships.filter(u => u.team !== 'alien'); C.events.length = 0; return C; };
  window.__torp = (dist) => { const c = C.carrier, f = campSpawn(C, 'freighter', c.x + 3000, c.y); f.vx = f.vy = 0; f.dest = { x: c.x + 9000, y: c.y }; f.vmax = 1; f.lane = 9000; f.from = { x: f.x, y: f.y };
    const b = campSpawn(C, 'tboat', c.x + dist + 500, c.y); b.vx = b.vy = 0; campTorpedoLaunch(C, b, f); const t = C.torpedoes[C.torpedoes.length - 1]; t.x = c.x + dist; t.y = c.y; t.rot = 0; t.sp = 0; t.hp = 14; window.T = t; return t; };
  window.__shot = (from) => { const b = { team: 'earth', x: T.x, y: T.y, vx: 100, vy: 0, dmg: 4, from, life: 1000 }; window.B = b; return campTorpedoShot(C, b, T.x - 5, T.y); };
}`);

console.log('A. the row');
g.run(`__new(1, 0);`);
check('1.1 (the escort) has torpReach 250', J('C.L.mid') === 'escort' && J('C.L.torpReach') === 250);
check('no other mission has it: 1.2, 1.3, and the three missions of levels 2 and 3', [[1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]].every(([l, m]) => (g.run(`__new(${l}, ${m});`), J('C.L.torpReach') === null)));

console.log('B. a bullet');
g.run(`__new(1, 0); __torp(200);`);
check('the cruiser 200 px from the torpedo: its shot hurts it (14 hit points, 4 off) and the shot is spent', J('__shot(C.carrier.id)') === true && J('T.hp') === 10 && J('B.dead') === true);
g.run(`__new(1, 0); __torp(400);`);
check('the cruiser 400 px away (a turret\'s reach): the shot goes through, the torpedo is whole and the shot flies on', J('__shot(C.carrier.id)') === false && J('T.hp') === 14 && J('!B.dead') === true && J('!T.dead') === true);
g.run(`__new(1, 0); __torp(257);`);
check('the edge counts, not the centre: 257 px to the centre is 249 to the edge of its 8 px circle: it is hurt; 259 is not', J('__shot(C.carrier.id)') === true && (g.run(`__new(1, 0); __torp(259);`), J('__shot(C.carrier.id)') === false));
g.run(`__new(1, 0); __torp(600); window.P = campSpawn(C, 'fighter', T.x - 150, T.y); P.team = 'earth';`);
check('a pilot\'s fighter 150 px from it: its shot hurts it (the rule is the shooter\'s distance, so the wing and a flown fighter do it from close in)', J('__shot(P.id)') === true && J('T.hp') === 10);
g.run(`__new(1, 0); __torp(400);`);
check('a shot with no shooter known counts (as it always did)', J(`__shot('nobody')`) === true);

console.log('C. a beam and a missile');
g.run(`__new(1, 0); __torp(400); window.BM = { team: 'earth', x: T.x, y: T.y, dmg: 4, from: C.carrier.id, beam: true, hit: {} }; window.RB = campTorpedoShot(C, BM, T.x - 5, T.y);`);
check('a beam from the cruiser 400 px away passes the torpedo and does not mark it hit; from 200 px it hurts it', J('T.hp') === 14 && J('BM.hit[T.id]') === null && (g.run(`__new(1, 0); __torp(200); window.BM = { team: 'earth', x: T.x, y: T.y, dmg: 4, from: C.carrier.id, beam: true, hit: {} }; campTorpedoShot(C, BM, T.x - 5, T.y);`), J('T.hp') === 10));
g.run(`__new(1, 0); __torp(400); window.M1 = { x: T.x, y: T.y }; window.F1 = campTorpedoFuze(C, T.x - 5, T.y, M1); campTorpedoBlast(C, M1, 90, 30);`);
check('a missile of the cruiser fuzes on, and its blast hurts, a torpedo only from within 250 px: from 400 px neither (the torpedo is whole)', J('F1') === null && J('T.hp') === 14 && J('!T.dead') === true);
g.run(`__new(1, 0); __torp(200); window.M2 = { x: T.x, y: T.y }; window.F2 = campTorpedoFuze(C, T.x - 5, T.y, M2); campTorpedoBlast(C, M2, 90, 30);`);
check('and from 200 px both do (it is shot down)', J('F2 !== null') === true && J('T.dead') === true);

console.log('D. the turrets');
g.run(`__new(1, 0); __torp(300); window.PK = campTorpedoPick(C, C.carrier, 400);`);
check('a torpedo 300 px off is in a turret\'s reach (400) but not in the mission\'s (250): the turrets do not aim at it', J('PK') === null);
g.run(`__new(1, 0); __torp(200); window.PK = campTorpedoPick(C, C.carrier, 400);`);
check('one 200 px off is their target (the nearest, as before)', J('PK && PK.t.id === T.id') === true && J('PK.d') > 150 && J('PK.d') < 200);

console.log('E. no torpReach: as it was');
g.run(`__new(1, 1); __torp(400);`);
check('in 1.2 a shot from 400 px hurts the torpedo, a turret picks it at 300 px, a missile fuzes on it', J('C.L.torpReach') === null && J('__shot(C.carrier.id)') === true && J('T.hp') === 10 && (g.run(`__new(1, 1); __torp(300); window.PK = campTorpedoPick(C, C.carrier, 400);`), J('PK && PK.t.id === T.id') === true) && (g.run(`__new(1, 1); __torp(400); window.F3 = campTorpedoFuze(C, T.x - 5, T.y, { x: T.x, y: T.y });`), J('F3 !== null') === true));

console.log('F. the bot');
const bot = src('tools/campaign-bot.mjs');
check('the fighter bot (ace) goes for a torpedo in flight first, from inside the reach, and for a torpedo boat when none is up, in a mission whose row has torpReach; the run reports the torpedoes launched, shot and gone off', /C\.L && C\.L\.torpReach > 0 \? \(C\.torpedoes \|\| \[\]\)\.filter\(t0 => !t0\.dead\) : \[\]/.test(bot) && /foes\.filter\(x => x\.boat\)/.test(bot) && /C\.L\.torpReach - 20/.test(bot) && /torp: Object\.assign\(\{ launched: 0, shot: 0, hit: 0 \}, C\.torpStat/.test(bot));
const row = src('src/campaign.js'), tj = src('src/camptorpedo.js'), code = tj.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('the sim half is two helpers (campTorpedoReach, campTorpedoInReach) used in four places (the pick, the bullet and beam, the fuze, the blast); nothing else of the torpedo is changed (its speed, hit points and damage are the table\'s)', /torpReach: 250, place: 'luna'/.test(row) && (code.match(/campTorpedoInReach\(/g) || []).length === 4 && (code.match(/campTorpedoReach\(C\)/g) || []).length >= 2 && /const campTorpedoReach = C =>/.test(code));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
