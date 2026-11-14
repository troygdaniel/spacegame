// Save v2 and the v1 migration (docs/UNIVERSE.md 8.2 to 8.4): node tests/savemig.mjs   (exit code 1 on a failed check or a console error)
//   1. G.hull, G.maxHull, G.ore and G.upgrades are accessors over the active ship; the old upgrade keys answer from the parts
//   2. a canned v1 save loads as one Wren with the right parts, and loading and saving never touch the v1 key
//   3. a v2 round trip: save, wipe, load, and the save comes out byte for byte the same (a two-ship fleet, the second one active)
//   4. v2 wins over v1; an unknown system, station, model or active index falls back and the rest of the save is kept
//   5. a corrupt v2 save is a new game; clearSave erases v2 only
// No clock stepping: it only calls the save functions in the page (with the page's own autosave off), so it is quick and does not depend on how busy the Mac is.
import { launch } from './cdp.mjs';

let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };

// the canned v1 file: what a player who got to tier 1 armor, tier 2 rapid fire and a boolean booster would have saved
const V1 = {
  v: 1, credits: 1420, hull: 88, maxHull: 120, mission: 'accepted', missionId: 'patrol', missionProgress: 2, patrolsDone: 1,
  upgrades: { armor: 1, rapid: 2, booster: true }, ore: 4, volume: 0.6, muted: true,
  earned: 2310, guideDone: true, endingSeen: false, stats: { drones: 9, missions: 3, time: 120000 }, poi: { 'wreck-nw': 2, 'beacon-e': 1 }
};

const t = await launch('#station'); // not a dev jump, so the page loads a save: there is none in the throwaway profile
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Station') && typeof loadGame === 'function')`, 30000, 'Station active');
  // The page autosaves every second (installMeta). That would write a v2 save between a test planting one file and reading it, so
  // the autosave is switched off here and the tests call the real saveGame by hand.
  await t.ev(`(() => { window.__realSave = saveGame; saveGame = () => {}; return 1; })()`);
  const ev = x => t.ev(x);
  const json = x => ev(`JSON.stringify(${x})`).then(JSON.parse);
  const put = (key, obj) => ev(`localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(typeof obj === 'string' ? obj : JSON.stringify(obj))})`);
  const wipe = () => ev(`(() => { localStorage.clear(); newGameState(); lastSaved = ''; return 1; })()`);

  // ---- 1. a fresh game and the accessors ----
  await wipe();
  check('fresh game: system halcyon, docked at halcyon-station, one Wren, tank full',
    (await json(`[G.system, G.lastDock, G.fleet.length, G.fleet[0].model, G.fleet[0].fuel, G.active, G.known]`)).join('|') === 'halcyon|halcyon-station|1|wren|40|0|halcyon');
  check('G.upgrades still shows the three old keys', (await ev(`Object.keys(G.upgrades).join()`)) === 'armor,rapid,booster');
  await ev(`(() => { G.upgrades.armor = 2; G.upgrades.rapid = 1; G.upgrades.booster = 2; G.hull = 77; G.maxHull = 140; G.ore = 3; return 1; })()`);
  const rec = await json(`G.fleet[0]`);
  check('armor is shields, rapid is weapons, booster is engine', rec.parts.shields === 2 && rec.parts.weapons === 1 && rec.parts.engine === 2, JSON.stringify(rec.parts));
  check('hull, max hull and ore are the active ship\'s', rec.hull === 77 && rec.maxHull === 140 && rec.ore === 3, JSON.stringify(rec));
  check('and they read back through G', (await json(`[G.hull, G.maxHull, G.ore, G.upgrades.armor, G.upgrades.rapid, G.upgrades.booster]`)).join() === '77,140,3,2,1,2');
  await ev(`(() => { G.fleet.push(Object.assign(newShip('wren', 'halcyon-station'), { uid: 2, name: 'Spare', hull: 55, ore: 9 })); G.active = 1; return 1; })()`);
  check('switching the active ship switches all four fields', (await json(`[G.hull, G.ore, G.upgrades.armor]`)).join() === '55,9,0');
  check('JSON of G.upgrades is the old shape', (await ev(`JSON.stringify(G.upgrades)`)) === '{"armor":0,"rapid":0,"booster":0}');

  // ---- 2. the canned v1 save ----
  await wipe();
  await put('longhaul.save.v1', V1);
  const v1raw = await ev(`localStorage.getItem('longhaul.save.v1')`);
  // load and read in one go: between two evals a frame runs, and the guide counts credits that appear between frames as earned (guide.js)
  const g = await json(`(() => { const ok = loadGame(); return { ok, credits: G.credits, mission: G.mission, missionId: G.missionId, progress: G.missionProgress, patrols: G.patrolsDone,
    volume: G.volume, muted: G.muted, earned: G.earned, guideDone: G.guideDone, stats: G.stats, poi: G.poi, system: G.system, lastDock: G.lastDock,
    known: G.known, active: G.active, jumps: G.jumps, hull: G.hull, maxHull: G.maxHull, ore: G.ore, up: G.upgrades }; })()`);
  check('loadGame reads a v1 save when v2 is missing', g.ok === true);
  check('credits, mission, patrols, volume, muted, guide and stats came across',
    g.credits === 1420 && g.mission === 'accepted' && g.missionId === 'patrol' && g.progress === 2 && g.patrols === 1 && g.volume === 0.6 && g.muted === true
    && g.earned === 2310 && g.guideDone === true && g.stats.drones === 9 && g.stats.missions === 3 && g.stats.time === 120000, JSON.stringify(g));
  check('poi came across', g.poi['wreck-nw'] === 2 && g.poi['beacon-e'] === 1, JSON.stringify(g.poi));
  check('system halcyon, lastDock the station, jumps 0, known only halcyon', g.system === 'halcyon' && g.lastDock === 'halcyon-station' && g.jumps === 0 && g.known.join() === 'halcyon');
  const ship = await json(`G.fleet`);
  check('one Wren, parked at the station, tank full', ship.length === 1 && ship[0].model === 'wren' && ship[0].name === 'Wren' && ship[0].at === 'halcyon-station' && ship[0].fuel === 40 && g.active === 0, JSON.stringify(ship));
  check('parts: armor 1 to shields, rapid 2 to weapons, boolean booster to engine 1, tank and cargo 0',
    ship[0].parts.shields === 1 && ship[0].parts.weapons === 2 && ship[0].parts.engine === 1 && ship[0].parts.tank === 0 && ship[0].parts.cargo === 0, JSON.stringify(ship[0].parts));
  check('hull 88 of 120 and 4 ore are on the ship; G.upgrades answers with the old keys', g.hull === 88 && g.maxHull === 120 && g.ore === 4 && JSON.stringify(g.up) === '{"armor":1,"rapid":2,"booster":1}', JSON.stringify(g));
  await ev(`__realSave(true)`);
  const v2 = JSON.parse(await ev(`localStorage.getItem('longhaul.save.v2')`));
  check('saving wrote v2 with the fleet and none of the v1 top-level fields', v2.v === 2 && v2.fleet.length === 1 && v2.fleet[0].hull === 88 && v2.fleet[0].ore === 4
    && !('hull' in v2) && !('upgrades' in v2) && !('ore' in v2) && !('maxHull' in v2), JSON.stringify(v2).slice(0, 200));
  check('the v1 save is byte for byte what it was', (await ev(`localStorage.getItem('longhaul.save.v1')`)) === v1raw);

  // ---- 3. a v2 round trip, two ships ----
  await wipe();
  await ev(`(() => {
    G.credits = 2500; G.volume = 0.4; G.mission = 'accepted'; G.missionId = 'escort'; G.missionProgress = 0; G.patrolsDone = 2;
    G.upgrades.armor = 2; G.upgrades.rapid = 1; G.upgrades.booster = 1; G.fleet[0].maxHull = 140; G.hull = 101; G.ore = 6; G.fleet[0].fuel = 31.5; G.fleet[0].parts.tank = 1;
    G.fleet.push(Object.assign(newShip('wren', 'halcyon-station'), { uid: 2, name: 'Spare', hull: 55, ore: 2, fuel: 12 })); G.active = 1;
    G.known = ['halcyon', 'kestrel']; G.charted = ['hollow-beacon']; G.jumps = 3; G.poi = { 'wreck-w': 2 };
    return 1; })()`);
  await ev(`__realSave(true)`);
  const saved = await ev(`localStorage.getItem('longhaul.save.v2')`);
  await ev(`(() => { newGameState(); G.credits = 5; return 1; })()`);
  check('the wipe really cleared it', (await json(`[G.fleet.length, G.known.length, G.jumps]`)).join() === '1,1,0');
  check('loadGame reads v2', (await ev(`loadGame()`)) === true);
  check('saving again gives the same file byte for byte', (await ev(`JSON.stringify(snapshot())`)) === saved);
  const rt = await json(`({ active: G.active, n: G.fleet.length, hull: G.hull, ore: G.ore, up: G.upgrades, h0: G.fleet[0].hull, o0: G.fleet[0].ore, f0: G.fleet[0].fuel, mh0: G.fleet[0].maxHull, tank0: G.fleet[0].parts.tank, name1: G.fleet[1].name, credits: G.credits, known: G.known, jumps: G.jumps })`);
  check('two ships, the second active, each with its own hull, hold and fuel',
    rt.n === 2 && rt.active === 1 && rt.hull === 55 && rt.ore === 2 && rt.h0 === 101 && rt.o0 === 6 && rt.f0 === 31.5 && rt.mh0 === 140 && rt.tank0 === 1 && rt.name1 === 'Spare', JSON.stringify(rt));
  check('the rest came back too', rt.credits === 2500 && rt.known.join() === 'halcyon,kestrel' && rt.jumps === 3 && (await ev(`G.mission + G.missionId + G.patrolsDone + G.charted.join()`)) === 'acceptedescort2hollow-beacon');

  // ---- 4. v2 beats v1; unknown ids fall back ----
  await wipe();
  await put('longhaul.save.v1', V1); await put('longhaul.save.v2', { v: 2, credits: 2500, fleet: [{ uid: 1, model: 'wren', name: 'Wren', at: 'halcyon-station', hull: 100, fuel: 40, ore: 0, parts: {} }] });
  await ev(`loadGame()`);
  check('v2 wins when both exist', (await ev(`G.credits`)) === 2500);
  await wipe();
  await put('longhaul.save.v2', {
    v: 3, futureThing: { a: 1 }, credits: 700, system: 'zzz-9', lastDock: 'nowhere-dock', active: 7, volume: 0.3, known: ['kestrel', 5, 'kestrel'],
    fleet: [{ uid: 5, model: 'dreadnought', name: 'Old Faithful', at: 'nowhere-dock', hull: 70, fuel: 12, ore: 3, parts: { engine: 9, shields: 1, weapons: 'x' } }]
  });
  check('a later version\'s save loads', (await ev(`loadGame()`)) === true);
  const u = await json(`({ system: G.system, lastDock: G.lastDock, active: G.active, model: G.fleet[0].model, name: G.fleet[0].name, hull: G.hull, fuel: G.fleet[0].fuel, ore: G.ore, parts: G.fleet[0].parts, credits: G.credits, volume: G.volume, known: G.known, uid: G.fleet[0].uid })`);
  check('unknown system and station fall back to halcyon', u.system === 'halcyon' && u.lastDock === 'halcyon-station', JSON.stringify([u.system, u.lastDock]));
  check('unknown model falls back to the wren, the name and the rest of the ship are kept', u.model === 'wren' && u.name === 'Old Faithful' && u.hull === 70 && u.fuel === 12 && u.ore === 3 && u.uid === 5, JSON.stringify(u));
  check('a bad active index is 0; parts are clamped to what this build sells; junk is 0', u.active === 0 && u.parts.engine === 2 && u.parts.shields === 1 && u.parts.weapons === 0, JSON.stringify(u.parts));
  check('the rest of the save is kept (credits, volume, known systems, deduped, halcyon first)', u.credits === 700 && u.volume === 0.3 && u.known.join() === 'halcyon,kestrel', JSON.stringify([u.credits, u.volume, u.known]));
  await wipe();
  await put('longhaul.save.v2', { v: 2, credits: 10, fleet: [] });
  await ev(`loadGame()`);
  check('an empty fleet becomes one Wren at the station', (await json(`[G.fleet.length, G.fleet[0].model, G.fleet[0].at, G.credits]`)).join() === '1,wren,halcyon-station,10');
  await wipe();
  await put('longhaul.save.v2', { v: 2, fleet: [{ uid: 1 }, { uid: 1 }, { uid: 1 }] });
  await ev(`loadGame()`);
  check('duplicate ship ids are made unique', (await json(`G.fleet.map(r => r.uid)`)).join() === '1,2,3');

  // ---- 5. corrupt v2, clearSave ----
  await wipe();
  await put('longhaul.save.v1', V1); await put('longhaul.save.v2', '{not json');
  check('a corrupt v2 save is a new game, not a crash, and v1 is left alone', (await ev(`loadGame()`)) === false && (await ev(`localStorage.getItem('longhaul.save.v1')`)).length > 0);
  await wipe();
  await put('longhaul.save.v1', V1); await ev(`loadGame()`); await ev(`__realSave(true)`);
  const v1b = await ev(`localStorage.getItem('longhaul.save.v1')`);
  await ev(`(() => { clearSave(); newGameState(); __realSave(true); return 1; })()`);
  check('new game erases v2 but never v1', (await ev(`localStorage.getItem('longhaul.save.v1')`)) === v1b);
  await ev(`(() => { newGameState(); G.credits = 3; return 1; })()`);
  check('and the fresh v2 save written by new game is what loads, not the old v1', (await ev(`loadGame()`)) === true && (await ev(`G.credits`)) === 0 && (await ev(`G.fleet[0].parts.shields`)) === 0);

  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} catch (e) { console.error('  FAIL ' + e.message); bad++; } finally { await t.close(); }
console.log(bad ? 'SAVEMIG FAIL' : 'SAVEMIG PASS');
process.exitCode = bad ? 1 : 0;
