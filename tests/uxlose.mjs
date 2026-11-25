// smoke: the Campaign's lose card says what happened, how far you got and one thing to try (plain Node, no Chrome)
// Card space-game-night-ux, finding 3 (docs/night/ux.md; src/camplose.js, src/campaignscene.js showLost). Before: "The carrier is lost." and "Enter try again". Now: that, how long it lasted
// (m:ss), the wave and the kills, and a tip for the reason. The debug key's lose has its own words (camp.lose.debug, in ui.md).
// The tips name the list an order is in by that list's key, from the key table ({vialaunch} is W, {viaattack} is W: src/data_controls.js, cards one-list-keys and list-shortcuts); an order has no digit of its own any more.
// Run: node tests/uxlose.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__said = []; shipcompSay = text => { __said.push(text); return true; }; window.__cards = [];
  window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = () => {};
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.showCard = function (title, lines, hint, tall) { __cards.push({ title, lines, hint }); this.card = [{ destroy() {} }]; this.panel = true; };
    f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); return f; };
  var C = campNew(1, [], { seed: 3 });
`);
check('the clock is m:ss', J('[0, 999, 59000, 61000, 125400, 3599000].map(campClock)').join() === '0:00,0:01,0:59,1:01,2:05,59:59');
g.run(`C.t = 102000; C.kills = 5; C.waves[0].started = true; C.waves[1].started = true;`);
const car = J(`campLoseLines(C, 'carrier')`), ear = J(`campLoseLines(C, 'earth')`), dbg = J(`campLoseLines(C, 'debug')`);
check('the carrier lost: the cause, how long and how far, and a tip to use the pilots early', car.length === 3 && car[0] === 'The cruiser is lost.' && car[1] === 'You lasted 1:42: wave 2 of 3, kills: 5.' && car[2] === 'Use the pilots early: they draw fire. Keep moving.', JSON.stringify(car));
check('Earth lost: the cause, the same numbers, and a tip to send the fighters at them early', ear.length === 3 && ear[0] === "Earth's shield has failed." && ear[1] === car[1] && ear[2] === 'Aliens at Earth shell it. Attack early: \\, then Enter.', JSON.stringify(ear));
g.run(`
  // do what a tip says: the key it names, then Enter (the first row), or the row it names
  window.__tip = (lvl, key, label) => { const c = campNew(lvl, [], { seed: 3 }), P = campPanelNew(), d = CAMP_PANELS.panels.find(p => p.key === key); let r = campPanelKey(P, c, d.code, 0); const open = r.open;
    const i = label ? campPanelList(c, open).findIndex(x => x.label === label) : 0; for (let k = 0; k < i; k++) campPanelKey(P, c, 'ArrowDown', 0); return { open, i, row: (campPanelList(c, open)[i] || {}).id, c, P }; };
`);
check('the tips name their keys from the key table ({keynear}, {keyorder}), never a digit: no order has a key of its own (cards one-list-keys, list-shortcuts, keys-orders)', ear[2].includes(': ' + J(`campKeyVar('keynear')`) + ', then ' + J(`campKeyVar('keyorder')`) + '.') && J(`campKeyVar('keyorder')`) === 'Enter' && J(`UI_TEXT['camp.lose.tip.earth'].includes('{keyorder}') && UI_TEXT['camp.lose.tip.earth'].includes('{keynear}')`) && ![...car, ...ear].some(l => /\(\d\)|\b\d (attacks|guards|launches)\b|[{}]/.test(l)), JSON.stringify([car[2], ear[2]]));
const tipA = J(`(() => { const c = campNew(1, [], { seed: 3 }); for (let i = 0; i < 30 * 3; i++) campStep(c, 1 / 30); campSpawn(c, 'raider', c.carrier.x + 900, c.carrier.y); const P = campPanelNew(); const k = campPanelKey(P, c, campKeyCodes('near')[0], 0), r = campPanelKey(P, c, campKeyCodes('order')[0], 0); return [!!c.tgt, k.used, r.ran, r.ok, r.row, c.orders.attack, campPanelOpen(P)]; })()`);
check('and what the tip says to press does it: the pick key takes the nearest hostile and W sends the pilots at it (they started out), with no list open', tipA.join() === 'true,true,true,true,attack,1,', JSON.stringify(tipA));
check('the debug key\'s lose has its own words and no tip, never the raw key', dbg.length === 2 && dbg[0] === 'The level was ended with the debug key.' && !dbg.some(l => /camp\./.test(l)), JSON.stringify(dbg));
check('a reason with no words of its own is "The level is lost." and a reason with odd characters is cleaned: never a raw key', J(`campLoseLines(C, 'nonsense')`)[0] === 'The level is lost.' && J(`campLoseLines(C, 'x.y/../z')`)[0] === 'The level is lost.' && J(`campLoseLines(C, undefined)`)[0] === 'The level is lost.');
check('no battle (null, or one with no level) leaves the numbers out, keeps the cause and the tip, and does not throw', J(`campLoseLines(null, 'carrier')`).length === 2 && J(`campLoseLines(null, 'carrier')`)[0] === 'The cruiser is lost.' && /^Use the pilots early/.test(J(`campLoseLines(null, 'carrier')`)[1]) && J(`campLoseLines({}, 'earth')`)[0] === "Earth's shield has failed.");
check('every line is short enough for the card: 100 letters at most (the card wraps at 720 px)', [...car, ...ear, ...dbg].every(l => l.length <= 100), [...car, ...ear].map(l => l.length).join());
// the scene
g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); __cards.length = 0; __said.length = 0; F.camp.t = 61000; F.camp.kills = 3; campHurt(F.camp, F.camp.carrier, 9999, 'x'); F.update(0, 33);`);
const card = J('__cards.pop()');
check('the lost card shows the cause, how far, and the tip, with Enter and T as before', J('F.mode') === 'lost' && card.lines.length === 3 && card.lines[0] === 'The cruiser is lost.' && /^You lasted 1:01: wave 0 of 3, kills: 3\.$/.test(card.lines[1]) && /Use the pilots early/.test(card.lines[2]) && card.hint === 'Enter  try again     T  title', JSON.stringify(card));
check('the voice says the cause and the tip, not the numbers (however the lines are split into utterances)', /The cruiser is lost\./.test(J('__said.join(" ")')) && /Use the pilots early/.test(J('__said.join(" ")')) && !/lasted|aliens down/.test(J('__said.join(" ")')), JSON.stringify(J('__said')));
g.run(`F.onKey({ code: 'Enter' })`);
check('Enter still tries again as "retry", T still goes to the title', J('__went.pop()').data.via === 'retry' && (g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); campHurt(F.camp, F.camp.carrier, 9999, 'x'); F.update(0, 33); F.onKey({ code: 'KeyT' })`), J('__went.pop()').key === 'Title'));
// the tune kit is off in the normal game (card space-game-debug-keys-off): the backslash that ended Troy's Mission 1 at 108 s now does nothing, and the pause card has no DEBUG line
g.run(`campDebugSet(false); window.F = __fake(1); F.onKey({ code: 'Enter' }); __cards.length = 0; CAMP_DEBUG.keys.forEach(r => F.onKey({ code: r.code })); F.update(0, 33);`);
check('with the kit off the four keys do nothing in the scene: the battle is still on, no card came up, no god mode', J('[F.camp.result, F.mode, __cards.length, !!F.camp.god]').join() === ',play,0,false', J('[F.camp.result, F.mode, __cards.length, !!F.camp.god]').join());
g.run(`__cards.length = 0; F.showPause();`);
check('and the pause card has no DEBUG line', !J('__cards.pop().lines').some(l => /DEBUG/.test(l)));
g.run(`campDebugSet(true); window.F = __fake(1); F.onKey({ code: 'Enter' }); __cards.length = 0; F.showPause();`);
check('with the kit on the pause card has the DEBUG line', J('__cards.pop().lines').some(l => /^DEBUG {2}' next level/.test(l)));
g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); __cards.length = 0; F.onKey({ code: 'Digit6' }); F.update(0, 33);`);
check('and the kit\'s win key (6: the backslash is the nearest threat now, card space-game-keys-select) wins the level', J('F.camp.result') === 'won', J('[F.camp.result, F.mode]').join());
g.run(`window.F = __fake(1); F.onKey({ code: 'Enter' }); __cards.length = 0; F.onKey({ code: 'Backslash' }); F.onKey({ code: 'Comma' }); F.update(0, 33);`);
check('and with the kit on the backslash and the comma are the player\'s, not the kit\'s: they neither win nor lose the level', J('F.camp.result') === '' || J('F.camp.result') === null, J('[F.camp.result, F.mode]').join());
g.run('campDebugSet(false)');
g.run(`campDebugSet(true); window.F = __fake(1); F.onKey({ code: 'Enter' }); __cards.length = 0; campDebugRun(F.camp, F.P, 'lose'); F.update(0, 33); campDebugSet(false);`); // the tune kit is off in the normal game (card space-game-debug-keys-off): this check turns it on, as a bot would
check('the debug lose key shows its own words on the card, not "camp.lose.debug"', J('__cards.pop().lines.join("|")').startsWith('The level was ended with the debug key.|You lasted'), '');
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `UX LOSE FAIL (${failed} of ${n})` : `UX LOSE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
