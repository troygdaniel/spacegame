// smoke: the HUD's edge arrow keeps out of the navigation panel (plain Node, no Chrome)
// First look (docs/FIRSTLOOK.md): the amber arrow of a far destination, on the left edge, slid down past the mission checklist and landed on the
// rows of the navigation panel, its words over "SUN, PLANETS AND BELTS". The panel is a zone now (hudNavZone), flagged inboard: an arrow on the
// left edge keeps its height and moves in beside the panel instead of down. hudEdge and hudNavZone are pure on their arguments.
// Run: node tests/hudedge.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));

const panel = { x0: 20, y0: 330, x1: 350, y1: 660, inboard: true };
const checklist = { x0: 0, y0: 0, x1: 380, y1: 290 };
// a target far to the left and a little below the middle: the arrow wants the left edge at about y 400
const edge = zones => J(`hudEdge({ zones: ${JSON.stringify(zones)} }, -8000, 420)`);
let p = edge([]);
check('with no zone the arrow is on the left edge at 44', p.side === 'L' && p.x === 44, JSON.stringify(p));
const keep = p.y;
p = edge([checklist, panel]);
check('with the panel up the arrow keeps its height and moves in beside it (28 px right of the panel)', p.side === 'L' && p.x === 350 + 28 && Math.abs(p.y - keep) < 1, JSON.stringify(p));
check('and is not inside the panel', !(p.x > panel.x0 - 14 && p.x < panel.x1 && p.y > panel.y0 && p.y < panel.y1));
p = J(`hudEdge({ zones: ${JSON.stringify([{ x0: 20, y0: 330, x1: 350, y1: 660 }])} }, -8000, 420)`);
check('a left zone that is not the panel (no inboard flag) still moves the arrow down, as before', p.side === 'L' && p.x === 44 && p.y === 660 + 28, JSON.stringify(p));
p = J(`hudEdge({ zones: ${JSON.stringify([panel])} }, 9000, 420)`);
check('an arrow on the right edge is not touched by the left panel', p.side === 'R' && p.x === 1280 - 44, JSON.stringify(p));

// hudNavZone: the union of the parts that are showing
const part = (x, y, w, h, visible = true) => ({ visible, getBounds: () => ({ x, y, right: x + w, bottom: y + h }) });
let z = J(`hudNavZone({ np: { jobBg: null, pinBg: null, bg: null } })`);
check('no panel parts showing: no zone', z === null, JSON.stringify(z));
g.run(`var __part = (x, y, w, h, visible = true) => ({ visible, getBounds: () => ({ x, y, right: x + w, bottom: y + h }) });`);
z = J(`hudNavZone({ np: { jobBg: __part(24, 150, 322, 60), pinBg: __part(24, 212, 322, 26), bg: __part(24, 238, 322, 340) } })`);
check('job line, pinned line and list together: one zone from the job line to the bottom of the list, 4 px wider each side, flagged inboard', z && z.x0 === 20 && z.x1 === 350 && z.y0 === 150 && z.y1 === 578 && z.inboard === true, JSON.stringify(z));
z = J(`hudNavZone({ np: { jobBg: null, pinBg: __part(24, 150, 322, 26), bg: __part(24, 176, 322, 340, false) } })`);
check('only the pinned line showing (the list is shut): the zone is the pinned line', z && z.y0 === 150 && z.y1 === 176, JSON.stringify(z));
check('no scene or no panel: no zone, no error', J(`hudNavZone(null)`) === null && J(`hudNavZone({})`) === null);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `HUD EDGE FAIL (${failed} of ${n})` : `HUD EDGE PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
