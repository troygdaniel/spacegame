// smoke: no two actions in space share a key (plain Node, no Chrome)
// Card space-game-assist-overview-overlap: on main, B both opened the Overview list (src/overview.js) and locked a target (src/gunlock.js): two
// cards built the same evening each took the free key. This test reads every key the Space scene's files bind: the literal ones from their
// addKey / addKeys calls, the ones kept in a table (ASSIST.key, the assist's modes, OVERVIEW.key, GUNLOCK.key) from the game itself, and the
// FLIGHT rows of the controls table (src/data_controls.js). One key, one owner. The keys a list borrows while it is open (W S, the arrows,
// Enter) are the exception by design: the nav list, the Overview and the flight code hand them to each other.
// Run: node tests/spacekeys.mjs   (exit code 1 on a failed check)
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

const BORROWED = ['W', 'S', 'UP', 'DOWN', 'ENTER'];                       // a list that is open takes these from the flight code
const FILES = ['space', 'assist', 'assist_orbit', 'autopilot', 'cruise', 'jump', 'gunlock', 'overview', 'clickmove', 'boost', 'camzoom', 'autotarget', 'handling', 'navpanel'];
const owners = new Map();                                                 // key -> the files that bind it
const own = (key, who) => { const k = String(key).toUpperCase(); if (!owners.has(k)) owners.set(k, new Set()); owners.get(k).add(who); };
for (const f of FILES) {
  const p = join(ROOT, 'src', f + '.js'); if (!existsSync(p)) continue;
  const src = readFileSync(p, 'utf8');
  for (const m of src.matchAll(/addKeys?\('([^']+)'\)/g)) m[1].split(',').forEach(k => own(k.trim(), f));
}
own(J('ASSIST.key'), 'assist'); J('Object.values(ASSIST_MODES).map(m => m.key).filter(Boolean)').forEach(k => own(k, 'assist modes'));
own(J('OVERVIEW.key'), 'overview'); own(J('GUNLOCK.key'), 'gunlock');
['W', 'S', 'UP', 'DOWN', 'ENTER'].forEach(k => own(k, 'overview'));           // overviewSetup binds its list keys beside its own key

console.log('one key, one owner');
{
  const shared = [...owners].filter(([k, who]) => who.size > 1 && !BORROWED.includes(k)).map(([k, who]) => k + ': ' + [...who].join(' and '));
  check('no key is bound by two files of the Space scene (list keys apart)', shared.length === 0, shared.join('; '));
  check('the scan found the keys it should: the flight keys, the assist, its orders, the Overview and the gun lock', ['W', 'A', 'D', 'SPACE', 'L', 'R', 'P', 'N', 'C', 'F', 'Z', 'ONE', 'TWO', J('OVERVIEW.key'), J('GUNLOCK.key')].every(k => owners.has(k)), [...owners.keys()].join(' '));
  check('the Overview and the gun lock have different keys', J('OVERVIEW.key') !== J('GUNLOCK.key'), J('OVERVIEW.key') + ' ' + J('GUNLOCK.key'));
  check('the flight keys that hand the stick back are nobody else\'s action', J('ASSIST.keys').filter(k => !BORROWED.includes(k)).every(k => owners.get(k) && owners.get(k).size === 1 && owners.get(k).has('space')), J('ASSIST.keys').join(' '));
}

console.log('the controls table');
{
  const rows = J(`CONTROLS.find(g => g.id === 'flight').rows.map(r => r.k)`), caps = rows.flat().map(k => k.toUpperCase());
  const twice = caps.filter((k, i) => caps.indexOf(k) !== i);
  check('no key cap stands in two FLIGHT rows', twice.length === 0, twice.join(' '));
  const everywhere = J(`CONTROLS.find(g => g.id === 'any').rows.map(r => r.k).flat()`).map(k => k.toUpperCase());
  for (const [what, key] of [['the Overview', J('OVERVIEW.key')], ['the gun lock', J('GUNLOCK.key')]])
    check(`${what}'s key (${key}) is not a FLIGHT or ANYWHERE key for something else`, !caps.includes(key) && !everywhere.includes(key));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
