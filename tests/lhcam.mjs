// smoke: the new Long Haul's camera leads a boosting ship as the Campaign's does (plain Node, no Chrome): off does nothing; on, the lead and the zoom-out are the Campaign's own functions and numbers, they ease in and out, and they stop for a dock, a landing and a death
// PROMPT 23 (the cloud session's brief 15), piece 7 of docs/longhaul-earth.html. src/lhcam.js: lhCamStep (pure), lhCamFrame; the hook is in the space scene's update (src/space.js).
//   A  off: lhCamFrame is false and the camera is not touched
//   B  the step: with no boost there is no lead and no zoom-out; boosting at full speed the lead eases toward the Campaign's fifth of the view along the flight and the zoom toward its 0.9; letting go eases both back
//   C  it is the Campaign's maths: after a long boost the lead is campFeelLead's own answer and the zoom campFeelZoomK(1)
//   D  the frame: the follow's offset is minus the lead; nothing leads while a docking move plays, when you are destroyed, or when the camera follows something else; the base zoom is multiplied only while nothing else moves the zoom
//   E  the hook asks first; the Campaign's file has no word of it; the file asks the web for nothing
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

console.log(failed ? `\nLHCAM FAIL: ${failed} of ${n} checks failed` : `\nLHCAM PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
