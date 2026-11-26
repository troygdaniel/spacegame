// smoke: the cruiser's boost and engine flames (plain Node, no Chrome): the energy store, the surge above the top speed, the lock at empty, the refill after a pause, plain thrust and turn untouched, the flames, the page HUD's meter, the key
// Card space-game-cruiser-boost-flames (Troy, 26 Nov 2026: "he loves how the Long Haul ship flies, above all its bursts of thrust; the cruiser is heavier, so take the feel, not the numbers"; yes to a Shift boost and to engine flames, NO dodge dash; do not change turn or plain thrust).
//   A. the table and the key: CAMP.boost (the heavy ship's numbers), Shift in the key table and on the Campaign's keys page, the scene reads it only when not typing and no list has the arrows
//   B. plain flight is untouched: top speed 210, accel 170, turn 1.1: a run without Shift is identical to a run with the boost switched off, to the last digit
//   C. the boost: Shift with thrust takes the top speed from 210 to about 330 within a second, drains the store 25 a second (four seconds from full), locks at empty with one dry click, and the speed settles back at 150 px/s each second
//   D. the refill: after a pause of a second, 14 a second; the lock lifts when a quarter is back; nothing drains without thrust; the autopilot's burn is not the boost
//   E. the flames: two, one for each engine, none with the engines off, longer with thrust, longest while boosting, a brief flare when thrust starts, pale blue and white (no gold or amber), one stretched sprite each
//   F. the page HUD: a thin Boost meter under Shields and Hull, its share, its percentage only under 100, bright while boosting and amber while locked
// Run: node tests/campboost.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, f), 'utf8');
g.run(`
  window.__mk = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.god = true; C.t = 1000; C.input.thrust = 1; return C; };
  window.__run = (secs, f) => { for (let i = 0; i < Math.round(secs * 30); i++) { if (f) f(i); C.t += 1000 / 30; campCarrier(C, 1 / 30); } };
  window.__sp = () => Math.hypot(C.carrier.vx, C.carrier.vy);
`);

console.log('A. the table and the key');
{
  check('the heavy ship\'s numbers: a store of 100, 25 a second out (four seconds), a pause of a second, 14 a second back (about seven seconds from empty), locked until a quarter is back, 210 to about 330 px/s, thrust 2.4 times, settling at 150 px/s each second', J('CAMP.boost.max') === 100 && J('CAMP.boost.drain') === 25 && J('CAMP.boost.pause') === 1000 && J('CAMP.boost.regen') === 14 && J('CAMP.boost.back') === 0.25 && Math.abs(J('CAMP.carrier.speed * CAMP.boost.speed') - 330) < 1 && J('CAMP.boost.accel') === 2.4 && J('CAMP.boost.fall') === 150 && J('CAMP.boost.on') === true);
  check('heavier than the Long Haul\'s: it refills more slowly (14 a second against the Long Haul\'s tiers) and settles more slowly (150 px/s each second against 900), and drains at the same 25 a second as its model (src/boost.js)', J('CAMP.boost.fall') < 900 && /drain: 25, pause: 1000, back: 0\.25/.test(src('src/boost.js')) && J('CAMP.boost.drain') === 25 && J('CAMP.boost.pause') === 1000 && J('CAMP.boost.back') === 0.25);
  check('Shift is in the key table as the boost (left or right), and the Campaign\'s keys page has its row, under FLY AND FIRE', J('CAMP_KEYS.boost.k') === 'Shift' && J('CAMP_KEYS.boost.codes.join()') === 'ShiftLeft,ShiftRight' && J(`controlsGroup('campaign').rows.some(r => r.k.join() === 'Shift' && /boost/i.test(r.t) && r.sub === 'FLY AND FIRE')`));
  check('no other key of the table is Shift (it was free: only a modifier, for R and for Shift+Enter on the map), and the typed strip is not asked: the scene reads it only when not typing', Object.keys(J('CAMP_KEYS')).filter(id => id !== 'boost').every(id => !J(`CAMP_KEYS.${id}.codes`).some(c => /Shift/.test(c))) && /inp\.boost = !typing && !!k\.SHIFT && k\.SHIFT\.isDown/.test(src('src/campaignscene.js')));
  check('the scene polls Shift as a held key, drops it while a list or the map has the arrows, and plays the Long Haul\'s dry click when the store runs dry', /addKeys\('UP,DOWN,LEFT,RIGHT,SPACE,SHIFT'\)/.test(src('src/campaignscene.js')) && /inp\.turn = 0; inp\.thrust = 0; inp\.brake = false; inp\.boost = false;/.test(src('src/campaignscene.js')) && /e\.type === 'boost'\) \{ if \(e\.stage === 'dry'.*sfx\('empty'\)/.test(src('src/campaignscene.js')));
}

console.log('B. plain flight is untouched');
{
  g.run(`__mk(); __run(12);`);
  const plain = J('[C.carrier.x, C.carrier.y, C.carrier.vx, C.carrier.vy, C.carrier.rot]');
  check('plain thrust: the cruiser reaches its top speed, 210, and no more (about 2 seconds to 190 from rest: the numbers it always had)', Math.abs(J('__sp()') - 210) < 0.01);
  g.run(`__mk(); CAMP.boost.on = false; __run(12); window.__off = [C.carrier.x, C.carrier.y, C.carrier.vx, C.carrier.vy, C.carrier.rot]; CAMP.boost.on = true;`);
  check('a run without Shift is IDENTICAL to a run with the boost switched off: x, y, the velocity and the heading, to the last digit (the boost multiplies by 1)', JSON.stringify(plain) === JSON.stringify(J('__off')), JSON.stringify([plain, J('__off')]));
  g.run(`__mk(); C.input.thrust = 0; C.input.turn = 1; __run(1);`);
  check('turn is the same 1.1 rad a second (it was not touched)', Math.abs(J('C.carrier.rot - campNew(1, [], { seed: 5, mission: 0 }).carrier.rot') - 1.1) < 0.001);
  g.run(`__mk(); C.input.boost = true; C.input.thrust = 0; __run(2);`);
  check('Shift without thrust does nothing: the store stays full and the cruiser does not move', J('C.boost.en') === 100 && J('__sp()') === 0 && J('C.boost.on') === false);
}

console.log('C. the boost');
{
  g.run(`__mk(); C.input.boost = true; __run(0.5); window.__half = __sp();`);
  check('half a second in from rest, the cruiser is already well above the plain top of 210 as it climbs (thrust 2.4 times)', J('__half') > 150);
  g.run(`__run(0.5); window.__one = __sp();`);
  check('one second in from rest it is at about 330 px/s (the top while boosting), and never over it', J('__one') > 300 && J('__one') <= 330.01 && J('__sp()') <= 330.01, J('__one'));
  g.run(`__mk(); __run(4); window.__cruise = __sp(); C.input.boost = true; __run(0.5); window.__burst = __sp();`);
  check('from the cruise at 210 a burst reaches 330 in half a second: the feel of the Long Haul\'s boost, on a heavy ship', Math.abs(J('__cruise') - 210) < 0.1 && J('__burst') > 320 && J('__burst') <= 330.01, JSON.stringify([J('__cruise'), J('__burst')]));
  g.run(`__mk(); C.input.boost = true; __run(1);`);
  check('the store drains at 25 a second: after a second of boost it holds 75', Math.abs(J('C.boost.en') - 75) < 0.9, J('C.boost.en'));
  g.run(`__run(3.1);`);
  check('four seconds from full: the store is empty and the boost locked (one dry event, the scene plays the click once)', J('C.boost.en') === 0 && J('C.boost.locked') === true && J('C.events.filter(e => e.type === "boost" && e.stage === "dry").length') === 1);
  g.run(`__run(0.3); window.__locked = [__sp(), C.boost.on];`);
  check('locked, Shift held with thrust is no boost: the speed is coming down (the top settles at 150 px/s each second, not a wall) and the store is not drained', J('__locked[0]') < 330 && J('__locked[1]') === false && J('C.boost.en') === 0);
  g.run(`__run(2.2); window.__down = __sp();`);
  check('two and a half seconds after it ran dry, the top is back at 210 (a fade of about 0.8 s: 330 to 210)', Math.abs(J('__down') - 210) < 0.5, J('__down'));
  g.run(`__mk(); C.input.boost = true; __run(1); const t0 = __sp(); C.input.boost = false; __run(0.2); window.__fade = [t0, __sp()];`);
  check('letting go of Shift is a fade, not a wall: 0.2 s later the speed has lost no more than 150 * 0.2 = 30 px/s from the top', J('__fade[0] - __fade[1]') <= 30.5 && J('__fade[1]') > 295, JSON.stringify(J('__fade')));
}

console.log('D. the refill and the lock');
{
  g.run(`__mk(); C.input.boost = true; __run(2); C.input.boost = false; window.__en0 = C.boost.en;`);
  check('after two seconds of boost the store holds 50', Math.abs(J('__en0') - 50) < 0.9, J('__en0'));
  g.run(`__run(0.9); window.__wait = C.boost.en;`);
  check('the store waits a second before it refills: 0.9 s after letting go it has not moved', Math.abs(J('__wait') - J('__en0')) < 0.01);
  g.run(`__run(3.1); window.__fill = C.boost.en;`);
  check('then 14 a second: three seconds of it later (4 s after letting go) the store holds about 50 + 14 * 3 = 92', Math.abs(J('__fill') - 92) < 3, J('__fill'));
  g.run(`__mk(); C.input.boost = true; __run(4.1); C.input.boost = true; C.input.thrust = 0; window.__t0 = C.t;`);
  check('run dry and out of thrust, nothing drains or boosts: Shift alone, the lock stays until a quarter is back', J('C.boost.locked') === true && J('C.boost.en') === 0);
  g.run(`C.input.boost = false; __run(0.8); window.__pause = [C.boost.en, C.boost.locked]; __run(1.8); window.__quarter = [C.boost.en, C.boost.locked]; __run(0.6); window.__lift = [C.boost.en, C.boost.locked];`);
  check('the lock holds until a quarter of the store is back: 0.8 s after it ran dry the pause has not run out (nothing back, locked), 2.6 s after the refill has just begun to count (under 25, locked), 3.2 s after a quarter is back (25 or more, free): the pause of a second and 1.8 s at 14 a second', J('__pause[1]') === true && J('__pause[0]') === 0 && J('__quarter[0]') < 25 && J('__quarter[0]') > 0 && J('__quarter[1]') === true && J('__lift[0]') >= 25 && J('__lift[1]') === false, JSON.stringify([J('__pause'), J('__quarter'), J('__lift')]));
  g.run(`__mk(); C.input.boost = true; C.nav = { on: true, fast: true }; __run(1); window.__nav = [C.boost.en, C.boost.on]; C.nav = null;`);
  check('the autopilot\'s own burn is not the boost: with it on the store is not drained and Shift does nothing', J('__nav[0]') === 100 && J('__nav[1]') === false);
  g.run(`__mk(); C.input.boost = true; __run(6); window.__a = [C.carrier.x, C.carrier.y, C.boost.en]; __mk(); C.input.boost = true; __run(6); window.__b = [C.carrier.x, C.carrier.y, C.boost.en];`);
  check('deterministic: the same run twice is the same to the last digit', JSON.stringify(J('__a')) === JSON.stringify(J('__b')));
  check('the bots never press Shift (input.boost is false in a new battle), so the bot tables are what they were', J('campNew(1, [], { seed: 5 }).input.boost') === false && !/boost/.test(src('tools/campaign-bot.mjs')));
}

console.log('E. the flames');
{
  g.run(`__mk(); window.__u = { id: 'carrier', kind: 'carrier', hp: 600, x: 1000, y: 500, rot: 0, vx: 0, vy: 0 }; window.__dw = 98;`);
  check('engines off: no flame (a ship at rest or coasting has none: the old plain trail is gone for the cruiser)', J('slookFlameSpecs(__u, __dw, campFlameState(C)).length') === 0);
  const f = (th, boost, flare) => J(`slookFlameSpecs(__u, __dw, { th: ${th}, boost: ${boost}, flare: ${flare} })`);
  const t1 = f(1, 0, 0), t2 = f(1, 1, 0), t3 = f(0, 0, 1);
  check('two flames, one for each engine, at the stern (x = the hull\'s back, 49 px behind the middle), either side of the middle (6 percent of its length)', t1.length === 2 && t1.every(e => Math.abs(e.x - (1000 - 0.5 * 98)) < 0.01) && Math.abs(t1[0].y - 500 - 0.06 * 98) < 0.01 && Math.abs(t1[1].y - 500 + 0.06 * 98) < 0.01 && t1.every(e => e.key === 'slook-flame' && e.rot === 0));
  check('the flame grows with thrust: full thrust is 0.55 hull lengths (54 px), half thrust is half of that', Math.abs(t1[0].len - 0.55 * 98) < 0.01 && Math.abs(f(0.5, 0, 0)[0].len - 0.275 * 98) < 0.01);
  check('and flares bright and long while boosting: 1.45 hull lengths (142 px), and wider', Math.abs(t2[0].len - 1.45 * 98) < 0.01 && t2[0].wid > t1[0].wid && t2[0].len > 2.5 * t1[0].len);
  check('a brief flare when thrust starts: a flame at no thrust at all, 0.35 hull lengths, which then dies away (the boost\'s own state: the flare is 1 on the first frame of thrust and gone in a third of a second)', t3.length === 2 && Math.abs(t3[0].len - 0.35 * 98) < 0.01 && (g.run(`__mk(); C.boost = campBoostNew(); C.input.thrust = 1; __run(1 / 30);`), J('C.boost.flare') === 1) && (g.run(`__run(0.4);`), J('C.boost.flare') === 0));
  g.run(`window.__u.rot = Math.PI / 2;`);
  check('the flames turn with the ship: nose down the screen puts them above the stern, along the ship\'s own axis', (() => { const e = f(1, 0, 0); return e.every(q => Math.abs(q.rot - Math.PI / 2) < 1e-9) && Math.abs(e[0].y - (500 - 0.5 * 98)) < 0.01 && Math.abs(e[0].x - (1000 - 0.06 * 98)) < 0.01; })());
  check('a ship that is lost has none', J('slookFlameSpecs({ id: "c", kind: "carrier", hp: 0, x: 0, y: 0, rot: 0 }, 98, { th: 1, boost: 1, flare: 1 }).length') === 0);
  const fx = src('src/shiplookfx.js'), tex = fx.slice(fx.indexOf('const fm = SLOOKFX.flame; mk('), fx.indexOf('mk(kl.keys.ring1'));
  check('pale blue and white, never gold or amber: the texture is the friend\'s blue and white; one stretched sprite each (an image set to a size), no particles', /friendHi/.test(tex) && /ffffff/.test(tex) && !/protect|ffc857|ffd37a|gold|amber|emit/i.test(tex) && /setDisplaySize\(e\.len, e\.wid\)/.test(fx) && !/emitter|particles/.test(fx.slice(fx.indexOf('function slookFlameSpecs'), fx.indexOf('// ---- the kill ----'))));
  check('the cruiser has no plain trail while the flames are drawn: the frame returns before the trail for a carrier, and the flames hide with the switch off', /if \(u\.kind === 'carrier'\) \{/.test(fx) && /\(S\.flames \|\| \[\]\)\.forEach\(f => f\.setVisible\(false\)\)/.test(fx));
}

console.log('F. the page HUD');
{
  g.run(`__mk(); window.__bm = () => campPageHudBoost(C);`);
  check('a full store: the share 1, no percentage (it shows only below 100, as Shields and Hull), the word Boost, not on, not locked', (() => { const b = J('__bm()'); return b.frac === 1 && b.show === false && b.word === 'Boost' && b.on === false && b.locked === false; })());
  g.run(`C.input.boost = true; __run(2);`);
  check('boosting with half the store: 50 percent shown, on', (() => { const b = J('__bm()'); return Math.abs(b.frac - 0.5) < 0.01 && b.show === true && b.pct >= 49 && b.pct <= 50 && b.on === true && b.locked === false; })());
  g.run(`__run(3);`);
  check('run dry: nothing left, locked (amber), not on', (() => { const b = J('__bm()'); return b.frac === 0 && b.pct === 0 && b.locked === true && b.on === false; })());
  check('the model carries it in the left panel beside Shields and Hull (campPageModel: ship.shield, ship.hull, ship.boost)', J('Object.keys(campPageModel(C).ship).filter(k => ["shield", "hull", "boost"].indexOf(k) >= 0).join()') === 'shield,hull,boost');
  const hud = src('src/camppagehud.js'), css = src('src/camppagehud.css');
  check('a thin row of its own under the two meters (a ring would be taken for a ship: the rings of the panel are the pilots and the ships you protect): a word, a thin track, a percentage; bright and glowing while it boosts, amber while locked', /ph-row ph-boostrow/.test(hud) && /ph-fill ph-boost' \+ \(b\.on \? ' on' : b\.locked \? ' dry' : ''\)/.test(hud) && /\.ph-fill\.ph-boost\.on \{[^}]*box-shadow/.test(css) && /\.ph-fill\.ph-boost\.dry \{ background: var\(--ph-warn\)/.test(css));
  check('the word is the content table\'s (camp.corner.m.boost: Boost), shown never said', J(`uiText('camp.corner.m.boost')`) === 'Boost' && J(`VOICEPACK_FAMILIES.some(r => r.re.test('camp.corner.m.boost') && r.why && !r.spoken)`) === true);
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
