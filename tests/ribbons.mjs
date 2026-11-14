// The ship ribbon's bounds (card space-game-bug-ribbon-zero-length-quad; src/ships.js shipsOne, SHIPS.ribMaxW, ribJump, shipsGuard).
// Run: node tests/ribbons.mjs
// Playtest 2 saw a tan rectangle 200 x 180 px ending at the player's nozzle and, once, a full-height bar through the ship: each one stroke
// of the ships layer with a width or length far outside the normal (under 12 px wide, under 100 px a frame). The cause was not found, so
// shipsOne now refuses anything outside the bounds and says so once in the console. This test feeds it the states that could produce such
// a stroke (a teleport, a clock that ran backwards, a huge scale, a NaN position, a runaway thrust) and reads back what it asked the
// Graphics to draw: no line wider than 24 px, no segment longer than 60 px, no alpha over 0.55, no NaN; and normal flight, a hard stop
// and a cruise-speed frame must draw exactly what they drew before and must not trip the guard.
import { launch, sleep } from './cdp.mjs';

let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active'); await sleep(1000);
  await t.ev(`(() => {
    window.__warns = []; const ow = console.warn; console.warn = (...a) => { window.__warns.push(a.join(' ')); };
    const C = { ARC: 0, BEGIN_PATH: 1, CLOSE_PATH: 2, FILL_RECT: 3, LINE_TO: 4, MOVE_TO: 5, LINE_STYLE: 6, FILL_STYLE: 7, FILL_PATH: 8, STROKE_PATH: 9, FILL_TRIANGLE: 10 }, s = game.scene.getScene('Space'); // Phaser 3.80.1's Graphics command codes (not exported), the ones shipsOne and shipsFlame use
    // what the commands drawn into g amount to: the widest line, the longest segment, the highest line alpha, anything not finite
    window.__read = g => {
      const b = g.commandBuffer; let maxW = 0, maxA = 0, maxSeg = 0, nan = 0, lines = 0, px = null, py = null;
      for (let i = 0; i < b.length; i++) {
        const c = b[i];
        if (c === C.LINE_STYLE) { maxW = Math.max(maxW, b[i + 1]); maxA = Math.max(maxA, b[i + 3]); if (![b[i + 1], b[i + 3]].every(isFinite)) nan++; i += 3; }
        else if (c === C.MOVE_TO) { px = b[i + 1]; py = b[i + 2]; if (![px, py].every(isFinite)) nan++; i += 2; }
        else if (c === C.LINE_TO) { const x = b[i + 1], y = b[i + 2]; if (![x, y].every(isFinite)) nan++; else if (px !== null) { maxSeg = Math.max(maxSeg, Math.hypot(x - px, y - py)); lines++; } px = x; py = y; i += 2; }
        else if (c === C.FILL_STYLE) { i += 2; } else if (c === C.FILL_TRIANGLE) { for (let k = 1; k <= 6; k++) if (!isFinite(b[i + k])) nan++; i += 6; }
        else if (c === C.ARC) { for (let k = 1; k <= 7; k++) if (typeof b[i + k] === 'number' && !isFinite(b[i + k])) nan++; i += 7; }
      }
      return { maxW: +maxW.toFixed(2), maxA: +maxA.toFixed(2), maxSeg: Math.round(maxSeg), nan, lines };
    };
    // a fresh ship-like object and Graphics; frames(list of [x, y, time, th]) calls shipsOne for each and returns what was drawn over the last N frames
    window.__run = (frames, opts = {}) => {
      if (!SHIPS.guard) SHIPS.guard = { n: 0, last: null, seen: {} }; // (absent in a build without the guard: the geometry checks below are what fail then)
      SHIPS.guard.n = 0; SHIPS.guard.last = null; SHIPS.guard.seen = {}; window.__warns.length = 0;
      const g = s.add.graphics(), o = { x: 0, y: 0, rotation: 0, scaleX: opts.scale || 1, body: { speed: opts.speed === undefined ? 300 : opts.speed }, flashUntil: 0 };
      let worst = { maxW: 0, maxA: 0, maxSeg: 0, nan: 0, lines: 0 }, threw = null;
      frames.forEach(([x, y, time, th]) => {
        g.clear(); o.x = x; o.y = y;
        try { shipsOne(s, g, o, 'ship', th, 1, time, 16.67, AMBER, 1); } catch (e) { threw = e.message; }
        const r = __read(g); worst = { maxW: Math.max(worst.maxW, r.maxW), maxA: Math.max(worst.maxA, r.maxA), maxSeg: Math.max(worst.maxSeg, r.maxSeg), nan: worst.nan + r.nan, lines: Math.max(worst.lines, r.lines) };
      });
      g.destroy();
      return JSON.stringify({ ...worst, threw, guard: SHIPS.guard.n, kinds: Object.keys(SHIPS.guard.seen).join(','), warns: window.__warns.length });
    };
    return 1; })()`);
  const run = async (name, framesJs, opts = '{}') => { const r = JSON.parse(await t.ev(`__run(${framesJs}, ${opts})`)); return r; };
  const flight = (n, step, t0 = 1000) => `Array.from({ length: ${n} }, (_, i) => [i * ${step}, 0, ${t0} + i * 16.67, 1])`;

  let r = await run('normal', flight(60, 8));
  check('normal flight: ribbons drawn, under 12 px wide, segments about 8 px, alpha at most 0.55, nothing refused', r.lines >= 10 && r.maxW <= 12 && r.maxSeg <= 12 && r.maxA <= 0.55 && r.guard === 0 && r.nan === 0 && !r.threw, JSON.stringify(r));
  r = await run('hardstop', `[...Array.from({ length: 30 }, (_, i) => [i * 8, 0, 1000 + i * 16.67, 1]), ...Array.from({ length: 40 }, (_, i) => [232, 0, 1500 + i * 16.67, 0])]`, '{ speed: 0 }');
  check('a hard stop (the player held still after thrust) draws nothing odd and refuses nothing', r.maxW <= 12 && r.maxSeg <= 12 && r.guard === 0 && !r.threw, JSON.stringify(r));
  r = await run('cruise', `Array.from({ length: 40 }, (_, i) => [i * 100, 0, 1000 + i * 16.67, 0])`, '{ speed: 6000 }');
  check('cruise speed (100 px a frame) is flight, not a teleport: nothing refused', r.guard === 0 && r.maxSeg <= 110 && !r.threw, JSON.stringify(r));
  r = await run('hitch', `[...Array.from({ length: 10 }, (_, i) => [i * 100, 0, 1000 + i * 16.67, 0]), [1260, 0, 1000 + 9 * 16.67 + 60, 0], [1360, 0, 1000 + 9 * 16.67 + 76.67, 0]]`, '{ speed: 6000 }');
  check('a 60 ms hitch at 6000 px/s (a 360 px step) is still flight', r.guard === 0 && !r.threw, JSON.stringify(r));

  r = await run('teleport', `[...Array.from({ length: 30 }, (_, i) => [i * 8, 0, 1000 + i * 16.67, 1]), ...Array.from({ length: 20 }, (_, i) => [5000 + i * 8, 4000, 1500 + i * 16.67, 1])]`);
  check('a 5000 px teleport draws no bar across the gap: no segment over 60 px, the ribbon starts again', r.maxSeg <= 60 && r.guard >= 1 && r.kinds.includes('jump') && !r.threw, JSON.stringify(r));
  check('and it says so once in the console', r.warns === 1);
  r = await run('teleport-small', `[...Array.from({ length: 30 }, (_, i) => [i * 8, 0, 1000 + i * 16.67, 1]), ...Array.from({ length: 20 }, (_, i) => [232 + 400 + i * 8, 0, 1500 + i * 16.67, 1])]`);
  check('a 400 px jump (a launch from the bay) is also not drawn across', r.maxSeg <= 60 && r.guard >= 1, JSON.stringify(r));
  r = await run('clock-back', `[...Array.from({ length: 30 }, (_, i) => [i * 8, 0, 5000 + i * 16.67, 1]), ...Array.from({ length: 30 }, (_, i) => [240 + i * 8, 0, 4000 + i * 16.67, 1])]`);
  check('a clock that runs backwards never draws a fade over 1: alpha at most 0.55, width under 12', r.maxA <= 0.55 && r.maxW <= 12 && r.guard >= 1 && r.kinds.includes('time') && !r.threw, JSON.stringify(r));
  r = await run('huge-scale', `Array.from({ length: 30 }, (_, i) => [i * 8, 0, 1000 + i * 16.67, 1])`, '{ scale: 40 }');
  check('a ship scaled 40 times draws ribbons no wider than 24 px and says so', r.maxW <= 24 && r.kinds.includes('width') && !r.threw, JSON.stringify(r));
  r = await run('runaway-thrust', `Array.from({ length: 30 }, (_, i) => [i * 8, 0, 1000 + i * 16.67, 400])`);
  check('a runaway thrust (400) is capped: ribbon width under 24 px', r.maxW <= 24 && !r.threw, JSON.stringify(r));
  r = await run('nan-position', `[...Array.from({ length: 10 }, (_, i) => [i * 8, 0, 1000 + i * 16.67, 1]), [NaN, 0, 1200, 1], [Infinity, 5, 1220, 1], [100, 0, 1240, NaN]]`);
  check('a NaN or infinite position and a NaN thrust draw nothing non-finite and do not throw', r.nan === 0 && !r.threw && r.kinds.includes('position'), JSON.stringify(r));
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `\nRIBBONS FAIL (${bad})` : '\nRIBBONS PASS');
process.exitCode = bad ? 1 : 0;
