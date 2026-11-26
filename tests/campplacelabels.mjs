// smoke: the two labels of a place (its name and its outpost: CERES and OCCATOR WORKS) never stand on each other at any zoom (plain Node, no Chrome)
// Card space-game-12-place-labels-overlap (9-GEN's browser batch, main 7bd0dda2: page HUD off, the start of 1.2, the two labels were drawn one on the other). The camera's zoom draws a world label 1/zoom times its size when zoomed out
// (src/camzoom.js camzoomLabelScale; up to 6 in the Campaign) but the labels' places did not move. src/campplacelabels.js is the rule; the scene half (drawPlace's placeSets, the fit on the postupdate event) is checked on a stand-in.
//   A  at scale 1 the labels stand where they always stood (Ceres: 126 and 100 above its centre; Luna: 81 and 101, one px apart from before)
//   B  the sweep: every scale from 1 to 6 and a planet of any size: the two label boxes do not touch and both are over the planet's top
//   C  the real places of the levels that have an outpost; the start zoom of the flight view (0.335) gives the scale the picture was found at
//   D  the scene half on a stand-in: scale to places, only a label that is not there is moved, a pair taken down is let go, a place without an outpost has one label, the page HUD's hide is not touched
// Run: node tests/campplacelabels.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const HN = 10, HB = 8.125; // half the height of a 16 px and a 13 px line (1.25 line height), at scale 1

console.log('A. at scale 1 the labels stand where they stood');
{
  const c = J('campPlaceLabelAt(90, 1, true)'), l = J('campPlaceLabelAt(45, 1, true)'), o = J('campPlaceLabelAt(30, 1, false)');
  check('Ceres (r 90): the name 126 over its centre, the outpost 100 over it and 70 to the right', c.name.x === 0 && c.name.y === -126 && c.base.x === 70 && c.base.y === -100, JSON.stringify(c));
  check('Luna (r 45): the name 81 over its centre, the outpost over it (101: one px from before)', l.name.y === -81 && l.base.x === 70 && l.base.y === -101, JSON.stringify(l));
  check('a place with no outpost: the name alone, base null', o.name.y === -66 && o.base === null, JSON.stringify(o));
  check('a scale under 1 or none is 1', J('campPlaceLabelAt(90, 0.5, true).name.y') === -126 && J('campPlaceLabelAt(90, 0, true).base.y') === -100 && J('campPlaceLabelAt(90, undefined, true).name.y') === -126);
}

console.log('B. the sweep');
{
  let bad = [], worst = 1e9, over = 0;
  for (const r of [20, 45, 60, 64, 80, 90, 120, 200]) for (let ls = 1; ls <= 6.01; ls += 0.25) {
    const a = J(`campPlaceLabelAt(${r}, ${ls}, true)`), gap = Math.abs(a.base.y - a.name.y) - (HN + HB) * ls, nameTop = a.name.y + HN * ls, baseTop = a.base.y + HB * ls;
    worst = Math.min(worst, gap);
    const moved = a.base.y !== -(60 + 40 * ls); // the outpost label that stays over its station may stand over a big planet's face (as it always did); one that was moved stays over the planet's top
    if (gap < 1 || nameTop > -r || (moved && baseTop > -r)) bad.push(`r${r} ls${ls}: gap ${gap.toFixed(1)} name bottom ${nameTop.toFixed(0)} base bottom ${baseTop.toFixed(0)}`);
    over++;
  }
  check(`${over} planets and scales: the name's and the outpost's boxes keep a gap, and the name is above the planet's top edge, and so is an outpost label that had to move`, bad.length === 0, bad.slice(0, 3).join(' | '));
  check('the smallest gap between the two boxes is at least 1 px of the world (about 2 at scale 1)', worst >= 1, String(worst));
  const before = (r, ls) => { const nameY = -(r + 36), baseY = -100; return Math.abs(baseY - nameY) - (HN + HB) * ls; }; // what the old fixed places gave
  check('the old places overlap at the start zoom\'s scale (this is the bug: 26 px apart, 3 times as big)', before(90, 2.98) < 0, String(before(90, 2.98)));
}

console.log('C. the places of the levels, and the start zoom');
{
  const all = J(`(() => { const out = []; Object.keys(CAMP.levels).forEach(lv => { const pl = campPlaces(lv); Object.keys(pl).forEach(id => { const p = pl[id]; if (p && p.base && !p.hidden) out.push({ lv, id, r: p.r || 60 }); }); }); return out; })()`);
  check('Ceres and Luna are among the places with an outpost', all.some(p => p.id === 'ceres') && all.some(p => p.id === 'luna'), JSON.stringify(all));
  const bad = [];
  all.forEach(p => { for (let ls = 1; ls <= 6; ls += 0.5) { const a = J(`campPlaceLabelAt(${p.r}, ${ls}, true)`); if (Math.abs(a.base.y - a.name.y) - (HN + HB) * ls < 1) bad.push(p.lv + ' ' + p.id + ' ' + ls); } });
  check('every place with an outpost, in every level, keeps its two labels apart from scale 1 to 6', bad.length === 0, bad.join(','));
  g.run('CAMZOOM.labelMax = CAMPZOOM.view.labelMax;'); // what the Campaign sets when a flight starts (campZoomRange)
  const z = J('campZoomStart()'), ls = J(`camzoomLabelScale(${z})`);
  check('the start zoom of the flight view is 0.335 and the labels are drawn about 3 times their size there', Math.abs(z - 0.335) < 0.01 && ls > 2.9 && ls < 3.1, z + ' ' + ls);
  const a = J(`campPlaceLabelAt(90, ${ls}, true)`);
  check('at that scale Ceres\'s two labels are 60 px apart in the world (20 on the screen): clear, as the picture needs', Math.abs(a.base.y - a.name.y) >= 20 * ls - 0.001 && a.name.y < a.base.y, JSON.stringify(a));
}

console.log('D. the scene half on a stand-in');
{
  g.run(`
    window.__lab = (x, y, sc) => ({ x, y, scaleX: sc || 1, active: true, moves: 0, setPosition(a, b) { this.x = a; this.y = b; this.moves++; return this; } });
    window.__sc = () => { const on = {}, off = []; return { events: { on: (k, f) => { (on[k] = on[k] || []).push(f); }, once: (k, f) => { (on['once:' + k] = on['once:' + k] || []).push(f); }, off: (k, f) => { off.push(k); on[k] = (on[k] || []).filter(x => x !== f); } }, on, off, placeSets: [] }; };
  `);
  g.run(`window.S = __sc(); window.P1 = { x: 0, y: 0, r: 90 }; window.P2 = { x: 238, y: -137, r: 45 }; window.P3 = { x: 500, y: 500, r: 30 };
    window.A = { p: P1, nm: __lab(0, -126), pb: __lab(70, -100) }; window.B = { p: P2, nm: __lab(238, -218), pb: __lab(308, -237) }; window.D = { p: P3, nm: __lab(500, 434), pb: null };
    S.placeSets.push(A, B, D); campPlaceLabelsFit(S);`);
  check('at scale 1 nothing is moved (they are where the rule says), but Luna\'s outpost label goes its one px', J('A.nm.moves') === 0 && J('A.pb.moves') === 0 && J('B.pb.moves') === 1 && J('B.pb.y') === -238 && J('D.nm.moves') === 0);
  g.run(`A.nm.scaleX = A.pb.scaleX = B.nm.scaleX = B.pb.scaleX = D.nm.scaleX = 2.98; campPlaceLabelsFit(S);`);
  const ca = J('({ n: [A.nm.x, A.nm.y], b: [A.pb.x, A.pb.y] })'), ex = J('campPlaceLabelAt(90, 2.98, true)');
  check('zoomed out (scale 2.98): Ceres\'s two labels are put at the rule\'s places, in the world', ca.n[0] === 0 && Math.abs(ca.n[1] - ex.name.y) < 1e-9 && ca.b[0] === 70 && Math.abs(ca.b[1] - ex.base.y) < 1e-9 && ca.n[1] < ca.b[1], JSON.stringify(ca));
  check('another place: the offsets are from ITS centre (x + 238, y - 137), and a place with no outpost moves its name alone', J('B.nm.x') === 238 && J('B.pb.x') === 308 && J('B.pb.y') < J('B.nm.y') && J('D.nm.y') === 500 + J('campPlaceLabelAt(30, 2.98, false).name.y') && J('D.pb') === null);
  g.run(`A.nm.moves = A.pb.moves = 0; campPlaceLabelsFit(S);`);
  check('a second fit at the same scale moves nothing', J('A.nm.moves') === 0 && J('A.pb.moves') === 0);
  g.run(`B.nm.active = false; campPlaceLabelsFit(S);`);
  check('a pair that was taken down (a far place) is let go of', J('S.placeSets.length') === 2 && J('S.placeSets.indexOf(B)') === -1);
  g.run(`window.S2 = __sc(); campPlaceLabelsInstall(S2);`);
  check('install: one listener on the scene\'s postupdate event; shutdown takes it off', J('S2.on.postupdate.length') === 1 && J(`(S2.on['once:shutdown'][0](), S2.off.includes('postupdate') && S2.on.postupdate.length === 0)`) === true);
  check('no scene, no sets, no events: nothing happens', J('(campPlaceLabelsFit(null), campPlaceLabelsFit({}), campPlaceLabelsInstall(null), campPlaceLabelsInstall({}), true)') === true);
}

console.log('E. the files');
{
  const sc = src('src/campaignscene.js'), html = src('index.html'), ps = html.indexOf('src/campplacelabels.js'), cs = html.indexOf('src/campaignscene.js');
  check('the file is in index.html before the Campaign scene', ps > 0 && cs > ps);
  check('drawPlace keeps each pair (placeSets: with the picture, radius and own scale the far zoom draws up, card space-game-far-zoom-ugly) and still registers both labels for the page HUD to hide (placeLabels)', /placeSets = this\.placeSets \|\| \[\]\)\.push\(\{ p, nm, pb(, im, r, base: im\.scaleX)? \}\)/.test(sc) && /this\.placeLabels\.push\(pb\)/.test(sc) && /\(this\.placeLabels = this\.placeLabels \|\| \[\]\)\.push\(nm\)/.test(sc));
  check('create installs the fit AFTER the camera zoom is set up (it runs on the same event, after the zoom scaled the labels)', sc.indexOf('camzoomSetup(this)') > 0 && sc.indexOf('campPlaceLabelsInstall(this)') > sc.indexOf('camzoomSetup(this)'));
  check('the page HUD is as it was: it hides the labels by visibility and has no word of the places\' positions', /placeLabels \|\| \[\]\)\.forEach/.test(src('src/camppagehud.js')) && !/placeSets|campPlaceLabel/.test(src('src/camppagehud.js')));
  check('the labels of the Long Haul and every other scene are not touched: the rule is only called from the Campaign scene', !/campPlaceLabel/.test(src('src/camzoom.js')) && !/campPlaceLabel/.test(src('src/common.js')));
}

console.log(failed ? `\nPLACE LABELS FAIL: ${failed} of ${n} checks failed` : `\nPLACE LABELS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
