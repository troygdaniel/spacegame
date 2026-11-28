// smoke: the new Long Haul's switch and the home system's names around Earth (plain Node, no Chrome): ?longhaul=new and nothing else turns it on, off changes nothing, on names the bodies and off again puts every name back
// PROMPT 23 (the cloud session's brief 15), piece 1 of docs/longhaul-earth.html. src/lhnew.js is the switch (lhNewOn, lhNewAddr, lhNewSet) and the names (LHNEW.earth, lhEarthApply, lhEarthName).
//   A  the address: ?longhaul=new is on (any case, anywhere among the parts, the last one counts); no address, ?longhaul, ?longhaul=1, ?longhaul=old and another key are off
//   B  off: lhEarthApply names nothing and the home system's row is the same text as before; a Node game (no address) is off by itself
//   C  on: the system and every named body take their names, ids, places and docks stay, no other system is touched; a second call changes nothing more
//   D  off again: every name is back and the row is the same text as at the start
//   E  the table: every row names a body the home system has, every tone is one the Campaign's discs have, and the file loads nothing from the web
// Run: node tests/lhnew.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));

console.log('A  the address');
const on = ['?longhaul=new', '?LongHaul=NEW', '?campaign=1&longhaul=new', '?longhaul=old&longhaul=new', '#longhaul=new'];
const off = ['', '?', '?longhaul', '?longhaul=', '?longhaul=1', '?longhaul=old', '?longhaul=new&longhaul=old', '?longhauls=new', '?campaign=new'];
check('on for ?longhaul=new in every spelling', on.every(s => J(`lhNewAddr(${JSON.stringify(s)})`) === true), JSON.stringify(on.map(s => J(`lhNewAddr(${JSON.stringify(s)})`))));
check('off for everything else', off.every(s => J(`lhNewAddr(${JSON.stringify(s)})`) === false), JSON.stringify(off.map(s => J(`lhNewAddr(${JSON.stringify(s)})`))));
check('a Node game is off by itself', J('lhNewOn()') === false);

console.log('B  off');
const before = J('JSON.stringify(SYSTEMS)');
check('off: nothing is named', J('lhEarthApply()').length === 0 && J('JSON.stringify(SYSTEMS)') === before);
check('off: a body has no Earth name', J(`lhEarthName('kepler-4b')`) === '');

console.log('C  on');
J('lhNewSet(true)');
const named = J('lhEarthApply()');
const rows = J('Object.keys(LHNEW.earth.bodies)');
check('on: the system and every row are named', named.length === rows.length + 1 && named[0] === 'halcyon', JSON.stringify(named));
check('the system is Earth Orbit', J('SYSTEMS.halcyon.name') === 'Earth Orbit');
check('the landable world is The Moon and the home dock Keel Station', J(`sysDef('halcyon').bodies.find(b => b.id === 'kepler-4b').name`) === 'The Moon' && J(`sysDef('halcyon').bodies.find(b => b.id === 'halcyon-station').name`) === 'Keel Station');
check('the star is The Sun', J(`sysStar('halcyon').name`) === 'The Sun');
check('lhEarthName answers while on', J(`lhEarthName('slag-belt')`) === 'Graveyard Belt' && J(`lhEarthName('wreck-nw')`) === '');
const strip = s => { const o = JSON.parse(s); Object.keys(o).forEach(id => { delete o[id].name; (o[id].bodies || []).forEach(b => { delete b.name; }); }); return JSON.stringify(o); };
check('ids, places, docks and every number are as they were', strip(J('JSON.stringify(SYSTEMS)')) === strip(before));
const others = s => { const o = JSON.parse(s); delete o.halcyon; return JSON.stringify(o); };
check('no other system is touched', others(J('JSON.stringify(SYSTEMS)')) === others(before));
const once = J('JSON.stringify(SYSTEMS)'); J('lhEarthApply()');
check('a second call changes nothing more', J('JSON.stringify(SYSTEMS)') === once);
check('the home dock is still found by its id', J(`dockSystem('halcyon-station')`) === 'halcyon');

console.log('C2 the lines Long Haul shows');
const say = (t, key) => J(`lhEarthSay(${JSON.stringify(t)}, { scene: { key: ${JSON.stringify(key || 'Space')} } })`);
check('the mission box and a toast take the new names', say('Rescue the colonist on Kepler-4b') === 'Rescue the colonist on the Moon' && say('Dock at Halcyon Station to get paid.') === 'Dock at Keel Station to get paid.' && say('Escort the MULE to the Perseus gate') === 'Escort the MULE to the Outbound Gate');
check('capitals are kept and a name that starts a line or a sentence starts with a capital', say('KEPLER-4B') === 'THE MOON' && say('Kepler-4b is to the north.') === 'The Moon is to the north.' && say('Launch clear. Kepler-4b is to the east.') === 'Launch clear. The Moon is to the east.');
check('Halcyon alone is the station\'s short name, and a line with no old name is the same line', say('Halcyon pays 100 cr for the wreck.') === 'Keel pays 100 cr for the wreck.' && say('Launch clear.') === 'Launch clear.');
check('the nav panel\'s job line (a caller only Long Haul has) takes them too', J(`lhEarthSay('Land on Kepler-4b', true)`) === 'Land on the Moon' && /lhEarthSay\(st\.text, true\) : st\.text/.test(readFileSync(ROOT + '/src/navpanel.js', 'utf8')));
check('the Campaign\'s scenes and a line that is not text are left alone', say('Kepler-4b', 'Campaign') === 'Kepler-4b' && say('Kepler-4b', 'CampHub') === 'Kepler-4b' && J('lhEarthSay(42, { scene: { key: "Space" } })') === 42);
console.log('D  off again');
J('lhNewSet(false)'); J('lhEarthApply()');
check('every name is back', J('JSON.stringify(SYSTEMS)') === before);
check('and a shown line is the line as written', J(`lhEarthSay('Rescue the colonist on Kepler-4b', { scene: { key: 'Space' } })`) === 'Rescue the colonist on Kepler-4b');
check('the star has its old name', J(`sysStar('halcyon').name`) === 'Halcyon Sun');
J('lhNewSet(null)');
check('given back to the address: off', J('lhNewOn()') === false);

console.log('E  the table');
const ids = J(`sysDef('halcyon').bodies.map(b => b.id)`);
check('every row names a body of the home system', rows.every(id => ids.includes(id)), rows.filter(id => !ids.includes(id)).join(' '));
check('every tone is one of the Campaign\'s discs', J(`Object.values(LHNEW.earth.bodies).filter(r => r.tone).every(r => !!CAMPDISC.tones[r.tone])`) === true);
check('every name is a short plain name', J(`Object.values(LHNEW.earth.bodies).every(r => /^[A-Za-z ]{3,24}$/.test(r.name))`) === true);
const text = readFileSync(ROOT + '/src/lhnew.js', 'utf8');
check('toast and the HUD\'s text ask before they call', /if \(typeof lhEarthSay === 'function'\) msg = lhEarthSay\(msg, s\);/.test(readFileSync(ROOT + '/src/common.js', 'utf8')) && /if \(typeof lhEarthSay === 'function'\) str = lhEarthSay\(str, h\.s\);/.test(readFileSync(ROOT + '/src/hud.js', 'utf8')));
check('no content file is changed for the names: the rescue call still says Kepler-4b', /Kepler-4b/.test(readFileSync(ROOT + '/content/missions/rescue.md', 'utf8')));
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(text));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHNEW FAIL: ${failed} of ${n} checks failed` : `\nLHNEW PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
