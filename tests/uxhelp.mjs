// smoke: the Campaign's ship computer answers plain questions with no chat key: goal, keys, map, status (plain Node, no Chrome)
// Card space-game-night-ux, finding 2 (docs/night/ux.md; src/camphelp.js, src/shipcomputer.js shipcompIntent). Before: in the Campaign "help", "what do I do", "what keys", "how do I fire",
// "show the map" and "how is the carrier" all answered "The ship's computer needs a chat key". Now four kinds of plain question are answered from the battle, locally, for nothing.
// Checks: each kind by many phrasings (case, punctuation, "please"); sentences that only look like them are left to the model; the fleet orders still win; the numbers in a status are the
// battle's; the end-to-end answer with no key; Long Haul's own computer is not changed; the words are in content/text/ui.md.
// The keys an answer names are the key table's (card one-list-keys, src/data_controls.js): "Q opens the fleet list, P opens the ship list", "Press Q and pick Launch the wing"; no order has a digit.
// Run: node tests/uxhelp.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`var C = campNew(1, [], { seed: 3 }); var S = { scene: { key: 'Campaign' }, camp: C };`);
const help = t => J(`campHelp(${JSON.stringify(t)}, C)`);
const local = t => J(`(() => { const r = shipcompLocal(${JSON.stringify(t)}, S); return r ? { text: r.text, action: r.action, refused: r.refused } : null; })()`);

const kinds = {
  goal: ['what is my goal', 'What is my goal?', 'what do I do', 'What do I do?', 'what now', 'what next', 'what should I do', 'please, what do I do now', 'objective', 'goal', 'mission', 'where do I start', 'how do I win', 'how do I win this level', 'what are we doing', 'what am I supposed to do', 'Hey computer, what do I do next?'],
  keys: ['help', 'Help!', 'help me', 'keys', 'controls', 'what keys', 'what are the keys', 'what are the controls', 'what keys do I press', 'how do I play', 'how do I fly', 'how do I fire', 'how do I shoot', 'how do I give orders', 'how does this work', 'what can I say', 'what are the orders', 'commands', 'please help'],
  map: ['show the map', 'show me the map', 'open the map', 'map', 'the map', 'how do I open the map', 'where is Earth', 'where are the aliens', 'where is the mothership', 'where is the convoy', 'where am I'],
  status: ['status', 'report', 'status report', 'how am I doing', 'how is the carrier', 'how is my hull', 'how is Earth', 'how are my fighters', 'how many fighters', 'how bad is it', 'hull', 'shield', 'how are we doing']
};
const goalNow = J('campObjective(C)').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // the goal line is whatever the level asks now (its wording is another change's)
const said = { goal: new RegExp('^Your goal: ' + goalNow), keys: /^The arrow keys fly, Space fires\. Q opens the fleet list, P opens the ship list\.$/, map: /^Tab opens the level map\./, status: /^Hull 600 of 600\. Earth 100 percent\. 0 out, 8 in bay\.$/ };
for (const [k, phrases] of Object.entries(kinds)) {
  const bad = phrases.filter(p => !said[k].test(help(p) || ''));
  check(`${k}: ${phrases.length} ways of asking are answered (${phrases.slice(0, 3).join(' / ')} ...)`, bad.length === 0, 'not answered: ' + bad.map(p => p + ' => ' + help(p)).join(' | '));
}
const left = ['what should I do about the gunships', 'how do I attack the mothership', 'what is the capital of France', 'tell me a joke', 'hello', 'thanks', 'why did the convoy die', 'where is Mars', 'what does the shield grid do', 'help me kill the mothership', 'how many aliens are left', 'what is a drone', 'what do I do about the convoy to Eros', 'status of the mothership'];
check('sentences that only look like them are not taken: the model reads them', left.every(p => help(p) === null), left.filter(p => help(p) !== null).join(' | '));
check('nothing, spaces, a non-string and no battle say nothing and do not throw', [help(''), help('   '), J('campHelp(undefined, C)'), J('campHelp(5, C)'), J('campHelp("help", null)'), J('campHelp("help", {})')].every(x => x === null));

// the fleet orders still win, and a question the orders know is the order's
const o = local('launch');
check('the five orders are answered as before (launch: "Launching the wing.", an action of the closed list)', o && o.action === 'fleet_launch' && o.text === 'Launching the wing.', JSON.stringify(o));
check('through the ship computer\'s local reader (shipcompLocal) a question is a plain answer: no action, not refused, the same line', ['what do I do', 'help', 'show the map', 'status'].every(p => { const r = local(p); return r && r.action === '' && r.refused === false && r.text === help(p); }), JSON.stringify(local('help')));

// the numbers are the battle's
g.run(`C.carrier.hp = 412; C.earth.shield = C.earth.max * 0.5; campOrder(C, 'launch', ''); for (let i = 0; i < 30 * 3; i++) campStep(C, 1 / 30);`);
const st = help('status');
check('a status says the carrier\'s hull now, Earth\'s shield in percent, the ships out and what is left in the bay', /^Hull 4\d\d of 600\. Earth \d+ percent\. \d out, \d in bay\.$/.test(st) && J('campWing(C).length') > 0 && st.includes(J('campWing(C).length') + ' out'), st);
g.run(`var C2 = campNew(2, [], { seed: 3 }); var S2 = { scene: { key: 'Campaign' }, camp: C2 };`);
check('on a level with no Earth (2 and 3) the status leaves Earth out, and the goal is that level\'s', /^Hull 600 of 600\. 0 out, 8 in bay\.$/.test(J('campHelp("status", C2)')) && /^Your goal: Gather resources: 0 of 2\. Press Q and pick Launch the wing\.$/.test(J('campHelp("what do I do", C2)')), J('campHelp("status", C2)') + ' | ' + J('campHelp("what do I do", C2)'));
g.run(`var C0 = campNew(1, [], { seed: 3 });`);
check('with the wing still in the bay the goal adds the list to open and the row to pick ("Press Q and pick Launch the wing."); once it is out it does not', / Press Q and pick Launch the wing\.$/.test(J('campHelp("what do I do", C0)')) && (g.run(`campOrder(C0, 'launch', '')`), !/Press|pick|Launch the wing/.test(J('campHelp("what do I do", C0)')) && /^Your goal: /.test(J('campHelp("what do I do", C0)'))), J('campHelp("what do I do", C0)'));
g.run(`var C9 = campNew(1, [], { seed: 3 }); var P9 = campPanelNew(); var K9 = [campPanelKey(P9, C9, 'Digit1', 0)]; K9.push(campPanelKey(P9, C9, CAMP_PANELS.panels.find(p => p.id === 'fleet').code, 0)); for (let i = campPanelList(C9, 'fleet').findIndex(r => r.label === campKeyVar('rowlaunch')); i > 0; i--) campPanelKey(P9, C9, 'ArrowDown', 0); K9.push(campPanelKey(P9, C9, 'Enter', 0));`);
check('what the goal line says to press is what launches: Q opens the fleet list, the row named "Launch the wing" is in it, Enter on it launches and closes the list; the digit 1 it used to name does nothing', J('K9[0].used') === false && J('K9[1].open') === 'fleet' && J('K9[2].ran && K9[2].ok') === true && J('K9[2].row') === 'launch' && J('K9[2].open') === '' && J('C9.orders.launch') === 1 && J(`campKeyVar('fleetkey')`) === 'Q' && J(`campKeyVar('rowlaunch')`) === 'Launch the wing', JSON.stringify(J('K9')));
check('the keys line is the real keys: the key line of the HUD names the same keys', J(`campHelp('keys', C0)`).includes(J(`campKeyVar('panels')`)) && J(`campKeyVar('panels')`) === 'Q opens the fleet list, P opens the ship list' && J(`campKeyLine()`).startsWith('Q Fleet orders   P Ship orders   ') && J(`campKeyLine()`).includes('Arrows fly   Space turrets') && J(`campKeyLine()`).startsWith(J(`campPanelKeyLine()`)) && !/[{}]/.test(J(`campKeyLine()`) + J(`campHelp('keys', C0)`)), J(`campKeyLine()`));
check('every reply is short enough for the strip (three lines) and the voice: at most 140 letters, at most 3 sentences', ['what do I do', 'help', 'show the map', 'status'].every(p => { const t = help(p); return t.length <= 140 && t.split(/[.!?]\s/).length <= 3; }), ['what do I do', 'help', 'show the map', 'status'].map(p => help(p).length).join());

// end to end: no chat key, the strip's own door
g.run(`window.__r = null; shipcompAsk('what do I do', S).then(r => { window.__r = r; });`);
(async () => {
  await g.waitFor('window.__r !== null', 3000);
  const r = J('__r');
  check('with no chat key, asking the computer "what do I do" in the Campaign answers (no error, no "needs a chat key")', J('shipcompAvailable()') === false && r && !r.error && /^Your goal: /.test(r.text), JSON.stringify(r));
  g.run(`window.__r = null; shipcompAsk('tell me a joke', S).then(r => { window.__r = r; });`);
  await g.waitFor('window.__r !== null', 3000);
  check('and a question that is not one of them still says it needs a chat key (as before)', J('__r.code') === 'nokey', JSON.stringify(J('__r')));
  // Long Haul's own computer is not changed
  g.run(`var SL = { scene: { key: 'Space' } }`);
  check('in Long Haul the same words are not answered by this (the Campaign only): "help" and "what do I do" are not local', J(`shipcompLocal('help', SL)`) === null && J(`shipcompLocal('what do I do', SL)`) === null);
  check('the words are in content/text/ui.md and the code table (not the key shown back)', ['goal', 'goalbay', 'keys', 'map', 'status', 'status2'].every(k => J(`uiText('camp.help.${k}', { goal: 'G', hull: 1, max: 2, earth: 3, out: 4, bay: 5 })`) !== 'camp.help.' + k));
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
  console.log(failed ? `UX HELP FAIL (${failed} of ${n})` : `UX HELP PASS (${n} checks)`);
  process.exitCode = failed ? 1 : 0;
})();
