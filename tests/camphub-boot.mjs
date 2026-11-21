// not in the smoke: a boot of the Campaign's ready room (the hub), run by hand (one Chrome, muted, through the test lock; card space-game-campaign-hub)
// The rules are in tests/camphub.mjs (the model) and tests/camphubscene.mjs (the scene on a stand-in). This boots the real game and does what Troy does: the title's K opens the room, he reads the five pages
// with the digits, buys a fighter at the refit, launches with L, and a won mission comes back to the room.
//   node tests/camphub-boot.mjs
// Pictures go to the folder in HUB_SHOTS (default ~/dev/spacegame-night/shots/hub-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { beltSource } from './fixtures/campbelt.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.HUB_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, KeyK: 75, KeyF: 70, KeyE: 69, KeyL: 76, KeyS: 83, KeyW: 87, Enter: 13, Backspace: 8, Escape: 27 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, CAMPS = `game.scene.getScene('Campaign')`;
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'hub-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture hub-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return Object.keys(s.slots).map(k => s.slots[k]).filter(o => o.visible && o.text).map(o => o.text); })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.ev(beltSource(1)); /* the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots) */ await t.clock(); await t.run(900);
  // a campaign in progress: the first mission flown, the second next, 100 ore in the store, one tech
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 1, techs: ['shield'], ore: 100, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 120, hull: 500, lost: 0, tries: 1 } } }))`);
  await key('KeyK');
  check('K on the title opens the ready room (not the battle)', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && !(await j(`game.scene.isActive('Campaign')`)));
  await t.run(900);
  check('the hall is Long Haul\'s (its baked layer is in the texture cache) and the glass has its five rows', await j(`Object.keys(game.textures.list).some(k => /^in-base/.test(k)) && ${HUB}.rowT.length === 5`));
  await snap('1-board');
  check('the board page names the next mission (the haulers) and the one flown (Belt survey, 900 pts)', await (async () => { const s = await shown(); return s.some(x => /\[>\] 2\s+Ore haulers/.test(x)) && s.some(x => /\[x\] 1\s+Belt survey/.test(x)) && s.some(x => /^900 pts/.test(x)); })());
  await key('Digit2'); await t.run(900); await snap('2-briefing');
  check('2: the briefing of the next mission (MISSION 2 OF 3, ESCORT)', (await shown()).some(x => /^MISSION 2 OF 3/.test(x)) && (await shown()).some(x => /^ESCORT/.test(x)));
  await key('Digit3'); const there = await settle(`Math.abs(${HUB}.player.x - 640) < 4 && Math.abs(${HUB}.player.y - 246) < 4`, 80); await t.run(300); await snap('3-refit');
  check('3: the refit at the repair bay: the pilot has walked to it', there);
  await key('KeyF'); await key('KeyF'); await key('KeyE'); await t.run(300); await snap('3b-refit-bought');
  const sv = await j(`JSON.parse(localStorage.getItem('longhaul.campaign'))`);
  check('F, F, E bought two fighters and an escort: 100 - 25 - 25 - 45 = 5 ore, in the save at once', sv.ore === 5 && sv.bonus.fighters === 2 && sv.bonus.escorts === 1, JSON.stringify(sv.bonus) + ' ore ' + sv.ore);
  await key('Digit4'); await t.run(900); await snap('4-rank');
  await key('Digit5'); const arrived = await settle(`Math.abs(${HUB}.player.x - 1028) < 4 && Math.abs(${HUB}.player.y - 394) < 4`, 80); await t.run(300); await snap('5-launch');
  check('5: the pilot walks to the pad and the Launch page says what happens', arrived && (await shown()).some(x => /launches the cruiser/.test(x)), await j(`JSON.stringify([${HUB}.player.x, ${HUB}.player.y])`));
  await key('KeyL');
  check('L launches: the Campaign scene starts on mission 2 via the hub, and goes straight to the flight (no second briefing)', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.camp`) && await j(`${CAMPS}.via === 'hub' && ${CAMPS}.mi === 1 && ${CAMPS}.level === 1`) && await settle(`${CAMPS}.mode === 'play'`), await j(`${CAMPS}.mode`));
  check('the wing is the one bought in the room: 8 fighters and 3 escorts in the bay at the start (6 + 2, 2 + 1)', await j(`${CAMPS}.camp.bay.fighters === 8 && ${CAMPS}.camp.bay.escorts === 3`), await j(`JSON.stringify(${CAMPS}.camp.bay)`));
  await t.run(1500); await snap('6-flight');
  // the mission is won: the debrief, and Enter returns to the room
  await t.ev(`(() => { const s = ${CAMPS}; campEnd(s.camp, 'won', 'test'); return 1; })()`); await t.run(2600);
  check('a won mission shows its debrief, and the hint says Enter goes to the ready room', await j(`${CAMPS}.mode === 'debrief'`) && await j(`/ready room/.test(uiText('camp.ui.debriefnext'))`));
  await snap('7-debrief');
  await key('Enter');
  check('Enter at the debrief comes back to the room, with the win in the save (mission 2 done, mission 3 next)', await settle(`game.scene.isActive('CampHub')`) && await j(`(() => { const p = JSON.parse(localStorage.getItem('longhaul.campaign')); return p.mission === 2 && !!p.results['1.2']; })()`));
  await t.run(900); await snap('8-back');
  check('the board now has two flown missions and the third next', (await shown()).some(x => /\[x\] 2\s+Ore haulers/.test(x)) && (await shown()).some(x => /\[>\] 3\s+The mothership/.test(x)), (await shown()).join(' | '));
  await key('Escape');
  check('Esc goes to the title', await settle(`game.scene.isActive('Title')`));
  // level 2 begins in its ready room: Launch starts the warp cinematic as the level's start always did, then the story, then the flight (no second briefing)
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 2, mission: 0, techs: ['shield'], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: {} }))`);
  await t.run(900); await key('KeyK');
  check('K opens the room of level 2: Proxima Gate, the warp station', await settle(`game.scene.isActive('CampHub') && ${HUB}.look && ${HUB}.look.name === 'Proxima Gate'`)); await t.run(900); await snap('9-level2');
  await key('KeyL');
  check('Launch at the start of level 2 plays the warp cinematic', await settle(`game.scene.isActive('CampWarp')`));
  await t.run(1200); await key('Enter'); // any key skips the cinematic
  check('after the warp the Campaign scene shows the level\'s story (via the hub), and Enter then goes straight to the flight', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.mode === 'intro'`) && await j(`${CAMPS}.via === 'hub'`) && (await key('Enter'), await settle(`${CAMPS}.mode === 'play'`)));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nCAMPAIGN HUB BOOT FAIL (${bad})` : '\nCAMPAIGN HUB BOOT PASS');
process.exit(bad ? 1 : 0);
