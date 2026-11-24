// smoke: card space-game-night-quit-at-pick (findings A and F of docs/night/hunt-l2-l3.md: the refit waits; level 3 mends the hull from the dock list: data, no key opens it now), plain Node, no Chrome
//   A  quitting at the tech pick or the Earth refit: the save's levelDone sends the pilot back to the level's story and pick (the flag itself is pinned in tests/campnightminors.mjs; here the refit of level 1 too)
//   F  a level with no outpost (level 3): the dock list (plain data, no key opens it now: card space-game-delete-off-lists) is "Repair the hull" alone; the cruiser list has the Dock row where there are outposts
//      No digit is a key in flight (0 was the dock key)
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

console.log('F. level 3 mends the hull from the dock list (Repair the hull, anywhere, for ore: card space-game-repair-with-ore)');
// press through the lists as the player does: the key of the list the row is in (campKeyVia; a part with no key of its own is reached through its parent: the parent's key, Down to the part's row, Enter), Down to the row, Enter.
// The indexes are read from this mission's lists (campPanelList), not written here. null when the row is not in this mission's list
g.run(`window.__open = (P, C, listId, now) => { const def = campKeyList(listId); if (!def) return false; campPanelClose(P); if (def.key) { campPanelKey(P, C, def.code, now); return campPanelOpen(P) === listId; } campPanelGo(P, C, listId); return campPanelOpen(P) === listId; /* no key opens this list now: opened by data */ };
  window.__pick = (P, C, rowId, now) => { const def = campKeyVia(rowId); if (!def) return null; const i = campPanelList(C, def.id).findIndex(r => r.id === rowId); if (i < 0 || !__open(P, C, def.id, now)) return null; for (let k = 0; k < i; k++) campPanelKey(P, C, 'ArrowDown', now); return campPanelKey(P, C, 'Enter', now); };`);
g.run(`window.mk = lv => { const C = campNew(lv, [], { seed: 1, mission: 0 }); C.arrivedAt = 0; C.ore = 200; return C; }; window.shipRow = C => campPanelRows(C, 'yard').find(r => r.id === 'repairhull');`);
const f3 = J(`(() => { const C = mk(3), whole = shipRow(C), ids = campPanelRows(C, 'yard').map(r => r.id), via = campKeyVia('repairhull'); C.carrier.hp = C.carrier.maxHp * 0.25; const hurt = shipRow(C); C.ore = 0; const poor = shipRow(C); C.ore = 200; return { aboard: campAboard(C), whole, hurt, poor, ids, via: [via.id, via.key, via.parent || ''], max: C.carrier.maxHp }; })()`);
check('level 3 has no outpost: the dock list (no key opens it now) is Repair the hull alone', f3.aboard === true && f3.whole.label === 'Repair the hull' && f3.ids.join() === 'repairhull' && f3.via.join() === 'yard,,cruiser' && !('tag' in f3.whole), JSON.stringify(f3));
check('with the hull whole it says why in two words ("hull sound") and is not ok', f3.whole.ok === false && f3.whole.short === 'hull sound', JSON.stringify(f3.whole));
check('hurt: ok, what it costs and how long it takes ("N ore, N s") and the cost in the short word', f3.hurt.ok === true && /^\d+ ore, \d+ s$/.test(f3.hurt.state) && /^\d+ ore$/.test(f3.hurt.short), JSON.stringify(f3.hurt));
check('hurt with no ore: not ok, and it says what it needs', f3.poor.ok === false && /ore/.test(f3.poor.short), JSON.stringify(f3.poor));
const run = J(`(() => { const C = mk(3), P = campPanelNew(); C.carrier.hp = C.carrier.maxHp * 0.25; const was = C.carrier.hp, ore = C.ore, quote = campMendQuote(C);
  const digit = campPanelKey(P, C, 'Digit0', 1000), hp0 = C.carrier.hp, opened = (campPanelGo(P, C, 'yard'), { used: true, ran: false, open: campPanelOpen(P) }), hp1 = C.carrier.hp, b = __pick(P, C, 'repairhull', 1100);
  return { digit, hp0, opened, hp1, open: b.open, ran: b.ran, ok: b.ok, say: b.say, hp: C.carrier.hp, max: C.carrier.maxHp, paid: ore - C.ore, quote, was, mends: C.orders.repair | 0, row: b.row }; })()`);
check('a digit is no key in flight: 0 (the old dock key) is not used, gives no order and mends nothing', run.digit.used === false && run.digit.ran === false && run.digit.open === '' && run.hp0 === run.was, JSON.stringify(run.digit));
check('the dock list opened by data gives no order by opening it: nothing is mended yet', run.opened.used === true && run.opened.ran === false && run.opened.open === 'yard' && run.hp1 === run.was, JSON.stringify(run.opened));
check('the dock list, "Repair the hull" (the only row), Enter on level 3 starts the mend for the quoted ore (the hull mends over the seconds, not at once), and the list closes (the order was taken)', run.row === 'repairhull' && run.ran === true && run.ok === true && run.open === '' && run.hp === run.was && run.paid === run.quote.cost && run.mends === 1, JSON.stringify(run));
check('and says so in the words of the repair order (not "There is no outpost in this system")', /\b(mend|repair|hull)/i.test(run.say) && !/no outpost/i.test(run.say), run.say);
const again = J(`(() => { const C = mk(3), P = campPanelNew(), ore = C.ore; const b = __pick(P, C, 'repairhull', 1100); return { ran: b.ran, ok: b.ok, say: b.say, open: b.open, paid: ore - C.ore, hp: C.carrier.hp, max: C.carrier.maxHp }; })()`);
check('with the hull whole, the row mends nothing, says the hull is sound and the list stays open (a refusal does not close it)', again.ran === true && again.ok === false && /sound|whole|full/i.test(again.say) && again.hp === again.max && again.paid === 0 && again.open === 'yard', JSON.stringify(again));
const click = J(`(() => { const C = mk(3); C.carrier.hp = 100; const row = campKeyVia('repairhull').rows.find(r => r.id === 'repairhull'); const r = campPanelRun(C, row, 'click'); return { ok: r.ok, mends: C.mends.length }; })()`);
check('a click on the row does the same as Enter on it (campPanelRun is the one way in)', click.ok === true && click.mends === 1, JSON.stringify(click));

console.log('F. a level with outposts is as it was');
const l1 = J(`(() => { const C = mk(1), row = shipRow(C), ids = campPanelRows(C, 'yard').map(r => r.id), def = campKeyVia('dock').rows.find(r => r.id === 'dock'); return { aboard: campAboard(C), ids, order: def.order, label: def.label, dockRow: campPanelRows(C, 'cruiser').find(r => r.id === 'dock') }; })()`);
check('level 1 (outposts): "Dock at the outpost" is a row of the cruiser list, the order is dock, and the dock list has the two repair rows (nothing is built)', l1.aboard === false && l1.order === 'dock' && l1.label === 'Dock at the outpost' && l1.dockRow.label === 'Dock at the outpost' && /^repairhull(,repairward)?$/.test(l1.ids.join()), JSON.stringify(l1));
check('the table itself is not changed (the row is made over at the moment, for a level that needs it)', J(`CAMP_PANELS.panels.find(p => p.id === 'cruiser').rows.find(r => r.id === 'dock').order`) === 'dock' && J(`CAMP_PANELS.panels.find(p => p.id === 'cruiser').rows.find(r => r.id === 'dock').label`) === 'Dock at the outpost');
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nfailed: ${failed}` : '\nCAMPQUITPICK PASS');
process.exit(failed ? 1 : 0);
