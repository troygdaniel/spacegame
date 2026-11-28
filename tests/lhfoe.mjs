// smoke: the new Long Haul's pirates lead their shots (plain Node, no Chrome): off the shot leaves along the nose; on, a shot at your ship leaves along the Campaign's own lead when that is inside the pirate's aim, and a shot at a freighter is as it was
// PROMPT 23 (the cloud session's brief 15), piece 5 of docs/longhaul-earth.html. src/lhfoe.js: lhFoeLead (pure), lhFoeAim; the hook is in pirateAI (src/enemies.js).
//   A  off: the angle is the pirate's nose, whatever you do
//   B  on: at a ship that stands still the shot goes at the ship; at one that crosses, ahead of it, and a shot flown along that line passes within a hull of the ship (it would miss by far along the nose)
//   C  the gate: a lead outside the pirate's own aim is not taken; a target that is not your ship (the freighter it hunts) is not led
//   D  it is the Campaign's maths and share: lhFoeLead is campDogLead with no shooter drift and CAMP.cockpit.leadK; with leadK 0 the shot goes at where you are
//   E  the hook asks first and changes nothing else of the shot; the file asks the web for nothing
// Run: node tests/lhfoe.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`window.aimAt = (vx, vy, rot, other) => { const ship = { x: 400, y: 0, body: { velocity: { x: vx, y: vy } } }, s = { ship }, d = { x: 0, y: 0, rotation: rot || 0 }; return lhFoeAim(s, d, other ? { x: 400, y: 0, body: { velocity: { x: vx, y: vy } } } : ship, PIRATES.raider); };`);

console.log('A  off');
check('the nose, whatever you do', J('aimAt(0, 300, 0)') === 0 && J('aimAt(0, -300, 0.2)') === 0.2);

console.log('B  on');
J('lhNewSet(true)');
check('at a ship that stands still the shot goes at the ship', Math.abs(J('aimAt(0, 0, 0)')) < 1e-9);
const lead = J('aimAt(0, 150, 0)'), bs = J('PIRATES.raider.bullet');
check('at one crossing downward, ahead of it (below)', lead > 0.1 && lead < J('PIRATES.raider.aim'), String(lead));
const miss = rot => { let best = 1e9; for (let t = 0; t <= 1.8; t += 0.005) best = Math.min(best, Math.hypot(Math.cos(rot) * bs * t - 400, Math.sin(rot) * bs * t - 150 * t)); return best; };
check('a shot along that line passes within a hull of the ship; along the nose it misses by far', miss(lead) < 12 && miss(0) > 80, miss(lead).toFixed(1) + ' ' + miss(0).toFixed(1));
check('the same from a pirate whose nose is a little off', Math.abs(J('aimAt(0, 150, 0.1)') - lead) < 1e-9);

console.log('C  the gate');
check('a lead outside the pirate\'s own aim is not taken', J('aimAt(0, 150, -0.3)') === -0.3);
check('a target that is not your ship is not led', J('aimAt(0, 150, 0, true)') === 0);

console.log('D  the Campaign\'s maths and share');
check('lhFoeLead is campDogLead with no shooter drift and the Campaign\'s share', J(`lhFoeLead({ x: 0, y: 0 }, { x: 400, y: 0, vx: 0, vy: 150 }, ${bs})`) === J(`campDogLead({ x: 0, y: 0, vx: 0, vy: 0 }, { x: 400, y: 0, vx: 0, vy: 150 }, ${bs}, Math.min(1, CAMP.cockpit.leadK))`));
check('leadK is the Campaign\'s 1', J('CAMP.cockpit.leadK') === 1);
check('with leadK 0 the shot goes at where you are', J(`(() => { const k = CAMP.cockpit.leadK; CAMP.cockpit.leadK = 0; const r = aimAt(0, 150, 0); CAMP.cockpit.leadK = k; return r; })()`) === 0);
J('lhNewSet(null)');

console.log('E  the hook');
const en = src('src/enemies.js');
check('pirateAI asks before it calls, and the nose is the answer without it', /rot0 = typeof lhFoeAim === 'function' \? lhFoeAim\(s, d, tgt, def\) : d\.rotation;/.test(en) && /s\.shoot\(s\.eb, d\.x, d\.y, rot0 \+ \(i - \(n - 1\) \/ 2\) \* 0\.17, def\.bullet, time\)/.test(en));
check('the Campaign\'s files have no word of it', !/lhFoe|lhNewOn/.test(src('src/campdogfight.js') + src('src/campbreak.js')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhfoe.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHFOE FAIL: ${failed} of ${n} checks failed` : `\nLHFOE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
