// smoke: the new Long Haul's marks follow the Campaign's colour rules (plain Node, no Chrome): off every colour is the one given; on, a hostile mark is the Campaign's pink and a reach ring its blue, read from the Campaign's table; every caller asks first and keeps its own colour as the other branch
// PROMPT 23 (the cloud session's brief 15), piece 9 of docs/longhaul-earth.html. src/lhtone.js: lhTone; the callers are in src/hud.js (the ticks, the lock, the radar's dots, rim and count, two banners) and src/feel.js (the approach ring).
//   A  off: red stays red, amber amber, green green, whatever the role
//   B  on: the foe role is SLOOK.C.foe for red, amber (a wanted pirate), orange (a gunship's radar dot) and the Reaver's red alike; the ring role is SLOOK.C.friendHi for green, amber and cyan alike; an unknown role changes nothing
//   C  the rule: neither answer is amber, gold, red or green, and the two are different colours
//   D  the callers: eight in hud.js and one in feel.js, each asking for the function first with its own colour as the other branch; none in a Campaign file
//   E  the file asks the web for nothing
// Run: node tests/lhtone.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { try { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); } catch (e) { return JSON.stringify({ THROWS: e.message }); } })()`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const hex = c => '#' + c.toString(16).padStart(6, '0');

console.log('A  off');
check('every colour is the one given', J(`[lhTone(RED, 'foe'), lhTone(AMBER, 'foe'), lhTone(GREEN, 'ring'), lhTone(AMBER, 'ring'), lhTone(CYAN, 'ring')]`).join() === J('[RED, AMBER, GREEN, AMBER, CYAN]').join());

console.log('B  on');
J('lhNewSet(true)');
const foe = J(`[RED, AMBER, 0xff8c3a, 0xff2a4a, 0xff6b8a].map(c => lhTone(c, 'foe'))`), ring = J(`[GREEN, AMBER, CYAN].map(c => lhTone(c, 'ring'))`);
check('a hostile mark is the Campaign\'s pink whatever it was', foe.every(c => hex(c) === J('SLOOK.C.foe')), foe.map(hex).join());
check('a reach ring is the Campaign\'s blue whatever your speed', ring.every(c => hex(c) === J('SLOOK.C.friendHi')), ring.map(hex).join());
check('an unknown role changes nothing', J(`lhTone(AMBER, 'cargo')`) === J('AMBER'));

console.log('C  the rule');
const banned = J(`[AMBER, RED, GREEN, 0xffd37a, 0xffc857].map(c => '#' + c.toString(16).padStart(6, '0'))`);
check('neither is amber, gold, red or green, and they differ', !banned.includes(hex(foe[0])) && !banned.includes(hex(ring[0])) && foe[0] !== ring[0]);
J('lhNewSet(null)');

console.log('D  the callers');
const hud = src('src/hud.js'), feel = src('src/feel.js');
const calls = (hud.match(/typeof lhTone === 'function'/g) || []).length;
check('eight callers in hud.js, each asking first', calls === 8, String(calls));
check('each keeps its own colour as the other branch', (hud.match(/\(typeof lhTone === 'function' \? lhTone\(([^()]|\([^()]*\))+, 'foe'\) : ([^()]|\([^()]*\))+\)/g) || []).length === 6 && /if \(typeof lhTone === 'function'\) h\.lockColor = lhTone\(h\.lockColor, 'foe'\);/.test(hud) && /: hot \? '#ff4d6d' : n \? '#ffb454' : '#58b57d'/.test(hud));
check('the approach ring asks first and keeps green, amber and cyan as the other branch', /typeof lhTone === 'function' \? lhTone\(inside \? \(slow \? GREEN : AMBER\) : CYAN, 'ring'\) : inside \? \(slow \? GREEN : AMBER\) : CYAN/.test(feel));
check('no Campaign file calls it', !['src/campaign.js', 'src/campaignscene.js', 'src/shiplook.js', 'src/camppagehud.js'].some(f => /lhTone/.test(src(f))));

console.log('E  the rest');
check('the file asks the web for nothing', !/https?:\/\/|fetch\(|XMLHttpRequest|new Image/.test(src('src/lhtone.js')));
check('the game was quiet', g.errors.length === 0, g.errors.join(' | '));

console.log(failed ? `\nLHTONE FAIL: ${failed} of ${n} checks failed` : `\nLHTONE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
