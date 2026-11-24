// smoke: the ships' least sizes keep class proportions at every zoom: the cruiser and the other capital ships are at least 3 times a fighter's drawn length, the transport and the miner are in between, a longer ship is never drawn smaller than a shorter one, and the capital's least follows the fighter's on the N panel (plain Node, no Chrome)
// Card space-game-ships-bigger-proportions (the cloud session, 24 Nov 2026: with the least sizes of space-game-ships-bigger the pilots were drawn nearly as large as the cruiser at the default zoom, so the cruiser no longer read as the big ship: a fighter 16 px long
// against the cruiser's 44 is 2.75 times, and the hulls are 4.5 times apart). The capital's least size is now a RATIO of the fighter's (CAMPZOOM.view.leastClass, 3.25: the cruiser 52 px where the fighter is 16), so the proportion holds at every zoom and when the fighter's
// least is changed on the N panel; the ships between them are in proportion to their length (src/campzoom.js campZoomLeast). Only the picture: the fight never reads it (tests/campshipsbigger.mjs).
//   A. the numbers: the ratio is a number of the zoom table and the old px of the cruiser (leastBig) is gone
//   B. at every zoom the cruiser, the rival ship, the towers and the mothership are at least 3 times a fighter, on the screen
//   C. the transport and the miner are strictly between a fighter and the cruiser at every zoom; a longer ship is never drawn smaller than a shorter
//   D. the N panel: the fighter's least (px) and the class ratio (times), the capital's least follows the fighter's
// Run: node tests/campshipsproportions.mjs   (exit code 1 on a failed check)
import { nodeGame, ROOT } from './nodegame.mjs';
import { readFileSync } from 'node:fs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
// the hull length of every kind the flight view draws (the rule goes by it: CAMP.size's own, else the picture's drawn width)
const LENS = J(`(() => { const o = {}; Object.keys(CAMP.size).forEach(k => { o[k] = CAMP.size[k].len; }); o.raider = 40; o.drone = 44; o.gunship = 60; o.freighter = 76; o.mother = 112 * CAMP_LOOK.mother.scale; o.tower = 60 * CAMP_LOOK.tower.scale; return o; })()`);
const ZOOMS = [0.02, 0.05, 0.1, 0.2, 0.3, 0.335, 0.45, 0.5, 0.6, 0.73, 0.8, 1, 1.3, 1.6];
const on = (z, len) => J(`${len} * ${z} * campZoomShipScale(${z}, ${len})`); // a ship's length on the screen at a zoom (px)

// ---- A. the numbers ----
console.log('A. the numbers');
const V = J('CAMPZOOM.view');
check('the capital\'s least is a ratio of the fighter\'s (CAMPZOOM.view.leastClass, at least 3), the fighter\'s stays 16, and the cruiser\'s own pixels (leastBig) are gone', V.leastSmall === 16 && V.leastClass >= 3 && V.leastBig === undefined, JSON.stringify(V));
check('the cruiser\'s least is the fighter\'s times the ratio (3.25: 52 px against 16), and so is every capital ship\'s', near(J(`campZoomLeast(${LENS.carrier})`), 16 * V.leastClass) && near(J(`campZoomLeast(${LENS.pirateleader})`), 16 * V.leastClass) && near(J(`campZoomLeast(${LENS.mother})`), 16 * V.leastClass) && V.leastClass === 3.25);

// ---- B. a capital ship against a fighter, at every zoom ----
console.log('B. a capital ship against a fighter');
check('at every zoom from the farthest to the nearest the cruiser is drawn at least 3 times as long as a fighter (the card: capital ships at least 3 times a fighter\'s drawn length)', ZOOMS.every(z => on(z, LENS.carrier) >= 3 * on(z, LENS.fighter) - 1e-9), JSON.stringify(ZOOMS.filter(z => on(z, LENS.carrier) < 3 * on(z, LENS.fighter) - 1e-9)));
check('and so is the rival ship (98 long), the mothership (291) and a tower (96), against the fighter', ZOOMS.every(z => [LENS.pirateleader, LENS.mother, LENS.tower].every(l => on(z, l) >= 3 * on(z, LENS.fighter) - 1e-9)), JSON.stringify(ZOOMS.filter(z => [LENS.pirateleader, LENS.mother, LENS.tower].some(l => on(z, l) < 3 * on(z, LENS.fighter) - 1e-9))));
check('at the default zoom (0.335) the cruiser is 52 px on the screen and a fighter 16, the ratio 3.25 (it was 44 and 16, 2.75: the pilots read as nearly the cruiser\'s size)', near(on(0.335, LENS.carrier), 52, 1e-6) && near(on(0.335, LENS.fighter), 16, 1e-6));
check('the natural proportion is kept at close zoom: at 1 and 1.6 nothing is scaled and the cruiser is 98 against the fighter\'s 22 (4.45 times)', [1, 1.6].every(z => near(on(z, LENS.carrier) / on(z, LENS.fighter), 98 / 22, 1e-9)));

// ---- C. the classes in between ----
console.log('C. the classes in between');
const kinds = ['fighter', 'miner', 'freighter', 'carrier'];
check('the miner (36 long) and the transport (76) are strictly between a fighter and the cruiser at every zoom: fighter < miner < transport < cruiser', ZOOMS.every(z => { const v = kinds.map(k => on(z, LENS[k])); return v[0] < v[1] && v[1] < v[2] && v[2] < v[3]; }), JSON.stringify(ZOOMS.map(z => kinds.map(k => +on(z, LENS[k]).toFixed(1)))));
check('the ships between keep their class: a patrol, a cutter, a skiff and the torpedo boats are bigger than a fighter and smaller than the cruiser at the far view, in the order of their lengths', (() => { const ks = ['skiff', 'cutter', 'miner', 'patrol', 'tboat', 'brute', 'freighter']; const z = 0.05, v = ks.map(k => on(z, LENS[k])); return v.every((x, i) => x > on(z, LENS.fighter) && x < on(z, LENS.carrier) && (i === 0 || x >= v[i - 1] - 1e-9)); })());
check('a longer ship is never drawn smaller than a shorter one, at any zoom (every kind, by length)', ZOOMS.every(z => { const ks = Object.keys(LENS).sort((a, b) => LENS[a] - LENS[b]), v = ks.map(k => on(z, LENS[k])); return v.every((x, i) => i === 0 || x >= v[i - 1] - 1e-9); }));

// ---- D. the N panel ----
console.log('D. the N panel');
const rowS = J('campTuneRow("leastfighter")'), rowC = J('campTuneRow("leastclass")');
check('two rows in the group the panel lists: the fighter\'s least (px) and the capital\'s (times a fighter\'s: view.leastClass), felt at once; the cruiser\'s own px row is gone', !!rowS && !!rowC && rowS.path === 'view.leastSmall' && rowC.root === 'CAMPZOOM' && rowC.path === 'view.leastClass' && rowC.unit === 'x' && rowS.unit === 'px' && rowC.when === 'now' && rowS.group === rowC.group && J('campTuneRow("leastcruiser")') === null, JSON.stringify([rowS, rowC]));
check('the ratio\'s default is 3.25 and its range is from 1 (no proportion kept) up to a ratio of at least 6', rowC && J('campTuneDefault("leastclass")') === 3.25 && rowC.min <= 1 && rowC.max >= 6 && rowC.step <= 0.5);
check('both have words (none is a missing key), and the ratio\'s name fits before its value on the panel (the panel test measures it)', rowC && J('[campTuneLabel(campTuneRow("leastfighter")), campTuneLabel(campTuneRow("leastclass"))].every(t => t && !/^camp\\./.test(t))'), J('campTuneLabel(campTuneRow("leastclass"))'));
check('the capital\'s least follows the fighter\'s: the fighter\'s least at 10 gives the cruiser 32.5, at 24 gives it 78, and Reset puts 16 and 52 back', J(`(() => { campTuneResetAll(); const a = campZoomLeast(98); campTuneSet('leastfighter', 10); const b = campZoomLeast(98), f = campZoomLeast(22); campTuneSet('leastfighter', 24); const c = campZoomLeast(98); campTuneResetAll(); return [a, b, f, c, campZoomLeast(98), campZoomLeast(22)]; })()`).join() === '52,32.5,10,78,52,16');
check('the ratio row sets the capital\'s least: at 4 the cruiser is 64 and a raider (40 long) 27.4, at 1 every ship has the fighter\'s least (the proportion off)', J(`(() => { campTuneResetAll(); campTuneSet('leastclass', 4); const a = [campZoomLeast(98), +campZoomLeast(40).toFixed(1)]; campTuneSet('leastclass', 1); const b = [campZoomLeast(98), campZoomLeast(40), campZoomLeast(22)]; campTuneResetAll(); return [...a, ...b]; })()`).join() === '64,27.4,16,16,16');
check('with the fighter\'s least moved on the panel the cruiser is still at least 3 times a fighter at every zoom (the ratio is the proportion, whatever the pixels)', J(`(() => { campTuneResetAll(); const bad = []; [8, 12, 16, 20, 30].forEach(f => { campTuneSet('leastfighter', f); [0.02, 0.1, 0.335, 0.5, 1, 1.6].forEach(z => { const c = 98 * z * campZoomShipScale(z, 98), x = 22 * z * campZoomShipScale(z, 22); if (c < 3 * x - 1e-9) bad.push([f, z]); }); }); campTuneResetAll(); return bad; })()`).length === 0);
check('the words: the README, PROJECT_STATUS and the Campaign doc carry the proportion and the ratio row', /3\.25/.test(src('README.md')) && /3\.25/.test(src('PROJECT_STATUS.md')) && /3\.25/.test(src('docs/CAMPAIGN.md')));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
