// not in the smoke: a player who mashes keys, run by hand (one Chrome, muted, through the test lock; card space-game-night-hunt-l2-l3)
// It boots the game with a save at a level of the Campaign, opens the ready room with K, and sends random keys (a seeded run: the same seed is the same mash) through the ready room, the briefing,
// the warp, the story card, the mission card and the flight, with the clock stepped, checking after every few keys that the game still shows a scene and has logged no error.
//   node tests/campfuzz-boot.mjs [--level 2] [--mission 1] [--seed 1] [--keys 400] [--flight]
// --flight: the mission is launched first (the briefing's three screens, the warp, the cards) and the keys are mashed in the flight, Escape (the pause card, which T leaves for the title) rarely
// Exit code 1 when the game logged an error or no scene was running (a hang) at any point; the keys sent are printed on failure so the run can be played again.
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i < 0 ? d : process.argv[i + 1]; };
const LEVEL = Number(arg('level', 2)), MISSION = Number(arg('mission', 1)), SEED = Number(arg('seed', 1)), KEYS = Number(arg('keys', 400)), FLIGHT = process.argv.includes('--flight');
// every key a player has: the Campaign's (the key rounds of 23 Nov 2026: Q W pick WHO, [ ] and the backslash the enemy, O P the friendly ship, E the one order key, X clears, S the cruiser view and its list with Up Down Left Right Enter Esc in it (Fly to the goal, Fly to the target, Mine, Dock, Repair hull, Emergency shields), the arrows to fly, Enter a missile, F the camera on the picked ship), the keys of the rooms and cards (L K T F B C Z kept: they are the old Long Haul's and the rooms'), the keys that mean nothing in the game now (A D R G T I U, and J K L since the power went: card space-game-power-removed), and the keys that are no orders in flight (the digits): a masher presses those too, and they must do no harm. A mash is seeded by the order of this table: BracketLeft and BracketRight were added at its end for the enemy keys, and the backslash is a player's key now, so a seed is a new mash since the key rounds
const VK = { Enter: 13, Escape: 27, Tab: 9, Space: 32, KeyL: 76, KeyA: 65, KeyD: 68, KeyW: 87, KeyS: 83, KeyQ: 81, KeyE: 69, KeyC: 67, KeyP: 80, KeyM: 77, KeyX: 88, KeyR: 82, KeyH: 72, KeyT: 84, KeyF: 70, KeyZ: 90, KeyK: 75, KeyI: 73, KeyU: 85, KeyJ: 74, KeyB: 66,
  ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40, Equal: 187, Minus: 189, Backspace: 8, Semicolon: 186, Slash: 191, Digit0: 48, Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55, Digit8: 56, Digit9: 57, Backslash: 220, KeyO: 79, BracketLeft: 219, BracketRight: 221 };
const NAMES = Object.keys(VK).filter(k => !(FLIGHT && (k === 'KeyT'))); // (the tune kit's keys, ' 6 7 and the backquote, are off in a game started with no address: they are no player's keys and are not here; the backslash was the win key once and is the nearest threat now)
const weight = k => (k === 'Enter' ? 5 : k === 'Escape' ? (FLIGHT ? 0 : 2) : k === 'Space' ? 2 : 1);
const bag = NAMES.flatMap(k => Array(weight(k)).fill(k));
let seed = SEED * 2654435761 >>> 0; const rnd = () => { seed = (seed + 0x6D2B79F5) >>> 0; let t = seed; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
let bad = 0; const sent = [];
const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  const key = async (code, wait = 40) => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code === 'Space' ? ' ' : code === 'Semicolon' ? ';' : code === 'Slash' ? '/' : code === 'Backslash' ? '\\' : code === 'BracketLeft' ? '[' : code === 'BracketRight' ? ']' : /^(Enter|Backspace|Arrow|Escape|Tab)/.test(code) ? code : code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait); };
  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  const res = { score: 2000, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, results = {};
  for (let l = 1; l <= LEVEL; l++) for (let m = 1; m <= 3; m++) if (l < LEVEL || m < MISSION) results[l + '.' + m] = res;
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify({ level: LEVEL, mission: MISSION - 1, techs: LEVEL === 1 ? [] : LEVEL === 2 ? ['shield'] : ['shield', 'plating'], ore: 60, bonus: { fighters: 0, escorts: 0 }, results }))})`);
  await key('KeyK'); await t.run(900);
  const where = () => j(`game.scene.getScenes(true).map(s => s.scene.key).join()`);
  const seen = new Set();
  // the Mods screen's R reloads the page once a pack was changed (src/mods.js restart): a mash that gets there and presses R is a player who restarts the game. The stepped clock is gone with the page, so it is set up again from the title and the mash goes on (the save is in localStorage).
  let reloads = 0;
  const alive = async fn => { try { return await fn(); } catch (e) { if (!/tick is not defined/.test(String(e && e.message))) throw e; reloads++; await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title after a reload'); await t.clock(); await t.run(900); } };
  if (FLIGHT) {
    for (let i = 0; i < 14 && !(await j(`!!(game.scene.isActive('Campaign') && game.scene.getScene('Campaign').mode === 'play')`)); i++) { await key('Enter', 50); await t.run(600); }
    if (!(await j(`!!(game.scene.isActive('Campaign') && game.scene.getScene('Campaign').mode === 'play')`))) { console.log('  FAIL the flight did not begin'); bad++; }
    else console.log('  the mission is in play: mashing keys in the flight');
  }
  for (let i = 0; i < KEYS; i++) {
    let code = bag[Math.floor(rnd() * bag.length)]; if (FLIGHT && rnd() < 0.02) code = 'Escape'; sent.push(code);
    const hold = (code === 'ArrowUp' || code === 'ArrowLeft' || code === 'ArrowRight' || code === 'Space') && rnd() < 0.5; // the keys that are held in play: the arrows and the turrets
    await alive(() => key(code, hold ? 400 : 40));
    if (i % 5 === 4) {
      await alive(() => t.run(300));
      const w = await where(); seen.add(w);
      if (!w) { console.log('  FAIL no scene is running after key ' + (i + 1) + ' (' + code + ')'); bad++; break; }
      if (t.errors.length) { console.log('  FAIL the game logged an error after key ' + (i + 1) + ' (' + code + '): ' + t.errors.join(' | ').slice(0, 600)); bad++; break; }
    }
  }
  console.log('  scenes seen: ' + [...seen].join('  |  '));
  if (reloads) console.log('  (the page was reloaded ' + reloads + ' time' + (reloads === 1 ? '' : 's') + ' by the Mods screen R; the mash went on from the title)');
  if (!bad) console.log('  ok   ' + sent.length + ' keys, seed ' + SEED + ': a scene was always running and the game logged no error');
  else console.log('  keys: ' + sent.join(' '));
} catch (e) { console.log('  FAIL the run stopped: ' + (e && e.message) + '\n  keys: ' + sent.join(' ')); bad++; }
finally { await t.close(); }
console.log(bad ? `\nKEY MASH FAIL (level ${LEVEL}, mission ${MISSION}, seed ${SEED})` : `\nKEY MASH PASS (level ${LEVEL}, mission ${MISSION}, seed ${SEED})`);
process.exit(bad ? 1 : 0);
