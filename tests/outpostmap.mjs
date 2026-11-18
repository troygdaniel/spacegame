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
    // the legend lists what is on the map now (card space-game-critic-map): at the start no pirate has been seen and no site found, so no row for those
    const leg = JSON.parse(await t.ev(`JSON.stringify(game.scene.getScene('Overlay').legend)`));
    check(`${tag}: legend has a Kestrel Outpost row, and no row for a thing that is not on the map`, leg.some(r => r[1] === 'outpost' && r[0] === 'Kestrel Outpost') && leg.length >= 4 && leg.length <= 8 && !leg.some(r => ['live', 'stale', 'wanted', 'poi'].includes(r[1])), JSON.stringify(leg));
    check(`${tag}: last legend row ends above the footer, with 9 rows and with all 11`, await t.ev(`MAP_LEG_Y + 8 * mapLegStep(9) + 20 < 638 && MAP_LEG_Y + 10 * mapLegStep(11) + 20 < 638`));
    // no two names on the map touch, and each is inside the frame
    const names = JSON.parse(await t.ev(`JSON.stringify((() => { const o = game.scene.getScene('Overlay'); return o.marks.map(k => ({ t: k.lb.text, x: k.lb.x, y: k.lb.y - 3, w: k.w, h: k.h, in: k.lb.x - k.w / 2 >= o.MX && k.lb.x + k.w / 2 <= o.MX + o.MS && k.lb.y - 3 - k.h / 2 >= o.MY && k.lb.y - 3 + k.h / 2 <= o.MY + o.MS })); })())`));
    const touch = []; names.forEach((a, i) => names.slice(i + 1).forEach(b => { if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) touch.push(a.t + ' / ' + b.t); }));
    check(`${tag}: ${names.length} names on the map, none touching another, all inside the frame`, names.length >= 4 && touch.length === 0 && names.every(n => n.in), touch.join(', ') + ' ' + names.filter(n => !n.in).map(n => n.t).join(', '));
    if (!(await t.shot('outpostmap-' + tag))) check(`${tag}: screenshot`, false);
    await tap(t, 'Esc');
    check(`${tag}: Esc closes the map`, !(await t.ev(`game.scene.isActive('Overlay')`)));
    check(`${tag}: no console errors`, t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
}
console.log(bad ? 'OUTPOST MAP FAIL' : 'OUTPOST MAP PASS');
process.exitCode = bad ? 1 : 0;
