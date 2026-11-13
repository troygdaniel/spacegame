// HUD screenshots for before/after comparisons. Run: node tests/hudshots.mjs <tag>   (tag: before | after, default "shot")
// Saves tests/out/hud-<tag>-space.png, -space-fight.png, -surface.png, -station.png. Chrome runs muted (cdp.mjs).
// The game clock is stepped by hand, so the pictures do not depend on how busy the Mac is.
import { launch } from './cdp.mjs';

const tag = process.argv[2] || 'shot';
const SP = "game.scene.getScene('Space')", SF = "game.scene.getScene('Surface')", ST = "game.scene.getScene('Station')";
let failed = false;

async function scene(hash, name, fn) {
  const t = await launch(hash);
  try {
    await t.waitFor(`!!(window.game && game.scene.isActive('${name}'))`, 20000, name + ' active');
    await t.clock();
    await t.run(1500);
    await fn(t);
    if (t.errors.length) throw new Error('console errors: ' + t.errors.join(' | '));
  } catch (e) { console.error('  FAIL ' + name + ': ' + e.message); failed = true; } finally { await t.close(); }
}

await scene('#space', 'Space', async t => {
  await t.shot(`hud-${tag}-space`);
  // a fight: three pirates close by, one of them wanted, the ship moving
  await t.ev(`(() => { const s = ${SP}; const a = s.ship; [[420, -120], [-300, 260], [650, 300]].forEach(([dx, dy]) => s.spawnDrone(a.x + dx, a.y + dy)); return 1; })()`);
  await t.ev(`(() => { const s = ${SP}; s.ship.body.setVelocity(300, 0); s.ship.setRotation(0); return 1; })()`);
  await t.run(900);
  await t.shot(`hud-${tag}-space-fight`);
  console.log(`  ok  hud-${tag}-space(-fight)`);
});
await scene('#surface', 'Surface', async t => { await t.shot(`hud-${tag}-surface`); console.log(`  ok  hud-${tag}-surface`); });
await scene('#station', 'Station', async t => { await t.shot(`hud-${tag}-station`); console.log(`  ok  hud-${tag}-station`); });
process.exitCode = failed ? 1 : 0;
