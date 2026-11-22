// smoke: the flight feel (src/handling.js): Classic keeps the shipped numbers and is the default, Heavy builds its turn and thrust and drifts longer, the choice is kept in the browser, space.js and Settings read it
// The flight feel (card space-game-ship-weight). Plain Node, no browser, so it does not care how busy the Mac is: src/handling.js runs in a vm
// with a stand-in localStorage, and the files that read it are checked as text.
//   Classic: the default (also for an unknown or unreadable stored value); full turn and thrust on the first frame; drag 0.55, brake 0.12.
//   Heavy: the turn builds over turnUp and eases off over turnDown, never jumps, and a reversed stick passes through zero; the thrust ramps over
//     thrustUp; every hull of src/data_ships.js takes at least twice as long to reach its top speed and coasts at least twice as long.
//   Wiring: handling.js loads before space.js; space.js reads handlingTurn, handlingDrag and handlingThrust; Settings has the Flight section.
// Run: node tests/handling.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(ROOT, f), 'utf8');
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };

// a fresh copy of the file over a given store ({} is an empty browser; null is a browser that refuses storage)
function load(store) {
  const localStorage = store ? { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }
    : { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const ctx = vm.createContext({ localStorage });
  vm.runInContext(read('src/handling.js') + '\n;this.H = { HANDLING, HANDLING_STORE, handlingSet, handlingNow, handlingLoad, handlingTurn, handlingThrust, handlingDrag, handlingTimeTo, handlingCoast };', ctx);
  return ctx.H;
}
const DT = 1000 / 60, near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;
const frames = ms => Math.round(ms / DT);

console.log('the choice');
{
  const store = {}, h = load(store);
  check('Classic is the default', h.handlingNow().id === 'classic');
  check('two feels: classic and heavy', Object.keys(h.HANDLING).join() === 'classic,heavy');
  check('Heavy is kept in the browser', h.handlingSet('heavy') === 'heavy' && store[h.HANDLING_STORE] === 'heavy' && load(store).handlingNow().id === 'heavy');
  check('an unknown name falls back to Classic', h.handlingSet('floaty') === 'classic' && load({ [h.HANDLING_STORE]: 'floaty' }).handlingNow().id === 'classic');
  const no = load(null);
  check('a browser that refuses storage still flies Classic and can switch', no.handlingNow().id === 'classic' && no.handlingSet('heavy') === 'heavy' && no.handlingNow().id === 'heavy');
}

console.log('classic: the numbers the game shipped with');
{
  const h = load({}), st = {};
  check('full turn on the first frame, both ways, none with no key', h.handlingTurn(st, 1, DT) === 1 && h.handlingTurn(st, -1, DT) === -1 && h.handlingTurn(st, 0, DT) === 0);
  check('full thrust on the first frame', h.handlingThrust(st, true, DT) === 1);
  check('drag 0.55, brake 0.12', h.handlingDrag(false) === 0.55 && h.handlingDrag(true) === 0.12);
}

console.log('heavy: the turn');
{
  const h = load({}), st = {}, H = h.HANDLING.heavy; h.handlingSet('heavy');
  const up = []; for (let i = 0; i < frames(H.turnUp) + 2; i++) up.push(h.handlingTurn(st, 1, DT));
  check('the first frame is a nudge, not the full rate', up[0] > 0 && up[0] < 0.05, up[0].toFixed(4));
  check('it only ever grows while the key is held', up.every((v, i) => i === 0 || v >= up[i - 1]));
  check('no frame jumps by more than a tenth of the full rate', up.every((v, i) => i === 0 || v - up[i - 1] < 0.1));
  check('after turnUp it is at the Heavy rate, 0.85 of the hull\'s', near(up[up.length - 1], H.turn) && H.turn === 0.85, String(up[up.length - 1]));
  const half = up[frames(H.turnUp / 2) - 1];
  check('half way through it is about half way', half > 0.3 * H.turn && half < 0.7 * H.turn, half.toFixed(3));
  const down = []; for (let i = 0; i < frames(H.turnDown) + 2; i++) down.push(h.handlingTurn(st, 0, DT));
  check('let go: the ship keeps turning for a moment', down[0] > 0.6 * H.turn, down[0].toFixed(3));
  check('and eases off to nothing within turnDown', down.every((v, i) => i === 0 || v <= down[i - 1]) && down[down.length - 1] === 0);
  for (let i = 0; i < 60; i++) h.handlingTurn(st, 1, DT);
  const rev = []; for (let i = 0; i < frames(H.turnDown + H.turnUp) + 2; i++) rev.push(h.handlingTurn(st, -1, DT));
  check('a reversed stick first sheds the old turn, then builds the new one', rev[0] > 0 && rev.some(v => v === 0) && near(rev[rev.length - 1], -H.turn) && rev.every((v, i) => i === 0 || v <= rev[i - 1]));
  const l = {}, r = {}; let sym = true; for (let i = 0; i < 40; i++) if (!near(h.handlingTurn(l, -1, DT), -h.handlingTurn(r, 1, DT))) sym = false;
  check('left and right are mirror images', sym);
}

console.log('heavy: the thrust and the drift');
{
  const h = load({}), st = {}, H = h.HANDLING.heavy; h.handlingSet('heavy');
  const up = []; for (let i = 0; i < frames(H.thrustUp) + 2; i++) up.push(h.handlingThrust(st, true, DT));
  check('the first frame of thrust is a whisper', up[0] > 0 && up[0] < 0.01, up[0].toFixed(5));
  check('it ramps without a step back', up.every((v, i) => i === 0 || v >= up[i - 1]));
  check('after thrustUp it is at the Heavy share, half the hull\'s thrust', near(up[up.length - 1], H.accel) && H.accel === 0.5);
  check('key up: no thrust', h.handlingThrust(st, false, DT) === 0);
  for (let i = 0; i < frames(H.thrustDown) + 2; i++) h.handlingThrust(st, false, DT);
  check('after a pause the ramp starts again from nothing', h.handlingThrust(st, true, DT) < 0.01);
  check('a tap on and off keeps most of the ramp', (() => { const s = {}; for (let i = 0; i < 60; i++) h.handlingThrust(s, true, DT); const a = h.handlingThrust(s, true, DT); h.handlingThrust(s, false, DT); return h.handlingThrust(s, true, DT) > a * 0.8; })());
  check('it keeps more of its speed each second (0.78 against 0.55) and brakes softer (0.3 against 0.12)', h.handlingDrag(false) === 0.78 && h.handlingDrag(true) === 0.3);
}

console.log('every hull: Heavy takes its time');
{
  const h = load({}), C = h.HANDLING.classic, V = h.HANDLING.heavy;
  const ctx = vm.createContext({}); vm.runInContext(read('src/data_ships.js') + '\n;this.S = SHIP_MODELS;', ctx);
  const ships = Object.values(ctx.S);
  check('six hulls in the table', ships.length === 6, String(ships.length));
  for (const s of ships) {
    const c = h.handlingTimeTo(C, s.accel, s.speed), v = h.handlingTimeTo(V, s.accel, s.speed);
    check(`${s.id}: top speed in ${c.toFixed(2)} s Classic, ${v.toFixed(2)} s Heavy (at least twice, under 4 s)`, v >= 2 * c && v < 4);
    const boost = h.handlingTimeTo(V, s.accel * 25 / 12, s.boost);
    check(`${s.id}: the boost still reaches its ${s.boost} px/s (${boost.toFixed(2)} s)`, boost < 5);
  }
  const wren = ctx.S.wren, cc = h.handlingCoast(C, wren.speed), cv = h.handlingCoast(V, wren.speed);
  check(`the Wren coasts ${cc.toFixed(1)} s Classic, ${cv.toFixed(1)} s Heavy (at least twice as long)`, cv >= 2 * cc);
}

console.log('wiring');
{
  const html = read('index.html'), space = read('src/space.js'), settings = read('src/settings.js');
  check('index.html loads handling.js before space.js and settings.js', html.indexOf('src/handling.js') > 0 && html.indexOf('src/handling.js') < html.indexOf('src/space.js') && html.indexOf('src/handling.js') < html.indexOf('src/settings.js'));
  check('space.js turns through handlingTurn at the base rate 0.0036', /handlingTurn\(this, \(right \? 1 : 0\) - \(left \? 1 : 0\), dt\) \* 0\.0036 \* shipStat\('turn'\) \* dt/.test(space));
  check('space.js takes its drag from handlingDrag', space.includes('setDrag(handlingDrag(brake && !locked))'));
  check('space.js scales its thrust by handlingThrust', space.includes('* handlingThrust(this, locked || up, dt)'));
  check('Settings has the Flight section, after Controls (the battle pace has no section any more: card space-game-two-hands-keys)', /\['controls', 'CONTROLS'\], \['flight', 'FLIGHT'\], \['content', 'CONTENT'\]/.test(settings) && settings.includes('draw_flight()'));
  check('the save does not carry the feel (it is a browser preference)', !read('src/meta.js').includes('handling'));
}

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
