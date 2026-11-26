// not in the smoke: a boot of the Tab map in the panel look, run by hand (one Chrome, muted, through the test lock; card space-game-b3-f-tab-map-build)
// The rules are in tests/campmappanel.mjs (plain Node, a stand-in page). This boots the Campaign with the page HUD and the new ships on (?pagehud=1&shiplook=1: the other boots ask for today's canvas HUD) and does what a player does:
// opens the map with Tab, reads the panels, clicks a row of the list and the Fly pill with the real mouse, sees a radio line land in the map's own panel, zooms, and closes it with Tab and with Esc.
//   node tests/campmappanel-boot.mjs        pictures go to MAPPANEL_SHOTS (default ~/dev/spacegame-night/shots/mappanel-*.png) at 1578 by 1000, never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.MAPPANEL_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const t = await launch('?campaign=1&pagehud=1&shiplook=1', ROOT);
const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
const keyOn = code => t.ev(`(() => { ${SC}.onKey({ code: '${code}', repeat: false }); return 1; })()`);
const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'mappanel-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } };
const centre = sel => j(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
async function click(p) { for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await t.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 }); await t.run(150); }
try {
  await t.send('Emulation.setDeviceMetricsOverride', { width: 1578, height: 1000, deviceScaleFactor: 1, mobile: false });
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await keyOn('Enter'); await t.run(300); }
  check('the flight has started with the page HUD up', (await j(`${SC}.mode`)) === 'play' && (await j(`!!document.querySelector('.ph-root')`)));
  await t.run(20000);
  await t.key('TAB'); await t.run(900);
  check('Tab opens the map in its card (mp.dom, its own frame), and the page HUD\'s panels are taken away while it is up', await j(`(() => { const s = ${SC}; return !!s.mp && s.mp.dom === true && s.mp.F.w === CAMPMAPPANEL.frame.w && document.querySelectorAll('.ph-root').length === 1 && !!document.querySelector('.mp-root'); })()`));
  check('the panels lie over the canvas rectangle (the root is the canvas\'s place and size)', await j(`(() => { const c = ${SC}.game.canvas.getBoundingClientRect(), r = document.querySelector('.mp-root').getBoundingClientRect(); return Math.abs(c.left - r.left) < 1.5 && Math.abs(c.top - r.top) < 1.5 && Math.abs(c.width - r.width) < 1.5 && Math.abs(c.height - r.height) < 1.5; })()`));
  check('the header, the goal panel and the list are painted from the model: Map · Level 1, The rim run, Goal, Fly to, a gold first row, no GOAL heading', await j(`(() => { const q = c => [...document.querySelectorAll('.mp-root ' + c)].map(e => e.textContent).join('|'); return q('.ph-lab').includes('Map · Level 1') && q('.mp-title') === 'The rim run' && q('.mp-gold') === 'Goal' && q('.mp-list').includes('Fly to') && !q('.mp-list').includes('GOAL') && document.querySelectorAll('.mp-tile').length >= 5 && document.querySelector('.mp-tile').className.includes('goal'); })()`));
  check('every part of the card is inside the screen and the column does not touch the card', await j(`(() => { const R = document.querySelector('.mp-root').getBoundingClientRect(), box = s => { const r = document.querySelector(s).getBoundingClientRect(); return r; }, h = box('.mp-head'), f = box('.mp-foot'), c = box('.mp-col'); return h.left >= R.left && f.bottom <= R.bottom + 1 && c.right <= R.right + 1 && c.left >= h.right - 1; })()`));
  await snap('01-open');
  // the real mouse: a row of the list sets that place, and the Fly pill starts the trip
  const row = await j(`(() => { const e = [...document.querySelectorAll('.mp-tile')].find(x => /^Earth/.test(x.textContent)); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`); await click(row); // Earth: Luna is where the cruiser is ("We are already at Luna"), so a trip there is not one
  check('a click on a row of the list sets that place and shows the Set panel and the Fly and Fast pills', await j(`(() => { const s = ${SC}; return !!s.mp.setId && [...document.querySelectorAll('.mp-btn')].filter(e => e.style.display !== 'none').length >= 2; })()`));
  await t.run(300); await snap('02-place-set');
  const fly = await centre('.mp-btn'); await click(fly);
  check('a click on the Fly pill starts the trip (the autopilot is on)', await j(`!!${SC}.camp.nav && !!${SC}.camp.nav.on`));
  // the radio line comes to its own panel, and there is no box over the map
  await t.ev(`(() => { toast(${SC}, 'Pirates on me, west of you!', '#ff8da0'); return 1; })()`); await t.run(300);
  check('a radio line while the map is open lands in the radio panel, and no box is made over the map', await j(`(() => { const r = document.querySelector('.mp-radio'); return r.style.display !== 'none' && r.textContent.includes('Pirates on me') && !(${SC}.toasts || []).some(o => o && o.t && o.t.active); })()`));
  await snap('03-radio');
  for (let i = 0; i < 3; i++) await keyOn('Minus'); await t.run(1200);
  check('the zoom keys work over the card: the zoom pill says so, and the area pill says the whole system', await j(`(() => { const p = [...document.querySelectorAll('.mp-pill')].map(e => e.textContent); return /%$/.test(p[0]) && p[0] !== '100%' && /^System /.test(p[1]); })()`), JSON.stringify(await j(`[...document.querySelectorAll('.mp-pill')].map(e => e.textContent)`)));
  await snap('04-zoom-out');
  await t.key('TAB'); await t.run(500);
  check('Tab closes the map: no page element of it is left and the flight\'s own panels come back', await j(`(() => { const s = ${SC}; return !s.mp && !document.querySelector('.mp-root') && !!document.querySelector('.ph-root'); })()`));
  await t.key('TAB'); await t.run(500); await keyOn('Escape'); await t.run(500);
  check('Esc closes it too, and it does not pause the battle', await j(`(() => { const s = ${SC}; return !s.mp && !document.querySelector('.mp-root') && s.mode === 'play'; })()`));
  check('no errors in the game', (t.errors || []).length === 0, (t.errors || []).join(' | '));
} finally { await t.close(); }
console.log(bad ? `MAP PANEL BOOT FAIL (${bad})` : 'MAP PANEL BOOT PASS');
process.exitCode = bad ? 1 : 0;
