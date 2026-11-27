// smoke: the Campaign keys of card space-game-keys6-enter (Troy, 24 Nov 2026): E the next friendly (ships you protect only, never a pilot; [ does nothing), Enter the one order (not with a list that takes Enter open, not just after a card closes), M a missile at the target, mute off M in a battle (Settings, from the pause card with S), Q then 3 mines the nearest ore by itself, Q then 7 forms every pilot up (plain Node, no Chrome)
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
  window.C = campNew('home', [], { seed: 3, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien'); C.rocks = []; /* (a rock field is an E target since card space-game-orders-f3-enter-fits; these checks are about the ships) */ campOrder(C, 'launch'); __run(C, 8); window.P = campPanelNew();
  const f = campSpawn(C, 'freighter', C.carrier.x + 500, C.carrier.y); f.id = 'freighter-t1'; C.by[f.id] = f; f.cname = 'Transport'; f.named = true;
  campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y);`);
const k = (code, now) => J(`(() => { const r = campPanelKey(P, C, '${code}', ${now || 0}); return { used: r.used, ran: r.ran, ok: r.ok, open: r.open, row: r.row, say: r.say }; })()`);

check('the table: E the friendlies, Enter and the keypad Enter the order, Z the missile (card space-game-missile-key-z: it was M), S settings; [ and X are no key; mute is no key of the table', J(`[CAMP_KEYS.friendlies.codes.join(), CAMP_KEYS.order.codes.join(), CAMP_KEYS.missile.codes.join(), CAMP_KEYS.settings.codes.join()].join('|')`) === 'KeyE|Enter,NumpadEnter|KeyZ|KeyS' && !J(`campKeyIs('friendlies', 'BracketLeft')`) && J(`CAMP_KEYS.mute`) === null);
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
const m = k('KeyZ', 20000);
check('Z fires a missile at the target (with a list open too)', m.used && m.ran && m.row === 'missile');
check('M mutes nothing in a battle (and fires nothing now: it was the missile until card space-game-missile-key-z): meta.js asks campHoldsM, true while the Campaign scene is up', /campHoldsM/.test(readFileSync(ROOT + '/src/meta.js', 'utf8')) && J(`campHoldsM({ scene: { getScenes: () => [{ scene: { key: 'Campaign' } }] } })`) === true && J(`campHoldsM({ scene: { getScenes: () => [{ scene: { key: 'Title' } }] } })`) === false);
check('the pause card names S settings, and the Campaign scene opens Settings on S in pause (settingsOpen)', /S\s+settings/.test(J(`uiText('camp.ui.paused')`)) && /campKeyIs\('settings', c\) && typeof settingsOpen === 'function'\) settingsOpen\(this/.test(readFileSync(ROOT + '/src/campaignscene.js', 'utf8')));
g.run(`window.C2 = campNew('home', [], { seed: 3, god: true }); C2.ships = C2.ships.filter(u => u.team !== 'alien'); campOrder(C2, 'launch'); __run(C2, 8); window.P2 = campPanelNew(); window.R2 = C2.rocks.filter(r => r.hp > 0).length;`);
const m3 = J(`(() => { campPanelKey(P2, C2, 'KeyQ', 0); const r = campPanelKey(P2, C2, 'Digit3', 0); return { ran: r.ran, row: r.row, open: r.open, ids: campPanelList(C2, 'cruiser').map(x => x.id).join(), mined: campWingShips(C2, 'red').some(u => u.order && u.order.type === 'mine') }; })()`);
check('Q then 3 no longer mines (card space-game-orders-f5-q-cruiser-only: Mine ore left the Q row, mining is W a pilot, E a rock field, Enter: tests/campfieldtarget.mjs): the row is not in the list and 3 is Dock at the outpost, no pilot is sent to mine', J('R2') > 0 && !m3.ids.includes('fmine') && m3.row === 'dock' && !m3.mined, JSON.stringify(m3));
check('the whole wing mines at once through its own order (what the bots give): the nearest ore, no field to pick', J(`(() => { const r = campWingOrder(C2, 'fighters', 'mine', null, 'key'); return r.ok && campWingShips(C2, 'red').every(u => u.order && u.order.type === 'mine'); })()`));
g.run(`window.C3 = campNew('home', [], { seed: 3, god: true }); C3.ships = C3.ships.filter(u => u.team !== 'alien'); campOrder(C3, 'launch'); __run(C3, 8); C3.rocks.forEach(r => { r.hp = 0; }); C3.pickups.length = 0; window.P3 = campPanelNew(); campPanelKey(P3, C3, 'KeyQ', 0);`);
const none = J(`(() => { const r = campWingOrder(C3, 'fighters', 'mine', null, 'key'); return { ok: r.ok, say: r.say }; })()`);
check('no ore in reach: the wing\'s mine order says so in the usual short no-line', !none.ok && none.say === J(`uiText('camp.no.noore')`), JSON.stringify(none));
check('Q then 6 (Form up on me, the last row: the seventh before Mine ore left, card space-game-orders-f5-q-cruiser-only) forms up every pilot, whoever is picked (card space-game-keys7-trim)', (() => { k('KeyQ', 30000); const r = k('Digit6', 30001); return r.ran && r.ok && r.row === 'formup' && J(`['red', 'green', 'yellow'].every(s => campWingShips(C, s).every(u => u.order.type === 'guard'))`); })());
check('the warp blink is off (card space-game-keys7-trim): its tech is not offered after level 1, its Q row is off, and campBlinkSet(true) brings both back', (() => { const off = J('campTechChoices(1).join()') === 'shield,beam' && J(`campPanelDef('cruiser').rows.find(r => r.id === 'blink').off`) === 1; g.run('campBlinkSet(true)'); const on = J('campTechChoices(1).includes("blink")') && J(`campPanelDef('cruiser').rows.find(r => r.id === 'blink').off`) === 0; g.run('campBlinkSet(false)'); return off && on; })());
check('Z with no enemy picked picks the nearest and fires at it; the Reload row is off the Q list but R still queues a missile', (() => { g.run(`C.tgt = ''; C.fsel = ''; C.missiles = 6;`); const r = k('KeyZ', 40000); const picked = J('C.tgt') !== ''; const rl = k('KeyR', 41000); return r.ran && picked && rl.used && rl.row === 'sreload' && !J(`campPanelList(C, 'cruiser').some(x => x.id === 'sreload')`); })());
if (failed) { console.log('KEYS6 FAIL (' + failed + ')'); process.exit(1); } else console.log('KEYS6 OK');
