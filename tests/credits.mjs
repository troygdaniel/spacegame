// Credits are unmistakable: node tests/credits.mjs
// The HUD strip (coin, CR label, gold figure, +N / -N float, pulse both ways) in the station, in flight and on the surface, and the
// gold "N CR" tag with a coin on the mission board, the shop (pops and floats -N after a purchase), the map and the pause menu.
// Changes are made and read in one evaluation (the strip is stepped by hand with hudTick) so a busy Mac cannot miss a 1 s float.
// Saves tests/out/credits-station.png, credits-shop.png, credits-map.png. Exit code 1 on a failed check or a console error.
import { launch, sleep } from './cdp.mjs';

let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const scene = n => `game.scene.getScene('${n}')`;
const ready = (t, n) => t.waitFor(`!!(window.game && game.scene.isActive('${n}'))`, 30000, n + ' active');
const clearToasts = (t, n) => t.ev(`(() => { const s = ${scene(n)}; (s.toasts || []).forEach(o => { o.t.destroy(); o.bg.destroy(); o.tab.destroy(); }); s.toasts = []; })()`);

// the strip in one scene: a gain, then a loss
async function strip(t, n, tag) {
  await sleep(1500); await t.ev('G.guideDone = true');
  const r = await t.ev(`(() => {
    const s = ${scene(n)}; G.credits = 1250; hudTick(s); const h = s._hud; h.crShow = 1250; h.flash = 0; h.pulse = 0; hudTick(s); // the first change flashed the figure; read it once the flash is over
    const rest = { cr: h.t.crv.text, label: h.t.crl.text, col: h.t.crv._hc, vis: h.t.crv.visible && h.t.crl.visible };
    G.credits += 185; hudTick(s);
    const gain = { fl: h.t.crd.text, flCol: h.t.crd._hc, pulse: h.pulse > s.time.now, pc: h.pulseCol };
    G.credits -= 300; hudTick(s);
    const loss = { fl: h.t.crd.text, flCol: h.t.crd._hc, pulse: h.pulse > s.time.now, pc: h.pulseCol, figure: h.t.crv._hc };
    return JSON.stringify({ rest, gain, loss });
  })()`);
  const o = JSON.parse(r);
  check(`${tag}: strip shows the figure with a comma and the label CR`, o.rest.cr === '1,250' && o.rest.label === 'CR' && o.rest.vis, JSON.stringify(o.rest));
  check(`${tag}: the figure is gold`, o.rest.col === '#ffd24a');
  check(`${tag}: a gain floats +185 in green and lights the strip gold`, o.gain.fl === '+185' && o.gain.flCol === '#6dff9c' && o.gain.pulse && o.gain.pc === 0xffd24a, JSON.stringify(o.gain));
  check(`${tag}: a loss floats -300 in red, lights the strip red and flashes the figure red`, o.loss.fl === '-300' && o.loss.flCol === '#ff4d6d' && o.loss.pulse && o.loss.pc === 0xff4d6d && o.loss.figure === '#ff4d6d', JSON.stringify(o.loss));
}

// ---- station: the strip, the mission board, the shop, the map, the pause menu ----
{
  const t = await launch('#station');
  try {
    await ready(t, 'Station');
    await strip(t, 'Station', 'station');
    await clearToasts(t, 'Station');
    await t.ev('G.credits = 1250');
    await sleep(2500);
    if (!(await t.shot('credits-station'))) check('screenshot of the station strip', false);

    await t.ev(`${scene('Station')}.openPanel()`); await sleep(400);
    check('mission board: tag is "1,250 CR" with a coin', await t.ev(`(() => { const u = ${scene('Station')}.ui; return u.tagText.text === '1,250 CR' && !!u.coin; })()`), await t.ev(`${scene('Station')}.ui.tagText.text`));
    await t.ev(`(() => { const s = ${scene('Station')}; s.panelBox.setVisible(false); s.panel = false; })()`);

    await t.ev(`(() => { const s = ${scene('Station')}; s.panel = true; s.shopOpen = true; s.shopBox.setVisible(true); refreshShop(s); })()`);
    const buy = JSON.parse(await t.ev(`(() => {
      const s = ${scene('Station')}, u = s.shopUI, before = u.tagText.text;
      const n0 = u.box.list.length; buyUpgrade(s, 0);
      const floats = u.box.list.filter(o => o.type === 'Text' && /^-\\d+$/.test(o.text)).map(o => o.text);
      return JSON.stringify({ before, after: u.tagText.text, floats, red: u.tagText.style.color });
    })()`));
    check('shop: tag is "1,250 CR" before a purchase', buy.before === '1,250 CR', buy.before);
    check('shop: after buying armour for 300 the tag says "950 CR" and a -300 floats from it', buy.after === '950 CR' && buy.floats.join() === '-300', JSON.stringify(buy));
    check('shop: the tag flashes red on a loss', buy.red === '#ff4d6d', buy.red);
    await sleep(300);
    if (!(await t.shot('credits-shop'))) check('screenshot of the shop', false);
    await t.ev(`closeShop(${scene('Station')})`);

    await t.ev(`game.scene.start('Overlay', { from: 'Station', mode: 'map' })`); await sleep(700);
    check('map: shows "950 CR" in gold, with the hull beside it', await t.ev(`(() => { const o = ${scene('Overlay')}; return o.tCr.text === '950 CR' && o.tCr.style.color === '#ffd24a' && /^HULL /.test(o.tHud.text); })()`));
    if (!(await t.shot('credits-map'))) check('screenshot of the map', false);
    await t.ev(`game.scene.stop('Overlay')`);

    await t.ev(`game.scene.start('Pause', { from: 'Station' })`); await sleep(500);
    check('pause menu: tag is "950 CR" with a coin', await t.ev(`(() => { const u = ${scene('Pause')}.ui; return u.tagText.text === '950 CR' && !!u.coin; })()`));
    check('no console errors (station)', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
}

// ---- flight and surface: the same strip ----
for (const [hash, n, tag] of [['#space', 'Space', 'flight'], ['#surface', 'Surface', 'surface']]) {
  const t = await launch(hash);
  try {
    await ready(t, n);
    await strip(t, n, tag);
    check(`no console errors (${tag})`, t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
}
console.log(bad ? 'CREDITS FAIL' : 'CREDITS PASS');
process.exitCode = bad ? 1 : 0;
