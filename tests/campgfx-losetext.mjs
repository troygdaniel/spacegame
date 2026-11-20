// smoke: the Campaign's lose card has a line for every reason a level can be lost, the debug key's included (plain Node, no Chrome)
// [night] graphics, the blind critic's picture 32: the lose card said "camp.lose.debug", the raw key, because the debug key ends a level for the reason 'debug' and no text was written for it.
// The reasons are read from the code (every campEnd(C, 'lost', '<why>')), so a new reason with no text fails here, not on a screen.
// Run: node tests/campgfx-losetext.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const dir = new URL('../src/', import.meta.url);
const whys = new Set();
for (const f of readdirSync(dir).filter(f => f.endsWith('.js'))) {
  for (const m of readFileSync(new URL(f, dir), 'utf8').matchAll(/campEnd\(\s*\w+\s*,\s*'lost'\s*,\s*'(\w+)'/g)) whys.add(m[1]);
}
check('the code ends a level as lost for at least the carrier and Earth', whys.has('carrier') && whys.has('earth'), [...whys].join(', '));
check('the debug key is one of the reasons', whys.has('debug'));
for (const why of [...whys].sort()) {
  const text = g.run(`uiText('camp.lose.${why}')`);
  check(`the lose card has a sentence for "${why}"`, typeof text === 'string' && text.length > 8 && !/^camp\./.test(text) && /[a-z]/.test(text), text);
}
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
