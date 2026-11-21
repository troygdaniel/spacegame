// not in the smoke: a boot of replaying a mission, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-replay)
// The rules are in tests/campreplay.mjs (plain Node). This boots the real game with a campaign in progress (belt missions 1 and 2 done, 3 next) and does what Troy does: opens the ready room with K, chooses a mission done on
// the board (D), picks it (R), reads its briefing (2), launches (L), wins it with a better score, reads the debrief, and comes back to the room: the best is kept and the story has not moved. Then a replay that is lost.
//   node tests/campreplay-boot.mjs
// Pictures go to the folder in REPLAY_SHOTS (default ~/dev/spacegame-night/shots/replay-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.REPLAY_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, KeyK: 75, KeyD: 68, KeyA: 65, KeyR: 82, KeyX: 88, KeyL: 76, KeyH: 72, Enter: 13, Escape: 27 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, CAMPS = `game.scene.getScene('Campaign')`;
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'replay-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture replay-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return Object.keys(s.slots).map(k => s.slots[k]).filter(o => o.visible && o.text).map(o => o.text); })()`);
  const save = () => j(`JSON.parse(localStorage.getItem('longhaul.campaign'))`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 2, techs: ['shield', 'bay2'], ore: 77, bonus: { fighters: 1, escorts: 1 }, results: { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 100, hull: 500, lost: 0, tries: 2 }, '1.2': { score: 640, bonuses: [], t: 90, hull: 300, lost: 1, tries: 1 } } }))`);
  await key('KeyK');
  check('K opens the ready room; the board shows the two missions done with their best scores, the cursor on the next mission, and the keys', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && (await shown()).some(x => /^> \[>\] 3\s+The mothership/.test(x)) && (await shown()).some(x => /^900 pts/.test(x)) && (await shown()).some(x => /Enter or R open the briefing/.test(x)), (await shown()).join(' | '));
  await t.run(900); await snap('1-board');
  await key('KeyA'); await key('KeyR'); await t.run(400);
  check('A moves to the second mission done and R picks it and opens its big briefing at once (card space-game-campaign-briefing); Esc takes it away', await j(`campBriefIsOpen(${HUB})`)); await key('Escape'); await t.run(300); await snap('2-board-picked');
  check('...and the board has it picked: its row is marked [R] and the line says Replay: Ore haulers', (await shown()).some(x => /^(> )?\[R\] 2\s+Ore haulers/.test(x)) && (await shown()).some(x => /^Replay: Ore haulers\./.test(x)), (await shown()).join(' | '));
  await key('Digit2'); await t.run(900); await snap('3-briefing');
  check('2: the briefing is that of the replay, headed REPLAY, with the rule: your wing, rank and techs, story and progress stay, your best is kept', (await shown()).some(x => /^REPLAY\s+-\s+MISSION 2 OF 3\s+-\s+Ore haulers/.test(x)) && (await shown()).some(x => /best is kept/.test(x)), (await shown()).join(' | '));
  await key('KeyH'); await t.run(500); await snap('4-keys-page');
  check('H opens the ready room\'s page of keys (and any key closes it)', await j(`${HUB}.ck && ${HUB}.ck.open === true`)); await key('Escape'); await t.run(300);
  check('...closed, and the room is still the room', await j(`!${HUB}.ck && game.scene.isActive('CampHub')`));
  await key('Digit5'); await t.run(1500); await snap('5-launch-page');
  await key('KeyL');
  check('L launches the replay: the Campaign scene is on belt mission 2 as a replay, goes straight to the flight (no story), with the current wing (the bay, the second bay, the extras and the rank: what the room shows) and ore (77)', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.camp && ${CAMPS}.mode === 'play'`) && await j(`${CAMPS}.replay === true && ${CAMPS}.mi === 1 && ${CAMPS}.camp.ore === 77 && ${CAMPS}.camp.bay.fighters === campRankWing(${CAMPS}.P).fighters && ${CAMPS}.camp.bay.escorts === campRankWing(${CAMPS}.P).escorts && ${CAMPS}.camp.bay.fighters >= CAMP.bay.fighters + CAMP.tech.bay2.fighters + 1`), await j(`JSON.stringify([${CAMPS}.mode, ${CAMPS}.camp.ore, ${CAMPS}.camp.bay])`));
  await t.run(1500); await snap('6-replay-flight');
  // win it with a better score: the battle ends as won (the game's own end), the scene's debrief follows
  await t.ev(`(() => { const s = ${CAMPS}; s.camp.ore = 90; campEnd(s.camp, 'won', 'test'); s.camp.score.score = 1700; return 1; })()`); await t.run(2600);
  check('the debrief is up', await j(`${CAMPS}.mode === 'debrief'`));
  const lines = await j(`(() => { const s = ${CAMPS}; return (s.card || []).filter(o => o && o.text).map(o => o.text); })()`);
  check('the card is titled REPLAY, has the old best against the new, and the hint is Enter ready room', lines.some(x => /^REPLAY\s+-\s+Ore haulers/.test(x)) && lines.some(x => /this run 1,700, your best was 640/.test(x)) && lines.some(x => /A new best: 1,700 points/.test(x)) && lines.some(x => /ready room/.test(x)), lines.join(' | ').slice(0, 300));
  await snap('7-replay-debrief');
  const sv = await save();
  check('already in the save: the best is 1,700 with one replay, and the story has NOT moved (level 1, mission 3 next), the ore 90, the techs and extras as they were', sv.results['1.2'].score === 1700 && sv.results['1.2'].replays === 1 && sv.level === 1 && sv.mission === 2 && sv.ore === 90 && sv.techs.join() === 'shield,bay2' && sv.bonus.fighters === 1 && sv.bonus.escorts === 1 && sv.results['1.1'].score === 900, JSON.stringify(sv));
  await key('Enter');
  check('Enter is the ready room: the board has the new best on the second mission, the third is still NEXT, and no story, refit or pick came up', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && (await shown()).some(x => /^1,?700 pts/.test(x) || /1700 pts/.test(x)) && (await shown()).some(x => /\[>\] 3\s+The mothership/.test(x)), (await shown()).join(' | '));
  await t.run(900); await snap('8-board-after');
  // a replay that is lost costs nothing
  await key('KeyD'); await key('KeyR'); await key('Digit5'); await t.run(900); await key('KeyL');
  check('replaying again (mission 1 this time) the scene is a replay once more', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.mode === 'play' && ${CAMPS}.replay === true`));
  await t.ev(`(() => { const s = ${CAMPS}; campEnd(s.camp, 'lost', 'carrier'); return 1; })()`); await t.run(1800);
  const sv2 = await save();
  check('lost: the lose card is up, and the save is untouched (score, tries, replays)', await j(`${CAMPS}.mode === 'lost'`) && sv2.results['1.1'].score === 900 && sv2.results['1.1'].tries === 2 && !sv2.results['1.1'].replays && sv2.mission === 2, JSON.stringify(sv2.results['1.1']));
  await key('Enter');
  check('Enter flies it again as a replay: the briefing card first, as any lost mission does (via retry), then the flight', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.replay === true && ${CAMPS}.via === 'retry' && ${CAMPS}.mode === 'brief'`) && (await key('Enter'), await settle(`${CAMPS}.mode === 'play'`)));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nCAMPAIGN REPLAY BOOT FAIL (${bad})` : '\nCAMPAIGN REPLAY BOOT PASS');
process.exit(bad ? 1 : 0);
