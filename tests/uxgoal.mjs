// smoke: the Campaign's goal line does not send you after a mothership that has not come (plain Node, no Chrome)
// Card space-game-night-ux, finding 4 (docs/night/ux.md; campObjective in src/campaign.js). Level 1 said "Destroy the alien mothership." from the first second, and the mothership comes with the
// third wave at 140 s: a player who had beaten wave 1 had nothing to aim at. Until it is there the goal is "Hold off the waves; the mothership comes last."; once it is there, it is the old line.
// Levels 2 and 3 were already state-aware and are not touched.
// Run: node tests/uxgoal.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.levels[1] = CAMP.levels.home'); // level 1 is the asteroid belt now (card space-game-campaign-belt); this test is about the Earth level (its convoys, Earth's shield, its wave times), which is kept as data under "home"
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`var C = campNew(1, [], { seed: 3, god: true });`);
check('at the start of level 1 the goal is to hold off the waves, and the mothership comes last', J('campObjective(C)') === 'Hold off the waves; the mothership comes last.');
g.run(`for (let i = 0; i < 100 * 30; i++) campStep(C, 1 / 30);`);
check('after two waves (100 s) the mothership has still not come, and the goal still says so', J('C.waves.filter(w => w.started).length') === 2 && !J(`C.ships.some(u => u.kind === 'mother')`) && J('campObjective(C)') === 'Hold off the waves; the mothership comes last.');
g.run(`C.ships.filter(u => u.team === 'alien').forEach(u => { u.hp = 0; }); for (let i = 0; i < 50 * 30; i++) campStep(C, 1 / 30);`); // wave 3 waits for wave 2 to be dead
check('the third wave brings the mothership, and the goal becomes "Destroy the alien mothership."', J(`C.ships.some(u => u.kind === 'mother' && u.hp > 0)`) && J('campObjective(C)') === 'Destroy the alien mothership.', J('campObjective(C)'));
check('the level is won when the mothership is dead (the goal line is then not shown: the win card is)', (g.run(`C.ships.filter(u => u.kind === 'mother').forEach(u => campHurt(C, u, 99999, 'x'))`), J('C.result') === 'won' && J('C.why') === 'mother'));
g.run(`var C2 = campNew(2, [], { seed: 3 }); var C3 = campNew(3, [], { seed: 3 });`);
check('levels 2 and 3 say what they said: gather resources, break the towers', J('campObjective(C2)') === 'Gather resources: 0 of 2.' && J('campObjective(C3)') === 'Break the defence towers: 12 left.');
check('the words are in content/text/ui.md and the code table, not the key shown back', J(`uiText('camp.obj.motherwait')`) === 'Hold off the waves; the mothership comes last.' && J(`uiText('camp.obj.mother')`) === 'Destroy the alien mothership.');
check('the line fits the HUD: 50 letters at most (the left stack is 14 px monospace, and the toast band starts at x 364)', J(`uiText('camp.obj.motherwait')`).length <= 50 && 24 + 50 * 8.4 < 480);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `UX GOAL FAIL (${failed} of ${n})` : `UX GOAL PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
