// smoke: the new Long Haul's Earth, flat worlds and sky (plain Node, no Chrome): off draws nothing and answers null, on gives the Campaign's discs at the bodies' own sizes, Earth stands low on the left at the home dock, and the hooks ask the switch first
// PROMPT 23 (the cloud session's brief 15), piece 2 of docs/longhaul-earth.html. src/lhearth.js: lhBackdrop, lhWorld, lhStar, lhEarthAt; the hooks are in src/space.js and src/cruise.js.
//   A  off: lhBackdrop is false and makes nothing, lhWorld and lhStar are null
//   B  on, at home: the Moon and Cruithne are flat rock discs and Tern a banded gas giant, in their tones at the body's radius; a body with no tone and another system's world are null; the star is the Campaign's flat star
//   C  Earth: a picture, not a body (the home system has no row for it); with the ship at the home dock its middle is low on the left of the screen; it is painted by the Campaign's painter at three times its size, behind the worlds
//   D  the sky is the Campaign's backdrop function, called once; in deep space there is a sky and no Earth
//   E  the hooks in space.js and cruise.js ask for the function before they call it, and the file asks the web for nothing
// Run: node tests/lhearth.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
// a stand-in scene: it counts what is made and keeps the calls of an image
g.run(`window.T = { made: [], imgs: [], back: 0 };
window.fakeScene = () => { const img = key => { const o = { key, sf: 1, depth: 0, scale: 1, x: 0, y: 0 }; o.setScrollFactor = v => { o.sf = v; return o; }; o.setDepth = v => { o.depth = v; return o; }; o.setScale = v => { o.scale = v; return o; }; return o; };
  const ctx = new Proxy({}, { get: (t, k) => (k === 'calls' ? t.calls : (...a) => { (t.calls = t.calls || []).push(String(k)); }) });
  return { textures: { has: {}, exists(k) { return !!this.has[k]; }, createCanvas(k, w, h) { this.has[k] = true; T.made.push([k, w, h]); return { getContext: () => ctx, refresh() {} }; } }, add: { image: (x, y, key) => { const o = img(key); o.x = x; o.y = y; T.imgs.push(o); return o; } }, ctx }; };
window.realBack = campWorldBackdrop; campWorldBackdrop = s => { T.back++; return true; };`);

console.log('A  off');
check('lhBackdrop is false and makes nothing', J('lhBackdrop(fakeScene(), false)') === false && J('T.back') === 0 && J('T.imgs.length') === 0);
check('lhWorld and lhStar are null', J(`lhWorld(fakeScene(), sysBody('planet', 'halcyon'))`) === null && J(`lhStar(fakeScene(), sysStar('halcyon'))`) === null);

console.log('B  on, at home');
J('lhNewSet(true)'); J('lhEarthApply()'); J(`G.system = 'halcyon'`);
const moon = J(`(() => { const b = sysDef('halcyon').bodies.find(x => x.id === 'kepler-4b'), w = lhWorld(fakeScene(), b); return { w, r: b.r }; })()`);
check('the Moon is the luna disc at its own radius', !!moon.w && /^cdisc-luna-rock-/.test(moon.w.key) && Math.abs(moon.w.scale - moon.r / J('CAMPDISC.R')) < 1e-9, JSON.stringify(moon));
check('Cruithne is a rock disc', J(`(() => { const w = lhWorld(fakeScene(), sysDef('halcyon').bodies.find(x => x.id === 'kepler-4c')); return !!w && /^cdisc-eros-rock-/.test(w.key) && w.scale > 0; })()`) === true);
const giant = J(`(() => { const b = sysDef('halcyon').bodies.find(x => x.id === 'tern'), w = lhWorld(fakeScene(), b); return { w, r: b.r, name: b.name, shapes: campDiscShapes('gas', b.seed | 0, 'jupiter') }; })()`);
check('Tern, the far gas giant, is drawn as a flat banded gas giant (kind gas, the Jupiter tone) at its own radius, not as a rock (card space-game-lh-giant-and-aim-part)', !!giant.w && /^cdisc-jupiter-gas-/.test(giant.w.key) && !/rock/.test(giant.w.key) && Math.abs(giant.w.scale - giant.r / J('CAMPDISC.R')) < 1e-9 && giant.shapes.bands.length >= 2 && giant.shapes.patches.length >= 0, JSON.stringify(giant));
check('and it is called Anchor Giant while the switch is on (it was Anchor Rock, which read wrong for a giant), and Tern with it off', giant.name === 'Anchor Giant' && (J('lhNewSet(false)'), J('lhEarthApply()'), J(`sysDef('halcyon').bodies.find(x => x.id === 'tern').name`)) === 'Tern' && (J('lhNewSet(true)'), J('lhEarthApply()'), J(`sysDef('halcyon').bodies.find(x => x.id === 'tern').name`)) === 'Anchor Giant');
check('a body with no tone is null', J(`lhWorld(fakeScene(), sysDef('halcyon').bodies.find(x => x.id === 'kepler-belt'))`) === null);
check('another system keeps its own worlds', J(`(() => { G.system = 'kestrel'; const r = lhWorld(fakeScene(), sysDef('kestrel').bodies.find(x => x.type === 'planet') || { id: 'kepler-4b', r: 300 }); G.system = 'halcyon'; return r; })()`) === null);
const star = J(`(() => { const st = sysStar('halcyon'), w = lhStar(fakeScene(), st); return { w, r: st.r }; })()`);
check('the star is the flat star at its own radius', !!star.w && /^cdisc-sun-star-/.test(star.w.key) && Math.abs(star.w.scale - star.r / J('CAMPDISC.R')) < 1e-9, JSON.stringify(star));

console.log('C  Earth');
check('Earth is not a body of the system', J(`sysDef('halcyon').bodies.every(b => !/earth/i.test(b.id))`) === true);
const at = J(`(() => { const h = spaceHomeDock('halcyon'), p = lhEarthAt(LHEARTH.par, h, { w: 1280, h: 720 }); return { sx: p.x - (h.x - 640) * LHEARTH.par, sy: p.y - (h.y - 360) * LHEARTH.par }; })()`);
check('at the home dock its middle is low on the left of the screen', Math.abs(at.sx - 0.16 * 1280) < 1e-6 && Math.abs(at.sy - 1.5 * 720) < 1e-6 && at.sy - J('LHEARTH.r') < 720 && at.sy - J('LHEARTH.r') > 0, JSON.stringify(at));
g.run('T.made.length = 0; T.imgs.length = 0; T.back = 0;');
const drawn = J(`(() => { const s = fakeScene(), ok = lhBackdrop(s, false), e = T.imgs[0]; return { ok, back: T.back, made: T.made, n: T.imgs.length, e: e && { key: e.key, sf: e.sf, depth: e.depth, scale: e.scale }, calls: (s.ctx.calls || []).join(' ') }; })()`);
check('the sky is the Campaign\'s backdrop, once, and one Earth is made', drawn.ok === true && drawn.back === 1 && drawn.n === 1 && drawn.made.length === 1 && drawn.made[0][0] === 'lh-earth' && drawn.made[0][1] === 1536, JSON.stringify(drawn.made));
check('Earth is behind the worlds, slides a little, and is 900 px in radius', drawn.e.depth < 0 && drawn.e.depth > -8 && drawn.e.sf === 0.02 && Math.abs(drawn.e.scale - 900 / 720) < 1e-9, JSON.stringify(drawn.e));
check('it is painted by the Campaign\'s painter, scaled up before it paints', /^save scale /.test(drawn.calls) && /arc/.test(drawn.calls) && /ellipse/.test(drawn.calls) && !/createRadialGradient|createLinearGradient/.test(drawn.calls), drawn.calls.slice(0, 120));

console.log('D  deep space');
g.run('T.imgs.length = 0; T.back = 0;');
check('deep space has the sky and no Earth', J(`lhBackdrop(fakeScene(), true)`) === true && J('T.back') === 1 && J('T.imgs.length') === 0);
J('lhNewSet(null)'); J('lhEarthApply()');

console.log('E  the hooks');
const sp = src('src/space.js'), cr = src('src/cruise.js');
check('space.js asks before it calls lhBackdrop and lhWorld', /typeof lhBackdrop === 'function' && lhBackdrop\(this, !!G\.deep\)\)\) spaceBackdrop\(this, !!G\.deep\)/.test(sp) && /typeof lhWorld === 'function' \? lhWorld\(this, plDef\) : null/.test(sp));
check('cruise.js asks before it calls lhStar and lhWorld', /typeof lhStar === 'function' \? lhStar\(s, star\) : null/.test(cr) && /typeof lhWorld === 'function' \? lhWorld\(s, b\) : null/.test(cr));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhearth.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHEARTH FAIL: ${failed} of ${n} checks failed` : `\nLHEARTH PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
