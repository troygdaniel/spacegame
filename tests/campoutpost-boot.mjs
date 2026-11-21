// not in the smoke: a boot of the Campaign's outposts, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-outposts)
// The rules are in tests/campoutpost.mjs and tests/campdock.mjs (plain Node). This boots the belt (level 1: the cruiser starts by Occator Works) and does what Troy does: looks at the SHIP panel undocked, docks
// with E, builds a fighter in the ready room, undocks with L, flies away hurt and alone to see the retreat line and the map's stations, and fits the Fabricator.
//   node tests/campoutpost-boot.mjs
// Pictures go to the folder in OUTPOST_SHOTS (default ~/dev/spacegame-night/shots/outpost-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { beltSource } from './fixtures/campbelt.mjs';
// the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots): this boot was written for it and pins its missions and words; the rim run is checked in tests/camprim.mjs. The address started the Campaign scene on the rim run, so it starts again.
const belt = async t => { await t.ev(beltSource(1)); await t.ev(`(() => { game.scene.stop('Campaign'); game.scene.start('Campaign', { level: 1, techs: [], via: 'address' }); return 1; })()`); };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.OUTPOST_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, KeyE: 69, KeyF: 70, KeyL: 76, KeyU: 85, KeyR: 82, Enter: 13, Tab: 9, KeyZ: 90, Escape: 27 };

const t = await launch('?campaign=1', ROOT);
try {
  const SCN = `game.scene.getScene('Campaign')`, HUB = `game.scene.getScene('CampHub')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(300); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'outpost-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture outpost-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return Object.keys(s.slots).map(k => s.slots[k]).filter(o => o.visible && o.text).map(o => o.text); })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 30000, 'the Campaign scene'); await belt(t); await t.clock(); await t.run(800);
  await key('Enter'); await key('Enter'); await settle(`${SCN}.mode === 'play'`); await t.ev(`(() => { const C = ${SCN}.camp; C.ships = C.ships.filter(u => u.team !== 'alien'); C.waves.forEach(w => { w.started = true; }); return 1; })()`);
  check('the belt starts at Occator Works: the carrier is in range of that outpost, and the HUD says E dock there', await j(`campOutpostNear(${SCN}.camp) && campOutpostNear(${SCN}.camp).o.name === 'Occator Works'`));
  await t.run(300); await snap('1-start-in-range');
  await t.ev(`(() => { ${SCN}.camp.ore = 100; return 1; })()`); await key('KeyE'); await t.run(500); await snap('2-ship-panel-undocked'); // E opens the SHIP panel
  const texts = await j(`(() => { const s = ${SCN}; return (s.pnl && s.pnl.objs || []).map(o => o.text).filter(Boolean); })()`);
  check('the SHIP panel undocked: New fighter and New escort say "dock first", the Dock row is ready and names the outpost ("Occator Works")', texts.filter(x => x === 'dock first').length === 2 && texts.includes('Dock') && texts.includes('Occator Works'), texts.join(' | '));
  await key('Escape');
  await key('KeyE'); await key('Digit4'); // E, then the dock row (4: Mine ore is on the FLEET panel now)
  check('E, 5 docks: the Campaign scene is paused and the ready room opens as that outpost', await settle(`game.scene.isActive('CampHub') && ${HUB}.hub && ${HUB}.look && ${HUB}.look.name === 'Occator Works'`) && await j(`${SCN}.scene.isPaused() && ${SCN}.docked === true && ${SCN}.camp.docked === 'ceres'`));
  await t.run(1200); await snap('3-dock-room-build');
  check('the room has the dock\'s five rows, BUILD first, the ore of the battle on its page', (await shown()).some(x => /^BUILD {2}- {2}OCCATOR WORKS$/.test(x)) && (await shown()).some(x => /^Ore in the store: 100$/.test(x)), (await shown()).join(' | '));
  await key('KeyF'); await key('KeyF'); await t.run(300); await snap('4-dock-room-built');
  check('F, F: two fighters are queued (50 ore), the page says so', await j(`${SCN}.camp.build.queue.length === 2 && ${SCN}.camp.ore === 50`) && (await shown()).some(x => /2 in the yard$/.test(x)), (await shown()).join(' | '));
  await t.ev(`(() => { ${SCN}.camp.carrier.hp = ${SCN}.camp.carrier.maxHp * 0.4; return 1; })()`); await key('Digit2'); await key('KeyR'); await t.run(300); await snap('5-dock-room-repair');
  check('REPAIR: R mends the hull for ore, the battle\'s hull is whole', await j(`${SCN}.camp.carrier.hp === ${SCN}.camp.carrier.maxHp && ${SCN}.camp.ore < 50`));
  await t.ev(`(() => { ${SCN}.camp.ore = 150; return 1; })()`); await key('Digit3'); await key('KeyU'); await t.run(300); await snap('6-dock-room-fabricator');
  check('REFIT: U fits the Fabricator: the battle and the progress both have it', await j(`campHas(${SCN}.camp, 'fabricator') && ${SCN}.P.techs.includes('fabricator')`) && await j(`JSON.parse(localStorage.getItem('longhaul.campaign')).techs.includes('fabricator')`));
  await key('Digit5'); await t.run(1400); await snap('7-dock-room-undock');
  await key('KeyL');
  check('L undocks: the room is gone, the battle runs again, the carrier is free', await settle(`!game.scene.isActive('CampHub') && game.scene.isActive('Campaign') && !${SCN}.scene.isPaused() && ${SCN}.camp.docked === '' && ${SCN}.docked === false`));
  // away from every outpost: the Fabricator builds anywhere; the retreat line when hurt and alone
  await t.ev(`(() => { const C = ${SCN}.camp; C.carrier.x = 3000; C.carrier.y = 3000; C.carrier.vx = 0; C.carrier.vy = 0; C.ore = 100; return 1; })()`); await t.run(600);
  check('with the Fabricator, far from every outpost, Build a fighter is allowed (the answer is the order\'s)', await j(`campCheck(${SCN}.camp, 'build', 'fighter').ok`));
  await t.ev(`(() => { const C = ${SCN}.camp; C.techs = C.techs.filter(x => x !== 'fabricator'); C.bay.fighters = 0; C.bay.escorts = 0; C.build.queue.length = 0; C.launchQ.length = 0; C.ships.forEach(u => { if (u.team === 'earth' && u.kind !== 'carrier') u.hp = 0; }); C.carrier.hp = C.carrier.maxHp * 0.2; return 1; })()`); await t.run(1200);
  const hudLine = await j(`${SCN}.hud.post.text`);
  check('hurt and alone, far from an outpost: the HUD says "Retreat to <place>: N s on Fast."', /^Retreat to [A-Za-z ]+: \d+ s on Fast\.$/.test(hudLine), hudLine);
  check('the ship says it too (a toast and the voice line) and the goal of the map is that place', await j(`campNavGoal(${SCN}.camp) && campNavGoal(${SCN}.camp).id === 'place:' + campRetreat(${SCN}.camp).o.id`));
  await snap('8-retreat-hud');
  await key('Tab'); await t.run(400); await key('KeyZ'); await t.run(400); await snap('9-map-whole-outposts');
  check('the map marks the outposts (a frame round the place); the list says the goal first', await j(`campMapMarks(${SCN}.camp, true).filter(m => m.outpost).map(m => m.id).sort().join()`) === 'ceres,earth,mars,vesta');
  await key('Tab');
  await key('Digit2'); await t.run(500); await snap('10-ship-panel-hurt'); await key('Escape');
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nCAMPAIGN OUTPOST BOOT FAIL (${bad})` : '\nCAMPAIGN OUTPOST BOOT PASS');
process.exit(bad ? 1 : 0);
