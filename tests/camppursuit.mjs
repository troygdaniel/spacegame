// smoke: the Campaign's pursuit: a burn (Fast) loses the aliens that chased the carrier ("Lost them."), regular speed does not (plain Node, no Chrome)
// Card space-game-campaign-pursuit (Troy, 20 Nov 2026): enemy fighters chase at normal speed and cannot keep up on Fast, so a burn to an outpost is a real retreat. The numbers are CAMP.alien.top and
// CAMP.alien.pursuit, the rule is campPursuit in src/campaign.js, the words are content/text/camppursuit.md.
//   A. the numbers: every alien's top speed is under the burn's; the raider and the drone are over the carrier's regular speed
//   B. a raider chasing the carrier: at regular speed it keeps up and is not lost; on Fast it falls behind, drops the chase and the ship says "Lost them."
//   C. the edges: an alien that never was near is not lost; a pack says it once; a guard goes back to its post; an Earth wave goes on to Earth; one that is hit or a ship of yours in reach is on it again
//   D. the words
// Run: node tests/camppursuit.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__lost = C => C.events.filter(e => e.type === 'say' && e.key === 'camp.say.lost').length;
  window.__setup = (level, kind, dx, burn) => { const row = campMissions(level)[0], tr = row.traffic; row.traffic = []; const C = campNew(level, [], { seed: 1, god: true }); row.traffic = tr; C.ships = C.ships.filter(u => u.team !== 'alien'); C.caches = []; // (1.1 has a patrol and a miner of its own now: they are left out, the pursuit is what is tested, card space-game-l1-1-beats)
    C.carrier.x = 0; C.carrier.y = 0; C.carrier.vx = C.carrier.vy = 0; C.carrier.rot = 0; window.C = C;
    window.R = campSpawn(C, kind, dx, 0); R.nextShot = 1e9; R.vx = 0; R.hitBy = null;
    const P = campNavRows(C).find(r => r.group === 'places' && r.dist > 3000 && r.dist < 8000); campNavFly(C, P, burn, 'key'); return C; };
  window.__go = s => { for (let i = 0; i < s * 30; i++) { campStep(C, 1 / 30); R.nextShot = 1e9; } };
`);

console.log('A. the numbers');
{
  const top = k => J(`PIRATES.${k}.max`);
  check('raider, drone and gunship top speeds are all under the burn (462), near and far (672), and the mothership (55) is slower still: nothing can keep up on Fast', ['raider', 'drone', 'gunship'].every(k => top(k) < J('CAMP.carrier.speed * CAMP.nav.fast')) && J('CAMP.mother.speed') < 100, ['raider', 'drone', 'gunship'].map(top).join(' '));
  check('a raider and a drone are over the carrier\'s regular speed (210): they keep up with it at regular speed (the pirates\' table is not touched: the balance of the waves is as it was)', top('raider') > J('CAMP.carrier.speed') + 100 && top('drone') > J('CAMP.carrier.speed') + 20 && J('PIRATES.raider.max') === 430, [top('raider'), top('drone'), J('CAMP.carrier.speed')].join(' '));
  check('the leash is a share of the kind\'s firing range (raider 520 -> 650, so a raider shooting is never out of touch), and the loss takes a short time', J('CAMP.alien.pursuit.leashOf') > 1 && J('CAMP.alien.pursuit.leashOf') <= 1.5 && J('CAMP.alien.pursuit.loseAfter') <= 2500);
}

console.log('B. a raider chasing the carrier');
{
  g.run(`__setup(1, 'raider', -450, true); __go(2.5);`);
  // re-pinned by card space-game-cruiser-quicker-handling (26 Nov 2026): the cruiser's accel is 340, not 170, so the burn is up to speed sooner and the raider is 762 px behind at 2.5 s where it was 686; still close and not lost, so the bound goes from 760 to 800.
  check('on Fast (462 px/s) the raider is still on it two seconds in: close, not lost, no line', J('R.lost') !== true && J('campDist(R, C.carrier)') < 800 && J('__lost(C)') === 0, J('campDist(R, C.carrier)'));
  g.run(`__go(4);`);
  check('six seconds into the burn it has fallen behind (past the leash) and has dropped the chase: the ship says "Lost them."', J('campDist(R, C.carrier)') > 650 && J('__lost(C)') === 1 && J('R.seenAt') === null, JSON.stringify(J('[campDist(R, C.carrier), __lost(C), R.lost, R.hold]')));
  g.run(`__go(2);`);
  check('and it does not chase on: it has come to rest where it was and stays lost while the carrier goes on, the line was said once', J('__lost(C)') === 1 && J('R.lost') === true && J('Math.hypot(R.vx, R.vy)') < 60 && J('campDist(R, C.carrier)') > 1200, JSON.stringify(J('[R.lost, Math.hypot(R.vx, R.vy), campDist(R, C.carrier)]')));
  g.run(`__setup(1, 'raider', -450, false); __go(2.5);`);
  check('at regular speed (210) the same raider is on it two seconds in', J('campDist(R, C.carrier)') < 700 && J('R.lost') !== true && J('__lost(C)') === 0);
  g.run(`__go(4);`);
  check('and six seconds in it keeps up: within 700 px, never lost, no line, and it is shooting-range close (it keeps its distance by its own hold, 460)', J('campDist(R, C.carrier)') < 700 && J('R.lost') !== true && J('__lost(C)') === 0 && J('Math.hypot(C.carrier.vx, C.carrier.vy)') > 150, JSON.stringify(J('[campDist(R, C.carrier), __lost(C), Math.hypot(C.carrier.vx, C.carrier.vy)]')));
  g.run(`__go(20);`);
  check('twenty seconds more at regular speed (it has arrived, or flies on): it was never lost', J('__lost(C)') === 0);
  g.run(`__setup(1, 'drone', -450, true); __go(7);`);
  check('a drone (260 px/s) is lost on a burn as well: the line is said', J('__lost(C)') === 1 && J('campDist(R, C.carrier)') > 810);
  g.run(`__setup(1, 'gunship', -450, true); __go(7);`);
  check('and a gunship (150 px/s)', J('__lost(C)') === 1);
}

console.log('C. the edges');
{
  g.run(`__setup(1, 'raider', -5000, true); __go(3);`);
  check('an alien that never was near (it is coming from 5,000 px away) is not lost: nothing to lose, no line, it still comes for the carrier', J('__lost(C)') === 0 && J('R.lost') !== true && J('R.seenAt') == null);
  g.run(`__setup(1, 'raider', -450, true); window.R2 = campSpawn(C, 'raider', -380, 60); window.R3 = campSpawn(C, 'raider', -420, -80); [R2, R3].forEach(u => { u.nextShot = 1e9; u.vx = 0; }); for (let i = 0; i < 30 * 9; i++) { campStep(C, 1 / 30); C.ships.forEach(u => { if (u.team === 'alien') u.nextShot = 1e9; }); }`);
  check('a pack of three that all drop away says it once (not three times)', J('[R, R2, R3].every(u => u.lostN >= 1)') && J('__lost(C)') === 1, JSON.stringify(J('[R.lostN, R2.lostN, R3.lostN, __lost(C)]')));
  g.run(`__setup(1, 'raider', -450, true); R.post = { x: -1600, y: 0 }; R.hold = false; __go(14);`);
  check('a guard that loses you goes back to its post and holds there again', J('campDist(R, R.post)') < 300 && J('R.hold') === true, JSON.stringify(J('[campDist(R, R.post), R.hold, R.lost]')));
  g.run(`__setup('home', 'raider', -450, true); window.__e0 = C.earth; __go(8);`);
  check('in a level with Earth (the Earth level) a raider that loses the carrier goes on to Earth: it is not left holding', J('!!C.earth') === true && J('__lost(C)') === 1 && J('R.hold') !== true);
  g.run(`__setup(1, 'raider', -450, true); __go(7); window.__d = campDist(R, C.carrier); C.carrier.x = R.x + 300; C.carrier.y = R.y; C.carrier.vx = C.carrier.vy = 0; C.nav = null; __go(2);`);
  check('a ship of yours that comes within its reach brings it back on you (lost is cleared and it attacks again)', J('R.lost') !== true && J('R.hold') !== true && J('campDist(R, C.carrier)') < 700 && J('__d') > 750, JSON.stringify(J('[__d, R.lost, R.hold, campDist(R, C.carrier)]')));
  g.run(`__setup(1, 'raider', -450, true); __go(7); R.hitBy = C.carrier.id; R.distractedUntil = C.t + 4000; __go(1);`);
  check('a lost raider that is hit by the carrier turns on it (the distraction rule, as it was)', J('R.lost') !== true || J('R.hitBy') === J('C.carrier.id'));
  g.run(`__setup(1, 'raider', -450, true); C.carrier.hp = 0; __go(1);`);
  check('with the carrier gone the rule does nothing and throws nothing', J('__lost(C)') === 0);
}

console.log('D. the words');
{
  check('"Lost them." is in content/text/camppursuit.md and the defaults of src/contenttables.js, and the game says it', src('content/text/camppursuit.md').includes('| camp.say.lost | Lost them. |') && src('src/contenttables.js').includes("'camp.say.lost': 'Lost them.'") && J("uiText('camp.say.lost')") === 'Lost them.');
  check('it is short enough to be said (12 words or fewer)', J("uiText('camp.say.lost')").split(/\s+/).length <= 12);
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN PURSUIT FAIL (${failed} of ${n})` : `\nCAMPAIGN PURSUIT PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
