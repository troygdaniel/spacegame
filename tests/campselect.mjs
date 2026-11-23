// smoke: the two selections and the order keys of the Campaign: [ ] pick a HOSTILE, A D a FRIEND (a pilot or a ship you protect), S the nearest, X clears both; E attack, R guard, T recall act on them (plain Node, no Chrome)
// Card space-game-bracket-select-orders (Troy, 23 Nov 2026, like X-Wing; revised the same day: A D friends, [ ] hostiles). The rules are src/camptarget.js (campSel*), the keys CAMP_KEYS (src/data_controls.js), the door src/camppanel.js.
//   A. the table: the codes, the squads' own lists gone, the debug kit off the brackets, the H page and the texts say the keys
//   B. the friend: the pilots first (red, green, yellow), then the ships you protect; D and A step round the ends; a lost one is let go; campSelUnits gives { hostile, friend }
//   C. two selections held at once; X lets both go; the hostile keys and the friend keys never touch each other's
//   D. E, R, T: all three, or the one pilot picked; E at the hostile picked (none picked: the nearest is picked, as S would); R at a ship you protect (a pilot or none: the cruiser); T home; refusals in words
//   E. through the scene: the keys reach the lists' door, the debug kit's old keys (] [) are the selection's and the kit has others, the green bracket is drawn for the friend
// Run: node tests/campselect.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
g.run(`
  window.__run = (C, s) => { for (let i = 0; i < Math.round(s * 30) && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__new = (level, mission) => { const C = campNew(level, [], { seed: 5, god: true, mission: mission || 0 }); C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__out = () => { const C = __new('home'); campOrder(C, 'launch'); __run(C, 8); return C; };
  window.__foe = (C, dx, dy) => campSpawn(C, 'raider', C.carrier.x + dx, C.carrier.y + dy);
  window.__hauler = (C, id, name, dx, dy, tox, toy) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y + dy); f.id = 'freighter-' + id; C.by[f.id] = f; f.dest = { x: C.carrier.x + tox, y: C.carrier.y + toy }; f.cname = name; f.named = true; return f; }; // a ship you protect
  window.__ord = (C, k) => campWingShips(C, k).map(u => (u.order && u.order.type) + ':' + ((u.order && (u.order.target || (u.order.at && u.order.at.id))) || '')).join();
  window.__key = (P, C, code, now) => campPanelKey(P, C, code, now || 0);
`);

console.log('A. the table');
{
  check('the keys: [ ] the hostile (last, next), A D the friend (flast, fnext), S the nearest, X clears both, E R T attack, guard, recall (CAMP_KEYS holds the codes)', J(`['last', 'next', 'flast', 'fnext', 'near', 'clear', 'attack', 'guard', 'recall'].map(id => CAMP_KEYS[id].codes[0]).join()`) === 'BracketLeft,BracketRight,KeyA,KeyD,KeyS,KeyX,KeyE,KeyR,KeyT' && J(`['last', 'next', 'flast', 'fnext', 'near', 'clear', 'attack', 'guard', 'recall'].map(id => CAMP_KEYS[id].k).join('')`) === '[]ADSXERT');
  check('the squads have no list of their own and no row of Q: the fleet list and the ship list are switched off (no code), W is the all-squads list, P (and O: alt) is the power list, Q picks all three pilots (CAMP_KEYS.all); E R T open no list', J(`CAMP_PANELS.panels.map(p => p.id).join()`) === 'fleet,convoy,squads,ship,power,nav,yard' && J(`CAMP_PANELS.panels.filter(p => p.code).map(p => p.code).join()`) === 'KeyW,KeyP,KeyI,KeyU' && J(`CAMP_PANELS.panels.find(p => p.id === 'power').alt`) === 'KeyO' && J(`campKeyCodes('all').join()`) === 'KeyQ' && J(`['KeyE', 'KeyR', 'KeyT'].every(c => !CAMP_PANELS.panels.some(p => p.code === c))`));
  check('no direct key is a list\'s key or another direct key: the codes are all different', (() => { const ks = J(`Object.keys(CAMP_KEYS).filter(id => !/^(up|down|pick)$/.test(id)).flatMap(id => CAMP_KEYS[id].codes).concat(CAMP_PANELS.panels.filter(p => p.code).map(p => p.code))`); return new Set(ks).size === ks.length; })());
  check('the tune kit\'s old skip and lose keys are off the brackets (the brackets are the selection\'s): none of the kit\'s codes is a bracket, and with the kit on the brackets still pick', J(`CAMP_DEBUG.keys.every(r => !/^Bracket/.test(r.code))`) && J(`(() => { campDebugSet(true); const ok = campDebugKey('BracketLeft') === null && campDebugKey('BracketRight') === null && campDebugKey('Quote') === 'skip' && campDebugKey('Comma') === 'lose'; campDebugSet(false); return ok; })()`));
  check('the H page has the keys under THE TARGET: [ ] the hostile, A D the friend, Q all three pilots, E R T the orders, S X F', (() => { const rows = J(`controlsGroup('campaign').rows.filter(r => r.sub === 'THE TARGET').map(r => r.k.join(' '))`); return rows.join('|') === '[ ]|A D|Q|E R T|S X F'; })());
  check('the words say them from the table: no target says [ ] and S; the pause card, the briefing and the fleet hint say E attack, R guard, T recall', J(`uiText('camp.no.notarget')`) === 'No target, pilot. [ or ] picks one, S the nearest.' && /E attack, R guard, T recall/.test(J(`uiText('camp.hint.fleet')`)) && /E attack, R guard, T recall/.test(J(`uiText('camp.bf.1.1.n3')`)) && /A D a friend, E attack, R guard, T recall/.test(J(`uiText('camp.ui.pausepanels')`)));
}

console.log('B. the friend');
{
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0);`);
  check('the list is the pilots with a ship out (red, green, yellow), then the ships you protect (a transport put beside the cruiser here), the nearest to the cruiser first', J(`campSelList(C).map(e => e.id).join()`).startsWith('pilot:red,pilot:green,pilot:yellow') && J(`campSelList(C).filter(e => e.kind === 'ward').every(e => e.unit && e.unit.hp > 0)`) && J(`campSelList(C).filter(e => e.kind === 'pilot').map(e => e.squad).join()`) === 'red,green,yellow');
  g.run(`C.sel = '';`);
  check('D with none picked takes the first (the red pilot), A the last; D again goes on, round at the ends', J(`campSelStep(C, 1).id`) === 'pilot:red' && J(`campSelStep(C, 1).id`) === 'pilot:green' && (g.run(`C.sel = ''`), J(`campSelStep(C, -1).id`) === J(`campSelList(C).slice(-1)[0].id`)) && (g.run(`C.sel = campSelList(C).slice(-1)[0].id`), J(`campSelStep(C, 1).id`) === 'pilot:red'));
  check('campSelUnits is { hostile, friend }: null and null with nothing picked, the ships when picked (the pilot\'s ship is the squad\'s first)', (() => { g.run(`C.sel = ''; C.tgt = ''; window.__f = __foe(C, 900, 0);`); const none = J('campSelUnits(C)'); g.run(`campTgtNearest(C); campSelStep(C, 1);`); const both = J(`({ h: campSelUnits(C).hostile.id, f: campSelUnits(C).friend.id, fs: campWingShips(C, 'red')[0].id })`); return none.hostile === null && none.friend === null && both.h === J('__f.id') && both.f === both.fs; })());
  check('a friend that is lost is let go the next time anyone asks: a pilot whose squad has no ship out, a ship you protect that is gone', (() => { g.run(`C.sel = 'pilot:yellow'; campWingShips(C, 'yellow').forEach(u => { u.hp = 0; });`); const a = J('campSelNow(C)') === null && J('C.sel') === ''; const w = J(`campSelList(C).find(e => e.kind === 'ward')`); if (!w) return a; g.run(`C.sel = '${w.id}';`); const b1 = J('campSelNow(C) !== null'); g.run(`C.by['${w.id}'].hp = 0;`); return a && b1 && J('campSelNow(C)') === null && J('C.sel') === ''; })());
  check('with no ship out nobody is a friend to pick but the ships you protect: D answers null with none of those either', (() => { const C0 = J(`(() => { const C = __new('home'); C.ships = C.ships.filter(u => u.team !== 'earth' || u.kind === 'carrier'); return [campSelList(C).length, campSelStep(C, 1), C.sel]; })()`); return C0[0] === 0 && C0[1] === null && C0[2] === ''; })());
}

console.log('C. two selections at once');
{
  g.run(`window.C = __out(); window.P = campPanelNew(); window.F1 = __foe(C, 900, 0); window.F2 = __foe(C, -500, 200);`);
  const k = code => J(`(() => { const r = __key(P, C, '${code}'); return { used: r.used, ran: r.ran, fleet: r.fleet, tgt: r.tgt, sel: r.sel, open: r.open }; })()`);
  const a = k('BracketRight'), b = k('KeyD');
  check('] picks the hostile and D the friend: both are held, each key is used, none is an order, none opens a list', a.used && !a.ran && a.tgt !== '' && b.used && !b.ran && b.sel === 'pilot:red' && J('C.tgt') === a.tgt && J('C.sel') === 'pilot:red' && J('campPanelOpen(P)') === '');
  k('BracketRight'); k('KeyD');
  check('the next ] steps the hostile and leaves the friend; the next D steps the friend and leaves the hostile', J('C.tgt') !== a.tgt && J('C.sel') === 'pilot:green' && (() => { const h = J('C.tgt'); k('KeyD'); return J('C.tgt') === h && J('C.sel') === 'pilot:yellow'; })() && (() => { const f = J('C.sel'); k('BracketLeft'); return J('C.sel') === f; })());
  const s = k('KeyS');
  check('S picks the nearest hostile and does not touch the friend', J('C.tgt') === J('campTgtList(C)[0].id') && s.tgt === J('C.tgt') && J('C.sel') === 'pilot:yellow');
  const x = k('KeyX');
  check('X lets both go', x.used && J('C.tgt') === '' && J('C.sel') === '' && x.tgt === '' && x.sel === '');
  check('the keys work with a list open too, and the list stays open on its row (no key is reused)', (() => { g.run(`__key(P, C, 'KeyW', 0); __key(P, C, 'ArrowDown', 0);`); const at = J('P.at'); k('BracketRight'); k('KeyD'); const ok = J('C.tgt') !== '' && J('C.sel') !== '' && J('P.open') === 'squads' && J('P.at') === at; g.run(`campPanelClose(P);`); return ok; })());
}

console.log('D. the orders');
{
  const give = (sel, tgt, code) => J(`(() => { campWingOrder(C, 'fighters', 'guard', null, 'key'); C.sel = '${sel}'; C.tgt = '${tgt}'; const r = campPanelKey(P, C, '${code}', 0); return { used: r.used, ran: r.ran, ok: r.ok, row: r.row, say: r.say, fleet: r.fleet, open: r.open, red: __ord(C, 'red'), green: __ord(C, 'green'), yellow: __ord(C, 'yellow'), tgt: C.tgt }; })()`);
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0); window.F1 = __foe(C, 900, 0); window.F2 = __foe(C, -1400, 300);`);
  const id1 = J('F1.id'), id2 = J('F2.id');
  const all = (r, v) => ['red', 'green', 'yellow'].every(k => r[k].split(',').every(x => x.startsWith(v)));
  const e0 = give('', id2, 'KeyE');
  check('E with the hostile picked and no friend: all three squads attack THAT ship (the farther one), the answer is in words, a fleet order, no list', e0.used && e0.ran && e0.ok && e0.row === 'attack' && e0.fleet && e0.open === '' && e0.say.length > 0 && all(e0, 'attack:' + id2), JSON.stringify(e0));
  const e1 = give('pilot:green', id1, 'KeyE');
  check('E with a pilot picked: that pilot\'s squad alone attacks, the others stay on guard', e1.ok && e1.green.split(',').every(x => x === 'attack:' + id1) && all({ red: e1.red, green: 'guard:', yellow: e1.yellow }, 'guard') && e1.red.startsWith('guard') && e1.yellow.startsWith('guard'), JSON.stringify(e1));
  const e2 = give('', '', 'KeyE');
  check('E with nothing picked: the nearest hostile is picked (as S would, it is THE target now) and all three go at it', e2.ok && e2.tgt === id1 && all(e2, 'attack:' + id1), JSON.stringify(e2));
  const w = J(`campSelList(C).find(e => e.kind === 'ward')`);
  if (w) {
    const r1 = give(w.id, '', 'KeyR');
    check('R with a ship you protect picked: all three squads guard THAT ship (in formation beside it)', r1.ok && r1.row === 'guard' && all(r1, 'guard:' + w.id) && /guard/i.test(r1.say), JSON.stringify(r1));
  } else check('the home level has a ship to protect', false);
  const r2 = give('pilot:red', '', 'KeyR');
  check('R with a pilot picked: that pilot guards the cruiser (alone); with nothing picked all three do', r2.ok && r2.red.split(',').every(x => x.startsWith('guard:')) && (() => { const r3 = give('', '', 'KeyR'); return r3.ok && all(r3, 'guard:'); })());
  const t1 = give('pilot:yellow', '', 'KeyT');
  check('T with a pilot picked: that squad flies home alone; with none picked all three recall', t1.ok && t1.row === 'recall' && t1.yellow.split(',').every(x => x.startsWith('recall')) && t1.red.startsWith('guard') && (() => { const t2 = give('', '', 'KeyT'); return t2.ok && all(t2, 'recall'); })());
  check('the same orders through the wing\'s own door: campSelOrder(C, verb, how, dry) says yes or no without doing it (dry)', J(`(() => { campWingOrder(C, 'fighters', 'guard', null, 'key'); const d = campSelOrder(C, 'attack', 'key', true); return d.ok === true && __ord(C, 'red').startsWith('guard'); })()`));
  g.run(`C.ships = C.ships.filter(u => u.team !== 'alien'); C.tgt = ''; C.sel = '';`);
  const nf = J(`(() => { campSquadsFree(P); const r = campPanelKey(P, C, 'KeyE', 0); return { ran: r.ran, ok: r.ok, say: r.say, ring: P.ring }; })()`);
  check('E with no hostile in sight is refused in words, nothing is done and no ring is kept', nf.ran && !nf.ok && /no hostiles/i.test(nf.say) && nf.ring === null && J(`__ord(C, 'red')`).startsWith('guard'), JSON.stringify(nf));
  g.run(`window.C0 = __new('home'); window.P0 = campPanelNew();`);
  const nw = J(`(() => { const r = campPanelKey(P0, C0, 'KeyR', 0); return { ran: r.ran, ok: r.ok, say: r.say }; })()`);
  check('with no fighter out all three keys are refused in words: "No fighters are out"', nw.ran && !nw.ok && /fighters/i.test(nw.say) && ['KeyE', 'KeyT'].every(c => { const r = J(`campPanelKey(P0, C0, '${c}', 0)`); return r.ran && !r.ok && /fighters|hostile/i.test(r.say); }));
  g.run(`window.C3 = __out(); window.P3 = campPanelNew(); window.F3 = __foe(C3, 900, 0); C3.sel = 'pilot:red'; campPanelKey(P3, C3, 'KeyE', 1000);`);
  check('an order keeps the ring of the squad it went to (a pilot picked: that squad; none picked: all three) for CAMP.wing.ringKeep ms, and the ring follows the pilot picked', J(`campSquadsShown(P3, C3, 1001).join()`) === 'red' && (g.run(`C3.sel = ''; campPanelKey(P3, C3, 'KeyT', 2000);`), J(`campSquadsShown(P3, C3, 2001).join()`) === 'red+green+yellow'.split('+').join() && J(`campSquadsShown(P3, C3, 2000 + CAMP.wing.ringKeep + 1).length`) === 0));
}

console.log('E. through the scene');
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
  check('through Campaign.onKey with the tune kit ON: ] still picks the hostile and D the first pilot (the kit has other keys: \' skip, \\ win, , lose, ` god)', J('F.camp.tgt') === J('RX.id') && J('F.camp.sel') === 'pilot:red' && J('F.mode') === 'play' && J('F.mode') !== 'lost');
  g.run(`campDebugSet(false); F.onKey({ code: 'KeyE' });`);
  check('E through the scene attacks the picked hostile with the picked pilot alone', J(`campWingShips(F.camp, 'red').every(u => u.order.type === 'attack' && u.order.target === RX.id)`) && J(`campWingShips(F.camp, 'green').every(u => u.order.type !== 'attack')`));
  g.run(`F.onKey({ code: 'KeyX' });`);
  check('X through the scene lets both go', J('F.camp.tgt') === '' && J('F.camp.sel') === '');
  // the brackets: a red one round the hostile, a green one round the friend (src/camptargetdraw.js)
  g.run(`window.__lines = []; F.tgtG = { active: true, scene: {}, clear() { __lines.length = 0; return F.tgtG; }, lineStyle(w, c, a) { window.__col = c; return F.tgtG; }, lineBetween() { __lines.push(window.__col); return F.tgtG; } }; F.mode = 'play'; F.mp = null; F.cameras = { main: { zoom: 1 } };`);
  g.run(`F.camp.tgt = RX.id; F.camp.sel = 'pilot:red'; campTgtPaint(F);`);
  check('both brackets are drawn: eight corner strokes, four in the hostile\'s red and four in the friend\'s green', J('__lines.length') === 16 && J('__lines.filter(c => c === CAMPTGT.color).length') === 8 && J('__lines.filter(c => c === CAMPTGT.friend).length') === 8 && J('CAMPTGT.friend') !== J('CAMPTGT.color'), JSON.stringify(J('__lines')));
  g.run(`F.camp.tgt = ''; campTgtPaint(F);`);
  check('with only a friend picked only the green bracket is drawn', J('__lines.length') === 8 && J('__lines.every(c => c === CAMPTGT.friend)'));
}

console.log('F. Q picks all three pilots (card space-game-q-selects-all)');
{
  const give = (sel, tgt, code) => J(`(() => { campWingOrder(C, 'fighters', 'guard', null, 'key'); C.sel = '${sel}'; C.tgt = '${tgt}'; const r = campPanelKey(P, C, '${code}', 0); return { used: r.used, ran: r.ran, ok: r.ok, row: r.row, say: r.say, red: __ord(C, 'red'), green: __ord(C, 'green'), yellow: __ord(C, 'yellow') }; })()`);
  g.run(`window.C = __out(); window.P = campPanelNew(); window.W1 = __hauler(C, 't1', 'Transport', 500, 0, 9000, 0); window.F1 = __foe(C, 900, 0); window.F2 = __foe(C, -1400, 300);`);
  const id1 = J('F1.id'), all = (r, v) => ['red', 'green', 'yellow'].every(k => r[k].split(',').every(x => x.startsWith(v)));
  const q = J(`(() => { C.sel = ''; const r = __key(P, C, 'KeyQ'); return { used: r.used, ran: r.ran, ok: r.ok, fleet: r.fleet, open: r.open, sel: r.sel }; })()`);
  check('Q is used, gives no order, opens no list, and the friend is all three pilots (C.sel is all)', q.used && !q.ran && q.fleet && q.open === '' && q.sel === 'all' && J('C.sel') === 'all' && J('campPanelOpen(P)') === '');
  const now = J(`(() => { const f = campSelNow(C); return { id: f.id, kind: f.kind, name: f.name, unit: f.unit, n: f.units.length, squads: f.units.map(u => u.squad).sort().join() }; })()`);
  check('campSelNow says it: kind all, the name "All pilots" (camp.sel.all), no one ship (unit null) and the three pilots\' ships (units), one for each squad', now.id === 'all' && now.kind === 'all' && now.name === 'All pilots' && now.unit === null && now.n === 3 && now.squads === 'green,red,yellow' && J(`uiText('camp.sel.all')`) === 'All pilots');
  check('campSelUnits gives friend null and friends all three (what the zoom and the friend display read), the hostile as before; the zoom counts the three ships and the hostile', (() => { g.run(`C.tgt = F1.id`); const u = J(`(() => { const s = campSelUnits(C); return { h: s.hostile && s.hostile.id, f: s.friend, n: s.friends.length }; })()`); return u.h === id1 && u.f === null && u.n === 3 && J(`campSelZoomUnits(C).length`) === 4; })());
  check('the squads in focus are all three while Q is the pick and no list is open (the marks on the three fighters); a list\'s own focus takes over while it is open', J(`campSquadsFocus(P, C).join()`) === 'red,green,yellow' && (g.run(`campPanelKey(P, C, 'KeyP', 0)`), J(`campSquadsFocus(P, C).join()`) === 'red,green,yellow') && (g.run(`campPanelsClose({ pn: P }); P.open = ''`), true));
  const e = give('all', id1, 'KeyE');
  check('E with all picked and the hostile picked: all three squads attack THAT ship', e.ok && e.row === 'attack' && all(e, 'attack:' + id1), JSON.stringify(e));
  const e2 = give('all', '', 'KeyE');
  check('E with all picked and no hostile: the nearest is picked and all three go at it', e2.ok && all(e2, 'attack:' + id1) && J('C.tgt') === id1 && J('C.sel') === 'all', JSON.stringify(e2));
  const r = give('all', '', 'KeyR');
  check('R with all picked: all three guard the cruiser; T recalls all three', r.ok && all(r, 'guard:') && (() => { const t = give('all', '', 'KeyT'); return t.ok && all(t, 'recall'); })());
  check('the order keeps the ring of all three squads for CAMP.wing.ringKeep ms', (() => { g.run(`window.P9 = campPanelNew(); C.sel = 'all'; campPanelKey(P9, C, 'KeyR', 2000)`); return J(`campSquadsShown(P9, C, 2001).join()`) === 'red,green,yellow'; })());
  check('D steps from all to the first pilot and A to the last (they step the pilots and the ships you protect, as before); picking a ship you protect or a pilot replaces all; X lets it go', (() => { g.run(`C.sel = 'all'`); const d = J(`campSelStep(C, 1).id`); g.run(`C.sel = 'all'`); const a = J(`campSelStep(C, -1).id`); g.run(`C.sel = 'all'`); const w = J(`campSelList(C).find(x => x.kind === 'ward').id`); g.run(`C.sel = 'all'; __key(P, C, 'KeyX')`); return d === 'pilot:red' && a === J(`campSelList(C).slice(-1)[0].id`) && w !== '' && J('C.sel') === '' && J(`campSelNow(C)`) === null; })());
  check('a pilot lost shrinks the pick, not ends it: with the red ship gone all stays picked and units are two; Q again picks all', (() => { g.run(`C.sel = ''; __key(P, C, 'KeyQ'); campWingShips(C, 'red').forEach(u => { u.hp = 0; })`); const n2 = J(`campSelNow(C).units.filter(u => u.hp > 0).length`); return J('C.sel') === 'all' && n2 === 2 && J(`campSelUnits(C).friends.length`) >= 2; })());
  check('Q with a list open keeps that list open on its row (the list\'s keys are its own, Q is a direct key) and picks all', (() => { g.run(`C.sel = ''; __key(P, C, 'KeyW', 0); __key(P, C, 'ArrowDown', 0)`); const at = J('P.at'); const r = J(`__key(P, C, 'KeyQ')`); const ok = r.used && !r.ran && r.open === 'squads' && J('P.at') === at && J('C.sel') === 'all'; g.run(`campPanelClose(P)`); return ok; })());
  check('with no fighter out Q still picks all (a pick, not an order) and E, R, T are refused in words: "No fighters are out"', (() => { g.run(`window.C0 = __new('home'); window.P0 = campPanelNew(); campPanelKey(P0, C0, 'KeyQ', 0)`); return J('C0.sel') === 'all' && J(`campSelNow(C0).units.length`) === 0 && ['KeyE', 'KeyR', 'KeyT'].every(c => { const r = J(`campPanelKey(P0, C0, '${c}', 0)`); return r.ran && !r.ok && /fighters/i.test(r.say); }); })());
  g.run(`F.camp.sel = ''; F.camp.tgt = ''; campPanelsClose(F);`);
  check('through Campaign.onKey: Q picks all, opens no list and the mode stays play; the tune kit\'s keys are not Q; X through the scene lets it go', (() => { g.run(`F.onKey({ code: 'KeyQ' })`); const a = J('F.camp.sel') === 'all' && J('campPanelOpen(F.pn)') === '' && J('F.mode') === 'play' && J(`CAMP_DEBUG.keys.every(r => r.code !== 'KeyQ')`); g.run(`F.onKey({ code: 'KeyX' })`); return a && J('F.camp.sel') === ''; })());
  check('the switch turns the old code back on: CAMP_FLEET_LIST false is the game; campFleetListSet(true) gives Q its list (key line Q Fleet) and Q picks nothing, false brings the pick back', (() => { g.run(`campFleetListSet(true)`); g.run(`window.P7 = campPanelNew(); window.C7 = __new('home'); window.r7 = campPanelKey(P7, C7, 'KeyQ', 0)`); const on = J(`[r7.open, C7.sel, campPanelKeyLine().startsWith('Q Fleet')]`); g.run(`campFleetListSet(false); window.P7 = campPanelNew(); window.r7 = campPanelKey(P7, C7, 'KeyQ', 0)`); return on[0] === 'fleet' && on[1] === '' && on[2] === true && J('r7.open') === '' && J('C7.sel') === 'all' && J('CAMP_FLEET_LIST') === false; })());
}

check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nSELECT KEYS FAIL (${failed} of ${n})` : `\nSELECT KEYS PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
