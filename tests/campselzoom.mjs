// smoke: picking a ship (an enemy with [ ] or the backslash, a friendly with comma and period, one pilot with Q W) that is already on the screen moves nothing; one that is off the screen makes the camera glide to it at a readable zoom, hold 1.5 s and glide back to the cruiser by itself; S or a steering key ends the peek
// Card space-game-pick-peek (src/campselzoom.js; Troy, 24 Nov 2026; it replaces the zoom-out of space-game-select-zooms-out, 23 Nov: the zoom-out made ships specks).
//   A  what is picked: the things of campSelUnits (the pilot picked, C.sel, the friendly one, C.fsel, and the hostile one, C.tgt); a ship let go or dead is not one
//   B  on the screen: its middle inside the screen less CAMP.peek.view, at the zoom the player wants and the middle the camera has
//   C  a pick on the screen moves nothing: no zoom, no pan, no peek, however often the frame runs; only a NEW pick counts
//   D  a pick off the screen: the glide out (eased, by time), the hold, the glide back to the cruiser, the camera following it again; the zoom readable and given back; the ship followed while the camera is on it; its death sends the camera home
//   E  the numbers: CAMP.peek (hold 1500, glide 400, zoom 0.8), the three rows of the N panel move them live
//   F  another pick during a peek: off the home screen restarts it on the new ship (the player's zoom still the one to give back), on the home screen sends the camera home at once
//   G  what ends it: S (the reset's zoom is kept), a steering key PRESSED (one held when the pick was made does not), a card or the map, a target sub-list, a finished battle; a drag and F's follow take the view; the pause freezes it
//   H  who has the view: the map, a sub-list, a drag and F's follow: a pick is not peeked at, and is not peeked at later either
//   I  the real picks: a pilot with Q, a hostile with ], an outpost as the friendly one (a place: it stays where it is); All pilots and X move nothing; the scene calls it every frame
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
    const cam = { scrollX: C.carrier.x - W / 2, scrollY: C.carrier.y - H / 2, zoom: want, stops: 0, follows: 0, lastFollow: null,
      stopFollow() { this.stops++; }, startFollow(t, r, lx, ly) { this.follows++; this.lastFollow = { t, lx, ly }; } };
    const key = () => ({ isDown: false });
    const s = { camp: C, mode: 'play', mp: null, leaving: false, pn: campPanelNew(), pickZoom: null, focus: null, panned: false, peek: null, selPeek: null,
      cameras: { main: cam }, sp: { [C.carrier.id]: { tag: 'cruiser' } }, k: { UP: key(), DOWN: key(), LEFT: key(), RIGHT: key() } };
    CAMZOOM.want = want; window.S = s; window.CAM = cam; return s;
  };
  window.__foe = (dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__f = (k, ms) => { for (let i = 0; i < k; i++) campPeekFrame(S, ms || 100); };       // k frames of ms (100) each
  window.__mid = () => ({ x: CAM.scrollX + W / 2, y: CAM.scrollY + H / 2 });
  window.__ally = () => C.ships.find(u => u.kind === 'miner' && u.hp > 0);
`);

// ---- A. what is picked ----
console.log('A. what is picked');
g.run(`var S = __mk(0.5);`);
check('nothing picked: no ship, no peek, nothing moved', J('campSelPeekUnits(C).length') === 0 && J('campSelPeek(S)') === '' && J('S.peek') === null && near(J('CAMZOOM.want'), 0.5));
g.run(`window.R1 = __foe(900, 0); C.tgt = R1.id;`);
check('the hostile target (C.tgt) alone is the pick when no friend is picked', J('campSelPeekUnits(C).map(u => u.id)').join() === J('R1.id'));
g.run(`window.R2 = __foe(2600, 200); window.A1 = __ally(); A1.x = C.carrier.x + 1200; A1.y = C.carrier.y; C.fsel = A1.id;`);
check('a friendly picked (C.fsel, a ship you protect) and a hostile (C.tgt) are both read: the friendly one, then the hostile one', J('campSelPeekUnits(C).length') === 2 && J('campSelPeekUnits(C)[0].id') === J('A1.id') && J('campSelPeekUnits(C)[1].id') === J('R1.id'));
g.run(`A1.hp = 0; window.__d1 = campSelPeekUnits(C).length; R1.hp = 0; window.__d2 = campSelPeekUnits(C).length;`);
check('a ship that is dead is left out (the friend, then the hostile one too)', J('__d1') === 1 && J('__d2') === 0);

// ---- B. on the screen ----
console.log('B. on the screen');
g.run(`var S = __mk(0.5); window.__c = { x: C.carrier.x, y: C.carrier.y };`);
const on = (dx, dy, z) => J(`campPeekOnScreen(__c, ${z}, { x: __c.x + (${dx}), y: __c.y + (${dy}) })`);
check('a ship 900 px off at zoom 0.5 is on the screen (450 px from the middle, the half screen is 640)', on(900, 0, 0.5) === true);
check('2500 px off at 0.5 is not (1250 px from the middle)', on(2500, 0, 0.5) === false);
check('the same 900 px at zoom 1 is not: the zoom is the one the player has', on(900, 0, 1) === false && on(500, 0, 1) === true);
check('the edge counts: 40 px in from the right is on, 41 px is not (CAMP.peek.view)', on((1280 - 40 - 640) / 0.5, 0, 0.5) === true && on((1280 - 40 - 640 + 1) / 0.5, 0, 0.5) === false);
check('the top has the status block (90 px) and the bottom the key line (80 px): a ship at the very top of the screen is off it', on(0, -(360 - 89) / 0.5, 0.5) === false && on(0, -(360 - 90) / 0.5, 0.5) === true && on(0, (360 - 80) / 0.5, 0.5) === true && on(0, (360 - 79) / 0.5, 0.5) === false);
check('the middle the camera has counts, not the cruiser: the same ship is on the screen from one middle and off it from another', J(`campPeekOnScreen({ x: __c.x + 2000, y: __c.y }, 0.5, { x: __c.x + 2500, y: __c.y })`) === true);

// ---- C. a pick on the screen moves nothing ----
console.log('C. a pick on the screen moves nothing');
g.run(`var S = __mk(0.5); window.R1 = __foe(900, 0); C.tgt = R1.id;`);
check('a target already on the screen: "screen", no peek, the zoom and the camera as they were', J('campSelPeek(S)') === 'screen' && J('S.peek') === null && near(J('CAMZOOM.want'), 0.5) && J('CAM.stops') === 0 && J('CAM.follows') === 0 && near(J('CAM.scrollX'), J('C.carrier.x - W / 2')) && near(J('CAM.scrollY'), J('C.carrier.y - H / 2')));
check('and the same selection frame after frame is nothing at all', J('campSelPeek(S)') === '' && J('campSelPeek(S)') === '' && J('campPeekFrame(S, 100)') === false && J('CAM.stops') === 0);
g.run(`R1.x += 30000;`);
check('it flying far off afterwards is no new pick: no peek', J('campSelPeek(S)') === '' && J('S.peek') === null);
g.run(`var S = __mk(0.3); window.R1 = __foe(900, 0); C.tgt = R1.id;`);
check('a player zoomed far out has no zoom taken in by a near target either (nothing moves at all)', J('campSelPeek(S)') === 'screen' && near(J('CAMZOOM.want'), 0.3));

// ---- D. a pick off the screen: out, hold, back ----
console.log('D. a pick off the screen');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; window.__c = { x: C.carrier.x, y: C.carrier.y };`);
check('a target off the screen: the peek begins (out), the camera lets go of the cruiser, the zoom is the readable one', J('campSelPeek(S)') === 'peek' && J('S.peek.phase') === 'out' && J('S.peek.id') === J('R1.id') && J('CAM.stops') === 1 && near(J('CAMZOOM.want'), 0.8) && J('S.peek.zoom.was') === 0.5 && near(J('S.peek.zoom.set'), 0.8), JSON.stringify(J('[S.peek, CAMZOOM.want]')));
g.run(`__f(2);`);
check('after 200 ms of the 400 the middle of the view is half way (the glide is eased: its middle is the middle)', near(J('__mid().x'), J('__c.x + 1250'), 1) && near(J('__mid().y'), J('__c.y'), 1) && J('S.peek.phase') === 'out', JSON.stringify(J('[__mid(), __c]')));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; window.__c = { x: C.carrier.x, y: C.carrier.y }; campSelPeek(S); __f(1);`);
check('100 ms in (a quarter of the glide) the camera has gone less than a quarter of the way (eased in)', J('__mid().x - __c.x') > 0 && J('__mid().x - __c.x') < 625, JSON.stringify(J('__mid().x - __c.x')));
g.run(`__f(3);`);
check('at 400 ms the camera is on the ship and the hold begins', near(J('__mid().x'), J('R1.x'), 1) && near(J('__mid().y'), J('R1.y'), 1) && J('S.peek.phase') === 'hold');
g.run(`R1.x += 300; R1.y += 100; __f(1);`);
check('on the ship it FOLLOWS it (a ship that moves is caught)', near(J('__mid().x'), J('R1.x'), 1) && near(J('__mid().y'), J('R1.y'), 1));
g.run(`__f(13);`); // 1 + 13 = 14 frames of the 15
check('1.4 s into the hold: still holding, the zoom still the peek\'s', J('S.peek.phase') === 'hold' && near(J('CAMZOOM.want'), 0.8));
g.run(`__f(1);`);
check('at 1.5 s the way back begins: the zoom is given back (the player\'s 0.5) and the camera starts from where it is', J('S.peek.phase') === 'back' && near(J('CAMZOOM.want'), 0.5) && J('S.peek.zoom') === null && near(J('__mid().x'), J('R1.x'), 1));
g.run(`__f(2);`);
check('half way back in 200 ms: the middle of the view is half way between the ship and the cruiser', near(J('__mid().x'), J('(R1.x + C.carrier.x) / 2'), 1), JSON.stringify(J('[__mid().x, R1.x, C.carrier.x]')));
check('the camera has not been given back to the follow yet (it glides on its own)', J('CAM.follows') === 0);
g.run(`__f(2);`);
check('after 400 ms back the peek is over: the camera is on the cruiser and follows it again at the scene\'s lerp', J('S.peek') === null && J('CAM.follows') === 1 && J('CAM.lastFollow.t.tag') === 'cruiser' && J('CAM.lastFollow.lx') === J('CAMPDRAG.follow') && near(J('__mid().x'), J('C.carrier.x'), 1) && near(J('__mid().y'), J('C.carrier.y'), 1) && near(J('CAMZOOM.want'), 0.5));
check('and nothing more happens: the selection is the same, the frame has nothing to do', J('campSelPeek(S)') === '' && J('campPeekFrame(S, 100)') === false && J('CAM.stops') === 1);
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(4); __f(3); R1.hp = 0;`);
check('the ship destroyed during the hold: the way back begins at once, and the zoom is given back', (g.run(`__f(1);`), J('S.peek.phase') === 'back' && near(J('CAMZOOM.want'), 0.5)));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(1, 16); __f(1, 16);`);
check('by time, not by frame: 32 ms of 400 is the same share of the way at any frame rate', near(J('S.peek.t'), 32) && J('S.peek.phase') === 'out');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); campPeekFrame(S, 5000);`);
check('a long stall of one frame (5 s) is cut to 100 ms: the glide is not skipped', J('S.peek.t') === 100 && J('S.peek.phase') === 'out');
g.run(`var S = __mk(1.2); window.R1 = __foe(3000, 0); C.tgt = R1.id; campSelPeek(S);`);
check('a player already zoomed in farther than the readable zoom keeps his zoom (no zoom is taken out)', near(J('CAMZOOM.want'), 1.2) && J('S.peek.zoom') === null && J('S.peek.phase') === 'out');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); CAMZOOM.want = 0.3; __f(4); __f(15);`);
check('a zoom the player makes during the peek is his: it is not put back at the start of the way back', J('S.peek.phase') === 'back' && near(J('CAMZOOM.want'), 0.3));

// ---- E. the numbers ----
console.log('E. the numbers');
check('CAMP.peek: hold 1500 ms, glide 400 ms, zoom 0.8', J('CAMP.peek.hold') === 1500 && J('CAMP.peek.glide') === 400 && J('CAMP.peek.zoom') === 0.8);
check('the three are rows of the N panel, in its time group, with words', ['peekhold', 'peekglide', 'peekzoom'].every(id => J(`campTuneRow('${id}').group`) === 'time' && J(`campTuneRow('${id}').root`) === 'CAMP' && /^[A-Z]/.test(J(`uiText('camp.ui.tune.row.${id}')`)) && !/camp\.ui\.tune/.test(J(`uiText('camp.ui.tune.row.${id}')`))));
check('the rows point at the numbers', J(`campTuneRow('peekhold').path`) === 'peek.hold' && J(`campTuneRow('peekglide').path`) === 'peek.glide' && J(`campTuneRow('peekzoom').path`) === 'peek.zoom');
g.run(`campTuneSet('peekhold', 500); campTuneSet('peekglide', 200); campTuneSet('peekzoom', 1);`);
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S);`);
check('the panel moves them live: zoom 1, a 200 ms glide and a 500 ms hold', near(J('CAMZOOM.want'), 1) && (g.run(`__f(2);`), J('S.peek.phase') === 'hold') && (g.run(`__f(4);`), J('S.peek.phase') === 'hold') && (g.run(`__f(1);`), J('S.peek.phase') === 'back'));
g.run(`campTuneReset('peekhold'); campTuneReset('peekglide'); campTuneReset('peekzoom');`);
check('and a reset puts them back', J('CAMP.peek.hold') === 1500 && J('CAMP.peek.glide') === 400 && J('CAMP.peek.zoom') === 0.8);

// ---- F. another pick during a peek ----
console.log('F. another pick during a peek');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); window.R2 = __foe(0, 2600); C.tgt = R1.id; campSelPeek(S); __f(2); window.__m = __mid(); C.tgt = R2.id;`);
check('a pick off the home screen: the peek begins again on the new ship, from where the camera is', J('campSelPeek(S)') === 'peek' && J('S.peek.id') === J('R2.id') && J('S.peek.phase') === 'out' && J('S.peek.t') === 0 && near(J('S.peek.from.x'), J('__m.x')) && near(J('S.peek.from.y'), J('__m.y')));
check('the zoom to give back is still the player\'s own (0.5), not the peek\'s 0.8', J('S.peek.zoom.was') === 0.5 && near(J('CAMZOOM.want'), 0.8), JSON.stringify(J('S.peek.zoom')));
g.run(`__f(4); __f(15);`);
check('and it holds on the new ship and gives 0.5 back at the end of the hold', J('S.peek.phase') === 'back' && near(J('CAMZOOM.want'), 0.5));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); window.R3 = __foe(300, 0); C.tgt = R1.id; campSelPeek(S); __f(5); C.tgt = R3.id;`);
check('a pick that is on the home screen (the cruiser\'s, at the player\'s zoom): the camera is sent home at once, the zoom given back', J('campSelPeek(S)') === 'home' && J('S.peek.phase') === 'back' && J('S.peek.t') === 0 && near(J('CAMZOOM.want'), 0.5));
g.run(`__f(4);`);
check('and the way home ends as a peek does: the camera follows the cruiser', J('S.peek') === null && J('CAM.follows') === 1);

// ---- G. what ends it ----
console.log('G. what ends it');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(3); CAMZOOM.want = campZoomDefault(); window.__def = CAMZOOM.want; window.__r = campViewRecentre(S);`);
check('S (the zoom reset, then the way back: campViewRecentre) ends the peek: the camera follows the cruiser, and the zoom is the reset\'s, not put back to 0.5', J('__r') === true && J('S.peek') === null && J('CAM.follows') === 1 && near(J('CAMZOOM.want'), J('__def')));
check('with no peek, S\'s recentre is as it was (nothing to end, nothing to recentre)', J('campViewRecentre(S)') === false && J('campPeekEnd(S)') === false);
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(6);`);
check('no steering key: the peek runs on', J('S.peek.phase') === 'hold');
g.run(`S.k.RIGHT.isDown = true; __f(1);`);
check('a steering key pressed ends it: the way back begins, the zoom comes back', J('S.peek.phase') === 'back' && near(J('CAMZOOM.want'), 0.5));
g.run(`var S = __mk(0.5); S.k.UP.isDown = true; window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(6);`);
check('a key already held when the pick was made (thrust while he picks) does not end it', J('S.peek.phase') === 'hold' && J('S.peek.fly') === true);
g.run(`S.k.UP.isDown = false; __f(1); S.k.UP.isDown = true; __f(1);`);
check('let go and pressed again: it ends', J('S.peek.phase') === 'back');
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(3); C.result = 'won'; __f(1);`);
check('a finished battle ends it: the camera follows the cruiser, the zoom is back', J('S.peek') === null && J('CAM.follows') === 1 && near(J('CAMZOOM.want'), 0.5));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(3); S.mp = { open: true }; __f(1);`);
check('the map opening ends it the same way', J('S.peek') === null && J('CAM.follows') === 1 && near(J('CAMZOOM.want'), 0.5));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(3); S.pn.pick = { row: 'x', kind: 'enemy', ids: [], sel: '', at: 0, top: 0 }; __f(1);`);
check('a target sub-list opening ends it and hands the zoom back before the list reads it (the list reveals from the player\'s 0.5, and the camera follows the cruiser as it expects)', J('S.peek') === null && J('CAM.follows') === 1 && near(J('CAMZOOM.want'), 0.5));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(3); S.panned = true; __f(1);`);
check('a drag of the hand takes the view: the peek lets go, the zoom comes back, and the camera is NOT put on the cruiser (the hand has it)', J('S.peek') === null && J('CAM.follows') === 0 && near(J('CAMZOOM.want'), 0.5));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(3); S.focus = { id: R1.id, name: 'Raider 1', pt: { x: 0, y: 0 } }; __f(1);`);
check('F\'s follow takes the view the same way', J('S.peek') === null && J('CAM.follows') === 0 && near(J('CAMZOOM.want'), 0.5));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(3); window.__b = campPeekBreak(S); window.__h = campPeekHome(S);`);
check('F pressed (the scene breaks the peek, then F\'s press runs): with F taking nothing the camera is put back on the cruiser; with F taking a ship it is F\'s', J('__b') === true && J('__h') === true && J('CAM.follows') === 1 && (g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); campPeekBreak(S); S.focus = { id: R1.id, name: 'x', pt: { x: 0, y: 0 } }; window.__h2 = campPeekHome(S);`), J('__h2') === false && J('CAM.follows') === 0));
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); C.tgt = R1.id; campSelPeek(S); __f(2); S.mode = 'pause'; window.__t = S.peek.t; __f(5);`);
check('the pause freezes it (the time of the peek does not run)', J('S.peek.t') === J('__t') && J('S.peek.phase') === 'out');
g.run(`S.mode = 'play'; __f(2);`);
check('and the game going on takes it on from there', J('S.peek.phase') === 'hold');

// ---- H. who has the view ----
console.log('H. who has the view');
for (const [what, set, undo] of [['the map', `S.mp = { open: true }`, `S.mp = null`], ['a target sub-list', `S.pn.pick = { row: 'x', kind: 'enemy', ids: [], sel: '', at: 0, top: 0 }`, `S.pn.pick = null`], ['a drag of the hand', `S.panned = true`, `S.panned = false`], ['F\'s follow', `S.focus = { id: 'x', name: 'x', pt: { x: 0, y: 0 } }`, `S.focus = null`]]) {
  g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); ${set}; C.tgt = R1.id;`);
  check(`${what} has the view: a pick off the screen is not peeked at (nothing moves)`, J('campSelPeek(S)') === '' && J('S.peek') === null && near(J('CAMZOOM.want'), 0.5) && J('CAM.stops') === 0);
  g.run(`${undo};`);
  check(`... and when it is done the pick is not peeked at later either (it was seen there)`, J('campSelPeek(S)') === '' && J('S.peek') === null);
}
g.run(`var S = __mk(0.5); window.R1 = __foe(2500, 0); S.mode = 'card'; C.tgt = R1.id;`);
check('a card in front: nothing is done', J('campSelPeek(S)') === '' && J('S.peek') === null);
g.run(`S.mode = 'play'; C.result = 'won';`);
check('a finished battle: nothing', J('campSelPeek(S)') === '' && J('S.peek') === null);
check('no scene, no battle and no camp are all answered with nothing', J('campSelPeek(null)') === '' && J('campSelPeek({})') === '' && J('campPeekFrame(null, 100)') === false && J('campPeekFrame({}, 100)') === false && J('campSelPeekUnits(null).length') === 0 && J('campPeekEnd(null)') === false && J('campPeekBreak({})') === false);

// ---- I. the real picks ----
console.log('I. the real picks (pilots out)');
g.run(`var S = __mk(0.5); campOrder(C, 'launch'); for (let i = 0; i < 240 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); C.tgt = ''; C.sel = 'all'; S.selPeek = null; window.__P = campSelStep(C, 1).unit; window.__Q = campSelUnits(C); S.selPeek = { ids: [] };
  CAM.scrollX = C.carrier.x - W / 2; CAM.scrollY = C.carrier.y - H / 2;`);
check('Q picks the first pilot (from All pilots): the squad\'s first ship is who, and nothing else is picked', J('__P.id') === J('__Q.who.id') && J('__Q.hostile') === null && J('campSelPeekUnits(C).map(u => u.id).join()') === J('__P.id'));
check('a pilot near the cruiser is on the screen: nothing moves', (g.run(`__P.x = C.carrier.x + 150; __P.y = C.carrier.y;`), J('campSelPeek(S)') === 'screen') && J('S.peek') === null);
g.run(`S.selPeek = { ids: [] }; __P.x = C.carrier.x + 3200; __P.y = C.carrier.y + 300; window.__pp = { x: __P.x, y: __P.y };`);
check('a pilot far out picked: the peek, at the pilot', J('campSelPeek(S)') === 'peek' && J('S.peek.id') === J('__P.id') && J('S.peek.phase') === 'out');
g.run(`window.R1 = __foe(2400, 0); C.tgt = R1.id; window.__id1 = S.peek.id;`);
check('a hostile picked with ] on top, the pilot still held: the new one is the pick (off the home screen: the peek goes to it)', J('campSelPeek(S)') === 'peek' && J('S.peek.id') === J('R1.id'));
g.run(`__f(30); S.selPeek = { ids: [] }; campPicksClear(C); `);
check('X lets the picks go (C.sel back on All pilots, C.fsel and C.tgt empty): nothing is picked, nothing happens', J('campSelPeek(S)') === '' && J('S.peek') === null && J('campSelPeekUnits(C).length') === 0);
g.run(`S.selPeek = null; C.tgt = ''; C.fsel = ''; C.sel = 'all'; campWingShips(C, 'red').forEach(u => { u.x = C.carrier.x + 5000; u.y = C.carrier.y; });`);
check('All pilots (the default) peeks at nothing, even with a pilot far away; one picked on his own does', J('campSelPeekUnits(C).length') === 0 && J('campSelPeek(S)') === '' && J('S.peek') === null && (g.run(`C.sel = 'pilot:red'`), J('campSelPeekUnits(C).map(u => u.id).join()') === J(`campWingShips(C, 'red')[0].id`) && J('campSelPeek(S)') === 'peek'));
g.run(`var S = __mk(0.5); C.sel = 'all'; C.tgt = ''; window.__post = campOutposts(C.level).map(o => campFriPlace(C, 'place:' + o.id)).filter(Boolean).sort((a, b) => Math.hypot(b.x - C.carrier.x, b.y - C.carrier.y) - Math.hypot(a.x - C.carrier.x, a.y - C.carrier.y))[0]; C.fsel = __post.id; window.__pd = Math.hypot(__post.x - C.carrier.x, __post.y - C.carrier.y);`);
check('an outpost picked as the friendly one is a place: it is peeked at (its x, y), and the camera holds on the place', J('campSelUnits(C).friendly') === null && J('campSelUnits(C).friendlyPost.id') === J('__post.id') && J('__pd') > 2000 && J('campSelPeek(S)') === 'peek' && J('S.peek.post') === true && (g.run(`__f(4);`), near(J('__mid().x'), J('__post.x'), 1) && near(J('__mid().y'), J('__post.y'), 1)));
g.run(`__f(20);`);
check('and, a place being there for good, the peek runs its hold and the way back and the zoom is given back', J('S.peek') === null && J('CAM.follows') === 1 && near(J('CAMZOOM.want'), 0.5));

// ---- J. the scene and the page ----
console.log('J. the scene and the page');
const scene = src('src/campaignscene.js'), html = src('index.html'), sel = src('src/campselzoom.js');
check('the scene calls campSelPeek then campPeekFrame every frame, before the pick\'s own zoom (campPickPaint)', /campSelPeek\(this\)/.test(scene) && /campPeekFrame\(this, dt\)/.test(scene) && scene.indexOf('campSelPeek(this)') < scene.indexOf('campPeekFrame(this, dt)') && scene.indexOf('campPeekFrame(this, dt)') < scene.indexOf('campPickPaint(this)'));
check('the scene starts with no peek and no picks remembered, and F breaks a peek first and puts the camera back when it took nothing', /this\.peek = null; this\.selPeek = null/.test(scene) && /campPeekBreak\(this\)[\s\S]{0,200}campFocusPress\(this\)[\s\S]{0,200}campPeekHome\(this\)/.test(scene));
check('S\'s way back (campViewRecentre, src/campdrag.js) ends a peek, keeping the reset\'s zoom', /function campViewRecentre\(s\) \{\s*\n\s*if \(typeof campPeekEnd === 'function' && campPeekEnd\(s, true\)\) return true;/.test(src('src/campdrag.js')));
check('the script is in the page after the pick\'s and F\'s; F\'s own module does not know of the peek', html.indexOf('src/campselzoom.js') > html.indexOf('src/camppickdraw.js') && html.indexOf('src/campselzoom.js') > html.indexOf('src/campfocus.js') && !/campPeek|campSelPeek/.test(src('src/campfocus.js')));
check('the zoom-out of the old card is gone: nothing here sets the zoom to fit a pick (campPickFit) and the old functions are not defined', !/campPickFit/.test(sel) && !/function campSelZoom\b|function campSelZoomFit|s\.selZoom/.test(sel) && J(`typeof campSelZoom`) === 'undefined');
check('every peek number is in CAMP.peek and read live (none is a constant of the file)', /CAMP\.peek/.test(sel) && !/\b1500\b|\b400\b/.test(sel.replace(/\/\/.*$/gm, '')));

console.log(failed ? `PICK PEEK FAIL (${failed} of ${n})` : `PICK PEEK PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
