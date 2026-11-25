// smoke: the new ship look in the target panel and the briefing: with the switch on the picture of a ship is the flat-cut texture of its side, the same one the flight view has, with no tint; with it off today's pictures, and a pod, a rock or ore never change (plain Node, no Chrome)
// Card space-game-ship-look-e-panel-brief (landing E of the ship look; Troy, 25 Nov 2026, decision 8 of the report on card space-game-ship-look-scope). src/shiplookpic.js is the one function (slookPic) the panel (src/camptcornerscene.js) and the
// briefing (src/campbriefdraw.js) ask; the textures and the sides are landing A's (src/shiplookdraw.js, src/shiplook.js).
//   A  slookPic: the key and scale of a kind for a side, nothing with the switch off or for what is not a ship
//   B  the target panel on a stand-in scene: the held enemy, a friend picked, a squad's fighter, a ship you protect; the texture is made once; a switch flipped while the panel shows is felt at once; no tint in the new look
//   C  the briefing: campBriefSprite and campBriefDrawPic: the flat-cut ship of its usual side, no tint; today's with the switch off; pod, rock and ore unchanged
//   E  the picture as markup (slookPicSvg) for the page HUD's hostiles panel: the same outline, facet and colours as the textures
//   D  the rules: the switch is asked once for a pass, no picture is drawn by the page HUD, no image or web, the script is in the page after the others of the look
// Run: node tests/shiplookpic.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__new = () => { const C = campNew(1, [], { seed: 5, god: true, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); __run(C, 4); C.ships = C.ships.filter(u => u.team !== 'alien'); C.ships.forEach(u => { delete u.hurtAt; }); window.C = C; window.P = campPanelNew(); return C; };
  window.__foe = (kind, dx, dy) => { const u = campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy); u.vx = u.vy = 0; return u; };
  // a stand-in scene that makes textures (like landing A's): the keys it has, how many times each was made; the picture of the panel remembers its texture, tint, rotation and scale
  window.__scene = () => {
    const tex = new Set(), made = [], gs = [], objs = [];
    const mkMake = () => { const ops = []; const gfx = new Proxy({}, { get: (t, name) => name === 'generateTexture' ? (key, w, h) => { tex.add(key); made.push(key); } : name === 'destroy' ? () => {} : (...a) => { ops.push(name); return gfx; } }); return gfx; };
    const mkG = () => { const o = { clears: 0, log: [] }; ['fillStyle', 'lineStyle', 'fillRoundedRect', 'strokeRoundedRect', 'fillRect', 'strokeRect', 'lineBetween'].forEach(k => { o[k] = (...a) => { o.log.push([k].concat(a)); return o; }; }); o.clear = () => { o.clears++; o.log = []; return o; }; o.setScrollFactor = () => o; o.setDepth = () => o; return o; };
    const mkT = () => { const o = { text: '', x: 0, y: 0, vis: false, sets: 0, alpha: 1, style: { color: '#ffffff' }, width: 60, height: 14 }; ['setScrollFactor', 'setDepth', 'setOrigin'].forEach(k => { o[k] = () => o; }); o.setText = v => { o.text = v; o.sets++; return o; }; o.setColor = v => { o.style.color = v; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.setAlpha = a => { o.alpha = a; return o; }; objs.push(o); return o; };
    const mkP = () => { const pic = { vis: false, tex: '', textures: 0, tint: -1, sc: 0, rot: 0, x: 0, y: 0, alpha: 1, width: 64, height: 32 }; ['setScrollFactor', 'setDepth'].forEach(k => { pic[k] = () => pic; }); pic.setTexture = t => { pic.tex = t; pic.textures++; return pic; }; pic.setRotation = r => { pic.rot = r; return pic; }; pic.setTint = t => { pic.tint = t; return pic; }; pic.clearTint = () => { pic.tint = -1; return pic; }; pic.setScale = k => { pic.sc = k; return pic; }; pic.setPosition = (x, y) => { pic.x = x; pic.y = y; return pic; }; pic.setVisible = v => { pic.vis = v; return pic; }; pic.setAlpha = a => { pic.alpha = a; return pic; }; return pic; };
    return { gs, objs, tex, made, camp: C, pn: P, mode: 'play', hud: {}, textures: { exists: k => tex.has(k) || !/^look-/.test(k) }, make: { graphics: () => mkMake() }, texOf: k => 'tex-' + k, add: { graphics: () => mkG(), text: mkT, image: mkP } };
  };
`);

console.log('A. slookPic');
g.run(`__new(); window.S = __scene(); CAMP.flags.shiplook = false;`);
check('the switch off: none, for every kind (today\'s picture is used)', J('slookKinds().every(k => slookPic(S, k) === null)') === true && J('S.made.length') === 0);
g.run(`CAMP.flags.shiplook = true;`);
const sides = { carrier: 'friend', fighter: 'friend', freighter: 'protect', miner: 'protect', patrol: 'neutral', skiff: 'foe', cutter: 'foe', brute: 'foe', tboat: 'foe', pirateleader: 'foe', raider: 'alien', drone: 'alien', gunship: 'alien', lancer: 'alien', mother: 'alien', tower: 'alien' };
check('the switch on: every kind of the table has a picture, the key look-<kind>-<its usual side> (landing A\'s name), the scale that makes the hull as long as it is drawn in the battle, and the side', Object.keys(sides).every(k => { const p = J(`slookPic(S, ${JSON.stringify(k)})`); return p && p.key === `look-${k}-${sides[k]}` && p.side === sides[k] && near(p.scale, J(`slookScale(${JSON.stringify(k)})`)); }) && J('slookKinds().length') === Object.keys(sides).length);
check('the texture is made by the ships\' own function, once for a kind and side (asking again makes nothing)', J('S.made.length') === Object.keys(sides).length && (g.run(`slookKinds().forEach(k => slookPic(S, k));`), J('S.made.length') === Object.keys(sides).length) && J('new Set(S.made).size') === J('S.made.length'));
check('not a ship: a pod, a rock, ore, a kind with no row, none (today\'s picture stays)', ['pod', 'rock', 'ore', 'nothing', ''].every(k => J(`slookPic(S, ${JSON.stringify(k)})`) === null));
g.run(`window.MI = C.ships.find(u => u.kind === 'miner'); window.TR = C.ships.find(u => u.kind === 'freighter'); window.PA = C.ships.find(u => u.kind === 'patrol'); window.F0 = slookFrame(S);`);
check('with a ship: its side is the sim\'s: a transport you protect is amber, a miner you protect is amber (it is in campConvoyShips), a patrol is grey-blue; the same ship asked as a kind alone is its usual side', J('slookPic(S, "freighter", TR, F0).side') === 'protect' && J('slookPic(S, "patrol", PA, F0).side') === 'neutral' && J('slookPic(S, "miner", MI, F0).side') === J('slookSide(MI, campConvoyShips(C).indexOf(MI) >= 0)') && J('slookPic(S, "patrol").side') === 'neutral');
g.run(`window.PI = __foe('skiff', 500, 0); PI.faction = 'pirate'; window.AL = __foe('raider', 500, 100); window.F1 = slookFrame(S);`);
check('a pirate\'s skiff is pink (foe), an alien\'s raider violet: the unit\'s own faction decides, as for the ships in the flight view', J('slookPic(S, "skiff", PI, F1).side') === J('slookSide(PI, false)') && J('slookPic(S, "raider", AL, F1).side') === 'alien');
g.run(`delete S.camp; window.F2 = null;`);
check('a scene with no Campaign state (nothing to ask who is protected) still gives the usual side, and the switch off still none', J('slookPic(S, "freighter", TR).side') === 'protect' && (g.run(`CAMP.flags.shiplook = false;`), J('slookPic(S, "freighter", TR)') === null) && (g.run(`CAMP.flags.shiplook = true; S.camp = C;`), true));

console.log('B. the target panel');
g.run(`__new(); window.R1 = __foe("raider", 1200, 0); window.S = __scene(); CAMP.flags.shiplook = true; campTcornerLook(P, 0); campCornerSync(S, 0); campTcornerSync(S, 0); campTgtStep(C, 1); campCornerSync(S, 1000); campTcornerSync(S, 1000);`);
const V = 'S.hud.tcorner.hostiles';
check('an enemy held, the new look: the picture is the alien raider\'s flat-cut texture (violet), nose up, scaled to fit the frame (the stand-in picture is 64 by 32: P - 8 over 64), with no tint', J(V + '.pic.vis') === true && J(V + '.pic.tex') === 'look-raider-alien' && near(J(V + '.pic.rot'), -Math.PI / 2) && near(J(V + '.pic.sc'), (J('CAMP.tdisp.pic') - 8) / 64) && J(V + '.pic.tint') === -1);
check('the texture was made once, by the ships\' function, for that kind and side', J('S.made.filter(k => k === "look-raider-alien").length') === 1);
g.run(`window.N0 = ${V}.pic.textures; for (let t = 1100; t < 2000; t += 100) { campCornerSync(S, t); campTcornerSync(S, t); }`);
check('steady: the picture is not set again every frame (nothing changed)', J(V + '.pic.textures') === J('N0'));
g.run(`CAMP.flags.shiplook = false; campCornerSync(S, 2100); campTcornerSync(S, 2100);`);
check('the switch flipped off while it shows: today\'s picture at once (the texOf of the scene, its tint as before)', J(V + '.pic.tex') === 'tex-raider' && J(V + '.pic.textures') === J('N0') + 1);
g.run(`CAMP.flags.shiplook = true; campCornerSync(S, 2200); campTcornerSync(S, 2200);`);
check('and on again: the flat-cut one (not made again)', J(V + '.pic.tex') === 'look-raider-alien' && J('S.made.filter(k => k === "look-raider-alien").length') === 1);
g.run(`campFriStep(C, 1); campCornerSync(S, 3000); campTcornerSync(S, 3000);`);
const VF = 'S.hud.tcorner.friendlies';
check('a friend picked (the transport you protect): its picture is the amber transport, with no tint', J(VF + '.pic.vis') === true && /^look-(freighter|miner|fighter|patrol|carrier)-/.test(J(VF + '.pic.tex')) && J(VF + '.pic.tint') === -1, J(VF + '.pic.tex'));
g.run(`window.FI = C.ships.find(u => u.kind === 'fighter' && u.team === 'earth'); FI.squad = Object.keys(CAMP.wing.squadColor)[0]; C.fsel = ''; campTgtStep(C, 1); CAMP.flags.shiplook = true; campCornerSync(S, 3100);
  window.N2 = campCornerNow(C, 'hostiles'); window.IT = Object.assign({}, N2.items.find(x => x.kind === 'pic'), { ship: 'fighter', id: FI.id, side: 'friend' });
  window.V2 = campTcornerMake(S); campTcornerDraw(S, V2, N2, IT, slookFrame(S)); CAMP.flags.shiplook = false; window.V3 = campTcornerMake(S); campTcornerDraw(S, V3, N2, IT, slookFrame(S)); CAMP.flags.shiplook = true;`);
check('a fighter of a squad in the panel: the new look gives the pilot\'s flat-cut texture and NOT the squad\'s colour (the ships in the flight view are all drawn alike); the switch off gives today\'s picture in the squad\'s colour', J('V2.pic.tex') === 'look-fighter-friend' && J('V2.pic.tint') === -1 && J('V3.pic.tex') === 'tex-fighter' && J('V3.pic.tint') === J('CAMP.wing.squadColor[FI.squad]') && J('V3.pic.tint') !== -1, JSON.stringify([J('V2.pic.tex'), J('V2.pic.tint'), J('V3.pic.tex'), J('V3.pic.tint'), J('FI.squad')]));
g.run(`CAMP.flags.shiplook = true; window.N1 = S.made.length;`);

console.log('C. the briefing');
g.run(`CAMP.flags.shiplook = false;`);
const old = J('(() => { const o = {}; ["carrier", "fighter", "freighter", "skiff", "raider", "tower", "mother", "drone", "gunship", "cutter", "pod", "rock", "ore"].forEach(k => { const p = campBriefSprite(S, k); o[k] = p ? [p.key, p.scale, p.tint] : null; }); return o; })()');
g.run(`CAMP.flags.shiplook = true;`);
const neu = J('(() => { const o = {}; ["carrier", "fighter", "freighter", "skiff", "raider", "tower", "mother", "drone", "gunship", "cutter", "pod", "rock", "ore"].forEach(k => { const p = campBriefSprite(S, k); o[k] = p ? [p.key, p.scale, p.tint, !!p.np] : null; }); return o; })()');
check('the switch on: a ship of a briefing picture is its flat-cut texture (usual side), the scale of the battle, no tint, marked as the new look', ['carrier', 'fighter', 'freighter', 'skiff', 'raider', 'tower', 'mother', 'drone', 'gunship', 'cutter'].every(k => neu[k] && neu[k][0] === `look-${k}-${sides[k]}` && near(neu[k][1], J(`slookScale(${JSON.stringify(k)})`)) && neu[k][2] === 0 && neu[k][3] === true));
check('the switch off: today\'s (the art of CAMP_LOOK, its scale and tint), none of them the new keys; and pod, rock and ore are the same with the switch on or off', Object.keys(old).filter(k => !['pod', 'rock', 'ore'].includes(k)).every(k => old[k] && !/^look-/.test(old[k][0])) && ['pod', 'rock', 'ore'].every(k => JSON.stringify(old[k]) === JSON.stringify(neu[k].slice(0, 3))));
g.run(`
  window.__bs = () => { const ims = [], pics = []; const mkIm = (x, y, key) => { const im = { key, x, y, tint: -1, sc: 0, rot: 0 }; im.setScale = k => { im.sc = k; return im; }; im.setRotation = r => { im.rot = r; return im; }; im.setScrollFactor = () => im; im.setDepth = () => im; im.setTint = t => { im.tint = t; return im; }; ims.push(im); return im; };
    const gr = new Proxy({}, { get: () => (...a) => gr });
    return { ims, s: Object.assign(__scene(), { bf: { g: gr, pics }, add: { image: mkIm, graphics: () => gr } }) }; };
`);
g.run(`window.BPARTS = [{ look: 'carrier', x: 0, y: 0, k: 1, rot: 0, tint: 0 }, { look: 'raider', x: 20, y: 10, k: 1.5, rot: 0.5, tint: 0x66ccff }, { look: 'pod', x: 5, y: 5, k: 1, rot: 0, tint: 0 }, { ring: true, x: 0, y: 0, r: 10, color: 0xffffff, a: 1 }];`);
g.run(`CAMP.flags.shiplook = true; window.B1 = __bs(); campBriefDrawPic(B1.s, BPARTS, 100, 100, 2);`);
const ims1 = J('B1.ims');
check('a picture drawn with the switch on: the carrier and the raider are the flat-cut textures at the battle\'s scale times the picture\'s k and the box\'s scale, turned as the part says; the raider\'s part tint is NOT put on it; the pod is the pod', ims1.length === 3 && ims1[0].key === 'look-carrier-friend' && near(ims1[0].sc, J('slookScale("carrier")') * 1 * 2) && ims1[1].key === 'look-raider-alien' && ims1[1].tint === -1 && near(ims1[1].sc, J('slookScale("raider")') * 1.5 * 2) && near(ims1[1].rot, 0.5) && ims1[2].key === 'pod', JSON.stringify(ims1));
g.run(`CAMP.flags.shiplook = false; window.B2 = __bs(); campBriefDrawPic(B2.s, BPARTS, 100, 100, 2);`);
const ims2 = J('B2.ims');
check('with the switch off the same picture is today\'s: the part\'s tint on the raider, none of the new keys', ims2.length === 3 && !ims2.some(i => /^look-/.test(i.key)) && ims2[1].tint === 0x66ccff, JSON.stringify(ims2));

console.log('E. the picture as markup for the page HUD (card space-game-page-hud-target-picture)');
const svgs = J(`(() => { const o = {}; slookKinds().forEach(k => { o[k] = { svg: slookPicSvg(k), poly: slookPolygon(k, 1, 8), facet: slookFacetPolygon(k, 1, 8), side: slookKindSide(k), hot: !!SLOOK.K[k].hot }; }); return o; })()`);
const rd = a => a.map(v => Math.round(v * 1000) / 1000);
const ptsOf = (svg, i) => { const m = [...svg.matchAll(/points="([^"]*)"/g)][i]; return m ? m[1].split(' ').flatMap(p => p.split(',').map(Number)) : []; };
check('every kind of the table has an svg: an inline <svg> with the outline and the facet as two polygons (and one more for each other facet a kind has: the mothership\'s two lobes) (the very outline and facet the textures are baked from, to three decimals), nose up (turned a quarter), in a square box', Object.keys(svgs).length === Object.keys(sides).length && Object.entries(svgs).every(([k, v]) => /^<svg class="ph-pic" viewBox="-0\.58 -0\.58 1\.16 1\.16"/.test(v.svg) && /rotate\(-90\)/.test(v.svg) && (v.svg.match(/<polygon /g) || []).length === 2 + J(`(SLOOK.K[${JSON.stringify(k)}].e || []).length`) && JSON.stringify(ptsOf(v.svg, 0)) === JSON.stringify(rd(v.poly)) && JSON.stringify(ptsOf(v.svg, 1)) === JSON.stringify(rd(v.facet))));
check('the colours are the table\'s: the outline the side\'s colour, the facet the side\'s colour mixed toward the dark (white for a warhead: the torpedo boats), the rim the table\'s', Object.entries(svgs).every(([k, v]) => { const fills = [...v.svg.matchAll(/fill="([^"]*)"/g)].map(m => m[1]); return fills[0] === J(`slookColor(${JSON.stringify(v.side)})`) && fills[1] === J(`slookFacet(${JSON.stringify(v.side)}, ${v.hot})`) && v.svg.indexOf(J('SLOOK.rim.color')) > 0; }) && svgs.tboat.svg.indexOf('fill="#ffffff"') > 0 && svgs.lancer.svg.indexOf('fill="#ffffff"') > 0);
check('the mothership\'s svg has its two wing lobes after the facet: the table\'s lobe polygons, in the lobe colour (the side\'s colour mixed 35 percent toward the dark), and no other kind has more than the two', (() => { const v = svgs.mother, lobes = J('slookLobePolygons("mother", 1, 8)'), fills = [...v.svg.matchAll(/fill="([^"]*)"/g)].map(m => m[1]); return lobes.length === 2 && JSON.stringify(ptsOf(v.svg, 2)) === JSON.stringify(rd(lobes[0])) && JSON.stringify(ptsOf(v.svg, 3)) === JSON.stringify(rd(lobes[1])) && fills[2] === J(`slookLobe(${JSON.stringify(v.side)})`) && fills[3] === fills[2] && fills[2] !== fills[1]; })() && Object.keys(svgs).filter(k => k !== 'mother').every(k => (svgs[k].svg.match(/<polygon /g) || []).length === 2));
check('the whole picture is inside the box (every corner, turned, within 0.58 of the middle), so nothing is cut at any size', Object.values(svgs).every(v => ptsOf(v.svg, 0).every(n => Math.abs(n) <= 0.58)));
check('a side asked for is used (a raider as a pirate\'s foe is pink), the usual side otherwise; a kind with no row, none', J('slookPicSvg("raider", "foe")').indexOf('fill="#ff6fa8"') > 0 && J('slookPicSvg("raider")').indexOf('fill="#d58bff"') > 0 && J('slookPicSvg("rock")') === '' && J('slookPicSvg("")') === '');
check('no image, no link, no script in the markup (inline shapes only)', Object.values(svgs).every(v => !/href|url\(|<image|<script|on[a-z]+=/i.test(v.svg)));

console.log('D. the rules');
const pic = src('src/shiplookpic.js'), code = pic.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, ''), ct = src('src/camptcornerscene.js'), cb = src('src/campbriefdraw.js'), html = src('index.html');
check('the switch is asked once for a pass: one slookFrame in campTcornerSync (and none inside campTcornerDraw), one in campBriefDrawPic (none in campBriefSprite)', (ct.match(/slookFrame\(/g) || []).length === 1 && (cb.match(/slookFrame\(/g) || []).length === 1 && !/slookFrame/.test(ct.slice(ct.indexOf('function campTcornerDraw'))) && !/slookFrame/.test(cb.slice(cb.indexOf('function campBriefSprite'), cb.indexOf('function campBriefDrawPic'))));
check('the page HUD draws no ship picture (nothing for this card to change there: no texture, no image in src/camppagehud.js)', !/texOf|add\.image|<img|textures/.test(src('src/camppagehud.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n')));
check('no image, no libraries, no web request, no Phaser call of its own in the new file (it only asks the ships\' function for a texture)', !/fetch\(|XMLHttpRequest|<img|data:image|new Image|Phaser\.|\.make\./.test(code) && /slookTexture\(/.test(code));
check('the script is in the page, after the other files of the look (it calls them when asked, not when loaded)', html.indexOf('src/shiplookpic.js') > html.indexOf('src/shiplookglyph.js') && html.indexOf('src/shiplookpic.js') > html.indexOf('src/shiplookdraw.js') && (html.match(/shiplookpic\.js/g) || []).length === 1);
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nSHIP LOOK PICTURES FAIL: ${failed} of ${n} checks failed` : `\nSHIP LOOK PICTURES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
