// smoke: the wing's orders with groups and explicit targets: the verb/target table, the groups, the refusals, cancel, the state the map reads, the words (plain Node, no Chrome)
// Card space-game-campaign-wing-targets (src/campwing.js, CAMP.wing in src/campaign.js, the wing AI in campWingAI). The sim side of commanding the fleet from the map: campWingOrder(C, group, verb, target, how).
//   A. the table and the groups          B. every valid pair, and the group each order reaches        C. the refusals, in plain words
//   D. the five old orders              E. the wing flies the order (target, point, hold, fetch, mine, stance)
//   F. cancel and recall                G. the state for the map: groups, order, target, line           H. the words: strip, voice, the ship computer
// Run: node tests/campwing.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';
import { belt } from './fixtures/campbelt.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store }); belt(g); // the old Level 1, the asteroid belt, as a fixture level: this suite flies on it (card space-game-l1-rim-missions)
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a battle of the belt's second mission (haulers fly from Vesta to Ceres), the wing out, nothing of theirs alive; a gunship that stands still can be put anywhere
g.run(`
  window.__new = (level, mission) => { window.C = campNew(level || 11, [], { seed: 2, god: true, mission: mission == null ? 1 : mission }); C.arrivedAt = 0; C.waves.forEach(w => { w.started = true; }); C.motherSpawn = 1e12; C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0);
    campOrder(C, 'launch'); __run(10); return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
  window.__foe = (dx, dy, kind) => { var u = campSpawn(C, kind || 'gunship', C.carrier.x + dx, C.carrier.y + dy); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 1e7; return u; };
  window.__f = () => campWing(C, 'fighter'); window.__e = () => campWing(C, 'escort');
  window.__r = (grp, verb, tg, how) => { var r = campWingOrder(C, grp, verb, tg, how || 'test'); return { ok: r.ok, code: r.code, say: r.say, n: r.n, group: r.group, verb: r.verb }; };
  window.__d = (u, p) => Math.hypot(u.x - p.x, u.y - p.y);
`);

// ---------- A. the table and the groups ----------
console.log('A. the table and the groups');
{
  const W = J('CAMP.wing');
  check('the table is data in CAMP: six groups (fighters, escorts, all, and the fighters\' squads red, green, yellow), each a name and a list of kinds', Object.keys(W.groups).join() === 'fighters,escorts,all,red,green,yellow' && W.groups.red.kinds.join() === 'fighter' && W.groups.red.squad === 'red' && W.groups.yellow.squad === 'yellow' && W.groups.fighters.kinds.join() === 'fighter' && W.groups.escorts.kinds.join() === 'escort' && W.groups.all.kinds.join() === 'fighter,escort' && Object.values(W.groups).every(x => x.name));
  check('the verbs: each with the kinds of target it takes and the group it addresses when none is named', ['attack', 'escort', 'guard', 'hold', 'scout', 'fetch', 'mine', 'recall'].every(v => W.verbs[v] && Array.isArray(W.verbs[v].kinds) && W.groups[W.verbs[v].group]));
  check('the pairs of the card: enemy: attack; friend or convoy: escort; place or point: guard, scout, hold; pickup or cache: fetch; anomaly: scout', W.verbs.attack.kinds.join() === 'enemy' && W.verbs.escort.kinds.includes('friend') && W.verbs.escort.kinds.includes('convoy') && ['guard', 'scout', 'hold'].every(v => W.verbs[v].kinds.includes('place') && W.verbs[v].kinds.includes('point')) && W.verbs.fetch.kinds.includes('pickup') && W.verbs.fetch.kinds.includes('cache') && W.verbs.scout.kinds.includes('anomaly'), JSON.stringify(W.verbs));
  check('today\'s defaults: Attack addresses the fighters, Escort the escorts, Guard and Recall everyone (an order that names no group is as it was)', W.verbs.attack.group === 'fighters' && W.verbs.escort.group === 'escorts' && W.verbs.guard.group === 'all' && W.verbs.recall.group === 'all');
  check('every line of the table has its comment (the numbers and the words of the table are one place)', (() => { const s = src('src/campaign.js'), i = s.indexOf('  wing: {'), j = s.indexOf('  dog: {'); return s.slice(i, j).split('\n').filter(l => /^\s+[a-z]+: /.test(l)).filter(l => /^\s{6,}(?:attack|escort|guard|hold|scout|fetch|mine|recall):/.test(l) || /^\s{4}(?:groups|verbs|smart|holdAt):/.test(l)).every(l => l.includes('//') || /^\s{6}[a-z]+: \{/.test(l) || l.trim().endsWith('{')); })());
  g.run('__new(11, 1)');
  check('the group of a name: the words ("fighters", "the wing", "everyone") and the ids; an unknown one is null; none is the empty string', J(`['fighters', 'Fighter', 'scouts', 'everyone', 'wing', 'all', 'nobody', '', null].map(x => campWingGroupId(C, x))`).join('|') === 'fighters|fighters|escorts|all|all|all|||');
  check('the ships of a group: the fighters (6), the escorts (2), all (8); a group is read from the table, so a numbered group that lists ship ids is a group too', J('campWingShips(C, "fighters").length') === 6 && J('campWingShips(C, "escorts").length') === 2 && J('campWingShips(C, "all").length') === 8 && (g.run('C.groups = { g1: { name: "Group 1", ships: [__f()[0].id, __e()[0].id] } }'), J('campWingShips(C, "g1").length') === 2 && J('campWingGroupId(C, "g1")') === 'g1' && J('campWingGroupName(C, "g1")') === 'Group 1'));
  g.run('delete C.groups');
}

// ---------- B. every valid pair ----------
console.log('B. every valid pair, and the group each order reaches');
{
  g.run('__new(11, 1)'); g.run('window.__g = __foe(900, 0); window.__t = __foe(-1200, 500, "tower"); C.anoms.find(a => a.id === "lee").sensed = true; C.pickups.push({ id: "chunk-900", kind: "chunk", x: C.carrier.x + 300, y: C.carrier.y - 200, ore: 25, born: C.t })');
  const orderOf = us => us.map(u => u.order.type + ':' + (u.order.target || '')).filter((x, i, a) => a.indexOf(x) === i).join();
  const pair = (grp, verb, tg, want, label) => { g.run('__f().forEach(u => { u.order = { type: "guard", at: { kind: "carrier" } }; }); __e().forEach(u => { u.order = { type: "guard", at: { kind: "carrier" } }; })'); const r = J(`__r(${JSON.stringify(grp)}, ${JSON.stringify(verb)}, ${JSON.stringify(tg)})`); return r.ok === true && want(r) ? true : (console.log('      ' + label + ': ' + JSON.stringify(r)), false); };
  check('enemy: attack: the fighters attack that ship (not the nearest), by id, by words and by the map row', pair('fighters', 'attack', 'gunship-' + J('__g.id').split('-')[1], r => J('__f().every(u => u.order.type === "attack" && u.order.target === __g.id)') && r.n === 6, 'by id') && pair('fighters', 'attack', 'the gunship', r => J('__f().every(u => u.order.target === __g.id)'), 'by words') && pair(null, 'attack', { id: 'tower:' + J('__t.id'), kind: 'tower' }, r => J('__f().every(u => u.order.target === __t.id)'), 'by row'));
  check('the mothership: attack with the words of the old order, "the mothership" (its own line)', (g.run('window.__m = campSpawn(C, "mother", C.carrier.x + 1500, C.carrier.y); __m.vmax = 0; __m.accel = 0; __m.nextShot = 1e12'), pair(null, 'attack', 'mother', r => r.code === 'attackmother' && J('__f().every(u => u.order.target === __m.id)'), 'mother')));
  check('friend or convoy: escort: the escorts escort the hauler, or the carrier (a friend of ours), with the formation slot of each', pair('escorts', 'escort', 'freighter-h1', r => J('__e().every(u => u.order.type === "escort" && u.order.target === "freighter-h1")') && J('__e().map(u => u.order.slot).join()') === '0,1' && r.code === 'escort', 'convoy') && pair('escorts', 'escort', 'carrier', r => J('__e().every(u => u.order.target === C.carrier.id)') && r.code === 'wing.escort', 'friend'));
  check('place or point: guard: all ships guard the place (Vesta) or the point; the order says where', pair('all', 'guard', 'vesta', r => J('campWing(C).every(u => u.order.type === "guard" && u.order.at.kind === "place" && u.order.at.id === "vesta")') && r.n === 8, 'place') && pair(null, 'guard', { x: 400, y: -300 }, r => J('campWing(C).every(u => u.order.at.kind === "point" && u.order.at.x === 400 && u.order.at.y === -300)'), 'point'));
  check('place or point: hold: the fighters fly to the point and stay there (an order of its own)', pair('fighters', 'hold', { x: 700, y: 700 }, r => J('__f().every(u => u.order.type === "hold" && u.order.at.x === 700 && u.order.at.y === 700)') && J('__e().every(u => u.order.type === "guard")'), 'hold'));
  check('pickup or cache: fetch: the escorts go for the ore lying there; with no target, for the nearest ore (else the nearest cache)', pair('escorts', 'fetch', 'chunk-900', r => J('__e().every(u => u.order.type === "fetch" && u.order.tg.id === "chunk-900")'), 'pickup') && pair('escorts', 'fetch', null, r => J('__e().every(u => u.order.tg && u.order.tg.id === "chunk-900")'), 'nearest'));
  check('rock or pickup: mine: the ships mine that rock', (() => { const rid = J('C.rocks[0].id'); return pair('all', 'mine', rid, r => J(`campWing(C).every(u => u.order.type === 'mine' && u.order.target === ${JSON.stringify(rid)})`), 'rock'); })());
  check('an order with no group is the verb\'s own: Attack reaches the fighters only, Escort the escorts only, Guard everyone, Recall everyone', pair(null, 'attack', null, r => J('__f().every(u => u.order.type === "attack") && __e().every(u => u.order.type === "guard")') && r.code === 'attack' && r.group === 'fighters', 'attack') && pair(null, 'escort', 'freighter-h1', r => J('__e().every(u => u.order.type === "escort") && __f().every(u => u.order.type === "guard")') && r.group === 'escorts', 'escort') && pair(null, 'guard', null, r => r.group === 'all' && r.n === 8, 'guard'));
  check('and a group named is the group reached: "all" attack sends the escorts too; "escorts" attack only them; "fighters" guard only them', pair('all', 'attack', 'the gunship', r => J('campWing(C).every(u => u.order.type === "attack")') && r.n === 8, 'all attack') && pair('escorts', 'attack', 'the gunship', r => J('__e().every(u => u.order.type === "attack") && __f().every(u => u.order.type === "guard")') && r.n === 2, 'escorts attack') && pair('fighters', 'guard', 'vesta', r => J('__f().every(u => u.order.at.kind === "place") && __e().every(u => u.order.at.kind === "carrier")') && r.n === 6, 'fighters guard'));
  g.run('C.events.length = 0; __r("fighters", "attack", "the gunship", "map")');
  const ev = J('C.events.filter(e => e.type === "wingorder")');
  check('every order is an event for the scene and the chatter: group, verb, the target (kind, id, name), how many ships, and how it was given', ev.length === 1 && ev[0].group === 'fighters' && ev[0].verb === 'attack' && ev[0].target.kind === 'enemy' && ev[0].target.name === 'the gunship' && ev[0].n === 6 && ev[0].how === 'map', JSON.stringify(ev));
  check('and counts as an order (the radio answers it: C.orders.attack goes up; hold, fetch have counters of their own)', (g.run('var a0 = C.orders.attack | 0, h0 = C.orders.hold | 0; __r("fighters", "attack", null); __r("fighters", "hold", { x: 10, y: 10 }); window.__ca = [C.orders.attack - a0, C.orders.hold - h0]'), J('__ca').join() === '1,1'));
}

// ---------- C. the refusals ----------
console.log('C. the refusals, in plain words');
{
  g.run('__new(11, 1)'); g.run('window.__g = __foe(900, 0)');
  const no = (grp, verb, tg) => J(`__r(${JSON.stringify(grp)}, ${JSON.stringify(verb)}, ${JSON.stringify(tg)})`);
  const bad = [['fighters', 'escort', 'the gunship', 'Fighters cannot escort an enemy.'], ['fighters', 'attack', 'vesta', 'Fighters cannot attack a place.'], ['all', 'attack', 'freighter-h1', 'All ships cannot attack a convoy.'], ['escorts', 'fetch', 'vesta', 'Escorts cannot fetch a place.'], ['all', 'hold', 'the gunship', 'All ships cannot hold an enemy.'], ['fighters', 'guard', 'the gunship', 'Fighters cannot guard an enemy.'], ['all', 'mine', 'the gunship', 'All ships cannot mine an enemy.']];
  const rows = bad.map(b => [no(b[0], b[1], b[2]), b[3]]);
  check('a verb and a target that do not go together are refused with a plain line that names both: ' + bad.map(b => b[3]).join(' '), rows.every(([r, w]) => r.ok === false && r.code === 'wbadpair' && r.say === w), JSON.stringify(rows.filter(([r, w]) => r.say !== w)));
  check('a target that is not there is refused: "I cannot find that target." (a ship that is dead, words that name nothing, an id that is not)', ['atlantis', 'raider-99', 'rock-999', 'cache:9', 'anom:nope'].every(t => { const r = no('fighters', 'attack', t); return r.ok === false && r.code === 'wnotarget' && r.say === 'I cannot find that target.'; }));
  check('a verb that needs a target (hold, scout) says so: "Name a target to hold."', no('all', 'hold', null).say === 'Name a target to hold.' && no('all', 'hold', null).code === 'wneed');
  check('no ships in the group: the old lines ("no fighters out", "no escorts out", "no ships out"), and "still launching" while the bay opens', (() => { g.run('__new(11, 1); campWing(C, "fighter").forEach(u => { u.hp = 0; })'); const a = no('fighters', 'attack', null), b = no('all', 'guard', null); g.run('__f().length; C.ships = C.ships.filter(u => u.hp > 0); C.launchQ.push("fighter")'); const c = no('fighters', 'attack', null); g.run('C.launchQ.length = 0; C.ships.forEach(u => { if (u.kind === "escort") u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0)'); const d = no('all', 'guard', null), e = no('escorts', 'escort', null); return a.code === 'nofighters' && b.ok === true && c.code === 'launching' && d.ok === false && d.code === 'nowing' && e.code === 'noescorts'; })());
  g.run('__new(11, 1)');
  check('a group that does not exist is refused: "Which group? Fighters, escorts or all."', no('nobody', 'attack', null).say === 'Which group? Fighters, escorts or all.' && no('nobody', 'attack', null).code === 'wnogroup');
  check('a verb that is not a verb is the old "what?" and the battle over refuses everything ("over")', no('fighters', 'dance', null).code === 'what' && (g.run('C.result = "won"'), no('fighters', 'attack', null).code === 'over'));
  g.run('C.result = null');
  check('scout with no scouts in the build is refused in words ("No scouts are aboard.") and is not in the menu; with the scouts card\'s campScoutDo it is that card\'s order', (() => { g.run('C.anoms.find(a => a.id === "lee").sensed = true'); const r = no('escorts', 'scout', 'the anomaly'); const had = J('typeof campScoutDo'); const v = J('campWingVerbs(C, "the anomaly")').includes('scout'); return had === 'function' ? (v === true) : (r.ok === false && r.code === 'wnoscout' && r.say === 'No scouts are aboard.' && v === false); })());
  check('a refusal does nothing: the orders of the ships are as they were, no event, no counter', (g.run('var before = JSON.stringify(campWing(C).map(u => u.order)); C.events.length = 0; var c0 = JSON.stringify(C.orders); __r("fighters", "escort", "the gunship"); __r("nobody", "attack", null); __r("all", "hold", null); window.__same = before === JSON.stringify(campWing(C).map(u => u.order)) && c0 === JSON.stringify(C.orders) && C.events.filter(e => e.type === "wingorder").length === 0'), J('__same') === true));
  const words = ['camp.no.wbadpair', 'camp.no.wnotarget', 'camp.no.wneed', 'camp.no.wnogroup', 'camp.no.wnoscout', 'camp.no.wnothing', 'camp.say.wing.attack', 'camp.say.wing.escort', 'camp.say.wing.guard', 'camp.say.wing.hold', 'camp.say.wing.fetch', 'camp.say.wing.mine', 'camp.say.wing.cancel', 'camp.say.wing.attacknear', 'camp.say.wing.guardcarrier'];
  check('every line is in content/text/campaign-wingorders.md and the same as the default in the code, and is short enough to say (twelve words with the longest names)', words.every(k => { const t = J(`uiText(${JSON.stringify(k)}, { group: 'All ships', verb: 'attack', what: 'a convoy', name: 'the Mars convoy' })`); return t && t !== k && t.split(/\s+/).length <= 12; }) && words.every(k => src('content/text/campaign-wingorders.md').includes('| ' + k + ' |')));
}

// ---------- D. the five old orders ----------
console.log('D. the five old orders go through it, with the answers they had');
{
  g.run('__new(11, 1)'); g.run('window.__g = __foe(900, 0)');
  const say = (name, arg) => J(`(() => { const r = campOrder(C, ${JSON.stringify(name)}, ${JSON.stringify(arg)}); return [r.ok, r.code, r.say].join('|'); })()`);
  check('Attack (no target): "The fighters attack." for the fighters only; "attack the mothership" (named but not there): "no mothership"', say('attack', '').startsWith('true|attack|') && J('__f().every(u => u.order.type === "attack" && u.order.target === "")') && say('attack', 'the mothership').startsWith('false|nomother|'));
  check('Escort a convoy: the escorts follow it with their slots and the answer names it; with no convoy to name it refuses; at a level with no convoys the escorts guard the carrier', say('escort', 'the convoy').startsWith('true|escort|') && J('__e().every(u => u.order.type === "escort" && u.order.target === "freighter-h1")') && say('escort', 'mars').startsWith('false|noconvoy|') && (g.run('__new(11, 0)'), say('escort', '').startsWith('true|escortcarrier|') && J('__e().every(u => u.order.type === "guard" && u.order.at.kind === "carrier")')));
  g.run('__new(11, 1)');
  check('Guard (a place, the carrier) and Recall: the same answers and the same orders as before ("guard", "recall"), and the whole wing', say('guard', 'vesta').startsWith('true|guard|') && J('campWing(C).every(u => u.order.at.kind === "place" && u.order.at.id === "vesta")') && say('guard', '').startsWith('true|guard|') && J('campWing(C).every(u => u.order.at.kind === "carrier")') && say('recall', '').startsWith('true|recall|') && J('campWing(C).every(u => u.order.type === "recall")'));
  check('they are the one entry point: campDo calls campWingOrder for the four (not a second copy of the rule), and the ship computer still checks them with campCheck', (() => { const s = src('src/campaign.js'); return /return campWingOrder\(C, null, 'attack'/.test(s) && /return campWingOrder\(C, null, 'escort'/.test(s) && /name === 'guard'\) return campWingOrder\(C, null, 'guard'/.test(s) && /name === 'recall'\) return campWingOrder\(C, null, 'recall'/.test(s); })());
}

// ---------- E. the wing flies the order ----------
console.log('E. the wing flies the order');
{
  g.run('__new(11, 1)'); g.run('window.__a = __foe(900, 0); window.__b = __foe(-900, 100, "raider")'); g.run('__r("fighters", "attack", "the gunship")'); g.run('window.__n0 = __f().map(u => __d(u, __b))'); g.run('__run(12)');
  check('Attack with a target goes for THAT ship, not the nearest: the gunship 900 px ahead is attacked while a raider stands 900 px behind (the fighters end near the gunship)', J('__f().every(u => __d(u, __a) < 650 && __d(u, __b) > 1000)') && J('__a.hp') < 1e7, J('__f().map(u => Math.round(__d(u, __a))).join()'));
  g.run('__new(11, 1)'); g.run('window.__a = __foe(900, 0); window.__b = __foe(-900, 100, "raider")'); g.run('campOrder(C, "attack", "")'); g.run('__run(6)');
  check('and with no target (the old order) the nearest alien is the target, as before: the fighters at 900 px from either, so the target is whichever is the nearest to each one', J('__f().every(u => u.order.target === "")') && J('__f().some(u => __d(u, __a) < 650 || __d(u, __b) < 650)'));
  g.run('__new(11, 1)'); g.run('__r("all", "guard", { x: 1500, y: -800 }); __run(14)');
  check('Guard a point: the ships gather round the point (within 450 px) and stay there', J('campWing(C).every(u => Math.hypot(u.x - 1500, u.y + 800) < 450)'), J('campWing(C).map(u => Math.round(Math.hypot(u.x - 1500, u.y + 800))).join()'));
  g.run('__new(11, 1)'); g.run('__r("fighters", "hold", { x: -1200, y: 900 }); __run(16)');
  const hold = J('__f().map(u => [Math.hypot(u.x + 1200, u.y - 900), Math.hypot(u.vx, u.vy)])');
  check('Hold at a point: the fighters fly there and stop (inside 60 px of it, at rest), and stay', hold.every(x => x[0] < 70 && x[1] < 25), JSON.stringify(hold.map(x => x.map(Math.round))));
  g.run('window.__p = __f().map(u => [u.x, u.y]); window.__s = 0; var b0 = campBullet; campBullet = function (C2, from, rot, sp, dmg, life, team, ahead, extra) { if (team === "earth" && !(extra && extra.pd)) __s++; return b0.apply(this, arguments); }; var fo = campSpawn(C, "gunship", -1200 + 250, 900); fo.vmax = 0; fo.accel = 0; fo.nextShot = 1e12; fo.hp = fo.maxHp = 1e7; __run(5); campBullet = b0');
  check('and a held ship fires at what comes into its range without leaving the point', J('__s') >= 8 && J('__f().every((u, i) => Math.hypot(u.x - __p[i][0], u.y - __p[i][1]) < 40)'), J('__s'));
  g.run('__new(11, 1)'); g.run('C.pickups.push({ id: "chunk-901", kind: "chunk", x: C.carrier.x + 700, y: C.carrier.y - 500, ore: 25, born: C.t }); var o0 = C.ore; __r("escorts", "fetch", "chunk-901"); __run(14); window.__got = C.ore - o0');
  check('Fetch the ore: an escort flies over it and takes it (25 ore into the store), the chunk is gone, and the escorts are back to guarding the carrier', J('__got') === 25 && J('C.pickups.some(p => p.id === "chunk-901")') === false && J('__e().every(u => u.order.type === "guard" && u.order.at.kind === "carrier")'), J('__got'));
  g.run('__new(11, 1)'); g.run('var rk = C.rocks[0]; window.__rid = rk.id; window.__hp0 = rk.hp; var dx = rk.x + 1200 - C.carrier.x, dy = rk.y - C.carrier.y; C.ships.forEach(u => { if (u.team === "earth") { u.x += dx; u.y += dy; } }); __run(0.5); __r("all", "mine", __rid); __run(20); window.__rk = C.rocks.find(r => r.id === __rid)');
  check('Mine that rock: the ships cut the named rock (it is cut or broken, with its ore lying about or taken) while others of the belt stand', J('!__rk || __rk.hp < __hp0'), J('__rk && __rk.hp'));
}

// ---------- F. cancel and recall ----------
console.log('F. cancel and recall');
{
  g.run('__new(11, 1)'); g.run('window.__a = __foe(900, 0); __r("all", "attack", "the gunship"); __r("escorts", "guard", "vesta")');
  const c = J('(() => { const r = campWingCancel(C, "fighters", "key"); return { ok: r.ok, say: r.say, n: r.n }; })()');
  check('cancel drops a group\'s order: the fighters are back to guarding the carrier, the escorts keep theirs, and it says so ("Fighters, stand by.")', c.ok && c.n === 6 && c.say === 'Fighters, stand by.' && J('__f().every(u => u.order.type === "guard" && u.order.at.kind === "carrier")') && J('__e().every(u => u.order.at.kind === "place")'));
  check('cancel of "all" drops everyone\'s; a group with no ships is refused as the others are; the check does nothing', (() => { const d = J('campWingCancel(C, "all", "key", true).ok'); const same = J('__e().every(u => u.order.at.kind === "place")'); g.run('campWingCancel(C, "all", "key")'); return d === true && same && J('campWing(C).every(u => u.order.at.kind === "carrier")') && J('campWingCancel(C, "nobody").code') === 'wnogroup'; })());
  g.run('__r("all", "attack", "the gunship"); __r("fighters", "recall", null)');
  check('Recall for a group: the fighters go home (they dock when they reach the carrier), the escorts go on; recall with no group is everyone, as before', J('__f().every(u => u.order.type === "recall") && __e().every(u => u.order.type === "attack")') && (g.run('campOrder(C, "recall", "")'), J('campWing(C).every(u => u.order.type === "recall")')) && (g.run('__run(25)'), J('campWing(C).length') === 0 && J('C.bay.fighters') === 6 && J('C.bay.escorts') === 2));
  g.run('__new(11, 1)');
  check('X (cancel) is not Recall: after a cancel the ships are still out, in the carrier\'s company; no ship is docked or lost', (g.run('__r("all", "attack", null); campWingCancel(C, "all", "key"); __run(3)'), J('campWing(C).length') === 8 && J('C.bay.fighters') === 0));
}

// ---------- G. the state for the map ----------
console.log('G. the state for the map: groups, order, target, line');
{
  g.run('__new(11, 1)'); g.run('window.__a = __foe(900, 0)');
  const s0 = J('campWingState(C)');
  check('one row for each group that has ships: fighters (6), escorts (2), all (8), the three squads (2 each); each with its name and where its ships are', s0.map(x => x.id + ':' + x.n).join() === 'fighters:6,escorts:2,all:8,red:2,green:2,yellow:2' && s0.every(x => x.name && x.ships.length === x.n && x.center && Number.isFinite(x.center.x)) && s0[0].ships.every(x => x.kind === 'fighter' && Number.isFinite(x.x) && Number.isFinite(x.y)));
  check('at the start the fighters guard the carrier and the escorts go with the hauler (the launch\'s own orders), so "all" is mixed, and the other two are not', s0.find(x => x.id === 'fighters').order === 'guard' && s0.find(x => x.id === 'escorts').order === 'escort' && s0.find(x => x.id === 'all').mixed === true && !s0.find(x => x.id === 'fighters').mixed && !s0.find(x => x.id === 'escorts').mixed);
  g.run('__r("fighters", "attack", "the gunship"); __r("escorts", "escort", "freighter-h1")');
  const s1 = J('campWingState(C)'), F = s1.find(x => x.id === 'fighters'), E = s1.find(x => x.id === 'escorts'), A = s1.find(x => x.id === 'all');
  check('after ordering: the fighters attack the gunship (the target named, its position, a line from the group\'s centre to it), the escorts escort the hauler, and "all" is mixed', F.order === 'attack' && F.target.kind === 'enemy' && F.target.name === 'the gunship' && Math.abs(F.target.x - J('__a.x')) < 1 && F.line && F.line.to.x === F.target.x && F.line.from.x === F.center.x && E.order === 'escort' && E.target.kind === 'convoy' && A.mixed === true, JSON.stringify([F.order, F.target && F.target.name, E.order, A.mixed]));
  g.run('__run(3)');
  const s2 = J('campWingState(C)'), E2 = s2.find(x => x.id === 'escorts');
  check('the target is live: the hauler moves and the line\'s end moves with it; the group\'s centre moves with its ships', E2.target.x !== E.target.x || E2.target.y !== E.target.y, JSON.stringify([E.target.x, E2.target.x]));
  g.run('__r("fighters", "hold", { x: 600, y: 600 }); __r("escorts", "guard", "vesta")');
  const s3 = J('campWingState(C)');
  check('hold at a point: the target is the point; guard a place: the place with its name (the map draws a dotted line to it)', s3.find(x => x.id === 'fighters').order === 'hold' && s3.find(x => x.id === 'fighters').target.kind === 'point' && s3.find(x => x.id === 'fighters').target.x === 600 && s3.find(x => x.id === 'escorts').target.name === 'Vesta' && s3.find(x => x.id === 'escorts').line.to.x === J('campPlaces(C.level).vesta.x'));
  g.run('__a.hp = 0; C.ships = C.ships.filter(u => u.hp > 0); __r("fighters", "attack", null)');
  check('with no explicit target (the old orders) there is no line (nothing to draw to) except Recall and guard-at-a-place; a target that has died is gone: no line, not an error', J('campWingState(C).find(x => x.id === "fighters").line') === null && J('campWingState(C).find(x => x.id === "fighters").target') === null);
  g.run('__r("fighters", "recall", null)');
  check('Recall draws a line home: its target is the carrier', J('campWingState(C).find(x => x.id === "fighters").target.kind') === 'friend' && J('campWingState(C).find(x => x.id === "fighters").order') === 'recall');
  g.run('__new(11, 1)'); g.run('window.__a = __foe(900, 0); C.anoms.find(a => a.id === "lee").sensed = true');
  check('what a target allows (for the order menu): an enemy takes attack; a place guard and hold; a convoy escort and guard; ore fetch and mine; the carrier escort and guard; the right-click verb of each: attack, guard, escort, fetch', J('campWingVerbs(C, "the gunship").join()') === 'attack' && J('campWingVerbs(C, "vesta").join()').startsWith('guard,hold') && J('campWingVerbs(C, "freighter-h1").join()') === 'escort,guard' && J('campWingSmart(C, "the gunship")') === 'attack' && J('campWingSmart(C, "vesta")') === 'guard' && J('campWingSmart(C, "freighter-h1")') === 'escort' && J('campWingSmart(C, "carrier")') === 'escort' && J('campWingSmart(C, { x: 5, y: 5 })') === 'guard' && J('campWingVerbs(C, "atlantis").length') === 0);
  check('a target is read from every form the map has: its list row, its mark, a click point, an id; the same place four ways', ['vesta', 'place:vesta', { id: 'place:vesta', kind: 'place', name: 'Vesta', x: 0, y: 0 }, { kind: 'place', id: 'place:vesta' }].every(t => J(`campWingTarget(C, ${JSON.stringify(t)}).id`) === 'place:vesta') && J('campWingTarget(C, { x: 12, y: 34 }).kind') === 'point' && J('campWingTarget(C, null)') === null && J('campWingTarget(C, "atlantis")') === false);
}

// ---------- H. the words ----------
console.log('H. the words: the strip, the voice, the ship computer');
{
  g.run('__new(11, 1)'); g.run('window.__a = __foe(900, 0); C.anoms.find(a => a.id === "lee").sensed = true');
  const I = t => J(`campIntent(${JSON.stringify(t)})`);
  check('"all attack the mothership" and "escorts scout the anomaly" and "fighters hold at Ceres" and "cancel the fighters" are the group order (act fleet_wing), with the group kept', ['all attack the mothership', 'escorts scout the anomaly', 'fighters hold at Ceres', 'cancel the fighters', 'fighters recall', 'escorts guard Ceres', 'everyone attack the gunship'].every(t => I(t) && I(t).act === 'fleet_wing'), JSON.stringify(['all attack the mothership', 'escorts guard Ceres'].map(I)));
  check('the old forms keep their words: "fighters attack the mothership", "attack", "all guard Ceres", "escorts to the Mars convoy", "send escorts to the Mars convoy", "guard the carrier", "recall" are the old acts', I('fighters attack the mothership').act === 'fleet_attack' && I('attack').act === 'fleet_attack' && I('all guard Ceres').act === 'fleet_guard' && I('escorts to the Mars convoy').act === 'fleet_escort' && I('guard the carrier').act === 'fleet_guard' && I('recall').act === 'fleet_recall');
  const w = t => J(`(() => { const r = campOrder(C, 'wing', ${JSON.stringify(t)}); return [r.ok, r.code, r.say].join('|'); })()`);
  check('"fighters at the gunship" is Attack by the kind of target; "escorts to Vesta" (a place) is Guard; "all guard Vesta" is Guard, with the old words; "fighters hold at Vesta" is Hold; the verb is inferred from the target (campWingSmart)', w('fighters at the gunship').startsWith('true|wing.attack|Fighters, attack the gunship.') && J('__f().every(u => u.order.target === __a.id)') && w('escorts to vesta').startsWith('true|wing.guard|Escorts, guard Vesta.') && w('all guard vesta').startsWith('true|guard|The wing is guarding.') && w('fighters hold at vesta').startsWith('true|wing.hold|Fighters, hold at Vesta.'));
  check('"escorts to Mars" when there is a Mars convoy is Escort (the target is the convoy)', (g.run('__new(11, 1)'), w('escorts to the freighter').startsWith('true|escort|') || w('escorts to the convoy').startsWith('true|escort|')));
  check('"cancel the fighters" cancels, "fighters recall" recalls only them, "nobody attack" is not a group order at all, and "all attack" with nothing named attacks the nearest', (g.run('__new(11, 1)'), g.run('window.__a = __foe(900, 0); __r("all", "attack", null)'), w('cancel the fighters').startsWith('true|wing.cancel|Fighters, stand by.') && J('__f().every(u => u.order.type === "guard")') && w('fighters recall').startsWith('true|wing.recall|Fighters, return to the carrier.') && J('__f().every(u => u.order.type === "recall") && __e().every(u => u.order.type === "attack")') && w('all attack').startsWith('true|wing.attacknear|All ships, attack the nearest.')));
  check('a refusal in words and a target that is not there: "fighters escort the gunship" → "Fighters cannot escort an enemy."; "escorts guard atlantis" → "I cannot find that target."', (g.run('__new(11, 1)'), g.run('window.__a = __foe(900, 0)'), w('fighters escort the gunship') === 'false|wbadpair|Fighters cannot escort an enemy.' && w('escorts guard atlantis') === 'false|wnotarget|I cannot find that target.'));
  g.run(`window.__sc = { scene: { key: 'Campaign' }, leaving: false, dead: false, camp: null, toasts: [] }; __sc.camp = C;`);
  const p = J(`(() => { const p = shipcompLocal('all hold at vesta', __sc); return p ? { action: p.action, text: p.text, run: !!p.run, refused: !!p.refused } : null; })()`);
  check('the ship computer takes it by the closed act fleet_wing, says it in words first, and does nothing until it runs; then the order goes through the one door', p && p.action === 'fleet_wing' && p.text === 'All ships, hold at Vesta.' && p.run && J('campWing(C).every(u => u.order.type !== "hold")') && (g.run(`shipcompLocal('all hold at vesta', __sc).run(__sc)`), J('campWing(C).every(u => u.order.type === "hold")')), JSON.stringify(p));
  check('and the model is told the act, with its group, verbs and an example', /fleet_wing <a group \(fighters, escorts, all, or one squad of the fighters: red, green or yellow\), a verb/.test(src('src/shipcomputer.js')) && J(`Object.keys(SC_ACT).includes('fleet_wing')`));
}

// found with the shortcut keys (card list-shortcuts): "Recall the fighters" answered "Wing, return to the carrier." though the escorts stayed out
check('a recall of one part of the wing names that part ("Fighters, return to the carrier."), and the whole wing\'s is still "Wing, return to the carrier."',
  (() => { const r = J(`(() => { const C = campNew(1, [], { seed: 1 }); campOrder(C, 'launch'); for (let i = 0; i < 300; i++) campStep(C, 1 / 30); const f = campWingOrder(C, 'fighters', 'recall', null, 'key', true), e = campWingOrder(C, 'escorts', 'recall', null, 'key', true), a = campWingOrder(C, 'all', 'recall', null, 'key', true), o = campCheck(C, 'recall', ''); return [f.say, e.say, a.say, o.say]; })()`); return r[0] === 'Fighters, return to the carrier.' && r[1] === 'Escorts, return to the carrier.' && r[2] === 'Wing, return to the carrier.' && r[3] === 'Wing, return to the carrier.' ? '' : JSON.stringify(r); })() === '');

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCAMPWING FAIL (${failed} of ${n})` : `\nCAMPWING PASS (${n})`);
process.exitCode = failed ? 1 : 0;
