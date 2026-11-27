// smoke: 2.3's fighter job (card space-game-fighter-job-23; BRIEF 8 proposal C): an alien outside the ring that one of your fighters holds (within 450 px of it) does not stop the hold, one alien a fighter; inside the ring, or a second alien, it still does (plain Node, no Chrome)
// src/campaign.js campRelic / campRelicHeld, the relic row's `held: 450`. It is not the old kite (the 16 s win of docs/night/cockpit-sweep.md): the wave holds the ring (campRelicAlien), so a fighter cannot draw it off, and one fighter holds one alien.
// Run: node tests/campfighterring.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

// the cruiser sits on the relic; every ship of yours but one fighter is put far away; the aliens are spawned held (they do not move) at chosen offsets from the relic, with the fighter put where the test says
g.run(`window.T = {}; T.make = seed => { const C = campNew(2, ['shield'], { seed, mission: 2 }); C.arrivedAt = 0; C.waves.forEach(w => { w.started = true; }); const R = C.relic; C.carrier.x = R.x; C.carrier.y = R.y; C.carrier.vx = 0; C.carrier.vy = 0; C.carrier.hp = 1e6;
    const fs = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter'); fs.forEach((u, i) => { u.x = -9000; u.y = -9000 - i * 500; u.vx = 0; u.vy = 0; u.hp = 1e6; }); C.__f = fs[0]; return C; };
  T.alien = (C, dx, dy) => { const R = C.relic, a = campSpawn(C, 'drone', R.x + dx, R.y + dy); a.hold = true; a.nextShot = 1e9; a.hp = a.maxHp = 1e9; a.pin = { x: a.x, y: a.y }; return a; };
  T.fighterAt = (C, dx, dy) => { const R = C.relic, f = C.__f; f.x = R.x + dx; f.y = R.y + dy; f.vx = 0; f.vy = 0; };
  T.hold = (C, secs) => { const R = C.relic; for (let i = 0; i < 30 * secs; i++) { C.input.thrust = 0; C.input.brake = true; C.input.fire = false; campStep(C, 1 / 30); C.carrier.x = R.x; C.carrier.y = R.y; if (C.__f && C.__keep) T.fighterAt(C, C.__keep[0], C.__keep[1]); C.ships.forEach(u => { if (u.pin) { u.x = u.pin.x; u.y = u.pin.y; u.vx = 0; u.vy = 0; } }); } return +R.hold.toFixed(1); };`);

check('the row: held is 450 px', J('campMissionRow(2, 2).relic.held') === 450);

const base = J(`(() => { const C = T.make(1); T.alien(C, 520, 0); return { hold: T.hold(C, 4) }; })()`);
check('with an alien 520 px from the relic (outside the ring, inside the 650 px that stops the hold) and no fighter near it, the hold is stopped (as it always was)', base.hold === 0, JSON.stringify(base));
const held = J(`(() => { const C = T.make(1); T.alien(C, 520, 0); T.fighterAt(C, 700, 100); C.__keep = [700, 100]; return { hold: T.hold(C, 4) }; })()`);
check('the same alien with a fighter of yours 215 px from it: the hold runs (4 s of it)', held.hold >= 3.5, JSON.stringify(held));
const far = J(`(() => { const C = T.make(1); T.alien(C, 520, 0); T.fighterAt(C, 520, 700); C.__keep = [520, 700]; return { hold: T.hold(C, 4) }; })()`);
check('a fighter 700 px from the alien (beyond 450 px) holds nothing', far.hold === 0, JSON.stringify(far));
const inside = J(`(() => { const C = T.make(1); T.alien(C, 200, 0); T.fighterAt(C, 300, 100); C.__keep = [300, 100]; return { hold: T.hold(C, 4) }; })()`);
check('an alien inside the ring (200 px from the relic, the ring is 240) is never held off: the hold is stopped even with the fighter on it', inside.hold === 0, JSON.stringify(inside));
const two = J(`(() => { const C = T.make(1); T.alien(C, 520, 0); T.alien(C, 560, 80); T.fighterAt(C, 700, 40); C.__keep = [700, 40]; return { hold: T.hold(C, 4) }; })()`);
check('one fighter holds ONE alien: with two aliens at the edge the hold is stopped', two.hold === 0, JSON.stringify(two));
const pair = J(`(() => { const C = T.make(1); T.alien(C, 520, 0); T.alien(C, -520, 0); const fs = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter'); const R = C.relic; fs[0].x = R.x + 700; fs[0].y = R.y; fs[1].x = R.x - 700; fs[1].y = R.y; let h = 0; for (let i = 0; i < 30 * 4; i++) { C.input.brake = true; campStep(C, 1 / 30); C.carrier.x = R.x; C.carrier.y = R.y; [[fs[0], 700], [fs[1], -700]].forEach(([f, d]) => { f.x = R.x + d; f.y = R.y; f.vx = 0; f.vy = 0; }); C.ships.forEach(u => { if (u.pin) { u.x = u.pin.x; u.y = u.pin.y; u.vx = 0; u.vy = 0; } }); } return { hold: +R.hold.toFixed(1) }; })()`);
check('two fighters hold two aliens: the hold runs', pair.hold >= 3.5, JSON.stringify(pair));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP FIGHTER RING OK (${n} checks)`);
process.exit(failed ? 1 : 0);
