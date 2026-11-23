// smoke: selecting a ship (an enemy with [ ] or the backslash, a friendly with comma and period, one pilot with A D) zooms the flight view out until it and the cruiser are on the screen; out only; given back when the selection is let go; F and S as before
// Card space-game-select-zooms-out (src/campselzoom.js; Troy, 23 Nov 2026: "selecting a target zooms out until my ship and the target are both on screen. F then follows the target and Backspace returns, as today").
//   A  what is selected: the things of campSelUnits (the pilot picked, C.sel, the friendly one, C.fsel, and the hostile one, C.tgt); a ship let go or dead is not one
//   B  the zoom: out to where the cruiser and the ship both fit (campPickFit), never in, the mission's farthest zoom the limit; with two selected the farther out of the two
//   C  when: at a change of the selection only; the player's own zoom stays his; a closer pick brings the zoom back toward his; a farther one takes it out
//   D  given back: both let go (X, a ship that dies) and the zoom still the one this set: the player's comes back; a zoom he made, or Backspace's reset, is left alone
//   E  who has the view: a target sub-list, F's follow, a card, the map, a finished battle: nothing changes; the scene calls it and the script is in the page
//   F  the real selection: a pilot picked with D (the squad's first ship) and a hostile picked with ], both from campSelStep / C.tgt as the keys set them
// Run: node tests/campselzoom.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

g.run(`
  campZoomRange(true, 0); // the Campaign's range (0.2 out), as the scene sets it
  window.__mk = (want) => { // a scene stand-in: a battle on mission 1.1, the camera on the cruiser at the zoom wanted
    const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.god = true;
    const s = { camp: C, mode: 'play', mp: null, leaving: false, pn: campPanelNew(), pickZoom: null, focus: null, selZoom: null };
    CAMZOOM.want = want; window.S = s; return s;
  };
  window.__foe = (dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__fits = (u) => { const z = CAMZOOM.want, dx = Math.abs(u.x - C.carrier.x), dy = Math.abs(u.y - C.carrier.y); return dx * z <= W / 2 + 1 && dy * z <= H / 2 + 1; }; // the ship is inside the half screen at the zoom (the cruiser is the middle)
`);

// ---- A. what is selected ----
console.log('A. what is selected');
g.run(`var S = __mk(0.5);`);
check('nothing selected: no ship, no fit, no change', J('campSelZoomUnits(C).length') === 0 && J('campSelZoomFit(C, [])') === null && J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.5));
g.run(`window.R1 = __foe(900, 0); C.tgt = R1.id;`);
check('the hostile target (C.tgt) alone is the selection when no friend is picked', J('campSelZoomUnits(C).map(u => u.id)').join() === J('R1.id'));
g.run(`window.R2 = __foe(2600, 200); window.__ally = C.ships.find(u => u.kind === 'miner' && u.hp > 0); __ally.x = C.carrier.x + 1200; __ally.y = C.carrier.y; C.fsel = __ally.id;`);
check('a friendly picked (comma and period: C.fsel, a ship you protect) and a hostile (C.tgt) are both read: the friendly one, then the hostile one', J('campSelZoomUnits(C).length') === 2 && J('campSelZoomUnits(C)[0].id') === J('__ally.id') && J('campSelZoomUnits(C)[1].id') === J('R1.id'));
g.run(`__ally.hp = 0; window.__d1 = campSelZoomUnits(C).length; R1.hp = 0; window.__d2 = campSelZoomUnits(C).length;`);
check('a ship that is dead is left out (the friend, then the hostile one too)', J('__d1') === 1 && J('__d2') === 0);

// ---- B. the zoom ----
console.log('B. the zoom');
g.run(`var S = __mk(0.5); window.R1 = __foe(900, 0); C.tgt = R1.id;`);
check('a target already on the screen at the zoom: nothing changes (never in, never out)', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.5) && J('S.selZoom.set') === J('S.selZoom.was'));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id;`);
check('a target off the screen: the zoom goes out, and the ship and the cruiser are on the screen at it', J('campSelZoom(S)') === 'out' && J('CAMZOOM.want') < 0.5 && J('__fits(R1)'), JSON.stringify(J('[CAMZOOM.want, S.selZoom]')));
check('it is the zoom campPickFit gives (the part of the screen the panels leave free), clamped', near(J('CAMZOOM.want'), J('camzoomClamp(campPickFit(C, { x: R1.x, y: R1.y, r: R1.r || (R1.def && R1.def.r) || 0 }))')));
g.run(`var S = __mk(0.3); window.R1 = __foe(900, 0); C.tgt = R1.id;`);
check('a player already zoomed out far has no zoom taken in by a near target', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.3));
g.run(`var S = __mk(0.5); window.R1 = __foe(400000, 0); C.tgt = R1.id;`);
check('a target farther than the mission allows: the farthest zoom is the limit, not a zoom below it', J('campSelZoom(S)') === 'out' && near(J('CAMZOOM.want'), J('camzoomClamp(0.001)')) && J('CAMZOOM.want') >= 0.02, JSON.stringify(J('CAMZOOM.want')));
g.run(`var S = __mk(0.5); window.R1 = C.ships.find(u => u.kind === 'miner' && u.hp > 0); R1.x = C.carrier.x + 2600; R1.y = C.carrier.y; window.R2 = __foe(1500, 0); C.fsel = R1.id; C.tgt = R2.id;`); // the friend the farther
check('two ships selected: the zoom is the one at which BOTH are on the screen (the farther out of the two)', J('campSelZoom(S)') === 'out' && J('__fits(R1)') && J('__fits(R2)') && near(J('CAMZOOM.want'), J('camzoomClamp(Math.min(campPickFit(C, { x: R1.x, y: R1.y, r: R1.r || (R1.def && R1.def.r) || 0 }), campPickFit(C, { x: R2.x, y: R2.y, r: R2.r || (R2.def && R2.def.r) || 0 })))')));
g.run(`var S = __mk(0.5); window.R1 = __foe(2600, 0); window.R2 = C.ships.find(u => u.kind === 'miner' && u.hp > 0); R2.x = C.carrier.x + 1500; R2.y = C.carrier.y; C.fsel = R2.id; C.tgt = R1.id;`); // the hostile the farther
check('and the same with the hostile the farther of the two: the same zoom, whichever of them it is', J('campSelZoom(S)') === 'out' && J('__fits(R1)') && J('__fits(R2)') && near(J('CAMZOOM.want'), J('camzoomClamp(campPickFit(C, { x: R1.x, y: R1.y, r: R1.r || (R1.def && R1.def.r) || 0 }))')));

// ---- C. when ----
console.log('C. when');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); window.R2 = __foe(900, 0); C.tgt = R1.id; campSelZoom(S); window.__z1 = CAMZOOM.want;`);
check('the same selection again changes nothing, frame after frame', J('campSelZoom(S)') === '' && J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), J('__z1')));
g.run(`CAMZOOM.want = 0.4;`); // the player zooms in by hand with the target still selected
check('a zoom the player makes with the selection held is left alone (the target flying on does not drag it)', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.4));
g.run(`R1.x += 30000; window.__z2 = CAMZOOM.want;`);
check('a target that flies farther out afterwards does not move the zoom', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), J('__z2')));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); window.R2 = __foe(900, 0); C.tgt = R1.id; campSelZoom(S); window.__far = CAMZOOM.want; C.tgt = R2.id;`);
check('another, nearer ship picked: the zoom comes back in toward the player\'s own (his 0.5, not further in)', J('campSelZoom(S)') === 'in' && near(J('CAMZOOM.want'), 0.5), JSON.stringify(J('CAMZOOM.want')));
g.run(`C.tgt = R1.id;`);
check('and the farther one picked again takes it out to where that one fits', J('campSelZoom(S)') === 'out' && near(J('CAMZOOM.want'), J('__far')));
g.run(`var S = __mk(0.5); window.R1 = __foe(2000, 0); window.R2 = __foe(2800, 0); C.tgt = R1.id; campSelZoom(S); window.__z3 = CAMZOOM.want; C.tgt = R2.id;`);
check('a ship still farther picked: out again, from the player\'s zoom and not from the last one (he had 0.5)', J('campSelZoom(S)') === 'out' && J('CAMZOOM.want') < J('__z3') && J('S.selZoom.was') === 0.5);

// ---- D. given back ----
console.log('D. given back');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelZoom(S); C.tgt = '';`);
check('the selection let go (X) with the zoom still the one it set: the player\'s own zoom comes back', J('campSelZoom(S)') === 'back' && near(J('CAMZOOM.want'), 0.5) && J('S.selZoom') === null);
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelZoom(S); CAMZOOM.want = 0.25; C.tgt = '';`);
check('a zoom the player made meanwhile is the one he keeps', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.25) && J('S.selZoom') === null);
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelZoom(S); CAMZOOM.want = campZoomDefault(); window.__def = CAMZOOM.want;`);
check('Backspace (the reset to the default) with the selection held: the view is the default and stays there', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), J('__def')));
g.run(`R1.hp = 0; C.tgt = '';`);
check('then the selection let go changes nothing either (the zoom is not the one this set)', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), J('__def')) && J('S.selZoom') === null);
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelZoom(S); R1.hp = 0;`);
check('the selected ship destroyed: the selection is let go and the zoom goes back', J('campSelZoom(S)') === 'back' && near(J('CAMZOOM.want'), 0.5));

// ---- E. who has the view ----
console.log('E. who has the view');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; S.pickZoom = { was: 0.5, set: 0.5 };`);
check('a target sub-list open (s.pickZoom): nothing changes, and the selection is read again when it is closed', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.5) && J('S.selZoom') === null);
g.run(`S.pickZoom = null; S.focus = { id: R1.id, name: 'x', pt: { x: 0, y: 0 } };`);
check('F\'s follow has the view: nothing changes while a ship is followed', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.5) && J('S.selZoom') === null);
g.run(`S.focus = null;`);
check('after the follow ends (Backspace) the selection is read, and the view zooms out to it', J('campSelZoom(S)') === 'out' && J('CAMZOOM.want') < 0.5);
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; S.mode = 'card';`);
check('a card or the map in front: nothing changes', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.5));
g.run(`S.mode = 'play'; C.result = 'won';`);
check('a finished battle: nothing changes', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.5));
check('no scene, no battle and no camp are all answered with nothing', J('campSelZoom(null)') === '' && J('campSelZoom({})') === '' && J('campSelZoomUnits(null).length') === 0);
check('the scene calls it every frame, before the pick\'s own zoom, and the script is in the page after the pick\'s', /campSelZoom\(this\)/.test(src('src/campaignscene.js')) && src('src/campaignscene.js').indexOf('campSelZoom(this)') < src('src/campaignscene.js').indexOf('campPickPaint(this)') && src('index.html').indexOf('src/campselzoom.js') > src('index.html').indexOf('src/camppickdraw.js'));
check('F follows as today: F\'s own module is untouched by the selection zoom (it reads the zoom the selection left as the one it came from)', !/campSelZoom/.test(src('src/campfocus.js')));

// ---- F. the real selection: the pilots out, A D and [ ] as the keys set it ----
console.log('F. the real selection (pilots out)');
g.run(`var S = __mk(0.5); campOrder(C, 'launch'); for (let i = 0; i < 240 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); C.tgt = ''; C.sel = 'all'; window.__P = campSelStep(C, 1).unit; window.__Q = campSelUnits(C);`);
check('D picks the first pilot (from All pilots): the squad\'s first ship is who, and nothing else is selected', J('__P.id') === J('__Q.who.id') && J('__Q.hostile') === null && J('campSelZoomUnits(C).map(u => u.id).join()') === J('__P.id'));
check('a pilot near the cruiser needs no zoom out: the view stays where the player has it', (g.run(`__P.x = C.carrier.x + 150; __P.y = C.carrier.y; S.selZoom = null;`), J('campSelZoom(S)') === '') && near(J('CAMZOOM.want'), 0.5));
g.run(`S.selZoom = null; C.sel = 'all'; CAMZOOM.want = 0.5; campSelStep(C, 1); __P.x = C.carrier.x + 3200; __P.y = C.carrier.y + 300;`);
check('a pilot far out picked with D: the view zooms out until the pilot and the cruiser are both on the screen', J('campSelZoom(S)') === 'out' && J('__fits(__P)') && J('CAMZOOM.want') < 0.5, JSON.stringify(J('[CAMZOOM.want, __P.x - C.carrier.x]')));
g.run(`window.R1 = __foe(2400, 0); C.tgt = R1.id; window.__zp = CAMZOOM.want;`);
check('and a hostile picked with ] on top, the pilot still held: the zoom stays at the farther fit (both on the screen)', J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), J('__zp')) && J('__fits(__P)') && J('__fits(R1)'));
g.run(`campPicksClear(C);`);
check('X lets the picks go (C.sel back on All pilots, C.fsel and C.tgt empty): the player\'s own zoom comes back', J('campSelZoom(S)') === 'back' && near(J('CAMZOOM.want'), 0.5));
g.run(`S.selZoom = null; CAMZOOM.want = 0.5; C.tgt = ''; C.fsel = ''; C.sel = 'all'; campWingShips(C, 'red').forEach(u => { u.x = C.carrier.x + 5000; u.y = C.carrier.y; });`);
check('All pilots (the default) moves nothing: the three ships are not fitted even with one of them far away; only a pilot picked on its own is', J('campSelZoomUnits(C).length') === 0 && J('campSelZoom(S)') === '' && near(J('CAMZOOM.want'), 0.5) && (g.run(`C.sel = 'pilot:red'`), J('campSelZoomUnits(C).map(u => u.id).join()') === J(`campWingShips(C, 'red')[0].id`)));
g.run(`S.selZoom = null; CAMZOOM.want = 0.5; C.sel = 'all'; C.tgt = ''; window.__post = campFriList(C).filter(e => e.kind === 'post').sort((a, b) => Math.hypot(b.x - C.carrier.x, b.y - C.carrier.y) - Math.hypot(a.x - C.carrier.x, a.y - C.carrier.y))[0]; C.fsel = __post.id; window.__pd = Math.hypot(__post.x - C.carrier.x, __post.y - C.carrier.y);`);
check('an outpost picked as the friendly is fitted too (it is a place, not a ship: campSelUnits.friendlyPost gives its x, y and r), and the zoom goes out to it', J('campSelUnits(C).friendly') === null && J('campSelUnits(C).friendlyPost.id') === J('__post.id') && J('campSelZoomUnits(C).length') === 1 && J('campSelZoomUnits(C)[0].id') === J('__post.id') && J('__pd') > 2000 && J('campSelZoom(S)') === 'out' && J('CAMZOOM.want') < 0.5 && near(J('CAMZOOM.want'), J('camzoomClamp(campPickFit(C, { x: __post.x, y: __post.y, r: __post.r || 0 }))')), JSON.stringify(J('[__pd, CAMZOOM.want]')));

console.log(failed ? `SELECT ZOOM FAIL (${failed} of ${n})` : `SELECT ZOOM PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
