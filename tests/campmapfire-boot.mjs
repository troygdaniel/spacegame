// not in the smoke: the Campaign's Tab map in a real fight, one picture, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-map-lasers)
// The rules are in tests/campmapfire.mjs (plain Node). This boots level 1, puts a few raiders and drones on the carrier, launches the wing, holds Space (the turrets fire), steps the clock
// by hand, opens the Tab map in the middle of it and takes ONE picture: the volleys, the bullets, the rings and the flashes, thin, on the map. It also looks at what the map holds:
// marks alive while the fight goes on (and never more than the pool), the closed map keeping none, no console error.
//   node tests/campmapfire-boot.mjs
// The picture goes to the folder in MAPFIRE_SHOTS (default ~/dev/spacegame-night/shots/mapfire-fight.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.MAPFIRE_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); } // the intro card, and the mission's briefing after it
  // a fight: eight aliens round the carrier, the wing out and told to attack, Space held for the turrets
  await t.ev(`(() => { const S = ${SC}, C = S.camp, c = C.carrier; C.god = true;
    for (let i = 0; i < 8; i++) { const a = i / 8 * 2 * Math.PI, u = campSpawn(C, i % 2 ? 'drone' : 'raider', c.x + Math.cos(a) * 900, c.y + Math.sin(a) * 900); if (u) u.goal = 'carrier'; }
    campOrder(C, 'launch', '', 'key'); S.k.SPACE.isDown = true; return 1; })()`);
  await t.run(3500);
  await t.ev(`(() => { campOrder(${SC}.camp, 'attack', '', 'key'); return 1; })()`); await t.run(1500);
  check('the fight is on: shots in the air and aliens about', await j(`${SC}.camp.bullets.length > 0 && ${SC}.camp.ships.some(u => u.team === 'alien')`));
  check('with the map closed the pool does not exist and nothing is kept', await j(`!${SC}.mp`));
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(100);
  check('Tab opens the map', await j(`!!${SC}.mp`));
  const shot = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, name), Buffer.from(r.data, 'base64')); } }; // twice: the second is the one that has drawn
  let most = 0, drawn = 0, shotAt = 0;
  for (let i = 0; i < 60; i++) { await t.run(100); const n = await j(`${SC}.mp.fire.slots.filter(s => s.on).length`); if (n > most) most = n; drawn = Math.max(drawn, await j(`${SC}.camp.bullets.length`)); if (n >= 8 && !shotAt) { shotAt = n; await shot('mapfire-fight.png'); } }
  check('marks are alive while the fight goes on, and never more than the pool', most > 0 && most <= await j('CAMPFIRE.pool'), 'most alive ' + most);
  check('the pool is the same size it started with', await j(`${SC}.mp.fire.slots.length === CAMPFIRE.pool`));
  // what the painting costs: campFirePaint alone, on a Graphics that does nothing, over the live battle and pool (the page clock is good to 0.1 ms, so a loop of 3000)
  const cost = await j(`(() => { const S = ${SC}, C = S.camp, mp = S.mp, nop = { lineStyle() { return this; }, lineBetween() { return this; }, strokeCircle() { return this; }, fillStyle() { return this; }, fillCircle() { return this; } };
    for (let i = 0; i < 200; i++) campFirePaint(mp.fire, C, nop, CAMPMAP.frame, mp.fit, performance.now());
    const t0 = performance.now(); let n = 0; for (let i = 0; i < 3000; i++) n += campFirePaint(mp.fire, C, nop, CAMPMAP.frame, mp.fit, performance.now()); return { ms: (performance.now() - t0) / 3000, things: n / 3000, bullets: C.bullets.length }; })()`);
  console.log('  paint cost: ' + cost.ms.toFixed(4) + ' ms a frame for ' + cost.things.toFixed(1) + ' things (' + cost.bullets + ' bullets in the air)');
  check('painting the fight costs well under a tenth of a millisecond a frame', cost.ms < 0.1, cost.ms.toFixed(4) + ' ms');
  for (let i = 0; i < 6; i++) await t.run(100);
  if (!shotAt) await shot('mapfire-fight.png'); // the fight never had eight marks at once: the last moment, then
  console.log('  picture taken with ' + (shotAt || 'few') + ' marks alive');
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(300);
  check('Tab closes the map and the pool goes with it', await j(`!${SC}.mp`));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `CAMP MAP FIRE BOOT FAIL (${bad})` : 'CAMP MAP FIRE BOOT PASS');
process.exit(bad ? 1 : 0);
