// smoke FULL=1: mission flow (the board, Rescue, Escort, Police patrol and their failure paths; about 2 minutes)
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
  // E at the ship now opens the Ship scene, whose launch is a tween that never finishes under the stepped clock, so go()
  // is called directly. tests/loop.mjs and tests/shipmode.mjs press the real keys in real time.
  await run(100); await x(`go(${S('Station')}, 'Space', { from: 'station' })`); await run(1500);
  check('launched into Space', (await scene()) === 'Space', await scene());
  await run(1500); await t.shot('missions-space-patrol');
  const wanted = await t.ev(`${S('Space')}.enemies.getChildren().filter(d => d.wanted && d.active).length`);
  check('5 wanted pirates near the station', wanted === 5, 'wanted=' + wanted);
  check('arrow points at a wanted pirate', (await t.ev(`missionTarget(${S('Space')}).name`)) === 'Wanted pirate');
  const creditsBefore = (await G()).credits;
  await x(`const s = ${S('Space')}; s.enemies.getChildren().filter(d => d.wanted).slice(0, 4).forEach(d => { d.destroy(); G.credits += 25; missionKill(s, d); })`); // missionKill takes the enemy since the Reaver bounty
  await run(100); g = await G();
  check('patrol counts 4 of 5', g.missionProgress === 4 && g.mission === 'accepted', JSON.stringify(g));
  check('HUD line shows 4 of 5', (await t.ev('missionLine()')).includes('4 of 5'));
  await x(`const s = ${S('Space')}; const d = s.enemies.getChildren().find(d => d.wanted && d.active); d.destroy(); G.credits += 25; missionKill(s, d)`);
  await run(100); g = await G();
  check('patrol pays 600 + 125 and clears', g.mission === 'none' && g.missionId === null && g.credits === creditsBefore + 600 + 125, JSON.stringify(g));
  check('mission line back to none', (await t.ev('missionLine()')).includes('None'));

  console.log('C. escort in space');
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; G.missionProgress = 0; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(2500);
  check('escort: freighter alive', await t.ev(`!!(${S('Space')}.mx.freighter && ${S('Space')}.mx.freighter.active)`));
  check('escort: nobody lies in wait at launch any more (the waves come by her progress)', await t.ev(`${S('Space')}.enemies.getChildren().filter(d => d.prey || d.escort).length === 0 && ${S('Space')}.mx.freighter.wave === 0`));
  await t.shot('missions-space-escort');
  const fx = await t.ev(`${S('Space')}.mx.freighter.x`);
  check('freighter is moving toward the gate', fx < await t.ev(`${S('Space')}.station.x - 70`), 'x=' + fx); // she starts 60 px west of the station
  check('objective arrow points at the MULE', (await t.ev(`missionTarget(${S('Space')}).name`)) === 'Freighter MULE');
  await x(`freighterHurt(${S('Space')}, 30)`);
  check('freighter hull drops', await t.ev(`${S('Space')}.mx.freighter.hp <= ${S('Space')}.mx.freighter.maxHp - 30`)); // at most: pirates may already have hit her
  // the escort box (docs/ESCORT.md change 2): inside her 350 px ring she cruises and a hit costs half; outside she slows and takes it all
  const SP = S('Space'), spd = () => t.ev(`Math.round(Math.hypot(${SP}.mx.freighter.body.velocity.x, ${SP}.mx.freighter.body.velocity.y))`);
  const box = async (dx, dy) => { await x(`${SP}.ship.body.reset(${SP}.mx.freighter.x + ${dx}, ${SP}.mx.freighter.y + ${dy})`); await run(100); };
  check('the box is 350 px, cruise 90, slow 45 (card space-game-missions-after-distances), half damage', await t.ev('ESCORT.box === 350 && ESCORT.cruise === 90 && ESCORT.slow === 45 && ESCORT.cover === 0.5'));
  await box(0, -500);
  check('outside the ring: exposed, she slows to 30, a shot costs her 5', await t.ev(`${SP}.mx.covered === false && escortCover(${SP}, ESCORT.shot) === 5`) && (await spd()) === 30, 'speed ' + await spd());
  check('the ring says EXPOSED and the HUD says to get inside', await t.ev(`${SP}.mx.ringText.text === 'EXPOSED' && ${SP}.mx.ringText.visible && HUD_MISSIONS.escort.next(${SP}, 'Space').includes('ring')`));
  await box(0, -340);
  check('inside the ring: covered, she cruises at 60, a shot costs her 2.5', await t.ev(`${SP}.mx.covered === true && escortCover(${SP}, ESCORT.shot) === 2.5`) && (await spd()) === 60, 'speed ' + await spd());
  check('the ring says COVERED and the HUD says to hold it', await t.ev(`${SP}.mx.ringText.text === 'COVERED' && HUD_MISSIONS.escort.next(${SP}, 'Space').includes('Covered')`));
  await x(`${SP}.spawnDrone(${SP}.mx.freighter.x + 120, ${SP}.mx.freighter.y + 60)`); await run(100);
  check('a pirate right beside her no longer slows her: the fight is on the move', (await spd()) === 60, 'speed ' + await spd());
  await t.shot('missions-escort-box');
  await box(0, -360);
  check('ten pixels past the ring she is exposed again', await t.ev(`${SP}.mx.covered === false`) && (await spd()) === 30);
  await x(`${S('Space')}.ship.setPosition(${S('Space')}.mx.freighter.x, ${S('Space')}.mx.freighter.y - 150)`);
  await run(20000); // no screenshot here: after a 20 s run the GL readback hung on a busy Mac
  const hp20 = await t.ev(`${S('Space')}.mx.freighter.active ? ${S('Space')}.mx.freighter.hp : -1`);
  // information only: with the player parked and not shooting, the pirates usually kill the MULE before the gate
  console.log('       MULE after 20 s with the player idle next to her:', hp20 > 0 ? 'hull ' + hp20 : 'destroyed', ' mission', (await G()).mission);
  // the fight (docs/ESCORT.md change 1): a wave at 25, 50 and 75% of the route, 1,400 px out; one screen pirate hunts you, the rest her; a hit pulls one off her
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; G.missionProgress = 0; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(1500);
  const SW = S('Space'), esc = f => t.ev(`(() => { const s = ${SW}, f = s.mx.freighter, e = s.enemies.getChildren().filter(d => d.active && d.escort); return ${f}; })()`);
  const along = async k => { await x(`const s = ${SW}, f = s.mx.freighter; if (!s.x0) { s.x0 = f.x; s.y0 = f.y; } f.body.reset(s.x0 + (GATE.x - s.x0) * ${k}, s.y0 + (GATE.y - s.y0) * ${k})`); await run(100); };
  const said = () => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${SW}.children.list.forEach(walk); return out.join('|'); })()`);
  await x(`${SW}.pirateOff = true; ${SW}.enemies.clear(true, true)`);
  await along(0.2);
  check('at 20% of the route no wave has come', await esc('e.length === 0 && f.wave === 0'));
  await along(0.3);
  check('at 25% the first wave: two pirates, one for her and one screen for you', await esc('e.length === 2 && e.filter(d => d.prey === f).length === 1 && e.filter(d => !d.prey).length === 1 && f.wave === 1'), await esc('e.length + " " + f.wave'));
  check('they appear about 1,400 px out and she calls the side', await esc('e.every(d => { const r = Phaser.Math.Distance.Between(d.x, d.y, f.x, f.y); return r > 1150 && r < 1600; })') && (await said()).includes('Raiders, port side'));
  check('they are not held back by the launch grace', await esc('e.every(d => d.ambush && d.inbound)'));
  const far0 = await esc('Math.round(Phaser.Math.Distance.Between(e.find(d => d.prey).x, e.find(d => d.prey).y, f.x, f.y))');
  await run(2000);
  const far1 = await esc('Math.round(Phaser.Math.Distance.Between(e.find(d => d.prey).x, e.find(d => d.prey).y, f.x, f.y))');
  check('they fly in: her hunter is at least 250 px closer after 2 s', far1 < far0 - 250, far0 + ' -> ' + far1);
  await x(`const d = ${SW}.enemies.getChildren().find(d => d.active && d.escort && d.prey); d.hp -= 5`); await run(100);
  check('a pirate you hit drops her and fights you for 4 s', await esc(`(() => { const d = e.find(d => d.prey); const left = d.distractedUntil - s.time.now; return left > 3500 && left <= 4000; })()`));
  await x(`const s = ${SW}, d = s.enemies.getChildren().find(d => d.active && d.escort && d.prey); d.hp -= 10; d.lastHp = d.hp; d.distractedUntil = 0`); await run(100);
  check('a bump against her hull does not pull it off', await esc('!(e.find(d => d.prey).distractedUntil > s.time.now)'));
  await along(0.55);
  check('at 50% the second wave: three more, called to starboard', await esc('e.length === 5 && f.wave === 2 && e.filter(d => !d.prey).length === 2') && (await said()).includes('starboard side'), await esc('e.length + " " + f.wave'));
  await along(0.8);
  check('at 75% the third, dead ahead: eight in all, three of them screens', await esc('e.length === 8 && f.wave === 3 && e.filter(d => !d.prey).length === 3') && (await said()).includes('dead ahead'), await esc('e.length + " " + f.wave'));
  await t.shot('missions-escort-waves');
  // the payout is checked on a fresh run, with her put at the gate, so it does not depend on the fight
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; G.missionProgress = 0; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(1500);
  const c2 = (await G()).credits;
  // the stakes (docs/ESCORT.md change 3): she calls out, holds 8 s at the gate while the last pirates come, and pays 400 plus up to 200 for her hull
  const SQ = S('Space'), toasts = () => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; ${SQ}.children.list.forEach(walk); return out.join('|'); })()`);
  await x(`${SQ}.pirateOff = true; ${SQ}.enemies.clear(true, true); ${SQ}.mx.freighter.hp = 100; ${SQ}.mx.freighter.wave = 3`); await run(100); // wave = 3: the route's waves are checked above
  check('at half hull she says so', (await toasts()).includes('Hull at half'));
  await x(`${SQ}.mx.freighter.body.reset(GATE.x + 700, GATE.y)`); await run(100);
  check('within 900 px of the gate: Gate in sight', (await toasts()).includes('Gate in sight'));
  await x(`${SQ}.mx.freighter.body.reset(GATE.x + 40, GATE.y)`);
  await run(200); g = await G();
  check('at the gate she is not paid yet: the gate spins up for 8 s', g.mission === 'accepted' && g.credits === c2 && await t.ev(`${SQ}.mx.spin > 7000 && ${SQ}.mx.spin <= 8000`), JSON.stringify(g));
  check('she holds still in the ring and says so', await t.ev(`${SQ}.mx.freighter.body.speed === 0`) && (await toasts()).includes('Eight seconds to spin up'));
  check('the last stand: three pirates come for her from 1,100 px out', await t.ev(`${SQ}.enemies.getChildren().filter(d => d.active && d.prey === ${SQ}.mx.freighter).length === 3 && ${SQ}.enemies.getChildren().every(d => Phaser.Math.Distance.Between(d.x, d.y, GATE.x, GATE.y) > 900)`));
  check('the HUD counts the spin-up down', (await t.ev(`HUD_MISSIONS.escort.next(${SQ}, 'Space')`)).startsWith('Hold the gate: '));
  await t.shot('missions-escort-laststand');
  await x(`${SQ}.enemies.clear(true, true)`); // the fight is not what this checks
  await run(4000); g = await G();
  check('half way through she is still spinning up, and only one wave came', g.mission === 'accepted' && await t.ev(`${SQ}.enemies.countActive() === 0`));
  await run(4000); g = await G();
  check('after 8 s she is through: 400 plus 100 for half her hull', g.mission === 'none' && g.credits === c2 + 500, JSON.stringify(g));
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; G.missionProgress = 0; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(1500);
  await x(`${SQ}.pirateOff = true; ${SQ}.enemies.clear(true, true); ${SQ}.mx.freighter.hp = 200; ${SQ}.mx.freighter.wave = 3; ${SQ}.mx.freighter.body.reset(GATE.x + 40, GATE.y)`);
  await run(300); await x(`${SQ}.enemies.clear(true, true)`); await run(8000); g = await G();
  check('a clean run pays 600', g.mission === 'none' && g.credits === c2 + 500 + 600, JSON.stringify(g));
  await x(`G.mission = 'accepted'; G.missionId = 'escort'; ${S('Space')}.scene.restart({ from: 'station' })`);
  await run(1500);
  await x(`freighterHurt(${S('Space')}, 999)`);
  await run(100); g = await G();
  check('the ring goes out with her', await t.ev(`${S('Space')}.mx.ringText.visible === false`));
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
  console.log('E. the Reaver at the Roost, and a call that is not played in the system you are in (card u-e3)');
  await x(`G.patrolsDone = 1; G.hull = G.maxHull; G.mission = 'accepted'; G.missionId = 'bounty'; G.missionProgress = 0; ${S('Station')}.scene.start('Space', { from: 'jump', to: 'roost', origin: 'kestrel' })`);
  await run(1500);
  check('in Reaver\'s Roost the Reaver is there, inside the world, and the arrow points at it', await t.ev(`(() => { const s = ${S('Space')}, b = s.mx.boss; return G.system === 'roost' && !!b && b.active && b.x > 0 && b.x < s.WS && b.y > 0 && b.y < s.WS && missionTarget(s).name === 'The Reaver'; })()`));
  check('the HUD says to hunt it south-west of Reaver\'s Rock', await t.ev(`/Reaver.s Rock/.test(hudMission(${S('Space')}, 'Space').next)`), await t.ev(`hudMission(${S('Space')}, 'Space').next`));
  await x(`${S('Space')}.scene.start('Space', { from: 'jump', to: 'halcyon', origin: 'roost' })`);
  await run(1500);
  check('back in Halcyon the call is quiet: no Reaver, no arrow, the goal is the Roost', await t.ev(`(() => { const s = ${S('Space')}; return G.system === 'halcyon' && !s.mx.boss && missionTarget(s) === null && missionFar().system === 'roost'; })()`));
  check('and the bounty is not failed by leaving Halcyon for it', await t.ev(`(() => { missionLeaveSystem(${S('Space')}, 'halcyon'); return G.mission === 'accepted'; })()`));
  check('but is failed by leaving the Roost', await t.ev(`(() => { missionLeaveSystem(${S('Space')}, 'roost'); return G.mission === 'failed'; })()`));
  check('no JS errors at the end', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.error('  FAIL missions: ' + e.message);
  fails++;
} finally {
  await t.close();
}
console.log(fails ? `\nMISSIONS FAIL (${fails})` : '\nMISSIONS PASS');
process.exitCode = fails ? 1 : 0;
