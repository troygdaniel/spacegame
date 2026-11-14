// Boot test for the content loader (card space-game-m2-loader, docs/MODDING.md 5): whatever content.generated.js holds, the
// game reaches the Title screen, lists what was wrong in CONTENT_ERRORS and plays on the built-in values. Never a blank screen.
// Each case runs the real game in headless Chrome from a throwaway COPY of this folder with its own content.generated.js:
//   the real pack          nothing wrong, nothing listed
//   a bad pack             tests/fixtures/content-bad built by tools/build-content.mjs: 12 build problems, and the game still plays
//   no content.generated.js  one error that says how to make it
//   a broken script        content.generated.js that is not valid JavaScript
//   a hand-edited file     valid JavaScript, but numbers out of range, text where a number belongs, a wrong shape
// Run: node tests/contentboot.mjs        (one Chrome at a time; about 40 seconds)
import { rmSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { build } from '../tools/build-content.mjs';
import { launch, sleep } from './cdp.mjs';
import { copyGame, ROOT } from './gamecopy.mjs';
let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok  ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + detail + ')' : ''}`); } };

const state = t => t.ev(`JSON.stringify({ errors: CONTENT_ERRORS.map(e => e.level + '|' + e.path + '|' + e.message), state: CONTENT_STATE })`).then(JSON.parse);

// open the copy, wait for a scene, hand back what the loader reported; extra(t, st) runs more checks while the page is up
async function run(name, dir, hash, scene, extra, allowedErrors = []) {
  console.log(name);
  const t = await launch(hash, dir);
  try {
    await t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, 25000, scene + ' scene active');
    await sleep(800); // a few frames: a scene that boots and then crashes shows up here
    const st = await state(t);
    check(`the game reaches ${scene}`, true);
    await extra(t, st);
    const bad = t.errors.filter(e => !allowedErrors.some(a => e.includes(a)));
    check('no console errors or uncaught exceptions' + (allowedErrors.length ? ' (apart from the expected one)' : ''), bad.length === 0, bad.join(' | '));
  } catch (e) { check(`${name}: ${e.message}`, false); } finally { await t.close(); }
}

const tmp = [];
try {
  // 1. the real pack: nothing wrong, nothing listed, the proof set (card m4: two ships, a call, a character, nine part tiers) applied
  await run('the real content pack', ROOT, '', 'Title', async (t, st) => {
    check('the loader read content.generated.js', st.state.loaded === true && typeof st.state.hash === 'string' && st.state.hash.length > 0, JSON.stringify(st.state));
    check('it lists no problems and applies the twenty-eight files of the shipped set', st.errors.length === 0 && st.state.applied.length === 28 && st.state.skipped === 0, JSON.stringify(st.errors) + ' ' + st.state.applied.join());
    check('the shipped pack is not MODDED', st.state.modded === false, JSON.stringify(st.state));
  });

  // 2. a bad pack: the game boots, lists the problems, plays on the defaults
  const bad = copyGame(); tmp.push(bad);
  const made = build({ dir: join(ROOT, 'tests/fixtures/content-bad'), prefix: 'content/', out: join(bad, 'content.generated.js'), write: true });
  check('the bad pack builds with problems (12 found by the build)', made.result.errors.length === 12, String(made.result.errors.length));
  await run('a bad content pack', bad, '', 'Title', async (t, st) => {
    check('the loader read the file and lists every problem: the 12 from the build, the kite (no pirate or ship row to change) and a text file it does not read yet', st.state.loaded === true && st.errors.length === 14, String(st.errors.length));
    check('a message names the file, the line and what the game did', st.errors.some(e => e.includes('content/ships/kite.md, line 5: hull is "lots" but must be a whole number from 10 to 1000. Ignored.') || e.includes('hull is "lots"')), JSON.stringify(st.errors.slice(0, 3)));
    check('only what was valid in the bad pack is applied (the rescue call and TAMSIN), the rest is skipped', st.state.applied.join() === 'mission:rescue,npc:tamsin' && st.state.skipped === 2, JSON.stringify(st.state));
    check('the ships and upgrades the bad pack could not change are untouched', await t.ev(`PIRATES.drone.hp === 30 && PIRATES.raider.hp === 20 && PARTS.shields.prices[0] === 300`));
  });
  await run('a bad content pack, then play (#space)', bad, '#space', 'Space', async (t) => {
    check('the player has a ship, full hull and the rescue accepted: the default game', await t.ev(`(() => { const s = game.scene.getScene('Space'); return !!(s.ship && s.ship.body) && G.hull === G.maxHull && G.mission === 'accepted'; })()`));
    await t.clock(); await t.run(3000);
    check('three seconds of flight run without trouble', await t.ev(`game.scene.isActive('Space') && !game.scene.getScene('Space').dead`));
  });

  // 3. no content.generated.js at all
  const missing = copyGame(); tmp.push(missing);
  check('the copy really has no content.generated.js', !existsSync(join(missing, 'content.generated.js')));
  await run('content.generated.js is missing', missing, '', 'Title', (t, st) => {
    check('exactly one error, saying how to make the file', st.errors.length === 1 && st.errors[0] === 'error|content.generated.js|content.generated.js is missing: run node tools/build-content.mjs. Playing on the built-in values.', JSON.stringify(st.errors));
    check('the loader says it loaded nothing', st.state.loaded === false && st.state.applied.length === 0, JSON.stringify(st.state));
  });

  // 4. content.generated.js that is not JavaScript
  const broken = copyGame(); tmp.push(broken);
  writeFileSync(join(broken, 'content.generated.js'), 'var CONTENT = {{{ this is not javascript\n');
  await run('content.generated.js is not valid JavaScript', broken, '', 'Title', (t, st) => {
    check('the game reaches Title and reports the file as missing', st.errors.length === 1 && st.errors[0].includes('content.generated.js is missing'), JSON.stringify(st.errors));
  }, ['SyntaxError']);

  // 5. a hand-edited file: valid JavaScript, wrong content
  const edited = copyGame(); tmp.push(edited);
  const entries = [
    { type: 'ship', id: 'raider', path: 'content/ships/raider.md', data: { name: 'Raider', hp: 999999, speed: 'fast', color: 'purple', __proto__x: 1 } },
    { type: 'mission', id: 'rescue', path: 'content/missions/rescue.md', data: { kind: 'rescue', title: 'Rescue', reward: -5, offer: 'Pays {rewrd}.' } },
    { type: 'weapon', id: 'laser', path: 'content/weapons/laser.md', data: { name: 'Laser' } },
    'not an entry', null, 7, { type: 'ship', id: '../../etc', path: 'x', data: { name: 'X' } }
  ];
  writeFileSync(join(edited, 'content.generated.js'), 'var CONTENT = ' + JSON.stringify({ version: 1, hash: 'beefbeef', files: 3, entries, errors: [{ level: 'warn', path: 'content/x.md', line: 2, message: 'from the build' }, 42, null] }) + ';\n');
  await run('a hand-edited content.generated.js', edited, '', 'Title', async (t, st) => {
    check('every bad entry and field is reported, the game boots', st.state.loaded === true && st.errors.length >= 8, String(st.errors.length) + ' ' + JSON.stringify(st.errors));
    check('a problem the build recorded is passed on', st.errors.some(e => e === 'warn|content/x.md|from the build'), JSON.stringify(st.errors.slice(0, 2)));
    check('out-of-range and wrong-type fields are named', st.errors.some(e => e.includes('hp is 999999 but must be a whole number')) && st.errors.some(e => e.includes('speed is not a number')), JSON.stringify(st.errors));
    check('only the valid field (a name) of the raider was applied: its numbers are the built-in ones', st.state.applied.join() === 'ship:raider' && await t.ev(`PIRATES.raider.hp === 20 && PIRATES.raider.speed === 520`), JSON.stringify(st.state));
  });
} finally {
  tmp.forEach(d => rmSync(d, { recursive: true, force: true }));
}

console.log(failed ? `\nCONTENT BOOT FAIL: ${failed} of ${n} checks failed` : `\nCONTENT BOOT PASS: ${n} checks`);
process.exitCode = failed ? 1 : 0;
