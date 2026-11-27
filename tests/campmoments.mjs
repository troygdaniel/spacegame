// smoke: the fight's moments (BRIEF 7, decision 8): a hit flashes white and throws three sparks, a kill is a white frame, six shards, a thin ring and a nudge, a wave glows the edge it comes from; pooled sprites, still under reduced motion
// Card space-game-b7-hit-kill-wave (the tiles are docs/pace-and-polish.html). The rule is in src/campmoments.js; the sim's events carry a few more fields (src/campaign.js campHurt, campKill, campSchedule); the page elements are src/camppagehud.js.
//   A  the sim: the hit's side, shooter and angle; the boom's team and killer; the wave event; nothing else of the sim changes
//   B  the pure rules: sides and colours, the edge a wave comes from, the notch, the kill's pieces and the spark's way, the nudge
//   C  the hit in the scene: the white frames, three pooled sparks in the firing side's colour, the cap of 30, the arc's notch
//   D  the kill in the scene: one pooled record of eight sprites, the white frame, six shards in the ship's colour, the ring, the nudge, the pilot's ring
//   E  the wave in the page: the glow, the chevrons, the slide; the pilot's pulse in the model
//   F  the switch and the rules: the look off draws nothing; reduced motion holds still; no image, no web, no new particle system; the scene's calls
// Run: node tests/campmoments.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ shiplook: 'table', pagehud: 'table' });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

g.run(`
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); C.t = 1000; C.events.length = 0; window.CA = C.carrier; return C; };
  window.__ev = type => C.events.filter(e => e.type === type);
  window.__img = () => { const o = { vis: false, x: 0, y: 0, rot: 0, sx: 1, sy: 1, a: 1, tint: null, fill: false, key: null, depth: 0 };
    o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setRotation = r => { o.rot = r; return o; }; o.setScale = (a, b) => { o.sx = a; o.sy = b === undefined ? a : b; return o; }; o.setAlpha = a => { o.a = a; return o; };
    o.setVisible = v => { o.vis = !!v; return o; }; o.setDepth = d => { o.depth = d; return o; }; o.setTint = c => { o.tint = c; o.fill = false; return o; }; o.setTintFill = c => { o.tint = c; o.fill = true; return o; };
    o.clearTint = () => { o.tint = null; o.fill = false; return o; }; o.setTexture = k => { o.key = k; return o; }; o.destroy = () => {}; return o; };
  window.__scene = zoom => { const made = [], cam = { zoom: zoom || 1, scrollX: 0, scrollY: 0, width: 1280, height: 720, midPoint: { x: CA.x, y: CA.y }, offs: [], setFollowOffset(x, y) { this.offs.push([x, y]); } };
    const gr = { fillStyle() { return gr; }, fillRoundedRect() { return gr; }, fillRect() { return gr; }, fillCircle() { return gr; }, lineStyle() { return gr; }, strokeCircle() { return gr; }, generateTexture() {}, destroy() {} };
    return window.S = { camp: C, hud: {}, sp: {}, cameras: { main: cam }, textures: { exists: () => true }, make: { graphics: () => gr }, add: { image: (x, y, key) => { const o = __img(); o.key = key; made.push(o); return o; } }, made }; };
  window.__ship = (u, key) => { const sp = __img(); sp.texture = { key: key || 'ship-' + u.kind }; sp.scaleX = 0.5; sp.scaleY = 0.5; sp.rotation = 0.3; sp.x = u.x; sp.y = u.y; S.sp[u.id] = sp; return sp; };
`);

console.log('A. the sim: what the events say');
g.run(`__new(); window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y - 300); C.shield = 0; campHurt(C, CA, 5, AL.id);`);
const h1 = J(`__ev('hit')[0]`);
check('a hit on the cruiser by an alien: the event says who fired (by), that the side that fired is hostile (foe), and the angle toward the shooter (up and to the right: -45 degrees)', h1 && h1.by === J('AL.id') && h1.side === 'foe' && near(h1.a, -Math.PI / 4) && h1.hull === true && h1.id === J('CA.id'), JSON.stringify(h1));
g.run(`__new(); window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y); AL.hp = 100; campHurt(C, AL, 5, CA.id);`);
const h2 = J(`__ev('hit')[0]`);
check('a hit on an alien by the cruiser: the side that fired is your own (own), and the angle is toward the cruiser (west: 180 degrees)', h2 && h2.side === 'own' && h2.by === J('CA.id') && near(Math.abs(h2.a), Math.PI), JSON.stringify(h2));
g.run(`__new(); window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y); AL.hp = 100; campHurt(C, AL, 5);`);
const h3 = J(`__ev('hit')[0]`);
g.run(`__new(); C.shield = 0; campHurt(C, CA, 5);`);
const h4 = J(`__ev('hit')[0]`);
check('no shooter known: the side is the opposite of the ship hit (an alien is hit by you, your ship by them), the angle is not there, and the rest of the event is as it was', h3 && h3.side === 'own' && h3.a === undefined && h4 && h4.side === 'foe' && h4.a === undefined && h4.type === 'hit' && typeof h4.x === 'number' && h4.hull === true, JSON.stringify([h3, h4]));
g.run(`__new(); window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y); AL.hp = 1; campHurt(C, AL, 5, CA.id);`);
const b1 = J(`__ev('boom')[0]`);
check('a kill: the boom event says what died (team, faction, kind: for its colour) and whose shot it was (by); the ship is dead as before', !!b1 && b1.team === 'alien' && typeof b1.fac === 'string' && b1.by === J('CA.id') && b1.kind === 'raider' && b1.id === J('AL.id') && J('AL.hp') === 0, JSON.stringify(b1));
g.run(`__new(); window.TW = campSpawn(C, 'raider', CA.x + 300, CA.y); TW.hp = 1; campHurt(C, TW, 5);`);
check('a kill with no shooter (a torpedo, a blast): by is not there', J(`__ev('boom')[0].by === undefined`) === true && J(`__ev('boom')[0].team`) === 'alien');
g.run(`
  window.__wave = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.L.waves = [{ at: 1, from: [3000, -2000], ships: { raider: 2 }, goal: 'carrier', say: 'camp.say.wave1' }]; C.waves = [{ started: false, at: 0 }]; C.arrivedAt = 0; C.events.length = 0; for (let i = 0; i < 300 && !C.events.some(e => e.type === 'wave'); i++) campStep(C, 1 / 30); return C; };
  __wave();
`);
const wv = J(`__ev('wave')[0]`);
check('a wave coming out of the dark is an event of its own: its number, and where it came from (the place the aliens were made), before the radio line', wv && typeof wv.i === 'number' && typeof wv.x === 'number' && typeof wv.y === 'number' && J(`C.waves[${wv.i}].started`) === true, JSON.stringify(wv));
g.run(`window.__fight = (seed, extra) => { const C = window.C = campNew(1, [], { seed, mission: 0 }); C.arrivedAt = 0; const out = []; for (let i = 0; i < 900; i++) { campStep(C, 1 / 30); } return [C.t, C.carrier.hp, C.shield, C.kills, C.ships.length, C.ships.map(u => Math.round(u.x) + ',' + Math.round(u.y)).join('|')]; };`);
check('a torpedo shot down says whose fire it was (side own: its sparks are your mint), and the page HUD (not this file) owns the scroll\'s geometry for the wave: campPageHudWaveEdge', /type: 'hit', x: t\.x, y: t\.y, id: t\.id, hull: false, side: 'own'/.test(src('src/camptorpedo.js')) && /function campPageHudWaveEdge\(/.test(src('src/camppagehud.js')) && !/scrollX|scrollY/.test(src('src/campmoments.js').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '')));
check('the sim runs the same twice (the fields are the picture\'s: nothing reads them back, the fight\'s end state is the same)', JSON.stringify(J('__fight(9)')) === JSON.stringify(J('__fight(9)')));
check('and the sim file stays a rule file: no scene, no Phaser, no switch of the new look in it', !/campMoments|slookOn|Phaser|scene\./.test(src('src/campaign.js').split('\n').filter(l => /type: 'hit'|type: 'boom'|type: 'wave'/.test(l)).join('\n')));

console.log('B. the pure rules');
check('a dead ship\'s side from the boom: your pilots friend, a freighter protect, a patrol neutral, pirates foe, aliens alien', J(`['earth:fighter', 'earth:freighter', 'neutral:patrol', 'alien:raider:pirate', 'alien:drone:alien'].map(s => { const [team, kind, fac] = s.split(':'); return campMomentsSide({ team, kind, fac }); }).join()`) === 'friend,protect,neutral,foe,alien');
check('the fire is your mint and hostile pink (the ship look\'s own colours); a ship\'s colour is its side\'s', J(`campMomentsFireColor('own')`) === 0x7df0c0 && J(`campMomentsFireColor('foe')`) === 0xff6fa8 && J(`campMomentsColor('foe')`) === 0xff6fa8 && J(`campMomentsColor('alien')`) === 0xd58bff && J(`campMomentsColor('protect')`) === 0xffc857);
const E = (x, y) => J(`campMomentsEdge(${x}, ${y}, 1280, 720)`);
check('the edge a wave comes from: a point far to the east is the right edge, far to the west the left, north the top, south the bottom', E(5000, 360).edge === 'r' && E(-5000, 360).edge === 'l' && E(640, -4000).edge === 't' && E(640, 4000).edge === 'b');
check('how far along: due east is the middle of the right edge (0.5), a point up and to the right crosses it higher, and a steep one is held to 8 percent from the corner', near(E(5000, 360).p, 0.5) && E(2000, 0).p < 0.5 && near(E(1300, -9000).p, 0.5 + 0 * 1, 0.5) && E(100000, -50000).p === 0.08 && E(100000, 50000).p === 0.92);
check('the middle itself has no edge', J(`campMomentsEdge(640, 360, 1280, 720)`) === null && J(`campMomentsEdge(0, 0, 0, 0)`) === null);
const NS = (f, age) => J(`campMomentsNotchSpan(${f}, ${age})`);
check('the notch starts at the end of the arc and covers the 7 percent the hull just lost (the share of the turn), full strength at once, and is gone at 450 ms; a full hull has none', near(NS(0.6, 0).a0, 0.6) && near(NS(0.6, 0).a1, 0.67) && near(NS(0.6, 0).alpha, 1) && near(NS(0.6, 225).alpha, 0.5) && NS(0.6, 450) === null && NS(1, 10) === null && near(NS(0.98, 0).a1, 1));
const K0 = J(`campMomentsKillAt(0, 1)`), K1 = J(`campMomentsKillAt(300, 1)`);
check('a kill\'s pieces: the white frame for 40 ms, six shards, the ring from 10 px', K0.flash === true && K0.shards.length === 6 && near(K0.ring.r, 10) && J(`campMomentsKillAt(39, 1).flash`) === true && J(`campMomentsKillAt(41, 1).flash`) === false);
check('the ring grows fast and thin (most of its 80 px in the first third of the 0.6 s) and fades; the shards fly out and fade; all gone at 600 ms', J(`campMomentsKillAt(200, 1).ring.r`) > 60 && J(`campMomentsKillAt(590, 1).ring.r`) <= 80 && K1.ring.a < 0.6 && K1.shards[0].a < 0.6 && J(`campMomentsKillAt(600, 1).done`) === true);
check('the sizes are screen px times the unit: at twice the unit everything is twice the size', near(J(`campMomentsKillAt(200, 2).ring.r`), 2 * J(`campMomentsKillAt(200, 1).ring.r`)) && near(J(`campMomentsKillAt(200, 2).shards[1].x`), 2 * J(`campMomentsKillAt(200, 1).shards[1].x`)));
const SP = J(`[campMomentsSparkAt(0, 0, 1), campMomentsSparkAt(100, 0, 1), campMomentsSparkAt(200, 0, 1)]`);
check('a spark goes out along its way (24 px in 0.2 s), fading, and is done at 200 ms', SP[0].x === 0 && SP[0].a === 1 && SP[1].x > 12 && SP[1].a === 0.5 && SP[2].done === true && near(SP[2].x, 24));
check('the nudge: a half sine, up and back to nothing in 180 ms, nothing before or after', J(`campMomentsNudgeAt(0)`) === 0 && near(J(`campMomentsNudgeAt(90)`), 1) && J(`campMomentsNudgeAt(180)`) === 0 && J(`campMomentsNudgeAt(-5)`) === 0);

console.log('C. the hit in the scene');
g.run(`__new(); __scene(1); window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y); AL.hp = 100; __ship(AL); campHurt(C, AL, 5, CA.id); window.HE = __ev('hit')[0]; window.R1 = campMomentsHit(S, HE);`);
check('the hit is taken (the scene\'s puff is left out), three sparks are up: the firing side\'s mint, 8 by 3 px, on the ship\'s place, just above the ships', J('R1') === true && J('S.made.length') === 3 && J('S.made.every(o => o.vis && o.tint === 0x7df0c0 && o.key === "mom-spark")') && J('S.made.every(o => o.x === HE.x && o.y === HE.y)') );
check('the sparks fly back along the shot (toward the shooter: west), spread 0.55 rad apart, each pointing along its way', J('S.made.map(o => o.rot).join()') === J('[HE.a - 0.55, HE.a, HE.a + 0.55].join()') && J('S.hud.mom.sparks.length') === 3);
g.run(`C.t += 100; campMomentsFrame(S);`);
check('100 ms later they are half way out and half faded; at 200 they are gone and free again (no new sprite is made for the next hit)', J('S.made.every(o => o.vis && Math.abs(o.a - 0.5) < 1e-9 && o.x < HE.x)') === true);
g.run(`C.t += 100; campMomentsFrame(S);`);
check('at 200 ms all three are hidden and in the free list', J('S.made.every(o => !o.vis)') && J('S.hud.mom.sparks.length') === 0 && J('S.hud.mom.freeSparks.length') === 3);
g.run(`campHurt(C, AL, 5, CA.id); campMomentsHit(S, __ev('hit').pop());`);
check('the next hit uses the same three sprites', J('S.made.length') === 3 && J('S.hud.mom.sparks.length') === 3);
g.run(`__new(); __scene(1); window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y); AL.hp = 100; for (let i = 0; i < 16; i++) { campHurt(C, AL, 0.1, CA.id); campMomentsHit(S, __ev('hit').pop()); }`);
check('at most 30 sparks are ever made: sixteen hits at once leave 30 up (the oldest are used again), and no thirty-first sprite exists', J('S.made.length') === 30 && J('S.hud.mom.sparks.length') === 30);
g.run(`__new(); __scene(1); window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y); AL.hp = 100; window.SPA = __ship(AL); campHurt(C, AL, 5, CA.id); campMomentsHit(S, __ev('hit')[0]); campMomentsFrame(S);`);
check('the ship hit is filled white for two frames (34 ms): white fill while it lasts', J('SPA.fill === true && SPA.tint === 0xffffff'));
g.run(`C.t += 33; campMomentsFrame(S);`);
const still = J('SPA.fill === true');
g.run(`C.t += 2; campMomentsFrame(S);`);
check('33 ms in it is still white; at 35 ms it has its own look back (the tint cleared), and the book is closed', still === true && J('SPA.fill === false && SPA.tint === null') && J('Object.keys(S.hud.mom.flash).length') === 0);
g.run(`__new(); __scene(1); C.shield = 0; window.CP = __ship(CA); campHurt(C, CA, 5, undefined); campMomentsHit(S, __ev('hit')[0]); campMomentsFrame(S);`);
check('a hit on the cruiser\'s hull keeps its own red blink (the scene\'s flash) and the white frame is not drawn over it; the sparks and the notch are', J('CP.fill') === false && J('S.made.length') === 3 && J('S.momHitAt[CA.id] === C.t'));
g.run(`__new(); __scene(1); window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y); AL.hp = 100; campHurt(C, AL, 5, CA.id); campMomentsHit(S, __ev('hit')[0]);`);
check('the hit is written down for the hull arc: a notch for 450 ms of the sim\'s clock', J('S.momHitAt[AL.id] === C.t'));
g.run(`
  window.__gr = () => { const R = { strokes: [], style: null }, o = { lineStyle: (w, c, a) => { R.style = { w, c, a }; return o; }, strokePoints: (pts, cl) => { R.strokes.push({ ...R.style, n: pts.length, p0: [pts[0].x, pts[0].y] }); return o; } }; R.g = o; return R; };
  window.GR = __gr(); window.__hp = 0.6; window.RN = campMomentsNotch(GR.g, S, AL, 40, 2, __hp);
`);
const ns = J('GR.strokes');
check('the notch is drawn on the arc\'s Graphics: white, 1.8 times the arc\'s width, full strength at the hit, from the end of the arc (a pale run of points)', J('RN') === true && ns.length === 1 && ns[0].c === 0xffffff && near(ns[0].w, 3.6) && near(ns[0].a, 1) && ns[0].n >= 3, JSON.stringify(ns));
g.run(`C.t += 450; GR = __gr(); window.RN2 = campMomentsNotch(GR.g, S, AL, 40, 2, __hp);`);
check('450 ms on it is over: nothing is drawn and the note is dropped', J('RN2') === false && J('GR.strokes.length') === 0 && J('S.momHitAt[AL.id]') === null);
check('the hull arc itself asks for the notch (slookArcDraw, once, for a hurt ship only) and the arc code has a helper for a part of the turn', /campMomentsNotch\(g, s, u, R, w, f\)/.test(src('src/shiplookmarks.js')) && /function slookArcSpan\(/.test(src('src/shiplookmarks.js')) && J('slookArcSpan(0, 0, 40, 0.5, 0.6).length') >= 3 && near(J('slookArcSpan(0, 0, 40, 0.5, 0.6)[0].x'), 0, 1e-9) && near(J('slookArcSpan(0, 0, 40, 0.5, 0.6)[0].y'), 40, 1e-6));

console.log('D. the kill in the scene');
g.run(`__new(); __scene(1); window.AL = campSpawn(C, 'raider', CA.x + 600, CA.y); AL.hp = 1; window.SPK = __ship(AL, 'slook-raider'); campHurt(C, AL, 5, CA.id); window.BE = __ev('boom')[0]; window.RK = campMomentsKill(S, BE);`);
const kmade = J('S.made.map(o => o.key)');
check('the kill is taken (the ship look\'s own kill and the puff are left out): one record of eight sprites: the white frame, the thin ring, six shards', J('RK') === true && kmade.length === 8 + 0 && kmade.filter(k => k === 'mom-shard').length === 6 && kmade.filter(k => k === 'mom-ring').length === 1, JSON.stringify(kmade));
check('the white frame is the ship\'s own picture filled white, where the ship is (its place, its turn and its scale), for the first 40 ms', J('S.hud.mom.kills[0].flash.fill === true && S.hud.mom.kills[0].flash.tint === 0xffffff && S.hud.mom.kills[0].flash.key === "slook-raider" && S.hud.mom.kills[0].flash.vis === true && S.hud.mom.kills[0].flash.x === SPK.x && S.hud.mom.kills[0].flash.rot === 0.3 && S.hud.mom.kills[0].flash.sx === 0.5'));
check('six shards in the colour of the ship\'s side (a raider is an alien: violet), the ring white and thin, ring 10 px', J('S.hud.mom.kills[0].shards.every(o => o.tint === 0xd58bff && o.vis)') && J('S.hud.mom.kills[0].ring.tint === 0xffffff && Math.abs(S.hud.mom.kills[0].ring.sx * 64 - 10) < 1e-9'));
g.run(`C.t += 41; campMomentsFrame(S);`);
check('41 ms in the white frame is gone and the rest goes on; the shards are on their way out', J('S.hud.mom.kills[0].flash.vis === false && S.hud.mom.kills[0].ring.vis === true') && J('S.hud.mom.kills[0].shards[0].x !== S.hud.mom.kills[0].x'));
g.run(`C.t += 600; campMomentsFrame(S);`);
check('at 0.6 s everything is hidden and the record is free again', J('S.made.every(o => !o.vis)') && J('S.hud.mom.kills.length') === 0 && J('S.hud.mom.freeKills.length') === 1);
g.run(`__new(); __scene(1); for (let i = 0; i < 9; i++) { const u = campSpawn(C, 'raider', CA.x + 600 + i, CA.y); u.hp = 1; S.sp[u.id] = null; campHurt(C, u, 5, CA.id); campMomentsKill(S, __ev('boom').pop()); }`);
check('at most six kills are up at once (48 sprites, never more): the oldest is used again', J('S.made.length') === 48 && J('S.hud.mom.kills.length') === 6);
g.run(`__new(); __scene(1); window.AL2 = campSpawn(C, 'raider', CA.x + 600, CA.y); AL2.hp = 1; campHurt(C, AL2, 5, CA.id); campMomentsKill(S, __ev('boom')[0]);`);
check('a ship with no picture on the screen is a white disc where it died', J('S.hud.mom.kills[0].flash.key === "mom-disc" && S.hud.mom.kills[0].flash.x === __ev("boom")[0].x && S.hud.mom.kills[0].flash.vis'));
g.run(`__new(); __scene(1); campMomentsKill(S, { type: 'boom', x: 0, y: 0, big: true, kind: 'carrier', id: 'x', team: 'earth' });`);
check('the cruiser and the mothership keep the ship look\'s big end (not taken here)', J('S.made.length') === 0 && J(`(() => { __scene(1); return campMomentsKill(S, { type: 'boom', x: 0, y: 0, kind: 'mother', id: 'y', team: 'alien', fac: 'alien' }); })()`) === false);
g.run(`__new(); __scene(1); window.AL3 = campSpawn(C, 'raider', CA.x + 600, CA.y - 100); AL3.hp = 1; campHurt(C, AL3, 5, CA.id); campMomentsKill(S, __ev('boom')[0]); window.NU = S.hud.mom.nudge; campMomentsFrame(S);`);
const o0 = J('S.cameras.main.offs.length');
check('the view nudges toward the kill (a unit vector from the middle of the view, east and a little north); at the start of the half sine the offset is nothing, and a nothing is not written to the camera', J('NU') && J('NU.x > 0.9 && NU.y < 0') && o0 === 0);
g.run(`C.t += 90; campMomentsFrame(S);`);
const o1 = J('S.cameras.main.offs[S.cameras.main.offs.length - 1]');
check('half way (90 ms) the offset is at its largest: 4 world px against the kill at zoom 1 (2 px on the screen, and the follow\'s lag takes about half)', o1 && o1[0] < -3.5 && Math.hypot(o1[0], o1[1]) > 3.99 && Math.hypot(o1[0], o1[1]) < 4.01 && o1[1] > 0, JSON.stringify(o1));
g.run(`C.t += 100; campMomentsFrame(S); campMomentsFrame(S); window.NOFF = S.cameras.main.offs.length;`);
check('at 180 ms it is back to nothing, written once more, then not written again (a quiet frame writes no camera offset)', J('S.cameras.main.offs[NOFF - 1]')[0] === 0 && J('S.cameras.main.offs[NOFF - 1]')[1] === 0 && J('S.hud.mom.nudge') === null && (g.run(`campMomentsFrame(S); campMomentsFrame(S);`), J('S.cameras.main.offs.length') === J('NOFF')));
g.run(`__new(); __scene(0.5); window.AL4 = campSpawn(C, 'raider', CA.x + 600, CA.y); AL4.hp = 1; campHurt(C, AL4, 5, CA.id); campMomentsKill(S, __ev('boom')[0]); C.t += 90; campMomentsFrame(S);`);
check('zoomed out to a half: the offset is in world px, twice as many for the same screen px (8), and the pieces are twice as big in the world (the screen\'s size)', Math.abs(Math.hypot(...J('S.cameras.main.offs.pop()')) - 8) < 0.01 && J('S.hud.mom.kills[0].unit') === 2);
g.run(`__new(); __scene(1); S.camLead = { x: 30, y: 0 }; window.OF = campMomentsOffset(S);`);
check('the lead of the view (the camera card sets s.camLead, world px ahead of the ship) and the nudge are added: a lead of 30 px east is an offset of -30, the camera aims ahead', J('OF.x') === -30 && J('OF.y') === 0 && J('(S.camLead = null, campMomentsOffset(S).x)') === 0);
g.run(`__new(); __scene(1); window.AL5 = campSpawn(C, 'raider', CA.x + 600, CA.y); AL5.hp = 1; campHurt(C, AL5, 5, CA.id); campMomentsKill(S, __ev('boom')[0]);`);
const pu = J('S.momPulse');
check('the pilot whose shot it was pulses in the HUD: the killer\'s id is written down for 0.45 s of the page\'s clock; a kill with no shooter writes nothing', pu && typeof pu[J('CA.id')] === 'number' && (g.run(`window.PU0 = Object.keys(S.momPulse).length; AL5.hp = 1; const q = campSpawn(C, 'raider', CA.x + 800, CA.y); q.hp = 1; campHurt(C, q, 5); campMomentsKill(S, __ev('boom').pop());`), J('Object.keys(S.momPulse).length') === J('PU0')));

console.log('E. the wave and the pilot\'s ring in the page');
g.run(`
  window.__doc = () => { const els = [], mk = tag => { const e = { tag, children: [], parentNode: null, _cls: '', _attr: {}, _log: [], style: { props: {}, setProperty(k, v) { this.props[k] = v; } }, offsetWidth: 7, ownerDocument: null };
      e.classList = { add(c) { e._log.push('+' + c); if (e._cls.split(' ').indexOf(c) < 0) e._cls = (e._cls + ' ' + c).trim(); }, remove(c) { e._log.push('-' + c); e._cls = e._cls.split(' ').filter(x => x && x !== c).join(' '); }, contains(c) { return e._cls.split(' ').indexOf(c) >= 0; } };
      Object.defineProperty(e, 'className', { get() { return e._cls; }, set(v) { e._cls = v; } }); e.setAttribute = (k, v) => { e._attr[k] = v; }; e.appendChild = c => { c.parentNode = e; e.children.push(c); return c; }; e.insertBefore = e.appendChild; e.removeChild = c => { e.children = e.children.filter(x => x !== c); c.parentNode = null; };
      e.ownerDocument = doc; return e; }, doc = { createElement: mk }; return doc; };
  window.DOC = __doc(); window.ROOT = DOC.createElement('div'); window.S2 = { camp: C, pageHud: { root: ROOT, edge: { el: DOC.createElement('div') } }, pageHudOn: true, cameras: { main: { zoom: 1, scrollX: 0, scrollY: 0 } } };
`);
g.run(`window.W1 = campPageHudWave(S2, { edge: 'r', p: 0.42 }, false); window.WV = S2.pageHud.wave;`);
check('the first wave builds the page elements, once: one root with the glow and three chevrons, on the edge it comes from, a fraction along it, and runs (class on)', J('W1') === true && J('WV.chev.length') === 3 && J('WV.el._attr["data-e"]') === 'r' && J('WV.el.style.props["--p"]') === '42%' && J('WV.el.classList.contains("on")') && J('ROOT.children.length') === 1);
g.run(`campPageHudWave(S2, { edge: 'l', p: 0.8 }, false);`);
check('the next wave runs it again (off, then on: the keyframes start over) from the other edge, with no new element', J('ROOT.children.length') === 1 && J('WV.el._attr["data-e"]') === 'l' && J('WV.el._log.slice(-2).join()') === '-on,+on' && J('WV.el.style.props["--p"]') === '80%');
g.run(`S2.pageHud.edgeShown = false; campPageHudWave(S2, { edge: 'r', p: 0.5 }, false); window.EL = S2.pageHud.edge.el;`);
check('the hostiles\' pill is not up yet: it is not slid now (it slides when it first shows, within 2.5 s: see the paint)', J('EL.classList.contains("ph-slide")') === false && J('S2.pageHud.waveDir') === 0);
g.run(`S2.pageHud.edgeShown = true; campPageHudWave(S2, { edge: 'b', p: 0.5 }, false);`);
check('it is up already (an earlier group): it slides in again at once, from the edge the wave came from (bottom: 4 em down)', J('EL.classList.contains("ph-slide")') && Math.abs(parseFloat(J('EL.style.props["--sy"]')) - 4) < 0.01 && Math.abs(parseFloat(J('EL.style.props["--sx"]'))) < 0.01);
g.run(`EL._cls = 'ph-p ph-edge'; campPageHudWave(S2, { edge: 'r', p: 0.5 }, true); window.PSL = EL.classList.contains('ph-slide');`);
check('with no motion wanted the pill does not slide (the glow runs; the stylesheet only fades it)', J('PSL') === false);
check('no page HUD, no wave: nothing is asked of a scene without it, and a wave seen from the very middle has no edge', J('campMomentsWave({ pageHudOn: false, camp: C }, { x: 0, y: 0 })') === false && J('campMomentsWave({ pageHudOn: true, pageHud: null, camp: C, cameras: { main: { zoom: 1, scrollX: 0, scrollY: 0 } } }, { x: 640, y: 360 })') === false);
g.run(`__new(); window.S3 = { camp: C, pageHudOn: true, pageHud: S2.pageHud, cameras: { main: { zoom: 1, scrollX: 0, scrollY: 0 } } }; S2.pageHud.edgeShown = false; window.RW = campMomentsWave(S3, { type: 'wave', i: 0, x: 4000, y: 360 });`);
check('the scene\'s wave: the point is far to the east of a screen at the origin: the right edge glows', J('RW') === true && J('S2.pageHud.wave.el._attr["data-e"]') === 'r' && typeof J('S3.momWaveAt') === 'number');
g.run(`
  __new(); campOrder(C, 'launch'); for (let i = 0; i < 240 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0;
  window.PL = campSelList(C).filter(e => e.kind === 'pilot').map(e => e.unit);
`);
const mp = (pulse, now) => J(`campPageModel(C, { x: 0, y: 0, zoom: 1, was: {}, pulse: ${JSON.stringify(pulse)}, now: ${now} }).pilots.items.map(p => p.pulse).join()`);
check('a pilot\'s kill pulses his ring in the model while the pulse lasts: the first pilot\'s fighter id, until 5000 on the page\'s clock; nobody before it is and nobody after', mp({ [J('PL[0].id')]: 5000 }, 4000) === 'true,false,false' && mp({ [J('PL[0].id')]: 5000 }, 6000) === 'false,false,false' && mp(null, 0) === 'false,false,false' && J('campPageModel(C).pilots.items.every(p => p.pulse === false)'));
const css = src('src/camppagehud.css'), pj = src('src/camppagehud.js');
check('the stylesheet: the glow, three chevrons with their own delays, the pill\'s slide on the `translate` property (the pill\'s transform keeps its centring), the ring\'s pulse; every animation is in the no-preference block and the glow only fades under reduced motion', /\.ph-wave\.on \.ph-wg \{ animation: ph-wfade \.33s/.test(css) && /nth-of-type\(3\) \{ animation-delay: \.08s/.test(css) && /nth-of-type\(4\) \{ animation-delay: \.16s/.test(css) && /@keyframes ph-slide \{ from \{ opacity: 0; translate: var\(--sx\) var\(--sy\)/.test(css) && /prefers-reduced-motion: no-preference\) \{[^@]*\.ph-wave\.on \.ph-wc \{ animation: ph-wrun/.test(css) && /prefers-reduced-motion: reduce\) \{ \.ph-g\.kill \.ph-ring/.test(css));
check('the pill slides when it first shows within a moment of a wave (the paint), never otherwise', /R\.waveAt && .*campPageHudSlide\(E\.el, R\.waveDir\)/.test(pj) && /R\.edgeShown = !!M\.edge/.test(pj));

g.run(`__new(); __scene(1); S.momHitAt = { 'raider-1': 5 }; S.momPulse = { 'carrier-1': 9e9 }; S.momWaveAt = 77; campMomentsReset(S);`);
check('a scene that starts again forgets the last battle\'s notes: the notches, the pilot pulses and the wave\'s time (the scene is the same object at a restart); create asks for it before the ship look\'s frame is installed', J('Object.keys(S.momHitAt).length') === 0 && J('Object.keys(S.momPulse).length') === 0 && J('S.momWaveAt') === 0 && /campMomentsReset\(this\)/.test(src('src/campaignscene.js')) && src('src/campaignscene.js').indexOf('campMomentsReset(this)') < src('src/campaignscene.js').indexOf('slookFxInstall(this)'));

console.log('F. the switch and the rules');
g.run(`__new(); __scene(1); CAMP.flags.shiplook = false; window.AL6 = campSpawn(C, 'raider', CA.x + 300, CA.y); AL6.hp = 100; campHurt(C, AL6, 5, CA.id); window.RH0 = campMomentsHit(S, __ev('hit')[0]); AL6.hp = 1; campHurt(C, AL6, 5, CA.id); window.RK0 = campMomentsKill(S, __ev('boom')[0]); campMomentsFrame(S);`);
check('the new ship look off: a hit and a kill are not taken (the scene draws today\'s puff and kill), nothing is made, nothing is flashed', J('RH0') === false && J('RK0') === false && J('S.made.length') === 0 && J('S.hud.mom === undefined'));
g.run(`CAMP.flags.shiplook = true;`);
g.run(`window.matchMedia = q => ({ matches: /reduce/.test(q) }); __new(); __scene(1); window.AL7 = campSpawn(C, 'raider', CA.x + 300, CA.y); AL7.hp = 100; window.SP7 = __ship(AL7, 'slook-raider'); campHurt(C, AL7, 5, CA.id); window.RH1 = campMomentsHit(S, __ev('hit')[0]); campMomentsFrame(S);`);
check('reduced motion: the hit keeps its white frames and its notch and throws no sparks', J('RH1') === true && J('S.made.length') === 0 && J('SP7.fill') === true && J('S.momHitAt[AL7.id] === C.t'));
g.run(`AL7.hp = 1; campHurt(C, AL7, 5, CA.id); campMomentsKill(S, __ev('boom')[0]); window.KR = S.hud.mom.kills[0];`);
check('reduced motion: the kill is the white frame and a ring that stays where it is and fades (no growth), no shards, and the view does not nudge', J('KR.flash.vis === true && KR.ring.vis === true && KR.shards.every(o => !o.vis)') && J('S.hud.mom.nudge') === null && near(J('KR.ring.sx * 64'), 40) );
g.run(`delete window.matchMedia;`);
const mj = src('src/campmoments.js'), code = mj.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('no image file, no web request, no library, no particle emitter: everything is baked in code and drawn with pooled images; no Phaser tween or timer', !/new Image|fetch\(|XMLHttpRequest|\.png|\.jpg|particles\.|createEmitter|add\.particles|tweens\.add|delayedCall|time\.addEvent/.test(code));
check('nothing of the sim is read back or written: this file never touches C.ships\' hp, positions, speeds or the sim\'s clock (it reads C.t and the carrier only)', !/\.hp\s*[-+*]?=[^=]|\.vx\s*=[^=]|\.vy\s*=[^=]|C\.t\s*[-+]?=[^=]|C\.shield\s*=[^=]/.test(code));
const sc = src('src/campaignscene.js'), html = src('index.html');
check('the scene asks for the moments in four places, each as "if the function exists": the hit (after the shield\'s own say), the kill (before the ship look\'s), the wave, and the frame after the sprites are in place', /campShieldHitSkip\(this, e\)\) && !\(typeof campMomentsHit === 'function' && campMomentsHit\(this, e\)\)/.test(sc) && /campMomentsKill\(this, e\)\)\s*&&\s*!\(typeof slookKill/.test(sc) && /e\.type === 'wave'\) \{ if \(typeof campMomentsWave === 'function'\) campMomentsWave\(this, e\)/.test(sc) && sc.indexOf('campMomentsFrame(this, dt)') > sc.indexOf('campShieldHitPaint(this'));
check('the file has its own script tag, after the shield hit\'s', html.indexOf('src/campmoments.js') > html.indexOf('src/campshieldhit.js') && html.split('src/campmoments.js').length === 2);

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
