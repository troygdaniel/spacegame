// smoke: the Campaign's won and lost cards are headed "LEVEL n WON" and "LEVEL n LOST", not "CAMPAIGN" like the pause card (plain Node, no Chrome)
// [night] graphics, the blind critic's pictures 30, 32 and 33: every card was titled CAMPAIGN, the defeat card had no word for defeat. The scene is Phaser's: showWon and showLost are called on a stand-in
// that records the title they hand to showCard.
// Run: node tests/campgfx-titles.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
const cards = J(`[1, 2, 3].map(n => { const got = []; const sc = { level: n, mode: '', showCard: (title, lines, hint) => got.push({ title, lines, hint }), say() {} };
  Campaign.prototype.showWon.call(sc); Campaign.prototype.showLost.call(sc, 'carrier'); Campaign.prototype.showLost.call(sc, 'earth'); return { n, won: got[0], lost: got[1], lost2: got[2], mode: sc.mode }; })`);
for (const c of cards) {
  check(`level ${c.n}: the won card is headed with its level and WON`, c.won.title === `LEVEL ${c.n} WON`, c.won.title);
  check(`level ${c.n}: the lost card is headed with its level and LOST`, c.lost.title === `LEVEL ${c.n} LOST` && c.lost2.title === c.lost.title, c.lost.title);
  check(`level ${c.n}: the won card still shows the story lines and the way on`, c.won.lines.length >= 1 && /Enter/.test(c.won.hint), c.won.hint);
  check(`level ${c.n}: the lost card still says why and how to try again`, c.lost.lines[0] === 'The cruiser is lost.' && c.lost2.lines[0] === "Earth's shield has failed." && /try again/.test(c.lost.hint));
}
check('neither is the old shared title', cards.every(c => c.won.title !== 'CAMPAIGN' && c.lost.title !== 'CAMPAIGN'));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
