// smoke: the new screens' arrows (card space-game-screens-arrows-walk; Troy, 26 Nov 2026): all four arrows move round the mission pick's grid and Enter selects; Left and Right walk the one-page briefing's four moments; Esc is Back on both (plain Node, no Chrome)
// Troy, playing with the new screens on: "on the mission pick all four arrows move round the grid and Enter selects; on the briefing Left and Right step through the four numbered moments, highlighting each and panning the map to it". Behind CAMP.flags.screens: with it off nothing changes.
//   A. the grid (src/camphub.js campHubGridMove, the open list of campHubKey): the rows are levels, the columns the missions; Left and Right along a row over the tiles the cursor can stand on (done, skipped, next), Up and Down to the row above or below with one (the same column, else the nearest), every move stops at an edge, a dim tile is never stood on; Enter selects, Esc is Back; with the switch off today's list is as it was
//   B. the chips of both screens are the key table's roles (Up Down Left Right Choose, Enter Briefing, Esc Back; Launch, Left Right Step, Esc Back)
//   C. the walk (src/scrbriefdraw.js scrBriefStep, scrBriefTick): Right goes 1, 2, 3, 4 and then back to the whole route; Left comes back and at 1 goes to the whole route; the card of the step is lit; the map moves to the mark smoothly (not a jump), at SCRBRIEF.walk.zoom times the view, centred on it; for 1.1 and one mission of each level
//   D. the keys: Right and Left (and D and A) step, Esc closes, L and Enter launch, + - M work as before; the keys are the table's
// Run: node tests/scrwalk.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { SCR_DOM } from './scrdomstand.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => { const r = g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`); if (typeof r !== 'string') throw new Error('J: no answer for ' + e + (g.errors.length ? ' (' + g.errors.join(' | ') + ')' : '')); return JSON.parse(r); };
g.run(SCR_DOM);
g.run(`
  window.__fresh = () => { window.PR = campProgressNew(); window.HB = campHubNew(PR, {}); return PR; };
  window.__flown = () => { __fresh(); PR.level = 2; PR.mission = 0; PR.techs = ['shield']; PR.ore = 100; PR.credits = 60; PR.bonus = { fighters: 1, escorts: 0 };
    PR.results = { '1.1': { score: 4280, bonuses: ['swift', 'hull', 'miner'], t: 306, hull: 600, lost: 0, tries: 1 }, '1.3': { score: 3100, bonuses: ['delivered'], t: 400, hull: 400, lost: 1, tries: 1 } }; HB = campHubNew(PR, {}); return PR; }; // 1.1 done, 1.2 skipped (dashed), 1.3 done, 2.1 next, the rest dim
  window.__sel = () => campHubSelectable(PR).map(r => r.level + '.' + (r.i + 1));
  window.__at = () => { const r = campHubSelectable(PR)[HB.cur | 0]; return r ? r.level + '.' + (r.i + 1) : null; };
  window.__go = code => { const r = campHubKey(HB, PR, code, {}); return r; };
  window.__tiles = () => { const out = []; (function w(x) { if (!x) return; if (x.k === 'tile') out.push(x); (x.kids || []).forEach(w); })(scrHubPickModel(PR, HB, {})); return out; };
  window.__texts = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'text') out.push(x.text); (x.kids || []).forEach(w); })(n); return out; };
  window.__chips = n => { const out = []; (function w(x) { if (!x) return; if (x.k === 'chip') out.push(x.id + ':' + x.cap); (x.kids || []).forEach(w); })(n); return out; };
`);

console.log('A. the mission pick\'s grid');
g.run(`CAMP.flags.screens = true; __flown(); HB.open = 'board'; HB.cur = 0;`);
check('the fixture: 1.1 done, 1.2 skipped, 1.3 done and 2.1 next are the tiles the cursor can stand on; 2.2, 2.3 and level 3 are dim', J('__sel().join()') === '1.1,1.2,1.3,2.1' && J('__at()') === '1.1');
g.run(`window.__r = __go('ArrowRight');`);
check('Right goes along the row to the next tile, over a skipped one (1.2)', J('__at()') === '1.2' && J('__r.used') === true && J('__r.moved') === true && J('HB.open') === 'board', J('__at()'));
g.run(`__go('ArrowRight'); window.__r = __go('ArrowRight');`);
check('Right on the last tile of the row stays: the key is used, nothing moves, the list stays open', J('__at()') === '1.3' && J('__r.used') === true && J('__r.moved') === false && J('HB.open') === 'board');
g.run(`window.__r = __go('ArrowDown');`);
check('Down from 1.3 goes to the row below, to its nearest tile (2.1: the row has only the first column the cursor can stand on)', J('__at()') === '2.1' && J('__r.moved') === true);
g.run(`window.__r = __go('ArrowDown');`);
check('Down again stays: level 3 has nothing to stand on (dim tiles are skipped, never stood on) and the grid has an edge, it does not go round', J('__at()') === '2.1' && J('__r.moved') === false);
g.run(`window.__r = __go('ArrowRight');`);
check('Right from 2.1 stays: 2.2 and 2.3 are dim', J('__at()') === '2.1' && J('__r.moved') === false);
g.run(`window.__r = __go('ArrowUp');`);
check('Up from 2.1 goes to the same column of the row above (1.1), and Up from there stays on the top row', J('__at()') === '1.1' && (g.run(`window.__r = __go('ArrowUp');`), J('__at()') === '1.1' && J('__r.moved') === false));
g.run(`window.__r = __go('ArrowLeft');`);
check('Left on the first tile stays and does not close the list (Esc is Back)', J('__at()') === '1.1' && J('HB.open') === 'board' && J('__r.moved') === false);
g.run(`__go('KeyD'); __go('KeyD'); __go('KeyS');`);
check('the letters of the same table (A D W S) move the same way: D D S from 1.1 reach 2.1', J('__at()') === '2.1');
g.run(`__go('KeyW'); __go('KeyA');`);
check('W and A come back: 1.1 and then 1.1 again', J('__at()') === '1.1');
const mid = () => J(`(() => { HB.cur = 1; return null; })()`);
mid(); g.run(`window.__r = __go('ArrowDown');`);
check('Down from the middle tile (1.2, the second column) goes to the nearest tile of the next row (2.1: the only one)', J('__at()') === '2.1');
g.run(`__flown(); PR.level = 2; PR.mission = 2; PR.results['2.1'] = { score: 3000, bonuses: [], t: 100, hull: 500, lost: 0, tries: 1 }; PR.results['2.2'] = { score: 2000, bonuses: [], t: 100, hull: 500, lost: 0, tries: 1 }; HB = campHubNew(PR, {}); HB.open = 'board'; HB.cur = 2;`);
check('a fuller save: level 2 has three tiles (2.1 and 2.2 done, 2.3 next); Down from the third column of level 1 lands on the third column of level 2', J('__sel().join()') === '1.1,1.2,1.3,2.1,2.2,2.3' && (g.run(`__go('ArrowDown');`), J('__at()') === '2.3'));
g.run(`__go('ArrowLeft'); __go('ArrowLeft'); __go('ArrowUp');`);
check('Left, Left along the row to the first, Up to the row above: 1.1', J('__at()') === '1.1');
g.run(`window.__r = __go('Enter');`);
check('Enter selects: it opens the briefing of the tile the cursor is on (the list\'s own action), with the cursor kept', J('__r.used') === true && J('__r.action') === J('CAMP_HUB.act.board') && J('__r.action') !== '' && J('__at()') === '1.1');
g.run(`HB.open = 'board'; HB.cur = 1; window.__r = __go('Escape');`);
check('Esc is Back: it closes the list (Left no longer does)', J('HB.open') === '' && J('__r.moved') === true);
g.run(`__fresh(); HB.open = 'board'; HB.cur = 0; window.__r = [__go('ArrowLeft'), __go('ArrowRight'), __go('ArrowUp'), __go('ArrowDown')].map(r => r.moved);`);
check('a fresh game has one tile (1.1): no arrow moves, none closes the list', J('__r.join()') === 'false,false,false,false' && J('HB.open') === 'board');
const tiles = () => J('__tiles().map(t => ({ on: !!t.on, dim: !!t.dim, dash: !!t.dash }))');
g.run(`__flown(); HB.open = 'board'; HB.cur = 0;`);
check('the grid shows the cursor on one lit tile, never on a dim one: 1.1 lit; after Right, 1.2 (the dashed one) is lit', tiles().filter(t => t.on).length === 1 && tiles()[0].on && (g.run(`__go('ArrowRight');`), tiles()[1].on && tiles()[1].dash && tiles().filter(t => t.on).length === 1 && tiles().filter(t => t.on).every(t => !t.dim)));
g.run(`CAMP.flags.screens = false; __flown(); HB.open = 'board'; HB.cur = 0; window.__r = __go('ArrowRight');`);
check('with the switch off nothing changes: Right opens the briefing of the mission (the list\'s own action), Down goes down the list, Left closes it', J('__r.action') === J('CAMP_HUB.act.board') && (g.run(`HB.cur = 0; __go('ArrowDown');`), J('HB.cur') === 1) && (g.run(`__go('ArrowLeft');`), J('HB.open') === ''));

console.log('B. the chips are the key table\'s');
g.run(`CAMP.flags.screens = true; __flown(); HB.open = 'board';`);
const pc = J(`__chips(scrHubPickModel(PR, HB, {}))`), pt = J(`__texts(scrHubPickModel(PR, HB, {}))`);
check('the mission pick: Up Down Left Right, Choose, Enter Briefing, Esc Back', pc.join() === 'up:Up,down:Down,left:Left,right:Right,pick:Enter,close:Esc' && ['Choose', 'Briefing', 'Back'].every(t => pt.indexOf(t) > 0), pc.join());
check('every one of them is a role the mission pick takes (the key table says which screens take Left, Right and Esc)', ['up', 'down', 'left', 'right', 'pick', 'close'].every(r => J(`scrKeysOf('pick').indexOf('${r}') >= 0`)));

console.log('C. the walk of the briefing');
g.run(`
  window.__said = []; window.__launched = 0; shipcompSay = t => { __said.push(t); }; sfx = () => {};
  const chain = new Proxy({}, { get: (t, k) => k === 'width' || k === 'height' ? 10 : k === 'then' ? undefined : (...a) => chain });
  window.__stand = extra => Object.assign({ P: PR, hub: HB, accent: '#6dff9c', add: new Proxy({}, { get: (t, k) => (...a) => chain }), input: { on() {}, off() {} }, game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 1280, height: 720 }) } }, events: { once() {} }, scrHost: null, bf: null, launch() { __launched++; } }, extra || {});
  window.__paints = 0; window.__paint0 = campBriefPaintMap; campBriefPaintMap = s => { __paints++; };
  window.__open = (level, i) => { __fresh(); PR.level = 3; PR.mission = 2; HB = campHubNew(PR, {}); HB.pick = { level, i }; window.S = __stand({ P: PR, hub: HB }); return campBriefOpen(S); };
  window.__lit = () => __find(S.bf.el, e => /(^| )sc-tile( |$)/.test(e._cls) && /(^| )on( |$)/.test(e._cls)).length;
  window.__tick = (t) => scrBriefTick(S, t);
`);
check('1.1 opens the one page with four moments, on the whole route (step 0), none lit', J(`__open(1, 0)`) === true && J('S.bf.moments.length') === 4 && J('S.bf.one') === true && (J('S.bf.step | 0') === 0) && J('__lit()') === 0 && J('S.bf.anim === undefined || S.bf.anim === null'));
g.run(`window.__fit0 = Object.assign({}, S.bf.fit); window.__z0 = S.bf.z; window.__r = campBriefKey(S, 'ArrowRight', false);`);
check('Right: step 1, the first moment\'s card is lit (one lit tile), the key is the page\'s (true), and the map has not jumped (the view is as it was until the clock moves)', J('__r') === true && J('S.bf.step') === 1 && J('__lit()') === 1 && J('S.bf.fit.s === __fit0.s && S.bf.fit.cx === __fit0.cx && S.bf.fit.cy === __fit0.cy') && J('S.bf.anim !== null'));
g.run(`__tick(1000);`);
check('the clock starts the move: at its first frame the view is still the old one (the move begins when the clock does)', J('Math.abs(S.bf.fit.s - __fit0.s) < 1e-9 && Math.abs(S.bf.fit.cx - __fit0.cx) < 1e-6'));
g.run(`__tick(1000 + SCRBRIEF.walk.ms / 2); window.__half = Object.assign({}, S.bf.fit);`);
const tgt = J('({ s: S.bf.base.s * Math.min(CAMPBRIEF.zoom.max, SCRBRIEF.walk.zoom), cx: S.bf.moments[0].at.x, cy: S.bf.moments[0].at.y })');
check('half way the view is between the two: smooth, neither the old view nor the target (the scale and the centre have both moved part of the way)', J('__half.s > __fit0.s') && J(`__half.s < ${tgt.s}`) && J(`__half.cx !== __fit0.cx && Math.abs(__half.cx - ${tgt.cx}) > 1e-6`) && J('S.bf.anim !== null'));
g.run(`__tick(1000 + SCRBRIEF.walk.ms + 40);`);
check('at the end the map is centred on the moment\'s mark at SCRBRIEF.walk.zoom times the view, the move is over, and the map was painted each frame', J(`Math.abs(S.bf.fit.s - ${tgt.s}) < 1e-9 && Math.abs(S.bf.fit.cx - ${tgt.cx}) < 1e-6 && Math.abs(S.bf.fit.cy - ${tgt.cy}) < 1e-6`) && J('S.bf.anim === null') && J('__paints') >= 3);
g.run(`window.__pr = campBriefProj(S.bf.fit, S.bf.frame)(S.bf.moments[0].at.x, S.bf.moments[0].at.y);`);
check('the mark is in the middle of the map\'s frame', J('Math.abs(__pr.x - (S.bf.frame.x + S.bf.frame.w / 2)) < 1e-6 && Math.abs(__pr.y - (S.bf.frame.y + S.bf.frame.h / 2)) < 1e-6'));
g.run(`campBriefKey(S, 'ArrowRight', false); campBriefKey(S, 'ArrowRight', false); campBriefKey(S, 'ArrowRight', false);`);
check('Right, Right, Right: the fourth moment, one card lit', J('S.bf.step') === 4 && J('__lit()') === 1);
g.run(`window.__r = campBriefKey(S, 'ArrowRight', false);`);
check('Right past the fourth returns to the whole route (step 0, no card lit)', J('__r') === true && J('S.bf.step') === 0 && J('__lit()') === 0 && J('S.bf.anim !== null'));
g.run(`window.__t0 = 5000; __tick(__t0); __tick(__t0 + SCRBRIEF.walk.ms + 10);`);
check('and the map goes back to the whole-route view, as it was at the start (the scale and the centre)', J('Math.abs(S.bf.fit.s - __fit0.s) < 1e-9 && Math.abs(S.bf.fit.cx - __fit0.cx) < 1e-6 && Math.abs(S.bf.fit.cy - __fit0.cy) < 1e-6') && J('Math.abs(S.bf.z - __z0) < 1e-9'));
g.run(`campBriefKey(S, 'ArrowRight', false); __tick(9000); __tick(9000 + SCRBRIEF.walk.ms + 10); campBriefKey(S, 'ArrowRight', false); window.__r = campBriefKey(S, 'ArrowLeft', false);`);
check('Left steps back: from 2 to 1; and from 1 to the whole route', J('__r') === true && J('S.bf.step') === 1 && (g.run(`campBriefKey(S, 'ArrowLeft', false);`), J('S.bf.step') === 0 && J('__lit()') === 0));
g.run(`__tick(20000); __tick(21000); window.__p0 = __paints; window.__r = campBriefKey(S, 'ArrowLeft', false);`);
check('Left on the whole route stays on it (nothing moves, the key is still the page\'s)', J('__r') === true && J('S.bf.step') === 0 && J('S.bf.anim === null') && J('campBriefIsOpen(S)') === true);
check('the page is made again for a step: one panel in the host each time (no panel left behind)', J('S.scrHost.root.children.length') === 1);
for (const [level, i] of [[1, 1], [2, 0], [3, 1]]) {
  g.run(`__open(${level}, ${i});`);
  const k = J('S.bf.moments.length');
  check('mission ' + level + '.' + (i + 1) + ': ' + k + ' moments; Right walks 1 to ' + k + ' and then the whole route, each step\'s move ends on that moment\'s mark', k >= 1 && (() => { let ok = true; for (let s = 1; s <= k; s++) { g.run(`campBriefKey(S, 'ArrowRight', false); __tick(100); __tick(100 + SCRBRIEF.walk.ms + 10);`); ok = ok && J('S.bf.step') === s && J(`Math.abs(S.bf.fit.cx - S.bf.moments[${s - 1}].at.x) < 1e-6 && Math.abs(S.bf.fit.cy - S.bf.moments[${s - 1}].at.y) < 1e-6`) && J('__lit()') === 1; g.run(`S.bf.anim = null;`); } g.run(`campBriefKey(S, 'ArrowRight', false);`); return ok && J('S.bf.step') === 0; })());
}
g.run(`__open(1, 0); S.bf.moments.length = 0; window.__r = campBriefKey(S, 'ArrowRight', false);`);
check('a mission with no moments yet: Right is the page\'s and does nothing (no step, no move)', J('__r') === true && J('S.bf.step | 0') === 0 && J('S.bf.anim === undefined || S.bf.anim === null'));

console.log('D. the keys');
g.run(`__open(1, 0); campBriefKey(S, 'KeyD', false);`);
check('D steps forward and A steps back (the key table\'s Right and Left codes)', J('S.bf.step') === 1 && (g.run(`campBriefKey(S, 'KeyA', false);`), J('S.bf.step') === 0));
check('the codes are read from the key table\'s roles (Left, Right, Esc), none written in the briefing\'s code', J(`scrKey('left').codes.indexOf('ArrowLeft') >= 0 && scrKey('right').codes.indexOf('ArrowRight') >= 0 && scrKey('close').codes.indexOf('Escape') >= 0`));
g.run(`campBriefKey(S, 'ArrowRight', true);`);
check('a held key repeats nothing: a repeat is not a step', J('S.bf.step | 0') === 0);
g.run(`window.__z1 = S.bf.z; campBriefKey(S, 'Equal', false);`);
check('the zoom keys work as ever', J('S.bf.z') > J('__z1'));
g.run(`campBriefKey(S, 'Escape', false);`);
check('Esc closes the page (Back): the host is empty', J('campBriefIsOpen(S)') === false && J('S.scrHost.root.children.length') === 0 && J('__launched') === 0);
g.run(`__open(1, 0); campBriefKey(S, 'ArrowRight', false); campBriefKey(S, 'Enter', false);`);
check('Enter launches (as today), also with a moment lit', J('__launched') === 1 && J('campBriefIsOpen(S)') === false);
g.run(`__open(1, 0); campBriefKey(S, 'KeyL', false);`);
check('L launches', J('__launched') === 2);
check('a map tick when nothing moves does nothing, and with no page it is false', J('scrBriefTick(S, 1)') === false && J('scrBriefTick({}, 1)') === false && J('scrBriefStep({}, 1)') === false);

console.log('E. the old briefing and the switch off');
g.run(`CAMP.flags.screens = false; campBriefPaintMap = __paint0;`);
check('with the switch off the new page is not made and the keys of the old briefing are as they were: scrBriefStep needs the one page (bf.one)', J(`scrBriefStep({ bf: { one: false, open: true, moments: [{ at: { x: 0, y: 0 } }] } }, 1)`) === false);
check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `SCR WALK FAIL (${failed} of ${n})` : `SCR WALK PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
