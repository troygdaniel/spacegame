// not in the smoke: the Campaign's fixed pictures for the blind critic, taken by hand (card space-game-night-graphics, docs/night/graphics.md)
// One Chrome (muted, through the test lock: tests/cdp.mjs), the game clock stepped by hand, so the same commit gives the same pictures however busy the Mac is. Each picture is taken twice (the first capture after a step can
// be a frame behind). Pictures go OUTSIDE the repository: ~/dev/spacegame-night/shots/ (CAMP_SHOTS=<folder> for another), named <TAG>-<picture>.png (TAG=before|after, default before), so two runs sit side by side.
//   node tools/campshots.mjs 1      level 1: the story card, the start, the launch, a melee, kills, hits, low hull, recall, the mothership
//   node tools/campshots.mjs 2      levels 2 and 3: guards, the relic, a cache, the world and its towers
//   node tools/campshots.mjs 3      the cards (won story, tech pick, lost, pause) and the Tab map
//   node tools/campshots.mjs fx     explosions as the game makes them, at 60, 160, 320 and 520 ms (2x crops), and the guns
//   node tools/campshots.mjs mars   Mars and the Earth-Luna start, up close
//   node tools/campshots.mjs zoom   + - Backspace and the wheel: the view, the edge arrow and the map at several zooms, a click on a place at a zoom
//   node tools/campshots.mjs panels the order lists (nothing drawn until a list's key; then the fleet list at the left or the ship list at the right, or a part of one: E the fighters, I the power): the key caps, the highlight, a refused row's flash, the stance list, the target line, with the zoom and the map, the key line
//   node tools/campshots.mjs look   the new look of the ships: 2x crops round the carrier (start, launch, recall, a crowd, the turrets firing)
// Some pictures are STAGED (the carrier or the aliens are put in place, the hull and the shield are set low): the fight after the staging is the game's. The blind critic gets the PNG files and nothing else (docs/CRITIC.md).
// Exit code 1 when a picture could not be taken or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('../tests/cdp.mjs');
const OUT = process.env.CAMP_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'before';
const part = process.argv[2] || '1';
const SC = `game.scene.getScene('Campaign')`;
const up = `!!(window.game && game.scene.isActive('Campaign'))`;
const log = []; const note = (...a) => { const s = a.join(' '); console.log('  ' + s); log.push(s); };

const t = await launch('?campaign=' + (part === '2' || part === 'zoom' ? '2' : '1') + (part === '3' ? '&debug=1' : ''), ROOT); // part 3 presses the tune kit's win key: the kit is off unless the address says &debug=1 (card space-game-debug-keys-off) // zoom: level 2, which has a goal off the screen (the arrow); the belt's goal is a mothership that has not come
const j = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));
const snap = async name => { // taken twice: the first capture after a step can be a frame behind
  for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); }
  note('picture', name);
};
const keyOn = code => t.ev(`(() => { ${SC}.onKey({ code: '${code}', repeat: false }); return 1; })()`);
const begin = async () => { await t.waitFor(up, 15000, 'the Campaign scene'); await t.clock(); await t.run(700); };
const enter = async () => { await keyOn('Enter'); await t.run(300); };
const toPlay = async () => { for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) await enter(); await t.run(300); }; // the story card, then the mission's briefing card: Enter until the battle is on (a key does nothing under a card)
// an order is given as the player gives it (cards one-list-keys and list-shortcuts): the key of the list the row is in (Q W E R, P O I U; read with campKeyVia), Down to the row, Enter; a list with no key of its own (the stances) is opened
// from its parent: the parent's key, Down to the part's row, Enter. The row's place is read from the list of THIS mission in the page, never a letter or a number written here.
// The keys are given in the page one after the other, so no time of the game passes between them (the pictures' timing is the order's)
const wayTo = row => j(`(() => { const C = ${SC}.camp, id = ${JSON.stringify(row)}, p = campKeyVia(id); if (!p) return null; const at = campPanelList(C, p.id).findIndex(r => r.id === id); if (at < 0) return null;
  if (p.code) return { list: p.id, keys: [[p.code, at]] };
  const up = campKeyList(p.parent), pat = up ? campPanelList(C, up.id).findIndex(r => r.open === p.id) : -1; return up && up.code && pat >= 0 ? { list: p.id, keys: [[up.code, pat], ['Enter', at]] } : null; })()`);
const goTo = async row => { // the list open with the highlight on the row (not given)
  if ((await j(`${SC}.mode`)) !== 'play') return false; // a card has the keys
  const way = await wayTo(row); if (!way) { note('(the row ' + row + ' is left out of this mission\'s list)'); return false; }
  for (let n = 0; n < 6 && (await j(`campPanelOpen(${SC}.pn)`)); n++) await keyOn('Escape'); // Esc goes back ONE step (a target sub-list to its list, a list a row opened to Q or P; a list its own key opened closes): pressed until every list is closed (it pauses only when none is open)
  for (const [code, downs] of way.keys) { await keyOn(code); const cur = await j(`${SC}.pn.at`), n = await j(`(() => { const o = campPanelOpen(${SC}.pn); return o ? campPanelList(${SC}.camp, o).length : 0; })()`); for (let i = 0, d = n ? ((downs - cur) % n + n) % n : 0; i < d; i++) await keyOn('ArrowDown'); } // a list can open with its highlight on its first usable row (start: 'usable', All squads): Down only the difference
  return true;
};
const order = async row => {
  if (!(await goTo(row))) return false; await keyOn('Enter');
  if (await j(`!!${SC}.pn.pick`)) await keyOn('Enter'); // a row that needs a target (Attack, Escort, Mine ore) with several to choose from opens a target sub-list (src/camppick.js): Enter takes the highlighted one, the nearest; one candidate is taken at once, none: as it always was
  for (let n = 0; n < 6 && (await j(`campPanelOpen(${SC}.pn)`)); n++) await keyOn('Escape'); // an order that is refused leaves the list open, and so does a power row: Esc until it is closed, the keys go back to the ship
  return true;
};
const recall = () => order('recall'); // Recall is a row of its own (Launch and Recall are two rows, not a toggle)
// what is on the screen, by kind: how big each ship is drawn (px of screen), and how many of each there are
const sizes = () => j(`(() => { const s = ${SC}, o = {}; s.camp.ships.forEach(u => { const sp = s.sp[u.id]; if (!sp) return; const k = u.team + ':' + u.kind; o[k] = o[k] || { n: 0, w: Math.round(sp.displayWidth), h: Math.round(sp.displayHeight), r: u.r }; o[k].n++; }); return o; })()`);
// pilot: fly the carrier at a point (the nose is turned by hand: a staging shortcut), hold thrust, fire when something is in the nose
const pilot = (tx, ty, fire) => t.ev(`(() => { const s = ${SC}, c = s.camp.carrier; c.rot = Math.atan2(${ty} - c.y, ${tx} - c.x); s.k.UP.isDown = true; s.k.SPACE.isDown = ${!!fire}; return 1; })()`); // the arrows fly: Up is thrust
const coast = () => t.ev(`(() => { const s = ${SC}; s.k.UP.isDown = false; s.k.SPACE.isDown = false; return 1; })()`);
const state = () => j(`(() => { const s = ${SC}, C = s.camp, c = C.carrier; const al = C.ships.filter(u => u.team === 'alien' && u.hp > 0), fr = C.ships.filter(u => u.team === 'earth' && u.kind !== 'carrier'); const near = r => C.ships.filter(u => u !== c && Math.hypot(u.x - c.x, u.y - c.y) < r).length; let a0 = null, d0 = 1e9; al.forEach(u => { const d = Math.hypot(u.x - c.x, u.y - c.y); if (d < d0) { d0 = d; a0 = u; } }); return { t: Math.round(C.t / 100) / 10, mode: s.mode, cx: Math.round(c.x), cy: Math.round(c.y), hp: Math.round(c.hp), aliens: al.length, wing: fr.length, near350: near(350), near600: near(600), ax: a0 && Math.round(a0.x), ay: a0 && Math.round(a0.y), ad: Math.round(d0), result: C.result, booms: (window.__booms || []).length }; })()`);
const hookBooms = () => t.ev(`(() => { const s = ${SC}; window.__booms = []; const f = s.boom.explode.bind(s.boom); s.boom.explode = (n, x, y) => { window.__booms.push({ t: s.camp.t, n, x, y }); return f(n, x, y); }; return 1; })()`);

try {
  await begin();
  if (part === '1') {
    await hookBooms();
    await t.run(1200); await snap('c01-l1-intro');
    await enter(); await t.run(800); await snap('c02-l1-start'); await toPlay();
    await order('launch'); await t.run(2200); await snap('c03-l1-launch');
    await t.run(2500); note('sizes after launch', JSON.stringify(await sizes()));
    // wait for the first wave (t = 20 s), then make the melee a player would be in: every alien 250 to 450 px from the carrier, the wing 90 to 235 px (staged: the positions only; the fight after it is the game's)
    await order('attack');
    for (let i = 0; i < 120; i++) { const st = await state(); if (st.aliens >= 6) break; await t.run(250); }
    await t.ev(`(() => { const s = ${SC}, C = s.camp, c = C.carrier; let i = 0; C.ships.forEach(u => { if (u === c || u.kind === 'freighter') return; const a = i * 2.399, d = u.team === 'alien' ? 250 + (i % 3) * 90 : 90 + (i % 4) * 48; u.x = c.x + Math.cos(a) * d; u.y = c.y + Math.sin(a) * d; u.rot = a + Math.PI; i++; }); return i; })()`);
    await t.run(120); await snap('c04-l1-melee'); note('melee', JSON.stringify(await state()), 'sizes', JSON.stringify(await sizes()));
    // then the game's own fight: fly at the nearest alien, shoot, and take a picture when something dies or the carrier is hit
    let lastBoom = (await state()).booms, lastHp = (await state()).hp, shots = { kill: 0, hit: 0, beam: 0 }, lastShot = -9;
    for (let i = 0; i < 900; i++) {
      const st = await state();
      if (st.result) { note('result', st.result, 'at', st.t); break; }
      if (st.ad < 1e8 && st.ad > 450) await pilot(st.ax, st.ay, false); else if (st.ad <= 450) await pilot(st.ax, st.ay, true); else await coast();
      await t.run(100);
      const s2 = await state();
      if (s2.booms > lastBoom && s2.t - lastShot > 4 && shots.kill < 3) { shots.kill++; lastShot = s2.t; await snap('c05-l1-kill-' + shots.kill); note('kill at', s2.t, JSON.stringify(s2)); }
      else if (s2.hp < lastHp && s2.t - lastShot > 4 && shots.hit < 2) { shots.hit++; lastShot = s2.t; await snap('c06-l1-hit-' + shots.hit); note('hit at', s2.t, JSON.stringify(s2)); }
      lastBoom = s2.booms; lastHp = s2.hp;
      if (shots.kill >= 3 && shots.hit >= 2) break;
    }
    note('after the fight', JSON.stringify(await state()));
    // the hull and the shields low (staged; Earth's shield too where there is one), the recall order, and the mothership up close (staged: the carrier is flown to it)
    await t.ev(`(() => { const C = ${SC}.camp; C.carrier.hp = C.carrier.maxHp * 0.22; if (C.earth) C.earth.shield = C.earth.max * 0.18; C.shield = campShieldMax(C) * 0.18; return 1; })()`); await t.run(400); await snap('c07-l1-low');
    await recall(); await t.run(1800); await snap('c08-l1-recall');
    // the mothership: put one 520 px ahead of the carrier (staged: the game sends it at the third wave) and let the wing go for it
    await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; C.carrier.hp = C.carrier.maxHp; if (C.earth) C.earth.shield = C.earth.max; C.shield = campShieldMax(C); const m = campSpawn(C, 'mother', c.x + Math.cos(c.rot) * 560, c.y + Math.sin(c.rot) * 560); m.goal = 'earth'; return 1; })()`);
    await order('launch'); await t.run(300); await order('attack'); await t.run(1600); await snap('c09-l1-mother');
    note('sizes', JSON.stringify(await sizes()));
  } else if (part === '2') {
    await t.run(1000); await snap('c10-l2-intro');
    await enter(); await t.run(700); await snap('c11-l2-start'); await toPlay();
    await order('launch'); await t.run(1800);
    // to the relic: through the guards (staged: the carrier is put 700 px from Proxima b and flown in; the guards wait until it is close)
    await t.ev(`(() => { const c = ${SC}.camp.carrier; c.x = 600; c.y = 1500; c.vx = c.vy = 0; return 1; })()`); await t.run(600);
    await order('attack');
    let shotRelic = false, shotGuards = false;
    for (let i = 0; i < 360; i++) {
      const st = await state(); if (st.result) break;
      if (st.ad <= 500) await pilot(st.ax, st.ay, true); else if (st.aliens) await pilot(st.ax, st.ay, false); else await pilot(1200, 800, false);
      await t.run(250);
      if (!shotGuards && st.near350 >= 4) { shotGuards = true; await snap('c12-l2-guards'); note('guards', JSON.stringify(st)); }
      if (!shotRelic && st.aliens === 0 && Math.hypot(st.cx - 1200, st.cy - 800) < 260) { shotRelic = true; await coast(); await t.run(1500); await snap('c13-l2-relic'); break; }
    }
    // the caches, as the carrier passes one (gold pods): put it next to a cache
    await coast(); await t.ev(`(() => { const s = ${SC}, c = s.camp.carrier; c.x = -2500; c.y = 1900; c.vx = c.vy = 0; return 1; })()`); await t.run(900); await snap('c14-l2-cache');
    note('l2 sizes', JSON.stringify(await sizes()));
    // level 3
    await t.goto('?campaign=3', ROOT); await begin(); await hookBooms();
    await t.run(1000); await snap('c20-l3-intro'); await enter(); await t.run(700); await snap('c21-l3-start'); await toPlay();
    await order('launch'); await t.run(2000);
    await t.ev(`(() => { const c = ${SC}.camp.carrier; c.x = -1500; c.y = 600; c.vx = c.vy = 0; return 1; })()`); await t.run(800); await snap('c22-l3-world');
    await order('attack');
    for (let i = 0; i < 240; i++) {
      const st = await state(); if (st.result) break;
      await pilot(0, 0, st.ad <= 800); await t.run(250);
      if (st.near600 >= 6 && st.ad < 900 && i % 20 === 0) await snap('c23-l3-towers-' + i);
      if (i > 60) break;
    }
    note('l3 sizes', JSON.stringify(await sizes()));
  } else if (part === 'fx') {
    // explosions as the game makes them (scene.boom.explode(26 for a ship, 90 for the carrier or the mothership), 3 for a hit) and what the guns look like: a strip of
    // pictures at 60, 160, 320 and 520 ms, each a 2x crop of 360 x 240 round the carrier's nose
    await toPlay(); await t.run(600);
    await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; c.x = 0; c.y = -900; c.vx = c.vy = 0; c.rot = 0; return 1; })()`); await t.run(500);
    const where = async () => j(`(() => { const s = ${SC}, v = s.cameras.main.worldView, c = s.camp.carrier; return { sx: c.x - v.x + 77, sy: c.y - v.y }; })()`);
    const crop = async (name, cx, cy) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png', clip: { x: cx - 180, y: cy - 120, width: 360, height: 240, scale: 2 } }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); } note('crop', name); };
    for (const [label, n, dx, dy] of [['ship', 26, 220, -60], ['big', 90, 220, -60], ['hit', 3, 120, 10]]) {
      const w = await where(); const ex = w.sx + dx, ey = w.sy + dy;
      await t.ev(`(() => { const s = ${SC}, c = s.camp.carrier; s.boom.explode(${n}, c.x + ${dx}, c.y + ${dy}); return 1; })()`);
      let at = 0; for (const ms of [60, 160, 320, 520]) { await t.run(ms - at); at = ms; await crop(`fx-${label}-${ms}`, ex, ey); }
      await t.run(1500);
    }
    // the guns: the carrier fires its main gun (Space) and a point gun with an alien near; an alien shot and a hit
    await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; campSpawn(C, 'raider', c.x + 420, c.y + 20); campSpawn(C, 'drone', c.x + 520, c.y - 120); ${SC}.k.SPACE.isDown = true; return 1; })()`);
    await t.run(1100); const w2 = await where(); await crop('fx-guns', w2.sx + 230, w2.sy); await snap('c15-guns');
    await t.run(900); const w3 = await where(); await crop('fx-guns2', w3.sx + 230, w3.sy);
  } else if (part === 'look') {
    // the new look of the ships (card space-game-campaign-look): 2x crops round the carrier. The carrier at the start, a launch (the tubes at the front of the pods lit), the wing out, a recall (the landing bays at the back lit), a crowd (the wing and
    // aliens close round it), and the turrets firing. The carrier is not moved except to put aliens near it (staged: positions only).
    await toPlay(); await t.run(600);
    const where = async () => j(`(() => { const s = ${SC}, v = s.cameras.main.worldView, c = s.camp.carrier; return { sx: (c.x - v.x) * s.cameras.main.zoom + 77, sy: (c.y - v.y) * s.cameras.main.zoom }; })()`);
    const crop = async (name, w = 400, h = 260, dx = 0, dy = 0) => { const p = await where(); for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png', clip: { x: p.sx + dx - w / 2, y: p.sy + dy - h / 2, width: w, height: h, scale: 2 } }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } note('crop', name); };
    await crop('look-01-start');
    await order('launch'); await t.run(500); await crop('look-02-launch');
    await t.run(1100); await crop('look-03-launch-later');
    await t.run(3500); await crop('look-04-wing-out', 520, 320);
    await recall(); await t.run(1400); await crop('look-05-recall', 520, 320);
    // a crowd: the wing is out again, aliens come in close, the turrets fire
    await t.run(2500); await order('launch'); await t.run(4800);
    await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; ['raider', 'raider', 'drone', 'raider', 'drone', 'gunship'].forEach((k, i) => { const a = i * 1.05 + 0.4, d = 230 + (i % 3) * 70; const u = campSpawn(C, k, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d); u.hp = u.maxHp = 400; }); return 1; })()`);
    await order('attack'); await t.ev(`(() => { ${SC}.k.SPACE.isDown = true; return 1; })()`); await t.run(1300); await crop('look-06-crowd', 640, 400);
    await t.run(900); await crop('look-07-crowd-later', 640, 400);
    await snap('look-08-whole-screen');
    note('sizes', JSON.stringify(await sizes()));
  } else if (part === 'zoom') {
    // + - = 0 and the wheel (card space-game-campaign-zoom): the view in and out with the HUD at its own size, the edge arrow, the map at several zooms, and a click on a place at a zoom (the scene reads the click through the map's own view)
    await toPlay(); await t.run(600); await order('launch'); await t.run(3000);
    const zs = () => j(`(() => { const s = ${SC}; return { cam: +s.cameras.main.zoom.toFixed(3), want: +CAMZOOM.want.toFixed(3), mp: s.mp ? { z: +s.mp.z.toFixed(3), want: +s.mp.zWant.toFixed(3), s: +s.mp.fit.s.toFixed(4) } : null }; })()`);
    note('start', JSON.stringify(await zs())); await snap('zoom-01-start');
    for (let i = 0; i < 3; i++) await keyOn('Equal'); await t.run(900); note('in', JSON.stringify(await zs())); await snap('zoom-02-in');
    for (let i = 0; i < 8; i++) await keyOn('Minus'); await t.run(1200); note('out', JSON.stringify(await zs())); await snap('zoom-03-out');
    await keyOn('Backspace'); await t.run(1000); note('reset', JSON.stringify(await zs()));
    // the edge arrow (level 2: the goal is the nearest cache): seen at 1, at 1.6 and at 0.5 (it points where the goal is on the screen, so it is on the edge at one zoom and gone at another)
    await t.run(300); await snap('zoom-04-arrow-1'); note('arrow at 1', JSON.stringify(await j(`(() => { const s = ${SC}, a = s.hud.arrow; return { visible: a.visible, x: Math.round(a.x), y: Math.round(a.y), text: a.text }; })()`)));
    for (let i = 0; i < 2; i++) await keyOn('Equal'); await t.run(900); await snap('zoom-05-arrow-in'); note('arrow at 1.44', JSON.stringify(await j(`(() => { const s = ${SC}, a = s.hud.arrow; return { visible: a.visible, x: Math.round(a.x), y: Math.round(a.y), text: a.text }; })()`)));
    await keyOn('Backspace'); for (let i = 0; i < 3; i++) await keyOn('Minus'); await t.run(900); await snap('zoom-06-arrow-out'); note('arrow at 0.58', JSON.stringify(await j(`(() => { const s = ${SC}, a = s.hud.arrow; return { visible: a.visible, x: Math.round(a.x), y: Math.round(a.y), text: a.text }; })()`)));
    await keyOn('Backspace'); await t.run(900);
    // the map
    await t.key('TAB'); await t.run(300); note('map open', JSON.stringify(await zs())); await snap('zoom-07-map-1');
    for (let i = 0; i < 4; i++) await keyOn('Equal'); await t.run(1200); note('map in (middle)', JSON.stringify(await zs())); await snap('zoom-08-map-in-middle');
    await keyOn('Backspace'); await t.run(1000); await keyOn('ArrowDown'); await keyOn('ArrowDown'); await t.run(300); // Down steps the map's list to the next mark (Up the last)
    for (let i = 0; i < 6; i++) await keyOn('Equal'); await t.run(1400); note('map in (the place I chose)', JSON.stringify(await zs())); await snap('zoom-09-map-in-place');
    // a click on a place that is in the frame at this zoom and has no other row within 20 px of it (the relic sits on its planet): the screen point of the nearest such place to the frame's middle
    const hit = await j(`(() => { const s = ${SC}, mp = s.mp, F = CAMPMAP.frame, all = mp.rows, rows = all.filter(r => r.kind === 'place' && all.every(o => o === r || Math.hypot(o.x - r.x, o.y - r.y) * mp.fit.s > 20)); let best = null, bd = 1e9; rows.forEach(r => { const p = campMapPoint(mp.fit, F, r.x, r.y), d = Math.hypot(p.x - F.x - F.w / 2, p.y - F.y - F.h / 2); if (p.x > F.x + 6 && p.x < F.x + F.w - 6 && p.y > F.y + 6 && p.y < F.y + F.h - 6 && d < bd) { bd = d; best = { id: r.id, px: p.x, py: p.y }; } }); if (!best) return null; mp.setId = ''; s.input.emit('pointerdown', { x: best.px + 2, y: best.py + 1 }); return { want: best.id, got: mp.setId }; })()`);
    note('click at zoom', JSON.stringify(hit)); await t.run(300); await snap('zoom-10-map-click');
    await keyOn('Backspace'); for (let i = 0; i < 4; i++) await keyOn('Minus'); await t.run(1200); note('map out', JSON.stringify(await zs())); await snap('zoom-11-map-out');
    // the wheel: the map's when it is open, the camera's when it is not
    await keyOn('Backspace'); await t.run(700);
    await t.ev(`(() => { ${SC}.input.emit('wheel', {}, [], 0, -240); return 1; })()`); await t.run(900); note('wheel over the map', JSON.stringify(await zs()));
    await t.key('TAB'); await t.run(300); const before = await zs();
    await t.ev(`(() => { ${SC}.input.emit('wheel', {}, [], 0, -240); return 1; })()`); await t.run(900); note('wheel, map shut', JSON.stringify(before), '->', JSON.stringify(await zs()));
  } else if (part === 'panels') {
    // the order lists (cards one-list-keys and list-shortcuts): nothing is on the screen until a list's key is pressed; then ONE list, the fleet list at the left (Q; its parts W E R) or the ship list at the right (P; its parts O I U), with a
    // highlight that Up and Down move and a key cap on each row that opens a part. A refused order leaves the list open and its row flashes; the stances are a part of the fleet list (its last row opens it); A D S pick a target (the line under the radar names it, a bracket marks it), with the zoom, with the map, and the key line's backing strip.
    await toPlay(); await t.run(600);
    const onPage = rect => j(`(() => { const R = ${rect}, r = game.canvas.getBoundingClientRect(), k = r.width / 1280; return { x: r.left + R.x * k, y: r.top + R.y * k, w: R.w * k, h: R.h * k }; })()`); // a rectangle of the game's screen, on the page (the canvas is scaled to fit the window)
    const box = id => onPage(`campPanelsGeometry(CAMP_PANELS.panels.find(p => p.id === '${id}'), campPanelList(${SC}.camp, '${id}').length)`); // a list's place: it is as tall as its rows in this mission
    const tgtBox = () => onPage(`(() => { const k = campPanelsKeep()[0]; return { x: k[0], y: k[1], w: k[2] - k[0], h: k[3] - k[1] }; })()`); // the target's line under the radar
    const boxShot = async (name, b, pad = 6) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png', clip: { x: b.x - pad, y: b.y - pad, width: b.w + 2 * pad, height: b.h + 2 * pad, scale: 2 } }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } note('crop', name); };
    const panelShot = async (name, id, pad = 6) => boxShot(name, await box(id), pad);
    const clipShot = async (name, x, y, w, h) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: 2 } }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } note('crop', name); };
    const st = () => j(`(() => { const s = ${SC}, P = s.pn; return { open: P.open, at: P.at, top: P.top, ships: s.camp.ships.filter(u => u.team === 'earth').length, tgt: s.camp.tgt }; })()`);
    await t.run(300); note('start', JSON.stringify(await st())); await snap('panels-01-no-list'); await boxShot('panels-01a-target-line', await tgtBox()); // no list: only the target's line
    await keyOn('KeyQ'); await t.run(300); note('Q', JSON.stringify(await st())); await snap('panels-01b-fleet-open'); await panelShot('panels-01c-fleet', 'fleet');
    await keyOn('KeyW'); await t.run(300); note('W (from the fleet list: the all-squads list)', JSON.stringify(await st())); await snap('panels-01f-squads-open'); await panelShot('panels-01g-squads', 'squads');
    await keyOn('KeyE'); await t.run(300); note('E (the red squad list)', JSON.stringify(await st())); await panelShot('panels-01g2-red', 'red');
    await keyOn('ArrowLeft'); await t.run(300); note('Left (back to the fleet list, on the Red squad row)', JSON.stringify(await st())); await panelShot('panels-01h-fleet-back', 'fleet');
    await keyOn('KeyP'); await t.run(300); note('P (the fleet list closes, the ship list opens)', JSON.stringify(await st())); await snap('panels-01d-ship-open'); await panelShot('panels-01e-ship', 'ship');
    await keyOn('KeyO'); await t.run(300); await keyOn('Enter'); await t.run(300); note('O, Enter (the power list: a pip to the shields, the list stays open)', JSON.stringify(await st()), await j(`JSON.stringify(${SC}.camp.power.p)`)); await snap('panels-01i-power-open'); await panelShot('panels-01j-power', 'power');
    await goTo('balance'); await keyOn('Enter'); await keyOn('Escape'); await t.run(200); // the power as it was
    // a refused order (Recall with no ship out): the list stays open, the row flashes twice and the foot says why
    await goTo('recall'); await t.run(300); await keyOn('Enter'); await t.run(6); note('Enter on Recall, no ship out', JSON.stringify(await st())); await panelShot('panels-02-flash-40ms', 'fleet'); // the second capture of a pair is 34 ms after the first: this one is the flash's first peak (40 ms)
    await t.run(46); await panelShot('panels-02b-flash-120ms', 'fleet'); // and the second peak (120 ms)
    await t.run(400); await panelShot('panels-02c-refused', 'fleet'); await keyOn('Escape'); await t.run(200);
    await order('launch'); note('launch', JSON.stringify(await st())); await t.run(2500);
    await keyOn('KeyQ'); await keyOn('ArrowUp'); await t.run(400); note('Q, Up (round to the last row: Stance)', JSON.stringify(await st())); await snap('panels-03-fleet-stances'); await panelShot('panels-03b-stances', 'fleet'); await keyOn('Escape'); await t.run(200); // Up from the first row goes round to the last: the row that opens the stances
    await order('orbit'); await goTo('orbit'); await t.run(400); note('the stance list, Orbit in force', JSON.stringify(await st())); await panelShot('panels-03c-stance-in-force', 'stance'); for (let n = 0; n < 6 && (await j(`campPanelOpen(${SC}.pn)`)); n++) await keyOn('Escape'); await t.run(300); // Esc goes back to Q, then closes it. Q, the Stance row, Enter: the stance list; the stance in force is marked
    await keyOn('KeyP'); await t.run(400); note('P', JSON.stringify(await st())); await snap('panels-04-ship-list'); await panelShot('panels-04b-ship', 'ship'); await keyOn('KeyP'); await t.run(300);
    // a hostile put in reach (staged): D picks it with no list open, the line under the radar names it, the bracket is round it; the fighters list's Attack row (E) goes at it
    await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; campSpawn(C, 'raider', c.x + 520, c.y - 180); return 1; })()`); await t.run(300);
    await keyOn('KeyD'); await t.run(400); note('D', JSON.stringify(await st())); await snap('panels-05-target'); await boxShot('panels-05a-target-line', await tgtBox());
    await goTo('attack'); await t.run(400); await panelShot('panels-05b-fighters-target', (await wayTo('attack')).list); await keyOn('Escape'); await t.run(200);
    await keyOn('KeyX'); await t.run(200);
    for (let i = 0; i < 3; i++) await keyOn('Equal'); await t.run(900); await snap('panels-06-zoomed-in');
    await t.key('TAB'); await t.run(400); await snap('panels-07-map-open'); await t.key('TAB'); await t.run(300); await keyOn('Backspace'); await t.run(900);
    // the key line: a ship under it
    await clipShot('panels-08-keyline', 77, 575, 1130, 58); // the viewport is 633 px high (the canvas fits it at 0.88): the key line is at about y 590 to 610
    note('sizes', JSON.stringify(await sizes()));
  } else if (part === 'mars') {
    await toPlay(); await t.run(500);
    await t.ev(`(() => { const c = ${SC}.camp.carrier; c.x = 3500; c.y = 450; c.vx = c.vy = 0; c.rot = 0; return 1; })()`); await t.run(900); await snap('c40-mars');
    await t.ev(`(() => { const c = ${SC}.camp.carrier; c.x = -150; c.y = 0; c.vx = c.vy = 0; return 1; })()`); await t.run(900); await snap('c41-earth-luna');
  } else if (part === '3') {
    // the cards: level 1 story (already c01), won -> story after -> tech pick, the lost card, the pause card, the map
    await toPlay(); await t.run(600);
    await keyOn('Backslash'); await t.run(2600); await snap('c30-won-story');
    await keyOn('Enter'); await t.run(600); await snap('c31-tech-pick');
    await t.goto('?campaign=1&debug=1', ROOT); await begin(); await toPlay(); await t.run(500);
    await keyOn('BracketLeft'); await t.run(1800); await snap('c32-lost');
    await t.goto('?campaign=1', ROOT); await begin(); await toPlay(); await t.run(1500);
    await order('launch'); await t.run(2500);
    await keyOn('Escape'); await t.run(500); await snap('c33-pause');
    await keyOn('Escape'); await t.run(300);
    await t.key('TAB'); await t.run(800); await snap('c34-map');
  }
  const errs = t.errors.filter(e => !/favicon/.test(e)); note('console errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
} catch (e) { note('FAILED: ' + e.message); process.exitCode = 1; }
finally { writeFileSync(join(OUT, `${TAG}-part${part}.log`), log.join('\n') + '\n'); await t.close(); }
