// smoke: tools/apply-tuning.mjs reads a "Copy my settings" block and says (and with --write does) the CAMP changes it means
// Card space-game-tuning-panel (Troy, 22 Nov 2026). The block is what the panel's top row copies (src/camptune.js campTuneText); the tool finds each row's line in the tuning tables by their path, with no help from
// a list of line numbers: it reads the table as the sources write it (one key a line; the shield's pips on a line of their own).
//   A. every row of the panel has its line in the source: the line is found, and the number on it is the row's default (so a row can never point at the wrong line)
//   B. a block becomes the changes: old default, new default, the file and the line; a switch prints true or false; a row of pips prints its whole array
//   C. the edit: only the number, the array or the boolean on the line changes, the comment after it never; the edited source loads, and the game then holds the new defaults, with a pip row still in its shape
//   D. a line that is not understood is listed and exits non-zero; an empty block says so
// Run: node tests/applytuning.mjs   (exit code 1 on a failed check)
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { nodeGame, ROOT } from './nodegame.mjs';
import { findLine, editText, plan, FILES } from '../tools/apply-tuning.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame(), J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const SRC = Object.fromEntries(Object.keys(FILES).map(k => [k, readFileSync(join(ROOT, FILES[k]), 'utf8')])); // every table the tool writes: CAMP, CAMPZOOM and the radio rules' CAMPSTRAY, CAMPMINER (card space-game-stray-n-rows)

console.log('A. every row has its line');
const rows = J('CAMP_TUNE.rows.map(r => ({ id: r.id, flag: r.kind === "flag", name: r.kind === "flag" ? "CAMP" : r.root, path: r.kind === "flag" ? "flags." + r.flag : r.path, d: (() => { const s = campTuneSlot(r); return s.obj[s.key]; })() }))');
for (const r of rows) {
  const i = findLine(SRC[r.name], r.name, r.path.split('.')), line = i < 0 ? '' : SRC[r.name].split('\n')[i].replace(/\/\/.*$/, '');
  const key = r.path.split('.').pop(), m = new RegExp('\\b' + key + '\\s*:\\s*(\\[[^\\]]*\\]|true|false|-?[\\d.]+)').exec(line);
  const val = m ? JSON.parse(m[1]) : undefined;
  check(`${r.id}: ${r.name}.${r.path} is on a line of its source, and the value there is the row's default`, i >= 0 && JSON.stringify(val) === JSON.stringify(r.d), `line ${i + 1}: ${line.trim().slice(0, 100)}`);
}

console.log('B. a block becomes the changes');
const block = 'LONG HAUL TUNING v1\ncruiserspeed = 280   # Cruiser top speed, default 210\nshieldmend = 6   # Shield mend rate, default 3\ndistress = off   # The distress call of mission 1.1, default on\norerock = 40\n';
const P = plan(g, block);
check('four rows, none left over', P.rows.length === 4 && P.bad.length === 0);
check('the old default and the new one of each', P.rows.map(r => r.id + ':' + JSON.stringify(r.was) + '>' + JSON.stringify(r.now)).join(' ') === 'cruiserspeed:210>280 shieldmend:[0,1.5,3,6,10]>[0,3,6,12,20] distress:true>false orerock:20>40', P.rows.map(r => r.id + ':' + JSON.stringify(r.was) + '>' + JSON.stringify(r.now)).join(' '));
check('planning leaves the game as it was (no override left in it)', J('campTuneCount()') === 0 && J('CAMP.carrier.speed') === 210);

console.log('C. the edit');
let text = SRC.CAMP; const changes = [];
for (const r of P.rows.filter(x => x.name === 'CAMP')) { const e = editText(text, r.name, r.path, r.now); changes.push(e && e.line); if (e) text = e.text; }
const was = SRC.CAMP.split('\n'), now = text.split('\n');
const diff = was.map((l, i) => l === now[i] ? -1 : i).filter(i => i >= 0);
check('exactly four lines of the source changed (the lines the tool named), and the file has as many lines as before', diff.length === 4 && was.length === now.length && diff.map(i => i + 1).sort((a, b) => a - b).join() === changes.slice().sort((a, b) => a - b).join(), diff.join());
check('on each changed line the comment after the number is what it was, byte for byte', diff.every(i => was[i].slice(was[i].indexOf('//')) === now[i].slice(now[i].indexOf('//'))));
check('the zoom table (src/campzoom.js, an inline object on one line) is found too: startPresses: 6 becomes 4 and nothing else on the line changes', (() => { const e = editText(SRC.CAMPZOOM, 'CAMPZOOM', 'view.startPresses', 4); return !!e && /startPresses: 4 \}/.test(e.text) && e.text.split('\n').filter((l, i) => l !== SRC.CAMPZOOM.split('\n')[i]).length === 1; })());
check('every pip row has its whole array rewritten with the shape kept (the laser refill 2 5 8 11 14 at 16 is 4 10 16 22 28)', (() => { const p = plan(g, 'laserrefill = 16\n'); return JSON.stringify(p.rows[0].now) === '[4,10,16,22,28]' && /tank: \{/.test(SRC.CAMP) && editText(SRC.CAMP, 'CAMP', 'tank.refill', p.rows[0].now).text.split('\n').some(l => /refill: \[4, 10, 16, 22, 28\],/.test(l)); })());
const g2 = nodeGame({ replace: { 'src/campaign.js': text } });
check('the edited source loads, and the game holds the new defaults: speed 280, ore 40, the distress call off, the shield curve 0 3 6 12 20 (its shape kept)', g2.run('CAMP.carrier.speed') === 280 && g2.run('CAMP.ore.rock') === 40 && g2.run('CAMP.flags.distress') === false && g2.run('CAMP.power.shields.regen.join()') === '0,3,6,12,20');
check('the panel in that game starts from them: they are the defaults now, so nothing is overridden and "Copy my settings" is empty', g2.run('campTuneDefault("cruiserspeed")') === 280 && g2.run('campTuneCount()') === 0 && g2.run('campTuneText()') === '');

console.log('D. what is not understood');
const bad = plan(g, 'cruiserspeed = fast\nnosuchrow = 3\ndistress = 7\norerock = 25\n');
check('three lines are listed, the one good row is kept', bad.bad.length === 3 && bad.rows.length === 1 && bad.rows[0].id === 'orerock');
check('an empty block has no rows and nothing bad', (() => { const e = plan(g, ''); return e.rows.length === 0 && e.bad.length === 0; })());
// the command line, on a copy of the two files so nothing real is edited
const dir = mkdtempSync(join(tmpdir(), 'applytuning-')); mkdirSync(join(dir, 'src'));
writeFileSync(join(dir, 'block.txt'), block);
const cli = (args) => spawnSync('node', [join(ROOT, 'tools/apply-tuning.mjs'), ...args], { encoding: 'utf8' });
const dry = cli([join(dir, 'block.txt')]);
check('the command line prints each change with its file and line and exits 0', dry.status === 0 && /CAMP\.carrier\.speed {2}210 -> 280 {3}\(src\/campaign\.js:\d+/.test(dry.stdout) && /CAMP\.flags\.distress {2}true -> false/.test(dry.stdout) && /CAMP\.power\.shields\.regen {2}\[0, 1\.5, 3, 6, 10\] -> \[0, 3, 6, 12, 20\]/.test(dry.stdout), dry.stdout + dry.stderr);
writeFileSync(join(dir, 'bad.txt'), 'distress = 7\n');
const badRun = cli([join(dir, 'bad.txt')]);
check('a block with a line it does not understand exits 1 and says which', badRun.status === 1 && /NOT UNDERSTOOD {2}distress = 7/.test(badRun.stdout), badRun.stdout);
check('the repository was not touched by a plain run', readFileSync(join(ROOT, 'src/campaign.js'), 'utf8') === SRC.CAMP);

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
