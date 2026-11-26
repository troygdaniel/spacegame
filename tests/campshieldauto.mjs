// smoke: card space-game-shield-auto (the shield mends by itself; no recharge row in any list), plain Node, no Chrome
//   The cruiser's shield mends by itself, at a rate the SYSTEMS shield pips set (none at 0, slow at 2, fast at 4), after a short delay since the last hit. The pay-ore recharge order left the ship's orders
//   with its voice and strip order; the help and the briefing lines follow, and the bots do not use it. J K L are the power's own keys (with CAMP_POWER on); no digit is a key in flight.
//   A  the rate follows the pips, the delay follows the hit, the cap is held; on every level; the same twice (the sim stays deterministic)
//   B  no list has a recharge row; no row has a key or a number of its own
//   C  the old words: "recharge shields" is understood and answers that the shield mends by itself (nothing is paid, nothing filled); the model is not offered the action
//   D  the words are in content/text/campshield.md and no other text of the Campaign still says recharge
// Run: node tests/campshieldauto.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about them (the list, J K L, the bars, the pip orders), so it switches them on. The game as it is now: tests/powerremoved.mjs
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const ROOT = new URL('..', import.meta.url).pathname;
const near = (a, b, e = 0.05) => Math.abs(a - b) <= e;

// a ship with its pips set and a shield of n points, hit "hitAgo" seconds before now; then the power step alone for s seconds (no world: nothing else can hit it)
g.run(`window.mk = (lv, pips) => { const C = campNew(lv, [], { seed: 1, mission: 0, power: pips }); C.arrivedAt = 0; return C; };
  window.go = (C, s) => { for (let i = 0; i < Math.round(s * 30); i++) { C.t += 1000 / 30; campPowerStep(C, 1 / 30); } };
  window.hurt = (C, pts, hitAgo) => { C.shield = pts; C.shieldHitAt = C.t - hitAgo * 1000; };`);
// press through the lists as the player does: the key of the list the row is in (campKeyVia; a part with no key of its own is reached through its parent: the parent's key, Down to the part's row, Enter), Down to the row, Enter.
// The indexes are read from this mission's lists (campPanelList), not written here. null when the row is not in this mission's list
g.run(`window.__open = (P, C, listId, now) => { const def = campKeyList(listId); if (!def) return false; campPanelClose(P); if (def.key) { campPanelKey(P, C, def.code, now); return campPanelOpen(P) === listId; } campPanelGo(P, C, listId); return campPanelOpen(P) === listId; /* no key opens this list now: opened by data */ };
  window.__pick = (P, C, rowId, now) => { const def = campKeyVia(rowId); if (!def) return null; const i = campPanelList(C, def.id).findIndex(r => r.id === rowId); if (i < 0 || !__open(P, C, def.id, now)) return null; for (let k = 0; k < i; k++) campPanelKey(P, C, 'ArrowDown', now); return campPanelKey(P, C, 'Enter', now); };`);

console.log('A. the shield mends by itself, by the pips');
const R = J('CAMP.power.shields.regen');
check('the table: none at 0 pips, then more with every pip (slow at 2, fast at 4); the delay since a hit is 3 s', R[0] === 0 && R.every((v, i) => i === 0 || v > R[i - 1]) && R[2] >= 2 && R[2] <= 4 && R[4] >= 3 * R[2] && J('CAMP.power.shields.regenDelay') === 3000, JSON.stringify(R));
const rate = pips => J(`(() => { const C = mk(1, ${JSON.stringify(pips)}); hurt(C, 0, 99); go(C, 10); return C.shield / 10; })()`);
const want = [[3, 0, 3], [3, 1, 2], [2, 2, 2], [1, 3, 2], [1, 4, 1]].map(p => rate(p));
check('over 10 s with no hit the shield gains 0, then each pip more: 0 / 1 / 2 / 3 / 4 pips make 0, 1.5, 3, 6 and 10 points a second', JSON.stringify(want.map(v => +v.toFixed(2))) === JSON.stringify(R.map(v => v)), JSON.stringify(want));
check('4 pips mend more than 3 times what 2 do (fast against slow), and 0 pips do not mend at all', want[4] >= 3 * want[2] && want[0] === 0);
const delay = J(`(() => { const C = mk(1, [2, 2, 2]); hurt(C, 50, 0); go(C, 2.9); const held = C.shield; go(C, 1.1); const a = C.shield; go(C, 10); return { held, a, b: C.shield }; })()`);
check('after a hit nothing mends for 3 s (2.9 s on: still 50), then it does: 3 a second', delay.held === 50 && delay.a > 50 && near(delay.b - delay.a, 30, 0.6), JSON.stringify(delay));
const again = J(`(() => { const C = mk(1, [2, 2, 2]); hurt(C, 50, 0); go(C, 5); const mid = C.shield; campHurt(C, C.carrier, 10, 'x'); const afterHit = C.shield; go(C, 2.9); const held = C.shield; go(C, 1.1); return { mid, afterHit, held, then: C.shield }; })()`);
check('a new hit starts the 3 s over: it was mending (5 s on), a hit took 10, and nothing mends for 3 s after that', again.mid > 50 && near(again.afterHit, again.mid - 10, 0.01) && again.held === again.afterHit && again.then > again.held, JSON.stringify(again));
check('it stops at the cap of the pips (2 pips 150, 4 pips 225), and a full shield stays full', J(`(() => { const C = mk(1, [2, 2, 2]); hurt(C, 140, 99); go(C, 30); const a = C.shield; const D = mk(1, [1, 4, 1]); hurt(D, 200, 99); go(D, 30); return [a, D.shield]; })()`).join() === '150,225');
check('the emergency shields (card space-game-keys2-cruiser: filled at once for ore) fill the shield, and what mends after it is the slow setting', J(`(() => { const C = mk(1, [2, 2, 2]); hurt(C, 0, 99); C.ore = 100; campOrder(C, 'emergency', '', 'key'); go(C, 5); const em = C.shield; C.power.until = 0; C.power.p = C.power.base.slice(); const st = C.shield; go(C, 5); return { em, slow: C.shield - st }; })()`).em > 40);
check('every level mends it, the pirates of level 3 and the aliens of levels 1 and 2 alike (it is the carrier\'s, not a level\'s)', [1, 2, 3].every(lv => J(`(() => { const C = mk(${lv}, [2, 2, 2]); hurt(C, 20, 99); go(C, 10); return C.shield; })()`) > 45));
// the sim is the same twice: a seeded fight, the shield in the pin
const fight = () => J(`(() => { const C = campNew(1, [], { seed: 7 }); for (let i = 0; i < 30 * 90 && !C.result; i++) { const s = i / 30; C.input.thrust = s % 20 < 12 ? 1 : 0; C.input.fire = s > 8; if (i === 10) for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, u = campSpawn(C, ['raider', 'drone', 'gunship'][k % 3], C.carrier.x + Math.cos(a) * 700, C.carrier.y + Math.sin(a) * 700); if (u) u.goal = 'carrier'; } campStep(C, 1 / 30); C.events.length = 0; } return { shield: +C.shield.toFixed(4), hp: +C.carrier.hp.toFixed(4), t: Math.round(C.t), kills: C.kills }; })()`);
const f1 = fight(), f2 = fight();
check('the sim stays deterministic: a seeded fight twice ends in the very same shield, hull and kills', JSON.stringify(f1) === JSON.stringify(f2) && f1.kills > 0, JSON.stringify([f1, f2]));

console.log('B. no list has a recharge row');
check('no row of any list is the recharge order, none has a key or a number of its own, and the order is not offered to the cruiser list', J(`CAMP_PANELS.panels.every(p => p.rows.every(r => r.order !== 'recharge' && !('k' in r) && !('code' in r) && !('n' in r)))`) && J(`campKeyRow('recharge')`) === null);

console.log('C. the old words');
check('"recharge shields" is understood (the order the pilot knew) and answers that the shield mends by itself: no ore paid, no shield filled', (() => { const r = J(`campIntent('recharge shields')`); return r && r.act === 'fleet_recharge'; })());
check('the order itself is refused with the one line and nothing changes', (() => { const r = J(`(() => { const C = mk(1, [2, 2, 2]); C.ore = 100; C.shield = 30; const x = campOrder(C, 'recharge', '', 'key'); return { x, ore: C.ore, shield: C.shield, orders: C.orders.recharge === undefined }; })()`); return r.x.ok === false && r.x.code === 'shieldauto' && r.x.say === 'Shields mend on their own.' && r.ore === 100 && r.shield === 30 && r.orders; })());
const sys = J('SC_CAMP_ACTS + SC_CAMP_HOW');
check('the model is not offered the action, and is told the shields mend by themselves (and no key or pips: the pips are off)', !/fleet_recharge/.test(sys) && !/recharg/i.test(sys) && /shields mend by themselves/.test(sys) && !/key J|pips/.test(sys)); // (no pips and no key since card space-game-power-removed)

console.log('D. the words');
const md = readFileSync(ROOT + '/content/text/campshield.md', 'utf8');
const line = J(`uiText('camp.no.shieldauto')`);
check('camp.no.shieldauto is in content/text/campshield.md, sealed (the game reads it), and is a curt line (12 words or fewer)', md.includes('| camp.no.shieldauto | ' + line + ' |') && line !== 'camp.no.shieldauto' && line.split(/\s+/).length <= 12, line);
const left = readdirSync(ROOT + '/content/text').filter(f => /^camp/.test(f) && f !== 'campshield.md').filter(f => readFileSync(ROOT + '/content/text/' + f, 'utf8').split('\n').some(l => /recharg/i.test(l) && !/^\| camp\.corner\.m\.recharging \|/.test(l))); // (the Boost row's own word, camp.corner.m.recharging, is no shield line: card space-game-boost-row-locked-colour)
check('no other text of the Campaign says recharge any more (the old lines for the carrier, Earth, "too far", "already full" are gone; the Boost row\'s word Recharging is the one exception)', left.length === 0, left.join());
check('the bots do not use it: tools/campaign-bot.mjs has no recharge order, and none of the ore tables is left (CAMP.recharge)', !/recharge/i.test(readFileSync(ROOT + '/tools/campaign-bot.mjs', 'utf8')) && J('typeof CAMP.recharge') === 'undefined');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nCAMPSHIELDAUTO PASS');
process.exit(failed ? 1 : 0);
