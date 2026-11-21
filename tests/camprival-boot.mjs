// not in the smoke: the picture check of the rival ship, run by hand (one Chrome, muted, through the test lock; card space-game-rival-duel)
// The rules are tests/camprival.mjs (plain Node). This boots the Campaign once on a plain battle ground (the belt fixture) and watches a pirate leader fight in its phases: stalking with its shield bubble and its
// bars, charging (the ring, the line of fire, the HUD warning), its shield down, ramming, and the Tab map with its mark. A picture of each goes to RIVAL_SHOTS (default ~/dev/spacegame-night/shots/rival-*.png),
// never into the repository.
//   node tests/camprival-boot.mjs        exit code 1 when a check fails or the game logged an error
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { beltSource } from './fixtures/campbelt.mjs';
const belt = async t => { await t.ev(beltSource(1)); await t.ev(`(() => { game.scene.stop('Campaign'); game.scene.start('Campaign', { level: 1, techs: [], via: 'address' }); return 1; })()`); };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.RIVAL_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Enter: 13, Tab: 9, Escape: 27 };
const press = async (t, code, wait = 40) => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); };
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'rival-' + name + '.png'), Buffer.from(r.data, 'base64')); } };

const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 30000, 'the Campaign scene'); await belt(t); await t.clock(); await t.run(700);
  await press(t, 'Enter'); await t.run(300); await press(t, 'Enter'); await t.run(300);
  await t.ev(`(() => { const s = ${SC}; if (s.mode !== 'play') s.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(500);
  // a quiet battle: the carrier cannot die, no other alien, the leader brought in 700 px from the carrier, which is at rest
  await t.ev(`(() => { const C = ${SC}.camp; C.god = true; C.motherSpawn = 1e12; C.waves.forEach(w => { w.started = true; }); C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; });
    C.L.rivals = [{ id: 'leader', kind: 'pirateleader', at: 0 }]; return 1; })()`);
  await t.run(400);
  await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier, u = C.ships.find(s => s.rival); c.vx = 0; c.vy = 0; c.rot = 0; u.x = c.x + 700; u.y = c.y - 60; u.vx = 0; u.vy = 0; u.rot = Math.PI; return 1; })()`);
  await t.run(1200);
  const s1 = await j(`({ mode: ${SC}.mode, ph: ${SC}.camp.ships.find(s => s.rival).rival.ph, name: ${SC}.hud.rivalName && ${SC}.hud.rivalName.text, cmds: ${SC}.rivalG ? ${SC}.rivalG.commandBuffer.length : -1, bars: 2 })`);
  check('in play, the leader stalks: its name is at the top and its layer is drawn (a bubble and small bars)', s1.mode === 'play' && s1.ph === 'stalk' && s1.name === 'PIRATE LEADER' && s1.cmds > 8, JSON.stringify(s1));
  await snap(t, '1-stalk');
  const until = async (ph, max = 24000) => { for (let ms = 0; ms < max; ms += 250) { if ((await j(`${SC}.camp.ships.find(s => s.rival) && ${SC}.camp.ships.find(s => s.rival).rival.ph`)) === ph) return true; await t.run(250); } return false; };
  check('it comes to its charge', await until('charge'));
  await t.run(1800);
  const s2 = await j(`({ phase: ${SC}.hud.rivalPhase.text, cmds: ${SC}.rivalG.commandBuffer.length })`);
  check('in the charge the HUD warns and the ring and the line of fire are drawn', s2.phase === 'BROADSIDE CHARGING' && s2.cmds > 12, JSON.stringify(s2));
  await snap(t, '2-charge');
  check('it fires and its shield drops', await until('down'));
  await t.run(900);
  const s3 = await j(`({ phase: ${SC}.hud.rivalPhase.text, sh: ${SC}.camp.ships.find(s => s.rival).rival.sh, hull: ${SC}.camp.carrier.hp })`);
  check('the HUD says SHIELDS DOWN, the shield is nothing', s3.phase === 'SHIELDS DOWN' && s3.sh === 0, JSON.stringify(s3));
  await snap(t, '3-down');
  check('then it turns to ram', await until('ram'));
  await t.run(900); await snap(t, '4-ram');
  await t.run(3000);
  await press(t, 'Tab'); await t.run(900); await snap(t, '5-map');
  check('the Tab map is open with the rival marked and in the legend', await j(`!!${SC}.mp && campMapMarks(${SC}.camp, false).some(m => m.type === 'rival') && campMapLegend(${SC}.camp).some(r => r.type === 'rival')`));
  await press(t, 'Escape');
  const errs = (t.errors || []).slice(0, 5); check('the game logged no errors', errs.length === 0, errs.join(' | '));
} finally { await t.close(); }
process.exitCode = bad ? 1 : 0;
