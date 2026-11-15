// smoke: the hyperspace tunnel demo (#hyper, #hyper24, #hyper2): timing, readout, colour; no save written
// The hyperspace tunnel demo (src/hyperspace.js), opened only from the test hash. Run: node tests/hyper.mjs
//   #hyper    Kestrel, 6.3 ly: 10.08 s, cyan. Checked at the start, in the middle and at the end (stepped by hand,
//             so the Mac being busy cannot change the timing); the screenshots are tests/out/hyper-*.png
//   #hyper24  a long jump: the time clamps at 30 s and the colour is warm
//   #hyper2   a short one: the time clamps up to 6 s
// Fails on a console error. The demo must never touch the save (DEV_HASH in meta.js).
import { launch, sleep } from './cdp.mjs';

let failed = false;
const check = (ok, what) => { if (ok) console.log('  ok  ' + what); else { console.error('  FAIL ' + what); failed = true; } };

async function open(hash) {
  const t = await launch(hash);
  await t.waitFor(`!!(window.game && game.scene.isActive('Hyper'))`, 20000, 'Hyper scene active');
  await t.clock();
  return t;
}

// the numbers
{
  const t = await open('#hyper');
  try {
    const info = await t.ev(`(() => { const s = game.scene.getScene('Hyper'); return { dur: s.dur, ly: s.ly, fuel: s.fuel, dest: s.dest, tint: s.tint }; })()`);
    check(Math.abs(info.dur - 10.08) < 0.01, `#hyper lasts ${info.dur.toFixed(2)} s (6.3 ly x 1.6)`);
    check(info.fuel === 6 && info.dest === 'KESTREL OUTPOST', `#hyper shows ${info.dest}, fuel ${info.fuel}`);
    await t.run(2500);
    check(await t.ev(`game.scene.getScene('Hyper').t > 2.4`), 'the tunnel clock runs');
    check(await t.ev(`game.scene.getScene('Hyper').gates.length >= 3`), 'gates are on their way past the ship');
    await t.shot('hyper-early');
    await t.run(4500);
    await t.shot('hyper-mid');
    const txt = await t.ev(`(() => { const h = game.scene.getScene('Hyper').h.t; return { tl: h.tlv.text, fl: h.flv.text, dest: h.dest.text }; })()`);
    check(/^\d+\.\d s$/.test(txt.tl) && txt.tl !== '10.1 s', `time left counts down (${txt.tl})`);
    check(txt.fl === '6' && txt.dest === 'KESTREL OUTPOST', 'readout shows fuel burned and the destination');
    await t.run(2500);
    await t.shot('hyper-late');
    check(await t.ev(`!game.scene.getScene('Hyper').arrived`), 'still in the tunnel at 9.5 s');
    await t.run(1500);
    check(await t.ev(`game.scene.getScene('Hyper').arrived`), 'arrival at the end of the time');
    await t.shot('hyper-arrive');
    await t.run(1500);
    check(await t.ev(`game.scene.isActive('Title')`), 'the demo hands back to the title screen');
    check(await t.ev(`localStorage.getItem(SAVE_KEY) === null`), 'the demo wrote no save');
    check(t.errors.length === 0, 'no console errors' + (t.errors.length ? ': ' + t.errors.join(' | ') : ''));
  } catch (e) { console.error('  FAIL #hyper: ' + e.message); failed = true; } finally { await t.close(); }
}

// a long jump: 30 s, warm colour
{
  const t = await open('#hyper24');
  try {
    const info = await t.ev(`(() => { const s = game.scene.getScene('Hyper'); return { dur: s.dur, fuel: s.fuel, tint: s.tint }; })()`);
    check(info.dur === 30, `#hyper24 clamps to ${info.dur} s`);
    check(((info.tint >> 16) & 255) > 200 && (info.tint & 255) < 200, 'a long jump is warm (amber) ' + info.tint.toString(16));
    await t.run(3000);
    await t.shot('hyper-long');
    check(t.errors.length === 0, 'no console errors' + (t.errors.length ? ': ' + t.errors.join(' | ') : ''));
  } catch (e) { console.error('  FAIL #hyper24: ' + e.message); failed = true; } finally { await t.close(); }
}

// a short one: 6 s at least
{
  const t = await open('#hyper2');
  try {
    check(await t.ev(`game.scene.getScene('Hyper').dur === 6`), '#hyper2 clamps up to 6 s');
  } catch (e) { console.error('  FAIL #hyper2: ' + e.message); failed = true; } finally { await t.close(); }
}

process.exitCode = failed ? 1 : 0;
