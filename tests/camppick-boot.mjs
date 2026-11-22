// not in the smoke: a boot of the target pick, run by hand (one Chrome, muted, through the test lock; card space-game-order-target-pick)
// The rules are tests/camppick.mjs (plain Node). This boots the real game once, in mission 1.1 with the wing out, and plays the keys as a player does: three hostiles are put in the battle, E opens the red squad's list, Enter on Attack
// opens the target sub-list (no order yet), Down moves the highlight to a hostile that is far off the screen and the view zooms out to show it with the cruiser (a bracket is on it), Esc goes back to the red squad's list and the zoom is
// the player's again, Enter and Down and Enter gives the order at the one chosen (it is the target, the red squad attacks it), Q then the red squad's row then Attack then Esc, Esc, Esc goes back through the lists one by one, and the
// foot of a list that a row opened says Esc back. A rock field sub-list (Mine ore, in the all-squads list) is drawn too. Pictures go to the folder in PICK_SHOTS (default ~/dev/spacegame-night/shots/pick-*.png), never into the repository.
//   node tests/camppick-boot.mjs
// Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.PICK_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { KeyQ: 81, KeyE: 69, KeyW: 87, Enter: 13, Escape: 27, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };

async function key(t, code, extra = {}, wait = 40) { // a real key: down, a few frames, up (the game clock is stepped, so waits are game milliseconds)
  const k = Object.assign({ windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: /^(Enter|Arrow|Escape)/.test(code) ? code : code.replace(/^Key/, '').toLowerCase() }, extra);
  await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait);
}
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'pick-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture pick-' + name); };

const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 8 && (await j(`${SC}.mode`)) !== 'play'; i++) { await key(t, 'Enter', {}, 40); await t.run(300); }
  check('the battle is on (mission 1.1)', (await j(`${SC}.mode`)) === 'play');
  await t.ev(`campOrder(${SC}.camp, 'launch')`); await t.run(9000); // the wing leaves the bay
  await t.ev(`(() => { const C = ${SC}.camp; C.ships = C.ships.filter(u => u.team !== 'alien'); C.tgt = ''; })()`);
  check('the wing is out (six fighters) and no hostile is about', (await j(`campWing(${SC}.camp, 'fighter').length`)) === 6 && (await j(`campAliens(${SC}.camp).length`)) === 0);
  const zoomNow = () => j(`${SC}.cameras.main.zoom`), want = () => j('CAMZOOM.want');
  await t.run(2500);
  const z0 = await zoomNow();
  await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; campSpawn(C, 'raider', c.x + 700, c.y - 200); campSpawn(C, 'skiff', c.x + 1500, c.y + 600); campSpawn(C, 'raider', c.x - 3300, c.y + 400); })()`);
  await t.run(300);
  await key(t, 'KeyE'); await key(t, 'Enter'); await t.run(600);
  check('E opens the red squad\'s list and Enter on Attack the target opens the sub-list of the three hostiles: no order yet, the list it came from is still the open one', (await j(`${SC}.pn.open`)) === 'red' && !!(await j(`${SC}.pn.pick`)) && (await j(`campPickSync(${SC}.camp, ${SC}.pn.pick).length`)) === 3 && (await j(`${SC}.camp.orders.attack | 0`)) === 0 && (await j(`${SC}.camp.tgt`)) === '');
  check('the sub-list is drawn: PICK A TARGET heads it, three candidates (name, km, hull) are its rows, its foot names Esc back', (await j(`${SC}.pnl.title.text`)) === 'E   PICK A TARGET' && (await j(`${SC}.pnl.rows.filter(r => r.name.visible).length`)) === 3 && /Esc back/.test(await j(`${SC}.pnl.keys.text`)) && /km/.test(await j(`${SC}.pnl.rows[0].suffix.text`)), (await j(`${SC}.pnl.rows.map(r => r.name.text + '|' + r.suffix.text).join(' ; ')`)));
  check('a bracket layer is made for the highlighted candidate (cyan: the sub-list\'s, not the target\'s red)', !!(await j(`!!${SC}.pickG`)));
  await snap(t, '1-sub-list-open');
  await t.ev(`${SC}.camp.god = true`); // (the hostiles cannot end the battle while the keys are pressed)
  const order = await j(`campPickSync(${SC}.camp, ${SC}.pn.pick).map(i => [i.id, Math.abs(i.x - ${SC}.camp.carrier.x)])`), fi = order.reduce((b, x, k) => (x[1] > order[b][1] ? k : b), 0), far = order[fi][0];
  for (let i = 0; i < fi; i++) { await key(t, 'ArrowDown'); await t.run(300); }
  await t.run(900);
  const zFar = await zoomNow();
  check('moving the highlight to the farthest hostile (about 3,300 px away to the left): it is shown with the cruiser: the view has zoomed OUT (less than it was) so that it is inside the screen to the right of the list', (await j(`${SC}.pn.pick.sel`)) === far && zFar < z0 - 0.02 && (await j(`(() => { const s = ${SC}, C = s.camp, u = C.by['${far}'], z = s.cameras.main.zoom; return W / 2 + (u.x - C.carrier.x) * z; })()`)) > 400, `z0 ${z0} -> ${zFar}`);
  await snap(t, '2-revealed-far');
  await key(t, 'Escape'); await t.run(1200);
  check('Esc goes back to the red squad\'s list (the sub-list is gone, the list is still open on Attack) and the zoom is the player\'s again', (await j(`${SC}.pn.open`)) === 'red' && (await j(`${SC}.pn.pick`)) === null && Math.abs((await zoomNow()) - z0) < 0.01, `${await zoomNow()} vs ${z0}`);
  await key(t, 'Enter'); await t.run(300); await key(t, 'ArrowDown'); await key(t, 'Enter'); await t.run(900);
  const tgt = await j(`${SC}.camp.tgt`);
  check('Enter, Down, Enter chooses the second hostile: it is THE target, the red squad attacks it, the lists are closed, and the view is the player\'s', !!tgt && (await j(`${SC}.pn.open`)) === '' && (await j(`campWing(${SC}.camp, 'fighter').filter(u => u.squad === 'red').every(u => u.order && u.order.type === 'attack' && u.order.target === '${tgt}')`)) && Math.abs((await zoomNow()) - z0) < 0.01);
  await snap(t, '3-chosen');
  await t.ev(`${SC}.camp.tgt = ''`);
  await key(t, 'KeyQ'); await t.run(200);
  for (let i = 0; i < 12 && !(await j(`campPanelList(${SC}.camp, 'fleet')[${SC}.pn.at].open === 'red'`)); i++) await key(t, 'ArrowDown');
  await key(t, 'Enter'); await t.run(200); await key(t, 'Enter'); await t.run(400);
  check('Q, the Red squad row, Enter, then Attack: a sub-list over the red squad\'s list, reached by a row (its foot says Esc back)', (await j(`${SC}.pn.open`)) === 'red' && !!(await j(`${SC}.pn.pick`)) && (await j(`${SC}.pn.trail.join()`)) === 'fleet');
  await key(t, 'Escape'); await key(t, 'Escape');
  check('Esc, Esc: back to the red squad, then to Q on the Red squad row', (await j(`${SC}.pn.open`)) === 'fleet' && (await j(`campPanelList(${SC}.camp, 'fleet')[${SC}.pn.at].open`)) === 'red');
  await snap(t, '4-back-to-q');
  await key(t, 'Escape'); await t.run(200);
  check('the third Esc closes Q; the fourth (nothing open) pauses the game', (await j(`${SC}.pn.open`)) === '' && (await j(`${SC}.mode`)) === 'play');
  await key(t, 'Escape'); await t.run(300);
  check('and pauses', (await j(`${SC}.mode`)) === 'pause'); await key(t, 'Escape'); await t.run(300);
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nTARGET PICK BOOT FAIL (${bad})` : '\nTARGET PICK BOOT PASS');
process.exit(bad ? 1 : 0);
