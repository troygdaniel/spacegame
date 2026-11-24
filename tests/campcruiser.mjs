// smoke: S opens the cruiser's list (Fly to the goal, Fly to the target, Mine ore, Dock and repair, Emergency shields, the warp blink with its tech) and it fades when untouched; Q opens no list (it picks who); Fly to the goal burns by itself on a long clear leg; Emergency shields fills the shield for ore with a cooldown (plain Node, no Chrome)
// Card space-game-keys2-cruiser (Troy, 23 Nov 2026, through ORCH: "S centres on the cruiser and opens its list, fading after a few seconds; Q and the autopilot key go; fast drive folds into Fly to goal"). The table, the switches and the wiring are src/data_controls.js
// (campCruiserWire), the fade src/camppanel.js (campPanelFade), the burn src/campnav.js (campNavAuto), the order src/campmend.js (campEmergency), the numbers CAMP.nav.auto and CAMP.emergency (src/campaign.js), both on the N panel (emergency).
//   A. the table as the game has it: S is the cruiser list's key, Q is nobody's, the rows and their order, the old lists keep only what is theirs
//   B. the keys: S opens the list on Fly to the goal and closes it, Q opens no list (it picks who), Esc closes, Enter on Dock and repair goes into the dock list
//   C. the old lists on: every row goes back where it was (the autopilot list's first two, the power list's emergency row, the blink to the ship list or the power list), and off again puts them in the cruiser list
//   D. the fade: a key or a click keeps the list, 4 s of nothing dims it, 4.5 s closes it; the dock list reached from it fades too; a list that does not fade never does
//   E. Emergency shields: the shield is filled at once for 50 ore, refused with its reason (cooling, full, no ore), ready again after 20 s; the N panel has both numbers
//   F. Fly to the goal: a long leg with no hostile near and the wing aboard burns by itself, says so, and drops out when a hostile comes near; a short leg, a ship out, a hostile near and the old autopilot list do not burn
//   G. the words: the key line, the H page, the pause card, the briefing and the hints name S, and no Q
// Run: node tests/campcruiser.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__new = (level, mi, techs) => campNew(level, techs || [], { seed: 5, god: true, mission: mi || 0 });
  window.__key = (P, C, code, now) => campPanelKey(P, C, code, now || 0);
  window.__run = (C, s) => { for (let i = 0; i < s * 30; i++) campStep(C, 1 / 30); };
  window.__ids = id => campKeyList(id) ? campKeyList(id).rows.map(r => r.id).join() : 'none';
  window.__rowof = (C, id) => campPanelRows(C, 'cruiser').find(r => r.id === id) || null;
`);

console.log('A. the table as the game has it');
{
  check('S (KeyS) is the cruiser list\'s key, the list is on and fades; no list has a key on KeyQ', J(`(() => { const c = campKeyList('cruiser'); return [c.key, c.code, !!c.off, !!c.fades, CAMP_PANELS.panels.some(p => p.code === 'KeyQ')].join() })()`) === 'S,KeyS,false,true,false');
  check('its rows, top to bottom: Fly to the goal, Fly to the target, Mine ore, Dock at the outpost, Repair hull, Dock and repair (switched off), Emergency shields, the warp blink', J(`__ids('cruiser')`) === 'goal,target,fmine,dock,srepair,gdock,emergency,blink');
  check('their words: Fly to the goal, Fly to the target, Mine ore, Dock at the outpost, Repair hull', J(`campKeyList('cruiser').rows.slice(0, 5).map(r => r.label).join('|')`) === 'Fly to the goal|Fly to the target|Mine ore|Dock at the outpost|Repair hull');
  check('without the warp tech the blink row is left out of the mission\'s list; with it, it is the last row', J(`campPanelList(__new(2, 0), 'cruiser').map(r => r.id).join()`) === 'goal,target,fmine,dock,srepair,emergency' && J(`campPanelList(__new(2, 0, ['blink']), 'cruiser').map(r => r.id).join()`) === 'goal,target,fmine,dock,srepair,emergency,blink');
  check('the autopilot list has only the burn rows left (it has no way in: the fast drive is Fly to the goal\'s), the power list has neither the emergency row nor the blink', J(`__ids('nav')`) === 'burn,burntarget' && !/emergency|blink/.test(J(`__ids('power')`)), J(`__ids('nav')`) + ' / ' + J(`__ids('power')`));
  check('a row\'s list is found by its id: the goal, the target, the emergency row and the blink are the cruiser list\'s, reached by S', J(`['goal', 'target', 'emergency', 'blink', 'fmine'].map(id => campKeyVia(id).id).join()`) === 'cruiser,cruiser,cruiser,cruiser,cruiser' && J(`campKeyOpens('cruiser')`) === 'S');
  check('only the goal row burns by itself (fast: auto); the target row does not', J(`campKeyList('cruiser').rows.map(r => r.id + ':' + (r.fast || '')).slice(0, 2).join()`) === 'goal:auto,target:');
}

console.log('B. the keys');
{
  g.run(`var P1 = campPanelNew(), C1 = __new(2, 0); var r1 = __key(P1, C1, 'KeyS', 100);`);
  check('S opens the cruiser list on its first row, Fly to the goal', J(`[campPanelOpen(P1), P1.at, r1.used].join()`) === 'cruiser,0,true');
  g.run(`var r2 = __key(P1, C1, 'KeyS', 200);`);
  check('S again closes it', J(`[campPanelOpen(P1), r2.used].join()`) === ',true');
  g.run(`var r3 = __key(P1, C1, 'KeyQ', 300);`);
  check('Q opens no list: it is the who key now (card space-game-keys3-select): the key is used, no list opens and no order is given', J(`[campPanelOpen(P1), r3.used, r3.ran].join()`) === ',true,false');
  g.run(`__key(P1, C1, 'KeyS', 400); __key(P1, C1, 'Escape', 500);`);
  check('Esc closes it', J(`campPanelOpen(P1)`) === '');
  g.run(`__key(P1, C1, 'KeyS', 600); for (let i = 0; i < 4; i++) __key(P1, C1, 'ArrowDown', 700 + i); var r4 = __key(P1, C1, 'Enter', 800);`);
  check('Down four times is Repair hull: with the hull whole Enter is refused in words, and the list stays open on it (no row of the list opens another list: Dock and repair is switched off)', r4_ok(), J(`[campPanelOpen(P1), r4.row, r4.ok, P1.at].join()`));
  function r4_ok() { return J(`[campPanelOpen(P1), r4.row, r4.ok, P1.at].join()`) === 'cruiser,srepair,false,4' && J(`campPanelList(C1, 'cruiser').every(r => !r.open)`); }
  const scene = readFileSync(new URL('../src/campaignscene.js', import.meta.url), 'utf8');
  check('in the scene S is the zoom\'s reset and then goes on to the list (the other zoom keys and a held S stop at the zoom)', /campZoomPress\(this, zk, e\.repeat\); if \(!zk\.reset \|\| e\.repeat\) return;/.test(scene));
  check('the scene\'s over-the-map door knows the cruiser list\'s key (a list\'s key closes the map and opens the list)', /CAMP_PANELS\.panels\.some\(p => p\.code && p\.code === c\)/.test(scene));
}

console.log('C. the old lists on and off again');
{
  const rows = () => J(`['cruiser', 'nav', 'power', 'ship'].map(id => id + '=' + __ids(id)).join(' ')`);
  g.run(`campFleetListSet(true); campShipListSet(true);`);
  check('both old lists on: the goal and the target are the autopilot list\'s again, the emergency row the power list\'s, the blink the ship list\'s; the cruiser list is off and has none of them', /nav=goal,target,burn,burntarget/.test(rows()) && /power=shields,engines,weapons,balance,emergency(?!,blink)/.test(rows()) && /ship=gpower,gnav,gyard,blink/.test(rows()) && !/cruiser=[^ ]*(goal|emergency|blink)/.test(rows()) && J(`!!campKeyList('cruiser').off`), rows());
  check('the goal row does not burn by itself there', J(`campKeyList('nav').rows[0].fast === undefined`));
  g.run(`campShipListSet(false);`);
  check('the fleet list on, the ship list off: the autopilot list has its first two, the power list its emergency row and the blink', /nav=goal,target,burn,burntarget/.test(rows()) && /power=shields,engines,weapons,balance,emergency,blink/.test(rows()), rows());
  g.run(`campFleetListSet(false); campShipListSet(true);`);
  check('the fleet list off, the ship list on: the cruiser list is the game\'s S list with Mine and Dock only, the other rows are with their old lists', /cruiser=fmine,srepair,gdock/.test(rows()) && /nav=goal,target,burn,burntarget/.test(rows()) && /power=.*emergency/.test(rows()) && /ship=gpower,gnav,gyard,blink/.test(rows()), rows());
  g.run(`campShipListSet(false);`);
  check('both off again: all six rows are the cruiser list\'s in their order, the autopilot list has the burn rows, and again after another round of the switches', __ids_ok());
  g.run(`campFleetListSet(true); campFleetListSet(false); campShipListSet(true); campShipListSet(false);`);
  check('the same after a second round: no row lost, none twice', __ids_ok());
  function __ids_ok() { return J(`__ids('cruiser')`) === 'goal,target,fmine,dock,srepair,gdock,emergency,blink' && J(`__ids('nav')`) === 'burn,burntarget' && J(`campKeyList('cruiser').rows.find(r => r.id === 'goal').fast`) === 'auto'; }
}

console.log('D. the fade');
{
  g.run(`var P2 = campPanelNew(), C2 = __new(2, 0); __key(P2, C2, 'KeyS', 1000); var f0 = campPanelFade(P2, 1000), f1 = campPanelFade(P2, 4999), f2 = campPanelFade(P2, 4000 + 1000 + 250), f3 = campPanelFade(P2, 5500);`);
  check('opened at 1000: full opacity for 4 s (to 5000), half at 4.25 s untouched, closed (opacity 0) at 4.5 s', J(`f0`) === 1 && J(`f1`) === 1 && Math.abs(J(`f2`) - 0.5) < 0.01 && J(`f3`) === 0 && J(`campPanelOpen(P2)`) === '', J(`[f0, f1, f2, f3].join()`));
  g.run(`__key(P2, C2, 'KeyS', 10000); campPanelFade(P2, 10000); __key(P2, C2, 'ArrowDown', 13000); var k1 = campPanelFade(P2, 16999), k2 = campPanelFade(P2, 17000 + 600);`);
  check('a key in the open list starts the count again: Down at 13 s keeps it whole to 17 s, and it is closed by 17.5 s', J(`k1`) === 1 && J(`k2`) === 0 && J(`campPanelOpen(P2)`) === '', J(`[k1, k2].join()`));
  g.run(`__key(P2, C2, 'KeyS', 20000); campPanelFade(P2, 20000); P2.touch = 23000; var c1 = campPanelFade(P2, 26999), c2 = campPanelFade(P2, 27200);`);
  check('a click (the drawing sets P.touch) counts as a touch too', J(`c1`) === 1 && J(`c2`) < 1 && J(`c2`) > 0 && J(`campPanelOpen(P2)`) === 'cruiser', J(`[c1, c2].join()`));
  g.run(`__key(P2, C2, 'Escape', 30000); __key(P2, C2, 'KeyS', 31000); campPanelFade(P2, 31000); campPanelGo(P2, C2, 'yard', '', 'cruiser'); P2.touch = 32000; var y0 = campPanelOpen(P2), y1 = campPanelFade(P2, 36000), y2 = campPanelFade(P2, 36600);`);
  check('a list opened from it by a row (its trail has the cruiser list; campPanelGo with a via, as a part\'s row does) fades with it (the count goes on from the last key)', J(`y0`) === 'yard' && J(`y1`) === 1 && J(`y2`) === 0 && J(`campPanelOpen(P2)`) === '', J(`[y0, y1, y2].join()`));
  g.run(`var P3 = campPanelNew(); campPanelGo(P3, C2, 'nav'); var n1 = campPanelFade(P3, 0), n2 = campPanelFade(P3, 100000);`);
  check('a list that does not fade (the autopilot\'s, with the old lists on in a test) never does', J(`n1`) === 1 && J(`n2`) === 1 && J(`campPanelOpen(P3)`) === 'nav');
  check('the numbers are the table\'s: 4000 ms untouched, 500 ms to go dark', J(`[CAMP_PANELS.anim.idle, CAMP_PANELS.anim.out].join()`) === '4000,500');
}

console.log('E. Emergency shields');
{
  g.run(`var E = __new(2, 0); E.ore = 80; var full = campCheck(E, 'emergency', ''), oreBefore = E.ore;`);
  check('with the shield full it is refused, in words, and costs nothing', J(`[full.ok, full.code, E.ore === oreBefore].join()`) === 'false,shieldfull,true' && J(`full.say`) === 'The shields are full, pilot.');
  g.run(`E.shield = 40; E.ore = 49; var poor = campCheck(E, 'emergency', '');`);
  check('with 49 ore it is refused: 50 needed', J(`[poor.ok, poor.code].join()`) === 'false,noore2' && /50 needed/.test(J(`poor.say`)), J(`poor.say`));
  g.run(`E.ore = 80; var pw0 = E.power.p.join(); var ok1 = campOrder(E, 'emergency', '', 'key');`);
  check('with the ore it fills the shield at once and takes 50 ore; the power pips are not touched', J(`[ok1.ok, E.shield === campShieldMax(E), E.ore, E.power.p.join() === pw0, E.orders.emergency].join()`) === 'true,true,30,true,1', J(`[ok1.say, E.shield, E.ore].join('|')`));
  g.run(`E.shield = 10; E.ore = 100; var cool = campCheck(E, 'emergency', ''); var row1 = __rowof(E, 'emergency');`);
  check('at once again it is refused: cooling, 20 seconds; the row is grey and says 20 s', J(`[cool.ok, cool.code].join()`) === 'false,cooling' && /in 20 seconds/.test(J(`cool.say`)) && J(`[row1.ok, row1.short, row1.state].join('|')`) === 'false|20 s|ready in 20 s' || J(`[row1.ok, row1.short].join('|')`) === 'false|20 s', J(`[cool.say, row1.ok, row1.short, row1.state].join('|')`));
  g.run(`__run(E, 19); var still = campCheck(E, 'emergency', '').code; __run(E, 2); E.shield = 10; var again = campOrder(E, 'emergency', '', 'key');`);
  check('still cooling at 19 s, given again after 20 s', J(`still`) === 'cooling' && J(`[again.ok, E.shield === campShieldMax(E), E.ore].join()`) === 'true,true,50', J(`[still, again.ok, E.ore].join()`));
  g.run(`E.t += 30000; E.shield = 10; E.ore = 60; var row2 = __rowof(E, 'emergency'), live = [row2.ok, row2.short, row2.state].join('|');`);
  check('the ready row says what it costs: 50 ore', J(`live`) === 'true|50 ore|50 ore: the shields fill at once', J(`live`));
  g.run(`var Cs = __new(2, 0); Cs.shield = 10; Cs.ore = 100; Cs.carrier.hp = Cs.carrier.hp; var viaList = campPanelRun(Cs, campPanelList(Cs, 'cruiser').find(r => r.id === 'emergency'), 'key');`);
  check('the list\'s row runs the order (campPanelRun)', J(`[viaList.ok, Cs.shield === campShieldMax(Cs), Cs.ore].join()`) === 'true,true,50');
  check('the N panel has both numbers: ore (50) and the wait (20000 ms), changed live, and put back', J(`[CAMP.emergency.ore, CAMP.emergency.cooldown, campTuneRow('emergencyore').path, campTuneRow('emergencycool').path, campTuneValue('emergencyore'), campTuneValue('emergencycool')].join()`) === '50,20000,emergency.ore,emergency.cooldown,50,20000' && (g.run(`campTuneSet('emergencyore', 100); campTuneSet('emergencycool', 5000);`), J(`[CAMP.emergency.ore, CAMP.emergency.cooldown].join()`) === '100,5000') && (g.run(`campTuneResetAll();`), J(`[CAMP.emergency.ore, CAMP.emergency.cooldown].join()`) === '50,20000'));
  check('the N panel\'s words for both rows are there', J(`[uiText('camp.ui.tune.row.emergencyore'), uiText('camp.ui.tune.row.emergencycool')].join('|')`) === 'Emergency shields: ore|Emergency shields: wait');
}

console.log('F. Fly to the goal burns by itself');
{
  g.run(`CAMP.bay.startOut = true;`); // the game's start: the pilots begin out, and the burn tows them (card space-game-burn-with-wing-out)
  g.run(`var F = __new(2, 0); var gr = campPanelList(F, 'cruiser').find(r => r.id === 'goal'), st = __rowof(F, 'goal'); var rr = campPanelRun(F, gr, 'key');`);
  check('Alpha Centauri B is 5,790 px away, nothing hostile near, the pilots out (as the game starts them): the row says it burns, and Enter flies there at the burn', J(`st.state`).endsWith(', burns') && J(`[rr.ok, F.nav.on, F.nav.fast, F.nav.auto, F.nav.burn > 1].join()`) === 'true,true,true,true,true', J(`[st.state, rr.say, F.nav && F.nav.fast].join('|')`));
  check('and says so: "full burn"', /full burn/.test(J(`rr.say`)), J(`rr.say`));
  g.run(`var F2 = __new('home', 0); var gr2 = campPanelList(F2, 'cruiser').find(r => r.id === 'goal'), st2 = __rowof(F2, 'goal'); var rr2 = campPanelRun(F2, gr2, 'key');`);
  check('a short leg (Earth, 383 px) goes at the regular speed and does not say it burns', J(`[rr2.ok, F2.nav.on, F2.nav.fast, !!F2.nav.auto].join()`) === 'true,true,false,false' && !/burns/.test(J(`st2.state`)), J(`st2.state`));
  g.run(`var F3 = __new(2, 0); campOrder(F3, 'launch', '', 'key'); var out3 = campNavOut(F3), rr3 = campPanelRun(F3, campPanelList(F3, 'cruiser').find(r => r.id === 'goal'), 'key');`);
  check('with a ship out it burns all the same (the wing is towed): nothing is asked of the wing and nobody is recalled', J(`out3 > 0`) && J(`[rr3.ok, F3.nav.on, F3.nav.fast, !!F3.nav.auto, F3.orders.recall].join()`) === 'true,true,true,true,0', J(`rr3.say`));
  g.run(`var F4 = __new(2, 1); var al = F4.ships.filter(u => u.team === 'alien'); var near0 = Math.min(...al.map(u => campDist(u, F4.carrier))); al[0].x = F4.carrier.x + 2500; al[0].y = F4.carrier.y; var rr4 = campPanelRun(F4, campPanelList(F4, 'cruiser').find(r => r.id === 'goal'), 'key');`);
  check('with a hostile within 4,000 px it flies at the regular speed', J(`near0 > 4000`) && J(`[rr4.ok, F4.nav.on, F4.nav.fast].join()`) === 'true,true,false', J(`near0`));
  g.run(`var F5 = __new(2, 1); var al5 = F5.ships.filter(u => u.team === 'alien'); var rr5 = campPanelRun(F5, campPanelList(F5, 'cruiser').find(r => r.id === 'goal'), 'key'); var b0 = F5.nav.fast && F5.nav.auto; F5.events.length = 0; al5[0].x = F5.carrier.x + 2500; al5[0].y = F5.carrier.y; __run(F5, 1);`);
  check('a burn that began by itself ends by itself when a hostile comes within 4,000 px: the trip goes on at the regular speed and the computer says so', J(`b0`) === true && J(`[F5.nav.on, F5.nav.fast, !!F5.nav.auto, F5.nav.burn].join()`) === 'true,false,false,1' && J(`F5.events.some(e => e.type === 'nav' && e.key === 'camp.nav.burnfoe')`) && J(`uiText('camp.nav.burnfoe')`) === 'Hostiles near: burn off.', J(`F5.nav && [F5.nav.fast, F5.nav.auto].join()`));
  g.run(`var F6 = __new(2, 0); campShipListSet(true); campFleetListSet(true); var old = campPanelRun(F6, campKeyList('nav').rows.find(r => r.id === 'goal'), 'key'); campFleetListSet(false); campShipListSet(false);`);
  check('the old autopilot list\'s Fly to the goal still goes at the regular speed (only the cruiser list\'s row burns by itself)', J(`[old.ok, F6.nav.on, F6.nav.fast].join()`) === 'true,true,false');
  g.run(`var F7 = __new(2, 0); campShipListSet(true); campFleetListSet(true); var bn = campPanelRun(F7, campKeyList('nav').rows.find(r => r.id === 'burn'), 'key'); campFleetListSet(false); campShipListSet(false);`);
  check('the old burn row still burns when it is asked for in a test (the parked list is as it was)', J(`[bn.ok, F7.nav.fast, !!F7.nav.auto].join()`) === 'true,true,false');
  g.run(`var F8 = __new(2, 0), st8 = __rowof(F8, 'goal'), rr8 = campPanelRun(F8, campPanelList(F8, 'cruiser').find(r => r.id === 'goal'), 'key');`);
  check('the pilots start each mission out: the row says it burns all the same and flies at the burn (they are towed), no recall', /, burns$/.test(J(`st8.state`)) && !/wing out/.test(J(`st8.state`)) && J(`[rr8.ok, F8.nav.on, F8.nav.fast, campNavOut(F8) > 0, F8.orders.recall].join()`) === 'true,true,true,true,0', J(`st8.state`));
  check('the numbers are the table\'s: a leg of 3,000 px, a hostile within 4,000', J(`[CAMP.nav.auto.leg, CAMP.nav.auto.near].join()`) === '3000,4000');
}

console.log('G. the words');
{
  check('the key line names S Cruiser and no Q', J(`campKeyLine()`).includes('S Cruiser') && !/\bQ\b/.test(J(`campKeyLine()`)), J(`campKeyLine()`));
  check('the H page\'s list rows have a line for S ("Cruiser: fly, mine, repair, shields", at most 43 characters with its cap) and none for Q', J(`campPanelKeyRows().some(r => r.k.join() === 'S' && r.t === 'Cruiser: fly, mine, repair, shields' && (r.k.join().length + 3 + r.t.length) <= 43)`) && !J(`campPanelKeyRows().some(r => r.k.join() === 'Q')`));
  check('the pause card says S is the cruiser and what is in it', J(`uiText('camp.ui.pausepanels')`).includes('S the cruiser: fly, mine, dock, repair, shields.'), J(`uiText('camp.ui.pausepanels')`));
  check('the hints read S from the table: the Mine row (via the cruiser list) and the emergency row', J(`campKeyVar('viafmine')`) === 'S' && J(`campKeyVar('viaemergency')`) === 'S' && J(`campKeyVar('cruiserkey')`) === 'S', J(`[campKeyVar('viafmine'), campKeyVar('viaemergency'), campKeyVar('cruiserkey')].join()`));
  check('the briefing\'s key box for the shield names the cruiser list, not Power', J(`uiText('camp.bf.key.shield')`) === 'Cruiser list: Emergency shields', J(`uiText('camp.bf.key.shield')`));
}

console.log('H. Repair hull replaces Dock and repair (card space-game-keys3-repair)');
{
  check('the table keeps Dock and repair, switched off (`off`), beside the new Repair hull row (the S list\'s own, the ore repair of the dock list): in the game the S list shows Repair hull and Dock at the outpost, never Dock and repair', J(`__ids('cruiser')`) === 'goal,target,fmine,dock,srepair,gdock,emergency,blink' && J(`campKeyList('cruiser').rows.filter(r => r.off).map(r => r.id).join()`) === 'gdock' && J(`campKeyList('cruiser').rows.find(r => r.id === 'srepair').label`) === 'Repair hull' && !J(`campPanelList(__new(2, 0), 'cruiser').some(r => r.id === 'gdock')`), J(`__ids('cruiser')`));
  check('the dock list has no way in (nothing opens it) but keeps its rows (the Dock row is the S list\'s now, the repair and the ward row stay there)', J(`__ids('yard')`) === 'repairhull,repairward' && J(`campKeyList('yard').key`) === '' && J(`campKeyVia('dock').id`) === 'cruiser');
  g.run(`var H1 = __new(3, 0); H1.carrier.hp = H1.carrier.maxHp - 100; H1.ore = 200; var hrow = __rowof(H1, 'srepair'), hrun = campPanelRun(H1, campPanelList(H1, 'cruiser').find(r => r.id === 'srepair'), 'key');`);
  check('a hurt hull with the ore: the row is lit and says what it costs (ore and seconds); Enter pays the ore and starts the mend, anywhere in space', J(`[hrow.ok, /^\\d+ ore, \\d+ s$/.test(hrow.state), /^\\d+ ore$/.test(hrow.short)].join()`) === 'true,true,true' && J(`[hrun.ok, H1.ore < 200, H1.mends.length].join()`) === 'true,true,1', J(`[hrow.state, hrow.short, hrun.say].join('|')`));
  g.run(`var H2 = __new(3, 0); H2.carrier.hp = H2.carrier.maxHp - 100; H2.ore = 5; var lowrow = __rowof(H2, 'srepair'); var H3 = __new(3, 0); var fullrow = __rowof(H3, 'srepair');`);
  check('short of ore the row is grey and says why: "needs N ore"', J(`lowrow.ok`) === false && /^needs \d+ ore$/.test(J(`lowrow.short`)) && /needs \d+ ore/.test(J(`lowrow.state`)), J(`[lowrow.state, lowrow.short].join('|')`));
  check('the whole hull: grey, "the hull is sound" / "hull sound"', J(`[fullrow.ok, fullrow.state, fullrow.short].join('|')`) === 'false|the hull is sound|hull sound');
  g.run(`var H4 = __new(2, 0); var gr4 = campPanelList(H4, 'cruiser').find(r => r.id === 'goal'); campPanelRun(H4, gr4, 'key'); var says4 = __rowof(H4, 'goal').state, tr4 = __rowof(H4, 'target').state;`);
  check('the top-left HUD no longer says where the autopilot is going (card space-game-hud-topleft-trim), so the goal row says it: ", flying there" while the trip is on', /, flying there$/.test(J(`says4`)), J(`says4`));
  g.run(`campFleetListSet(true); campShipListSet(true); var yr = __ids('yard'), cr2 = __ids('cruiser'); campFleetListSet(false); campShipListSet(false);`);
  check('with the old lists on every row is where it was: the dock list has Dock first, Dock and repair is the cruiser list\'s only row (with Mine, if the squads list is off), Repair hull is off', J(`yr`) === 'dock,repairhull,repairward' && J(`cr2`) === 'srepair,gdock', J(`[yr, cr2].join(' / ')`));
  check('the ids of the two rows are unique in the table (srepair is the S list\'s, repairhull the dock list\'s): the old suites can still name each', J(`new Set(CAMP_PANELS.panels.flatMap(p => p.rows.map(r => r.id))).size === CAMP_PANELS.panels.flatMap(p => p.rows).length`));
}

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
