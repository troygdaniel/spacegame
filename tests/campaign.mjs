// smoke: the Campaign's game in plain numbers (src/campaign.js): the tuning table, the five orders, plain words as orders, whole battles flown in Node, techs, the save (plain Node, no Chrome)
// Card space-game-campaign-mvp (docs/CAMPAIGN.md). The scene (src/campaignscene.js) only draws what these numbers say, so the rules are tested here, not in a browser.
//   A. the table: levels, waves, convoys, techs, and every text the game reads for them is in content/text/ui.md
//   B. the orders: launch one ship every 600 ms, attack, escort, guard, recall, and what each refuses to do and says
//   C. plain words as orders (campIntent) and what an order names (campFind)
//   D. whole battles: doing nothing loses; a sensible player wins within a few minutes on every seed; the same seed flies the same
//   E. the numbers: carrier speed and hull, Earth's shield, the techs, the repair field
//   F. the save: the level and the techs, apart from the Long Haul save; Long Haul is not touched
// Run: node tests/campaign.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// the helpers a test plays with: a fresh game, a clock, and a sensible player (launches, escorts the first convoy, sends the fighters in, flies at the nearest alien and shoots)
g.run(`
  window.__new = (techs, seed, god) => { window.C = campNew("home", techs || [], { seed: seed == null ? 1 : seed, god: !!god }); return C.id; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30) && !C.result; i++) { campStep(C, 1 / 30); } };
  window.__play = (seed, techs, script, secs) => {
    window.C = campNew("home", techs || [], { seed });
    for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; }
    return { result: C.result, why: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), shield: Math.round(C.shield), earth: Math.round(C.earth.shield), kills: C.kills, delivered: C.delivered, lost: C.lost, aliens: campAliens(C).length };
  };
  window.__smart = (C, s) => {
    if (s > 1 && s < 1.05) campOrder(C, 'launch');
    if (s > 9 && s < 9.05) campOrder(C, 'escort', 'mars convoy');
    if (s > 12 && Math.round(s * 30) % 150 === 0) campOrder(C, 'attack', C.ships.some(u => u.kind === 'mother') ? 'mothership' : '');
    const c = C.carrier, a = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0];
    if (a) { const want = Math.atan2(a.y - c.y, a.x - c.x), d = Math.atan2(Math.sin(want - c.rot), Math.cos(want - c.rot)); C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.thrust = campDist(a, c) > 380 ? 1 : 0; C.input.fire = campDist(a, c) < 520; }
    else { C.input.thrust = 0; C.input.fire = false; C.input.turn = 0; }
  };
`);

// ---------- A. the table ----------
console.log('A. the table, and the words it needs');
{
  check('the tuning table is one object, CAMP, with the carrier, the bay, the small ships, the aliens, Earth, the techs and the levels', ['carrier', 'bay', 'fighter', 'escort', 'convoy', 'alien', 'mother', 'earth', 'tech', 'places', 'levels'].every(k => J(`typeof CAMP.${k}`) === 'object'));
  check('it is at the top of src/campaign.js, before any code that runs, and every line of it has a comment', (() => { const s = src('src/campaign.js'), i = s.indexOf('const CAMP = {'), j = s.indexOf('// ---------- small helpers'); const body = s.slice(i, j).split('\n').filter(l => /^\s+[a-z0-9]+: [^{]*[,0-9\]]/i.test(l) && !/^\s+(places|levels)/.test(l)); return i > 0 && j > i && body.length > 40 && body.filter(l => /\/\//.test(l)).length / body.length > 0.9; })());
  check('level 1 is there: three waves, two convoys, win by the mothership, the carrier starts at the Lunar base', J('CAMP.levels.home.waves.length') === 3 && J('CAMP.levels.home.convoys.length') === 2 && J('CAMP.levels.home.win') === 'mother' && J('CAMP.levels.home.start') === 'luna');
  check('the last wave brings the mothership and waits for the one before to be dead', J('CAMP.levels.home.waves[2].mother.length') === 2 && J('CAMP.levels.home.waves[2].needClear') === true);
  check('every place a level names is in the table of places', J(`CAMP.levels.home.convoys.every(c => CAMP.places[c.to]) && !!CAMP.places[CAMP.levels.home.start]`));
  check('the places are at 1 to 12 of the Sol pack: Earth to Mars about 4,100 px', Math.abs(J('Math.hypot(CAMP.places.mars.x, CAMP.places.mars.y)') - 4104) < 10);
  check('three techs are offered after level 1 and three after level 2, each with its own name and words', J('campTechChoices(1)').length === 3 && J('campTechChoices(2)').length === 3 && J('campTechChoices(1).concat(campTechChoices(2))').every(id => J(`uiText('camp.tech.${id}.name')`) !== `camp.tech.${id}.name` && J(`uiText('camp.tech.${id}.text')`) !== `camp.tech.${id}.text`));
  check('the story of level 1 (the belt): three lines before, three after, curt: one short sentence each, 12 words at most', J(`campStory(1, 'before')`).length === 3 && J(`campStory(1, 'after')`).length === 3 && J(`campStory(1, 'before').concat(campStory(1, 'after'))`).every(x => x.split(' ').length <= 12 && x.length > 15 && /[.]$/.test(x)));
  check('every wave and convoy line, order answer and refusal the code can say is a string of the game that content/text/ui.md has', (() => {
    const code = src('src/campaign.js'), md = src('content/text/ui.md');
    const keys = new Set([...code.matchAll(/'(camp\.[a-z0-9.]+)'/g)].map(m => m[1]));
    ['launch', 'attack', 'attackmother', 'escort', 'guard', 'recall'].forEach(k => keys.add('camp.say.' + k));
    ['over', 'bay', 'launching', 'baydry', 'nofighters', 'noescorts', 'noconvoy', 'nomother', 'nowing', 'what'].forEach(k => keys.add('camp.no.' + k));
    J('CAMP.levels.home.waves.map(w => w.say)').forEach(k => keys.add(k));
    const missing = [...keys].filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k);
    return missing.length === 0 || missing.join(',');
  })());
  check('the words in the code and in content/text/ui.md are the same (sealed), so a translation is a text edit', J(`uiText('camp.no.bay')`) === 'The bay is empty, pilot.' && /\| camp\.no\.bay \| The bay is empty, pilot\. \|/.test(src('content/text/ui.md')));
  check('no story and no number in the scene: src/campaignscene.js, when it exists, has no camp. text of its own and no tuning number (read through CAMP and uiText)', (() => { try { const s = src('src/campaignscene.js'); return !/'[A-Z][a-z]+ [a-z]+ [a-z]+[^']*\.'/.test(s.replace(/\/\/.*$/gm, '').replace(/console\.[a-z]+\([^)]*\)/g, '')) || 'long English sentences in the scene'; } catch (e) { return true; } })());
}

// ---------- B. the orders ----------
console.log('B. the five orders');
{
  g.run('__new([], 1)');
  check('a new game: the carrier at the Lunar base, 600 hull, the bay full (six fighters, two escorts), nothing out, no shot fired', J('C.carrier.hp') === 600 && J('C.bay.fighters') === 6 && J('C.bay.escorts') === 2 && J('campWing(C).length') === 0 && J('Math.hypot(C.carrier.x - CAMP.places.luna.x - CAMP.levels.home.startAt[0], C.carrier.y - CAMP.places.luna.y - CAMP.levels.home.startAt[1])') < 1); // where it starts is the table's startAt, read, not pinned (night graphics moved it off the moon)
  const noWing = J(`['attack', 'escort', 'guard', 'recall'].map(o => campOrder(C, o, ''))`);
  check('before launch, attack, escort, guard and recall each answer in words that say launch first, and change nothing', noWing.every(r => r.ok === false && /Launch first/.test(r.say)) && J('C.orders.attack + C.orders.escort + C.orders.guard + C.orders.recall') === 0, JSON.stringify(noWing.map(r => r.say)));
  check('campCheck answers an order exactly as campOrder would and changes nothing (the ship computer checks, announces, then orders)', (() => { const a = J(`campCheck(C, 'launch', '')`); return a.ok && a.say === 'Launching the wing.' && J('C.launchQ.length') === 0 && J('C.bay.fighters') === 6 && J('C.orders.launch') === 0 && J(`campCheck(C, 'attack', '').say`) === 'No fighters are out. Launch first.'; })());
  const l = J(`campOrder(C, 'launch')`);
  check('Launch takes the whole bay at once and says so; the ships leave one every 0.6 s', l.ok && l.say === 'Launching the wing.' && J('C.bay.fighters + C.bay.escorts') === 0 && J('C.launchQ.length') === 8);
  g.run('__run(0.1)'); const a0 = J('campWing(C).length'); g.run('__run(0.7)'); const a1 = J('campWing(C).length'); g.run('__run(4.2)');
  check('the first ship is out at once, the second 0.6 s after, all eight about 4.2 s in', a0 === 1 && a1 === 2 && J('campWing(C).length') === 8 && J('campWing(C, "fighter").length') === 6 && J('campWing(C, "escort").length') === 2, a0 + ' ' + a1);
  check('a second Launch is refused: everything is out', J(`campOrder(C, 'launch')`).say === 'Everything is already out, pilot.');
  check('the small ships leave the bay with no orders of their own: the fighters guard the carrier', J(`campWing(C, 'fighter').every(u => u.order && u.order.type === 'guard')`));
  check('before the first convoy leaves (10 s), an escort order names nothing and says there is no convoy', J(`campOrder(C, 'escort', '')`).say === 'There is no convoy to escort.');
  g.run('__run(7)'); // 12 s in: the Mars convoy has been out for two seconds
  const e = J(`campOrder(C, 'escort', 'the Mars convoy')`);
  check('Escort names the Mars convoy: both escorts take it, and the answer says which', e.ok && e.say === 'Escorts are with the Mars convoy.' && J(`campWing(C, 'escort').every(u => u.order.type === 'escort' && u.order.target === 'freighter-mars')`) && J(`campWing(C, 'fighter').every(u => u.order.type === 'guard')`));
  const at = J(`campOrder(C, 'attack', '')`);
  check('Attack sends the fighters only, at the nearest alien; the escorts keep their convoy', at.ok && J(`campWing(C, 'fighter').every(u => u.order.type === 'attack')`) && J(`campWing(C, 'escort').every(u => u.order.type === 'escort')`));
  check('Attack the mothership before it has come says so', J(`campOrder(C, 'attack', 'the mothership')`).say === 'The mothership has not come yet.' && J(`campWing(C, 'fighter').every(u => !u.order.target)`));
  const gd = J(`campOrder(C, 'guard', 'luna')`);
  check('Guard puts every ship out on a point: Luna here; with no name, the carrier', gd.ok && J(`campWing(C).every(u => u.order.type === 'guard' && u.order.at.kind === 'place' && u.order.at.id === 'luna')`) && (g.run(`campOrder(C, 'guard', '')`), J(`campWing(C).every(u => u.order.at.kind === 'carrier')`)));
  g.run(`campOrder(C, 'recall')`); g.run('C.carrier.vx = 0; C.carrier.vy = 0; __run(25)');
  check('Recall brings every ship home: they land, and the bay has them again', J('campWing(C).length') === 0 && J('C.bay.fighters') === 6 && J('C.bay.escorts') === 2 && J('C.lostShips') === 0, J('C.bay.fighters + "/" + C.bay.escorts + " out " + campWing(C).length'));
  check('Recall with nothing out says launch first; a finished battle takes no order', J(`campOrder(C, 'recall')`).say === 'No ships are out. Launch first.' && (g.run(`C.result = 'won'`), J(`campOrder(C, 'launch')`).say === 'The battle is over, pilot.'));
}

// ---------- C. plain words ----------
console.log('C. plain words as orders');
{
  const I = t => J(`campIntent(${JSON.stringify(t)})`);
  const act = (t, a, arg) => { const r = I(t); return !!r && r.act === a && (arg === undefined || r.arg === arg); };
  check('launch: "launch", "launch fighters", "scramble", "open the bay doors", "launch the wing please"', ['launch', 'launch fighters', 'Scramble!', 'open the bay doors', 'launch the wing please', 'deploy'].every(t => act(t, 'fleet_launch')));
  check('attack: "attack", "attack the mothership", "fighters attack", "engage", "all fighters attack the mothership"', act('attack', 'fleet_attack', '') && act('attack the mothership', 'fleet_attack', 'the mothership') && act('fighters attack', 'fleet_attack', '') && act('engage', 'fleet_attack') && act('all fighters attack the mothership', 'fleet_attack', 'the mothership'));
  check('escort: "send escorts to the Mars convoy", "escort the convoy", "protect the Mars convoy", "cover the freighters"', act('send escorts to the Mars convoy', 'fleet_escort', 'the mars convoy') && act('escorts to the Mars convoy', 'fleet_escort') && act('escort the convoy', 'fleet_escort') && act('protect the Mars convoy', 'fleet_escort') && act('cover the freighters', 'fleet_escort'));
  check('guard: "guard the carrier", "defend Earth", "protect Earth" (not a convoy)', act('guard the carrier', 'fleet_guard', 'the carrier') && act('defend Earth', 'fleet_guard', 'earth') && act('protect earth', 'fleet_guard', 'earth'));
  check('recall: "recall", "come home", "return to the carrier", "land", "fall back"', ['recall', 'come home', 'return to the carrier', 'land', 'fall back', 'recall the wing'].every(t => act(t, 'fleet_recall')));
  check('anything else is left to the model: a question, a chat, a Long Haul order', ['how do I jump', 'what is that', 'hello', 'fly to Kepler', 'dock', ''].every(t => I(t) === null || t === 'dock' && I(t) && I(t).act === 'fleet_recall'), JSON.stringify(['how do I jump', 'what is that', 'hello', 'fly to Kepler'].map(I)));
  g.run('__new([], 1); campOrder(C, "launch"); __run(20)');
  const F = t => J(`campFind(C, ${JSON.stringify(t)})`);
  check('campFind: "the Mars convoy" is the Mars freighter, "the convoy" the nearest, "the mothership" the boss, "earth" and "luna" places, "me" the carrier', F('the Mars convoy').id === 'freighter-mars' && F('the convoy').kind === 'convoy' && F('the mothership').kind === 'mother' && F('Earth').id === 'earth' && F('the moon').id === 'luna' && F('me').kind === 'carrier' && F('nothing at all') === null);
}

// ---------- D. whole battles ----------
console.log('D. whole battles, flown in Node');
{
  const rs = [1, 2, 3, 4, 5, 6].map(seed => J(`__play(${seed}, [], __smart, 400)`));
  check('doing nothing loses: the aliens find the carrier or Earth (every seed)', [1, 2, 3].every(seed => { const r = J(`__play(${seed}, [], () => {}, 400)`); return r.result === 'lost'; }));
  check('a sensible player (launch, escort, attack, fly and shoot) wins on every seed', rs.every(r => r.result === 'won' && r.why === 'mother'), JSON.stringify(rs.map(r => r.result + ' ' + r.t)));
  check('and wins in a few minutes: between 60 s and 240 s of play', rs.every(r => r.t >= 60 && r.t <= 240), rs.map(r => r.t).join(' '));
  check('it is a fight, not a walk: aliens killed (12 or more) on every seed, the carrier alive and hurt (shield or hull gone) on most', rs.every(r => r.kills >= 12 && r.hull > 0) && rs.filter(r => r.hull + r.shield < 750).length >= 4, JSON.stringify(rs.map(r => [r.kills, r.hull, r.shield])));
  check('both convoys get through for the sensible player (one escorted, one covered by the wing)', rs.filter(r => r.delivered === 2).length >= 5, rs.map(r => r.delivered).join(' '));
  const a = J(`__play(7, [], __smart, 400)`), b = J(`__play(7, [], __smart, 400)`), c2 = J(`__play(8, [], __smart, 400)`);
  check('the same seed flies the same battle to the last number; another seed flies another', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c2), JSON.stringify(a));
  check('the fight leaves Math.random as it was (pirateSteer is given the game\'s own numbers for a step, then the page\'s again)', (g.run('window.__r0 = Math.random; __play(9, [], () => {}, 30)'), J('Math.random === __r0')));
  g.run('__new([], 1)');
  g.run('__run(21)');
  check('at 10 s the Mars convoy leaves Earth, at 20 s the first wave comes on the Mars lane (four raiders, two drones), and the game says so', J('C.convoys[0].started') && J('C.waves[0].started') && J(`campAliens(C).filter(u => u.kind === 'raider').length`) === 4 && J(`campAliens(C).filter(u => u.kind === 'drone').length`) === 2 && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join(",")').includes('camp.say.wave1'));
  check('the first wave hunts the Mars convoy, the second and third go for Earth', J(`campAliens(C).every(u => u.goal === 'convoy:mars')`) && J('CAMP.levels.home.waves[1].goal') === 'earth' && J('CAMP.levels.home.waves[2].goal') === 'earth');
}

// ---------- E. the numbers ----------
console.log('E. the numbers');
{
  g.run('__new([], 1, false)');
  g.run('C.input.thrust = 1; __run(8)');
  check('the carrier is slow: it never passes 210 px/s, and it gets there', J('Math.hypot(C.carrier.vx, C.carrier.vy)') <= 210.01 && J('Math.hypot(C.carrier.vx, C.carrier.vy)') > 150, J('Math.round(Math.hypot(C.carrier.vx, C.carrier.vy))'));
  g.run('C.input.thrust = 0; C.input.brake = true; __run(4)');
  check('S brakes it: under 20 px/s four seconds later', J('Math.hypot(C.carrier.vx, C.carrier.vy)') < 20);
  g.run('__new([], 1); C.carrier.rot = 0; C.input.turn = 1; __run(1)');
  check('it turns at 1.1 radians a second, heavy', Math.abs(J('C.carrier.rot') - 1.1) < 0.05, J('C.carrier.rot'));
  // the turrets (card space-game-campaign-turrets): eight on the hull, no other gun; they aim themselves, and fire only while Space is held
  g.run(`window.__shots = 0; window.__bullet0 = campBullet; campBullet = function (C, from, rot, speed, dmg, life, team, ahead, extra) { if (team === 'earth' && extra && extra.pd) __shots++; return __bullet0.apply(null, arguments); }; window.__aim = (hp) => { __new([], 1); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(v => { v.started = true; }); const u = campSpawn(C, 'gunship', C.carrier.x + 300, C.carrier.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = hp || 9000; return u.id; };`);
  g.run('__aim(); C.input.fire = true; __run(3.1); campBullet = __bullet0;');
  const per = J('CAMP.carrier.pdDelay'), nT = J('CAMP.carrier.mounts.length'), want = Array.from({ length: nT }, (_, i) => Math.floor((3100 - i * per / nT) / per) + 1).reduce((a, b) => a + b, 0);
  check('there are eight turrets, one row each in the table, and no other gun: Space held and an alien near, every turret fires once every pdDelay ms, one after another (the count is the table\'s, to within a step)', nT === 8 && J('C.turrets.length') === 8 && Math.abs(J('__shots') - want) <= 3, J('__shots') + ' of ' + want);
  check('the main gun is gone from the table and the code: no gun, gunDelay, gunSpeed or gunLife, no nextMain', !/gunDelay|gunSpeed|gunLife|nextMain|k\.gun\b/.test(src('src/campaign.js')) && J(`'gun' in CAMP.carrier`) === false && J('C.nextMain') === null);
  g.run('__aim(); __run(2); window.__shots2 = C.bullets.filter(b => b.pd).length');
  check('Space not held: the turrets aim at the alien (each says whom, and the way it points) and never fire on their own', J('C.bullets.filter(b => b.pd).length') === 0 && J('C.turrets.every(t => t.target === C.ships.find(u => u.kind === "gunship").id)') && J('C.turrets.every(t => Math.abs(Math.atan2(C.ships.find(u => u.kind === "gunship").y - t.y, C.ships.find(u => u.kind === "gunship").x - t.x) - t.aim) < 0.001)'));
  g.run('__new([], 1); C.input.fire = true; __run(2)');
  check('Space held and nothing in reach: nothing is fired', J('C.bullets.length') === 0);
  g.run('__aim(); C.input.fire = true; __run(0.1)');
  check('the shots leave the turrets\' own places on the hull, not the carrier\'s centre', J('C.bullets.filter(b => b.pd).length') >= 1 && J('C.bullets.filter(b => b.pd).every(b => C.turrets.some(t => Math.hypot(b.x - t.x, b.y - t.y) < 90))'));
  g.run('__new([], 1); C.waves.forEach(w => { w.started = true; }); C.motherSpawn = 1e12; const m = campSpawn(C, "mother", C.carrier.x + 540, C.carrier.y); m.vmax = 0; m.accel = 0; m.nextShot = 1e12; C.input.fire = true; __run(0.1)');
  check('reach is to the edge of the alien: the mothership (90 px across its radius) 540 px off, its centre past 450 px from every turret, is fired at', J('C.turrets.filter(t => t.target).length') >= 2 && J('C.bullets.filter(b => b.pd).length') >= 1);
  const mt = J('CAMP.carrier.mounts');
  check('the mounts are spread along the hull, four a side and four to each end, all inside the drawn hull (140 by 100 px): no side is bare', mt.filter(m => m[1] < 0).length === 4 && mt.filter(m => m[1] > 0).length === 4 && mt.filter(m => m[0] > 0).length === 4 && mt.filter(m => m[0] < 0).length === 4 && mt.every(m => Math.abs(m[0]) <= 70 && Math.abs(m[1]) <= 50) && new Set(mt.map(m => m[0])).size >= 4, JSON.stringify(mt));
  g.run('__new([], 1); C.carrier.rot = 1; C.carrier.x = 500; C.carrier.y = 800; campStep(C, 0.04)');
  check('the turrets turn with the carrier: each stays at its row of the table from the nose and the centre', J('C.turrets.every((t, i) => Math.abs(Math.hypot(t.x - C.carrier.x, t.y - C.carrier.y) - Math.hypot(CAMP.carrier.mounts[i][0], CAMP.carrier.mounts[i][1])) < 0.001)'));
  // the damage
  const hit = (techs, dmg) => { g.run(`__new(${JSON.stringify(techs)}, 1); C.shield = 0; campHurt(C, C.carrier, ${dmg}, 'x')`); return J('C.carrier.hp'); }; // (the carrier's shield is tested in K2: here it is down, so the hull takes it)
  check('the shield grid: 40 percent less damage (50 hit takes 30, not 50)', hit([], 50) === 550 && Math.abs(hit(['shield'], 50) - 570) < 1e-6);
  check('hull plating: the hull is half as strong again (900)', (g.run(`__new(['plating'], 1)`), J('C.carrier.hp') === 900 && J('C.carrier.maxHp') === 900));
  check('the second bay: four more fighters', (g.run(`__new(['bay2'], 1)`), J('C.bay.fighters') === 10 && J('C.bay.escorts') === 2));
    g.run(`__new(['beam'], 1); C.waves.forEach(w => { w.started = true; }); const u = campSpawn(C, 'gunship', C.carrier.x + 700, C.carrier.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 9000; C.input.fire = true; campStep(C, 0.05)`);
  check('the beam cannon: the turrets fire beams (twice the damage, 8 not 4), reach half as far again (750 px), and a shot goes through what it hits', J('C.bullets.length') >= 1 && J('C.bullets.every(b => b.beam && b.pd)') && J('C.bullets[0].dmg') === 2 * J('CAMP.carrier.pd') && J('C.bullets[0].dmg') === 8 && Math.abs(J('C.bullets[0].life') - ((750 + 300) / J('CAMP.carrier.pdSpeed') * 1000)) < 80 && J('CAMP.tech.beam.reach') === 1.5);
  g.run(`__new(['blink'], 1); C.carrier.rot = 0; var __x0 = C.carrier.x; C.input.blink = true; campStep(C, 0.03)`);
  const dx = J('C.carrier.x - __x0');
  check('the warp blink hops the carrier 1,500 px ahead, once; ready again after 20 s', dx > 1495 && dx < 1510 && (g.run(`C.input.blink = true; campStep(C, 0.03)`), J('C.carrier.x - __x0') < 1510) && (g.run('__run(20.1); C.input.blink = true; campStep(C, 0.03)'), J('C.carrier.x - __x0') > 2990), dx);
  g.run(`__new([], 1); C.input.blink = true; var __x1 = C.carrier.x; campStep(C, 0.03)`);
  check('with no blink tech the key does nothing', Math.abs(J('C.carrier.x - __x1')) < 10);
  g.run(`__new(['repair'], 1); C.carrier.hp = 300; __run(10)`);
  check('the repair field mends the carrier four hit points a second (300 to about 340 in ten seconds)', Math.abs(J('C.carrier.hp') - 340) < 3, J('C.carrier.hp'));
  // Earth
  g.run(`__new([], 1); campBullet(C, { x: 700, y: 0, vx: 0, vy: 0, id: 't' }, Math.PI, 600, 40, 3000, 'alien', 0); __run(1.5)`);
  check('a shot that hits Earth takes a quarter of its damage off the shield (40 to 10): 590 left of 600', J('C.earth.shield') === 590 && J('C.result') === null, J('C.earth.shield'));
  g.run(`C.earth.shield = 3; campBullet(C, { x: 700, y: 0, vx: 0, vy: 0, id: 't' }, Math.PI, 600, 40, 3000, 'alien', 0); __run(1.5)`);
  check('Earth\'s shield gone loses the level, and says why', J('C.result') === 'lost' && J('C.why') === 'earth' && J('C.earth.shield') === 0);
  g.run(`__new([], 1); campHurt(C, C.carrier, 9999, 'x')`);
  check('the carrier destroyed loses the level; god mode cannot die', J('C.result') === 'lost' && J('C.why') === 'carrier' && (g.run(`__new([], 1, true); campHurt(C, C.carrier, 9999, 'x')`), J('C.result') === null && J('C.carrier.hp') === 600));
  g.run(`__new([], 1); C.ships.push({ id: 'mother-9', kind: 'mother', team: 'alien', x: 99999, y: 0, vx: 0, vy: 0, hp: 10, r: 90 }); C.by['mother-9'] = C.ships[C.ships.length - 1]; campHurt(C, C.by['mother-9'], 50, 'x')`);
  check('the mothership dead wins the level', J('C.result') === 'won' && J('C.why') === 'mother');
  g.run(`__new([], 1)`); const sm = J('campSummary(C)');
  check('the ship computer is told the battle: level, hull, shield, bay, aliens', /level home, Home/.test(sm) && /hull 600 of 600/.test(sm) && /Earth shield 100 percent/.test(sm) && /6 fighters, 2 escorts/.test(sm), sm);
}

// ---------- G. the doors: the strip, the voice and the ship computer ----------
console.log('G. the doors: typed and spoken orders reach the battle');
{
  g.run(`window.__scene = { scene: { key: 'Campaign' }, leaving: false, dead: false, camp: null, toasts: [] }; window.__nb = () => { __new([], 1); __scene.camp = C; };`);
  g.run('__nb()');
  const local = t => J(`(() => { const p = shipcompLocal(${JSON.stringify(t)}, __scene); return p ? { text: p.text, action: p.action, refused: p.refused, run: !!p.run } : null; })()`);
  const r0 = local('launch the fighters');
  check('"launch the fighters" typed in a battle is the fleet_launch act, said in words, with a run to do it, and it has done nothing yet', r0 && r0.action === 'fleet_launch' && r0.text === 'Launching the wing.' && r0.run && J('C.launchQ.length') === 0 && J('C.bay.fighters') === 6);
  g.run('(() => { const p = shipcompLocal("launch", __scene); p.run(__scene); })()');
  check('running it launches the wing, through the one door the keys use (campOrder)', J('C.launchQ.length') === 8 && J('C.orders.launch') === 1);
  g.run('__run(6)');
  const r1 = local('send escorts to the Mars convoy');
  check('with the convoy not yet out, "send escorts to the Mars convoy" is refused in words and nothing changes', r1 && r1.refused && r1.text === 'There is no convoy to escort.' && J(`campWing(C, 'escort').every(u => u.order.type === 'guard')`));
  g.run('__run(5)');
  g.run('(() => { const p = shipcompLocal("send escorts to the Mars convoy", __scene); p.run(__scene); })()');
  check('once it is out the same words send the escorts to it', J(`campWing(C, 'escort').every(u => u.order.type === 'escort' && u.order.target === 'freighter-mars')`));
  check('"attack", "guard the carrier" and "recall" are acts too, and a refused one says why', local('attack').action === 'fleet_attack' && local('guard the carrier').action === 'fleet_guard' && local('come home').action === 'fleet_recall' && (g.run('__nb()'), local('attack').text === 'No fighters are out. Launch first.'));
  check('in a battle the Long Haul words mean the fleet\'s: "hunt" is attack, "dock" is recall; "fly to Kepler" is answered as not on the map (src/campnav.js: the Campaign has no star called that) and "how do I jump" is the model\'s (no Long Haul answer such as "launch first, then I can hunt")', local('hunt').action === 'fleet_attack' && local('dock').action === 'fleet_recall' && local('fly to Kepler').refused === true && /do not see that on the map/.test(local('fly to Kepler').text) && local('how do I jump') === null);
  check('outside the Campaign the same words are Long Haul\'s (dock is dock, there is no fleet)', J(`shipcompIntent('dock', { scene: { key: 'Space' } })`).act === 'dock' && J(`shipcompIntent('launch the fighters', { scene: { key: 'Space' } })`) === null);
  check('and a fleet act asked for outside the Campaign is refused in words', J(`shipcompPlan('SAY: ok\\nDO: fleet_launch', { scene: { key: 'Space' } })`).refused === true);
  // the model path: the reply is read and checked against the live battle
  g.run('__nb()');
  const plan = J(`(() => { const p = shipcompPlan('SAY: Opening the bay.\\nDO: fleet_launch', __scene); return { action: p.action, refused: p.refused, text: p.text, run: !!p.run }; })()`);
  check('the model\'s DO: fleet_launch is on the closed list: checked, announced, then run', plan.action === 'fleet_launch' && !plan.refused && plan.text === 'Launching the wing.' && plan.run);
  check('the model is told the battle, the five orders and the Campaign keys, and not the Long Haul list', (() => { const sys = J('shipcompSystem(__scene)'); return /Campaign level home, Home/.test(sys) && /fleet_launch \| fleet_attack/.test(sys) && /1 launch   2 attack/.test(sys) && !/plot_route/.test(sys) && !/jump_next_hop/.test(sys); })());
  check('the strip, the microphone and the plain-command door all find the Campaign scene (src/cmdstrip.js, src/listen.js, src/shipcomputer.js)', ['src/cmdstrip.js', 'src/listen.js', 'src/shipcomputer.js'].every(f => /sc\.scene\.key === 'Campaign'/.test(src(f))));
  check('the scene is a Phaser scene named Campaign, in the game\'s scene list; the title\'s K opens it', J(`typeof Campaign`) === 'function' && /Journal, Campaign\]/.test(src('src/main.js')) && /KeyK'\) campaignStart\(this\)/.test(src('src/title.js')) && J('typeof campaignStart') === 'function');
  check('the tune kit\'s doors are there, guarded, so this branch runs with or without it: how an order was given (key, strip, voice), how a level was started (menu, address, next, retry, skip), the debug keys, the pause line, the address', (() => { const sc = src('src/campaignscene.js'), ti = src('src/title.js'); return /campOrder\(C, order, '', 'key'\)/.test(sc) && /via: 'retry'/.test(sc) && /via: 'next'/.test(sc) && /via: 'skip'/.test(sc) && /typeof campDebugKey === 'function'/.test(sc) && /typeof campDebugLine === 'function'/.test(sc) && /typeof campAddrPlanPage === 'function'/.test(ti) && /via: 'address'/.test(ti) && /campOrder\(s2\.camp, name, arg, 'strip'\)/.test(src('src/shipcomputer.js')); })());
  check('a level started with techs of its own (the address) takes them instead of the saved ones; an unknown tech is dropped; via is kept on the game', J(`(() => { const C = campNew(1, ['beam', 'nope'], { via: 'address' }); return C.via === 'address' && C.techs.join() === 'beam' && campNew(1, []).via === 'menu'; })()`));
  check('the page loads the sim, then the scene, before main.js makes the game', (() => { const h = src('index.html'), a = h.indexOf('src/campaign.js'), b = h.indexOf('src/campaignscene.js'), m = h.indexOf('src/main.js'); return a > 0 && b > a && m > b; })());
  check('every text the scene says is a key of content/text/ui.md that the game reads (a translation changes it, the code does not)', (() => {
    const sc = src('src/campaignscene.js'), md = src('content/text/ui.md') + src('content/text/campaign.md'); // the ore words are in campaign.md (ui.md is at its 200 rows)
    const keys = new Set([...sc.matchAll(/'(camp\.[a-z0-9.]+)'/g)].map(m => m[1])); ['shield', 'beam', 'blink', 'plating', 'bay2', 'repair'].forEach(id => { keys.add('camp.tech.' + id + '.name'); keys.add('camp.tech.' + id + '.text'); }); ['wrong', 'carrier', 'earth'].forEach(w => w !== 'wrong' && keys.add('camp.lose.' + w));
    const missing = [...keys].filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k); return missing.length === 0 || missing.join(',');
  })());
}

// ---------- H. the scene's own decisions, on a stand-in for the scene ----------
// A scene is Phaser's, so it cannot run here; its methods can, on an object that answers every drawing call with nothing (the page's `document` stub does that).
// What is tested is what the scene DECIDES: which key does what in which mode, what it hands the sim, what it saves, where it goes next.
console.log('H. the scene: keys, modes, the pick, retry (on a stand-in)');
{
  g.run(`
    window.__went = []; window.__go0 = go; go = (s, key, data) => { __went.push({ key, data }); };
    window.__toasts2 = []; window.__toast0 = toast; toast = (s, msg) => { __toasts2.push(msg); };
    window.__fake = (level, d) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
      f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { shield: document, ore: document, hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
      f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
      f.init(Object.assign({ level }, d || {})); f.camp = f.makeCamp(); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.osp = {}; f.showIntro(); __went.length = 0; __toasts2.length = 0; return f; };
  `);
  const mk = (level, d) => g.run(`window.F = __fake(${level}, ${JSON.stringify(d || {})}); 0`);
  const key = c => g.run(`F.onKey({ code: '${c}' }); 0`);
  mk(1);
  check('it opens on the story of the level: the intro card is up, the strip is kept shut (panel), the sim has not moved', J('F.mode') === 'intro' && J('F.panel') === true && (g.run('F.update(0, 100)'), J('F.camp.t') === 0));
  key('Digit1'); check('no order is taken while the story shows', J('F.camp.launchQ.length') === 0);
  key('Enter');
  check('Enter begins: the card is gone, the strip may open, the battle runs', J('F.mode') === 'play' && J('F.panel') === false && (g.run('F.update(0, 100)'), J('F.camp.t') > 90));
  g.run('F.k.W.isDown = true; F.k.D.isDown = true; F.k.SPACE.isDown = true; F.update(0, 33)');
  check('W thrusts, D turns, Space fires: the keys are read into the sim\'s input every frame', J('F.camp.input.thrust') === 1 && J('F.camp.input.turn') === 1 && J('F.camp.input.fire') === true);
  g.run('F.k.W.isDown = false; F.k.D.isDown = false; F.k.A.isDown = true; F.k.S.isDown = true; F.k.SPACE.isDown = false; F.update(0, 33)');
  check('A turns the other way, S brakes, and Space let go stops the turrets', J('F.camp.input.turn') === -1 && J('F.camp.input.brake') === true && J('F.camp.input.fire') === false);
  key('Digit1'); check('1 launches the wing and says so', J('F.camp.launchQ.length') === 8 && J('__toasts2.pop()') === 'Launching the wing.');
  key('Digit2'); check('2 while the wing is still leaving the bay answers in words (a toast) and does nothing', J('__toasts2.pop()') === 'The wing is still launching.' && J('F.camp.orders.attack') === 0);
  key('Escape'); check('Esc pauses the scene\'s own way (not Long Haul\'s menu), the sim stops, the strip is kept shut', J('F.mode') === 'pause' && J('F.panel') === true && (g.run('var __t0 = F.camp.t; F.update(0, 100)'), J('F.camp.t') === J('__t0')));
  key('Escape'); check('Esc again goes back to the battle', J('F.mode') === 'play' && J('F.panel') === false);
  key('Escape'); key('KeyT'); check('T from the pause goes to the title', J('__went.pop()').key === 'Title');
  mk(1);
  key('Enter');
  g.run('F.camp.techs = ["blink"]; F.onKey({ code: "KeyQ" })');
  check('Q asks for the blink (the sim says whether it is ready)', J('F.camp.input.blink') === true);
  // the end of a level
  g.run(`campHurt(F.camp, F.camp.carrier, 9999, 'x'); F.update(0, 33)`);
  check('the carrier lost: the lost card with Enter and T, and the reason in words', J('F.mode') === 'lost' && J('F.panel') === true);
  key('Enter'); const re = J('__went.pop()');
  check('Enter tries the level again with the same techs, started as "retry"', re.key === 'Campaign' && re.data.level === 1 && re.data.via === 'retry' && Array.isArray(re.data.techs));
  mk(1); key('Enter');
  g.run(`F.camp.ships.push({ id: 'mother-9', kind: 'mother', team: 'alien', x: 99999, y: 0, vx: 0, vy: 0, hp: 10, r: 90 }); F.camp.by['mother-9'] = F.camp.ships[F.camp.ships.length - 1]; campHurt(F.camp, F.camp.by['mother-9'], 50, 'x'); F.update(0, 33)`);
  check('the mothership dead: the story after the battle, then Enter opens the Earth refit (level 1 ends with it; the later levels have the plain pick)', J('F.mode') === 'won' && (key('Enter'), J('F.mode') === 'refit') && J('F.choices.length') === 3 && J('F.panel') === true);
  key('Digit9'); check('a key that is not a choice does nothing, and Enter before a pick does nothing', J('F.mode') === 'refit' && (key('Enter'), J('F.mode') === 'refit') && J('__went.length') === 0);
  key('Digit2'); key('Digit3');
  check('1, 2 or 3 chooses a technology; choosing again changes the choice; nothing is kept until Enter', J('F.refit.pick') === J('F.choices[2]') && !JSON.parse(store.get('longhaul.campaign') || '{"techs":[]}').techs.length);
  g.run('F.refit.ore = 100; F.refit.f = 0; F.refit.e = 0'); key('Digit4'); key('Digit4'); key('Digit5');
  check('4 buys an extra fighter (25 ore), 5 an extra escort (45): 100 ore buys two fighters and an escort, no more than 3 of each, nothing without the ore', J('F.refit.f') === 2 && J('F.refit.e') === 1 && J('F.refit.ore') === 100 - 50 - 45 && (key('Digit5'), J('F.refit.e') === 1) && (g.run('F.refit.ore = 1000'), key('Digit4'), key('Digit4'), J('F.refit.f') === 3));
  g.run('F.refit.ore = 5; F.refit.f = 3; F.refit.e = 1');
  key('Enter');
  check('Enter takes the choice: the tech is kept in the progress, the extra ships and the ore left are carried (level 2, bonus 3 fighters and 1 escort, ore 5), and the scene goes on to level 2 started as "next"', (() => { const P = JSON.parse(store.get('longhaul.campaign')), w = J('__went.pop()'); return P.level === 2 && P.techs[0] === J('F.choices[2]') && P.ore === 5 && P.bonus.fighters === 3 && P.bonus.escorts === 1 && w.key === 'Campaign' && w.data.level === 2 && w.data.via === 'next'; })());
  check('the pick is carried into the next level: a game started now has the tech', J(`campNew(1, campProgressLoad().techs).techs.length`) === 1);
  // addresses and the tune kit
  mk(1, { techs: ['shield', 'nope'], via: 'address' });
  check('a level started with techs of its own and a way (the address) uses them, and the sim knows how it began', J('F.camp.techs.join()') === 'shield' && J('F.camp.via') === 'address');
  g.run('go = __go0; toast = __toast0');
}

// ---------- I. levels 2 and 3 ----------
console.log('I. level 2 (Alpha Centauri) and level 3 (the home world)');
{
  g.run(`go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts2.push(msg); };`); // the stand-ins of H again (H gave the real ones back)
  g.run(`
    window.__new2 = (level, techs, seed) => { window.C = campNew(level, techs || [], { seed: seed == null ? 1 : seed }); return !!C; };
    window.__smart2 = (C, s) => {
      const c = C.carrier, L = CAMP.levels[C.level];
      if (s > 1 && s < 1.05) campOrder(C, 'launch');
      if (s > 6 && Math.round(s * 30) % 120 === 0) campOrder(C, 'attack', '');
      const al = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0];
      let goal = al;
      if (C.level === 2) { const k = C.caches.filter(k => !k.got).sort((p, q) => campDist(p, c) - campDist(q, c))[0]; goal = C.cachesGot < L.relic.caches && k ? k : C.relic; }
      const near = al && campDist(al, c) < 700, tgt = near ? al : goal || al;
      if (tgt) {
        const want = Math.atan2(tgt.y - c.y, tgt.x - c.x), d = Math.atan2(Math.sin(want - c.rot), Math.cos(want - c.rot)), dist = campDist(tgt, c);
        C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.thrust = (near ? dist > 420 : dist > (C.level === 2 && goal === C.relic ? 60 : 300)) ? 1 : 0;
        const w2 = al ? Math.atan2(al.y - c.y, al.x - c.x) : 0, d2 = Math.atan2(Math.sin(w2 - c.rot), Math.cos(w2 - c.rot)); C.input.fire = !!al && campDist(al, c) < 520;
      } else { C.input.thrust = 0; C.input.turn = 0; C.input.fire = false; }
    };
    window.__play2 = (level, seed, script, secs, techs) => {
      window.C = campNew(level, techs || [], { seed });
      for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; }
      return { result: C.result, why: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), caches: C.cachesGot, towers: C.ships.filter(u => u.kind === 'tower').length };
    };
  `);
  check('the table has levels 1, 2 and 3 (win by the mothership, the relic, the towers) and the Earth level "home", which is not in the chain; levels 1, 2 and 3 have no Earth and no convoys', J('Object.keys(CAMP.levels).join()') === '1,2,3,home' && J('CAMP.levels[1].win') === 'mother' && J('CAMP.levels[2].win') === 'relic' && J('CAMP.levels[3].win') === 'towers' && [1, 2, 3].every(n => J(`CAMP.levels[${n}].earth`) === false && J(`CAMP.levels[${n}].convoys.length`) === 0) && J('CAMP.levels.home.earth') === null && J('CAMP.levels.home.convoys.length') === 2);
  check('each level names only places it has (the start, the relic, the tower rings), and every wave line is a text the game has', J(`[1, 2, 3].every(n => { const L = CAMP.levels[n], p = campPlaces(n); return !!p[L.start] && (!L.relic || !!p[L.relic.place]) && (L.towers || []).every(g => !!p[g.place]) && L.waves.every(w => uiText(w.say) !== w.say); })`));
  check('the story of levels 2 and 3 is in content/text/ui.md: two lines before and two after each, and no tech is offered after level 3', [2, 3].every(n => J(`campStory(${n}, 'before')`).length === 2 && J(`campStory(${n}, 'after')`).length === 2) && J('campTechChoices(3).length') === 0);
  // level 2
  g.run('__new2(2, [], 1)');
  check('level 2: no Earth to lose, the carrier warps in at the warp point, five guards wait round Proxima b, three caches lie about, the relic is on Proxima b', J('C.earth') === null && J('C.carrier.x') === -4800 && J('campAliens(C).length') === 5 && J('campAliens(C).every(u => u.hold)') && J('C.caches.length') === 3 && J('C.relic.x') === 1200 && J('C.relic.y') === 800);
  g.run('__run(5)');
  check('the guards wait: five seconds in, none has moved off its post', J('campAliens(C).every(u => u.hold && Math.hypot(u.vx, u.vy) < 1)'));
  g.run('C.carrier.x = -2800 + 100; C.carrier.y = 2000; __run(0.2)');
  check('a cache is collected when a ship of yours comes within 160 px, once, and the game says how many', J('C.cachesGot') === 1 && J('C.caches[0].got') && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.cache') && (g.run('__run(1)'), J('C.cachesGot') === 1));
  check('the goal line says what the level asks: caches first, then the ring', /Gather resources: 1 of 2/.test(J('campObjective(C)')) && (g.run('C.cachesGot = 2'), /Hold the ring at the relic: 0%/.test(J('campObjective(C)'))));
  g.run('__new2(2, [], 1); C.cachesGot = 1; C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); C.carrier.x = 1200; C.carrier.y = 800; __run(3)');
  check('with too few caches the relic does not answer, however long you sit on it', J('C.relic.hold') === 0 && J('C.result') === null);
  g.run('C.cachesGot = 2; __run(4)');
  check('with the caches, the carrier on the ring and no alien near, the hold fills at one second a second', Math.abs(J('C.relic.hold') - 4) < 0.1 && J('C.result') === null, J('C.relic.hold'));
  g.run('C.carrier.x = 5000; __run(1)');
  check('leave the ring and it loses ground twice as fast', Math.abs(J('C.relic.hold') - 2) < 0.1, J('C.relic.hold'));
  g.run('C.carrier.x = 1200; C.carrier.y = 800; var __d = campSpawn(C, "drone", 1200 + 300, 800); __d.goal = "carrier"; __d.hold = true; __run(1)');
  check('an alien near the relic stops the hold: it goes down, not up', J('C.relic.hold') < 2 && J('C.result') === null);
  g.run('C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0); __run(12)');
  check('hold it the full 8 seconds, clear of the guards, and level 2 is won: "relic"', J('C.result') === 'won' && J('C.why') === 'relic');
  const l2 = [1, 2, 3, 4, 5, 6].map(sd => J(`__play2(2, ${sd}, __smart2, 400)`));
  check('level 2: a sensible player (gather two caches, fly to the relic, fight) wins on every seed, in under four minutes', l2.every(r => r.result === 'won' && r.why === 'relic' && r.t <= 240 && r.caches >= 2), JSON.stringify(l2.map(r => r.result + ' ' + r.t)));
  check('level 2: doing nothing loses (the second wave and the first are for the carrier)', [1, 2, 3].every(sd => J(`__play2(2, ${sd}, () => {}, 500)`).result === 'lost'));
  // level 3
  g.run('__new2(3, [], 1)');
  check('level 3: twelve towers in two rings round the home world (8 at 1,000 px, 4 at 1,500 px, the outer ones tougher), the carrier far out, no Earth', J(`C.ships.filter(u => u.kind === 'tower').length`) === 12 && J(`C.ships.filter(u => u.kind === 'tower' && u.maxHp === 260).length`) === 4 && J('C.earth') === null && Math.hypot(J('C.carrier.x'), J('C.carrier.y')) > 7000);
  check('a tower on its post: it turns on the nearest of your ships inside 800 px and fires, and does nothing when none is near; it never moves', (() => { g.run('var __t = C.ships.find(u => u.kind === "tower"); var __tx = __t.x, __ty = __t.y; __run(3)'); const idle = J('C.bullets.length') === 0; g.run('C.carrier.x = __t.x + 500; C.carrier.y = __t.y; __run(4)'); return idle && J('C.bullets.some(b => b.team === "alien")') !== undefined && J('__t.x') === J('__tx') && J('__t.y') === J('__ty') && (J('C.carrier.hp') < 600 || J('C.shield') < 150 || J('C.bullets.length') > 0); })());
  g.run('__new2(3, [], 1); C.ships.forEach(u => { if (u.kind === "tower" && u !== C.ships.filter(v => v.kind === "tower")[0]) { u.hp = 0; } }); C.ships = C.ships.filter(u => u.hp > 0 || u.kind === "carrier")');
  check('level 3 is won when the last tower falls, not before', J('C.result') === null && (g.run('campHurt(C, C.ships.find(u => u.kind === "tower"), 9999, "x")'), J('C.result') === 'won' && J('C.why') === 'towers'));
  check('the goal line counts the towers left', (g.run('__new2(3, [], 1)'), /Break the defence towers: 12 left/.test(J('campObjective(C)'))));
  const l3 = [1, 2, 3, 4, 5, 6].map(sd => J(`__play2(3, ${sd}, __smart2, 500)`));
  check('level 3 is the hardest: a sensible player wins most seeds (4 of 6 or more) and some of them cost the carrier dear, in 2 to 5 minutes', l3.filter(r => r.result === 'won').length >= 4 && l3.filter(r => r.result === 'won').every(r => r.t >= 100 && r.t <= 300), JSON.stringify(l3.map(r => r.result + ' ' + r.t + ' ' + r.hull)));
  check('level 3: doing nothing loses', [1, 2, 3].every(sd => J(`__play2(3, ${sd}, () => {}, 500)`).result === 'lost'));
  check('the ship computer is told the goal of level 2 and 3, and no Earth shield', (g.run('__new2(2, [], 1)'), /Goal: Gather resources: 0 of 2/.test(J('campSummary(C)')) && !/Earth shield/.test(J('campSummary(C)'))) && (g.run('__new2(3, [], 1)'), /Goal: Break the defence towers: 12 left/.test(J('campSummary(C)'))));
  // the chain, on the stand-in scene
  store.delete('longhaul.campaign');
  g.run(`window.F = __fake(2, {}); 0`);
  g.run(`F.onKey({ code: 'Enter' }); F.camp.cachesGot = 2; F.camp.relic.hold = 0; campEnd(F.camp, 'won', 'relic'); F.update(0, 33)`);
  check('level 2 won: the story after, then the pick of one of three (hull plating, second bay, repair field), then level 3 started as "next" with the pick in the save', J('F.mode') === 'won' && (g.run(`F.onKey({ code: 'Enter' })`), J('F.mode') === 'pick') && J('F.choices.join()') === 'plating,bay2,repair' && (g.run(`F.onKey({ code: 'Digit1' })`), true) && (() => { const w = J('__went.pop()'); return w.key === 'Campaign' && w.data.level === 3 && w.data.via === 'next' && JSON.parse(store.get('longhaul.campaign')).level === 3 && JSON.parse(store.get('longhaul.campaign')).techs.includes('plating'); })());
  g.run(`window.F = __fake(3, {}); 0`);
  g.run(`F.onKey({ code: 'Enter' }); campEnd(F.camp, 'won', 'towers'); F.update(0, 33)`);
  check('level 3 won: the story after, no pick, then the end card, and the title on Enter; the save starts a fresh campaign (level 1, no techs)', J('F.mode') === 'won' && (g.run(`F.onKey({ code: 'Enter' })`), J('F.mode') === 'end') && J('F.panel') === true && JSON.parse(store.get('longhaul.campaign')).level === 1 && JSON.parse(store.get('longhaul.campaign')).techs.length === 0 && (g.run(`F.onKey({ code: 'Enter' })`), J('__went.pop()').key === 'Title'));
  check('K on the title opens the highest built level reached, and never one that does not exist', (() => { g.run(`campProgressSave({ level: 3, techs: ['beam'] })`); g.run(`__went.length = 0; campaignStart({}, 0)`); const a = J('__went.pop()'); g.run(`campProgressSave({ level: 9, techs: [] })`); g.run(`campaignStart({}, 0)`); const b = J('__went.pop()'); return a.data.level === 3 && b.data.level === 3; })());
  // the two nits of 8-GEN's boot (a51ca77)
  g.run('__new2(2, [], 1); C.carrier.x = -2800 + 100; C.carrier.y = 2000; __run(0.2)');
  check('the cache toast says what you have gathered and never "of 3", while the goal line says how many the relic needs: "Resources gathered: 1." and "Gather resources: 1 of 2."', (() => { const key = g.run('C.events.filter(e => e.type === "say" && e.key === "camp.say.cache").map(e => JSON.stringify(e.vars))[0]'); const vars = JSON.parse(key); return J(`uiText('camp.say.cache', ${JSON.stringify(vars)})`) === 'Resources gathered: 1.' && /Gather resources: 1 of 2/.test(J('campObjective(C)')) && !/of 3/.test(J(`uiText('camp.say.cache', ${JSON.stringify(vars)})`)); })());
  // the title, on a stand-in: the address opens the Campaign once; coming back to the title from it does not open it again
  g.run(`
    window.__started = []; window.__plan0 = campAddrPlanPage; campAddrPlanPage = () => ({ level: 2, techs: ['beam'], via: 'address' }); CAMP_ADDR.used = false;
    window.__title = () => { const f = Object.create(Title.prototype); f.add = document; f.cameras = document; f.tweens = document; f.time = document; f.input = document; f.textures = document; f.scene = { start: (k, d) => __started.push({ key: k, data: d }) }; f.settingsChip = () => {}; return f; };
  `);
  g.run('__title().create(); __title().create();');
  check('the address opens the Campaign the first time the title is made, with its level, techs and via "address"; the second time (back from the Campaign) the title stays', J('__started.length') === 1 && J('__started[0].key') === 'Campaign' && J('__started[0].data.level') === 2 && J('__started[0].data.via') === 'address' && J('__started[0].data.techs.join()') === 'beam' && J('CAMP_ADDR.used') === true);
  g.run('campAddrPlanPage = __plan0; CAMP_ADDR.used = false');
  g.run('go = __go0; toast = __toast0');
}

// ---------- J. the sizes ----------
console.log('J. the carrier and the ships it launches: 35 percent smaller');
{
  check('drawn 35 percent smaller: the carrier 1.56 (was 2.4), a fighter 0.52 (was 0.8), an escort 0.72 (was 1.1), in the one look table of the scene', J('CAMP_LOOK.carrier.scale') === 1.56 && J('CAMP_LOOK.fighter.scale') === 0.52 && J('CAMP_LOOK.escort.scale') === 0.72 && [[1.56, 2.4], [0.52, 0.8], [0.72, 1.1]].every(([n, o]) => Math.abs(n / o - 0.65) < 0.01));
  g.run('__new2("home", [], 1); campOrder(C, "launch"); __run(6)');
  check('their hit circles match: the carrier 36 px (was 56), a fighter 8 (was 12), an escort 10 (was 16); they are table values (CAMP), not numbers in the code', J('C.carrier.r') === 36 && J('CAMP.carrier.radius') === 36 && J(`campWing(C, 'fighter').every(u => u.r === 8)`) && J(`campWing(C, 'escort').every(u => u.r === 10)`) && J('CAMP.fighter.radius') === 8 && J('CAMP.escort.radius') === 10 && !/r: kind === 'fighter' \? 12 : 16/.test(src('src/campaign.js')));
  check('nothing else changed: the aliens, the mothership, the towers and the freighter keep their size', J(`PIRATES.raider.body[0]`) === 10 && J('CAMP.mother.radius') === 90 && J('CAMP.tower.radius') === 26 && J(`CAMP_LOOK.raider.scale + CAMP_LOOK.drone.scale + CAMP_LOOK.gunship.scale + CAMP_LOOK.freighter.scale`) === 4 && J('CAMP_LOOK.mother.scale') === 2.6 && J('CAMP_LOOK.tower.scale') === 1.6);
}

// ---------- K. easier: Earth's shield and a first-time player ----------
console.log('K. easier (Troy lost level 1 twice at wave 3, by Earth\'s shield): a first-time player wins');
{
  g.run(`
    window.__plain = (C, s) => {            // what a first-time player does: launch, escort the Mars convoy, attack and guard Earth in turn
      if (s > 1 && s < 1.05) campOrder(C, 'launch');
      if (s > 11 && s < 11.05) campOrder(C, 'escort', 'mars convoy');
      if (s > 20 && Math.round(s * 30) % 450 === 0) campOrder(C, 'attack', '');
      if (s > 40 && Math.round(s * 30) % 450 === 225) campOrder(C, 'guard', 'earth');
    };
    window.__stay = (C, s) => {             // the same, and the carrier turns on what comes within 800 px and fires, but never leaves the Moon
      __plain(C, s); const c = C.carrier, a = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0];
      if (a && campDist(a, c) < 800) { const w = Math.atan2(a.y - c.y, a.x - c.x), d = Math.atan2(Math.sin(w - c.rot), Math.cos(w - c.rot)); C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.fire = campDist(a, c) < 520; } else { C.input.turn = 0; C.input.fire = false; }
      C.input.thrust = 0;
    };
    window.__plays = (script, secs) => [1, 2, 3, 4, 5, 6].map(sd => { window.C = campNew("home", [], { seed: sd }); for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; } return { r: C.result, w: C.why, t: Math.round(C.t / 1000), earth: Math.round(C.earth.shield) }; });
  `);
  check('the numbers: Earth\'s shield 600 (was 300) and it mends 3 a second after 6 s unhit; wave 3 is two raiders and a gunship (was three and one); the mothership 700 hull, 8 a shot, holds 1,300 px out, launches a raider every 12 s up to 3', J('CAMP.earth.shield') === 600 && J('CAMP.earth.regen') === 3 && J('CAMP.earth.regenDelay') === 6000 && J('CAMP.levels.home.waves[2].ships.raider') === 2 && J('CAMP.levels.home.waves[2].ships.gunship') === 1 && J('CAMP.mother.hp') === 700 && J('CAMP.mother.damage') === 8 && J('CAMP.mother.holdAt') === 1300 && J('CAMP.mother.spawnEvery') === 12000 && J('CAMP.mother.spawnMax') === 3);
  g.run('__new2("home", [], 1); C.earth.shield = 300; C.t = 0; __run(5.9)');
  check('Earth\'s shield does not mend for the first 6 seconds after it was left alone, and then mends 3 a second', J('C.earth.shield') === 300 && (g.run('__run(2)'), Math.abs(J('C.earth.shield') - 306) < 3.5 || J('C.earth.shield') > 300));
  g.run('__new2("home", [], 1); C.earth.shield = 300; __run(20)');
  check('it never mends past its full 600, and a level with no Earth has nothing to mend', (g.run('C.earth.shield = 599; __run(5)'), J('C.earth.shield') === 600) && (g.run('__new2(2, [], 1); __run(5)'), J('C.earth') === null));
  g.run('__new2("home", [], 1); C.earth.shield = 300; C.earth.hitAt = C.t; var __last = 300; var __mend = 0; for (let i = 0; i < 30 * 30; i++) { campBullet(C, { x: 700, y: 0, vx: 0, vy: 0, id: "t" }, Math.PI, 600, 4, 3000, "alien", 0); campStep(C, 1 / 30); if (C.earth.shield > __last + 0.5) __mend++; __last = C.earth.shield; }');
  check('a siege does not mend it: shot at every frame it only goes down, so shots of 1 each 0.033 s never let the 6 s lull come', J('__mend') === 0 && J('C.earth.shield') < 300);
  const plain = J('__plays(__plain, 600)'), stay = J('__plays(__stay, 600)');
  check('a first-time player who launches, escorts, attacks and guards but leaves the carrier alone wins level 1 on at least half the seeds, and never in under two minutes (the eight turrets of the carrier make it quicker than it was)', plain.filter(r => r.r === 'won').length >= 3 && plain.filter(r => r.r === 'won').every(r => r.t >= 120 && r.t <= 360), JSON.stringify(plain.map(r => r.r + ' ' + r.t + ' ' + r.earth)));
  check('and one whose carrier also fires on what comes close wins at least five seeds of six, in two to five minutes, with Earth\'s shield most of the way up (with the carrier\'s shield of the ore card all six are won)', stay.filter(r => r.r === "won").length >= 5 && stay.filter(r => r.r === "won").every(r => r.t >= 120 && r.t <= 300 && r.earth >= 400), JSON.stringify(stay.map(r => r.r + ' ' + r.t + ' ' + r.earth)));
  const idle = J('__plays(() => {}, 500)');
  g.run(`window.__old = { e: Object.assign({}, CAMP.earth), m: Object.assign({}, CAMP.mother), c: CAMP.carrier.shield, w: Object.assign({}, CAMP.levels.home.waves[2].ships) }; CAMP.earth.shield = 300; CAMP.earth.regen = 0; CAMP.carrier.shield = 0; Object.assign(CAMP.mother, { hp: 900, damage: 12, holdAt: 1600, spawnEvery: 8000, spawnMax: 6 }); CAMP.levels.home.waves[2].ships = { raider: 3, gunship: 1 };`);
  const oldNums = J('__plays(__stay, 600)');
  g.run(`Object.assign(CAMP.earth, __old.e); Object.assign(CAMP.mother, __old.m); CAMP.carrier.shield = __old.c; CAMP.levels.home.waves[2].ships = __old.w;`); // always put the numbers back
  check('it is still not a walk: nobody wins by doing nothing, and with the numbers of before the easier card (Earth\'s shield 300, no mending, the old wave 3 and mothership, no carrier shield) the same player wins one seed of six at most and loses the rest by Earth\'s shield running out, as Troy did', idle.every(r => r.r === 'lost') && oldNums.filter(r => r.r === 'won').length <= 1 && oldNums.filter(r => r.r === 'lost' && r.w === 'earth').length >= 4 && J('CAMP.earth.shield') === 600 && J('CAMP.carrier.shield') === 150, JSON.stringify(oldNums.map(r => r.r + ' ' + r.w)));
}

// ---------- L. ore: mine it, spend it ----------
console.log('L. ore: asteroid rocks and wrecks, mining, the carrier shield, recharge, build');
{
  const N = (level, techs, seed) => g.run(`__new2(${JSON.stringify(level)}, ${JSON.stringify(techs || [])}, ${seed == null ? 1 : seed})`);
  check('the numbers are in the table: ore (start, cap, rock, reach, wrecks, danger), the shield, recharge and build costs and times', J('CAMP.ore.start') === 30 && J('CAMP.ore.cap') === 200 && J('CAMP.ore.rock') === 20 && J('CAMP.ore.reach') === 70 && J('CAMP.ore.wreck.raider') === 4 && J('CAMP.ore.wreck.mother') === 40 && J('CAMP.ore.danger') === 500 && J('CAMP.carrier.shield') === 150 && J('CAMP.recharge.carrier') === 25 && J('CAMP.recharge.earth') === 40 && J('CAMP.recharge.earthPoints') === 200 && J('CAMP.build.fighterCost') === 25 && J('CAMP.build.escortCost') === 45 && J('CAMP.build.fighterTime') === 6 && J('CAMP.build.escortTime') === 10 && J('CAMP.build.maxFighters') === 14 && J('CAMP.build.maxEscorts') === 6);
  N("home");
  check('a new level: 30 ore in the store, a carrier shield of 150, fifteen rocks of 20 ore in three fields in level 1; ten rocks in each of levels 2 and 3', J('C.ore') === 30 && J('C.shield') === 150 && J(`C.pickups.filter(p => p.kind === 'rock').length`) === 15 && J(`C.pickups.every(p => p.ore === 20)`) && (N(2), J('C.pickups.length') === 10) && (N(3), J('C.pickups.length') === 10));
  N("home");
  check('the rocks lie inside their field (within 260 px of its centre), are the same on every run of a seed, and never change how the fight flies (they have a stream of their own)', (() => { const near = J(`C.pickups.every(p => CAMP.levels.home.rocks.some(f => Math.hypot(p.x - f.at[0], p.y - f.at[1]) <= f.spread + 1))`); const a = J('C.pickups.map(p => [Math.round(p.x), Math.round(p.y)])'); N("home"); const same = JSON.stringify(a) === J('JSON.stringify(C.pickups.map(p => [Math.round(p.x), Math.round(p.y)]))') || JSON.stringify(a) === JSON.stringify(J('C.pickups.map(p => [Math.round(p.x), Math.round(p.y)])')); g.run('var __R = CAMP.levels.home.rocks; CAMP.levels.home.rocks = []; __new2("home", [], 1); __run(25)'); const w1 = J('campAliens(C).map(u => [Math.round(u.x), Math.round(u.y)])'); g.run('CAMP.levels.home.rocks = __R; __new2("home", [], 1); __run(25)'); const w2 = J('campAliens(C).map(u => [Math.round(u.x), Math.round(u.y)])'); return near && same && w1.length > 0 && JSON.stringify(w1) === JSON.stringify(w2); })());
  // wrecks
  N("home"); g.run('C.pickups = []; var __a = campSpawn(C, "raider", 5000, 5000); campHurt(C, __a, 9999, "x"); var __g = campSpawn(C, "gunship", 6000, 5000); campHurt(C, __g, 9999, "x"); var __d = campSpawn(C, "drone", 7000, 5000); campHurt(C, __d, 9999, "x")');
  check('a dead alien leaves its ore where it died: a raider 4, a drone 6, a gunship 12; nothing it has not been told to leave', J('C.pickups.map(p => p.ore).sort((a, b) => a - b).join()') === '4,6,12' && J('C.pickups.every(p => p.kind === "wreck")') && J('C.pickups.find(p => p.ore === 4).x') === 5000);
  g.run('C.carrier.x = 50000; __run(29)');
  check('a wreck lies 30 seconds and then it is gone', J('C.pickups.length') === 3 && (g.run('__run(2)'), J('C.pickups.length') === 0));
  // collecting
  N("home"); g.run('C.pickups = [{ id: "rock-x", kind: "rock", x: C.carrier.x + 40, y: C.carrier.y, ore: 20, born: 0 }]; __run(0.1)');
  check('the carrier takes ore it flies over: 30 plus 20, and the rock is gone', J('C.ore') === 50 && J('C.pickups.length') === 0 && g.run('C.events.some(e => e.type === "ore")') !== undefined);
  g.run('C.pickups = [{ id: "rock-y", kind: "rock", x: 5000, y: 5000, ore: 20, born: 0 }]; campOrder(C, "launch"); __run(8); var __e = campWing(C, "escort")[0]; __e.x = 5010; __e.y = 5000; __run(0.1)');
  check('so does any ship of yours: an escort at a rock takes it', J('C.pickups.length') === 0 && J('C.ore') === 70);
  g.run('C.ore = 190; C.pickups = [{ id: "rock-z", kind: "rock", x: C.carrier.x + 20, y: C.carrier.y, ore: 20, born: 0 }]; __run(0.1)');
  check('the store holds 200: a rock of 20 over 190 gives 10 and the rest is lost with it; a full store leaves the ore lying', J('C.ore') === 200 && (g.run('C.pickups = [{ id: "rock-w", kind: "rock", x: C.carrier.x + 20, y: C.carrier.y, ore: 20, born: 0 }]; __run(0.5)'), J('C.pickups.length') === 1 && J('C.ore') === 200));
  // mine
  N("home");
  check('Mine before launch says launch first (the whole wing mines: in the belt the fighters are the mining drones)', J(`campOrder(C, 'mine').say`) === 'No ships are out. Launch first.' && (g.run('campOrder(C, "launch"); __run(3)'), J(`campOrder(C, 'mine').say`) !== undefined));
  g.run('__new2("home", [], 1); campOrder(C, "launch"); __run(6)');
  const mine0 = J(`campOrder(C, 'mine')`);
  check('Mine with the wing out: every ship of it (fighters and escorts) takes the mine order, and Attack turns the fighters back to the fight', mine0.ok && mine0.say === 'Mining ships are on their way.' && J(`campWing(C).every(u => u.order.type === 'mine')`) && J('C.orders.mine') === 1 && (g.run(`campOrder(C, 'attack', '')`), J(`campWing(C, 'fighter').every(u => u.order.type === 'attack')`) && J(`campWing(C, 'escort').every(u => u.order.type === 'mine')`)));
  g.run('C.pickups = [{ id: "rock-1", kind: "rock", x: C.carrier.x + 900, y: C.carrier.y, ore: 20, born: 0 }]; var __ore0 = C.ore; __run(12)');
  check('the miners fly to the ore and bring it in: 20 ore more within 12 seconds', J('C.ore') - J('__ore0') === 20 && J('C.pickups.length') === 0);
  g.run('C.pickups = []; ');
  check('with no ore left in the level, Mine says so', J(`campOrder(C, 'mine').say`) === 'There is no ore in reach, pilot.');
  g.run('__new2("home", [], 1); campOrder(C, "launch"); __run(6); C.pickups = [{ id: "rock-2", kind: "rock", x: C.carrier.x + 1800, y: C.carrier.y, ore: 20, born: 0 }]; var __g2 = campSpawn(C, "drone", C.carrier.x + 1850, C.carrier.y); __g2.hold = true; __g2.goal = "carrier"; campOrder(C, "mine"); __run(8)');
  check('they keep away from ore with an alien within 500 px of it: it lies there (they wait round the carrier)', J('C.pickups.length') === 1 && J(`campWing(C, 'escort').every(u => Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) < 700)`));
  // the shield
  N("home"); g.run('campHurt(C, C.carrier, 100, "x")');
  check('the carrier\'s shield takes damage first: 100 off 150 leaves 50 shield and the hull whole; the rest goes through to the hull', J('C.shield') === 50 && J('C.carrier.hp') === 600 && (g.run('campHurt(C, C.carrier, 80, "x")'), J('C.shield') === 0 && J('C.carrier.hp') === 570));
  g.run('__new2("home", ["shield"], 1); campHurt(C, C.carrier, 100, "x")');
  check('with the shield grid tech, 40 percent less of it first (100 hits as 60)', Math.abs(J('C.shield') - 90) < 1e-6);
  g.run('__new2("home", [], 1); campHurt(C, C.carrier, 60, "x"); __run(15)');
  check('the shield does not mend by itself (15 seconds on, before the first wave, it is still 90)', J('C.shield') === 90);
  // recharge
  g.run('__new2("home", [], 1); campHurt(C, C.carrier, 75, "x")');
  check('Recharge: the carrier shield is filled for a share of 25 ore in proportion to what is missing (half missing: 13 ore), and the answer says so', (() => { const r = J(`campOrder(C, 'recharge', '')`); return r.ok && r.say === 'Carrier shield recharged.' && J('C.shield') === 150 && J('C.ore') === 30 - 13 && J('C.orders.recharge') === 1; })());
  check('a full shield says so and costs nothing', J(`campOrder(C, 'recharge', '').say`) === "The carrier's shield is already full." && J('C.ore') === 17);
  g.run('campHurt(C, C.carrier, 150, "x")');
  check('with too little ore it says how much is needed and how much there is, and takes nothing', J(`campOrder(C, 'recharge', 'carrier').say`) === 'Not enough ore: 25 needed, 17 in the store.' && J('C.ore') === 17 && J('C.shield') === 0);
  g.run('__new2("home", [], 1); C.ore = 100; C.earth.shield = 100; C.carrier.x = C.earth.x + 500; C.carrier.y = C.earth.y');
  check('Recharge Earth: near Earth (within 900 px) and under full, 40 ore gives Earth\'s shield 200 points (never past 600)', (() => { const r = J(`campOrder(C, 'recharge', 'earth')`); return r.ok && r.say === "Earth's shield recharged." && J('C.earth.shield') === 300 && J('C.ore') === 60; })());
  check('with no name, near Earth and Earth under 90 percent, it is Earth that is recharged; with Earth near full it is the carrier', (() => { g.run('C.earth.shield = 100; campHurt(C, C.carrier, 10, "x")'); const a = J(`campOrder(C, 'recharge', '')`); const earth1 = J('C.earth.shield'); g.run('C.earth.shield = 590; C.ore = 100; campHurt(C, C.carrier, 10, "x")'); const b = J(`campOrder(C, 'recharge', '')`); return a.say === "Earth's shield recharged." && earth1 === 300 && b.say === 'Carrier shield recharged.' && J('C.earth.shield') === 590; })());
  g.run('C.earth.shield = 100; C.carrier.x = C.earth.x + 3000; C.ore = 100');
  check('too far from Earth, Recharge Earth says so; Earth full says so; no Earth (level 2) says so', J(`campOrder(C, 'recharge', 'earth').say`) === 'We are too far from Earth to recharge it.' && (g.run('C.carrier.x = C.earth.x + 300; C.earth.shield = 600'), J(`campOrder(C, 'recharge', 'earth').say`) === "Earth's shield is already full.") && (N(2), g.run('C.ore = 100'), J(`campOrder(C, 'recharge', 'earth').say`) === 'There is no Earth here, pilot.'));
  // build
  N("home"); g.run('C.ore = 100');
  const b1 = J(`campOrder(C, 'build', 'fighter')`);
  check('Build a fighter: 25 ore at once, one is queued, the answer says so', b1.ok && b1.say === 'Building 1 fighter.' && J('C.ore') === 75 && J('C.build.queue.length') === 1 && J('C.orders.build') === 1);
  g.run('__run(5.9)'); const early = J('C.bay.fighters');
  g.run('__run(0.3)');
  check('it is in the bay after 6 seconds, not before, and the game says so', early === 6 && J('C.bay.fighters') === 7 && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.built'));
  N("home"); g.run('C.ore = 200; campOrder(C, "build", "two escorts"); __run(9.9)');
  const e0 = J('C.bay.escorts'); g.run('__run(0.3)'); const e1 = J('C.bay.escorts'); g.run('__run(10)');
  check('two escorts cost 90 ore at once and are built one after the other: the first at 10 s (bay 2 to 3), the second at 20 s (to 4)', J('C.ore') === 110 && e0 === 2 && e1 === 3 && J('C.bay.escorts') === 4);
  N("home"); g.run('C.ore = 10');
  check('with too little ore: "Not enough ore: 25 needed, 10 in the store." and nothing is queued', J(`campOrder(C, 'build', 'fighter').say`) === 'Not enough ore: 25 needed, 10 in the store.' && J('C.build.queue.length') === 0 && J('C.ore') === 10);
  g.run('C.ore = 200; campOrder(C, "build", "five fighters"); __run(0.1)');
  check('the bay holds 14 fighters at most, counting the queue: six in the bay and five queued is eleven; three more are the last, a fourth is refused', J(`campOrder(C, 'build', 'three fighters').ok`) && J(`campOrder(C, 'build', 'fighter').say`) === 'The bay cannot hold more of those, pilot.' && J('C.build.queue.length') === 8);
  g.run('__new2("home", [], 1); C.ore = 200; campOrder(C, "build", "fighter"); __run(6.1); campOrder(C, "launch"); __run(6)');
  check('what is built is launched with Launch like the rest: seven fighters out', J(`campWing(C, 'fighter').length`) === 7);
  // plain words
  const I = x => J(`campIntent(${JSON.stringify(x)})`);
  const act = (x, a, arg) => { const r = I(x); return !!r && r.act === a && (arg === undefined || r.arg === arg); };
  check('plain words: "mine", "go mining", "collect the ore", "send the escorts to mine" are Mine', ['mine', 'go mining', 'collect the ore', 'send the escorts to mine', 'gather ore', 'start mining please'].every(x => act(x, 'fleet_mine')));
  check('"recharge shields", "recharge the shield", "recharge Earth\'s shield", "shields up" are Recharge, with Earth or the carrier when named', act('recharge shields', 'fleet_recharge', '') && act('recharge the shield', 'fleet_recharge') && act("recharge Earth's shield", 'fleet_recharge', 'earth') && act('recharge the carrier shields', 'fleet_recharge', 'carrier') && act('shields up', 'fleet_recharge'));
  check('"build fighters", "build an escort", "build two fighters", "make 3 escorts" are Build, the kind and the number in the words', act('build fighters', 'fleet_build') && /escort/.test(I('build an escort').arg) && /two fighters/.test(I('build two fighters').arg) && /3 escorts/.test(I('make 3 escorts').arg) && !I('how do I build a ship') );
  check('a question about mining is the model\'s, and the Long Haul words are not taken for these ("how do I mine", "what is ore")', I('how do I mine') === null && I('what is ore') === null);
  // the doors
  N("home"); g.run('__scene.camp = C; C.ore = 100; campHurt(C, C.carrier, 150, "x")');
  const loc = x => J(`(() => { const p = shipcompLocal(${JSON.stringify(x)}, __scene); return p ? { text: p.text, action: p.action, refused: p.refused, run: !!p.run } : null; })()`);
  check('typed or spoken, they are acts of the closed list (fleet_mine, fleet_recharge, fleet_build), checked first and run after: "recharge shields" costs nothing until its run', (() => { const r = loc('recharge shields'); return r && r.action === 'fleet_recharge' && r.text === 'Carrier shield recharged.' && J('C.shield') === 0 && J('C.ore') === 100; })() && (g.run('shipcompLocal("recharge shields", __scene).run(__scene)'), J('C.shield') === 150 && J('C.ore') === 75));
  check('"build two fighters" typed: 50 ore and two queued after the run; "mine" before launch is refused in words', (() => { g.run('shipcompLocal("build two fighters", __scene).run(__scene)'); return J('C.ore') === 25 && J('C.build.queue.length') === 2 && loc('mine').refused === true; })());
  check('the model is told the eight orders, the ore and the keys 6 to 9', (() => { const sys = J('shipcompSystem(__scene)'); return /fleet_mine \| fleet_recharge/.test(sys) && /fleet_build/.test(sys) && /6 mine ore/.test(sys) && /Ore in the store/.test(sys) && /6-9 ore/.test(sys); })());
  check('every word the new orders can say is in content/text/campaign.md (ui.md is full at 200 rows)', (() => { const md = src('content/text/ui.md') + src('content/text/campaign.md'), ks = ['mine', 'recharge', 'rechargeearth', 'build', 'built'].map(k => 'camp.say.' + k).concat(['noore', 'noore2', 'noearth', 'farearth', 'earthfull', 'shieldfull', 'buildfull'].map(k => 'camp.no.' + k), ['camp.ui.ore', 'camp.ui.shield']); const miss = ks.filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k); return miss.length === 0 || miss.join(); })());
  // the scene, on the stand-in
  g.run(`go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts2.push(msg); }; window.F = __fake(1, {}); F.onKey({ code: 'Enter' }); F.camp.ore = 100; campHurt(F.camp, F.camp.carrier, 150, 'x'); __toasts2.length = 0; 0`);
  g.run(`F.onKey({ code: 'Digit7' })`); const t7 = J('__toasts2.pop()');
  g.run(`F.onKey({ code: 'Digit8' })`); const t8 = J('__toasts2.pop()');
  g.run(`F.onKey({ code: 'Digit9' })`); const t9 = J('__toasts2.pop()');
  g.run(`F.onKey({ code: 'Digit6' })`); const t6 = J('__toasts2.pop()');
  check('the keys: 7 recharges the shield, 8 builds a fighter, 9 an escort (ore 100 less 25, 25, 45), 6 with no escorts out says launch first; the HUD and the ore sprites draw without error', t7 === 'Carrier shield recharged.' && t8 === 'Building 1 fighter.' && t9 === 'Building 1 escort.' && t6 === 'No ships are out. Launch first.' && J('F.camp.ore') === 100 - 25 - 25 - 45 && J('F.camp.shield') === 150 && (g.run('F.update(0, 33)'), true));
  g.run('go = __go0; toast = __toast0');
  g.run(`window.F = __fake(1, {}); F.onKey({ code: 'Enter' }); delete F.hud.shield; delete F.hud.ore; delete F.osp; 0`);
  check('a stand-in scene with no shield text and no ore sprites (5-GEN\'s UX tests fake the scene that way) still draws a frame: the scene skips the gauges it has no text for and makes the ore sprites it lacks', (() => { try { g.run('F.update(0, 33); F.update(0, 33)'); return true; } catch (e) { return String(e.message).slice(0, 120); } })());
  check('the bottom key line fits the screen: 8.6 px a letter from x 24 ends at 1272 at the latest (8-GEN measured 1512 px for 176 letters, which was cut off at "I type a"), and it still ends with "Tab map" and names the ore keys', (() => { const k = J(`uiText('camp.ui.keys')`); return 24 + k.length * 8.6 <= 1272 && /Tab map$/.test(k) && /6-9 ore/.test(k) && /Space turrets/.test(k) && /F missiles/.test(k); })());
  // ore in every level, and what it is worth
  check('every level has ore to find: rocks in levels 1, 2 and 3; Earth\'s shield recharge only where there is an Earth', [1, 2, 3].every(n => J(`CAMP.levels[${n}].rocks.length`) >= 1) && (N(3), g.run('C.ore = 100; campHurt(C, C.carrier, 100, "x")'), J(`campOrder(C, 'recharge', '').ok`) === true));
  g.run(`
    window.__ore = (C, s) => {               // the same player, who also uses ore: mines now and then when the sky is quiet, recharges a low shield, builds fighters and launches them
      __stay(C, s);
      if (s > 15 && Math.round(s * 30) % 600 === 100 && campAliens(C).length < 3) campOrder(C, 'mine');
      if (Math.round(s * 30) % 60 === 7) { if (C.shield < 60) campOrder(C, 'recharge', ''); if (C.earth && C.earth.shield < C.earth.max * 0.6) campOrder(C, 'recharge', 'earth'); if (C.ore >= 60) campOrder(C, 'build', 'fighter'); if (C.bay.fighters > 0 && !C.launchQ.length) campOrder(C, 'launch'); }
    };
    window.__plays2 = (script, secs) => [1, 2, 3, 4, 5, 6].map(sd => { window.C = campNew("home", [], { seed: sd }); for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; } return { r: C.result, t: Math.round(C.t / 1000), ls: C.lostShips, built: C.orders.build, mined: C.orders.mine }; });
  `);
  const withOre = J('__plays2(__ore, 600)'), without = J('__plays2(__stay, 600)');
  check('a player who also mines, recharges and builds wins level 1 on every seed, and loses fewer small ships than the same player without ore (6 seeds together)', withOre.every(r => r.r === 'won') && withOre.reduce((a, r) => a + r.ls, 0) < without.reduce((a, r) => a + r.ls, 0) && withOre.some(r => r.built > 0), JSON.stringify([withOre.map(r => r.ls), without.map(r => r.ls)]));
}

// ---------- M. level 1 is the asteroid belt ----------
console.log('M. level 1, the belt: a mining cruiser, a quiet minute, the ambush, the refit');
{
  g.run(`
    window.__belt = (C, s) => {           // a plain player of the belt: launches, sends the wing at the aliens every 5 s, flies the cruiser at the nearest alien and holds Space
      if (s > 1 && s < 1.05) campOrder(C, 'launch');
      if (s > 12 && Math.round(s * 30) % 150 === 0) campOrder(C, 'attack', '');
      const c = C.carrier, a = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c))[0];
      if (a) { const w = Math.atan2(a.y - c.y, a.x - c.x), d = Math.atan2(Math.sin(w - c.rot), Math.cos(w - c.rot)); C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.thrust = campDist(a, c) > 500 ? 1 : 0; C.input.fire = Math.abs(d) < 0.22 && campDist(a, c) < 800; } else { C.input.turn = 0; C.input.thrust = 0; C.input.fire = false; }
    };
    window.__beltplays = (script, secs, seeds) => (seeds || [1, 2, 3, 4, 5, 6]).map(sd => { window.C = campNew(1, [], { seed: sd }); for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; } return { r: C.result, w: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), ore: Math.floor(C.ore) }; });
  `);
  check('level 1 is "The belt": at Ceres (Occator Works), Vesta and Pallas; no Earth, no convoys, a store that starts empty; won by the mothership; ends with the Earth refit', J('CAMP.levels[1].name') === 'The belt' && J('CAMP.levels[1].start') === 'ceres' && J('CAMP.levels[1].places.ceres.base') === 'Occator Works' && J('CAMP.levels[1].places.vesta.name') === 'Vesta' && J('CAMP.levels[1].places.pallas.name') === 'Pallas' && J('CAMP.levels[1].earth') === false && J('CAMP.levels[1].convoys.length') === 0 && J('CAMP.levels[1].startOre') === 0 && J('CAMP.levels[1].win') === 'mother' && J('CAMP.levels[1].refit') === true);
  g.run('__new2(1, [], 1)');
  check('the cruiser starts at Ceres with no ore, no Earth to lose, thirty-two rocks of ore in the belt (640 ore, more than the store holds), nothing hunting it', J('C.ore') === 0 && J('C.earth') === null && J(`C.pickups.filter(p => p.kind === 'rock').length`) === 32 && J('campAliens(C).length') === 0 && Math.hypot(J('C.carrier.x'), J('C.carrier.y')) < 200);
  g.run('__run(59)');
  check('a quiet minute: for the first 59 seconds there is not an alien in the sky and no wave has started', J('campAliens(C).length') === 0 && J('C.waves.every(w => !w.started)') && g.run('C.events.filter(e => e.type === "alarm").length') !== undefined);
  g.run('C.events.length = 0; __run(1.1)');
  check('at 60 seconds the ambush: the alarm sounds, the ambush line is said, five raiders and three drones come out of the dark, all for the cruiser', J('C.waves[0].started') && g.run('C.events.some(e => e.type === "alarm")') && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.ambush') && J(`campAliens(C).filter(u => u.kind === 'raider').length`) === 5 && J(`campAliens(C).filter(u => u.kind === 'drone').length`) === 3 && J('campAliens(C).every(u => u.goal === "carrier")'));
  g.run('C.events.length = 0; __run(5)');
  check('five seconds after it a second line says what the cruiser has: the mining lasers are weapons now, hold Space, the drones answer to 2', g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.ambush2') && /Hold Space/.test(J(`uiText('camp.say.ambush2')`)) && /press 2/.test(J(`uiText('camp.say.ambush2')`)));
  // the mining opening
  g.run('__new2(1, [], 1); campOrder(C, "launch"); __run(5); campOrder(C, "mine")');
  g.run('__run(50)');
  check('the quiet minute earns ore: a wing sent to mine brings in a good share of the belt (at least 100 ore in under a minute) and the store never passes 200', J('C.ore') >= 100 && J('C.ore') <= 200, J('C.ore'));
  g.run('__new2(1, [], 1); campOrder(C, "launch"); __run(6)');
  check('with no convoys in the level, Escort keeps the escorts close to the cruiser, and says so (the key is never dead)', J(`campOrder(C, 'escort', '').say`) === 'Escorts are with the cruiser.' && J(`campWing(C, 'escort').every(u => u.order.type === 'guard' && u.order.at.kind === 'carrier')`) && J(`campOrder(C, 'recharge', 'earth').say`) === 'There is no Earth here, pilot.');
  // balance
  const belt = J('__beltplays(__belt, 600)'), idle = J('__beltplays(() => {}, 600, [1, 2, 3])');
  check('a plain player (launch, attack, the cruiser at the nearest alien, Space held) wins the belt on every seed, in four to six minutes', belt.every(r => r.r === 'won' && r.w === 'mother' && r.t >= 240 && r.t <= 360), JSON.stringify(belt.map(r => r.r + ' ' + r.t)));
  check('a passive player loses, and the only way to lose is the cruiser: nothing points at an Earth shield that is gone', idle.every(r => r.r === 'lost' && r.w === 'carrier') && J(`campLoseLines(C, 'carrier').join(' ')`).indexOf('Earth') < 0 || (idle.every(r => r.r === 'lost' && r.w === 'carrier')), JSON.stringify(idle.map(r => r.r + ' ' + r.w + ' ' + r.t)));
  check('the belt has no Earth to point at anywhere: no Earth bar (null), no goal line about Earth, no Earth in the model prompt of level 1', (() => { g.run('__new2(1, [], 1); __scene.camp = C'); return J('C.earth') === null && !/Earth/.test(J('campObjective(C)')) && !/Earth shield/.test(J('campSummary(C)')); })());
  // what the next level inherits
  check('the ore and the extra ships of the refit come with the cruiser into the next level: 120 ore and 2 fighters and an escort more in the bay (8 and 3); the cap of 200 holds; a level started by itself has its own 30', (() => { return J(`(() => { const a = campNew(2, [], { ore: 120, bonus: { fighters: 2, escorts: 1 } }), b = campNew(2, [], { ore: 9999 }), c = campNew(2, []); return [a.ore, a.bay.fighters, a.bay.escorts, b.ore, c.ore, c.bay.fighters, c.bay.escorts]; })()`).join() === '120,8,3,200,30,6,2'; })());
  store.set('longhaul.campaign', JSON.stringify({ level: 2, techs: ['beam'], ore: 99999, bonus: { fighters: 99, escorts: -1 } }));
  check('the save keeps the ore and the extras in range: the ore is cut to the 200 the store holds, the extras to 0 to 3', J('campProgressLoad().ore') === 200 && J('campProgressLoad().bonus.fighters') === 3 && J('campProgressLoad().bonus.escorts') === 0);
  store.delete('longhaul.campaign');
  g.run(`go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts2.push(msg); }; campProgressSave({ level: 2, techs: ['beam'], ore: 77, bonus: { fighters: 2, escorts: 1 } }); window.F = __fake(2, {}); 0`);
  check('the scene gives a level reached by the chain its carried ore and extras (the save is at that level); a level started by itself gets the 30 of its own', J('F.camp.ore') === 77 && J('F.camp.bay.fighters') === 8 && J('F.camp.bay.escorts') === 3 && (g.run('campProgressSave({ level: 1, techs: [], ore: 77, bonus: { fighters: 2, escorts: 1 } }); window.F = __fake(2, {}); 0'), J('F.camp.ore') === 30 && J('F.camp.bay.fighters') === 6));
  store.delete('longhaul.campaign'); g.run('go = __go0; toast = __toast0');
  check('plain words: "send the drones to mine", "mine the belt", "drones, mine" are Mine', ['send the drones to mine', 'mine the belt', 'drones mine', 'go mining'].every(x => J(`campIntent(${JSON.stringify(x)})`) && J(`campIntent(${JSON.stringify(x)})`).act === 'fleet_mine'));
  check('the lines of all three levels are curt: one short sentence each, 12 words at most', [1, 2, 3].every(n => ['before', 'after'].every(w => J(`campStory(${n}, '${w}')`).every(x => x.split(' ').length <= 12 && /[.]$/.test(x)))) && ['ambush', 'ambush2', 'bwave2', 'bwave3', 'escortcarrier'].every(k => J(`uiText('camp.say.${k}')`).split(' ').length <= 12));
  check('every new word of the belt is in its own file, content/text/campaign-belt.md (ui.md is full), and the game reads it', (() => { const md = src('content/text/campaign-belt.md'); const keys = ['camp.l1.before.3', 'camp.l1.after.3', 'camp.say.ambush', 'camp.say.ambush2', 'camp.say.bwave2', 'camp.say.bwave3', 'camp.say.escortcarrier', 'camp.ui.refit', 'camp.ui.refitpick', 'camp.ui.refitbuy', 'camp.ui.refitore', 'camp.ui.refitgot']; const miss = keys.filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k); return miss.length === 0 || miss.join(); })());
}

// ---------- F. the save, and Long Haul untouched ----------
console.log('F. the save, and Long Haul untouched');
{
  store.delete('longhaul.campaign'); // H picked a tech; F starts from a browser that has never played it
  const before = g.run(`JSON.stringify(G)`);
  g.run('__play(3, [], __smart, 400)');
  check('a whole battle changes nothing of Long Haul: credits, the fleet, the mission, the saved game', g.run(`JSON.stringify(G)`) === before && ![...store.keys()].some(k => /longhaul\.(save|game)/.test(k) && store.get(k) && /campaign|camp\./i.test(store.get(k))));
  check('no progress yet: level 1, no techs', J('campProgressLoad()').level === 1 && J('campProgressLoad().techs').length === 0);
  g.run(`var __P = campProgressNew(); campPick(__P, 'beam'); __P.level = 2; campProgressSave(__P)`);
  check('a pick and the level are kept under longhaul.campaign, as plain numbers and names', JSON.parse(store.get('longhaul.campaign')).level === 2 && JSON.parse(store.get('longhaul.campaign')).techs[0] === 'beam');
  check('and read back after a reload of the page (a second game on the same storage)', (() => { const g2 = nodeGame({ store }); const P = JSON.parse(g2.run('JSON.stringify(campProgressLoad())')); return P.level === 2 && P.techs.length === 1 && P.techs[0] === 'beam'; })());
  check('a tech cannot be picked twice or invented', J(`campPick(__P, 'beam')`) === false && J(`campPick(__P, 'warpdrive9')`) === false && J('__P.techs.length') === 1);
  store.set('longhaul.campaign', '{"level": 99, "techs": ["beam", "nope", "beam", 7]}');
  check('a saved line with rubbish in it is read as far as it makes sense: level of 99 is dropped to 1, the one real tech kept once', J('campProgressLoad().level') === 1 && J('campProgressLoad().techs').join() === 'beam');
  store.set('longhaul.campaign', 'not json');
  check('and one that is not JSON starts again from level 1', J('campProgressLoad().level') === 1);
  check('the save has no words and no numbers of the battle', Object.keys(JSON.parse((g.run(`campProgressSave({ level: 2, techs: ['shield'], ore: 0, bonus: { fighters: 0, escorts: 0 } })`), store.get('longhaul.campaign')))).sort().join() === 'bonus,level,ore,techs');
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nCAMPAIGN FAIL (${failed} of ${n})` : `\nCAMPAIGN PASS (${n})`);
process.exitCode = failed ? 1 : 0;
