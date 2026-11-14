// smoke: Kestrel Outpost on the Tab map: hexagon, label, legend row
// The Tab sector map shows Kestrel Outpost (hexagon, label, legend row) in flight and when docked: node tests/outpostmap.mjs
// Saves tests/out/outpostmap-space.png and outpostmap-station.png. Exit code 1 on a failed check or a console error.
import { launch, sleep } from './cdp.mjs';

const KEY = { Tab: [9, 'Tab', 'Tab'], Esc: [27, 'Escape', 'Escape'] };
const tap = async (t, k, hold = 110) => {
  const [vk, code, key] = KEY[k];
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, code, key }); await sleep(hold);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, code, key }); await sleep(300);
};
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

for (const [hash, scene, tag] of [['#space', 'Space', 'space'], ['#station', 'Station', 'station']]) {
  const t = await launch(hash);
  try {
    await t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, 30000, scene + ' active');
    await sleep(1500); await t.ev('G.guideDone = true');
    await tap(t, 'Tab');
    check(`${tag}: Tab opens the map`, await t.ev(`game.scene.isActive('Overlay') && game.scene.getScene('Overlay').mode === 'map'`));
    await sleep(400);
    check(`${tag}: outpost label is on the map`, await t.ev(`(() => { const o = game.scene.getScene('Overlay'); return o.lbOutpost.visible && o.lbOutpost.text === 'KESTREL OUTPOST'; })()`));
    check(`${tag}: legend has a Kestrel Outpost row, 9 rows in all`, await t.ev(`(() => { const l = game.scene.getScene('Overlay').legend; return l.length === 9 && l.some(r => r[1] === 'outpost'); })()`));
    check(`${tag}: last legend row ends above the footer`, await t.ev(`MAP_LEG_Y + 8 * MAP_LEG_STEP + 20 < 638`));
    if (!(await t.shot('outpostmap-' + tag))) check(`${tag}: screenshot`, false);
    await tap(t, 'Esc');
    check(`${tag}: Esc closes the map`, !(await t.ev(`game.scene.isActive('Overlay')`)));
    check(`${tag}: no console errors`, t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
}
console.log(bad ? 'OUTPOST MAP FAIL' : 'OUTPOST MAP PASS');
process.exitCode = bad ? 1 : 0;
