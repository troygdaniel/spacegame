// smoke: the dock prompt in a system with no station: a ship at the stand-in station gets no prompt and no error; a real station still prompts
// Playtest 3, bug 3 (docs/PLAYTEST3.md, card space-game-no-station-guard). A system with no station has a stand-in at (-60000, -60000)
// (spaceNowhere in src/space.js). The world bounds keep a real ship far from it, but a ship that does get within 320 px made the dock prompt
// read sysBody('station').name on null, every frame, and the Space scene froze.
//   This runs the dock / land lines of Space.update themselves, cut out of src/space.js by their first and last line, in a plain Node context
//   with the handful of names they use: no browser, no Phaser, no scene. If those lines are moved or renamed the cut fails loudly.
// Run: node tests/nostation.mjs   (exit code 1 on a failed check; no Chrome)
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'src/space.js'), 'utf8');

let failed = 0;
const check = (name, ok, got) => { if (!ok) failed++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok || got === undefined ? '' : '   got: ' + JSON.stringify(got))); };

// the lines under test: from the "// dock / land" comment to the line that shows the prompt
const from = src.indexOf('    // dock / land\n'), to = src.indexOf('this.prompt.setText(msg);', from);
check('the dock / land lines are where the test looks for them in src/space.js', from > 0 && to > from);
if (failed) process.exit(1);
const lines = src.slice(from, to + 'this.prompt.setText(msg);'.length);
const stand = vm.runInNewContext('(' + src.match(/const spaceNowhere = (\(\) => \(\{[^\n]*\}\));/)[1] + ')()');
check('the stand-in station is far outside the world and marked nowhere', stand.x === -60000 && stand.y === -60000 && stand.nowhere === true, stand);

// one frame of those lines. bodies: what sysBody answers for this system; pressL: L went down this frame
function frame({ station, planet, bodies, ship, canLand = false, pressL = false }) {
  const calls = [];
  const scene = { station, planet, canLand, planetR: 200, prompt: { text: null, setText(t) { this.text = t; } } };
  const box = {
    Phaser: { Math: { Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } },
    sysBody: type => bodies[type] || null,
    JD: () => pressL, k: { L: {} }, G: { lastDock: 'before' },
    missionLeaveSpace: () => calls.push('leave'), sfx: n => calls.push('sfx:' + n), fleetSync: () => calls.push('fleet'),
    feelDescend: (s, at) => calls.push('descend:' + (at === station ? 'station' : 'planet')), go: () => {},
    ship,
  };
  let error = null;
  try { vm.runInNewContext('(function () {\n' + lines + '\n}).call(scene)', { ...box, scene }); } catch (e) { error = String(e && e.message || e); }
  return { error, text: scene.prompt.text, calls, lastDock: box.G.lastDock };
}
const at = (o, dx = 0, speed = 0) => ({ x: o.x + dx, y: o.y, body: { speed } });
const planet = { x: 4000, y: 4000 }, noStation = { planet: { id: 'p', name: 'Rock' } };

// 1. no station: the ship sits on the stand-in, slow, fast, and pressing L
let r = frame({ station: stand, planet, bodies: noStation, ship: at(stand) });
check('no station, ship on the stand-in, slow: no error', r.error === null, r.error);
check('no station, ship on the stand-in, slow: no prompt', r.text === '', r.text);
r = frame({ station: stand, planet, bodies: noStation, ship: at(stand, 300, 400) });
check('no station, ship 300 px from the stand-in, fast: no error and no "too fast to dock"', r.error === null && r.text === '', r);
r = frame({ station: stand, planet, bodies: noStation, ship: at(stand), pressL: true });
check('no station, L pressed on the stand-in: no error, no dock, last dock unchanged', r.error === null && r.calls.length === 0 && r.lastDock === 'before', r);

// 2. a real station is as it was
const station = { x: 1000, y: 1000 }, withStation = { station: { id: 'halcyon', name: 'Halcyon' }, planet: { id: 'p', name: 'Rock' } };
r = frame({ station, planet, bodies: withStation, ship: at(station, 100, 50) });
check('a real station, slow and near: "L  Dock at Halcyon"', r.error === null && r.text === 'L  Dock at Halcyon', r);
r = frame({ station, planet, bodies: withStation, ship: at(station, 100, 400) });
check('a real station, fast and near: told to brake', r.error === null && r.text === 'Too fast to dock. Hold S to brake', r);
r = frame({ station, planet, bodies: withStation, ship: at(station, 100, 50), pressL: true });
check('a real station, L pressed: docks there and it becomes the last dock', r.error === null && r.lastDock === 'halcyon' && r.calls.includes('descend:station'), r);
r = frame({ station, planet, bodies: withStation, ship: at(station, 900, 50) });
check('a real station, 900 px away: no prompt', r.error === null && r.text === '', r);

// 3. landing in a system with no station still works (the planet lines sit behind the station lines)
r = frame({ station: stand, planet, bodies: noStation, ship: at(planet, 250, 50), canLand: true });
check('no station, near the planet: "L  Land on Rock"', r.error === null && r.text === 'L  Land on Rock', r);

console.log(failed ? '\nNO-STATION FAIL: ' + failed + ' check(s)' : '\nNO-STATION PASS');
process.exit(failed ? 1 : 0);
