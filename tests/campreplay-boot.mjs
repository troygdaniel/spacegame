// not in the smoke: a boot of replaying a mission, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-replay)
// The rules are in tests/campreplay.mjs (plain Node). This boots the real game with a campaign in progress (belt missions 1 and 2 done, 3 next) and does what Troy does: opens the ready room with K, chooses a mission done on
// the missions overlay (Enter, then Up), picks it (R), reads its briefing, launches (L), wins it with a better score, reads the debrief, and comes back to the room: the best is kept and the story has not moved. Then a replay that is lost.
//   node tests/campreplay-boot.mjs
// Pictures go to the folder in REPLAY_SHOTS (default ~/dev/spacegame-night/shots/replay-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { beltSource } from './fixtures/campbelt.mjs';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.REPLAY_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, KeyK: 75, KeyD: 68, KeyA: 65, KeyR: 82, KeyX: 88, KeyL: 76, KeyH: 72, Enter: 13, Escape: 27, ArrowUp: 38, ArrowDown: 40 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, CAMPS = `game.scene.getScene('Campaign')`;
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'replay-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture replay-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return Object.keys(s.slots).map(k => s.slots[k]).concat(Object.keys(s.ovSlots).map(k => s.ovSlots[k])).filter(o => o.visible && o.text).map(o => o.text).concat([...document.querySelectorAll('.sc-root *')].filter(e => e.children.length === 0 && (e.textContent || '').trim()).map(e => e.textContent.trim())); })()`); // + the new screens' page words (screens=1: the ready room is page panels: card space-game-boots-after-looks) // the glass's page and the overlay's lines (card space-game-ready-room-simple)
  const save = () => j(`JSON.parse(localStorage.getItem('longhaul.campaign'))`);
  const SCR = async () => !!(await j(`typeof scrOn === 'function' && scrOn()`)); // the new screens (?screens=1, soon the default): the pick, the briefing and the cards are page panels with their own words; the glass look's checks stay for ?screens=0 (card space-game-boots-fill-screens)
  const near = (w, a, b, gap = 3) => w.some((x, i) => a.test(x) && w.slice(i + 1, i + 1 + gap).some(y => b.test(y)));
  let scr = false;

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.ev(beltSource(1)); /* the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots) */ await t.clock(); await t.run(900);
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 2, techs: ['shield', 'bay2'], ore: 77, bonus: { fighters: 1, escorts: 1 }, results: { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 100, hull: 500, lost: 0, tries: 2 }, '1.2': { score: 640, bonuses: [], t: 90, hull: 300, lost: 1, tries: 1 } } }))`);
  scr = await SCR();
  await key('KeyK');
  if (scr) {
    check('K opens the ready room; Enter opens the pick: the two missions done with their best scores (Belt survey 900, Ore haulers 640), the next one marked Next, and the keys (Enter Briefing, Esc Back)', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && (await key('Digit1'), true) && (await key('Enter'), true) && await settle(`${HUB}.hub.open === 'board'`) && await (async () => { const w = await shown(); return near(w, /^Belt survey$/, /^900$/) && near(w, /^Ore haulers$/, /^640$/) && near(w, /^The mothership$/, /^Next$/) && w.indexOf('Briefing') >= 0 && w.indexOf('Back') >= 0; })(), (await shown()).join(' | '));
  } else {
    check('K opens the ready room; Enter opens the missions overlay: the two missions done with their best scores, the cursor on the next mission, and the keys', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && (await key('Enter'), true) && await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && (await shown()).some(x => /^> \[>\] 3\s+The mothership/.test(x)) && (await shown()).some(x => /^900 pts/.test(x)) && (await shown()).some(x => /Enter or click again\s+open its briefing/.test(x)), (await shown()).join(' | '));
  }
  await t.run(900); await snap('1-board');
  if (scr) {
    await key('ArrowLeft'); await key('KeyR'); await t.run(700);
    check('Left moves to the second mission done (the arrows only choose) and R picks it and opens its one-page briefing at once, headed Replay; Esc takes it away', await j(`campBriefIsOpen(${HUB})`) && near(await shown(), /^Replay \u00b7 mission 2/, /^Ore haulers$/, 2)); await key('Escape'); await t.run(500); await snap('2-board-picked');
    check('...and the pick has it picked: its tile is tagged Replay and the line under the tiles says Replay: Ore haulers', near(await shown(), /^Ore haulers$/, /^Replay$/, 2) && (await shown()).some(x => /^Replay: Ore haulers\./.test(x)), (await shown()).join(' | '));
  } else {
    await key('ArrowUp'); await key('KeyR'); await t.run(400);
    check('Up moves to the second mission done and R picks it and opens its big briefing at once (card space-game-campaign-briefing); Esc takes it away', await j(`campBriefIsOpen(${HUB})`)); await key('Escape'); await t.run(300); await snap('2-board-picked');
    check('...and the board has it picked: its row is marked [R] and the line says Replay: Ore haulers', (await shown()).some(x => /^(> )?\[R\] 2\s+Ore haulers/.test(x)) && (await shown()).some(x => /^Replay: Ore haulers\./.test(x)), (await shown()).join(' | '));
  }
  if (scr) {
    await key('Enter'); await t.run(800); await snap('3-briefing');
    check('Enter opens the replay\'s one-page briefing (headed Replay, mission 2); Esc back to the pick; Launch (4) lights the card: it says Replay, Ore haulers and Enter Briefing (card space-game-b13-a1-a2-enter-flow: Enter on the card opens the briefing)', near(await shown(), /^Replay \u00b7 mission 2/, /^Ore haulers$/, 2) && (await key('Escape'), await t.run(400), await key('Digit4'), await t.run(500), near(await shown(), /^Replay \u00b7 mission 2 of 9$/, /^Ore haulers$/, 1) && near(await shown(), /^Enter$/, /^Briefing$/, 2)), (await shown()).join(' | '));
  } else {
    await t.run(600); await snap('3-briefing');
    check('beside the list the overlay shows the replay\'s briefing, headed REPLAY; Launch (4) says it flies Ore haulers again, with the story staying', (await shown()).some(x => /^REPLAY\s+-\s+MISSION 2 OF 3\s+-\s+Ore haulers/.test(x)) && (await key('Digit4'), await t.run(500), (await shown()).some(x => /^Fly Ore haulers again for a better score\./.test(x))), (await shown()).join(' | '));
  }
  await key('KeyH'); await t.run(500); await snap('4-keys-page');
  check('H opens the ready room\'s page of keys (and any key closes it)', await j(`${HUB}.ck && ${HUB}.ck.open === true`)); await key('Escape'); await t.run(300);
  check('...closed, and the room is still the room', await j(`!${HUB}.ck && game.scene.isActive('CampHub')`));
  await t.run(900); await snap('5-launch-page');
  await key('KeyL'); await t.run(400); await key('KeyL'); // (card space-game-ready-l-briefing-first: the first L opens the briefing, the second launches)
  check('L launches the replay: the Campaign scene is on belt mission 2 as a replay, goes straight to the flight (no story), with the current wing (the three pilots, and the second bay, the extras and the rank as their strength: what the room shows) and ore (77)', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.camp && ${CAMPS}.mode === 'play'`) && await j(`${CAMPS}.replay === true && ${CAMPS}.mi === 1 && ${CAMPS}.camp.ore === 77 && ${CAMPS}.camp.bay.fighters + ${CAMPS}.camp.ships.filter(u => u.team === 'earth' && /^fighter-/.test(u.id)).length === 3 && ${CAMPS}.camp.strength >= CAMP.pilotStrength + CAMP.tech.bay2.fighters + 1`), await j(`JSON.stringify([${CAMPS}.mode, ${CAMPS}.camp.ore, ${CAMPS}.camp.bay, ${CAMPS}.camp.strength])`)); // (the pilots start each mission out beside the cruiser, so the three are the ones in the bay plus the ones out; the wing is the three pilots whatever the extras; the bay2 tech, the one bought extra and the rank are the strength: card space-game-three-pilots)
  await t.run(1500); await snap('6-replay-flight');
  // win it with a better score: the battle ends as won (the game's own end), the scene's debrief follows
  await t.ev(`(() => { const s = ${CAMPS}; s.camp.ore = 90; campEnd(s.camp, 'won', 'test'); s.camp.score.score = 1700; return 1; })()`); await t.run(2600);
  check('the debrief is up', await j(`${CAMPS}.mode === 'debrief'`));
  if (scr) {
    const w = await j(`[...document.querySelectorAll('.sc-root *')].filter(e => e.children.length === 0 && (e.textContent || '').trim()).map(e => e.textContent.trim())`);
    check('the won card is headed Replay with the mission, the new score 1,700, the best (now 1,700) and a New best pill, and its keys say Enter Briefing and Esc Ready room (card space-game-b13-a1-a2-enter-flow)', w.indexOf('Replay') >= 0 && w.indexOf('Ore haulers') >= 0 && w.indexOf('1,700') >= 0 && w.some(x => /^Best 1,700$/.test(x)) && w.indexOf('New best') >= 0 && near(w, /^Enter$/, /^Briefing$/, 2) && near(w, /^Esc$/, /^Ready room$/, 2), w.join(' | ').slice(0, 300));
  } else {
    const lines = await j(`(() => { const s = ${CAMPS}; return (s.card || []).filter(o => o && o.text).map(o => o.text); })()`);
    check('the card is titled REPLAY, has the old best against the new, and the hint is Enter ready room', lines.some(x => /^REPLAY\s+-\s+Ore haulers/.test(x)) && lines.some(x => /this run 1,700, your best was 640/.test(x)) && lines.some(x => /A new best: 1,700 points/.test(x)) && lines.some(x => /ready room/.test(x)), lines.join(' | ').slice(0, 300));
  }
  await snap('7-replay-debrief');
  const sv = await save();
  check('already in the save: the best is 1,700 with one replay, and the story has NOT moved (level 1, mission 3 next), the ore 90, the techs and extras as they were', sv.results['1.2'].score === 1700 && sv.results['1.2'].replays === 1 && sv.level === 1 && sv.mission === 2 && sv.ore === 90 && sv.techs.join() === 'shield,bay2' && sv.bonus.fighters === 2 && sv.bonus.escorts === undefined && sv.results['1.1'].score === 900 /* the saved escort became a fighter when the escort ship was cut */, JSON.stringify(sv));
  await key(scr ? 'Escape' : 'Enter'); // the new look's won card: Enter is the next briefing, Esc is the ready room (card space-game-b13-a1-a2-enter-flow); the room opens on the next-mission card, so 1 puts the light on Missions before Enter opens the pick
  if (scr) {
    check('Enter is the ready room: the pick has the new best on the second mission (1,700), the third is still Next, and no story, refit or pick came up first', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && (await key('Digit1'), true) && (await key('Enter'), true) && await settle(`${HUB}.hub.open === 'board'`) && near(await shown(), /^Ore haulers$/, /^1,?700$/, 3) && near(await shown(), /^The mothership$/, /^Next$/, 2), (await shown()).join(' | '));
  } else {
    check('Enter is the ready room: the board has the new best on the second mission, the third is still NEXT, and no story, refit or pick came up', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && (await key('Enter'), true) && (await shown()).some(x => /^1,?700 pts/.test(x) || /1700 pts/.test(x)) && (await shown()).some(x => /\[>\] 3\s+The mothership/.test(x)), (await shown()).join(' | '));
  }
  await t.run(900); await snap('8-board-after');
  // a replay that is lost costs nothing
  if (scr) {
    await key('ArrowLeft'); await key('ArrowLeft'); await key('KeyR'); await t.run(900); await key('KeyL'); // (the pick is open, the cursor on the next mission: Left twice goes to mission 1, R opens its briefing, L launches from it)
  } else {
    await key('ArrowDown'); await key('ArrowDown'); await key('KeyR'); await t.run(900); await key('KeyL'); // (the missions overlay is open, the cursor on the next mission: Down goes to the last row, Start the campaign over, Down again wraps to mission 1, R opens its briefing, L launches from it)
  }
  check('replaying again (mission 1 this time) the scene is a replay once more', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.mode === 'play' && ${CAMPS}.replay === true`));
  await t.ev(`(() => { const s = ${CAMPS}; campEnd(s.camp, 'lost', 'carrier'); return 1; })()`); await t.run(1800);
  const sv2 = await save();
  check('lost: the lose card is up, and the save is untouched (score, tries, replays)', await j(`${CAMPS}.mode === 'lost'`) && sv2.results['1.1'].score === 900 && sv2.results['1.1'].tries === 2 && !sv2.results['1.1'].replays && sv2.mission === 2, JSON.stringify(sv2.results['1.1']));
  await key('Enter');
  check('Enter flies it again as a replay, at once: no card first (via retry; re-pinned with docs/screens-flow.html step 2: it showed the mission card first)', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.replay === true && ${CAMPS}.via === 'retry' && ${CAMPS}.mode === 'play'`));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nCAMPAIGN REPLAY BOOT FAIL (${bad})` : '\nCAMPAIGN REPLAY BOOT PASS');
process.exit(bad ? 1 : 0);
