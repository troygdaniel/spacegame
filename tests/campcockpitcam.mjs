// smoke: the view leads a boosting ship by a fifth of the screen, and taking the stick is a 0.4 s glide with a pale-blue ring and a CRUISER AUTO pill (plain Node, stand-in cameras and scene)
// Card space-game-b7-camera-lead-stick (Troy, 26 Nov 2026: decisions 7 and 9 of the cloud's brief 7, docs/pace-and-polish.html). Pictures and the camera only.
//   A  the lead (pure): none without boost, speed or a direction; a fifth of the camera's size along the flight at full boost, counting the follow's own lag so the view's middle really ends up that far ahead (a Phaser-like follow flown for 200 frames);
//      a blend between; the camera's own size (a filled window, the far zoom); the lead's ease
//   B  the lead on the camera: only while the camera follows the ship he flies, only with the feel on; it eases to nothing otherwise; the follow's lerp stays 0.12; 5-GEN's frame (campMomentsOffset) takes the offset when it is there
//   C  the pure parts of the glide, the ring and the pill
//   D  taking the stick: the glide, the follow after it, the ring in, the hand-back's ring out, the hand or a focus taking the view, reduced motion, the switch off
//   E  the CRUISER AUTO pill: only while he is away, pinned inside the edge, fades, hidden under the map
//   F  the files
// Run: node tests/campcockpitcam.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ feel: 'table', shiplook: 'table' });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const code = f => src(f).replace(/\/\/[^\n]*/g, '');
g.run(`
  window.Phaser = { BlendModes: { ADD: 'ADD' } }; window.matchMedia = () => ({ matches: false }); // (the node game's own stand-in answers anything: motion is as it is)
  window.__gfx = () => { const o = { calls: [], depth: 0, vis: true };
    o.clear = () => { o.calls.length = 0; return o; }; o.setDepth = d => { o.depth = d; return o; }; o.setVisible = v => { o.vis = v; return o; };
    o.lineStyle = (w, c, a) => { o.calls.push(['lineStyle', w, c, a]); return o; }; o.strokeCircle = (x, y, r) => { o.calls.push(['circle', x, y, r]); return o; }; return o; };
  window.__txt = (x, y, str, style) => { const o = { x, y, str, style, sc: 1, a: 1, vis: true, depth: 0 }; o.setOrigin = () => o; o.setDepth = d => { o.depth = d; return o; }; o.setPosition = (a, b) => { o.x = a; o.y = b; return o; }; o.setScale = k => { o.sc = k; return o; }; o.setAlpha = v => { o.a = v; return o; }; o.setVisible = v => { o.vis = v; return o; }; return o; };
  // a camera: scroll, zoom, size, follow state and offset, like Phaser's (the follow's lerp is a share of the way each frame)
  window.__cam = (zoom) => { const c = { scrollX: 0, scrollY: 0, zoom, width: 1280, height: 720, _follow: null, lerp: { x: 0.12, y: 0.12, set(a, b) { c.lerp.x = a; c.lerp.y = b; } }, followOffset: { x: 0, y: 0, set(a, b) { c.followOffset.x = a; c.followOffset.y = b; } }, stops: 0, starts: [] };
    c.setFollowOffset = (a, b) => { c.followOffset.set(a, b); return c; }; c.stopFollow = () => { c._follow = null; c.stops++; return c; }; c.startFollow = (t, r, lx, ly) => { c._follow = t; c.starts.push([t.id, lx, ly]); c.lerp.x = lx; c.lerp.y = ly; return c; };
    c.step = () => { if (c._follow) { c.scrollX += ((c._follow.x - c.followOffset.x) - 640 - c.scrollX) * c.lerp.x; c.scrollY += ((c._follow.y - c.followOffset.y) - 360 - c.scrollY) * c.lerp.y; } }; return c; };
`);

console.log('A. the lead');
{
  const lead = (vx, vy, top, share, vw, vh, l) => J(`campFeelLead(${vx}, ${vy}, ${top}, ${share}, ${vw}, ${vh}, ${l === undefined ? 0.12 : l})`);
  check('no boost, no speed, no top or no lerp: no lead (the soft follow as it was)', ['0,0,330,0', '3,0,330,1', '300,0,0,1', '300,0,330,0.0'].every(a => { const p = a.split(',').map(Number); const r = lead(p[0], p[1], p[2], p[3], 1280, 720); return r.x === 0 && r.y === 0; }) && J('campFeelLead(300, 0, 330, 1, 1280, 720, 0)').x === 0);
  const lag = v => v * (1 - 0.12) / (0.12 * 60);
  const f = lead(800, 0, 800, 1, 1280, 720);
  check('at full boost along x the offset is a fifth of the camera\'s width (256 px) plus the lag the follow keeps (98 px at 800 px/s): 354 px, nothing along y', near(f.x, 0.2 * 1280 + lag(800), 1e-9) && f.y === 0 && J('CAMPFEEL.lead.frac') === 0.2, JSON.stringify(f));
  const d = lead(600, 600, 1200, 1, 1280, 720);
  check('along a diagonal each axis has its share of the screen (a fifth of the height along y), and it is symmetric', near(d.x / d.y, (0.2 * 1280 + lag(Math.hypot(600, 600))) / (0.2 * 720 + lag(Math.hypot(600, 600)))) && lead(-600, -600, 1200, 1, 1280, 720).x === -d.x);
  const half = lead(400, 0, 800, 1, 1280, 720), part = lead(800, 0, 800, 0.5, 1280, 720);
  check('slower or less boosted it is a blend: half the speed gives half, half the boost gives half', near(half.x, 0.5 * (0.2 * 1280 + lag(400)), 1e-9) && near(part.x, 0.5 * (0.2 * 1280 + lag(800)), 1e-9));
  check('it is the camera\'s own size that counts: a window that fills the screen (1900 wide) or a far zoom (6400 px seen) has its fifth', near(lead(800, 0, 800, 1, 1900, 720).x, 0.2 * 1900 + lag(800), 1e-9) && near(lead(800, 0, 800, 1, 1280 / 0.2, 720 / 0.2).x, 0.2 * 6400 + lag(800), 1e-9));
  // a Phaser-like follow flown for 200 frames: where does the view's middle end up against the ship?
  const mid = (share, v) => J(`(() => { const c = __cam(1), ship = { id: 's', x: 0, y: 0 }; c._follow = ship; c.scrollX = -640; c.scrollY = -360; let L = { x: 0, y: 0 }; for (let k = 0; k < 400; k++) { ship.x += ${v} / 60; const t = campFeelLead(${v}, 0, 800, ${share}, 1280, 720, c.lerp.x); campFeelLeadStep(L, t.x, t.y, 16.7); c.setFollowOffset(-L.x, -L.y); c.step(); } return (c.scrollX + 640) - ship.x; })()`);
  check('flown: at full boost the view\'s middle ends up 256 px (a fifth of 1280) AHEAD of the ship, at no boost 98 px BEHIND it (the soft follow, as today), and at half a boost in between', near(mid(1, 800), 256, 1.5) && near(mid(0, 800), -lag(800), 1.5) && mid(0.5, 800) > -lag(800) && mid(0.5, 800) < 256, [mid(1, 800), mid(0, 800), mid(0.5, 800)]);
  g.run(`window.L1 = { x: 0, y: 0 }; for (let k = 0; k < 20; k++) campFeelLeadStep(L1, 300, -100, 16.7);`);
  const mid1 = J('L1.x');
  g.run(`for (let k = 0; k < 400; k++) campFeelLeadStep(L1, 300, -100, 16.7);`);
  const landed = J('[L1.x, L1.y]');
  g.run(`for (let k = 0; k < 400; k++) campFeelLeadStep(L1, 0, 0, 16.7);`);
  check('the lead eases (it never jumps when the heading turns): part of the way after a third of a second, exactly on the target later, and exactly zero when the target is', mid1 > 50 && mid1 < 250 && landed.join() === '300,-100' && J('L1.x') === 0 && J('L1.y') === 0);
}

console.log('B. the lead on the camera');
{
  g.run(`
    CAMP.flags.feel = true; CAMP.flags.cockpit = true; window.__ls = () => { const C = { carrier: { id: 'c', kind: 'carrier', hp: 100, vx: 330, vy: 0 }, boost: { on: true, th: 1, fx: 1, flare: 0 }, cockpit: null, by: {}, t: 3000 }; C.by.c = C.carrier;
      const cam = __cam(1), sp = { id: 'c', x: 0, y: 0 }; cam._follow = sp; const cz = { base: 1, out: 1, cur: 1, anchor: null };
      return { _cz: cz, cameras: { main: cam }, camp: C, sp: { c: sp }, game: { loop: { delta: 16.7 } }, dead: false, leaving: false }; };
    window.__go = (s, k) => { for (let i = 0; i < k; i++) { campFeelCamera(s); s._cz.out = s.cameras.main.zoom = s._cz.base; } };
    window.ls = __ls();
  `);
  g.run(`__go(ls, 240);`);
  const lead = J('ls.camLead.x'), off = J('ls.cameras.main.followOffset.x');
  check('boosting at 330 px/s (the cruiser\'s boost top) with the camera on the cruiser: a lead of about a fifth of the screen, set on the scene (camLead, for 5-GEN\'s frame) and as the follow\'s offset (the other way: Phaser follows ship minus offset)', lead > 0.2 * 1280 * 0.85 && near(off, -lead, 1e-9) && J('ls.camLead.y') === 0, lead);
  check('the follow\'s lerp stays 0.12 while boosting (the lead replaces the lag)', J('ls.cameras.main.lerp.x') === 0.12);
  g.run(`ls.camp.boost.on = false; __go(ls, 400);`);
  check('let go of the boost: the lead eases away to exactly nothing, and so does the offset', J('ls.camLead.x') === 0 && J('ls.cameras.main.followOffset.x') === 0);
  g.run(`window.l2 = __ls(); l2.camp.boost.on = true; l2.cameras.main._follow = { id: 'other', x: 0, y: 0 }; __go(l2, 240);`);
  check('a camera that follows something else (a glide, a focus on another ship, the hand\'s drag) is not led: no lead, no offset', !l2Lead() );
  function l2Lead() { return J('(l2.camLead && l2.camLead.x) || l2.cameras.main.followOffset.x') !== 0; }
  g.run(`window.l3 = __ls(); CAMP.flags.feel = false; __go(l3, 240); CAMP.flags.feel = true; window.l4 = __ls(); l4.dead = true; __go(l4, 240); window.l5 = __ls(); l5._cz.anchor = { wx: 0, wy: 0, sx: 0, sy: 0 }; __go(l5, 240);`);
  check('with the feel off, a dead cruiser, a leaving scene or a zoom about a point: no lead', J('(l3.camLead ? l3.camLead.x : 0) === 0 && l3.cameras.main.followOffset.x === 0') && J('l4.cameras.main.followOffset.x') === 0 && J('l5.cameras.main.followOffset.x') === 0);
  g.run(`window.l6 = __ls(); window.campMomentsOffset = s => ({ x: -s.camLead.x - 3, y: 1 }); __go(l6, 240); delete window.campMomentsOffset;`);
  check('when 5-GEN\'s frame (campMomentsOffset) is there the offset is ITS sum of the nudge and camLead (here the lead and 3 px of nudge), put on every frame, since that frame sets it only while a nudge is live', J('l6.camLead.x') > 200 && near(J('l6.cameras.main.followOffset.x'), -J('l6.camLead.x') - 3, 1e-9) && J('l6.cameras.main.followOffset.y') === 1);
  g.run(`window.l7 = __ls(); l7.camp.cockpit = { id: 'f', boost: { on: true } }; l7.camp.by.f = { id: 'f', kind: 'fighter', hp: 50, maxHp: 50, vx: 800, vy: 0, cockpit: true }; l7.sp.f = { id: 'f', x: 0, y: 0 }; l7.cameras.main._follow = l7.sp.f; __go(l7, 300);`);
  check('in a fighter the lead is the fighter\'s: along its own flight, up to a fifth of the (closer) screen: the base zoom is 3 times 0.9, so 1280 / 2.7 = 474 px seen, 95 px plus its lag (98)', J('l7.camLead.x') > 150 && J('l7.camLead.x') < 0.2 * 474 + 100 + 1, J('l7.camLead.x'));
}

console.log('C. the pure parts of the glide, the ring and the pill');
{
  check('the glide is the F key\'s: eased in and out, 0.4 s, from here to there; a half is the middle; none is already there', J('CAMPCAM.glide') === 400 && J('campCamEase(0)') === 0 && J('campCamEase(1)') === 1 && near(J('campCamEase(0.5)'), 0.5) && J('campCamEase(0.25)') < 0.25 && near(J('campCamGlideAt({ x: 0, y: 0 }, { x: 1000, y: -200 }, 200, 400).x'), 500) && J('campCamGlideAt({ x: 0, y: 0 }, { x: 10, y: 0 }, 400, 400).done') === true && J('campCamGlideAt({ x: 0, y: 0 }, { x: 10, y: 0 }, 5, 0).done') === true);
  const r0 = J(`campCamRingAt('in', 0)`), r1 = J(`campCamRingAt('in', 200)`), r2 = J(`campCamRingAt('in', 440)`), ro = J(`campCamRingAt('out', 0)`), ro2 = J(`campCamRingAt('out', 440)`);
  check('the ring of a take shrinks from 60 px to 20 px onto the fighter and fades at the end (full until 0.65 of its life), his pale blue, 1.5 px wide; over after 450 ms', r0.r === 60 && r0.a === 1 && r1.r < 60 && r1.r > 20 && r1.a === 1 && r2.r < 21 && r2.a < 0.2 && J(`campCamRingAt('in', 450)`) === null && J('CAMPCAM.ring.color') === 0x6fd6ff && J('CAMPCAM.ring.w') === 1.5);
  check('a hand-back runs it the other way: a ring opening from 20 px to 60 px round the fighter he leaves, fading out', ro.r === 20 && ro2.r > 59 && ro2.a < 0.2 && J(`campCamRingAt('out', 100)`).r < J(`campCamRingAt('out', 300)`).r);
  check('under reduced motion it is drawn at its last size and only fades (nothing shrinks)', J(`campCamRingAt('in', 0, true)`).r === 20 && J(`campCamRingAt('in', 300, true)`).r === 20 && J(`campCamRingAt('out', 0, true)`).r === 60);
  const on = J('campCamTagAt(50, 10, 1280, 720, 30, 64, 40)'), off = J('campCamTagAt(-2000, 10, 1280, 720, 30, 64, 40)'), below = J('campCamTagAt(0, 900, 1280, 720, 30, 64, 40)');
  check('the pill sits 30 px under the cruiser when it is on the screen, and is pinned 64 px inside the left or right edge and 40 px inside the bottom when it is not', on.x === 50 && on.y === 40 && !on.clamped && off.x === -(640 - 64) && off.clamped && below.y === 360 - 40 && below.clamped);
}

g.run(`
  window.__sc = (opts) => { opts = opts || {}; CAMP.flags.cockpit = opts.off ? false : true; const C = window.C = campNew(1, [], { seed: 7, mission: 0 }); C.t = 1000; C.god = true; campStep(C, 2); C.ships.forEach(u => { if (u.team === 'alien' || u.team === 'neutral') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); C.events.length = 0;
    const cam = __cam(1), s = { camp: C, cameras: { main: cam }, sp: {}, mode: 'play', mp: null, panned: false, add: { graphics: () => __gfx(), text: __txt } };
    C.ships.forEach(u => { s.sp[u.id] = { id: u.id, x: u.x, y: u.y, displayWidth: u.kind === 'carrier' ? 100 : 22 }; }); cam.scrollX = C.carrier.x - 640; cam.scrollY = C.carrier.y - 360; cam._follow = s.sp[C.carrier.id]; s.eyeId = C.carrier.id; return s; };
  window.__eye = s => { const C = s.camp, e = campEye(C); if (s.eyeId === e.id) return false; const was = s.eyeId; s.eyeId = e.id; return campCamEye(s, e, s.sp[e.id], was); };
  window.__fr = (s, ms) => { for (let t = 0; t < ms; t += 16.7) { const C = s.camp; C.ships.forEach(u => { const q = s.sp[u.id]; q.x = u.x; q.y = u.y; }); campCamFrame(s, 16.7); } };
`);

console.log('D. taking the stick');
{
  g.run(`window.s1 = __sc(); campCockpitTake(s1.camp); window.f1 = s1.camp.by[s1.camp.cockpit.id]; f1.x = s1.camp.carrier.x + 1500; f1.y = s1.camp.carrier.y - 500; f1.vx = 0; f1.vy = 0; window.startX = s1.cameras.main.scrollX; window.took = __eye(s1);`);
  check('a take starts a glide: the follow is let go (the glide is the camera\'s own), none started yet, one ring of the kind "in" on the fighter', J('took') === true && J('s1.cameras.main.stops') === 1 && J('s1.cameras.main.starts.length') === 0 && J('s1.camX.glide.id') === J('f1.id') && J('s1.camX.ring.kind') === 'in' && J('s1.camX.ring.id') === J('f1.id'));
  g.run(`__fr(s1, 200);`);
  const midX = J('s1.cameras.main.scrollX'), wantX = J('f1.x - 640');
  check('200 ms in it is half way (the middle of an ease), the follow still not started, the ring part-way in', near((midX - J('startX')) / (wantX - J('startX')), 0.5, 0.06) && J('s1.cameras.main.starts.length') === 0 && J('s1.camX.ring.t') > 150, [midX, wantX]);
  g.run(`__fr(s1, 260);`);
  check('after 0.4 s the camera is ON the fighter (its middle at the fighter), the glide is over, and the follow starts from there with the scene\'s lerp 0.12; the ring is gone and its Graphics cleared', near(J('s1.cameras.main.scrollX'), J('f1.x - 640'), 0.01) && near(J('s1.cameras.main.scrollY'), J('f1.y - 360'), 0.01) && J('s1.camX.glide') === null && J('s1.cameras.main.starts.length') === 1 && J('s1.cameras.main.starts[0].join()') === J('[f1.id, 0.12, 0.12].join()') && J('s1.camX.ring') === null && J('s1.camX.g.calls.length') === 0);
  g.run(`window.s2 = __sc(); campCockpitTake(s2.camp); window.f2 = s2.camp.by[s2.camp.cockpit.id]; __eye(s2); for (let k = 0; k < 10; k++) { f2.x += 40; __fr(s2, 16.7); }`);
  const stillGliding = J('s2.camX.glide !== null');
  g.run(`for (let k = 0; k < 60 && s2.camX.glide; k++) { f2.x += 40; __fr(s2, 16.7); }`);
  check('the glide goes to where the fighter IS (it flies on at 2400 px/s: the end is on it, not where it was when C was pressed)', stillGliding && J('s2.camX.glide') === null && near(J('s2.cameras.main.scrollX'), J('f2.x - 640'), 0.01));
  g.run(`window.s3 = __sc(); campCockpitTake(s3.camp); window.f3 = s3.camp.by[s3.camp.cockpit.id]; f3.x = s3.camp.carrier.x + 900; __eye(s3); __fr(s3, 500);`);
  const ringCalls = J('s3.camX.g.calls.length');
  g.run(`campCockpitGive(s3.camp, 'hand'); __eye(s3);`);
  check('a hand-back is the same move the other way: a glide to the cruiser, and a ring OPENING round the fighter he leaves ("out", at that fighter, which flies on)', J('s3.camX.glide.id') === J('s3.camp.carrier.id') && J('s3.camX.ring.kind') === 'out' && J('s3.camX.ring.id') === J('f3.id') && ringCalls === 0);
  g.run(`__fr(s3, 100); window.o1 = s3.camX.g.calls.slice();`);
  check('the ring is drawn as a circle at the fighter, 1.5 px wide on the screen (1.5 / zoom in the world) in his pale blue, with the radius 20 px growing (the zoom is 1)', J('o1[0][0]') === 'lineStyle' && J('o1[0][1]') === 1.5 && J('o1[0][2]') === 0x6fd6ff && J('o1[1][0]') === 'circle' && near(J('o1[1][1]'), J('f3.x'), 1e-6) && J('o1[1][3]') > 20 && J('o1[1][3]') < 60);
  g.run(`__fr(s3, 400);`);
  check('and after 0.4 s the camera is back on the cruiser and follows it', near(J('s3.cameras.main.scrollX'), J('s3.camp.carrier.x - 640'), 0.01) && J('s3.camX.glide') === null && J('s3.cameras.main._follow.id') === J('s3.camp.carrier.id'));
  g.run(`window.s4 = __sc(); campCockpitTake(s4.camp); __eye(s4); __fr(s4, 100); s4.panned = true; __fr(s4, 50);`);
  check('the hand (a drag) taking the view mid-glide ends the glide with no follow started: the camera stays where the hand put it', J('s4.camX.glide') === null && J('s4.cameras.main.starts.length') === 0);
  g.run(`window.s5 = __sc(); s5.panned = true; s5.dragFly = 3; campCockpitTake(s5.camp); __eye(s5);`);
  check('a take with the view dragged away brings the view back (the drag is let go, as the F key does), then glides', J('s5.panned') === false && J('s5.dragFly') === 0 && J('s5.camX.glide !== null') === true);
  g.run(`window.s6 = __sc(); campCockpitTake(s6.camp); s6.focus = { id: 'x', pt: { x: 1, y: 1 } }; window.campFocusBreak = s => { s.focus = null; return true; }; __eye(s6);`);
  check('a focus on another ship (the F key) is ended by a take: the ship he flies has the camera', J('s6.focus') === null);
  g.run(`window.matchMedia = () => ({ matches: true }); window.s7 = __sc(); campCockpitTake(s7.camp); window.f7 = s7.camp.by[s7.camp.cockpit.id]; window.took7 = __eye(s7);`);
  check('under reduced motion there is no glide (the follow starts at once with its soft pan, as it always did) and the ring does not shrink', J('took7') === true && J('s7.camX.glide') === null && J('s7.cameras.main.starts.length') === 1 && J('s7.camX.ring.still') === true && J('campCamReduced()') === true);
  g.run(`window.camzBase = 1; var sc8 = { _cz: { base: 1, out: 1, cur: 1, anchor: null }, cameras: { main: __cam(1) }, camp: s7.camp, sp: s7.sp, game: { loop: { delta: 16.7 } }, dead: false, leaving: false }; campFeelCamera(sc8);`);
  check('and the closer view of the cockpit is there at once (one frame), not eased', J('sc8._cz.base') === 3 && J('sc8.feel.cz') === 1);
  g.run(`window.matchMedia = () => ({ matches: false });`);
  g.run(`window.s9 = __sc({ off: true }); window.took9 = (CAMP.flags.cockpit = true, campCockpitTake(s9.camp), CAMP.flags.cockpit = false, __eye(s9));`);
  check('with the cockpit switch off the glide is not used (the scene falls back to its own follow)', J('took9') === false && J('s9.cameras.main.stops') === 0);
  g.run(`CAMP.flags.cockpit = true; window.s10 = __sc(); delete s10.cameras.main.stopFollow; campCockpitTake(s10.camp); window.took10 = __eye(s10);`);
  check('a camera with no way to stop its follow (a stand-in) is left to the scene\'s own follow: nothing breaks', J('took10') === false);
}

console.log('E. the CRUISER AUTO pill');
{
  g.run(`window.p1 = __sc(); __fr(p1, 100);`);
  check('flying the cruiser: no pill (none is even made)', J('p1.camX.tag') === null);
  g.run(`campCockpitTake(p1.camp); window.pf = p1.camp.by[p1.camp.cockpit.id]; __eye(p1); __fr(p1, 50);`);
  const a1 = J('p1.camX.tag.a');
  g.run(`__fr(p1, 600);`);
  check('away in a fighter: the pill says CRUISER AUTO (the content table\'s words, shown not voiced), fades in over 0.3 s, then 0.95', J('p1.camX.tag.str') === 'CRUISER AUTO' && J(`uiText('camp.hud.cruiserauto')`) === 'CRUISER AUTO' && a1 > 0 && a1 < 0.95 && near(J('p1.camX.tag.a'), 0.95, 1e-9) && J('p1.camX.tag.vis') === true);
  check('it is in his pale blue on the dark panel colour, 11 px, and its depth is over the ships and under the ring', /9fd8ff/.test(J('p1.camX.tag.style.color')) && J('p1.camX.tag.style.fontSize') === '11px' && J('p1.camX.tag.depth') < J('CAMPCAM.ring.depth') && J('p1.camX.tag.depth') > 5);
  const midp = J('(() => { const cam = p1.cameras.main, c = p1.camp.carrier; return { dx: (p1.camX.tag.x - c.x), dy: (p1.camX.tag.y - c.y), cross: Math.abs(c.x - (cam.scrollX + 640)) }; })()');
  check('with the cruiser on the screen the pill sits just under it (about 33 px: its half length 30 and 18 below, at zoom 1), at the screen\'s size', Math.abs(midp.dx) < 1 && midp.dy > 30 && midp.dy < 60 && J('p1.camX.tag.sc') === 1, JSON.stringify(midp));
  g.run(`pf.x = p1.camp.carrier.x + 5000; pf.y = p1.camp.carrier.y; __fr(p1, 2000); window.farCam = p1.cameras.main.scrollX + 640;`);
  g.run(`p1.camp.carrier.x = farCam - 5000; __fr(p1, 100);`);
  const edge = J('p1.camX.tag.x - (p1.cameras.main.scrollX + 640)');
  check('with the cruiser far off the screen (and no page HUD) the pill is pinned 64 px inside the edge toward it (576 px from the middle)', near(edge, -(640 - 64), 1), edge);
  g.run(`p1.pageHud = { last: { fedges: [{ id: 'carrier', text: 'Cruiser \u00b7 210 km' }] } }; __fr(p1, 600);`);
  check('while the page has the cruiser\'s edge pill ("Cruiser \u00b7 210 km", pale blue: card space-game-b12-c2-3-pills) the canvas\'s pill steps aside: it fades out over 0.3 s and is hidden, not pinned half off the screen', J('p1.camX.tagA') === 0 && J('p1.camX.tag.vis') === false);
  g.run(`p1.pageHud = null; __fr(p1, 600);`);
  check('with no page HUD (nothing to stand in for it) it is pinned at the edge as before', J('p1.camX.tag.vis') === true && near(J('p1.camX.tag.x - (p1.cameras.main.scrollX + 640)'), -(640 - 64), 1));
  g.run(`p1.mp = {}; __fr(p1, 50);`);
  check('with the Tab map open it is hidden', J('p1.camX.tag.vis') === false);
  g.run(`p1.mp = null; __fr(p1, 400);`);
  const shown = J('p1.camX.tag.vis');
  g.run(`campCockpitGive(p1.camp, 'hand'); __fr(p1, 100);`);
  const mid2 = J('p1.camX.tag.a');
  g.run(`__fr(p1, 500);`);
  check('handed back: it fades out over 0.3 s and is hidden (a hand-back is the move in reverse)', shown === true && mid2 > 0 && mid2 < 0.95 && J('p1.camX.tag.vis') === false);
  g.run(`campCockpitTake(p1.camp); campCockpitGive(p1.camp, 'dead'); p1.camp.carrier.hp = 0; __fr(p1, 600);`);
  check('a lost cruiser has no pill', J('p1.camX.tag.vis') === false);
}

console.log('F. the files');
{
  const html = src('index.html'), scene = src('src/campaignscene.js'), cam = src('src/campcockpitcam.js');
  check('the script is in index.html, after the effects (the scene calls it at run time, as it calls the feel)', html.indexOf('src/campcockpitcam.js') > html.indexOf('src/campfeelfx.js') && html.indexOf('src/campfeelfx.js') > 0 && (html.match(/src\/campcockpitcam\.js/g) || []).length === 1);
  check('the scene calls it in two places only: eyeSync (the glide starts on an eye change, else the scene\'s own follow) and the frame after it', (scene.match(/&& campCamEye\(this, e, sp, was\)/g) || []).length === 1 && (scene.match(/campCamFrame\(this, dt\);/g) || []).length === 1);
  check('the file has no Phaser calls outside the frame, no Math.random, no gold, amber or pink, and no rule of the sim is written (no C.* assignment)', !/Math\.random/.test(code('src/campcockpitcam.js')) && !/0x(ffc857|ffa83a|ffd37a|ff6fa8|ff4d6d|ffa040)/i.test(code('src/campcockpitcam.js')) && !/\bC\.[a-zA-Z.]+ = /.test(code('src/campcockpitcam.js').replace(/const C = [^;]*;/g, '')));
  check('the Long Haul\'s camera and ship files are not named in code (comments only)', !/\b(shipsFrame|camzoomFrame|camzoomCompose|camzoomBase|startFollow\s*\(\s*this\.ship)/.test(code('src/campcockpitcam.js')) && !/\b(shipsFrame|camzoomFrame|camzoomCompose)\s*\(/.test(code('src/campfeel.js')));
}

if (failed) { console.log(`\nFAILED ${failed} of ${n}`); process.exit(1); }
console.log(`\nCAMP COCKPIT CAM PASS (${n} checks)`);
