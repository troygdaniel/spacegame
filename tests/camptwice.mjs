// smoke: Enter twice (card space-game-orders-f4-enter-twice; Troy, 27 Nov 2026, mock F; ORCH's answers): a second Enter within a second of one that was TAKEN switches the order just given to its secondary: a ship you protect, guard then escort; a rock field, mine then guard it; an enemy, the picked pilot attacks then the whole wing does (plain Node, no Chrome)
// src/camptarget.js campEnterTwice / campSelOrder 'engage' (CAMP_ENTER, CAMP.orderLine.twice); the line's small dim secondary and its swap are src/camporderline.js (alt, swapped) drawn by src/camppagehud.js (.ph-sa).
//   A  the table: which pick has which secondary (and which has none: nothing picked, your own ship, an outpost, an enemy with All pilots)
//   B  the timing: within 1 s the second Enter is the secondary; the third is the first again; after 1 s it is the first; a refused Enter, another pick, another who and a dry run arm nothing
//   C  the orders really given: guard then escort (the ship), mine then guard (a point at the field), attack by one pilot then by all three
//   D  the sentence line: the dim secondary before, the swap after (Wing attack Raider), the tip and the DOM
//   F  the line keeps the verb that was just done: after a mine Enter it reads mine (not the secondary guard) all through the second the second Enter is armed (card space-game-b14-c13-order-line-mine)
//   E  the keys: the real Enter key twice (the lists' door) says the secondary's words; the words exist
// Run: node tests/camptwice.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));

g.run(`window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3, mission: 1 }); C.arrivedAt = 0; for (let i = 0; i < 120; i++) campStep(C, 1 / 30); C.events.length = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__ord = k => campWingShips(C, k).map(u => (u.order && u.order.type) + ':' + ((u.order && (u.order.target || (u.order.at && (u.order.at.id || u.order.at.kind)))) || '')).join();
  window.__ship = () => campFriNumbered(C).find(e => !e.field).id;
  window.__foe = () => { const a = campSpawn(C, 'raider', C.carrier.x + 500, C.carrier.y); a.hold = true; campTgtHold(C, a.id); return a; };
  window.__dry = () => { const r = campSelOrder(C, 'engage', 'key', true); return { verb: r.verb, second: r.second, who: r.secondWho, given: r.given, ok: r.ok }; };`);

console.log('A. the table');
{
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); C.fsel = __ship();`);
  check('a ship you protect: guard first, escort second', J('__dry()').verb === 'guard' && J('__dry()').second === 'escort' && J('__dry()').given === 0, JSON.stringify(J('__dry()')));
  g.run(`C.fsel = 'field-0';`);
  check('a rock field: mine first, guard second (the pilots hold the field)', J('__dry()').verb === 'mine' && J('__dry()').second === 'guard');
  g.run(`C.fsel = ''; window.__a = __foe();`);
  check('an enemy with one pilot picked: he attacks first, the whole wing second (who: wing)', J('__dry()').verb === 'attack' && J('__dry()').second === 'attack' && J('__dry()').who === 'wing');
  g.run(`campSelPick(C, 'all', 'key');`);
  check('an enemy with All pilots: they already all attack, so there is no second', J('__dry()').second === null);
  g.run(`campTgtClear(C); C.fsel = 'me';`);
  check('your own ship (me): guard, and no second', J('__dry()').verb === 'guard' && J('__dry()').second === null);
  g.run(`C.fsel = ''; campSelPick(C, 'pilot:red', 'key');`);
  check('nothing picked: form up, and no second', J('__dry()').second === null && J('__dry()').verb === 'guard');
  g.run(`window.__pl = Object.keys(campPlaces(C.level)).filter(k => !campPlaces(C.level)[k].hidden)[0]; campFriHold(C, 'place:' + __pl);`);
  check('an outpost or planet held from the map: guard, and no second', J('campFriNow(C).kind') === 'post' && J('__dry()').verb === 'guard' && J('__dry()').second === null, JSON.stringify(J('__dry()')));
}

console.log('B. the timing');
{
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); C.fsel = __ship(); window.__r1 = campSelOrder(C, 'engage', 'key'); C.t += 400; window.__r2 = campSelOrder(C, 'engage', 'key');`);
  check('the first Enter is guard; 0.4 s later the second is escort (twice true, given 2)', J('__r1.verb') === 'guard' && J('__r2.verb') === 'escort' && J('__r2.twice') === true && J('__r2.given') === 2 && J('__r2.ok') === true);
  g.run(`C.t += 400; window.__r3 = campSelOrder(C, 'engage', 'key');`);
  check('a third Enter right after is the first again (guard): it toggles, never a third action', J('__r3.verb') === 'guard' && J('__r3.twice') === null && J(`__ord('red')`).indexOf('guard') === 0);
  g.run(`C.t += 1500; window.__r4 = campSelOrder(C, 'engage', 'key');`);
  g.run(`C.t += 1500; window.__r5 = campSelOrder(C, 'engage', 'key');`);
  check('after more than a second the next Enter is the first again, and the one after THAT within the second is the secondary', J('__r4.verb') === 'guard' && J('__r5.verb') === 'guard' && (g.run(`C.t += 500; window.__r6 = campSelOrder(C, 'engage', 'key');`), J('__r6.verb')) === 'escort');
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); C.fsel = __ship(); campSelOrder(C, 'engage', 'key'); C.t += 100; campSelPick(C, 'pilot:green', 'key'); window.__r2 = campSelOrder(C, 'engage', 'key');`);
  check('another WHO between the two Enters arms nothing: the second is the first order for Kara (guard)', J('__r2.verb') === 'guard' && J('__r2.twice') === null);
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); C.fsel = campFriNumbered(C).filter(e => !e.field)[0].id; campSelOrder(C, 'engage', 'key'); C.t += 100; C.fsel = campFriNumbered(C).filter(e => !e.field)[1].id; window.__r2 = campSelOrder(C, 'engage', 'key');`);
  check('another target between them arms nothing: the second Enter is the first order for the other miner (guard)', J('__r2.verb') === 'guard' && J('__r2.twice') === null);
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); C.fsel = __ship(); campSelOrder(C, 'engage', 'key', true); C.t += 100; window.__r2 = campSelOrder(C, 'engage', 'key');`);
  check('a dry run (the line and the chip ask it every frame) arms nothing: the first real Enter is the first', J('__r2.verb') === 'guard' && J('__r2.twice') === null);
  g.run(`__mk(); C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter').forEach(u => { u.hp = 0; u.gone = true; }); C.ships = C.ships.filter(u => u.hp > 0); C.bay.fighters = 0; C.launchQ = []; C.fsel = __ship(); window.__r1 = campSelOrder(C, 'engage', 'key'); C.t += 100; window.__r2 = campSelOrder(C, 'engage', 'key');`);
  check('a REFUSED first Enter (no pilot) arms nothing: both are refused, neither is the secondary', J('__r1.ok') === false && J('__r2.ok') === false && J('__r2.twice') === null);
}

console.log('C. the orders really given');
{
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); window.__sid = __ship(); C.fsel = __sid; campSelOrder(C, 'engage', 'key');`);
  const o1 = J(`__ord('red')`);
  g.run(`C.t += 300; campSelOrder(C, 'engage', 'key');`);
  check('a ship: Wedge guards it, then escorts it (the order type escort, the ship the target); Kara and Apollo are untouched', o1.indexOf('guard:') === 0 && J(`__ord('red')`) === 'escort:' + J('__sid') && J(`__ord('green')`).indexOf('guard:carrier') === 0, JSON.stringify([o1, J(`__ord('red')`), J(`__ord('green')`)]));
  g.run(`__mk(); campSelPick(C, 'pilot:green', 'key'); C.fsel = 'field-0'; window.__fl = campPickFields(C).find(f => f.id === 'field-0'); campSelOrder(C, 'engage', 'key');`);
  const m1 = J(`__ord('green')`);
  g.run(`C.t += 300; window.__r = campSelOrder(C, 'engage', 'key');`);
  check('a rock field: Kara mines its nearest rock, then guards the field (the order guard, its target a point at the field\'s middle)', m1 === 'mine:' + J('__fl.rock') && J('__r.ok') === true && J(`C.ships.find(u => u.squad === 'green').order.type`) === 'guard' && J(`C.ships.find(u => u.squad === 'green').order.tg.kind`) === 'point' && Math.abs(J(`C.ships.find(u => u.squad === 'green').order.tg.x`) - J('__fl.x')) < 1e-6, JSON.stringify([m1, J(`C.ships.find(u => u.squad === 'green').order`), J('__r.say')]));
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); window.__a = __foe(); campSelOrder(C, 'engage', 'key');`);
  const a1 = [J(`__ord('red')`), J(`__ord('green')`)];
  g.run(`C.t += 300; window.__r = campSelOrder(C, 'engage', 'key');`);
  check('an enemy: Wedge attacks it, then the whole wing does (Kara and Apollo too, the same target)', a1[0] === 'attack:' + J('__a.id') && a1[1].indexOf('attack') !== 0 && J(`__ord('green')`) === 'attack:' + J('__a.id') && J(`__ord('yellow')`) === 'attack:' + J('__a.id') && J('__r.twice') === true, JSON.stringify([a1, J(`__ord('green')`)]));
}

console.log('D. the sentence line');
{
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); C.fsel = __ship(); campOrderLineNow(C);`);
  let L = J('campOrderLineNow(C)');
  check('before: the line reads "Wedge guard <ship>" with the secondary dim: alt "escort"', L && L.verb.t === 'guard' && L.alt && L.alt.t === 'escort' && L.swapped === false, JSON.stringify(L && [L.verb, L.alt]));
  g.run(`campSelOrder(C, 'engage', 'key'); C.t += 300; campSelOrder(C, 'engage', 'key'); C.t += 50;`);
  L = J('campOrderLineNow(C)');
  check('after the second Enter the line swaps: the verb is escort, the dim one is guard, with a check', L && L.verb.t === 'escort' && L.alt && L.alt.t === 'guard' && L.swapped === true && L.check === true, JSON.stringify(L && [L.verb, L.alt, L.swapped, L.check]));
  check('the tip follows the line: "Wedge will escort"', L.tip.text === 'Wedge will escort', L.tip.text);
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); window.__a = __foe(); campOrderLineNow(C);`);
  L = J('campOrderLineNow(C)');
  check('an enemy: "Wedge attack Raider n" with the dim "wing attack"', L && L.who.t === 'Wedge' && L.verb.t === 'attack' && /^Raider/.test(L.target.t) && L.alt && L.alt.t === 'wing attack', JSON.stringify(L && [L.who, L.verb, L.alt]));
  g.run(`campSelOrder(C, 'engage', 'key'); C.t += 300; campSelOrder(C, 'engage', 'key'); C.t += 50;`);
  L = J('campOrderLineNow(C)');
  check('after the second Enter: "Wing attack Raider n" (ORCH: Troy chose it), the dim one "Wedge attack"; the tip "Wing will attack"', L && L.who.t === 'Wing' && L.who.ghost === false && L.verb.t === 'attack' && /^Raider/.test(L.target.t) && L.alt && L.alt.t === 'Wedge attack' && L.tip.text === 'Wing will attack', JSON.stringify(L && [L.who, L.verb, L.alt, L.tip.text]));
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key');`);
  check('nothing picked or me: no dim secondary on the line', J('campOrderLineNow(C).alt') === null);
  // the page's line: the DOM
  g.run(`{
    window.__writes = 0; window.__els = [];
    const mk = tag => { const e = { tag, children: [], parentNode: null, _cls: '', _text: '', _inner: '', style: new Proxy({ setProperty(k, v) { __writes++; this[k] = v; } }, { set(o, k, v) { if (k !== 'setProperty') __writes++; o[k] = v; return true; } }) };
      Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { __writes++; e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { __writes++; e._text = v; } }); Object.defineProperty(e, 'innerHTML', { get() { return e._inner; }, set(v) { e._inner = v; } });
      e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.insertBefore = (c, ref) => { c.parentNode = e; const i = e.children.indexOf(ref); e.children.splice(i < 0 ? e.children.length : i, 0, c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); }; e.setAttribute = () => {}; e.addEventListener = () => {}; e.remove = () => {};
      e.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720, bottom: 150 }); __els.push(e); return e; };
    window.document = { createElement: mk, body: mk('body') };
    window.__scene = () => ({ camp: C, mode: 'play', mp: null, game: { canvas: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 1280, height: 720 }) } }, events: { once() {} } });
  }`);
  g.run(`CAMP.flags.pagehud = true; __mk(); campSelPick(C, 'pilot:red', 'key'); C.fsel = __ship(); window.S = __scene(); campPageHudSync(S, 100);`);
  check('the page: the dim "⏎⏎ escort" after the words, in its own span (class ph-sa)', J('S.pageHud.sent.alt._text') === '⏎⏎ escort' && J('S.pageHud.sent.alt._cls') === 'ph-sa' && J('S.pageHud.sent.alt.style.display') !== 'none', J('[S.pageHud.sent.alt._text, S.pageHud.sent.alt.style.display]'));
  g.run(`campSelOrder(C, 'engage', 'key'); C.t += 300; campSelOrder(C, 'engage', 'key'); C.t += 50; campPageHudSync(S, 200);`);
  check('after the second Enter the page swaps: the verb word is escort and the dim one "⏎⏎ guard"', J('S.pageHud.sent.verb._text') === 'escort' && J('S.pageHud.sent.alt._text') === '⏎⏎ guard', J('[S.pageHud.sent.verb._text, S.pageHud.sent.alt._text]'));
  g.run(`CAMP.flags.pagehud = false;`);
}

console.log('E. the keys and the words');
{
  g.run(`__mk(); window.P = campPanelNew(); campSelPick(C, 'pilot:red', 'key'); C.fsel = __ship(); window.__k1 = campPanelKey(P, C, 'Enter', 1000); C.t += 300; window.__k2 = campPanelKey(P, C, 'Enter', 1300);`);
  check('the real Enter key twice: the first says guard, the second escort, in the order\'s own words', J('__k1.ran') === true && J('__k1.ok') === true && /guard/i.test(J('__k1.say')) && J('__k2.ok') === true && /escort/i.test(J('__k2.say')), J('[__k1.say, __k2.say]'));
  check('the words: Escort, Wing, and the window is a second', J(`uiText('camp.corner.enter.escort')`) === 'Escort' && J(`uiText('camp.corner.orderline.wing')`) === 'Wing' && J('CAMP.orderLine.twice') === 1000);
}

console.log('F. the line keeps the verb that was just done (card space-game-b14-c13-order-line-mine; the cloud\'s BRIEF 14 chunk 13)');
{
  // the page's test as a run: 3.2, W 1, E 1: "Wedge mine Rock field 1"; Enter: the radio says "Wedge, mine the rock." and the line still reads "Wedge mine Rock field 1" with its tick, all through the second the second Enter is armed (it read guard)
  g.run(`window.C = campNew(3, [], { seed: 3, mission: 1 }); C.arrivedAt = 0; for (let i = 0; i < 120; i++) campStep(C, 1 / 30); C.events.length = 0; campSelPick(C, 'pilot:red', 'key'); campFriJump(C, 1); window.__line = () => { const L = campOrderLineNow(C); return L && [L.who.t, L.verb.t, L.target.t, L.alt && L.alt.t, L.check, L.swapped].join(' | '); };`);
  check('3.2, W 1 E 1: the line reads "Wedge | mine | Rock field 1" with the dim "guard" beside it', J('__line()') === 'Wedge | mine | Rock field 1 | guard | false | false', J('__line()'));
  g.run(`window.__r = campSelOrder(C, 'engage', 'key');`);
  check('Enter: the radio says "Wedge, mine the rock."', J('__r.say') === 'Wedge, mine the rock.' && J('__r.verb') === 'mine', J('__r.say'));
  const seen = [];
  for (const ms of [0, 100, 300, 500, 700, 900, 999, 1100, 1500, 2100]) { g.run(`C.t += ${ms ? 100 : 0};`); if (ms >= 300) g.run('C.t += 100'); seen.push(J('__line()')); }
  check('and the line says what happened at every look after it: mine, with its tick, the dim guard beside it, never guard (it read guard for about a second)', seen.slice(0, 8).every(x => x.startsWith('Wedge | mine | Rock field 1 | guard | true | false')) && seen.every(x => !/^Wedge \| guard/.test(x)), JSON.stringify(seen));
  g.run(`C.t = C.t - C.t + C.t;`);
  const dry = J(`(() => { const r = campSelOrder(C, 'engage', 'key', true); return [r.verb, r.second, r.given].join(); })()`);
  check('the dry run (the line and the Enter chip ask it every frame) says the first Enter\'s own verb with the secondary beside it, also while the second Enter is armed', dry === 'mine,guard,1' || /^mine,guard,[01]$/.test(dry), dry);
  g.run(`campSelOrder(C, 'engage', 'key', false);`);
  g.run(`C.t += 200; window.__r2 = campSelOrder(C, 'engage', 'key'); C.t += 50;`);
  check('the second Enter within the second still switches: the order on Wedge is guard and the line swaps to "guard" with the dim "mine"', J('__r2.verb') === 'guard' && J('__r2.twice') === true && /^Wedge \| guard \| Rock field 1 \| mine/.test(J('__line()')), J('__line()'));
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); C.fsel = __ship(); campOrderLineNow(C); campSelOrder(C, 'engage', 'key'); C.t += 100;`); // (the page looks every frame: the first look is before the Enter)
  const shipLine = J('(() => { const L = campOrderLineNow(C); return L && [L.who.t, L.verb.t, L.target.t, L.alt && L.alt.t, L.check, L.swapped].join(" | "); })()');
  check('the same for a ship: after the first Enter (guard) the line keeps guard, with the dim escort', /^Wedge \| guard \| .* \| escort \| true \| false$/.test(shipLine), shipLine);
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); window.__a = __foe(); campOrderLineNow(C); campSelOrder(C, 'engage', 'key'); C.t += 100;`);
  check('and for an enemy: it keeps "Wedge attack Raider" with the dim "wing attack"', J('(() => { const L = campOrderLineNow(C); return L && [L.who.t, L.verb.t, L.alt && L.alt.t, L.swapped].join(" | "); })()') === 'Wedge | attack | wing attack | false');
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('ENTER TWICE FAIL (' + failed + ')'); process.exit(1); } else console.log('ENTER TWICE PASS');
