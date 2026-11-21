// smoke: the Campaign's cards (story, tech pick, lost, pause) sit on a veil that dims the battle and its gauges, and the card itself is opaque (plain Node, no Chrome)
// [night] graphics, the blind critic's pictures 01, 30, 31 and 33: the planet's label and the gauges showed through the 95 percent card and made the text muddy.
// The scene is Phaser's and is not run here; its showCard is called on a stand-in that records what is added, in order.
// Run: node tests/campgfx-cards.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
// a scene stand-in: add.rectangle and add.text give back an object that records what it is told
const out = JSON.parse(g.run(`JSON.stringify((() => {
  const made = [];
  const obj = (kind, a) => { const o = { kind, a, alpha: a[5] === undefined ? null : a[5], depth: null, scroll: null, destroyed: false, stroke: false,
    setStrokeStyle() { this.stroke = true; return this; }, setOrigin() { return this; }, setScrollFactor(v) { this.scroll = v; return this; }, setDepth(d) { this.depth = d; return this; }, destroy() { this.destroyed = true; } }; made.push(o); return o; };
  const sc = { card: null, panel: false, add: { rectangle: (...a) => obj('rect', a), text: (...a) => obj('text', a) }, hideCard: Campaign.prototype.hideCard };
  Campaign.prototype.showCard.call(sc, 'TITLE', ['one line'], 'Enter  go');
  const shown = made.map(o => ({ kind: o.kind, w: o.a[2], h: o.a[3], alpha: o.kind === 'rect' ? o.a[5] : null, depth: o.depth, scroll: o.scroll, stroke: o.stroke }));
  const panel = sc.panel; sc.hideCard();
  return { shown, panel, left: made.filter(o => !o.destroyed).length, W, H };
})())`));
const [veil, card] = out.shown;
check('the first thing added is a veil over the whole screen', veil.kind === 'rect' && veil.w === out.W && veil.h === out.H, JSON.stringify(veil));
check('the veil dims the battle without hiding it (between 30 and 70 percent)', veil.alpha >= 0.3 && veil.alpha <= 0.7, String(veil.alpha));
check('the card is next, 800 wide, and opaque', card.kind === 'rect' && card.w === 800 && card.alpha === 1 && card.stroke, JSON.stringify(card));
check('everything is fixed to the screen and above the gauges (depth 200, the gauges are 100 and 101)', out.shown.every(o => o.scroll === 0 && o.depth === 200));
check('the card raises the panel flag, so the command strip stays shut', out.panel === true);
check('hideCard takes the veil away too: nothing is left drawn', out.left === 0, out.left + ' left');
// the card grows to its words (card space-game-wrapup-hunt-l3: a debrief with four bonus lines and a promotion ran out of the card and over its title), and a toast that is up goes
const grow = JSON.parse(g.run(`JSON.stringify((() => {
  const run = (lines, tall, toasts) => { const made = [];
    const obj = (kind, a) => { const o = { kind, a, destroyed: false, setStrokeStyle() { return this; }, setOrigin() { return this; }, setScrollFactor() { return this; }, setDepth() { return this; }, destroy() { this.destroyed = true; } }; made.push(o); return o; };
    const sc = { card: null, panel: false, toasts, add: { rectangle: (...a) => obj('rect', a), text: (...a) => obj('text', a) }, hideCard: Campaign.prototype.hideCard };
    Campaign.prototype.showCard.call(sc, 'MISSION COMPLETE: Inner ring', lines, 'Enter  continue', tall); const r = made.filter(o => o.kind === 'rect')[1];
    const body = made.filter(o => o.kind === 'text')[1], title = made.filter(o => o.kind === 'text')[0], hint = made.filter(o => o.kind === 'text')[2];
    return { h: r.a[3], cy: r.a[1], titleY: title.a[1], bodyY: body.a[1], hintY: hint.a[1], sc }; };
  const debrief = ['SCORE 2520', '--   Find the cloaked cache', '+250  Finish in 150 seconds', '+250  Keep the hull above 50 percent', '+250  Lose at most 2 ships', 'Time 0:56   Hull 900   Ships lost 0', 'PROMOTED: Commodore. The bay holds 11 fighters and 5 escorts.\\nThe whole fleet answers to you.'];
  const gone = []; const t = { t: { destroy() { gone.push('t'); } }, bg: { destroy() { gone.push('bg'); } }, tab: { destroy() { gone.push('tab'); } } };
  const big = run(debrief, 330), small = run(['one line'], 340), cleared = run(['x'], 300, [t]);
  return { big: { h: big.h, top: big.cy - big.h / 2, bottom: big.cy + big.h / 2, titleY: big.titleY, hintY: big.hintY }, small: small.h, gone, toastsAfter: cleared.sc.toasts.length, H };
})())`));
check('a long debrief (4 bonus lines, a promotion): the card is taller than the 330 it was given, and the title and the hint are inside it, on the screen', grow.big.h > 330 && grow.big.top >= 0 && grow.big.bottom <= grow.H && grow.big.titleY > grow.big.top && grow.big.hintY < grow.big.bottom, JSON.stringify(grow.big));
check('a short card keeps the height it was given (340), so the story card and the others are as they were', grow.small === 340, String(grow.small));
check('a toast that is up when a card opens is taken down with it (it floated over the title of the debrief)', grow.gone.join() === 't,bg,tab' && grow.toastsAfter === 0, JSON.stringify(grow.gone));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
