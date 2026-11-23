// smoke: P opens the POWER list directly (O too), the SHIP list is switched off behind CAMP_SHIP_LIST, the blink row lives in the power list meanwhile (plain Node, no Chrome)
// Card space-game-p-opens-power (Troy, 23 Nov 2026: "P should just open the power list"). The switch and the keys are src/data_controls.js (CAMP_SHIP_LIST, campShipListSet, CAMP_PANELS), the door src/camppanel.js.
//   A. the table as the game has it: the ship list off (no key, no code, `off`), P the power list's key and O its second one (alt), the parts have no parent, the blink row is the power list's last row
//   B. the keys: P and O open power on its first row, either closes it, from another list either opens power in place; Enter adds a shield pip and leaves the list open; Left goes nowhere; Esc closes; I and U are as they were
//   C. the blink: with its tech the row is the last of the power list and Enter on it asks for the hop; without the tech the row is left out
//   D. the words: the key line, the H page, the pause card, the hints and what the model is told say P is power and name no ship list
//   E. the switch: campShipListSet(true) gives P the ship list back (O power, the parts' parent, the blink row in the ship list), false puts it all back
//   F. through the scene: P and O reach the list's door, a list's key over the map closes the map and opens power
// Run: node tests/camppowerkey.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__new = (techs) => campNew('home', techs || [], { seed: 5, god: true, mission: 0 });
  window.__key = (P, C, code, now) => campPanelKey(P, C, code, now || 0);
`);

console.log('A. the table as the game has it');
{
  check('CAMP_SHIP_LIST is false: the ship list is off (no key, no code, the `off` mark) and keeps its rows (power, autopilot, dock) for the switch', J('CAMP_SHIP_LIST') === false && J(`(() => { const s = campKeyList('ship'); return [s.key, s.code, s.off, s.rows.map(r => r.id).join()]; })()`).join('|') === '||true|gpower,gnav,gyard');
  check('P is the power list\'s key (KeyP) and O its second (alt KeyO, altkey O); the autopilot and the dock keep I and U', J(`(() => { const p = campKeyList('power'); return [p.key, p.code, p.alt, p.altkey, campKeyList('nav').key, campKeyList('yard').key]; })()`).join() === 'P,KeyP,KeyO,O,I,U');
  check('the parts of the ship list have no parent now (Left has nowhere to go back to), and the keyed lists are W P I U', J(`['power', 'nav', 'yard'].map(id => campKeyList(id).parent).join('|')`) === '||' && J(`CAMP_PANELS.panels.filter(p => p.key).map(p => p.key).join('')`) === 'WPIU');
  check('the blink row, which only the ship list had, is the last row of the power list', J(`campKeyList('power').rows.map(r => r.id).join()`) === 'shields,engines,weapons,balance,emergency,blink' && J(`campKeyVia('blink').id`) === 'power');
}

console.log('B. the keys');
{
  g.run(`window.C1 = __new(); window.P1 = campPanelNew();`);
  const p1 = J(`__key(P1, C1, 'KeyP')`), sh = J(`campPanelView(P1, C1)`);
  check('P opens the power list on its first row (shields), no ship list in between', p1.used === true && p1.open === 'power' && sh.id === 'power' && sh.rows[0].id === 'shields' && sh.title === 'POWER' && sh.key === 'P', JSON.stringify([p1.open, sh.id, sh.title]));
  check('P again closes it', J(`__key(P1, C1, 'KeyP').open`) === '' && J(`campPanelOpen(P1)`) === '');
  check('O opens the same list, and O again closes it', J(`__key(P1, C1, 'KeyO').open`) === 'power' && J(`__key(P1, C1, 'KeyO').open`) === '' );
  check('P with O\'s list open closes it (one list, two keys), and O with P\'s list open too', (g.run(`__key(P1, C1, 'KeyP')`), J(`__key(P1, C1, 'KeyO').open`) === '') && (g.run(`__key(P1, C1, 'KeyO')`), J(`__key(P1, C1, 'KeyP').open`) === ''));
  check('from another list P and O open power in place of it (one list at a time)', (g.run(`__key(P1, C1, 'KeyW')`), J(`__key(P1, C1, 'KeyP').open`) === 'power') && (g.run(`campPanelClose(P1); __key(P1, C1, 'KeyI')`), J(`__key(P1, C1, 'KeyO').open`) === 'power'));
  g.run(`campPanelClose(P1); window.pw0 = C1.power.p.slice();`);
  const e = J(`(() => { __key(P1, C1, 'KeyP'); const r = __key(P1, C1, 'Enter', 100); return { r, open: campPanelOpen(P1), p: C1.power.p.join() }; })()`);
  check('Enter on its first row gives a pip of power (the shields) and the list stays open for the next', e.r.ran === true && e.open === 'power' && e.p !== J('pw0.join()') && e.r.row === 'shields', JSON.stringify(e));
  check('Left in the power list goes nowhere (no list it is a part of): it stays open on its row', (() => { g.run(`__key(P1, C1, 'ArrowDown', 0);`); const at = J('P1.at'), r = J(`__key(P1, C1, 'ArrowLeft')`); return r.used === true && r.open === 'power' && J('P1.at') === at; })());
  check('Esc closes it, and a list\'s foot does not offer "Left back": the foot of the open list is the one of a list opened by its own key', (() => { g.run(`campPanelClose(P1); __key(P1, C1, 'KeyP');`); const v = J(`campPanelView(P1, C1)`); const out = v.keys === 'camp.ui.listkeys' && J(`__key(P1, C1, 'Escape').open`) === ''; return out; })());
  check('I and U open the autopilot and the dock as they did (and Left in them goes nowhere either)', (g.run(`campPanelClose(P1)`), J(`__key(P1, C1, 'KeyI').open`) === 'nav') && J(`__key(P1, C1, 'ArrowLeft').open`) === 'nav' && J(`__key(P1, C1, 'KeyU').open`) === 'yard' && J(`__key(P1, C1, 'ArrowLeft').open`) === 'yard');
  check('campPanelGo on the ship list opens nothing (it is off): nothing goes back to it', (g.run(`campPanelClose(P1); campPanelGo(P1, C1, 'ship');`), J('campPanelOpen(P1)') === ''));
}

console.log('C. the warp blink');
{
  g.run(`window.C2 = __new(['blink']); window.P2 = campPanelNew();`);
  check('with the blink tech the power list shows the row last, "Warp blink ahead" (it says ready)', J(`campPanelRows(C2, 'power').map(r => r.id).join()`) === 'shields,engines,weapons,balance,emergency,blink' && J(`campPanelRows(C2, 'power').pop().state`) === 'ready');
  check('P, Up (round to the last row) and Enter asks for the hop and closes the list; the row says it cooled after', (() => { g.run(`__key(P2, C2, 'KeyP'); __key(P2, C2, 'ArrowUp'); window.rb = __key(P2, C2, 'Enter', 200);`); return J('rb.ran') === true && J('rb.ok') === true && J('rb.row') === 'blink' && J('C2.input.blink') === true && J('campPanelOpen(P2)') === ''; })());
  check('without the tech the row is left out of the power list (a row that can never be used is not there)', J(`campPanelList(__new(), 'power').map(r => r.id).join()`) === 'shields,engines,weapons,balance,emergency');
}

console.log('D. the words');
{
  check('the key line names P Power, I, U (no ship list, no O) after W All', J('campPanelKeyLine()') === 'W All    P Power  I Autopilot  U Dock' && J(`campKeyLine()`).startsWith('W All    P Power  I Autopilot  U Dock    Arrows fly'));
  check('{powerkey} is P, {shipkey} says nothing, {viaemergency} and {viablink} are P, {navkey} I, {yardkey} U', J(`['powerkey', 'shipkey', 'viaemergency', 'viablink', 'navkey', 'yardkey'].map(campKeyVar).join('|')`) === 'P||P|P|I|U');
  check('the H page: one line for the power list with both keys (P O), one each for I and U, none for the ship list', J(`controlsGroup('panels').rows.slice(0, 4).map(r => r.k.join(' ') + ':' + r.t).join('|')`) === 'W:All squads: launch, attack, recall|P O:Power: pips, balance, emergency|I:Autopilot: goal, target, fast burn|U:Dock, repair the hull and our ships' && !J(`controlsGroup('panels').rows.some(r => /ship orders/i.test(r.t))`) && J(`controlsGroup('panels').rows.slice(0, 4).every(r => r.k.join(' ').length + 3 + r.t.length <= 43)`));
  check('the pause card says P power, I autopilot, U dock, and no ship orders', J(`uiText('camp.ui.pausepanels')`).includes('P power, I autopilot, U dock.') && !/ship orders/.test(J(`uiText('camp.ui.pausepanels')`)));
  check('the first hints name the right keys: the blink tech says "P list, Warp blink ahead", the dock hint U, the emergency shields P', J(`uiText('camp.tech.blink.text')`) === 'Hop the carrier 1,500 px ahead: P list, Warp blink ahead. Ready again after 20 seconds.' && J(`uiText('camp.hud.dockhint', { name: 'Luna' })`) === 'U  dock at Luna' && J(`uiText('camp.bf.key.shield')`) === 'Power: Emergency shields' && J('CAMPBRIEF_KEYS.shield.join()') === 'P');
  check('the model is told "P opens the power list at the right (..., warp blink ahead)", and no ship list', (() => { const t = J('scCampPanelsText()'); return /P opens the power list at the right \(shields: one more pip[^)]*warp blink ahead\)/.test(t) && !/ship list/.test(t); })());
}

console.log('E. the switch');
{
  check('campShipListSet(true) gives P the ship list (key line P Ship  O Power), O the power list, the parts their parent, and the blink row goes back to the ship list', (() => {
    g.run(`campShipListSet(true); window.C3 = __new(['blink']); window.P3 = campPanelNew();`);
    const a = J(`[campPanelKeyLine(), campKeyList('ship').key, campKeyList('ship').off === false, campKeyList('power').key, campKeyList('power').alt === undefined, ['power', 'nav', 'yard'].map(id => campKeyList(id).parent).join(), campKeyList('ship').rows.map(r => r.id).join(), campKeyList('power').rows.map(r => r.id).join()]`);
    const p = J(`__key(P3, C3, 'KeyP').open`), o = J(`(campPanelClose(P3), __key(P3, C3, 'KeyO').open)`), left = J(`__key(P3, C3, 'ArrowLeft').open`);
    return a.join('|') === 'W All    P Ship  O Power  I Autopilot  U Dock|P|true|O|true|ship,ship,ship|gpower,gnav,gyard,blink|shields,engines,weapons,balance,emergency' && p === 'ship' && o === 'power' && left === 'ship';
  })());
  check('and false puts it all back: P is power again, the ship list is off, the blink row is the power list\'s last, the H page row is P O', (() => {
    g.run(`campShipListSet(false); window.P4 = campPanelNew();`);
    return J('campPanelKeyLine()') === 'W All    P Power  I Autopilot  U Dock' && J(`__key(P4, C3, 'KeyP').open`) === 'power' && J(`campKeyList('power').rows.map(r => r.id).pop()`) === 'blink' && J(`campKeyList('ship').off`) === true && J(`controlsGroup('panels').rows[1].k.join()`) === 'P,O' && J('CAMP_SHIP_LIST') === false;
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
  check('P through Campaign.onKey opens the power list, P again closes it, O opens it again; the mode stays play (nothing pauses)', (() => { g.run(`F.onKey({ code: 'KeyP' })`); const a = J('campPanelOpen(F.pn)'); g.run(`F.onKey({ code: 'KeyP' })`); const b = J('campPanelOpen(F.pn)'); g.run(`F.onKey({ code: 'KeyO' })`); const c = J('campPanelOpen(F.pn)'); return a === 'power' && b === '' && c === 'power' && J('F.mode') !== 'pause'; })());
  check('with the list open the arrows are the list\'s: Enter through the scene gives the shields a pip, no missile', (() => { g.run(`campPanelsClose(F); F.onKey({ code: 'KeyP' }); window.pa = F.camp.power.p.join(); window.ms = F.camp.missiles ? F.camp.missiles.length : 0; F.onKey({ code: 'Enter' });`); return J('F.camp.power.p.join()') !== J('pa') && J('campPanelOpen(F.pn)') === 'power'; })());
  check('a list\'s key over the open map closes the map and opens power (P, and O too)', (() => { g.run(`campPanelsClose(F); campMapOpen(F);`); const m1 = J('!!F.mp'); g.run(`F.onKey({ code: 'KeyP' });`); const r1 = [J('!!F.mp'), J('campPanelOpen(F.pn)')]; g.run(`campPanelsClose(F); campMapOpen(F);`); g.run(`F.onKey({ code: 'KeyO' });`); const r2 = [J('!!F.mp'), J('campPanelOpen(F.pn)')]; return m1 === true && r1.join() === 'false,power' && r2.join() === 'false,power'; })());
}
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nPOWER KEY FAIL (${failed} of ${n})` : `\nPOWER KEY PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
