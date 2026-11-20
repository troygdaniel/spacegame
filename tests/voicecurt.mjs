// smoke: the lines the ship, the computer and the characters speak are curt: one short sentence, about 12 words at most (plain Node, no Chrome)
// Card space-game-voice-curt (Troy, 20 Nov 2026: the spoken lines are too long). The rule of thumb: one short sentence, about 12 words at most, the fact first, no pleasantries; the
// number or name the player needs stays. This test counts words (a {placeholder} is one word) in what is SPOKEN, in both games, and fails on the first line that grew back:
//   A  the ship's event lines (VOICE_LINES in src/voice.js) and no pleasantries ("welcome", "well flown", "all systems nominal")
//   B  the characters' scripted lines and their reactions (content/npcs/*.md), also in the code defaults of src/shop.js and in the bar line of the station file
//   C  the Campaign's computer lines (camp.say, camp.no, camp.nav, camp.help, camp.lose.tip, camp.nudge: content/text/*.md) and the MULE's and the Reaver's toasts
//   D  the computer's own answers (the fixed refusals of src/shipcomputer.js, the two how-to answers: every sentence), and the rule it and the characters are given
//   E  what Short says aloud of an answer: the first sentence, the second only when the first is tiny
// NOT here: the Campaign's story lines (camp.l1/l2/l3 before and after: space-game-campaign-belt is rewriting them to the same rule), the shown-only text (help screens, tips, the
// mission board, key hints) and the prompts' other rules. Run: node tests/voicecurt.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const words = s => String(s).replace(/\{[^}]*\}/g, 'N').split(/\s+/).filter(Boolean).length;
const sentences = s => String(s).replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+(?=[A-Z"])/).filter(Boolean);
const MAX = 12;
// the lines over the cap, as "words: text"
const over = (lines, max = MAX) => lines.filter(l => words(l) > max).map(l => words(l) + ': ' + l);
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const read = f => readFileSync(ROOT + '/' + f, 'utf8');

// ---- A: the ship's event lines ----
{
  const L = J('VOICE_LINES'), flat = [];
  Object.keys(L).forEach(k => { if (k === 'test') return; if (typeof L[k] === 'string') flat.push(L[k]); else Object.keys(L[k]).forEach(j => flat.push(L[k][j])); });
  check(`A  every event line of the ship is ${MAX} words or fewer (${flat.length} lines)`, over(flat).length === 0, over(flat).join(' | '));
  const pleasant = flat.filter(l => /\b(welcome|well flown|nominal)\b/i.test(l));
  check('A  no pleasantries in the event lines ("welcome", "well flown", "all systems nominal")', pleasant.length === 0, pleasant.join(' | '));
}

// ---- B: the characters ----
const tableRows = f => read(f).split('\n').map(l => /^\|\s*([^|]+?)\s*\|\s*(.*?)\s*\|\s*$/.exec(l)).filter(m => m && m[1] !== 'key' && m[1] !== 'when' && !/^-+$/.test(m[1])).map(m => [m[1], m[2]]);
{
  const files = readdirSync(ROOT + '/content/npcs').filter(f => f.endsWith('.md'));
  const lines = [], reacts = [], filed = []; // filed: the ship computer's lines live only in its file; the bar characters' also have defaults in src/shop.js
  files.forEach(f => {
    const sec = { s: '' };
    read('content/npcs/' + f).split('\n').forEach(l => {
      if (l.startsWith('## ')) { sec.s = l.slice(3).trim(); return; }
      if (sec.s === 'Lines' && l.startsWith('- ')) { lines.push(l.slice(2).trim()); if (f !== 'ship-computer.md') filed.push(l.slice(2).trim()); }
      const m = /^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$/.exec(l);
      if (sec.s === 'Reactions' && m && m[1] !== 'when' && !/^-+$/.test(m[1])) { reacts.push(m[2]); filed.push(m[2]); }
    });
  });
  check(`B  every scripted line is ${MAX} words or fewer (${lines.length} lines)`, over(lines).length === 0, over(lines).join(' | '));
  check(`B  every reaction is ${MAX} words or fewer (${reacts.length} reactions)`, over(reacts).length === 0, over(reacts).join(' | '));
  const code = read('src/shop.js'); // the defaults the files lie over: a {placeholder} is code there, so a line is checked in its pieces
  const inCode = t => t.split(/\{[^}]*\}/).filter(p => p.trim()).every(p => code.includes(p.trim()) || code.includes(p.trim().replace(/'/g, "\\'")));
  const missing = filed.filter(t => !inCode(t));
  check('B  the code defaults (src/shop.js) say the same words as the files (the two tables must not drift)', missing.length === 0, missing.join(' | '));
  const barSec = read('content/stations/halcyon-station.md').split('## Bar')[1] || '';
  const barLines = barSec.split('\n').filter(l => l.startsWith('- ')).map(l => l.slice(2).trim());
  check(`B  the bar lines of the Halcyon station file are ${MAX} words or fewer`, barLines.length > 0 && over(barLines).length === 0, over(barLines).join(' | '));
  const shipLines = J('NPCS.map(n => n.lines).reduce((a, l) => a.concat(l), [])');
  check(`B  what the game plays from (the sealed content) is curt too, not only the files (${shipLines.length} lines)`, over(shipLines).length === 0, over(shipLines).join(' | '));
}

// ---- C: the Campaign's computer lines and the two comms toasts ----
{
  const OWN = /^(camp\.say\.|camp\.no\.|camp\.nav\.(go|off|cleared|arrived|lost|say|stopping|there|no\.)|camp\.help\.|camp\.lose\.tip\.|camp\.nudge\.|toast\.mule-|toast\.reaver-)/;
  const STORY = /^camp\.l\d\./; // the story lines: space-game-campaign-belt's
  const EXTRA = { 'camp.help.keys': 17 }; // the five orders by name (the pilot asked which keys): a list, not a sentence
  const rows = [].concat(...readdirSync(ROOT + '/content/text').filter(f => f.endsWith('.md')).map(f => tableRows('content/text/' + f)));
  const mine = rows.filter(([k]) => OWN.test(k) && !STORY.test(k));
  const bad = mine.filter(([k, t]) => words(t) > (EXTRA[k] || MAX)).map(([k, t]) => k + ' ' + words(t) + ': ' + t);
  check(`C  every spoken Campaign line and the two comms toasts is ${MAX} words or fewer (${mine.length} rows)`, mine.length > 40 && bad.length === 0, bad.join(' | '));
  check('C  the story lines are untouched by this card (camp.l1..l3 before and after keep their own rows)', rows.filter(([k]) => STORY.test(k)).length === 12);
}

// ---- D: the computer ----
{
  const src = read('src/shipcomputer.js');
  // the fixed refusals: scNo('...') and the plain 'return' answers a pilot hears
  const refusals = [...src.matchAll(/\bscNo\('((?:[^'\\]|\\.)*)'\)/g)].map(m => m[1].replace(/\\'/g, "'"));
  const direct = [...src.matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(m => m[1].replace(/\\'/g, "'")).filter(t => /^(That is your|I cannot do that|There are no pirates|Pirates show|Launch first: pirates)/.test(t));
  const spoken = refusals.concat(direct);
  const bad = spoken.filter(t => sentences(t).some(s => words(s) > MAX)).map(t => words(t) + ': ' + t);
  check(`D  every fixed refusal of the computer is ${MAX} words or fewer a sentence (${spoken.length} lines)`, spoken.length >= 10 && bad.length === 0, bad.join(' | '));
  const jump = J("scJumpHow({ scene: { key: 'Space' } })"), trade = J('scTradeHow()');
  check(`D  "how do I jump" is short sentences, ${MAX} words at most each`, sentences(jump).every(s => words(s) <= MAX) && sentences(jump).length <= 3, jump);
  check(`D  "how do I trade" is short sentences, ${MAX} words at most each`, sentences(trade).every(s => words(s) <= MAX) && sentences(trade).length <= 3, trade);
  check('D  the computer is told: one short sentence, about 12 words, the fact first', /one short sentence, about 12 words/.test(src.split('const SC_RULES')[1].split('].join')[0]));
  check('D  the plain-reply format says one short sentence too (SAY:)', (src.match(/SAY: one short sentence/g) || []).length >= 2);
  const chat = read('src/chat.js');
  check('D  the characters are told: one short sentence, about 12 words', /Reply in one short sentence, about 12 words/.test(chat));
  check('D  the computer\'s own persona (ship-computer.md) says one short sentence', /Brief: one short sentence/.test(read('content/npcs/ship-computer.md')));
}

// ---- E: what Short says aloud ----
{
  const first = t => J(`voiceFirst(${JSON.stringify(t)})`);
  const lim = J('VOICE_SPOKEN_LIMIT');
  check('E  Short: the first sentence is said, the second only when the first is under 45 letters', lim.min === 45, JSON.stringify(lim));
  check('E  Short: nothing longer than 120 letters is said in one go', lim.max === 120, JSON.stringify(lim));
  check('E  a first sentence of normal length is said alone', first('Press G for the galaxy map, then pick a star and press Enter. It needs fuel.') === 'Press G for the galaxy map, then pick a star and press Enter.', first('Press G for the galaxy map, then pick a star and press Enter. It needs fuel.'));
  check('E  a tiny first sentence takes the second', first('Yes. Press G for the map.') === 'Yes. Press G for the map.', first('Yes. Press G for the map.'));
}
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `VOICE CURT FAIL (${failed} of ${n})` : `VOICE CURT PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
