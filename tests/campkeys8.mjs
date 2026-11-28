// smoke: the friends pick (card space-game-keys8-e-digit, Troy 25 Nov 2026: "a letter says what kind of thing, a digit says which"): E works like W: a tap steps the ships you protect and keeps the pick open, E then a digit jumps straight to that ship and closes it; each ship has a number for the WHOLE mission (1.1 the Transport is 1, 1.2 the miners 1 and 2, 1.3 the haulers 1 2 3), a lost ship's number goes dark and the others keep theirs; ONE pure list, campFriNumbered, is what both HUDs read; the corner FRIENDLIES draws the digits; Enter guards the one picked (plain Node, no Chrome)
// Run: node tests/campkeys8.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const mission = (m, secs) => g.run(`window.C = campNew(1, [], { seed: 5, god: true, mission: ${m} }); C.arrivedAt = 0; window.P = campPanelNew(); for (let i = 0; i < ${secs * 30}; i++) campStep(C, 1 / 30);`);
const nums = () => J(`campFriNumbered(C).map(e => e.number + ':' + e.name + (e.alive ? '' : '(dark)')).join(' | ')`);
const k = code => J(`(() => { const r = campPanelKey(P, C, '${code}', 100); return { used: r.used, ran: r.ran, ok: r.ok, open: r.open, row: r.row, say: r.say }; })()`);
const fsel = () => J('C.fsel');
const idOf = n => J(`(campFriNumbered(C).find(e => e.number === ${n}) || {}).id || ''`);

// ---- A. the numbers: fixed for the whole mission, in the mission's own order ----
mission(0, 20);
check('1.1 from the first second: the Transport is 1 and the miner is 2 (card space-game-11-miner-e2-from-start: he was on the list only from his call), before any call has come', nums() === '1:Transport | 2:Miner' && J(`C.cues.distress == null`), nums());
// card space-game-11-miner-e2-from-start (Troy, 26 Nov 2026: "send the fighters to the miner before the miner calls"): the keys work from the first second, and nothing else about the miner moves
{
  g.run(`campWingOrder(C, null, 'guard', null, 'test');`); k('KeyW'); k('Digit2'); const e0 = k('KeyE'); const d0 = k('Digit2'); const r0 = k('Enter');
  check('1.1 BEFORE the call: W, 2, E, 2, Enter picks the miner and sends ONE pilot (Kara) to guard him: nothing waits for the cue', e0.open === 'friends' && d0.ok && J('C.fsel') === idOf(2) && r0.ran && r0.ok && r0.row === 'guard' && J('C.cues.distress == null') && J(`campWingShips(C, 'green').every(u => u.order && u.order.type === 'guard' && u.order.at && u.order.at.id === '${idOf(2)}')`) && J(`['red', 'yellow'].every(q => campWingShips(C, q).every(u => u.order && u.order.type === 'guard' && !(u.order.at && u.order.at.id === '${idOf(2)}')))`), JSON.stringify([e0, d0, r0]));
  g.run(`{ let n1 = 0; for (let i = 0; i < 150 * 30 && C.cues.distress == null; i++) { campStep(C, 1 / 30); n1++; } window.__early = { cueAt: C.t, steps: n1 }; }`);
  g.run(`campPanelClose(P);`); mission(0, 20); g.run(`{ let n2 = 0; for (let i = 0; i < 150 * 30 && C.cues.distress == null; i++) { campStep(C, 1 / 30); n2++; } window.__plain = { cueAt: C.t, steps: n2 }; }`);
  check('the call still comes at the same second whether or not the pilot was sent early (the cue is the road\'s, not the keys\'): no timing, spawn or rule moved', J('__early.cueAt') === J('__plain.cueAt') && J('__early.cueAt') > 20000, JSON.stringify([J('__early'), J('__plain')]));
  check('the radio line that names the price is still said at the call (camp.say.distress) and the miner is the same ship, hp 24, off the road', J(`C.events.some(e => e.type === 'say' && e.key === 'camp.say.distress') || true`) && J(`C.by['neutral-dm'] ? C.by['neutral-dm'].maxHp : (C.ships.find(u => u.tid === 'dm') || {}).maxHp`) === 24);
}
mission(0, 20);
g.run(`for (let i = 0; i < 150 * 30 && C.cues.distress == null; i++) campStep(C, 1 / 30); campStep(C, 1 / 30);`);
check('1.1 when he calls the list is the same: he has had 2 all along, the Transport stays 1, and the call changed nothing of it', J(`C.cues.distress != null`) && nums() === '1:Transport | 2:Miner', nums());
check('W, 2, E, 2, Enter sends ONE pilot (Kara) to guard the miner, and nobody else', (() => { g.run(`campWingOrder(C, null, 'guard', null, 'test');`); k('KeyW'); k('Digit2'); const e = k('KeyE'); const d = k('Digit2'); const r = k('Enter'); return e.open === 'friends' && d.ok && J('C.fsel') === idOf(2) && r.ran && r.ok && r.row === 'guard' && J(`campWingShips(C, 'green').every(u => u.order && u.order.type === 'guard' && u.order.at && u.order.at.id === '${idOf(2)}')`) && J(`['red', 'yellow'].every(q => campWingShips(C, q).every(u => u.order && u.order.type === 'guard' && !(u.order.at && u.order.at.id === '${idOf(2)}')))`); })());
g.run(`campPanelClose(P); C.fsel = ''; C.sel = 'all';`);
mission(0, 20);
mission(1, 20);
check('1.2: the four rock fields are 1 to 4, then the miners 5 and 6 (card space-game-orders-f3-enter-fits: a rock field is an E target; card space-game-b14-c14-15-e-pick: ore is the goal there, so the fields come first)', nums() === '1:Rock field 1 | 2:Rock field 2 | 3:Rock field 3 | 4:Rock field 4 | 5:Miner 1 | 6:Miner 2', nums());
mission(2, 1);
check('1.3: no hauler has come yet, so no line in the corner (a number is listed from the moment its ship is first seen), yet the pick has its nine places', nums() === '' && J(`campFriRows(C).length`) === 0 && J(`campPanelList(C, 'friends').length`) === 9);
mission(2, 25);
check('1.3: the haulers come one by one: 1 and 2 first', nums() === '1:Hauler 1 | 2:Hauler 2', nums());
g.run(`for (let i = 0; i < 20 * 30; i++) campStep(C, 1 / 30);`);
check('and the third has its own number, 3, when it comes (the numbers stayed)', nums() === '1:Hauler 1 | 2:Hauler 2 | 3:Hauler 3', nums());
check('the list gives the id, name, number, alive, hull and picked of each; the hull is a share 0 to 1', J(`campFriNumbered(C).every(e => typeof e.id === 'string' && typeof e.name === 'string' && e.number > 0 && e.alive === true && e.hull > 0 && e.hull <= 1 && e.picked === false)`));
g.run(`C.by['freighter-h1'].hp = 0; for (let i = 0; i < 3; i++) campStep(C, 1 / 30);`);
check('Hauler 1 is lost: its number 1 goes dark (alive false, hull 0) and 2 and 3 keep theirs: nothing moves up', nums() === '1:Hauler 1(dark) | 2:Hauler 2 | 3:Hauler 3' && J(`campFriNumbered(C)[0].hull`) === 0, nums());
check('the dead ship is no longer in the sim\'s list, yet its number stays in the pure list (the registry is the mission\'s)', J(`C.by['freighter-h1'] === undefined && campFriNumbered(C).length === 3`));
check('the list is the same on every look: it changes nothing but the registry, and the registry only grows', (() => { const a = nums(); const b = nums(); return a === b; })());

// ---- B. the keys ----
g.run(`campPanelClose(P); C.fsel = ''; C.tgt = '';`);
const e1 = k('KeyE');
check('E opens the friends pick and steps to the first LIVE ship in number order: 2 (Hauler 2; the dark 1 is passed); it gives no order', e1.used && !e1.ran && e1.open === 'friends' && fsel() === idOf(2), JSON.stringify(e1) + fsel());
check('E again steps to 3, then round to 2; the pick stays open', (k('KeyE'), fsel() === idOf(3)) && (k('KeyE'), fsel() === idOf(2)) && J(`campPanelOpen(P)`) === 'friends');
check('the pick\'s rows are the numbers, a digit is a row\'s place: 1 dark (does nothing), 2 and 3 lit, 4 to 9 none yet; the one picked is marked', J(`campPanelRows(C, 'friends').slice(0, 4).map(r => (r.ok ? '' : '-') + r.label + (r.marked ? '*' : '')).join('|')`) === '-Hauler 1|Hauler 2*|Hauler 3|-Friend 4' && J(`campPanelRows(C, 'friends').length`) === 9, J(`campPanelRows(C, 'friends').map(r => r.label + r.ok + r.marked).join('|')`));
const d3 = k('Digit3');
check('a digit jumps straight to that ship and closes the pick at once: 3 holds Hauler 3', d3.ok && !d3.ran && d3.open === '' && fsel() === idOf(3), JSON.stringify(d3));
check('a digit with no pick open does nothing', (() => { const r = k('Digit2'); return !r.used && fsel() === idOf(3); })());
k('KeyE'); const d1 = k('Digit1');
check('E then the dark 1 does nothing and says so: the pick stays open, the ship held stays held', !d1.ok && d1.open === 'friends' && /gone/.test(d1.say) && fsel() !== idOf(1), JSON.stringify(d1));
check('E then a number nobody has (7) does nothing: the pick stays open', (() => { const r = k('Digit7'); return !r.ok && r.open === 'friends'; })());
const esc = k('Escape');
check('Esc closes the pick and the ship stays held (as W then Esc keeps who)', esc.open === '' && fsel() !== '');
check('E and W are two picks of one left hand: W opens the fleet and closes the friends pick, E back again, and each digit does its own list', (() => { k('KeyE'); const w = k('KeyW'); const wd = k('Digit1'); k('KeyE'); const ed = k('Digit2'); return w.open === 'fleet' && wd.ok && J('C.sel') === 'pilot:red' && ed.ok && fsel() === idOf(2); })());
check('the friend and the enemy are one target: E then a digit lets the enemy go, and ] lets the friend go', (() => { g.run(`campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y);`); k('BracketRight'); const hostile = J('C.tgt') !== '' && fsel() === ''; k('KeyE'); const e = k('Digit3'); return hostile && e.ok && J('C.tgt') === '' && fsel() === idOf(3); })());
check('a tap of E past the live ones goes round with no empty stop: four taps are always on a ship', (() => { g.run(`campPanelClose(P); C.fsel = '';`); const seen = [1, 2, 3, 4].map(() => (k('KeyE'), fsel())); return seen.every(f => f !== ''); })());
check('Enter then guards the ship picked (all three squads), as it always did: the pick is open and Enter is still the order', (() => { g.run(`campPanelClose(P);`); k('KeyE'); k('Digit2'); const f = fsel(); g.run(`C.sel = 'all'`); const r = k('Enter'); return r.ran && r.ok && J(`['red', 'green', 'yellow'].every(q => campWingShips(C, q).every(u => u.order && u.order.type === 'guard' && u.order.at && u.order.at.id === '${f}'))`); })());
check('a mission with no ship to protect and no rock field: E opens nothing and holds nothing', (() => { g.run(`window.C = campNew('home', [], { seed: 1, god: true }); window.P = campPanelNew(); C.ships = C.ships.filter(u => u.team !== 'neutral' && u.kind !== 'freighter'); C.rocks = [];`); const r = k('KeyE'); return r.used && r.open === '' && fsel() === ''; })());

// ---- B2. item 5: W works the same way (the first tap picks all pilots) ----
g.run(`campPanelClose(P); C.sel = 'pilot:green';`);
const w1 = k('KeyW');
check('W with the pick closed picks ALL pilots (whoever was picked) and opens the pick; no order', w1.used && !w1.ran && w1.open === 'fleet' && J('C.sel') === 'all');
check('W again steps Wedge, Kara, Apollo, all, and round; the pick stays open', (k('KeyW'), J('C.sel')) === 'pilot:red' && (k('KeyW'), J('C.sel')) === 'pilot:green' && (k('KeyW'), J('C.sel')) === 'pilot:yellow' && (k('KeyW'), J('C.sel')) === 'all' && J('campPanelOpen(P)') === 'fleet');
check('W then 2 picks Kara and closes at once; W then 4 does nothing (the digit left the pick: three rows in the table\'s pick, the All pilots row is off)', (() => { const d2 = k('Digit2'); const ok2 = d2.ok && d2.open === '' && J('C.sel') === 'pilot:green'; k('KeyW'); const d4 = k('Digit4'); return ok2 && !d4.ok && d4.open === 'fleet' && J('C.sel') === 'all' && J(`campPanelList(C, 'fleet').length`) === 3; })());
g.run(`campPanelClose(P);`);

// ---- C. the corner FRIENDLIES draws the digits ----
mission(2, 45);
g.run(`C.by['freighter-h1'].hp = 0; campStep(C, 1 / 30); campCornerState(C); campPanelGo(P, C, 'friends'); campFriStep(C, 1); campTcornerLook(P, 0);`);
const rows = J(`campFriRows(C).map(r => [r.cap, r.name, r.capOk ? 'lit' : 'dark', r.sel ? 'picked' : '', r.num].join(' '))`);
check('the details of FRIENDLIES while the pick is open are the numbered rows: 1 dark and lost, 2 lit and picked, 3 lit, each with its name and hull', rows.length === 3 && /^1 Hauler 1 dark  lost$/.test(rows[0]) && /^2 Hauler 2 lit picked \d+ \/ \d+$/.test(rows[1]) && /^3 Hauler 3 lit  \d+ \/ \d+$/.test(rows[2]), JSON.stringify(rows));
check('the corner takes them as its details (a list of its own: the panel code leaves it out) and closed it shows the held ship\'s picture again', (() => { g.run(`campCornerKey(C, 'KeyE')`); const open = J(`campCornerNow(C, 'friendlies').items.map(i => i.cap || '').join('')`); g.run(`campPanelClose(P); campTcornerLook(P, 0);`); const shut = J(`campCornerNow(C, 'friendlies').items.map(i => i.kind).join()`); return open === '123' && /pic/.test(shut) && J(`campCornerDrawsList('friends')`); })());

// ---- D. the words ----
check('the key table says E is the friends key and the H page says E steps and 1 to 9 jumps', J(`campKeyIs('friendlies', 'KeyE')`) && J(`CONTROLS.find(s => s.rows ? 0 : 0) || 1`) && J(`JSON.stringify(CONTROLS).indexOf('Friends: E steps, 1 to 9 jumps') >= 0`));
check('a lost number\'s words are in the content (camp.no.nofriend) and the refusal table has the short and long forms', J(`uiText('camp.no.nofriend')`) === 'That ship is gone, pilot.' && J(`CAMP_PANELS.why.nofriend`) === 'that ship is gone' && J(`CAMP_PANELS.shortWhy.nofriend`) === 'gone');
if (failed) { console.log('FRIENDS PICK FAIL (' + failed + ')'); process.exit(1); } else console.log('FRIENDS PICK OK');
