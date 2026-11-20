// not in the smoke: a boot of the Campaign with the map's targets, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-map-targets)
// The rules are in tests/campmaptargets.mjs (plain Node). This boots the belt once and does what Troy does: opens the map, clicks an enemy's mark, sees it set with Fly and Fast, clicks the stack,
// flies, and watches the carrier close on it and hold. One picture of the set target and one of the follow.
//   node tests/campmaptargets-boot.mjs        pictures go to MAPTARGETS_SHOTS (default ~/dev/spacegame-night/shots/maptargets-*.png), never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.MAPTARGETS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
async function clickAt(t, gx, gy) {
  const p = JSON.parse(await t.ev(`(() => { const r = game.canvas.getBoundingClientRect(); return JSON.stringify({ x: r.left + ${gx} * r.width / 1280, y: r.top + ${gy} * r.height / 720 }); })()`));
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await t.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  await t.run(100);
}
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'maptargets-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } };

const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); } // the story card, and a briefing after it where there is one
  check('the flight has started', (await j(`${SC}.mode`)) === 'play');
  // two raiders close together (a stack) and a drone alone, held still so the clicks land where they are drawn
  await t.ev(`(() => { const C = ${SC}.camp; C.ships = C.ships.filter(u => u.team !== 'alien'); const a = campSpawn(C, 'raider', -300, 1500), b = campSpawn(C, 'raider', -296, 1502), d = campSpawn(C, 'drone', 2200, 1700); [a, b, d].forEach(u => { u.nextShot = 1e9; u.hold = true; }); window.__ids = [a.id, b.id, d.id]; return 1; })()`);
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(600);
  check('Tab opens the map', await j(`!!${SC}.mp`));
  const at = (x, y) => j(`(() => { const mp = ${SC}.mp, p = campMapPoint(mp.fit, CAMPMAP.frame, ${x}, ${y}); return { x: p.x, y: p.y }; })()`);
  const d = await at(2200, 1700);
  await clickAt(t, d.x, d.y); await t.run(300);
  let st = await j(`({ set: ${SC}.mp.setId, nav: !!${SC}.camp.nav, fly: ${SC}.mp.btnFly.visible, fast: ${SC}.mp.btnFast.visible, dest: ${SC}.mp.dest.text })`);
  check('a click on a drone\'s mark SETS it: marked, the two buttons by it, the line says what it is ("Drone N") and how far, no flight', /^alien:drone-/.test(st.set) && !st.nav && st.fly && st.fast && /Drone \d+/.test(st.dest), JSON.stringify(st));
  await snap(t, 'set');
  const s = await at(-300, 1500);
  await clickAt(t, s.x - 1, s.y); await t.run(300);
  const first = await j(`${SC}.mp.setId`);
  await clickAt(t, s.x - 1, s.y); await t.run(300);
  const second = await j(`${SC}.mp.setId`);
  check('two raiders on one spot are a stack: the first click sets one, the second on the same spot takes the other, and neither flies', /^alien:raider-/.test(first) && /^alien:raider-/.test(second) && first !== second && (await j(`!${SC}.camp.nav`)), first + ' | ' + second);
  const b = await j(`({ x: ${SC}.mp.btnFly.x + 12, y: ${SC}.mp.btnFly.y + 8 })`);
  await clickAt(t, b.x, b.y); await t.run(300);
  check('the Fly button flies to it: the autopilot is on, regular speed, on that raider', (await j(`!!${SC}.camp.nav && ${SC}.camp.nav.fast === false && ${SC}.camp.nav.id === ${SC}.mp.setId`)) === true);
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(100); // the map closes, the flight goes on
  await t.run(16000);
  const dist = await j(`(() => { const C = ${SC}.camp, u = C.by[C.nav && C.nav.ref]; return u ? Math.round(campDist(C.carrier, u)) : -1; })()`);
  check('about fifteen seconds on, the carrier has come to turret range (about 400 px) of it and holds there: the trip is still on', dist > 200 && dist < 700 && (await j(`!!${SC}.camp.nav`)), dist + ' px');
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(500);
  await snap(t, 'follow');
  check('and with the map open the set mark is still marked with its buttons, Fly ON (it is being followed)', (await j(`${SC}.mp.btnFly.visible && /ON$/.test(${SC}.mp.btnFly.text)`)) === true, await j(`${SC}.mp.btnFly.text`));
  await t.ev(`(() => { const C = ${SC}.camp, u = C.by[C.nav.ref]; u.hp = 0; return 1; })()`); await t.run(600);
  check('the target is killed: the trip ends (the autopilot is off)', (await j(`${SC}.camp.nav === null`)) === true);
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `\nMAP TARGETS BOOT FAIL (${bad})` : '\nMAP TARGETS BOOT PASS');
process.exit(bad ? 1 : 0);
