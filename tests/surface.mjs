// Planet surface controls (card space-game-planet-audio-hints): the controls panel on arrival, its fade and recall with C, the
// aim line and the reticle that replaces the system cursor, and the cursor coming back when you leave. Saves tests/out/surface-*.png.
// Run: node tests/surface.mjs   (exit code 1 if a check fails)
import { launch, sleep } from './cdp.mjs';

const SF = "game.scene.getScene('Surface')";
let failed = 0;
const check = (name, cond, detail = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };

const t = await launch('#surface');
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Surface'))", 30000, 'Surface active');
  await t.clock(); // step the game by hand: the fade times below are exact whatever the Mac load
  // tweens time themselves with Date.now(), not the step delta: put both clocks on the stepped time or the fades never finish
  await t.ev("(() => { const d0 = Date.now(), p0 = __t; performance.now = () => __t; Date.now = () => d0 + (__t - p0); return 1; })()");
  await t.run(400);

  console.log('controls panel on arrival');
  const words = await t.ev(`${SF}.ctl.box.list.filter(o => o.type === 'Text').map(o => o.text)`);
  check('panel names Move, Aim, Fire and Interact', ['Move', 'Aim', 'Fire', 'Interact'].every(w => words.includes(w)), JSON.stringify(words));
  const keys = await t.ev(`${SF}.ctl.box.list.filter(o => o.type === 'Container').map(c => c.list.find(x => x.type === 'Text').text)`);
  check('panel shows the W A S D and E key caps', ['W', 'A', 'S', 'D', 'E'].every(k => keys.includes(k)), JSON.stringify(keys));
  check('panel is visible with the landing', (await t.ev(`${SF}.ctl.box.visible && ${SF}.ctl.box.alpha > 0.9`)) === true);
  await t.shot('surface-hint-arrival');

  console.log('it fades after a few seconds, and C brings it back');
  await t.run(8500);
  check('panel gone after 8.5 s', (await t.ev(`${SF}.ctl.box.visible`)) === false);
  check('a "C  show controls" reminder stays on screen', (await t.ev(`${SF}.ctl.hint.visible && ${SF}.ctl.hint.text`)) === 'C  show controls');
  await t.key('C'); await t.run(300);
  check('C shows the panel again', (await t.ev(`${SF}.ctl.box.visible && ${SF}.ctl.box.alpha > 0.9`)) === true);
  await t.run(7500);
  check('and it fades out again', (await t.ev(`${SF}.ctl.box.visible`)) === false);

  console.log('aim line and reticle');
  check('no reticle before the mouse has moved', (await t.ev(`${SF}.sawMouse === false && ${SF}.reticle.commandBuffer.length === 0`)) === true);
  const rect = await t.ev("(() => { const r = game.canvas.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })()");
  const at = (gx, gy) => ({ x: rect.x + gx / 1280 * rect.w, y: rect.y + gy / 720 * rect.h }); // game coords to page coords
  const m = at(900, 300);
  await t.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: m.x, y: m.y });
  await t.run(200);
  check('the system cursor is hidden once the mouse moves', (await t.ev('game.canvas.style.cursor')) === 'none');
  check('reticle and aim line are drawn', (await t.ev(`${SF}.reticle.commandBuffer.length > 0 && ${SF}.aimG.commandBuffer.length > 0`)) === true);
  const where = await t.ev(`(() => { const p = ${SF}.input.activePointer; return { x: Math.round(p.x), y: Math.round(p.y) }; })()`);
  check('the game sees the mouse where it was put', Math.abs(where.x - 900) <= 2 && Math.abs(where.y - 300) <= 2, JSON.stringify(where));
  await t.shot('surface-aim');
  await t.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: m.x, y: m.y, button: 'left', buttons: 1, clickCount: 1 });
  await t.run(120);
  await t.shot('surface-aim-fire');
  await t.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: m.x, y: m.y, button: 'left', buttons: 0, clickCount: 1 });
  await t.run(60);

  console.log('the cursor comes back');
  await t.ev(`(() => { ${SF}.scene.pause(); return 1; })()`); await t.run(50);
  check('system cursor returns while paused', (await t.ev('game.canvas.style.cursor')) === 'default');
  await t.ev(`(() => { ${SF}.scene.resume(); return 1; })()`); await t.run(50);
  check('and is hidden again on resume', (await t.ev('game.canvas.style.cursor')) === 'none');
  await t.ev("(() => { game.scene.getScene('Surface').scene.start('Space', { from: 'surface' }); return 1; })()"); await t.run(400);
  check('system cursor is back after leaving the planet', (await t.ev('game.canvas.style.cursor')) === 'default');

  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL surface checks: ' + e.message); failed++; } finally { await t.close(); }
process.exitCode = failed ? 1 : 0;
