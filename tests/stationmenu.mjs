// smoke: the station menu: its rows, keys and dim rows at each of the six docks, and a pick that stands you there and opens it (plain Node, no Chrome)
// The station menu (card space-game-station-menu, src/station.js): Bar, Missions, Fuel, Shop, Repair, Your ship. A number key, Enter on the
// chosen row or a click picks a row: you are stood at that spot and what it offers opens, with no walking and no E.
// Here, with no browser: stationMenuRows for every dock (the rows in order, the number keys the lounge quick-go gave, the rows a dock does not
// have dim with the reason and no key), the foot line, and Station.menuPick / menuFrame / menuOpen on a stand-in scene: the pick moves the
// player, the next frame opens the right thing, nothing happens while a terminal owns the keys.
// Run: node tests/stationmenu.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

const DOCKS = [['halcyon-station', 'halcyon'], ['kestrel-outpost', 'kestrel'], ['meridian-exchange', 'meridian'], ['brass-smelter', 'brass'], ['ember-foundry', 'ember'], ['roost-dock', 'roost']];
const ORDER = ['bar', 'missions', 'pump', 'shop', 'repair', 'ship'];

g.run(`
  // the spots of the dock you are at, as Station.create() and the files it calls put them in s.spots (the shape tests/lounge.mjs uses)
  function __spots(look) {
    const t = look.terminals, spots = [];
    if (t.missions) spots.push({ x: 200, y: 200, key: 'missions' });
    if (t.repair) spots.push({ x: 640, y: 200, key: 'repair' });
    spots.push({ x: 1090, y: 360, key: 'ship' });
    NPCS.forEach((p, i) => { if (npcHere(p)) spots.push({ x: p.x, y: p.y, key: 'npc' + i, npc: i }); });
    if (t.shop) spots.push({ x: 1000, y: 170, key: 'shop' });
    if (t.pump) spots.push({ x: PUMP.x, y: PUMP.y, key: 'pump' });
    return spots;
  }
  var __log = [];
  toast = (s, msg) => { __log.push('toast:' + msg); }; sfx = n => { __log.push('sfx:' + n); }; beep = () => {};
  openPump = () => { __log.push('openPump'); }; openShop = () => { __log.push('openShop'); }; talkTo = (s, i) => { __log.push('talkTo:' + NPCS[i].name); };
  go = (s, key) => { __log.push('go:' + key); };
  // a stand-in Station scene at a dock: the real menu methods, a player that records where it was put
  function __scene(station, system, flags) {
    G.system = system; G.lastDock = station; __log = [];
    const look = stationLook(), moved = [];
    // a plain object with the scene's own menu methods on it (a real Station hangs off Phaser.Scene, which is a stand-in here and answers every name)
    const own = {}; ['menuPick', 'menuFrame', 'menuOpen', 'menuState', 'quickGo', 'repairHull'].forEach(m => { own[m] = Station.prototype[m]; });
    const s = Object.assign(own, { look, spots: __spots(look), talk: null, moved, time: { now: 0 }, leaving: false, panel: false, shopOpen: false, pumpOpen: false, chat: null,
      player: { rotation: 0, body: { reset: (x, y) => moved.push([x, y]) } }, k: { W: {}, S: {}, UP: {}, DOWN: {} },
      openPanel() { __log.push('openPanel'); }, menuDraw() { this.menu.rows = stationMenuRows(this.spots, this.look, this.menuState()); } }, flags || {});
    s.menu = { keys: true, sel: 0, rows: [], lines: [], parts: [], shown: true, at: 0, pending: null, k: { N: {}, ENTER: {} } };
    s.menuDraw();
    return s;
  }
  // Phaser's JustDown for the stand-in keys: true once for a key marked down
  Phaser = { Input: { Keyboard: { JustDown: k => { if (k && k.jd) { k.jd = false; return true; } return false; } } } };
`);

// ---- the rows at every dock ----
for (const [station, system] of DOCKS) {
  const r = J(`(() => { G.system = '${system}'; G.lastDock = '${station}'; const look = stationLook(), spots = __spots(look); return { t: look.terminals, rows: stationMenuRows(spots, look), stops: loungeStops(spots, look).map(q => [q.key, q.n]) }; })()`);
  const have = ORDER.filter(k => k === 'ship' || r.t[k]);
  check(`${station}: six rows in the order bar, missions, fuel, shop, repair, your ship`, r.rows.map(x => x.key).join() === ORDER.join() && r.rows.map(x => x.name).join() === 'Bar,Missions,Fuel,Shop,Repair,Your ship', r.rows.map(x => x.name).join());
  check(`${station}: the rows it has carry the lounge's number keys, 1..${have.length} with no gap`, JSON.stringify(r.rows.filter(x => !x.off).map(x => [x.key, x.n])) === JSON.stringify(r.stops) && r.rows.filter(x => !x.off).map(x => x.n).join('') === have.map((k, i) => i + 1).join(''), JSON.stringify(r.rows.map(x => [x.key, x.n])));
  const off = r.rows.filter(x => x.off);
  check(`${station}: the ${off.length} it has not are dim, with the reason and no key`, off.map(x => x.key).join() === ORDER.filter(k => !have.includes(k)).join() && off.every(x => x.n === '' && / here$/.test(x.why) && x.note === x.why), JSON.stringify(off));
  check(`${station}: your ship is always there, the last row`, r.rows[5].key === 'ship' && !r.rows[5].off && r.rows[5].n === String(have.length));
}
const roost = J(`(() => { G.system = 'roost'; G.lastDock = 'roost-dock'; const look = stationLook(); return stationMenuRows(__spots(look), look); })()`);
check('a dock is missing something somewhere (the dim rows are really used)', DOCKS.some(([st, sy]) => J(`(() => { G.system = '${sy}'; G.lastDock = '${st}'; const look = stationLook(); return stationMenuRows(__spots(look), look).some(r => r.off); })()`)), JSON.stringify(roost.map(r => [r.key, r.off])));

// ---- the notes and the foot line ----
let rows = J(`(() => { G.system = 'halcyon'; G.lastDock = 'halcyon-station'; const look = stationLook(); return stationMenuRows(__spots(look), look, { hull: 60, maxHull: 100, price: 0.5, keeper: 'Juno' }); })()`);
const by = k => rows.find(r => r.key === k);
check('the repair row says what mending the hull costs here (40 points at half a credit: 20 cr)', by('repair').note === '20 cr', by('repair').note);
check('the bar row says who tends it', by('bar').note === 'talk to Juno', by('bar').note);
rows = J(`(() => { const look = stationLook(); return stationMenuRows(__spots(look), look, { hull: 100, maxHull: 100, price: 0.5 }); })()`);
check('a whole hull: the repair row says so', by('repair').note === 'hull is whole', by('repair').note);
check('the foot line names what Enter does on the chosen row', J(`stationMenuHint({ key: 'missions', name: 'Missions', off: false }, true)`) === 'Enter  open the mission board' && J(`stationMenuHint({ key: 'ship', name: 'Your ship', off: false }, true)`) === 'Enter  board your ship');
check('on a dim row it says why instead', J(`stationMenuHint({ key: 'pump', name: 'Fuel', off: true, why: 'no pump here' }, true)`) === 'Fuel: no pump here.');
check('with the keys handed back to your feet it says how to get the menu', /^N  menu keys/.test(J(`stationMenuHint(null, false)`)));
check('a row is found by its number key, its key or its place', J(`(() => { const look = stationLook(), rows = stationMenuRows(__spots(look), look); return [stationMenuFind(rows, '2').key, stationMenuFind(rows, 'repair').key, stationMenuFind(rows, 5).key, stationMenuFind(rows, '9')]; })()`).join() === 'missions,repair,ship,');

// ---- a pick: you stand there, and the next frame it opens ----
const pick = (what, flags = {}, station = 'halcyon-station', system = 'halcyon') => J(`(() => {
  const s = __scene('${station}', '${system}', ${JSON.stringify(flags)});
  const r = s.menuPick(${JSON.stringify(what)}), pending = s.menu.pending, moved = s.moved.slice(), before = __log.slice();
  const held = s.menuFrame(); // the next frame
  return { r, pending, moved, before, after: __log.slice(), sel: s.menu.sel, held, stop: loungeStops(s.spots, s.look).find(q => q.key === (pending || '')) || null };
})()`);
const opens = { bar: 'talkTo:', missions: 'openPanel', pump: 'openPump', shop: 'openShop', ship: 'go:Ship' };
for (const [key, want] of Object.entries(opens)) {
  const p = pick(key);
  check(`pick ${key}: you are stood at its stop in the same press`, p.r === true && p.moved.length === 1 && p.stop && p.moved[0][0] === p.stop.x && p.moved[0][1] === p.stop.y, JSON.stringify(p));
  check(`pick ${key}: nothing opens inside the key press, it opens on the next frame`, !p.before.some(l => l.startsWith(want)) && p.after.some(l => l.startsWith(want)), JSON.stringify(p.after));
}
let p = pick('repair');
check('pick repair: stood at the bay, and the next frame the hull is seen to (here: already whole)', p.r === true && p.moved.length === 1 && p.after.some(l => /Hull is already perfect/.test(l)), JSON.stringify(p.after));
p = J(`(() => { const s = __scene('halcyon-station', 'halcyon'); G.hull = 60; G.maxHull = 100; G.credits = 500; s.menuPick('repair'); s.menuFrame(); const r = [G.hull, G.credits, __log.filter(l => /repaired/.test(l)).length]; G.hull = 100; G.credits = 0; return r; })()`);
check('pick repair with a holed hull and credits: mended and paid for (40 points, 20 cr)', p.join() === '100,480,1', p.join());
p = pick('2');
check('the number key 2 at Halcyon is Missions: the same go-and-open', p.r === true && p.pending === 'missions' && p.after.includes('openPanel') && p.sel === 1, JSON.stringify(p));
p = pick(5);
check('a click on the sixth row is Your ship: the ship bay', p.r === true && p.after.includes('go:Ship') && p.after.includes('sfx:dock'), JSON.stringify(p.after));
p = pick('bar');
check('pick bar at Halcyon: Juno is talked to', p.after.includes('talkTo:JUNO'), JSON.stringify(p.after));

// ---- a row the dock does not have, and keys that belong to something else ----
const lacking = DOCKS.map(([st, sy]) => ({ st, sy, off: J(`(() => { G.system = '${sy}'; G.lastDock = '${st}'; const look = stationLook(); return stationMenuRows(__spots(look), look).filter(r => r.off).map(r => r.key); })()`) })).find(d => d.off.length);
if (lacking) {
  p = pick(lacking.off[0], {}, lacking.st, lacking.sy);
  check(`${lacking.st} has no ${lacking.off[0]}: picking it moves nobody, opens nothing and says why`, p.r === false && p.moved.length === 0 && p.pending === null && p.after.some(l => / here\.$/.test(l)) && p.after.length === 2, JSON.stringify(p));
}
for (const f of ['panel', 'shopOpen', 'pumpOpen', 'leaving', 'chat']) {
  p = pick('missions', { [f]: true });
  check(`no pick while ${f} is set, and the menu is put away`, p.r === false && p.moved.length === 0 && p.after.length === 0 && p.held === false, JSON.stringify(p));
}

// ---- the keys of the menu ----
p = J(`(() => { const s = __scene('halcyon-station', 'halcyon'), out = [];
  s.k.S.jd = true; s.menuFrame(); out.push(s.menu.sel);            // S: down a row
  s.k.DOWN.jd = true; s.menuFrame(); out.push(s.menu.sel);         // the arrow too
  s.k.W.jd = true; s.menuFrame(); out.push(s.menu.sel);            // W: up
  s.k.W.jd = true; s.menuFrame(); s.k.UP.jd = true; s.menuFrame(); out.push(s.menu.sel); // off the top: round to the last row
  s.menu.k.ENTER.jd = true; const held = s.menuFrame(); out.push(s.menu.pending, held);    // Enter picks the chosen row (Your ship)
  s.menuFrame(); out.push(__log.includes('go:Ship'));
  return out; })()`);
check('S and the down arrow go down a row, W up, off the top comes round to the last; Enter picks it; the menu holds the keys meanwhile', p.join() === '1,2,1,5,ship,true,true', p.join());
p = J(`(() => { const s = __scene('halcyon-station', 'halcyon'), out = [];
  out.push(s.menuFrame());                      // the menu has the keys when you dock: nobody walks
  s.menu.k.N.jd = true; out.push(s.menuFrame()); // N: your feet have them
  s.k.S.jd = true; s.menuFrame(); out.push(s.menu.sel); // S walks now, the chosen row stays
  out.push(s.menuPick('3'), s.menu.keys);        // a number still picks, and the menu has the keys again when that closes
  return out; })()`);
check('the menu has the keys when you dock; N hands them to your feet (W S walk, rows stay); a number still picks and gives the menu the keys back', p.join() === 'true,false,0,true,true', p.join());

// ---- the panel itself is built and drawn without an error (no browser here: every Phaser object is a stand-in that accepts any call, so this
// catches a wrong name or a missing piece in menuSetup and menuDraw, not how it looks) ----
p = J(`(() => {
  const P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : P, apply: () => P });
  const out = [], first = [];
  for (const [station, system] of ${JSON.stringify(DOCKS)}) {
    G.system = system; G.lastDock = station;
    const look = stationLook(), s = { look, spots: __spots(look), add: P, input: P, time: { now: 0 } };
    ['menuSetup', 'menuDraw', 'menuState'].forEach(m => { s[m] = Station.prototype[m]; });
    try { s.menuSetup(); const sel0 = s.menu.sel, off0 = s.menu.rows[sel0].off; s.menu.keys = false; s.menuDraw(); s.menu.shown = false; s.menuDraw(); out.push([station, s.menu.lines.length, s.menu.rows.length, s.menu.keys === false].join()); first.push(station + ':' + sel0 + ':' + off0); }
    catch (e) { out.push(station + ' ERROR ' + e.message); }
  }
  return { out, first };
})()`);
check('menuSetup and menuDraw run at all six docks: six lines for six rows, with and without the keys, shown and put away', p.out.length === 6 && p.out.every(x => /,6,6,true$/.test(x)), p.out.join(' | '));
check('the chosen row when you dock is the first one the dock has, never a dim one (Kestrel, with no bar, starts on Missions)', p.first.every(x => /:false$/.test(x)) && p.first.includes('kestrel-outpost:1:false') && p.first.includes('halcyon-station:0:false'), p.first.join(' | '));
// ---- the controls table and the help text say the menu's keys ----
p = J(`(() => { const st = CONTROLS.find(c => c.id === 'station'); return st.rows.map(r => r.k.join(' ') + '   ' + r.t.charAt(0).toLowerCase() + r.t.slice(1)); })()`);
const help = J(`(() => { const k = ctTextKeys(); return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => k['help.station.' + i] ? k['help.station.' + i].get() : null); })()`); // the H screen's lines, after content/text/ui.md was applied
check('the station rows of the controls table and the ten help lines are the same lines', JSON.stringify(p) === JSON.stringify(help), JSON.stringify([p, help]));
check('they name the menu keys: 1-6 picks and opens, W S Enter, N for walking', help.some(l => /^1-6 {3}station menu/.test(l)) && help.some(l => /^W S Enter {3}station menu/.test(l)) && help.some(l => /^N {3}menu keys off/.test(l)), help.join(' | '));

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `STATION MENU FAIL (${failed} of ${n})` : `STATION MENU PASS (${n} checks)`);
process.exitCode = failed ? 1 : 0;
