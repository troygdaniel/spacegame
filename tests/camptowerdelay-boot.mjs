// not in the smoke: the tower's ring in the real game (card space-game-b12-c9-tower-delay; one Chrome, muted, through the test lock; the rule itself is pinned in plain Node by tests/camptowerdelay.mjs)
// 3.2 booted from a save, the stick taken, the fighter put 600 px from a tower: a tower that turns on the fighter you fly fires its first shot CAMP.tower.flownDelay (1 s) late, and a thin pink ring closes on it for that long.
//   A  the tell comes once, the moment the tower turns on the fighter: the scene's towerTell is called with 1000 ms and a ring image of the tell's colour is on the tower
//   B  the ring CLOSES: it is smaller and brighter half a second on, and gone once the second is over; the tower's first shot comes after it, not before
//   C  the game logged no error
//   A picture of the ring half way is saved (TD_SHOTS, default ~/dev/spacegame-night/shots/towerdelay-ring.png), never into the repository.   node tests/camptowerdelay-boot.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.TD_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit4: 52, KeyK: 75, KeyL: 76, Enter: 13 };
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, S = `game.scene.getScene('Campaign')`;
  const key = async (code, wait = 50) => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait); };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.ev(`(() => { const d0 = Date.now(), t0 = window.__t; Date.now = () => d0 + (window.__t - t0); return 1; })()`); await t.run(900); // (stepped by hand, Phaser's tweens still run on the wall clock (Date.now): make it the stepped one, so a 1 s tween takes 1 s of stepped time)
  const done = { score: 2000, bonuses: [], t: 100, hull: 800, lost: 0, tries: 1 };
  const progress = { level: 3, mission: 1, techs: ['shield', 'plating'], ore: 60, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': done, '1.2': done, '1.3': done, '2.1': done, '2.2': done, '2.3': done, '3.1': done } };
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify(progress))})`);
  await key('KeyK'); await settle(`game.scene.isActive('CampHub') && ${HUB}.player`); await t.run(900);
  await key('Digit4'); await settle(`Math.abs(${HUB}.player.x - 1028) < 4 && Math.abs(${HUB}.player.y - 394) < 4`, 80); await t.run(300);
  await key('KeyL'); await t.run(400); await key('KeyL');
  if (await settle(`game.scene.isActive('CampWarp')`, 30)) { await t.run(1200); await key('Enter'); }
  check('the Campaign scene starts on 3.2 (a level 3 battle with towers)', await settle(`game.scene.isActive('Campaign') && ${S}.camp && ${S}.camp.ships.some(u => u.kind === 'tower')`));
  for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'play'; i++) { await key('Enter'); await t.run(700); }
  check('the battle is in play', (await j(`${S}.mode`)) === 'play');

  // the stick taken, the fighter 600 px east of a tower, every tower and the fighter kept alive; the scene's towerTell is wrapped to count the calls
  await t.ev(`(() => { const sc = ${S}, C = sc.camp; C.god = true; window.__tells = []; const w = sc.towerTell.bind(sc); sc.towerTell = e => { window.__tells.push({ ms: e.ms, at: C.t }); return w(e); };
    const f = C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0 && !u.docked) || C.ships.find(u => u.team === 'earth' && u.kind === 'fighter' && u.hp > 0); const tw = C.ships.filter(u => u.kind === 'tower' && u.hp > 0).sort((a, b) => Math.hypot(a.x - C.carrier.x, a.y - C.carrier.y) - Math.hypot(b.x - C.carrier.x, b.y - C.carrier.y))[0];
    C.ships.forEach(u => { if (u.kind === 'tower') { u.hp = u.maxHp = 1e9; u.nextShot = 0; u.onFlown = null; } }); C.bullets.length = 0;
    f.docked = false; f.x = tw.x + 600; f.y = tw.y; f.vx = 0; f.vy = 0; campCockpitTake(C, f.id); window.__tw = tw.id; window.__f = f.id; window.__t0 = C.t; return 1; })()`);
  const rings = () => j(`(() => { const sc = ${S}; return sc.children.list.filter(o => o.texture && o.texture.key === 'ring' && o.tintTopLeft === 0xff6fa8 && o.active !== false).map(o => ({ s: +o.scaleX.toFixed(2), a: +o.alpha.toFixed(2), x: Math.round(o.x), y: Math.round(o.y) })); })()`);
  const shots = () => j(`${S}.camp.bullets.filter(b => b.team === 'alien' && b.from === window.__tw).length`);
  const hold = () => t.ev(`(() => { const C = ${S}.camp, f = C.by[window.__f]; f.x = C.by[window.__tw].x + 600; f.y = C.by[window.__tw].y; f.vx = 0; f.vy = 0; return 1; })()`);

  console.log('A. the tell comes once, as the tower turns on the fighter');
  await hold(); await t.run(120); await hold(); const r1 = await rings();
  check('the scene\'s towerTell was called once, with 1000 ms', (await j('window.__tells')).length === 1 && (await j('window.__tells[0].ms')) === 1000, JSON.stringify(await j('window.__tells')));
  check('a ring of the tell\'s colour is on the tower', r1.length === 1 && Math.abs(r1[0].x - (await j(`Math.round(${S}.camp.by[window.__tw].x)`))) < 2, JSON.stringify(r1));
  check('no shot yet', (await shots()) === 0);

  console.log('B. the ring closes, and the first shot comes after it');
  await hold(); await t.run(380); await hold(); const r2 = await rings();
  try { const p = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); writeFileSync(join(OUT, 'towerdelay-ring.png'), Buffer.from(p.data, 'base64')); } catch (e) { console.log('  (picture skipped: ' + e.message + ')'); }
  check('half a second on the ring is smaller and brighter than it was', r2.length === 1 && r1.length === 1 && r2[0].s < r1[0].s - 0.15 && r2[0].a > r1[0].a + 0.15, JSON.stringify([r1, r2]));
  check('still no shot half a second after it turned on the fighter', (await shots()) === 0);
  await hold(); await t.run(650); await hold(); const r3 = await rings();
  check('after the second the ring is gone', r3.length === 0, JSON.stringify(r3));
  let n = 0; for (let i = 0; i < 20 && n === 0; i++) { await hold(); await t.run(100); n = await shots(); }
  check('and the tower\'s first shot at the fighter comes after it', n > 0, String(n));
  check('still one tell in all', (await j('window.__tells')).length === 1, JSON.stringify(await j('window.__tells')));

  console.log('C. no error');
  const errs = (await j(`window.__errors || []`)).concat(t.errors || []);
  check('the game logged no error', errs.length === 0, JSON.stringify(errs).slice(0, 300));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); bad++; }
finally { try { await t.close(); } catch (e) { /* closed */ } }
process.exit(bad ? 1 : (console.log('\nTOWER DELAY BOOT PASS'), 0));
