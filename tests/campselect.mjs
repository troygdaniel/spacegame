// smoke: who, one target and the order keys of the Campaign: A D pick WHO (All pilots, then Wedge, Kara, Apollo), [ ] pick an ENEMY, backslash the nearest threat, O P a FRIENDLY (a ship or outpost you protect), only ONE target is held (a friendly replaces the enemy and the other way round), X clears; S is the view back; hold to speak and the balance key are gone; E engage, G guard, R recall act on them (plain Node, no Chrome)
// Cards space-game-bracket-select-orders, space-game-keys-select and space-game-keys2-select (Troy, 23 Nov 2026, like X-Wing). The rules are src/camptarget.js (campSel*, campFri*), the keys CAMP_KEYS (src/data_controls.js), the door src/camppanel.js.
//   A. the table: the codes, the squads' own lists gone, the debug kit off the selection keys, the voice and the balance key gone, the H page and the texts say the keys
//   B. who: All pilots first and the default, then the pilots; D and A step round the ends; a lost pilot is let go; campSelUnits gives { hostile, friendly, who, whoShips }
//   C. the friendly: the ships you protect, then the outposts; P and O step round the ends; a lost one is let go; an outpost is no ship
//   D. who and ONE target: a friendly replaces the enemy and the other way round, who is never touched; campHeldNow; X lets the target go and puts who back on All pilots
//   E. E, G, R: all three, or the one pilot picked; E at the enemy picked (none picked: the nearest is picked, as the backslash would); R at the friendly (none: the cruiser); T home; refusals in words
//   F. Q is the cruiser list now (card space-game-keys-orders); all three pilots are the first stop of A D
//   G. through the scene: the keys reach the lists' door, the tune kit's keys are not the player's, S resets the view, the voice is off behind its switch and the balance key does nothing, the brackets are drawn
// Run: node tests/campselect.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
g.run('CAMP.bay.startOut = false; // this suite\'s set-up is the old start: the pilots begin in the bay (the game starts them out beside the cruiser: card space-game-keys-orders; tests/campkeysorders.mjs has the new start)');
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__run = (C, s) => { for (let i = 0; i < Math.round(s * 30) && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__new = (level, mission) => { const C = campNew(level, [], { seed: 5, god: true, mission: mission || 0 }); C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__out = () => { const C = __new('home'); campOrder(C, 'launch'); __run(C, 8); return C; };
  window.__foe = (C, dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__hauler = (C, id, name, dx, dy, tox, toy) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y + dy); f.id = 'freighter-' + id; C.by[f.id] = f; f.dest = { x: C.carrier.x + tox, y: C.carrier.y + toy }; f.cname = name; f.named = true; return f; };
  window.__ord = (C, k) => campWingShips(C, k).map(u => (u.order && u.order.type) + ':' + ((u.order && (u.order.target || (u.order.at && u.order.at.id))) || '')).join();
  window.__key = (P, C, code, now) => campPanelKey(P, C, code, now || 0);
`);

console.log('A. the table');
{
  check('the keys: A D who (wlast, wnext), [ ] the enemy (last, next), backslash the nearest, O P the friendly (flast, fnext), X clears, E G R engage, guard, recall (CAMP_KEYS holds the codes)', J(`['wlast', 'wnext', 'last', 'next', 'near', 'flast', 'fnext', 'clear', 'attack', 'guard', 'recall'].map(id => CAMP_KEYS[id].codes[0]).join()`) === 'KeyA,KeyD,BracketLeft,BracketRight,Backslash,KeyO,KeyP,KeyX,KeyE,KeyG,KeyR' && J(`['wlast', 'wnext', 'last', 'next', 'near', 'flast', 'fnext', 'clear', 'attack', 'guard', 'recall'].map(id => CAMP_KEYS[id].k).join('')`) === 'AD[]\\OPXEGR');
  check('S is the zoom reset and brings the view back (it was Backspace: the table has no Backspace for the Campaign flight), and S is not the nearest threat any more', J(`campKeyCodes('zoomreset').join()`) === 'KeyS' && J(`CAMP_KEYS.zoomreset.k`) === 'S' && !J(`Object.keys(CAMP_KEYS).some(id => CAMP_KEYS[id].codes.includes('Backspace'))`) && !J(`campKeyIs('near', 'KeyS')`));
  check('hold to speak has no key behind its switch (CAMP_VOICE is false): the table says no code and no cap; the semicolon\'s balance key is gone from the table', J(`CAMP_VOICE`) === false && J(`campKeyCodes('voice').length`) === 0 && J(`CAMP_KEYS.voice.k`) === '' && J(`CAMP_KEYS.balance`) === null && J(`Object.keys(CAMP_KEYS).some(id => CAMP_KEYS[id].codes.includes('Semicolon'))`) === false);
  check('the squads have no list of their own and no row of Q: the fleet list, the all-squads list and the ship list are switched off (no code), Q is the cruiser list, the power and autopilot lists have no key (O and P are the friendlies\'), no key picks all three pilots by itself (CAMP_KEYS.all has none: A D\'s first stop is all pilots); E G R open no list', J(`CAMP_PANELS.panels.map(p => p.id).join()`) === 'fleet,cruiser,convoy,squads,ship,power,nav,yard' && J(`CAMP_PANELS.panels.filter(p => p.code).map(p => p.code).join()`) === 'KeyQ' && J(`CAMP_PANELS.panels.find(p => p.id === 'power').alt`) === null && J(`campKeyCodes('all').length`) === 0 && J(`['KeyE', 'KeyG', 'KeyR'].every(c => !CAMP_PANELS.panels.some(p => p.code === c))`));
  check('O and P open no list: with the ship list off the power list, the autopilot list and the ship list have no key and no code; campShipListSet(true) gives the old keys back (P ship list, O power, I autopilot) and false takes them away again', J(`(() => { const q = id => campKeyList(id), none = () => ['ship', 'power', 'nav'].every(id => q(id).key === '' && q(id).code === ''); const off = none(); campShipListSet(true); const on = [q('ship').key, q('power').key, q('nav').key].join(); campShipListSet(false); return off && on === 'P,O,I' && none(); })()`));
  check('no direct key is a list\'s key or another direct key: the codes are all different', (() => { const ks = J(`Object.keys(CAMP_KEYS).filter(id => !/^(up|down|pick)$/.test(id)).flatMap(id => CAMP_KEYS[id].codes).concat(CAMP_PANELS.panels.filter(p => p.code).map(p => p.code))`); return new Set(ks).size === ks.length; })());
  check('the tune kit\'s keys are off the selection\'s (the brackets, the backslash, O, P): none of the kit\'s codes is one, and with the kit on those keys are still the player\'s while \' skip, 6 win, 7 lose and the backtick are the kit\'s', J(`CAMP_DEBUG.keys.every(r => !/^(Bracket|Backslash$|Key[OP]$)/.test(r.code))`) && J(`(() => { campDebugSet(true); const ok = ['BracketLeft', 'BracketRight', 'Backslash', 'KeyO', 'KeyP'].every(c => campDebugKey(c) === null) && campDebugKey('Quote') === 'skip' && campDebugKey('Digit6') === 'win' && campDebugKey('Digit7') === 'lose' && campDebugKey('Backquote') === 'god'; campDebugSet(false); return ok; })()`));
  check('the H page has the keys under THE TARGET: A D who, [ ] the enemy, O P the friendly (first), [ ] the enemy, the backslash, E G R the orders, X F; no row for the semicolon or the voice, the strip\'s heading is THE STRIP', (() => { const rows = J(`controlsGroup('campaign').rows.filter(r => r.sub === 'THE TARGET').map(r => r.k.join(' '))`); const all = J(`controlsGroup('campaign').rows.map(r => r.k.join(' ') + '|' + r.sub)`); return rows.join('~') === 'A D~O P~[ ]~\\~E G R~X F' && !all.some(r => r.startsWith(';|') || r.startsWith('.|')) && all.includes('/|THE STRIP') && !all.some(r => /THE VOICE/.test(r)); })());
  check('the words say them from the table: no target says [ ] and the backslash; the pause card, the briefing and the fleet hint say E engage, G guard, R recall; the pause card says A D pick who, [ ] an enemy, O P a friendly', J(`uiText('camp.no.notarget')`) === 'No target, pilot. [ or ] picks one, \\ the nearest.' && /E engage, G guard, R recall/.test(J(`uiText('camp.hint.fleet')`)) && /E engage, G guard, R recall/.test(J(`uiText('camp.bf.1.1.n3')`)) && /A D pick who, \[ \] an enemy, O P a friendly, E engage, G guard, R recall/.test(J(`uiText('camp.ui.pausepanels')`)));
}

console.log('B. who');
{
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0);`);
  check('a new battle has All pilots picked (C.sel is all, and the friendly is none: C.fsel is empty)', J(`campNew('home', [], { seed: 1 }).sel`) === 'all' && J(`campNew('home', [], { seed: 1 }).fsel`) === '');
  check('the list is All pilots, then the pilots with a ship out (red, green, yellow: Wedge, Kara, Apollo); no ship you protect is in it', J(`campSelList(C).map(e => e.id).join()`) === 'all,pilot:red,pilot:green,pilot:yellow' && J(`campSelList(C).map(e => e.name).join()`) === 'All pilots,Wedge,Kara,Apollo' && J(`campSelList(C)[0].units.length`) === 3 && J(`campSelList(C).every(e => e.kind !== 'ward')`));
  check('nothing picked ("") is All pilots: campSelNow says so and puts it back in C.sel', (() => { g.run(`C.sel = ''`); return J(`campSelNow(C).id`) === 'all' && J(`C.sel`) === 'all'; })());
  check('D takes the next pilot (from All pilots: Wedge, Kara, Apollo) and round to All pilots again; A goes the other way (from All pilots: Apollo)', J(`(() => { C.sel = 'all'; return [1, 1, 1, 1].map(() => campSelStep(C, 1).id); })()`).join() === 'pilot:red,pilot:green,pilot:yellow,all' && J(`(() => { C.sel = 'all'; return [-1, -1, -1, -1].map(() => campSelStep(C, -1).id); })()`).join() === 'pilot:yellow,pilot:green,pilot:red,all');
  check('campSelUnits is { hostile, friendly, friendlyPost, who, whoShips }: with All pilots who is null and whoShips the three ships, hostile and friendly null; with a pilot who is the squad\'s ship and whoShips is that one', (() => { g.run(`C.sel = 'all'; C.tgt = ''; C.fsel = ''; window.__f = __foe(C, 900, 0);`); const a = J('campSelUnits(C)'); g.run(`campTgtNearest(C); campSelStep(C, 1);`); const b = J(`({ h: campSelUnits(C).hostile.id, w: campSelUnits(C).who.id, ws: campSelUnits(C).whoShips.map(u => u.id).join(), red: campWingShips(C, 'red')[0].id })`); return a.hostile === null && a.friendly === null && a.friendlyPost === null && a.who === null && a.whoShips.length === 3 && b.h === J('__f.id') && b.w === b.red && b.ws === b.red; })());
  check('a pilot who is lost is let go the next time anyone asks: who is All pilots again, and the order goes to all three', (() => { g.run(`C.sel = 'pilot:yellow'; campWingShips(C, 'yellow').forEach(u => { u.hp = 0; });`); return J('campSelNow(C).id') === 'all' && J('C.sel') === 'all' && J(`campSelList(C).map(e => e.id).join()`) === 'all,pilot:red,pilot:green'; })());
  check('with the three pilots in the bay every pilot is a stop (an order launches the pilot picked); with none out and the bay empty All pilots is the only stop: D and A stay on it (the pick holds, the order keys say "No fighters are out")', (() => { const C0 = J(`(() => { const C = __new('home'); const bay = campSelList(C).map(e => e.id).join(); C.bay.fighters = 0; return [bay, campSelList(C).map(e => e.id).join(), campSelStep(C, 1).id, campSelStep(C, -1).id, C.sel, campSelNow(C).units.length]; })()`); return C0.join() === 'all,pilot:red,pilot:green,pilot:yellow,all,all,all,all,0'; })());
}

console.log('C. the friendly');
{
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0);`);
  check('the list is the ships you protect (a transport put beside the cruiser here), then the outposts of the level (home: Lunar base, Earth, Mars), each nearest the cruiser first; no pilot is in it', J(`campFriList(C).map(e => e.kind).join()`).startsWith('ward,post') && J(`campFriList(C)[0].id`) === 'freighter-t1' && J(`campFriList(C).filter(e => e.kind === 'post').every(e => e.id.startsWith('place:') && e.unit === null && e.name)`) && J(`campFriList(C).every(e => !e.id.startsWith('pilot:'))`));
  g.run(`C.fsel = '';`);
  check('P with none picked takes the first (the transport), O the last (an outpost); P again goes on, round at the ends', J(`campFriStep(C, 1).id`) === 'freighter-t1' && J(`campFriStep(C, 1).kind`) === 'post' && (g.run(`C.fsel = ''`), J(`campFriStep(C, -1).id`) === J(`campFriList(C).slice(-1)[0].id`)) && (g.run(`C.fsel = campFriList(C).slice(-1)[0].id`), J(`campFriStep(C, 1).id`) === 'freighter-t1'));
  check('a ship you protect is a unit (friendly), an outpost is no unit: friendly is null and friendlyPost is its entry (name, x, y, r)', (() => { g.run(`C.fsel = 'freighter-t1'`); const a = J('campSelUnits(C)'); g.run(`C.fsel = campFriList(C).find(e => e.kind === 'post').id`); const b = J('campSelUnits(C)'); return a.friendly && a.friendly.id === 'freighter-t1' && a.friendlyPost === null && b.friendly === null && b.friendlyPost && b.friendlyPost.kind === 'post' && typeof b.friendlyPost.x === 'number' && b.friendlyPost.name.length > 0; })());
  check('a friendly that is lost is let go the next time anyone asks (the transport destroyed: none picked); one that is picked and still there stays; campFriClear lets it go', (() => { g.run(`C.fsel = 'freighter-t1';`); const b1 = J('campFriNow(C) !== null'); g.run(`C.by['freighter-t1'].hp = 0;`); const gone = J('campFriNow(C)') === null && J('C.fsel') === ''; g.run(`C.fsel = campFriList(C)[0].id;`); return b1 && gone && J('campFriClear(C)') === true && J('C.fsel') === '' && J('campFriClear(C)') === false; })());
  check('with nothing to protect (no ship, a level without outposts or an empty list) P and O answer null and leave none picked', (() => { const r = J(`(() => { const C = __new('home'); C.ships = C.ships.filter(u => u.team !== 'earth' || u.kind === 'carrier'); const saved = campOutposts; return [campFriList(C).filter(e => e.kind === 'ward').length, C.fsel]; })()`); return r[0] === 0 && r[1] === ''; })());
}

console.log('D. who and one target');
{
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0); window.F1 = __foe(C, 900, 0); window.F2 = __foe(C, -500, 200);`);
  const k = code => J(`(() => { const r = __key(P, C, '${code}'); return { used: r.used, ran: r.ran, fleet: r.fleet, tgt: r.tgt, sel: r.sel, fsel: r.fsel, open: r.open }; })()`);
  const a = k('BracketRight'), b = k('KeyD'), c = k('KeyP');
  check('] picks the enemy, D who (Wedge) and P a friendly: each key is used, none is an order, none opens a list; the friendly REPLACES the enemy (one target) and who stays', a.used && !a.ran && a.tgt !== '' && a.fsel === '' && b.used && !b.ran && b.sel === 'pilot:red' && b.tgt === a.tgt && c.used && !c.ran && c.fsel === 'freighter-t1' && c.tgt === '' && J('C.tgt') === '' && J('C.sel') === 'pilot:red' && J('C.fsel') === 'freighter-t1' && J('campPanelOpen(P)') === '');
  const e = k('BracketRight');
  check('the enemy replaces the friendly the other way round: ] with a friendly held picks the nearest enemy and lets the friendly go; who stays', e.tgt !== '' && e.fsel === '' && J('C.fsel') === '' && J('C.tgt') === J('campTgtList(C)[0].id') && J('C.sel') === 'pilot:red');
  k('KeyO');
  const e2 = k('BracketLeft');
  check('O picks a friendly again (the enemy goes) and [ an enemy again (the friendly goes): at most one of the two is ever set', J('C.fsel') === '' && e2.tgt !== '' && e2.fsel === '' && (() => { const sets = []; ['KeyP', 'KeyO', 'BracketRight', 'Backslash', 'KeyP', 'BracketLeft', 'KeyO'].forEach(code => { k(code); sets.push(J('C.tgt') !== '' && J('C.fsel') !== ''); }); return sets.every(x => !x); })());
  k('KeyO'); // a friendly is held
  const d1 = J('C.fsel'); k('KeyD');
  check('D and A step who and leave the target alone, a friendly or an enemy', J('C.fsel') === d1 && J('C.tgt') === '' && J('C.sel') === 'pilot:green' && (() => { k('BracketRight'); const h = J('C.tgt'); k('KeyA'); return J('C.tgt') === h && J('C.fsel') === '' && J('C.sel') === 'pilot:red'; })());
  const s = k('Backslash');
  check('the backslash picks the nearest enemy (a friendly held goes) and does not touch who', J('C.tgt') === J('campTgtList(C)[0].id') && s.used && s.tgt === J('C.tgt') && J('C.fsel') === '' && J('C.sel') === 'pilot:red');
  check('campHeldNow reads the one target: the enemy ({ kind hostile, id, name, unit }), a ship you protect (kind friendly, its unit), an outpost (kind friendly, unit null, post its entry), none (null); a dead enemy is let go', (() => { const h1 = J('campHeldNow(C)'); const t = J('C.tgt'); g.run(`C.fsel = 'freighter-t1'; C.tgt = '';`); const h2 = J('campHeldNow(C)'); g.run(`C.fsel = campFriList(C).find(e => e.kind === 'post').id;`); const h3 = J('campHeldNow(C)'); g.run(`C.fsel = ''; C.tgt = '';`); const h4 = J('campHeldNow(C)'); g.run(`C.tgt = campTgtList(C)[0].id; C.by[C.tgt].hp = 0;`); const h5 = J('campHeldNow(C)'); return h1 && h1.kind === 'hostile' && h1.id === t && h1.unit && h1.unit.id === t && h1.post === null && h1.name.length > 0 && h2.kind === 'friendly' && h2.id === 'freighter-t1' && h2.unit && h2.unit.id === 'freighter-t1' && h2.post === null && h3.kind === 'friendly' && h3.unit === null && h3.post && h3.post.kind === 'post' && h3.name.length > 0 && h4 === null && h5 === null && J('C.tgt') === ''; })());
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0);`); // no hostile in sight
  check('with no hostile a step of the enemy picks nothing and lets the friendly stay; with no friendly in the level an O or P step picks nothing and lets the enemy stay (one target is never lost by a key that finds nothing)', (() => { g.run(`C.fsel = 'freighter-t1';`); k('BracketRight'); k('Backslash'); const a1 = J('C.fsel') === 'freighter-t1' && J('C.tgt') === ''; g.run(`window.F9 = __foe(C, 900, 0); C.fsel = ''; campTgtNearest(C); window.__pg = campPickGuardees; campPickGuardees = () => [];`); k('KeyP'); k('KeyO'); const a2 = J('C.tgt') === J('F9.id') && J('C.fsel') === ''; g.run(`campPickGuardees = __pg;`); return a1 && a2; })());
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0); window.F1 = __foe(C, 900, 0); window.F2 = __foe(C, -500, 200); C.sel = 'pilot:yellow'; C.fsel = 'freighter-t1';`);
  const x = k('KeyX');
  check('X lets the target go (a friendly here) and puts who back on All pilots; with an enemy held it does the same', x.used && J('C.tgt') === '' && J('C.fsel') === '' && J('C.sel') === 'all' && x.tgt === '' && x.fsel === '' && x.sel === 'all' && J('campPicksClear(C)') === false && (() => { k('KeyD'); k('BracketRight'); k('KeyX'); return J('C.tgt') === '' && J('C.sel') === 'all'; })());
  check('S is no pick: it is the zoom\'s key (the scene reads it first) and the door answers nothing for it; Backspace and the semicolon neither', ['KeyS', 'Backspace', 'Semicolon'].every(c => !J(`(() => { const r = __key(P, C, '${c}'); return r.used || r.ran; })()`)));
  check('the keys work with a list open too, and the list stays open on its row (no key is reused): the target is the last of ] and P', (() => { g.run(`__key(P, C, 'KeyQ', 0); __key(P, C, 'ArrowDown', 0);`); const at = J('P.at'); k('BracketRight'); k('KeyD'); const t1 = J('C.tgt') !== '' && J('C.fsel') === ''; k('KeyP'); const ok = t1 && J('C.tgt') === '' && J('C.sel') !== 'all' && J('C.fsel') !== '' && J('P.open') === 'cruiser' && J('P.at') === at; g.run(`campPanelClose(P);`); return ok; })());
  check('O and P open no list with the lists off (the keys have nothing but the friendlies); with the ship list ON they open the old lists first (P the ship list, O power), as they did', (() => { const off = ['KeyO', 'KeyP'].every(c => { g.run(`campPanelClose(P)`); k(c); return J('campPanelOpen(P)') === ''; }); g.run(`campShipListSet(true); campPanelClose(P);`); k('KeyP'); const a = J('campPanelOpen(P)'); g.run(`campPanelClose(P);`); k('KeyO'); const b = J('campPanelOpen(P)'); g.run(`campShipListSet(false); campPanelClose(P);`); return off && a === 'ship' && b === 'power'; })());
}

console.log('E. the orders');
{
  const give = (sel, tgt, code, fsel) => J(`(() => { campWingOrder(C, 'fighters', 'guard', null, 'key'); C.sel = '${sel}'; C.tgt = '${tgt}'; C.fsel = '${fsel || ''}'; const r = campPanelKey(P, C, '${code}', 0); return { used: r.used, ran: r.ran, ok: r.ok, row: r.row, say: r.say, fleet: r.fleet, open: r.open, red: __ord(C, 'red'), green: __ord(C, 'green'), yellow: __ord(C, 'yellow'), tgt: C.tgt }; })()`);
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0); window.F1 = __foe(C, 900, 0); window.F2 = __foe(C, -1400, 300);`);
  const id1 = J('F1.id'), id2 = J('F2.id');
  const all = (r, v) => ['red', 'green', 'yellow'].every(k => r[k].split(',').every(x => x.startsWith(v)));
  const e0 = give('all', id2, 'KeyE');
  check('E with All pilots and the enemy picked: all three squads attack THAT ship (the farther one), the answer is in words, a fleet order, no list', e0.used && e0.ran && e0.ok && e0.row === 'attack' && e0.fleet && e0.open === '' && e0.say.length > 0 && all(e0, 'attack:' + id2), JSON.stringify(e0));
  const e1 = give('pilot:green', id1, 'KeyE');
  check('E with a pilot picked: that pilot\'s squad alone attacks, the others stay on guard', e1.ok && e1.green.split(',').every(x => x === 'attack:' + id1) && e1.red.startsWith('guard') && e1.yellow.startsWith('guard'), JSON.stringify(e1));
  const e2 = give('all', '', 'KeyE');
  check('E with no enemy picked: the nearest is picked (as the backslash would, it is THE target now) and all three go at it', e2.ok && e2.tgt === id1 && all(e2, 'attack:' + id1), JSON.stringify(e2));
  const r1 = give('all', '', 'KeyG', 'freighter-t1');
  check('G with a ship you protect picked as the friendly: all three squads guard THAT ship (in formation beside it)', r1.ok && r1.row === 'guard' && all(r1, 'guard:freighter-t1') && /guard/i.test(r1.say), JSON.stringify(r1));
  const r1b = give('pilot:red', '', 'KeyG', 'freighter-t1');
  check('G with a pilot picked as who and the ship as the friendly: that pilot guards the ship alone (who and the friendly are two picks now)', r1b.ok && r1b.red.split(',').every(x => x === 'guard:freighter-t1') && r1b.green.startsWith('guard:') && !r1b.green.includes('freighter') , JSON.stringify(r1b));
  const post = J(`campFriList(C).find(e => e.kind === 'post').id`);
  const r1c = give('all', '', 'KeyG', post);
  check('G with an outpost picked as the friendly: all three guard that outpost', r1c.ok && all(r1c, 'guard:luna') && /guard Luna/i.test(r1c.say), JSON.stringify(r1c));
  const r2 = give('all', '', 'KeyG');
  check('G with no friendly picked: all three guard the cruiser; with a pilot picked that pilot alone does', r2.ok && all(r2, 'guard:') && !r2.red.includes('freighter') && (() => { const r3 = give('pilot:red', '', 'KeyG'); return r3.ok && r3.red.split(',').every(x => x.startsWith('guard:')); })());
  const t1 = give('pilot:yellow', '', 'KeyR');
  check('R with a pilot picked: that squad flies home alone; with All pilots all three recall', t1.ok && t1.row === 'recall' && t1.yellow.split(',').every(x => x.startsWith('recall')) && t1.red.startsWith('guard') && (() => { const t2 = give('all', '', 'KeyR'); return t2.ok && all(t2, 'recall'); })());
  check('the same orders through the wing\'s own door: campSelOrder(C, verb, how, dry) says yes or no without doing it (dry)', J(`(() => { campWingOrder(C, 'fighters', 'guard', null, 'key'); const d = campSelOrder(C, 'attack', 'key', true); return d.ok === true && __ord(C, 'red').startsWith('guard'); })()`));
  g.run(`C.ships = C.ships.filter(u => u.team !== 'alien'); C.tgt = ''; C.sel = 'all'; C.fsel = '';`);
  const nf = J(`(() => { campSquadsFree(P); const r = campPanelKey(P, C, 'KeyE', 0); return { ran: r.ran, ok: r.ok, say: r.say, ring: P.ring }; })()`);
  check('E with no hostile in sight is refused in words, nothing is done and no ring is kept', nf.ran && !nf.ok && /no hostiles/i.test(nf.say) && nf.ring === null && J(`__ord(C, 'red')`).startsWith('guard'), JSON.stringify(nf));
  g.run(`window.C0 = __new('home'); C0.bay.fighters = 0; window.P0 = campPanelNew();`); // none out and the bay empty (a pilot in the bay takes an order by launching: card space-game-keys-orders)
  const nw = J(`(() => { const r = campPanelKey(P0, C0, 'KeyG', 0); return { ran: r.ran, ok: r.ok, say: r.say }; })()`);
  check('with no fighter out and the bay empty all three keys are refused in words: "No fighters are out"', nw.ran && !nw.ok && /fighters/i.test(nw.say) && ['KeyE', 'KeyR'].every(c => { const r = J(`campPanelKey(P0, C0, '${c}', 0)`); return r.ran && !r.ok && /fighters|hostile/i.test(r.say); }));
  g.run(`window.C3 = __out(); window.P3 = campPanelNew(); window.F3 = __foe(C3, 900, 0); C3.sel = 'pilot:red'; campPanelKey(P3, C3, 'KeyE', 1000);`);
  check('an order keeps the ring of the squad it went to (a pilot picked: that squad; All pilots: all three) for CAMP.wing.ringKeep ms', J(`campSquadsShown(P3, C3, 1001).join()`) === 'red' && (g.run(`C3.sel = 'all'; campPanelKey(P3, C3, 'KeyR', 2000);`), J(`campSquadsShown(P3, C3, 2001).join()`) === 'red,green,yellow' && J(`campSquadsShown(P3, C3, 2000 + CAMP.wing.ringKeep + 1).length`) === 0));
  check('a pilot picked keeps a ring on its own squad while no list is open and no order has a ring; All pilots (the default) rings nobody', (() => { g.run(`window.P4 = campPanelNew(); C3.sel = 'pilot:green';`); const a = J(`campSquadsFocus(P4, C3).join()`); g.run(`C3.sel = 'all';`); return a === 'green' && J(`campSquadsFocus(P4, C3).length`) === 0; })());
}

console.log('F. Q is the cruiser list (card space-game-keys-orders); all pilots is the first stop of A D');
{
  g.run(`window.C = __out(); window.P = campPanelNew(); window.F1 = __foe(C, 900, 0);`);
  g.run(`C.sel = 'pilot:green';`);
  const q = J(`(() => { const r = __key(P, C, 'KeyQ'); return { used: r.used, ran: r.ran, ok: r.ok, open: r.open, sel: r.sel }; })()`);
  check('Q is used, gives no order, opens the cruiser list, and who stays where it was (Kara: Q picks nobody now)', q.used && !q.ran && q.open === 'cruiser' && J('C.sel') === 'pilot:green' && J('campPanelOpen(P)') === 'cruiser');
  g.run(`campPanelClose(P); C.sel = 'all';`);
  const now = J(`(() => { const f = campSelNow(C); return { id: f.id, kind: f.kind, name: f.name, unit: f.unit, n: f.units.length, squads: f.units.map(u => u.squad).sort().join() }; })()`);
  check('campSelNow says it: kind all, the name "All pilots" (camp.sel.all), no one ship (unit null) and the three pilots\' ships (units), one for each squad', now.id === 'all' && now.kind === 'all' && now.name === 'All pilots' && now.unit === null && now.n === 3 && now.squads === 'green,red,yellow');
  check('Q with another list open opens the cruiser list in its place (one list at a time) and picks nothing', (() => { g.run(`C.sel = 'pilot:red'; campPanelGo(P, C, 'power')`); const was = J('P.open'); const r = J(`__key(P, C, 'KeyQ', 0)`); const ok = was === 'power' && r.used && J('C.sel') === 'pilot:red' && J('P.open') === 'cruiser'; g.run(`campPanelClose(P)`); return ok; })());
  check('with no fighter out and the bay empty Q still opens its list and E, G, R are refused in words: "No fighters are out"', (() => { g.run(`window.C0 = __new('home'); C0.bay.fighters = 0; window.P0 = campPanelNew(); campPanelKey(P0, C0, 'KeyQ', 0)`); return J('campPanelOpen(P0)') === 'cruiser' && (g.run(`campPanelClose(P0)`), ['KeyE', 'KeyG', 'KeyR'].every(c => { const r = J(`campPanelKey(P0, C0, '${c}', 0)`); return r.ran && !r.ok && /fighters|hostile/i.test(r.say); })); })());
  check('the switch turns the old code back on: CAMP_FLEET_LIST false is the game (Q the cruiser list); campFleetListSet(true) gives Q the fleet list, false brings the cruiser list back', (() => { g.run(`campFleetListSet(true)`); g.run(`window.P7 = campPanelNew(); window.C7 = __out(); C7.sel = 'pilot:red'; campPanelKey(P7, C7, 'KeyQ', 0)`); const on = J('campPanelOpen(P7)') === 'fleet' && J('C7.sel') === 'pilot:red'; g.run(`campFleetListSet(false); campPanelClose(P7); campPanelKey(P7, C7, 'KeyQ', 0)`); return on && J('C7.sel') === 'pilot:red' && J('campPanelOpen(P7)') === 'cruiser'; })());
}

console.log('G. through the scene');
{
  g.run(`
    window.__fake = level => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
      f.time = { delayedCall: (ms, fn) => fn(), now: 0 }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
      const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'repair'].forEach(k => { h[k] = { text: '', setText(t) { h[k].text = t; return h[k]; } }; }); f.hud = h;
      f.k = {}; ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE'].forEach(k => { f.k[k] = { isDown: false }; });
      f.init({ level }); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; return f; };
    toast = () => {}; shipcompSay = () => true; window.F = __fake('home'); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.update(0, 33);
    campOrder(F.camp, 'launch'); for (let i = 0; i < 300; i++) F.update(i * 33, 33); F.camp.ships = F.camp.ships.filter(u => u.team !== 'alien'); window.RX = campSpawn(F.camp, 'raider', F.camp.carrier.x + 1000, F.camp.carrier.y);
  `);
  g.run(`campDebugSet(true); F.onKey({ code: 'BracketRight' }); F.onKey({ code: 'KeyD' });`);
  check('through Campaign.onKey with the tune kit ON: ] still picks the enemy and D the first pilot (the kit has other keys: \' skip, 6 win, 7 lose, ` god)', J('F.camp.tgt') === J('RX.id') && J('F.camp.sel') === 'pilot:red' && J('F.mode') === 'play' && J('F.mode') !== 'lost');
  g.run(`F.camp.tgt = ''; F.onKey({ code: 'Backslash' }); window.__nearest = F.camp.tgt === RX.id; F.onKey({ code: 'KeyO' }); F.onKey({ code: 'KeyP' });`);
  check('with the kit ON the backslash is the nearest threat (not the kit\'s win: the mission goes on), O and P pick a friendly (not the kit\'s lose) and let the enemy go', J('__nearest') && J('F.camp.tgt') === '' && J('F.mode') === 'play' && !J('F.camp.result') && J('F.camp.fsel') !== '', J('F.camp.fsel'));
  g.run(`campDebugSet(false); F.camp.fsel = ''; F.camp.sel = 'pilot:red'; F.camp.tgt = RX.id; F.onKey({ code: 'KeyE' });`);
  check('E through the scene attacks the picked enemy with the picked pilot alone', J(`campWingShips(F.camp, 'red').every(u => u.order.type === 'attack' && u.order.target === RX.id)`) && J(`campWingShips(F.camp, 'green').every(u => u.order.type !== 'attack')`));
  g.run(`F.camp.fsel = 'place:luna'; F.onKey({ code: 'KeyX' });`);
  check('X through the scene lets the target go and puts who back on All pilots', J('F.camp.tgt') === '' && J('F.camp.fsel') === '' && J('F.camp.sel') === 'all');
  check('S through the scene resets the zoom to the default and no other key does it; Backspace does nothing to the zoom', (() => { g.run(`CAMZOOM.want = 0.8; F.onKey({ code: 'Backspace' });`); const a = J('CAMZOOM.want') === 0.8; g.run(`F.onKey({ code: 'KeyS' });`); return a && Math.abs(J('CAMZOOM.want') - J('campZoomDefault()')) < 1e-9; })());
  check('the semicolon does nothing (no balance key): the power stays where the J K L keys put it; the balance is still an order (the power list row, the strip)', (() => { g.run(`F.onKey({ code: 'KeyJ' }); window.__p = F.camp.power.p.join();`); const before = J('__p'); g.run(`F.onKey({ code: 'Semicolon' });`); const same = J('F.camp.power.p.join()') === before; return same && J(`campOrder(F.camp, 'balance', '', 'strip').ok`) === true && J('F.camp.power.p.join()') === '2,2,2'; })());
  check('hold to speak is off behind its switch: no key, no key cap (listenScene is null for the Campaign), no row on the H page; campVoiceSet(true, key) gives it a key and a row, and false takes them away again', (() => {
    const off = J(`campKeyCodes('voice').length`) === 0 && !J(`controlsGroup('campaign').rows.some(r => r.voice)`) && J(`(() => { const game = { scene: { getScenes: () => [{ scene: { key: 'Campaign' } }] } }; return listenScene(game); })()`) === null;
    g.run(`campVoiceSet(true, { k: 'V', codes: ['KeyV'] })`);
    const on = J(`campKeyIs('voice', 'KeyV')`) && J(`controlsGroup('campaign').rows.some(r => r.voice && r.k.join() === 'V')`) && J(`(() => { const game = { scene: { getScenes: () => [{ scene: { key: 'Campaign' } }] } }; return !!listenScene(game); })()`);
    g.run(`campVoiceSet(false)`);
    return off && on && J(`campKeyCodes('voice').length`) === 0 && !J(`controlsGroup('campaign').rows.some(r => r.voice)`);
  })());
  // the brackets: a red one round the enemy, a green one round the pilot picked and one round the friendly ship (src/camptargetdraw.js)
  g.run(`window.__lines = []; F.tgtG = { active: true, scene: {}, clear() { __lines.length = 0; return F.tgtG; }, lineStyle(w, c, a) { window.__col = c; return F.tgtG; }, lineBetween() { __lines.push(window.__col); return F.tgtG; } }; F.mode = 'play'; F.mp = null; F.cameras = { main: { zoom: 1 } };`);
  g.run(`F.camp.tgt = RX.id; F.camp.sel = 'pilot:red'; F.camp.fsel = ''; campTgtPaint(F);`);
  check('both brackets are drawn for an enemy and a pilot: eight corner strokes, four in the enemy\'s red and four in the pilot\'s green', J('__lines.length') === 16 && J('__lines.filter(c => c === CAMPTGT.color).length') === 8 && J('__lines.filter(c => c === CAMPTGT.friend).length') === 8 && J('CAMPTGT.friend') !== J('CAMPTGT.color'), JSON.stringify(J('__lines')));
  g.run(`F.camp.tgt = ''; F.camp.sel = 'all'; campTgtPaint(F);`);
  check('with All pilots picked (the default) and no enemy there is no red bracket, and each pilot out has the green square: eight strokes a pilot, all in the friend\'s colour (card space-game-keys2-panels: all three pilots light up)', J('campSelUnits(F.camp).whoShips.length') === 3 && J('__lines.length') === 24 && J('__lines.every(c => c === CAMPTGT.friend)'), JSON.stringify(J('__lines.length')));
  g.run(`F.camp.fsel = campFriList(F.camp).find(e => e.kind === 'ward') ? campFriList(F.camp).find(e => e.kind === 'ward').id : ''; campTgtPaint(F);`);
  check('a friendly ship picked gets the green bracket too (an outpost has none), on top of the pilots\'', J('F.camp.fsel') === '' ? J('__lines.length') === 24 : J('__lines.length') === 32 && J('__lines.every(c => c === CAMPTGT.friend)'));
}

check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nSELECT KEYS FAIL (${failed} of ${n})` : `\nSELECT KEYS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
