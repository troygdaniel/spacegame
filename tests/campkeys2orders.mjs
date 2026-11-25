// smoke: W is the one order key (attack, guard, form up; it was E until card space-game-keys4-onekey), E, G and R are free, there is no recall, a badly hurt pilot returns by itself and comes back repaired (plain Node, no Chrome)
// Card space-game-keys2-orders (Troy, 23 Nov 2026: "E is the one order key and does the fitting thing for who is picked: attack if the target is an enemy, guard if it is a friendly, form up on the cruiser if nothing is picked. G and R are freed. No recall: pilots stay out all mission. A badly hurt pilot breaks off and returns to the cruiser by itself, then comes back out repaired").
// src/data_controls.js (the table: CAMP_KEYS.order), src/camptarget.js (campSelOrder 'engage'), src/camppanel.js (the key), src/camprepair.js (the return), src/camptune.js (the two numbers on the N panel).
//   A. the table: W is CAMP_KEYS.order; attack, guard and recall are gone from it; G and R mean nothing in a battle
//   B. E with an enemy picked attacks it; with a friendly picked guards it; with nothing picked forms up on the cruiser (the dry run says so, and moves nothing); one pilot picked takes it alone
//   C. a pilot in the bay (being mended, or landed for the Fast burn) is launched by E, as any order does
//   D. no recall: the key does nothing, the pilots stay out; the Fast burn still pulls them in (campNavOut)
//   E. a hurt pilot (under 25 percent) breaks off by itself, lands, is mended 20 s at no ore, and goes out again whole with its order, even when there is no fight; the two numbers are on the N panel
// Run: node tests/campkeys2orders.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const sec = (name, fn) => { console.log(name); try { fn(); } catch (e) { check(name + ': ran without a throw', false, e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  CAMP.levels[1].missions.push({ id: 'k2', kind: 'escort', par: 100, place: 'ceres', dock: 'ceres', start: 'ceres', startAt: [130, 30], rocks: [], objectives: [{ type: 'hold', secs: 100000 }], bonus: [], convoys: [], waves: [], traffic: [] });
  window.__M = CAMP.levels[1].missions.length - 1;
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__raider = (dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__hauler = (id, name, dx, dy) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y + dy); f.id = 'freighter-' + id; C.by[f.id] = f; f.dest = { x: C.carrier.x + dx + 400, y: C.carrier.y + dy }; f.cname = name; f.named = true; return f; };
  window.__new = () => { window.C = campNew(1, [], { seed: 5, god: false, mission: __M }); C.arrivedAt = 0; return C; };
  window.__out = () => campWing(C, 'fighter');
  window.__pn = () => { window.PP = campPanelNew(); return PP; };
  window.__k = (c, t) => campPanelKey(PP, C, c, t || 0);
`);

sec('A. the table', () => {
  check('Enter is the one order key: CAMP_KEYS.order is Enter (Enter, NumpadEnter; the old engage is gone); recall is not in the table; attack and guard are only the letter the target boxes read (Enter, no code: they take no key)', J(`CAMP_KEYS.order.k`) === 'Enter' && J(`CAMP_KEYS.order.codes.join()`) === 'Enter,NumpadEnter' && J(`!CAMP_KEYS.engage`) && J(`!!CAMP_KEYS.recall`) === false && J(`['attack', 'guard'].every(id => CAMP_KEYS[id].k === 'Enter' && CAMP_KEYS[id].codes.length === 0)`) === true);
  check('G is on no key of the table (it is free); R is the missiles\' (card space-game-missiles-cost-ore: only CAMP_KEYS.reload has it)', J(`Object.keys(CAMP_KEYS).every(id => !CAMP_KEYS[id].codes.some(c => c === 'KeyG'))`) === true && J(`Object.keys(CAMP_KEYS).filter(id => CAMP_KEYS[id].codes.some(c => c === 'KeyR')).join()`) === 'reload');
  check('{keyorder} is E in the hints (no text names {keyengage}, {keyattack}, {keyguard} or {keyrecall} any more: build-content and the suites read them)', J(`campKeyVar('keyorder')`) === 'Enter' && J(`campKeyVar('keyengage')`) === '' && J(`campKeyVar('keyrecall')`) === '');
});

sec('B. E does the fitting order', () => {
  g.run('__new(); window.__r1 = __raider(900, 300); window.__h1 = __hauler(1, "Hauler One", 300, -200); __run(1);');
  check('three pilots are out, guarding the cruiser, no pick held', J('__out().length') === 3 && J('!C.tgt && !C.fsel'));
  // an enemy picked: attack it
  g.run('C.tgt = __r1.id; C.fsel = ""; C.sel = "all";');
  const dryA = J(`campSelOrder(C, 'engage', 'key', true)`);
  check('the dry run with an enemy picked says attack, and moves nothing', dryA.ok === true && dryA.verb === 'attack' && J(`__out().every(u => u.order.type === 'guard')`), JSON.stringify(dryA));
  const a = J(`campSelOrder(C, 'engage', 'key')`);
  check('E with an enemy picked: all three pilots attack it', a.ok === true && a.verb === 'attack' && J(`__out().every(u => u.order.type === 'attack' && u.order.target === __r1.id)`), JSON.stringify(a));
  // a friendly picked: guard it
  g.run('C.tgt = ""; C.fsel = __h1.id;');
  const dryB = J(`campSelOrder(C, 'engage', 'key', true)`);
  check('the dry run with a friendly picked says guard', dryB.ok === true && dryB.verb === 'guard', JSON.stringify(dryB));
  const b = J(`campSelOrder(C, 'engage', 'key')`);
  check('E with a friendly picked: all three pilots guard that ship', b.ok === true && b.verb === 'guard' && J(`__out().every(u => u.order.type === 'guard' && u.order.at && u.order.at.id === __h1.id)`), JSON.stringify(b) + J(`JSON.stringify(__out().map(u => u.order))`));
  // nothing picked: form up on the cruiser
  g.run('C.tgt = ""; C.fsel = "";');
  const dryC = J(`campSelOrder(C, 'engage', 'key', true)`);
  check('the dry run with nothing picked says form up (ok, formup), and moves nothing', dryC.ok === true && dryC.formup === true && J(`__out().every(u => u.order.at && u.order.at.id === __h1.id)`), JSON.stringify(dryC));
  const c = J(`campSelOrder(C, 'engage', 'key')`);
  check('E with nothing picked: the pilots form up on the cruiser (guard the cruiser); it does not pick the nearest enemy', c.ok === true && c.formup === true && J(`__out().every(u => u.order.type === 'guard' && u.order.at.kind === 'carrier')`) && J('!C.tgt'), JSON.stringify(c));
  // one pilot picked takes it alone
  g.run('C.tgt = __r1.id; C.sel = "pilot:green";');
  const d = J(`campSelOrder(C, 'engage', 'key')`);
  check('one pilot picked (Kara): she alone attacks, the other two keep guarding the cruiser', d.ok === true && J(`__out().filter(u => u.order.type === 'attack').map(u => campPilotName(u)).join()`) === 'Kara' && J(`__out().filter(u => u.order.type === 'guard').length`) === 2);
  // the key itself
  g.run('C.sel = "all"; C.tgt = ""; C.fsel = ""; __pn();');
  const e = J(`__k('Enter')`), e0 = J(`__k('KeyG')`);
  check('the key E in the panel code gives the order (form up with nothing picked; G is free: it is used by nothing)', e.used === true && e.ran === true && e.ok === true && e0.used === false && e0.ran === false, JSON.stringify(e));
});

sec('C. a pilot in the bay is launched by E', () => {
  g.run('__new(); window.__r1 = __raider(900, 300);');
  // put Kara in the bay the way the Fast burn does: recalled and landed
  g.run(`campWingOrder(C, 'green', 'recall', null, 'key'); for (let i = 0; i < 60 && __out().some(u => u.squad === 'green'); i++) __run(1);`);
  check('Kara landed (the Fast burn recall still works as an order), Wedge and Apollo are out', J('C.bay.fighters') === 1 && J(`__out().map(u => u.squad).sort().join()`) === 'red,yellow', J('C.bay.fighters') + ' ' + J(`__out().map(u => u.squad).join()`));
  g.run('C.tgt = __r1.id; C.sel = "all";');
  const r = J(`campSelOrder(C, 'engage', 'key')`);
  check('E with the enemy picked launches Kara with the others: all three attack', r.ok === true && J('C.bay.fighters') === 0 && J(`__out().length`) === 3 && J(`__out().every(u => u.order.type === 'attack')`), JSON.stringify(r));
});

sec('D. no recall', () => {
  g.run('__new(); __pn();');
  const rr = J(`__k('KeyR')`), gg = J(`__k('KeyG')`);
  check('G does nothing in a battle and R is the missiles\' (a full rack: refused in words, no order to the pilots); the pilots are still out', rr.used && rr.ran && rr.row === 'sreload' && !gg.used && !gg.ran && J('__out().length') === 3 && J('C.bay.fighters') === 0, JSON.stringify([rr, gg]));
  check('campSelOrder has no recall verb any more (it asks what to do)', J(`campSelOrder(C, 'recall', 'key').ok`) === false && J('__out().length') === 3);
  g.run('__run(20)');
  check('twenty seconds on, the pilots are still out (nothing sends them home)', J('__out().length') === 3 && J('C.bay.fighters') === 0);
  check('the order table has no recall key or row in the lists that are on (the old all-squads list keeps its rows behind its switch)', J(`CAMP_PANELS.panels.filter(p => !p.off).every(p => p.rows.every(r => !(r.wing && r.wing[1] === 'recall')))`) === true);
});

sec('E. a badly hurt pilot returns by itself', () => {
  check('the numbers: breaks off under 25 percent, is mended 20 s, at no ore', J('CAMP.repair.below') === 0.25 && J('CAMP.repair.time') === 20 && J('CAMP.repair.ore') === 0, JSON.stringify(J('CAMP.repair')));
  g.run('__new(); C.ore = 40; window.__ore0 = C.ore;');
  g.run('window.__u = __out().find(u => u.squad === "red"); __u.hp = Math.ceil(__u.maxHp * 0.24);');
  g.run('__run(1);');
  check('a pilot under 25 percent breaks off and flies home by itself', J('__u.repair === true || C.repairs.length === 1'), J('__u.hp') + ' ' + J('__u.repair'));
  g.run('for (let i = 0; i < 40 && !C.repairs.length; i++) __run(1);');
  check('it lands: in the repair list, out of the sim, two others still out', J('C.repairs.length') === 1 && J('__out().length') === 2 && J('C.repairs[0].squad') === 'red', J('C.repairs.length'));
  g.run('window.__t0 = C.t; __run(10);');
  check('ten seconds on it is still being mended', J('C.repairs.length') === 1 && J('__out().length') === 2);
  g.run('__run(11);');
  check('after 20 s it is whole and out again by itself, with no fight and nothing asked: three pilots out, nobody in the bay', J('C.repairs.length') === 0 && J('__out().length') === 3 && J('C.bay.fighters') === 0, J('C.repairs.length') + ' ' + J('__out().length') + ' ' + J('C.bay.fighters'));
  check('it is whole (full hull) and still a member of the red squad, with the order it had', J(`(() => { const u = __out().find(q => q.squad === 'red'); return !!u && u.hp === u.maxHp && !!u.order; })()`));
  check('the mend cost no ore, and the radio said it was back', J('C.ore') === J('__ore0') && J('C.mended') === 1, J('C.ore') + ' of ' + J('__ore0'));
});

sec('F. the two numbers are on the N panel', () => {
  const rows = J('["repairbelow", "repairtime"].map(id => { const r = campTuneRow(id); return r ? { id, root: r.root, path: r.path, group: r.group, when: r.when } : null; })');
  check('two rows: the hull share a pilot breaks off at, and the seconds of the mend, each a number the table holds', rows.every(r => r && r.root === 'CAMP') && rows[0].path === 'repair.below' && rows[1].path === 'repair.time', JSON.stringify(rows));
  check('each has its words on the panel', ['repairbelow', 'repairtime'].every(id => !/^camp\.ui\.tune\.row\./.test(J(`uiText("camp.ui.tune.row.${id}")`)) && J(`uiText("camp.ui.tune.row.${id}")`).length > 3));
});

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
