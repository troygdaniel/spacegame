// smoke: card space-game-shield-auto, plain Node, no Chrome
//   The cruiser's shield mends by itself, at a rate the SYSTEMS shield pips set (none at 0, slow at 2, fast at 4), after a short delay since the last hit. The pay-ore recharge row left the SHIP panel
//   (the rows are mine, build a fighter, build an escort, fly to the goal, dock) with its voice and strip order; the key numbers, the help and the briefing lines follow, and the bots do not use it.
//   A  the rate follows the pips, the delay follows the hit, the cap is held; on every level; the same twice (the sim stays deterministic)
//   B  the SHIP panel: five rows, no recharge, dock is the fifth, the burn is Shift and 4; the H page and the briefing lines say so
//   C  the old words: "recharge shields" is understood and answers that the shield mends by itself (nothing is paid, nothing filled); the model is not offered the action
//   D  the words are in content/text/campshield.md and no other text of the Campaign still says recharge
// Run: node tests/campshieldauto.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const ROOT = new URL('..', import.meta.url).pathname;
const near = (a, b, e = 0.05) => Math.abs(a - b) <= e;

// a ship with its pips set and a shield of n points, hit "hitAgo" seconds before now; then the power step alone for s seconds (no world: nothing else can hit it)
g.run(`window.mk = (lv, pips) => { const C = campNew(lv, [], { seed: 1, mission: 0, power: pips }); C.arrivedAt = 0; return C; };
  window.go = (C, s) => { for (let i = 0; i < Math.round(s * 30); i++) { C.t += 1000 / 30; campPowerStep(C, 1 / 30); } };
  window.hurt = (C, pts, hitAgo) => { C.shield = pts; C.shieldHitAt = C.t - hitAgo * 1000; };`);

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
check('the emergency shields (4 pips for 10 s) mend fast, and the setting after it is the slow one again', J(`(() => { const C = mk(1, [2, 2, 2]); hurt(C, 0, 99); campOrder(C, 'emergency', '', 'key'); go(C, 5); const em = C.shield; C.power.until = 0; C.power.p = C.power.base.slice(); const st = C.shield; go(C, 5); return { em, slow: C.shield - st }; })()`).em > 40);
check('every level mends it, the pirates of level 3 and the aliens of levels 1 and 2 alike (it is the carrier\'s, not a level\'s)', [1, 2, 3].every(lv => J(`(() => { const C = mk(${lv}, [2, 2, 2]); hurt(C, 20, 99); go(C, 10); return C.shield; })()`) > 45));
// the sim is the same twice: a seeded fight, the shield in the pin
const fight = () => J(`(() => { const C = campNew(1, [], { seed: 7 }); for (let i = 0; i < 30 * 90 && !C.result; i++) { const s = i / 30; C.input.thrust = s % 20 < 12 ? 1 : 0; C.input.fire = s > 8; if (i === 10) for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283, u = campSpawn(C, ['raider', 'drone', 'gunship'][k % 3], C.carrier.x + Math.cos(a) * 700, C.carrier.y + Math.sin(a) * 700); if (u) u.goal = 'carrier'; } campStep(C, 1 / 30); C.events.length = 0; } return { shield: +C.shield.toFixed(4), hp: +C.carrier.hp.toFixed(4), t: Math.round(C.t), kills: C.kills }; })()`);
const f1 = fight(), f2 = fight();
check('the sim stays deterministic: a seeded fight twice ends in the very same shield, hull and kills', JSON.stringify(f1) === JSON.stringify(f2) && f1.kills > 0, JSON.stringify([f1, f2]));

console.log('B. the SHIP panel has no recharge row');
const T = J(`CAMP_PANELS.panels.find(p => p.id === 'ship')`);
check('the SHIP panel\'s first four rows are the goal, the target, the burn and the dock (7 8 9 0), the builds are its BUILD page (7, 8), and none of them is the recharge order', T.rows.slice(0, 4).map(r => r.id).join() === 'goal,target,burn,dock' && T.rows.slice(0, 4).map(r => r.n).join() === '1,2,3,4' && T.page2.rows.map(r => r.id).join() === 'buildf,builde' && ![].concat(T.rows, T.page2.rows).some(r => /recharge/.test(r.id + r.order)), JSON.stringify(T.rows.map(r => r.id)));
const key = (code, lv, shift) => J(`(() => { const C = mk(${lv}, [2, 2, 2]), P = campPanelNew(); const r = campPanelKey(P, C, '${code}', 1100, ${!!shift}); return { ran: r.ran, row: r.row, ok: r.ok, say: r.say, nav: C.nav ? C.nav.fast === true : null, docked: C.docked || '' }; })()`);
check('7, 8, 9, 0 are the goal, the target, the burn and the dock (the key is the row\'s, with no panel to open; 5 is nothing)', ['Digit7', 'Digit8', 'Digit9', 'Digit0'].map(c => key(c, 1).row).join() === 'goal,target,burn,dock' && key('Digit5', 1).ran === false, ['Digit7', 'Digit8', 'Digit9', 'Digit0', 'Digit5'].map(c => key(c, 1).row).join());
check('the burn is its own key, 9 (the goal row\'s plain 7 is the regular flight), and Shift with 8 is a burn to the target', key('Digit9', 2).nav === true && key('Digit7', 2).nav === false && J(`CAMP_PANELS.panels.find(p => p.id === 'ship').rows.find(r => r.id === 'target').fast`) === 'Autopilot to the target (Shift: fast)' && J(`CAMP_PANELS.panels.find(p => p.id === 'ship').rows.find(r => r.id === 'burn').burn`) === 1);
check('the H page rows (made from the table) list the SHIP panel\'s keys 7 8 9 0 J K L ; U Enter I and its page key P, the burn is on 9, and nothing says recharge', J(`campPanelKeyRows().filter(r => /SHIP/.test(r.sub)).map(r => r.k[0]).join('')`) === '7890JKL;UEnterIP' && J(`campPanelKeyRows().some(r => r.k[0] === '9' && /burn/.test(r.t))`) && !J(`campPanelKeyRows().some(r => /recharge/i.test(r.t))`));
check('the level 3 hull mend (no outpost) is still the dock row, the fourth: "Repair the hull"', J(`(() => { const C = mk(3, [2, 2, 2]); const r = campPanelRows(C, 'ship'); return r.length === 11 && r[3].label === 'Repair the hull'; })()`));
const rows = J(`(() => { const C = mk(1, [2, 2, 2]); const sh = C => campPanelRows(C, 'ship').find(r => r.id === 'shields').state; const a = sh(C); C.power.p = [3, 0, 3]; const b = sh(C); C.power.p = [1, 3, 2]; const c = sh(C); return [a, b, c]; })()`);
check('the SHIP panel\'s shields row says what the shield pips do: "2 pips: shield 150, mends 3/s", "0 pips: shield 75, no mend", "3 pips: shield 188, mends 6/s"', rows.join(' | ') === '2 pips: shield 150, mends 3/s | 0 pips: shield 75, no mend | 3 pips: shield 188, mends 6/s', rows.join(' | '));
check('the key lines say the keys of now: the briefing\'s dock key is 0 and mine W; the dock hint is "0  dock at Luna"; the retreat line says press 0', J(`uiText('camp.bf.key.dock')`) === '0: dock to build, mend and sell' && J(`uiText('camp.bf.key.mine')`) === 'W: the wing mines ore' && J(`uiText('camp.hud.dockhint', { name: 'Luna' })`) === '0  dock at Luna' && /press 0\./.test(J(`uiText('camp.say.retreatnear', { name: 'Luna' })`)));
check('no text of the keys still names a panel key as a letter or sends the pilot to a row that is not there (the content files and the code defaults agree; tests/camppanelkeys.mjs has the lint)', !/\bE,? then \d|\bQ,? then \d|Press Q|Q opens/.test(['campbrief.md', 'campoutpost.md', 'ux-help.md', 'ux-nudge.md'].map(f => readFileSync(ROOT + '/content/text/' + f, 'utf8')).join('\n') + readFileSync(ROOT + '/src/contenttables.js', 'utf8')));

console.log('C. the old words');
check('"recharge shields" is understood (the order the pilot knew) and answers that the shield mends by itself: no ore paid, no shield filled', (() => { const r = J(`campIntent('recharge shields')`); return r && r.act === 'fleet_recharge'; })());
check('the order itself is refused with the one line and nothing changes', (() => { const r = J(`(() => { const C = mk(1, [2, 2, 2]); C.ore = 100; C.shield = 30; const x = campOrder(C, 'recharge', '', 'key'); return { x, ore: C.ore, shield: C.shield, orders: C.orders.recharge === undefined }; })()`); return r.x.ok === false && r.x.code === 'shieldauto' && r.x.say === 'Shields mend on their own. More pips on shields mend faster.' && r.ore === 100 && r.shield === 30 && r.orders; })());
const sys = J('SC_CAMP_ACTS + SC_CAMP_HOW');
check('the model is not offered the action, and is told the shields mend by themselves and what key sets it', !/fleet_recharge/.test(sys) && !/recharg/i.test(sys) && /shields mend by themselves/.test(sys) && /key J/.test(sys));

console.log('D. the words');
const md = readFileSync(ROOT + '/content/text/campshield.md', 'utf8');
const line = J(`uiText('camp.no.shieldauto')`);
check('camp.no.shieldauto is in content/text/campshield.md, sealed (the game reads it), and is a curt line (12 words or fewer)', md.includes('| camp.no.shieldauto | ' + line + ' |') && line !== 'camp.no.shieldauto' && line.split(/\s+/).length <= 12, line);
const left = readdirSync(ROOT + '/content/text').filter(f => /^camp/.test(f) && f !== 'campshield.md').filter(f => /recharg/i.test(readFileSync(ROOT + '/content/text/' + f, 'utf8')));
check('no other text of the Campaign says recharge any more (the old lines for the carrier, Earth, "too far", "already full" are gone)', left.length === 0, left.join());
check('the bots do not use it: tools/campaign-bot.mjs has no recharge order, and none of the ore tables is left (CAMP.recharge)', !/recharge/i.test(readFileSync(ROOT + '/tools/campaign-bot.mjs', 'utf8')) && J('typeof CAMP.recharge') === 'undefined');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nCAMPSHIELDAUTO PASS');
process.exit(failed ? 1 : 0);
