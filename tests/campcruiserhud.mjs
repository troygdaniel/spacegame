// smoke: the cruiser's status at the top left (SHIELD bar, HULL bar, ORE line over the S CRUISER title): its numbers, places, words and drawing on stand-ins (plain Node, no Chrome)
// Card space-game-layout-cruiser (ORCH for Troy, 24 Nov 2026: "top left is what I command": the S list becomes the S CRUISER corner, and above its title sit a shield bar, a hull bar and the ore count, moved from the
// round gauges and the ore line at the top right). The code is src/campcruiserhud.js (own numbers, own words camp.cruiser.*, nothing from src/camphud.js), hooked in src/campaignscene.js.
//   A. the numbers: shield and hull as a share of their top, red at or under the low mark, the ore line with the credits and the ships being mended
//   B. the places: inside the screen, as wide as the S list's box, lines one under another, the title's place (bottom) under the last line
//   C. the words: four keys in a words file and in the table, a voicepack rule, the script loaded once
//   D. the drawing on stand-ins: a plate, two bars of the right widths and colours, the texts say the numbers; plain rectangles only; nothing drawn by a scene with no texts
//   E. the scene: it makes the texts into its HUD and paints them every frame; nothing of src/camphud.js is called from the new file
// Run: node tests/campcruiserhud.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__new = () => campNew('home', [], { seed: 1, god: true });
  window.__stand = () => { const calls = [], rec = k => (...a) => { calls.push([k].concat(a)); return gg; }, gg = { calls, fillStyle: rec('fillStyle'), fillRect: rec('fillRect'), lineStyle: rec('lineStyle'), strokeRect: rec('strokeRect'), fillRoundedRect: rec('fillRoundedRect'), strokeRoundedRect: rec('strokeRoundedRect') };
    const tx = () => { const t = { text: '', color: '', setText(v) { t.text = String(v); return t; }, setColor(c) { t.color = c; return t; } }; return t; };
    return { gg, H: { crShieldL: tx(), crShieldN: tx(), crHullL: tx(), crHullN: tx(), crOre: tx() } }; };
`);

// ---- A. the numbers ----
{
  g.run(`window.C1 = __new(); C1.shield = campShieldMax(C1); C1.carrier.hp = C1.carrier.maxHp; C1.ore = 0; C1.cash = 0; C1.mends = [];`);
  const S = J('campCruiserStatus(C1)'), smax = J('campShieldMax(C1)'), hmax = J('C1.carrier.maxHp');
  check('a full shield and a full hull are 1 and say their numbers; neither is in warning', S.shield.frac === 1 && S.hull.frac === 1 && S.shield.n === Math.round(smax) && S.hull.n === Math.round(hmax) && !S.shield.warn && !S.hull.warn, JSON.stringify(S));
  g.run(`C1.shield = campShieldMax(C1) * 0.5; C1.carrier.hp = C1.carrier.maxHp * 0.25;`);
  const H = J('campCruiserStatus(C1)');
  check('half a shield is 0.5 and not in warning; a quarter of the hull is 0.25 and in warning (at or under 0.3)', Math.abs(H.shield.frac - 0.5) < 1e-9 && !H.shield.warn && Math.abs(H.hull.frac - 0.25) < 1e-9 && H.hull.warn, JSON.stringify(H));
  g.run(`C1.shield = campShieldMax(C1) * 0.3; C1.carrier.hp = C1.carrier.maxHp * 0.31;`);
  const E = J('campCruiserStatus(C1)');
  check('the mark is "at or under": 0.3 warns, 0.31 does not', E.shield.warn && !E.hull.warn, JSON.stringify(E));
  g.run(`C1.shield = -5; C1.carrier.hp = -3;`);
  const Z = J('campCruiserStatus(C1)');
  check('a shield or hull under zero reads 0, never a negative bar or number', Z.shield.frac === 0 && Z.hull.frac === 0 && Z.shield.n === 0 && Z.hull.n === 0, JSON.stringify(Z));
  g.run(`C1.ore = 87.9; C1.cash = 0; C1.mends = [];`);
  check('the ore line is the ore (whole) over the cap, with no credits and no mends when there are none', J('campCruiserOreLine(campCruiserStatus(C1))') === 'ORE  87/' + J('CAMP.ore.cap'), J('campCruiserOreLine(campCruiserStatus(C1))'));
  g.run(`C1.cash = 40.6; C1.mends = [{}, {}];`);
  check('with credits and two ships being mended: the credits, then +2', J('campCruiserOreLine(campCruiserStatus(C1))') === 'ORE  87/' + J('CAMP.ore.cap') + '   CREDITS  40  +2', J('campCruiserOreLine(campCruiserStatus(C1))'));
  g.run(`C1.ore = CAMP.ore.cap;`);
  check('a full hold is marked full (the line turns amber)', J('campCruiserStatus(C1).ore.full') === true);
  g.run(`C1.ore = 10;`);
  check('a hold with room is not full', J('campCruiserStatus(C1).ore.full') === false);
}

// ---- B. the places ----
{
  const Z = J('campCruiserHudGeom()'), K = J('CAMPCRUISERHUD'), W = J('W'), box = J('CAMPPANELS_LOOK.box');
  check('the block is in the top left corner, inside the screen', Z.x0 >= 0 && Z.y0 >= 0 && Z.x1 <= W / 2 && Z.y1 < 120, JSON.stringify(Z));
  check('it is as wide as the S list\'s box, so the corner is one column', Z.x1 - Z.x0 === box.w, Z.x1 - Z.x0 + ' vs ' + box.w);
  check('the shield line is above the hull line, the ore line under both, each one line apart', Z.rows[0].id === 'shield' && Z.rows[1].id === 'hull' && Z.rows[1].label.y - Z.rows[0].label.y === K.row && Z.ore.y - Z.rows[1].label.y === K.row);
  check('a bar is inside the plate, with room for its word at the left and its number at the right, and is at least 120 px long', Z.rows.every(r => r.bar.x0 >= Z.x0 + K.pad + K.label && r.bar.x1 <= Z.x1 - K.pad - K.num && r.bar.x1 - r.bar.x0 >= 120 && r.bar.y1 - r.bar.y0 === K.bar), JSON.stringify(Z.rows));
  check('the plate covers the three lines', Z.plate.x === Z.x0 && Z.plate.y <= Z.rows[0].bar.y0 && Z.plate.y + Z.plate.h >= Z.ore.y + K.row / 2 - 1, JSON.stringify(Z.plate));
  check('the title\'s place (bottom) is under the last line and leaves the gap', Z.bottom === Z.y1 + K.gap && Z.bottom > Z.ore.y, Z.bottom);
}

// ---- C. the words and the files ----
{
  const keys = ['camp.cruiser.shield', 'camp.cruiser.hull', 'camp.cruiser.ore', 'camp.cruiser.credits'], md = src('content/text/campaign-cruiser.md'), ct = src('src/contenttables.js'), vp = src('src/voicepack.js'), html = src('index.html');
  check('the four words are in the words file and in the table with the same text', keys.every(k => { const m = md.match(new RegExp('\\| ' + k.replace(/\./g, '\\.') + ' \\| (.+?) \\|')), t = ct.match(new RegExp("'" + k.replace(/\./g, '\\.') + "': '(.+?)'")); return m && t && m[1] === t[1]; }));
  check('they read SHIELD, HULL, ORE, CREDITS', J('[uiText("camp.cruiser.shield"), uiText("camp.cruiser.hull"), uiText("camp.cruiser.ore"), uiText("camp.cruiser.credits")]').join() === 'SHIELD,HULL,ORE,CREDITS');
  check('each key is in no other words file (no key was reused)', keys.every(k => (md.split('| ' + k + ' |').length === 2) && ['content/text/campaign-gauges.md', 'content/text/campaign.md', 'content/text/campaign-rim.md'].every(f => !src(f).includes('| ' + k + ' |'))));
  check('the voicepack says they are shown, not said', /camp\\\.cruiser\\\./.test(vp));
  check('index.html loads src/campcruiserhud.js once', html.split('src/campcruiserhud.js').length === 2);
}

// ---- D. the drawing on stand-ins ----
{
  g.run(`window.C2 = __new(); C2.shield = campShieldMax(C2) * 0.5; C2.carrier.hp = C2.carrier.maxHp; C2.ore = 55; C2.cash = 0; C2.mends = []; window.ST = __stand(); campCruiserHudPaint(ST.gg, ST.H, C2);`);
  const calls = J('ST.gg.calls'), H = J('ST.H'), Z = J('campCruiserHudGeom()'), K = J('CAMPCRUISERHUD');
  const rects = calls.filter(c => c[0] === 'fillRect');
  check('it draws a plate and, for each of the two bars, a back and a fill (five filled rectangles) and strokes both bars', rects.length === 5 && calls.filter(c => c[0] === 'strokeRect').length === 2, rects.length);
  const sh = Z.rows[0].bar, w = sh.x1 - sh.x0;
  check('the shield fill is half the bar wide, from the bar\'s left', rects[2][1] === sh.x0 && Math.abs(rects[2][3] - w * 0.5) < 1e-6, JSON.stringify(rects));
  check('the hull is full: its fill is the whole bar', Math.abs(rects[4][3] - (Z.rows[1].bar.x1 - Z.rows[1].bar.x0)) < 1e-6, JSON.stringify(rects[4]));
  check('the texts say the numbers: shield, hull, and the ore line', H.crShieldN.text === String(Math.round(J('C2.shield'))) && H.crHullN.text === String(Math.round(J('C2.carrier.hp'))) && H.crOre.text === 'ORE  55/' + J('CAMP.ore.cap'), JSON.stringify(H));
  check('a bar in warning is drawn red and its number is red', (() => { g.run(`C2.carrier.hp = C2.carrier.maxHp * 0.1; ST = __stand(); campCruiserHudPaint(ST.gg, ST.H, C2);`); const cs = J('ST.gg.calls').filter(c => c[0] === 'fillStyle'); return cs.some(c => c[1] === K.color.warn) && J('ST.H.crHullN.color') === K.ink.warn && J('ST.H.crShieldN.color') === K.ink.num; })());
  check('no rounded frame is drawn (a rounded rectangle is triangulated again on every render)', !J('ST.gg.calls').some(c => /Rounded/.test(c[0])) && !/Rounded/.test(src('src/campcruiserhud.js').replace(/\/\/.*$/gm, '')));
  check('a scene with none of the texts draws nothing and does not throw', (() => { g.run(`ST = __stand(); campCruiserHudPaint(ST.gg, {}, C2); campCruiserHudPaint(ST.gg, null, C2);`); return J('ST.gg.calls').length === 0; })());
}

// ---- E. the scene and the old gauges ----
{
  const own = src('src/campcruiserhud.js').replace(/\/\/.*$/gm, ''), sc = src('src/campaignscene.js');
  check('the new file calls nothing of src/camphud.js (campHudGeom, campGauges, campHullBar, CAMP_GAUGE, hud.ore): the gauges can go without it', !/campHudGeom|campGauges|campHullBar|CAMP_GAUGE|CAMP\.hud\.ore|hud\.ore/.test(own));
  check('the scene makes the texts into its HUD (so a result card hides them) and paints them every frame', /Object\.assign\(this\.hud, campCruiserHudMake\(this, uiFont\)\)/.test(sc) && /campCruiserHudPaint\(g, this\.hud, C\)/.test(sc));
  check('the five texts are the HUD\'s own keys, none of the keys the HUD already has', (() => { const k = ['crShieldL', 'crShieldN', 'crHullL', 'crHullN', 'crOre']; return k.every(x => (sc.match(new RegExp('\\b' + x + '\\b', 'g')) || []).length === 0) && /crShieldL.*crShieldN.*crHullL.*crHullN.*crOre/s.test(src('src/campcruiserhud.js')); })());
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCRUISER STATUS HUD FAIL (${failed} of ${n})` : `\nCRUISER STATUS HUD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
