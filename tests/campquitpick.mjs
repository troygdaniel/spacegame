// smoke: card space-game-night-quit-at-pick (findings A and F of docs/night/hunt-l2-l3.md), plain Node, no Chrome
//   A  quitting at the tech pick or the Earth refit: the save's levelDone sends the pilot back to the level's story and pick (the flag itself is pinned in tests/campnightminors.mjs; here the refit of level 1 too)
//   F  a level with no outpost (level 3): the SHIP panel's fourth row (its sixth until card space-game-shield-auto took the recharge row out, its fifth until space-game-panel-keys-zxc moved Mine ore to FLEET) is "Repair the hull" and E then 4 mends the hull aboard for ore; a level with outposts keeps "Dock at an outpost"
// Run: node tests/campquitpick.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name + (detail ? '  ' + detail : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));

console.log('A. the refit of level 1 waits too');
const r1 = J(`(() => { const P = campProgressNew(), n = campMissions(1).length; P.level = 1; for (let i = 0; i < n; i++) campMissionDone(P, 1, i, { score: 100, bonuses: [], t: 1, hullLeft: 1, shipsLost: 0 }); campProgressSave(P);
  const back = campProgressLoad(), nx = campHubNext(back), a = {}; Campaign.prototype.init.call(a, { level: 1, mission: nx.i, via: 'hub' });
  return { n, flag: back.levelDone, nx, resume: a.resume, refit: !!CAMP.levels[1].refit }; })()`);
check('after the last mission of level 1 the save says so, the room offers the last mission, and the scene resumes at the won card (whose Enter is the refit)', r1.flag === 1 && r1.nx.i === r1.n - 1 && r1.resume === true && r1.refit === true, JSON.stringify(r1));
check('closing the tab at the refit leaves the flag set (only next() clears it), so the same goes for it again', J(`(() => { const P = campProgressLoad(); P.techs = []; campProgressSave(P); return campProgressLoad().levelDone; })()`) === 1);

console.log('F. level 3 mends the hull aboard from the SHIP panel');
g.run(`window.mk = lv => { const C = campNew(lv, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; C.ore = 200; return C; }; window.shipRow = C => campPanelRows(C, 'ship').find(r => r.id === 'dock');`);
const f3 = J(`(() => { const C = mk(3), whole = shipRow(C); C.carrier.hp = C.carrier.maxHp * 0.25; const hurt = shipRow(C); C.ore = 0; const poor = shipRow(C); C.ore = 200; return { aboard: campAboard(C), whole, hurt, poor, max: C.carrier.maxHp }; })()`);
check('level 3 has no outpost: the fifth row reads "Repair the hull" (the tab says Repair)', f3.aboard === true && f3.whole.label === 'Repair the hull' && f3.whole.tag === 'Repair', JSON.stringify(f3.whole));
check('with the hull whole it says why in two words ("hull sound") and is not ok', f3.whole.ok === false && f3.whole.short === 'hull sound', JSON.stringify(f3.whole));
check('hurt: ok, what it does ("450 hull for N ore") and the cost in the short word', f3.hurt.ok === true && /^\d+ hull for \d+ ore$/.test(f3.hurt.state) && /^\d+ ore$/.test(f3.hurt.short), JSON.stringify(f3.hurt));
check('hurt with no ore: not ok, and it says what it needs', f3.poor.ok === false && /ore/.test(f3.poor.short), JSON.stringify(f3.poor));
const run = J(`(() => { const C = mk(3), P = campPanelNew(); C.carrier.hp = C.carrier.maxHp * 0.25; const was = C.carrier.hp, ore = C.ore, quote = campMendQuote(C);
  const a = campPanelKey(P, C, 'KeyE', 1000, false), b = campPanelKey(P, C, 'Digit4', 1100, false);
  return { opened: a.opened, ran: b.ran, ok: b.ok, say: b.say, hp: C.carrier.hp, max: C.carrier.maxHp, paid: ore - C.ore, quote, was, mends: C.orders.repair | 0, row: b.row }; })()`);
check('E then 4 on level 3 mends the hull to full for the quoted ore', run.opened === 'ship' && run.ran === true && run.ok === true && run.hp === run.max && run.paid === run.quote.cost && run.mends === 1, JSON.stringify(run));
check('and says so in the words of the repair order (not "There is no outpost in this system")', /\b(mend|repair|hull)/i.test(run.say) && !/no outpost/i.test(run.say), run.say);
const again = J(`(() => { const C = mk(3), P = campPanelNew(); campPanelKey(P, C, 'KeyE', 1000, false); const b = campPanelKey(P, C, 'Digit4', 1100, false); return { ok: b.ok, say: b.say, hp: C.carrier.hp, max: C.carrier.maxHp }; })()`);
check('with the hull whole, E then 4 mends nothing and says the hull is sound', again.ok === false && /sound|whole|full/i.test(again.say) && again.hp === again.max, JSON.stringify(again));
const click = J(`(() => { const C = mk(3); C.carrier.hp = 100; const row = CAMP_PANELS.panels.find(p => p.id === 'ship').rows.find(r => r.id === 'dock'); const r = campPanelRun(C, row, 'click'); return { ok: r.ok, hp: C.carrier.hp, max: C.carrier.maxHp }; })()`);
check('a click on the row does the same as the key (campPanelRun is the one way in)', click.ok === true && click.hp === click.max, JSON.stringify(click));

console.log('F. a level with outposts is as it was');
const l1 = J(`(() => { const C = mk(1), row = shipRow(C), def = CAMP_PANELS.panels.find(p => p.id === 'ship').rows.find(r => r.id === 'dock'); return { aboard: campAboard(C), row, order: campPanelAs(C, def).order, label: campPanelAs(C, def).label }; })()`);
check('level 1 (outposts): the row is "Dock at an outpost" and the order is dock', l1.aboard === false && l1.order === 'dock' && l1.label === 'Dock at an outpost' && l1.row.label === 'Dock at an outpost' && l1.row.tag === 'Dock', JSON.stringify(l1));
check('the table itself is not changed (the row is made over at the moment, for a level that needs it)', J(`CAMP_PANELS.panels.find(p => p.id === 'ship').rows.find(r => r.id === 'dock').order`) === 'dock');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nCAMPQUITPICK PASS');
process.exit(failed ? 1 : 0);
