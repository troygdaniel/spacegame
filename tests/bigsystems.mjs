// smoke: a system may be 1,000,000 units wide: the file limit, the cruise time sum, the map's grid and the interdiction roll cope (plain Node, no Chrome)
// Card space-game-sol-needs-bigger-systems. A system file could be at most 200,000 units across (600,000 px in the game), so in the Sol pack
// Earth to Neptune was 26 seconds of cruise where the card asked for minutes. The limit is now 1,000,000 units (3,000,000 px, a little over
// six minutes of cruise from edge to edge) and the cruise is as fast as it was. This test follows what has to cope with the width:
//   1. the schema: size, a body's x, y and orbit, the star and a call's pickets take 1,000,000 and refuse more
//   2. cruiseEta, the time a leg takes: it stopped counting at 50 s. Every leg the shipped systems have gives the number it gave; a longer
//      one agrees with a fine-stepped sum; the readout says minutes from 100 s on
//   3. the Tab map's grid (mapGridStep) and view (mapView) at every width: a handful of lines, never none and never hundreds
//   4. interdiction: a long leg is no likelier to be cut than the longest shipped one; a short one rolls as it did
//   5. a system as wide as the limit, built from a file: bodies at the far side are where the file says, times 3, and can be cruised to
// Run: node tests/bigsystems.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const Jin = (game, e) => JSON.parse(game.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const J = e => Jin(g, e);
const MAX = 1000000, C = g.run('ContentLib');
const KNOWN = { known: (type, id) => (type === 'system' && id === 'halcyon') || type === 'station' };

console.log('1. the file limit');
const sysFile = (size, rows, extra = '') => ({ path: 'content/systems/wide.md', text: `---\ntype: system\nname: Wide\nkind: outpost\nly: [30, 30]\nsize: ${size}\ndanger: 1\ntraffic: 0\nseed: 5\n${extra}---\nWide.\n\n## Bodies\n| id | type | name | x | y | r | kind | orbit | angle |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n${rows.map(r => '| ' + r.join(' | ') + ' |\n').join('')}` });
const errs = f => C.loadAll([f], KNOWN).errors.map(e => e.field + ': ' + e.message);
{
  const ok = C.loadAll([sysFile(MAX, [['far-rock', 'planet', 'Far Rock', MAX, MAX - 5000, 300, 'rock', '', ''], ['near-rock', 'planet', 'Near Rock', 5000, 5000, 300, 'rock', '', '']], `starType: G\nstarX: ${MAX}\nstarY: ${MAX / 2}\n`)], KNOWN);
  check('a system 1,000,000 units wide, a body at its far corner and its star at the edge are valid', ok.errors.length === 0 && ok.entries.length === 1 && ok.entries[0].data.size === MAX, JSON.stringify(ok.errors).slice(0, 300));
  check('1,000,001 is refused for the size, and the message says the limit', errs(sysFile(MAX + 1, [])).some(m => /^size/.test(m) && /1000000/.test(m)), errs(sysFile(MAX + 1, [])).join(' | '));
  check('a body past the limit is refused', errs(sysFile(MAX, [['far-rock', 'planet', 'Far Rock', MAX + 1, 100, 300, 'rock', '', '']])).length > 0);
  check('a ring (orbit) of 500,000 units is valid and one past the limit is not', errs(sysFile(MAX, [['ring-rock', 'planet', 'Ring Rock', '', '', 300, 'rock', 500000, 90]], `starType: G\nstarX: 500000\nstarY: 500000\n`)).length === 0 && errs(sysFile(MAX, [['ring-rock', 'planet', 'Ring Rock', '', '', 300, 'rock', MAX + 1, 90]], `starType: G\nstarX: 500000\nstarY: 500000\n`)).length > 0, errs(sysFile(MAX, [['ring-rock', 'planet', 'Ring Rock', '', '', 300, 'rock', 500000, 90]], `starType: G\nstarX: 500000\nstarY: 500000\n`)).join(' | '));
  const src = readFileSync(new URL('../src/content.js', import.meta.url), 'utf8');
  check('the limit is one number in src/content.js (SYS_MAX), not written five times', /const SYS_MAX = 1000000;/.test(src) && !/200000/.test(src) && (src.match(/SYS_MAX/g) || []).length >= 8);
  check('the eight shipped systems are as wide as they were (36,000 or 48,000 units, times 3)', J(`Object.keys(SYSTEMS).filter(id => SYSTEMS[id].size !== sysAt(36000) && SYSTEMS[id].size !== sysAt(48000))`).length === 0, J(`Object.keys(SYSTEMS).map(id => id + ':' + SYSTEMS[id].size)`).join(' '));
}

console.log('2. the time a cruise takes');
{
  // the sum as it was until this card, with its 1000 steps: every leg it could count must still give its number
  g.run(`function __etaWas(dist) { const d = Math.max(0, dist - CRUISE.stop), h = 0.05; let t = 0.4, v = 0, x = 0; for (let i = 0; i < 1000 && x < d - 50; i++) { const lim = Math.min(CRUISE.top, CRUISE.brake * Math.max(0, d - x)); v = v > lim ? lim : Math.min(lim, v + CRUISE.accel * h); x += v * h; t += h; } return t; }
    function __etaFine(dist) { const d = Math.max(0, dist - CRUISE.stop), h = 0.005; let t = 0.4, v = 0, x = 0; for (let i = 0; i < 5e6 && x < d - 50; i++) { const lim = Math.min(CRUISE.top, CRUISE.brake * Math.max(0, d - x)); v = v > lim ? lim : Math.min(lim, v + CRUISE.accel * h); x += v * h; t += h; } return t; }`);
  const short = [0, 900, 2100, 3000, 9000, 27000, 90000, 150000, 250000, 380000];
  const same = J(`${JSON.stringify(short)}.map(d => [d, cruiseEta(d), __etaWas(d)])`).filter(([, a, b]) => a !== b);
  check('every leg up to 380,000 px (longer than any in a shipped system) takes exactly what it took', same.length === 0, JSON.stringify(same));
  check('the old sum stopped at 50 s: 400,000 px and 3,000,000 px read the same', Math.abs(J(`__etaWas(400000)`) - J(`__etaWas(3000000)`)) < 0.01 && J(`__etaWas(3000000)`) < 51);
  const long = [400000, 600000, 941559, 1500000, 3000000, 4242640];
  const off = J(`${JSON.stringify(long)}.map(d => [d, cruiseEta(d), __etaFine(d)])`).filter(([, a, b]) => Math.abs(a - b) > Math.max(0.5, b * 0.005));
  check('a longer leg agrees with a fine-stepped sum to half a second or half a percent: up to corner to corner of the widest system', off.length === 0, JSON.stringify(off));
  check('Earth to Neptune in the Sol pack (941,559 px) is two minutes; edge to edge of the widest system a little over six', Math.abs(J(`cruiseEta(941559)`) - 120) < 3 && J(`cruiseEta(3000000)`) > 370 && J(`cruiseEta(3000000)`) < 385, J(`cruiseEta(941559)`) + ' ' + J(`cruiseEta(3000000)`));
  check('it grows with the distance, all the way', J(`(() => { let last = 0, ok = true; for (let d = 0; d <= 4300000; d += 37000) { const t = cruiseEta(d); if (t < last) ok = false; last = t; } return ok; })()`));
  check('the sum is quick however long the leg: 3,000,000 px costs about as many steps as 300,000', J(`(() => { const t0 = Date.now(); for (let i = 0; i < 200; i++) cruiseEta(3000000); return Date.now() - t0; })()`) < 400);
  check('the readout says seconds up to 99 and minutes from 100 s on', J(`[0, 26, 99, 100, 118, 372].map(cruiseEtaText)`).join('|') === '0 s|26 s|99 s|1:40|1:58|6:12' && J(`cruiseEtaText(-3)`) === '0 s');
}

console.log('3. the Tab map');
{
  const WS = 3000000;
  const views = [9000, 27000, 60000, 90000, 90001, 150000, 400000, 941559, 2000000, 2999999];
  const cells = J(`${JSON.stringify(views)}.map(v => [v, mapGridStep(v, ${WS}), v / mapGridStep(v, ${WS})])`);
  check('a local view of any width has between 3 and 9 grid cells across, on a round number', cells.every(([, step, across]) => across >= 3 && across <= 9.0001 && /^(1|2|25|5)0*$/.test(String(step))), JSON.stringify(cells));
  check('the whole system is cut in eight, as it was', J(`mapGridStep(${WS}, ${WS})`) === WS / 8 && J(`mapGridStep(108000, 108000)`) === 13500);
  const was = v => [500, 1000, 2000, 2500, 5000, 10000].find(x => x >= v / 9);
  check('a view the old list covered gets the step it got', [9000, 12000, 18000, 27000, 45000, 90000].every(v => J(`mapGridStep(${v}, 108000)`) === was(v)));
  check('the old list ran out at 90,000 px: wider local views fell back to an eighth of the system', was(90001) === undefined);
  const view = J(`mapView([{ x: 1500000, y: 1500000 }, { x: 1700000, y: 1400000 }], ${WS}, false)`), whole = J(`mapView([{ x: 100, y: 100 }, { x: 2900000, y: 2900000 }], ${WS}, false)`);
  check('the local view of two places 224,000 px apart in a 3,000,000 px system holds both and is not the whole system', view.size < WS && view.x <= 1500000 && view.x + view.size >= 1700000 && view.y <= 1400000 && view.y + view.size >= 1500000, JSON.stringify(view));
  check('two places at opposite corners: the whole system', whole.size === WS && whole.x === 0 && whole.y === 0);
}

console.log('4. interdiction on a long leg');
{
  const whole = (danger, legSec) => J(`(() => { const dt = 1000 / 60, p = cruiseInterdictChance(${danger}, dt, ${legSec}); return 1 - Math.pow(1 - p, Math.round(${legSec} * 60)); })()`);
  check('a second of cruise with no leg given rolls what it rolled (0.004 x danger)', Math.abs(J(`cruiseInterdictChance(3, 1000)`) - 0.012) < 1e-12 && Math.abs(J(`cruiseInterdictChance(1, 1000, 5)`) - 0.004) < 1e-12);
  const ref = whole(1, J('INTERDICT.leg')), two = whole(1, 120), six = whole(1, 377);
  check('the longest shipped leg (13.5 s) at danger 1 is cut about 1 time in 20', ref > 0.04 && ref < 0.07, String(ref));
  check('a two minute leg, and a six minute one, are cut no more often than that (they were 4 in 10 and 8 in 10)', Math.abs(two - ref) < 0.005 && Math.abs(six - ref) < 0.005 && 1 - Math.pow(1 - 0.004 / 60, 120 * 60) > 0.35, [ref, two, six].join(' '));
  check('danger still counts on a long leg: danger 5 is about five times danger 1', whole(5, 120) > 4 * two && whole(5, 120) < 5.2 * two);
}

console.log('5. a system as wide as the limit, in the game');
{
  const text = readFileSync(new URL('../content.generated.js', import.meta.url), 'utf8');
  const made = C.loadAll([sysFile(MAX, [['wide-dock', 'station', '', 480000, 500000, '', '', '', ''], ['far-rock', 'planet', 'Far Rock', 990000, 980000, 300, 'rock', '', ''], ['near-rock', 'planet', 'Near Rock', 10000, 15000, 300, 'rock', '', '']], `starType: G\nstarX: 500000\nstarY: 500000\n`),
    { path: 'content/stations/wide-dock.md', text: '---\ntype: station\nname: Wide Dock\nsystem: wide\nfuel: 6\n---\nA dock in a wide system.\n' }], KNOWN);
  check('the files of a wide system are valid', made.errors.length === 0 && made.entries.length === 2, JSON.stringify(made.errors).slice(0, 400));
  const g2 = nodeGame({ replace: { 'content.generated.js': text.replace('  entries: [\n', '  entries: [\n' + made.entries.map(e => '  ' + JSON.stringify(e)).join(',\n') + ',\n') } });
  const w = Jin(g2, `(() => { const s = SYSTEMS.wide; if (!s) return null; const far = s.bodies.find(b => b.id === 'far-rock'), near = s.bodies.find(b => b.id === 'near-rock'); return { size: s.size, far: [far.x, far.y], near: [near.x, near.y], leg: Math.hypot(far.x - near.x, far.y - near.y) }; })()`);
  check('it is in the game 3,000,000 px wide, its bodies where the file says times 3', !!w && w.size === 3000000 && w.far.join() === '2970000,2940000' && w.near.join() === '30000,45000', JSON.stringify(w));
  check('corner to corner is a cruise of about eight and a half minutes, and the time sum says so', !!w && Math.abs(Jin(g2, `cruiseEta(${w ? w.leg : 0})`) - (w.leg / 8000 + 2.3)) < 3, w ? String(Jin(g2, `cruiseEta(${w.leg})`)) : '');
  check('the shipped systems in that game are untouched', Jin(g2, `SYSTEMS.halcyon.size`) === J(`SYSTEMS.halcyon.size`) && g2.errors.length === 0, g2.errors.join(' | '));
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nBIG SYSTEMS FAIL (${failed} of ${n})` : `\nBIG SYSTEMS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
