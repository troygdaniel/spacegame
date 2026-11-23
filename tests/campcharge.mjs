// smoke: the health bar of a ship you protect: who has one, its colour and flash, the map's mark, the order sub-list's row and the flight view's bar (plain Node, no Chrome)
// Card space-game-protected-health (Troy, 22 Nov 2026, after playing: a small health bar on every ship the player protects, readable zoomed out, also on the map mark and in the order sub-lists). src/campcharge.js is the rule
// (CAMP.charge in src/campaign.js is the table); src/campchargescene.js, src/campmapdraw.js and src/campanelsdraw.js draw it (a stand-in scene here: the picture was looked at in Chrome once).
//   A. who has a bar: the transport (1.1), the neutral miners (1.2), the haulers (1.3), the distress miner; not a patrol, a fighter, an escort, an alien, the carrier, nor a ship that is lost
//   B. the colour and the flash: green over 60 percent, amber to 30, red under; a hit flashes it for 700 ms; a ship tucked under the cruiser's shield takes the hit on the cruiser's and does not flash
//   C. the map's marks carry the hull for those ships only; the order sub-list's rows (Escort the convoy) carry it for the escorts' candidates only
//   D. the flight view: one bar for each, drawn again only when it changes, at the same size on the screen at every zoom, over the ship, gone with the ship, hidden under the map
//   E. the registrations, the words of the table, the rule file is pure, the table's lines have their comments, and the scene's calls
// Run: node tests/campcharge.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

g.run(`
  window.__run = (C, s) => { for (let i = 0; i < s * 30 && !C.result; i++) campStep(C, 1 / 30); C.events.length = 0; };
  // mission 0 is 1.1 (the transport and the Ceres miners), 1 is 1.2 (two neutral miners), 2 is 1.3 (three haulers); god: the cruiser cannot fall; no hostile
  window.__new = (mission, s) => { const C = campNew(1, [], { seed: 5, god: true, mission }); C.arrivedAt = 0; C.ships = C.ships.filter(u => u.team !== 'alien'); __run(C, s || 8); C.ships = C.ships.filter(u => u.team !== 'alien'); window.C = C; return C; };
  window.__ids = f => C.ships.filter(f).map(u => u.id).sort();
  // a stand-in scene: graphics that remember how often they were drawn, where they are and how big, a camera on the cruiser, the ships' sprites with a size
  window.__scene = (zoom, extra) => {
    const gs = [], c = C.carrier;
    const mkG = () => { const o = { clears: 0, calls: 0, x: 0, y: 0, sx: 1, vis: true, dead: false, depth: 0, last: [] }; ['fillStyle', 'lineStyle', 'fillRect', 'strokeRect'].forEach(k => { o[k] = (...a) => { o.calls++; o.last.push([k].concat(a)); return o; }; }); o.clear = () => { o.clears++; o.last = []; return o; }; o.setDepth = d => { o.depth = d; return o; }; o.setPosition = (x, y) => { o.x = x; o.y = y; return o; }; o.setScale = s => { o.sx = s; return o; }; o.setVisible = v => { o.vis = v; return o; }; o.destroy = () => { o.dead = true; return o; }; gs.push(o); return o; };
    const sp = {}; C.ships.forEach(u => { sp[u.id] = { displayWidth: 60, displayHeight: 30 }; });
    return Object.assign({ gs, camp: C, mode: 'play', hud: {}, sp, cameras: { main: { zoom, scrollX: c.x - W / 2, scrollY: c.y - H / 2 } }, add: { graphics: mkG } }, extra || {});
  };
`);

console.log('A. who has a bar');
{
  g.run('__new(0)');
  const care = J(`campChargeBars(C).map(b => b.id).sort()`), want = J(`C.ships.filter(u => u.hp > 0 && (u.kind === 'freighter' || (u.kind === 'miner' && u.team === 'neutral'))).map(u => u.id).sort()`);
  check('1.1: the transport and the neutral miners have a bar', care.length >= 1 && J(`campChargeBars(C).some(b => b.kind === 'freighter')`) && JSON.stringify(care) === JSON.stringify(want), care.join());
  check('they are the ships the convoy orders and the escort sub-list name: campConvoyShips', JSON.stringify(care) === JSON.stringify(J(`campConvoyShips(C).map(u => u.id).sort()`)) && JSON.stringify(care) === JSON.stringify(J(`campPickGuarded(C).map(u => u.id).sort()`)));
  check('nobody else has one: not the carrier, a fighter, an escort, a patrol, an alien nor a tower', J(`campChargeBars(C).every(b => { const u = C.by[b.id]; return u.kind === 'freighter' || (u.kind === 'miner' && u.team === 'neutral'); })`));
  g.run(`window.PAT = campSpawn(C, 'patrol', C.carrier.x + 500, C.carrier.y); PAT.team = 'neutral'; window.AL = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y); campOrder(C, 'launch'); __run(C, 6);`);
  check('a neutral patrol, an alien, the launched wing and the carrier still have none', !J(`campChargeMark(C, PAT.id)`) && !J(`campChargeMark(C, AL.id)`) && !J(`campChargeMark(C, C.carrier.id)`) && J(`C.ships.filter(u => u.team === 'earth' && (u.kind === 'fighter' || u.kind === 'escort')).every(u => !campChargeMark(C, u.id))`));
  g.run(`window.T0 = campChargeBars(C)[0]; C.by[T0.id].hp = 0;`);
  check('a ship that is lost has none (and the next frame has one fewer)', !J(`campChargeMark(C, T0.id)`) && J(`campChargeBars(C).length`) === care.length - 1);
  g.run('__new(1)'); const m12 = J(`campChargeBars(C).map(b => b.kind + ':' + C.by[b.id].team)`);
  check('1.2: the two neutral miners have one each', m12.length === 2 && m12.every(x => x === 'miner:neutral'), m12.join());
  g.run('__new(2, 40)'); const hl = J(`campChargeBars(C).map(b => b.kind)`);
  check('1.3: each hauler that is flying has one', hl.length >= 3 && hl.every(k => k === 'freighter'), hl.join());
  g.run('__new(0, 1)'); const ids0 = J(`C.ships.filter(u => u.team === 'neutral').map(u => u.kind)`);
  check('the distress miner of 1.1 (a neutral miner that works off the road) is a ship you protect', J(`C.ships.some(u => u.team === 'neutral' && u.kind === 'miner' && u.tid === 'dm')`) && J(`campChargeBars(C).some(b => C.by[b.id].tid === 'dm')`), ids0.join());
}

console.log('B. the colour and the flash');
{
  g.run('__new(0)');
  const K = J('CAMP.charge');
  check('the table: amber at 60 percent, red at 30, a flash of 700 ms, a colour for each band', K.amber === 0.6 && K.red === 0.3 && K.flash === 700 && ['green', 'amber', 'red'].every(b => typeof K.color[b] === 'number'));
  check('a share is the hull over the most it has (a ship with no maxHp counts as whole)', J('campChargeHull({ hp: 12, maxHp: 24 })') === 0.5 && J('campChargeHull({ hp: 30, maxHp: 24 })') === 1 && J('campChargeHull({ hp: 5 })') === 1 && J('campChargeHull({ hp: -3, maxHp: 24 })') === 0);
  check('green above 60 percent, amber from 60 down to 30, red at 30 and under', J('[1, 0.61, 0.6, 0.45, 0.31, 0.3, 0.1, 0].map(campChargeBand)').join() === 'green,green,amber,amber,amber,red,red,red');
  g.run(`window.T = C.ships.find(u => u.kind === 'freighter'); T.maxHp = 100; T.hp = 100; delete T.hurtAt;`);
  check('a whole ship is a full green bar and does not flash', J('(() => { const b = campChargeMark(C, T.id); return b.hull === 1 && b.pct === 100 && b.band === "green" && b.hit === 0 && b.color === CAMP.charge.color.green; })()'));
  g.run(`C.t = 10000; campHurt(C, T, 45, 'x');`);
  const b1 = J('campChargeMark(C, T.id)');
  check('a hit takes the hull down (45 of 100: 55 percent, amber) and the bar flashes at once', b1.pct === 55 && b1.band === 'amber' && b1.hit === 1, JSON.stringify(b1));
  g.run('C.t = 10350;'); const b2 = J('campChargeMark(C, T.id)');
  check('the flash eases off: half gone at 350 ms', Math.abs(b2.hit - 0.5) < 1e-9, b2.hit);
  g.run('C.t = 10700;'); check('and is over at 700 ms', J('campChargeMark(C, T.id)').hit === 0);
  g.run(`C.t = 20000; campHurt(C, T, 30, 'x');`); const b3 = J('campChargeMark(C, T.id)');
  check('25 percent left is red', b3.pct === 25 && b3.band === 'red' && b3.color === J('CAMP.charge.color.red'), JSON.stringify(b3));
  g.run(`campConvoyOrder(C, 'tuck in'); T.x = C.carrier.x + 30; T.y = C.carrier.y; T.hurtAt = -1e9; window.cs0 = C.carrier.hurtAt; C.t = 30000; campHurt(C, T, 10, 'x');`);
  check('a ship tucked under the cruiser\'s shield takes the hit on the cruiser: its hull and its bar stay, and it does not flash', J('(() => { const b = campChargeMark(C, T.id); return b.pct === 25 && b.hit === 0; })()') && J('C.carrier.hurtAt') === 30000);
}

console.log('C. the map and the sub-list');
{
  g.run('__new(1)'); g.run(`C.ships.filter(u => u.kind === 'miner' && u.team === 'neutral').forEach((u, i) => { u.maxHp = 40; u.hp = i ? 10 : 40; });`);
  const marks = J('campMapMarks(C).filter(m => m.hull != null)');
  check('the map: the marks of the ships you protect carry their hull, band and flash', marks.length === 2 && marks.every(m => m.type === 'miner' && typeof m.band === 'string' && typeof m.hit === 'number') && marks.map(m => m.hull).sort().join() === '0.25,1', JSON.stringify(marks));
  check('the map: no other mark does (carrier, wing, hostiles, places)', J(`campMapMarks(C).filter(m => m.hull == null).every(m => m.type !== 'miner' && m.type !== 'convoy')`));
  g.run('__new(0)'); check('the map: the transport\'s mark carries it', J(`campMapMarks(C).filter(m => m.type === 'convoy' && m.hull === 1 && m.band === 'green').length`) === 1);
  g.run('__new(2, 40)');
  const rows = J(`campPickItems(C, 'escort').map(it => campPickRow(C, it, 'escort'))`);
  check('the escort sub-list: every row carries the ship\'s hull and its band for the bar', rows.length >= 3 && rows.every(r => r.hull >= 0 && r.hull <= 1 && ['green', 'amber', 'red'].includes(r.band)));
  g.run(`campSpawn(C, 'raider', C.carrier.x + 1500, C.carrier.y); campSpawn(C, 'skiff', C.carrier.x + 1900, C.carrier.y);`);
  const er = J(`campPickItems(C, 'enemy').map(it => campPickRow(C, it, 'enemy'))`), fr = J(`campPickItems(C, 'field').map(it => campPickRow(C, it, 'field'))`);
  check('the attack and mine sub-lists have no bar (a hostile is not a ship you protect; a field has no hull)', er.length >= 2 && er.every(r => r.hull === -1 && r.band === '') && fr.every(r => r.hull === -1));
  check('the row keeps its words: km and percent still say it in text', rows.every(r => /km\s+\d+%/.test(r.short)));
}

console.log('D. the flight view');
{
  g.run('__new(2, 40)'); g.run('window.S = __scene(1)');
  const k = J('campChargeBars(C).length');
  g.run('campChargeSync(S)');
  const bars = J('Object.keys(S.hud.charge).length'), gs = J('S.gs.length');
  check('one bar for each ship you protect, and none for the others', bars === k && gs === k && k >= 3, [bars, gs, k].join());
  check('each is its own graphics object, over the ships (depth 6)', J('S.gs.every(o => o.depth === CAMP.charge.depth)') && J('CAMP.charge.depth') === 6);
  const t = J('campChargeBars(C)[0]'), o = J('S.hud.charge[campChargeBars(C)[0].id].g');
  check('it sits over its ship: at the ship\'s x, above its y by half the ship, the gap and the bar\'s height, in px of the screen', Math.abs(o.x - t.x) < 1e-6 && Math.abs(o.y - (t.y - (30 + CAMP_GAP() + CAMP_H()) )) < 1e-6, [o.x, o.y, t.x, t.y].join());
  g.run('S.gs.forEach(o => { o.n0 = o.clears; }); campChargeSync(S); campChargeSync(S); campChargeSync(S);');
  check('nothing changed: nothing is drawn again (only the place moves)', J('S.gs.every(o => o.clears === o.n0)'));
  g.run(`window.T = C.ships.find(u => u.kind === 'freighter'); T.maxHp = 100; T.hp = 100; C.t = 50000; campChargeSync(S); window.o0 = S.hud.charge[T.id].g.clears; C.t = 50001; campHurt(C, T, 20, 'x'); campChargeSync(S);`);
  check('a hit draws the bar again (shorter, flashing)', J('S.hud.charge[T.id].g.clears') > J('o0'));
  g.run('C.t = 50800; campChargeSync(S); window.o1 = S.hud.charge[T.id].g.clears; campChargeSync(S); campChargeSync(S);');
  check('and again when the flash is over, then not at all', J('S.hud.charge[T.id].g.clears') === J('o1'));
  g.run(`T.x += 40; T.y -= 25; campChargeSync(S); window.o2 = S.hud.charge[T.id].g.clears; T.x += 40; campChargeSync(S);`);
  check('a ship that moves moves its bar and does not redraw it', J('S.hud.charge[T.id].g.clears') === J('o2') && Math.abs(J('S.hud.charge[T.id].g.x') - J('T.x')) < 1e-6);
  const sizeAt = z => { g.run(`window.S2 = __scene(${z}); campChargeSync(S2);`); const q = J('S2.hud.charge[T.id].g'); return { sx: q.sx, off: (J('T.y') - q.y) * z, scale: q.sx * z }; };
  const a = sizeAt(1), b = sizeAt(0.2), c = sizeAt(0.02);
  check('the bar is the same size on the screen at every zoom: its scale is 1 over the zoom (zoom 1, 0.2 and 0.02)', [a, b, c].every(x => Math.abs(x.scale - 1) < 1e-9), JSON.stringify([a, b, c]));
  check('and the same distance over the ship on the screen (the far view draws a ship at least 10 px across: the gap is from 14 px)', [a, b, c].every(x => Math.abs(x.off - (a.off)) < 1e-6) || c.off >= CAMP_BAR_MIN() + CAMP_GAP() + CAMP_H() - 1e-6, JSON.stringify([a.off, b.off, c.off]));
  g.run(`T.hp = 0; campChargeSync(S);`);
  check('a lost ship\'s bar is destroyed and forgotten', J('S.hud.charge[T.id]') === null && J('S.gs.filter(o => o.dead).length') === 1);
  g.run(`S.mp = {}; campChargeSync(S);`);
  check('with the map open the bars are hidden (it covers the view)', J('Object.keys(S.hud.charge).every(id => S.hud.charge[id].g.vis === false)'));
  g.run(`S.mp = null; campChargeSync(S);`);
  check('and shown again when it closes', J('Object.keys(S.hud.charge).every(id => S.hud.charge[id].g.vis === true)'));
  check('a scene with no camp or no camera is not an error (a stand-in in another test)', (() => { try { g.run('campChargeSync({}); campChargeSync({ camp: C, hud: {} });'); return true; } catch (e) { return false; } })());
}
function CAMP_GAP() { return J('CAMP.charge.bar.gap'); }
function CAMP_H() { return J('CAMP.charge.bar.h'); }
function CAMP_BAR_MIN() { return J('CAMP.charge.bar.min'); }

console.log('E. registration and words');
{
  const html = src('index.html'), p = f => html.indexOf('src/' + f), sc = src('src/campaignscene.js'), tb = src('src/campaign.js');
  check('both files are in index.html: the rule after the sensors, the scene half before the Campaign scene', p('campcharge.js') > 0 && p('campchargescene.js') > 0 && p('campchargescene.js') < p('campaignscene.js'));
  check('the Campaign scene calls campChargeSync every frame after the ships\' sprites are in place (after sync())', /this\.sync\(\); if \(this\.hudHides\(\)\)[^\n]*\n\s*if \(typeof campChargeSync === 'function'\) campChargeSync\(this\);/.test(sc));
  check('the scene keeps the bars in scene.hud, not on the scene object (an instance is reused on a restart)', !/this\.charge\b/.test(sc) && !/scene\.charge\b/.test(src('src/campchargescene.js')));
  check('the rule file is pure: no Phaser, no scene', !/Phaser|scene\./.test(src('src/campcharge.js').replace(/^\/\/.*$/gm, '')));
  const t = tb.slice(tb.indexOf('  charge: {'), tb.indexOf('  sensor: {'));
  check('every line of the CAMP table\'s charge block has its comment', t.split('\n').filter(l => /^\s+\w+: /.test(l)).every(l => /\/\//.test(l)), t.slice(0, 80));
  check('the map and the lists draw it: a bar over the mark, a bar at the right of an escort\'s row', /m\.hull != null/.test(src('src/campmapdraw.js')) && /st\.hull >= 0/.test(src('src/campanelsdraw.js')));
}

console.log(failed ? `\nCAMPAIGN CHARGE FAIL: ${failed} of ${n} checks failed` : `\nCAMPAIGN CHARGE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
