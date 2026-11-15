// smoke: six trips round the scenes leave nothing behind: physics worlds, sprites, bodies, textures
// Going round the scenes again and again must not leave anything behind (card space-game-perf-pass).
// It found a real leak: asteroids.js wrapped the Space scene's die() with s.die.bind(s) at every launch, and the scene instance lives on,
// so each launch stacked a new layer on the last one. Every layer kept that launch's rocks, bodies and physics world alive:
// about 125 physics sprites and 2 physics worlds per trip round the loop, and the heap grew 0.45 MB a trip for as long as you played.
//
// How: Station -> ship bay -> Space -> Surface -> Space -> Station, twice to warm up, then four more times. After a full garbage
// collection the live Phaser objects are counted (Runtime.queryObjects) and must not have grown. The broken code grew by 8 worlds and
// about 500 sprites over those four trips; the fixed code by 0 to 1 and about 20.
// Run: node tests/perfleak.mjs   (exit code 1 on any failure)
import { launch } from './cdp.mjs';

let failed = 0, n = 0;
const check = (ok, msg) => { n++; console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) failed++; };

const t = await launch('#station');
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 30000, 'Station active');
  await t.clock(); await t.run(1000);

  // one scene change: go() fades out for 280 ms and then starts the scene, so step until the new one is up
  const hop = async key => {
    await t.ev(`(() => { const s = game.scene.getScenes(true)[0]; go(s, '${key}'); return 1; })()`);
    for (let i = 0; i < 6 && !(await t.ev(`game.scene.isActive('${key}')`)); i++) await t.run(400);
    await t.run(300);
    if (key === 'Space') await t.ev("(() => { const s = game.scene.getScene('Space'); if (s.enemies) s.enemies.clear(true, true); return 1; })()"); // nothing shoots at us mid-test
    return t.ev(`game.scene.isActive('${key}')`);
  };
  const loop = async () => {
    const seen = [];
    for (const k of ['Ship', 'Space', 'Surface', 'Space', 'Station']) seen.push(await hop(k));
    return seen.every(Boolean);
  };
  const count = async path => {
    const proto = await t.send('Runtime.evaluate', { expression: path + '.prototype' });
    const q = await t.send('Runtime.queryObjects', { prototypeObjectId: proto.result.objectId });
    const r = await t.send('Runtime.callFunctionOn', { objectId: q.objects.objectId, functionDeclaration: 'function () { return this.length; }', returnByValue: true });
    await t.send('Runtime.releaseObject', { objectId: q.objects.objectId }); await t.send('Runtime.releaseObject', { objectId: proto.result.objectId });
    return r.result.value;
  };
  const census = async () => {
    await t.send('HeapProfiler.collectGarbage'); await t.send('HeapProfiler.collectGarbage');
    return {
      worlds: await count('Phaser.Physics.Arcade.World'),
      sprites: await count('Phaser.Physics.Arcade.Sprite'),
      bodies: await count('Phaser.Physics.Arcade.Body'),
      textures: await t.ev('game.textures.getTextureKeys().length'),
      canvases: await t.ev("document.querySelectorAll('canvas').length")
    };
  };

  let ok = true;
  for (let i = 0; i < 2; i++) ok = (await loop()) && ok;
  check(ok, 'two trips round the scenes (Station, Ship, Space, Surface, Space, Station) reached every scene');
  const a = await census();
  for (let i = 0; i < 4; i++) ok = (await loop()) && ok;
  check(ok, 'four more trips reached every scene');
  const b = await census();
  console.log(`  after 2 trips: ${JSON.stringify(a)}\n  after 6 trips: ${JSON.stringify(b)}`);

  check(b.worlds - a.worlds <= 2, `physics worlds do not pile up (${a.worlds} -> ${b.worlds}; the leak made 2 a trip)`);
  check(b.sprites - a.sprites <= 80, `physics sprites do not pile up (${a.sprites} -> ${b.sprites}; the leak made about 125 a trip)`);
  check(b.bodies - a.bodies <= 80, `physics bodies do not pile up (${a.bodies} -> ${b.bodies})`);
  check(b.textures - a.textures <= 2, `textures do not pile up (${a.textures} -> ${b.textures})`);
  check(b.canvases === a.canvases, `no canvas is left in the page (${a.canvases} -> ${b.canvases})`);

  // The wrapper that drops the cargo when the ship dies is still there, once: a hull at zero with ore aboard loses the ore.
  await hop('Space');
  const lost = await t.ev(`(() => { const s = game.scene.getScene('Space'); G.ore = 5; s.dead = false; s.die(); return G.ore; })()`);
  check(lost === 0, `a wrecked ship still loses its cargo (ore after die(): ${lost})`);
  check(t.errors.length === 0, 'no console errors' + (t.errors.length ? ': ' + t.errors.join(' | ') : ''));
} finally { await t.close(); }

console.log(failed ? `\nPERFLEAK FAIL (${failed} of ${n} checks)` : `\nPERFLEAK PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
