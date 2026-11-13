// One check per playtest bug fixed on card space-game-bugs (see docs/PLAYTEST.md). Run: node tests/fixes.mjs
// Exit code 1 if any check fails. Each check says which bug it guards, so a regression names itself.
import { launch, sleep } from './cdp.mjs';

const SP = "game.scene.getScene('Space')", SF = "game.scene.getScene('Surface')", ST = "game.scene.getScene('Station')";
let failed = 0;
const check = (name, cond, detail = '') => { console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + detail + ')' : ''}`); if (!cond) failed++; };
const active = (t, scene) => t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, 20000, scene + ' active');

// ---- Surface: bug 1 (colonist), bug 2 (prompt box), bug 3 (toasts) ----
{
  const t = await launch('#surface');
  try {
    await active(t, 'Surface');
    console.log('bug 1: crawlers leave a waiting colonist alone (12 s, player idle at the ship)');
    await sleep(12000);
    const col = await t.ev(`(() => { const c = ${SF}.col; return c ? { state: c.state, hp: Math.round(c.hp) } : null; })()`);
    check('colonist alive and untouched after 12 s', col && col.state === 'waiting' && col.hp === 60, JSON.stringify(col));
    await t.ev(`(() => { const s = ${SF}; s.col.state = 'following'; const c = s.crawlers.getChildren()[0]; c.setPosition(s.col.s.x, s.col.s.y); s.player.setPosition(100, 100); })()`);
    await sleep(2500);
    const hurt = await t.ev(`${SF}.col.hp < 60`);
    check('crawlers still attack a colonist that is following', hurt);

    console.log('bug 2: the prompt box is hidden when there is nothing to say');
    await t.ev(`${SF}.player.setPosition(1200, 300)`); await sleep(400);
    check('surface: prompt hidden away from the pad', (await t.ev(`${SF}.prompt.visible`)) === false);
    await t.ev(`(() => { const s = ${SF}; s.col.state = 'dead'; s.player.setPosition(s.pad.x + 50, s.pad.y); })()`); await sleep(400);
    check('surface: prompt shown on the pad', (await t.ev(`${SF}.prompt.visible`)) === true && (await t.ev(`${SF}.prompt.text`)) !== '');

    console.log('bug 3: toasts stack instead of overlapping');
    await sleep(3500); // let the landing toast fade
    await t.ev("(() => { toast(game.scene.getScene('Surface'), 'one'); toast(game.scene.getScene('Surface'), 'two'); toast(game.scene.getScene('Surface'), 'three'); })()");
    const ys = await t.ev(`${SF}.toasts.map(o => o.y)`);
    check('three toasts sit 44 px apart', ys.length === 3 && ys[1] - ys[0] === 44 && ys[2] - ys[1] === 44, JSON.stringify(ys));
    await t.shot('fix-3-toasts');
    await t.ev("toast(game.scene.getScene('Surface'), 'four')");
    const after = await t.ev(`${SF}.toasts.map(o => o.text)`);
    check('a fourth replaces the oldest, never more than three', after.length === 3 && !after.includes('one') && after.includes('four'), JSON.stringify(after));
    check('no console errors (surface)', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.error('  FAIL surface checks: ' + e.message); failed++; } finally { await t.close(); }
}

// ---- Space: bug 2 (prompt), bug 4 (ram kills), bug 5 (insurance fee) ----
{
  const t = await launch('#space');
  try {
    await active(t, 'Space');
    await t.waitFor(`${SP}.time.now > ${SP}.lockUntil + 100`);
    await t.ev(`${SP}.enemies.clear(true, true)`);
    console.log('bug 2: space prompt');
    await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(1000, 1000); s.ship.setVelocity(0, 0); })()`); await sleep(400);
    check('space: prompt hidden in open space', (await t.ev(`${SP}.prompt.visible`)) === false);
    await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(s.station.x + 250, s.station.y); s.ship.setVelocity(0, 0); })()`); await sleep(400);
    check('space: prompt shown at the station', (await t.ev(`${SP}.prompt.visible`)) === true);

    console.log('bug 4: ramming finishes a drone');
    const c0 = await t.ev('G.credits'); // read before the spawn: the ram can finish the drone within one frame
    await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(1000, 1000); s.ship.setVelocity(0, 0); s.spawnDrone(1000, 1000).hp = 10; })()`);
    await t.waitFor(`${SP}.enemies.countActive() === 0`, 4000, 'drone destroyed by ramming').catch(() => {});
    check('the drone is gone after ramming', (await t.ev(`${SP}.enemies.countActive()`)) === 0);
    check('ramming pays the 25 cr bounty', (await t.ev('G.credits')) === c0 + 25, `credits ${c0} -> ${await t.ev('G.credits')}`);
    await t.ev('G.hull = G.maxHull');

    console.log('bug 5: dying costs an insurance fee of at least 50 cr');
    const die = (credits) => t.ev(`(() => { G.credits = ${credits}; ${SP}.die(); })()`);
    await die(0);
    check('0 cr: pays nothing, rebuilt at half hull', (await t.ev('G.credits')) === 0 && (await t.ev('G.hull')) === (await t.ev('Math.ceil(G.maxHull / 2)')));
    await die(1000);
    check('1000 cr: pays 20% = 200 cr, full hull', (await t.ev('G.credits')) === 800 && (await t.ev('G.hull')) === (await t.ev('G.maxHull')));
    await die(100);
    check('100 cr: pays the 50 cr minimum, full hull', (await t.ev('G.credits')) === 50 && (await t.ev('G.hull')) === (await t.ev('G.maxHull')));
    await die(30);
    check('30 cr: pays all 30, rebuilt at half hull', (await t.ev('G.credits')) === 0 && (await t.ev('G.hull')) === (await t.ev('Math.ceil(G.maxHull / 2)')));
    check('no console errors (space)', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.error('  FAIL space checks: ' + e.message); failed++; } finally { await t.close(); }
}

// ---- Station: bug 2 (prompt) ----
{
  const t = await launch('');
  try {
    await active(t, 'Station');
    await sleep(800);
    console.log('bug 2: station prompt');
    check('station: prompt hidden when nothing is near', (await t.ev(`${ST}.prompt.visible`)) === false);
    await t.ev(`${ST}.player.setPosition(200, 200)`); await sleep(400);
    check('station: prompt shown at the MISSIONS terminal', (await t.ev(`${ST}.prompt.visible`)) === true);
    check('no console errors (station)', t.errors.length === 0, t.errors.join(' | '));
  } catch (e) { console.error('  FAIL station checks: ' + e.message); failed++; } finally { await t.close(); }
}

console.log(failed ? `\nFIXES FAIL (${failed})` : '\nFIXES PASS');
process.exitCode = failed ? 1 : 0;
