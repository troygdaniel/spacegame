// smoke: the radio, hint and briefing lines of Levels 1 to 3 name no squad, no tuck-in and no "say or type": they say what the pilot can do with the keys of today (pick the threat, send the pilots), and every key in them is read from the key table (plain Node, no Chrome)
// Card space-game-stale-lines-12-13 (Troy, 24 Nov 2026, from the cloud session's audit on main 930455b7): the radio lines "Tuck them in" (1.2), "Tuck the haulers in, or run" (1.3) and "Split the squads" (1.2) named convoy orders that have no key and squads
// that are three pilots now, and the hints beside them said "say or type" while the voice is off (CAMP_VOICE). Words only: the order rules, the keys and the beats are unchanged (tests/campl1pacing.mjs flies the beats).
//   A. the three named lines, and the hints and briefing lines beside them (1.1 to 1.3), say what to do with the keys
//   B. the sweep: no scripted radio, hint or briefing line of Levels 1 to 3 says squad, tuck or stance, or "say or type" (the convoy orders' own answers stay: the strip still gives those orders)
//   C. the keys in the lines are the key table's: one remap of the table changes them, nothing is a raw letter
//   D. the ship's lines stay curt (a radio line 12 words, a hint 14) and the waves of 1.1 to 3.3 each say a line that exists
// Run: node tests/campstalelines.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const T = k => J(`uiText(${JSON.stringify(k)})`);
const KV = n => J(`campKeyVar('${n}')`), NEAR = KV('keynear'), ORDER = KV('keyorder'), FRIEND = KV('keyfriendlies'); // the keys as the table says them (a card that moves a key moves these)
const words = s => s.split(/\s+/).filter(Boolean).length;
// every row of every words file (the source of the words: a key placeholder is still in braces there)
const SRC = {};
for (const f of readdirSync(ROOT + '/content/text')) { if (!f.endsWith('.md')) continue; for (const l of readFileSync(ROOT + '/content/text/' + f, 'utf8').split('\n')) { const m = /^\| (camp\.[^ ]+) \| (.*) \|$/.exec(l); if (m) SRC[m[1]] = m[2]; } }

// ---- A. the lines ----
console.log('A. the lines the card names, and the ones beside them');
check('1.2, the second group: "Split the squads" is gone, a pilot to each side', T('camp.say.l1p.second') === 'A second group, north-east. A pilot to each side.', T('camp.say.l1p.second'));
check('1.2, the torpedo boats on the miners: "Tuck them in" is gone, the pilots go at the boats', T('camp.say.l1p.boats') === 'Torpedo boats, heading for the miners. Send the pilots.', T('camp.say.l1p.boats'));
check('1.3, the torpedo boat on the haulers: "Tuck the haulers in, or run" is gone, the pilots go at it', T('camp.say.l1p.haulboats') === 'A torpedo boat ahead of the haulers. Send the pilots.', T('camp.say.l1p.haulboats'));
check('the hints beside them: pick the boat, then the order key (the pilots attack); the last hauler is picked as a friendly and guarded', T('camp.hint.l1p.boats') === `Torpedo boats! Pick one (${NEAR}), then ${ORDER}: the pilots attack.` && T('camp.hint.l1p.haulboats') === `A torpedo boat! Pick it (${NEAR}), then ${ORDER}: the pilots attack.` && T('camp.hint.l1p.rear') === `The last hauler is alone. Pick her (${FRIEND}), then ${ORDER}: the pilots guard.`, [T('camp.hint.l1p.boats'), T('camp.hint.l1p.haulboats'), T('camp.hint.l1p.rear')].join(' | '));
check('the first beats of 1.1 say the same (the torpedo boats, the pirate leader): pick it, then the order key', T('camp.hint.tuck') === `Torpedo boats! Pick one (${NEAR}), then ${ORDER}: the pilots attack.` && T('camp.hint.run') === `The pirate leader blocks the way. Pick it (${NEAR}), then ${ORDER}: the pilots attack.`, [T('camp.hint.tuck'), T('camp.hint.run')].join(' | '));
check('the briefing lines: 1.1 a jumped miner (send the pilots) and the boats (pick them, then the order key), 1.2 the boats on the miners, 1.3 the boat on the haulers', T('camp.bf.1.1.w4') === 'A miner is jumped on the way. Send the pilots.' && T('camp.bf.1.1.n2') === `Pirates lie in wait ahead, with torpedo boats. Cover the transport: pick them (${NEAR}), then ${ORDER}.` && T('camp.bf.1.2.w5') === 'Torpedo boats hunt the miners: send the pilots at them.' && T('camp.bf.1.3.w4') === 'A torpedo boat hunts them. Kill it before it fires.', ['camp.bf.1.1.w4', 'camp.bf.1.1.n2', 'camp.bf.1.2.w5', 'camp.bf.1.3.w4'].map(T).join(' | '));
check('the answers to the escort order name the pilots, not squads (the cruiser and the convoy)', T('camp.say.escortcarrier') === 'The pilots are with the cruiser.' && J(`uiText('camp.say.escort', { name: 'Mars' })`) === 'The pilots are with the Mars convoy.', [T('camp.say.escortcarrier'), J(`uiText('camp.say.escort', { name: 'Mars' })`)].join(' | '));

// ---- B. the sweep ----
console.log('B. the sweep of every line of Levels 1 to 3');
const SCOPE = Object.keys(SRC).filter(k => /^camp\.(say|hint)\./.test(k) || /^camp\.bf\.[123]\./.test(k));
const OWN = ['camp.say.ctuck', 'camp.say.crun', 'camp.say.chold', 'camp.say.ccarry', 'camp.say.cwho']; // the convoy orders' own answers: the strip (/) still gives those orders, and the answer says what was done
const STALE = /squad|tuck|stance|say or type|split the/i;
const hits = SCOPE.filter(k => OWN.indexOf(k) < 0 && STALE.test(SRC[k]));
check('no radio, hint or briefing line (camp.say, camp.hint, camp.bf.1 to 3) says squad, tuck, stance, "say or type" or "split the"', hits.length === 0, hits.map(k => k + ': ' + SRC[k]).join(' | '));
check('the sweep looked at a real number of lines (the scope did not go empty), and the convoy answers it leaves are there', SCOPE.length > 150 && OWN.every(k => SRC[k] !== undefined), SCOPE.length);
const resolved = SCOPE.filter(k => OWN.indexOf(k) < 0 && STALE.test(T(k)));
check('and as the game says them (keys filled in), the same', resolved.length === 0, resolved.join(','));

// ---- C. the keys are the table's ----
console.log('C. the keys in the lines are the key table\'s');
const NAMED = ['camp.hint.l1p.boats', 'camp.hint.l1p.haulboats', 'camp.hint.l1p.rear', 'camp.hint.tuck', 'camp.hint.run', 'camp.bf.1.1.n2'];
check('the changed lines name their keys in braces ({keynear} {keyfriendlies} {keyorder}), never a letter', NAMED.every(k => /\{key(near|friendlies|hostiles)\}/.test(SRC[k]) && /\{keyorder\}/.test(SRC[k])) && NAMED.every(k => !/\b(press|hit|tap)\b|\b[A-Z]\b[,:.)]/.test(SRC[k].replace(/\{[a-z]+\}/g, ''))), NAMED.map(k => SRC[k]).join(' | '));
const remap = J(`(() => { const o = {}, K = CAMP_KEYS, was = [K.order.k, K.near.k, K.friendlies.k]; K.order.k = 'V'; K.near.k = 'G'; K.friendlies.k = 'H';
  ${JSON.stringify(NAMED)}.forEach(k => { o[k] = uiText(k); }); [K.order.k, K.near.k, K.friendlies.k] = was; return o; })()`);
check('one remap of the table (the order key V, the next threat G, the friendlies H) moves every one of them', NAMED.every(k => /\bV\b/.test(remap[k]) && !/\bW\b/.test(remap[k]) && (/hauler is alone/.test(remap[k]) ? /\(H\)/.test(remap[k]) : /\(G\)/.test(remap[k]))), JSON.stringify(remap));
check('and the table is put back (the order key, the next threat and the friendlies as they were)', T('camp.hint.l1p.boats') === `Torpedo boats! Pick one (${NEAR}), then ${ORDER}: the pilots attack.` && KV('keyorder') === ORDER && KV('keynear') === NEAR && KV('keyfriendlies') === FRIEND);
check('the keys the lines name are the keys the game has: the order key, the next threat and the friendlies are all bound', J(`['order', 'near', 'friendlies'].every(id => CAMP_KEYS[id].codes.length > 0 || id === 'order')`) && J(`campKeyCodes('order').length`) > 0);

// ---- D. curt, and the waves say lines that exist ----
console.log('D. curt lines; every wave has its line');
const RADIO = ['camp.say.l1p.second', 'camp.say.l1p.boats', 'camp.say.l1p.haulboats', 'camp.say.escortcarrier', 'camp.say.escort'];
const HINTS = ['camp.hint.l1p.boats', 'camp.hint.l1p.haulboats', 'camp.hint.l1p.rear', 'camp.hint.tuck', 'camp.hint.run'];
check('the radio lines are 12 words at most, the hints 14 (the ship\'s voice is curt)', RADIO.every(k => words(T(k)) <= 12) && HINTS.every(k => words(T(k)) <= 14), [...RADIO, ...HINTS].map(k => words(T(k))).join());
check('no line of the beats names a ship class before it is met (alien, raider, drone, gunship)', [...RADIO, ...HINTS, 'camp.bf.1.2.w5', 'camp.bf.1.3.w4'].every(k => !/alien|raider|drone|gunship/i.test(T(k))));
const waveSays = J(`[1, 2, 3].flatMap(l => (CAMP.levels[l] ? CAMP.levels[l].missions : []).flatMap(m => (m.waves || []).map(w => w.say).filter(Boolean)))`);
check('every wave of Levels 1 to 3 says a line that exists, and none of them says squad or tuck', waveSays.length > 10 && waveSays.every(k => T(k) !== k && !STALE.test(T(k))), waveSays.filter(k => T(k) === k || STALE.test(T(k))).join(','));
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nSTALE LINES FAIL (${failed} of ${n})` : `\nSTALE LINES PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
