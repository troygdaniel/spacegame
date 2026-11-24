// smoke: the squares on the pilots and on the target held show when it is picked or an order is given, then fade after 3 seconds; the target stays held, its box and the who box stay; picking again (even the same one) or E shows them again
// Card space-game-pilot-squares-fade (src/camptarget.js campMarkNow, campMarkTouch; the drawing is src/camptargetdraw.js campTgtPaint; Troy, 24 Nov 2026: "have the reticle squares disappear from the pilots after a few seconds", and the same for the selected targets).
//   A  the table: CAMP.mark has the 3 s, the 0.6 s fade and the pilots' order counters, each with its comment
//   B  the clock: both squares are full at the start of a mission, full for 3 s, then fade over 0.6 s, then none
//   C  a pick brings its own square back: WHO (A D Q) the pilots', the enemy ([ ] \) or the friendly (O P, a map click) the target's; the same target picked again brings it back too
//   D  an order brings both back (the wing counters of C.orders, from E, the strip, the voice or the map); a missile, a power change and the convoy's orders do not; E itself does
//   E  nothing else: the same clock gives the same answer (a pause does not eat the 3 s), a new mission shows the squares again, the state is the rule's own (no scene property)
//   F  the drawing: after the fade no square is drawn on a pilot or the target, which is still held; its target box and the who box are still shown; a pick draws its square; half way through the fade is half the strength
// Run: node tests/campmarkfade.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

g.run(`
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.god = true; C.t = 1000; return C; }; // the three pilots are out beside the cruiser
  window.__foe = (dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__M = () => campMarkNow(C);
  window.__at = ms => { C.t = ms; return campMarkNow(C); };
  window.__pad = () => ({ pn: campPanelNew() });
  __new();
`);

// ---- A. the table ----
console.log('A. the table');
const camp = src('src/campaign.js');
check('CAMP.mark: the squares stay 3000 ms at full strength and fade over 600 ms', J('CAMP.mark.show') === 3000 && J('CAMP.mark.fade') === 600);
check('the orders that bring the squares back are the pilots\': launch, attack, escort, guard, recall, mine (a missile, a power change and the convoy\'s orders are not)', J('CAMP.mark.verbs').join() === 'launch,attack,escort,guard,recall,mine');
check('every number has its comment in the table', /show: 3000, +\/\/ ms/.test(camp) && /fade: 600, +\/\/ ms/.test(camp) && /verbs: \[[^\]]*\] +\/\/ the counters of C\.orders/.test(camp));

check('the 3 s is a row of the N tuning panel (Time: marktime, CAMP.mark.show, in ms, felt at once), with its words', J(`campTuneRow('marktime') && campTuneRow('marktime').path`) === 'mark.show' && J(`campTuneRow('marktime').group`) === 'time' && J(`campTuneRow('marktime').when`) === 'now' && J(`uiText('camp.ui.tune.row.marktime')`) === 'Pilot and target squares stay');
g.run(`__new(); C.t = 5000; __M(); campTuneSet('marktime', 6000); window.__t6 = [__at(10900).who, __at(11300).who, __at(12000).who]; campTuneReset('marktime');`);
check('turned up to 6 s on the panel the squares stay 6 s (and fade over the same 0.6 s); reset brings the 3 s back', J('__t6')[0] === 1 && J('__t6')[1] > 0 && J('__t6')[1] < 1 && J('__t6')[2] === 0 && J('CAMP.mark.show') === 3000);

// ---- B. the clock ----
console.log('B. the clock');
g.run(`__new(); C.t = 5000; window.__first = __M();`);
check('the first look in a mission (the mission began): both squares are full', J('__first.who') === 1 && J('__first.held') === 1, JSON.stringify(J('__first')));
check('full for 3 s (2999 ms after it is still full)', J('__at(7999).who') === 1 && J('__at(7999).held') === 1);
check('then the fade over 600 ms: half way is half, the end is none', near(J('__at(8300).who'), 0.5) && near(J('__at(8300).held'), 0.5) && J('__at(8600).who') === 0 && J('__at(8600).held') === 0 && J('__at(60000).who') === 0);

// ---- C. a pick brings its own square back ----
console.log('C. a pick');
g.run(`__new(); window.R1 = __foe(900, 0); __M(); __at(20000);`);
check('everything faded: none of the two', J('__M().who') === 0 && J('__M().held') === 0);
g.run(`campSelStep(C, 1);`);
check('WHO picked (D): the pilots\' square is back, the target\'s is not', J('__M().who') === 1 && J('__M().held') === 0 && J('C.sel') === 'pilot:red');
g.run(`__at(40000); campSelAll(C);`);
check('Q (all three pilots) brings the pilots\' square back, even with all three picked already', J('C.sel') === 'all' && J('__M().who') === 1 && J('__M().held') === 0);
g.run(`__at(60000); campTgtStep(C, 1);`);
check('an enemy picked ([ ] or the backslash): its square is back, the pilots\' is not', J('C.tgt') === J('R1.id') && J('__M().held') === 1 && J('__M().who') === 0);
g.run(`__at(80000); campTgtStep(C, 1);`);
check('the same enemy picked again (the only enemy: ] comes round to it): its square is back all the same', J('C.tgt') === J('R1.id') && J('__M().held') === 1 && J('__M().who') === 0);
g.run(`__at(100000); campTgtNearest(C);`);
check('the backslash (the nearest threat) brings it back too', J('__M().held') === 1);
g.run(`__at(120000);`);
const ward = J(`campFriList(C).length`);
if (ward) {
  g.run(`campFriStep(C, 1);`);
  check('a ship you protect picked (O P): its square is back, and the enemy is let go (one target)', J('C.fsel') !== '' && J('C.tgt') === '' && J('__M().held') === 1 && J('__M().who') === 0);
  g.run(`__at(140000); campFriStep(C, 1);`);
  check('the same one picked again (the only ship you protect): back as well', J('__M().held') === 1);
} else console.log('  (no ship to protect on this mission: the O P checks are skipped)');
g.run(`__at(160000); window.__hold = campFriHold(C, 'place:luna');`);
check('a click on a place of the Tab map holds it: that brings the target\'s square back (an outpost has none to draw)', J('__hold') === null || (J('__M().held') === 1 && J('C.fsel') === 'place:luna'));
g.run(`__at(180000); C.tgt = ''; C.fsel = ''; __M(); __at(200000); C.tgt = R1.id;`);
check('a pick by a path that is not a pick function (C.tgt set from a list row) brings it back too: what changed since the last look', J('__M().held') === 1);
check('every pick function says so: campMarkTouch is in the body of campSelAll, campSelStep, campTgtStep, campTgtNearest, campFriStep and campFriHold', ['campSelAll', 'campSelStep', 'campTgtStep', 'campTgtNearest', 'campFriStep', 'campFriHold'].every(f => { const t = src('src/camptarget.js'), a = t.indexOf('function ' + f + '('), b = t.indexOf('\nfunction ', a + 1); return a >= 0 && t.slice(a, b < 0 ? undefined : b).includes('campMarkTouch('); }));

// ---- D. an order brings both back ----
console.log('D. an order');
g.run(`__new(); window.R1 = __foe(900, 0); campTgtStep(C, 1); __M(); __at(30000);`);
check('everything faded', J('__M().who') === 0 && J('__M().held') === 0);
g.run(`C.orders.missiles++; C.orders.power++; C.orders.balance++; C.orders.convoy++; C.orders.repair = (C.orders.repair | 0) + 1;`);
check('a missile, a power change, the convoy\'s orders and a repair are not the pilots\' orders: nothing comes back', J('__M().who') === 0 && J('__M().held') === 0);
g.run(`window.__e = campSelOrder(C, 'engage', 'key');`);
check('E (an enemy held, the pilots out): the order is given (campSelOrder ok)', J('__e.ok') === true, JSON.stringify(J('__e')));
check('and both squares are back: the pilots\' and the target\'s', J('__M().who') === 1 && J('__M().held') === 1);
for (const v of ['launch', 'attack', 'escort', 'guard', 'recall', 'mine']) {
  g.run(`__at(C.t + 20000); C.orders.${v}++;`);
  check('the order counter ' + v + ' brings both back (from the strip, the voice or the map, as well as E)', J('__M().who') === 1 && J('__M().held') === 1);
}

// ---- E. nothing else ----
console.log('E. nothing else');
g.run(`__new(); __M(); C.t = 2000; window.__a1 = __M(); window.__a2 = __M();`);
check('the same clock gives the same answer, however often it is asked (a pause does not run the clock, so it does not eat the 3 s)', J('__a1.who') === J('__a2.who') && J('__a1.who') === 1);
g.run(`window.C1 = C; __at(90000); window.__c1 = __M(); window.C2 = __new(); window.__c2 = campMarkNow(C2);`);
check('a new mission shows the squares again (the state is kept per C: the old one had faded)', J('__c1.who') === 0 && J('__c2.who') === 1 && J('__c2.held') === 1 && J('CAMP_MARKS.get(C1) !== CAMP_MARKS.get(C2)'));
check('a clock that went back (a stand-in, a retry on the same C) does not keep the squares away', (() => { g.run(`window.C = C1; C.t = 95000; __M(); C.t = 100; window.__b = __M();`); return J('__b.who') === 1; })());
check('the rule is the pure file\'s (src/camptarget.js: no Phaser, no scene property), the state is a WeakMap per C, and no new script is needed', /const CAMP_MARKS = new WeakMap\(\)/.test(src('src/camptarget.js')) && !/campMarkNow|campMarkTouch/.test(src('index.html')) && !/this\.whoMark|s\.whoMark/.test(src('src/camptargetdraw.js')));

// ---- F. the drawing ----
console.log('F. the drawing');
g.run(`
  window.__rec = () => { const rec = { cols: [], al: [] }; rec.g = { active: true, scene: {}, clear() { rec.cols.length = 0; rec.al.length = 0; return rec.g; }, fillStyle(c, a) { rec.c = c; rec.a = a; return rec.g; }, fillRect() { rec.cols.push(rec.c); rec.al.push(rec.a); return rec.g; } }; return rec; };
  window.__scene = () => { const rec = window.REC = __rec(); return window.S = { camp: C, pn: campPanelNew(), mode: 'play', mp: null, cameras: { main: { zoom: 1 } }, tgtG: rec.g, hud: {}, add: {} }; };
  window.__strokes = () => { campTgtPaint(S); return { red: REC.cols.filter(c => c === CAMPTGT.color).length, green: REC.cols.filter(c => c === CAMPTGT.friend).length, max: Math.max(0, ...REC.al) }; };
  __new(); window.R1 = __foe(900, 0); campTgtStep(C, 1); __scene(); C.t = 1000; __strokes();
`);
check('at the start of the mission: the enemy held has its red square (4 corners, 2 strokes each) and all three pilots their green ones', J('__strokes().red') === 8 && J('__strokes().green') === 24);
g.run(`C.t = 30000;`);
check('after the fade: no square, red or green, on anything', J('__strokes().red') === 0 && J('__strokes().green') === 0);
check('the target is still held, and its target box and the who box are still shown (their subjects are unchanged)', J('C.tgt') === J('R1.id') && J('campHeldNow(C).unit.id') === J('R1.id') && J('campTdispSubject(C, S.pn, 0) !== null') && J('campFdispSubject(C) !== null'));
g.run(`campTgtStep(C, 1);`);
check('picking the enemy again: its red square is back and the pilots\' are not (they were not picked)', J('__strokes().red') === 8 && J('__strokes().green') === 0);
g.run(`campSelStep(C, 1);`);
check('picking a pilot (D): the one pilot\'s green square is back, with the enemy\'s', J('__strokes().green') === 8 && J('__strokes().red') === 8);
g.run(`C.t = 60000; campSelAll(C);`);
check('Q: all three pilots are back; the enemy\'s square has faded by then', J('__strokes().green') === 24 && J('__strokes().red') === 0);
g.run(`C.t = 90000; window.__e2 = campSelOrder(C, 'engage', 'key');`);
check('E: both come back (the pilots\' and the enemy\'s)', J('__e2.ok') === true && J('__strokes().green') === 24 && J('__strokes().red') === 8);
g.run(`__strokes(); window.__full = __strokes().max; C.t += 3000 + 300; window.__half = __strokes().max;`);
check('the fade is a fade: full strength draws at least the pulse\'s weakest (0.65), half way draws no more than half (the strokes\' alpha follows the strength)', J('__full') >= 0.65 - 1e-9 && J('__half') <= 0.5 + 1e-9 && J('__half') > 0, JSON.stringify(J('[__full, __half]')));
g.run(`S.mode = 'map'; C.t += 1; window.__o = (campTgtPaint(S), REC.cols.length);`);
check('not in play (the map, a card): nothing is drawn, as before', J('__o') === 0);

console.log(failed ? `\nMARK FADE FAIL: ${failed} of ${n} checks failed` : `\nMARK FADE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
