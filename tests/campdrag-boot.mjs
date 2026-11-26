// not in the smoke: dragging the view in the real game (one Chrome, muted, through the test lock; card space-game-drag-view)
// It boots mission 1.1 and, with real mouse events, drags the flight view and the Tab map: the camera lets go of the cruiser and moves by the hand over the zoom, stays while the battle goes on, shows the RECENTRE
// mark, zooms about the pointer, and comes back by a click on the mark, Q and a flying key held; a click without a drag still works on the map. Pictures go to HUNT_SHOTS.
//   node tests/campdrag-boot.mjs [--level 1] [--mission 1]        pictures go to HUNT_SHOTS (default ~/dev/spacegame-night/shots/drag-*.png), never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.HUNT_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const LEVEL = Number(arg('level', 1)), MISSION = Number(arg('mission', 1));
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const note = s => console.log('  note ' + s);
const VK = { KeyQ: 81, KeyK: 75, KeyL: 76, Backspace: 8, KeyS: 83, Enter: 13, Tab: 9, ArrowUp: 38 };
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), S = `game.scene.getScene('Campaign')`;
  const zr = async () => (await j(`campKeyCodes('zoomreset')[0] || ''`)) || 'KeyQ'; // the key that puts the zoom and the view back and opens the cruiser list, read from the key table (Q since card space-game-keys5-qwe; it was S)
  const kd = code => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Backspace' ? 'Backspace' : code === 'Tab' ? 'Tab' : code === 'ArrowUp' ? 'ArrowUp' : code.replace(/^(Key|Digit)/, '').toLowerCase() });
  const keyDown = async code => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code))); };
  const keyUp = async code => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code))); };
  const key = async (code, wait = 60) => { await keyDown(code); await t.run(wait); await keyUp(code); await t.run(wait); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `drag-${LEVEL}${MISSION}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(60); } };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  // game pixels to the page's: the canvas may be scaled to the window
  await t.waitFor(`!!(window.game && game.canvas)`, 30000, 'the canvas');
  const toPage = (gx, gy) => j(`(() => { const b = typeof fillSafeRect === 'function' ? fillSafeRect(game.canvas) : game.canvas.getBoundingClientRect(); return { x: b.left + ${gx} * b.width / 1280, y: b.top + ${gy} * b.height / 720 }; })()`); // (the 1280 by 720 maths of this walk are the SAFE AREA's: with ?fill=1 the game is bigger than that and the safe area stands in the middle of it: src/fillwindow.js fillSafeRect, card space-game-boots-fill-screens)
  const mouse = async (type, gx, gy, extra = {}) => { const p = await toPage(gx, gy); await t.send('Input.dispatchMouseEvent', Object.assign({ type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: type === 'mouseMoved' ? 0 : 1 }, extra)); };
  const drag = async (x0, y0, x1, y1, steps = 8) => { await mouse('mouseMoved', x0, y0, { buttons: 0 }); await mouse('mousePressed', x0, y0); await t.run(40); for (let i = 1; i <= steps; i++) { await mouse('mouseMoved', x0 + (x1 - x0) * i / steps, y0 + (y1 - y0) * i / steps, { button: 'left', buttons: 1 }); await t.run(30); } await mouse('mouseReleased', x1, y1); await t.run(60); };
  const click = async (x, y) => { await mouse('mouseMoved', x, y, { buttons: 0 }); await mouse('mousePressed', x, y); await t.run(40); await mouse('mouseReleased', x, y); await t.run(60); };
  const cam = () => j(`(() => { const c = ${S}.cameras.main, ca = ${S}.camp.carrier; const fx = typeof fillSX === 'function' ? fillSX(c) : c.scrollX, fy = typeof fillSY === 'function' ? fillSY(c) : c.scrollY; return { sx: fx, sy: fy, z: c.zoom, follow: !!c._follow, panned: !!${S}.panned, mark: !!(${S}.dragMark && ${S}.dragMark.on), cx: ca.x, cy: ca.y, mid: { x: fx + 640, y: fy + 360 } }; })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  const res = { score: 2000, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, results = {};
  for (let l = 1; l <= LEVEL; l++) for (let m = 1; m <= 3; m++) if (l < LEVEL || m < MISSION) results[l + '.' + m] = res;
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify({ level: LEVEL, mission: MISSION - 1, techs: LEVEL === 1 ? [] : ['shield'], ore: 60, bonus: { fighters: 0, escorts: 0 }, results }))})`);
  await key('KeyK'); await settle(`game.scene.isActive('CampHub') && game.scene.getScene('CampHub').player`); await t.run(900);
  await key('KeyL'); await t.run(400); await key('KeyL'); // (card space-game-ready-l-briefing-first: the first L opens the briefing, the second launches)
  if (await settle(`game.scene.isActive('CampWarp')`, 30)) { await t.run(1500); await key('Enter'); }
  check('the Campaign scene starts on the mission', await settle(`game.scene.isActive('Campaign') && ${S}.camp`));
  for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(700); }
  check('the battle is in play', (await j(`${S}.mode`)) === 'play');
  await t.ev(`(() => { ${S}.camp.god = true; })()`); await t.run(900);

  // ---- the flight view ----
  const c0 = await cam();
  check('the camera follows the cruiser at the start and nothing is off', c0.follow && !c0.panned && !c0.mark, JSON.stringify(c0));
  await snap('1-before');
  await drag(800, 300, 500, 450);
  const c1 = await cam(), d1x = (c1.sx - c0.sx) * c1.z, d1y = (c1.sy - c0.sy) * c1.z;
  note(`dragged 300 px left and 150 down: the camera moved ${d1x.toFixed(0)}, ${d1y.toFixed(0)} screen px (zoom ${c1.z.toFixed(3)}); the cruiser moved ${((c1.cx - c0.cx)).toFixed(0)}, ${((c1.cy - c0.cy)).toFixed(0)}`);
  check('a drag takes the camera off the cruiser: not following, off, the mark on', !c1.follow && c1.panned && c1.mark, JSON.stringify(c1));
  check('the world followed the hand: 300 px left and 150 down moved the camera 300 px right and 150 up on the screen (the cruiser has hardly moved)', Math.abs(d1x - 300) < 40 && Math.abs(d1y + 150) < 40, d1x.toFixed(0) + ', ' + d1y.toFixed(0));
  await t.run(1500);
  const c2 = await cam();
  check('it stays where it was put while the battle goes on (the camera does not drift back to the cruiser)', Math.abs(c2.sx - c1.sx) < 60 && Math.abs(c2.sy - c1.sy) < 60 && c2.panned, JSON.stringify([c1.sx, c2.sx]));
  await snap('2-panned-with-mark');
  const mk = await j(`({ x: ${S}.dragMark.t.x, y: ${S}.dragMark.t.y, w: ${S}.dragMark.t.width, text: ${S}.dragMark.t.text })`);
  check('the mark says RECENTRE and names the reset key from the table (Q)', /RECENTRE/.test(mk.text) && mk.text.includes((await j(`CAMP_KEYS.zoomreset.k`)) || 'Q'), JSON.stringify(mk));
  // the wheel zooms about the pointer: the world point under it stays under it
  const under = (c, sx, sy) => ({ x: c.sx + 640 + (sx - 640) / c.z, y: c.sy + 360 + (sy - 360) / c.z });
  const w0 = await cam(), p0 = under(w0, 900, 200);
  const p = await toPage(900, 200); for (let i = 0; i < 4; i++) { await t.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: p.x, y: p.y, deltaX: 0, deltaY: -100 }); await t.run(60); }
  await t.run(900);
  const w1 = await cam(), p1 = under(w1, 900, 200);
  check('the wheel zoomed in (the zoom grew) and the world point under the pointer stayed under it', w1.z > w0.z * 1.2 && Math.hypot(p1.x - p0.x, p1.y - p0.y) < 6 / w1.z + 3, `zoom ${w0.z.toFixed(3)} -> ${w1.z.toFixed(3)}, the point moved ${Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(1)} world px`);
  // a click on the mark brings the view back
  const m2 = await j(`({ x: ${S}.dragMark.t.x, y: ${S}.dragMark.t.y })`); await click(m2.x, m2.y); await t.run(1800);
  const c3 = await cam();
  check('a click on the mark puts the camera back on the cruiser: following, no mark, the cruiser in the middle', c3.follow && !c3.panned && !c3.mark && Math.hypot(c3.mid.x - c3.cx, c3.mid.y - c3.cy) < 20, JSON.stringify(c3));
  // Q (the zoom reset and the cruiser list: it was S until card space-game-keys5-qwe)
  await drag(700, 300, 400, 300); check('dragged again: off the cruiser', (await cam()).panned);
  await key(await zr(), 40); await t.run(1800);
  const c4 = await cam(); check('Q recentres the flight view (and puts the zoom back to the start 0.335)', c4.follow && !c4.panned && Math.abs(c4.z - 1 / Math.pow(1.2, 6)) < 0.01, JSON.stringify(c4));
  // a flying key held: not at once, then yes
  await drag(700, 300, 400, 300); await keyDown('ArrowUp'); await t.run(150);
  check('a flying key held a moment does not take the view back yet (150 ms of 350)', (await cam()).panned);
  await t.run(500); await keyUp('ArrowUp'); await t.run(300);
  check('held past 350 ms it does', !(await cam()).panned);
  // a drag that starts on an open list is the list's click, not a pan
  if (!(await j(`!!campPanelOpen(${S}.pn)`))) { await key(await zr()); await t.run(300); } // the Q that recentred the flight view above opened the cruiser list too, and a held arrow since kept it from fading: a second Q would shut it, so it is opened only when it is not open (the walk stopped here on the batch of 25 Nov: no list, no geometry)
  check('the cruiser list is open for the drag that starts on it', !!(await j(`campPanelOpen(${S}.pn)`)), String(await j(`campPanelOpen(${S}.pn)`)));
  const lp = await j(`(() => { const e = document.querySelector('.ph-list .ph-lf2'), sr = typeof fillSafeRect === 'function' ? fillSafeRect(game.canvas) : game.canvas.getBoundingClientRect(); if (e && e.offsetParent !== null) { const r = e.getBoundingClientRect(); return { x: (r.left + 20 - sr.left) * 1280 / sr.width, y: (r.top + r.height / 2 - sr.top) * 720 / sr.height, dom: true }; } const def = campPanelDef(campPanelOpen(${S}.pn)), V = campPanelView(${S}.pn, ${S}.camp), G = campPanelsGeometry(def, V.total); return { x: G.x + 20, y: G.foot.y + G.foot.h / 2 }; })()`); // (with the page HUD the open list is a panel of the page, card space-game-lists-panel-look: its foot is a page element; the canvas list's geometry is for ?pagehud=0) // the foot of the list (its Esc line), not a row: a row's click gives its order and closes the list (card space-game-drag-on-list-pans)
  await drag(lp.x, lp.y, lp.x + 150, lp.y + 20); check('a drag that starts on the open list does not pan the view', !(await cam()).panned, JSON.stringify(lp));
  check('and the list is still open (the press was the list\'s, no row was given)', !!(await j(`campPanelOpen(${S}.pn)`)));
  // card space-game-q-recentre-map: the cruiser list is open (it has the digits, the arrows fly): a held arrow still brings a dragged view back
  await drag(700, 300, 400, 300); check('dragged with the cruiser list open: off the cruiser', (await cam()).panned);
  await keyDown('ArrowUp'); await t.run(650); await keyUp('ArrowUp'); await t.run(300);
  check('a held arrow brings the dragged view back with the cruiser list open', !(await cam()).panned);
  await key('Escape', 40);

  // ---- the Tab map ----
  await key('Tab'); await t.run(700);
  const m0 = await j(`({ cx: ${S}.mp.fit.cx, cy: ${S}.mp.fit.cy, s: ${S}.mp.fit.s, panned: ${S}.mp.panned })`); await snap('3-map');
  await drag(500, 300, 760, 380);
  const m1 = await j(`({ cx: ${S}.mp.fit.cx, cy: ${S}.mp.fit.cy, s: ${S}.mp.fit.s, panned: ${S}.mp.panned, mark: ${S}.mp.recentre.visible })`);
  note(`map centre moved ${((m1.cx - m0.cx) * m0.s).toFixed(0)}, ${((m1.cy - m0.cy) * m0.s).toFixed(0)} screen px for a drag of 260, 80`);
  check('a drag pans the Tab map (the centre moved against the hand), it is marked as dragged, and shows its RECENTRE mark', m1.panned && m1.mark && Math.abs((m0.cx - m1.cx) * m0.s - 260) < 12 && Math.abs((m0.cy - m1.cy) * m0.s - 80) < 12, JSON.stringify([m0, m1]));
  await t.run(400); await snap('4-map-dragged');
  // a click without a drag still sets a mark (the carrier's own mark, or the nearest)
  const pick = await j(`(() => { const mp = ${S}.mp, F = campMapFrameOf(mp), inF = r0 => { const q = campMapPoint(mp.fit, F, r0.x, r0.y); return q.x >= F.x && q.x <= F.x + F.w && q.y >= F.y && q.y <= F.y + F.h; }, proj = (x, y) => campMapPoint(mp.fit, F, x, y), onList = q => mp.list.some(t => t.rowId && q.x >= t.x && q.x <= t.x + 260 && Math.abs(q.y - t.y) <= 11), r = mp.rows.find(x => { const q = campMapPoint(mp.fit, F, x.x, x.y), st = campNavPickStack(mp.rows.filter(inF), proj, q.x, q.y); return x.id !== 'carrier' && q.x > F.x + 20 && q.x < F.x + F.w - 20 && q.y > F.y + 20 && q.y < F.y + F.h - 20 && !onList(q) && st.length && st[0].id === x.id; }); /* a mark the click can set: not under a list line (the list is read first), and the nearest of its stack */ return r ? Object.assign({ id: r.id }, campMapPoint(mp.fit, F, r.x, r.y)) : null; })()`);
  if (pick) { await click(pick.x, pick.y); check('a click without a drag on a mark of the dragged map still sets it (the click is read on the release)', (await j(`${S}.mp.setId`)) === pick.id, pick.id + ' at ' + Math.round(pick.x) + ',' + Math.round(pick.y)); } else note('no mark inside the frame to click');
  await key(await zr(), 40); await t.run(500);
  const m2b = await j(`({ cx: ${S}.mp.fit.cx, cy: ${S}.mp.fit.cy, panned: ${S}.mp.panned, z: ${S}.mp.zWant, mark: ${S}.mp.recentre.visible })`);
  check('Q on the map is the zoom reset and the recentre: the centre is where it was, no mark', !m2b.panned && !m2b.mark && m2b.z === 1 && Math.abs(m2b.cx - m0.cx) < 1 && Math.abs(m2b.cy - m0.cy) < 1, JSON.stringify([m0, m2b]));
  check('Q on the dragged map does not close it and opens no list (card space-game-q-recentre-map)', (await j(`!!${S}.mp && campPanelOpen(${S}.pn) === ''`)) === true);
  await key('Tab'); await t.run(300);
  const errs = await j(`window.__errors || []`); check('the game logged no error', !errs || errs.length === 0, JSON.stringify(errs).slice(0, 300));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); bad++; }
finally { try { await t.close(); } catch (e) { /* closed */ } }
process.exit(bad ? 1 : (console.log('\nDRAG VIEW WALK PASS'), 0));
