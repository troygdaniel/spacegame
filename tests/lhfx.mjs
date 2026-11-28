// smoke: the new Long Haul's kill effect is the Campaign's (plain Node, no Chrome): off draws nothing and Long Haul's burst stands; on, the Campaign's slookKill is asked through the bridge's view, your own end is three times the size, the animation is the Campaign's frame with no ship in it, and if the Campaign's look is off the burst stands
// PROMPT 23 (the cloud session's brief 15), piece 6 of docs/longhaul-earth.html. src/lhfx.js: lhKill, lhFxFrame; the hooks are in killDrone and die (src/space.js).
//   A  off: lhKill is false and asks the Campaign for nothing
//   B  on: slookKill is called once with the bridge's view, the point and size 1 (your own end: the Campaign's big size); the view's game clock is the scene's now; true comes back
//   C  the frame: installed once on the scene's postupdate by the first kill and taken off at shutdown; it calls the Campaign's slookFxFrame with a game that has the scene's clock and no ships (so no trail is drawn), sharing the view's pooled sprites
//   D  the Campaign's ship look off (slookKill answers false): lhKill is false, nothing is installed, and the caller draws Long Haul's burst
//   E  the real functions: with the real slookKill and slookFxFrame a kill takes one pooled record, shows it, and the frame hides it after the effect's time
//   F  the hooks ask first and keep Long Haul's burst as the other branch; the file asks the web for nothing
// Run: node tests/lhfx.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ shiplook: 'table' });
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`window.T = { kill: [], frame: [], on: [], off: [], once: [] };
window.mkScene = () => { const img = () => { const o = { visible: false }; ['setDepth', 'setVisible', 'setBlendMode', 'setPosition', 'setScale', 'setAlpha', 'setRotation'].forEach(k => { o[k] = v => { if (k === 'setVisible') o.visible = !!v; return o; }; }); return o; };
  return { ship: { x: 1000, y: 1000, rotation: 0, body: { velocity: { x: 0, y: 0 } } }, enemies: { getChildren: () => [] }, dead: false, time: { now: 5000 }, cameras: { main: { zoom: 1 } },
    textures: { exists: () => true }, make: { graphics: () => ({}) }, add: { image: img },
    events: { on: (k, f) => { T.on.push([k, f]); }, off: (k, f) => { T.off.push([k, f]); }, once: (k, f) => { T.once.push([k, f]); } } }; };
window.realKill = slookKill; window.realFrame = slookFxFrame; G.hull = 100; G.maxHull = 100;
window.fake = ok => { slookKill = (v, x, y, size) => { T.kill.push({ camp: !!v.camp, t: v.camp && v.camp.t, mode: v.mode, x, y, size }); return ok; }; slookFxFrame = v => { T.frame.push({ t: v.camp.t, ships: v.camp.ships.length, hud: !!v.hud }); }; };
window.reset = () => { T.kill.length = 0; T.frame.length = 0; T.on.length = 0; T.off.length = 0; T.once.length = 0; };`);

console.log('A  off');
g.run('fake(true)');
check('lhKill is false and asks the Campaign for nothing', J('lhKill(mkScene(), 10, 20, false)') === false && J('T.kill.length') === 0);

console.log('B  on');
J('lhNewSet(true)');
const b = J(`(() => { reset(); const s = mkScene(), a = lhKill(s, 1200, 900, false), c = lhKill(s, 1000, 1000, true); return { a, c, kill: T.kill, on: T.on.map(x => x[0]), once: T.once.map(x => x[0]) }; })()`);
check('slookKill is asked through the bridge\'s view at the point, size 1', b.a === true && b.kill[0].camp === true && b.kill[0].mode === 'play' && b.kill[0].x === 1200 && b.kill[0].y === 900 && b.kill[0].size === 1, JSON.stringify(b.kill[0]));
check('your own end is the Campaign\'s big size', b.c === true && b.kill[1].size === J('SLOOKFX.kill.big') && b.kill[1].size === 3);
check('the view\'s game clock is the scene\'s now', b.kill[0].t === 5000);

console.log('C  the frame');
check('installed once on postupdate by the first kill', b.on.join() === 'postupdate' && b.once.filter(k => k === 'shutdown').length >= 1, JSON.stringify([b.on, b.once]));
const fr = J(`(() => { reset(); const s = mkScene(); lhKill(s, 1, 2, false); s.time.now = 5100; T.on[0][1](); const f = T.frame.slice(); T.once.filter(x => x[0] === 'shutdown').forEach(x => x[1]()); return { f, off: T.off.map(x => x[0]), same: T.off.length && T.off[0][1] === T.on[0][1], gone: s.lhB === null }; })()`);
check('it calls the Campaign\'s frame with the scene\'s clock and no ships', fr.f.length === 1 && fr.f[0].t === 5100 && fr.f[0].ships === 0 && fr.f[0].hud === true, JSON.stringify(fr.f));
check('shutdown takes the frame off and drops the bridge', fr.off.join() === 'postupdate' && fr.same === true && fr.gone === true);

console.log('D  the Campaign\'s look off');
g.run('fake(false)');
check('lhKill is false and nothing is installed', J(`(() => { reset(); const s = mkScene(); return [lhKill(s, 1, 2, false), T.on.length]; })()`).join() === 'false,0');

console.log('E  the real functions');
g.run('slookKill = realKill; slookFxFrame = realFrame;');
const real = J(`(() => { reset(); const s = mkScene(); const a = lhKill(s, 1200, 900, false), F = s.lhB.view.hud.slfx, k = F.kills[0]; const live = F.kills.length, vis = k.ring1.visible; s.time.now = 5200; T.on[0][1](); const mid = [F.kills.length, k.ring1.visible]; s.time.now = 5000 + SLOOKFX.kill.ms + 1; T.on[0][1](); return { a, live, vis, mid, end: [F.kills.length, F.free.length, k.ring1.visible] }; })()`);
check('a kill takes one pooled record and shows it', real.a === true && real.live === 1 && real.vis === true, JSON.stringify(real));
check('it is still showing in the middle and hidden after the effect\'s time', real.mid.join() === '1,true' && real.end.join() === '0,1,false', JSON.stringify(real));
J('lhNewSet(null)');

console.log('F  the hooks');
const sp = src('src/space.js');
check('killDrone and die ask first and keep Long Haul\'s burst as the other branch', /if \(!\(typeof lhKill === 'function' && lhKill\(this, x, y, false\)\)\) this\.boom\.explode\(28, x, y\);/.test(sp) && /if \(!\(typeof lhKill === 'function' && lhKill\(this, this\.ship\.x, this\.ship\.y, true\)\)\) this\.boom\.explode\(70, this\.ship\.x, this\.ship\.y\);/.test(sp));
check('the Campaign\'s effect file has no word of it', !/lhKill|lhNewOn|lhBridge/.test(src('src/shiplookfx.js')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhfx.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHFX FAIL: ${failed} of ${n} checks failed` : `\nLHFX PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
