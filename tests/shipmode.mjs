// Ship mode (src/shipmode.js): boarding the ship opens a prep screen instead of launching. Real key presses over DevTools, real time.
//   E at YOUR SHIP -> Ship scene (no Space yet) -> look: status, mission, controls, LAUNCH -> Enter launches; Esc goes back; Tab opens
//   the map over it and its Esc does not leave the bay; keys inside the first 350 ms (the E that boarded) are ignored.
// Run: node tests/shipmode.mjs   (exit code 1 on any failure). One Chrome, closed at the end.
import { launch, sleep } from './cdp.mjs';

const SH = "game.scene.getScene('Ship')", ST = "game.scene.getScene('Station')";
const t = await launch('#station');
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) fails++; };
const texts = () => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${SH}.children.list.forEach(walk); return out.join('|'); })()`);
const active = k => t.ev(`game.scene.isActive('${k}')`);
const boardShip = async () => { await t.ev(`${ST}.player.setPosition(1090, 360)`); await sleep(250); await t.press('E'); await t.waitFor("game.scene.isActive('Ship')", 10000, 'ship bay'); await sleep(700); }; // past the grace

try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station active');
  await sleep(600);
  await t.ev("(() => { G.mission = 'none'; G.missionId = null; G.credits = 1234; G.hull = G.maxHull; return 1; })()");

  console.log('A. boarding opens the bay, it does not launch');
  await t.ev(`${ST}.player.setPosition(1090, 360)`); await sleep(250);
  check('prompt says Board your ship', (await t.ev(`${ST}.prompt.text`)).includes('Board your ship'));
  await t.press('E');
  await t.waitFor("game.scene.isActive('Ship')", 10000, 'ship bay');
  await sleep(1500);
  check('Ship scene is up', await active('Ship'));
  check('Space did not start by itself', !(await active('Space')));
  const s1 = await texts();
  ['SHIP BAY', 'SHIP STATUS', 'HULL INTEGRITY', 'CARGO HOLD', 'UPGRADES', 'MISSION', 'NO MISSION TAKEN', 'CONTROLS', 'LAUNCH', 'Thrust', 'Boost with thrust', 'Dock or land', 'Back to station', '1,234 CR']
    .forEach(w => check('shows ' + w, s1.includes(w), w));
  await t.shot('shipmode-1-no-mission');

  console.log('B. with a mission and a damaged hull');
  await t.ev("(() => { G.mission = 'accepted'; G.missionId = 'rescue'; G.hull = 30; G.upgrades.armor = 1; G.upgrades.rapid = 2; G.ore = 4; return 1; })()");
  await t.ev(`${SH}.scene.restart()`); await sleep(1800);
  const s2 = await texts();
  check('mission card names the rescue', s2.includes('RESCUE CALL') && s2.includes('PAYS 500 cr'), s2.slice(0, 0));
  check('hull warning shows', s2.includes('REPAIR') && s2.includes('30%'));
  check('part tiers show (shields, weapons)', s2.includes('LIGHT SHIELD') && s2.includes('RAPID FIRE II'));
  check('hold shows ore', s2.includes('4 / 10 ore'));
  await t.shot('shipmode-2-mission-damaged');

  console.log('C. keys');
  await t.ev(`${SH}.ignoreUntil = performance.now() + 5000`);
  await t.press('ENTER'); await sleep(400);
  check('Enter inside the grace window does not launch', (await active('Ship')) && !(await active('Space')));
  await t.ev(`${SH}.ignoreUntil = 0`);
  await t.press('E'); await sleep(300);
  check('E does not launch', (await active('Ship')) && !(await active('Space')));
  await t.press('TAB'); await t.waitFor("game.scene.isActive('Overlay')", 5000, 'map overlay');
  check('Tab opens the sector map over the bay', await active('Overlay'));
  await t.press('ESC'); await sleep(900);
  check('Esc closes the map and the bay stays', (await active('Ship')) && !(await active('Overlay')) && !(await active('Station')), 'ship=' + await active('Ship'));
  await t.press('ESC');
  await t.waitFor("game.scene.isActive('Station') && !game.scene.isActive('Ship')", 8000, 'back at the station');
  check('Esc goes back to the station', await active('Station'));
  check('the station does not show the pause menu', !(await active('Pause')));

  console.log('D. launch');
  await boardShip();
  const hull0 = await t.ev('G.hull');
  await t.press('ENTER');
  await t.waitFor("game.scene.isActive('Space')", 10000, 'space');
  check('Enter launches into Space', await active('Space'));
  check('hull, mission and upgrades carried over', (await t.ev("G.hull === " + hull0 + " && G.mission === 'accepted' && G.upgrades.rapid === 2")));
  check('the Ship scene is gone', !(await active('Ship')));
  check('no JS errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.log('  FAIL ' + e.message); fails++;
} finally {
  await t.close();
}
console.log(fails ? `SHIPMODE FAIL (${fails})` : 'SHIPMODE PASS');
process.exit(fails ? 1 : 0);
