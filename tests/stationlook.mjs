// smoke: the Station scene reads its station: name, accent, desks, bar lines and keeper for each of the six docks; stores where there is no bar
// The Station scene reads its station's data (docs/UNIVERSE.md 9, card space-game-u-e5-station-variants): stationLook(id) gathers the name, the accent colour, which
// desks stand in the hall and the bar's lines; the hall is baked once per look (cyan Halcyon, green Kestrel and Meridian, amber the two foundries, red the Roost);
// a dock with no bar has stores in its place, no repair bay or no shop means no kiosk and no spot; the keeper of every bar but Halcyon's says the station's own lines.
// One headless Chrome, closed at the end; a screenshot of each of the six docks goes to tests/out/ (gitignored).
// Run: node tests/stationlook.mjs   (exit code 1 on any failure)
import { launch, sleep } from './cdp.mjs';

const t = await launch('#station');
let fails = 0;
const check = (name, ok, info = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (info ? '  (' + info + ')' : '')); if (!ok) fails++; };
const J = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));
const ST = "game.scene.getScene('Station')";
const DOCKS = ['halcyon-station', 'kestrel-outpost', 'meridian-exchange', 'brass-smelter', 'ember-foundry', 'roost-dock'];

// restart the Station scene at a dock, as if docked there, and wait for it to build
async function dock(id) {
  await t.ev(`(() => { G.lastDock = '${id}'; G.system = dockSystem('${id}'); fleetSync(); ${ST}.scene.restart({ arrive: false }); return 1; })()`);
  try { await t.waitFor(`game.scene.isActive('Station') && ${ST}.look && ${ST}.look.id === '${id}' && !!${ST}.in && ${ST}.in.last !== undefined && !!${ST}.player`, 60000, 'Station at ' + id); }
  catch (e) { // say what state the scene is in, and what the console said, so a slow Mac and a real error can be told apart
    const st = await t.ev(`JSON.stringify({ active: game.scene.isActive('Station'), look: ${ST}.look && ${ST}.look.id, hasIn: !!${ST}.in, player: !!${ST}.player, lastDock: G.lastDock })`).catch(x => String(x));
    throw new Error(e.message + ' | ' + st + ' | errors: ' + t.errors.slice(0, 3).join(' || '));
  }
  await sleep(600);
}
// the key of the layer a look bakes (src/interior.js inBaseKey): the colour, then p (pirate), b (bar), r (repair bay), s (shop)
const keyOf = (l, over = {}) => { const k = Object.assign({ bar: l.terminals.bar, repair: l.terminals.repair, shop: l.terminals.shop }, over); return 'in-base-' + l.accent.toString(16) + (l.pirate ? 'p' : '') + (k.bar ? 'b' : '') + (k.repair ? 'r' : '') + (k.shop ? 's' : ''); };
// what the hall has: the spots the player can use, the people in the bar, the live parts of the interior
const hall = () => J(`(() => { const s = ${ST}; return {
  keys: s.spots.filter(p => p.npc === undefined).map(p => p.key), people: NPCS.filter(npcHere).map(n => n.id), screens: s.in.screens.map(o => o.kind),
  arm: !!s.in.arm, jukebox: !!s.in.eq, walkers: s.in.walkers.length, key: IN_KEY, acc: IN_V.acc, title: s.ui.titleText.text,
  sprites: s.npcSprites.map((sp, i) => sp.visible ? NPCS[i].id : null).filter(Boolean) }; })()`);

try {
  await t.waitFor("!!(window.game && game.scene.isActive('Station'))", 20000, 'station active');
  await sleep(800);

  console.log('A. stationLook(id): what the data says about each dock');
  const look = await J(`Object.fromEntries(${JSON.stringify(DOCKS)}.map(id => [id, stationLook(id)]))`);
  const L = id => look[id];
  check('names come from the bodies', DOCKS.every(id => typeof L(id).name === 'string' && L(id).name.length > 2) && L('roost-dock').name === 'Roost Dock', DOCKS.map(id => L(id).name).join(', '));
  check('accents are the files\' own: Halcyon cyan, Kestrel and Meridian green, the foundries amber, the Roost red',
    L('halcyon-station').accentCss === '#38e1ff' && L('kestrel-outpost').accentCss === '#6dff9c' && L('meridian-exchange').accentCss === '#6dff9c'
    && L('brass-smelter').accentCss === '#ffb454' && L('ember-foundry').accentCss === '#ffb454' && L('roost-dock').accentCss === '#ff4d6d');
  check('accent is the number of accentCss', DOCKS.every(id => L(id).accent === parseInt(L(id).accentCss.slice(1), 16)));
  check('only the Roost is a pirate dock', DOCKS.filter(id => L(id).pirate).join() === 'roost-dock');
  check('every dock has a mission desk and a pump; every dock of the eight has a repair bay and a shop', DOCKS.every(id => L(id).terminals.missions && L(id).terminals.pump && L(id).terminals.repair && L(id).terminals.shop));
  check('only Kestrel Outpost has no bar', DOCKS.filter(id => !L(id).terminals.bar).join() === 'kestrel-outpost');
  check('the bar lines are the Bar section of the file: Halcyon two, Meridian two, the others one, Kestrel none',
    L('halcyon-station').barLines.length === 2 && L('meridian-exchange').barLines.length === 2 && L('roost-dock').barLines.join() === 'Pay the fee. Do not look at the walls.' && L('kestrel-outpost').barLines.length === 0);
  check('the bar signs: THE DRIFT at Halcyon, the first word and BAR elsewhere', L('halcyon-station').barName === 'THE DRIFT' && L('meridian-exchange').barName === 'MERIDIAN BAR' && L('roost-dock').barName === 'ROOST BAR');
  check('the welcome has the station name in it', L('kestrel-outpost').welcome.startsWith('Welcome to Kestrel Outpost.') && !L('kestrel-outpost').welcome.includes('{'));
  const unk = await J("stationLook('nowhere')"), nul = await J('stationLook()');
  check('a dock nobody knows answers like Halcyon Station, and so does none (a fresh game is docked at Halcyon)', unk.id === 'halcyon-station' && nul.id === 'halcyon-station' && unk.terminals.bar === true, unk.id + ' / ' + nul.id);

  console.log('B. Halcyon Station: the hall as it was');
  await dock('halcyon-station');
  let h = await hall();
  check('desks: missions, repair, ship, pump, shop', ['missions', 'repair', 'ship', 'pump', 'shop'].every(k => h.keys.includes(k)) && h.keys.length === 5, h.keys.join());
  check('the five of the bar are in it (IDA only after the first rescue), and not the keeper of the other bars', h.people.join() === 'juno,tamsin,dex,moss,sable', h.people.join());
  check('the three terminal screens, the repair arm, the jukebox and the two wanderers', h.screens.join() === 'missions,repair,shop' && h.arm && h.jukebox && h.walkers === 2, JSON.stringify([h.screens, h.arm, h.jukebox, h.walkers]));
  check('the baked layer is the cyan one with a bar, a repair bay and a shop', h.key === keyOf(L('halcyon-station')) && h.key === 'in-base-38e1ffbrs', h.key);
  check('the mission board is titled with the station', h.title === 'MISSION BOARD  -  HALCYON STATION', h.title);
  const lines = await J("NPCS.find(n => n.id === 'juno').lines.length");
  check('Juno keeps her own lines', lines >= 3, String(lines));

  console.log('C. the other five: each has its own colour, and the keeper says the file\'s lines');
  for (const id of DOCKS.slice(1)) {
    await dock(id);
    h = await hall();
    const l = L(id);
    check(id + ': the hall is baked in its own colour, with the pieces it has', h.acc === l.accent && h.key === keyOf(l), h.key + ' vs ' + keyOf(l));
    check(id + ': the board title names it', h.title === 'MISSION BOARD  -  ' + l.name.toUpperCase(), h.title);
    check(id + ': the desks are the ones it has', h.keys.includes('missions') && h.keys.includes('ship') && h.keys.includes('repair') === l.terminals.repair && h.keys.includes('shop') === l.terminals.shop && h.keys.includes('pump') === l.terminals.pump, h.keys.join());
    if (l.terminals.bar) {
      check(id + ': the keeper is the only one in the bar, and says the file\'s first line', h.people.join() === 'barkeep' && h.sprites.join() === 'barkeep' && (await J("NPCS.find(n => n.id === 'barkeep').lines[0]")) === l.barLines[0], h.people.join());
      check(id + ': the bar is lit, with its jukebox and wanderers', h.jukebox && h.walkers === 2);
    } else {
      check(id + ': no bar: nobody stands there, no jukebox, no wanderers', h.people.length === 0 && h.sprites.length === 0 && !h.jukebox && h.walkers === 0, JSON.stringify([h.people, h.jukebox, h.walkers]));
      check(id + ': the stores are baked in place of the bar', h.key === keyOf(l, { bar: false }) && !l.terminals.bar, h.key);
    }
    if (l.pirate) check(id + ': the pirate dock is baked red and flagged p', h.acc === 0xff4d6d && h.key.includes('p'), h.key);
    check(id + ': a screenshot of the hall', await t.shot('station-' + id));
  }

  console.log('D. a dock with no repair bay and no shop, or a bar added: the hall follows the data');
  await t.ev(`(() => { const b = SYSTEMS.kestrel.bodies.find(x => x.id === 'kestrel-outpost'); window.__k = JSON.stringify(b.dock); b.dock.repair = 0; b.dock.parts = {}; return 1; })()`);
  await dock('kestrel-outpost');
  h = await hall();
  check('no repair bay, no shop: no spot, no kiosk screen, no repair arm', !h.keys.includes('repair') && !h.keys.includes('shop') && h.screens.join() === 'missions' && !h.arm, JSON.stringify([h.keys, h.screens, h.arm]));
  check('the pump and the mission desk stay', h.keys.includes('pump') && h.keys.includes('missions'));
  check('the layer is baked for it: green, no bar, no repair bay, no shop', h.key === 'in-base-6dff9c', h.key);
  await t.ev(`(() => { const b = SYSTEMS.kestrel.bodies.find(x => x.id === 'kestrel-outpost'); b.dock = JSON.parse(window.__k); CONTENT_WORLD.station['kestrel-outpost'].bar = ['Hello from the data.']; return 1; })()`);
  await dock('kestrel-outpost');
  h = await hall();
  check('a Bar section makes a bar: the keeper stands in it and says that line', h.people.join() === 'barkeep' && (await J("NPCS.find(n => n.id === 'barkeep').lines[0]")) === 'Hello from the data.', h.people.join());
  check('and the repair bay and the shop are back', h.keys.includes('repair') && h.keys.includes('shop') && h.arm);
  await t.ev(`(() => { delete CONTENT_WORLD.station['kestrel-outpost'].bar; return 1; })()`);

  console.log('E. nothing leaks: the other looks\' layers are dropped');
  await dock('halcyon-station');
  const keep = await J("({ bases: Object.keys(IN_BASES), tex: game.textures.list ? Object.keys(game.textures.list).filter(k => k.startsWith('in-base')) : [] })");
  check('one baked layer at a time', keep.bases.length === 1 && keep.tex.length === 1, JSON.stringify(keep));

  check('no console errors', t.errors.length === 0, t.errors.slice(0, 3).join(' | '));
} catch (e) {
  console.log('  FAIL ' + e.message); fails++;
} finally { await t.close(); }
console.log(fails ? `STATIONLOOK FAIL (${fails})` : 'STATIONLOOK PASS');
process.exit(fails ? 1 : 0);
