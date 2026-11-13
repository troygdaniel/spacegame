// Pirate bounty you can see: node tests/bounty.mjs
// Kills one raider, one drone and one gunship in flight and checks what each pays, the gold BOUNTY +N text, the HUD
// credits glow, the chime, the per-flight count, and the "Bounty this flight" toast on docking.
// Saves tests/out/bounty-kill.png (a moment after a gunship kill) and bounty-dock.png. Exit code 1 on a failed check or a console error.
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')", ST = "game.scene.getScene('Station')";
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500);
  await t.ev('G.guideDone = true');
  // a quiet sky: no pirates but the ones this test makes
  await t.ev(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); bountyReset(); G.credits = 0; })()`);

  // the pulse lasts 0.65 s and the text 1.3 s, so both are read in the same evaluation as the kill (a busy Mac can take longer than that between calls)
  const kill = (type, dx) => t.ev(`(() => { const s = ${SP}; const c0 = G.credits; const d = spawnPirate(s, s.ship.x + ${dx}, s.ship.y - 140, '${type}'); d.hp = 1; s.killDrone(d); const paid = G.credits - c0; return { paid, pulse: !!(s._hud && s._hud.pulse > s.time.now), text: s.children.list.some(o => o.type === 'Text' && o.text === 'BOUNTY +' + paid) }; })()`);
  await t.ev(`(() => { const s = ${SP}; (s.toasts || []).forEach(o => { o.t.destroy(); o.bg.destroy(); o.tab.destroy(); }); s.toasts = []; })()`); // the launch toast hides the credits strip in the picture
  const k1 = await kill('raider', -160), k2 = await kill('drone', 0), k3 = await kill('gunship', 160);
  const paid = { raider: k1.paid, drone: k2.paid, gunship: k3.paid };
  await sleep(100);
  if (!(await t.shot('bounty-kill'))) check('screenshot of a kill', false); // the text, coins, boom and the lit credits strip
  check('a raider pays 45', paid.raider === 45, 'paid ' + paid.raider);
  check('a drone pays 40', paid.drone === 40, 'paid ' + paid.drone);
  check('a gunship pays 100', paid.gunship === 100, 'paid ' + paid.gunship);
  check('G.flight counts 3 kills and 185 cr', await t.ev(`G.flight.kills === 3 && G.flight.bounty === 185`), await t.ev('JSON.stringify(G.flight)'));
  check('two of the cheapest kills cover a full repair of a fully armoured hull (140 hp, half a credit a point)',
    await t.ev(`2 * Math.min(PIRATES.raider.bounty, PIRATES.drone.bounty, PIRATES.gunship.bounty) >= Math.ceil((100 + 20 * 2) * 0.5)`));
  check('the Reaver, which has no bounty field, still pays its credits figure', await t.ev(`bountyOf(REAVER) === REAVER.credits`));
  check('each kill floats its own gold "BOUNTY +N" at the wreck', k1.text && k2.text && k3.text, [k1.text, k2.text, k3.text].join(' '));
  check('the HUD credits strip is set to pulse on a kill', k1.pulse && k2.pulse && k3.pulse);
  check('the bounty chime exists and plays without an error', await t.ev(`typeof SFX.bounty === 'function' && (sfx('bounty'), true)`));

  // docking: the toast says what the flight paid, then the count starts again
  // the toast shows 1.7 s after docking and fades by 3.4 s later, so a busy Mac can poll past it: record every toast instead
  await t.ev(`(() => { window.__toasts = []; const orig = toast; toast = (s, msg, c) => { window.__toasts.push(msg); return orig(s, msg, c); }; })()`);
  await t.ev(`go(${SP}, 'Station', { arrive: true })`);
  await t.waitFor(`!!(window.game && game.scene.isActive('Station'))`, 20000, 'Station active');
  await t.waitFor(`window.__toasts.some(m => /^Bounty this flight/.test(m))`, 20000, 'the bounty toast');
  const line = await t.ev(`window.__toasts.find(m => /^Bounty this flight/.test(m))`);
  check('docking toast: "Bounty this flight: +185 cr  (3 pirates)"', line === 'Bounty this flight: +185 cr  (3 pirates)', JSON.stringify(line));
  check('the count starts again after docking', await t.ev(`G.flight.kills === 0 && G.flight.bounty === 0`));
  if (!(await t.shot('bounty-dock'))) check('screenshot of the dock toast', false);
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
console.log(bad ? 'BOUNTY FAIL' : 'BOUNTY PASS');
process.exitCode = bad ? 1 : 0;
