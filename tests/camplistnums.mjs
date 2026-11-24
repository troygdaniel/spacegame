// smoke: the S list is driven by the digits: S then 1 to 8 (7 rows, 8 with the blink tech) does the row, the arrows fly and Enter fires a missile while it is open, Up Down Left Right and Enter are not the list's; number chips on the rows (plain Node, no Chrome)
// Card space-game-s-list-numbers (Troy, 24 Nov 2026: "the S list fights with flying: it uses Up, Down and Enter, but arrows steer and Enter fires a missile (which now costs ore). Give each S row a number key shown as a chip on the row: S then 1 to 7 does that row at once. While the S list is open the arrows keep flying and Enter keeps firing; Up, Down and Enter no longer drive the list. A greyed row's number does nothing and flashes its reason. Esc or the fade closes it.").
// The code: `numbers: 1` on the list in src/data_controls.js (campKeyDigit), the keys in src/camppanel.js (campPanelKey, campPanelPickKey, campPanelOwnsArrows, the view), the chips in src/campanelsdraw.js, the arrows in src/campaignscene.js.
//   A. the table: only the cruiser list is numbered; the digit helper (Digit and Numpad, 1 to 9); the foot's words
//   B. the keys: a digit does that row (the same doing as Enter had), a digit with no row does nothing, a greyed row's digit says why and flashes, Esc closes; Up Down Left Right are not used; Enter fires a missile and the list stays open
//   C. the target sub-list: numbered too; Up Down Enter are not its keys
//   D. a list that is not numbered (the convoy list, opened by data) keeps Up Down Enter, and a digit is nothing to it
//   E. the scene: the arrows fly with the S list open (not with a list that has them); a held arrow is not a repeat of the list's
//   F. the drawing on stand-ins: a number chip on each row (1 to n), no highlighted row, the Reload missiles row has its R chip too, the foot says 1-n and Esc
//   G. the words follow the real length (card space-game-s-list-eight-rows): the H page's chip and the pause card say 1-8 from the table (campPanelMost), the foot the live length; digit 8 does the warp blink
// Run: node tests/camplistnums.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__new = (lv, techs) => { window.C = campNew(lv || 1, techs || [], { seed: 1, god: true }); window.P = campPanelNew(); return C; };
  window.__k = (code, now) => { const r = campPanelKey(P, C, code, now == null ? 1000 : now); return { used: r.used, ran: r.ran, ok: r.ok, say: r.say, row: r.row, open: r.open }; };
  window.__rows = () => campPanelList(C, 'cruiser');
  window.__foe = (kind, dx, dy) => { const c = C.carrier, u = campSpawn(C, kind, c.x + dx, c.y + dy); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; return u.id; };
`);

// ---- A. the table ----
{
  check('only the cruiser list is numbered (the S list: numbers 1); every other list has none', J(`CAMP_PANELS.panels.filter(p => p.numbers).map(p => p.id).join()`) === 'cruiser');
  check('campKeyDigit: Digit1 to Digit9 and Numpad1 to Numpad9 are 1 to 9; 0, letters, arrows, Enter are 0', J(`['Digit1', 'Digit5', 'Digit9', 'Numpad1', 'Numpad9'].map(campKeyDigit).join()`) === '1,5,9,1,9' && J(`['Digit0', 'Numpad0', 'KeyA', 'ArrowUp', 'Enter', '', null, undefined].map(campKeyDigit).join()`) === '0,0,0,0,0,0,0,0');
  check('the foot\'s words for a numbered list: the digits, and Esc (read from the key table)', J(`uiText('camp.ui.listnums', { last: 7 })`) === '1-7  does a row    Esc close' && J(`uiText('camp.ui.candnums', { last: 2 })`) === '1-2  give the order    Esc back');
  check('the words are in their file and in the table', src('content/text/camplists.md').includes('| camp.ui.listnums |') && src('content/text/camplists.md').includes('| camp.ui.candnums |') && src('src/contenttables.js').includes("'camp.ui.listnums'") && src('src/contenttables.js').includes("'camp.ui.candnums'"));
}

// ---- B. the keys ----
{
  g.run(`__new(1); __k('KeyS', 100);`);
  const rows = J('__rows().map(r => r.id)'), nrows = rows.length;
  check('S opens the list: seven rows in a level with an outpost and a goal (goal, target, mine, dock, repair, reload, emergency)', J('campPanelOpen(P)') === 'cruiser' && rows.join() === 'goal,target,fmine,dock,srepair,sreload,emergency', rows.join());
  const V = J('campPanelView(P, C)');
  check('the view is numbered: every row carries its number 1 to 7, none is highlighted (at -1), the foot says the digits', V.numbers === true && V.rows.map(r => r.num).join() === '1,2,3,4,5,6,7' && V.at === -1 && V.last === 7 && V.keys === 'camp.ui.listnums', JSON.stringify([V.numbers, V.rows.map(r => r.num), V.at, V.last, V.keys]));
  check('Down, Up, Left and Right are not used: the list does not move, the ship flies', ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].every(c => { const r = J(`__k('${c}')`); return !r.used && !r.ran; }) && J('P.at') === 0 && J('campPanelOpen(P)') === 'cruiser');
  g.run(`window.__g = __foe('gunship', 900, 0); C.nextRocket = 0;`);
  const ent = J(`__k('Enter', 1100)`);
  check('Enter fires a missile at the gunship in reach (the list does not take it) and the list stays open', ent.used && ent.ran && ent.ok && ent.row === 'missile' && ent.say === 'Missile away.' && J('C.missiles') === 5 && J('C.rockets.length') === 1 && J('campPanelOpen(P)') === 'cruiser', JSON.stringify(ent));
  g.run(`__new(1); __k('KeyS', 100);`);
  const d4 = J(`__k('Digit4', 1200)`);
  check('a digit does the row: 4 is the fourth row (Dock at the outpost), at once: its order is given and its answer said', d4.used && d4.ran && d4.row === 'dock', JSON.stringify(d4));
  g.run(`__new(3); __k('KeyS', 100);`);
  const d1 = J(`__k('Digit1', 1300)`);
  check('1 is the first row, Fly to the goal (level 3 has one): given at once, the list closes after an order that is taken, the row is lit', d1.used && d1.ran && d1.row === 'goal' && d1.ok && J('campPanelOpen(P)') === '' && J('P.lit.goal') === 1300, JSON.stringify(d1));
  g.run(`__new(1); __k('KeyS', 100);`);
  const np = J(`__k('Numpad2', 1400)`);
  check('the keypad\'s digits do the same: Numpad2 is the second row (Fly to the target: grey with no target, so the reason is said and the list stays open)', np.used && np.ran && !np.ok && np.row === 'target' && /^No target, pilot\./.test(np.say) && J('campPanelOpen(P)') === 'cruiser' && J('P.lit.target') === 1400, JSON.stringify(np));
  const grey = J(`__k('Digit5', 1500)`);
  check('a greyed row\'s digit does nothing but say why and flash: 5 is Repair hull with the hull sound: refused in words, the hull is as it was, the row is lit, the list stays open', grey.used && grey.ran && !grey.ok && grey.row === 'srepair' && grey.say.length > 0 && J('P.lit.srepair') === 1500 && J('campPanelOpen(P)') === 'cruiser' && J('C.carrier.hp') === J('C.carrier.maxHp'), JSON.stringify(grey));
  const none = J(`__k('Digit8', 1600)`);
  check('8 with only seven rows: nothing (used, no order, no words), the list stays open', none.used && !none.ran && none.say === '' && J('campPanelOpen(P)') === 'cruiser', JSON.stringify(none));
  check('9 and 0: 9 is no row either; 0 is no key of the list at all', J(`__k('Digit9')`).used && !J(`__k('Digit9')`).ran && !J(`__k('Digit0')`).used);
  g.run(`__new(1, ['blink']); __k('KeyS', 100);`);
  check('with the warp tech the list has an eighth row, the blink: 8 does it (the blink hop needs to be ready; the key reaches the row)', J('__rows().length') === 8 && J(`__k('Digit8', 1700).row`) === 'blink');
  g.run(`__new(1);`);
  check('with no list open a digit is nothing (a digit key belongs to the open S list only)', !J(`__k('Digit1')`).used && !J(`__k('Digit4')`).used && J('campPanelOpen(P)') === '');
  g.run(`__k('KeyS', 100);`);
  check('Esc closes the list, S too', J(`__k('Escape')`).used && J('campPanelOpen(P)') === '' && (g.run(`__k('KeyS', 100)`), J('campPanelOpen(P)') === 'cruiser') && (g.run(`__k('KeyS', 101)`), J('campPanelOpen(P)') === ''));
  g.run(`__new(1); __k('KeyS', 100); P.touch = 100;`);
  check('the fade is still the list\'s: untouched it closes (campPanelFade)', J(`campPanelFade(P, 100 + CAMP_PANELS.anim.idle + CAMP_PANELS.anim.out + 5)`) === 0 && J('campPanelOpen(P)') === '');
  g.run(`__new(1); __k('KeyS', 100); P.touch = 100;`);
  check('a digit is a touch: the fade starts again from it', (g.run(`__k('Digit5', 5000)`), J('P.touch') === 5000));
}

// ---- C. the target sub-list ----
{
  g.run(`__new(3); __k('KeyS', 100); window.__row = campKeyRow('fmine'); campPickOpen(P, __row, campPickItems(C, 'field'));`);
  check('level 3 has two rock fields: Mine ore opens a sub-list of them (a numbered list\'s sub-list is numbered too)', J('campPickItems(C, "field").length') === 2 && J('!!P.pick') && J('campPanelView(P, C).pick') === true);
  const V = J('campPanelView(P, C)');
  check('its candidates carry 1 and 2, none highlighted, the foot says 1-2 and Esc back', V.numbers === true && V.rows.map(r => r.num).join() === '1,2' && V.at === -1 && V.keys === 'camp.ui.candnums' && V.last === 2, JSON.stringify([V.rows.map(r => r.num), V.at, V.keys, V.last]));
  check('Down, Up, Left, Right and Enter are not the sub-list\'s keys: nothing moves, nothing is chosen', ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].every(c => !J(`__k('${c}')`).used) && J('P.pick.at') === 0 && J('!!P.pick'));
  const e = J(`__k('Enter', 2000)`);
  check('Enter in the sub-list is the ship\'s: it fires (nothing in reach: refused in words), it chooses no candidate', e.used && e.row === 'missile' && J('!!P.pick'), JSON.stringify(e));
  const d = J(`__k('Digit2', 2100)`);
  check('2 chooses the second candidate: the order is given at it (Mine), the lists close', d.used && d.ran && d.row === 'fmine' && J('campPanelOpen(P)') === '' && J('!P.pick'), JSON.stringify(d));
  g.run(`__new(3); __k('KeyS', 100); campPickOpen(P, campKeyRow('fmine'), campPickItems(C, 'field'));`);
  check('a digit past the candidates does nothing; Esc goes back to the list (the sub-list closes, the list stays)', (() => { const o = J(`__k('Digit5')`); const b = J(`__k('Escape')`); return o.used && !o.ran && b.used && J('!P.pick') && J('campPanelOpen(P)') === 'cruiser'; })());
}

// ---- D. the other lists ----
{
  g.run(`__new(1);`);
  check('a list that is not numbered (the convoy list, opened by data: no key opens it now) keeps Up, Down and Enter, and a digit is nothing to it', (() => { g.run(`campPanelGo(P, C, 'convoy')`); const o = J('campPanelOpen(P)') === 'convoy'; const dn = J(`__k('ArrowDown')`); const dg = J(`__k('Digit2')`); return o && dn.used && J('P.at') === 1 && !dg.used; })());
  check('campPanelOwnsArrows: the convoy list has them; the S list has not; with no list open nobody has them', J('campPanelOwnsArrows(P)') === true && (g.run(`campPanelClose(P); __k('KeyS', 100)`), J('campPanelOwnsArrows(P)') === false) && (g.run(`campPanelClose(P)`), J('campPanelOwnsArrows(P)') === false));
}

// ---- E. the scene ----
{
  const sc = src('src/campaignscene.js');
  check('the ship is not coasted by the S list: the wheel check asks campPanelOwnsArrows, not "a list is open"', /const listed = \(this\.pn && typeof campPanelOwnsArrows === 'function' && campPanelOwnsArrows\(this\.pn\)\)/.test(sc) && !/const listed = \(this\.pn && typeof campPanelOpen/.test(sc));
  check('a held arrow is one press unless the open list owns the arrows (a numbered list does not)', /e\.repeat && !\(this\.mode === 'play' && \(c === 'ArrowUp' \|\| c === 'ArrowDown'\) && this\.pn && typeof campPanelOwnsArrows === 'function' && campPanelOwnsArrows\(this\.pn\)\)/.test(sc));
  check('the scene reads the key table for the digits (campKeyDigit lives in the key table\'s file, not in the scene)', /campKeyDigit = code =>/.test(src('src/data_controls.js')) && !/campKeyDigit/.test(sc));
}

// ---- F. the drawing ----
g.run(`
  window.__all = [];
  window.__mkobj = (kind, x, y, t) => { const o = { kind, x, y, t: t == null ? '' : t, gone: false, color: '', width: 100, height: 20, visible: true };
    const px = new Proxy(o, { get: (tg, k) => (k in tg ? tg[k] : typeof k === 'symbol' || k === 'then' ? undefined : () => px) });
    o.setText = v => { o.t = v; return px; }; o.setColor = v => { o.color = v; return px; }; o.destroy = () => { o.gone = true; }; o.setPosition = (a, b) => { o.x = a; o.y = b; return px; }; o.setVisible = v => { o.visible = v; return px; };
    __all.push(px); return px; };
  window.__scene = () => { const s = { camp: campNew('home', [], { seed: 1, god: true }), time: { now: 0 }, add: { rectangle: (x, y) => __mkobj('rect', x, y), graphics: () => __mkobj('g'), text: (x, y, t) => __mkobj('text', x, y, t) },
    input: { handlers: [], on(e, f) { this.handlers.push([e, f]); }, off() {} }, events: { once() {} } }; s.camp.ships = s.camp.ships.filter(u => u.team !== 'alien'); return s; };
`);
{
  g.run(`window.S = __scene(); campPanelsInstall(S); S.mode = 'play'; campPanelKey(S.pn, S.camp, 'KeyS', 1000); campPanelsPaint(S, 1000);`);
  check('each visible row has its number in the chip at the left: 1 to 7, in order', J('S.pnl.rows.filter(r => r.name.visible).map(r => r.cap.t).join()') === '1,2,3,4,5,6,7', J('S.pnl.rows.filter(r => r.name.visible).map(r => r.cap.t).join()'));
  check('the words of the rows start after the chip (every row, so they line up)', J('S.pnl.rows.filter(r => r.name.visible).every(r => r.name.x > S.pnl.rows[0].cap.x + 10)'));
  check('only the Reload missiles row has the second chip (its R), and no other', J('S.pnl.rows.filter(r => r.cap2.visible).map(r => r.name.t + ":" + r.cap2.t).join()') === 'Reload missiles:R', J('S.pnl.rows.filter(r => r.cap2.visible).map(r => r.name.t + ":" + r.cap2.t).join()'));
  check('the foot says the digits and Esc (1-7  does a row    Esc close), no highlighted row\'s state under it', J('S.pnl.keys.t') === '1-7  does a row    Esc close', J('S.pnl.keys.t'));
  g.run(`campPanelClose(S.pn); campPanelGo(S.pn, S.camp, 'convoy'); campPanelsPaint(S, 1000);`);
  check('a list that is not numbered draws no digit in its chips (the convoy list, opened by data)', J('S.pnl.rows.filter(r => r.cap.visible).every(r => !/^[1-9]$/.test(r.cap.t))'));
}
// ---- G. the words follow the real length (card space-game-s-list-eight-rows: the H page said 1-7 while the S list has eight rows, the warp blink the eighth) ----
{
  const most = J(`campPanelMost('cruiser')`);
  check('the S list can have eight rows: the table has eight that are not switched off (goal, target, mine, dock, repair, reload, emergency, warp blink), and campPanelMost says 8', most === 8 && J(`campPanelDef('cruiser').rows.filter(r => !r.off).map(r => r.id).join()`) === 'goal,target,fmine,dock,srepair,sreload,emergency,blink', most);
  check('the H page\'s chip says 1-8 (it is read from the table, not typed in)', J(`CONTROLS.find(x => x.id === 'panels').rows.some(r => r.k.join() === '1-8')`) && !J(`CONTROLS.find(x => x.id === 'panels').rows.some(r => r.k.join() === '1-7')`), J(`CONTROLS.find(x => x.id === 'panels').rows.map(r => r.k.join()).join(' | ')`));
  check('the pause card says 1 to 8 (the {cruiserlast} placeholder), and the placeholder is the S list\'s most rows; a list with no digits says nothing', J(`uiText('camp.ui.pausepanels')`).includes('then 1 to 8 does a row') && J(`campKeyVar('cruiserlast')`) === '8' && J(`campKeyVar('squadslast')`) === '' && J(`campKeyVar('nolast')`) === '');
  g.run(`{ const cr = campPanelDef('cruiser'); cr.rows.push({ id: 'zextra', order: 'repair', label: 'Extra', help: 'x' }); }`);
  check('a ninth row moves the words with it: the chip and the pause card say 9, and the digits stop at 9 (a tenth row is not counted)', J(`campPanelMost('cruiser')`) === 9 && J(`campPanelKeyRows().some(r => r.k.join() === '1-9')`) && J(`uiText('camp.ui.pausepanels')`).includes('1 to 9 does a row'));
  g.run(`{ const cr = campPanelDef('cruiser'); cr.rows.push({ id: 'zextra2', order: 'repair', label: 'Extra 2', help: 'x' }); }`);
  check('a tenth row is not a digit: still 9', J(`campPanelMost('cruiser')`) === 9);
  g.run(`{ const cr = campPanelDef('cruiser'); cr.rows.splice(cr.rows.findIndex(r => r.id === 'zextra2'), 1); cr.rows.splice(cr.rows.findIndex(r => r.id === 'zextra'), 1); }`);
  check('taking them away puts the words back to 8', J(`campPanelMost('cruiser')`) === 8 && J(`uiText('camp.ui.pausepanels')`).includes('1 to 8 does a row'));
  // the live list: eight rows only with the warp blink tech (the foot says the live length), and digit 8 does row 8, the warp blink
  g.run(`__new(1, ['blink']); __k('KeyS', 100);`);
  const rows8 = J('__rows().map(r => r.id)');
  check('with the blink tech the S list has eight rows and the eighth is the warp blink', rows8.length === 8 && rows8[7] === 'blink', rows8.join());
  check('the view and the foot say 1-8 (last 8, eight number chips 1 to 8)', J('campPanelView(P, C).last') === 8 && J('campPanelView(P, C).rows.map(r => r.num).join()') === '1,2,3,4,5,6,7,8' && J(`uiText(campPanelView(P, C).keys, { last: campPanelView(P, C).last })`).startsWith('1-8  does a row'), J(`campPanelView(P, C).rows.map(r => r.num).join()`));
  const r8 = J(`__k('Digit8', 200)`);
  check('digit 8 does row 8: the warp blink ran, it was taken, and the list closed', r8.row === 'blink' && r8.ran === true && r8.ok === true && r8.open === '', JSON.stringify(r8));
  g.run(`__new(1, ['blink']); __k('KeyS', 100);`);
  const n8 = J(`__k('Numpad8', 300)`);
  check('the keypad\'s 8 does row 8 too', n8.row === 'blink' && n8.ran === true && n8.ok === true, JSON.stringify(n8));
  g.run(`__new(1, []); __k('KeyS', 100);`);
  const rows7 = J('__rows().map(r => r.id)'), r7 = J(`__k('Digit8', 200)`);
  check('without the blink tech the list has seven rows, the foot says 1-7, and digit 8 does nothing (no row 8)', rows7.length === 7 && J('campPanelView(P, C).last') === 7 && J(`uiText(campPanelView(P, C).keys, { last: campPanelView(P, C).last })`).startsWith('1-7  does a row') && r7.ran === false && r7.row === '' && J('campPanelOpen(P)') === 'cruiser', JSON.stringify(r7));
  g.run(`__new(3, []); __k('KeyS', 100);`);
  check('the third level (no outpost, no blink tech) has six rows and the foot says 1-6: the words follow the live length', J('__rows().length') === 6 && J(`uiText(campPanelView(P, C).keys, { last: campPanelView(P, C).last })`).startsWith('1-6  does a row'));
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nS LIST NUMBERS FAIL (${failed} of ${n})` : `\nS LIST NUMBERS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
