// smoke: every ship in the Campaign flight view has a least size on the screen (fighter 16 px long, the cruiser and the other capital ships 44, the rest in proportion) so it stops shrinking as the view zooms out: the rule, the picture only (nothing in the fight moves), the two N panel rows, the square and the cruiser's mounts and bays that follow the drawn size
// Card space-game-ships-bigger (Troy, 24 Nov 2026: "draw them bigger": ships are specks at the default zoom). Before it every ship was held to one floor of 10 px (CAMPZOOM.view.minShip); now the floor is per ship: CAMPZOOM.view.leastSmall (a fighter, 16) and
// leastBig (the cruiser, 44), a ship between the two by its length (src/campzoom.js campZoomLeast). Only the PICTURE grows (the sprite's scale, the square, the mounts and bays drawn on the hull): the hit circles (CAMP.size), the ranges and the speeds are the
// sim's and never read the least sizes.
//   A. the rule: the least size of a ship by its length, the scale it is drawn up by at a zoom, never below 1 and never shrinking as the view goes out
//   B. the picture only: no rule file of the fight reads the least sizes, the hit circles are as they were
//   C. the N panel: two rows (the fighter's least and the cruiser's), in a group of their own, with words, changing the rule at once
//   D. what follows the drawn size: the target square, the cruiser's mounts and bays, the health bar (it reads the sprite already)
//   E. the words: the README, PROJECT_STATUS and the Campaign doc say it
// Run: node tests/campshipsbigger.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
// the drawn length of every kind the flight view draws (px, before any scaling): the table's own for the ones in CAMP.size, the picture's width times its look scale for the aliens, the freighter, the mothership and the towers
const LENS = J(`(() => { const o = {}; Object.keys(CAMP.size).forEach(k => { o[k] = CAMP.size[k].len; }); o.raider = 40; o.drone = 44; o.gunship = 60; o.freighter = 76; o.mother = 112 * CAMP_LOOK.mother.scale; o.tower = 60 * CAMP_LOOK.tower.scale; return o; })()`);

// ---- A. the rule ----
console.log('A. the rule');
const V = J('CAMPZOOM.view');
check('the least sizes are numbers of the zoom table: a fighter 16 px long and the cruiser 44, and the old single floor of 10 is gone', V.leastSmall === 16 && V.leastBig === 44 && V.minShip === undefined, JSON.stringify(V));
const least = len => J(`campZoomLeast(${len})`);
check('a fighter\'s least is 16 and the cruiser\'s is 44 (the table\'s own lengths, 22 and 98)', near(least(LENS.fighter), 16) && near(least(LENS.carrier), 44) && LENS.fighter === 22 && LENS.carrier === 98);
check('a ship between them is in proportion to its length (the raider 40 long, the cutter 34, the patrol 38), growing with the length', (() => { const k = [LENS.skiff, LENS.cutter, LENS.patrol, LENS.raider, LENS.drone, LENS.gunship, LENS.freighter].sort((a, b) => a - b).map(least); return k.every((v, i) => v > 16 && v < 44 && (i === 0 || v >= k[i - 1])) && near(least(40), 16 + 28 * (40 - 22) / (98 - 22)); })());
check('the capital ships are never under 44 (the rival ship 98, the towers 96, the mothership 291 long), and nothing shorter than a fighter is under 16', [LENS.pirateleader, LENS.tower, LENS.mother].every(l => least(l) >= 43 && least(l) <= 44.0001) && least(10) === 16 && least(0) === 16 && least(undefined) === 16);
const scale = (z, len) => J(`campZoomShipScale(${z}, ${len})`);
check('at the default zoom (0.335) a fighter is drawn 2.2 times its size and the cruiser 1.3 times (16 and 44 px on the screen where they were 7 and 33)', near(scale(0.335, 22), 16 / (22 * 0.335), 1e-6) && near(scale(0.335, 98), 44 / (98 * 0.335), 1e-6) && scale(0.335, 22) > 2.1 && scale(0.335, 98) > 1.3 && scale(0.335, 98) < 1.4);
check('at close zoom nothing changes: at 1 and at 1.6 every ship is its own size (scale 1)', Object.keys(LENS).every(k => scale(1, LENS[k]) === 1 && scale(1.6, LENS[k]) === 1), JSON.stringify(Object.keys(LENS).filter(k => scale(1, LENS[k]) !== 1)));
check('a ship\'s length on the screen is never under its least at any zoom from the far floor to the nearest, and never grows past its own size when it is not held up', Object.keys(LENS).every(k => [0.02, 0.05, 0.1, 0.2, 0.335, 0.5, 0.8, 1, 1.6].every(z => { const on = LENS[k] * z * scale(z, LENS[k]); return on >= least(LENS[k]) - 1e-9 && (scale(z, LENS[k]) === 1 ? on >= least(LENS[k]) - 1e-9 : near(on, least(LENS[k]), 1e-6)); })));
check('so a ship stops shrinking as the view zooms out: its length on the screen is the same from the zoom it reaches its least down to the farthest, and never smaller zoomed out than in', Object.keys(LENS).every(k => { let prev = 0; return [0.02, 0.05, 0.1, 0.2, 0.335, 0.5, 0.8, 1, 1.6].every(z => { const on = LENS[k] * z * scale(z, LENS[k]); const ok = on >= prev - 1e-9; prev = on; return ok; }); }));
check('the scale is never under 1 and a zoom of nothing is a scale of 1 (as before)', scale(0, 22) === 1 && scale(-1, 22) === 1 && scale(0.0001, 22) >= 1);
check('the shot and the label sizes are as they were (shotMax 6, labelMax 6, 2.5 times at 0.2)', V.shotMax === 6 && V.labelMax === 6 && J('campZoomShotScale(0.2)') === 2.5);

// ---- B. the picture only ----
console.log('B. the picture only');
const FIGHT_FILES = ['campaign.js', 'campfight.js', 'campcircles.js', 'campconvoy.js', 'campdogfight.js', 'camptorpedo.js', 'campmissilebuild.js', 'campcharge.js', 'camptarget.js', 'campclick.js', 'campwing.js', 'campcruiser.js', 'camprival.js', 'camppirates.js', 'campcharge.js', 'campmap.js', 'campsight.js'];
const reads = f => { try { return /leastSmall|leastBig|campZoomLeast|campZoomShipScale/.test(src('src/' + f)); } catch (e) { return false; } };
check('no rule file of the fight (the sim, the target and click rules, the map) reads the least sizes: they are the view\'s, and the picture\'s alone', !FIGHT_FILES.some(reads), FIGHT_FILES.filter(reads).join());
check('the hit circles and the lengths are the table\'s own, unmoved: cruiser 98 long and 25 round, fighter 22 and 6, raider\'s body 10', J('[CAMP.size.carrier.len, CAMP.size.carrier.hit, CAMP.size.fighter.len, CAMP.size.fighter.hit, PIRATES.raider.body[0]]').join() === '98,25,22,6,10');
check('a fight is the same with the least sizes at 0 or at 300: the view\'s numbers change no ship, no hit and no shot', (() => { const run = (a, b) => J(`(() => { const o = [CAMPZOOM.view.leastSmall, CAMPZOOM.view.leastBig]; CAMPZOOM.view.leastSmall = ${a}; CAMPZOOM.view.leastBig = ${b}; const C = campNew('home', [], { seed: 5 }); for (let i = 0; i < 900; i++) campStep(C, 1 / 30); const r = C.ships.map(u => [u.id, Math.round(u.x), Math.round(u.y), Math.round(u.hp)].join(':')).join('|'); CAMPZOOM.view.leastSmall = o[0]; CAMPZOOM.view.leastBig = o[1]; return r; })()`); return run(0, 0) === run(300, 300) && run(0, 0).length > 20; })());

// ---- C. the N panel ----
console.log('C. the N panel');
const rowS = J('campTuneRow("leastfighter")'), rowB = J('campTuneRow("leastcruiser")');
check('two rows: the fighter\'s least and the cruiser\'s, numbers of the zoom table (view.leastSmall, view.leastBig), in pixels, felt at once', !!rowS && !!rowB && rowS.root === 'CAMPZOOM' && rowS.path === 'view.leastSmall' && rowB.root === 'CAMPZOOM' && rowB.path === 'view.leastBig' && rowS.unit === 'px' && rowB.unit === 'px' && rowS.when === 'now' && rowB.when === 'now', JSON.stringify([rowS, rowB]));
check('their defaults are 16 and 44 and the ranges let a fighter go from nothing extra to a big one (the cruiser\'s least no smaller than 10, up to 150)', rowS && rowB && J('campTuneDefault("leastfighter")') === 16 && J('campTuneDefault("leastcruiser")') === 44 && rowS.min <= 4 && rowS.max >= 40 && rowB.min <= 10 && rowB.max >= 120);
check('they have a group of their own that the panel lists, and words (none is a missing key)', rowS && rowB && rowS.group === rowB.group && J(`CAMP_TUNE.groups.indexOf("${rowS ? rowS.group : ''}")`) >= 0 && J('campTuneLabel(campTuneRow("leastfighter"))') && !/^camp\./.test(J('campTuneLabel(campTuneRow("leastfighter"))')) && !/^camp\./.test(J('campTuneLabel(campTuneRow("leastcruiser"))')), J('campTuneLabel(campTuneRow("leastfighter"))'));
check('changing one changes the rule at once: the fighter\'s least at 24 draws it 24 px long, and Reset puts 16 back', J(`(() => { campTuneResetAll(); const a = campZoomLeast(22); campTuneSet('leastfighter', 24); const b = campZoomLeast(22), s = 22 * 0.335 * campZoomShipScale(0.335, 22); campTuneResetAll(); return [a, b, +s.toFixed(3), campZoomLeast(22)]; })()`).join() === '16,24,24,16');
check('the cruiser\'s least moves the ships in between with it (a raider 40 long: 22.6 at 44, 26.4 at 60)', J(`(() => { campTuneResetAll(); const a = campZoomLeast(40); campTuneSet('leastcruiser', 60); const b = campZoomLeast(40); campTuneResetAll(); return [+a.toFixed(1), +b.toFixed(1)]; })()`).join() === '22.6,26.4');

// ---- D. what follows the drawn size ----
console.log('D. what follows the drawn size');
const sq = (v, z, drawn) => J(`(() => { const o = { r: [], fillStyle() { return o; }, fillRect(x, y, w, h) { o.r.push([x, y, w, h]); return o; } }; campTgtCorners(o, ${JSON.stringify(v)}, 0xff6a5a, ${z}, 1${drawn === undefined ? '' : ', ' + drawn}); return o.r.map(q => q.map(n => +n.toFixed(4))); })()`);
check('the square given no drawn size is the one it always was (a fighter at 0.335: the 34 px least, 50.7 round)', (() => { const r = sq({ x: 0, y: 0, r: 6 }, 0.335); const h = 34 / 2 / 0.335; return r.length === 8 && near(-r[0][0] * 0 + Math.abs(r[0][0]), h, 1e-3); })());
check('a cruiser drawn 131 px across (44 on the screen at 0.335) has a square that clears the hull: half its length and the room, 75.5 round, where the old square was 50.7', (() => { const r = sq({ x: 0, y: 0, r: 25 }, 0.335, 131.3), old = sq({ x: 0, y: 0, r: 25 }, 0.335); return Math.abs(r[0][0]) > Math.abs(old[0][0]) + 20 && Math.abs(r[0][0]) >= 131.3 / 2 + 10 - 1e-3; })());
check('a drawn size that is smaller than the square already is changes nothing (a fighter drawn 48 world px at 0.335: 33.9 round against 50.7)', JSON.stringify(sq({ x: 0, y: 0, r: 6 }, 0.335, 47.8)) === JSON.stringify(sq({ x: 0, y: 0, r: 6 }, 0.335)));
const scn = src('src/campaignscene.js'), tgt = src('src/camptargetdraw.js');
check('the scene hands the square the ship\'s drawn size, only while the view holds it up (campTgtDrawn): the target\'s and the friend\'s and a squad\'s', /campTgtDrawn = \(s, v\)/.test(tgt) && /campTgtCorners\(g, v, col, z, a, campTgtDrawn\(s, v\)\)/.test(tgt) && /campTgtDrawn\(this, u\)/.test(scn));
check('the sprite\'s scale (sp._k) is set from the least size as before: the scene reads campZoomShipScale of the camera\'s zoom and the drawn length', /campZoomShipScale\(this\.cameras\.main\.zoom, sp\.width \* look\.scale\)/.test(scn) && /sp\._k !== k/.test(scn));
check('the cruiser\'s turret mounts and bay lights are drawn at the cruiser\'s own scale (campShipK): where its turrets are on the hull, not where they are in the sim', /campShipK = \(s, id\)/.test(scn) && /syncBay\(\)[\s\S]{0,1400}campShipK\(/.test(scn) && /syncRockets\([\s\S]{0,2600}campShipK\(/.test(scn));
const mounts = k => J(`(() => {
  const C = campNew(1, [], { seed: 2 }); C.carrier.rot = 0.3; C.turrets.forEach(tu => { tu.target = ''; tu.aim = 0.5; tu.shotAt = C.t - 5000; });
  const rec = () => { const r = { circles: [], lines: [], style: null, fill: null, clear() { r.circles.length = 0; r.lines.length = 0; return r; }, lineStyle(w, c, a) { r.style = { w, c, a }; return r; }, fillStyle(c, a) { r.fill = { c, a }; return r; },
    lineBetween(x1, y1, x2, y2) { r.lines.push({ len: Math.hypot(x2 - x1, y2 - y1), ...r.style }); return r; }, strokeCircle() { return r; }, fillCircle(x, y, rad) { r.circles.push({ x, y, rad }); return r; } }; return r; };
  const sc = { camp: C, hud: {}, reachG: rec(), mountG: rec(), msp: {}, mode: 'play', sp: ${k ? `{ [C.carrier.id]: { _k: ${k} } }` : '{}'} };
  Campaign.prototype.syncRockets.call(sc, 16);
  const c = C.carrier; return { r: sc.mountG.circles.map(q => [Math.hypot(q.x - c.x, q.y - c.y), q.rad]), l: sc.mountG.lines.map(q => [q.len, q.w]) };
})()`);
const m1 = mounts(0), m15 = mounts(1.5), mM = J('CAMP_MOUNT');
check('the turret mounts are where the sim has them at the cruiser\'s own size, and 1.5 times as far from its middle (and 1.5 times as big, barrel and all) when the view draws the cruiser up 1.5 times', m1.r.length === 16 && m15.r.length === 16 && m1.r.every((q, i) => near(m15.r[i][0], q[0] * 1.5, 1e-6) && near(m15.r[i][1], q[1] * 1.5, 1e-9)) && m1.l.every((q, i) => near(m15.l[i][0], q[0] * 1.5, 1e-6) && near(m15.l[i][1], q[1] * 1.5, 1e-9)) && m1.r.some(q => q[1] === mM.base), JSON.stringify([m1.r.slice(0, 2), m15.r.slice(0, 2)]));
const bays = k => J(`(() => {
  const C = campNew(1, [], { seed: 2 }); C.carrier.rot = 0.3; const mk = () => { const r = { fills: [], circles: [], style: null, clear() { r.circles.length = 0; r.fills.length = 0; return r; }, setDepth() { return r; }, setBlendMode() { return r; }, fillStyle(c, a) { r.style = { c, a }; return r; }, fillPoints(pts) { r.fills.push(pts); return r; }, fillCircle(x, y, rad) { r.circles.push({ x, y, rad }); return r; } }; return r; };
  const gs = []; const sc = { camp: C, bayAt: { launch: C.t, land: C.t }, add: { graphics() { const r = mk(); gs.push(r); return r; } }, sp: ${k ? `{ [C.carrier.id]: { _k: ${k} } }` : '{}'} };
  Campaign.prototype.syncBay.call(sc); const c = C.carrier;
  return { far: Math.max(...gs[0].fills.flat().map(p => Math.hypot(p.x - c.x, p.y - c.y))), halo: gs[1].circles.map(q => [Math.hypot(q.x - c.x, q.y - c.y), q.rad]), n: gs[0].fills.length };
})()`);
const b1 = bays(0), b2 = bays(2);
check('the bay lights are carried out the same way: the lit boxes reach twice as far from the middle and the halos sit twice as far and are twice as big when the cruiser is drawn up twice', b1.n > 0 && b2.n === b1.n && near(b2.far, b1.far * 2, 1e-6) && b1.halo.length > 0 && b1.halo.every((q, i) => near(b2.halo[i][0], q[0] * 2, 1e-6) && near(b2.halo[i][1], q[1] * 2, 1e-9)), JSON.stringify([b1.far, b2.far]));
check('the health bar reads the sprite\'s own size (displayWidth), so it follows the drawn ship with no change', /sp\.displayWidth/.test(src('src/campchargescene.js')));

// ---- E. the words ----
console.log('E. the words');
check('the README, PROJECT_STATUS and the Campaign doc say the ships have a least size on the screen', /least size/i.test(src('README.md')) && /least size/i.test(src('PROJECT_STATUS.md')) && /least size/i.test(src('docs/CAMPAIGN.md')));

check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
