// not in the smoke: a boot of the briefing's walk, run by hand (one Chrome, muted, through the test lock; card space-game-briefing-map-walk)
// The rules are in tests/campbriefwalk.mjs (plain Node). This boots the real game on the real rim run (level 1, mission 1.1 next), opens the ready room with K, opens the briefing with Enter on the board and Enter on the mission, and
// reads the walk: the map on the first page with the whole road, the walk playing on by itself to the end of the page, Enter to the next page (zoomed to where the stop is), the strip of each page, + - and S on a page that is not the
// first, Left back, the last stop's Enter launching the mission, Esc closing. Mission 1.2 still has the three screens.
//   node tests/campbriefwalk-boot.mjs
// Pictures go to the folder in BRIEF_SHOTS (default ~/dev/spacegame-night/shots/briefwalk-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.BRIEF_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const VK = { Digit1: 49, KeyQ: 81, Equal: 187, Minus: 189, Backspace: 8, KeyS: 83, KeyK: 75, KeyL: 76, KeyM: 77, Enter: 13, Escape: 27, ArrowRight: 39, ArrowLeft: 37 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`;
  const zr = async () => (await j(`campKeyCodes('zoomreset')[0] || ''`)) || 'KeyQ'; // the key that puts the zoom and the view back and opens the cruiser list, read from the key table (Q since card space-game-keys5-qwe; it was S)
  const key = async code => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: /^(Enter|Backspace|Arrow|Escape)/.test(code) ? code : code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(250); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'briefwalk-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture briefwalk-' + name); };
  const settle = async (expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  let scr = false; const isScr = () => j(`typeof scrOn === 'function' && scrOn()`); // the new screens (?screens=1, soon the default): the stepped walk is gone, the briefing is ONE page with four numbered moments that Left and Right step through (src/scrbrief.js); the glass look's walk stays for ?screens=0 (card space-game-boots-fill-screens)
  const page = () => j(`[...document.querySelectorAll('.sc-root *')].filter(e => e.children.length === 0 && (e.textContent || '').trim()).map(e => e.textContent.trim())`);
  const words = () => j(`(() => { const s = ${HUB}; return s.bf ? s.bf.text.filter(o => o.text).map(o => o.text).concat(s.bf.objs.filter(o => o.text).map(o => o.text)) : []; })()`);
  const where = () => j(`(() => { const b = ${HUB}.bf; return b && b.wk ? { i: b.wk.i, page: b.screen, z: b.wk.z, t: +b.wk.t.toFixed(2) } : null; })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  await t.ev(`localStorage.setItem('longhaul.campaign', JSON.stringify({ level: 1, mission: 0, techs: [], ore: 0, bonus: { fighters: 0, escorts: 0 }, results: {} }))`);
  scr = await isScr(); // (asked once the game has booted)
  await key('KeyK');
  check('K opens the ready room of the rim run', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`));
  await t.run(900);
  if (scr) {
    await key('Digit1'); await t.run(200); await key('Enter'); await t.run(700); await key('Enter'); await t.run(900); // 1 puts the light on Missions (the room opens on the next-mission card: card space-game-b13-a1-a2-enter-flow); the pick opens, Enter on mission 1.1 opens its one-page briefing
    const a = await page(), moms = await j(`campBriefMoments(1, 0).map(m => m.text)`), goal = await j(`scrGoalLine(1, 0)`);
    check('Enter on Missions, then on mission 1.1: the one-page briefing opens (no stepped walk, no three pages): headed Mission 1, the goal line, the four numbered moments of the walk table, the Launch chip and the Left Right Step chips', await j(`campBriefIsOpen(${HUB}) && !!${HUB}.bf && !${HUB}.bf.wk`) && a.some(x => /^(Next \u00b7 )?[Mm]ission 1 \u00b7 /.test(x)) && a.indexOf(goal) >= 0 && moms.length === 4 && moms.every(x => a.indexOf(x) >= 0) && ['1', '2', '3', '4'].every(d => a.indexOf(d) >= 0) && /^Enter$/.test(a[a.indexOf('Launch') - 1]) && a.indexOf('Step') > 0, JSON.stringify(a).slice(0, 400));
    await snap('1-one-page');
    const steps = [];
    for (let k = 0; k < 4; k++) { await key('ArrowRight'); await t.run(350); steps.push(await j(`${HUB}.bf.step`)); }
    check('Right steps through the four moments (the arrows only choose): 1, 2, 3, 4, each lit in turn, and the fifth Right goes round to none; Right again is the first, and Left steps back to none', steps.join() === '1,2,3,4' && (await key('ArrowRight'), await t.run(300), (await j(`${HUB}.bf.step || 0`)) === 0) && (await key('ArrowRight'), await t.run(300), (await j(`${HUB}.bf.step`)) === 1) && (await key('ArrowLeft'), await t.run(300), (await j(`${HUB}.bf.step || 0`)) === 0), steps.join());
    await snap('2-moment-4');
    await key('Equal'); await key('Equal'); await key('Equal'); await t.run(300);
    check('+ zooms the map in by hand, Q puts the zoom back to 100%, and the sound is not muted by any of it', await j(`${HUB}.bf.z > 1.5`) && (await key(await zr()), await t.run(300), true) && await j(`${HUB}.bf.z === 1`) && (await j('G.muted')) !== true);
    await key('Escape'); await t.run(500);
    check('Esc closes the briefing and goes back to the pick (not the pause menu, not the title): the ready room is still the room', await j(`!${HUB}.bf && ${HUB}.hub.open === 'board'`) && await j(`game.scene.isActive('CampHub') && !game.scene.isActive('Pause')`));
    await key('Enter'); await t.run(800);
    check('Enter on the mission opens it again at the start (no moment lit), not where it was left', await j(`campBriefIsOpen(${HUB})`) && (await j(`${HUB}.bf.step || 0`)) === 0);
    await key('KeyL');
    check('L on the briefing launches the mission: the Campaign scene starts on 1.1', await settle(`game.scene.isActive('Campaign') && game.scene.getScene('Campaign').camp && game.scene.getScene('Campaign').camp.mission === 0`, 60));
  } else {
    await key('Enter'); await t.run(700); await key('Enter'); await t.run(700);
    const a = await words();
    check('Enter on the board, then on mission 1.1: the briefing opens on the walk (the plan is there, the first stop is the first of six), headed MISSION 1, the three pages named, and the first line of words under the map', await j(`campBriefIsOpen(${HUB}) && !!${HUB}.bf.plan && ${HUB}.bf.wk.i === 0`) && a.some(x => /^MISSION 1\s+-\s+/.test(x)) && ['WHERE AND WHY', 'WHAT TO DO', 'HOW'].every(n => a.some(x => x.includes(n))) && a.some(x => /^The transport must reach Ceres: .* km, about \d minutes\. A patrol sees her off\.$/.test(x)), JSON.stringify(a).slice(0, 300));
    await snap('1-leave-luna');
    await t.run(3300); await snap('1b-leaving');
    await t.run(4200);
    check('the walk plays on by itself: the second stop (the patrol turns back) is on the glass after the first one\'s reading time, and it waits there at the end of the page', (await where()).i === 1 && (await words()).some(x => /^The patrol turns back/.test(x)), JSON.stringify(await where()));
    await snap('2-patrol-peels-off');
    await t.run(12000);
    check('left alone for twelve seconds it is still on the second stop: the last stop of a page waits for Enter', (await where()).i === 1);
    await key('Enter'); await t.run(300); await snap('3-distress-0-easing');
    await t.run(2600); await snap('3-distress-call');
    const b = await words();
    check('Enter is page 2 (what to do): the third stop, zoomed to the miner off the road, with the goal and the bonus in the strip under the words', (await where()).page === 1 && (await where()).i === 2 && b.some(x => /^A distress call may come/.test(x)) && b.includes('GOALS') && b.some(x => /^Transport arrived: 0 of 1\.$/.test(x)) && b.includes('BONUS'), JSON.stringify(b).slice(0, 400));
    await t.run(6500); await snap('4-pirates');
    check('the walk plays on to the fourth stop by itself (pirates are likely to ambush the road)', (await where()).i === 3 && (await words()).some(x => /^Pirates are likely to ambush the road/.test(x)), JSON.stringify(await where()));
    await key('Equal'); await key('Equal'); await key('Equal'); await t.run(300);
    check('+ zooms the map in by hand on this page (it is not the first), the zoom reads in the corner, the walk holds while it is zoomed', await j(`${HUB}.bf.wk.z > 1.5`) && (await words()).some(x => /^ZOOM 1[5-9]\d%/.test(x)));
    await snap('4b-zoomed-in');
    await t.run(12000);
    check('left zoomed in for twelve seconds the walk is still on the fourth stop', (await where()).i === 3);
    await key(await zr()); await t.run(300);
    check('Q puts the zoom back to 100%, and the sound is not muted by any of it', await j(`${HUB}.bf.wk.z === 1`) && (await j('G.muted')) !== true);
    await key('Enter'); await t.run(3200); await snap('5-leader-waits');
    const c = await words();
    check('Enter is page 3 (how): the leader waits near Ceres, the keys this mission needs and the readiness are in the strip under the map', (await where()).page === 2 && (await where()).i === 4 && c.some(x => /^A pirate leader waits near Ceres/.test(x)) && c.some(x => /^READINESS/.test(x)) && c.some(x => /^Arrows$/.test(x) || /thrust|turn/i.test(x)), JSON.stringify(c).slice(0, 500));
    await t.run(7000); await snap('6-arrive');
    check('the last stop is the arrival (the mission is won once she is in), and the key line says Enter launches', (await where()).i === 5 && (await words()).some(x => /^Get her into Ceres and the mission is won/.test(x)) && /Enter or L: launch/.test(await j(`${HUB}.bf.keys.text`)));
    await key('ArrowLeft'); await t.run(500);
    check('Left goes back a stop (the page is the same)', (await where()).i === 4 && (await where()).page === 2);
    await key('Escape'); await t.run(400);
    check('Esc closes the briefing, and the ready room is still the room (not the pause menu, not the title)', await j(`!${HUB}.bf`) && await j(`game.scene.isActive('CampHub') && !game.scene.isActive('Pause')`));
    await key('Enter'); await t.run(700); // the overlay is up still: Enter opens the briefing again, at the first stop
    check('it opens again at the first stop, not where it was left', (await where()) && (await where()).i === 0 && (await where()).page === 0);
    for (let k = 0; k < 5; k++) await key('Enter');
    check('Enter five times goes to the last stop', (await where()).i === 5);
    await key('Enter');
    check('Enter on the last stop launches the mission: the Campaign scene starts on 1.1', await settle(`game.scene.isActive('Campaign') && game.scene.getScene('Campaign').camp && game.scene.getScene('Campaign').camp.mission === 0`, 60));
  }
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nBRIEFING WALK BOOT FAIL (${bad})` : '\nBRIEFING WALK BOOT PASS');
process.exit(bad ? 1 : 0);
