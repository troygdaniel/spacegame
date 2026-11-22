// not in the smoke: the Campaign's ship systems in a real fight, one picture, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-systems)
// The rules are in tests/campsystems.mjs (plain Node). This boots level 1, moves pips with J K L on the SHIP panel (always on the screen: there is no SYSTEMS panel to open since card space-game-two-hands-keys), fires the emergency shields with U, and takes pictures of the HUD gauges (their power bars) and of the SHIP panel
// (the draw is Phaser's: the panel on a fight's background, the three gauges with a bar of power segments beside each). It also looks at what the screen holds: the SHIP panel's power rows are on the screen, the pips are the sim's, the saved
// setting is kept, the emergency is not.
//   node tests/campsystems-boot.mjs
// The pictures go to the folder in SYSTEMS_SHOTS (default ~/dev/spacegame-night/shots/systems-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.SYSTEMS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  const shot = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'systems-' + name + '.png'), Buffer.from(r.data, 'base64')); } }; // twice: the second has drawn
  const key = code => t.ev(`(() => { ${SC}.onKey({ code: '${code}', repeat: false }); return 1; })()`);
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(300); } // the intro card, and the missions' briefing after it
  check('the battle is on (the cards are out of the way)', (await j(`${SC}.mode`)) === 'play', await j(`${SC}.mode`));
  check('a new battle starts at 2 / 2 / 2 with the three gauges and their power bars on the HUD (SHIELDS, SPEED, LASERS: card space-game-systems-gauges replaced the W S E pips)', await j(`JSON.stringify(${SC}.camp.power.p) === '[2,2,2]' && !!${SC}.hud.gauges && ${SC}.hud.gauges.l.map(t => t.text).join() === 'SHIELDS,SPEED,LASERS' && JSON.stringify(${SC}.gaugeAnim.shown) === '[2,2,2]'`));
  await t.run(500);
  check('the SHIP panel is on the screen from the start with its power rows: J shields, K engines, L weapons, ; balance, U emergency', await j(`JSON.stringify(${SC}.pnl.p.ship.rows.slice(4, 9).map(r => r.key.text + ' ' + r.name.text.split(' ')[0])) === JSON.stringify(['J Shields', 'K Engines', 'L Weapons', '; Balance', 'U Emergency'])`), await j(`${SC}.pnl.p.ship.rows.slice(4, 9).map(r => r.key.text + ' ' + r.name.text)`)); // (the panels are built once, one object each: s.pnl.p[id])
  await shot('1-panel');
  await key('KeyJ'); await t.run(300);
  check('J is "power to shields": 1 / 3 / 2, the pips follow on the HUD, the panel stays', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]' && ${SC}.pnl.p.ship.rows[4].name.visible`));
  check('the setting is saved at once (the next level starts from it)', await j(`JSON.stringify(campPowerLoad()) === '[1,3,2]'`));
  await key('KeyU'); await t.run(300);
  check('U: emergency shields: 1 / 4 / 1 for ten seconds, the setting still 1 / 3 / 2 and the HUD shields row white', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,4,1]' && JSON.stringify(${SC}.camp.power.base) === '[1,3,2]'`));
  await t.run(1500); await shot('2-emergency');
  await t.run(9500);
  check('after ten seconds the pips are back to the setting', await j(`JSON.stringify(${SC}.camp.power.p) === '[1,3,2]'`));
  await t.run(500);
  check('the panel says the emergency is cooling down (ready in N s) and the saved setting never held the emergency', await j(`/^[0-9]+ s$/.test(${SC}.pnl.p.ship.rows[8].suffix.text) && JSON.stringify(campPowerLoad()) === '[1,3,2]'`), await j(`${SC}.pnl.p.ship.rows[8].suffix.text`));
  await shot('3-cooling');
  await key('KeyH'); await t.run(400);
  check('H opens the page of every key and it lists the SHIP panel (the right hand)', await j(`!!${SC}.ck && ${SC}.ck.open === true`));
  await shot('4-keys'); await key('KeyH'); await t.run(200);
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `CAMP SYSTEMS BOOT FAIL (${bad})` : 'CAMP SYSTEMS BOOT PASS');
process.exit(bad ? 1 : 0);
