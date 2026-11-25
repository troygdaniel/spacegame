// not in the smoke: the stars at the flight's zooms in the real game (one Chrome, muted, through the test lock; card space-game-stars-at-zoom)
// It boots mission 1.1, flies the carrier on (moved by hand, the camera follows it), and at the start zoom (0.335), at the mission's farthest zoom and zoomed in measures how far each star layer
// moves on the screen against how far a fixed place (Luna) does: the near layer must not move faster than the place, in proportion to its factor (0.85), at every zoom. Pictures of the start zoom
// before and after the flight go to HUNT_SHOTS.
//   node tests/starszoom-boot.mjs [--level 1] [--mission 1]        pictures go to HUNT_SHOTS (default ~/dev/spacegame-night/shots/stars-*.png), never into the repository
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
const VK = { KeyQ: 81, KeyK: 75, KeyL: 76, Backspace: 8, KeyS: 83, Minus: 189, Equal: 187, Enter: 13, Escape: 27 };
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), S = `game.scene.getScene('Campaign')`;
  const zr = async () => (await j(`campKeyCodes('zoomreset')[0] || ''`)) || 'KeyQ'; // the key that puts the zoom and the view back and opens the cruiser list, read from the key table (Q since card space-game-keys5-qwe; it was S)
  const kd = code => ({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Minus' ? '-' : code === 'Equal' ? '=' : code === 'Backspace' ? 'Backspace' : code.replace(/^(Key|Digit)/, '').toLowerCase() });
  const key = async (code, wait = 60) => { await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, kd(code))); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, kd(code))); await t.run(wait); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `stars-${LEVEL}${MISSION}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(60); } };
  const shut = async () => { for (let n = 0; n < 4 && (await j(`!!campPanelOpen(${S}.pn)`)); n++) await key('Escape'); }; // S opens the cruiser list as well as resetting the view (card space-game-keys2-cruiser): Esc closes it, so the arrows fly the ship again and Tab opens the map (Esc with no list open would pause: it is pressed only while one is)
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };

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
  await t.ev(`(() => { const C = ${S}.camp; C.god = true; })()`);
  await t.run(900);

  // the carrier moved on by hand: per frame step px along its heading; the layers' tile positions summed per frame (the tiles repeat every 4096, so each frame's change is unwrapped)
  const walk = async (frames, step) => {
    await t.ev(`(() => { const s = ${S}, L = s.bgLayers; window.__w = { last: L.map(l => [l.tilePositionX, l.tilePositionY]), sum: L.map(() => 0), p0: camzoomScreen(s, ${await j('campPlaces(1).luna.x')}, ${await j('campPlaces(1).luna.y')}), z0: s.cameras.main.zoom }; })()`);
    for (let i = 0; i < frames; i++) {
      await t.ev(`(() => { const c = ${S}.camp.carrier; c.x += ${step}; })()`);
      await t.run(20);
      await t.ev(`(() => { const s = ${S}, L = s.bgLayers, w = window.__w; L.forEach((l, k) => { let d = l.tilePositionX - w.last[k][0]; if (d > 2048) d -= 4096; if (d < -2048) d += 4096; w.sum[k] += d; w.last[k] = [l.tilePositionX, l.tilePositionY]; }); })()`);
    }
    return j(`(() => { const s = ${S}, w = window.__w, p = camzoomScreen(s, ${await j('campPlaces(1).luna.x')}, ${await j('campPlaces(1).luna.y')}); return { z: s.cameras.main.zoom, place: p.x - w.p0.x, layers: w.sum, par: s.bgLayers.map(l => l.par) }; })()`);
  };
  const lunaOk = await j('typeof campPlaces === "function" && !!campPlaces(1).luna');
  check('Luna is a place of level 1 to measure against', lunaOk);

  await snap('1-start-zoom-before');
  const far = await j('CAMZOOM.min'), DEF = 1 / Math.pow(1.2, 6);
  const at = async (name, setup) => {
    await setup(); await t.run(900);
    const r = await walk(60, 60);
    const ratios = r.layers.map(v => Math.abs(r.place) > 1 ? Math.abs(v / r.place) : NaN); // (the camera goes one way, the place and the tiles the other: the sizes)
    note(`${name}: zoom ${r.z.toFixed(3)}, Luna moved ${r.place.toFixed(0)} px on the screen, the layers ${r.layers.map(v => v.toFixed(0)).join(' / ')}, ratios ${ratios.map(v => v.toFixed(3)).join(' / ')} (the factors ${r.par.join(' / ')})`);
    return { r, ratios };
  };
  const a = await at('start zoom', async () => {});
  check('start zoom (0.335): the near layer moves about 0.85 of what a fixed place does on the screen, never more (it was 2.5 times)', a.ratios[2] > 0.7 && a.ratios[2] <= 0.88, a.ratios.map(v => v.toFixed(3)).join(' / '));
  check('start zoom: the far layers lag in order (0.2, 0.45, 0.85 of the place)', a.ratios[0] < a.ratios[1] && a.ratios[1] < a.ratios[2] && a.ratios[0] > 0.1 && a.ratios[0] < 0.3, a.ratios.map(v => v.toFixed(3)).join(' / '));
  await snap('2-start-zoom-after');
  let zs = 0; const b = await at('farthest zoom', async () => { for (let i = 0; i < 14; i++) { await key('Minus', 40); zs++; } });
  check('the farthest zoom of the mission (' + far.toFixed(4) + '): the near layer is still no faster than a fixed place', Math.abs(b.r.z - far) < 0.01 && b.ratios[2] <= 0.88 && b.ratios[2] > 0.5, b.ratios.map(v => v.toFixed(3)).join(' / '));
  check('the farthest zoom: the stars barely move on the screen for a flight (the near layer under 100 px for 3,600 px of flight)', Math.abs(b.r.layers[2]) < 100, b.r.layers.map(v => v.toFixed(1)).join(' / '));
  await snap('3-far-zoom');
  const c = await at('zoomed in', async () => { await key(await zr(), 40); await shut(); for (let i = 0; i < 9; i++) await key('Equal', 40); });
  check('zoomed in (1 and over) the near layer keeps its old 0.85 of the scroll: against a place that moves at the zoom it is 0.85 / zoom', c.r.z >= 1 && Math.abs(c.ratios[2] - 0.85 / c.r.z) < 0.08, c.ratios.map(v => v.toFixed(3)).join(' / ') + ' at zoom ' + c.r.z.toFixed(2));
  const errs = await j(`window.__errors || []`); check('the game logged no error', !errs || errs.length === 0, JSON.stringify(errs).slice(0, 300));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.stack ? e.stack.split('\n').slice(0, 3).join(' | ') : e)); bad++; }
finally { try { await t.close(); } catch (e) { /* closed */ } }
process.exit(bad ? 1 : (console.log('\nSTARS AT ZOOM WALK PASS'), 0));
