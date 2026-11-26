// not in the smoke: a boot of the Campaign with the map's targets, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-map-targets)
// The rules are in tests/campmaptargets.mjs (plain Node). This boots the belt once and does what Troy does: opens the map, clicks an enemy's mark, sees it set with Fly and Fast, clicks the stack,
// flies, and watches the carrier close on it and hold. One picture of the set target and one of the follow.
//   node tests/campmaptargets-boot.mjs        pictures go to MAPTARGETS_SHOTS (default ~/dev/spacegame-night/shots/maptargets-*.png), never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { beltSource } from './fixtures/campbelt.mjs';
import { mapBtn, mapDest } from './mapboot.mjs'; // the map's buttons and its destination line in either look (the panel look's page elements, the glass look's canvas objects: card space-game-boots-after-looks)
// the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots): this boot was written for it and pins its missions and words; the rim run is checked in tests/camprim.mjs. The address started the Campaign scene on the rim run, so it starts again.
const belt = async t => { await t.ev(beltSource(1)); await t.ev(`(() => { game.scene.stop('Campaign'); game.scene.start('Campaign', { level: 1, techs: [], via: 'address' }); return 1; })()`); };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.MAPTARGETS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
async function clickAt(t, gx, gy) {
  const p = JSON.parse(await t.ev(`(() => { const r = typeof fillSafeRect === 'function' ? fillSafeRect(game.canvas) : game.canvas.getBoundingClientRect(); return JSON.stringify({ x: r.left + ${gx} * r.width / 1280, y: r.top + ${gy} * r.height / 720 }); })() /* the safe area: with ?fill=1 the 1280 by 720 maths stand in the middle of a bigger game (card space-game-boots-fill-screens) */`));
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await t.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  await t.run(100);
}
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'maptargets-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } };

const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await belt(t); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); } // the story card, and a briefing after it where there is one
  check('the flight has started', (await j(`${SC}.mode`)) === 'play');
  // (the units get 1e6 hp: the pilots now start out beside the cruiser and would kill the raiders in the fifteen seconds, which ends the trip as it should; the test kills its target by hand)
  // (the drone stands at x 1000, not 2200: near the right edge the Fly and Fast buttons of its set mark stand to its LEFT, over the raiders' spot, and a click there is a click on a button)
  // two raiders close together (a stack) and a drone alone, held still so the clicks land where they are drawn
  // (PINNED: a held alien wakes when a ship of yours comes within its reach, about 800 px, and then flies at it at 155 px a second; with the cruiser's quicker handling that put it 149 px from the cruiser at the one moment this boot looked, though the cruiser had stopped at its stand-off as it should. The distance read further down must be the autopilot's doing, so after every step of the game these three are put back where they were made, asleep and at rest. Card space-game-maptargets-boot-red)
  await t.ev(`(() => { const C = ${SC}.camp; C.ships = C.ships.filter(u => u.team !== 'alien'); const a = campSpawn(C, 'raider', -300, 1500), b = campSpawn(C, 'raider', -296, 1502), d = campSpawn(C, 'drone', 1000, 1700); [a, b, d].forEach(u => { u.nextShot = 1e9; u.hold = true; u.hp = 1e6; u.pin = { x: u.x, y: u.y }; }); if (!window.__pin) { window.__pin = () => { const K = game.scene.getScene('Campaign').camp; (window.__ids || []).forEach(id => { const u = K && K.by[id]; if (u && u.pin) { u.x = u.pin.x; u.y = u.pin.y; u.vx = 0; u.vy = 0; u.hold = true; } }); }; game.events.on('poststep', window.__pin); } window.__ids = [a.id, b.id, d.id]; return 1; })()`);
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(600);
  check('Tab opens the map', await j(`!!${SC}.mp`));
  const at = (x, y) => j(`(() => { const mp = ${SC}.mp, p = campMapPoint(mp.fit, campMapFrameOf(mp), ${x}, ${y}); return { x: p.x, y: p.y }; })()`);
  const d = await at(1000, 1700);
  await clickAt(t, d.x, d.y); await t.run(300);
  let st = await j(`({ set: ${SC}.mp.setId, nav: !!${SC}.camp.nav, fly: ${mapBtn(SC, 'fly')}.visible, fast: ${mapBtn(SC, 'fast')}.visible, dest: ${mapDest(SC)} })`);
  check('a click on a drone\'s mark SETS it: marked, the two buttons by it, the line says what it is ("Drone N") and how far, no flight', /^alien:drone-/.test(st.set) && !st.nav && st.fly && st.fast && /Drone \d+/.test(st.dest), JSON.stringify(st));
  await snap(t, 'set');
  const s = await at(-300, 1500);
  await clickAt(t, s.x - 1, s.y); await t.run(300);
  const first = await j(`${SC}.mp.setId`);
  await clickAt(t, s.x - 1, s.y); await t.run(300);
  const second = await j(`${SC}.mp.setId`);
  check('two raiders on one spot are a stack: the first click sets one, the second on the same spot takes the other, and neither flies', /^alien:raider-/.test(first) && /^alien:raider-/.test(second) && first !== second && (await j(`!${SC}.camp.nav`)), first + ' | ' + second);
  const b = await j(`(() => { const o = ${mapBtn(SC, 'fly')}; return { x: o.gx, y: o.gy }; })()`);
  await clickAt(t, b.x, b.y); await t.run(300);
  check('the Fly button flies to it: the autopilot is on, regular speed, on that raider', (await j(`!!${SC}.camp.nav && ${SC}.camp.nav.fast === false && ${SC}.camp.nav.id === ${SC}.mp.setId`)) === true);
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(100); // the map closes, the flight goes on
  await t.run(11000);
  const seen = []; // the settled distance, over a window of five seconds: one sample said nothing of holding
  for (let i = 0; i < 5; i++) { await t.run(1000); seen.push(await j(`(() => { const C = ${SC}.camp, u = C.by[C.nav && C.nav.ref], c = C.carrier; return u ? { d: Math.round(campDist(c, u)), v: Math.round(Math.hypot(c.vx, c.vy)), still: Math.hypot(u.vx || 0, u.vy || 0) < 1 } : { d: -1, v: -1, still: false }; })()`)); }
  const stop = await j(`CAMP.nav.stopEnemy`), dist = seen[seen.length - 1].d;
  check('the raider it flies to has not moved (it is held: the distance is the autopilot\'s doing)', seen.every(x => x.still), JSON.stringify(seen));
  check('eleven to sixteen seconds on, the cruiser has come to turret range of it (the stand-off, ' + stop + ' px) and HOLDS there, second after second: never nearer than 80 px inside it nor farther than 80 px outside, at rest by the end, the trip still on', seen.every(x => x.d > stop - 80 && x.d < stop + 80) && seen[seen.length - 1].v < 12 && Math.max(...seen.map(x => x.d)) - Math.min(...seen.map(x => x.d)) < 60 && (await j(`!!${SC}.camp.nav`)), JSON.stringify(seen));
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(500);
  await snap(t, 'follow');
  check('and with the map open the set mark is still marked with its buttons, Fly ON (it is being followed)', (await j(`(() => { const o = ${mapBtn(SC, 'fly')}; return o.visible && o.on; })()`)) === true, await j(`${mapBtn(SC, 'fly')}.text`));
  await t.ev(`(() => { const C = ${SC}.camp, u = C.by[C.nav.ref]; u.hp = 0; return 1; })()`); await t.run(600);
  check('the target is killed: the trip ends (the autopilot is off)', (await j(`${SC}.camp.nav === null`)) === true);
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }
console.log(bad ? `\nMAP TARGETS BOOT FAIL (${bad})` : '\nMAP TARGETS BOOT PASS');
process.exit(bad ? 1 : 0);
