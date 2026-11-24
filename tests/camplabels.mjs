// smoke: the Campaign's map labels keep clear of each other and of the HUD: the route label, the edge arrow's label (out of the gauges, the radar and the target's line under it), a cut name (plain Node, no Chrome)
// Wrap-up hunt of level 3 (docs/wrapup/level3.md, minors): on the whole-system map the route label ("251 km, about 13 s") sat on the INNER BELT label; the edge arrow's label ("Scan point 1  251 km") ran into
// the radar's rim; the list cut the star's name ("Epsilon Eridani star") without saying so.
//   campMapFreeSpot(cands, w, h, boxes)   the first candidate centre where a w by h label overlaps no box;  campMapRouteSpots(a, b)   where to try the route label along its line
//   campNavLabelAt(x, y, w, h, keep, W, H) the arrow's label pushed out of the keep rectangles and kept on the screen
//   the keep rectangles                    the table's CAMP.nav.arrow.keep only (the target's line that was kept out of too is gone; the target display's box is inside the radar's old rectangle): the two lists are hidden until Q or P opens one, and an open list is drawn over the label, so no list is kept out of
// Run: node tests/camplabels.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

console.log('the route label');
{
  const spots = J('campMapRouteSpots({ x: 0, y: 0 }, { x: 100, y: 0 })');
  check('the spots begin in the middle of the line, above then below it, and move along it either side', spots[0].x === 50 && spots[0].y === -11 && spots[1].x === 50 && spots[1].y === 11 && spots.length === 14 && spots.every(s => s.x >= 0 && s.x <= 100));
  const none = J('campMapFreeSpot(campMapRouteSpots({ x: 0, y: 0 }, { x: 100, y: 0 }), 40, 14, [])');
  check('with nothing in the way the middle is taken: where the label always was (above the line)', none && none.x === 50 && none.y === -11);
  const boxes = [{ x: 30, y: -20, w: 40, h: 16 }];
  const moved = J(`campMapFreeSpot(campMapRouteSpots({ x: 0, y: 0 }, { x: 100, y: 0 }), 40, 14, ${JSON.stringify(boxes)})`);
  check('a name on the middle of the line (the INNER BELT label) moves it: it is below the line, or along it, and on no box', moved && !(Math.abs(moved.x - 50) < 40 && moved.y - 7 < -4 && moved.y + 7 > -20) && moved.y !== -11, JSON.stringify(moved));
  check('with every spot taken there is none (the caller keeps the old place)', J(`campMapFreeSpot(campMapRouteSpots({ x: 0, y: 0 }, { x: 100, y: 0 }), 40, 14, [{ x: -50, y: -50, w: 300, h: 100 }])`) === null);
  check('the map paints the route label by it, from the names it has drawn', /campMapFreeSpot\(campMapRouteSpots\(cp, q\)/.test(src('src/campmapdraw.js')) && /mp\.nameObjs/.test(src('src/campmapdraw.js')));
}

console.log('the arrow\'s label');
{
  const K = J('CAMP.nav.arrow.keep'), W = 1280, H = 720, L = (x, y, w, h) => J(`campNavLabelAt(${x}, ${y}, ${w}, ${h}, ${JSON.stringify(K)}, ${W}, ${H})`);
  const inside = (p, w, h, r) => p.x + w / 2 > r[0] && p.x - w / 2 < r[2] && p.y + h / 2 > r[1] && p.y - h / 2 < r[3];
  const a = L(1180, 120, 170, 18);
  check('a label wanted inside the radar\'s rectangle (upper right) is out of it, and on the screen', !K.some(r => inside(a, 170, 18, r)) && a.x - 85 >= 0 && a.x + 85 <= W && a.y - 9 >= 0 && a.y + 9 <= H, JSON.stringify(a));
  const b = L(640, 400, 170, 18);
  check('a label in the clear stays where it was put', b.x === 640 && b.y === 400);
  for (const [x, y] of [[100, 60], [640, 40], [60, 700], [1250, 10], [20, 360], [1270, 700]]) { const p = L(x, y, 170, 18); check(`wanted at ${x},${y}: it ends on the screen and out of every keep rectangle`, p.x - 85 >= 0 && p.x + 85 <= W && p.y - 9 >= 0 && p.y + 9 <= H && !K.some(r => inside(p, 170, 18, r)), JSON.stringify(p)); }
  check('the scene uses it for the arrow\'s label, with the keep rectangles of CAMP.nav.arrow', /campNavLabelAt\(ar\.x - Math\.cos\(a\) \* 64, ar\.y - Math\.sin\(a\) \* 28, this\.hud\.arrow\.width/.test(src('src/campaignscene.js')) && /CAMP\.nav\.arrow\.keep/.test(src('src/campaignscene.js')));
}

console.log('the keep-out rectangles hold the target display and the left HUD rows (8-GEN: the label sat under the SHIP tab and over the AUTOPILOT line; the tabs are gone, the lists open on a key)');
{
  const BX = J('campTdispBox()'), K = J('CAMP.nav.arrow.keep');
  check('the target display (in the corner the radar had: its box, campTdispBox) is inside a keep rectangle, so no label is put on it', K.some(r => BX.x >= r[0] && BX.x + BX.w <= r[2] && BX.y >= r[1] && BX.y + BX.h <= r[3]) && J('typeof campPanelsKeep') === 'undefined', JSON.stringify([BX, K]));
  check('no list is kept out of: the lists are hidden until Q or P opens one (an open list is drawn over the label), so the places of the lists are free for the label while none is open', (() => { const heads = J('CAMP_PANELS.panels.map(d => campPanelsGeometry(d).list)'); return heads.every(t => !K.some(r => t.x >= r[0] && t.x + t.w <= r[2] && t.y >= r[1] && t.y + t.h <= r[3])) && J('Campaign.prototype.arrowKeep.call({}).length') === K.length; })());
  check('the left HUD\'s busiest column (card space-game-hud-topleft-trim: Earth with its bar, the wave, the objective, the repair line and the outpost hint, 14 px type from y 14) is inside the first rectangle', (() => { const T = J('CAMP.hud.text'); return K.some(r => r[0] === 0 && r[1] === 0 && r[3] >= T.y + 12 + 4 * T.pitch + 18); })());
  const W = 1280, H = 720, L = (x, y) => J(`campNavLabelAt(${x}, ${y}, 190, 18, ${JSON.stringify(K)}, ${W}, ${H})`), hit = (p, r) => p.x + 95 > r[0] && p.x - 95 < r[2] && p.y + 9 > r[1] && p.y - 9 < r[3];
  const a = L(1144, 222), b = L(85, 60), c = L(BX.x + BX.w / 2, BX.y + BX.h / 2);
  check('the label wanted at the top right (2.3 and 3.3 starts), on the target display, or on the objective line (1.2) ends out of every rectangle, and on the screen', [a, b, c].every(p => !K.some(r => hit(p, r)) && p.x - 95 >= 0 && p.x + 95 <= W && p.y - 9 >= 0 && p.y + 9 <= H), JSON.stringify([a, b, c]));
}

console.log('the list');
check('a name cut to fit the list says so with an ellipsis: "Epsilon Eridani\u2026" for the star, not the name without its word', /\.slice\(0, 15\) \+ '\\u2026'/.test(src('src/campmapdraw.js')));
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMP LABELS FAIL (${failed} of ${n})` : `\nCAMP LABELS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
