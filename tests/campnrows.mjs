// smoke: the N panel's rows for the radio's stray and miner numbers and the 1.1 bait wave: each changes what it says, when it says, and the tool that bakes the settings in can write each one (plain Node, no Chrome)
// Card space-game-stray-n-rows (the cloud's numbers of src/campstray.js and src/campminer.js, and the third wave of mission 1.1, the bait that goes for the transport after the miner's call: Troy tunes by feel, the panel is how).
//   A. the rows: where they are, their defaults are the tables' own, in range on their step, and each has its words
//   B. the stray warning: far, grace and again each change when the radio says the cruiser is left behind
//   C. the miner call: gone, near and wait each change who counts as away and when the price line is said
//   D. the bait wave: its two rows are the THIRD wave of 1.1 (the one that says camp.say.miner.bait), a battle already made reads the change, and the other waves and missions are untouched
//   E. apply-tuning writes each (a table on one line, a place in a list) and changes only the number
// Run: node tests/campnrows.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';
import { editText, plan, FILES } from '../tools/apply-tuning.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const IDS = ['strayfar', 'straygrace', 'strayagain', 'minergone', 'minernear', 'minerwait', 'baittboats', 'baitskiffs'];

console.log('A. the rows');
{
  const rows = IDS.map(id => J(`(() => { const r = campTuneRow(${JSON.stringify(id)}); return r && { id: r.id, root: r.root, path: r.path, group: r.group, when: r.when, min: r.min, max: r.max, step: r.step, d: campTuneDefault(r.id), label: campTuneLabel(r) }; })()`));
  check('all eight rows are in the table, each in a group the panel lists', rows.every(r => r) && rows.every(r => J(`CAMP_TUNE.groups.indexOf(${JSON.stringify(r.group)}) >= 0`)), JSON.stringify(rows.map(r => r && r.id)));
  check('the defaults are the tables\' own: far 1500, grace 4, again 25; gone 1200, near 1300, wait 1.5; the bait wave 3 torpedo boats and 2 skiffs', rows.map(r => r.d).join() === '1500,4,25,1200,1300,1.5,3,2', rows.map(r => r.d).join());
  check('each default is inside its range and on its step', rows.every(r => r.d >= r.min && r.d <= r.max && Math.abs(Math.round((r.d - r.min) / r.step) * r.step + r.min - r.d) < 1e-9));
  check('each is felt at once (the numbers are read every tick, the wave when it comes)', rows.every(r => r.when === 'now'));
  check('each has its words (none is a missing key) and they are short enough for the panel (31 letters or fewer)', rows.every(r => !/^camp\./.test(r.label) && r.label.length <= 31), rows.map(r => r.label).join(' | '));
  check('no key of these labels is also used elsewhere in the words (a reused key silently clobbers the old text)', (() => { const all = readFileSync(join(ROOT, 'content/text/camptune.md'), 'utf8').split('\n').map(l => /^\|\s*(camp\.ui\.tune\.row\.[a-z]+)\s*\|/.exec(l)).filter(Boolean).map(m => m[1]); return new Set(all).size === all.length && IDS.every(id => all.indexOf('camp.ui.tune.row.' + id) >= 0); })());
}

console.log('B. the stray warning');
{
  // a convoy ship 2,000 px from the cruiser, the autopilot off: with far 1500 she is too far
  g.run(`window.__S = () => { const C = campNew(1, [], { mission: 0, seed: 1 }); for (let i = 0; i < 60 * 10; i++) campTick(C, 1 / 60); const u = campConvoys(C)[0], c = C.carrier; u.x = c.x + 2000; u.y = c.y; return C; };`);
  check('far: at 1500 a ship 2,000 px off is too far; at 2500 she is not; at 1000 she is (the row moves the line)', J('(() => { const C = __S(), a = campStrayFar(C) > 0; campTuneSet("strayfar", 2500); const b = campStrayFar(C) > 0; campTuneSet("strayfar", 1000); const c = campStrayFar(C) > 0; campTuneResetAll(); return [a, b, c]; })()').join() === 'true,false,true');
  const says = (grace, again, secs) => J(`(() => { campTuneResetAll(); campTuneSet("straygrace", ${grace}); campTuneSet("strayagain", ${again}); const C = __S(); C.stray = null; const t0 = C.t, got = []; for (let i = 0; i < ${secs} * 60; i++) { C.t += 1000 / 60; campStrayTick(C); const e = C.events.filter(x => x.type === 'say' && x.key === 'camp.say.stray'); if (e.length) { got.push(Math.round((C.t - t0) / 1000)); C.events.length = 0; } } campTuneResetAll(); return got; })()`);
  const base = says(4, 25, 70), slow = says(10, 25, 70), quick = says(4, 10, 70);
  check('grace: the first warning comes after the grace (4 s by default, 10 s with the row at 10)', base[0] >= 4 && base[0] <= 5 && slow[0] >= 10 && slow[0] <= 11, JSON.stringify([base, slow]));
  check('again: it is said again after that many seconds while it lasts (25 s by default, 10 s with the row at 10)', base[1] - base[0] >= 25 && base[1] - base[0] <= 26 && quick[1] - quick[0] >= 10 && quick[1] - quick[0] <= 11, JSON.stringify([base, quick]));
}

console.log('C. the miner call');
{
  // the call is live (the distress wave begun, the miner and his pirates alive), one pilot out at d px from the cruiser and e px from the miner
  g.run(`window.__M = (gone, near) => { const C = campNew(1, [], { mission: 0, seed: 1 }); const w = C.L.waves.findIndex(x => x.beat === 'distress'); C.waves[w].started = true; const m = C.ships.find(u => u.tid === C.L.waves[w].victim); const p = campWing(C).find(u => u.pilot); p.x = C.carrier.x + gone; p.y = C.carrier.y; m.x = p.x + near; m.y = p.y; const a = campSpawn(C, 'skiff', m.x + 50, m.y); if (a) a.wave = w; return { C, p, m }; };`);
  check('gone: a pilot 1,000 px from the cruiser is not away at the default 1,200 and is with the row at 800', J('(() => { const M = __M(1000, 100); const a = campMinerAway(M.C).length; campTuneSet("minergone", 800); const b = campMinerAway(M.C).length; campTuneResetAll(); return [a, b]; })()').join() === '0,1');
  check('near: a pilot 1,600 px from the miner is not away at the default 1,300 and is with the row at 2,000', J('(() => { const M = __M(1500, 1600); const a = campMinerAway(M.C).length; campTuneSet("minernear", 2000); const b = campMinerAway(M.C).length; campTuneResetAll(); return [a, b]; })()').join() === '0,1');
  const said = wait => J(`(() => { campTuneResetAll(); campTuneSet("minerwait", ${wait}); const M = __M(1500, 100), C = M.C; C.beats = C.beats || {}; let at = -1; const t0 = C.t; for (let i = 0; i < 60 * 12; i++) { C.t += 1000 / 60; campMinerTick(C); if (at < 0 && C.events.some(e => e.type === 'say' && /miner\\.(short|all)/.test(e.key))) at = (C.t - t0) / 1000; } campTuneResetAll(); return at; })()`);
  const w1 = said(1.5), w2 = said(5);
  check('wait: the price line comes after the wait (1.5 s by default, 5 s with the row at 5)', w1 >= 1.5 && w1 < 2.2 && w2 >= 5 && w2 < 5.7, JSON.stringify([w1, w2]));
}

console.log('D. the bait wave');
{
  const at = J('(() => { const ws = CAMP.levels[1].missions[0].waves; return ws.map(w => w.say); })()');
  check('the row\'s third wave (the place the rows point at) is the bait: its words are camp.say.miner.bait; the fourth, the probe of card space-game-b7-level1, is last and has none (it is silent: no new voiced line)', at.length === 4 && at[2] === 'camp.say.miner.bait' && !at[3], JSON.stringify(at));
  check('the others keep their ships: the miner\'s two skiffs, and the ambush with four skiffs and two torpedo boats, however the rows are set', J('(() => { campTuneSet("baittboats", 1); campTuneSet("baitskiffs", 0); const ws = CAMP.levels[1].missions[0].waves; const r = [JSON.stringify(ws[0].ships), JSON.stringify(ws[1].ships)]; campTuneResetAll(); return r; })()').join() === '{"skiff":2},{"skiff":4,"tboat":2}');
  check('a battle already made reads the change (the wave takes its ships when it comes), a new one does too, and the reset puts them back', J('(() => { const C = campNew(1, [], { mission: 0, seed: 1 }); const w = C.L.waves.findIndex(x => x.say === "camp.say.miner.bait"); campTuneSet("baittboats", 5); campTuneSet("baitskiffs", 1); const a = JSON.stringify(C.L.waves[w].ships), b = JSON.stringify(campMissionRow(1, 0).waves[w].ships); campTuneResetAll(); return [w, a, b, JSON.stringify(C.L.waves[w].ships)]; })()').join('|') === '2|{"tboat":5,"skiff":1}|{"tboat":5,"skiff":1}|{"tboat":3,"skiff":2}');
  check('the rows leave the other missions alone: 1.2 and 1.3 keep their waves', J('(() => { const a = JSON.stringify(CAMP.levels[1].missions.slice(1).map(m => m.waves)); campTuneSet("baittboats", 8); const b = JSON.stringify(CAMP.levels[1].missions.slice(1).map(m => m.waves)); campTuneResetAll(); return a === b; })()') === true);
}

console.log('E. the tool that bakes the settings in');
{
  const SRC = Object.fromEntries(Object.keys(FILES).map(k => [k, readFileSync(join(ROOT, FILES[k]), 'utf8')]));
  check('the tables of the radio rules are written by it (src/campstray.js and src/campminer.js are in its FILES)', FILES.CAMPSTRAY === 'src/campstray.js' && FILES.CAMPMINER === 'src/campminer.js');
  const P = plan(g, 'strayfar = 2400\nminerwait = 3\nbaittboats = 4\nbaitskiffs = 0\n');
  check('a block of four becomes four changes, none left over, with the old default and the new one', P.bad.length === 0 && P.rows.map(r => r.id + ':' + r.was + '>' + r.now).join(' ') === 'strayfar:1500>2400 minerwait:1.5>3 baittboats:3>4 baitskiffs:2>0', P.rows.map(r => r.id + ':' + r.was + '>' + r.now).join(' '));
  const one = (id, v) => { const r = plan(g, id + ' = ' + v + '\n').rows[0], e = editText(SRC[r.name], r.name, r.path, r.now); return { r, e, was: SRC[r.name].split('\n'), now: e && e.text.split('\n') }; };
  const f = one('strayfar', 2400), m = one('minerwait', 3), b = one('baittboats', 4), k = one('baitskiffs', 0);
  const diff = x => x.was.map((l, i) => l === x.now[i] ? -1 : i).filter(i => i >= 0);
  check('a table on one line: far 1500 becomes 2400 and nothing else on the line (grace, again, the comment) changes; the same for the miner\'s wait', f.e && /\{ far: 2400, grace: 4, again: 25 \}; \/\/ px \(150 km/.test(f.now[diff(f)[0]]) && diff(f).length === 1 && m.e && /wait: 3 \}/.test(m.now[diff(m)[0]]) && /gone: 1200, near: 1300/.test(m.now[diff(m)[0]]));
  check('a place in a list: the bait wave\'s torpedo boats and skiffs are written on the third wave\'s line only, the other waves\' lines are as they were', b.e && k.e && diff(b).length === 1 && diff(k).length === 1 && diff(b)[0] === diff(k)[0] && /camp\.say\.miner\.bait/.test(b.was[diff(b)[0]]) && /ships: \{ tboat: 4, skiff: 2 \}/.test(b.now[diff(b)[0]]) && /ships: \{ tboat: 3, skiff: 0 \}/.test(k.now[diff(k)[0]]));
  check('the comment after each changed line is what it was, byte for byte', [f, m, b, k].every(x => { const i = diff(x)[0]; return x.was[i].slice(x.was[i].indexOf('//')) === x.now[i].slice(x.now[i].indexOf('//')); }));
}
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CAMP N ROWS FAIL (${failed} of ${n})` : `CAMP N ROWS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
