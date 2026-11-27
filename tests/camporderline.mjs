// smoke: the order as a sentence (card space-game-orders-f1-sentence; Troy, 27 Nov 2026, mock F, step 1 of 5, display only): a line under the left panel reads WHO, the verb Enter will do and the target, left to right, from today's real Enter result; the tip on the picked target (plain Node, no Chrome)
// The rule is src/camporderline.js (campOrderLine, campOrderLineNow, campOrderLineTipSync); the page HUD (src/camppagehud.js campPageHudSentPaint) draws the line; no key and no rule of an order changes.
//   A  the sentence: W1 then E1 reads "Wedge guard <the ship you protect>"; a hostile picked reads "Wedge attack Raider n" (the words are campSelOrder's own dry run); nothing picked is "All pilots form up Cruiser" in grey
//   B  the clock: nothing at the start; a pick brings it up, an order puts a check after it for CAMP.orderLine.check ms, it fades with the pick squares (campMarkNow) and goes; Enter with nothing picked shows it too (form up)
//   C  a refused Enter says why in the line; flying a fighter, nothing picked: the others form up on HIM; the tip is on the picked ship only
//   D  the page HUD's line: written by campPageHudSync (who white, the verb in mint, the target; grey for a default; the check), hidden with nothing to say and while the Q list stands where it stands
//   E  the tip in the scene: one text over the picked ship, the same words, a check after Enter, hidden when nothing is picked; and the one new line has its words and a shown-only rule
// Run: node tests/camporderline.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`{ (() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })() }`));

g.run(`{
  window.__mk = () => { const C = window.C = campNew(1, [], { seed: 3 }); for (let i = 0; i < 90; i++) campStep(C, 1 / 30); C.events.length = 0; return C; };
  window.__foe = (dx) => { const a = campSpawn(C, 'raider', C.carrier.x + (dx || 500), C.carrier.y); a.hold = true; return a; };
  window.__words = L => L && [L.who.t, L.verb.t, L.target.t].join(' | ');
}`);

console.log('A. the sentence');
{
  g.run(`__mk();`);
  const s0 = J('campOrderLine(C)');
  check('nothing picked: "All pilots form up Cruiser", every word the default, so grey where it is only a default (who and target), and the Enter would be taken', s0 && s0.who.t === 'All pilots' && s0.who.ghost === true && s0.verb.t === 'form up' && s0.verb.kind === 'formup' && s0.target.t === 'Cruiser' && s0.target.ghost === true && s0.ok === true && s0.pick === false, JSON.stringify(s0));
  g.run(`campSelPick(C, 'pilot:red', 'key');`);
  const w1 = J('campOrderLine(C)');
  check('W1: WHO is Wedge (white, a pick); the verb is still form up (the target is the default)', w1.who.t === 'Wedge' && w1.who.ghost === false && w1.verb.t === 'form up' && w1.pick === true, JSON.stringify(w1));
  g.run(`window.__fr = campFriList(C)[0]; C.fsel = __fr.id;`);
  const e1 = J('campOrderLine(C)');
  check('W1 then E1: "Wedge guard <the ship>" (the target is the friendly, white), and the tip is for that ship', __w(e1) === 'Wedge | guard | ' + J('campHeldNow(C).name') && e1.target.kind === 'friendly' && e1.target.ghost === false && e1.tip.id === J('__fr.id') && e1.tip.text === 'Wedge will guard', JSON.stringify(e1));
  g.run(`window.__a = __foe(500); campTgtHold(C, __a.id);`);
  const h1 = J('campOrderLine(C)');
  check('a hostile picked: "Wedge attack Raider n" (an enemy let go of the friendly: one target), the tip "Wedge will attack"', h1.verb.t === 'attack' && h1.verb.kind === 'attack' && /^Raider \d+$/.test(h1.target.t) && h1.target.kind === 'hostile' && h1.tip.id === J('__a.id') && h1.tip.text === 'Wedge will attack', JSON.stringify(h1));
  g.run(`campSelPick(C, 'all', 'key');`);
  check('All pilots picked again: the word is the default again (grey) and "All pilots attack Raider n"; the tip says All pilots will attack', J('campOrderLine(C).who.ghost') === true && J('campOrderLine(C).tip.text') === 'All pilots will attack');
  check('the words are the verbs of the game\'s own Enter (campSelOrder, dry run): attack for a hostile, guard for a friendly, formup with nothing', J(`campSelOrder(C, 'engage', 'key', true).verb`) === 'attack' && J('campOrderLine(C).verb.kind') === 'attack');
  check('the line carries nothing out: asking it again changes nothing (no order was counted, the target is still held)', J('campMarkOrders(C)') === 0 && J('C.tgt') === J('__a.id'));
}
function __w(L) { return L && [L.who.t, L.verb.t, L.target.t].join(' | '); }

console.log('B. the clock');
{
  g.run(`__mk();`);
  check('at the start nothing is shown (both default, no order yet), though the squares are up', J('campOrderLineNow(C)') === null);
  g.run(`campSelPick(C, 'pilot:green', 'key');`);
  const p = J('campOrderLineNow(C)');
  check('a pick brings it up at full strength, no check', p && p.who.t === 'Kara' && p.a === 1 && p.check === false, JSON.stringify(p));
  g.run(`C.t += CAMP.mark.show + CAMP.mark.fade * 0.5;`);
  const mid = J('campOrderLineNow(C)');
  check('then it fades with the squares: half way through the fade it is half strength', mid && Math.abs(mid.a - 0.5) < 0.02, JSON.stringify(mid && mid.a));
  g.run(`C.t += CAMP.mark.fade;`);
  check('and goes, though Kara is still picked (the pick stays, the words do not stay up)', J('campOrderLineNow(C)') === null && J('C.sel') === 'pilot:green');
  g.run(`__mk(); window.__a = __foe(500); campTgtHold(C, __a.id); campOrderLineNow(C); campSelOrder(C, 'engage', 'key'); C.t += 100;`);
  const gv = J('campOrderLineNow(C)');
  check('Enter (an order carried out): the line is up with a check', gv && gv.check === true && gv.verb.t === 'attack', JSON.stringify(gv));
  g.run(`C.t += CAMP.orderLine.check + 50;`);
  const later = J('campOrderLineNow(C)');
  check('the check goes after CAMP.orderLine.check ms (2.5 s); the line is still up with the pick (the squares have not faded)', later && later.check === false && later.a > 0, JSON.stringify(later));
  g.run(`__mk(); campOrderLineNow(C); campSelOrder(C, 'engage', 'key'); C.t += 50;`);
  const fu = J('campOrderLineNow(C)');
  check('Enter with nothing picked forms the pilots up: the line shows "All pilots form up Cruiser" with a check, the words grey where they are defaults', fu && __w(fu) === 'All pilots | form up | Cruiser' && fu.check === true && fu.who.ghost && fu.target.ghost, JSON.stringify(fu));
  g.run(`C.t += CAMP.mark.show + CAMP.mark.fade + 50;`);
  check('and after the squares fade it is gone', J('campOrderLineNow(C)') === null);
  check('no cruiser, no line: a stand-in game answers null', J('campOrderLine(null)') === null && J('campOrderLineNow({})') === null);
}

console.log('C. a refusal, the fighter flown, the tip');
{
  g.run(`__mk(); C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter').forEach(u => { u.hp = 0; u.gone = true; }); C.ships = C.ships.filter(u => u.hp > 0); C.bay.fighters = 0; C.launchQ = []; campSelPick(C, 'all', 'key');`);
  const no = J('campOrderLine(C)');
  check('no pilot to give the order to: the Enter would be refused, and the line says why in the words of the refusal (ok false, why set)', no && no.ok === false && typeof no.why === 'string' && no.why.length > 3, JSON.stringify(no));
  g.run(`__mk(); CAMP.flags.cockpit = true; { const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked); window.__f = f; campCockpitTake(C, f.id); }`);
  const fl = J('campOrderLine(C)');
  check('flying a fighter with nothing picked: the others form up on HIM: the target is his name (Wedge), grey (a default), the verb form up', fl && fl.verb.kind === 'formup' && fl.target.kind === 'fighter' && fl.target.t === 'Wedge' && fl.target.ghost === true, JSON.stringify(fl));
  g.run(`CAMP.flags.cockpit = false; __mk(); campSelPick(C, 'pilot:red', 'key');`);
  check('no target held: no tip (the tip is on the picked ship only)', J('campOrderLine(C).tip.id') === '' && J('campOrderLine(C).tip.text') === '');
}

console.log('D. the page HUD\'s line');
{
  g.run(`{
    window.__writes = 0; window.__els = [];
    const mk = tag => { const e = { tag, children: [], parentNode: null, _cls: '', _text: '', _inner: '', style: new Proxy({ setProperty(k, v) { __writes++; this[k] = v; } }, { set(o, k, v) { if (k !== 'setProperty') __writes++; o[k] = v; return true; } }) };
      Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { __writes++; e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { __writes++; e._text = v; } }); Object.defineProperty(e, 'innerHTML', { get() { return e._inner; }, set(v) { e._inner = v; } });
      e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.insertBefore = (c, ref) => { c.parentNode = e; const i = e.children.indexOf(ref); e.children.splice(i < 0 ? e.children.length : i, 0, c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); }; e.setAttribute = () => {}; e.addEventListener = () => {}; e.remove = () => {};
      e.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720, bottom: 150 }); __els.push(e); return e; };
    window.document = { createElement: mk, body: mk('body') };
    window.__scene = () => ({ camp: C, mode: 'play', mp: null, game: { canvas: { getBoundingClientRect: () => ({ left: 10, top: 20, width: 1280, height: 720 }) } }, events: { once() {} } });
  }`);
  g.run(`CAMP.flags.pagehud = true; __mk(); window.S = __scene(); campPageHudSync(S, 0); window.__foe1 = __foe(500);`);
  check('the line is made with the HUD, hidden while there is nothing to say', J('!!S.pageHud.sent') && J('S.pageHud.sent.el.style.display') === 'none');
  g.run(`campSelPick(C, 'pilot:red', 'key'); window.__fr = campFriList(C)[0]; C.fsel = __fr.id; campPageHudSync(S, 100);`);
  const sent = J(`(() => { const s = S.pageHud.sent; return { shown: s.el.style.display !== 'none', who: s.who._text, verb: s.verb._text, target: s.target._text, whoCls: s.who._cls, verbCls: s.verb._cls, targetCls: s.target._cls, check: s.check.style.display, op: s.el.style.opacity, left: s.el.style.left, top: s.el.style.top }; })()`);
  check('W1 then E1: the line is up and reads "Wedge guard <the ship>" in its three words (who white, the verb in the mint class, the target white), no check yet', sent.shown && sent.who === 'Wedge' && sent.verb === 'guard' && sent.target === J('campHeldNow(C).name') && sent.whoCls === 'ph-sw' && sent.verbCls === 'ph-sv' && sent.targetCls === 'ph-st' && sent.check === 'none' && +sent.op === 1, JSON.stringify(sent));
  check('it stands right under the left panel: its left is the panel\'s, its top the panel\'s bottom (and the gap)', /px$/.test(sent.left) && /px$/.test(sent.top) && parseFloat(sent.top) > 100, JSON.stringify([sent.left, sent.top]));
  g.run(`campSelPick(C, 'all', 'key'); campPageHudSync(S, 200);`);
  check('All pilots (a default, not a pick) is the grey class: ph-sw ghost', J('S.pageHud.sent.who._cls') === 'ph-sw ghost' && J('S.pageHud.sent.who._text') === 'All pilots');
  g.run(`campSelOrder(C, 'engage', 'key'); C.t += 50; campPageHudSync(S, 300);`);
  check('Enter: the check shows after the words', J('S.pageHud.sent.check._text') === '✓' && J('S.pageHud.sent.check.style.display') !== 'none');
  g.run(`C.t += CAMP.orderLine.check + 50; campPageHudSync(S, 400);`);
  check('and goes after 2.5 s', J('S.pageHud.sent.check.style.display') === 'none');
  g.run(`C.t += 20000; campPageHudSync(S, 500);`);
  check('after the squares fade the whole line is hidden again', J('S.pageHud.sent.el.style.display') === 'none');
  g.run(`campSelPick(C, 'pilot:green', 'key'); campPageHudSync(S, 600); window.__w0 = __writes; campPageHudSync(S, 700);`);
  check('a frame with nothing new writes nothing (only an element whose value changed is written)', J('__writes') === J('__w0'), J('__writes - __w0'));
  g.run(`campPanelGo(S.pn = campPanelNew(), C, 'cruiser'); campPageHudSync(S, 800);`);
  check('while the Q list is open the line is not shown (the list stands where the line would)', J('S.pageHud.sent.el.style.display') === 'none');
  g.run(`campPanelClose(S.pn); C.sel = 'pilot:red'; CAMP.flags.pagehud = false;`);
}

console.log('E. the tip in the scene, and the words');
{
  g.run(`CAMP.flags.pagehud = false; __mk(); window.__a = __foe(500); campSelPick(C, 'pilot:red', 'key'); campTgtHold(C, __a.id);`);
  g.run(`window.__tipScene = (zoom) => { const t = { visible: false, active: true, scene: true, text: '', alpha: 1, x: 0, y: 0, sc: 1, setOrigin() { return t; }, setDepth() { return t; }, setText(s) { t.text = s; return t; }, setScale(k) { t.sc = k; return t; }, setAlpha(a) { t.alpha = a; return t; }, setPosition(x, y) { t.x = x; t.y = y; return t; }, setVisible(v) { t.visible = v; return t; } }; const sc = { camp: C, cameras: { main: { zoom } }, hud: {}, mode: 'play', mp: null, add: { text() { sc.made = (sc.made || 0) + 1; return t; } } }; window.__tip = t; return sc; };`);
  g.run(`window.__S = __tipScene(1); campOrderLineTipSync(__S);`);
  check('the tip is one text over the picked raider: "Wedge will attack", full strength, over the ship (above it: its y is less)', J('__tip.visible') === true && J('__tip.text') === 'Wedge will attack' && J('__tip.alpha') === 1 && J('__tip.y') < J('__a.y') && Math.abs(J('__tip.x') - J('__a.x')) < 1e-9, J('[__tip.text, __tip.x, __tip.y, __a.x, __a.y]'));
  g.run(`__S = __tipScene(0.5); campOrderLineTipSync(__S);`);
  check('zoomed out to 0.5 it is the same size on the screen (twice the world scale)', J('__tip.sc') === 2);
  g.run(`campSelOrder(C, 'engage', 'key'); C.t += 50; __S = __tipScene(1); campOrderLineTipSync(__S);`);
  check('after Enter the tip has a check after the words', J('__tip.text') === 'Wedge will attack ✓', J('__tip.text'));
  g.run(`C.t += 20000; campOrderLineTipSync(__S);`);
  check('it is hidden after the squares fade', J('__tip.visible') === false);
  g.run(`__mk(); campSelPick(C, 'pilot:red', 'key'); __S = __tipScene(1); campOrderLineTipSync(__S);`);
  check('no target held: no tip (the line has the words, the world has nothing to mark)', J('__tip.visible') === false);
  g.run(`__mk(); window.__a = __foe(500); campTgtHold(C, __a.id); campSelPick(C, 'pilot:red', 'key'); CAMP.orderLine.tip = false; __S = __tipScene(1); campOrderLineTipSync(__S); CAMP.orderLine.tip = true;`);
  check('CAMP.orderLine.tip false: the line only, no tip', J('__tip.visible') === false);
  check('the one new line has its words: "{who} will {verb}" under camp.corner.orderline.tip, a shown-only key (the corner family\'s rule in src/voicepack.js)', J(`uiText('camp.corner.orderline.tip', { who: 'Kara', verb: 'guard' })`) === 'Kara will guard');
  check('the table: the check stays 2.5 s and the tip is on', J('[CAMP.orderLine.check, CAMP.orderLine.tip]').join() === '2500,true');
}

check('the game logged no errors', g.errors.length === 0, g.errors.join(' | '));
console.log(`\n${n - failed}/${n} checks passed`);
if (failed) { console.log('ORDER LINE FAIL (' + failed + ')'); process.exit(1); } else console.log('ORDER LINE PASS');
