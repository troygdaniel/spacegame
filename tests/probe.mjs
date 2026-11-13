// Balance probes for docs/PLAYTEST.md: measures what the game actually does, nothing is asserted.
// Run: node tests/probe.mjs    (about a minute; prints numbers)
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')", SF = "game.scene.getScene('Surface')";
const line = (...a) => console.log(...a);

// ---- 1. Surface: does the colonist live until the player can walk to the pod? ----
{
  const t = await launch('#surface');
  await t.waitFor("!!(window.game && game.scene.isActive('Surface'))", 15000);
  line('\n[1] SURFACE, player idle at the ship, crawlers alive (walk to the pod is about 1800 px at 210 px/s = 8.6 s)');
  const t0 = Date.now();
  for (let i = 0; i <= 12; i += 2) {
    const s = await t.ev(`(() => { const s = ${SF}; const c = s.col; if (!c) return 'no colonist';
      const near = s.crawlers.getChildren().filter(k => Math.hypot(k.x - c.s.x, k.y - c.s.y) < 28).length;
      return 'colonist hp ' + Math.round(c.hp) + '/60 state ' + c.state + ', crawlers touching them ' + near; })()`);
    line(`  t=${((Date.now() - t0) / 1000).toFixed(1)}s  ${s}`);
    await sleep(2000);
  }
  await t.shot('probe-1-surface-after-12s');
  const hp = await t.ev(`${SF}.hp`);
  line('  player hp after 12 s (idle at the ship):', Math.round(hp));
  await t.close();
}

// ---- 2. Surface: damage one crawler does to the player ----
{
  const t = await launch('#surface');
  await t.waitFor("!!(window.game && game.scene.isActive('Surface'))", 15000);
  await t.ev(`(() => { const s = ${SF}; const cs = s.crawlers.getChildren(); s.crawlers.getChildren().slice(1).forEach(c => c.destroy());
    s.player.setPosition(cs[0].x + 5, cs[0].y); s.col.s.setPosition(100, 100); s.col.hp = 9999; })()`);
  const h0 = await t.ev(`${SF}.hp`); await sleep(2000);
  const h1 = await t.ev(`${SF}.hp`);
  line(`\n[2] one crawler on the player: hp ${Math.round(h0)} -> ${Math.round(h1)} in 2 s (${Math.round((h0 - h1) / 2)} hp/s)`);
  await t.close();
}

// ---- 3-6. Space ----
{
  const t = await launch('#space');
  await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 15000);
  await t.waitFor(`${SP}.time.now > ${SP}.lockUntil + 100`);
  await t.ev(`${SP}.enemies.clear(true, true)`);

  // 3. top speed and how long the brake takes
  await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(1000, 1000); s.ship.rotation = 0; s.ship.setVelocity(0, 0); })()`);
  await t.press('W', 3000);
  line(`\n[3] top speed holding W for 3 s: ${Math.round(await t.ev(`${SP}.ship.body.speed`))} px/s`);
  // coast: release everything and time the drop to the dock limit 150
  let t0 = Date.now(); await t.ev(`${SP}.ship.setVelocity(480, 0)`);
  while ((await t.ev(`${SP}.ship.body.speed`)) > 150 && Date.now() - t0 < 10000) await sleep(40);
  line(`    coasting (no brake) from 480 to 150 px/s: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  // brake: hold S
  await t.ev(`${SP}.ship.setVelocity(480, 0)`); t0 = Date.now();
  const hold = t.press('S', 3000);
  while ((await t.ev(`${SP}.ship.body.speed`)) > 150 && Date.now() - t0 < 10000) await sleep(40);
  line(`    braking (hold S) from 480 to 150 px/s: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  await hold;

  // 4. trip time station -> planet
  const dist = await t.ev(`Math.round(Math.hypot(${SP}.planet.x - ${SP}.station.x, ${SP}.planet.y - ${SP}.station.y))`);
  line(`\n[4] station to planet is ${dist} px (HUD says ${Math.round(dist / 10)} km): ${(dist / 480).toFixed(1)} s at 480 px/s, ${(dist / 800).toFixed(1)} s boosting`);

  // 5. ram a drone: can ramming kill it?
  await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(1000, 1000); s.ship.setVelocity(0, 0); s.spawnDrone(1000, 1000); })()`);
  await sleep(4000);
  const d = await t.ev(`(() => { const e = ${SP}.enemies.getChildren()[0]; return e ? 'hp ' + e.hp + ' active ' + e.active : 'gone'; })()`);
  line(`\n[5] a drone sitting on the ship for 4 s: ${d}  (hull now ${Math.round(await t.ev('G.hull'))})`);
  await t.ev(`${SP}.enemies.clear(true, true)`);
  await t.close();
}
{
  // 6. landing approach under drone fire without shooting back
  const t = await launch('#space');
  await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 15000);
  await t.waitFor(`${SP}.time.now > ${SP}.lockUntil + 100`);
  await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(s.planet.x - 420, s.planet.y); s.ship.setVelocity(0, 0); })()`);
  line('\n[6] parked on the landing approach (6 drones circle the planet), not shooting back:');
  const t0 = Date.now(); let dead = null;
  for (let i = 0; i < 20; i++) {
    await sleep(1000);
    const hull = await t.ev('G.hull'), isDead = await t.ev(`${SP}.dead`);
    if (i % 2 === 1 || isDead) line(`  t=${((Date.now() - t0) / 1000).toFixed(0)}s hull ${Math.round(hull)} dead ${isDead}`);
    if (isDead) { dead = (Date.now() - t0) / 1000; break; }
  }
  line(dead ? `  ship destroyed after about ${dead.toFixed(0)} s` : '  survived 20 s');
  await t.close();
}
