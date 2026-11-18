// smoke: jump from anywhere: no mass limit on the hyper jump; hostiles near still lock it; cruise keeps its own mass limit (plain Node)
// Card space-game-jump-from-anywhere (Troy, 17 Nov 2026: "do not require me to move away from a station or mass to hyper jump").
// jumpLock(s) in src/jump.js says why a charge cannot start, or null. It used to refuse within 2000 px of a station or planet with
// "Too close to the mass: fly clear of ...". That rule and its constant are gone; the other rules stay.
// Run: node tests/jumplock.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  var __toasts = []; toast = (s, m) => { __toasts.push(m); }; sfx = () => {}; beep = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __pirates = [];
  function __at(x, y) { __toasts = []; return { ship: { x, y }, enemies: { getChildren: () => __pirates }, add: __P, cameras: __P, game: { scene: { stop() {} } }, scene: { resume() {} } }; }
`);
const st = J(`sysBody('station')`), pl = J(`sysBody('planet')`);

console.log('beside a station or a planet');
{
  for (const [what, b, off] of [['on top of Halcyon Station', st, 0], ['100 px from it', st, 100], ['1,500 px from it', st, 1500], ['just inside the old 2,000 px limit', st, 1999], ['on top of the planet', pl, 0], ['1,000 px from the planet', pl, 1000]])
    check(`${what}: nothing locks the jump`, J(`jumpLock(__at(${b.x + off}, ${b.y}))`) === null, J(`jumpLock(__at(${b.x + off}, ${b.y}))`));
  check('in open space, as before: no lock', J('jumpLock(__at(60000, 60000))') === null);
  check('the mass limit constant is gone, the hostile one is still 1,500 px', J('JUMP.lockMass') === null && J('JUMP.lockHostile') === 1500);
  const kes = J(`(() => { const here = galaxyFind(G.system), all = Object.keys(SYSTEMS).filter(id => id !== G.system).map(id => ({ id, j: galaxyJump(here, galaxyFind(id)) })).filter(x => x.j && x.j.ok); return all[0] || null; })()`);
  if (kes) {
    g.run(`var __s1 = __at(${st.x + 300}, ${st.y}); var __went = jumpPick(__s1, '${kes.id}', ${JSON.stringify(kes.j)});`);
    check(`Enter on the galaxy map 300 px from the station: the charge to ${kes.id} starts`, J('__went') === true && J('__s1.jmp.to') === kes.id && J('__toasts.some(m => /Charging the jump/.test(m))') && !J('__toasts.some(m => /mass|fly clear/i.test(m))'), J('__toasts'));
  } else check('a star in range to try the pick with', false, 'none in range on a fresh game');
}

console.log('the rules that stay');
{
  g.run(`__pirates = [{ active: true, x: ${st.x + 1000}, y: ${st.y} }]`);
  check('a hostile 1,000 px away: Hostiles near, no jump (beside the station too)', J(`jumpLock(__at(${st.x}, ${st.y}))`) === 'Hostiles near: no jump.' && J('jumpLock(__at(' + (st.x + 900) + ', ' + st.y + '))') === 'Hostiles near: no jump.');
  g.run(`__pirates = [{ active: true, x: ${st.x + 1700}, y: ${st.y} }]`);
  check('a hostile 1,700 px away is far enough', J(`jumpLock(__at(${st.x}, ${st.y}))`) === null);
  g.run(`__pirates = [{ active: false, x: ${st.x + 10}, y: ${st.y} }]`);
  check('a dead pirate locks nothing', J(`jumpLock(__at(${st.x}, ${st.y}))`) === null);
  g.run(`__pirates = []`);
  for (const flag of ['dead', 'leaving', 'cruising'])
    check(`s.${flag}: not now`, J(`(() => { const s = __at(60000, 60000); s.${flag} = true; return jumpLock(s); })()`) === 'not now');
  check('deep space after a pull-out: not now', J(`(() => { G.deep = true; const r = jumpLock(__at(60000, 60000)); G.deep = false; return r; })()`) === 'not now');
  check('cruise keeps its own mass limit (2,500 px): the autopilot flies clear of that by itself', J('CRUISE.lockMass') === 2500);
}

console.log('nothing still tells the player to fly clear before a jump');
{
  const files = [];
  for (const dir of ['src', 'content/text', 'tools']) for (const f of readdirSync(join(ROOT, dir))) if (/\.(js|mjs|md)$/.test(f)) files.push(join(dir, f));
  files.push('docs/UNIVERSE.md', 'README.md');
  const hits = [];
  for (const f of files) readFileSync(join(ROOT, f), 'utf8').split('\n').forEach((line, i) => { if (/JUMP\.lockMass|fly clear[^.]*to jump|clear of [^.]* to jump/i.test(line)) hits.push(f + ':' + (i + 1)); });
  check('no code reads JUMP.lockMass and no text says fly clear to jump', hits.length === 0, hits.join(', '));
  check('the docked galaxy map says where a jump starts, and asks for no flying clear', /Jumps start from space: launch, then press G\./.test(readFileSync(join(ROOT, 'src/galaxymap.js'), 'utf8')));
  const doc = readFileSync(join(ROOT, 'docs/UNIVERSE.md'), 'utf8');
  check('docs/UNIVERSE.md says a jump starts from anywhere', /A jump starts from anywhere in space/.test(doc) && !/cannot start a charge inside 2000 px/.test(doc));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
