// smoke: the Campaign's pause card is headed PAUSED, and its last line is the way back (Esc resume, T title), not the word again (plain Node, no Chrome)
// [night] graphics, the blind critic's picture 33: the pause card was headed CAMPAIGN and the word PAUSED sat in amber at the foot like a button. The scene is Phaser's: showPause is called on a stand-in that
// records what it hands to showCard; every other line of the card (the map line, the missile help, the debug keys) is checked to be still there.
// Run: node tests/campgfx-pause.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const card = JSON.parse(g.run(`JSON.stringify((() => { let got = null; const sc = { mode: '', camp: campNew(1, [], { seed: 1 }), showCard: (title, lines, hint, tall) => { got = { title, lines, hint, tall }; } }; Campaign.prototype.showPause.call(sc); return { ...got, mode: sc.mode }; })())`));
check('the card is headed PAUSED', card.title === 'PAUSED', card.title);
check('the foot says how to go on and how to leave, and does not say PAUSED again', /Esc/.test(card.hint) && /T\s+title/.test(card.hint) && !/PAUSED/.test(card.hint), card.hint);
check('the map line is still there', card.lines.some(l => /^Tab\s+map/.test(l)));
check('the missile and turret help is still there', card.lines.some(l => /missile/i.test(l)));
check('the debug keys line is still there', card.lines.some(l => /^DEBUG/.test(l)));
check('the scene is in pause mode', card.mode === 'pause');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
