// smoke: the 1.1 distress call offers the squads (send all, Red, Green, Yellow, or stay): rows that are grey and refused, a squad flies to the miner and goes back to its old order, the others keep theirs (plain Node, no Chrome)
// Card space-game-distress-send-squads (Troy, 22 Nov 2026: "for the miner we help in mission 1.1, let him send squads, all or specific; the timed call that comes up shows those options").
//   A  the table: five picks built by campCallSquadFx (so any call can offer squads), the cautious one is "stay", the ratings, the words
//   B  the rows: a squad with no ship out is grey with the reason; a key on it is refused and the call stays open; a bot's answer falls back to the cautious pick
//   C  the order: the squad sent flies to the miner and fights; the others keep their own orders; when the pirates are dead or gone (or the miner is lost) the squad takes up the order it had
//   D  the numbers: what each answer saves and how fast (seed 1 of the plain flight; the same flight makes the same call)
//   E  the plate: five rows grow up from the same bottom edge, a grey row shows its reason, Enter on it says why in the key line, Up and Down still stop the timer
//   F  the bots: the thinking bot answers Send Red and the wrong-answer bot Send all squads, from the table of ratings
// Run: node tests/campcallsquads.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => { try { return readFileSync(ROOT + '/' + f, 'utf8'); } catch (e) { return ''; } };
const sec = (name, fn) => { try { fn(); } catch (e) { check(name + ' ran without an error', false, e && e.stack); } };

g.run(`
  window.__go = (s, fn) => { const k = Math.round(s * 30); for (let i = 0; i < k && !C.result; i++) { if (fn) fn(i); campStep(C, 1 / 30); C.events.length = 0; } };
  window.__tough = () => campConvoys(C).forEach(f => { f.hp = f.maxHp = 1e6; });
  window.__until = share => { for (let i = 0; i < 400 * 30 && !C.result && (C.lane.t1 || 0) < share; i++) { __tough(); campStep(C, 1 / 30); C.events.length = 0; } };
  window.__ready = seed => { window.C = campNew(1, [], { seed: seed == null ? 1 : seed, mission: 0 }); C.god = true; campOrder(C, 'launch'); __until(0.315); __go(2); return !!C.call.open; };
  window.__fighters = () => campWing(C, 'fighter');
  window.__miner = () => C.ships.find(u => u.tid === 'dm');
  window.__pirates = () => campAliens(C).filter(u => u.prey === 'miners');
`);

sec('A', () => {
  console.log('A. the table');
  const T = J('CAMP_CALL_TYPES.find(t => t.id === "distress")'), R = J('CAMP_CALL_RATE.distress');
  check('A  the distress call has five picks in the card\'s order (all squads, Red, Green, Yellow, stay), scripted, and the cautious pick is "stay with the transport"', T && T.scripted && T.pick.join() === 'sendall,sendred,sendgreen,sendyellow,stay' && T.def === 4, JSON.stringify(T));
  check('A  the squads are offered by campCallSquadFx (any call can do it): each effect names its group (all the fighters, or one squad) and says whether it can be done now', J('["sendall", "sendred", "sendgreen", "sendyellow"].map(id => [CAMP_CALL_FX[id].squad, typeof CAMP_CALL_FX[id].ok, typeof CAMP_CALL_FX[id].do].join())').join(' ') === 'fighters,function,function red,function,function green,function,function yellow,function,function' && typeof g.run('typeof campCallSquadFx') === 'string' && g.run('typeof campCallSquadFx') === 'function');
  check('A  one squad is the right-sized answer (rated good), sending them all leaves the cruiser\'s side bare (rated bad), stay is neither: the wing\'s mood follows', R.good.join() === '1,2,3' && R.bad.join() === '0');
  const words = k => J(`uiText(${JSON.stringify(k)})`), ids = ['sendall', 'sendred', 'sendgreen', 'sendyellow', 'stay'];
  check('A  every row and every radio answer has its words, the labels are short (24 characters at most) and the answers curt (12 words at most) with no placeholder', ids.every(f => words('camp.call.fx.' + f) !== 'camp.call.fx.' + f && words('camp.call.fx.' + f).length <= 24 && words('camp.call.r.' + f) !== 'camp.call.r.' + f && words('camp.call.r.' + f).split(/\s+/).length <= 12 && !/[{}]/.test(words('camp.call.r.' + f))), ids.map(f => words('camp.call.fx.' + f)).join(' | '));
  check('A  the old picks (rescue, rescueall) are gone from the table and from the words', !J('"rescue" in CAMP_CALL_FX') && !J('"rescueall" in CAMP_CALL_FX') && words('camp.call.fx.rescue') === 'camp.call.fx.rescue');
  check('A  the call table (src/camporders.js) offers the squads and the order it sends them on lives in the sim (src/campwing.js campWingRescue), with its radius a number of the CAMP table', /campCallSquadFx/.test(read('src/camporders.js')) && /function campWingRescue/.test(read('src/campwing.js')) && J('CAMP.wing.rescue') > 700);
});

sec('B', () => {
  console.log('B. the rows');
  check('B  the call opens at the miner with eight fighters out, three, three and two to the squads, and no row is grey', g.run('__ready()') === true && J('__fighters().length') === 8 && J('["red", "green", "yellow"].map(k => __fighters().filter(u => u.squad === k).length).join()') === '3,3,2' && J('campCallView(C).rows.every(r => !r.off)'));
  g.run('__fighters().filter(u => u.squad === "green").forEach(u => { u.hp = 0; })');
  const v = J('campCallView(C)');
  check('B  the green squad has no ship left: its row is grey with the lists\' words ("none out") and the sentence, the others are not', v.rows[2].off && v.rows[2].why === 'none out' && /squad/i.test(v.rows[2].say) && [0, 1, 3, 4].every(i => !v.rows[i].off), JSON.stringify(v.rows.map(r => [r.pick, r.off, r.why])));
  const r = J('campCallAnswer(C, 3, "key")');
  check('B  Enter on the grey row is refused with the reason, nothing is ordered, and the call is still open with its clock running', r.ok === false && r.off === true && r.code === 'nosquad' && /squad/i.test(r.say) && J('!!C.call.open') && J('C.call.open.held') === null && J('__fighters().every(u => !(u.order && u.order.rescue))'), JSON.stringify(r));
  const b = J('campCallAnswer(C, 3, "bot")');
  check('B  a bot (or a script) that answers a grey row is not refused: the pick cannot be done, so the cautious one is taken and the answer says so', b.ok === true && b.pick === 'stay' && b.how === 'fail', JSON.stringify(b));
  g.run('__ready()'); g.run('__fighters().forEach(u => { u.hp = 0; })');
  check('B  with no fighter out all four squad rows are grey and "stay" is the one that can be done ("all squads": no fighters out)', J('campCallView(C).rows.map(r => r.off).join()') === 'true,true,true,true,false' && J('campCallView(C).rows[0].say') === J('uiText("camp.no.nofighters")'));
});

sec('C', () => {
  console.log('C. the order: fly there, fight, go back');
  g.run('__ready()');
  g.run(`(() => { // a squad of its own orders: green attacks a pirate of the ambush later, yellow mines; red is on the cruiser
    const sq = k => __fighters().filter(u => u.squad === k); sq('green').forEach(u => { u.order = { type: 'attack', target: 'x-1' }; }); sq('yellow').forEach(u => { u.order = { type: 'mine', target: '' }; });
    window.__before = __fighters().map(u => [u.id, u.squad, JSON.stringify(u.order)]); })()`);
  const r = J('campCallAnswer(C, 2, "key")');
  const after = J('__fighters().map(u => [u.id, u.squad, u.order])'), before = J('__before');
  const red = after.filter(a => a[1] === 'red'), other = after.filter(a => a[1] !== 'red');
  check('C  Send Red: all three red fighters attack with a rescue of the miner and carry the order they had (guard the cruiser) to go back to', r.ok && r.pick === 'sendred' && red.length === 3 && red.every(a => a[2].type === 'attack' && a[2].rescue === J('__miner().id') && a[2].back && a[2].back.type === 'guard' && a[2].back.at.kind === 'carrier'), JSON.stringify(red));
  check('C  the green and yellow squads keep the orders they had (attack, mine)', other.length === 5 && other.every(a => JSON.stringify(a[2]) === before.find(b => b[0] === a[0])[2]), JSON.stringify(other));
  check('C  the map line of the red squad runs to the miner (the order\'s target is the ship that called)', J('__fighters().filter(u => u.squad === "red").every(u => u.order.tg && u.order.tg.id === __miner().id)'));
  g.run('__go(1)');
  check('C  a second later the red fighters have made for the pirates at the miner (still on the rescue)', J('__fighters().filter(u => u.squad === "red").every(u => u.order.rescue)') && J('__pirates().length') === 2);
  g.run('__go(60)');
  check('C  the pirates are dead, the miner is alive (the thanks and 40 ore: the bonus for the miner is kept), and the red fighters have taken up the order they had: guard the cruiser', J('__pirates().length') === 0 && !!J('__miner() && __miner().hp > 0') && J('C.ore') >= 40 && J('__fighters().filter(u => u.squad === "red").every(u => u.order.type === "guard" && u.order.at.kind === "carrier" && !u.order.rescue)'), J('C.ore') + ' ' + JSON.stringify(J('__fighters().filter(u => u.squad === "red").map(u => u.order)')));
  check('C  and the green and yellow squads are still on theirs, untouched by the rescue', J('__fighters().filter(u => u.squad === "green").every(u => u.order.type === "attack")') && J('__fighters().filter(u => u.squad === "yellow").every(u => u.order.type === "mine")'));
  // the miner is lost while a squad is on its way: it goes back at once, to the order it had
  g.run('__ready()');
  g.run(`(() => { __fighters().filter(u => u.squad === "yellow").forEach(u => { u.order = { type: 'mine', target: '' }; }); campCallAnswer(C, 4, 'key'); __go(0.3); window.__m = __miner(); __m.hp = 0; __go(0.3); })()`);
  check('C  Send Yellow, then the miner is lost on the way: the yellow squad takes up its old order (mine ore) and does not go on to the pirates', J('__fighters().filter(u => u.squad === "yellow").every(u => u.order.type === "mine" && !u.order.rescue)') && J('__fighters().filter(u => u.squad === "red").every(u => u.order.type === "guard")'));
  g.run('__ready()'); g.run('campCallAnswer(C, 1, "key"); __go(0.2)');
  check('C  Send all squads: every fighter goes', J('__fighters().every(u => u.order.rescue)') && J('__fighters().length') === 8);
  check('C  sending is an order of the wing for the books (the attack count goes up)', J('C.orders.attack') >= 1);
  g.run('__ready()'); g.run('campCallAnswer(C, 2, "key"); __go(0.3); window.__o1 = JSON.stringify(__fighters().filter(u => u.squad === "red")[0].order.back); C.call.open = null; campCallStart(C, "distress", { who: __miner().id, ids: __pirates().map(u => u.id) }); campCallAnswer(C, 2, "key")');
  check('C  a squad sent twice goes back to the order it had before the first, not to the first rescue', J('__fighters().filter(u => u.squad === "red").every(u => JSON.stringify(u.order.back) === __o1 && !u.order.back.rescue)'));
});

sec('D', () => {
  console.log('D. the numbers');
  const run = (pick, seed) => J(`(() => { __ready(${seed}); const m0 = __miner().hp; campCallAnswer(C, ${pick}, 'bot'); let clear = null, dead = null, home = null; for (let s = 1; s <= 90; s++) { __tough(); __go(1); const f = __fighters(), m = __miner(); if (dead == null && (!m || m.hp <= 0)) dead = s; if (clear == null && __pirates().length === 0) clear = s; if (home == null && clear != null && ${pick} < 5 && f.every(u => !u.order.rescue)) home = s; if (clear != null && s >= clear + 6) break; } const m = __miner(); return { m0: Math.round(m0 * 10) / 10, hp: m && m.hp > 0 ? Math.round(m.hp * 10) / 10 : 0, dead, clear, home, lost: C.neutralsLost, ore: C.ore }; })()`);
  const all = run(1, 1), red = run(2, 1), stay = run(5, 1);
  check('D  Send all squads (seed 1): the miner is saved, the pirates are dead in about 25 seconds', all.hp > 0 && all.clear != null && all.clear <= 30 && all.lost === 0, JSON.stringify(all));
  check('D  Send Red (seed 1): three fighters can do it: the miner is saved and the pirates are dead in under 45 seconds ("more slowly than six" was pinned on this one seed, 31 s against 23 s; since card space-game-fighter-flight the guarding wing flies in formation, the squads start from other places, and the two clear them in 21 s against the six\'s 22: the seeds 2 to 4 go either way)', red.hp > 0 && red.clear != null && red.clear < 45 && red.lost === 0, JSON.stringify(red));
  check('D  Stay with the transport (seed 1): the miner is lost (it was 22 hit points when the call came), no thanks, one neutral lost', stay.hp === 0 && stay.dead != null && stay.lost === 1 && stay.ore < 40, JSON.stringify(stay));
  console.log('     (numbers: all ' + JSON.stringify(all) + '  red ' + JSON.stringify(red) + '  stay ' + JSON.stringify(stay) + ')');
});

sec('E', () => {
  console.log('E. the plate');
  const stand = `(() => { const made = [], obj = (kind, args) => { const o = { kind, args, texts: [], vis: true, sz: null, pos: null, color: '', alpha: 1 }; ['setScrollFactor', 'setDepth', 'setOrigin', 'lineStyle', 'strokeRect', 'clear'].forEach(m => { o[m] = () => o; }); o.setFillStyle = c => { o.fill = c; return o; }; o.setText = t => { o.texts.push(t); return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setSize = (w, h) => { o.sz = [w, h]; return o; }; o.setPosition = (x, y) => { o.pos = [x, y]; return o; }; o.setColor = c => { o.color = c; return o; }; o.setAlpha = a => { o.alpha = a; return o; }; made.push(o); return o; };
    window.__made = made; return { camp: null, mode: 'play', mp: null, pn: campPanelNew(), add: { rectangle: (...a) => obj('rect', a), graphics: () => obj('gfx', []), text: (x, y, t) => { const o = obj('text', [x, y, t]); o.texts.push(t); return o; } }, radio: chatterNew(), hud: { chat: obj('text', []) }, chatUntil: 0, chatShow: () => {} }; })()`;
  g.run(`window.__scene = ${stand}; window.beep = () => {}; window.voiceSay = () => true;`);
  g.run('__ready(); __fighters().filter(u => u.squad === "green").forEach(u => { u.hp = 0; }); __scene.camp = C; __scene.callSel = null; campCallPaint(__scene)');
  const ui = J('(() => { const u = __scene.callUi; return { n: u.n, y: u.y, h: u.back.sz[1], texts: u.rows.slice(0, 5).map(t => t.texts[t.texts.length - 1]), vis: u.rows.map(t => t.vis), hiY: u.hi.pos[1], foot: u.foot.texts[u.foot.texts.length - 1] }; })()');
  check('E  the plate has five rows, taller than the three-row plate by two rows (48 px), its bottom edge where the old plate\'s was (112 px above the screen\'s), and the five rows are visible (a three-row call makes three row texts, a five-row call two more)', ui.n === 5 && ui.h === 150 + 48 && ui.y + ui.h === 720 - 112 && ui.vis.join() === 'true,true,true,true,true', JSON.stringify(ui));
  check('E  the rows read Send all squads, Send Red squad, Send Green squad (none out), Send Yellow squad, Stay with the transport (if you wait): the cautious one marked, the grey one with its reason, the highlight on the cautious pick', ui.texts.join('|') === 'Send all squads|Send Red squad|Send Green squad   (none out)|Send Yellow squad|Stay with the transport   (if you wait)' && J('campCallSel(__scene)') === 4 && ui.hiY === ui.y + 50 + 4 * 24, JSON.stringify(ui.texts));
  const colors = J('__scene.callUi.rows.slice(0, 5).map(t => t.color)');
  check('E  the grey row is the lists\' grey and the highlighted one is dark on the amber', colors[2] === '#6c8294' && colors[4] === '#02101c' && colors[0] === '#9fe9ff', colors.join());
  g.run('campCallKey(__scene, "ArrowUp"); campCallKey(__scene, "ArrowUp"); campCallPaint(__scene)');
  check('E  Up twice from the cautious row lands on the grey one (a grey row can be picked: the lists do the same) and the first Up stopped the timer', J('campCallSel(__scene)') === 2 && J('C.call.open.held') !== null);
  g.run('campCallKey(__scene, "Enter"); campCallPaint(__scene)');
  const foot = J('__scene.callUi.foot.texts[__scene.callUi.foot.texts.length - 1]');
  check('E  Enter on it says why in the key line ("No ships of that squad are out.") and the call stays open: nothing was ordered', foot === J('uiText("camp.no.nosquad")') && J('!!C.call.open') && J('__fighters().every(u => !(u.order && u.order.rescue))'), foot);
  g.run('campCallKey(__scene, "ArrowUp"); campCallPaint(__scene)');
  check('E  the next Up clears the sentence: the key line is the keys again', /Timer stopped/.test(J('__scene.callUi.foot.texts[__scene.callUi.foot.texts.length - 1]')));
  g.run('campCallKey(__scene, "Enter")');
  check('E  Enter on Send Red answers: the red squad is sent', !J('!!C.call.open') && J('C.call.log[C.call.log.length - 1].pick') === 'sendred' && J('__fighters().filter(u => u.squad === "red").every(u => u.order.rescue)'));
  g.run('campCallPaint(__scene)');
  check('E  and the plate is gone', J('__scene.callUi.on') === false);
  // a three-row call afterwards lays the plate out as it always was
  g.run('window.__B = campNew(2, [], { seed: 1, mission: 1 }); __B.arrivedAt = 0; __B.t = 60000; __B.call = campCallsNew(__B); campCallStart(__B, "cruiser", { ids: [] }); __scene.camp = __B; __scene.callSel = null; campCallPaint(__scene)');
  const u3 = J('(() => { const u = __scene.callUi; return { n: u.n, y: u.y, h: u.back.sz[1] }; })()');
  check('E  a three-row call afterwards lays the plate out as it always was: 150 px tall, 262 px up from the bottom', u3.n === 3 && u3.h === 150 && u3.y === 720 - 262, JSON.stringify(u3));
});

sec('F', () => {
  console.log('F. the bots');
  const bot = read('tools/campaign-bot.mjs');
  check('F  the thinking bot answers the distress call with row 2 (Send Red) and the wrong-answer bot with row 1 (Send all squads): the table of ratings\' good and bad picks', /__SMART = \{ distress: 2,/.test(bot) && /__WRONG = \{ distress: 1,/.test(bot) && J('CAMP_CALL_RATE.distress.good.includes(2 - 1) && CAMP_CALL_RATE.distress.bad.includes(1 - 1)'));
  g.run('__ready(); window.__bot = 2; campCallAnswer(C, __bot, "bot")');
  check('F  that answer, given at the miner, is Send Red and is rated good', J('C.call.log[C.call.log.length - 1].pick') === 'sendred' && J('C.call.mood && C.call.mood.rate') === 'good');
  g.run('__ready(); campCallAnswer(C, 1, "bot")');
  check('F  the wrong answer, Send all squads, is rated bad (the wing is rattled for 20 s) and says so', J('C.call.mood && C.call.mood.rate') === 'bad' && J('C.events.some(e => e.type === "say" && e.key === "camp.say.callbad")') === true);
});

console.log(failed ? `\n${failed} of ${n} checks failed` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
