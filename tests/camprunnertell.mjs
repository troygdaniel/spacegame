// smoke: 2.2's running guard has a tell with no new words (card space-game-22-runner-tell): its group is first for the one edge pill (the sensors already reach it), and the torpedo's pink ring is drawn on it until its call is made or it dies (plain Node, no Chrome)
// src/campsight.js (campSeen, campSightArrows), src/camptorpedoscene.js (the ring: its drawing is looked at in Chrome, not here). The pill is the page HUD's own hostiles pill "1 · 410 km" (src/camppagehud.js campPageHudEdge reads campSightArrows(...)[0]).
// Run: node tests/camprunnertell.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

g.run(`window.T = {}; T.make = () => { const C = campNew(2, ['shield'], { seed: 4, mission: 1 }); C.arrivedAt = 0; const P = campMissionPlace(C); C.carrier.x = P.x; C.carrier.y = P.y; C.carrier.vx = 0; C.carrier.vy = 0; C.ships.forEach(u => { if (u.team === 'earth' && u !== C.carrier) { u.x = P.x - 9000; u.y = P.y; u.hp = 1e9; } }); C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; }); return C; };
  T.alien = (C, dx, dy) => { const a = campSpawn(C, 'drone', C.carrier.x + dx, C.carrier.y + dy); a.hold = true; return a; };`);

const a = J(`(() => { const C = T.make(); const run = T.alien(C, -3500, 0); run.runner = true; return { range: CAMP.sensor.range, seen: campSeen(C, run) }; })()`);
check('the running guard 3,500 px off is seen without any change (the cruiser\'s sensors reach CAMP.sensor.range, 9,000 px), so the pill can point at it', a.range >= 3500 && a.seen === true, JSON.stringify(a));

const b = J(`(() => { const C = T.make(); const near = T.alien(C, 1400, 0), run = T.alien(C, 0, -3000); run.runner = true; C.runner = { id: run.id, called: false, off: false };
  const arrows = campSightArrows(C, { x: C.carrier.x, y: C.carrier.y }, 1280, 720, 1, null); return { n: arrows.length, first: arrows[0] && arrows[0].runner === true, second: arrows[1] && arrows[1].runner === true, firstDist: arrows[0] && Math.round(arrows[0].dist) }; })()`);
check('with a nearer group and the running guard both off the screen, the running guard\'s arrow is the FIRST (the page\'s one edge pill points at it), the nearer group\'s second', b.n === 2 && b.first === true && b.second === false && b.firstDist > 2500, JSON.stringify(b));

const c = J(`(() => { const C = T.make(); const near = T.alien(C, 1400, 0), run = T.alien(C, 0, -3000); run.runner = true; C.runner = { id: run.id, called: true, off: false };
  const arrows = campSightArrows(C, { x: C.carrier.x, y: C.carrier.y }, 1280, 720, 1, null); return { first: arrows[0] && arrows[0].runner === true, firstDist: arrows[0] && Math.round(arrows[0].dist) }; })()`);
check('once the call is made the guard is no longer the first: the nearer group is (nearest first, as before)', c.first === false && c.firstDist < 1600, JSON.stringify(c));

const d = J(`(() => { const C = T.make(); const run = T.alien(C, 0, -3000); run.runner = true; C.runner = { id: run.id, called: false, off: true }; const arrows = campSightArrows(C, { x: C.carrier.x, y: C.carrier.y }, 1280, 720, 1, null); return { first: arrows[0] && arrows[0].runner === true }; })()`);
check('a call that can no longer be made (the guard was caught: off) does not put it first', d.first === false, JSON.stringify(d));

const e = J(`(() => { const C = T.make(); const near = T.alien(C, 1400, 0); const arrows = campSightArrows(C, { x: C.carrier.x, y: C.carrier.y }, 1280, 720, 1, null); return { n: arrows.length, runner: arrows.some(a => a.runner) }; })()`);
check('with no runner nothing changes: the arrows are the groups nearest first, none marked', e.n === 1 && e.runner === false, JSON.stringify(e));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nCAMP RUNNER TELL OK (${n} checks)`);
process.exit(failed ? 1 : 0);
