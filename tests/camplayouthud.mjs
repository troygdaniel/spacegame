// smoke: Campaign layout 4: the three gauges, the hull bar and the ore line are gone from the top right, the wave and goal lines (and Earth, repair, outpost) stand at the top centre, the bottom key line is the five flying keys (plain Node, no Chrome)
// Card space-game-layout-hud (Troy, 24 Nov 2026; ORCH's assumption: the Earth, repair and outpost lines go to the top centre too, because the top left is the S CRUISER corner of card space-game-layout-cruiser).
//   A. the table: the lines are a column at the top centre (CAMP.hud.text x 640, y 6, pitch 18), the plate is centred
//   B. flowHud: the order wave, goal, Earth (with its bar), repair, outpost; a line with nothing to say gives its place back; the mothership's name goes 2 px under the column and its bar 20 px under
//   C. the scene's source: no dial, no gauge texts, no ore text, nothing at the top left, the missile count where it was
//   D. the bottom key line: Arrows fly  Space turrets  M missile  Tab Map  H Keys, no list key, no S Cruiser; and it fits
//   E. the rival's bars stand under the column, wherever it ends
// Run: node tests/camplayouthud.mjs   (exit code 1 on a failed check)
import { readFileSync, existsSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const scene = src('src/campaignscene.js');

console.log('A. the table');
{
  const H = J('CAMP.hud'), W = J('W');
  check('the lines of text are a column at the TOP CENTRE: centred on the screen\'s middle, the first at y 6, 18 px apart', H.text.x === W / 2 && H.text.y === 6 && H.text.pitch === 18, JSON.stringify(H.text));
  check('the dim plate is 560 wide, centred on the same x, so it stays between the two top corners (x 360 to 920)', H.plate.w === 560 && H.text.x - H.plate.w / 2 >= 360 && H.text.x + H.plate.w / 2 <= 920 && H.plate.min <= 46, JSON.stringify(H.plate));
}

console.log('B. flowHud');
{
  g.run(`window.__mkT = t => { const o = { text: t, y: -1, setY(v) { o.y = v; return o; } }; return o; };
    window.__flow = (lines, earth) => { const bars = [], sc = { camp: { earth: earth ? { shield: 50, max: 100 } : null }, hud: { wave: __mkT(lines[0]), obj: __mkT(lines[1]), earth: __mkT(lines[2]), repair: __mkT(lines[3]), post: __mkT(lines[4]), mother: __mkT('MOTHERSHIP') }, hudBack: { setSize(w, h) { sc.plate = [w, h]; return sc; } } }; Campaign.prototype.flowHud.call(sc, (...a) => bars.push(a)); return { ys: ['wave', 'obj', 'earth', 'repair', 'post'].map(k => sc.hud[k].y), mother: sc.hud.mother.y, below: sc.hudBelow, bars, plate: sc.plate }; };`);
  const p = J('CAMP.hud.text.pitch'), y0 = J('CAMP.hud.text.y');
  const a = J(`__flow(['WAVE 1 OF 3', 'GOAL', '', '', ''], false)`);
  check('wave then goal, one under the other from y 6; the empty lines are left where they were', a.ys[0] === y0 && a.ys[1] === y0 + p && a.ys[2] === -1 && a.ys[3] === -1 && a.ys[4] === -1, JSON.stringify(a));
  check('the column ends under the goal line, and the mothership\'s name goes 2 px under that', a.below === y0 + 2 * p && a.mother === a.below + 2, JSON.stringify([a.below, a.mother]));
  const b = J(`__flow(['WAVE 1 OF 3', 'GOAL', 'EARTH 50%', 'REPAIR 1  8 s', 'OUTPOST'], true)`);
  check('with all five the order is wave, goal, Earth, repair, outpost; Earth\'s bar is centred under its line and takes 12 px more', b.ys[0] === y0 && b.ys[1] === y0 + p && b.ys[2] === y0 + 2 * p && b.ys[3] === y0 + 3 * p + 12 && b.ys[4] === y0 + 4 * p + 12 && b.bars.length === 1 && b.bars[0][0] === J('W') / 2 - 110 && b.bars[0][1] === b.ys[2] + 18 && b.bars[0][2] === 220, JSON.stringify(b));
  check('the plate follows the column and is as wide as the table says', b.plate[0] === J('CAMP.hud.plate.w') && b.plate[1] === b.below + J('CAMP.hud.plate.pad') - (y0 - 6), JSON.stringify([b.plate, b.below]));
}

console.log('C. the scene');
{
  check('the gauges are not made, painted or hidden, and the ore line is not written: no campGaugesMake, campGaugesPaint, campGaugesVisible, hud.gauges, hud.ore, camp.ui.ore in the scene', !/campGaugesMake|campGaugesPaint|campGaugesVisible|hud\.gauges|hud\.ore|camp\.ui\.ore/.test(scene));
  check('the source file of the dials\' picture cache is gone, and the page does not load it', !existsSync(ROOT + '/src/campgaugecache.js') && !/campgaugecache/.test(src('index.html')));
  check('the HUD lines are made centred (mid): wave, goal, Earth, repair, outpost, each on x = CAMP.hud.text.x with its origin at the middle', /const mid = \(y, size, color\) => t\(CAMP\.hud\.text\.x, y, size, color\)\.setOrigin\(0\.5, 0\)/.test(scene) && /earth: mid\(/.test(scene) && /wave: mid\(/.test(scene) && /obj: mid\(/.test(scene) && /post: mid\(/.test(scene) && /this\.hud\.repair = mid\(/.test(scene));
  check('nothing of the HUD is written at the top left any more: no text is made at x 24 near the top (the S CRUISER corner has it)', !/\bt\(24, \d+,/.test(scene) && !/\bmid\(\d+, 14, '#[0-9a-f]+'\)\.setX/.test(scene));
  check('flowHud orders wave, obj, earth, repair, post', /ids = \['wave', 'obj', 'earth', 'repair', 'post'\]/.test(scene));
  check('the mothership\'s bar is drawn 20 px under the column (this.hudBelow), and its name 2 px under', /bar\(W \/ 2 - 150, \(this\.hudBelow \|\| 0\) \+ 20, 300, m\.hp \/ m\.maxHp, 0xc9a0ff\)/.test(scene) && /H\.mother\.setY\(F\.bottom \+ 2\)/.test(scene));
  check('the missile count is not bottom left any more: it is the status block\'s fourth line at the top left (card space-game-missiles-cost-ore): no text of it in the scene, the HUD has crMis', !/hud\.missiles|H - CAMP\.tdisp\.count/.test(scene) && /crMis: mk\(/.test(readFileSync(new URL('../src/campcruiserhud.js', import.meta.url), 'utf8')));
  check('the bars\' animation is kept for the power list\'s rows', /this\.gaugeAnim = campGaugeAnimNew\(this\.camp\.power\.p\)/.test(scene) && /campGaugeAnim\(this\.gaugeAnim/.test(scene));
}

console.log('D. the bottom key line');
{
  const k = J('campKeyLine()');
  check('it is Arrows fly  Space turrets  M missile  Tab Map  H Keys, from the table\'s keys', k === 'Arrows fly  Space turrets  M missile  Tab Map  H Keys' && k === J(`uiText('camp.ui.keys')`), k);
  check('it has no list key and no S Cruiser, no placeholder, and fits the screen (8.6 px a letter from x 24 to 1272)', !/Cruiser|Fleet|Power|Autopilot|Dock|[{}]/.test(k) && 24 + k.length * 8.6 <= 1272, k.length + ' letters');
  check('the text file and the default say the same, with no {panels}', /\| camp\.ui\.keys \| \{keyfly\} fly  \{keyfire\} turrets  \{keymissile\} missile  \{keymap\} Map  \{keyhelp\} Keys \|/.test(src('content/text/ui.md')) && !/\{panels\}/.test(src('content/text/ui.md')) && !/'camp\.ui\.keys': '\{panels\}/.test(src('src/contenttables.js')));
  check('the lists\' keys are still read from the table (campPanelKeyLine), for the ship computer and the H page', J('campPanelKeyLine()') === 'Q Cruiser  W Fleet  E Friends    ', J('campPanelKeyLine()'));
}

console.log('E. the rival\'s bars');
{
  g.run(`window.__rv = (below) => { const bars = [], calls = [], mk = () => { const o = { y: -1, setText() { return o; }, setColor() { return o; }, setAlpha() { return o; }, setY(v) { o.y = v; return o; }, setOrigin() { return o; } }; return o; };
    const C = campNew(1, [], { seed: 1 }); const u = campSpawn(C, 'gunship', C.carrier.x + 900, C.carrier.y); u.rival = { id: 'leader', kind: 'pirateleader', name: 'Pirate leader', ph: 'stalk', at: 0, until: 5, shMax: 100, sh: 100, hitAt: -1e9 };
    const sc = { camp: C, hudBelow: below, hud: { rivalName: mk(), rivalPhase: mk() }, add: { text: () => mk() } };
    try { campRivalHud(sc, null, (...a) => bars.push(a)); } catch (e) { return { err: String(e) }; } return { ys: bars.map(b => b[1]), name: sc.hud.rivalName.y, phase: sc.hud.rivalPhase.y }; };`);
  const D = J('CAMP_RIVAL_DRAW.hud');
  check('the table holds distances from the column\'s end now: name 0, shield bar 20, hull bar 34, phase line 49', D.nameY === 0 && D.shieldY === 20 && D.hullY === 34 && D.phaseY === 49, JSON.stringify(D));
  const r = J('__rv(60)');
  check('with the column ending at y 60 the name is at 62, the shield bar at 82, the hull bar at 96 and the phase line at 111', !r.err && r.name === 62 && r.ys.join() === '82,96' && r.phase === 111, JSON.stringify(r));
  const r0 = J('__rv(42)');
  check('with only the wave and the goal (the column ends at y 42) the name is at 44 and the bars at 64 and 78', !r0.err && r0.name === 44 && r0.ys.join() === '64,78', JSON.stringify(r0));
}

console.log('\nthe game made ' + (g.errors.length ? 'errors: ' + g.errors.join(' | ') : 'no errors'));
check('the game made no error', g.errors.length === 0);
console.log(failed ? `\nCAMPLAYOUTHUD FAIL (${failed} of ${n})` : `\nCAMPLAYOUTHUD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
