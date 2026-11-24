// smoke: the focus view: F glides the camera to the selected ship (a sub-list's candidate, a squad's leader, the picked hostile, else the cruiser) and follows it; S and a lost ship bring the cruiser back, a drag breaks the follow (plain Node, no Chrome)
// Card space-game-focus-view (src/campfocus.js; Troy, 22 Nov 2026: "look around and view the battle from different perspectives by selecting a target, hostile or friendly, and having it at the centre of the screen").
//   A  what is focused: the subject, in order: a target sub-list's candidate, the leader of the squad whose ring shows, the picked hostile, the cruiser; it reads campTdispSubject (src/camptdisp.js) when there is one
//   B  the glide: the zoom of a long one (both ends on the screen, then back), the edge arrow's place
//   C  the key: start, the same ship again, the cruiser, the camera's follow and its lerp, the arrival, the zoom given back (not over one the player set)
//   D  the end: a ship that dies or leaves, the battle over, a card; the pause keeps it; the way back (S, the RECENTRE mark, F with nothing selected)
//   E  the drag view: a drag breaks the follow and F picks it up again; a flying key does not bring the view back; the arrows, Space and the lists work while looking elsewhere
//   F  the scene: F is a key of the table (and no other key of the Campaign's), the scene's onKey and update are wired to it, the text and the label
// Run: node tests/campfocus.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
g.run('campFleetListSet(true)'); // this suite is about the lists' code, Q's pop-up included: it is switched off in the game (CAMP_FLEET_LIST, card space-game-q-selects-all) and on here; tests/campselect.mjs has the game's own state
g.run('campShipListSet(true)'); // and the ship list too: it is switched off in the game (CAMP_SHIP_LIST, card space-game-p-opens-power: P opens power) and on here; tests/campselect.mjs has the game's own state
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');

g.run(`
  campZoomRange(true, 0); // the Campaign's range (0.2 out), as the scene sets it
  window.__toasts = []; toast = (s, msg) => { __toasts.push(msg); };
  window.__cam = { zoom: 0.5, scrollX: 0, scrollY: 0, follows: [], target: null, startFollow(t, r, lx, ly) { this.target = t; this.follows.push([t, lx, ly]); return this; }, stopFollow() { this.target = null; this.stopped = (this.stopped || 0) + 1; return this; } };
  window.__mk = (seed, mission) => { // a scene stand-in with the camera recorded, a battle on mission 1.1 (the transport, the escorts), the camera on the cruiser at zoom 0.5
    const C = window.C = campNew(1, [], { seed: seed || 5, mission: mission || 0 }); C.god = true;
    const s = { camp: C, mode: 'play', mp: null, leaving: false, pn: campPanelNew(), cameras: { main: __cam }, sp: {}, time: { now: 1000 }, panned: false, dragFly: 0, focus: null };
    s.sp[C.carrier.id] = { id: 'sprite-of-the-cruiser', x: C.carrier.x, y: C.carrier.y };
    __cam.zoom = 0.5; __cam.scrollX = C.carrier.x - W / 2; __cam.scrollY = C.carrier.y - H / 2; __cam.follows.length = 0; __cam.target = null; __cam.stopped = 0; CAMZOOM.want = 0.5; __toasts.length = 0;
    window.S = s; return s;
  };
  window.__foe = (dx, dy, kind) => { const u = campSpawn(C, kind || 'raider', C.carrier.x + dx, C.carrier.y + dy); return u; };
  window.__go = secs => { for (let i = 0; i < secs * 30; i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__frame = (ms, n) => { for (let i = 0; i < (n || 1); i++) { campFocusFrame(S, ms); const m = campFocusMid(__cam), t = __cam.target; if (t && (S.focus || __cam.target !== S.sp[C.carrier.id])) { const l = __cam.follows[__cam.follows.length - 1]; const k = l ? l[1] : 0.12; __cam.scrollX += (t.x - W / 2 - __cam.scrollX) * k; __cam.scrollY += (t.y - H / 2 - __cam.scrollY) * k; } } };
`);

// ---- A. what is focused ----
console.log('A. what is focused');
g.run(`var S = __mk(); S.mode = 'play';`);
check('nothing selected: the subject is the cruiser', J('campFocusSubject(C, S.pn, 1000).why') === 'cruiser' && J('campFocusSubject(C, S.pn, 1000).u === C.carrier') && J('campFocusSubject(C, S.pn, 1000).side') === 'friend');
check('a null battle has no subject, and the leader of a squad with no ships is null', J('campFocusSubject(null, null, 0)') === null && J('campFocusLeader(C, "red")') === null && J('campFocusLeader(null, "red")') === null);
g.run(`window.R1 = __foe(900, 0); window.R2 = __foe(1400, 300); campTgtStep(C, 1);`);
check('the picked hostile ([ ] \ S) is the subject: the nearest first, as the target is', J('campFocusSubject(C, S.pn, 1000).why') === 'target' && J('campFocusSubject(C, S.pn, 1000).u.id') === J('R1.id') && J('campFocusSubject(C, S.pn, 1000).side') === 'hostile', J('campFocusSubject(C, S.pn, 1000).u.id') + ' ' + J('R1.id'));
g.run(`campOrder(C, 'launch', '', 'key'); __go(10);`);
check('the wing is out (squads of red, green and yellow ships), each squad has a leader: its first ship by id', J('["red", "green", "yellow"].every(q => { const l = campFocusLeader(C, q); return l && l.squad === q && C.ships.filter(u => u.team === "earth" && u.kind === "fighter" && u.squad === q).every(u => u.id >= l.id); })'));
g.run(`campFleetListSet(false); campPanelKey(S.pn, C, 'KeyQ', 1000); campFleetListSet(true);`); // Q picks the first friend, the red pilot (with the old fleet list off: Q is who, card space-game-keys3-select) (card space-game-bracket-select-orders): its ring shows
check('with a squad\'s ring showing (its pilot is the selected friend) its leader is the subject, before the picked hostile', J('C.sel') === 'pilot:red' && J('campFocusSubject(C, S.pn, 1000).why') === 'squad' && J('campFocusSubject(C, S.pn, 1000).u.id') === J('campFocusLeader(C, "red").id') && J('campFocusSubject(C, S.pn, 1000).side') === 'friend');
g.run(`C.sel = ''; campPanelClose(S.pn); campPanelKey(S.pn, C, 'KeyW', 1000);`);
check('the all-squads list shows all three rings: the leader of the first squad with a ship out (red)', J('campFocusSubject(C, S.pn, 1000).why') === 'squad' && J('campFocusSubject(C, S.pn, 1000).u.id') === J('campFocusLeader(C, "red").id'));
g.run(`window.__redLead = campFocusLeader(C, 'red'); __redLead.hp = 0;`);
check('a squad whose leader is lost has the next ship as its leader; a squad with no ship out gives way to the next squad', J('campFocusLeader(C, "red") === null || campFocusLeader(C, "red").id !== __redLead.id') && J('campFocusSubject(C, S.pn, 1000).why') === 'squad');
g.run(`__redLead.hp = 100; campPanelClose(S.pn); window.R5 = __foe(900, 100); window.R6 = __foe(1400, 300); C.tgt = ''; campPanelKey(S.pn, C, 'KeyW', 1000); campPanelKey(S.pn, C, 'Enter', 1000);`); // Attack with two hostiles and no target picked: a sub-list of them
check('a target sub-list\'s candidate comes first (with a squad\'s list and the target both there): the hostile the highlight is on, and Down moves it to the next', J('!!S.pn.pick') && J('campFocusSubject(C, S.pn, 1000).why') === 'pick' && J('campFocusSubject(C, S.pn, 1000).u.id') === J('S.pn.pick.sel') && J('S.pn.pick.sel') === J('S.pn.pick.ids[0]') && (g.run(`campPanelKey(S.pn, C, 'ArrowDown', 1000);`), J('campFocusSubject(C, S.pn, 1000).u.id') === J('S.pn.pick.ids[1]')) && J('S.pn.pick.sel') === J('S.pn.pick.ids[1]'), J('campFocusSubject(C, S.pn, 1000).why'));
g.run(`campPanelClose(S.pn); S.pn.pick = null; S.pn.seen = null;`);
// a friend in a sub-list (escort, guard, help): the candidate is not hostile
g.run(`window.__tr = C.ships.find(u => u.team === 'earth' && u.kind !== 'fighter' && u.kind !== 'carrier' && u.hp > 0); window.__pk = campPickShown; campPickShown = () => ({ what: 'ship', id: __tr.id, x: __tr.x, y: __tr.y }); window.__fr = campFocusSubject(C, S.pn, 1000); campPickShown = __pk;`);
check('a ship you protect picked in a sub-list is the subject, as a friend (a transport, a hauler, a miner)', !!J('__tr') && J('__fr.why') === 'pick' && J('__fr.u.id') === J('__tr.id') && J('__fr.side') === 'friend', JSON.stringify(J('__fr && { why: __fr.why, side: __fr.side }')));
// the box of src/camptdisp.js (6-GEN): campFocusSeen reads campTdispSubject when it is there
g.run(`window.__realTdisp = window.campTdispSubject; window.campTdispSubject = (C, P, now) => ({ u: R2, side: 'hostile' }); C.tgt = ''; campPanelClose(S.pn); window.__d1 = campFocusSubject(C, S.pn, 1000); campFleetListSet(false); campPanelKey(S.pn, C, 'KeyQ', 1000); campFleetListSet(true); window.__d2 = campFocusSubject(C, S.pn, 1000); C.sel = ''; campPanelClose(S.pn); if (window.__realTdisp) window.campTdispSubject = window.__realTdisp; else delete window.campTdispSubject;`); // (the real one, once it has landed (src/camptdisp.js), is put back: it is a function declaration and cannot be deleted)
check('when the target display\'s own campTdispSubject is there the focus asks it for the sub-list\'s candidate and the picked hostile (the two read one selection), and keeps the squad\'s leader between them', J('__d1.why') === 'target' && J('__d1.u.id') === J('R2.id') && J('__d2.why') === 'squad' && J('__d2.u.id') === J('campFocusLeader(C, "red").id'));
check('a ship\'s name is the lists\' and the box\'s ("Raider 2", the cruiser)', /Raider/.test(J('campFocusName(C, R1)')) && J('campFocusName(C, C.carrier)') === 'the cruiser' && J('campFocusName(C, null)') === '');

// ---- B. the glide ----
console.log('B. the glide');
check('a near ship: the zoom is kept (both ends are on the screen); a far one: the zoom goes out until both ends are inside 0.8 of the screen, and never in', J('campFocusGlideZoom(0, 0, 800, 200, 0.5)') === 0.5 && (() => { const z = J('campFocusGlideZoom(0, 0, 3000, 0, 0.5)'); return z < 0.5 && z > 0.2 && (3000 + 240) * z <= 1280 * 0.8 * 1.0001; })() && J('campFocusGlideZoom(0, 0, 3000, 0, 0.25)') <= 0.25 && J('campFocusGlideZoom(0, 0, 100, 0, 0.25)') === 0.25);
check('the zoom of a very long glide stops at the Campaign\'s farthest (CAMZOOM.min)', J('campFocusGlideZoom(0, 0, 900000, 0, 0.5)') === J('CAMZOOM.min'));
check('the cruiser\'s arrow: none while it is on the screen; at the edge on the side it is, pointing at it, inside the pad', J('campFocusEdge(0, 0, 0.5, 100, 100, 40)') === null && (() => { const e = J('campFocusEdge(0, 0, 0.5, 10000, 0, 40)'); return e && Math.abs(e.x - (1280 - 40)) < 1e-6 && Math.abs(e.y - 360) < 1e-6 && e.a === 0; })() && (() => { const e = J('campFocusEdge(0, 0, 0.5, -8000, -8000, 40)'); return e && Math.abs(e.x - 320) < 1e-6 && e.y === 40 && Math.abs(e.a + 3 * Math.PI / 4) < 1e-9; })() && (() => { const e = J('campFocusEdge(0, 0, 0.5, 0, 5000, 40)'); return e && Math.abs(e.x - 640) < 1e-6 && e.y === 720 - 40 && Math.abs(e.a - Math.PI / 2) < 1e-9; })(), JSON.stringify([J('campFocusEdge(0, 0, 0.5, 10000, 0, 40)'), J('campFocusEdge(0, 0, 0.5, -8000, -8000, 40)')]));

// ---- C. the key ----
console.log('C. the key');
g.run(`var S = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1); window.__r = campFocusPress(S);`);
check('F with the picked hostile: a glide begins (the camera is let go of the cruiser: the glide is its own), from where the middle of the view was, to a point that is the ship\'s place; and the focus is the ship', J('__r') === 'start' && J('S.focus.id') === J('R1.id') && J('S.focus.gliding') === true && J('__cam.target') === null && J('__cam.stopped') === 1 && J('__cam.follows.length') === 0 && J('S.focus.pt.x') === J('R1.x') && J('S.focus.pt.y') === J('R1.y') && J('S.focus.from.x') === J('C.carrier.x') && J('S.focus.from.y') === J('C.carrier.y') && J('S.focus.why') === 'target' && J('S.focus.side') === 'hostile' && /Raider/.test(J('S.focus.name')), JSON.stringify(J('S.focus')));
check('a near ship does not touch the zoom', J('CAMZOOM.want') === 0.5 && J('S.focus.zoom') === null);
check('F again on the same ship does nothing (the focus is not begun again)', J('campFocusPress(S)') === 'same' && J('__cam.stopped') === 1);
g.run(`__frame(100, 2); window.__half = campFocusMid(__cam); window.__halfAt = [C.carrier.x, R1.x];`);
check('the glide is eased and by time: at 200 ms of the 500 the middle of the view is part of the way (more than a tenth, less than a half: eased in), not yet there', (() => { const m = J('__half'), a = J('__halfAt'), share = (m.x - a[0]) / (a[1] - a[0]); return J('S.focus.gliding') === true && share > 0.1 && share < 0.5; })(), JSON.stringify(J('[__half, __halfAt]')));
g.run(`__frame(100, 3);`);
check('at half a second the camera is exactly there (the same half second at any frame rate: here 100 ms frames): the glide ends and the follow goes to the cruiser\'s own lerp (0.12), on the same point', J('S.focus.gliding') === false && J('__cam.follows.length') === 1 && J('__cam.follows[0][1]') === 0.12 && J('__cam.follows[0][2]') === 0.12 && J('__cam.target === S.focus.pt') && J('campFocusMid(__cam).x') === J('R1.x') && J('campFocusMid(__cam).y') === J('R1.y'), JSON.stringify(J('[S.focus.gliding, S.focus.t, __cam.follows.length, campFocusMid(__cam), R1.x]')));
g.run(`var S = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1); campFocusPress(S); __frame(16.7, 30);`);
check('at 60 frames a second it takes the same half second: 30 frames in, it has arrived', J('S.focus.gliding') === false && J('campFocusMid(__cam).x') === J('R1.x'));
g.run(`var S = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1); campFocusPress(S); __frame(500, 1);`);
check('a long frame (a stall) lands the glide, no further; a huge one is cut to 100 ms so the glide is not skipped by a stalled tab', J('S.focus.gliding') === true && J('S.focus.t') === 100);
g.run(`var S = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1); campFocusPress(S); __frame(100, 5);`);
g.run(`R1.x += 300; R1.y -= 200; __frame(33.3, 3);`);
check('the point follows the ship as it flies (the camera follows the point)', J('S.focus.pt.x') === J('R1.x') && J('S.focus.pt.y') === J('R1.y'));
// a far one: zoom out for the glide, back at the end
g.run(`var S = __mk(); window.R3 = __foe(3000, 500); campTgtStep(C, 1); campFocusPress(S);`);
check('a far ship: the zoom goes out for the glide (both ends on the screen) and the wanted zoom is remembered', J('CAMZOOM.want') < 0.5 && J('S.focus.zoom.was') === 0.5 && J('S.focus.zoom.set') === J('CAMZOOM.want'), JSON.stringify(J('S.focus.zoom')));
g.run(`__frame(33.3, 30);`);
check('and it is back at the zoom it was when the camera has arrived', J('S.focus.gliding') === false && J('CAMZOOM.want') === 0.5 && J('S.focus.zoom') === null);
g.run(`var S = __mk(); window.R3 = __foe(3000, 500); campTgtStep(C, 1); campFocusPress(S); CAMZOOM.want = 0.3; __frame(33.3, 30);`);
check('a zoom the player set by hand meanwhile stays (it is not put back over his)', J('CAMZOOM.want') === 0.3);
g.run(`var S = __mk(); window.R3 = __foe(3000, 500); campTgtStep(C, 1); S.pickZoom = { was: 0.5, set: 0.5 }; campFocusPress(S);`);
check('with a target sub-list holding the zoom (its reveal) the glide leaves the zoom alone', J('CAMZOOM.want') === 0.5 && J('S.focus.zoom') === null);
g.run(`var S = __mk(); window.R1 = __foe(900, 0); window.R4 = __foe(1500, 700); campTgtStep(C, 1); campFocusPress(S); window.__id1 = S.focus.id; campTgtStep(C, 1); window.__r2 = campFocusPress(S);`);
check('another target and F again: the camera goes to that one (the next glide)', J('__r2') === 'start' && J('S.focus.id') !== J('__id1') && J('S.focus.id') === J('C.tgt'), J('S.focus.id') + ' ' + J('C.tgt'));
check('with nothing selected and no focus, F is the cruiser: nothing to do, nothing moved', (g.run(`var S = __mk();`), J('campFocusPress(S)') === 'cruiser' && J('S.focus') === null && J('__cam.follows.length') === 0));
g.run(`var S = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1); campFocusPress(S); campTgtClear(C); window.__r5 = campFocusPress(S);`);
check('with a focus and nothing selected, F is the way back: the camera follows the cruiser\'s sprite again, and the focus is gone', J('__r5') === 'back' && J('S.focus') === null && J('__cam.target.id') === 'sprite-of-the-cruiser' && J('__cam.follows[__cam.follows.length - 1][1]') === 0.12);
check('no key does anything in the map, a card, the pause, a finished battle or a scene that is leaving', (() => { const r = []; for (const set of ["S.mp = {}", "S.mode = 'debrief'", "S.mode = 'pause'", "C.result = 'won'", "S.leaving = true"]) { g.run(`var S = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1); ${set};`); r.push(J('campFocusPress(S)') + ':' + J('S.focus')); } return r.every(x => x === ':null'); })());

// ---- D. the end ----
console.log('D. the end');
const watch = () => g.run(`var S = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1); campFocusPress(S); __frame(33.3, 20); __toasts.length = 0; __cam.follows.length = 0;`);
watch(); g.run(`R1.hp = 0; __frame(33.3, 1);`);
check('the watched ship dies: the focus ends, the camera follows the cruiser again, and the player is told which ship is gone', J('S.focus') === null && J('__cam.target.id') === 'sprite-of-the-cruiser' && J('__toasts.length') === 1 && /Raider/.test(J('__toasts[0]')) && /gone/.test(J('__toasts[0]')) && /cruiser/.test(J('__toasts[0]')), JSON.stringify(J('__toasts')));
watch(); g.run(`R1.gone = true; __frame(33.3, 1);`);
check('a ship that leaves (flies off the map: gone) does the same', J('S.focus') === null && J('__toasts.length') === 1);
watch(); g.run(`delete C.by[R1.id]; __frame(33.3, 1);`);
check('and one that is no longer in the battle at all', J('S.focus') === null && J('__toasts.length') === 1);
watch(); g.run(`C.result = 'won'; __frame(33.3, 1);`);
check('the battle over takes the camera back to the cruiser, with no toast', J('S.focus') === null && J('__toasts.length') === 0 && J('__cam.target.id') === 'sprite-of-the-cruiser');
watch(); g.run(`S.mode = 'debrief'; __frame(33.3, 1);`);
check('a card on the screen (the debrief) does too', J('S.focus') === null);
watch(); g.run(`S.mode = 'pause'; __frame(33.3, 5);`);
check('the pause (and the H page, which is the pause\'s mode) keeps it', J('S.focus') !== null && J('S.focus.id') === J('R1.id'));
watch(); g.run(`window.__zk = campZoomKey('KeyS'); campZoomPress(S, __zk, false);`);
check('S (the zoom reset) brings the cruiser back and the zoom to its default', J('S.focus') === null && J('__cam.target.id') === 'sprite-of-the-cruiser' && J('CAMZOOM.want') === J('campZoomDefault()'));
watch(); g.run(`window.__rc = campViewRecentre(S);`);
check('campViewRecentre (the RECENTRE mark\'s click, S\'s door) ends a focus and says it did', J('__rc') === true && J('S.focus') === null && J('campViewRecentre(S)') === false);
watch(); g.run(`window.__zoomed = null; R1.hp = 0; S.focus.zoom = { was: 0.4, set: 0.3 }; CAMZOOM.want = 0.3; __frame(33.3, 1);`);
check('a focus that ends in the middle of a glide gives the zoom back', J('CAMZOOM.want') === 0.4 && J('S.focus') === null);

// ---- E. the drag view, the keys that fly ----
console.log('E. the drag view and the flying keys');
watch(); g.run(`campViewPan(S, 40, 10);`);
check('a drag of the mouse breaks the follow: the focus is let go, the hand has the view (panned), and nothing is put back', J('S.focus') === null && J('S.panned') === true && J('__cam.target') === null && J('__cam.stopped') >= 1);
g.run(`window.__r6 = campFocusPress(S);`);
check('and F picks it up again: the view is not the hand\'s any more and the camera follows the ship', J('__r6') === 'start' && J('S.panned') === false && J('S.focus.id') === J('R1.id') && J('S.focus.gliding') === true && J('__cam.target') === null);
g.run(`S.dragFly = 0;`);
check('a flying key held does NOT bring the view back from a focus (the drag\'s own flying key does from a pan): he is looking at it on purpose', J('campDragFlyTick(S, 5000, true)') === false && J('S.focus !== null') && J('campDragFrame(S, 5000, true) === undefined') === true && J('S.focus !== null'));
check('the arrows still fly the cruiser and the lists still work while looking elsewhere: the focus reads and writes none of them (the sim\'s input and the panels are left alone)', (() => { g.run(`C.input.thrust = 1; C.input.turn = 1; __frame(33.3, 3); campPanelKey(S.pn, C, 'KeyQ', 1000);`); return J('C.input.thrust') === 1 && J('C.input.turn') === 1 && J('campPanelOpen(S.pn)') === 'fleet' && J('S.focus !== null'); })());

// ---- F. the scene, the key table, the words ----
console.log('F. the scene, the key table, the words');
check('F is a key of the table (CAMP_KEYS.focus, code KeyF), spelled F, and nothing else in the table has it', J(`CAMP_KEYS.focus.k`) === 'F' && J(`CAMP_KEYS.focus.codes.join()`) === 'KeyF' && J(`Object.keys(CAMP_KEYS).filter(k => CAMP_KEYS[k].codes.indexOf('KeyF') >= 0).join()`) === 'focus' && J(`CAMP_PANELS.panels.every(p => p.code !== 'KeyF')`) && J(`campKeyVar('keyfocus')`) === 'F');
const sc = src('src/campaignscene.js'), dr = src('src/campdrag.js'), ix = src('index.html');
check('the scene calls campFocusInstall in create, campFocusFrame in update, and campFocusPress for the focus key before the lists read the key (with a list open it works; a call and the map do not take it)', /campFocusInstall\(this\)/.test(sc) && /campFocusFrame\(this, dt\)/.test(sc) && /campKeyIs\('focus', c\)[^]{0,120}campFocusPress\(this\)/.test(sc) && sc.indexOf("campKeyIs('focus', c)") < sc.indexOf('campPanelKey(this.pn, C, c, now)') && sc.indexOf("campKeyIs('focus', c)") > sc.indexOf('campMapKey(this, c, e.shiftKey)'));
check('the drag view lets go of a focus on a drag and ends it on the way back (the two spots of src/campdrag.js), and the script is loaded after it', /campFocusBreak\(s\)/.test(dr) && /campFocusEnd\(s, 'back'\)/.test(dr) && ix.indexOf('src/campfocus.js') > ix.indexOf('src/campdrag.js') && ix.indexOf('src/campfocus.js') < ix.indexOf('src/campmapdraw.js'));
g.run(`var S = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1);`);
check('the label says what is watched and the way back from the key table ("WATCHING Raider 1  S back"), the arrow\'s words the distance, the lost ship its name', (() => { const w = J(`uiText('camp.hud.focuswatch', { name: 'Raider 1' })`); return w === 'WATCHING Raider 1  S back' && J(`uiText('camp.hud.focuscruiserfar', { km: '12' })`) === 'Cruiser 12 km' && J(`uiText('camp.hud.focuslost', { name: 'Raider 1' })`) === 'Raider 1 is gone. Back to the cruiser.' && !/[{}]/.test(w); })());
g.run(`var S2 = __mk(); window.R1 = __foe(900, 0); campTgtStep(C, 1);
  window.__rec = { vis: [], txt: {}, tri: 0, clears: 0 }; window.__nt = 0;
  const mk = n => { const o = { name: n, width: 120, setScrollFactor() { return o; }, setDepth() { return o; }, setOrigin() { return o; }, setVisible(v) { __rec.vis.push(n + ':' + v); return o; }, setPosition(x, y) { o.x = x; o.y = y; return o; }, setText(t) { o.text = t; __rec.txt[n] = t; return o; }, text: '', style: { color: '' } }; return o; };
  S2.add = { graphics: () => { const o = mk('g'); o.clear = () => { __rec.clears++; return o; }; o.fillStyle = () => o; o.fillTriangle = () => { __rec.tri++; return o; }; return o; }, text: () => mk(++__nt === 1 ? 't' : 'a') };
  campFocusInstall(S2); campFocusPaint(S2); window.__off = __rec.vis.slice();
  campFocusPress(S2); __cam.scrollX = C.carrier.x - W / 2 + 40000; __cam.scrollY = C.carrier.y - H / 2; // far from the cruiser: its arrow shows
  campFocusPaint(S2); window.__on = __rec.vis.slice(-3);`);
check('the label and the arrow are drawn on the screen while a ship is watched, not while it is not (a graphics and two texts that the scene makes in create): the label says what is watched, the arrow one triangle and the cruiser\'s distance', J('S2.focusMark !== undefined') && J('__off').some(x => x === 't:false') && J('__on').some(x => x === 't:true') && J('__on').some(x => x === 'a:true') && J('__rec.tri') === 1 && /^WATCHING Raider/.test(J('__rec.txt.t')) && /^Cruiser \d/.test(J('__rec.txt.a')), JSON.stringify(J('__rec')));
// ---- G. the real scene: the key F and S through Campaign.onKey, the frame through Campaign.update ----
console.log('G. the real scene');
g.run(`
  go = () => {}; shipcompSay = () => true;
  window.__fake = () => { const f = Object.create(Campaign.prototype); f.add = document; f.input = document; f.textures = document; f.tweens = document;
    const cam = new Proxy(__cam, { get: (t, k) => k in t ? t[k] : document[k], set: (t, k, v) => { t[k] = v; return true; } });
    f.cameras = new Proxy({ main: cam }, { get: (t, k) => k in t ? t[k] : document[k] });
    f.time = { delayedCall: (ms, fn) => fn(), now: 1000 }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
    f.init({ level: 1, seed: 5, mission: 0, via: 'hub' }); f.camp = campNew(f.level, f.P.techs, f.opts); f.camp.god = true; f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {};
    f.sp[f.camp.carrier.id] = { id: 'sprite-of-the-cruiser', x: f.camp.carrier.x, y: f.camp.carrier.y };
    f.onKey({ code: 'Enter' }); __cam.zoom = 0.5; __cam.scrollX = f.camp.carrier.x - W / 2; __cam.scrollY = f.camp.carrier.y - H / 2; __cam.follows.length = 0; __cam.target = null; __cam.stopped = 0; CAMZOOM.want = 0.5; __toasts.length = 0; return f; };
  window.__tick = (f, s) => { for (let i = 0; i < s * 30; i++) f.update(0, 1000 / 30); };
`);
g.run(`window.F = __fake(); window.RX = campSpawn(F.camp, 'raider', F.camp.carrier.x + 1200, F.camp.carrier.y + 100); F.onKey({ code: 'BracketRight' });`); // ]: the next target (the key the scene reads through the lists' direct keys)
check('the scene in play: ] picks the hostile (the target), and F (KeyF through Campaign.onKey) glides the camera to it and follows it', J('F.mode') === 'play' && J('F.camp.tgt') === J('RX.id') && (g.run(`F.onKey({ code: 'KeyF' });`), J('F.focus && F.focus.id') === J('RX.id')) && J('__cam.target') === null && J('__cam.stopped') >= 1);
g.run(`__tick(F, 0.7);`);
check('half a second on, through the scene\'s update: the camera has arrived at the ship (the middle of the view is within a hundred px of it: Phaser\'s follow, which this stand-in does not run, carries it on) and follows it (0.12), and the flight went on meanwhile (the battle clock ran)', J('F.focus.gliding') === false && Math.abs(J('campFocusMid(__cam).x') - J('RX.x')) < 150 && J('__cam.follows.length') === 1 && J('F.camp.t') > 600, JSON.stringify(J('[F.focus.gliding, campFocusMid(__cam).x, RX.x, F.camp.t]')));
g.run(`F.k.UP.isDown = true; F.camp.input.thrust = 0; __tick(F, 0.3); window.__thr = F.camp.input.thrust; F.k.UP.isDown = false;`);
check('and the arrow keys still fly the cruiser while the camera is elsewhere (Up is thrust in the sim\'s input), and the focus stays', J('__thr') === 1 && J('F.focus !== null'));
g.run(`F.onKey({ code: 'KeyQ' }); window.__open = campPanelOpen(F.pn); F.onKey({ code: 'KeyF' }); window.__same = F.focus && F.focus.id;`);
check('a list opens while looking elsewhere (Q), and F with the list open does not close it or lose the ship', J('__open') === 'fleet' && J('campPanelOpen(F.pn)') === 'fleet' && J('__same') === J('RX.id'));
g.run(`F.onKey({ code: 'Escape' }); F.onKey({ code: 'KeyS' });`);
check('S through the scene brings the cruiser back (the follow is the cruiser\'s sprite again) and resets the zoom', J('F.focus') === null && J('__cam.target.id') === 'sprite-of-the-cruiser' && J('CAMZOOM.want') === J('campZoomDefault()'));
g.run(`F.onKey({ code: 'KeyF' });`);
check('F with the target still picked looks at it again', J('F.focus && F.focus.id') === J('RX.id'));
g.run(`F.camp.by[RX.id].hp = 0; __tick(F, 0.2);`);
check('the ship dies in the battle: the scene says so and follows the cruiser again', J('F.focus') === null && J('__toasts.some(t => /gone/.test(t))') && J('__cam.target.id') === 'sprite-of-the-cruiser');
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `FOCUS VIEW FAIL (${failed} of ${n})` : `FOCUS VIEW PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
