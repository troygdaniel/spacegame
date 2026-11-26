// smoke: every card of the Campaign scene has a visible way forward, and the refit and tech pick walk with only the arrows and Enter (the old cards and the new look; plain Node, no Chrome)
// Card space-game-refit-card-stuck (Troy, 26 Nov 2026, URGENT: stuck on the Earth refit card after level 1: Enter did nothing until 1 or 2 was pressed, and nothing said so). The rule for the screens: the arrows select, Enter goes forward, and the card
// says so. Now the first technology is LIT when the card opens, Left and Right move the light, Down goes to the fighter row and Up back, 1 and 2 (6 7 8) still light one directly, 4 still buys a fighter, Enter takes the lit technology (or buys on the fighter
// row and stays), Esc does nothing (a choice is required); the plain pick after the later levels is the same, with a digit taking one at once as before. The card shows the lit one and its keys in both looks.
//   A. the refit, walked with arrows and Enter only: the first, the second, wrap round, the fighter row and back; digits and 4 as ever; Esc and stray keys do nothing; no rule, price or number moved
//   B. the plain tech pick, the same; the looted techs are on it too
//   C. the old cards say it: the lit choice has a > and the foot says what Enter does (the old pick card had no foot at all)
//   D. the new cards say it: the lit tile is the bright one and the key row (Left Right Choose, Enter Take or Buy) is on the card
//   E. no card of the scene leaves the player without a visible way forward: each one's foot (old look) or key chip (new look) is there
// Run: node tests/cardkeys.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  window.__cards = [];
  window.__scene = (extra) => { const F = Object.create(Campaign.prototype); F.P = campProgressNew(); F.P.ore = 100; F.level = 1; F.mi = 2; F.camp = campNew(1, [], { seed: 5, mission: 2 }); F.camp.t = 61000; F.camp.delivered = 3; F.camp.ore = 100; F.camp.credits = 0; F.card = null; F.went = 0;
    F.showCard = (t, lines, foot) => { __cards.push({ title: t, lines, foot }); F.card = [{ destroy() {} }]; }; F.hideCard = () => { if (F.card) F.card.forEach(x => x.destroy && x.destroy()); F.card = null; }; F.next = w => { F.went++; F.wallet = w; }; F.say = () => {}; Object.assign(F, extra || {}); return F; };
  CAMP.flags.screens = false;
`);
const last = () => J('__cards[__cards.length - 1]');

console.log('A. the refit, with arrows and Enter only');
{
  g.run(`window.F = __scene(); F.refit = null; F.showRefit();`);
  check('the first technology is lit when the card opens: the light is on choice 0 and the chosen one is the first (Shield grid)', J('F.refit.cur') === 0 && J('F.refit.pick') === J('F.choices[0]') && J('F.choices.join()') === 'shield,beam');
  g.run(`F.refitKey('Enter');`);
  check('Enter at once takes it (no digit needed): the tech is the pilot\'s, the card is gone and the scene goes on (next)', J('F.P.techs.includes("shield")') && J('F.went') === 1 && J('F.card') === null);
  g.run(`window.F = __scene(); F.showRefit(); F.refitKey('ArrowRight');`);
  check('Right moves the light to the second technology and the card shows it', J('F.refit.cur') === 1 && J('F.refit.pick') === 'beam' && /^> 2 {3}Beam turrets/.test(J('__cards[__cards.length - 1].lines.find(l => /Beam turrets/.test(l))')));
  g.run(`F.refitKey('Enter');`);
  check('Enter takes the second, and nothing else is taken', J('F.P.techs.join()') === 'beam' && J('F.went') === 1);
  g.run(`window.F = __scene(); F.showRefit(); F.refitKey('ArrowLeft');`);
  check('Left from the first goes round to the last (the arrows wrap)', J('F.refit.cur') === 1 && (g.run(`F.refitKey('ArrowRight');`), J('F.refit.cur') === 0));
  g.run(`window.F = __scene(); F.showRefit(); F.refitKey('ArrowDown');`);
  check('Down goes to the fighter row (the light leaves the technologies; none is taken)', J('F.refit.cur') === 2 && J('F.went') === 0 && /^> {1}4 /.test(J('__cards[__cards.length - 1].lines.slice(-1)[0]').replace(/^> /, '> ')));
  g.run(`F.refitKey('Enter');`);
  check('Enter on the fighter row buys one fighter (25 from the ore, as the key 4 does) and the card stays with the light still there', J('F.refit.f') === 1 && J('F.refit.w.ore') === 75 && J('F.went') === 0 && J('F.refit.cur') === 2);
  g.run(`F.refitKey('Digit4');`);
  check('4 still buys another from anywhere, up to the most (3)', J('F.refit.f') === 2 && (g.run(`F.refitKey('Digit4'); F.refitKey('Digit4'); F.refitKey('Enter');`), J('F.refit.f') === 3 && J('F.refit.w.ore') === 25));
  g.run(`F.refitKey('ArrowLeft'); F.refitKey('ArrowRight');`);
  check('Left and Right do nothing on the fighter row (Up goes back)', J('F.refit.cur') === 2);
  g.run(`F.refitKey('ArrowUp');`);
  check('Up goes back to the technology that was lit', J('F.refit.cur') === 0 && J('F.refit.pick') === 'shield');
  g.run(`F.refitKey('Enter');`);
  check('Enter takes it, with the three fighters bought on the card as the bonus (the rules and the prices are the refit\'s own)', J('F.P.techs.includes("shield")') && J('F.P.bonus.fighters') === 3 && J('F.went') === 1 && J('F.wallet.ore') === 25);
  g.run(`window.F = __scene(); F.showRefit(); F.refitKey('Digit2');`);
  check('1 and 2 still light one directly (and Enter takes it): 2 lights Beam turrets', J('F.refit.cur') === 1 && J('F.refit.pick') === 'beam' && (g.run(`F.refitKey('Enter')`), J('F.P.techs.join()') === 'beam'));
  g.run(`window.F = __scene(); F.showRefit(); const before = JSON.stringify([F.refit, F.went, F.P.techs]); F.refitKey('Escape'); F.refitKey('KeyX'); F.refitKey('Space'); F.refitKey('Digit9'); window.__same = before === JSON.stringify([F.refit, F.went, F.P.techs]);`);
  check('Esc and any other key do nothing here (a choice is required): the card stays as it was', J('__same') === true && J('F.went') === 0 && J('F.card') !== null);
  g.run(`window.F = __scene(); F.showRefit(); F.refit.w = { ore: 0, credits: 10 }; F.refitKey('ArrowDown'); F.refitKey('Enter'); window.__poor = [F.refit.f, F.went];`);
  check('with too little to buy, Enter on the fighter row buys nothing and the card stays (no price moved)', J('__poor.join()') === '0,0');
  g.run(`window.F = __scene(); F.showRefit(); F.choices = ['shield', 'beam', 'lens', 'overdrive']; F.refit.cur = 0; F.refit.pick = 'shield'; F.paintRefit();`);
  check('what was looted joins the choices after the technologies and the arrows walk it too (6 7 8 are its digits): Right three times reaches the fourth, Enter takes it', (g.run(`F.refitKey('ArrowRight'); F.refitKey('ArrowRight'); F.refitKey('ArrowRight');`), J('F.refit.cur') === 3 && J('F.refit.pick') === 'overdrive') && (g.run(`F.refitKey('Enter');`), J('F.P.techs.join()') === 'overdrive' && J('F.went') === 1));
}

console.log('B. the plain tech pick');
{
  g.run(`window.F = __scene({ level: 2 }); F.showPick();`);
  check('the first technology is lit when the card opens', J('F.pickCur') === 0 && J('F.choices.join()') === 'plating,bay2,repair' && /^> 1 {3}Hull plating/.test(J('__cards[__cards.length - 1].lines[0]')));
  g.run(`F.pickKey('Enter');`);
  check('Enter takes it: the tech is the pilot\'s and the scene goes on', J('F.P.techs.join()') === 'plating' && J('F.went') === 1 && J('F.card') === null);
  g.run(`window.F = __scene({ level: 2 }); F.showPick(); F.pickKey('ArrowRight'); F.pickKey('ArrowRight');`);
  check('Right Right lights the third, the card shows it, and Enter takes it', J('F.pickCur') === 2 && /^> 3 /.test(J('__cards[__cards.length - 1].lines[2]')) && (g.run(`F.pickKey('Enter');`), J('F.P.techs.join()') === 'repair'));
  g.run(`window.F = __scene({ level: 2 }); F.showPick(); F.pickKey('ArrowLeft');`);
  check('Left from the first goes round to the last', J('F.pickCur') === 2);
  g.run(`window.F = __scene({ level: 2 }); F.showPick(); F.pickKey('Digit2');`);
  check('a digit still takes that one at once, as before (2 takes the second)', J('F.P.techs.join()') === 'bay2' && J('F.went') === 1);
  g.run(`window.F = __scene({ level: 2 }); F.showPick(); F.pickKey('Escape'); F.pickKey('Digit9'); F.pickKey('KeyZ');`);
  check('Esc and other keys do nothing (a choice is required)', J('F.went') === 0 && J('F.card') !== null && J('F.pickCur') === 0);
}

console.log('C. the old cards say it');
{
  g.run(`window.F = __scene(); F.showRefit();`);
  const c = last();
  check('the refit foot says what Enter does on the lit technology, and the arrows and 4 (it was empty until a pick)', c.foot !== '' && /Enter/.test(c.foot) && /Shield grid/.test(c.foot) && /Left Right/.test(c.foot) && /4/.test(c.foot), c.foot);
  check('the lit technology has a > in front and a < behind (the old marker); the others have neither', c.lines.filter(l => /^> /.test(l)).length === 1 && /^> 1 {3}Shield grid.*<$/.test(c.lines.find(l => /^> 1 /.test(l))) && !c.lines.some(l => /^  2 {3}Beam.*<$/.test(l)));
  g.run(`F.refitKey('ArrowDown');`);
  const f = last();
  check('with the light on the fighter row the foot says Enter buys one fighter and Up goes back, and the row has the >', /Enter {2}buy a fighter/.test(f.foot) && /Up/.test(f.foot) && /^> 4 /.test(f.lines.slice(-1)[0]), f.foot);
  g.run(`window.F = __scene({ level: 2 }); F.showPick();`);
  const p = last();
  check('the old pick card has a foot now (it had none): Left Right choose, Enter take; and the lit one has a >', p.foot !== '' && /Left Right/.test(p.foot) && /Enter/.test(p.foot) && p.lines.filter(l => /^> /.test(l)).length === 1, p.foot);
}

console.log('D. the new cards say it');
{
  g.run(`
    CAMP.flags.screens = true; window.document = { createElement: tag => { const e = { tag, children: [], parentNode: null, _cls: '', _text: '', style: new Proxy({ setProperty() {} }, { set(o, k, v) { o[k] = v; return true; } }), attrs: {}, listeners: {} };
      Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { e._cls = v; } }); Object.defineProperty(e, 'textContent', { get() { return e._text; }, set(v) { e._text = v; } });
      e.setAttribute = (k, v) => { e.attrs[k] = v; }; e.addEventListener = () => {}; e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.removeChild = c => { const i = e.children.indexOf(c); if (i >= 0) e.children.splice(i, 1); c.parentNode = null; return c; };
      Object.defineProperty(e, 'lastChild', { get() { return e.children[e.children.length - 1] || null; } }); return e; } }; document.body = document.createElement('body');
    const ch = new Proxy({}, { get: (t, k) => k === 'width' || k === 'height' ? 10 : k === 'then' ? undefined : (...a) => ch });
    window.__stand = extra => __scene(Object.assign({ scrHost: null, scrCard: null, add: new Proxy({}, { get: () => () => ch }), game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } }, events: { on() {}, once() {} }, handlers: {} }, extra || {}));
    window.__lit = () => { const out = []; (function w(x) { if (/sc-tile/.test(x._cls || '') && / on/.test(x._cls)) out.push(1); x.children.forEach(w); })(document.body); return out.length; };
    window.__chips = () => { const out = []; (function w(x) { if (x.attrs && x.attrs['data-key']) out.push(x.attrs['data-key']); x.children.forEach(w); })(document.body); return out; };
  `);
  g.run(`window.F = __stand(); F.showRefit();`);
  check('the Earth refit in the new look: the first tile is lit (the bright outline), and the key row is on the card: Left Right and Enter (Take) from the key table', J('F.scrCard.id') === 'earthrefit' && J('__lit()') === 1 && J('__chips().indexOf("left") >= 0 && __chips().indexOf("right") >= 0 && __chips().indexOf("pick") >= 0'));
  g.run(`F.refitKey('ArrowRight');`);
  check('Right moves the bright outline to the second tile (one lit at a time), the card is painted again, not stacked', J('__lit()') === 1 && J('F.refit.cur') === 1 && J('document.body.children.length') === 1 && J('document.body.children[0].children.length') === 1);
  g.run(`F.refitKey('ArrowDown');`);
  check('Down lights the fighter row (the chip row says Buy there)', J('__lit()') === 1 && J('F.refit.cur') === 2);
  g.run(`F.hideCard(); window.F2 = __stand({ level: 2 }); F2.showPick();`);
  check('the tech pick in the new look: the first tile lit and the key row on the card; the arrows move the outline', J('F2.scrCard.id') === 'tech' && J('__lit()') === 1 && J('__chips().indexOf("pick") >= 0') && (g.run(`F2.pickKey('ArrowRight');`), J('F2.pickCur') === 1 && J('__lit()') === 1));
  g.run(`F2.hideCard(); CAMP.flags.screens = false;`);
}

console.log('E. every card has a way forward on it');
{
  const cardFoot = fn => { g.run(`window.F = __scene({ level: 1 }); __cards.length = 0; ${fn}`); return last(); };
  const old = [['the story card', `Campaign.prototype.showIntro.call(F)`], ['the briefing card', `Campaign.prototype.showBrief.call(F)`], ['the pause', `F.showPause()`], ['the level won card', `F.showWon()`], ['the lost card', `F.showLost('convoy')`], ['the end card', `F.showEnd()`], ['the refit', `F.showRefit()`], ['the tech pick', `F.level = 2; F.showPick()`]];
  const miss = [];
  for (const [name, fn] of old) { try { const c = cardFoot(fn); if (!c || !c.foot || !/\S/.test(c.foot)) miss.push(name + ' (no foot)'); } catch (e) { miss.push(name + ' (' + String(e.message).slice(0, 60) + ')'); } }
  check('the old cards each have a foot that says what to press (the story, the briefing, the pause, the won, lost and end cards, the refit and the pick)', miss.length === 0, miss.join(' ; '));
  g.run(`window.F = __scene(); CAMP.flags.screens = true; window.__models = { pause: scrPauseModel(F.camp, { mission: true }), won: scrWonModel(F.camp, F.P, { sc: { score: 100, bonuses: [], t: 10, shipsLost: 0 }, title: 'x', mdone: false }), lost: scrLostModel(F.camp, 'convoy'), lvlwon: scrLevelWonModel(F.camp, F.P, 1, false), earthrefit: scrRefitModel({ choices: ['shield', 'beam'], cur: 0, f: 0, w: { ore: 0, credits: 0 }, P: F.P }), tech: scrPickModel({ choices: ['plating'], cur: 0, P: F.P }), end: scrEndModel(['a', 'b', 'c'], 'Star') }; CAMP.flags.screens = false;`);
  const keys = J('Object.keys(__models).map(k => { const c = []; (function w(x) { if (!x) return; if (x.k === "chip") c.push(x.id); (x.kids || []).forEach(w); })(__models[k]); return k + ":" + (c.indexOf("pick") >= 0 || c.indexOf("close") >= 0 ? "ok" : "none"); })');
  check('the new cards each have a key chip that goes forward (Enter, or Esc on the pause): the pause, the won, lost, level won and end cards, the refit and the pick', keys.every(k => /:ok$/.test(k)), keys.join(' '));
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
