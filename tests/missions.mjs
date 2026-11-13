// Mission flow checks: the board, Rescue, Escort, Police patrol and their failure paths, with the game clock stepped by
// hand so every run lasts exactly the same game time. Ported from BuildBot's drive.mjs onto tests/cdp.mjs (random
// port, throwaway Chrome profile, console errors caught). Run: node tests/missions.mjs   (exit code 1 on any failure)
import { launch } from './cdp.mjs';

const t = await launch('#station'); // no hash would open the title screen
const S = k => `game.scene.getScene('${k}')`;
const x = code => t.ev(`(() => { ${code}; return 1; })()`); // run statements
const G = async () => JSON.parse(await t.ev('JSON.stringify(G)'));
const scene = () => t.ev("game.scene.getScenes(true).map(s => s.scene.key).join(',')");
const run = ms => t.run(ms), key = k => t.key(k);
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) fails++; };

try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station active');
  await t.clock(); await run(1000);
  check('game booted into Station', (await scene()) === 'Station', await scene());

  console.log('A. the mission board');
  await x(`${S('Station')}.player.setPosition(200, 272)`);
  await run(100); await key('E'); await run(200);
  await t.shot('missions-board-list');
  check('board open', await t.ev(`${S('Station')}.panel`));
  await key('2'); await run(100); await t.shot('missions-escort-offer');
  check('offer text names the MULE', await t.ev("!!(missionDef() && missionDef().offer.includes('MULE'))")); // the board is cards now: no panelText
  await key('E'); await run(200);
  let g = await G();
  check('E accepts escort', g.mission === 'accepted' && g.missionId === 'escort', JSON.stringify(g));
  check('panel closed after accept', !(await t.ev(`${S('Station')}.panel`)));
  await key('E'); await run(200);
  check('progress view shows the drop option', await t.ev(`${S('Station')}.ui.hintKey.includes('Drop the mission')`));
  await key('X'); await run(200);
  g = await G(); check('X drops the mission', g.mission === 'none' && g.missionId === null, JSON.stringify(g));
  await key('E'); await run(100); await key('3'); await run(100); await key('E'); await run(200);
  g = await G(); check('patrol accepted from the board', g.mission === 'accepted' && g.missionId === 'patrol', JSON.stringify(g));
  await key('E'); await run(100); await key('ESC'); await run(100);
  check('Esc closes the progress view', !(await t.ev(`${S('Station')}.panel`)));
  check('no JS errors so far', t.errors.length === 0, t.errors.join(' | '));

  console.log('B. patrol in space');
  await x(`${S('Station')}.player.setPosition(1090, 360)`);
  // E at the ship now plays feelLaunch (a 1.1 s tween) before go(); that tween never finishes under the stepped
  // clock, so go() is called directly. tests/loop.mjs presses E in real time and covers the animation.
  await run(100); await x(`go(${S('Station')}, 'Space', { from: 'station' })`); await run(1500);
  check('launched into Space', (await scene()) === 'Space', await scene());
  await run(1500); await t.shot('missions-space-patrol');
  const wanted = await t.ev(`${S('Space')}.enemies.getChildren().filter(d => d.wanted && d.active).length`);
  check('5 wanted pirates near the station', wanted === 5, 'wanted=' + wanted);
  check('arrow points at a wanted pirate', (await t.ev(`missionTarget(${S('Space')}).name`)) === 'Wanted pirate');
  const creditsBefore = (await G()).credits;
  await x(`const s = ${S('Space')}; s.enemies.getChildren().filter(d => d.wanted).slice(0, 4).forEach(d => { d.destroy(); G.credits += 25; missionKill(s); })`);
  await run(100); g = await G();
  check('patrol counts 4 of 5', g.missionProgress === 4 && g.mission === 'accepted', JSON.stringify(g));
  check('HUD line shows 4 of 5', (await t.ev('missionLine()')).includes('4 of 5'));
  await x(`const s = ${S('Space')}; const d = s.enemies.getChildren().find(d => d.wanted && d.active); d.destroy(); G.credits += 25; missionKill(s)`);
  await run(100); g = await G();
  check('patrol pays 600 + 125 and clears', g.mission === 'none' && g.missionId === null && g.credits === creditsBefore + 600 + 125, JSON.stringify(g));
  check('mission line back to none', (await t.ev('missionLine()')).includes('None'));

  console.log('C. escort in space');
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; G.missionProgress = 0; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(2500);
  check('escort: freighter alive', await t.ev(`!!(${S('Space')}.mx.freighter && ${S('Space')}.mx.freighter.active)`));
  const prey = await t.ev(`${S('Space')}.enemies.getChildren().filter(d => d.prey).length`);
  check('escort: 5 pirates hunt the MULE', prey === 5, 'prey=' + prey);
  await t.shot('missions-space-escort');
  const fx = await t.ev(`${S('Space')}.mx.freighter.x`);
  check('freighter is moving toward the gate', fx < 3930, 'x=' + fx);
  check('objective arrow points at the MULE', (await t.ev(`missionTarget(${S('Space')}).name`)) === 'Freighter MULE');
  await x(`freighterHurt(${S('Space')}, 30)`);
  check('freighter hull drops', await t.ev(`${S('Space')}.mx.freighter.hp <= ${S('Space')}.mx.freighter.maxHp - 30`)); // at most: pirates may already have hit her
  await x(`${S('Space')}.ship.setPosition(${S('Space')}.mx.freighter.x, ${S('Space')}.mx.freighter.y - 150)`);
  await run(20000); // no screenshot here: after a 20 s run the GL readback hung on a busy Mac
  const hp20 = await t.ev(`${S('Space')}.mx.freighter.active ? ${S('Space')}.mx.freighter.hp : -1`);
  // information only: with the player parked and not shooting, the pirates usually kill the MULE before the gate
  console.log('       MULE after 20 s with the player idle next to her:', hp20 > 0 ? 'hull ' + hp20 : 'destroyed', ' mission', (await G()).mission);
  // the payout is checked on a fresh run, with her put at the gate, so it does not depend on the fight
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; G.missionProgress = 0; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(1500);
  const c2 = (await G()).credits;
  await x(`${S('Space')}.mx.freighter.setPosition(GATE.x + 40, GATE.y)`);
  await run(200); g = await G();
  check('escort pays 400 at the gate', g.mission === 'none' && g.credits === c2 + 400, JSON.stringify(g));
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(1500);
  await x(`freighterHurt(${S('Space')}, 999)`);
  await run(100); g = await G();
  check('escort fails when the MULE dies', g.mission === 'failed' && g.missionId === 'escort', JSON.stringify(g));
  check('failed line says the MULE was lost', (await t.ev('missionLine()')).includes('MULE was lost'));
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(1500);
  await x(`missionLeaveSpace(${S('Space')})`);
  g = await G(); check('leaving space fails the escort', g.mission === 'failed');
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(1500);
  await x(`${S('Space')}.hurt(1000)`);
  await run(100); g = await G(); check('ship death fails the escort', g.mission === 'failed', JSON.stringify(g));
  await run(3000); check('back at the station after death', (await scene()) === 'Station', await scene());

  console.log('D. rescue unchanged');
  await x(`G.mission = 'accepted'; G.missionId = 'rescue'; G.hull = G.maxHull; ${S('Station')}.scene.start('Space', { from: 'station' })`);
  await run(1500);
  check('rescue: arrow points at Kepler-4b', (await t.ev(`missionTarget(${S('Space')}).name`)) === 'Kepler-4b');
  check('rescue: no freighter, no wanted pirates', await t.ev(`!${S('Space')}.mx.freighter && ${S('Space')}.enemies.getChildren().filter(d => d.wanted).length === 0`));
  await x(`${S('Space')}.scene.start('Surface')`);
  await run(1500);
  check('rescue: colonist waits at the pod', await t.ev(`!!(${S('Surface')}.col && ${S('Surface')}.col.state === 'waiting')`));
  await t.shot('missions-surface-rescue');
  const c3 = (await G()).credits;
  await x(`G.mission = 'rescued'; ${S('Surface')}.scene.start('Station', { arrive: true })`);
  await run(1000); g = await G();
  check('rescue still pays 500 on docking', g.mission === 'none' && g.credits === c3 + 500, JSON.stringify(g));
  check('rescue: ship death with the colonist aboard fails', await t.ev(`(() => { G.mission = 'rescued'; G.missionId = 'rescue'; return missionDeath(${S('Station')}) && G.mission === 'failed'; })()`));
  check('no JS errors at the end', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.error('  FAIL missions: ' + e.message);
  fails++;
} finally {
  await t.close();
}
console.log(fails ? `\nMISSIONS FAIL (${fails})` : '\nMISSIONS PASS');
process.exitCode = fails ? 1 : 0;
