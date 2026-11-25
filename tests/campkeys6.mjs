// smoke: the Campaign keys of card space-game-keys6-enter (Troy, 24 Nov 2026): E the next friendly (ships you protect only, never a pilot; [ does nothing), Enter the one order (not with a list that takes Enter open, not just after a card closes), M a missile at the target, mute off M in a battle (Settings, from the pause card with S), Q then 3 mines the nearest ore by itself, W then 5 forms every pilot up (plain Node, no Chrome)
// Run: node tests/campkeys6.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

let failed = 0;
const check = (name, cond, detail = '') => { if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const ROOT = fileURLToPath(new URL('..', import.meta.url));
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`window.__run = (C, s) => { for (let i = 0; i < Math.round(s * 30) && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.C = campNew('home', [], { seed: 3, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien'); campOrder(C, 'launch'); __run(C, 8); window.P = campPanelNew();
  const f = campSpawn(C, 'freighter', C.carrier.x + 500, C.carrier.y); f.id = 'freighter-t1'; C.by[f.id] = f; f.cname = 'Transport'; f.named = true;
  campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y);`);
const k = (code, now) => J(`(() => { const r = campPanelKey(P, C, '${code}', ${now || 0}); return { used: r.used, ran: r.ran, ok: r.ok, open: r.open, row: r.row, say: r.say }; })()`);

check('the table: E the friendlies, Enter and the keypad Enter the order, M the missile, S settings; [ and X are no key; mute is no key of the table', J(`[CAMP_KEYS.friendlies.codes.join(), CAMP_KEYS.order.codes.join(), CAMP_KEYS.missile.codes.join(), CAMP_KEYS.settings.codes.join()].join('|')`) === 'KeyE|Enter,NumpadEnter|KeyM|KeyS' && !J(`campKeyIs('friendlies', 'BracketLeft')`) && J(`CAMP_KEYS.mute`) === null);
const e = k('KeyE');
check('E picks a friendly: the transport, a ship you protect, never a pilot', e.used && J('C.fsel') === 'freighter-t1' && !/^pilot|fighter/.test(J('C.fsel')) && J(`campFriList(C).every(x => x.kind !== 'pilot' && x.kind !== 'fighter')`));
g.run(`C.fsel = '';`); const b = k('BracketLeft');
check('[ does nothing from now on', !b.used && J('C.fsel') === '');
k('KeyE'); const o = k('Enter', 5000);
check('Enter gives the order: the friendly picked, the pilots guard it', o.used && o.ran && o.ok && o.row === 'guard');
g.run(`campPanelHold(P, 8000);`); const hd = k('Enter', 8100);
check('Enter just after a card closed is taken and gives no order (the 0.4 s lock)', hd.used && !hd.ran);
const q = k('KeyQ', 9000), en = k('Enter', 9100);
check('Enter with the numbered Q list open is still the order (the digits do the rows; Enter is the ship\'s)', q.open === 'cruiser' && en.ran && en.open === 'cruiser');
k('Escape', 9200);
g.run(`campPanelGo(P, C, 'convoy');`); const cv = k('Enter', 9300);
check('Enter with a list that takes Enter open (the convoy list) is the list\'s: the order is not given through it', cv.row !== 'attack' && cv.row !== 'guard');
g.run(`campPanelClose(P); campSpawn(C, 'raider', C.carrier.x + 700, C.carrier.y);`);
const m = k('KeyM', 20000);
check('M fires a missile at the target (with a list open too)', m.used && m.ran && m.row === 'missile');
check('M mutes nothing in a battle: meta.js asks campHoldsM, true while the Campaign scene is up', /campHoldsM/.test(readFileSync(ROOT + '/src/meta.js', 'utf8')) && J(`campHoldsM({ scene: { getScenes: () => [{ scene: { key: 'Campaign' } }] } })`) === true && J(`campHoldsM({ scene: { getScenes: () => [{ scene: { key: 'Title' } }] } })`) === false);
check('the pause card names S settings, and the Campaign scene opens Settings on S in pause (settingsOpen)', /S\s+settings/.test(J(`uiText('camp.ui.paused')`)) && /campKeyIs\('settings', c\) && typeof settingsOpen === 'function'\) settingsOpen\(this/.test(readFileSync(ROOT + '/src/campaignscene.js', 'utf8')));
g.run(`window.C2 = campNew('home', [], { seed: 3, god: true }); C2.ships = C2.ships.filter(u => u.team !== 'alien'); campOrder(C2, 'launch'); __run(C2, 8); window.P2 = campPanelNew(); window.R2 = C2.rocks.filter(r => r.hp > 0).length;`);
const m3 = J(`(() => { campPanelKey(P2, C2, 'KeyQ', 0); const r = campPanelKey(P2, C2, 'Digit3', 0); return { ran: r.ran, ok: r.ok, row: r.row, open: r.open, pick: !!P2.pick }; })()`);
check('Q then 3 mines the nearest ore at once: the order is given, no field to pick, the list closes', J('R2') > 0 && m3.ran && m3.ok && m3.row === 'fmine' && !m3.pick && m3.open === '');
g.run(`window.C3 = campNew('home', [], { seed: 3, god: true }); C3.ships = C3.ships.filter(u => u.team !== 'alien'); campOrder(C3, 'launch'); __run(C3, 8); C3.rocks.forEach(r => { r.hp = 0; }); C3.pickups.length = 0; window.P3 = campPanelNew(); campPanelKey(P3, C3, 'KeyQ', 0);`);
const none = J(`(() => { const r = campPanelKey(P3, C3, 'Digit3', 0); return { ran: r.ran, ok: r.ok, say: r.say, open: r.open }; })()`);
check('no ore in reach: Q then 3 says so in the usual short no-line and the list stays open', none.ran && !none.ok && none.say === J(`uiText('camp.no.noore')`) && none.open === 'cruiser', JSON.stringify(none));
check('W then 5 forms up every pilot when All pilots is picked', (() => { k('KeyW', 30000); k('Digit4', 30000); k('KeyW', 30001); const r = k('Digit5', 30001); return r.ran && r.ok && J(`['red', 'green', 'yellow'].every(s => campWingShips(C, s).every(u => u.order.type === 'guard'))`); })());
if (failed) { console.log('KEYS6 FAIL (' + failed + ')'); process.exit(1); } else console.log('KEYS6 OK');
