// smoke: system distances: every system is spread out SYSTEM_SCALE (3) times from the data, bodies keep their size, cruise tops out at 8000 px/s so the longest trip takes about twice as long
// System distances (card space-game-system-distances). Plain Node (tests/nodegame.mjs), no browser.
//   The scale: SYSTEM_SCALE is 3; every authored system, a system read from the files and a generated one have their size, star and body positions
//     multiplied by it once (never twice), and nothing else: a planet's or belt's radius, a gate's ring and a label's offset are the file's.
//   The shape: Halcyon's old cluster keeps its proportions (the station to Kepler-4b is three times as far, in the same direction).
//   Travel: CRUISE.top is 8000; the longest leg of the old 36000 px world (30000 px) took about 6.5 s, the same leg spread out takes about 13.5 s:
//     twice as long, not three times. The near-body rules (the 2500 px mass lock, the 900 px stop) are as they were.
// Run: node tests/distances.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`)); // a value out of the game, by value
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };

console.log('the scale');
const SC = J('SYSTEM_SCALE');
check('SYSTEM_SCALE is 3, and sysAt multiplies by it', SC === 3 && J('sysAt(4000)') === 12000 && J('sysAt(36000)') === 108000);
check('every system is 36000 px in the data: 108000 in the game', J('Object.values(SYSTEMS).every(s => s.size === sysAt(36000))'), JSON.stringify(J('Object.values(SYSTEMS).map(s => s.size)')));
check('scaling a row twice changes nothing', J(`(() => { const a = JSON.stringify(SYSTEMS.halcyon); sysScale(SYSTEMS.halcyon); sysScale(SYSTEMS.halcyon); return JSON.stringify(SYSTEMS.halcyon) === a; })()`));
check('the mark that a row is scaled is not a field of the row', J('!Object.keys(SYSTEMS.halcyon).includes("scaled") && SYSTEMS.halcyon.scaled === 3 && !JSON.stringify(SYSTEMS.halcyon).includes("scaled")'));

console.log('the files: where things are is the file times the scale; how big they are is the file');
{
  const cell = (row, i) => (row[i] || '').trim(), dir = join(ROOT, 'content', 'systems');
  let rows = 0; const bad = [];
  for (const f of readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const id = f.replace(/\.md$/, ''), text = readFileSync(join(dir, f), 'utf8'), lines = text.split('\n');
    const size = Number((/^size: (\d+)/m.exec(text) || [])[1]), sx = /^starX: (\d+)/m.exec(text), sy = /^starY: (\d+)/m.exec(text);
    const sys = J(`SYSTEMS['${id}']`);
    if (!sys) { bad.push(id + ' is not in SYSTEMS'); continue; }
    if (sys.size !== size * SC) bad.push(id + '.size');
    if (sys.star && sx && (sys.star.x !== sx[1] * SC || sys.star.y !== sy[1] * SC)) bad.push(id + '.star');
    const at = lines.findIndex(l => /^## Bodies/.test(l)), head = lines[at + 1].split('|').slice(1, -1).map(s => s.trim());
    const col = k => head.indexOf(k);
    for (let i = at + 3; i < lines.length && lines[i].startsWith('|'); i++) {
      const row = lines[i].split('|').slice(1, -1), b = sys.bodies.find(b => b.id === cell(row, col('id')));
      rows++;
      if (!b) { bad.push(id + '.' + cell(row, col('id')) + ' missing'); continue; }
      if (b.x !== Number(cell(row, col('x'))) * SC || b.y !== Number(cell(row, col('y'))) * SC) bad.push(b.id + ' position');
      if (cell(row, col('r')) && b.r !== Number(cell(row, col('r')))) bad.push(b.id + '.r');
      if (cell(row, col('labelDy')) && b.labelDy !== Number(cell(row, col('labelDy')))) bad.push(b.id + '.labelDy');
    }
  }
  check(`all ${rows} body rows of content/systems: x and y times 3, r and labelDy as written`, rows >= 40 && bad.length === 0, bad.slice(0, 6).join(' | '));
  check('a system read from the files alone is spread out the same', J(`(() => { const w = worldFromFiles('kestrel'), c = SYSTEMS.kestrel; return w.size === c.size && w.star.x === c.star.x && w.bodies.every((b, i) => b.x === c.bodies[i].x && b.y === c.bodies[i].y); })()`));
  check('a generated system too: 108000 px, laid out in the old units and spread out', J(`(() => { const s = makeSystem(7, 'trade'); return s.size === sysAt(36000) && s.scaled === 3 && s.bodies.length > 0 && s.bodies.every(b => b.x > sysAt(1500) && b.x < s.size - sysAt(1500)); })()`));
}

console.log('the shape of Halcyon');
{
  const st = J(`sysBody('station', 'halcyon')`), pl = J(`sysBody('planet', 'halcyon')`), gate = J(`sysBody('gate', 'halcyon')`);
  const d = Math.hypot(pl.x - st.x, pl.y - st.y), old = Math.hypot(6200 - 4000, 2000 - 4000);
  check(`the station to Kepler-4b is ${Math.round(d)} px, three times the old ${Math.round(old)}, in the same direction`, Math.abs(d - old * 3) < 1 && Math.abs(Math.atan2(pl.y - st.y, pl.x - st.x) - Math.atan2(2000 - 4000, 6200 - 4000)) < 1e-9);
  check('Kepler-4b is as big as it was (316 px) and the gate ring too (110 px)', pl.r === 316 && gate.r === 110);
  check('a body in the far space is still inside the world, clear of the wall', J(`sysBodies(null, 'halcyon').every(b => b.x > 1500 && b.y > 1500 && b.x < SYSTEMS.halcyon.size - 1500 && b.y < SYSTEMS.halcyon.size - 1500)`));
}

console.log('travel');
{
  const C = J('CRUISE'), long = J('cruiseEta(sysAt(30000))'), was = 6.5;
  check('cruise tops out at 8000 px/s', C.top === 8000);
  check(`the longest leg (30000 px in the data, 90000 now) takes ${long.toFixed(1)} s: about twice the ${was} s it took, not three times`, long > was * 1.8 && long < was * 2.3, (long / was).toFixed(2) + ' times');
  check('a short hop of 3000 px still takes about 2 s', J('cruiseEta(3000)') > 1.2 && J('cruiseEta(3000)') < 3);
  check('near a body nothing moved: the mass lock is 2500 px, cruise stops 900 px out, a leg over 3500 px cruises', C.lockMass === 2500 && C.stop === 900 && J('AUTO.cruiseLeg') === 3500);
  const st = J(`sysBody('station', 'halcyon')`), pl = J(`sysBody('planet', 'halcyon')`), hop = Math.hypot(pl.x - st.x, pl.y - st.y);
  check(`the station to Kepler-4b (${Math.round(hop)} px) is now a leg cruise takes: about ${J(`cruiseEta(${hop})`).toFixed(1)} s`, hop > C.stop + C.minLeg && hop > J('AUTO.cruiseLeg') && J(`cruiseEta(${hop})`) < 5);
  check('the ribbon of a ship at cruise speed is not mistaken for a jump on a slow frame (9500 px/s allowed)', /9500 \* Math\.max\(0, time - last\.t\) \/ 1000/.test(readFileSync(join(ROOT, 'src/ships.js'), 'utf8')));
}
check('the game was quiet', g.errors.length === 0, g.errors.slice(0, 2).join(' | '));

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
