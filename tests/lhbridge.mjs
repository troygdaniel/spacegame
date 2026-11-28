// smoke: the new Long Haul's bridge to the Campaign fighter's gun and aim help (plain Node, no Chrome): off answers null and Long Haul fires as it did; on, the Campaign's own aim picks the pirate in the 20 degree cone, the shot goes to the lead point at the Campaign's speed and life, a helped shot pays the Campaign's price, and R still switches the help
// PROMPT 23 (the cloud session's brief 15), piece 4 of docs/longhaul-earth.html. src/lhbridge.js: lhBridgeGame (pure), lhBridge, lhAimSync, lhFire, lhShot, lhShotLook; the hooks are in src/space.js (shoot, the aim line, the fire block) and src/autotarget.js (aimFitted).
//   A  off: the bridge is null, lhFire is null, lhAimSync is false, the autotarget part still decides aimFitted
//   B  the game the bridge builds: your ship is the flown fighter and the Campaign's eye, a pirate is a hostile of the kind it is drawn as, a dead one is left out, the aim's memory is kept between frames
//   C  the Campaign's aim on it: a pirate inside the cone and the reach is tracked and one outside either is not; the lead point is ahead of a pirate that moves; the tracked pirate is held while it stays in the cone
//   D  the shot: the Campaign fighter's speed and life, the lead's angle when helped, the nose when not; a helped shot does aimK of the damage and an unhelped one all of it; the drift is campDrift of your own speed
//   E  R: with the help off (G.aimOff) the lead is still found and no shot is steered; aimFitted is true with the switch on whatever the part
//   F  the hooks ask first; today's words of the R toast are used; the file asks the web for nothing
// Run: node tests/lhbridge.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
// a stand-in Long Haul scene: a ship and pirates with arcade-like bodies
g.run(`window.mkScene = foes => { const ship = { x: 1000, y: 1000, rotation: 0, body: { velocity: { x: 0, y: 0 } } };
  const es = foes.map(f => ({ active: true, x: f[0], y: f[1], rotation: 0, hp: f[4] === undefined ? 20 : f[4], def: { tex: f[5] || 'raider', body: [10, 10, 5] }, body: { velocity: { x: f[2] || 0, y: f[3] || 0 } } }));
  return { ship, enemies: { getChildren: () => es }, es, dead: false, events: { once() {} }, time: { now: 0 }, textures: { exists: () => false }, add: { graphics: () => { const gfx = new Proxy(function () {}, { get: (t, k) => (k === 'visible' || k === 'active' ? true : k === 'scene' ? {} : gfx), apply: () => gfx }); return gfx; } }, cameras: { main: { zoom: 1 } } }; };
G.hull = 100; G.maxHull = 100;`);

console.log('A  off');
check('the bridge is null, lhFire is null, lhAimSync is false', J(`(() => { const s = mkScene([[1300, 1000]]); return [lhBridge(s, 16), lhFire(s, s.ship, 16), lhAimSync(s, s.ship, false, 16)]; })()`).join() === ',,false');
check('aimFitted follows the part', J(`aimFitted()`) === (J(`shipStat('aimRange')`) > 0));

console.log('B  the game the bridge builds');
J('lhNewSet(true)');
const gm = J(`(() => { const s = mkScene([[1300, 1000], [1400, 1100, 0, 0, 0], [900, 1000, 0, 0, 30, 'gunship']]); const S = lhBridge(s, 16), C = S.C, e = campEye(C); return { n: C.ships.length, me: C.ships[0].id, eye: e.id, kind: C.ships[0].kind, team: C.ships[0].team, foes: campAliens(C).map(u => [u.kind, u.faction, u.team]), seen: campAliens(C).every(u => campSeen(C, u)), sp: Object.keys(S.view.sp).length, mode: S.view.mode, same: S.view.camp === C }; })()`);
check('your ship is the flown fighter and the Campaign\'s eye', gm.me === 'lh-me' && gm.eye === 'lh-me' && gm.kind === 'fighter' && gm.team === 'earth', JSON.stringify(gm));
check('a live pirate is a hostile of the kind it is drawn as; a dead one is left out', gm.n === 3 && gm.foes.map(f => f.join()).join(' ') === 'skiff,pirate,alien brute,pirate,alien' && gm.seen === true, JSON.stringify(gm.foes));
check('the view has what the Campaign\'s scene functions look for', gm.sp === 3 && gm.mode === 'play' && gm.same === true);
check('the same frame is built once; the next frame keeps the aim\'s memory', J(`(() => { const s = mkScene([[1300, 1000]]); const a = lhBridge(s, 16), ck = a.C.cockpit; ck.aim = { id: 'x' }; const b = lhBridge(s, 16), c = lhBridge(s, 32); return [a === b, c.C.cockpit === ck, c.C.t]; })()`).join() === 'true,true,32');
check('the pure half takes plain rows', J(`(() => { const S = {}; const C = lhBridgeGame(S, { x: 0, y: 0, rot: 0, hp: 50, maxHp: 100 }, [{ id: 'a', tex: 'drone', x: 100, y: 0, hp: 5 }], 5); return [C.ships.length, C.by.a.kind, C.carrier.hp, C.t]; })()`).join() === '2,cutter,50,5');

console.log('C  the Campaign\'s aim on it');
const reach = J(`campCockpitAimReach({ shot: 1 })`), cone = J('CAMP.cockpit.aimCone');
check('the cone is the Campaign\'s 20 degrees and the reach its 0.85 of a shot\'s flight', cone === 20 && Math.abs(reach - 700 * 1.4 * 0.85) < 1e-6, cone + ' ' + reach);
const aim = (foes, off) => J(`(() => { const s = mkScene(${JSON.stringify(foes)}); lhAimSync(s, s.ship, ${!!off}, 16); const A = s.lhB.C.cockpit.aim; return A && { id: A.id, rot: A.rot, x: A.x, y: A.y, steer: A.steer, tgt: s.aimTarget === s.es[0] }; })()`);
const inCone = aim([[1300, 1050]]), outCone = aim([[1300, 1200]]), far = aim([[1000 + reach + 60, 1000]]);
check('a pirate 9.5 degrees off the nose is tracked and is the scene\'s aim target', !!inCone && inCone.steer === true && inCone.tgt === true, JSON.stringify(inCone));
check('one 34 degrees off is not, and one past the reach is not', outCone === null && far === null);
const still = aim([[1400, 1000]]), mover = aim([[1400, 1000, 0, 200]]);
check('the lead of a still pirate is the pirate; of one moving down, below it', Math.abs(still.y - 1000) < 1e-6 && mover.y > 1050 && mover.rot > 0.1, JSON.stringify([still, mover]));
check('the pirate it tracks is held while another comes nearer in the cone', J(`(() => { const s = mkScene([[1500, 1000]]); lhAimSync(s, s.ship, false, 16); const first = s.lhB.C.cockpit.aim.id; s.es.push({ active: true, x: 1200, y: 1010, rotation: 0, hp: 20, def: { tex: 'raider', body: [10, 10, 5] }, body: { velocity: { x: 0, y: 0 } } }); lhAimSync(s, s.ship, false, 32); return s.lhB.C.cockpit.aim.id === first; })()`) === true);
check('no aim while the scene says off (the launch lock, the nav list)', aim([[1300, 1050]], true) === null);

console.log('D  the shot');
const fire = (foes, vx, vy, off) => J(`(() => { const s = mkScene(${JSON.stringify(foes)}); s.ship.body.velocity.x = ${vx || 0}; s.ship.body.velocity.y = ${vy || 0}; G.aimOff = ${!!off}; lhAimSync(s, s.ship, false, 16); const f = lhFire(s, s.ship, 16), A = s.lhB.C.cockpit.aim; G.aimOff = false; return { f, a: A && A.rot }; })()`);
const helped = fire([[1400, 1000, 0, 200]]), plain = fire([[1300, 1200]]);
check('the Campaign fighter\'s speed and life', helped.f.speed === J('CAMP.fighter.bullet') && helped.f.life === J('CAMP_COCKPIT_LIFE') && helped.f.speed === 700 && helped.f.life === 1400);
check('a helped shot goes along the lead and does aimK of the damage', helped.f.helped === true && helped.f.rot === helped.a && helped.f.k === J('CAMP.cockpit.aimK'), JSON.stringify(helped));
check('with nothing in the cone it goes along the nose and does all of it', plain.f.helped === false && plain.f.rot === 0 && plain.f.k === 1);
const drift = fire([[1300, 1200]], 300, -100);
check('the shot keeps campDrift of your own speed', Math.abs(drift.f.vx - 300 * J('campDrift')) < 1e-9 && Math.abs(drift.f.vy + 100 * J('campDrift')) < 1e-9);
check('lhShot adds the drift and sets the life', J(`(() => { const b = { body: { velocity: { x: 700, y: 0 } } }; lhShot(null, b, { vx: 90, vy: -30, life: 1400 }); return [b.body.velocity.x, b.body.velocity.y, b.life]; })()`).join() === '790,-30,1400');
check('damage a second is the Campaign\'s sum: the price times the hit rate it buys is about 1', Math.abs(J('CAMP.cockpit.aimK') * 40 / 13 - 1) < 0.02); // the ace bot hits 40 in a hundred with the help against 13 without (src/campaign.js CAMP.cockpit.aimK)

console.log('E  R');
const offShot = fire([[1400, 1000, 0, 200]], 0, 0, true);
check('with the help off the lead is still found and no shot is steered', offShot.a !== null && offShot.f.helped === false && offShot.f.rot === 0 && offShot.f.k === 1, JSON.stringify(offShot));
check('aimFitted is true with the switch on, whatever the part', J('aimFitted()') === true);
J('lhNewSet(null)');
check('and follows the part again with it off', J(`aimFitted()`) === (J(`shipStat('aimRange')`) > 0));

console.log('F  the hooks');
const sp = src('src/space.js');
check('the aim line, the fire block and shoot() ask before they call', /typeof lhAimSync === 'function' && lhAimSync\(this, ship, locked \|\| still, time\)\)\) aimUpdate\(this, ship, locked \|\| still\)/.test(sp) && /const lf = typeof lhFire === 'function' \? lhFire\(this, ship, time\) : null/.test(sp) && /if \(typeof lhShotLook === 'function'\) lhShotLook\(this, b, group === this\.pb\)/.test(sp));
check('without the bridge the shot is today\'s: aimAngle, SHOT_SPEED, the part\'s damage, SHOT_LIFE', /const rot = lf \? lf\.rot : aimAngle\(this, ship\)/.test(sp) && /rot, lf \? lf\.speed : SHOT_SPEED, time\)/.test(sp) && /: shipStat\('damage'\); if \(lf\) lhShot/.test(sp) && /\(b\.life \|\| SHOT_LIFE\)/.test(sp));
check('the bridge has no words of its own (R\'s toast is autotarget.js\'s)', !/toast\(/.test(src('src/lhbridge.js')));
check('the Campaign\'s aim file is not changed by this piece (it has no word of Long Haul\'s bridge)', !/lhBridge|lhNewOn/.test(src('src/campcockpitaim.js')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhbridge.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHBRIDGE FAIL: ${failed} of ${n} checks failed` : `\nLHBRIDGE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
