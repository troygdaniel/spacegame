// smoke: the cockpit's lists and keys, brief 7 decisions 12 and 13 (plain Node, no Chrome): the Q list headed Cruiser (auto), Q 7 as "Cruiser, come to me", the W row of the pilot being flown, C with a list or the map open, Z and R from a fighter, the keys page
// Card space-game-b7-hud-q-cockpit (Troy, 26 Nov 2026; the brief is card space-game-cloud-brief-7). Behind CAMP.flags.cockpit. No key moves.
//   A. the Q list: headed Cruiser (auto) while he flies a fighter, with no heading otherwise (the corner list's own rule)
//   B. Q 7: Form up on me with no stick (the pilots form up on the cruiser), Cruiser, come to me while he flies: the cruiser's autopilot goes to the fighter and keeps station; it is refused beside him; the pilots are not ordered
//   C. W: the pilot whose fighter he flies is no stop; his row stays where it is (the digits do not move) and says "you"; picking it says so in words and picks nothing
//   D. C with a list or the map open: not while the map is open (the map has the keys) nor a list that has the arrows; with a numbered list open (Q, W, E: their digits are their keys), yes, as Z fires
//   E. Z and R from a fighter, with a list open: the missile leaves the fighter, the rack queues a missile (the cruiser's ore)
//   F. the keys pages say the cruiser is what flies to the mark on the open map
// Run: node tests/campcockpitq.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
g.run(`
  window.__mk = () => { CAMP.flags.cockpit = true; CAMP.flags.pagehud = true; const C = window.C = campNew(1, [], { seed: 7, mission: 0 }); C.t = 1000; C.god = true; campStep(C, 2); C.ships.forEach(u => { if (u.team === 'alien' || u.team === 'neutral') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); C.events.length = 0; window.P = campPanelNew(); return C; };
  window.__fly = () => C.by[C.cockpit.id];
  window.__away = (dx, dy) => { const f = __fly(); f.x = C.carrier.x + dx; f.y = C.carrier.y + dy; f.vx = 0; f.vy = 0; return f; };
  window.__row7 = () => campPanelRows(C, 'cruiser').find(r => r.id === 'formup');
`);

console.log('A. the Q list');
{
  g.run(`__mk(); campPanelKey(P, C, 'KeyQ', 0);`);
  check('no stick: no heading on the cruiser list (a corner list has none), as it was', J('campPageHudListModel(P, C, 0).title') === '');
  g.run(`campCockpitTake(C);`);
  check('flying a fighter: the list is headed Cruiser (auto)', J('campPageHudListModel(P, C, 0).title') === 'Cruiser (auto)');
  g.run(`campPanelClose(P); campPanelKey(P, C, 'KeyW', 10);`);
  check('only the cruiser\'s list: the fleet pick is a corner\'s own (it has no list panel to head)', J('campPageHudListModel(P, C, 0)') === null);
  g.run(`campCockpitGive(C, 'hand'); campPanelClose(P); campPanelKey(P, C, 'KeyQ', 20);`);
  check('handed back: no heading again', J('campPageHudListModel(P, C, 0).title') === '');
}

console.log('B. Q 7');
{
  g.run(`__mk();`);
  check('no stick: the last row is Form up on me, and it is still the 7th', J('__row7().label') === 'Form up on me' && J(`campPanelRows(C, 'cruiser').findIndex(r => r.id === 'formup')`) === 6);
  g.run(`campCockpitTake(C); __away(3000, 0);`);
  check('flying a fighter: the same row (still 7) reads Cruiser, come to me', J('__row7().label') === 'Cruiser, come to me' && J(`campPanelRows(C, 'cruiser').findIndex(r => r.id === 'formup')`) === 6);
  g.run(`window.__o0 = JSON.stringify(C.ships.filter(u => u.kind === 'fighter').map(u => u.order)); window.__r = campPanelRun(C, campPanelList(C, 'cruiser').find(r => r.id === 'formup'), 'key');`);
  check('Q 7 sends the cruiser: the autopilot flies to the FIGHTER (a moving ship, kept alongside), with the answer in words (shown, not spoken)', J('__r.ok') === true && J('__r.say') === 'Cruiser on its way to you.' && J('C.nav.on') === true && J('C.nav.ref') === J('C.cockpit.id') && J('C.nav.moving') === true, JSON.stringify(J('[__r, C.nav]')));
  check('and the pilots are not ordered (nobody forms up: their orders are untouched)', J(`JSON.stringify(C.ships.filter(u => u.kind === 'fighter').map(u => u.order)) === __o0`));
  g.run(`for (let i = 0; i < 360; i++) campStep(C, 1 / 30);`);
  check('the cruiser closes on the fighter while he flies (6,000 px in six seconds is not much: it is nearer than it was)', J('Math.hypot(C.carrier.x - __fly().x, C.carrier.y - __fly().y)') < 3000, J('Math.hypot(C.carrier.x - __fly().x, C.carrier.y - __fly().y)'));
  g.run(`__away(100, 0); C.carrier.vx = 0; C.carrier.vy = 0; window.__st = campPanelRowState(C, campPanelList(C, 'cruiser').find(r => r.id === 'formup'));`);
  check('beside the fighter the row says why it cannot: you are there (dim)', J('__st.ok') === false && J('__st.state') === 'you are there', JSON.stringify(J('__st')));
  g.run(`campCockpitGive(C, 'hand'); window.__st = campPanelRowState(C, campPanelList(C, 'cruiser').find(r => r.id === 'formup'));`);
  check('handed back: the row is the pilots\' Form up again (the dry run is theirs), the label too', J('__row7().label') === 'Form up on me' && J('campPanelRun(C, campPanelList(C, "cruiser").find(r => r.id === "formup"), "key").ok') === true);
  g.run(`__mk(); campCockpitTake(C); __away(3000, 0);`);
  check('the key path: Q then 7 (the numbered list) does it', (g.run(`P.open = ''; campPanelKey(P, C, 'KeyQ', 0); window.__k7 = campPanelKey(P, C, 'Digit7', 100);`), J('__k7.ran') === true && J('__k7.ok') === true && J('C.nav && C.nav.on') === true), JSON.stringify(J('__k7')));
}

console.log('C. W and the pilot he flies');
{
  g.run(`__mk(); campCockpitTake(C); window.__sq = __fly().squad;`);
  const rows = J(`campPanelRows(C, 'fleet').map(r => r.id)`);
  check('the fleet pick keeps its rows and its digits (1 Wedge, 2 Kara, 3 Apollo): no row moves', rows.join() === 'whowedge,whokara,whoapollo', rows.join());
  g.run(`window.__st = campPanelRowState(C, campPanelList(C, 'fleet').find(r => r.id === 'whowedge'));`);
  check('Wedge\'s row, with his fighter flown, is dim and says "you" (not "not out")', J('__sq') === 'red' && J('__st.ok') === false && J('__st.short') === 'you' && J('__st.state') === 'you are flying him', JSON.stringify(J('__st')));
  check('the others\' rows are as they were', J(`campPanelRowState(C, campPanelList(C, 'fleet').find(r => r.id === 'whokara')).ok`) === true);
  g.run(`window.__pick = campSelPick(C, CAMP_SELPILOT + 'red', 'key');`);
  check('a pick of him says so in words (shown, not spoken) and picks nothing', J('__pick.ok') === false && J('__pick.say') === 'You are flying Wedge.' && J('campSelNow(C).kind') === 'all', JSON.stringify(J('__pick')));
  g.run(`campCockpitGive(C, 'hand'); window.__st = campPanelRowState(C, campPanelList(C, 'fleet').find(r => r.id === 'whowedge'));`);
  check('handed back, Wedge is a stop again', J('__st.ok') === true && J('campSelPick(C, CAMP_SELPILOT + "red", "key").ok') === true);
  g.run(`__mk(); campSelPick(C, CAMP_SELPILOT + 'red', 'key'); campCockpitTake(C);`);
  check('Wedge picked, then the stick taken: the pick falls back to all pilots (Enter orders the others), never to a ship he flies', J('campSelNow(C).kind') === 'all' && J('campSelAllUnits(C).every(u => !u.cockpit)') === true);
}

console.log('D. C with a list or the map open');
{
  g.run(`__mk(); campPanelKey(P, C, 'KeyW', 0); window.__r = campPanelKey(P, C, 'KeyC', 100);`);
  check('with a NUMBERED list open (the fleet pick: its digits are its keys) C takes the stick, as Z fires with one open', J('__r.ran') === true && J('!!C.cockpit') === true && J('campPanelOpen(P)') === 'fleet');
  g.run(`window.__r = campPanelKey(P, C, 'KeyC', 200);`);
  check('and again hands it back, with the list still up', J('__r.ran') === true && J('C.cockpit') === null);
  g.run(`__mk(); window.__fl = CAMP_PANELS.panels.find(p => p.id === 'fleet'); __fl.numbers = 0; campPanelKey(P, C, 'KeyW', 0); window.__r = campPanelKey(P, C, 'KeyC', 100); __fl.numbers = 1;`);
  check('a list that HAS the arrows (one with no digits: the probe turns the fleet pick into one) has the keys: C is used and does nothing', J('__r.used') === true && J('__r.ran') !== true && J('C.cockpit') === null, JSON.stringify(J('__r')));
  g.run(`campPanelClose(P); window.__r = campPanelKey(P, C, 'KeyC', 1000);`);
  check('shut, C takes the stick', J('__r.ran') === true && J('!!C.cockpit') === true);
  g.run(`campCockpitGive(C, 'hand'); campPanelClose(P); campPanelKey(P, C, 'KeyQ', 2000); window.__r = campPanelKey(P, C, 'KeyC', 2100);`);
  check('with the numbered Q list open C takes the stick too', J('__r.ran') === true && J('!!C.cockpit') === true);
  const sc = src('src/campaignscene.js');
  check('with the map open the scene does not give C to the lists at all: the map has the keys (the line is before the map\'s own key handler, so C neither takes nor gives)', /if \(this\.mp && campKeyIs\('cockpit', c\)\) return;[^\n]*\n\s*if \(this\.mp && typeof campMapKey === 'function'/.test(sc));
}

console.log('E. Z and R from a fighter');
{
  g.run(`__mk(); campCockpitTake(C); __away(5000, 0); C.missiles = 3; C.nextRocket = 0; const a = campSpawn(C, 'gunship', __fly().x + 300, __fly().y); a.vmax = 0; a.accel = 0; a.nextShot = 1e12; a.hp = 1e6; a.maxHp = 1e6; P.open = 'fleet'; window.__z = campPanelKey(P, C, 'KeyZ', 0);`);
  check('Z with a list open fires (a letter takes no list\'s key), and the rocket leaves the fighter', J('__z.used') === true && J('__z.ran') === true && J('__z.ok') === true && J('C.rockets.length') === 1 && J('Math.hypot(C.rockets[0].x - __fly().x, C.rockets[0].y - __fly().y)') < 30, JSON.stringify(J('__z')));
  g.run(`campPanelClose(P); C.ore = 100; C.missiles = 0; window.__r = campPanelKey(P, C, 'KeyR', 5000);`);
  check('R from a fighter queues a missile for ore: the cruiser\'s hold pays (a build is under way)', J('__r.used') === true && J('__r.ran') === true && J('__r.ok') === true && (J('C.ore') < 100 || J('C.reloadAt') > 0 || J('(C.reloadQ || 0)') > 0), JSON.stringify(J('[__r, C.ore, C.reloadAt, C.reloadQ]')));
  const sc = src('src/campaignscene.js');
  check('Z and Enter with the map open do nothing (the map has the keys), from a fighter too: the same scene branch', /campKeyIs\('missile', c\) \|\| campKeyIs\('order', c\)\)\) \{ if \(campKeyIs\('missile', c\) \|\| campKeyIs\('order', c\)\) return;/.test(sc));
}

console.log('F. the keys pages');
{
  const rows = J('campKeysPage()').flatMap(gr => gr.rows.map(r => r.caps.join('+') + ':' + r.t));
  check('the Campaign page says, on its Enter row, that the cruiser flies there from the map (Shift: fast)', rows.some(r => /^Enter:Map: cruiser flies there; Shift: fast$/.test(r)), JSON.stringify(rows.filter(r => /Map:/.test(r))));
  check('the new keys page\'s map row says Map: Enter flies the cruiser (five words), and the Controls tab\'s word is "The cruiser flies there"', J(`scrKeysModel().groups.find(gr => gr.id === 'cruiser').rows.find(r => r.chips[0].k === 'Tab').t`) === 'Map: Enter flies the cruiser' && J(`uiText('scr.ctl.campaign.15')`) === 'The cruiser flies there');
}
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
