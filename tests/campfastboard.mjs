// smoke: the Campaign's Fast (the burn) with the wing aboard or out: it burns either way (the wing is towed), regular Fly is unaffected (plain Node, no Chrome)
// Card space-game-campaign-fast-board (Troy, 20 Nov 2026) made a burn wait for the wing aboard (refused with a ship out, a second press recalled it); card space-game-burn-with-wing-out (ORCH for Troy, 23 Nov 2026) took that rule
// away because the pilots start out and nothing recalls them: a burn runs with the wing out and tows it (tests/campburntow.mjs). src/campnav.js (campNavFly), the numbers are CAMP.nav (fast 2.2, tow), the words are content/text/campfast.md.
//   A. the numbers: the small ships are slower than the burn, near and far
//   B. the rule in the sim: aboard or out, Fast burns at once; regular Fly is unaffected; a regular trip made a burn in place; a burn to another place is a new trip
//   C. the words: "fly fast to Mars", "burn to the relic", "fly fast" (and the plain ones are as before), the dry check and what it does
//   D. the map's Fast button is always a burn
// Run: node tests/campfastboard.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__quiet = C => { C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); };
  window.__mars = C => campNavRows(C).find(r => r.id === 'place:mars');
  window.__ev = (C, key) => C.events.filter(e => e.type === 'nav' && e.key === key);
  window.__new = () => { const C = __quiet(campNew('home', [], { seed: 1, god: true })); return C; };
`);

console.log('A. the numbers');
{
  check('a fighter (430 px/s) is slower than the burn, near (462) and far (672): they could not keep up', J('CAMP.fighter.speed') < J('CAMP.carrier.speed * CAMP.nav.fast') && J('CAMP.fighter.speed') < J('CAMP.carrier.speed * CAMP.nav.farFast'), J('[CAMP.fighter.speed, CAMP.carrier.speed * CAMP.nav.fast, CAMP.carrier.speed * CAMP.nav.farFast]').join(' '));
  check('a burn tows the wing: the factor is in the table (1.3), and the waits for the wing aboard are gone', J('CAMP.nav.tow') === 1.3 && J('CAMP.nav.recallWait') === null && J('CAMP.nav.askFor') === null);
}

console.log('B. the rule in the sim');
{
  g.run(`window.C = __new(); window.__r1 = campNavFly(C, __mars(C), true, 'key');`);
  check('with the wing aboard Fast burns: the autopilot is on and fast, no refusal', J('__r1.ok') === true && J('C.nav.fast') === true && J('C.nav.burn') === 2.2 && J('__r1.say') === '');
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); C.events.length = 0; window.__r2 = campNavFly(C, __mars(C), true, 'key');`);
  check('with the wing out Fast burns too (card space-game-burn-with-wing-out): ok, the autopilot is on and fast, nothing recalled, nothing waits', J('campNavOut(C)') === 3 && J('__r2.ok') === true && J('C.nav.fast') === true && J('C.nav.burn') === 2.2 && J('C.orders.recall') === 0 && J('C.navWait') === null && J('C.fastAsk') === null);
  g.run(`window.__r3 = campNavFly(C, __mars(C), false, 'key');`);
  check('regular Fly is allowed with the wing out: the same trip at regular speed', J('__r3.ok') === true && J('C.nav.fast') === false && J('C.nav.burn') === 1);
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), false, 'key'); window.__n0 = C.nav; window.__s0 = C.nav.since; __run(C, 4); window.__v0 = Math.hypot(C.carrier.vx, C.carrier.vy); window.__w1 = campNavFly(C, __mars(C), true, 'key'); __run(C, 1);`);
  check('mid-flight, regular, with the wing out: Fast makes the same trip a burn in place (same trip, same start, fast on) and the carrier goes on, it does not brake', J('__w1.ok') === true && J('C.nav === __n0') && J('C.nav.fast') === true && J('C.nav.since === __s0') && J('Math.hypot(C.carrier.vx, C.carrier.vy)') >= J('__v0'), J('[__v0, Math.hypot(C.carrier.vx, C.carrier.vy)]'));
  g.run(`window.__w3 = campNavFly(C, __mars(C), false, 'key');`);
  check('and back to regular any time (wing aboard or not): the same trip, regular speed', J('__w3.ok') === true && J('C.nav === __n0') && J('C.nav.fast') === false);
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), false, 'key'); window.__old = C.nav; campNavFly(C, campNavRows(C).find(r => r.id === 'place:eros'), true, 'key');`);
  check('a burn asked for a different place with the wing out: a new trip to it, at the burn (the old one is given up)', J('C.nav !== __old') && J('C.nav.id') === 'place:eros' && J('C.nav.fast') === true);
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), true, 'key'); campNavFly(C, __mars(C), false, 'key');`);
  check('a regular trip asked in a burn takes over at regular speed', J('C.nav.fast') === false && J('C.nav.burn') === 1);
}

console.log('C. the words');
{
  const I = t => J(`campNavIntent(${JSON.stringify(t)})`);
  check('"fly fast to Mars", "fly to Mars fast", "burn to the relic", "go fast to the relic": a burn to that place', I('fly fast to Mars').arg === 'fast mars' && I('fly to Mars fast').arg === 'fast mars' && /^fast (the )?relic$/.test(I('burn to the relic').arg) && /^fast (the )?relic$/.test(I('go fast to the relic').arg), JSON.stringify([I('fly fast to Mars'), I('fly to Mars fast'), I('burn to the relic')]));
  check('"fly fast", "burn" and "full burn" with no place: a burn to the objective', ['fly fast', 'burn', 'full burn', 'fast travel'].every(t => I(t) && I(t).arg === 'fast the objective'), JSON.stringify(['fly fast', 'burn', 'full burn'].map(I)));
  check('the plain words are as before: "fly to Mars", "go to the relic", "take me to the objective", "cancel the course"', I('fly to Mars').arg === 'mars' && /^(the )?relic$/.test(I('go to the relic').arg) && /^(the )?objective$/.test(I('take me to the objective').arg) && I('cancel the course').arg === 'stop');
  g.run(`window.C = __new(); window.__ck1 = campNavCheck(C, 'fast mars');`);
  check('the dry check with the wing aboard: ok, a burn, the usual line', J('__ck1.ok') === true && J('__ck1.fast') === true && /Mars/.test(J('__ck1.say')) && (g.run('campNavDo(C, __ck1)'), J('C.nav.fast') === true));
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); C.events.length = 0; window.__ck2 = campNavCheck(C, 'fast mars'); campNavDo(C, __ck2);`);
  check('with the wing out the words are heard as a burn, the usual line (no refusal), and doing it burns', J('campNavOut(C)') === 3 && J('__ck2.ok') === true && J('__ck2.fast') === true && /Mars/.test(J('__ck2.say')) && J('C.nav && C.nav.fast') === true && J('C.fastAsk') === null);
  check('a regular word ("fly to Mars") with the wing out just flies', (g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); window.__ck4 = campNavCheck(C, 'mars'); campNavDo(C, __ck4);`), J('C.nav && C.nav.fast') === false));
}

console.log('D. the map\'s Fast button');
{
  g.run(`
    window.__calls = []; window.__mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'visible' ? true : __mk(path + '.' + String(k))), apply: (t, self, args) => { __calls.push([path, args]); return __mk(path + '()'); } });
    window.__said = []; toast = (s, m) => { __said.push(m); };
    window.__scx = level => { const C = __quiet(campNew(level, [], { seed: 3, god: true }));
      return { camp: C, mode: 'play', add: { rectangle: () => __mk('r'), graphics: () => __mk('g'), text: (x, y, t) => { const o = { x, y, t, visible: true, rowId: '', width: 190, height: 24, alpha: 1, setText(v) { o.t = v; return o; }, setBackgroundColor(c) { o.bg = c; return o; }, setColor() { return o; }, setAlpha(a) { o.alpha = a; return o; }, setVisible(v) { o.visible = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, destroy() { o.gone = true; } }; return o; } }, make: __mk('make'), input: { handlers: [], on(e, f) { this.handlers.push([e, f]); }, off(e, f) { this.handlers = this.handlers.filter(h => h[1] !== f); } } }; };
    window.M = __scx('home'); campMapOpen(M); campMapPaint(M, 0); M.camp.carrier.x = 0; M.camp.carrier.y = 0; M.mp.dirty = true; campMapPaint(M, 300);
    window.__mr = campNavRows(M.camp).find(r => r.id === 'place:mars'); M.mp.setId = 'place:mars'; M.mp.dirty = true; campMapPaint(M, 600);
  `);
  check('with the wing aboard the Fast button has its key and time, undimmed', /^FAST\s+Shift\+Enter\s+\S+/.test(J('M.mp.btnFast.t')) && J('M.mp.btnFast.alpha') === 1, J('M.mp.btnFast.t'));
  g.run(`campOrder(M.camp, 'launch'); for (let i = 0; i < 30 * 7; i++) campStep(M.camp, 1 / 30); M.mp.dirty = true; M.mp.setId = 'place:mars'; campMapPaint(M, 900);`);
  check('with a ship out it is the same button: its key and time, undimmed (no "wing is out", no dimming)', /^FAST\s+Shift\+Enter\s+\S+/.test(J('M.mp.btnFast.t')) && !/wing is out|press again/.test(J('M.mp.btnFast.t')) && J('M.mp.btnFast.alpha') === 1 && J('campNavOut(M.camp)') === 3, J('M.mp.btnFast.t'));
  g.run(`M.camp.events.length = 0; window.__m1 = campMapFly(M, __mr, true);`);
  check('a press on it burns at once (true: it was taken): the destination is set and fast, nobody is recalled', J('__m1') === true && J('M.camp.nav && M.camp.nav.fast') === true && J('M.camp.orders.recall') === 0 && J('M.camp.navWait') === null);
  g.run(`M.mp.dirty = true; M.mp.setId = 'place:mars'; campMapPaint(M, 1200);`);
  check('the button then says ON, and Fly (regular) still works from the map', /ON$/.test(J('M.mp.btnFast.t')) && (g.run('window.__m3 = campMapFly(M, __mr, false)'), J('__m3') === true && J('M.camp.nav.fast') === false));
}

console.log('F. the words are in a file of their own');
{
  const md = src('content/text/campfast.md'), ct = src('src/contenttables.js'), keys = ['camp.nav.no.wingout', 'camp.nav.no.wingout2', 'camp.nav.recalling', 'camp.nav.recalltimeout', 'camp.nav.burnoff', 'camp.map.fastout', 'camp.map.fastask'];
  check('the seven lines of the wing-aboard rule are gone from the words file and the defaults (and the game does not know them)', keys.every(k => !md.includes('| ' + k + ' |') && !ct.includes("'" + k + "'") && J(`uiText('${k}', { n: 3, names: 'fighter 3' })`) === k));
  check('the lines that stay are rows of content/text/campfast.md and defaults of src/contenttables.js: the map\'s ON mark and the burn-off line', ['camp.map.on', 'camp.nav.burnfoe'].every(k => md.includes('| ' + k + ' |') && ct.includes("'" + k + "'") && J(`uiText('${k}')`) !== k));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN FAST BOARD FAIL (${failed} of ${n})` : `\nCAMPAIGN FAST BOARD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
