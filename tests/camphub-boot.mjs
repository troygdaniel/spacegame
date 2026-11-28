// not in the smoke: a boot of the Campaign's ready room (the hub), run by hand (one Chrome, muted, through the test lock; card space-game-campaign-hub)
// The rules are in tests/camphub.mjs (the model) and tests/camphubscene.mjs (the scene on a stand-in). This boots the real game and does what Troy does: the title's K opens the room, he reads the four rows
// with the digits, opens the missions and the refit with Enter (the overlay at the top of the screen), buys at the refit, launches with L, and a won mission comes back to the room (card space-game-ready-room-simple).
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
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, KeyK: 75, KeyF: 70, KeyE: 69, KeyL: 76, KeyS: 83, KeyW: 87, Enter: 13, Backspace: 8, Escape: 27, ArrowLeft: 37, ArrowUp: 38, ArrowRight: 39, ArrowDown: 40 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, CAMPS = `game.scene.getScene('Campaign')`;
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'hub-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture hub-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return Object.keys(s.slots).map(k => s.slots[k]).concat(Object.keys(s.ovSlots).map(k => s.ovSlots[k])).filter(o => o.visible && o.text).map(o => o.text).concat([...document.querySelectorAll('.sc-root *')].filter(e => e.children.length === 0 && (e.textContent || '').trim()).map(e => e.textContent.trim())); })()`); // + the new screens' page words (screens=1: the ready room is page panels: card space-game-boots-after-looks) // the glass's page and the overlay's lines

  const SCR = async () => !!(await j(`typeof scrOn === 'function' && scrOn()`)); // the new screens (?screens=1, soon the default): the ready room, the pick, the refit and the rank are page panels with their own words; the glass look's checks stay for ?screens=0 (card space-game-boots-fill-screens)
  const near = (w, a, b, gap = 3) => w.some((x, i) => a.test(x) && w.slice(i + 1, i + 1 + gap).some(y => b.test(y)));
  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.ev(beltSource(1)); /* the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots) */ await t.clock(); await t.run(900);
  // a campaign in progress: the first mission flown, the second next, 100 ore in the store, one tech
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 1, techs: ['shield'], ore: 100, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 120, hull: 500, lost: 0, tries: 1 } } }))`);
  await key('KeyK');
  check('K on the title opens the ready room (not the battle)', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && !(await j(`game.scene.isActive('Campaign')`)));
  await t.run(900);
  const scr = await SCR();
  check('the hall is Long Haul\'s (its baked layer is in the texture cache) and the glass has its four rows (no Briefing row), or the new ready room is up (the next mission\'s card and the three chips)', await j(`Object.keys(game.textures.list).some(k => /^in-base/.test(k))`) && (scr ? await (async () => { const w = await shown(); return w.some(x => /^Next \u00b7 mission 2 of 9$/.test(x)) && ['Ore haulers', 'Missions', 'Refit', 'Rank'].every(a => w.indexOf(a) >= 0); })() : await j(`${HUB}.rowT.length === 4`)));
  await snap('1-menu');
  check('the right side says in a sentence what Missions is, and no overlay is up yet (the new ready room: the Missions chip says how many are flown, 1 of 9, and no pick is up)', scr ? (near(await shown(), /^Missions$/, /^1 of 9$/) && await j(`${HUB}.hub.open === ''`)) : ((await shown()).some(x => /^Every mission of the campaign/.test(x)) && await j(`${HUB}.hub.open === '' && ${HUB}.ovGlass.visible === false`)));
  if (scr) { check('the new ready room opens with the light on the next-mission card (the Launch row), not on Missions (card space-game-b13-a1-a2-enter-flow, BRIEF 13 A1)', await j(`${HUB}.hub.row === 3 && ${HUB}.hub.open === ''`)); await key('Digit1'); await t.run(200); } // (1 puts the light on Missions: the grid is for replays)
  await key('Enter'); await t.run(300); await snap('1-board');
  check('Enter opens the missions overlay at the top of the screen: it names the next mission (the haulers) and the one flown (Belt survey, 900 pts); the new pick: nine tiles, Ore haulers marked Next, Belt survey with its score 900', await (async () => { const s = await shown(); return scr ? (await j(`${HUB}.hub.open === 'board'`)) && near(s, /^Ore haulers$/, /^Next$/) && near(s, /^Belt survey$/, /^900$/) : s.some(x => /\[>\] 2\s+Ore haulers/.test(x)) && s.some(x => /\[x\] 1\s+Belt survey/.test(x)) && s.some(x => /^900 pts/.test(x)); })());
  check('beside the list the overlay has the briefing of the mission under the cursor (MISSION 2 OF 3, ESCORT); the new pick: the bar under the tiles names it, its goal line, its bonuses and par', scr ? (await (async () => { const w = await shown(); return w.some(x => /^Mine Ceres, sell the ore\.$/.test(x)) && w.some(x => /bonuses$/.test(x)); })()) : ((await shown()).some(x => /^MISSION 2 OF 3/.test(x)) && (await shown()).some(x => /^ESCORT/.test(x))));
  await key('Enter'); await t.run(900); await snap('2-briefing');
  check('Enter on the mission opens the big briefing (three screens; the new screens: the one page), nothing launched; Esc takes it away to the overlay', await j(`campBriefIsOpen(${HUB})`) && !(await j(`game.scene.isActive('Campaign')`)) && (await key('Escape'), await j(`!campBriefIsOpen(${HUB}) && ${HUB}.hub.open === 'board'`)));
  await key(scr ? 'Escape' : 'ArrowLeft'); check('Left closes the overlay (the new screens: the arrows only choose, Esc is Back and closes the pick)', await j(`${HUB}.hub.open === '' && (${scr} || ${HUB}.ovGlass.visible === false)`));
  await key('Digit2'); const there = await settle(`Math.abs(${HUB}.player.x - 640) < 4 && Math.abs(${HUB}.player.y - 246) < 4`, 80); await t.run(300); await snap('3-refit');
  check('2: the refit at the repair bay: the pilot has walked to it (the new screens: the digit lights the Refit chip; the room walks no pilot)', scr ? await j(`${HUB}.hub.row === 1`) : there);
  await key('Enter'); await t.run(300); await snap('3-refit-overlay');
  check('Enter opens the refit overlay: each choice says what it changes, its cost and what you have; the new refit: the wing as a meter, the cost 25, Can buy, the shield grid at 60% damage taken', scr ? await (async () => { const w = await shown(); return await j(`${HUB}.hub.open === 'refit'`) && w.some(x => /^Wing \d+$/.test(x)) && w.indexOf('25') >= 0 && w.indexOf('Can buy') >= 0 && near(w, /^Shield grid$/, /^Damage taken$/) && w.indexOf('60%') >= 0; })() : ((await shown()).some(x => /^Wing strength: 8 to 9$/.test(x)) && (await shown()).some(x => /^25 ore$/.test(x)) && (await shown()).some(x => /^You can buy it\.$/.test(x)) && (await shown()).some(x => /^Damage the cruiser takes: 100 to 60 percent$/.test(x))));
  await key('KeyF'); await key('KeyF'); await key('KeyF'); await t.run(300); await snap('3b-refit-bought');
  const sv = await j(`JSON.parse(localStorage.getItem('longhaul.campaign'))`);
  check('F, F, F bought three fighters (there is no escort to buy): 100 - 25 - 25 - 25 = 25 ore, in the save at once', sv.ore === 25 && sv.bonus.fighters === 3 && sv.bonus.escorts === undefined, JSON.stringify(sv.bonus) + ' ore ' + sv.ore);
  await key('Digit3'); await key('Enter'); await t.run(900); await snap('4-rank');
  check('the rank overlay shows the rank and the ranks above (the new rank: Rank n of 6, the six ranks as tiles with what each adds)', scr ? await (async () => { const w = await shown(); return await j(`${HUB}.hub.open === 'rank'`) && w.some(x => /^Rank \d of 6$/.test(x)) && ['Cadet', 'Ensign', 'Lieutenant', 'Commander', 'Captain', 'Commodore'].every(r => w.indexOf(r) >= 0); })() : (await shown()).some(x => /^THE RANKS$/.test(x)));
  await key('Digit4'); const arrived = await settle(`Math.abs(${HUB}.player.x - 1028) < 4 && Math.abs(${HUB}.player.y - 394) < 4`, 80); await t.run(300); await snap('5-launch');
  check('4: the pilot walks to the pad and its sentence says what launching does (the new screens: the digit lights the card, which says Enter Briefing: card space-game-b13-a1-a2-enter-flow)', scr ? (await j(`${HUB}.hub.row === 3`)) && near(await shown(), /^Enter$/, /^Briefing$/, 2) : arrived && (await shown()).some(x => /Take the cruiser out on mission 2 of 3/.test(x)), await j(`JSON.stringify([${HUB}.player.x, ${HUB}.player.y])`));
  await key('KeyL'); await t.run(400); await key('KeyL'); // (card space-game-ready-l-briefing-first: the first L opens the briefing, the second launches)
  check('L launches: the Campaign scene starts on mission 2 via the hub, and goes straight to the flight (no second briefing)', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.camp`) && await j(`${CAMPS}.via === 'hub' && ${CAMPS}.mi === 1 && ${CAMPS}.level === 1`) && await settle(`${CAMPS}.mode === 'play'`), await j(`${CAMPS}.mode`));
  check('the wing is the one bought in the room: the three pilots are out beside the cruiser from the first second (card space-game-keys-orders), none left in the bay, with a strength of 11 fighters\' worth at the start (8 and the 3 bought: card space-game-three-pilots)', await j(`campWing(${CAMPS}.camp).length === 3 && ${CAMPS}.camp.bay.fighters === 0 && ${CAMPS}.camp.strength === 11`), await j(`JSON.stringify({ out: campWing(${CAMPS}.camp).length, bay: ${CAMPS}.camp.bay, strength: ${CAMPS}.camp.strength })`));
  await t.run(1500); await snap('6-flight');
  // the mission is won: the debrief, and Enter returns to the room
  await t.ev(`(() => { const s = ${CAMPS}; campEnd(s.camp, 'won', 'test'); return 1; })()`); await t.run(2600);
  check('a won mission shows its debrief, and the hint says Enter goes to the ready room (the new won card: an Enter chip and its word)', await j(`${CAMPS}.mode === 'debrief'`) && (scr ? await j(`/Enter/.test((document.querySelector('.sc-root') || {}).textContent || '')`) : await j(`/ready room/.test(uiText('camp.ui.debriefnext'))`)));
  await snap('7-debrief');
  await key('Enter');
  check('Enter at the debrief comes back to the room, with the win in the save (mission 2 done, mission 3 next)', await settle(`game.scene.isActive('CampHub')`) && await j(`(() => { const p = JSON.parse(localStorage.getItem('longhaul.campaign')); return p.mission === 2 && !!p.results['1.2']; })()`));
  if (scr) { check('the new won card\'s Enter opened the next mission\'s briefing in the room at once (card space-game-b13-a1-a2-enter-flow, BRIEF 13 A2); Esc takes it away to the ready room', await settle(`typeof campBriefIsOpen === 'function' && campBriefIsOpen(${HUB})`, 80)); await key('Escape'); await t.run(500); }
  await t.run(900); await snap('8-back'); if (scr) await key('Digit1'); await key('Enter');
  check('the board now has two flown missions and the third next', scr ? (near(await shown(), /^Ore haulers$/, /^\d[\d,]*$/, 2) && near(await shown(), /^The mothership$/, /^Next$/, 2)) : ((await shown()).some(x => /\[x\] 2\s+Ore haulers/.test(x)) && (await shown()).some(x => /\[>\] 3\s+The mothership/.test(x))), (await shown()).join(' | '));
  await key('Escape'); check('Esc closes the overlay first', await j(`${HUB}.hub.open === '' && game.scene.isActive('CampHub')`));
  await key('Escape');
  check('Esc with none open goes to the title', await settle(`game.scene.isActive('Title')`));
  // level 2 begins in its ready room: Launch starts the warp cinematic as the level's start always did, then the story, then the flight (no second briefing)
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 2, mission: 0, techs: ['shield'], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: {} }))`);
  await t.run(900); await key('KeyK');
  check('K opens the room of level 2: Proxima Gate, the warp station', await settle(`game.scene.isActive('CampHub') && ${HUB}.look && ${HUB}.look.name === 'Proxima Gate'`)); await t.run(900); await snap('9-level2');
  await key('KeyL'); await t.run(400); await key('KeyL'); // (card space-game-ready-l-briefing-first: the first L opens the briefing, the second launches)
  check('Launch at the start of level 2 plays the warp cinematic', await settle(`game.scene.isActive('CampWarp')`));
  await t.run(1200); await key('Enter'); // any key skips the cinematic
  check('after the warp the Campaign scene shows the level\'s story (via the hub), and Enter then goes straight to the flight (the new screens: the story card is off, the flight follows the warp at once)', scr ? (await settle(`game.scene.isActive('Campaign') && ${CAMPS}.mode`) && await j(`${CAMPS}.via === 'hub'`) && (await j(`${CAMPS}.mode === 'play'`) || (await key('Enter'), await settle(`${CAMPS}.mode === 'play'`)))) : (await settle(`game.scene.isActive('Campaign') && ${CAMPS}.mode === 'intro'`) && await j(`${CAMPS}.via === 'hub'`) && (await key('Enter'), await settle(`${CAMPS}.mode === 'play'`))));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nCAMPAIGN HUB BOOT FAIL (${bad})` : '\nCAMPAIGN HUB BOOT PASS');
process.exit(bad ? 1 : 0);
