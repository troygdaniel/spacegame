// Scripted playthrough of the whole rescue loop through the real game code (real key presses over DevTools).
// Station: take the Rescue call (E opens the board, 1 picks Rescue, E accepts) -> Space: land on Kepler-4b -> Surface: wake the colonist, board -> Space: dock -> payout.
// Asserts credits go up by exactly REWARD (500). Drones and crawlers are removed so the run is deterministic;
// tests/probe.mjs measures what they do. Run: node tests/loop.mjs   (exit code 1 on any failure)
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')", SF = "game.scene.getScene('Surface')", ST = "game.scene.getScene('Station')";
const t = await launch('#station');
let step = 'start';
const ok = async (name, expr, ms) => { step = name; await t.waitFor(expr, ms, name); console.log('  ok  ' + name); };
try {
  await ok('station is up', "!!(window.game && game.scene.isActive('Station'))", 15000);
  const credits0 = await t.ev('G.credits');
  await t.shot('loop-1-station');

  // 1. take the rescue call (stand at the MISSIONS terminal, E to open, E to accept)
  await t.ev(`${ST}.player.setPosition(200, 200)`); await sleep(250);
  await t.press('E');
  await ok('mission board opens', `${ST}.panel === true`);
  await t.press('1'); // the board lists the calls: 1 Rescue, 2 Escort, 3 Patrol
  await ok('rescue offer shown', `${ST}.canAccept === true`);
  await t.press('E');
  await ok('mission accepted', "G.mission === 'accepted' && G.missionId === 'rescue'");

  // 2. board the ship and launch
  await t.ev(`${ST}.player.setPosition(1090, 360)`); await sleep(250);
  await t.press('E');
  await ok('space scene started', "game.scene.isActive('Space')");
  await ok('launch lock over', `${SP}.time.now > ${SP}.lockUntil + 100`);
  await t.ev(`${SP}.enemies.clear(true, true)`);

  // 3. park above Kepler-4b slowly and land
  await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(s.planet.x - 420, s.planet.y); s.ship.setVelocity(0, 0); })()`);
  await ok('land prompt shows', `${SP}.prompt.text.startsWith('L  Land')`);
  await t.shot('loop-2-space-landing');
  await t.press('L');
  await ok('surface scene started', "game.scene.isActive('Surface')");
  await t.ev(`${SF}.crawlers.clear(true, true)`);

  // 4. wake the colonist, walk back to the ship with them, lift off
  await ok('colonist exists', `!!${SF}.col`);
  await t.ev(`(() => { const s = ${SF}; s.player.setPosition(s.col.s.x - 30, s.col.s.y); })()`); await sleep(250);
  await t.press('E');
  await ok('colonist follows', `${SF}.col.state === 'following'`);
  await t.shot('loop-3-surface-escort');
  await t.ev(`(() => { const s = ${SF}; s.player.setPosition(s.pad.x + 50, s.pad.y); s.col.s.setPosition(s.pad.x + 90, s.pad.y); })()`);
  await sleep(250);
  await t.press('E');
  await ok('colonist rescued', "G.mission === 'rescued'");
  await ok('back in space', "game.scene.isActive('Space')");
  await ok('launch lock over (2)', `${SP}.time.now > ${SP}.lockUntil + 100`);
  await t.ev(`${SP}.enemies.clear(true, true)`);

  // 5. fly home and dock
  await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(s.station.x + 250, s.station.y); s.ship.setVelocity(0, 0); })()`);
  await ok('dock prompt shows', `${SP}.prompt.text.startsWith('L  Dock')`);
  await t.press('L');
  await ok('station again', "game.scene.isActive('Station')");
  await sleep(500);
  await t.shot('loop-4-payout');

  const credits1 = await t.ev('G.credits'), mission = await t.ev('G.mission');
  const gain = credits1 - credits0;
  console.log(`  credits ${credits0} -> ${credits1} (gain ${gain}), mission ${mission}`);
  if (gain !== 500) throw new Error(`expected +500 credits, got ${gain}`);
  if (mission !== 'none') throw new Error(`expected mission none after payout, got ${mission}`);
  if (t.errors.length) throw new Error('console errors: ' + t.errors.join(' | '));
  console.log('PASS loop: rescue to payout, +500 credits');
} catch (e) {
  console.error(`FAIL loop at "${step}": ${e.message}`);
  try { await t.shot('loop-fail'); } catch (x) { /* ignore */ }
  process.exitCode = 1;
} finally {
  await t.close();
}
