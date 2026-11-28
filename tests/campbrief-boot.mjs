// not in the smoke: a boot of the big briefing, run by hand (one Chrome, muted, through the test lock; card space-game-campaign-briefing)
// The rules are in tests/campbrief.mjs (plain Node). This boots the real game with a campaign in progress (belt missions 1 and 2 done, 3 next), opens the ready room with K, picks the next mission with Enter and reads the
// big briefing (three screens: where and why, what to do, how; card space-game-briefing-walkthrough), zooms its map with + - 0 and M (the sound is NOT muted by it), walks through the screens with Right and Left, closes it with Esc (the pause menu does not open), picks a replay with Up and R, and launches it from the last screen with Enter.
//   node tests/campbrief-boot.mjs
// Pictures go to the folder in BRIEF_SHOTS (default ~/dev/spacegame-night/shots/brief-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
import { beltSource } from './fixtures/campbelt.mjs';
const OUT = process.env.BRIEF_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, KeyQ: 81, Equal: 187, Minus: 189, Backspace: 8, KeyS: 83, KeyK: 75, KeyR: 82, KeyL: 76, KeyM: 77, KeyH: 72, Enter: 13, Escape: 27, ArrowUp: 38, ArrowRight: 39, ArrowLeft: 37, Left: 37, Digit2: 50 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, CAMPS = `game.scene.getScene('Campaign')`;
  const zr = async () => (await j(`campKeyCodes('zoomreset')[0] || ''`)) || 'KeyQ'; // the key that puts the zoom and the view back and opens the cruiser list, read from the key table (Q since card space-game-keys5-qwe; it was S)
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: /^(Enter|Backspace|Arrow|Escape)/.test(code) ? code : code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'brief-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture brief-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  let scr = false; const isScr = () => j(`typeof scrOn === 'function' && scrOn()`); // the new screens (?screens=1, soon the default): the briefing is ONE page (src/scrbrief.js: the map, the goal line, four numbered moments, the bonus pills, Launch), not three screens; the glass look's walk stays for ?screens=0 (card space-game-boots-fill-screens)
  const page = () => j(`[...document.querySelectorAll('.sc-root *')].filter(e => e.children.length === 0 && (e.textContent || '').trim()).map(e => e.textContent.trim())`);
  const near = (w, a, b, gap = 3) => w.some((x, i) => a.test(x) && w.slice(i + 1, i + 1 + gap).some(y => b.test(y)));
  const bf = () => j(`(() => { const s = ${HUB}; return s.bf ? s.bf.text.filter(o => o.text).map(o => o.text).concat(s.bf.map.filter(o => o.text).map(o => o.text)) : []; })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.ev(beltSource(1)); /* the old Level 1, the belt, as level 1 (card space-game-l1-rim-boots) */ await t.clock(); await t.run(900);
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 2, techs: ['shield', 'bay2'], ore: 77, bonus: { fighters: 1, escorts: 1 }, results: { '1.1': { score: 900, bonuses: ['swift', 'clean'], t: 100, hull: 500, lost: 0, tries: 2 }, '1.2': { score: 640, bonuses: [], t: 90, hull: 300, lost: 1, tries: 1 } } }))`);
  scr = await isScr(); // (asked once the game has booted)
  const muted0 = await j('G.muted');
  await key('KeyK');
  check('K opens the ready room, the cursor on the next mission', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`) && await j(`${HUB}.hub.cur === 2 && !${HUB}.bf`));
  await t.run(900);
  if (scr) {
    await key('Digit1'); await t.run(200); await key('Enter'); await t.run(700); await key('Enter'); await t.run(900); // 1 puts the light on Missions (the room opens on the next-mission card); the pick opens, Enter on the mission in it opens its one-page briefing
    const a = await page();
    check('Enter on the ready room\'s Missions, then on the mission: the one-page briefing opens: Mission 3 (not 3 of 3), the mission\'s name and its goal line, the Launch chip, the Step chips (Left Right) and Esc Back, the moments as numbered tiles and the bonus pills', await j(`campBriefIsOpen(${HUB})`) && await j(`!!${HUB}.bf && ${HUB}.bf.screen === 0`) && a.some(x => /^Mission 3 \u00b7 ATTACK$/.test(x)) && a.indexOf('The mothership') >= 0 && a.indexOf('Destroy the alien mothership.') >= 0 && near(a, /^Enter$/, /^Launch$/, 1) && near(a, /^Right$/, /^Step$/, 1) && near(a, /^Esc$/, /^Back$/, 1) && a.indexOf('Bonus') >= 0 && a.some(x => /^Hull over \d+%$/.test(x)), a.join(' | ').slice(0, 400));
    await snap('1-briefing');
    await key('Equal'); await key('Equal'); await key('Equal'); await t.run(300);
    check('+ zooms the map in and does not mute the sound; Q resets, M goes to the mission area (the zoom back to 100%) and again to the whole system, and the sound stays as it was; the briefing is still up', await j(`${HUB}.bf.z > 1.6`) && (await j('G.muted')) === muted0 && (await key(await zr()), await key('KeyM'), await t.run(500), true) && await j(`${HUB}.bf.zoom === 1 && ${HUB}.bf.z === 1`) && (await key('KeyM'), await t.run(400), true) && await j(`${HUB}.bf.zoom === 2`) && (await j('G.muted')) === muted0 && await j(`campBriefIsOpen(${HUB})`));
    await snap('2-whole-system'); await key('KeyM');
    await key('ArrowRight'); await t.run(400);
    const lit = await j(`[...document.querySelectorAll('.sc-root .sc-tile.on')].map(e => e.textContent.trim())`), step1 = await j(`${HUB}.bf.step`);
    check('Right steps to the first moment (the arrows walk the moments, which is choosing): its tile is lit with its number and words, and the briefing stays up; Left steps back', step1 === 1 && lit.some(x => /^1\D/.test(x)) && (await key('ArrowLeft'), await t.run(300), true) && await j(`campBriefIsOpen(${HUB})`));
    await key('Escape'); await t.run(500);
    check('Esc closes the briefing and goes back to the pick (not the pause menu, not the title): the ready room is still the room and the pick is still open', await j(`!${HUB}.bf && ${HUB}.hub.open === 'board'`) && await j(`game.scene.isActive('CampHub') && !game.scene.isActive('Pause')`));
    await key('ArrowLeft'); await key('KeyR'); await t.run(900); // the pick is still open on the next mission: Left is the one before it, R picks it as a replay and opens its briefing
    const r = await page();
    check('Left then R picks the second mission as a replay and opens its briefing, headed Replay, with its goal line', await j(`campBriefIsOpen(${HUB})`) && r.some(x => /^Replay \u00b7 mission 2 \u00b7 /.test(x)) && r.indexOf('Ore haulers') >= 0 && r.indexOf('Mine Ceres, sell the ore.') >= 0, r.join(' | ').slice(0, 300));
    await snap('3-replay-briefing');
    await key('Escape'); await key('ArrowLeft'); await key('KeyR'); await t.run(900);
    const m1 = await page();
    check('mission 1 (the belt survey) is picked as a replay by R: its tile is tagged Replay and the line under the tiles says so (the fixture\'s belt has no moments of its own, so no briefing page opens: L launches from the pick)', await j(`!!${HUB}.hub.pick && ${HUB}.hub.pick.level === 1 && ${HUB}.hub.pick.i === 0`) && near(m1, /^Belt survey$/, /^Replay$/, 2), m1.join(' | ').slice(0, 300));
    await snap('4-replay-picked');
    await key('KeyL'); // L launches from the briefing
    check('L launches the replay (from the briefing of a mission that has one, from the pick otherwise): the Campaign scene is on belt mission 1 as a replay and goes to the flight', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.camp && ${CAMPS}.mode === 'play'`) && await j(`${CAMPS}.replay === true && ${CAMPS}.mi === 0`));
  } else {
    await key('Enter'); await t.run(700); await key('Enter'); await t.run(700); // the board opens the missions overlay, Enter on the mission in it opens the big briefing (card space-game-ready-room-simple)
    const a = await bf();
    check('Enter on the board, then on the mission: the briefing opens on its first screen on its first screen: Mission 3 (not 3 of 3), the three screens named, the map, the place, the route and the story line are on the glass', await j(`campBriefIsOpen(${HUB})`) && await j(`${HUB}.bf.screen === 0`) && a.some(x => /^MISSION 3\s+-\s+The mothership/.test(x)) && !a.some(x => /OF 3/.test(x)) && a.includes('WHERE') && a.includes('WHY') && a.some(x => /^Route /.test(x)) && a.includes('1  WHERE AND WHY') && a.includes('3  HOW'), a.join(' | ').slice(0, 400));
    await snap('1-briefing');
    await key('Equal'); await key('Equal'); await key('Equal'); await t.run(300);
    check('+ zooms the map in (the zoom reads in its corner) and does not mute the sound; Q puts it back', await j(`${HUB}.bf.z > 1.6`) && (await j('G.muted')) === muted0 && (await bf()).some(x => /^ZOOM 17\d%/.test(x)));
    await snap('1b-zoomed-in');
    await key(await zr()); await key('KeyM'); await t.run(500); // Q resets the zoom (no digit does; it was S until card space-game-keys5-qwe)
    check('Q resets, M goes to the mission area (the zoom back to 100%), and does NOT mute the sound; the briefing is still up', await j(`${HUB}.bf.zoom === 1 && ${HUB}.bf.z === 1`) && (await j('G.muted')) === muted0);
    await snap('2-mission-area');
    await key('KeyM'); await t.run(400); await snap('2b-whole-system');
    check('M again is the whole system', await j(`${HUB}.bf.zoom === 2`)); await key('KeyM');
    await key('Enter'); await t.run(500);
    const w = await bf();
    check('Enter goes on to the second screen, WHAT TO DO: the goal as a step with its picture, the bonus with points and pictures', await j(`${HUB}.bf.screen === 1 && ${HUB}.bf.pics.length > 3`) && w.includes('GOALS') && w.includes('BONUS') && w.some(x => /^Destroy the mothership/.test(x)) && w.some(x => /^\+250\s/.test(x)), w.join(' | ').slice(0, 300));
    await snap('4-what-to-do');
    await key('Enter'); await t.run(500);
    const h = await bf();
    check('Enter goes on to the third screen, HOW: the walkthrough, the keys the mission needs, the enemies and the readiness', await j(`${HUB}.bf.screen === 2`) && h.includes('WALKTHROUGH') && h.includes('KEYS THIS MISSION NEEDS') && h.includes('ENEMIES') && h.includes('READINESS') && h.some(x => /^Fire a homing missile/.test(x)), h.join(' | ').slice(0, 300));
    await snap('5-how');
    await key('ArrowLeft'); await key('ArrowLeft'); await t.run(300);
    check('Left twice is back on the first screen, which has its map again; Esc closes the briefing and is NOT the pause menu or the title: the ready room is still the room', await j(`${HUB}.bf.screen === 0 && ${HUB}.bf.map.length > 5`));
    await key('Escape'); await t.run(400);
    check('Esc closed it, and the ready room is still the room', await j(`!${HUB}.bf`) && await j(`game.scene.isActive('CampHub') && !game.scene.isActive('Pause')`));
    await key('ArrowUp'); await key('KeyR'); await t.run(700); // the overlay is still open on the next mission: Up is the one before it, R picks it as a replay and opens its briefing
    const r = await bf();
    check('Up then R picks the second mission as a replay and opens its briefing, headed REPLAY, with its own story line', await j(`campBriefIsOpen(${HUB})`) && r.some(x => /^REPLAY\s+-\s+MISSION 2\s+-\s+Ore haulers/.test(x)) && r.some(x => /^Escort the haulers/.test(x)), r.join(' | ').slice(0, 300));
    await snap('3-replay-briefing');
    await key('Enter'); await t.run(400); await snap('6-replay-what-to-do'); await key('Enter'); await t.run(300); await snap('7-replay-how');
    await key('Escape'); await key('ArrowUp'); await key('KeyR'); await t.run(600);
    const m1 = await bf(), note = () => j(`${HUB}.bf.text.filter(o => o.text).map(o => o.text).filter(x => /^SHIP:/.test(x))`);
    check('mission 1 (the belt survey) carries the ship\'s lines over its three screens, the basics in the story\'s voice: the map and the rings, the scan, then fly, who takes the order and the one order key', (await note()).some(x => /Welcome aboard, Commander/.test(x)));
    await snap('8-tutorial-1');
    await key('Enter'); await t.run(300); await snap('8-tutorial-2'); const n2 = await note();
    await key('Enter'); await t.run(300); await snap('8-tutorial-3'); const n3 = await note();
    const kw = await j(`['keywho', 'keyorder'].map(campKeyVar)`); // the keys are read from the key table, never a letter written here: Q picks who and W gives the order (the belt fixture's own line says {keywho} picks who, {keyorder} gives the order; the key rounds of 23 Nov 2026 move them again)
    check('the second screen says how a ring is scanned and the third the keys: the arrows, Space, who (the key that picks who) and the one order key, Tab (the belt fixture\'s own lines)', n2.some(x => /inside a ring scans it/.test(x)) && n3.some(x => /arrow keys fly the cruiser/.test(x) && /Space/.test(x) && x.indexOf(kw[0] + ' picks who, ' + kw[1] + ' gives the order') >= 0 && kw.every(k => k) && /Tab/.test(x) && !/1 launches/.test(x)), JSON.stringify(kw) + ' ' + n3.join(' | ')); // (the words are camp.bf.1.1.n3)
    await key('Enter');
    check('Enter on the last screen launches the replay: the Campaign scene is on belt mission 1 as a replay and goes to the flight', await settle(`game.scene.isActive('Campaign') && ${CAMPS}.camp && ${CAMPS}.mode === 'play'`) && await j(`${CAMPS}.replay === true && ${CAMPS}.mi === 0`));
  }
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nCAMPAIGN BRIEFING BOOT FAIL (${bad})` : '\nCAMPAIGN BRIEFING BOOT PASS');
process.exit(bad ? 1 : 0);
