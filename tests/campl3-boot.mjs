// not in the smoke: a player's walk through level 3 of the Campaign in the real game, run by hand (one Chrome, muted, through the test lock; card space-game-wrapup-hunt-l3)
// Part 1 (the default): the ready room at Aegir Watch, the warp, the story, the approach (three scan points, the defenders), the debrief, back to the room.
// Part 2 (--part 2): the outer ring.  Part 3 (--part 3): the inner ring, the ending and the reveal, the title after it.   Each under five minutes.
//   node tests/campl3-boot.mjs [--part 1|2|3]       pictures go to L3_SHOTS (default ~/dev/spacegame-night/shots/l3-*.png), never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.L3_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
const PART = Number((process.argv.indexOf('--part') > 0 && process.argv[process.argv.indexOf('--part') + 1]) || 1);
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const note = s => console.log('  note ' + s);
const VK = { Digit1: 49, Digit2: 50, Digit3: 51, Digit4: 52, Digit5: 53, Digit6: 54, Digit7: 55, Digit8: 56, Digit9: 57, KeyK: 75, KeyL: 76, KeyQ: 81, KeyW: 87, KeyE: 69, KeyR: 82, KeyP: 80, KeyO: 79, KeyI: 73, KeyU: 85, KeyS: 83, Backslash: 220, BracketLeft: 219, BracketRight: 221, Enter: 13, Escape: 27, Tab: 9, KeyH: 72, ArrowLeft: 37, ArrowDown: 40 };

const t = await launch('', ROOT);
try {
  const j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`)), HUB = `game.scene.getScene('CampHub')`, S = `game.scene.getScene('Campaign')`;
  const key = async (code, wait = 50) => { const k = { windowsVirtualKeyCode: VK[code], nativeVirtualKeyCode: VK[code], code, key: code.replace(/^(Key|Digit)/, '').toLowerCase() }; await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(wait); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(wait); };
  const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'l3-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } };
  const settle = async (expr, tries = 60) => { for (let i = 0; i < tries; i++) { if (await j(`!!(${expr})`)) return true; await sleep(60); await t.run(100); } return false; };
  const shown = () => j(`(() => { const s = ${HUB}; return Object.keys(s.slots).map(k => s.slots[k]).filter(o => o.visible && o.text).map(o => o.text); })()`);
  const hud = () => j(`(() => { const s = ${S}; const out = []; if (s.hud) Object.keys(s.hud).forEach(k => { const o = s.hud[k]; if (o && o.text && o.visible !== false) out.push(o.text); }); return out; })()`);

  await t.waitFor(`!!(window.game && game.scene.isActive('Title'))`, 30000, 'the title'); await t.clock(); await t.run(900);
  const progress = { level: 3, mission: PART - 1, techs: ['shield', 'plating'], ore: 60, bonus: { fighters: 0, escorts: 0 }, results: { '1.1': { score: 2100, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, '1.2': { score: 2000, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, '1.3': { score: 2200, bonuses: ['swift'], t: 100, hull: 800, lost: 0, tries: 1 }, '2.1': { score: 2000, bonuses: [], t: 100, hull: 800, lost: 0, tries: 1 }, '2.2': { score: 2000, bonuses: [], t: 100, hull: 800, lost: 0, tries: 1 }, '2.3': { score: 2000, bonuses: [], t: 100, hull: 800, lost: 0, tries: 1 } } };
  await t.ev(`localStorage.setItem('longhaul.campaign', ${JSON.stringify(JSON.stringify(progress))})`);
  await key('KeyK');
  check('K on the title opens the ready room at level 3', await settle(`game.scene.isActive('CampHub') && ${HUB}.player`));
  await t.run(900); const board = await shown(); note('board: ' + board.join(' | ').slice(0, 600)); await snap('p' + PART + '-1-board');
  await key('Enter'); await t.run(900); const brief = await shown(); note('missions overlay: ' + brief.join(' | ').slice(0, 500)); await snap('p' + PART + '-2-briefing'); await key('ArrowLeft'); await t.run(300); // the ready room is four rows and an overlay (card space-game-ready-room-simple): Enter opens the missions, Left closes the overlay
  await key('Digit3'); await key('Enter'); await t.run(700); note('rank: ' + (await shown()).join(' | ').slice(0, 300)); await key('ArrowLeft'); await t.run(300);
  await key('Digit4'); await settle(`Math.abs(${HUB}.player.x - 1028) < 4 && Math.abs(${HUB}.player.y - 394) < 4`, 80); await t.run(300);
  await key('KeyL');
  const warp = await settle(`game.scene.isActive('CampWarp')`, 30);
  note('warp cinematic for this start: ' + warp);
  if (warp) { await t.run(1200); await snap('p' + PART + '-3-warp'); await key('Enter'); }
  check('the Campaign scene starts on the mission with its story (or goes straight to the flight from a later mission of the level)', await settle(`game.scene.isActive('Campaign') && ${S}.camp`));
  note('mode ' + await j(`${S}.mode`) + ' via ' + await j(`${S}.via`) + ' mission ' + await j(`${S}.mi`));
  if (await j(`${S}.mode === 'intro'`)) { await snap('p' + PART + '-4-story'); note('story card: ' + await j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`)); await key('Enter'); await t.run(500); }
  if (await j(`${S}.mode === 'brief'`)) { await snap('p' + PART + '-5-brief'); note('brief card: ' + await j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`)); await key('Enter'); await t.run(500); }
  check('the battle is in play', await j(`${S}.mode`) === 'play', await j(`${S}.mode`));
  await t.run(800); await snap('p' + PART + '-6-flight'); note('HUD: ' + (await hud()).join(' | ').slice(0, 500));

  // the pilot's play: the wing out and attacking, the carrier on the autopilot to the goal, Space held near an alien
  await t.ev(`(() => { ${S}.k.SPACE = { isDown: true }; return 1; })()`);
  // an order is given through the list its row is in (cards one-list-keys and list-shortcuts): that list's own key (Q W E R, P O I U), Down to the row, Enter; a list with no key of its own (the stances) is opened from its parent:
  // the parent's key, Down to the part's row, Enter. The list is read from the key table (campKeyVia) and the row's place from the list of THIS mission in the page, never a letter or a number written here
  // listWay(row): { list, keys: [[the key to press, how many Downs after it], ...] }, or null when the row is not in this mission's list;   listGo(row): the list open with the highlight on the row (not given);   listOrder(row): and Enter
  const listWay = row => j(`(() => { const C = ${S}.camp, id = ${JSON.stringify(row)}, p = campKeyVia(id); if (!p) return null; const at = campPanelList(C, p.id).findIndex(r => r.id === id); if (at < 0) return null;
    if (p.code) return { list: p.id, keys: [[p.code, at]] };
    const up = campKeyList(p.parent), pat = up ? campPanelList(C, up.id).findIndex(r => r.open === p.id) : -1; return up && up.code && pat >= 0 ? { list: p.id, keys: [[up.code, pat], ['Enter', at]] } : null; })()`);
  const listGo = async row => {
    if ((await j(`${S}.mode`)) !== 'play') return false; // a card has the keys: Enter would be the card's
    const way = await listWay(row); if (!way) return false; // the row is not in this mission's list
    for (let n = 0; n < 6 && (await j(`campPanelOpen(${S}.pn)`)); n++) await key('Escape'); // Esc goes back ONE step (a target sub-list to its list, a list a row opened to Q or P; a list its own key opened closes): pressed until every list is closed (it pauses only when none is open)
    NUM = 0; for (const [code, downs] of way.keys) { await key(code); if (await j(`campPanelNumbered(${S}.pn)`)) { NUM = downs + 1; continue; } const cur = await j(`${S}.pn.at`), n = await j(`(() => { const o = campPanelOpen(${S}.pn); return o ? campPanelList(${S}.camp, o).length : 0; })()`); for (let i = 0, d = n ? ((downs - cur) % n + n) % n : 0; i < d; i++) await key('ArrowDown'); } // a list can open with its highlight on its first usable row (start: 'usable', All squads): Down only the difference
    return true;
  };
let NUM = 0; // the digit of the row the last list walk went to, when its list is a numbered one (0: a list with a highlight)
  const listOrder = async row => {
    if (!(await listGo(row))) return false; await key(NUM ? 'Digit' + NUM : 'Enter'); // a NUMBERED list (the cruiser list, on Q: card space-game-s-list-numbers) has no highlight and takes neither the arrows nor Enter: it is opened, and the row's digit gives the order (NUM); Enter would fire a missile
    if (await j(`!!${S}.pn.pick`)) await key(NUM ? 'Digit1' : 'Enter'); // a row that needs a target (Attack, Escort, Mine ore) with several to choose from opens a target sub-list (src/camppick.js): Enter takes the highlighted one, the nearest; one candidate is taken at once, none: as it always was
    for (let n = 0; n < 6 && (await j(`campPanelOpen(${S}.pn)`)); n++) await key('Escape'); // an order that is refused leaves the list open, and so does a power row: Esc until it is closed, the keys go back to the ship
    return true;
  };
  // the three pilots are out beside the cruiser when the mission begins (card space-game-keys-orders): there is no launch row and no launch key
  const CK = await j(`({ near: campKeyCodes('near')[0] || '', order: campKeyCodes('order')[0] || '' })`); // the nearest threat (the backslash) and the one order key (Enter: card space-game-keys6-enter; it was E), read from the key table
  const drive = async secs => { // fly to the goal, one leg at a time, re-pick each 5 s; log what the game says
    for (let s = 0; s < secs; s += 5) {
      await t.ev(`(() => { const C = ${S}.camp; if (C.result) return 0; const g = campNavGoal(C); if (g) { const row = campNavRows(C).find(r => r.id === 'goal') || g; if (!C.nav || !C.nav.on) campNavGo(C, row); } return 1; })()`);
      if (s % 10 === 5 && CK.near && CK.order && (await j(`${S}.mode`)) === 'play') { for (let n = 0; n < 6 && (await j(`campPanelOpen(${S}.pn)`)); n++) await key('Escape'); await key(CK.near); await key(CK.order); } // the backslash picks the nearest threat and the order key (E) sends all pilots at it (the all-squads list and its Attack row are switched off)
      await t.run(5000);
      if (await j(`${S}.camp.result || ${S}.mode !== 'play'`)) break;
    }
  };
  await drive(PART === 1 ? 150 : 150); // (the wing's fights are 15 percent slower and the shields mend by themselves now: a little more time to finish the last alien)
  await settle(`!${S}.camp.result || ${S}.mode !== 'play'`, 60); // a won battle shows its debrief 1.8 s after the end: wait for it, do not read the mode in between
  const st = await j(`({ mode: ${S}.mode, result: ${S}.camp.result, t: Math.round(${S}.camp.t / 1000), obj: campObjective(${S}.camp), hull: Math.round(${S}.camp.carrier.hp), scans: (${S}.camp.scan || []).filter(p => p.got).length, towers: ${S}.camp.ships.filter(u => u.kind === 'tower' && u.hp > 0).length, aliens: campAliens(${S}.camp).length })`);
  note('state: ' + JSON.stringify(st)); await snap('p' + PART + '-7-after');
  check('the mission was won by play (the debrief is up)', st.mode === 'debrief', JSON.stringify(st));
  if (st.mode === 'debrief') {
    note('debrief: ' + await j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`)); await snap('p' + PART + '-8-debrief');
    await key('Enter'); await t.run(1500);
    const where = await j(`['CampHub', 'Campaign', 'Title'].filter(k => game.scene.isActive(k)).join()`);
    note('after the debrief Enter: scene ' + where + (where === 'Campaign' ? ' mode ' + await j(`${S}.mode`) : ''));
    if (where === 'Campaign') { for (let i = 0; i < 4 && (await j(`${S}.mode`)) !== 'end' && (await j(`game.scene.isActive('Campaign')`)); i++) { note('mode ' + await j(`${S}.mode`) + ': ' + await j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`)); await snap('p' + PART + '-9-' + i); await key('Enter'); await t.run(1200); } }
    const sv = await j(`JSON.parse(localStorage.getItem('longhaul.campaign'))`); note('save: ' + JSON.stringify({ level: sv.level, mission: sv.mission, revealed: sv.revealed, results: Object.keys(sv.results || {}).join(), found: sv.found }));
    if (await j(`game.scene.isActive('CampHub')`)) { await t.run(800); note('hub board now: ' + (await shown()).join(' | ').slice(0, 500)); await snap('p' + PART + '-10-back'); }
    if (await j(`${S} && ${S}.mode === 'end'`)) { note('ENDING: ' + await j(`(${S}.card || []).filter(o => o.text).map(o => o.text).join(' | ')`)); await snap('p' + PART + '-11-ending'); }
  }
  check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.log('  FAIL the walk stopped: ' + (e && e.message)); bad++; }
finally { await t.close(); }
console.log(bad ? `\nLEVEL 3 WALK ${PART} FAIL (${bad})` : `\nLEVEL 3 WALK ${PART} DONE`);
process.exit(bad ? 1 : 0);
