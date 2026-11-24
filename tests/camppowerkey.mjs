// smoke: the POWER and AUTOPILOT lists have no key (O and P are the friendlies' since card space-game-keys2-select), the SHIP list is switched off behind CAMP_SHIP_LIST, the blink row lives in the power list meanwhile; campShipListSet(true) gives the old keys back (plain Node, no Chrome)
// Cards space-game-p-opens-power (Troy, 23 Nov 2026: "P should just open the power list"), space-game-autopilot-on-o (the autopilot list moved from I to O) and space-game-keys2-select (Troy, 23 Nov 2026: O and P pick friendlies; the two lists have no key, other cards remove them). The switch and the keys are src/data_controls.js (CAMP_SHIP_LIST, campShipListSet, CAMP_PANELS), the door src/camppanel.js.
//   A. the table as the game has it: the ship list off (no key, no code, `off`), the power list and the autopilot no key at all, I nobody's, the parts have no parent, the blink row is the power list's last row
//   B. the keys: O and P open no list (they pick friendlies, with a list open too); the power list is reached by campPanelGo on its first row; U and I open nothing; Enter adds a shield pip and leaves the list open; Left goes nowhere; Esc closes
//   C. the blink: with its tech the row is the last of the power list and Enter on it asks for the hop; without the tech the row is left out
//   D. the words: the key line, the H page, the pause card, the hints and what the model is told name only Q's list: no power list, no autopilot list, no ship list
//   E. the switch: campShipListSet(true) gives P the ship list back (and the old keys: O power, I the autopilot; the parts' parent; the blink row in the ship list), false takes them away again
//   F. through the scene: O and P pick friendlies and open nothing, S's door opens the cruiser list over the map
// Run: node tests/camppowerkey.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
g.run('campPowerSet(true)'); // the pips are OFF in the game (card space-game-power-removed; CAMP_POWER in src/data_controls.js): this suite is about them (the list, J K L, the bars, the pip orders), so it switches them on. The game as it is now: tests/powerremoved.mjs
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__new = (techs) => campNew('home', techs || [], { seed: 5, god: true, mission: 0 });
  window.__key = (P, C, code, now) => campPanelKey(P, C, code, now || 0);
`);

console.log('A. the table as the game has it');
{
  check('CAMP_SHIP_LIST is false: the ship list is off (no key, no code, the `off` mark) and keeps its rows (power, autopilot, dock) for the switch', J('CAMP_SHIP_LIST') === false && J(`(() => { const s = campKeyList('ship'); return [s.key, s.code, s.off, s.rows.map(r => r.id).join()]; })()`).join('|') === '||true|gpower,gnav,gyard');
  check('the power list and the autopilot have no key and no code (O and P are the friendlies\': flast KeyO, fnext KeyP), the dock list has no key (it is a row of the cruiser list: card space-game-keys-orders); I is nobody\'s', J(`(() => { const p = campKeyList('power'), n = campKeyList('nav'); return [p.key, p.code, p.alt, p.altkey, n.key, n.code, campKeyList('yard').key]; })()`).join() === ',,,,,,' && J(`CAMP_KEYS.flast.codes.join() + '|' + CAMP_KEYS.fnext.codes.join()`) === 'KeyO|KeyP' && J(`CAMP_PANELS.panels.every(p => !['KeyI', 'KeyO', 'KeyP'].includes(p.code) && p.alt !== 'KeyI')`) && !J(`Object.values(CAMP_KEYS).some(k => k.codes.indexOf('KeyI') >= 0)`));
  check('the power list and the autopilot have no parent now (Left has nowhere to go back to), the dock list is a part of the cruiser list, and the one keyed list is S', J(`['power', 'nav', 'yard'].map(id => campKeyList(id).parent).join('|')`) === '||cruiser' && J(`CAMP_PANELS.panels.filter(p => p.key).map(p => p.key).join('')`) === 'S');
  check('the blink row, which only the ship list had, is the last row of the cruiser list (card space-game-keys2-cruiser took it, and the emergency row, out of the power list)', J(`campKeyList('power').rows.map(r => r.id).join()`) === 'shields,engines,weapons,balance' && J(`campKeyList('cruiser').rows.map(r => r.id).pop()`) === 'blink' && J(`campKeyVia('blink').id`) === 'cruiser');
}

console.log('B. the keys');
{
  g.run(`window.__ward = (C, id, dx) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y); f.id = 'freighter-' + id; C.by[f.id] = f; f.dest = { x: C.carrier.x + 9000, y: C.carrier.y }; f.cname = 'Ward ' + id; f.named = true; return f; };`); // a ship to protect: O and P cycle ships only (card space-game-keys3-select), the home level has none of its own
  g.run(`window.C1 = __new(); window.P1 = campPanelNew(); __ward(C1, 't1', 500); __ward(C1, 't2', 900);`);
  const p1 = J(`__key(P1, C1, 'KeyP')`), o1 = J(`__key(P1, C1, 'KeyO')`);
  check('P and O open no list: each is used (the friendlies\' keys: C.fsel is a ship you protect, never a place) and no list is open', p1.used === true && p1.open === '' && o1.used === true && o1.open === '' && J(`campPanelOpen(P1)`) === '' && /^freighter-/.test(J('C1.fsel')) && J('C1.tgt') === '');
  g.run(`campPanelGo(P1, C1, 'power');`);
  const sh = J(`campPanelView(P1, C1)`);
  check('the power list opens (campPanelGo) on its first row (shields), no ship list in between, and its view has no key', J('campPanelOpen(P1)') === 'power' && sh.id === 'power' && sh.rows[0].id === 'shields' && sh.title === 'POWER' && !sh.key, JSON.stringify([sh.id, sh.title, sh.key]));
  check('with the power list open P and O still pick friendlies and the list stays open on its row; the autopilot list opens in its place by campPanelGo (one list at a time)', (() => { const at = J('P1.at'), f0 = J('C1.fsel'); g.run(`__key(P1, C1, 'KeyP')`); const a = J('campPanelOpen(P1)') === 'power' && J('P1.at') === at && J('C1.fsel') !== f0; g.run(`__key(P1, C1, 'KeyO')`); return a && J('campPanelOpen(P1)') === 'power' && J('C1.fsel') === f0 && (g.run(`campPanelGo(P1, C1, 'nav')`), J('campPanelOpen(P1)') === 'nav') && (g.run(`campPanelClose(P1)`), true); })());
  check('from another list the power list opens in place of it (campPanelGo: one list at a time)', (g.run(`__key(P1, C1, 'KeyS')`), J('campPanelOpen(P1)') === 'cruiser') && (g.run(`campPanelGo(P1, C1, 'power')`), J('campPanelOpen(P1)') === 'power') && (g.run(`campPanelClose(P1)`), true));
  g.run(`campPanelClose(P1); window.pw0 = C1.power.p.slice();`);
  const e = J(`(() => { campPanelGo(P1, C1, 'power'); const r = __key(P1, C1, 'Enter', 100); return { r, open: campPanelOpen(P1), p: C1.power.p.join() }; })()`);
  check('Enter on its first row gives a pip of power (the shields) and the list stays open for the next', e.r.ran === true && e.open === 'power' && e.p !== J('pw0.join()') && e.r.row === 'shields', JSON.stringify(e));
  check('Left in the power list goes nowhere (no list it is a part of): it stays open on its row', (() => { g.run(`__key(P1, C1, 'ArrowDown', 0);`); const at = J('P1.at'), r = J(`__key(P1, C1, 'ArrowLeft')`); return r.used === true && r.open === 'power' && J('P1.at') === at; })());
  check('Esc closes it, and a list\'s foot does not offer "Left back": the foot of the open list is the one of a list opened on its own', (() => { g.run(`campPanelClose(P1); campPanelGo(P1, C1, 'power');`); const v = J(`campPanelView(P1, C1)`); const out = v.keys === 'camp.ui.listkeys' && J(`__key(P1, C1, 'Escape').open`) === ''; return out; })());
  check('the autopilot list (campPanelGo) has Left nowhere; U and I open nothing, with a list open or not; nothing opens the dock list any more (S, Down five times to Dock and repair would be its row, which is switched off: card space-game-keys3-repair)', (g.run(`campPanelClose(P1); campPanelGo(P1, C1, 'nav')`), J('campPanelOpen(P1)') === 'nav') && J(`__key(P1, C1, 'ArrowLeft').open`) === 'nav' && J(`__key(P1, C1, 'KeyU').used`) === false && J(`__key(P1, C1, 'KeyI').used`) === false && J(`campPanelOpen(P1)`) === 'nav' && (g.run(`campPanelClose(P1)`), J(`__key(P1, C1, 'KeyI').used`) === false && J(`campPanelOpen(P1)`) === '') && (g.run(`__key(P1, C1, 'KeyS')`), J(`campPanelOpen(P1)`) === 'cruiser') && J('campPanelList(C1, "cruiser")').every(r => !r.open) && (g.run(`campPanelClose(P1)`), true));
  check('campPanelGo on the ship list opens nothing (it is off): nothing goes back to it', (g.run(`campPanelClose(P1); campPanelGo(P1, C1, 'ship');`), J('campPanelOpen(P1)') === ''));
}

console.log('C. the warp blink');
{
  g.run(`window.C2 = __new(['blink']); window.P2 = campPanelNew();`);
  check('with the blink tech the cruiser list shows the row last, "Warp blink ahead" (it says ready)', J(`campPanelRows(C2, 'cruiser').map(r => r.id).join()`) === 'goal,target,fmine,dock,srepair,sreload,emergency,blink' && J(`campPanelRows(C2, 'cruiser').pop().state`) === 'ready');
  check('the cruiser list, the digit 8 (the blink is the eighth row, card space-game-s-list-numbers: it was Up round to the last row and Enter) asks for the hop and closes the list; the row says it cooled after', (() => { g.run(`__key(P2, C2, 'KeyS'); window.rb = __key(P2, C2, 'Digit8', 200);`); return J('rb.ran') === true && J('rb.ok') === true && J('rb.row') === 'blink' && J('C2.input.blink') === true && J('campPanelOpen(P2)') === ''; })());
  check('without the tech the row is left out of the cruiser list (a row that can never be used is not there)', J(`campPanelList(__new(), 'cruiser').map(r => r.id).join()`) === 'goal,target,fmine,dock,srepair,sreload,emergency');
}

console.log('D. the words');
{
  check('the table names S Cruiser and nothing else of the lists (no ship list, no power, no autopilot, no I, no W or U) and the bottom line is the flying keys only', J('campPanelKeyLine()') === 'S Cruiser    ' && J(`campKeyLine()`) === 'Arrows fly  Space turrets  Enter missile  Tab Map  H Keys');
  check('{powerkey}, {shipkey} and {navkey} say nothing (no key); {viaemergency} and {viablink} are S (the cruiser list\'s rows) and so is {yardkey} (the dock list is a row of the cruiser list)', J(`['powerkey', 'shipkey', 'viaemergency', 'viablink', 'navkey', 'yardkey'].map(campKeyVar).join('|')`) === '||S|S||S');
  check('the H page: one line for the cruiser list (S) and none for the power list, the autopilot, the ship list or the dock list (a row of the cruiser list)', J(`controlsGroup('panels').rows.slice(0, 1).map(r => r.k.join(' ') + ':' + r.t).join('|')`) === 'S:Cruiser: fly, mine, repair, shields' && !J(`controlsGroup('panels').rows.some(r => /ship orders|^Power:|^Autopilot:/i.test(r.t))`) && J(`controlsGroup('panels').rows.slice(0, 1).every(r => r.k.join(' ').length + 3 + r.t.length <= 43)`));
  check('the pause card says S the cruiser (fly, mine, dock, shields), and no power, no autopilot, no ship orders', J(`uiText('camp.ui.pausepanels')`).includes('S the cruiser: fly, mine, dock, repair, shields') && !/power|autopilot|ship orders/.test(J(`uiText('camp.ui.pausepanels')`)));
  check('the first hints name the right keys: the blink tech says "S list, Warp blink ahead", the dock hint S, the emergency shields S (the cruiser list)', J(`uiText('camp.tech.blink.text')`) === 'Hop the carrier 1,500 px ahead: S list, Warp blink ahead. Ready again after 20 seconds.' && J(`uiText('camp.hud.dockhint', { name: 'Luna' })`) === 'S  dock at Luna' && J(`uiText('camp.bf.key.shield')`) === 'Cruiser list: Emergency shields' && J('CAMPBRIEF_KEYS.shield.join()') === 'S');
  check('the model is told "S opens the cruiser list" (with the warp blink), and no power list, no autopilot list and no ship list (they have no key)', (() => { const t = J('scCampPanelsText()'); return /S opens the cruiser list at the left[^)]*warp blink ahead\)/.test(t) && !/power list|autopilot list|ship list/.test(t); })());
}

console.log('E. the switch');
{
  check('campShipListSet(true) gives P the ship list (key line P Ship  O Power), O the power list, I the autopilot, the parts their parent, and the blink row goes back to the ship list', (() => {
    g.run(`campShipListSet(true); window.C3 = __new(['blink']); window.P3 = campPanelNew();`);
    const a = J(`[campPanelKeyLine(), campKeyList('ship').key, campKeyList('ship').off === false, campKeyList('power').key, campKeyList('power').alt === undefined, ['power', 'nav', 'yard'].map(id => campKeyList(id).parent).join(), campKeyList('ship').rows.map(r => r.id).join(), campKeyList('power').rows.map(r => r.id).join()]`);
    const p = J(`__key(P3, C3, 'KeyP').open`), o = J(`(campPanelClose(P3), __key(P3, C3, 'KeyO').open)`), left = J(`__key(P3, C3, 'ArrowLeft').open`);
    return a.join('|') === 'S Cruiser    P Ship  O Power  I Autopilot  U Dock|P|true|O|true|ship,ship,ship|gpower,gnav,gyard,blink|shields,engines,weapons,balance,emergency' && p === 'ship' && o === 'power' && left === 'ship';
  })());
  check('and false takes the keys away again: P and O open no list, the ship list is off, the blink row is the cruiser list\'s last, the H page has no row for P or O', (() => {
    g.run(`campShipListSet(false); campPanelClose(P3); window.P4 = campPanelNew();`);
    return J('campPanelKeyLine()') === 'S Cruiser    ' && J(`__key(P4, C3, 'KeyP').open`) === '' && J(`__key(P4, C3, 'KeyO').open`) === '' && J(`campKeyList('cruiser').rows.map(r => r.id).pop()`) === 'blink' && J(`campKeyList('ship').off`) === true && !J(`controlsGroup('panels').rows.some(r => ['P', 'O', 'I'].includes(r.k.join()))`) && J('CAMP_SHIP_LIST') === false;
  })());
}

console.log('F. through the scene');
{
  g.run(`
    window.__fake = level => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
      f.time = { delayedCall: (ms, fn) => fn(), now: 0 }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
      const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'repair'].forEach(k => { h[k] = { text: '', setText(t) { h[k].text = t; return h[k]; } }; }); f.hud = h;
      f.k = {}; ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'].forEach(k => { f.k[k] = { isDown: false }; });
      f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; return f; };
    toast = () => {}; shipcompSay = () => true; window.F = __fake('home'); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.update(0, 33);
  `);
  check('P and O through Campaign.onKey pick friendlies and open no list; the mode stays play (nothing pauses)', (() => { g.run(`__ward(F.camp, 'hx', 500); F.onKey({ code: 'KeyP' })`); const a = J('campPanelOpen(F.pn)'), f1 = J('F.camp.fsel'); g.run(`F.onKey({ code: 'KeyO' })`); const c = J('campPanelOpen(F.pn)'); return a === '' && c === '' && f1 !== '' && J('F.mode') !== 'pause'; })());
  check('with the list open the arrows are the list\'s: Enter through the scene gives the shields a pip, no missile', (() => { g.run(`campPanelsClose(F); campPanelGo(F.pn, F.camp, 'power'); window.pa = F.camp.power.p.join(); window.ms = F.camp.missiles ? F.camp.missiles.length : 0; F.onKey({ code: 'Enter' });`); return J('F.camp.power.p.join()') !== J('pa') && J('campPanelOpen(F.pn)') === 'power'; })());
  check('a list\'s key over the open map closes the map and opens that list (S the cruiser list; S resets the map\'s zoom first)', (() => { g.run(`campPanelsClose(F); campMapOpen(F);`); const m1 = J('!!F.mp'); g.run(`F.onKey({ code: 'KeyS' });`); const r1 = [J('!!F.mp'), J('campPanelOpen(F.pn)')]; return m1 === true && r1.join() === 'false,cruiser'; })());
}
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nPOWER KEY FAIL (${failed} of ${n})` : `\nPOWER KEY PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
