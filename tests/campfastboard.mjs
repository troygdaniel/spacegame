// smoke: the Campaign's Fast (the burn) needs the wing aboard: refused with a ship out, a second press recalls and burns, regular Fly is unaffected; the burn rows are the autopilot list's (I) (plain Node, no Chrome)
// Card space-game-campaign-fast-board (Troy, 20 Nov 2026): the small ships must not be able to go as fast as the carrier burns, so the wing has to be aboard before it can burn. src/campnav.js (campNavFly,
// campNavWait), the numbers are CAMP.nav (fast 2.2, recallWait, askFor), the words are content/text/campfast.md.
//   A. the numbers: the small ships are slower than the burn, near and far
//   B. the rule in the sim: aboard burns; out refuses the first press and remembers it; a second press recalls and burns when the last ship lands; the timeout names who is still out; regular Fly is unaffected
//   C. the words: "fly fast to Mars", "burn to the relic", "fly fast" (and the plain ones are as before), the dry check and what it does
//   D. the autopilot list's rows (I opens it directly, or P and its Autopilot row; then Up, Down and Enter: cards one-list-keys and list-shortcuts, 22 and 23 Nov 2026): "Fast burn to the goal" and "Fast burn to the target" are rows of their own
//      (no digit, no Shift), and they obey the rule
//   E. the map's Fast button says why and presses obey the rule
// Run: node tests/campfastboard.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
g.run('campFleetListSet(true)'); // this suite is about the lists' code, Q's pop-up included: it is switched off in the game (CAMP_FLEET_LIST, card space-game-q-selects-all) and on here; tests/campselect.mjs has the game's own state
g.run('campShipListSet(true)'); // and the ship list too: it is switched off in the game (CAMP_SHIP_LIST, card space-game-p-opens-power: P opens power) and on here; tests/campselect.mjs has the game's own state
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__quiet = C => { C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); };
  window.__mars = C => campNavRows(C).find(r => r.id === 'place:mars');
  window.__ev = (C, key) => C.events.filter(e => e.type === 'nav' && e.key === key);
  window.__new = () => { const C = __quiet(campNew('home', [], { seed: 1, god: true })); return C; };
  // press through the lists as the player does: the key of the list the row is in (campKeyVia; a part with no key of its own is reached through its parent: the parent's key, Down to the part's row, Enter), Down to the row, Enter.
  // The indexes are read from this mission's lists (campPanelList), not written here. null when the row is not in this mission's list
  window.__open = (P, C, listId, now) => { const def = campKeyList(listId); if (!def) return false; campPanelClose(P); if (def.key) { campPanelKey(P, C, def.code, now); return campPanelOpen(P) === listId; } if (!def.parent || !__open(P, C, def.parent, now)) return false; const i = campPanelList(C, def.parent).findIndex(r => r.open === listId); if (i < 0) return false; for (let k = 0; k < i; k++) campPanelKey(P, C, 'ArrowDown', now); campPanelKey(P, C, 'Enter', now); return campPanelOpen(P) === listId; };
  window.__pick = (P, C, rowId, now) => { const def = campKeyVia(rowId); if (!def) return null; const i = campPanelList(C, def.id).findIndex(r => r.id === rowId); if (i < 0 || !__open(P, C, def.id, now)) return null; for (let k = 0; k < i; k++) campPanelKey(P, C, 'ArrowDown', now); return campPanelKey(P, C, 'Enter', now); };
`);

console.log('A. the numbers');
{
  check('a fighter (430 px/s) is slower than the burn, near (462) and far (672): they could not keep up', J('CAMP.fighter.speed') < J('CAMP.carrier.speed * CAMP.nav.fast') && J('CAMP.fighter.speed') < J('CAMP.carrier.speed * CAMP.nav.farFast'), J('[CAMP.fighter.speed, CAMP.carrier.speed * CAMP.nav.fast, CAMP.carrier.speed * CAMP.nav.farFast]').join(' '));
  check('the waits are in the table: 20 s to get the wing back, 8 s to press again', J('CAMP.nav.recallWait') === 20 && J('CAMP.nav.askFor') === 8);
}

console.log('B. the rule in the sim');
{
  g.run(`window.C = __new(); window.__r1 = campNavFly(C, __mars(C), true, 'key');`);
  check('with the wing aboard Fast burns: the autopilot is on and fast, no refusal', J('__r1.ok') === true && J('C.nav.fast') === true && J('C.nav.burn') === 2.2 && J('__ev(C, "camp.nav.no.wingout").length') === 0);
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); C.events.length = 0; window.__r2 = campNavFly(C, __mars(C), true, 'key');`);
  check('with the wing out the first press of Fast is refused in words ("Wing is out: recall it first."), nothing flies, and an event says it for the screen', J('__r2.ok') === false && /^Wing is out: recall it first\./.test(J('__r2.say')) && J('C.nav') === null && J('__ev(C, "camp.nav.no.wingout").length') === 1 && J('!!C.fastAsk'));
  g.run(`window.__r3 = campNavFly(C, __mars(C), false, 'key');`);
  check('regular Fly is allowed with the wing out: the autopilot is on at regular speed, the wing keeps up', J('__r3.ok') === true && J('C.nav.fast') === false && J('C.nav.burn') === 1);
  g.run(`campNavClear(C, 'clear'); window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), true, 'key'); C.events.length = 0; window.__r4 = campNavFly(C, __mars(C), true, 'key');`);
  check('a second press within 8 s recalls the wing (the same order as the fifth of FLEET) and waits: "Recalling... 3 out."', J('__r4.ok') === true && J('__r4.waiting') === true && J('C.orders.recall') === 1 && J('!!C.navWait') && J('C.nav') === null && J('__ev(C, "camp.nav.recalling")[0].vars.n') === 3 && /^Recalling\.\.\. 3 out\.$/.test(J('uiText("camp.nav.recalling", { n: 3 })')));
  g.run(`window.__seen = []; for (let i = 0; i < 30 * 15 && C.navWait; i++) { campStep(C, 1 / 30); C.events.forEach(e => { if (e.key === 'camp.nav.recalling') __seen.push(e.vars.n); }); C.events.length = 0; }`);
  check('the ships land one by one (the count goes down) and when the last is aboard the burn starts by itself: fast, on the same place', J('C.navWait') === null && J('C.nav && C.nav.fast') === true && J('C.nav.id') === 'place:mars' && J('campNavOut(C)') === 0 && J('__seen.length') >= 1 && J('__seen').every((v, i, a) => !i || v < a[i - 1]), J('__seen').join());
  g.run(`campNavClear(C, 'clear'); window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), true, 'key'); campNavFly(C, __mars(C), true, 'key'); window.__far = campWing(C, 'fighter'); __far[0].x = C.carrier.x + 60000; __far[0].y = C.carrier.y; __far[1].x = C.carrier.x - 60000; __far[2].y = C.carrier.y + 70000; C.events.length = 0; window.__t0 = C.t; for (let i = 0; i < 30 * 25 && C.navWait; i++) { campStep(C, 1 / 30); } window.__ts = __ev(C, 'camp.nav.recalltimeout');`);
  check('a ship too far to be back in 20 s: the burn is given up at 20 s and the line names who is still out (the farthest first)', J('C.navWait') === null && J('C.nav') === null && J('__ts.length') === 1 && /^Recall timed out\. Still out: .+\.$/.test(J('uiText("camp.nav.recalltimeout", __ts[0].vars)')) && /fighter \d+/.test(J('__ts[0].vars.names')) && Math.abs((J('C.t') - J('__t0')) / 1000 - 20) < 1, J('__ts[0].vars.names'));
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), true, 'key'); __run(C, 9); window.__r5 = campNavFly(C, __mars(C), true, 'key');`);
  check('the first press is forgotten after 8 s: a press after that is a first press again (refused, the wing stays out)', J('__r5.ok') === false && J('__r5.refused') === true && J('C.navWait') === null && J('C.orders.recall') === 0);
  g.run(`campNavClear(C, 'clear'); window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), true, 'key'); campNavFly(C, __mars(C), true, 'key'); campNavClear(C, 'key'); __run(C, 15);`);
  check('a steering key (campNavClear) gives up the waiting burn: nothing starts when the wing lands', J('C.navWait') === null && J('C.nav') === null && J('campNavOut(C)') === 0);
  g.run(`window.C = __new(); campNavFly(C, __mars(C), true, 'key'); __run(C, 3); campOrder(C, 'launch'); __run(C, 1);`);
  check('launching the wing during a burn drops the burn to regular speed and says so', J('C.nav.fast') === false && J('C.nav.burn') === 1 && J('__ev(C, "camp.nav.burnoff").length') >= 1 && J('uiText("camp.nav.burnoff")') === 'Wing launched: burn off.');
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavGo(C, __mars(C), true);`);
  check('the rule cannot be walked round: campNavGo with fast and a ship out is a regular trip', J('C.nav.fast') === false);
  g.run(`window.C = __new(); campOrder(C, 'launch');`);
  check('a ship still in the launch queue counts as out (the wing is about to leave)', J('campNavOut(C)') === 3 && J('campNavFly(C, __mars(C), true, "key").ok') === false);
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), false, 'key'); window.__n0 = C.nav; window.__s0 = C.nav.since; __run(C, 4); C.events.length = 0; window.__w1 = campNavFly(C, __mars(C), true, 'key');`);
  check('mid-flight, regular, with the wing out: Fast is refused the first time and the regular trip goes on untouched (same trip object, regular speed)', J('__w1.ok') === false && J('C.nav === __n0') && J('C.nav.fast') === false && J('__ev(C, "camp.nav.no.wingout").length') === 1);
  g.run(`window.__w2 = campNavFly(C, __mars(C), true, 'key'); window.__hold = !!C.navWait && C.nav === __n0 && C.nav.fast === false; window.__v0 = Math.hypot(C.carrier.vx, C.carrier.vy); window.__vmin = __v0; for (let i = 0; i < 30 * 3; i++) { campStep(C, 1 / 30); __vmin = Math.min(__vmin, Math.hypot(C.carrier.vx, C.carrier.vy)); }`);
  check('the second press recalls the wing: the trip to the same place is kept (same trip) but the carrier brakes to a stop, so the wing can land', J('__w2.waiting') === true && J('__hold') && J('C.nav === __n0') && J('__vmin') < 100 && J('__v0') > 150, J('[__v0, __vmin]').join(' '));
  g.run(`for (let i = 0; i < 30 * 15 && C.navWait; i++) { campStep(C, 1 / 30); __vmin = Math.min(__vmin, Math.hypot(C.carrier.vx, C.carrier.vy)); }`);
  check('and when the last ship is aboard the same trip is made a burn in place (same trip, same start, fast on), and the carrier goes', J('C.navWait') === null && J('C.nav === __n0') && J('C.nav.fast') === true && J('C.nav.since === __s0') && J('campNavOut(C)') === 0, JSON.stringify(J('({ wait: !!C.navWait, same: C.nav === __n0, nav: C.nav && { fast: C.nav.fast, id: C.nav.id }, since: [C.nav && C.nav.since, __s0], out: campNavOut(C), t: C.t })')));
  g.run(`window.__w3 = campNavFly(C, __mars(C), false, 'key');`);
  check('and back to regular any time (wing aboard or not): the same trip, regular speed', J('__w3.ok') === true && J('C.nav === __n0') && J('C.nav.fast') === false);
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), false, 'key'); window.__old = C.nav; campNavFly(C, campNavRows(C).find(r => r.id === 'place:eros'), true, 'key'); campNavFly(C, campNavRows(C).find(r => r.id === 'place:eros'), true, 'key');`);
  check('a burn asked for a different place with the wing out: the old trip is given up (it is a new destination) and the burn waits for the wing', J('C.nav') === null && J('C.navWait.id') === 'place:eros');
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campNavFly(C, __mars(C), true, 'key'); campNavFly(C, __mars(C), false, 'key');`);
  check('a regular trip asked while a burn waits takes over: the wait is dropped', J('C.navWait') === null && J('C.nav.fast') === false);
}

console.log('C. the words');
{
  const I = t => J(`campNavIntent(${JSON.stringify(t)})`);
  check('"fly fast to Mars", "fly to Mars fast", "burn to the relic", "go fast to the relic": a burn to that place', I('fly fast to Mars').arg === 'fast mars' && I('fly to Mars fast').arg === 'fast mars' && /^fast (the )?relic$/.test(I('burn to the relic').arg) && /^fast (the )?relic$/.test(I('go fast to the relic').arg), JSON.stringify([I('fly fast to Mars'), I('fly to Mars fast'), I('burn to the relic')]));
  check('"fly fast", "burn" and "full burn" with no place: a burn to the objective', ['fly fast', 'burn', 'full burn', 'fast travel'].every(t => I(t) && I(t).arg === 'fast the objective'), JSON.stringify(['fly fast', 'burn', 'full burn'].map(I)));
  check('the plain words are as before: "fly to Mars", "go to the relic", "take me to the objective", "cancel the course"', I('fly to Mars').arg === 'mars' && /^(the )?relic$/.test(I('go to the relic').arg) && /^(the )?objective$/.test(I('take me to the objective').arg) && I('cancel the course').arg === 'stop');
  g.run(`window.C = __new(); window.__ck1 = campNavCheck(C, 'fast mars');`);
  check('the dry check with the wing aboard: ok, a burn, the usual line', J('__ck1.ok') === true && J('__ck1.fast') === true && /Mars/.test(J('__ck1.say')) && (g.run('campNavDo(C, __ck1)'), J('C.nav.fast') === true));
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); C.events.length = 0; window.__ck2 = campNavCheck(C, 'fast mars'); campNavDo(C, __ck2); window.__ck3 = campNavCheck(C, 'fast mars');`);
  check('with the wing out the words are heard: the answer is the refusal, doing it asks for the recall, the next check says it is coming', J('__ck2.ok') === true && /^Wing is out/.test(J('__ck2.say')) && J('C.nav') === null && J('!!C.fastAsk') && /^Recalling the wing/.test(J('__ck3.say')) && (g.run('campNavDo(C, __ck3)'), J('!!C.navWait')));
  check('a regular word ("fly to Mars") with the wing out just flies', (g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); window.__ck4 = campNavCheck(C, 'mars'); campNavDo(C, __ck4);`), J('C.nav && C.nav.fast') === false));
}

console.log('D. the autopilot list\'s rows');
{
  g.run(`window.C = __new(); window.P = campPanelNew(); window.__p1 = __pick(P, C, 'burn', 100);`);
  check('I, "Fast burn to the goal", Enter is a burn to the objective (wing aboard): the burn row, and the list closes', J('__p1.ran') === true && J('__p1.ok') === true && J('__p1.row') === 'burn' && J('__p1.open') === '' && J('C.nav && C.nav.fast') === true);
  g.run(`window.C = __new(); window.P = campPanelNew(); window.__p0 = __pick(P, C, 'goal', 100);`);
  check('the top row of the autopilot list (I), "Fly to the goal", is regular speed, as it was', J(`campKeyVia('goal').key`) === 'I' && J(`campPanelList(C, 'nav')[0].id`) === 'goal' && J('__p0.row') === 'goal' && J('__p0.ok') === true && J('C.nav && C.nav.fast') === false);
  g.run(`window.C = __new(); window.P = campPanelNew(); campPanelKey(P, C, 'KeyP', 100); window.__gi = campPanelList(C, 'ship').findIndex(r => r.open === 'nav'); for (let k = 0; k < __gi; k++) campPanelKey(P, C, 'ArrowDown', 100); window.__o1 = campPanelKey(P, C, 'ArrowRight', 100); for (let k = 0; k < campPanelList(C, 'nav').findIndex(r => r.id === 'burn'); k++) campPanelKey(P, C, 'ArrowDown', 100); window.__o2 = campPanelKey(P, C, 'Enter', 100);`);
  check('the same burn through the ship list: P, the Autopilot row (it shows its key, I), Right (or Enter) opens the autopilot list with no order given, then Down to the burn row and Enter burns', J('__gi') >= 0 && J(`campPanelRows(C, 'ship')[__gi].key`) === 'I' && J('__o1.used') === true && J('__o1.ran') === false && J('__o1.open') === 'nav' && J('__o2.ran') === true && J('__o2.ok') === true && J('__o2.row') === 'burn' && J('__o2.open') === '' && J('C.nav && C.nav.fast') === true);
  g.run(`window.C = __new(); window.P = campPanelNew(); window.__d = ['Digit9', 'Digit7', 'Digit8'].map(c => campPanelKey(P, C, c, 100));`);
  check('a digit is no key in flight: 9, 7 and 8 (the old burn, goal and target keys) are not used, give no order and set no course', J('__d.every(r => !r.used && !r.ran && r.open === "")') && J('C.nav') === null);
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); window.P = campPanelNew(); window.__p2 = __pick(P, C, 'burn', 100);`);
  check('the burn row with the wing out is refused the first time ("Wing is out": no course is set, the line is in the events and is what the key answers)', J('__p2.ran') === true && J('__p2.row') === 'burn' && J('C.nav') === null && J('C.navWait') === null && J('__ev(C, "camp.nav.no.wingout").length') >= 1 && J('__p2.say') === J('uiText("camp.nav.no.wingout")'));
  check('and it is a refusal to the list too: the answer is not ok and the autopilot list stays open on the row, so Enter again is the second press (as "Fast burn to the target" does, below)', J('__p2.ok') === false && J('__p2.open') === 'nav' && J('campPanelOpen(P)') === 'nav' && J(`campPanelList(C, 'nav')[P.at].id`) === 'burn', JSON.stringify(J('({ ok: __p2.ok, open: __p2.open, say: __p2.say })')));
  check('the goal row still flies at regular speed with the wing out', (g.run(`window.__p5 = __pick(P, C, 'goal', 300);`), J('__p5.ok') === true && J('C.nav && C.nav.fast') === false && J('campPanelOpen(P)') === ''));
  g.run(`window.C = __new(); campOrder(C, 'launch'); __run(C, 7); campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y); campTgtNearest(C); window.P = campPanelNew(); window.__p3 = __pick(P, C, 'burntarget', 100);`);
  check('"Fast burn to the target" obeys the same rule: with the wing out it is refused ("Wing is out") and the list stays open on the row, and "Fly to the target" still flies at regular speed', J('!!C.tgt') && J('__p3.ran') === true && J('__p3.ok') === false && J('__p3.open') === 'nav' && J('C.nav') === null && J('__ev(C, "camp.nav.no.wingout").length') >= 1 && (g.run(`window.__p4 = __pick(P, C, 'target', 300);`), J('__p4.ok') === true && J('C.nav && C.nav.fast') === false));
  check('the table has the rows for it: goal, target, burn, burntarget are four rows (burn: 1 on the two fast ones, the same autopilot), of the autopilot list (I, a part of the ship list), none has a key of its own, and the H page names only the lists\' keys (Q W, P O I U) and the keys every list shares (Up Down, Enter, Left, Esc)', J(`[campKeyList('nav').key, campKeyList('nav').parent].join()`) === 'I,ship' && J(`CAMP_PANELS.panels.find(p => p.id === 'nav').rows.filter(r => r.fly).map(r => r.id + ':' + r.fly + ':' + (r.burn || 0)).join()`) === 'goal:objective:0,target:target:0,burn:objective:1,burntarget:target:1' && J(`CAMP_PANELS.panels.every(p => p.rows.every(r => !('k' in r) && !('code' in r) && !('n' in r)))`) && J(`campPanelKeyRows().map(r => r.k.join(' ')).join('|')`) === 'Q|W|P|O|I|U|Up Down|Enter|Left Right|Esc' && J(`campKeyVar('rowburn')`) === 'Fast burn to the goal' && J(`campKeyVar('rowburntarget')`) === 'Fast burn to the target');
}

console.log('E. the map\'s Fast button');
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
  check('with a ship out it says "wing is out" and is dimmed', /wing is out/.test(J('M.mp.btnFast.t')) && J('M.mp.btnFast.alpha') < 1, J('M.mp.btnFast.t'));
  g.run(`M.camp.events.length = 0; window.__m1 = campMapFly(M, __mr, true);`);
  check('a press on it is refused (false) with the line in the events; the destination is not set', J('__m1') === false && J('M.camp.nav') === null && J('M.camp.events.some(e => e.key === "camp.nav.no.wingout")'));
  g.run(`M.mp.dirty = true; M.mp.setId = 'place:mars'; campMapPaint(M, 1200);`);
  check('after the first press the button says what the next one does: "press again: recall, then burn"', /press again/.test(J('M.mp.btnFast.t')), J('M.mp.btnFast.t'));
  g.run(`window.__m2 = campMapFly(M, __mr, true);`);
  check('the second press recalls the wing and waits (true: it was taken), and Fly (regular) still works from the map', J('__m2') === true && J('!!M.camp.navWait') && J('M.camp.orders.recall') === 1 && (g.run('window.__m3 = campMapFly(M, __mr, false)'), J('__m3') === true && J('M.camp.nav.fast') === false && J('M.camp.navWait') === null));
}

console.log('F. the words are in a file of their own');
{
  const md = src('content/text/campfast.md'), keys = ['camp.nav.no.wingout', 'camp.nav.no.wingout2', 'camp.nav.recalling', 'camp.nav.recalltimeout', 'camp.nav.burnoff', 'camp.map.fastout', 'camp.map.fastask'];
  check('every new line is a row of content/text/campfast.md and a default of src/contenttables.js, and the game reads them', keys.every(k => md.includes('| ' + k + ' |') && src('src/contenttables.js').includes("'" + k + "'") && J(`uiText('${k}', { n: 3, names: 'fighter 3' })`) !== k));
  check('the refusal is 12 words or fewer (it is said and shown)', J('uiText("camp.nav.no.wingout")').split(/\s+/).length <= 12);
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPAIGN FAST BOARD FAIL (${failed} of ${n})` : `\nCAMPAIGN FAST BOARD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
