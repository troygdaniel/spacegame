// smoke: the Campaign's ship voice warns once when Earth's shield or the carrier's hull falls to half and to a quarter, and changes nothing else (plain Node, no Chrome)
// Card space-game-night-gameplay (docs/night/gameplay.md, finding "nothing warns before a level is lost"). The words are camp.say.earthhalf, earthlow, hullhalf, hulllow in
// content/text/ui.md; the shares are CAMP.warn. Each warns once a level, the lowest share a big hit crosses, and again only if the shield mends well past it and falls back.
// Run: node tests/campgameplay-warn.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a battle with nothing scheduled: no waves, no convoys, the mothership's clock off, so only what the test does changes anything. __go(secs) steps and returns the keys of the say lines.
g.run(`
  window.__m = (level, techs) => { window.C = campNew(level, techs || [], { seed: 1 }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.motherSpawn = 1e12; return true; };
  window.__go = secs => { const keys = []; for (let i = 0; i < Math.round(secs * 30) && !C.result; i++) { campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'say' && /^camp\.say\.(earth|hull)(half|low)$/.test(e.key)) keys.push(e.key); }); C.events.length = 0; } return keys; }; // only the warning lines: a hint (campgameplay-hint.mjs) is another change
`);

console.log('the warnings: the words, the shares, once each');
check('the shares are in the table, half and a quarter', J('CAMP.warn').join() === '0.5,0.25');
check('the four lines are in content/text/ui.md and the game says them', ['earthhalf', 'earthlow', 'hullhalf', 'hulllow'].every(k => src('content/text/ui.md').includes('| camp.say.' + k + ' |') && J(`uiText('camp.say.${k}')`) !== 'camp.say.' + k && J(`uiText('camp.say.${k}')`).length < 80));
g.run('__m(1)');
check('a fresh level is quiet: Earth whole, the hull whole, no warning in ten seconds', J('__go(10)').length === 0);
g.run('C.earth.shield = C.earth.max * 0.55');
check('Earth at 55 percent says nothing', J('__go(1)').length === 0);
g.run('C.earth.shield = C.earth.max * 0.49');
check('Earth falls under half: "half" once', J('__go(1)').join() === 'camp.say.earthhalf');
check('and not again while it stays there', J('__go(5)').length === 0);
g.run('C.earth.shield = C.earth.max * 0.2');
check('under a quarter: "nearly gone" once', J('__go(1)').join() === 'camp.say.earthlow' && J('__go(5)').length === 0);
g.run('__m(1); C.earth.shield = C.earth.max * 0.1');
check('a big hit that crosses both shares at once gives one line, the lowest', J('__go(1)').join() === 'camp.say.earthlow');
g.run('C.earth.shield = C.earth.max * 0.8');
check('mended well past half and a quarter (80 percent): quiet', J('__go(1)').length === 0);
g.run('C.earth.shield = C.earth.max * 0.4');
check('and falling back under half warns again', J('__go(1)').join() === 'camp.say.earthhalf');
g.run('__m(1); C.earth.shield = C.earth.max * 0.6');
check('mending only just past the share (60 percent) does not re-arm it: no second line for a wobble around half', (g.run('C.earth.shield = C.earth.max * 0.49'), J('__go(1)').join() === 'camp.say.earthhalf') && (g.run('C.earth.shield = C.earth.max * 0.55'), J('__go(1)').length === 0) && (g.run('C.earth.shield = C.earth.max * 0.49'), J('__go(1)').length === 0));
g.run('__m(1); C.carrier.hp = C.carrier.maxHp * 0.45');
check('the carrier under half its hull: "half" once', J('__go(1)').join() === 'camp.say.hullhalf' && J('__go(3)').length === 0);
g.run('C.carrier.hp = C.carrier.maxHp * 0.2');
check('under a quarter: "critical" once', J('__go(1)').join() === 'camp.say.hulllow' && J('__go(3)').length === 0);
check('the share is of the hull this carrier has (the plating tech makes it 900): 400 of 900 is under half, though 400 of 600 would not be', (g.run('__m(1, ["plating"]); C.carrier.hp = 400'), J('C.carrier.maxHp') === 900 && J('__go(1)').join() === 'camp.say.hullhalf'));
g.run('__m(2); C.carrier.hp = C.carrier.maxHp * 0.2');
check('a level with no Earth (level 2) never talks about Earth; the hull still warns', J('C.earth') === null && J('__go(1)').join() === 'camp.say.hulllow');
g.run('__m(1); C.result = "lost"; C.earth.shield = 1; C.carrier.hp = 1');
check('once the level is over the voice says nothing more', (() => { g.run('campWarn(C)'); return J('C.events.length') === 0; })());
g.run('__m(1); C.god = true');
check('god mode (the debug key): no damage, so no warning', J('__go(20)').length === 0);

console.log('the warnings change nothing else');
{
  const play = real => J(`(() => { const w0 = campWarn; ${real ? '' : 'campWarn = () => {};'} const out = []; for (let seed = 1; seed <= 4; seed++) { const C = campNew(1, [], { seed }); for (let i = 0; i < 400 * 30 && !C.result; i++) { __smart(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; } out.push([C.result, C.why, Math.round(C.t), Math.round(C.carrier.hp), Math.round(C.earth.shield), C.kills]); } campWarn = w0; return out; })()`);
  g.run(`window.__smart = (C, s) => {
    if (s > 1 && s < 1.05) campOrder(C, 'launch'); if (s > 9 && s < 9.05) campOrder(C, 'escort', 'mars convoy');
    if (s > 12 && Math.round(s * 30) % 150 === 0) campOrder(C, 'attack', C.ships.some(u => u.kind === 'mother') ? 'mothership' : '');
    const c = C.carrier, a = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0];
    if (a) { const want = Math.atan2(a.y - c.y, a.x - c.x), d = Math.atan2(Math.sin(want - c.rot), Math.cos(want - c.rot)); C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.thrust = campDist(a, c) > 500 ? 1 : 0; C.input.fire = Math.abs(d) < 0.15 && campDist(a, c) < 800; } else { C.input.thrust = 0; C.input.fire = false; C.input.turn = 0; }
  };`);
  const a = play(true), b = play(false);
  check('four whole battles end the same with the warning and without it (it only says words)', JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a));
}
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
