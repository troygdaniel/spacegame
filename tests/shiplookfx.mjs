// smoke: the new ship look's fire, missile, engine trails and kill effect (src/shiplookfx.js): hostile fire pink, one trail a moving ship, a pooled kill, the amber fixes, and nothing at all with the switch off (plain Node, a stand-in scene)
// Card space-game-ship-look-c-fire-trails (landing C of the new ship look; Troy's calls of 25 Nov 2026: the percent number stays, every hostile mark turns pink, the gun reach ring and mount dots go to the blue, the pirate torpedo ring goes pink,
// the new kill is for ship kills and missile blasts only). The table is src/shiplook.js, the mock docs/ship-look-mock.html (direction 1) is the authority for the shapes.
//   A  shots: the key a shot takes (own mint, hostile pink whoever fires it, neutral grey-blue), the baked bolts, nothing with the switch off
//   B  engine trails: the rule (a ship that moves has one, its place, length, colour), the frame (one sprite a moving ship, hidden when it stops, gone with the ship, none with the switch off, nothing under the map)
//   C  the missile: a dart and a tail in place of the rectangle, the flame and the smoke; one sprite pair, destroyed by the scene's own clean-up
//   D  the kill: the animation, the size at the start zoom and for a big kill and a blast, the pool (made once, reused, capped), the events that keep their puffs
//   E  the amber fixes: the reach ring, the mounts and the muzzle flash blue, the pirates' and aliens' torpedoes pink; unchanged with the switch off
//   F  the switch off changes nothing; the scene's calls, the files (pure rules, no web, no image); nobody else's lines
// Run: node tests/shiplookfx.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const code = f => src(f).replace(/\/\/[^\n]*/g, '');

g.run(`
  window.__new = (mission, s) => { const C = campNew(1, [], { seed: 5, god: true, mission }); C.arrivedAt = 0; for (let i = 0; i < (s || 8) * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; window.C = C; return C; };
  // a stand-in scene: images that remember what they were told (position, rotation, scale, alpha, texture, visibility, origin, depth, size, blend), graphics that record their fill colours, textures that exist once baked; NO tweens and no particles
  // (calling either is an error: the new look does not use them), a camera with a zoom, and the ships' sprites with a drawn length
  window.__scene = (zoom, extra) => {
    const ims = [], baked = {}, tex = {}, o = { ims, baked, tex, camp: C, mode: 'play', hud: {}, sp: {}, msp: {}, cameras: { main: { zoom, scrollX: 0, scrollY: 0 } }, events: { on() {}, once() {}, off() {} } };
    const mkIm = (x, y, key) => { const im = { x, y, key, rot: 0, sx: 1, sy: 1, a: 1, vis: true, dead: false, ox: 0.5, oy: 0.5, depth: 0, dw: 0, dh: 0, blend: '', sets: 0 };
      im.setPosition = (a, b) => { im.x = a; im.y = b; return im; }; im.setRotation = r => { im.rot = r; return im; }; im.setScale = (a, b) => { im.sx = a; im.sy = b === undefined ? a : b; return im; }; im.setAlpha = v => { im.a = v; return im; };
      im.setVisible = v => { im.vis = v; return im; }; im.setOrigin = (a, b) => { im.ox = a; im.oy = b === undefined ? a : b; return im; }; im.setDepth = d => { im.depth = d; return im; }; im.setDisplaySize = (w, h) => { im.dw = w; im.dh = h; return im; };
      im.setTexture = k => { im.key = k; im.sets++; return im; }; im.setBlendMode = b => { im.blend = b; return im; }; im.destroy = () => { im.dead = true; return im; }; ims.push(im); return im; };
    o.add = { image: mkIm, graphics: () => { throw new Error('no graphics here'); } };
    o.make = { graphics: () => { const gr = { fills: [], strokes: [], calls: 0 }; ['fillRect', 'fillCircle', 'fillTriangle', 'fillRoundedRect', 'strokeCircle'].forEach(k => { gr[k] = () => { gr.calls++; return gr; }; });
      gr.fillStyle = (c, a) => { gr.fills.push([c, a]); return gr; }; gr.lineStyle = (w, c, a) => { gr.strokes.push([w, c, a]); return gr; }; gr.generateTexture = (key, w, h) => { tex[key] = { w, h }; baked[key] = { fills: gr.fills, strokes: gr.strokes, w, h }; return gr; }; gr.destroy = () => gr; return gr; } };
    o.textures = { exists: k => !!tex[k] }; o.tweens = { add() { throw new Error('no tweens: the new look has none'); } };
    return Object.assign(o, extra || {});
  };
  window.__dot = (u, sp) => { sp = sp || {}; const o = { displayWidth: 40, visible: true }; return Object.assign(o, sp); };
  window.__live = S => S.ims.filter(i => !i.dead && i.vis).length;
`);

console.log('A. shots');
{
  g.run('__new(1); CAMP.flags.shiplook = false; location = { search: "" };');
  const B = { earth: { team: 'earth' }, neutral: { team: 'neutral' }, pirate: { team: 'alien', fac: 'pirate' }, alien: { team: 'alien', fac: 'alien' }, bare: { team: 'alien' } };
  check('the switch is off: a shot has no new key (the scene keeps its own picture)', Object.values(B).every(b => J(`slookShotKey(${JSON.stringify(b)})`) === null));
  g.run('CAMP.flags.shiplook = true;');
  const key = b => J(`slookShotKey(${JSON.stringify(b)})`);
  check('on: your fire is mint (the Earth side, the cruiser\'s turrets and the pilots)', key(B.earth) === 'slook-shot-own');
  check('hostile fire is pink whoever fires it: the pirates\' shot (it was amber) and the aliens\' (it was red) take the same key; amber is only a ship you protect', key(B.pirate) === 'slook-shot-foe' && key(B.alien) === 'slook-shot-foe' && key(B.bare) === 'slook-shot-foe');
  check('a neutral patrol\'s fire is its own grey-blue', key(B.neutral) === 'slook-shot-neutral');
  check('every shot of the sim has one of the three keys, none is left on an old picture (shot-pirate, shot-earth, shot-neutral, ebullet)', J(`['earth','neutral','alien'].every(t => ['pirate', 'alien', undefined].every(f => ['slook-shot-own','slook-shot-foe','slook-shot-neutral'].indexOf(slookShotKey({ team: t, fac: f })) >= 0))`));
  g.run('window.S = __scene(1); slookFxTextures(S);');
  const bk = J('S.baked'), col = J('({ own: slookInt(SLOOK.C.own), foe: slookInt(SLOOK.C.foe), neu: slookInt(SLOOK.C.neutral) })');
  check('the three bolts are baked once, 38 by 8, the colour of their side: mint, pink, grey-blue (the glow and the tail), a white core in each', ['slook-shot-own', 'slook-shot-foe', 'slook-shot-neutral'].every(k => bk[k] && bk[k].w === 38 && bk[k].h === 8 && bk[k].fills.some(f => f[0] === 0xffffff && f[1] === 1))
    && bk['slook-shot-own'].fills.some(f => f[0] === col.own) && bk['slook-shot-foe'].fills.some(f => f[0] === col.foe) && bk['slook-shot-neutral'].fills.some(f => f[0] === col.neu));
  const amber = [0xffa83a, 0xf0a03c, 0xffa040, 0xffd37a, 0xffc857, 0xff4d6d];
  check('and no bolt has an amber or a red in it', ['slook-shot-own', 'slook-shot-foe', 'slook-shot-neutral'].every(k => bk[k].fills.every(f => amber.indexOf(f[0]) < 0)));
  const nb = J('Object.keys(S.baked).length'); g.run('slookFxTextures(S);');
  check('baked once: asking again makes nothing', J('Object.keys(S.baked).length') === nb && nb === 13, nb);
  check('the textures: 3 bolts, the dart and its tail, 4 trails (friend, protect, foe, neutral), 2 rings, the core and the shard', ['slook-shot-own', 'slook-shot-foe', 'slook-shot-neutral', 'slook-missile', 'slook-missile-tail', 'slook-trail-friend', 'slook-trail-protect', 'slook-trail-foe', 'slook-trail-neutral', 'slook-ring-w', 'slook-ring-p', 'slook-core', 'slook-shard'].every(k => bk[k]), Object.keys(bk).join());
}

console.log('B. engine trails');
{
  g.run('CAMP.flags.shiplook = true;');
  const U = (o) => Object.assign({ hp: 10, x: 1000, y: 500, rot: 0, vx: 200, vy: 0, vmax: 200, kind: 'fighter' }, o);
  const spec = (u, dw, side) => J(`slookTrailSpec(${JSON.stringify(u)}, ${dw}, '${side}')`);
  check('a ship that does not move has no trail: at rest, under 25 px/s, dead, or with no drawn length', spec(U({ vx: 0 }), 40, 'friend') === null && spec(U({ vx: 24 }), 40, 'friend') === null && spec(U({ hp: 0 }), 40, 'friend') === null && spec(U(), 0, 'friend') === null && spec(null, 40, 'friend') === null);
  const f = spec(U(), 40, 'friend');
  check('a ship that moves has ONE: the engine\'s end (44 percent of the length behind the middle), along the heading, the length of a small ship 0.9 of its own at full speed, the head 0.16 of it wide', f && Math.abs(f.x - (1000 - 40 * 0.44)) < 1e-9 && f.y === 500 && f.rot === 0 && Math.abs(f.len - 36) < 1e-9 && Math.abs(f.wid - 6.4) < 1e-9, JSON.stringify(f));
  const bg = spec(U({ kind: 'carrier' }), 100, 'friend'), mo = spec(U({ kind: 'mother' }), 160, 'alien');
  check('a big ship (the cruiser: 58 px at play size, the mothership and the towers have none: big) has the short trail, half its length', bg && Math.abs(bg.len - 50) < 1e-9 && mo && Math.abs(mo.len - 80) < 1e-9, JSON.stringify([bg, mo]));
  const slow = spec(U({ vx: 50 }), 40, 'friend');
  check('slower is shorter: a quarter of its top speed is 0.55 of the full length, never under 0.4 of it; the trail points back along the heading when the ship turns', slow && Math.abs(slow.len - 36 * (0.4 + 0.6 * 0.25)) < 1e-9 && (r => Math.abs(r.x - (1000 - Math.cos(1) * 17.6)) < 1e-9 && Math.abs(r.y - (500 - Math.sin(1) * 17.6)) < 1e-9)(spec(U({ rot: 1 }), 40, 'friend')));
  check('its colour is the engine\'s: friend blue, a ship you protect amber, the pirates\' and the aliens\' pink, a neutral\'s grey-blue', ['friend', 'protect', 'foe', 'alien', 'neutral'].map(s => spec(U(), 40, s).key).join() === 'slook-trail-friend,slook-trail-protect,slook-trail-foe,slook-trail-foe,slook-trail-neutral');
  const bk = (g.run('window.S0 = __scene(1); slookFxTextures(S0);'), J('S0.baked'));
  check('the four trails are baked (64 by 16): a white head, the glow\'s colour in the middle, nothing at the tip; the pink one is pink, the amber one amber, the blue one blue', ['friend', 'protect', 'foe', 'neutral'].every(t => bk['slook-trail-' + t] && bk['slook-trail-' + t].w === 64 && bk['slook-trail-' + t].h === 16 && bk['slook-trail-' + t].fills.length === 32 && bk['slook-trail-' + t].fills[31][1] > bk['slook-trail-' + t].fills[0][1]) && bk['slook-trail-foe'].fills.some(x => x[0] === 0xff6fa8 || ((x[0] >> 16) > 230 && (x[0] & 0xff) > 150)));
  // the frame
  g.run('__new(1)'); g.run(`C.ships.forEach(u => { u.vx = 0; u.vy = 0; }); window.S = __scene(1); C.ships.forEach(u => { S.sp[u.id] = __dot(u); }); window.FL = C.ships.filter(u => u.team === 'earth' && u.kind === 'fighter')[0] || C.carrier; window.MN = C.ships.filter(u => u.kind === 'miner' && u.team === 'neutral')[0]; window.AL = C.ships.filter(u => u.team === 'alien')[0] || null;`);
  g.run('slookFxFrame(S);');
  check('nothing moves: no trail is made (no sprite at all)', J('S.ims.length') === 0 && J('Object.keys(S.hud.slfx.trails).length') === 0);
  g.run(`FL.vx = 150; FL.vy = 0; FL.vmax = 300; FL.rot = 0; MN.vx = 0; slookFxFrame(S);`);
  const t0 = J('S.hud.slfx.trails[FL.id]');
  check('a ship that moves has one sprite: behind it, along its heading, stretched to the trail\'s length and width, under the ship (depth 3.5 for a pilot), the friend\'s blue; the other ships have none', J('S.ims.length') === 1 && t0 && t0.key === 'slook-trail-friend' && t0.ox === 1 && t0.oy === 0.5 && Math.abs(t0.x - (J('FL.x') - 40 * 0.44)) < 1e-6 && Math.abs(t0.dw - 40 * 0.9 * (0.4 + 0.6 * 0.5)) < 1e-6 && Math.abs(t0.dh - 40 * 0.16) < 1e-6 && t0.depth === 3.5 && t0.vis, JSON.stringify(t0));
  g.run(`FL.x += 30; slookFxFrame(S); slookFxFrame(S);`);
  check('it follows the ship and is the same one sprite (no new sprite a frame)', J('S.ims.length') === 1 && Math.abs(J('S.hud.slfx.trails[FL.id].x') - (J('FL.x') - 17.6)) < 1e-6);
  g.run(`MN.vx = 100; MN.vmax = 130; MN.rot = 0; slookFxFrame(S);`);
  check('a protected miner\'s is amber (the sim says you protect it: the ships the health bars watch), a neutral\'s that is not protected grey-blue', J(`campConvoyShips(C).indexOf(MN) >= 0`) ? J('S.hud.slfx.trails[MN.id].key') === 'slook-trail-protect' : J('S.hud.slfx.trails[MN.id].key') === 'slook-trail-neutral');
  g.run(`FL.vx = 0; slookFxFrame(S);`);
  check('a ship that stops has its trail hidden, not destroyed (it will be wanted again)', J('S.hud.slfx.trails[FL.id].vis') === false && J('S.hud.slfx.trails[FL.id].dead') === false && J('S.ims.length') === 2);
  g.run(`FL.vx = 150; slookFxFrame(S);`);
  check('and the same sprite is shown again when it moves', J('S.hud.slfx.trails[FL.id].vis') === true && J('S.ims.length') === 2);
  g.run(`S.mp = {}; slookFxFrame(S);`);
  check('with the Tab map open the trails are hidden (it covers the view)', J('Object.values(S.hud.slfx.trails).every(t => t.vis === false)'));
  g.run(`S.mp = null; slookFxFrame(S);`);
  check('the far view: the sprite of a ship is drawn bigger and the trail with it (it is the ship\'s drawn length that sets it: 120 px long ship, 108 px long trail at full speed)', (g.run(`S.sp[FL.id].displayWidth = 120; FL.vx = 300; slookFxFrame(S);`), Math.abs(J('S.hud.slfx.trails[FL.id].dw') - 108) < 1e-6));
  g.run(`delete C.by[FL.id]; C.ships = C.ships.filter(u => u !== FL); delete S.sp[FL.id]; slookFxFrame(S);`);
  check('a ship that is gone has its trail destroyed and forgotten', J('S.ims.filter(i => i.dead).length') === 1 && J('S.hud.slfx.trails[FL.id]') === null);
  g.run(`CAMP.flags.shiplook = false; slookFxFrame(S);`);
  check('the switch off: every trail is hidden and none is made (nothing is drawn of the new look)', J('Object.values(S.hud.slfx.trails).every(t => t.vis === false)') && (g.run(`window.S2 = __scene(1); C.ships.forEach(u => { S2.sp[u.id] = __dot(u); u.vx = 200; }); slookFxFrame(S2);`), J('S2.ims.length') === 0 && J('S2.baked && Object.keys(S2.baked).length') === 0));
  g.run('CAMP.flags.shiplook = true;');
  const noRule = !/Phaser|scene\.|this\.add/.test(src('src/shiplookfx.js').split('// ---- the scene half ----')[0].replace(/\/\/[^\n]*/g, ''));
  check('the rules (shots, trails, the kill\'s animation, the tones) are pure: no Phaser, no scene, before the scene half of the file', noRule);
}

console.log('C. the missile');
{
  g.run(`CAMP.flags.shiplook = false; __new(1); window.S = __scene(1); window.M1 = { id: 'm1', x: 500, y: 400, rot: 0.5 }; window.seen = {};`);
  check('the switch off: the scene draws its own missile (slookRocket says no and makes nothing)', J('slookRocket(S, M1, seen)') === false && J('S.ims.length') === 0 && J('Object.keys(seen).length') === 0);
  g.run('CAMP.flags.shiplook = true;');
  check('on: a white dart and its tail, two sprites, the tail behind the dart with its end at the missile; the scene\'s rectangle, flame and smoke are not made', J('slookRocket(S, M1, seen)') === true && J('S.ims.length') === 2 && J('seen.m1') === true && J('S.msp.m1.body.key') === 'slook-missile' && J('S.msp.m1.flame.key') === 'slook-missile-tail' && J('S.msp.m1.flame.ox') === 1 && J('S.msp.m1.slook') === true);
  g.run('M1.x = 520; M1.y = 410; M1.rot = 0.6; slookRocket(S, M1, seen); slookRocket(S, M1, seen);');
  check('it follows the missile, both turned to its heading, and no sprite is made again', J('S.ims.length') === 2 && J('S.msp.m1.body.x') === 520 && J('S.msp.m1.flame.y') === 410 && J('S.msp.m1.body.rot') === 0.6 && J('S.msp.m1.flame.rot') === 0.6);
  check('it is as thick as a shot at the far view (the scene\'s own campZoomShotScale), so it is seen at zoom 0.2', (g.run('window.Sf = __scene(0.2); slookRocket(Sf, M1, {});'), J('Sf.msp.m1.body.sx') === J('campZoomShotScale(0.2)') && J('Sf.msp.m1.body.sx') > 2));
  check('the scene\'s own clean-up (it destroys `body` and `flame` of a missile that is gone) takes both sprites', (g.run(`['body', 'flame'].forEach(k => S.msp.m1[k].destroy());`), J('S.ims.filter(i => i.dead).length') === 2));
  g.run(`window.S3 = __scene(1); S3.msp.m2 = { body: S3.add.image(0, 0, 'x'), flame: S3.add.image(0, 0, 'ember'), puff: 0 }; window.M2 = { id: 'm2', x: 1, y: 1, rot: 0 }; slookRocket(S3, M2, {});`);
  check('a missile that was made before the switch was turned on is drawn again in the new look (the old sprites destroyed, two new ones made)', J('S3.msp.m2.slook') === true && J('S3.ims.filter(i => i.dead).length') === 2 && J('S3.ims.length') === 4);
  const bk = (g.run('window.S4 = __scene(1); slookFxTextures(S4);'), J('S4.baked'));
  check('the dart is white and 14 by 8 (the mock\'s outline at 10 px), the tail 34 by 4: white, getting fainter toward its end', bk['slook-missile'].w === 14 && bk['slook-missile'].h === 8 && bk['slook-missile'].fills.some(f => f[0] === 0xffffff && f[1] === 1) && bk['slook-missile-tail'].w === 34 && bk['slook-missile-tail'].fills.length === 17 && bk['slook-missile-tail'].fills[16][1] > bk['slook-missile-tail'].fills[0][1] && bk['slook-missile-tail'].fills.every(f => f[0] === 0xffffff));
}

console.log('D. the kill');
{
  g.run('CAMP.flags.shiplook = true;');
  const at = (age, unit) => J(`slookKillAt(${age}, ${unit})`);
  const a0 = at(0, 1), a5 = at(230, 1), a9 = at(459, 1), ad = at(460, 1);
  check('the rings start small and grow: the white one is 6 px at the start (0.4 of the mock\'s 15), 15 at its size and 19.5 at the end; the pink one 22 px (the mock\'s) and its alpha is under the white\'s', Math.abs(a0.ring1.r - 6) < 1e-9 && a5.ring1.r > 14 && a5.ring1.r < 19.5 && a9.ring1.r > 19 && a0.ring2.r < a5.ring2.r && a0.ring1.a === 0.9 && a0.ring2.a === 0.55 && a0.ring2.a < a0.ring1.a, JSON.stringify([a0.ring1, a5.ring1, a9.ring1]));
  check('everything fades out: alpha never rises, the core is gone by half the time, the effect is done at 460 ms, with nothing left', (() => { let prev = at(0, 1); for (let t = 10; t < 460; t += 10) { const a = at(t, 1); if (a.ring1.a > prev.ring1.a + 1e-9 || a.ring2.a > prev.ring2.a + 1e-9 || a.core.a > prev.core.a + 1e-9 || a.shards[0].a > prev.shards[0].a + 1e-9) return false; prev = a; } return true; })() && at(230, 1).core.a === 0, J('slookKillAt(230,1).core'));
  check('five shards fly out from the middle in the mock\'s directions (pink), still turning: from 0.35 to 1.4 times the mock\'s offsets', a0.shards.length === 5 && Math.abs(a0.shards[0].x - 12 * 0.35) < 1e-9 && Math.abs(a0.shards[0].y - (-9 * 0.35)) < 1e-9 && a9.shards[3].x > a5.shards[3].x && a9.shards[0].rot > a0.shards[0].rot);
  check('done: the effect says so at its end and from then on', ad.done === true && at(2000, 1).done === true && a9.done === false);
  check('the size scales it all: three units double it three times over (a big kill is the cruiser, the mothership), the radius at the start zoom 0.335 is 15 screen px', Math.abs(at(230, 3).ring1.r - 3 * a5.ring1.r) < 1e-9 && J('slookKillUnit(1 / 0.335, 1, 0)') > 2.9 && J('slookKillUnit(1 / 0.335, 1, 0)') < 3.0);
  check('a blast of 80 px radius shows at least its own size (the ring ends at 0.85 of it), a small kill does not shrink to it', J('slookKillUnit(1, 1.6, 80)') > 3.4 && J('slookKillUnit(1, 1.6, 80)') < 3.6 && J('slookKillUnit(1, 1, 0) === 1') && J('slookKillUnit(3, 1, 20) === 3'));
  // the pool
  g.run('__new(1); window.S = __scene(1); C.t = 1000;');
  g.run('slookFxTextures(S); window.n0 = S.ims.length;');
  check('a ship\'s end draws the new effect (true) with the switch on and makes eight sprites the first time: two rings, the core and five shards, all pink or white, hidden until placed', J('slookKill(S, 300, 200, 1)') === true && J('S.ims.length - n0') === 8 && J('S.ims.filter(i => i.key === "slook-shard").length') === 5 && J('S.hud.slfx.kills.length') === 1);
  check('it is placed at once: the white ring at the point, its scale the ring\'s radius over its texture\'s (30 px), at 0.9 alpha; the core adds light (ADD)', J('S.hud.slfx.kills[0].ring1.x') === 300 && J('S.hud.slfx.kills[0].ring1.y') === 200 && Math.abs(J('S.hud.slfx.kills[0].ring1.sx') - 6 / 30) < 1e-9 && J('S.hud.slfx.kills[0].ring1.a') === 0.9 && J('S.hud.slfx.kills[0].core.blend') === 'ADD');
  g.run('C.t = 1230; slookFxFrame(S);');
  check('the frame moves it on: half way the white ring is bigger and fainter; the shards are away from the point', J('S.hud.slfx.kills[0].ring1.sx') > 0.5 && J('S.hud.slfx.kills[0].ring1.a') < 0.9 && J('S.hud.slfx.kills[0].shards[0].x') > 300 && J('S.hud.slfx.kills[0].ring2.vis') === true);
  g.run('C.t = 1500; slookFxFrame(S); window.n1 = S.ims.length;');
  check('at its end its sprites are hidden and the record goes back to the pool (nothing is destroyed)', J('S.hud.slfx.kills.length') === 0 && J('S.hud.slfx.free.length') === 1 && J('S.ims.filter(i => i.dead).length') === 0 && J('S.ims.filter(i => i.vis && /^slook-(ring|core|shard)/.test(i.key)).length') === 0);
  g.run('slookKill(S, 10, 10, 1); slookKill(S, 20, 20, 1);');
  check('the next kill takes the record that was free (no sprite made), a second one makes a new record', J('S.ims.length - n1') === 8 && J('S.hud.slfx.made') === 2);
  g.run('for (let i = 0; i < 30; i++) { C.t += 5; slookKill(S, i, i, 1); }');
  check('a fight with thirty kills in 150 ms makes no more than 12 records (96 sprites), the oldest effect is taken over when they are all busy', J('S.hud.slfx.made') === 12 && J('S.ims.filter(i => /^slook-(ring|core|shard)/.test(i.key)).length') === 96 && J('S.hud.slfx.kills.length') <= 12);
  g.run('C.t += 2000; slookFxFrame(S);');
  check('and they all come back when they are done', J('S.hud.slfx.kills.length') === 0 && J('S.hud.slfx.free.length') === 12);
  g.run('CAMP.flags.shiplook = false; window.S5 = __scene(1);');
  check('the switch off: a kill is not drawn (false: the scene\'s own puffs), and nothing is made', J('slookKill(S5, 1, 2, 1)') === false && J('S5.ims.length') === 0 && J('S5.baked && Object.keys(S5.baked).length') === 0);
  g.run('CAMP.flags.shiplook = true;');
  const sc = src('src/campaignscene.js'), tp = src('src/camptorpedoscene.js');
  check('only ships\' ends and missile blasts have it: the \'boom\' and \'mboom\' events (and a torpedo that goes off, \'tboom\'); a rock break, the shield blink, the hit\'s spark, the earth hit and the fizzles still call fxBoom as before', /type === 'boom'\) \{ if \(!\(typeof slookKill === 'function' && slookKill\(this, e\.x, e\.y, e\.big \? SLOOKFX\.kill\.big : 1\)\)\) this\.boom\.explode\(e\.big \? 90 : 26, e\.x, e\.y\);/.test(sc) && /type === 'mboom'\) \{ if \(!\(typeof slookKill === 'function' && slookKill\(this, e\.x, e\.y, SLOOKFX\.kill\.blast, e\.r\)\)\) this\.boom\.explode\(44, e\.x, e\.y\);/.test(sc) && /type === 'rockbreak'\) \{ this\.boom\.explode\(16, e\.x, e\.y\);/.test(sc) && /type === 'blink'\) \{ this\.boom\.explode\(30, e\.x, e\.y\);/.test(sc) && /type === 'hit'\) \{[^\n]*this\.boom\.explode\(3, e\.x, e\.y\);/.test(sc) && /type === 'earthhit'\) \{ this\.boom\.explode\(6, e\.x, e\.y\);/.test(sc) && /type === 'mfizzle'\) \{ this\.boom\.explode\(6, e\.x, e\.y\);/.test(sc) && /type === 'tboom'\) \{ if \(!\(typeof slookKill === 'function'/.test(tp) && /scene\.boom\.explode\(Math\.max\(40/.test(tp));
  check('fxBoom (src/art_world.js, shared with the Long Haul) is not touched by this card: the file does not mention the look', !/slook/i.test(src('src/art_world.js')));
}

console.log('E. the amber fixes');
{
  g.run('CAMP.flags.shiplook = false;');
  check('the switch off: the reach ring, the mounts\' dots and barrels and the muzzle flash keep their gold (slookGunTone gives back what it is given); the torpedoes keep their amber and red', J('[0xffd37a, 0xffe9a0, 0x123456].every(c => slookGunTone(c) === c)') && J('[0xffa040, 0xff4d6d, 0x123456].every(c => slookTorpTone(c) === c)'));
  g.run('CAMP.flags.shiplook = true;');
  check('on: the gold of the reach ring and the mounts goes to the friend blue (#6fd6ff), the lighter gold of a shot\'s barrel and the flash to a light blue; any other colour is left alone (the white of a shot, the steel of a stub)', J('slookGunTone(0xffd37a)') === 0x6fd6ff && J('slookGunTone(0xffe9a0)') === 0xcfeeff && J('slookGunTone(0xffffff)') === 0xffffff && J('slookGunTone(0x9aa0a8)') === 0x9aa0a8 && J('slookInt(SLOOK.C.friendHi)') === 0x6fd6ff);
  check('the pirates\' torpedo ring (amber) and the aliens\' (red-pink) are the hostile pink (#ff6fa8): red is retired; a colour that was neither is left alone', J('slookTorpTone(0xffa040)') === 0xff6fa8 && J('slookTorpTone(0xff4d6d)') === 0xff6fa8 && J('slookTorpTone(0x123456)') === 0x123456 && J('slookInt(SLOOK.C.foe)') === 0xff6fa8);
  const sc = src('src/campaignscene.js'), tp = src('src/camptorpedoscene.js');
  check('the scene uses the tone for the reach ring, the dots, the barrels and the flash (and the ring, the flame and the line of the torpedo and the boat\'s arming ring use it too)', /tone\(CAMP_REACH\.color\)/.test(sc) && /tone\(0xffd37a\), 1\)/.test(sc) && /tone\(0xffe9a0\) : tone\(0xffd37a\)/.test(sc) && /slookGunTone\(0xffe9a0\)/.test(sc) && (tp.match(/campTorpTone\(K\.color\[/g) || []).length === 2);
  check('the gold of the goals (the caches, the goal arrow) is untouched: those lines still say 0xffd37a without the tone', /setTint\(0xffd37a\)/.test(sc) && /g\.fillStyle\(0xffd37a, 0\.95\)\.fillPoints\(tri, true\)/.test(sc));
}

console.log('F. the switch off, the calls and the files');
{
  g.run('CAMP.flags.shiplook = false; __new(1); window.S = __scene(1); C.ships.forEach(u => { S.sp[u.id] = __dot(u); u.vx = 200; });');
  g.run('slookFxFrame(S); slookRocket(S, { id: "q", x: 1, y: 1, rot: 0 }, {}); slookKill(S, 1, 1, 1); slookKill(S, 1, 1, 3, 90);');
  check('with the switch off a whole frame, a missile and two kills make nothing at all: no sprite, no texture, no pool', J('S.ims.length') === 0 && J('Object.keys(S.baked).length') === 0 && J('S.hud.slfx.made') === 0 && J('S.hud.slfx.kills.length') === 0);
  check('and the shot has no key', J('slookShotKey({ team: "earth" })') === null);
  const sc = src('src/campaignscene.js');
  check('the scene\'s calls are one line each and each keeps the old code behind a guard: the bullet\'s texture, the missile loop, the two events, the install in create', /\.setTexture\(\(typeof slookShotKey === 'function' && slookShotKey\(b\)\) \|\| \(b\.team === 'earth' \? 'shot-earth'/.test(sc) && /if \(typeof slookRocket === 'function' && slookRocket\(this, m, seen\)\) return;/.test(sc) && /if \(typeof slookFxInstall === 'function'\) slookFxInstall\(this\);/.test(sc));
  check('the install hangs the frame on the scene\'s postupdate event (after the ships\' sprites) and takes it off on shutdown', (() => { g.run(`window.ev = {}; window.SI = { events: { on: (k, f) => { ev[k] = f; }, once: (k, f) => { ev['once-' + k] = f; }, off: (k, f) => { ev['off-' + k] = f; } } }; slookFxInstall(SI);`); return J('typeof ev.postupdate') === 'string' || J('!!ev.postupdate') ; })() && J('!!ev["once-shutdown"]') && (g.run('ev["once-shutdown"]();'), J('ev["off-postupdate"] === ev.postupdate')));
  check('a scene with no events (a stand-in in another test) is not an error', (() => { try { g.run('slookFxInstall({}); slookFxInstall(null); slookFxFrame({}); slookFxFrame({ camp: C }); slookRocket({}, {}, {}); slookKill({}, 1, 1, 1);'); return true; } catch (e) { return false; } })());
  const fx = src('src/shiplookfx.js'), html = src('index.html');
  check('the file follows the rules: no web request, no image or sound file, no particles and no tween (one sprite a trail, a pooled kill), no Phaser emitter', !/\bfetch\(|XMLHttpRequest|https?:\/\/|\.(png|jpe?g|gif|svg|mp3|wav|ogg)\b|\bparticles\b|\.tweens\b|createEmitter/.test(code('src/shiplookfx.js')));
  check('it reads no rule and writes none: no assignment to a unit or to the CAMP table', !/\bu\.(hp|x|y|vx|vy|rot)\s*=[^=]|\bCAMP\.[a-z]+[.\w]*\s*=[^=]|\bC\.[a-z]+\s*=[^=]/.test(code('src/shiplookfx.js')));
  check('its script tag is in the page once, where landing F put it, and the other draw files are not touched by this card', html.split('<script src="src/shiplookfx.js"></script>').length === 2 && !/slookFx|SLOOKFX|slookKill|slookRocket/.test(src('src/shiplookdraw.js') + src('src/shiplookmarks.js') + src('src/shiplookglyph.js')));
  check('the percent number and the old health line are not part of this card: campchargescene.js does not mention the look', !/slook/i.test(src('src/campchargescene.js')));
}

console.log(failed ? `\nSHIP LOOK FX FAIL: ${failed} of ${n} checks failed` : `\nSHIP LOOK FX PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
