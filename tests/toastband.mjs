// smoke: toasts stay in their band: one box, two lines at most, never over a readout, the mission box, the nav panel or the radar (plain Node, no Chrome)
// Card space-game-toasts-cover-readout (docs/FIRSTLOOK.md, 17 Nov 2026): two or three toasts at once stacked down from y 96 over the autopilot
// and cruise readout, the assist's line and the right half of the navigation panel's pinned destination. Now a toast is one box in a band of
// its own (TOAST in src/common.js) and the readouts sit under the band. This test is the geometry:
//   1. any message, and any pair of messages, gives a box inside the band: two lines at most, never wider than the band
//   2. the band does not intersect: the HUD strip above, the mission box and the nav panel's pinned line to the left, the radar column to the
//      right, the autopilot and cruise readout line and the assist's line below (their positions are read from the game's own tables and files)
//   3. toast() itself, on a stand-in scene: one box whatever comes, a quick second message shares it, a later one replaces it
// The type is monospace: 0.6 of its size wide. Run: node tests/toastband.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(join(ROOT, 'src', f), 'utf8');
const T = J('TOAST'), W = J('W'), H = J('H');

console.log('1. the box is always inside the band');
const MSGS = ['Docked.', 'You have the stick.', 'Target: Drifting survey rig. C cruises, P flies you there.', 'Too close to the mass: fly clear of Kepler-4b.',
  'Clearing Kepler-4b, then cruising to Drifting survey rig. Any key takes the stick back.', 'Keep at range: the gunship at 50 km. Any flight key takes the stick back.',
  'Fuel ranger called: 45 s out, 10 units for 240 cr.', 'The MULE is leaving the hangar. Stay inside her ring: she runs faster and takes half damage.',
  'x'.repeat(300), ('word ').repeat(80).trim(), 'A_very_long_single_word_' + 'z'.repeat(200), 'two\nlines', 'three\nlines\nhere', ''];
g.run(`var __MSGS = ${JSON.stringify(MSGS)};`);
{
  const boxes = J(`__MSGS.map(m => { const p = toastPlan(null, m, 0), b = toastBox(p); return { lines: p.lines.length, size: p.size, longest: Math.max(...p.lines.map(l => l.length)), b }; })`);
  const bad = boxes.map((x, i) => [x, i]).filter(([x]) => x.lines > 2 || x.b.top < T.top || x.b.bottom > T.bottom || x.b.w > T.w + 2 * T.pad || x.longest * 0.6 * x.size > T.w + 0.5);
  check(`${MSGS.length} messages, short to 300 characters: each is two lines at most, inside the band top to bottom and no wider than it`, bad.length === 0, bad.map(([x, i]) => i + ':' + JSON.stringify(x)).join(' '));
  const pairs = J(`(() => { const out = []; __MSGS.forEach(a => __MSGS.forEach(b => { const p = toastPlan({ msg: a, at: 0 }, b, 100), x = toastBox(p); out.push([p.lines.length, x.top, x.bottom, x.w, Math.max(...p.lines.map(l => l.length)) * 0.6 * p.size]); })); return out; })()`);
  const badPair = pairs.filter(([lines, top, bottom, w, tw]) => lines > 2 || top < T.top || bottom > T.bottom || w > T.w + 2 * T.pad || tw > T.w + 0.5);
  check(`${pairs.length} pairs of messages 100 ms apart: the same`, badPair.length === 0, JSON.stringify(badPair.slice(0, 3)));
  check('a long message is set smaller before it is cut, and only the longest is cut', J(`toastFit(__MSGS[4]).size`) < T.sizes[0] && J(`toastFit(__MSGS[4]).lines.join(' ')`) === MSGS[4] && /\.\.\.$/.test(J(`toastFit(__MSGS[8]).lines[1]`)));
  check('a short message keeps the full type on one line', J(`toastFit('Docked.')`).size === T.sizes[0] && J(`toastFit('Docked.').lines.length`) === 1);
}

console.log('2. the band meets nothing');
{
  const band = { x0: W / 2 - (T.w + 2 * T.pad) / 2, x1: W / 2 + (T.w + 2 * T.pad) / 2, y0: T.top, y1: T.bottom };
  const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const hud = src('hud.js'), nav = J('NAVPANEL'), frame = J('HUD_FRAME');
  // the zones the HUD itself keeps clear (src/hud.js pushes them into h.zones as literals): every one whose numbers can be read
  const zones = [...hud.matchAll(/h\.zones\.push\(\{ x0: ([\dW +\-.]+), y0: (\d+), x1: ([\dW +\-.]+), y1: (\d+) \}\)/g)].map(m => ({ x0: Function('W', 'return ' + m[1])(W), y0: +m[2], x1: Function('W', 'return ' + m[3])(W), y1: +m[4] }));
  check('the HUD\'s own zones were found (the strip, the compact mission line, the gauges, the radar column)', zones.length >= 4, JSON.stringify(zones));
  const struck = zones.filter(z => hit(band, z));
  check('the band is clear of every one of them', struck.length === 0, JSON.stringify(struck));
  check('the mission checklist box (HUD_FRAME) ends left of the band', frame.x + frame.w + 20 <= band.x0, `${frame.x + frame.w + 20} against ${band.x0}`);
  check('the navigation panel and its pinned destination end left of the band', nav.x + nav.w <= band.x0, `${nav.x + nav.w} against ${band.x0}`);
  // the readouts: a line of bold type with a 4 px stroke is its size + 8 px high, centred on its y
  const lineOf = (y, size) => ({ x0: 0, x1: W, y0: y - (size + 8) / 2, y1: y + (size + 8) / 2 });
  const ap = /ap\.read = s\.add\.text\(W \/ 2, ([\w.]+), '', \{[^}]*fontSize: '(\d+)px'/.exec(src('autopilot.js')), cr = /cr\.read = s\.add\.text\(W \/ 2, ([\w.]+), '', \{[^}]*fontSize: '(\d+)px'/.exec(src('cruise.js'));
  check('the autopilot and the cruise readout are both on TOAST.readY', !!ap && !!cr && ap[1] === 'TOAST.readY' && cr[1] === 'TOAST.readY', JSON.stringify([ap && ap[1], cr && cr[1]]));
  const apLine = lineOf(T.readY, ap ? +ap[2] : 20), as = /a\.read = s\.add\.text\(W \/ 2, ASSIST\.readY, '', \{[^}]*fontSize: '(\d+)px'/.exec(src('assist.js')), asLine = lineOf(J('ASSIST.readY'), as ? +as[1] : 16);
  check('that line is under the band', apLine.y0 >= T.bottom, `${apLine.y0} against ${T.bottom}`);
  check('the assist\'s line is under that one', !!as && asLine.y0 >= apLine.y1, `${asLine.y0} against ${apLine.y1}`);
  check('and the tallest toast does not push the assist\'s line off its place (assistReadY)', J(`assistReadY([{ y: ${T.top + (T.bottom - T.top) / 2}, h: ${T.bottom - T.top}, t: { active: true } }])`) === J('ASSIST.readY'));
  check('all of it is in the top third of the screen, well above the ship', asLine.y1 < H / 3, String(asLine.y1));
}

console.log('3. toast() on a scene');
g.run(`
  var __made = [];
  function __scene() {
    const obj = (kind, a) => { const o = { kind, text: kind === 'text' ? a[2] : undefined, x: a[0], y: a[1], w: a[2], h: a[3], active: true, destroy() { o.active = false; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth(d) { o.depth = d; return o; }, setStrokeStyle() { return o; } }; __made.push(o); return o; };
    __made = [];
    return { time: { now: 0 }, tweens: { add() {} }, add: { text: (...a) => obj('text', a), rectangle: (...a) => obj('rect', a) } };
  }
  Phaser = { Display: { Color: { HexStringToColor: () => ({ color: 0xffffff }) } } };
`);
{
  const r = J(`(() => { const s = __scene(); toast(s, 'one'); s.time.now = 50; toast(s, 'two'); s.time.now = 100; toast(s, 'three');
    const up = s.toasts.filter(o => o.t.active); return { n: s.toasts.length, up: up.length, text: up[0].t.text, y: up[0].y, h: up[0].h, bgTop: up[0].bg.y - up[0].bg.h / 2, bgBottom: up[0].bg.y + up[0].bg.h / 2, depth: [up[0].t.depth, up[0].bg.depth], live: __made.filter(o => o.active).length }; })()`);
  check('three toasts at once: one box, the last two messages in it, the older on top', r.n === 1 && r.up === 1 && r.text === 'two\nthree', JSON.stringify(r));
  check('the box drawn is the box planned: inside the band, text over background', r.bgTop >= T.top && r.bgBottom <= T.bottom && r.depth.join() === '300,299' && r.y === r.bgTop + r.h / 2, JSON.stringify(r));
  check('the boxes it replaced are gone: one text, one background, one tab left', r.live === 3, String(r.live));
  const later = J(`(() => { const s = __scene(); toast(s, 'Colonist delivered safely. +500 cr'); s.time.now = 400; toast(s, 'Docked.'); const a = s.toasts[0].t.text; s.time.now = 400 + TOAST.pair + 1; toast(s, 'Mission accepted.'); return [a, s.toasts[0].t.text, s.toasts.length]; })()`);
  check('the reward and "Docked." share the box; a toast that comes later has it to itself', later[0] === 'Colonist delivered safely. +500 cr\nDocked.' && later[1] === 'Mission accepted.' && later[2] === 1, JSON.stringify(later));
  const long = J(`(() => { const s = __scene(); toast(s, 'Target: Halcyon Station. C cruises, P flies you there.'); s.time.now = 10; toast(s, __MSGS[4]); return s.toasts[0].t.text.split('\\n'); })()`);
  check('a two-line message does not take a second one in with it', long.length === 2 && long.join(' ') === MSGS[4], JSON.stringify(long));
  const twice = J(`(() => { const s = __scene(); toast(s, 'No ships are out. Launch first.'); s.time.now = 400; toast(s, 'No ships are out. Launch first.'); return s.toasts[0].t.text.split('\\n'); })()`);
  check('the same message again, soon after, is one line: not the line twice in one box (a refused key pressed twice)', twice.length === 1, JSON.stringify(twice));
  const other = J(`(() => { const s = __scene(); toast(s, 'No ships are out. Launch first.'); s.time.now = 400; toast(s, 'The shield is already full.'); return s.toasts[0].t.text.split('\\n'); })()`);
  check('a different message soon after still shares the box with the first', other.length === 2, JSON.stringify(other));
  check('s.toasts keeps the shape other files read: t, bg, tab, y, h', J(`(() => { const s = __scene(); toast(s, 'x'); const o = s.toasts[0]; return ['t', 'bg', 'tab', 'y', 'h'].every(k => o[k] !== undefined) && typeof o.y === 'number' && typeof o.h === 'number'; })()`));
}

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nTOAST BAND FAIL (${failed} of ${n})` : `\nTOAST BAND PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
