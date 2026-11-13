// Screenshots of the station exterior and Kestrel Outpost: node tests/stationshots.mjs [prefix]  -> tests/out/<prefix>-*.png
// Fails (exit 1) on a console error or if the station textures are missing. Uses the stepped clock, so the animation
// phase is the same every run. The camera is placed by hand; the zoom only lasts for this run.
import { launch, sleep } from './cdp.mjs';

const prefix = process.argv[2] || 'station';
const t = await launch('#space');
let failed = false;
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space scene active');
  await sleep(1500);
  await t.clock();
  const sc = `game.scene.getScene('Space')`;
  const have = await t.ev(`['station', 'station-hub', 'station-ring2', 'outpost'].every(k => game.textures.exists(k)) && game.textures.exists('station-lane')`);
  if (!have) throw new Error('a station texture is missing');
  const view = async (x, y, zoom, name, frames = 60) => {
    await t.ev(`(() => { const s = ${sc}; s.ship.setPosition(${x} + 160, ${y} + 120); s.ship.setVelocity(0, 0); s.lockUntil = s.time.now + 99999; const c = s.cameras.main; c.stopFollow(); c.setZoom(${zoom}); c.centerOn(${x}, ${y}); return 1; })()`);
    await t.run(frames * 16.67);
    if (!(await t.shot(`${prefix}-${name}`))) throw new Error('screenshot failed: ' + name);
    console.log(`  ok  ${prefix}-${name} -> tests/out/${prefix}-${name}.png`);
  };
  const st = await t.ev(`(() => { const s = ${sc}; return { x: s.station.x, y: s.station.y, a: s.station.rotation }; })()`);
  await view(st.x, st.y, 1, 'whole');                                                        // the whole station
  await view(st.x + Math.cos(st.a) * 380, st.y + Math.sin(st.a) * 380, 1.1, 'lane');           // docking lane
  await view(st.x + Math.cos(st.a) * 250, st.y + Math.sin(st.a) * 250, 2.4, 'bay');            // bay mouth
  await view(st.x - 60, st.y - 60, 2, 'hub');                                                  // hub and middle ring
  await view(2000, 5800, 1, 'outpost');
  await view(2000, 5800, 2.2, 'outpost-zoom');
  if (t.errors.length) throw new Error('console errors: ' + t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); failed = true; } finally { await t.close(); }
process.exitCode = failed ? 1 : 0;
