// smoke: the Campaign's cards fit their text (plain Node, no Chrome): the title, the body and the hint must not overlap, whatever the number of lines
// Wrap-up bug hunt of level 2 (card space-game-wrapup-hunt-l2): the briefing of mission 1 (two lines, BONUS, three bonuses = eleven rows of text) ran over its 330 px card: the title was written over the
// first line and the last bonus over "Enter  fly". showCard (src/campaignscene.js) now grows the card to its text. The fake text's height is its rows times a row of 24 px (what Chrome measured: a 20 px
// line with 4 px of spacing), the same for every card.
//   node tests/campcardfit.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`window.__card = (title, lines, hint, tall) => {
  const made = [], mk = (kind, o) => { const t = Object.assign({ kind, setOrigin() { return t; }, setStrokeStyle() { return t; }, setScrollFactor() { return t; }, setDepth() { return t; }, destroy() {},
    setSize(w, h) { t.w = w; t.h = h; return t; }, setPosition(x, y) { t.x = x; t.y = y; return t; }, setY(y) { t.y = y; return t; } }, o); made.push(t); return t; };
  const s = Object.create(Campaign.prototype);
  s.add = { rectangle: (x, y, w, h) => mk('rect', { x, y, w, h }), text: (x, y, txt) => mk('text', { x, y, txt, h: String(txt).split('\\n').length * 24 + 6, setText(v) { this.txt = v; this.h = String(v).split('\\n').length * 24 + 6; return this; } }), };
  s.showCard(title, lines, hint, tall);
  const texts = made.filter(o => o.kind === 'text'), rects = made.filter(o => o.kind === 'rect'), card = rects[1];
  return { title: { y: texts[0].y, h: 30 }, body: { y: texts[1].y, h: texts[1].h }, hint: { y: texts[2].y, h: 20 }, card: { y: card.y, h: card.h }, H };
};`);
const geo = (title, lines, hint, tall) => J(`__card(${JSON.stringify(title)}, ${JSON.stringify(lines)}, ${JSON.stringify(hint)}, ${tall == null ? 'undefined' : tall})`);
const fits = r => r.title.y + r.title.h / 2 + 6 <= r.body.y - r.body.h / 2 && r.body.y + r.body.h / 2 + 6 <= r.hint.y - r.hint.h / 2 && r.card.y - r.card.h / 2 >= 0 && r.card.y + r.card.h / 2 <= r.H && r.title.y - r.title.h / 2 >= r.card.y - r.card.h / 2 && r.hint.y + r.hint.h / 2 <= r.card.y + r.card.h / 2;
// a story card (two lines) and the briefing of mission 1 of level 2 (two lines, BONUS, three bonuses: 6 entries)
const story = geo('LEVEL 2: Alpha Centauri', ['Warp drive ready.', 'Something old waits.'], 'Enter  begin');
const brief = geo('MISSION 1 OF 3: Resources', ['Gather two resource caches.', 'The aliens followed us.', 'BONUS', '+250  Find the cloaked cache', '+250  Finish in 100 seconds', '+250  Lose no ships'], 'Enter  fly', 330);
check('a short card (two lines) fits: title, body and hint apart, inside the screen', fits(story), JSON.stringify(story));
check('the briefing of mission 1 of level 2 (six lines, 330 px asked) fits: the title is not written over the first line, the last bonus is not over the hint', fits(brief), JSON.stringify(brief));
const nine = geo('MISSION 3 OF 3', Array.from({ length: 9 }, (_, i) => 'Line number ' + (i + 1)), 'Enter  fly', 330), long = geo('MISSION 3 OF 3', Array.from({ length: 12 }, (_, i) => 'Line number ' + (i + 1)), 'Enter  fly', 330);
check('a card of nine lines grows to its text and fits the screen', fits(nine) && nine.card.h > 330, JSON.stringify(nine));
check('a card of twelve lines is too tall for the screen even grown: the blank lines between the lines go, and it fits', fits(long), JSON.stringify(long));
check('the card never gets smaller than asked: a two-line card of 330 px is still 330 px', story.card.h >= 300 && geo('T', ['a', 'b'], 'h', 330).card.h === 330);
console.log(failed ? `CAMP CARD FIT FAIL (${failed} of ${n})` : `CAMP CARD FIT PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
