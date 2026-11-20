// smoke: the carrier starts clear of Luna and the Lunar base ring: its drawn outline does not touch either (plain Node, no Chrome)
// [night] graphics, the blind critic's picture 02: the carrier started 90 px from Luna and lay across the moon and the base ring. The check is geometry on the numbers the scene draws with: the carrier's drawn size is
// the bastion model at CAMP_LOOK.carrier.scale (140 x 100 px in the live scene: the texture is 90 x 64), Luna is its table radius, the base ring is drawn at +70, -60 from Luna with a radius of about 32 px.
// Run: node tests/campgfx-start.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
const d = J(`(() => { const C = campNew(1, [], { seed: 1 }), L = CAMP.places.luna, c = C.carrier; return { cx: c.x, cy: c.y, rot: c.rot, lx: L.x, ly: L.y, lr: L.r, scale: CAMP_LOOK.carrier.scale }; })()`);
const W = 90 * d.scale, H = 64 * d.scale; // the drawn size, from the texture size the live scene reported (90 x 64 at scale 1)
// the carrier's outline as a box turned to its heading; the distance from a point to that box (0 when inside it)
const gap = (px, py) => { const dx = px - d.cx, dy = py - d.cy, c = Math.cos(-d.rot), s = Math.sin(-d.rot), x = dx * c - dy * s, y = dx * s + dy * c; const ox = Math.max(Math.abs(x) - W / 2, 0), oy = Math.max(Math.abs(y) - H / 2, 0); return Math.hypot(ox, oy); };
check('the carrier is drawn about 140 x 100 px (the scale in CAMP_LOOK)', Math.abs(W - 140) < 2 && Math.abs(H - 100) < 2, W.toFixed(0) + ' x ' + H.toFixed(0));
check('the drawn carrier is clear of the moon (more than 4 px from its edge)', gap(d.lx, d.ly) - d.lr > 4, (gap(d.lx, d.ly) - d.lr).toFixed(1) + ' px');
check('the drawn carrier is clear of the base ring (more than 4 px from its edge)', gap(d.lx + 70, d.ly - 60) - 32 > 4, (gap(d.lx + 70, d.ly - 60) - 32).toFixed(1) + ' px');
check('it still starts at the Lunar base, within 200 px of Luna', Math.hypot(d.cx - d.lx, d.cy - d.ly) < 200, Math.hypot(d.cx - d.lx, d.cy - d.ly).toFixed(0) + ' px');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
