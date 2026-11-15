// not in the smoke: world art pictures for before/after review, run by hand
// Pictures of the world art for before/after review: the space backdrop at the station, near Kepler-4b and in the belt, the
// planet surface at the landing pad and at the crash site, an explosion and the ore pickup. Saves tests/out/world-*.png and fails
// on a console error or if painting the textures at boot takes too long. Run: node tests/world.mjs
import { launch, sleep } from './cdp.mjs';

let failed = false;
const note = (ok, msg) => { console.log((ok ? '  ok  ' : '  FAIL ') + msg); if (!ok) failed = true; };

async function space() {
  const t = await launch('#space');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 30000, 'Space active');
    const ms = await t.ev('window.waMs'); note(ms < 4000, `textures painted in ${ms} ms`);
    const at = async (name, x, y, extra = '') => {
      await t.ev(`(() => { const s = game.scene.getScene('Space'); s.ship.body.reset(${x}, ${y}); s.cameras.main.centerOn(${x}, ${y}); s.lockUntil = 0; ${extra}; return 1; })()`);
      await sleep(1600); await t.shot(name); console.log('  --  ' + name);
    };
    await sleep(1500); await t.shot('world-space-station');
    await at('world-space-planet', 5760, 2060);
    await at('world-space-belt', 5300, 1500, 'dropOre(s, 5360, 1460); dropOre(s, 5240, 1540)'); // two ore chunks beside the ship
    await at('world-space-deep', 1800, 6200);
    // effects: step the clock by hand so the picture is taken a known time after the blast
    await t.clock();
    await t.ev("(() => { const s = game.scene.getScene('Space'); s.boom.explode(70, s.ship.x + 220, s.ship.y - 40); s.boom.explode(28, s.ship.x - 200, s.ship.y + 80); s.boom.explode(5, s.ship.x + 40, s.ship.y + 120); return 1; })()");
    await t.run(90); await t.shot('world-space-boom1');
    await t.run(200); await t.shot('world-space-boom2');
    await t.ev("(() => { const s = game.scene.getScene('Space'); fxDash(s, s.ship.rotation + Math.PI / 2); fxPickup(s, s.ship.x - 120, s.ship.y - 100, 0xffb454); const r = s.ast.rocks.getChildren()[0]; if (r) breakRock(s, r); return 1; })()");
    await t.run(120); await t.shot('world-space-fx');
    if (t.errors.length) note(false, 'console errors: ' + t.errors.join(' | '));
  } finally { await t.close(); }
}
async function surface() {
  const t = await launch('#surface');
  try {
    await t.waitFor("!!(window.game && game.scene.isActive('Surface'))", 30000, 'Surface active');
    await sleep(2200); await t.shot('world-surface-pad');
    await t.ev("(() => { const s = game.scene.getScene('Surface'); s.player.body.reset(1900, 700); return 1; })()");
    await sleep(1800); await t.shot('world-surface-pod');
    if (t.errors.length) note(false, 'console errors: ' + t.errors.join(' | '));
  } finally { await t.close(); }
}
await space();
await surface();
process.exitCode = failed ? 1 : 0;
