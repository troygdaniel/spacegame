// smoke: the cruiser's bays light up: the launch tubes (front of the pods) while ships leave, the landing bays (back of the pods) while the wing comes home, each fading in 0.7 s; dark at rest (plain Node, no Chrome)
// Card space-game-campaign-look: "the launch and recall must still read (the bay lights up, ships leave from it)". The picture has the bays dimly lit all the time; the scene draws a bright slot and an added glow over them from
// campBayLight (src/campcruiser.js: pure, reads the sim) at the places campArtBays says, turned with the carrier. syncBay is called on a stand-in whose graphics record what they are told to fill.
// Run: node tests/camplook-bay.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };
const g = nodeGame();
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
g.run(`
  window.__scene = C => { const mk = () => { const r = { fills: [], circles: [], blend: null, style: null, clear() { r.fills.length = 0; r.circles.length = 0; return r; }, setDepth() { return r; }, setBlendMode(b) { r.blend = b; return r; },
      fillStyle(c, a) { r.style = { c, a }; return r; }, fillPoints(pts) { r.fills.push({ ...r.style, pts }); return r; }, fillCircle(x, y, rad) { r.circles.push({ ...r.style, x, y, rad }); return r; } }; return r; };
    const gs = []; const sc = { camp: C, bayAt: { launch: -1e9, land: -1e9 }, add: { graphics() { const r = mk(); gs.push(r); return r; } } }; sc.__gs = gs; return sc; };
  window.__draw = (sc) => { Campaign.prototype.syncBay.call(sc); const [a, b] = sc.__gs; return { fills: a.fills.map(f => ({ c: f.c, a: f.a, cx: f.pts.reduce((s, p) => s + p.x, 0) / f.pts.length, cy: f.pts.reduce((s, p) => s + p.y, 0) / f.pts.length })), circles: b.circles.map(c => ({ c: c.c, a: c.a, x: c.x, y: c.y, rad: c.rad })), blend: b.blend }; };
  window.__step = (C, ms) => { for (let i = 0; i < ms / 33; i++) { campStep(C, 1 / 30); C.events.length = 0; } };
`);
const bays = J(`campArtBays('cruiser')`), B = J('CAMP_BAY');
const world = (c, rot, [x, y]) => [c.x + Math.cos(rot) * x - Math.sin(rot) * y, c.y + Math.sin(rot) * x + Math.cos(rot) * y];

// 1. at rest
const rest = J(`(() => { const C = campNew(1, [], { seed: 2 }); C.carrier.rot = 0.7; const sc = __scene(C); return { light: campBayLight(C, sc.bayAt), d: __draw(sc) }; })()`);
check('at rest the bays are not lit over the picture (the picture has them dim): level 0 and nothing drawn', rest.light.launch === 0 && rest.light.land === 0 && rest.d.fills.length === 0 && rest.d.circles.length === 0, JSON.stringify(rest.light));

// 2. launch ordered: the launch tubes light, at the front of the pods, turned with the carrier
const lau = J(`(() => { const C = campNew(1, [], { seed: 2 }); C.carrier.rot = 0.7; campOrder(C, 'launch', '', 'key'); const sc = __scene(C); const c = C.carrier; return { c: { x: c.x, y: c.y }, light: campBayLight(C, sc.bayAt), d: __draw(sc) }; })()`);
check('with ships waiting to leave the launch tubes are fully lit and the landing bays are dark', lau.light.launch === 1 && lau.light.land === 0, JSON.stringify(lau.light));
check('a lit slot and its hot middle at each of the two tubes (four fills), a glow of two circles at each (four, added)', lau.d.fills.length === 4 && lau.d.circles.length === 4 && lau.d.blend === 'ADD', lau.d.fills.length + ' fills ' + lau.d.circles.length + ' circles blend ' + lau.d.blend);
const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.01;
const slotCentres = bays.launch.map(([x, y]) => world(lau.c, 0.7, [x - bays.half[0] / 2, y]));
check('the slots are at the two launch tubes of the pods, in the carrier\'s frame (the carrier is turned 0.7 rad), in front of the pods', slotCentres.every(p => lau.d.fills.some(f => near([f.cx, f.cy], p))), JSON.stringify(lau.d.fills.map(f => [Math.round(f.cx), Math.round(f.cy)])) + ' wanted ' + JSON.stringify(slotCentres.map(p => p.map(Math.round))));
check('the slot is the bay colour, solid at full light, and the middle of it the hot colour', lau.d.fills.some(f => f.c === B.color && Math.abs(f.a - B.slot) < 1e-9) && lau.d.fills.some(f => f.c === B.core), '');
check('the glow is the bay colour, faint, two sizes', lau.d.circles.every(c => c.c === B.color && c.a <= 0.2) && new Set(lau.d.circles.map(c => c.rad)).size === 2);

// 3. the queue empties: the tubes fade in 0.7 s
const fade = J(`(() => { const C = campNew(1, [], { seed: 2 }); campOrder(C, 'launch', '', 'key'); const sc = __scene(C); const out = []; while (C.launchQ.length) { campStep(C, 1 / 30); C.events.forEach(e => { if (e.type === 'launch') sc.bayAt.launch = C.t; }); C.events.length = 0; } const t0 = C.t; [0, 350, 700, 900].forEach((ms, i) => { C.t = t0 + ms; out.push(campBayLight(C, sc.bayAt).launch); }); return out; })()`);
check('after the last ship is out the tubes stay lit, then fade: full at once, about half at 350 ms, dark at 700 ms', fade[0] > 0.95 && fade[1] > 0.4 && fade[1] < 0.6 && fade[2] <= 0.001 && fade[3] === 0, fade.map(v => v.toFixed(2)).join(' '));

// 4. recall: the landing bays light while any ship is coming home, then after a landing
const rec = J(`(() => { const C = campNew(1, [], { seed: 2 }); campOrder(C, 'launch', '', 'key'); __step(C, 6000); const sc = __scene(C); const before = campBayLight(C, sc.bayAt); campOrder(C, 'recall', '', 'key'); const during = campBayLight(C, sc.bayAt); const d = __draw(sc); return { before, during, d, c: { x: C.carrier.x, y: C.carrier.y, rot: C.carrier.rot } }; })()`);
check('with the wing out and no recall the landing bays are dark; ordered home they light, and the launch tubes (long ago) are dark', rec.before.land === 0 && rec.during.land === 1 && rec.during.launch === 0, JSON.stringify(rec.before) + ' ' + JSON.stringify(rec.during));
const landCentres = bays.land.map(([x, y]) => world(rec.c, rec.c.rot, [x + bays.half[0] / 2, y]));
check('the slots are at the two landing bays, in the backs of the pods', landCentres.every(p => rec.d.fills.some(f => near([f.cx, f.cy], p))), JSON.stringify(rec.d.fills.map(f => [Math.round(f.cx), Math.round(f.cy)])));
const dock = J(`(() => { const C = campNew(1, [], { seed: 2 }); const sc = __scene(C); const keep = beep; beep = () => {}; C.t = 5000; Campaign.prototype.onEvent.call(sc, { type: 'dock', id: 'x' }); Campaign.prototype.onEvent.call(sc, { type: 'launch', id: 'y', kind: 'fighter' }); beep = keep; return { at: sc.bayAt, lights: campBayLight(C, sc.bayAt) }; })()`);
check('a landing lights the landing bays and a launch the tubes for 0.7 s, by the event (the scene writes the clock)', dock.at.land === 5000 && dock.at.launch === 5000 && dock.lights.land === 1 && dock.lights.launch === 1, JSON.stringify(dock.at));

// 5. a lost carrier has no light
const dead = J(`(() => { const C = campNew(1, [], { seed: 2 }); campOrder(C, 'launch', '', 'key'); C.carrier.hp = 0; const sc = __scene(C); return __draw(sc); })()`);
check('a lost carrier has no lit bay', dead.fills.length === 0 && dead.circles.length === 0);
// a bug found by retrying a mission in the browser (card one-list-keys): the scene object is started again and its layers destroyed, but the two bay graphics were kept (no scene, not active): no bay lights after a retry
const again = J(`(() => { const C = campNew(1, [], { seed: 2 }); const sc = __scene(C); Campaign.prototype.syncBay.call(sc); Campaign.prototype.syncBay.call(sc); const kept = sc.__gs.length; sc.bayG.active = false; sc.bayGlow.active = false; Campaign.prototype.syncBay.call(sc); return { kept, made: sc.__gs.length, fresh: sc.bayG === sc.__gs[2] && sc.bayGlow === sc.__gs[3] }; })()`);
check('after the scene starts again (a retry: the old graphics are destroyed) the bays are drawn on NEW graphics, and live ones are kept, not made again each frame', again.kept === 2 && again.made === 4 && again.fresh, JSON.stringify(again));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nfailed: 0');
process.exit(failed ? 1 : 0);
