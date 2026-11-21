// smoke: three lines of level 2 that read wrong (plain Node, no Chrome): found by the wrap-up bug hunt (card space-game-wrapup-hunt-l2, docs/wrapup/level2.md)
//   1. the level card after the warp said "Warp drive ready. Next star: Alpha Centauri." (the cinematic had just arrived there)
//   2. mission 3 reused mission 2's wave line "A second group, coming in from the far side." for its only wave
//   3. the bonus "Lose at most {n} ships" said "1 ships"
// Run: node tests/camplevel2words.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const before = J(`campStory(2, 'before', false)`);
check('1  the level 2 card (shown after the warp cinematic) does not talk of the warp as to come: no "ready", no "Next star"', before.length === 2 && !/ready|next star/i.test(before.join(' ')) && /Alpha Centauri/.test(before.join(' ')), before.join(' | '));
check('1  it is short enough to be spoken (12 words or fewer a line)', before.every(l => l.split(/\s+/).length <= 12), before.join(' | '));
const says = J(`CAMP.levels[2].missions.map(m => (m.waves || []).map(w => w.say))`);
check('2  every wave of level 2 says its own line: each mission uses one key of its own, three different keys (the difficulty pass gave missions 2 and 3 more waves: card space-game-wrapup-difficulty)', new Set(says.flat()).size === 3 && says.every(m => new Set(m).size === 1), JSON.stringify(says));
check('2  every one of them is a real line (not the key), at most 12 words', says.flat().every(k => { const t = J(`uiText(${JSON.stringify(k)})`); return t !== k && t.split(/\s+/).length <= 12; }));
check('2  mission 3\'s line does not say "second group"', !/second group/i.test(J(`uiText(CAMP.levels[2].missions[2].waves[0].say)`)));
const lost = [0, 1, 2, 3].map(k => J(`campHubBonusText({ type: 'lost', n: ${k} })`));
check('3  the "lost" bonus is grammatical for 1: no "1 ships"', !lost.some(t => /\b1 ships\b/.test(t)), lost.join(' | '));
check('3  and for 0, 2 and 3 it states the number', lost[0] === 'Lose no ships' && /2/.test(lost[2]) && /3/.test(lost[3]), lost.join(' | '));
console.log(failed ? `CAMP LEVEL2 WORDS FAIL (${failed} of ${n})` : `CAMP LEVEL2 WORDS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
