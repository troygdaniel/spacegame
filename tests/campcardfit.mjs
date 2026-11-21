// smoke: a Campaign card is as tall as its words, so its title never sits on the first line and its hint never on the last (plain Node, no Chrome)
// [wrap-up] level 1 hunt: the EARTH REFIT card was 376 px of text in a 380 px card, so the title overlapped the first line and the hint ("Chosen: Shield grid") the last; with the looted
// techs (up to six choices) the text was 593 px on a 720 px screen and ran off both edges. showCard now measures the text first (a throwaway text), grows the card to it, and past the screen steps the type down.
// The scene is Phaser's and is not run here; showCard is called on a stand-in whose text is as tall as its lines are (28 px a line, the 20 px type with its 4 px spacing and a 24 px blank row), so
// the checks are the geometry: the title is above the words, the hint below, and the card inside the screen.
// Run: node tests/campcardfit.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const run = (lines, tall) => JSON.parse(g.run(`JSON.stringify((() => {
  const made = [];
  const lineH = 28, rows = s => s.split('\\n').length;
  const obj = (kind, a) => { const o = { kind, a, x: a[0], y: a[1], scale: 1, height: 0, destroyed: false,
    setStrokeStyle() { return this; }, setOrigin() { return this; }, setScrollFactor() { return this; }, setDepth() { return this; }, setScale(v) { this.scale = v; return this; }, destroy() { this.destroyed = true; } };
    if (kind === 'text') o.height = rows(String(a[2])) * lineH; made.push(o); return o; };
  const sc = { card: null, panel: false, add: { rectangle: (...a) => { const o = obj('rect', a); o.height = a[3]; return o; }, text: (...a) => obj('text', a) }, hideCard: Campaign.prototype.hideCard };
  Campaign.prototype.showCard.call(sc, 'TITLE', ${JSON.stringify(lines)}, 'HINT', ${tall === undefined ? 'undefined' : tall});
  const live = made.filter(o => !o.destroyed), rect = live.filter(o => o.kind === 'rect')[1], texts = live.filter(o => o.kind === 'text');
  const [title, body, hint] = texts;
  return { H, probes: made.filter(o => o.destroyed).length, cardTop: rect.y - rect.height / 2, cardBottom: rect.y + rect.height / 2, titleY: title.y, hintY: hint.y,
    bodyTop: body.y - body.height * body.scale / 2, bodyBottom: body.y + body.height * body.scale / 2, scale: body.scale };
})())`));
const fits = r => r.titleY + 12 < r.bodyTop && r.bodyBottom < r.hintY - 8 && r.cardTop >= 0 && r.cardBottom <= r.H;
const short = run(['one line'], undefined);
check('a short card is the old 300 px card: title, words and hint do not overlap', fits(short) && Math.round(short.cardBottom - short.cardTop) === 300, JSON.stringify(short));
const refit = run(['ORE 142', 'Choose', 'a\nb\n1  shield', 'c\nd\n2  beam', 'e\nf\n3  blink', '4  +1 fighter'].map(x => x), 380);
check('the refit of three techs (a tall card of 380) grows past 380 and nothing overlaps', fits(refit) && refit.cardBottom - refit.cardTop > 380, JSON.stringify(refit));
const lines6 = ['ORE 142', 'Choose'].concat(Array.from({ length: 6 }, (_, i) => `${i + 1}  tech\ntext line one\ntext line two`), ['4  +1 fighter']);
const six = run(lines6, 380);
check('with six choices the card fills the screen without leaving it, and the type steps down', fits(six) && six.scale < 1 && six.cardBottom - six.cardTop <= six.H - 40, JSON.stringify(six));
check('the throwaway text that measured the words is destroyed (nothing is left behind the card)', six.probes === 1, String(six.probes));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
