// not in the smoke: the Campaign's fixed pictures for the blind critic, taken by hand (card space-game-night-graphics, docs/night/graphics.md)
// One Chrome (muted, through the test lock: tests/cdp.mjs), the game clock stepped by hand, so the same commit gives the same pictures however busy the Mac is. Each picture is taken twice (the first capture after a step can
// be a frame behind). Pictures go OUTSIDE the repository: ~/dev/spacegame-night/shots/ (CAMP_SHOTS=<folder> for another), named <TAG>-<picture>.png (TAG=before|after, default before), so two runs sit side by side.
//   node tools/campshots.mjs 1      level 1: the story card, the start, the launch, a melee, kills, hits, low hull, recall, the mothership
//   node tools/campshots.mjs 2      levels 2 and 3: guards, the relic, a cache, the world and its towers
//   node tools/campshots.mjs 3      the cards (won story, tech pick, lost, pause) and the Tab map
//   node tools/campshots.mjs fx     explosions as the game makes them, at 60, 160, 320 and 520 ms (2x crops), and the guns
//   node tools/campshots.mjs mars   Mars and the Earth-Luna start, up close
//   node tools/campshots.mjs panels the keyboard panels: the tabs, Q and E open them, the pick's flash, the cross-fade, the tab's pulse, with the zoom and the map, the key line
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

const t = await launch('?campaign=' + (part === '2' ? '2' : '1'), ROOT);
const j = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));
const snap = async name => { // taken twice: the first capture after a step can be a frame behind
  for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); }
  note('picture', name);
};
const keyOn = code => t.ev(`(() => { ${SC}.onKey({ code: '${code}', repeat: false }); return 1; })()`);
const begin = async () => { await t.waitFor(up, 15000, 'the Campaign scene'); await t.clock(); await t.run(700); };
const enter = async () => { await keyOn('Enter'); await t.run(300); };
// what is on the screen, by kind: how big each ship is drawn (px of screen), and how many of each there are
const sizes = () => j(`(() => { const s = ${SC}, o = {}; s.camp.ships.forEach(u => { const sp = s.sp[u.id]; if (!sp) return; const k = u.team + ':' + u.kind; o[k] = o[k] || { n: 0, w: Math.round(sp.displayWidth), h: Math.round(sp.displayHeight), r: u.r }; o[k].n++; }); return o; })()`);
// pilot: fly the carrier at a point (the nose is turned by hand: a staging shortcut), hold thrust, fire when something is in the nose
const pilot = (tx, ty, fire) => t.ev(`(() => { const s = ${SC}, c = s.camp.carrier; c.rot = Math.atan2(${ty} - c.y, ${tx} - c.x); s.k.W.isDown = true; s.k.SPACE.isDown = ${!!fire}; return 1; })()`);
const coast = () => t.ev(`(() => { const s = ${SC}; s.k.W.isDown = false; s.k.SPACE.isDown = false; return 1; })()`);
const state = () => j(`(() => { const s = ${SC}, C = s.camp, c = C.carrier; const al = C.ships.filter(u => u.team === 'alien' && u.hp > 0), fr = C.ships.filter(u => u.team === 'earth' && u.kind !== 'carrier'); const near = r => C.ships.filter(u => u !== c && Math.hypot(u.x - c.x, u.y - c.y) < r).length; let a0 = null, d0 = 1e9; al.forEach(u => { const d = Math.hypot(u.x - c.x, u.y - c.y); if (d < d0) { d0 = d; a0 = u; } }); return { t: Math.round(C.t / 100) / 10, mode: s.mode, cx: Math.round(c.x), cy: Math.round(c.y), hp: Math.round(c.hp), aliens: al.length, wing: fr.length, near350: near(350), near600: near(600), ax: a0 && Math.round(a0.x), ay: a0 && Math.round(a0.y), ad: Math.round(d0), result: C.result, booms: (window.__booms || []).length }; })()`);
const hookBooms = () => t.ev(`(() => { const s = ${SC}; window.__booms = []; const f = s.boom.explode.bind(s.boom); s.boom.explode = (n, x, y) => { window.__booms.push({ t: s.camp.t, n, x, y }); return f(n, x, y); }; return 1; })()`);

try {
  await begin();
  if (part === '1') {
    await hookBooms();
    await t.run(1200); await snap('c01-l1-intro');
    await enter(); await t.run(800); await snap('c02-l1-start');
    await keyOn('Digit1'); await t.run(2200); await snap('c03-l1-launch');
    await t.run(2500); note('sizes after launch', JSON.stringify(await sizes()));
    // wait for the first wave (t = 20 s), then make the melee a player would be in: every alien 250 to 450 px from the carrier, the wing 90 to 235 px (staged: the positions only; the fight after it is the game's)
    await keyOn('Digit2');
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
    // the hull and Earth's shield low (staged), the recall order, and the mothership up close (staged: the carrier is flown to it)
    await t.ev(`(() => { const C = ${SC}.camp; C.carrier.hp = C.carrier.maxHp * 0.22; C.earth.shield = C.earth.max * 0.18; return 1; })()`); await t.run(400); await snap('c07-l1-low');
    await keyOn('Digit5'); await t.run(1800); await snap('c08-l1-recall');
    // the mothership: put one 520 px ahead of the carrier (staged: the game sends it at the third wave) and let the wing go for it
    await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; C.carrier.hp = C.carrier.maxHp; C.earth.shield = C.earth.max; const m = campSpawn(C, 'mother', c.x + Math.cos(c.rot) * 560, c.y + Math.sin(c.rot) * 560); m.goal = 'earth'; return 1; })()`);
    await keyOn('Digit1'); await t.run(300); await keyOn('Digit2'); await t.run(1600); await snap('c09-l1-mother');
    note('sizes', JSON.stringify(await sizes()));
  } else if (part === '2') {
    await t.run(1000); await snap('c10-l2-intro');
    await enter(); await t.run(700); await snap('c11-l2-start');
    await keyOn('Digit1'); await t.run(1800);
    // to the relic: through the guards (staged: the carrier is put 700 px from Proxima b and flown in; the guards wait until it is close)
    await t.ev(`(() => { const c = ${SC}.camp.carrier; c.x = 600; c.y = 1500; c.vx = c.vy = 0; return 1; })()`); await t.run(600);
    await keyOn('Digit2');
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
    await t.run(1000); await snap('c20-l3-intro'); await enter(); await t.run(700); await snap('c21-l3-start');
    await keyOn('Digit1'); await t.run(2000);
    await t.ev(`(() => { const c = ${SC}.camp.carrier; c.x = -1500; c.y = 600; c.vx = c.vy = 0; return 1; })()`); await t.run(800); await snap('c22-l3-world');
    await keyOn('Digit2');
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
    await enter(); await t.run(600);
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
    await enter(); await t.run(600);
    const where = async () => j(`(() => { const s = ${SC}, v = s.cameras.main.worldView, c = s.camp.carrier; return { sx: (c.x - v.x) * s.cameras.main.zoom + 77, sy: (c.y - v.y) * s.cameras.main.zoom }; })()`);
    const crop = async (name, w = 400, h = 260, dx = 0, dy = 0) => { const p = await where(); for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png', clip: { x: p.sx + dx - w / 2, y: p.sy + dy - h / 2, width: w, height: h, scale: 2 } }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } note('crop', name); };
    await crop('look-01-start');
    await keyOn('Digit1'); await t.run(500); await crop('look-02-launch');
    await t.run(1100); await crop('look-03-launch-later');
    await t.run(3500); await crop('look-04-wing-out', 520, 320);
    await keyOn('Digit5'); await t.run(1400); await crop('look-05-recall', 520, 320);
    // a crowd: the wing is out again, aliens come in close, the turrets fire
    await t.run(2500); await keyOn('Digit1'); await t.run(4800);
    await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; ['raider', 'raider', 'drone', 'raider', 'drone', 'gunship'].forEach((k, i) => { const a = i * 1.05 + 0.4, d = 230 + (i % 3) * 70; const u = campSpawn(C, k, c.x + Math.cos(a) * d, c.y + Math.sin(a) * d); u.hp = u.maxHp = 400; }); return 1; })()`);
    await keyOn('Digit2'); await t.ev(`(() => { ${SC}.k.SPACE.isDown = true; return 1; })()`); await t.run(1300); await crop('look-06-crowd', 640, 400);
    await t.run(900); await crop('look-07-crowd-later', 640, 400);
    await snap('look-08-whole-screen');
    note('sizes', JSON.stringify(await sizes()));
  } else if (part === 'panels') {
    // the panels (card space-game-campaign-panels-ui): the collapsed tabs, FLEET open, the pick's flash, SHIP open, the cross-fade, the tab's pulse, with the zoom, with the map, and the key line's backing strip. Q and E open the panels.
    await enter(); await t.run(600);
    const clipShot = async (name, x, y, w, h) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: 2 } }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } note('crop', name); };
    const st = () => j(`(() => { const s = ${SC}, P = s.pn; return { open: P.open, flash: P.flash && P.flash.row, shown: P.flash && P.flash.shown, closed: P.closed && P.closed.id, ships: s.camp.ships.filter(u => u.team === 'earth').length }; })()`);
    await t.run(300); await snap('panels-01-collapsed'); await clipShot('panels-01b-tabs-left', 77, 200, 330, 120);
    await keyOn('KeyQ'); await t.run(400); note('Q', JSON.stringify(await st())); await snap('panels-02-fleet-open'); await clipShot('panels-02b-fleet-crop', 77, 200, 330, 250);
    await keyOn('Digit1'); await t.run(6); note('pick', JSON.stringify(await st())); await clipShot('panels-03-flash-40ms', 77, 200, 330, 250); // the second capture of a pair is 34 ms after the first: this one is the flash's first peak (40 ms)
    await t.run(46); await clipShot('panels-03b-flash-120ms', 77, 200, 330, 250); // and the second peak (120 ms)
    await t.run(400); await clipShot('panels-03c-collapsed-after', 77, 200, 330, 250);
    await t.run(2500);
    await keyOn('KeyE'); await t.run(400); await snap('panels-04-ship-open'); await clipShot('panels-04b-ship-crop', 880, 200, 330, 250);
    await keyOn('KeyQ'); await t.run(26); note('switch', JSON.stringify(await st())); await clipShot('panels-05-crossfade', 77, 190, 1130, 270); // 60 ms in: both lists half there
    await t.run(300); await keyOn('KeyQ'); await t.run(300);
    await keyOn('KeyQ'); await t.run(40); await keyOn('Digit5'); await t.run(86); note('fast pick', JSON.stringify(await st())); await clipShot('panels-06-tab-pulse', 77, 200, 330, 120); // the pulse peaks 120 ms after the pick
    await t.run(1500);
    for (let i = 0; i < 3; i++) await keyOn('Equal'); await t.run(900); await keyOn('KeyE'); await t.run(400); await snap('panels-07-zoomed-in'); await keyOn('Escape'); await t.run(300);
    await t.key('TAB'); await t.run(400); await snap('panels-08-map-open'); await t.key('TAB'); await t.run(300); await keyOn('Digit0'); await t.run(900);
    // the key line: a ship under it
    await t.ev(`(() => { const s = ${SC}, C = s.camp, c = C.carrier; const sp = s.sp[c.id]; return 1; })()`);
    await clipShot('panels-09-keyline', 77, 640, 1130, 80);
    note('sizes', JSON.stringify(await sizes()));
  } else if (part === 'mars') {
    await enter(); await t.run(500);
    await t.ev(`(() => { const c = ${SC}.camp.carrier; c.x = 3500; c.y = 450; c.vx = c.vy = 0; c.rot = 0; return 1; })()`); await t.run(900); await snap('c40-mars');
    await t.ev(`(() => { const c = ${SC}.camp.carrier; c.x = -150; c.y = 0; c.vx = c.vy = 0; return 1; })()`); await t.run(900); await snap('c41-earth-luna');
  } else if (part === '3') {
    // the cards: level 1 story (already c01), won -> story after -> tech pick, the lost card, the pause card, the map
    await enter(); await t.run(600);
    await keyOn('Backslash'); await t.run(2600); await snap('c30-won-story');
    await keyOn('Enter'); await t.run(600); await snap('c31-tech-pick');
    await t.goto('?campaign=1', ROOT); await begin(); await enter(); await t.run(500);
    await keyOn('BracketLeft'); await t.run(1800); await snap('c32-lost');
    await t.goto('?campaign=1', ROOT); await begin(); await enter(); await t.run(1500);
    await keyOn('Digit1'); await t.run(2500);
    await keyOn('Escape'); await t.run(500); await snap('c33-pause');
    await keyOn('Escape'); await t.run(300);
    await t.key('TAB'); await t.run(800); await snap('c34-map');
  }
  const errs = t.errors.filter(e => !/favicon/.test(e)); note('console errors:', errs.length ? errs.slice(0, 5).join(' | ') : 'none');
} catch (e) { note('FAILED: ' + e.message); process.exitCode = 1; }
finally { writeFileSync(join(OUT, `${TAG}-part${part}.log`), log.join('\n') + '\n'); await t.close(); }
