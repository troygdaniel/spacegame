// not in the smoke: a boot of the big briefing, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-briefing)
// The rules are in tests/campbrief.mjs (plain Node). This boots the real game with a campaign in progress (belt missions 1 and 2 done, 3 next), opens the ready room with K, picks the next mission with Enter and reads the
// big briefing, zooms its map with M (the sound is NOT muted by it), closes it with Esc (the pause menu does not open), picks a replay with A and R, and launches it from the briefing.
//   node tests/campbrief-boot.mjs
// Pictures go to the folder in BRIEF_SHOTS (default ~/dev/spacegame-night/shots/brief-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.BRIEF_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { KeyK: 75, KeyA: 65, KeyR: 82, KeyL: 76, KeyM: 77, KeyH: 72, Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37, Digit2: 50 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, CAMPS = `game.scene.getScene('Campaign')`;
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'brief-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture brief-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const bf = () => j(`(() => { const s = ${HUB}; return s.bf ? s.bf.text.filter(o => o.text).map(o => o.text).concat(s.bf.map.filter(o => o.text).map(o => o.text)) : []; })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 2, techs: ['shield', 'bay2'], ore: 77, bonus: { fighters: 1, escorts: 1 }, results: { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 100, hull: 500, lost: 0, tries: 2 }, '1.2': { score: 640, bonuses: [], t: 90, hull: 300, lost: 1, tries: 1 } } }))`);
  const muted0 = await j('G.muted');
  await key('KeyK');
  check('K opens the ready room, the cursor on the next mission', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && await j(`${HUB}.hub.cur === 2 && !${HUB}.bf`));
  await t.run(900);
  await key('Enter'); await t.run(700);
  const a = await bf();
  check('Enter on the board opens the briefing at once: the mission, the goals, the walkthrough, the enemies, the readiness and the route are on the glass', await j(`campBriefIsOpen(${HUB})`) && a.some(x => /^MISSION 3 OF 3\s+-\s+The mothership/.test(x)) && a.includes('GOALS') && a.includes('WALKTHROUGH') && a.includes('ENEMIES') && a.includes('READINESS') && a.some(x => /^Route [\d,]+ km: \d+ s regular, \d+ s on Fast\./.test(x)) && a.includes('YOU'), a.join(' | ').slice(0, 400));
  await snap('1-briefing');
  await key('KeyM'); await t.run(500);
  check('M zooms the map (route, then the mission area), and does NOT mute the sound; the briefing is still up', await j(`${HUB}.bf.zoom === 1`) && (await j('G.muted')) === muted0);
  await snap('2-mission-area');
  await key('KeyM'); await t.run(400); await snap('2b-whole-system');
  check('M again is the whole system', await j(`${HUB}.bf.zoom === 2`)); await key('KeyM'); await key('Escape'); await t.run(400);
  check('M once more is the route again; Esc closes the briefing and is NOT the pause menu or the title: the ready room is still the room', await j(`!${HUB}.bf`) && await j(`game.scene.isActive('CampHub') && !game.scene.isActive('Pause')`));
  await key('KeyA'); await key('KeyR'); await t.run(700);
  const r = await bf();
  check('A then R picks the second mission as a replay and opens its briefing, headed REPLAY, with its own walkthrough', await j(`campBriefIsOpen(${HUB})`) && r.some(x => /^REPLAY\s+-\s+MISSION 2 OF 3\s+-\s+Ore haulers/.test(x)) && r.some(x => /^1\. 3 haulers leave Vesta for Ceres/.test(x)), r.join(' | ').slice(0, 300));
  await snap('3-replay-briefing');
  await key('KeyL');
  check('L in the briefing launches the replay: the Campaign scene is on belt mission 2 as a replay and goes to the flight', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.camp && ${CAMPS}.mode === 'play'`) && await j(`${CAMPS}.replay === true && ${CAMPS}.mi === 1`));
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nCAMPAIGN BRIEFING BOOT FAIL (${bad})` : '\nCAMPAIGN BRIEFING BOOT PASS');
process.exit(bad ? 1 : 0);
