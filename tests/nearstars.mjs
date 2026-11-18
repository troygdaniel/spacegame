// smoke: the stars near the Sun (the mods/sol pack): it builds, each star is at its real distance from Sol, and every one can be reached from Sol by some ship (plain Node)
// Card space-game-near-stars-pack (docs/NEAR-STARS.md). Fourteen real stars within about 12 light years, as system files in mods/sol/systems,
// with six fuel docks in mods/sol/stations. The pack is off until the player turns it on, so: with it off nothing is in the game; with it
// on (the same switch the Mods screen sets, in a plain Node game) the stars are on the galaxy map and the jump rules of the game itself
// (galaxyJump) say who can reach what. Sol's own file is another card's (space-game-sol-system-pack): when it is in the pack this test uses
// it, and until then it stands Sol in at the agreed place, ly [26, 27].
// Run: node tests/nearstars.mjs   (exit code 1 on a failed check)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };

// the stars: id, the name the map shows, the real distance from the Sun in light years, the sun the game flies it under
const STARS = [
  ['alpha-centauri', 'Alpha Centauri', 4.37, 'G'], ['barnard', "Barnard's Star", 5.96, 'M'], ['wolf-359', 'Wolf 359', 7.86, 'M'], ['lalande-21185', 'Lalande 21185', 8.31, 'M'],
  ['sirius', 'Sirius', 8.60, 'A'], ['luyten-726-8', 'Luyten 726-8', 8.73, 'M'], ['ross-154', 'Ross 154', 9.69, 'M'], ['ross-248', 'Ross 248', 10.30, 'M'],
  ['epsilon-eridani', 'Epsilon Eridani', 10.47, 'K'], ['lacaille-9352', 'Lacaille 9352', 10.72, 'M'], ['ross-128', 'Ross 128', 11.01, 'M'], ['procyon', 'Procyon', 11.46, 'F'],
  ['cygni-61', '61 Cygni', 11.40, 'K'], ['tau-ceti', 'Tau Ceti', 11.91, 'G']
];
const DOCKS = { 'alpha-centauri': 'toliman-waypoint', barnard: 'runaway-depot', 'wolf-359': 'dimlight-post', sirius: 'dogwatch-station', 'luyten-726-8': 'flarewatch-outpost', 'cygni-61': 'bessel-point' };
const SOL_AT = [26, 27];

console.log('the pack builds');
{
  const files = readdirSync(join(ROOT, 'mods/sol/systems')).filter(f => f.endsWith('.md')).map(f => f.slice(0, -3));
  check('a file for each of the fourteen stars in mods/sol/systems', STARS.every(s => files.includes(s[0])), files.join());
  check('a file for each of the six docks in mods/sol/stations', Object.values(DOCKS).every(d => existsSync(join(ROOT, 'mods/sol/stations', d + '.md'))));
  const g = nodeGame(), J = e => JSON.parse(g.run(`JSON.stringify(${e})`));
  const pack = J(`MODS.packs.find(p => p.name === 'sol') || null`);
  check('mods.generated.js has the sol pack', !!pack, J('MODS.packs.map(p => p.name)').join());
  const mine = pack ? pack.entries.filter(e => (e.type === 'system' && STARS.some(s => s[0] === e.id)) || (e.type === 'station' && Object.values(DOCKS).includes(e.id))) : [];
  check('all 20 of these files are in it as valid entries', mine.length === 20, mine.length);
  const probs = pack ? (pack.problems || []).filter(p => STARS.some(s => String(p.path || p.file || p.where || JSON.stringify(p)).includes('/' + s[0] + '.md')) || Object.values(DOCKS).some(d => JSON.stringify(p).includes('/' + d + '.md'))) : [];
  check('and the build found no problem in any of them', probs.length === 0, JSON.stringify(probs).slice(0, 400));
  check('the pack is off by default: a new game has none of these stars', STARS.every(s => !J(`Object.prototype.hasOwnProperty.call(SYSTEMS, '${s[0]}')`)) && J('Object.keys(SYSTEMS).length') === 8 + (J(`Object.prototype.hasOwnProperty.call(SYSTEMS, 'sol')`) ? 1 : 0));
  check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
}

// the pack switched on, as the Mods screen does it (the list of packs that are on is kept in the browser's storage), then a restart
const g = nodeGame({ store: new Map([['longhaul.mods.on', JSON.stringify(['sol'])]]) });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const hasSol = J(`Object.prototype.hasOwnProperty.call(SYSTEMS, 'sol')`);
if (!hasSol) g.run(`SYSTEMS.sol = { id: 'sol', name: 'Sol', kind: 'home', ly: [${SOL_AT}], size: 36000, bodies: [] }`); // a stand-in until Sol's own file is in the pack
const SOL = J('SYSTEMS.sol.ly');

console.log('switched on: the stars are in the game');
{
  check('Sol is at the agreed place on the map, [26, 27]' + (hasSol ? '' : ' (stood in: its file is not in the pack yet)'), SOL[0] === SOL_AT[0] && SOL[1] === SOL_AT[1], SOL.join());
  check('all fourteen stars are systems now, beside the eight shipped ones', STARS.every(s => J(`Object.prototype.hasOwnProperty.call(SYSTEMS, '${s[0]}')`)) && ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow', 'lethe', 'ember', 'roost'].every(id => J(`!!SYSTEMS['${id}']`)));
  check('and on the galaxy map', STARS.every(s => J(`!!galaxyFind('${s[0]}')`)));
  for (const [id, name, ly, type] of STARS) {
    const s = J(`(() => { const s = SYSTEMS['${id}']; return { name: s.name, ly: s.ly, star: s.star && s.star.type, bodies: (s.bodies || []).length, kinds: (s.bodies || []).map(b => b.type), inside: (s.bodies || []).every(b => b.x > 0 && b.y > 0 && b.x < s.size && b.y < s.size) }; })()`);
    const d = Math.hypot(s.ly[0] - SOL[0], s.ly[1] - SOL[1]);
    check(`${name}: ${ly.toFixed(2)} ly from Sol on the map (its real distance), a type ${type} sun, bodies inside its space`, s.name === name && Math.abs(d - ly) < 0.015 && s.star === type && s.bodies >= 2 && s.inside, JSON.stringify({ d: +d.toFixed(3), s }));
  }
  const all = J(`Object.values(SYSTEMS).map(s => ({ id: s.id, ly: s.ly }))`);
  const close = []; all.forEach((a, i) => all.slice(i + 1).forEach(b => { const d = Math.hypot(a.ly[0] - b.ly[0], a.ly[1] - b.ly[1]); if (d < 0.8) close.push(a.id + '/' + b.id + ' ' + d.toFixed(2)); }));
  check('no two systems sit on top of each other on the map (0.8 ly apart or more)', close.length === 0, close.join(', '));
  const mine = J(`[${STARS.map(s => `'${s[0]}'`).join()}].flatMap(k => (SYSTEMS[k].bodies || []).map(b => b.id))`), theirs = J(`Object.values(SYSTEMS).filter(s => ![${STARS.map(s => `'${s[0]}'`).join()}].includes(s.id)).flatMap(s => (s.bodies || []).map(b => b.id))`);
  check('no body id of these stars is used twice, or by a shipped system', new Set(mine).size === mine.length && mine.every(id => !theirs.includes(id)), mine.filter((x, i) => mine.indexOf(x) !== i || theirs.includes(x)).join());
}

console.log('the docks');
for (const [sys, dock] of Object.entries(DOCKS)) {
  const d = J(`(() => { const st = fleetStation('${dock}'); return st ? { system: st.system, fuel: st.body.dock && st.body.dock.fuel, name: fleetStationName('${dock}') } : null; })()`);
  check(`${dock}: a dock of ${sys} with a pump`, !!d && d.system === sys && d.fuel > 0 && d.name.length > 3, JSON.stringify(d));
}

console.log('the ladder: who can jump where, by the game\'s own rule');
{
  // every ship of the yard with a full tank; a jump is allowed when galaxyJump says ok (the range on the map, and the fuel)
  const ships = J(`Object.keys(SHIP_MODELS).map(id => ({ id, range: SHIP_MODELS[id].range, tank: SHIP_MODELS[id].tank, per: SHIP_MODELS[id].fuelPerLy }))`);
  const stars = STARS.map(s => s[0]), nodes = ['sol'].concat(stars);
  const ly = (a, b) => J(`galaxyLy(SYSTEMS['${a}'], SYSTEMS['${b}'])`);
  const dist = {}; nodes.forEach(a => nodes.forEach(b => { if (a < b) dist[a + '|' + b] = ly(a, b); }));
  const D = (a, b) => a === b ? 0 : dist[a < b ? a + '|' + b : b + '|' + a];
  const hops = range => { const h = { sol: 0 }, q = ['sol']; while (q.length) { const a = q.shift(); for (const b of nodes) if (!(b in h) && D(a, b) <= range + 1e-9) { h[b] = h[a] + 1; q.push(b); } } return h; };
  const wren = ships.find(s => s.id === 'wren'), hw = hops(wren.range);
  check('the ship you start with jumps 8 ly on a 40 unit tank at 1 unit a light year', wren.range === 8 && wren.tank === 40 && wren.per === 1, JSON.stringify(wren));
  check('rung 1: the Wren reaches Alpha Centauri, Barnard\'s Star and Wolf 359 from Sol in one jump, and nothing else', stars.filter(s => hw[s] === 1).sort().join() === 'alpha-centauri,barnard,wolf-359', stars.filter(s => hw[s] === 1).join());
  check('Alpha Centauri is the first rung: the shortest jump from Sol', stars.every(s => D('sol', 'alpha-centauri') <= D('sol', s)));
  check('rung 2: with one stop the Wren reaches Lalande 21185, Ross 128 and Ross 154', stars.filter(s => hw[s] === 2).sort().join() === 'lalande-21185,ross-128,ross-154', stars.filter(s => hw[s] === 2).join());
  check('the other eight are beyond any chain of Wren jumps: they need a better ship', stars.filter(s => !(s in hw)).length === 8 && ['sirius', 'luyten-726-8', 'procyon', 'epsilon-eridani', 'tau-ceti', 'lacaille-9352', 'ross-248', 'cygni-61'].every(s => !(s in hw)), stars.filter(s => !(s in hw)).join());
  check('every star the Wren reaches is a jump the game allows with a full tank (galaxyJump)', stars.filter(s => hw[s] === 1).every(s => J(`galaxyJump(SYSTEMS.sol, SYSTEMS['${s}'], { model: 'wren', fuel: 40, parts: {} }).ok`)));
  const best = {}; // for each star, the ships that reach it by some chain
  ships.forEach(sh => { const h = hops(sh.range); stars.forEach(s => { if (s in h) (best[s] = best[s] || []).push(sh.id + ':' + h[s]); }); });
  check('EVERY star is reachable from Sol by some chain of jumps with some ship of the yard', stars.every(s => best[s] && best[s].length > 0), stars.filter(s => !best[s]).join());
  const nine = hops(9);
  check('9 ly of range (a Talon, or a Wren with a tier 1 engine) opens Sirius and Luyten 726-8 from Sol, and every star within three jumps', nine.sirius === 1 && nine['luyten-726-8'] === 1 && stars.every(s => s in nine), JSON.stringify(nine));
  const kite = ships.find(s => s.id === 'kite');
  check('a Kite (14 ly) reaches every star from Sol in one jump', !!kite && stars.every(s => D('sol', s) <= kite.range));
  check('one jump never costs more than the ship\'s tank holds, for any ship on any hop it has the range for', ships.every(sh => nodes.every(a => nodes.every(b => a === b || D(a, b) > sh.range || D(a, b) * sh.per <= sh.tank + 1e-9))));
  // fuel: starting full at Sol, filling up at every dock with a pump, can the ship get there, and from there on to a pump again (so it is never stranded)?
  const pumps = new Set(['sol'].concat(Object.keys(DOCKS)));
  const fuelReach = sh => { // the most fuel the ship can have on arriving at each node
    const best = { sol: sh.tank }; let moved = true;
    while (moved) { moved = false; for (const a of Object.keys(best)) for (const b of nodes) { if (a === b || D(a, b) > sh.range + 1e-9) continue; const left = (pumps.has(a) ? sh.tank : best[a]) - D(a, b) * sh.per; if (left >= -1e-9 && left > (best[b] === undefined ? -1 : best[b]) + 1e-9) { best[b] = left; moved = true; } } }
    return best;
  };
  const home = (sh, s, fuel) => pumps.has(s) || nodes.some(b => b !== s && pumps.has(b) && D(s, b) <= sh.range + 1e-9 && D(s, b) * sh.per <= fuel + 1e-9);
  const fuelOk = {}; ships.forEach(sh => { const f = fuelReach(sh); stars.forEach(s => { if (f[s] !== undefined && home(sh, s, f[s])) (fuelOk[s] = fuelOk[s] || []).push(sh.id); }); });
  check('and with the fuel for it: some ship gets to every star on the pumps there are, and from each star on to a pump again', stars.every(s => fuelOk[s] && fuelOk[s].length), stars.filter(s => !fuelOk[s]).join());
  check('the Wren does that for all six of its stars', stars.filter(s => s in hw).every(s => fuelOk[s].includes('wren')), stars.filter(s => s in hw && !fuelOk[s].includes('wren')).join());
  check('the three first-rung stars each have a dock with a pump: they are the stops for the second rung', ['alpha-centauri', 'barnard', 'wolf-359'].every(s => DOCKS[s]));
  check('the Wren goes out to its furthest star and back to a pump on one tank', (() => { const far = stars.filter(s => hw[s] === 2); return far.every(s => { const via = stars.filter(a => hw[a] === 1 && D(a, s) <= 8).sort((a, b) => D(a, s) - D(b, s))[0]; return D('sol', via) + 2 * D(via, s) <= 40; }); })());
}

console.log('the doc');
{
  const doc = readFileSync(join(ROOT, 'docs/NEAR-STARS.md'), 'utf8');
  check('docs/NEAR-STARS.md names every star with its real distance', STARS.every(([, name, ly]) => doc.includes(name) && doc.includes(ly.toFixed(2) + ' ly')), STARS.filter(([, name, ly]) => !(doc.includes(name) && doc.includes(ly.toFixed(2) + ' ly'))).map(s => s[1]).join());
  check('it says how the map was flattened, what error that leaves, the ladder, what is real, and what to check', ['How three dimensions became two', 'The error it leaves', 'The jump ladder from Sol', 'what is real', 'Numbers to check'].every(h => doc.includes(h)));
  check('it names every dock', ['Toliman Waypoint', 'Runaway Depot', 'Dimlight Post', 'Dogwatch Station', 'Flarewatch Outpost', 'Bessel Point'].every(d => doc.includes(d)));
}

check('the game made no error with the pack on', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
