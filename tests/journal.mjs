// The Journal (src/journal.js, docs/NPC-CHAT.md section 5): J in the station opens a panel with everyone you have met, what they think of you and
// what you learned; it works with no key; Forget everything needs a second press; the Pause menu has a row for it. G.chat is set by hand here (the
// memory card fills it in play). fetch is never called. Run: node tests/journal.mjs   (exit code 1 on any failure). One headless Chrome.
import { launch, sleep } from './cdp.mjs';

const ST = "game.scene.getScene('Station')", JO = "game.scene.getScene('Journal')";
const t = await launch('#station');
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) fails++; };
const active = k => t.ev(`game.scene.isActive('${k}')`);
const texts = scene => t.ev(`(() => { const out = []; const walk = o => { if (o.type === 'Text') out.push(o.text); if (o.list) o.list.forEach(walk); }; game.scene.getScene('${scene}').children.list.forEach(walk); return out.join('|'); })()`);
const openJ = async () => { await t.press('J'); await t.waitFor("game.scene.isActive('Journal')", 10000, 'journal opens'); await sleep(500); };
const closeJ = async () => { await t.press('J'); await t.waitFor("!game.scene.isActive('Journal') && game.scene.isActive('Station')", 10000, 'journal closes'); await sleep(300); };

try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station active');
  await sleep(800);
  await t.ev("(() => { delete G.chat; CHAT.key = ''; return 1; })()");

  console.log('A. no memory, no key: the empty state');
  await openJ();
  check('J opens the Journal over the station', await active('Journal') && !(await active('Station')));
  let s = await texts('Journal');
  check('it says nobody yet and where to start', s.includes('Nobody yet.') && s.includes('Talk to someone in the Drift (E).'), s.slice(0, 80));
  check('the foot says chat is off and where it lives', s.includes('Chat off: no key. Pause > Settings > Keys'));
  check('the Forget button is there', s.includes('FORGET EVERYTHING'));
  check('the title and the count are there', s.includes('JOURNAL') && s.includes('0 PEOPLE MET'));
  await t.shot('journal-empty');
  await closeJ();
  check('J closes it and the station runs again', !(await active('Journal')) && await active('Station'));

  console.log('B. people met, with hostile input in the save');
  await t.ev(`(() => { G.chat = { v: 1, player: { name: 'Mara', notes: 'Flies fast, asks about the repair bay.' },
    npcs: { juno: { met: 3, chats: 2, mood: 'warm', notes: 'Likes that you come back. Thinks you fly too close to drones.', last: 'Come back with all your hull.' },
            tamsin: { met: 1, chats: 1, mood: 'ecstatic', notes: 'word '.repeat(400) + '\\u0007\\u202e', last: 'Hmph.' },
            zed: { met: 2, mood: 'cross', notes: 'A stranger from nowhere.', last: '' } },
    journal: [ { t: 1, npc: 'juno', fact: 'The repair bay charges half a credit a point.' }, { t: 2, npc: 'juno', fact: 'Pirates never come inside the police ring.' }, { t: 3, npc: 'tamsin', fact: 'Drones turn slowly.' },
               { t: 4, npc: 'juno', fact: 'Halcyon turns once every three minutes.' } ] }; return 1; })()`);
  await openJ();
  s = await texts('Journal');
  check('the count says three people', s.includes('3 PEOPLE MET'), s.slice(0, 0));
  check('YOU, JUNO, TAMSIN and the unknown id are listed', ['YOU', 'JUNO', 'bartender', 'TAMSIN', 'ex-freighter pilot', 'ZED'].every(w => s.includes(w)));
  check('met counts and moods show', s.includes('met 3') && s.includes('met 1') && s.includes('met 2'));
  check('the named pilot is the header of the YOU page', s.includes('MARA') && s.includes('Flies fast, asks about the repair bay.'), 'first row selected');
  check('YOU shows the station record', s.includes('Rescues paid') && s.includes('Pirates destroyed'));
  await t.shot('journal-you');
  await t.press('DOWN'); await sleep(500);
  s = await texts('Journal');
  check('JUNO: notes, last time in quotes and her three facts', s.includes('Likes that you come back.') && s.includes('"Come back with all your hull."') && s.includes('The repair bay charges half a credit a point.') && s.includes('Halcyon turns once every three minutes.') && s.includes('WARM'));
  check('JUNO: met 3 times', s.includes('met 3 times'));
  check("TAMSIN's facts are not on JUNO's page", !s.includes('Drones turn slowly.'));
  await t.shot('journal-juno');
  await t.press('DOWN'); await sleep(500);
  s = await texts('Journal');
  check('a mood that is not one of the five shows as NEUTRAL', s.includes('NEUTRAL'));
  const words = (s.match(/word/g) || []).length;
  check('2000 characters of notes are clamped to 400, control characters gone', words >= 50 && words <= 80 && !/[\u0007\u202e]/.test(s), words + ' words');
  check('Drones turn slowly. is TAMSIN\'s fact', s.includes('Drones turn slowly.'));
  await t.press('DOWN'); await sleep(400);
  s = await texts('Journal');
  check('an id the game does not know is shown by its id, in capitals, without a crash', s.includes('ZED') && s.includes('A stranger from nowhere.') && s.includes('You have not really talked yet.'));
  await t.press('DOWN'); await sleep(400);
  check('Down from the last row wraps to YOU', (await texts('Journal')).includes('MARA'));
  await t.ev("(() => { CHAT.key = 'sk-test-' + 'k'.repeat(30); CHAT.on = true; CHAT.bad = false; return 1; })()");
  await t.press('UP'); await sleep(500);
  check('with a key and chat on the foot says so, with the provider', (await texts('Journal')).includes('Chat ON (OpenAI)'));
  check('the Journal never touched the save: G.chat is the same object content', await t.ev("G.chat.npcs.juno.met === 3 && Object.keys(G.chat.npcs).join() === 'juno,tamsin,zed'"));

  console.log('C. Forget everything needs a second press');
  await t.press('X'); await sleep(500);
  s = await texts('Journal');
  check('first X arms it and asks again', s.includes('PRESS AGAIN TO ERASE'));
  check('nothing is erased yet', await t.ev("Object.keys(G.chat.npcs).length === 3"));
  await t.ev(`(() => { ${JO}.armed = performance.now() - 1; return 1; })()`); await sleep(500);
  check('left alone, it disarms', (await texts('Journal')).includes('FORGET EVERYTHING') && !(await texts('Journal')).includes('PRESS AGAIN'));
  await t.press('X'); await sleep(400); await t.press('X'); await sleep(600);
  s = await texts('Journal');
  check('the second X erases what the game has learned', await t.ev("Object.keys(G.chat.npcs).length === 0 && G.chat.journal.length === 0 && G.chat.player.name === ''"));
  check('the Journal shows the empty state again and says FORGOTTEN', s.includes('Nobody yet.') && s.includes('FORGOTTEN'));
  check('the key stayed', await t.ev("CHAT.key.length > 20"));
  await t.press('ESC'); await t.waitFor("!game.scene.isActive('Journal') && game.scene.isActive('Station')", 10000, 'esc closes'); await sleep(300);
  check('Esc closes it too, and the station does not open Pause', await active('Station') && !(await active('Pause')));

  console.log('D. when J must do nothing');
  await t.ev(`(() => { ${ST}.panel = true; return 1; })()`); await t.press('J'); await sleep(500);
  check('a terminal is open: J does nothing', !(await active('Journal')));
  await t.ev(`(() => { ${ST}.panel = false; const i = document.createElement('input'); i.id = 'jt'; document.body.appendChild(i); i.focus(); return 1; })()`); await t.press('J'); await sleep(500);
  check('typing in a field: J does nothing', !(await active('Journal')));
  await t.ev("(() => { document.getElementById('jt').remove(); document.activeElement.blur(); return 1; })()");

  console.log('E. the Pause row');
  await t.ev("(() => { CHAT.key = ''; G.chat = { v: 1, player: { name: '', notes: '' }, npcs: { dex: { met: 1, mood: 'neutral', notes: 'Measured twice.', last: 'Nine point two.' } }, journal: [] }; return 1; })()");
  await t.press('ESC'); await t.waitFor("game.scene.isActive('Pause')", 10000, 'pause opens'); await sleep(500);
  check('Pause has a Journal row', (await texts('Pause')).includes('Journal   (J in the station)'));
  check('New game is still the last row, after it', (await texts('Pause')).indexOf('Journal') < (await texts('Pause')).indexOf('New game'));
  await t.ev("(() => { game.scene.getScene('Pause').sel = PAUSE_ROWS.indexOf('journal'); return 1; })()"); await sleep(300);
  await t.press('ENTER'); await t.waitFor("game.scene.isActive('Journal')", 10000, 'journal from pause'); await sleep(500);
  s = await texts('Journal');
  check('it opens from Pause with DEX listed', s.includes('DEX') && s.includes('survey tech') && s.includes('1 PERSON MET'));
  await t.press('ESC'); await sleep(1200);
  check('Esc goes back to the Pause menu, not into the game', await active('Pause') && !(await active('Journal')), 'pause=' + await active('Pause'));
  await t.press('ESC'); await t.waitFor("!game.scene.isActive('Pause') && game.scene.isActive('Station')", 10000, 'pause closes'); await sleep(300);
  check('a second Esc resumes the game', await active('Station'));
  check('no JS errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) {
  console.log('  FAIL ' + e.message); fails++;
} finally {
  await t.close();
}
console.log(fails ? `JOURNAL FAIL (${fails})` : 'JOURNAL PASS');
process.exit(fails ? 1 : 0);
