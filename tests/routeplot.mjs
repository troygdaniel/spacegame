// smoke: the route plotter: jumpRoute plans a trip hop by hop, and a ship that cannot make it is told so in plain words, by name, price and yard; the board takes no call the ship cannot reach
// Card space-game-route-plotter (Troy, 17 Nov 2026: a call to Reaver's Roost, a Wren that jumps 8, and nothing said the Roost is 12.2 ly from its nearest neighbour).
// Plain Node (tests/nodegame.mjs), no browser.
//   jumpRoute (src/jump.js): the fewest jumps, every jump inside the range, fuel filled at pumps; the chain that WOULD work when none does, the longest jump on it, the tank it needs
//   the words (src/missions.js routeCheck, routeSay): "Needs a 12.2 ly jump: your Wren does 8. The Kite at the Halcyon yard does 14, 4,500 cr."
//   the job row, the mission box and the navigation panel say the next jump ("Jump 1 of 2: Kestrel, 6.3 ly") or the words above
//   the board over EVERY call and EVERY ship: it agrees with jumpReach, names the right system, says why in words, and missionTryAccept refuses what the ship cannot reach
// Run: node tests/routeplot.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; console.log(`  ${cond ? 'ok  ' : 'FAIL'} ${name}${detail ? '  (' + String(detail).slice(0, 360) + ')' : ''}`); if (!cond) failed++; };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r, (k, v) => v === Infinity ? 'inf' : v); })()`));

g.run(`
  toast = () => {}; sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  Phaser = { Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } } };
  function __scene() {
    const st = sysBody('station'), pl = sysBody('planet'), at = b => b ? { x: b.x, y: b.y } : { x: 0, y: 0, nowhere: true };
    return { ship: { x: 100, y: 100 }, station: at(st), planet: at(pl), canLand: true, cr: { target: null }, mx: {}, enemies: { getChildren: () => [] } };
  }
  function __ship(id, fuel) { G.fleet = [newShip(id)]; G.active = 0; if (fuel !== undefined) G.fleet[0].fuel = fuel; }
  function __take(id, system) { G.missionId = id; G.mission = 'accepted'; G.missionProgress = 0; G.system = system; G.lastDock = homeDock(); G.deep = null; }
  G.known = Object.keys(SYSTEMS); G.patrolsDone = 1; G.credits = 99999;
`);
const SHIPS = J(`Object.values(SHIP_MODELS).filter(s => s.side === 'player').map(s => ({ id: s.id, name: s.name, range: s.range, tank: s.tank, perLy: s.fuelPerLy, price: s.price }))`);
const SYS = J('Object.keys(SYSTEMS)');
const ly = (a, b) => J(`distLy('${a}', '${b}')`);
const route = (from, to, r, t, p, h) => J(`jumpRoute('${from}', '${to}', ${r}, ${t}, ${p}${h === undefined ? '' : ', ' + h})`);

console.log('jumpRoute: the data Troy hit');
{
  const wren = SHIPS.find(s => s.id === 'wren'), kite = SHIPS.find(s => s.id === 'kite');
  const w = route('halcyon', 'roost', wren.range, wren.tank, wren.perLy);
  check('a Wren cannot reach the Roost: out of range, the way that would work is Kestrel then the Roost', !w.ok && w.why === 'range' && w.hops.map(h => h.id).join() === 'kestrel,roost', JSON.stringify(w));
  check('the longest jump on it is 12.2 ly: 4.2 more than the Wren does', Math.abs(w.bottleneck - ly('kestrel', 'roost')) < 1e-9 && w.bottleneck.toFixed(1) === '12.2' && w.over.toFixed(1) === '4.2', w.bottleneck + ' ' + w.over);
  const k = route('halcyon', 'roost', kite.range, kite.tank, kite.perLy);
  check('a Kite does it in two jumps: Kestrel 6.3 ly, then the Roost 12.2 ly', k.ok && k.hops.length === 2 && k.hops[0].id === 'kestrel' && k.hops[1].id === 'roost' && k.hops[0].ly.toFixed(1) === '6.3' && k.hops[1].ly.toFixed(1) === '12.2', JSON.stringify(k));
  check('its fuel per hop is the light years times its use, and the total adds up', Math.abs(k.hops[0].fuel - k.hops[0].ly * kite.perLy) < 1e-9 && Math.abs(k.fuel - (k.hops[0].fuel + k.hops[1].fuel)) < 1e-9 && Math.abs(k.ly - (k.hops[0].ly + k.hops[1].ly)) < 1e-9);
  check('on a full tank nothing needs a fill-up on the way', k.hops.every(h => !h.fill));
  const low = route('halcyon', 'roost', kite.range, kite.tank, kite.perLy, 2);
  check('on 2 units it says: fill up before the first jump (Halcyon has a pump)', low.ok && low.hops[0].fill === true && low.hops[1].fill === false, JSON.stringify(low.hops));
  const dry = route('halcyon', 'roost', kite.range, 5, kite.perLy);
  check('a tank of 5 cannot fly the 7.3 units of the long jump: out of fuel, and it says which tank would', !dry.ok && dry.why === 'fuel' && dry.needTank >= 7.3 && dry.needTank < 7.5 && dry.hops.length === 2, JSON.stringify(dry));
  check('here is there: no hops', route('halcyon', 'halcyon', 8, 40, 1).ok && route('halcyon', 'halcyon', 8, 40, 1).hops.length === 0);
  check('a system the game does not know: no route, no crash', route('halcyon', 'nowhere', 8, 40, 1).why === 'none' && route('nowhere', 'halcyon', 8, 40, 1).why === 'none');
}

console.log('jumpRoute over every ship and every pair of systems');
{
  const hopsMin = (from, to, r) => { const seen = new Map([[from, 0]]), q = [from]; while (q.length) { const a = q.shift(); SYS.forEach(b => { if (!seen.has(b) && ly(a, b) <= r + 1e-9) { seen.set(b, seen.get(a) + 1); q.push(b); } }); } return seen.has(to) ? seen.get(to) : null; };
  let pairs = 0; const bad = [];
  for (const s of SHIPS) for (const a of SYS) for (const b of SYS) {
    if (a === b) continue; pairs++;
    const r = route(a, b, s.range, 1e6, s.perLy), min = hopsMin(a, b, s.range), tag = `${s.id} ${a}>${b}`;
    if (min === null) { if (r.ok || r.why !== 'range' || !(r.bottleneck > s.range) || Math.abs(r.over - (r.bottleneck - s.range)) > 1e-9) bad.push(tag + ' not-reachable mismatch'); continue; }
    if (!r.ok) { bad.push(tag + ' should be reachable'); continue; }
    if (r.hops.length !== min) bad.push(tag + ' not the fewest jumps ' + r.hops.length + ' vs ' + min);
    let at = a; r.hops.forEach(h => { if (ly(at, h.id) > s.range + 1e-9) bad.push(tag + ' hop too long'); at = h.id; });
    if (at !== b) bad.push(tag + ' ends at ' + at);
  }
  check(`${pairs} trips (${SHIPS.length} ships x every pair): the fewest jumps, every jump in range, ends there; unreachable ones name the jump that is missing`, bad.length === 0, bad.slice(0, 4).join(' | '));
}

console.log('the words');
{
  g.run(`__ship('wren')`);
  const w = J(`routeCheck('halcyon', 'roost')`);
  check('Wren to the Roost: Needs a 12.2 ly jump: your Wren does 8. The Kite at the Halcyon yard does 14, 4,500 cr.', w.line === 'Needs a 12.2 ly jump: your Wren does 8. The Kite at the Halcyon yard does 14, 4,500 cr.', w.line);
  check('the fix it names is a real ship with a real price and a real yard', w.need.kind === 'ship' && w.need.model === 'kite' && w.need.price === SHIPS.find(s => s.id === 'kite').price && J(`stationYard('${w.need.where.station}').includes('kite')`));
  const e = J(`routeCheck('meridian', 'ember')`);
  check('an 8.2 ly jump: a part is the cheaper fix, named with its price ("an 8.2")', /^Needs an 8\.2 ly jump: your Wren does 8\. Engine tier 1 at any shop: 9 ly, [\d,]+ cr\.$/.test(e.line), e.line);
  g.run(`__ship('kite')`);
  check('a Kite to the Roost: no words, the plan is there', J(`routeCheck('halcyon', 'roost')`).line === '' && J(`routeCheck('halcyon', 'roost')`).res.ok);
  g.run(`__ship('kite', 2); G.system = 'halcyon'`);
  check('a Kite on 2 units at Halcyon, which has a pump: the route is fine, it just starts with a fill-up', J(`routeCheck('halcyon', 'roost')`).line === '' && J(`routeCheck('halcyon', 'roost')`).res.hops[0].fill === true);
  g.run(`__ship('kite', 1)`);
  const lowl = J(`routeCheck('hollow', 'halcyon')`).line;
  check('a Kite on 1 unit in the Hollow (no pump): Low on fuel, the tank is not the trouble, call the ranger', /^Low on fuel: you hold 1 units/.test(lowl) && /call the fuel ranger \(F\)/.test(lowl), lowl);
  g.run(`__ship('wren')`);
  const t = J(`routeSay({ ok: false, why: 'fuel', needTank: 12, hops: [] }, activeShip(), routeNeed(r => shipStat('tank', r) >= 50, activeShip(), 'fuel'))`);
  check('a tank too small: Needs 12 fuel between pumps: your Wren holds 40, and what holds more, by price', /^Needs 12 fuel between pumps: your Wren holds 40\. .*( holds \d+| at any shop: \d+ fuel), [\d,]+ cr\.$/.test(t), t);
}

console.log('the job row, the mission box and the navigation panel');
{
  const row = () => J(`(() => { const s = __scene(), st = missionStep(), m = navpanelMission(s), rows = navpanelRows([], navpanelJumps(s), m), r = rows.find(r => r.mission);
    return { step: st, job: navpanelJob(), box: hudMission(s, 'Space').next, row: r && { id: r.id, ok: r.ok, say: r.say || null }, hint: r ? navpanelHint(r, false, '') : '' }; })()`);
  g.run(`__ship('wren'); __take('bounty', 'halcyon')`);
  let r = row();
  const WORDS = 'Needs a 12.2 ly jump: your Wren does 8. The Kite at the Halcyon yard does 14, 4,500 cr.';
  check('a Wren with the bounty accepted: the job row says why, in words', r.step.kind === 'blocked' && r.step.text === WORDS && r.job === 'JOB  ' + WORDS, r.job);
  check('the mission box says the same sentence', r.box === WORDS, r.box);
  check('the nav panel keeps a row for the Roost and its hint says the same', r.row && r.row.id === 'roost' && r.row.ok === false && r.hint === WORDS, JSON.stringify(r.row) + ' ' + r.hint);
  g.run(`__ship('kite'); __take('bounty', 'halcyon')`); r = row();
  check('a Kite: Jump 1 of 2: Kestrel, 6.3 ly (press G, then Enter). Then Reaver\'s Roost: destroy the Reaver.', r.step.kind === 'jump' && r.step.hops === 2 && r.step.hop === 'kestrel' && r.step.text === 'Jump 1 of 2: Kestrel, 6.3 ly (press G, then Enter). Then Reaver\'s Roost: destroy the Reaver.', r.step.text);
  check('the job row and the mission box say it too, and the nav panel\'s row is the next jump, Kestrel', r.job === 'JOB  ' + r.step.text && r.box === r.step.text && r.row.id === 'kestrel' && r.row.ok === true && r.hint === 'Enter  open the galaxy map at Kestrel', JSON.stringify(r.row));
  g.run(`__take('bounty', 'kestrel')`); r = row();
  check('after the first jump, from Kestrel: one hop left, in the old words', r.step.hops === 1 && r.step.hop === 'roost' && r.step.text === 'Jump to Reaver\'s Roost: press G, then destroy the Reaver', r.step.text);
  g.run(`__ship('kite', 2); __take('bounty', 'halcyon')`); r = row();
  check('on 2 units at Halcyon the first jump says fill up first', /Fill up at Halcyon first\.$/.test(r.step.text), r.step.text);
  g.run(`__take('bounty', 'roost')`); r = row();
  check('in the Roost: the fight, no jump', r.step.system === null && r.step.text === 'Destroy the Reaver');
  g.run(`__ship('wren'); __take('courier-halcyon-kestrel', 'halcyon')`); r = row();
  check('a Wren and a call it can fly: the old words, one jump', r.step.text === 'Jump to Kestrel: press G, then dock at Kestrel Outpost' && r.step.hops === 1);
  g.run(`__ship('kite'); __take('bounty', 'halcyon'); __ship('wren')`); r = row();
  check('a call accepted with a Kite and then the Wren flown: the job row now says it cannot be done', r.step.kind === 'blocked' && r.job === 'JOB  ' + WORDS);
}

console.log('the board, over every call and every ship');
{
  const stations = J(`Object.keys(SYSTEMS).flatMap(id => sysBodies('station', id).map(b => b.id))`);
  let combos = 0, blocked = 0; const bad = [], seen = new Set();
  for (const s of SHIPS) {
    g.run(`__ship('${s.id}')`);
    for (const st of stations) {
      const from = J(`callSystemOf('${st}')`), offered = J(`missionsOffered('${st}').map(m => m.id)`), board = J(`missionsBoard('${st}').map(b => ({ id: b.m.id, ok: b.reach.ok, line: b.reach.line || '', why: b.reach.why || '' }))`);
      if (board.map(b => b.id).join() !== offered.join()) bad.push(`${st}: the board lacks a call it offers`);
      for (const b of board) {
        combos++; seen.add(b.id);
        const goal = J(`callGoal(MISSIONS.find(m => m.id === '${b.id}')).system`), reachSys = J(`missionReachSystem(MISSIONS.find(m => m.id === '${b.id}'))`);
        const want = J(`jumpReach('${from}', '${goal}', ${s.range}, ${s.tank}, ${s.perLy}).ok`), tag = `${s.id} ${st} ${b.id}`;
        if (reachSys !== goal) bad.push(tag + ' reach is checked for ' + reachSys + ' not ' + goal);
        if (b.ok !== want) bad.push(tag + ' board says ' + b.ok + ', the numbers say ' + want);
        const can = J(`missionCanAccept(MISSIONS.find(m => m.id === '${b.id}'), '${st}')`);
        if (can !== want) bad.push(tag + ' missionCanAccept ' + can);
        if (!b.ok) {
          blocked++;
          if (!(b.line.includes(s.name) && /\d/.test(b.line) && /cr\.$|No ship on sale/.test(b.line))) bad.push(tag + ' no plain line: ' + b.line);
          g.run(`G.mission = 'none'; G.missionId = null; G.lastDock = '${st}'`);
          if (J(`missionTryAccept(MISSIONS.find(m => m.id === '${b.id}'), '${st}')`) !== false || J('G.mission') !== 'none') bad.push(tag + ' was accepted');
        } else {
          g.run(`G.mission = 'none'; G.missionId = null; G.lastDock = '${st}'`);
          if (J(`missionTryAccept(MISSIONS.find(m => m.id === '${b.id}'), '${st}')`) !== true || J('G.mission') !== 'accepted') bad.push(tag + ' was refused');
        }
      }
    }
  }
  check(`${combos} (ship, station, call) rows: ${SHIPS.length} ships, every station's board, ${seen.size} different calls: the board agrees with the numbers`, bad.length === 0 && combos > 100, bad.slice(0, 4).join(' | '));
  check(`${blocked} of them cannot be flown: each has a plain line with the ship's name, a number and a price (or says nothing on sale), and is never accepted`, blocked > 10 && bad.length === 0);
  const kinds = new Set(J(`MISSIONS.filter(m => ${JSON.stringify([...seen])}.includes(m.id)).map(m => missionKind(m))`));
  check('the rows cover every kind of call the game has: ' + [...kinds].join(', '), ['rescue', 'escort', 'patrol', 'bounty', 'courier', 'haul', 'salvage', 'survey'].every(k => kinds.has(k)));
  g.run(`__ship('wren'); G.mission = 'none'; G.missionId = null; pickMission('bounty')`);
  check('a stale board (the call picked, the flag set from another ship) still cannot take the bounty with a Wren: the accept checks again', J(`missionTryAccept()`) === false && J('G.mission') === 'none');
  g.run(`__ship('kite'); G.mission = 'none'; G.missionId = null; pickMission('bounty'); G.lastDock = 'halcyon-station'`);
  check('and takes it with a Kite', J(`missionTryAccept()`) === true && J('G.mission') === 'accepted' && J('G.missionId') === 'bounty');
}
console.log('the galaxy map: the chain, the card, Enter on the next jump');
{
  g.run(`
    beep = () => {};
    var __jumps = [];
    // the real Galaxy scene on a scene that answers every Phaser call with nothing: create, refresh, go and update run, so a typo in them shows here
    function __gal(sel) {
      const s = Object.create(null); Object.getOwnPropertyNames(Galaxy.prototype).forEach(k => { if (k !== 'constructor') s[k] = Galaxy.prototype[k]; }); // the scene's own methods on a plain object: nodeGame's Phaser stub would answer every field with a stand-in
      s.add = __P; s.input = __P; s.cameras = __P; s.scene = __P; s.time = __P; s.events = __P; s.tweens = __P;
      __jumps = []; s.init({ from: 'Space', sel: sel || null, onJump: (id, j) => __jumps.push([id, j.ok]) }); s.born = -1e9; s.create(); return s;
    }
  `);
  const gp = (a, b) => J(`galaxyPlan('${a}', '${b}', activeShip())`);
  g.run(`__ship('kite')`);
  let p = gp('halcyon', 'roost');
  check('galaxyPlan, a Kite to the Roost: two jumps, Enter jumps Kestrel first, the card says JUMP 1 OF 2: KESTREL, 6.3 LY', p.ok && p.n === 2 && p.next === 'kestrel' && p.title === 'JUMP 1 OF 2: KESTREL, 6.3 LY' && /^Enter jumps there, then Reaver's Roost, 12\.2 ly\.$/.test(p.detail), JSON.stringify([p.next, p.title, p.detail]));
  p = gp('halcyon', 'kestrel');
  check('one jump: no title (the card keeps JUMP READY), Enter jumps the star itself', p.ok && p.n === 1 && p.next === 'kestrel' && p.title === '');
  g.run(`__ship('wren')`); p = gp('halcyon', 'roost');
  check('a Wren: no route, the line is the plain words, the chain shown is the one that would work', !p.ok && p.line === 'Needs a 12.2 ly jump: your Wren does 8. The Kite at the Halcyon yard does 14, 4,500 cr.' && p.hops.map(h => h.id).join() === 'kestrel,roost' && p.next === 'roost');
  check('here, or a star the game has no system for: no plan, Enter keeps the old rules', gp('halcyon', 'halcyon').res === null && gp('halcyon', 'nowhere').res === null && gp('halcyon', 'nowhere').next === 'nowhere');

  g.run(`__ship('kite'); __take('bounty', 'halcyon'); G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']`);
  check('the Roost is a "?" to start with: nothing to plot a route to', J(`G.known.includes('roost')`) === false);
  g.run(`galaxyChart(activeShip())`);
  check('with the bounty accepted the map charts the Roost: the call names it', J(`G.known.includes('roost')`) === true);
  g.run(`G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']; G.mission = 'none'; G.missionId = null; galaxyChart(activeShip())`);
  check('with no call nothing is charted that is out of range', J(`G.known.includes('roost')`) === false);

  g.run(`G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']; __take('bounty', 'halcyon'); var __g = __gal(null);`);
  check('the map opens on the job\'s star, the Roost, with the chain plotted to it', J(`__g.sel`) === 'roost' && J(`__g.plan.n`) === 2 && J(`__g.plan.ok`) === true && J(`__g.verdict`) === 'ok');
  g.run(`__g.update(1000)`);
  check('the frame draws the chain without a fault, two numbers on it', J(`__g.chainMarks.length`) === 2 && g.errors.length === 0, g.errors.join(' | '));
  g.run(`__g.go()`);
  check('Enter jumps KESTREL, the first hop, not the Roost', J('__jumps').length === 1 && J('__jumps')[0][0] === 'kestrel' && J('__jumps')[0][1] === true, JSON.stringify(J('__jumps')));
  check('the nav panel hands the map the FAR star, so Enter on the job row opens the map with the whole chain', J(`(() => { const s = __scene(), rows = navpanelRows([], navpanelJumps(s), navpanelMission(s)); const r = rows.find(r => r.mission); return [r.id, r.goal]; })()`).join() === 'kestrel,roost');
  g.run(`__take('bounty', 'kestrel'); G.known.push('kestrel'); var __h = __gal(null);`);
  check('after the jump, from Kestrel: the map opens on the Roost again, one hop left, and Enter jumps it', J('__h.sel') === 'roost' && J('__h.plan.n') === 1 && (g.run(`__h.go()`), J('__jumps')[0][0] === 'roost'), JSON.stringify(J('__jumps')));
  g.run(`__ship('wren'); __take('bounty', 'halcyon'); var __w = __gal(null); __w.update(1000);`);
  check('a Wren with the bounty: the map opens on the Roost, says why, draws the chain that would work, and Enter does not jump', J('__w.sel') === 'roost' && J('__w.verdict') === 'range' && J('__w.plan.ok') === false && J('__w.chainMarks.length') === 2 && (g.run(`__jumps = []; __w.go()`), J('__jumps').length === 0));
  g.run(`__ship('kite', 2); __take('bounty', 'halcyon'); var __f = __gal(null);`);
  check('a Kite on 2 units: the first hop needs a fill-up, so Enter is refused and the verdict is fuel, the card says to fill up at the pump here', J('__f.verdict') === 'fuel' && (g.run(`__jumps = []; __f.go()`), J('__jumps').length === 0));
  g.run(`__ship('kite'); __take('courier-halcyon-kestrel', 'halcyon'); var __k = __gal(null); __k.update(1000);`);
  check('a one-jump call: the old card and the old line, Enter jumps the star', J('__k.sel') === 'kestrel' && J('__k.plan.n') === 1 && J('__k.chainMarks.length') === 0 && (g.run(`__jumps = []; __k.go()`), J('__jumps')[0][0] === 'kestrel'));
}
check('the game was quiet', g.errors.length === 0, g.errors.slice(0, 2).join(' | '));

console.log(failed ? `\n${failed} of ${n} FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
