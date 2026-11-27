// smoke: the flown fighter's gun (card space-game-fly-fighter-fire-rate): a steady shot every 183 ms at half the pilot's damage (rateK 3, damageK 0.5), the AI pilots' guns unchanged, and in the scene the pew is always heard and stays a stream, with a flash at the nose (plain Node, no Chrome)
// Troy, 26 Nov 2026, after flying the fighter: the fire rate was too slow. The Wren fires every 160 ms; the pilots every 450 to 650 ms (8 damage). The flown gun: CAMP.cockpit.rateK 3 and damageK 0.5, so about 1.5 times a pilot's damage a second, not the Wren's 94. Both are live sliders on the N panel (card space-game-fly-fighter-l3).
// Run: node tests/campcockpitfire.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame(), J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`)), src = f => readFileSync(join(ROOT, f), 'utf8');

console.log('A. the table');
check('the flown gun is three times the pilot\'s rate at half the damage, the hull 0.65 of the pilot\'s (brief 8: shot down now and then): rateK 3, damageK 0.5, hpK 0.65', JSON.stringify(J('[CAMP.cockpit.rateK, CAMP.cockpit.damageK, CAMP.cockpit.hpK]')) === '[3,0.5,0.65]');
check('the pilots\' own guns are what they were: 8 damage, a shot every 450 to 650 ms, 700 px/s, 420 range', JSON.stringify(J('[CAMP.fighter.damage, CAMP.fighter.delay, CAMP.fighter.bullet, CAMP.fighter.range]')) === '[8,[450,650],700,420]');

console.log('B. the gun, five seconds with Space held (the sim, a ship standing still)');
g.run(`window.__go = (rateK, damageK, secs) => {
  const C = window.C = campNew(1, [], { seed: 3 }); CAMP.flags.cockpit = true; CAMP.cockpit.rateK = rateK; CAMP.cockpit.damageK = damageK;
  campOrder(C, 'launch'); for (let i = 0; i < 90; i++) campStep(C, 1 / 30); C.events.length = 0;
  const u = C.ships.find(x => x.team === 'earth' && x.kind === 'fighter' && x.hp > 0 && !x.docked); campCockpitTake(C, u.id); const S = C.cockpit; S.input.fire = true;
  const times = []; let dmg = 0; // (the shots are counted from the events, one 'wingshot' each: a shot's bullet may be gone again in the same step when many are alive)
  for (let i = 0; i < secs * 30; i++) { C.ships.forEach(x => { if (x.team === 'alien') x.hp = 1e9; }); campStep(C, 1 / 30); C.events.filter(e => e.type === 'wingshot' && e.id === u.id).forEach(() => times.push(Math.round(C.t))); const lb = C.bullets.filter(x => x.from === u.id).pop(); if (lb) dmg = lb.dmg; C.events.length = 0; }
  CAMP.flags.cockpit = false; CAMP.cockpit.rateK = 3; CAMP.cockpit.damageK = 0.5; return { times, dmg, str: u.str || 1 };
};`);
const r = J('__go(3, 0.5, 5)');
const gaps = r.times.slice(1).map((t, i) => t - r.times[i]), mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
check('about 27 shots in five seconds (a shot every 183 ms)', r.times.length >= 26 && r.times.length <= 28, r.times.length);
check('steady: the mean gap is 183 ms, and no gap is under 165 or over 205 (the tick is 33 ms: a shot lands on the tick after its time, never a burst, never a random gap)', Math.abs(mean - 183.3) < 3 && Math.min(...gaps) >= 165 && Math.max(...gaps) <= 205, JSON.stringify([Math.round(mean), Math.min(...gaps), Math.max(...gaps)]));
check('each shot is half a pilot\'s: 4 damage times the pilot\'s strength', Math.abs(r.dmg - 4 * r.str) < 1e-9, JSON.stringify([r.dmg, r.str]));
const dps = r.dmg * r.times.length / 5 / r.str, pilot = 8 / 0.55; // (per point of the pilot\'s strength)
check('about 1.5 times a pilot\'s damage a second (22 against 14.5 at strength 1), nowhere near the Wren\'s 94', dps / pilot > 1.4 && dps / pilot < 1.7 && dps < 40, JSON.stringify([Math.round(dps * 10) / 10, Math.round(pilot * 10) / 10]));
const r1 = J('__go(1, 1, 5)');
check('rateK 1 and damageK 1 are the pilot\'s own gun, as before (10 shots in five seconds, 8 damage)', r1.times.length === 10 && Math.abs(r1.dmg - 8 * r1.str) < 1e-9, r1.times.length);
const r6 = J('__go(6, 0.5, 5)');
check('the slider works: rateK 6 is twice as fast again (about 54 shots)', r6.times.length >= 52 && r6.times.length <= 56, r6.times.length);

console.log('C. the AI pilots are unchanged');
g.run(`window.__ai = () => { const C = window.C = campNew(1, [], { seed: 3 }); CAMP.flags.cockpit = true; campOrder(C, 'launch'); for (let i = 0; i < 90; i++) campStep(C, 1 / 30); C.events.length = 0;
  const flown = C.ships.find(x => x.team === 'earth' && x.kind === 'fighter' && x.hp > 0 && !x.docked); campCockpitTake(C, flown.id); // one flown (the input left at nothing), the others on their own
  campAliens(C).forEach(a => { a.hp = 1e9; }); campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y + 40); const foe = campAliens(C).slice(-1)[0]; foe.hp = 1e9; foe.hold = false;
  const dmg = {}, times = {}; for (let i = 0; i < 600; i++) { const b = C.bullets.length; campStep(C, 1 / 30); C.bullets.slice(b).filter(x => x.team === 'earth' && x.from !== flown.id && /^fighter/.test(x.from)).forEach(x => { dmg[x.from] = x.dmg; (times[x.from] = times[x.from] || []).push(Math.round(C.t)); }); C.events.length = 0; }
  CAMP.flags.cockpit = false; return { dmg, times, str: Object.fromEntries(C.ships.filter(x => x.kind === 'fighter').map(x => [x.id, x.str || 1])) }; };`);
const ai = J('__ai()');
const ids = Object.keys(ai.dmg);
check('the pilots still fire (some of them, in twenty seconds of a fight)', ids.length >= 1, JSON.stringify(ai.dmg));
check('...with their own damage, 8 times their strength (not halved)', ids.length >= 1 && ids.every(id => Math.abs(ai.dmg[id] - 8 * (ai.str[id] || 1)) < 1e-9), JSON.stringify(ai.dmg));
check('...and their own rate: no two of one pilot\'s shots are closer than 450 ms (the flown gun\'s 183 is not theirs)', ids.length >= 1 && ids.every(id => { const t = ai.times[id], d = t.slice(1).map((x, i) => x - t[i]); return d.length === 0 || Math.min(...d) >= 430; }), JSON.stringify(ids.map(id => Math.min(...ai.times[id].slice(1).map((x, i) => x - ai.times[id][i])))));

console.log('D. in the scene: the pew and the flash');
g.run(`
  window.__plays = []; window.__sfx3 = sfx; sfx = (name, a) => { __plays.push([name, a]); };
  window.__fakeSc3 = () => { window.__adds = []; const f = Object.create(Campaign.prototype); f.add = { image: (x, y, key) => { const o = { x, y, key, calls: [] }; __adds.push(o); const p = new Proxy(o, { get: (t, k) => (k in t ? t[k] : (...a) => { t.calls.push([k, a[0]]); return p; }) }); return p; } }; f.tweens = { add: o => { __adds.tween = o; } }; f.camp = campNew(1, [], { seed: 1 }); return f; };
`);
const sc = J(`(() => { const f = __fakeSc3(), c = f.camp.carrier; CAMP.flags.cockpit = true; campOrder(f.camp, 'launch'); for (let i = 0; i < 90; i++) campStep(f.camp, 1 / 30); f.camp.events.length = 0;
  const u = f.camp.ships.find(x => x.team === 'earth' && x.kind === 'fighter' && x.hp > 0 && !x.docked), out = {}; campCockpitTake(f.camp, u.id); u.x = c.x + 3000; u.y = c.y; u.rot = 0;
  const at = (t, id) => { __plays.length = 0; __adds.length = 0; f.camp.t = t; f.onEvent({ type: 'wingshot', x: u.x, y: u.y, kind: 'fighter', id }); return { plays: __plays.map(p => [p[0], Math.round(p[1] * 100) / 100]), flashes: __adds.length, at: __adds[0] ? [Math.round(__adds[0].x - u.x), Math.round(__adds[0].y - u.y)] : null }; };
  out.far = at(50000, u.id); out.gap = [at(51000, u.id).plays.length, at(51060, u.id).plays.length, at(51120, u.id).plays.length]; u.x = c.x + 3000; out.ai = (() => { __plays.length = 0; __adds.length = 0; f.camp.t = 60000; f.onEvent({ type: 'wingshot', x: u.x + 3000, y: u.y, kind: 'fighter', id: 'fighter-9' }); return { plays: __plays.slice(), flashes: __adds.length }; })(); CAMP.flags.cockpit = false; return out; })()`);
check('the flown gun is heard 3,000 px from the cruiser (the wing\'s pew is gone past 1,600), as the wing\'s pew at 0.7', sc.far.plays.length === 1 && sc.far.plays[0][0] === 'wingShot' && sc.far.plays[0][1] === 0.7, JSON.stringify(sc.far));
check('and it has a flash at the nose, one a shot, 11 px ahead of the ship', sc.far.flashes === 1 && sc.far.at && sc.far.at[0] === 11 && sc.far.at[1] === 0, JSON.stringify(sc.far.at));
check('no more than one pew in 100 ms of the battle\'s clock (a stream at the 183 ms rate: every shot has its own; a rate dialled to 6 is every other): shots 60 ms apart give 1, 0, then 1 at 120', sc.gap.join() === '1,0,1', sc.gap.join());
check('another pilot\'s shot, 3,000 px from the ship the player flies (the eye: the wing\'s pew goes by it now), is silent and has no flash (the scene\'s rule for the wing is as it was)', sc.ai.plays.length === 0 && sc.ai.flashes === 0, JSON.stringify(sc.ai));
g.run('sfx = __sfx3');
const SCN = src('src/campaignscene.js');
check('the scene: the sound goes through the shared code (battleSound, sfx), the table has one line for it (CAMP_SND.cockpit 100), and the wing\'s own line is as it was', /cockpit: 100/.test(SCN) && /this\.battleSound\('cockpit', 'wingShot', 0\.7\)/.test(SCN) && /this\.battleSound\('wing', 'wingShot', near\)/.test(SCN) && /wing: 55/.test(SCN));

console.log(failed ? `\nFAIL: ${failed} of ${n} checks failed` : `\nCOCKPIT FIRE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
