// not in the smoke: the picture check of the anomalies, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-anomalies)
// The rules are tests/campanomaly.mjs (plain Node). This boots the Campaign once and does what the pilot does: comes near a warped spot (the haze is drawn, the map has its mark), stays two seconds in its
// range (the cloak drops, the cache and its guards are shown), kills the guards (the loot lies on the cache and is saved), and opens the Tab map with the anomaly noticed. Pictures of each go to ANOM_SHOTS
// (default ~/dev/spacegame-night/shots/anom-*.png), never into the repository.
//   node tests/campanomaly-boot.mjs        exit code 1 when a check fails or the game logged an error
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { beltSource } from './fixtures/campbelt.mjs';
// the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots): this boot was written for it and pins its missions and words; the rim run is checked in tests/camprim.mjs. The address started the Campaign scene on the rim run, so it starts again.
const belt = async t => { await t.ev(beltSource(1)); await t.ev(`(() => { game.scene.stop('Campaign'); game.scene.start('Campaign', { level: 1, techs: [], via: 'address' }); return 1; })()`); };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.ANOM_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Enter: 13, Tab: 9, Escape: 27 };
const press = async (t, code, wait = 40) => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait); };
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'anom-' + name + '.png'), Buffer.from(r.data, 'base64')); } };

const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 30000, 'the Campaign scene'); await belt(t); await t.clock(); await t.run(700);
  await press(t, 'Enter'); await t.run(300); await press(t, 'Enter'); await t.run(300);
  await t.ev(`(() => { const s = ${SC}; if (s.mode !== 'play') s.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(500);
  // a quiet battle: the carrier cannot die, no alien but the cache's, the carrier at rest 450 px from the veil
  await t.ev(`(() => { const C = ${SC}.camp; C.god = true; C.motherSpawn = 1e12; C.waves.forEach(w => { w.started = true; }); C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; });
    const a = C.anoms.find(q => q.id === 'veil'), c = C.carrier; c.x = a.x - 450; c.y = a.y + 40; c.vx = 0; c.vy = 0; c.rot = 0; return 1; })()`);
  await t.run(900);
  const s1 = await j(`({ mode: ${SC}.mode, state: ${SC}.camp.anoms[0].state, sensed: ${SC}.camp.anoms[0].sensed, cmds: ${SC}.anomG ? ${SC}.anomG.commandBuffer.length : -1, marks: campAnomMarks(${SC}.camp).length, errors: 0 })`);
  check('in play, the veil noticed at 450 px: its mark is on the map (a mark), and the haze is drawn this frame (a layer of its own with commands in it)', s1.mode === 'play' && s1.sensed && s1.marks === 1 && s1.cmds > 40, JSON.stringify(s1));
  await snap(t, '1-haze');
  await t.ev(`(() => { const C = ${SC}.camp, a = C.anoms.find(q => q.id === 'veil'); C.carrier.x = a.x - 90; C.carrier.y = a.y; return 1; })()`);
  await t.run(1000); await snap(t, '2-visit');
  await t.run(1600);
  const s2 = await j(`({ state: ${SC}.camp.anoms.find(q => q.id === 'veil').state, guards: ${SC}.camp.ships.filter(u => u.anom === 'veil').length })`);
  check('two seconds in its range: the cloak drops, two raiders come out (a flash, and the cache is drawn)', s2.state === 'revealed' && s2.guards === 2, JSON.stringify(s2));
  await snap(t, '3-revealed');
  await t.ev(`(() => { const C = ${SC}.camp; C.ships.forEach(u => { if (u.anom === 'veil') u.hp = 0; }); C.carrier.x += 2000; return 1; })()`);
  await t.run(1800);
  const s3 = await j(`({ state: ${SC}.camp.anoms.find(q => q.id === 'veil').state, chunks: ${SC}.camp.pickups.filter(p => p.kind === 'chunk').length, found: ${SC}.P.found, saved: JSON.parse(localStorage.getItem(CAMP.store)).found, mag: ${SC}.camp.magazine })`);
  check('the guards dead: the cache is looted (three chunks of ore lie there), the magazine holds two more, and the keys are saved at once', s3.state === 'done' && s3.chunks === 3 && s3.found.includes('1.veil') && s3.saved.includes('1.veil') && s3.mag === 8, JSON.stringify(s3));
  await snap(t, '4-loot');
  await t.ev(`(() => { const C = ${SC}.camp, a = C.anoms.find(q => q.id === 'lee'); C.carrier.x = a.x - 1500; C.carrier.y = a.y; return 1; })()`); await t.run(600);
  await press(t, 'Tab'); await t.run(900); await snap(t, '5-map');
  check('the Tab map is open, with the lee noticed on it (a mark of its own, in the legend, and in the list as "Anomaly")', (await j(`!!${SC}.mp && campMapMarks(${SC}.camp, false).some(m => m.type === 'anomaly') && campMapLegend(${SC}.camp).some(r => r.type === 'anomaly') && campNavRows(${SC}.camp).some(r => r.name === 'Anomaly')`)) === true);
  await press(t, 'Escape');
  const errs = (t.errors || []).slice(0, 5); check('the game logged no errors', errs.length === 0, errs.join(' | '));
} finally { await t.close(); }
process.exitCode = bad ? 1 : 0;
