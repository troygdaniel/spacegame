// Loads each scene in headless Chrome, waits for it to be running, saves a screenshot to tests/out/ and fails on any
// console error or uncaught exception. Run: node tests/scenes.mjs   (exit code 1 on any failure)
// Uses the DevTools route rather than chrome --screenshot: that one hangs at random when the Mac is busy.
import { launch, sleep } from './cdp.mjs';

const SCENES = [['scene-title', '', 'Title'], ['scene-station', '#station', 'Station'], ['scene-space', '#space', 'Space'], ['scene-surface', '#surface', 'Surface']];
let failed = false;
for (const [name, hash, scene] of SCENES) {
  const t = await launch(hash);
  try {
    await t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, 20000, scene + ' scene active');
    await sleep(1500); // let the fade-in finish and a few frames draw
    await t.shot(name);
    if (t.errors.length) throw new Error('console errors: ' + t.errors.join(' | '));
    console.log(`  ok  ${name} -> tests/out/${name}.png`);
  } catch (e) {
    console.error(`  FAIL ${name}: ${e.message}`);
    failed = true;
  } finally {
    await t.close();
  }
}
process.exitCode = failed ? 1 : 0;
