// Ship gallery: lines every ship class up in space at 2x zoom and saves two screenshots to tests/out/:
//   ships-<name>.png         the gallery (player ship at each upgrade tier, pirates, the Reaver, MULE, civilian, police)
//   ships-<name>-flight.png  the player thrusting with flame and trail, a hit on the shield, a smoking gunship
// Run: node tests/ships.mjs            -> ships-after.png from this checkout
//      NAME=before PAGE=file:///Users/troydaniel/dev/spacegame/index.html node tests/ships.mjs   -> the same from another checkout
// Fails (exit 1) on a console error or an uncaught exception, so it doubles as a smoke test for src/ships.js.
import { launch, sleep } from './cdp.mjs';

const NAME = process.env.NAME || 'after';
const t = await launch('#space');
let failed = false;
try {
  if (process.env.PAGE) { await t.send('Page.navigate', { url: process.env.PAGE + '#space' }); }
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 20000, 'Space scene active');
  await sleep(1600); // arrival zoom and ship scale tween
  await t.clock();
  await t.ev(`(() => {
    const s = game.scene.getScene('Space'), x0 = s.ship.x, y0 = s.ship.y, UP = -Math.PI / 2;
    s.enemies.getChildren().slice().forEach(e => e.destroy());
    if (s.tr) { s.tr.civ.forEach(c => c.img.setVisible(false)); s.tr.police.forEach(p => { p.img.setVisible(false); p.l1.setVisible(false); p.l2.setVisible(false); }); }
    s.ship.body.setVelocity(0, 0); s.ship.rotation = UP; s.lockUntil = 0;
    const cam = s.cameras.main; cam.stopFollow(); cam.setZoom(3); cam.centerOn(x0 + 125, y0 + 85);
    const img = (x, y, key) => s.add.image(x, y, key).setDepth(5).setRotation(UP);
    // top row: the player ship at tier 0 (the real one), then tiers 1 and 2 if this build draws them
    if (typeof shipDraw === 'function') {
      [[1, 1, 1], [2, 2, 2]].forEach(([a, r, b], i) => {
        const g = s.make.graphics({ x: 0, y: 0, add: false }); shipDraw(g, a, r, b); g.generateTexture('ship_tier' + (i + 1), 56, 40); g.destroy();
        img(x0 + 70 * (i + 1), y0, 'ship_tier' + (i + 1));
      });
    }
    img(x0 + 230, y0, 'police');
    // middle row: pirates
    const pir = (x, type) => { const e = spawnPirate(s, x, y0 + 80, type); e.rotation = UP; e.body.setVelocity(0, 0); e.body.setAcceleration(0, 0); return e; };
    pir(x0, 'raider'); pir(x0 + 70, 'drone'); pir(x0 + 150, 'gunship');
    const rv = s.add.image(x0 + 260, y0 + 85, 'reaver').setDepth(5).setRotation(UP);
    // bottom row: the MULE and a civilian
    img(x0 + 30, y0 + 170, 'freighter'); img(x0 + 130, y0 + 170, 'civilian').setTint(0x7fc8ff); img(x0 + 230, y0 + 170, 'civilian').setTint(0xff9ec8);
    window.__g = { x0, y0 };
    return 1;
  })()`);
  await t.run(100);
  await t.shot('ships-' + NAME); await t.run(17); await t.shot('ships-' + NAME);
  console.log(`  ok  gallery -> tests/out/ships-${NAME}.png`);

  // flight: thrust up for a while so the flame and trail show, take a hit, park a badly damaged gunship alongside
  await t.ev(`(() => {
    const s = game.scene.getScene('Space'), { x0, y0 } = window.__g;
    s.children.list.filter(o => o.texture && /^ship_tier|^police$|^civilian$|^freighter$|^reaver$/.test(o.texture.key) && o !== s.ship).forEach(o => o.destroy());
    s.enemies.getChildren().slice().forEach(e => e.destroy());
    s.cameras.main.setZoom(1.5).startFollow(s.ship, true, 1, 1);
    return 1;
  })()`);
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87, code: 'KeyW', key: 'w' });
  await t.run(1400);
  await t.ev(`(() => { // a gunship on its last legs flying alongside, then a hit on you
    const s = game.scene.getScene('Space'), v = s.ship.body.velocity;
    const e = spawnPirate(s, s.ship.x + 110, s.ship.y - 30, 'gunship'); e.hp = 15; e.rotation = -Math.PI / 2; e.body.setVelocity(v.x, v.y); e.body.setMaxSpeed(600);
    return 1;
  })()`);
  await t.run(400);
  await t.ev(`(() => { const s = game.scene.getScene('Space'); s.hurt(4, s.ship.x + 60, s.ship.y - 10); return 1; })()`);
  await t.run(50);
  await t.shot('ships-' + NAME + '-flight'); await t.run(17); await t.shot('ships-' + NAME + '-flight');
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 87, nativeVirtualKeyCode: 87, code: 'KeyW', key: 'w' });
  console.log(`  ok  flight  -> tests/out/ships-${NAME}-flight.png`);
  if (t.errors.length) throw new Error('console errors: ' + t.errors.join(' | '));
} catch (e) {
  console.error('  FAIL ships: ' + e.message);
  failed = true;
} finally {
  await t.close();
}
process.exitCode = failed ? 1 : 0;
