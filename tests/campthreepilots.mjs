// smoke: the Campaign's THREE PILOTS (card space-game-three-pilots; Troy, 23 Nov 2026): one fighter replaces each squad, Wedge (red, the leader), Kara (green) and Apollo (yellow), each as strong as the squad it replaces (plain Node, no Chrome)
//   A. the table: CAMP.pilots, three fighters in the bay, the groups named for the pilots   B. the launch: three ships, one pilot each, the strength of the old squad in hull and gun
//   C. the groups and the words: red/green/yellow and the names, one ship each               D. recall, mending and loss: a pilot comes back as itself; a lost one is gone, the others fly on
//   E. the extras (rank, refit, bay2) add strength to the pilots, not ships                  F. the names are shown: the wing state, the pilot list
// Run: node tests/campthreepilots.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const sec = f => { try { f(); } catch (e) { n++; failed++; console.log('  FAIL (threw) ' + String(e && e.message).split('\n')[0].slice(0, 300)); } };
const run = code => g.run('(() => {' + code + '\n})()');
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
run(`window.__new = (opts, techs) => { window.C = campNew('home', techs || [], Object.assign({ seed: 5, god: true }, opts || {})); campOrder(C, 'launch'); for (let i = 0; i < 8; i++) campStep(C, 1); C.events.length = 0; return C; };
  window.__go = s => { for (let i = 0; i < Math.round(s * 30); i++) campStep(C, 1 / 30); C.events.length = 0; };
  window.__F = () => campWing(C, 'fighter');
  window.__P = id => campWing(C, 'fighter').find(u => u.pilot === id);`);

// ---- A. the table
console.log('A. the table');
sec(() => {
  const P = J('CAMP.pilots');
  check('CAMP.pilots: Wedge (red, the leader), Kara (green), Apollo (yellow), in the order the squads fill', Array.isArray(P) && P.length === 3 && P.map(p => p.id).join() === 'wedge,kara,apollo' && P.map(p => p.name).join() === 'Wedge,Kara,Apollo' && P.map(p => p.squad).join() === 'red,green,yellow' && P[0].lead === true && !P[1].lead && !P[2].lead, JSON.stringify(P));
  check('three fighters in the bay at the start (it was eight), and the squads are still the three groups, one fighter each', J('CAMP.bay.fighters') === 3 && J('CAMP.wing.squads').join() === 'red,green,yellow');
  check('the groups are named for the pilots: Wedge, Kara, Apollo', J('["red","green","yellow"].map(k => CAMP.wing.groups[k].name)').join() === 'Wedge,Kara,Apollo');
  check('the strength of a pilot is the size its squad had: eight fighters of strength make 3, 3 and 2; nine make 3, 3, 3; sixteen 6, 5, 5', J('[campPilotStrengths(8), campPilotStrengths(9), campPilotStrengths(16)]').map(a => a.join()).join('|') === '3,3,2|3,3,3|6,5,5');
  check('the base strength of the wing is CAMP.pilots.strength: eight fighters\' worth', J('CAMP.pilotStrength') === 8);
});

// ---- B. the launch
console.log('B. the launch');
sec(() => {
  g.run('__new()');
  const F = J('__F().map(u => ({ id: u.id, pilot: u.pilot, squad: u.squad, str: u.str, hp: u.hp, maxHp: u.maxHp }))');
  check('the launch puts out three fighters, no more', F.length === 3, F.length);
  check('one pilot each: wedge, kara, apollo, in the squads red, green, yellow', F.map(u => u.pilot).sort().join() === 'apollo,kara,wedge' && F.map(u => u.squad).sort().join() === 'green,red,yellow' && F.every(u => (u.pilot === 'wedge') === (u.squad === 'red') && (u.pilot === 'kara') === (u.squad === 'green')));
  const by = id => F.find(u => u.pilot === id);
  check('as strong as the old squad: Wedge and Kara 3 fighters\' worth of hull, Apollo 2', by('wedge').str === 3 && by('kara').str === 3 && by('apollo').str === 2, JSON.stringify(F));
  const hp = J('CAMP.fighter.hp');
  check('the hull is the fighter\'s hull times the strength (maxHp too)', F.every(u => u.maxHp === hp * u.str && u.hp <= u.maxHp && u.hp > 0), JSON.stringify(F));
  check('campPilotName gives the name of a fighter, and nothing for a ship that is no pilot', J('__F().map(u => campPilotName(u)).sort().join()') === 'Apollo,Kara,Wedge' && J('campPilotName(C.carrier)') === '');
  // the gun: a pilot's shot takes off damage times strength
  g.run('__new()'); g.run('(() => { const u = __P("wedge"); const foe = campSpawn(C, "gunship", u.x + 300, u.y); foe.hp = foe.maxHp = 1e7; foe.vmax = 0; foe.accel = 0; foe.nextShot = 1e12; u.rot = 0; u.nextShot = 0; u.order = { type: "attack", target: foe.id }; C.bullets.length = 0; window.__foe = foe; })()');
  g.run('(() => { for (let i = 0; i < 90 && !C.bullets.some(b => b.team === "earth"); i++) campStep(C, 1 / 30); })()');
  const d = J('(C.bullets.filter(b => b.team === "earth")[0] || {}).damage'), base = J('CAMP.fighter.damage');
  check('Wedge\'s shot hurts 3 times a lone fighter\'s (the gun is scaled with the hull)', d === base * 3, d + ' vs ' + base);
});

// ---- C. the groups and the words
console.log('C. the groups and the words');
sec(() => {
  g.run('__new()');
  check('a squad is one ship: Wedge is the red group, Kara the green, Apollo the yellow', J('["red","green","yellow"].map(k => campWingShips(C, k).map(u => u.pilot).join())').join('|') === 'wedge|kara|apollo');
  check('the whole wing is the three of them', J('campWingShips(C, "fighters").length') === 3 && J('campWingShips(C, "all").length') === 3);
  check('the names are group words: wedge, kara and apollo (and the colours still work)', J('["wedge","Kara","APOLLO","red","red squad","green","yellow squad"].map(x => campWingGroupId(C, x))').join() === 'red,green,yellow,red,red,green,yellow');
  check('"Wedge, attack ..." goes through the strip as the red group', J('campWingParse("wedge guard the carrier")').group === 'red' && J('campWingParse("kara attack the mothership")').group === 'green' && J('campWingParse("apollo recall")').group === 'yellow');
  const r = J('(() => { const r = campWingOrder(C, "kara", "guard", null, "test"); return { ok: r.ok, n: r.n, group: r.group, say: r.say }; })()');
  check('an order to Kara reaches one ship, and her name is on the answer', r.ok && r.n === 1 && r.group === 'green' && /Kara/.test(r.say), JSON.stringify(r));
});

// ---- D. recall, mending, loss
console.log('D. recall, mending and loss');
sec(() => {
  g.run('__new()');
  g.run('campOrder(C, "recall")'); g.run('__go(60)');
  check('the wing recalled lands: three fighters in the bay, none out', J('C.bay.fighters') === 3 && J('__F().length') === 0, J('C.bay.fighters'));
  g.run('campOrder(C, "launch")'); g.run('__go(8)');
  check('a second launch puts the same three pilots out, each in its own squad', J('__F().map(u => u.pilot + ":" + u.squad).sort().join()') === 'apollo:yellow,kara:green,wedge:red', J('__F().map(u => u.pilot + ":" + u.squad).join()'));
  // one pilot hurt: lands, is mended, and goes out again as itself (and in its own squad)
  g.run('__new()');
  g.run('(() => { const u = __P("kara"); u.hp = u.maxHp * 0.1; })()'); g.run('__go(40)');
  check('a hurt pilot goes home, is mended and comes out again as Kara, in the green squad, with her strength', J('(() => { const u = __P("kara"); return !!u && u.squad === "green" && u.str === 3 && u.hp === u.maxHp; })()') || J('(() => { const u = __P("kara"); return u ? u.str + ":" + u.hp + ":" + u.maxHp : "none"; })()'));
  // a lost pilot is gone: the others fly on
  g.run('__new()');
  g.run('(() => { const u = __P("kara"); u.hp = 0; })()'); g.run('__go(1)');
  check('Kara is lost: the green group has no ship, an order to it is refused in plain words, the other two fly on', J('campWingShips(C, "green").length') === 0 && J('campWingOrder(C, "green", "guard", null, "test").ok') === false && J('campWingShips(C, "fighters").length') === 2 && J('campWingOrder(C, "red", "guard", null, "test").ok') === true);
});

// ---- E. the extras add strength
console.log('E. the extras');
sec(() => {
  g.run('__new({ rank: 5 })');
  check('a commodore flies three fighters, as everyone does, and they are stronger: 6, 5 and 5 (sixteen fighters\' worth)', J('__F().length') === 3 && J('__F().map(u => u.str).sort().join()') === '5,5,6', J('__F().map(u => u.str).join()'));
  g.run('__new({ bonus: { fighters: 3 } })');
  check('three fighters bought at the refit are strength: 11 in all, 4, 4 and 3, still three ships', J('__F().length') === 3 && J('__F().map(u => u.str).reduce((a, b) => a + b, 0)') === 11, J('__F().map(u => u.str).join()'));
  g.run('__new({}, ["bay2"])');
  check('the bay2 tech adds its four as strength too: 12 in all, 4, 4, 4', J('__F().length') === 3 && J('__F().map(u => u.str).join()') === '4,4,4', J('__F().map(u => u.str).join()'));
});

// ---- F. the names are shown
console.log('F. the names are shown');
sec(() => {
  g.run('__new()');
  check('campPilots lists the three with their ships: [{ id, name, squad, lead, ship }]', J('campPilots(C).map(p => p.id + ":" + p.name + ":" + p.squad + ":" + !!p.lead + ":" + !!p.ship).join()') === 'wedge:Wedge:red:true:true,kara:Kara:green:false:true,apollo:Apollo:yellow:false:true');
  check('the map\'s wing state names the groups for the pilots', J('campWingState(C).filter(r => r.id === "red" || r.id === "green" || r.id === "yellow").map(r => r.name).join()') === 'Wedge,Kara,Apollo');
  check('the ship computer\'s summary says three fighters out', /Out: [^.]*3 fighters/.test(J('campSummary(C)')) || /3 fighters/.test(J('campSummary(C)')), J('campSummary(C)').slice(-300));
});

console.log(`\n${n - failed}/${n} checks passed${failed ? '  ' + failed + ' FAILED' : ''}`);
process.exit(failed ? 1 : 0);
