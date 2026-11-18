// smoke: the right-hand column in space: the assist's target panel and the Overview list never overprint, in any state (plain Node, no Chrome)
// Card space-game-assist-overview-overlap (Troy's screenshot, 17 Nov 2026: Match speed on a gunship in a fight, the Overview up: the target
// panel was drawn in the same place as the list and neither could be read). Both rectangles come from one place each (src/hud.js
// hudAssistRect, src/overview.js overviewLayout), and this test walks every state: the assist off, on with no target, on with 2, 4, 6 or 8
// command keys; the Overview hidden or shown; and the real functions on a stand-in scene with a real order in force.
// Run: node tests/hudlayout.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const W = J('W'), H = J('H');
const hit = (a, b) => a && b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const RADAR_BOTTOM = 250, FOOT = H - 52; // the radar's own zone ends at y 250 (hud.js); the "Tab map  H help" strip starts at H - 48 (map.js)

console.log('the two rectangles, every number of command keys');
for (const keys of [null, 0, 2, 4, 6, 8]) {
  const tag = keys === null ? 'no assist panel' : `assist panel with ${keys} command keys`;
  const A = keys === null ? null : J(`hudAssistRect({ keys: new Array(${keys}).fill({ cap: '1' }) })`);
  const O = J(`overviewLayout(${JSON.stringify(A)})`);
  check(`${tag}: the Overview does not touch it`, !hit(A, O), JSON.stringify({ A, O }));
  check(`${tag}: the Overview is on the screen, clear of the bottom strip`, O.x >= 0 && O.x + O.w <= W && O.y + O.h <= FOOT, JSON.stringify(O));
  check(`${tag}: the Overview keeps 4 rows or more, and its height is its rows`, O.rows >= 4 && O.h === J('OVERVIEW.row') * (O.rows + 2) + 14, JSON.stringify(O));
  if (A) check(`${tag}: the panel is under the radar, on the screen`, A.y >= RADAR_BOTTOM && A.x + A.w <= W && A.y + A.h <= FOOT, JSON.stringify(A));
  if (A) check(`${tag}: the list starts under the panel, in the same column`, O.y >= A.y + A.h && Math.abs(O.x + O.w / 2 - (A.x + A.w / 2)) < 20, JSON.stringify({ A, O }));
}
check('with no assist panel the list is where it always was, with all its rows', J('overviewLayout(null).y') === J('OVERVIEW.y') && J('overviewLayout(null).rows') === J('OVERVIEW.max'));

console.log('the real panel: an order in force');
{
  // a stand-in scene, as tests/hudassist.mjs makes it: the assist on, a ship as its target, Match speed if that mode is loaded
  g.run(`
    toast = () => {}; sfx = () => {};
    var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
    var __s = { add: __P, input: __P, events: __P, time: { now: 1000 }, k: {}, cr: { target: null }, lockUntil: 0,
      ship: { x: 0, y: 0, rotation: 0, body: { velocity: { x: 0, y: 0 } } } };
    ASSIST.keys.forEach(n => { __s.k[n] = { isDown: false }; });
    assistSetup(__s); ASSIST.on = true;
  `);
  check('assist on, no target: no panel, the list is in its old place', J('hudAssistRect(hudAssistModel(__s))') === null && J('overviewLayout(hudAssistRect(hudAssistModel(__s))).y') === J('OVERVIEW.y'));
  const modes = J('Object.keys(ASSIST_MODES)');
  for (const mode of modes) {
    g.run(`assistSet('${mode}', { x: 300, y: 0, name: 'the gunship', body: { velocity: { x: 40, y: 0 } }, active: true })`);
    const A = J('hudAssistRect(hudAssistModel(__s))'), O = J('overviewLayout(hudAssistRect(hudAssistModel(__s)))');
    check(`order ${mode} on a ship (${modes.length} command keys): panel and list do not touch`, !!A && !hit(A, O), JSON.stringify({ A, O }));
  }
  g.run(`assistSet(''); __s.cr.target = { id: 'x', name: 'Halcyon Station', x: 900, y: 0 };`);
  const A = J('hudAssistRect(hudAssistModel(__s))'), O = J('overviewLayout(hudAssistRect(hudAssistModel(__s)))');
  check('no order, a nav target (the panel says NO ORDER): they do not touch', !!A && !hit(A, O), JSON.stringify({ A, O }));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
