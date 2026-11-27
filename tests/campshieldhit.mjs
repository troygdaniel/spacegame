// smoke: the new world look's shield hit: the sim's shieldhit event has the angle the hit came from (one field, nothing else of the sim changes), and the scene draws a short pale-blue arc on that side of the cruiser with a small white ring at the point, from a pool, for a short time, only while the world look is on (plain Node, no Chrome)
// Card space-game-world-w5-shield-hit (piece W5 of the report on card space-game-world-look-scope; mock docs/world-look-mock.html, direction 1). The rule is src/campaign.js campHurt / campHitAngle; the drawing is src/campshieldhit.js; the scene calls it from its 'shieldhit' and 'hit' events and once a frame.
//   A  the sim: the angle on the event from a shot, a torpedo, a shooter, none; nothing else of the sim changes
//   B  the pool and the effect: the arc round the angle, the ring at the point, the colours, the fade, the life, the size in screen px, the cruiser's drawn length
//   C  the spark: left out when the shield took all of it and the arc is up; a hit that got through keeps it
//   D  the switch and the rules: the world look off draws nothing new; no Phaser arc, no image, no web, the Long Haul's painters untouched
// Run: node tests/campshieldhit.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e, A0 = 0.6;

g.run(`
  window.__new = () => { const C = window.C = campNew(1, [], { seed: 5, mission: 0 }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); C.t = 1000; C.events.length = 0; window.CA = C.carrier; return C; };
  window.__ev = type => C.events.filter(e => e.type === type);
`);

console.log('A. the sim: the angle on the event');
g.run(`__new(); C.shield = 100; window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y - 300); campHurt(C, CA, 5, AL.id);`);
const e1 = J(`__ev('shieldhit')[0]`);
check('a hit with a shooter: the shieldhit event has the angle (radians, the bearing from the cruiser to the shooter: 0 east, y down): up and to the right is -45 degrees', e1 && near(e1.a, -Math.PI / 4) && Object.keys(e1).sort().join() === 'a,type,x,y', JSON.stringify(e1));
g.run(`__new(); C.shield = 100; window.AL = campSpawn(C, 'raider', CA.x + 3000, CA.y + 3000); AL.hp = 100; C.bullets.push({ team: 'alien', x: CA.x + 22, y: CA.y - 22, vx: -300, vy: 300, life: 1000, dmg: 5, from: AL.id }); campBullets(C, 1 / 30);`);
const e2 = J(`__ev('shieldhit')[0]`);
check('a shot: the angle is the way the shot CAME from (the opposite of its velocity), not the shooter\'s bearing (the shooter is far away to the south-east here and the shot comes from the north-east)', e2 && near(e2.a, -Math.PI / 4), JSON.stringify(e2));
g.run(`__new(); C.shield = 100; window.TB = { id: 'torp-x', from: 'nobody', x: CA.x - 40, y: CA.y, dmg: 20, vx: 0, vy: 0, life: 1000 }; campTorpedoBoom(C, TB, CA);`);
const e3 = J(`__ev('shieldhit')[0]`);
check('a torpedo: the angle is toward the torpedo (it is to the west: 180 degrees)', e3 && near(Math.abs(e3.a), Math.PI), JSON.stringify(e3));
g.run(`__new(); C.shield = 100; campHurt(C, CA, 5);`);
const e4 = J(`__ev('shieldhit')[0]`);
check('a hit with no shooter and no direction: the event has no angle (the scene then draws no arc), and is otherwise as it was', e4 && e4.a === undefined && e4.type === 'shieldhit' && typeof e4.x === 'number', JSON.stringify(e4));
g.run(`__new(); C.shield = 0; window.AL = campSpawn(C, 'raider', CA.x + 300, CA.y); campHurt(C, CA, 5, AL.id);`);
check('no shield, no shieldhit: the hull takes it as before (a hit event, no new event type)', J(`__ev('shieldhit').length`) === 0 && J(`__ev('hit').length`) === 1);
g.run(`window.__fight = ang => { const C = window.C = campNew(1, [], { seed: 7, mission: 0 }); C.shield = 50; const car = C.carrier; const al = campSpawn(C, 'raider', car.x + 200, car.y); for (let i = 0; i < 6; i++) campHurt(C, car, 12, al.id, ang); return { shield: C.shield, hp: car.hp, hurtAt: car.hurtAt, shieldHitAt: C.shieldHitAt, hits: C.events.filter(e => e.type === 'hit').length }; };`);
check('nothing of the sim depends on the angle: the same hits with and without it leave the shield, the hull and the clocks the same', JSON.stringify(J('__fight(undefined)')) === JSON.stringify(J('__fight(1.234)')));
check('and the sim file stays a rule file: it knows no scene, no Phaser and no switch of the world look (campHitAngle is plain arithmetic on the ships)', !/campWorldOn|campShieldHit|Phaser|scene\./.test(src('src/campaign.js').split('\n').filter(l => /campHitAngle|shieldhit/.test(l)).join('\n')));

console.log('B. the pool and the effect');
g.run(`
  window.__rec = () => { const R = { strokes: [], clears: 0, style: { w: 0, c: 0, a: 0 } }, o = { active: true, scene: {} };
    o.clear = () => { R.clears++; R.strokes.length = 0; return o; }; o.lineStyle = (w, c, a) => { R.style = { w, c, a }; return o; }; o.setDepth = d => { R.depth = d; return o; };
    o.strokePoints = (pts, close) => { R.strokes.push({ w: R.style.w, c: R.style.c, a: R.style.a, close: !!close, pts: pts.map(p => [p.x, p.y]) }); return o; };
    R.g = o; return R; };
  window.__scene = z => { const R = window.REC = __rec(); return window.S = { camp: C, time: { now: 5000 }, cameras: { main: { zoom: z || 1 } }, sp: {}, add: { made: 0, graphics() { this.made++; return R.g; } } }; };
  __new(); CAMP.flags.worldlook = true; __scene(1);
`);
check('the world look off: the event is not taken (no pool), nothing is drawn, the spark stays; a hit with no angle is not taken either', (g.run(`CAMP.flags.worldlook = false;`), J(`campShieldHitEvent(S, { type: 'shieldhit', x: 0, y: 0, a: 0.5 })`) === false && J('S.shieldPool') === null && J('campShieldHitPaint(S, 5000)') === 0 && J('REC.strokes.length') === 0) && (g.run(`CAMP.flags.worldlook = true;`), J(`campShieldHitEvent(S, { type: 'shieldhit', x: 0, y: 0 })`) === false && J('S.shieldPool') === null));
g.run(`window.A0 = 0.6; window.T0 = campShieldHitEvent(S, { type: 'shieldhit', x: CA.x, y: CA.y, a: A0 }); S.time.now = 5000; campShieldHitPaint(S, 5100);`);
const st = J('REC.strokes'), R0 = 58 * 0.78;
check('the world look on: the event is taken (the arc is the picture), and one arc and one ring are drawn: the arc open, the ring closed, in the player\'s pale blue and white', J('T0') === true && st.length === 2 && st[0].close === false && st[1].close === true && st[0].c === 0x6fd6ff && st[1].c === 0xffffff, JSON.stringify(st.map(s => [s.c, s.close, s.w, s.a])));
const d = (p, c) => Math.hypot(p[0] - c.x, p[1] - c.y), ctr = J('({ x: CA.x, y: CA.y })');
check('the arc is round the cruiser at 0.78 of its length (58 px: 45.2), from 0.7 rad before the angle to 0.7 rad after it (80 degrees in all), every corner at that distance', st[0].pts.every(p => near(d(p, ctr), R0, 1e-6)) && near(Math.atan2(st[0].pts[0][1] - ctr.y, st[0].pts[0][0] - ctr.x), A0 - 0.7, 1e-9) && near(Math.atan2(st[0].pts.at(-1)[1] - ctr.y, st[0].pts.at(-1)[0] - ctr.x), A0 + 0.7, 1e-9) && st[0].pts.length >= 4);
const ringC = st[1].pts.reduce((a, p) => [a[0] + p[0] / st[1].pts.length, a[1] + p[1] / st[1].pts.length], [0, 0]);
check('the small white ring is at the point on the arc the angle names (45.2 px from the cruiser along it), 5 px in radius', near(ringC[0], ctr.x + Math.cos(A0) * R0, 1e-6) && near(ringC[1], ctr.y + Math.sin(A0) * R0, 1e-6) && near(Math.hypot(st[1].pts[0][0] - ringC[0], st[1].pts[0][1] - ringC[1]), 5, 1e-6));
check('it fades over its life: 100 ms into 260 it has 0.85 x (1 - 100/260) of its strength, the arc 2 px wide and the ring 1.4 px', near(st[0].a, 0.85 * (1 - 100 / 260), 1e-9) && near(st[0].w, 2) && near(st[1].w, 1.4) && st[1].a <= 1);
g.run(`__scene(0.5); S.time.now = 5000; campShieldHitEvent(S, { a: 0.6 }); campShieldHitPaint(S, 5000);`);
const sz = J('REC.strokes'), ringC2 = sz[1].pts.reduce((a, p) => [a[0] + p[0] / sz[1].pts.length, a[1] + p[1] / sz[1].pts.length], [0, 0]);
check('at half the zoom the line and the ring are the same size on the SCREEN: the line is 4 world px (2 on the screen), the ring\'s line 2.8 and its radius 10 (5 on the screen); the arc is as long as the ship is drawn in the world (45.2)', near(sz[0].w, 4) && near(sz[1].w, 2.8) && near(Math.hypot(sz[1].pts[0][0] - ringC2[0], sz[1].pts[0][1] - ringC2[1]), 10, 1e-6) && sz[0].pts.every(p => near(d(p, ctr), 58 * 0.78, 1e-6)));
g.run(`__scene(1); S.sp[CA.id] = { displayWidth: 100, displayHeight: 40 }; S.time.now = 5000; campShieldHitEvent(S, { a: 0 }); campShieldHitPaint(S, 5000);`);
check('the cruiser\'s drawn length is the ship look\'s (a far view that holds it up to its least size has a bigger arc): a sprite 100 long has an arc of 78', J('REC.strokes[0].pts').every(p => near(d(p, ctr), 78, 1e-6)));
g.run(`__scene(1); S.time.now = 6000; campShieldHitEvent(S, { a: 0 }); campShieldHitPaint(S, 6100); window.__c0 = REC.clears; campShieldHitPaint(S, 6000 + 260); window.__c1 = REC.clears; window.__n1 = REC.strokes.length; campShieldHitPaint(S, 6400); campShieldHitPaint(S, 6500);`);
check('after its life (260 ms) it is gone: the layer is cleared once and then not touched again while nothing is up', J('__n1') === 0 && J('__c1') === J('__c0') + 1 && J('REC.clears') === J('__c1') && J('S.shieldPool.every(o => !o.on)'));
g.run(`__scene(1); for (let i = 0; i < 9; i++) { S.time.now = 7000 + i; campShieldHitEvent(S, { a: i * 0.1 }); }`);
check('the pool has six records (CAMPSHIELD.pool): nine hits in a row reuse the oldest, so there are never more than six, and the newest ones are the ones kept', J('S.shieldPool.length') === 6 && J('S.shieldPool.filter(o => o.on).length') === 6 && J('Math.min(...S.shieldPool.map(o => o.t0))') === 7003 && J('campShieldHitPaint(S, 7010)') === 6 && J('REC.strokes.length') === 12);
g.run(`__scene(1); S.time.now = 8000; campShieldHitEvent(S, { a: 1 }); campShieldHitPaint(S, 8010); window.G1 = S.shieldG; S.shieldG.active = false; S.shieldG.scene = null; campShieldHitPaint(S, 8020);`);
check('the layer is made once, when the first arc is drawn (depth 9, above the ships); a scene that starts again (its layer destroyed: not active, no scene) makes a new one', J('S.add.made') === 2 && J('REC.depth') === 9);

console.log('C. the spark');
g.run(`__scene(1); S.time.now = 9000; campShieldHitEvent(S, { a: 1 });`);
check('the hit that follows a shield hit which the shield took whole: its spark is left out (the arc is the picture), once', J(`campShieldHitSkip(S, { type: 'hit', id: CA.id, hull: false })`) === true && J(`campShieldHitSkip(S, { type: 'hit', id: CA.id, hull: false })`) === false);
g.run(`S.time.now = 9100; campShieldHitEvent(S, { a: 1 });`);
check('one that got through to the hull keeps its spark (and the scene its red flash and sound); one of another ship, or with no shield hit before it, keeps it too', J(`campShieldHitSkip(S, { type: 'hit', id: CA.id, hull: true })`) === false && (g.run(`campShieldHitEvent(S, { a: 1 });`), J(`campShieldHitSkip(S, { type: 'hit', id: 'fighter-9', hull: false })`) === false) && J(`campShieldHitSkip(S, { type: 'hit', id: CA.id, hull: false })`) === false);
g.run(`CAMP.flags.worldlook = false; __scene(1); campShieldHitEvent(S, { a: 1 });`);
check('the world look off: nothing is skipped (the spark is as it was)', J(`campShieldHitSkip(S, { type: 'hit', id: CA.id, hull: false })`) === false);
g.run(`CAMP.flags.worldlook = true;`);

console.log('D. the rules');
const sh = src('src/campshieldhit.js'), code = sh.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n').replace(/\/\/.*$/gm, ''), sc = src('src/campaignscene.js');
check('polygon circles and plain strokes, no Phaser arc, no image, no libraries, no web request; the world look\'s switch is the one switch', /campRing\(/.test(code) && /strokePoints\(/.test(code) && !/\.arc\(|strokeCircle|fillCircle|fetch\(|XMLHttpRequest|<img|data:image|new Image|\.load\./.test(code) && /campWorldOn\(\)/.test(code));
check('the scene asks: from the shieldhit event (shake and sound stay), the hit event (the spark when not skipped, the red flash and the hull sound as they were) and once a frame after the sprites and the health numbers are in place', /battleSound\('shield', 'shieldHit'\); if \(typeof campShieldHitEvent === 'function'\) campShieldHitEvent\(this, e\);/.test(sc) && /this\.flash\(e\.id\); if \(e\.hull\) this\.battleSound\('hull', 'hullHit'\); \} if \(!\(typeof campShieldHitSkip === 'function' && campShieldHitSkip\(this, e\)\) && !\(typeof campMomentsHit === 'function' && campMomentsHit\(this, e\)\)\) this\.boom\.explode\(3, e\.x, e\.y\)/.test(sc) && /campShieldHitPaint\(this, this\.time\.now\)/.test(sc) && sc.indexOf('campShieldHitPaint(this') > sc.indexOf('campChargeSync(this'));
check('the Long Haul\'s painters are not touched by this piece (src/art_world.js, src/stationart.js, src/boot.js are not mentioned in the new file; fxBoom is still the scene\'s spark)', !/art_world|stationart|fxBoom|boot\.js/.test(sh.replace(/^\/\/.*$/gm, '').split('\n').filter(l => !/^\/\//.test(l)).join('\n')) && /this\.boom\.explode\(3, e\.x, e\.y\)/.test(sc));
check('the script is in the page after the switch\'s', src('index.html').indexOf('src/campshieldhit.js') > src('index.html').indexOf('src/campworldlook.js') && (src('index.html').match(/campshieldhit\.js/g) || []).length === 1);
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nSHIELD HIT FAIL: ${failed} of ${n} checks failed` : `\nSHIELD HIT PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
