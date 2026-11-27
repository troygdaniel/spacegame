// smoke: the torpedo, the boost and the end of a mission (BRIEF 7, decisions 10 and 11): a torpedo has a dashed line and a ring on its target and ends in a mint burst, the boost has two edge lines and a ribbon that breaks into dashes, a win or a loss slows the picture to a third and eases onto what decided it
// Card space-game-b7-torpedo-boost-beat (the tiles are docs/pace-and-polish.html). The rules are in src/campmoments.js (the burst, the beat), src/camptorpedoscene.js, src/campfeelfx.js and src/campfeel.js.
//   A  the torpedo: the dashed line to its target, the ring on the target (amber for a ship you protect, your pale blue for yours), the old solid line with the look off, the mint burst when it is shot down
//   B  the boost: two thin edge lines (the top and the bottom for a flight that is more across the screen, the sides for one more up it), the wider ribbon, the dashes when the store runs low
//   C  the beat: what decided it (pure), the shape of the beat, the clock of the effects at a third, the ring, the view's ease, the sim never touched, reduced motion, a new battle forgets it
//   D  the rules: the scene's calls, no image, no web, nothing of the sim written
// Run: node tests/campbeat.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ shiplook: 'table', pagehud: 'table', feel: 'table' });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;

g.run(`
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); C.t = 1000; C.events.length = 0; window.CA = C.carrier; return C; };
  window.__img = () => { const o = { vis: false, x: 0, y: 0, rot: 0, sx: 1, sy: 1, a: 1, tint: null, fill: false, key: null, depth: 0 };
    o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setRotation = r => { o.rot = r; return o; }; o.setScale = (a, b) => { o.sx = a; o.sy = b === undefined ? a : b; return o; }; o.setAlpha = a => { o.a = a; return o; };
    o.setVisible = v => { o.vis = !!v; return o; }; o.setDepth = d => { o.depth = d; return o; }; o.setTint = c => { o.tint = c; o.fill = false; return o; }; o.setTintFill = c => { o.tint = c; o.fill = true; return o; };
    o.clearTint = () => { o.tint = null; o.fill = false; return o; }; o.setTexture = k => { o.key = k; return o; }; o.setBlendMode = () => o; o.destroy = () => {}; return o; };
  window.__scene = zoom => { const made = [], cam = { zoom: zoom || 1, scrollX: 0, scrollY: 0, width: 1280, height: 720, midPoint: { x: CA.x, y: CA.y }, offs: [], setFollowOffset(x, y) { this.offs.push([x, y]); } };
    const gr = { fillStyle() { return gr; }, fillRoundedRect() { return gr; }, fillRect() { return gr; }, fillCircle() { return gr; }, lineStyle() { return gr; }, strokeCircle() { return gr; }, generateTexture() {}, destroy() {} };
    return window.S = { camp: C, hud: {}, sp: {}, cameras: { main: cam }, textures: { exists: () => true }, make: { graphics: () => gr }, add: { image: (x, y, key) => { const o = __img(); o.key = key; made.push(o); return o; } }, made }; };
`);

console.log('A. the torpedo');
g.run(`
  window.__rec = () => { const R = { calls: [], style: null }, o = {}; ['lineStyle', 'strokeCircle', 'lineBetween', 'fillStyle', 'fillCircle', 'clear', 'setDepth', 'setBlendMode'].forEach(k => { o[k] = (...a) => { R.calls.push([k, ...a]); if (k === 'lineStyle') R.style = a; return o; }; }); R.g = o; return R; };
  window.__tscene = zoom => { const GR = [__rec(), __rec()]; let gi = 0; const scene = { camp: C, mode: 'pause', hud: {}, textures: { exists: () => true }, make: { graphics: () => ({ fillStyle() { return this; }, fillRect() { return this; }, fillTriangle() { return this; }, fillCircle() { return this; }, lineStyle() { return this; }, strokeRect() { return this; }, generateTexture() {}, destroy() {} }) },
    add: { graphics: () => GR[gi++].g, image: () => __img() }, cameras: { main: { zoom: zoom || 1 } }, tweens: { add() {} } }; scene.GR = GR; return window.TS = scene; };
  window.__torp = (fac, targetKind) => { __new(); window.TG = campSpawn(C, targetKind || 'freighter', CA.x + 400, CA.y); window.TG.team = targetKind === 'fighter' ? 'earth' : TG.team; C.torpedoes = [{ id: 'torp-1', x: CA.x + 100, y: CA.y, rot: 0, fac: fac || 'alien', target: TG.id, dead: false, r: 8 }]; };
`);
g.run(`__torp('alien'); __tscene(1); campTorpedoSync(TS, 16);`);
const c1 = J('TS.GR[0].calls'), dashes = c1.filter(c => c[0] === 'lineBetween');
const ringCalls = c1.filter(c => c[0] === 'strokeCircle');
check('the new look: the line to the target is dashed, 5 px on and 5 off on the screen (10 px a dash at zoom 1), starting at the torpedo and running toward the ship, at most 40 dashes', dashes.length > 5 && dashes.length <= 40 && near(dashes[0][1], J('C.torpedoes[0].x')) && near(dashes[0][3] - dashes[0][1], 5, 1e-9) && near(dashes[1][1] - dashes[0][1], 10, 1e-9) && dashes.every(d => near(d[2], d[4])), JSON.stringify(dashes.slice(0, 2)));
const styles = c1.filter(c => c[0] === 'lineStyle');
check('the dashes are 1.2 px wide, 0.7 strong, in the hostile pink (the ship look turns the aliens\' red to it); at zoom 0.5 the dashes are twice as long in the world, the same on the screen', styles.some(c => near(c[1], 1.2) && near(c[3], 0.7) && c[2] === 0xff6fa8) && (g.run(`__torp('alien'); __tscene(0.5); campTorpedoSync(TS, 16);`), near(J(`TS.GR[0].calls.filter(c => c[0] === 'lineBetween')[0][3] - TS.GR[0].calls.filter(c => c[0] === 'lineBetween')[0][1]`), 10, 1e-9)));
g.run(`__torp('alien'); __tscene(1); campTorpedoSync(TS, 16);`);
const tr = J('TS.GR[0].calls.filter(c => c[0] === "strokeCircle")'), tgx = J('TG.x');
const targetRing = tr.find(c => near(c[1], tgx));
check('the target has a ring: amber (the ship you protect: a freighter), 1.6 px wide, 0.9 strong, round the ship; and the torpedo keeps its own pulsing ring', !!targetRing && tr.length === 2 && J('TS.GR[0].calls.filter(c => c[0] === "lineStyle").some(c => c[2] === 0xffc857 && Math.abs(c[1] - 1.6) < 1e-9 && Math.abs(c[3] - 0.9) < 1e-9)'), JSON.stringify(tr));
check('its radius: 0.62 of the ship\'s drawn length, never under 16 px on the screen, 6 px outside it, swelling 2 px each 160 ms (pure: campTorpTargetR)', near(J('campTorpTargetR(40, 1, 0)'), 40 * 0.62 + 6) && near(J('campTorpTargetR(10, 1, 0)'), 16 + 6) && near(J('campTorpTargetR(40, 0.5, 1)'), 40 * 0.62 + 16 * 0 + 0 + (6 + 2) / 0.5 + 0, 20) && near(J('campTorpTargetR(10, 0.5, 0)'), 32 + 12) && J('campTorpTargetR(40, 1, 1)') > J('campTorpTargetR(40, 1, -1)'));
g.run(`__torp('alien', 'fighter'); __tscene(1); campTorpedoSync(TS, 16);`);
check('a torpedo for one of your own ships (a pilot\'s fighter, or the cruiser) rings it in your pale blue: amber means a ship you protect', J('TS.GR[0].calls.filter(c => c[0] === "lineStyle").some(c => c[2] === 0x6fd6ff && Math.abs(c[1] - 1.6) < 1e-9)') === true);
g.run(`CAMP.flags.shiplook = false; __torp('alien'); __tscene(1); campTorpedoSync(TS, 16);`);
const old = J('TS.GR[0].calls');
check('the look off: today\'s thin solid line (one line, 1.5 px, 0.3 strong, in the pirates\' and aliens\' own colours) and no ring on the target', old.filter(c => c[0] === 'lineBetween').length === 1 && old.filter(c => c[0] === 'strokeCircle').length === 1 && old.some(c => c[0] === 'lineStyle' && near(c[1], 1.5) && near(c[3], 0.3)));
g.run(`CAMP.flags.shiplook = true; window.matchMedia = q => ({ matches: /reduce/.test(q) }); __torp('alien'); __tscene(1); C.t = 1000 + 40; campTorpedoSync(TS, 16); window.R40 = TS.GR[0].calls.filter(c => c[0] === 'strokeCircle').find(c => c[1] === TG.x)[3]; C.t = 1000 + 80; campTorpedoSync(TS, 16); window.R80 = TS.GR[0].calls.filter(c => c[0] === 'strokeCircle').find(c => c[1] === TG.x)[3]; delete window.matchMedia;`);
check('with no motion wanted the target\'s ring does not swell (the same radius at any time)', J('R40') === J('R80'));

console.log('A2. a torpedo shot down');
g.run(`__new(); __scene(1); window.TB = { type: 'boom', x: CA.x + 300, y: CA.y, big: false, id: 'torp-1', kind: 'torpedo' }; window.RB = campMomentsKill(S, TB); window.KB = S.hud.mom.kills[0];`);
check('it is taken (the scene draws no other kill): a mint burst, not the ship kill: five shards in your mint, the ring mint and small (6 px to start), no white frame, and the view does not nudge', J('RB') === true && J('KB.shards.filter(o => o.vis).length') === 5 && J('KB.shards.filter(o => o.vis).every(o => o.tint === 0x7df0c0)') && J('KB.ring.tint === 0x7df0c0 && Math.abs(KB.ring.sx * 64 - 6) < 1e-9') && J('KB.flash.vis') === false && J('S.hud.mom.nudge') === null);
g.run(`C.t += 200; campMomentsFrame(S, 16);`);
check('200 ms in the ring has grown toward 28 px (most of it) and is fading; the shards are out 30 px at most', J('KB.ring.sx * 64') > 20 && J('KB.ring.sx * 64') <= 28 && J('KB.ring.a') < 0.8 && J('KB.shards.filter(o => o.vis).every(o => Math.hypot(o.x - KB.x, o.y - KB.y) <= 30 * 1.0001)'));
g.run(`C.t += 300; campMomentsFrame(S, 16);`);
check('it is over at 0.48 s: everything hidden, the record free again', J('S.made.every(o => !o.vis)') && J('S.hud.mom.kills.length') === 0);

console.log('B. the boost');
const EL = (W, H, dx, dy) => J(`JSON.parse(JSON.stringify(campFxEdgeLines(${W}, ${H}, ${dx}, ${dy})))`);
const h1 = EL(1280, 720, 1, 0), v1 = EL(1280, 720, 0, -1);
check('flying across the screen: two thin lines, the top and the bottom edge, each the width of the screen inside the 20 px inset and 18 px from the border', h1.length === 2 && h1[0].y0 === 18 && h1[0].y1 === 18 && h1[1].y0 === 702 && h1[0].x0 === 20 && h1[0].x1 === 1260 && h1[1].x1 === 1260, JSON.stringify(h1));
check('flying up the screen: the left and the right edge instead, each the height of the screen inside the inset', v1[0].x0 === 18 && v1[0].x1 === 18 && v1[1].x0 === 1262 && v1[0].y0 === 20 && v1[0].y1 === 700, JSON.stringify(v1));
check('the lines are the pale blue of the cruiser\'s glow, 2 px, 0.35 at full strength, and the draw asks for them inside the streaks\' own condition (they come and go with the streaks); the list is written again, not made again', J('CAMPFX.edge.color') === 0x6fd6ff && J('CAMPFX.edge.w') === 2 && J('CAMPFX.edge.a') === 0.35 && /campFxEdgeLines\(W2, H2, u\.vx \/ sp, u\.vy \/ sp\)\.forEach\(l => \{ st\.lineStyle\(K\.edge\.w, K\.edge\.color, K\.edge\.a \* F\.k\)/.test(src('src/campfeelfx.js')) && J('campFxEdgeLines(1280, 720, 1, 0) === campFxEdgeLines(1280, 720, 0, 1)'));
check('the ribbon is wider on the boost: at full boost and full thrust 0.065 of the ship\'s length (it was 0.045)', near(J('(() => { const R = campFeelRibbonNew(2); campFeelRibbonPush(R, 0, 0, 0, 1000, 1, 1, 300, 100); return R.rib[0][0].w / 100; })()'), 0.02 + 0.015 + 1.5 * 0.02, 1e-9));
check('how low the store is: nothing above 30 percent, half way under it at 15, full at 0; and none when not boosting', J('campFeelDashLo(0.5, 1)') === 0 && J('campFeelDashLo(0.3, 1)') === 0 && near(J('campFeelDashLo(0.15, 1)'), 0.5) && J('campFeelDashLo(0, 1)') === 1 && J('campFeelDashLo(0, 0)') === 0);
check('the gaps: fixed in time, 80 ms a period; at lo 1 the first 70 percent of each period is a gap, at lo 0.5 the first 35 percent, at lo 0 none', J('campFeelDashGap(1000 + 10, 1)') === true && J('campFeelDashGap(1000 + 60, 1)') === true && J('campFeelDashGap(1000 + 60, 1)') === (J('(1000 + 60) % 80') / 80 < 0.7) && J('campFeelDashGap(1000 + 10, 0)') === false && J('campFeelDashGap(1000 + 10, 0.5)') === (J('(1000 + 10) % 80') / 80 < 0.35));
g.run(`window.__rib = lo => { const R = campFeelRibbonNew(1); for (let i = 0; i < 40; i++) campFeelRibbonPush(R, 0, i * 5, 0, 1000 + i * 16, 1, 1, 300, 100, lo); return campFeelRibbonSegs(R.rib[0], 1000 + 40 * 16, 1).length; };`);
check('the ribbon breaks into dashes: with the store full all its segments are drawn, with it empty a good share of them are left out, and with it half way low fewer are left out than empty', J('__rib(0)') > 25 && J('__rib(1)') < J('__rib(0)') * 0.6 && J('__rib(0.5)') > J('__rib(1)') && J('__rib(0.5)') < J('__rib(0)'), J('[__rib(0), __rib(0.5), __rib(1)].join()'));
check('the drawing asks the boost\'s store (campBoostStatus: the ship he flies) and passes it to the ribbon; nothing of the boost is written', /campFeelDashLo\(typeof campBoostStatus === 'function' \? campBoostStatus\(C\)\.frac : 1, f\.boost\)/.test(src('src/campfeel.js')) && /campFeelRibbonPush\(R, i, p\.x, p\.y, t, f\.th, f\.boost, speed, dw, lo\)/.test(src('src/campfeel.js')));

console.log('C. the end of a mission');
const F = (last, result, why, car, earth) => J(`campMomentsFocus(${JSON.stringify(last)}, '${result}', '${why}', 5000, ${JSON.stringify(car)}, ${JSON.stringify(earth)})`);
const car = { x: 10, y: 20 };
check('a win: the last arrival of a ship you escort, or the last kill, if it came in the last 12 s; the later of the two', JSON.stringify(F({ kill: { x: 1, y: 2, t: 4000 }, arrive: { x: 3, y: 4, t: 4500 } }, 'won', 'deliver', car, null)) === '{"x":3,"y":4}' && JSON.stringify(F({ kill: { x: 1, y: 2, t: 4800 }, arrive: { x: 3, y: 4, t: 4500 } }, 'won', 'towers', car, null)) === '{"x":1,"y":2}');
check('a win with nothing that came lately (a relic held, a cache taken): the cruiser; one 13 s ago is not "what decided it"', JSON.stringify(F({ kill: { x: 1, y: 2, t: -8100 } }, 'won', 'relic', car, null)) === '{"x":10,"y":20}' && JSON.stringify(F({}, 'won', 'relic', car, null)) === '{"x":10,"y":20}' && JSON.stringify(F(null, 'won', 'relic', car, null)) === '{"x":10,"y":20}');
check('a loss: the cruiser; of the convoy the last ship of yours that went (else the cruiser); of the base or Earth the place', JSON.stringify(F({ lost: { x: 7, y: 8, t: 4900 } }, 'lost', 'carrier', car, null)) === '{"x":10,"y":20}' && JSON.stringify(F({ lost: { x: 7, y: 8, t: 4900 } }, 'lost', 'convoy', car, null)) === '{"x":7,"y":8}' && JSON.stringify(F({}, 'lost', 'convoy', car, null)) === '{"x":10,"y":20}' && JSON.stringify(F({}, 'lost', 'base', car, { x: 500, y: -300 })) === '{"x":500,"y":-300}' && JSON.stringify(F({}, 'lost', 'earth', car, null)) === '{"x":10,"y":20}');
check('nothing known (no cruiser): no focus, and no beat', F({}, 'won', 'x', null, null) === null);
const B = (r, res, still) => J(`JSON.parse(JSON.stringify(campMomentsBeatAt(${r}, '${res}', ${!!still})))`);
check('the beat\'s shape: a third of the speed for 0.8 s (267 ms of the effects\' clock in the 800 real ms), then it holds; the view\'s share eases out (more than half in the first third)', near(B(0, 'won').T, 0) && near(B(300, 'won').T, 100) && near(B(800, 'won').T, 800 / 3) && near(B(2000, 'won').T, 800 / 3) && B(267, 'won').ease > 0.5 && near(B(800, 'won').ease, 1) && B(0, 'won').ease === 0);
check('a win\'s gold ring opens from 22 to 82 px and fades out; a loss\'s pink ring closes from 82 to 22 and fades in the last quarter', near(B(0, 'won').ring.r, 22) && near(B(800, 'won').ring.r, 82) && near(B(0, 'won').ring.a, 1) && near(B(800, 'won').ring.a, 0) && near(B(0, 'lost').ring.r, 82) && near(B(800, 'lost').ring.r, 22) && B(400, 'lost').ring.a > 0.9 && near(B(800, 'lost').ring.a, 0));
check('with no motion wanted: no slow clock, no ease, a still ring at half its size that only fades', B(400, 'won', true).T === 0 && B(400, 'won', true).ease === 0 && near(B(400, 'won', true).ring.r, 41) && near(B(400, 'lost', true).ring.r, 41) && B(400, 'won', true).ring.a < 0.9 * 0.6);

g.run(`__new(); __scene(1); window.F0 = [C.t, C.score, C.kills, C.lostShips, C.lost, C.delivered, C.result, JSON.stringify(C.carrier.hp)].join(); window.CT = C.t;
  campMomentsNote(S, { type: 'boom', team: 'alien', x: CA.x + 700, y: CA.y - 100, id: 'raider-1', kind: 'raider' });
  campMomentsNote(S, { type: 'boom', team: 'earth', x: CA.x + 50, y: CA.y, id: 'fighter-1', kind: 'fighter' });
  campMomentsNote(S, { type: 'boom', x: 1, y: 1, kind: 'torpedo' });
  campMomentsNote(S, { type: 'end', result: 'won', why: 'wave' });`);
check('the notes: a hostile\'s end is the last kill, one of yours the last loss, a torpedo\'s neither; the end of the mission starts the beat on the last kill (the mothership, the last tower, the last raider)', J('S.momLast.kill.x') === J('CA.x + 700') && J('S.momLast.lost.x') === J('CA.x + 50') && J('S.beat') && J('S.beat.result') === 'won' && J('S.beat.x') === J('CA.x + 700') && J('S.beat.y') === J('CA.y - 100') && J('S.beat.real') === 0);
check('a second end event does not start it again, and an event of another sort starts nothing', (g.run(`window.B0 = S.beat; campMomentsNote(S, { type: 'end', result: 'lost', why: 'carrier' }); campMomentsNote(S, { type: 'hit' });`), J('S.beat === B0') === true));
g.run(`campMomentsFrame(S, 100); campMomentsFrame(S, 100); campMomentsFrame(S, 100);`);
const ring3 = J('({ x: S.hud.mom.beatRing.x, y: S.hud.mom.beatRing.y, tint: S.hud.mom.beatRing.tint, vis: S.hud.mom.beatRing.vis, a: S.hud.mom.beatRing.a, sx: S.hud.mom.beatRing.sx })');
check('300 ms in: the effects\' clock is at 100 ms (a third), the gold ring is up on what decided it, between 22 and 82 px, and fading', J('campMomentsNow(S) - C.t') > 99.99 && J('campMomentsNow(S) - C.t') < 100.01 && ring3.vis && ring3.tint === 0xe9b872 && ring3.x === J('CA.x + 700') && ring3.sx * 64 > 22 && ring3.sx * 64 < 82 && ring3.a > 0.5 && ring3.a < 0.7, JSON.stringify(ring3));
g.run(`campMomentsFrame(S, 100); campMomentsFrame(S, 100); campMomentsFrame(S, 100); campMomentsFrame(S, 100); campMomentsFrame(S, 100);`);
const off = J('({ x: S.cameras.main.offs[S.cameras.main.offs.length - 1][0], y: S.cameras.main.offs[S.cameras.main.offs.length - 1][1] })');
check('at the end of the beat the view is on what decided it: the follow offset is minus the way from the ship he flies to it (the camera aims at the ship minus the offset); the ring is gone; the clock holds at 267 ms', near(off.x, -(J('CA.x + 700') - J('CA.x'))) && near(off.y, -(J('CA.y - 100') - J('CA.y'))) && J('S.hud.mom.beatRing.vis') === false && near(J('campMomentsNow(S) - C.t'), 800 / 3, 1e-6), JSON.stringify(off));
check('the sim is not touched: its clock, score, counts, result and the cruiser\'s hull are what they were, and nothing steps it; the beat lives on the scene', J('[C.t, C.score, C.kills, C.lostShips, C.lost, C.delivered, C.result, JSON.stringify(C.carrier.hp)].join()') === J('F0') && J('C.t') === J('CT'));
g.run(`__new(); __scene(1); window.AK = campSpawn(C, 'raider', CA.x + 500, CA.y); AK.hp = 1; campHurt(C, AK, 5, CA.id); campMomentsKill(S, C.events.filter(e => e.type === 'boom')[0]); window.KR = S.hud.mom.kills[0]; campMomentsNote(S, { type: 'end', result: 'won', why: 'wave' }); campMomentsFrame(S, 100); campMomentsFrame(S, 100); campMomentsFrame(S, 100);`);
check('the effects play on the slowed clock: a kill a moment before the end, 300 real ms into the beat, is 100 ms old (its ring at the size of 100 ms, not of 300), and the white frame (40 ms) is over', Math.abs(J('KR.ring.sx * 64') - J('campMomentsKillAt(100, 1).ring.r')) < 1e-6 && J('KR.flash.vis') === false);
g.run(`__new(); __scene(1); campMomentsNote(S, { type: 'boom', team: 'earth', x: CA.x + 80, y: CA.y, kind: 'freighter', id: 'f-1' }); campMomentsNote(S, { type: 'end', result: 'lost', why: 'convoy' }); campMomentsFrame(S, 16); window.RL = { tint: S.hud.mom.beatRing.tint, r: S.hud.mom.beatRing.sx * 64, x: S.beat.x };`);
check('a loss: a pink ring that closes (it starts at 82 px) on the last ship of yours that went', J('RL.tint') === 0xff6fa8 && J('RL.r') > 78 && J('RL.x') === J('CA.x + 80'));
g.run(`window.matchMedia = q => ({ matches: /reduce/.test(q) }); __new(); __scene(1); campMomentsNote(S, { type: 'boom', team: 'alien', x: CA.x + 700, y: CA.y, id: 'r-1', kind: 'raider' }); campMomentsNote(S, { type: 'end', result: 'won', why: 'wave' }); campMomentsFrame(S, 400); window.OS = S.cameras.main.offs.length; window.TS0 = campMomentsNow(S) - C.t; delete window.matchMedia;`);
check('reduced motion: nothing runs slow, the view does not move (no offset is written), the ring is still and fades', J('TS0') === 0 && J('OS') === 0 && J('S.hud.mom.beatRing.vis') === true && near(J('S.hud.mom.beatRing.sx * 64'), 41));
g.run(`__new(); __scene(1); campMomentsNote(S, { type: 'end', result: 'won', why: 'wave' }); campMomentsReset(S);`);
check('a battle that starts again has no beat and no notes (the scene is the same object)', J('S.beat') === null && J('S.momLast') === null);
g.run(`CAMP.flags.shiplook = false; __new(); __scene(1); campMomentsNote(S, { type: 'end', result: 'won', why: 'wave' }); CAMP.flags.shiplook = true;`);
check('the new ship look off: no beat (the picture is as it was)', J('S.beat === undefined || S.beat === null') === true);

console.log('D. the rules');
const mj = src('src/campmoments.js'), code = mj.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('this file never steps the sim: no campStep, no campTick, no write to its clock, score, counts or result', !/campStep|campTick|C\.t\s*[-+]?=[^=]|C\.score\s*=|C\.result\s*=|C\.kills\s*[-+]?=|campEnd\(/.test(code));
check('no image file, no web request, no library, no tween or timer of Phaser: the beat is the frame\'s own clock', !/new Image|fetch\(|XMLHttpRequest|\.png|\.jpg|tweens\.add|delayedCall|time\.addEvent|createEmitter|add\.particles/.test(code));
const sc = src('src/campaignscene.js');
check('the scene asks in two places: the note at the top of the events (before every other branch), and the frame with the real ms; the card comes when it came (1800 ms for a win, 1200 for a loss: not changed)', sc.indexOf('campMomentsNote(this, e)') > sc.indexOf('chatterHear(this, e)') && sc.indexOf('campMomentsNote(this, e)') < sc.indexOf("if (e.type === 'say')") && /campMomentsFrame\(this, dt\)/.test(sc) && /delayedCall\(1800, \(\) => this\.missionWon\(\)\)/.test(sc) && /delayedCall\(1200, \(\) => this\.showLost\(e\.why\)\)/.test(sc));
const tj = src('src/camptorpedoscene.js'), tcode = tj.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, '');
check('the torpedo\'s picture: dashed and ringed only with the new look on; the sim\'s torpedoes are only read', /if \(look\) \{/.test(tj) && !/C\.torpedoes\s*=|\.hp\s*[-+]?=[^=]|t\.target\s*=[^=]/.test(tcode));

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
