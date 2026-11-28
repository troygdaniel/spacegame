// smoke: the new Long Haul's camera leads a boosting ship as the Campaign's does (plain Node, no Chrome): off does nothing; on, the lead and the zoom-out are the Campaign's own functions and numbers, they ease in and out, and they stop for a dock, a landing and a death
// PROMPT 23 (the cloud session's brief 15), piece 7 of docs/longhaul-earth.html. src/lhcam.js: lhCamStep (pure), lhCamFrame; the hook is in the space scene's update (src/space.js).
//   A  off: lhCamFrame is false and the camera is not touched
//   B  the step: with no boost there is no lead and no zoom-out; boosting at full speed the lead eases toward the Campaign's fifth of the view along the flight and the zoom toward its 0.9; letting go eases both back
//   C  it is the Campaign's maths: after a long boost the lead is campFeelLead's own answer and the zoom campFeelZoomK(1)
//   D  the frame: the follow's offset is minus the lead; nothing leads while a docking move plays, when you are destroyed, or when the camera follows something else; the base zoom is multiplied only while nothing else moves the zoom
//   E  the hook asks first; the Campaign's file has no word of it; the file asks the web for nothing
//   F  the - and = keys (card space-game-lh-earth-zoom): off they do nothing and the range is Long Haul's 0.4; on the range is 0.05, a press is the Campaign's step, the wheel keeps working over the same range, the keypad's keys work, Q (the dash) is not a zoom key, a dead or leaving ship ignores them; the keys page lists them only with the switch on
// Run: node tests/lhcam.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`window.mkScene = () => { const ship = { body: { velocity: { x: 800, y: 0 }, maxSpeed: 800 } }; const cam = { zoom: 1, width: 1280, height: 720, _follow: ship, followOffset: { x: 0, y: 0 }, sets: 0, setFollowOffset(x, y) { this.followOffset = { x, y }; this.sets++; } };
  return { ship, cameras: { main: cam }, boosting: true, dead: false, leaving: false, _cz: { base: 1, out: 1 } }; };
window.run = (s, frames) => { for (let i = 0; i < frames; i++) lhCamFrame(s, 16.7); return s; };`);

console.log('A  off');
check('lhCamFrame is false and the camera is not touched', J(`(() => { const s = mkScene(); return [lhCamFrame(s, 16.7), s.cameras.main.sets, s._cz.base]; })()`).join() === 'false,0,1');

console.log('B  the step');
J('lhNewSet(true)');
const v = '{ on: true, boosting: BOOST, vx: 800, vy: 0, top: 800, vw: 1280, vh: 720 }';
const step = (boost, frames, st) => J(`(() => { const st = ${st || '{ z: 0, k: 1 }'}; let r; for (let i = 0; i < ${frames}; i++) r = lhCamStep(st, ${v.replace('BOOST', boost)}, 16.7); return { r, st }; })()`);
const none = step(false, 30), some = step(true, 20), long = step(true, 600);
check('with no boost there is no lead and no zoom-out', none.r.x === 0 && none.r.y === 0 && none.r.k === 1);
check('boosting, the lead grows along the flight and the view pulls back', some.r.x > 5 && some.r.x < long.r.x && some.r.y === 0 && some.r.k < 1 && some.r.k > long.r.k, JSON.stringify([some.r, long.r]));
const back = step(false, 600, JSON.stringify(long.st));
check('letting go eases both back to nothing', back.r.x === 0 && back.r.k === 1, JSON.stringify(back.r));

console.log('C  the Campaign\'s maths');
const want = J(`campFeelLead(800, 0, 800, 1, 1280, 720, campFeelLerp(1))`);
check('after a long boost the lead is campFeelLead\'s answer: a fifth of the view and the follow\'s own lag', Math.abs(long.r.x - want.x) < 0.6 && want.x > 0.2 * 1280, long.r.x + ' ' + want.x);
check('and the zoom is the Campaign\'s boost zoom', long.r.k === J('campFeelZoomK(1)') && long.r.k === J('CAMPFEEL.cam.boostZoom'));
check('a ship flying down leads down', J(`(() => { const st = { z: 1, k: 1 }; let r; for (let i = 0; i < 300; i++) r = lhCamStep(st, { on: true, boosting: true, vx: 0, vy: 800, top: 800, vw: 1280, vh: 720 }, 16.7); return r.x === 0 && r.y > 0.2 * 720; })()`) === true);

console.log('D  the frame');
const fr = J(`(() => { const s = run(mkScene(), 600), c = s.cameras.main; return { ox: c.followOffset.x, oy: c.followOffset.y, base: s._cz.base }; })()`);
check('the follow\'s offset is minus the lead', Math.abs(fr.ox + want.x) < 0.6 && fr.oy === 0, JSON.stringify(fr));
check('the base zoom takes the multiplier while it is ours', fr.base === J('CAMPFEEL.cam.boostZoom'));
check('nothing leads while a docking move plays, when destroyed, or when the camera follows something else', J(`['leaving', 'dead', 'other'].map(k => { const s = mkScene(); if (k === 'other') s.cameras.main._follow = {}; else s[k] = true; run(s, 300); return s.cameras.main.followOffset.x; })`).join() === '0,0,0');
check('a lead that was on eases off when a docking move starts', J(`(() => { const s = run(mkScene(), 600); s.leaving = true; run(s, 600); return s.cameras.main.followOffset.x === 0 && s._cz.base === 1; })()`) === true);
check('the game\'s own base is multiplied, not replaced, and comes back whole', J(`(() => { const s = mkScene(); s._cz.base = 0.5; run(s, 600); const a = s._cz.base; s.boosting = false; run(s, 600); return [a, s._cz.base]; })()`).join() === '0.45,0.5');
check('a zoom that is being moved by something else is not written', J(`(() => { const s = mkScene(); s.cameras.main.zoom = 0.8; run(s, 300); return s._cz.base; })()`) === 1);
J('lhNewSet(null)');

console.log('E  the hook');
check('the space scene asks before it calls', /if \(typeof lhCamFrame === 'function'\) lhCamFrame\(this, dt\);/.test(src('src/space.js')));
check('the Campaign\'s file has no word of it', !/lhCam|lhNewOn/.test(src('src/campfeel.js')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhcam.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log('F  the - and = zoom keys');
{
  g.run(`window.scn = () => { const l = {}; return { _cz: {}, leaving: false, dead: false, input: { keyboard: { on(ev, f) { l[ev] = f; }, off(ev, f) { if (l[ev] === f) delete l[ev]; }, l } }, events: { once(ev, f) { this.sd = f; }, sd: null } }; };`);
  J('lhNewSet(false)'); const min0 = J('CAMZOOM.min'), lab0 = J('CAMZOOM.labelMax');
  check('off: Long Haul\'s range (0.4, labels at most 2.5 times) and the keys do nothing', min0 === 0.4 && lab0 === 2.5 && J(`(() => { CAMZOOM.want = 1; const s = scn(); return [lhZoomSetup(s), lhZoomPress(s, 'Minus', false), CAMZOOM.want, Object.keys(s.input.keyboard.l).length]; })()`).join() === 'false,false,1,0');
  J('lhNewSet(true)');
  check('on: the range is 0.05 and the labels keep their size that far out (20 times)', J('lhZoomRange()') === true && J('CAMZOOM.min') === 0.05 && J('CAMZOOM.labelMax') === 20);
  check('the keys are the table\'s: = and the keypad + zoom in, - and the keypad - zoom out; Q (the dash), Backspace and others are not zoom keys', J(`['Equal', 'NumpadAdd', 'Minus', 'NumpadSubtract', 'KeyQ', 'Backspace', 'KeyW'].map(c => { const k = lhZoomKey(c); return k ? k.dir : 0; })`).join() === '1,1,-1,-1,0,0,0');
  check('a press of - is the Campaign\'s step (1.2), and = after it is where it began', J(`(() => { CAMZOOM.want = 1; const s = scn(); lhZoomPress(s, 'Minus', false); const a = CAMZOOM.want; lhZoomPress(s, 'Equal', false); return Math.abs(a - 1 / 1.2) < 1e-9 && Math.abs(CAMZOOM.want - 1) < 1e-9; })()`) === true);
  check('pressing - again and again stops at 0.05, a step of 1.5 past 0.2 (so the way out is a few more presses), and = never goes past 1.6', J(`(() => { CAMZOOM.want = 1; const s = scn(), seen = []; for (let i = 0; i < 40; i++) { lhZoomPress(s, 'Minus', false); seen.push(CAMZOOM.want); } const lo = CAMZOOM.want; for (let i = 0; i < 40; i++) lhZoomPress(s, 'Equal', false); return { lo, hi: CAMZOOM.want, steps: seen.findIndex(x => x === 0.05) + 1 }; })()`).lo === 0.05 && J(`CAMZOOM.want`) === 1.6);
  check('a held key repeats in the smooth step (1.03)', J(`(() => { CAMZOOM.want = 1; lhZoomPress(scn(), 'Minus', true); return Math.abs(CAMZOOM.want - 1 / 1.03) < 1e-9; })()`) === true);
  check('the wheel goes over the same range: a long wheel out stops at 0.05, not 0.4', J(`(() => { let w = 1; for (let i = 0; i < 60; i++) w = camzoomWheel(w, 240); return w; })()`) === 0.05);
  check('a dead ship, a leaving scene and a scene with no zoom camera ignore the keys', J(`(() => { CAMZOOM.want = 1; const a = scn(), b = scn(), c = scn(); a.dead = true; b.leaving = true; delete c._cz; return [lhZoomPress(a, 'Minus', false), lhZoomPress(b, 'Minus', false), lhZoomPress(c, 'Minus', false), CAMZOOM.want]; })()`).join() === 'false,false,false,1');
  check('lhZoomSetup puts one keydown listener on the scene, the key moves the zoom, and the scene\'s shutdown takes it off', J(`(() => { CAMZOOM.want = 1; const s = scn(); const ok = lhZoomSetup(s), had = !!s.input.keyboard.l.keydown; s.input.keyboard.l.keydown({ code: 'Minus', repeat: false }); const w = CAMZOOM.want; s.events.sd(); return [ok, had, Math.abs(w - 1 / 1.2) < 1e-9, !s.input.keyboard.l.keydown]; })()`).join() === 'true,true,true,true');
  check('with the switch on the flight group lists - and =, and the H page line for the Space scene says it', J(`controlsGroup('flight').rows.some(r => r.lh && r.k.join() === '-,=')`) === true && J(`controlsHelp('Space').some(l => /^- =\\s+zoom out and in/.test(l))`) === true, J(`controlsHelp('Space').slice(-3).join(' / ')`));
  check('the row\'s keys are the Campaign table\'s zoom keys (CAMP_KEYS zoomout and zoomin), the ones src/lhcam.js reads through campZoomKey (tests/controlshelp.mjs leaves a row marked lh to this test)', J(`(() => { const r = controlsGroup('flight').rows.find(x => x.lh); return [r.k.join(), CAMP_KEYS.zoomout.k, CAMP_KEYS.zoomin.k].join(); })()`) === '-,=,-,=');
  J('lhNewSet(false)');
  check('with the switch off the flight group and the H page do not list it (today\'s list)', J(`controlsGroup('flight').rows.some(r => r.lh)`) === false && J(`controlsHelp('Space').some(l => /^- =/.test(l))`) === false && J(`CONTROLS.find(g => g.id === 'flight').rows.length - controlsGroup('flight').rows.length`) === 1);
  check('and the range is given back: Long Haul\'s 0.4 and 2.5', J('lhZoomRange()') === false && J('CAMZOOM.min') === 0.4 && J('CAMZOOM.labelMax') === 2.5);
  check('the Campaign\'s zoom file has no word of it', !/lhZoom|lhNewOn/.test(src('src/campzoom.js')) && !/lhZoom|lhNewOn/.test(src('src/camzoom.js')));
}

console.log(failed ? `\nLHCAM FAIL: ${failed} of ${n} checks failed` : `\nLHCAM PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
