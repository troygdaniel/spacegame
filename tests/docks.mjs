// smoke: a system can have more than one dock: every station row is one, L docks at the nearest, you launch from the one you docked at (plain Node, no Chrome)
// Card space-game-more-than-one-dock. src/space.js drew and docked at the first station row of a system only, so the Sol pack had one live dock
// and six written as scenery. Now every station row is a dock. This runs the game's own scripts, with the Sol pack on (seven docks) and off:
//   the rules: which dock is in reach of a point (spaceDockAt), which one you launch from (spaceHomeDock), in Sol, in Halcyon, in a system with none
//   each of Sol's seven is a whole dock: its own name and look, its own pump price, a system to wake in, and the navigation panel's Dock order
//   the Space scene uses those rules: it builds every station row, docks at the one in reach and remembers that one
// Run: node tests/docks.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const Jg = g => e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const g = nodeGame({ store: new Map([['longhaul.mods.on', JSON.stringify(['sol'])]]) }), J = Jg(g);
const off = nodeGame(), JO = Jg(off);

console.log('the rules, on rows of our own');
{
  const rows = `[{ id: 'a', x: 0, y: 0 }, { id: 'b', x: 1000, y: 0 }, { id: 'c', x: 0, y: 5000 }]`;
  check('the dock in reach is the nearest one inside 320 px', J(`spaceDockAt(${rows}, 900, 100).id`) === 'b' && J(`spaceDockAt(${rows}, 100, 100).id`) === 'a' && J(`spaceDockAt(${rows}, 0, 4700).id`) === 'c');
  check('between two docks, out of reach of both: none', J(`spaceDockAt(${rows}, 500, 0)`) === null && J(`spaceDockAt(${rows}, 0, 320)`) === null && J(`spaceDockAt(${rows}, 0, 319).id`) === 'a');
  check('the nearest of all, with how far, for the approach ring', J(`(() => { const n = spaceDockNearest(${rows}, 600, 0); return [n.dock.id, n.d]; })()`).join() === 'b,400');
  check('the scene\'s own shape ({ def, obj }) is read the same way', J(`spaceDockAt([{ def: { id: 'a', x: 0, y: 0 }, obj: 1 }, { def: { id: 'b', x: 1000, y: 0 }, obj: 2 }], 990, 0).obj`) === 2);
  check('no docks: nothing in reach, nothing nearest', J(`spaceDockAt([], 0, 0)`) === null && J(`spaceDockNearest([], 0, 0)`) === null && J(`spaceDockAt(undefined, 0, 0)`) === null);
  check('the reach and the speed are the ones the dock had: 320 px, 150 px/s', J('[DOCK_REACH, DOCK_SPEED]').join() === '320,150');
}

console.log('Sol: seven docks');
const docks = J(`sysBodies('station', 'sol').map(b => ({ id: b.id, name: b.name, x: b.x, y: b.y, fuel: b.dock && b.dock.fuel }))`);
{
  check('Sol has seven station rows, Imbrium Dock first', docks.length === 7 && docks[0].id === 'sol-imbrium-dock', docks.map(d => d.id).join());
  g.run(`G.system = 'sol'`);
  check('beside each one, that one is the dock in reach', docks.every(d => J(`spaceDockAt(sysBodies('station'), ${d.x} + 200, ${d.y} - 100).id`) === d.id));
  const gaps = []; docks.forEach((a, i) => docks.slice(i + 1).forEach(b => gaps.push(Math.hypot(a.x - b.x, a.y - b.y))));
  check('no two are so close that their dock zones meet', Math.min(...gaps) > 2 * 320, Math.round(Math.min(...gaps)));
  check('you launch from the one you docked at', docks.every(d => J(`(() => { G.lastDock = '${d.id}'; return spaceHomeDock().id; })()`) === d.id));
  check('with a last dock in another system (you jumped in), the system\'s first station stands in', J(`(() => { G.lastDock = 'halcyon-station'; return spaceHomeDock().id; })()`) === 'sol-imbrium-dock');
  check('each is a whole dock: its own name on the hall, a pump at its own price, and Sol as the system you wake in', docks.every(d => J(`[stationLook('${d.id}').name, fuelPrice('${d.id}'), dockSystem('${d.id}'), fleetStationName('${d.id}')]`).join() === [d.name, d.fuel, 'sol', d.name].join()), JSON.stringify(J(`[stationLook('${docks[1].id}').name, fuelPrice('${docks[1].id}'), dockSystem('${docks[1].id}')]`)));
  check('the pump prices differ, so which dock you are at matters', new Set(docks.map(d => d.fuel)).size > 3, docks.map(d => d.fuel).join());
  check('the navigation panel gives every one of them the Dock order', docks.every(d => J(`navpanelOrder({ canLand: false }, { kind: 'body', id: '${d.id}', type: 'station' })`) === 'dock'));
  check('the autopilot keeps a Dock order on a dock that is not the first', J(`(() => { const d = sysBodies('station')[3]; const s = { ap: { read: { setVisible() { return this; } } }, cr: { active: false, target: null }, ship: { x: d.x + 1500, y: d.y, body: { speed: 0 } }, time: { now: 0 }, sh: null, canLand: false }; toast = () => {}; sfx = () => {}; autopilotMass = () => null; const went = autopilotGo(s, d, 'dock'); return [went, s.ap.order, s.ap.target.id === d.id]; })()`).join() === 'true,dock,true');
  check('the Dock rule still takes one row, as its older callers give it', J(`[autopilotOrder({ id: 'x', type: 'station' }, { id: 'x' }, null, false), autopilotOrder({ id: 'x', type: 'station' }, { id: 'y' }, null, false), autopilotOrder({ id: 'x', type: 'station' }, null, null, false)]`).join() === 'dock,,');
  check('with no call open the objective is the dock you launched from, by its own name', J(`(() => { G.mission = 'none'; G.missionId = null; G.lastDock = '${docks[4].id}'; const t = missionTarget({ station: { x: 1, y: 2 }, planet: { x: 0, y: 0 } }); return t.name; })()`) === docks[4].name);
  g.run(`G.system = 'halcyon'; G.lastDock = 'halcyon-station'`);
}

console.log('the systems that shipped');
{
  check('with the pack off there is no Sol, and every shipped system has one dock or none', !JO(`Object.keys(SYSTEMS)`).includes('sol') && JO(`Object.keys(SYSTEMS).map(id => sysBodies('station', id).length)`).every(c => c <= 1));
  check('Halcyon: you launch from Halcyon Station and dock there, inside 320 px', JO(`(() => { G.system = 'halcyon'; G.lastDock = 'halcyon-station'; const st = sysBody('station'); return [spaceHomeDock().id, spaceDockAt(sysBodies('station'), st.x + 319, st.y).id, spaceDockAt(sysBodies('station'), st.x + 321, st.y)]; })()`).join() === 'halcyon-station,halcyon-station,');
  const none = JO(`Object.keys(SYSTEMS).find(id => sysBodies('station', id).length === 0) || null`);
  check('a system with no station has no dock to launch from and none in reach' + (none ? ' (' + none + ')' : ''), none === null || JO(`[spaceHomeDock('${none}'), spaceDockAt(sysBodies('station', '${none}'), 0, 0)]`).join() === ',');
}

console.log('the Space scene uses the rules');
{
  const src = readFileSync(join(ROOT, 'src/space.js'), 'utf8');
  check('it builds every station row', /this\.docks = sysBodies\('station'\)\.map\(def => \{/.test(src) && /stationBuild\(this, def\)/.test(src));
  check('L docks at the dock in reach and remembers that one', /const dock = spaceDockAt\(this\.docks, ship\.x, ship\.y\);/.test(src) && /G\.lastDock = dock\.def\.id; fleetSync\(\); feelDescend\(this, dock\.obj,/.test(src) && /'L  Dock at ' \+ dock\.def\.name/.test(src));
  check('the launch is beside the dock you left', /const stDef = spaceHomeDock\(\)/.test(src) && /sx = this\.station\.x \+ 250/.test(src));
  check('nothing in it asks for the first station any more', !/sysBody\('station'\)/.test(src));
  check('the approach ring and the radar follow every dock', /spaceDockObj\(s\)/.test(readFileSync(join(ROOT, 'src/feel.js'), 'utf8')) && /\(s\.docks \|\| /.test(readFileSync(join(ROOT, 'src/hud.js'), 'utf8')));
}

check('the game made no error', g.errors.length === 0 && off.errors.length === 0, g.errors.concat(off.errors).join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
