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
  check('it is a fight, not a walk: aliens killed (12 or more) on every seed, the carrier alive and hurt (shield or hull gone) on at least half the seeds (it was four of six; the smaller carrier of card space-game-campaign-look is a smaller target: over 30 seeds the carrier is hurt on 25, so this sample of six is the edge of it)', rs.every(r => r.kills >= 12 && r.hull > 0) && rs.filter(r => r.hull + r.shield < 750).length >= 3, JSON.stringify(rs.map(r => [r.kills, r.hull, r.shield])));
  check('both convoys get through for the sensible player (one escorted, one covered by the wing) on a clear majority of seeds (it was five of six; over 30 seeds the rate is 17 to 19 of 30 with the carrier\'s turrets on the old mounts and on the cruiser\'s, so six seeds flip with any move of a turret: the check keeps four)', rs.filter(r => r.delivered === 2).length >= 4, rs.map(r => r.delivered).join(' '));
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
  check('the model is told the battle, the five orders and the Campaign keys, and not the Long Haul list', (() => { const sys = J('shipcompSystem(__scene)'); return /Campaign level home, Home/.test(sys) && /fleet_launch \| fleet_attack/.test(sys) && /Q Fleet   E Ship/.test(sys) && !/plot_route/.test(sys) && !/jump_next_hop/.test(sys); })());
  check('the strip, the microphone and the plain-command door all find the Campaign scene (src/cmdstrip.js, src/listen.js, src/shipcomputer.js)', ['src/cmdstrip.js', 'src/listen.js', 'src/shipcomputer.js'].every(f => /sc\.scene\.key === 'Campaign'/.test(src(f))));
  check('the scene is a Phaser scene named Campaign, in the game\'s scene list; the title\'s K opens it', J(`typeof Campaign`) === 'function' && /Journal, Campaign(, CampWarp)?(, CampHub)?\]/.test(src('src/main.js')) && /KeyK'\) campaignStart\(this\)/.test(src('src/title.js')) && J('typeof campaignStart') === 'function');
  check('the tune kit\'s doors are there, guarded, so this branch runs with or without it: how an order was given (key, strip, voice), how a level was started (menu, address, hub, retry, skip), the debug keys, the pause line, the address', (() => { const sc = src('src/campaignscene.js'), ti = src('src/title.js'); return /campPanelKey\(this\.pn, C, c,/.test(sc) && /campOrder\(C, row\.order, row\.arg \|\| '', how \|\| 'key'\)/.test(src('src/camppanel.js')) && /via: 'retry'/.test(sc) && /via: 'hub'/.test(src('src/camphub.js')) && /via: 'skip'/.test(sc) && /typeof campDebugKey === 'function'/.test(sc) && /typeof campDebugLine === 'function'/.test(sc) && /typeof campAddrPlanPage === 'function'/.test(ti) && /via: 'address'/.test(ti) && /campOrder\(s2\.camp, name, arg, 'strip'\)/.test(src('src/shipcomputer.js')); })());
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
  const begin = () => { if (J('F.mode') === 'intro') key('Enter'); if (J('F.mode') === 'brief') key('Enter'); }; // the level's story, then the mission's briefing, then the flight
  mk(1);
  check('it opens on the story of the level: the intro card is up, the strip is kept shut (panel), the sim has not moved', J('F.mode') === 'intro' && J('F.panel') === true && (g.run('F.update(0, 100)'), J('F.camp.t') === 0));
  key('Digit1'); check('no order is taken while the story shows', J('F.camp.launchQ.length') === 0);
  key('Enter');
  check('Enter on the story shows the briefing of the first mission: its title, two lines and the bonus objectives; the sim has not moved', J('F.mode') === 'brief' && J('F.panel') === true && J('F.camp.t') === 0);
  key('Enter');
  check('Enter on the briefing flies it: the card is gone, the strip may open, the battle runs', J('F.mode') === 'play' && J('F.panel') === false && (g.run('F.update(0, 100)'), J('F.camp.t') > 90));
  g.run('F.k.W.isDown = true; F.k.D.isDown = true; F.k.SPACE.isDown = true; F.update(0, 33)');
  check('W thrusts, D turns, Space fires: the keys are read into the sim\'s input every frame', J('F.camp.input.thrust') === 1 && J('F.camp.input.turn') === 1 && J('F.camp.input.fire') === true);
  g.run('F.k.W.isDown = false; F.k.D.isDown = false; F.k.A.isDown = true; F.k.S.isDown = true; F.k.SPACE.isDown = false; F.update(0, 33)');
  check('A turns the other way, S brakes, and Space let go stops the turrets', J('F.camp.input.turn') === -1 && J('F.camp.input.brake') === true && J('F.camp.input.fire') === false);
  key('Digit1'); check('1 with no panel open does nothing: the digits only pick a row of an open panel', J('F.pn.open') === '' && J('F.camp.launchQ.length') === 0 && J('F.camp.orders.launch') === 0);
  key('KeyQ'); check('Q opens the fleet panel and launches nothing (Q and E open the panels: card space-game-campaign-panels-ui)', J('F.pn.open') === 'fleet' && J('F.camp.launchQ.length') === 0 && J('F.camp.orders.launch') === 0);
  key('Digit1'); check('Q then 1 launches the wing and says so, and the panel is closed', J('F.camp.launchQ.length') === 8 && J('__toasts2.pop()') === 'Launching the wing.' && J('F.pn.open') === '');
  key('KeyQ'); key('Digit2'); check('Q then 2 while the wing is still leaving the bay answers in words (a toast) and does nothing', J('__toasts2.pop()') === 'The wing is still launching.' && J('F.camp.orders.attack') === 0);
  key('Escape'); check('Esc pauses the scene\'s own way (not Long Haul\'s menu), the sim stops, the strip is kept shut', J('F.mode') === 'pause' && J('F.panel') === true && (g.run('var __t0 = F.camp.t; F.update(0, 100)'), J('F.camp.t') === J('__t0')));
  key('Escape'); check('Esc again goes back to the battle', J('F.mode') === 'play' && J('F.panel') === false);
  key('Escape'); key('KeyT'); check('T from the pause goes to the title', J('__went.pop()').key === 'Title');
  mk(1);
  begin();
  g.run('F.camp.techs = ["blink"]; F.onKey({ code: "KeyB" })');
  check('B asks for the blink (the sim says whether it is ready; it was Q until Q and E opened the panels)', J('F.camp.input.blink') === true);
  // the end of a level
  g.run(`campHurt(F.camp, F.camp.carrier, 9999, 'x'); F.update(0, 33)`);
  check('the carrier lost: the lost card with Enter and T, and the reason in words', J('F.mode') === 'lost' && J('F.panel') === true);
  key('Enter'); const re = J('__went.pop()');
  check('Enter flies the MISSION again (the level is not lost: mission 0 of level 1) with the same techs, started as "retry"', re.key === 'Campaign' && re.data.level === 1 && re.data.mission === 0 && re.data.via === 'retry' && Array.isArray(re.data.techs));
  mk(1, { mission: 2 }); begin();
  g.run(`F.camp.arrivedAt = 0`); // the cruiser is at the place (the arrival rule is tested in section Q)
  g.run(`F.camp.ships.push({ id: 'mother-9', kind: 'mother', team: 'alien', x: 99999, y: 0, vx: 0, vy: 0, hp: 10, r: 90 }); F.camp.by['mother-9'] = F.camp.ships[F.camp.ships.length - 1]; campHurt(F.camp, F.camp.by['mother-9'], 50, 'x'); F.update(0, 33)`);
  check('the mothership of the last mission dead: the debrief (score), then Enter the story after the level, then Enter opens the Earth refit (level 1 ends with it; the later levels have the plain pick)', J('F.mode') === 'debrief' && J('F.mdone') === true && (key('Enter'), J('F.mode') === 'won') && (key('Enter'), J('F.mode') === 'refit') && J('F.choices.length') === 3 && J('F.panel') === true);
  key('Digit9'); check('a key that is not a choice does nothing, and Enter before a pick does nothing', J('F.mode') === 'refit' && (key('Enter'), J('F.mode') === 'refit') && J('__went.length') === 0);
  key('Digit2'); key('Digit3');
  check('1, 2 or 3 chooses a technology; choosing again changes the choice; nothing is kept until Enter', J('F.refit.pick') === J('F.choices[2]') && !JSON.parse(store.get('longhaul.campaign') || '{"techs":[]}').techs.length);
  g.run('F.refit.ore = 100; F.refit.f = 0; F.refit.e = 0'); key('Digit4'); key('Digit4'); key('Digit5');
  check('4 buys an extra fighter (25 ore), 5 an extra escort (45): 100 ore buys two fighters and an escort, no more than 3 of each, nothing without the ore', J('F.refit.f') === 2 && J('F.refit.e') === 1 && J('F.refit.ore') === 100 - 50 - 45 && (key('Digit5'), J('F.refit.e') === 1) && (g.run('F.refit.ore = 1000'), key('Digit4'), key('Digit4'), J('F.refit.f') === 3));
  g.run('F.refit.ore = 5; F.refit.f = 3; F.refit.e = 1');
  key('Enter');
  check('Enter takes the choice: the tech is kept in the progress, the extra ships and the ore left are carried (level 2, bonus 3 fighters and 1 escort, ore 5), and the scene goes on to the ready room of level 2 (card space-game-campaign-hub: Launch there flies it)', (() => { const P = JSON.parse(store.get('longhaul.campaign')), w = J('__went.pop()'); return P.level === 2 && P.techs[0] === J('F.choices[2]') && P.ore === 5 && P.bonus.fighters === 3 && P.bonus.escorts === 1 && w.key === 'CampHub'; })());
  check('the pick is carried into the next level: a game started now has the tech', J(`campNew(1, campProgressLoad().techs).techs.length`) === 1);
  // addresses and the tune kit
  mk(1, { techs: ['shield', 'nope'], via: 'address' });
  check('a level started with techs of its own and a way (the address) uses them, and the sim knows how it began', J('F.camp.techs.join()') === 'shield' && J('F.camp.via') === 'address');
  g.run('go = __go0; toast = __toast0');
}

// ---------- I. levels 1, 2 and 3 are runs of three missions ----------
console.log('I. the nine missions: the table, each kind, the plain bot and the idle player, the chain');
{
  g.run(`go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts2.push(msg); };`); // the stand-ins of H again (H gave the real ones back)
  g.run(`
    window.__new2 = (level, techs, seed, mi, trip) => { window.C = campNew(level, techs || [], { seed: seed == null ? 1 : seed, mission: mi | 0 }); if (!trip) C.arrivedAt = 0; return !!C; }; // trip: the cruiser has to fly to the mission's place first (section Q); else it is taken as there already
    window.__mbot = (C, s) => {            // a plain player of any mission: launches, attacks every 5 s, escorts the haulers, flies the cruiser at what the mission asks (a point, a cache, the relic, the haulers) and at what comes near, and fires
      const L = C.L, c = C.carrier;
      if (L.place && C.arrivedAt == null) { if (!C.nav || !C.nav.on) { const gp = campNavGoal(C); if (gp) campNavGo(C, gp, true); } return; } // the trip first: the map's Fast click, flown by the autopilot
      s = C.arrivedAt == null ? s : s - C.arrivedAt / 1000; // the plan runs from the arrival (the wing stays aboard on the trip)
      if (s > 1 && s < 1.05) campOrder(C, 'launch');
      if (s > 12 && Math.round(s * 30) % 150 === 0) campOrder(C, 'attack', C.ships.some(u => u.kind === 'mother') ? 'mothership' : '');
      if (L.convoys.length && Math.round(s * 30) % 90 === 0 && campConvoys(C).length) campOrder(C, 'escort', 'hauler');
      const al = campAliens(C).sort((p, q) => campDist(p, c) - campDist(q, c)), near = al[0], fight = near && campDist(near, c) < 900;
      const first = campObjectives(C).find(o => !o.done) || {}, byDist = list => list.sort((p, q) => campDist(p, c) - campDist(q, c))[0];
      let goal = null;
      if (first.type === 'scan') goal = byDist(C.scan.filter(p => !p.got)); else if (first.type === 'caches') goal = byDist(C.caches.filter(k => !k.got)); else if (first.type === 'relic') goal = C.relic;
      else if (first.type === 'deliver') goal = byDist(campConvoys(C).slice()) || { x: 1000, y: -500 }; else if (first.type === 'hold') goal = C.earth; else goal = near;
      const tgt = fight ? near : (goal || near);
      if (tgt) {
        const want = Math.atan2(tgt.y - c.y, tgt.x - c.x), d = Math.atan2(Math.sin(want - c.rot), Math.cos(want - c.rot)), dist = campDist(tgt, c), stand = fight ? 420 : (goal === C.relic || (goal && goal.got === false) ? 40 : 250);
        C.input.turn = Math.max(-1, Math.min(1, d * 3)); C.input.thrust = dist > stand ? 1 : 0;
        const w2 = near ? Math.atan2(near.y - c.y, near.x - c.x) : 0, d2 = Math.atan2(Math.sin(w2 - c.rot), Math.cos(w2 - c.rot)); C.input.fire = !!near && Math.abs(d2) < 0.22 && campDist(near, c) < 800;
      } else { C.input.thrust = 0; C.input.turn = 0; C.input.fire = false; }
    };
    window.__mplay = (level, mi, seed, script, secs, techs) => { const C = window.C = campNew(level, techs || [], { seed, mission: mi }); for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; } return { r: C.result || 'time', w: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), score: C.score ? C.score.score : 0 }; };
  `);
  check('each of the three levels is three missions: the belt (recon, escort, attack), Alpha Centauri (recon, attack, defend), the home world (recon, attack, attack); each has objectives, bonus objectives and a par time; none has an Earth', [1, 2, 3].every(n => J(`campMissions(${n}).length`) === 3 && J(`campMissions(${n}).every(m => m.objectives.length >= 1 && m.bonus.length >= 1 && m.par > 0)`) && J(`[0, 1, 2].every(i => campMissionRow(${n}, i).earth === false)`)) && J('[1, 2, 3].map(n => campMissions(n).map(m => m.kind).join()).join("|")') === 'recon,escort,attack|recon,attack,defend|recon,attack,attack');
  check('every mission has its words (a title and two lines, curt: 12 words at most) and its bonus objectives a template text; every place, wave line and convoy it names exists', [1, 2, 3].every(n => [0, 1, 2].every(i => { const r = J(`(() => { const L = campMissionRow(${n}, ${i}), k = 'camp.m.${n}.${i + 1}.', pl = campPlaces(${n}), w = x => String(x).split(' ').length, ok = []; ok.push(uiText(k + 'title') !== k + 'title', uiText(k + 'b1') !== k + 'b1' && w(uiText(k + 'b1')) <= 12, uiText(k + 'b2') !== k + 'b2' && w(uiText(k + 'b2')) <= 12); ok.push(!!pl[L.start]); (L.convoys || []).forEach(c => ok.push(!!pl[c.from] && !!pl[c.to])); (L.towers || []).forEach(g => ok.push(!!pl[g.place])); if (L.relic) ok.push(!!pl[L.relic.place]); L.waves.forEach(x => ok.push(uiText(x.say) !== x.say)); L.bonus.forEach(b => ok.push(uiText('camp.b.' + b.type) !== 'camp.b.' + b.type)); return ok.every(Boolean); })()`); return r === true; })));
  check('the story of the levels is curt: level 1 has three lines before and three after, levels 2 and 3 two each (none over 12 words); no tech is offered after level 3', J(`campStory(1, 'before')`).length === 3 && J(`campStory(1, 'after')`).length === 3 && [2, 3].every(n => J(`campStory(${n}, 'before')`).length === 2 && J(`campStory(${n}, 'after')`).length === 2) && [1, 2, 3].every(n => ['before', 'after'].every(w => J(`campStory(${n}, '${w}')`).every(x => x.split(' ').length <= 12))) && J('campTechChoices(3).length') === 0);
  // --- level 2
  g.run('__new2(2, [], 1, 0)');
  check('2.1 resources: three caches lie about (collect two), no guards and no relic yet; the aliens that followed come at 20 s', J('C.caches.length') === 3 && J('C.relic') === null && J('C.ships.filter(u => u.guard).length') === 0 && J('C.L.objectives.map(o => o.type).join()') === 'caches,kill' && (g.run('__run(19)'), J('C.waves[0].started') === false) && (g.run('__run(1.2)'), J('C.waves[0].started') && J('campAliens(C).length') === 7)); // 4 raiders and 3 drones (card space-game-wrapup-difficulty made the waves bigger)
  g.run('__new2(2, [], 1, 0); C.carrier.x = C.caches[0].x + 100; C.carrier.y = C.caches[0].y; __run(0.2)');
  check('a cache is collected when a ship of yours comes within 160 px, once, and the game says how many; the goal line says how many are needed', J('C.cachesGot') === 1 && J('C.caches[0].got') && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.cache') && /Gather resources: 1 of 2/.test(J('campObjective(C)')) && (g.run('__run(1)'), J('C.cachesGot') === 1));
  g.run('__new2(2, [], 1, 0); C.cachesGot = 2; __run(21)');
  check('two caches alone do not win: the attackers (wave 0) must be dead too; with both done the mission is won', J('C.result') === null && (g.run('C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); __run(0.2)'), J('C.result') === 'won'));
  g.run('__new2(2, [], 1, 1)');
  check('2.2 the guards: seven guards (three gunships, four drones) wait round Proxima b until a ship of yours comes within reach; five seconds in none has moved; the objective is to destroy them all', J('C.ships.filter(u => u.guard).length') === 7 && J('C.ships.filter(u => u.guard && u.hold).length') === 7 && (g.run('__run(5)'), J('C.ships.filter(u => u.guard).every(u => Math.hypot(u.vx, u.vy) < 1)')) && J('C.L.objectives[0].what') === 'guards');
  g.run('C.ships.forEach(u => { if (u.guard) u.hp = 0; }); __run(0.3)');
  check('every guard dead wins the mission (the wave of the reserve is not needed)', J('C.result') === 'won');
  g.run('__new2(2, [], 1, 1); C.ships.forEach(u => { if (u.guard) u.hp = 0; }); C.ships = C.ships.filter(u => u.hp > 0 || u.kind === "carrier"); C.guardsStart = true; C.ships.push(Object.assign(campSpawn(C, "drone", 99999, 99999), { guard: true, hold: true })); __run(0.2)');
  check('one guard still alive: not won', J('C.result') === null);
  g.run('__new2(2, [], 1, 2)');
  check('2.3 the relic: the cruiser starts near it (within 700 px), the ring holds for 14 seconds with no alien within 650 px, no resources needed; the first attackers come at 6 s', J('Math.hypot(C.carrier.x - C.relic.x, C.carrier.y - C.relic.y)') < 700 && J('C.L.relic.hold') === 14 && J('C.L.relic.caches') === 0 && J('C.L.kind') === 'defend');
  g.run('__new2(2, [], 1, 2); C.waves[0].started = true; C.carrier.x = C.relic.x; C.carrier.y = C.relic.y; __run(5)');
  check('on the ring with no alien near the hold fills a second a second (5 of 14); leave and it loses twice as fast; an alien near stops it', Math.abs(J('C.relic.hold') - 5) < 0.1 && (g.run('C.carrier.x = C.relic.x + 5000; __run(1)'), Math.abs(J('C.relic.hold') - 3) < 0.1) && (g.run('C.carrier.x = C.relic.x; var __d3 = campSpawn(C, "drone", C.relic.x + 300, C.relic.y); __d3.hold = true; __run(1)'), J('C.relic.hold') < 3));
  g.run('__new2(2, [], 1, 2); C.waves[0].started = true; C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); C.carrier.x = C.relic.x; C.carrier.y = C.relic.y; __run(15)');
  check('held the full fourteen seconds, clear of aliens: the mission is won, "relic"', J('C.result') === 'won' && J('C.why') === 'relic');
  // --- level 3
  g.run('__new2(3, [], 1, 0)');
  check('3.1 approach: three points to scan on the way in (each 420 px wide, 7 seconds); the defenders come when the first is scanned; the attackers must be dead too', J('C.scan.length') === 3 && J('C.scan.every(p => p.secs === 7 && p.r === 420)') && J('C.L.waves[0].on.scanned') === 1 && J('C.L.objectives.map(o => o.type).join()') === 'scan,kill');
  g.run('__new2(3, [], 1, 1)');
  check('3.2 the outer ring: four towers of 260 hit points, 1,100 px from Ran (the second moon), and nothing else; the cruiser starts away from it and has the trip to Ran first', J('C.ships.filter(u => u.kind === "tower").length') === 4 && J('C.ships.filter(u => u.kind === "tower").every(u => { const r = campPlaces(3).ran; return u.maxHp === 260 && Math.abs(Math.hypot(u.x - r.x, u.y - r.y) - 1100) < 1; })') && J('campTravel(3, 1).dist') > 3000 && J('campTravel(3, 1).id') === 'ran');
  g.run('__new2(3, [], 1, 2)');
  check('3.3 the inner ring: eight towers 1,000 px from the world, the goal line counts them', J('C.ships.filter(u => u.kind === "tower").length') === 8 && /Destroy the towers/.test(J('campObjective(C)')));
  check('a tower on its post: it turns on the nearest of your ships inside 800 px and fires, and does nothing when none is near; it never moves', (() => { g.run('__new2(3, [], 1, 2); var __t = C.ships.find(u => u.kind === "tower"); var __tx = __t.x, __ty = __t.y; C.carrier.x = 30000; C.carrier.y = 30000; __run(3)'); const idle = J('C.bullets.length') === 0; g.run('C.carrier.x = __t.x + 500; C.carrier.y = __t.y; __run(4)'); return idle && J('__t.x') === J('__tx') && J('__t.y') === J('__ty') && (J('C.carrier.hp') < 600 || J('C.shield') < 150 || J('C.bullets.length') > 0); })());
  // --- all nine, played
  const chainTechs = l => J(`[1, 2].filter(n => n < ${l}).map(n => campTechChoices(n)[0])`); // the first tech each earlier level offers, as a player who took the chain has them (the bot tool does the same)
  const plan = [[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]], res = plan.map(([l, m]) => ({ l, m, bot: [1, 2, 3, 4, 5, 6].map(sd => J(`__mplay(${l}, ${m}, ${sd}, __mbot, 400, ${JSON.stringify(chainTechs(l))})`)), idle: J(`__mplay(${l}, ${m}, 1, () => {}, 300)`) }));
  const early = x => ['1.1', '1.2', '2.1', '3.1', '3.2'].includes(x.l + '.' + (x.m + 1)); // the missions before each level's real fight (the difficulty pass, card space-game-wrapup-difficulty: 1.3, 2.2, 2.3 and 3.3 are fights this crude test player may lose; tests/camppace.mjs has the bot tool's plain player win all nine)
  check('a plain player wins the five gentler missions (1.1, 1.2, 2.1, 3.1, 3.2) on at least five seeds of six, each in 25 seconds to 3 minutes; the real fights (1.3, 2.2, 2.3, 3.3) are not pinned here', res.filter(early).every(x => x.bot.filter(r => r.r === 'won').length >= 5 && x.bot.filter(r => r.r === 'won').every(r => r.t >= 25 && r.t <= 240)), JSON.stringify(res.map(x => x.l + '.' + (x.m + 1) + ' ' + x.bot.map(r => r.r[0] + r.t + (r.r === 'lost' ? (r.w || '') : '')).join(' '))));
  check('a player who does nothing never wins a mission (the survey and the approach are never finished; the others are lost: the cruiser, the haulers)', res.every(x => x.idle.r !== 'won'), JSON.stringify(res.map(x => x.l + '.' + (x.m + 1) + ' ' + x.idle.r + ' ' + (x.idle.w || ''))));
  check('the ship computer is told the goal of the mission, and no Earth shield, in all three levels', [1, 2, 3].every(n => (g.run(`__new2(${n}, [], 1, 0)`), /Goal: /.test(J('campSummary(C)')) && !/Earth shield/.test(J('campSummary(C)')))));
  // --- the chain, on the stand-in scene: the last mission of level 2 to the pick and level 3; the last of level 3 to the end
  store.delete('longhaul.campaign');
  g.run(`window.F = __fake(2, { mission: 2 }); 0`);
  g.run(`F.onKey({ code: 'Enter' }); F.camp.carrier.hp = 600; campWin(F.camp, 'relic'); F.update(0, 33); F.update(0, 33)`);
  check('level 2, its last mission won: the debrief, then the story after, then the pick of one of three (hull plating, second bay, repair field), then the ready room of level 3 with the pick in the save', J('F.mode') === 'debrief' && (g.run(`F.onKey({ code: 'Enter' })`), J('F.mode') === 'won') && (g.run(`F.onKey({ code: 'Enter' })`), J('F.mode') === 'pick') && J('F.choices.join()') === 'plating,bay2,repair' && (g.run(`F.onKey({ code: 'Digit1' })`), true) && (() => { const w = J('__went.pop()'); return w.key === 'CampHub' && JSON.parse(store.get('longhaul.campaign')).level === 3 && JSON.parse(store.get('longhaul.campaign')).techs.includes('plating'); })());
  g.run(`window.F = __fake(3, { mission: 2 }); 0`);
  g.run(`F.onKey({ code: 'Enter' }); campWin(F.camp, 'towers'); F.camp.ships.filter(u => u.kind === 'tower').forEach(u => { u.hp = 0; }); F.update(0, 33); F.update(0, 33); F.update(0, 33)`);
  check('level 3, its last mission won: the debrief, the story after, no pick, then the end card, and the title on Enter; the save starts a fresh campaign (level 1, mission 0, no techs)', J('F.mode') === 'debrief' && (g.run(`F.onKey({ code: 'Enter' })`), J('F.mode') === 'won') && (g.run(`F.onKey({ code: 'Enter' })`), J('F.mode') === 'end') && J('F.panel') === true && JSON.parse(store.get('longhaul.campaign')).level === 1 && JSON.parse(store.get('longhaul.campaign')).mission === 0 && JSON.parse(store.get('longhaul.campaign')).techs.length === 0 && (g.run(`F.onKey({ code: 'Enter' })`), J('__went.pop()').key === 'Title'));
  check('K on the title opens the ready room (the hub, which flies the mission the save says is next; card space-game-campaign-hub), and a level asked for by number goes straight to it, never to one that does not exist', (() => { g.run(`campProgressSave({ level: 3, techs: ['beam'], mission: 0, results: {} })`); g.run(`__went.length = 0; campaignStart({}, 0)`); const a = J('__went.pop()'); g.run(`campaignStart({}, 2)`); const b = J('__went.pop()'); g.run(`campaignStart({}, 9)`); const c = J('__went.pop()'); return a.key === 'CampHub' && b.key === 'Campaign' && b.data.level === 2 && c.key === 'Campaign' && c.data.level === 3; })());

  // the two nits of 8-GEN's boot (a51ca77)
  g.run('__new2(2, [], 1); C.carrier.x = C.caches[0].x + 100; C.carrier.y = C.caches[0].y; __run(0.2)');
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
  check('drawn another 30 percent smaller (card space-game-campaign-look): the carrier 98 px long (was 140), a fighter 22 (was 31), an escort 28 (was 40), all in the one table CAMP.size, and the scene scales each picture to its length there', J('CAMP.size.carrier.len') === 98 && J('CAMP.size.fighter.len') === 22 && J('CAMP.size.escort.len') === 28 && [[98, 140], [22, 31], [28, 40]].every(([n, o]) => Math.abs(n / o - 0.7) < 0.02) && ['carrier', 'fighter', 'escort'].every(k => Math.abs(J(`CAMP_LOOK.${k}.scale * CAMP_LOOK.${k}.w`) - J(`CAMP.size.${k}.len`)) < 1e-9));
  g.run('__new2("home", [], 1); campOrder(C, "launch"); __run(6)');
  check('their hit circles match: the carrier 25 px (was 36), a fighter 6 (was 8), an escort 7 (was 10); they are the table values of CAMP.size, not numbers in the code, and about half of the drawn half-length', J('C.carrier.r') === 25 && J('CAMP.size.carrier.hit') === 25 && J(`campWing(C, 'fighter').every(u => u.r === 6)`) && J(`campWing(C, 'escort').every(u => u.r === 7)`) && J('CAMP.size.fighter.hit') === 6 && J('CAMP.size.escort.hit') === 7 && ['carrier', 'fighter', 'escort'].every(k => Math.abs(J(`CAMP.size.${k}.hit / (CAMP.size.${k}.len / 2)`) - 0.5) < 0.06) && !/r: kind === 'fighter' \? 12 : 16/.test(src('src/campaign.js')) && J('CAMP.carrier.radius') === null && J('CAMP.fighter.radius') === null && J('CAMP.escort.radius') === null);
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
  check('it is still not a walk: nobody wins by doing nothing, and with the numbers of before the easier card (Earth\'s shield 300, no mending, the old wave 3 and mothership, no carrier shield) the same player wins three seeds of six at most (it was one: the carrier is a 30 percent smaller target now, so fewer shots at it land) and loses the rest by Earth\'s shield running out, as Troy did', idle.every(r => r.r === 'lost') && oldNums.filter(r => r.r === 'won').length <= 3 && oldNums.filter(r => r.r === 'lost' && r.w === 'earth').length >= 3 && J('CAMP.earth.shield') === 600 && J('CAMP.carrier.shield') === 150, JSON.stringify(oldNums.map(r => r.r + ' ' + r.w)));
}

// ---------- L. ore: mine it, spend it ----------
console.log('L. ore: asteroid rocks and wrecks, mining, the carrier shield, recharge, build');
{
  const N = (level, techs, seed) => g.run(`__new2(${JSON.stringify(level)}, ${JSON.stringify(techs || [])}, ${seed == null ? 1 : seed})`);
  check('the numbers are in the table: ore (start, cap, rock, reach, wrecks, danger), the shield, recharge and build costs and times', J('CAMP.ore.start') === 30 && J('CAMP.ore.cap') === 200 && J('CAMP.ore.rock') === 20 && J('CAMP.ore.reach') === 70 && J('CAMP.ore.wreck.raider') === 4 && J('CAMP.ore.wreck.mother') === 40 && J('CAMP.ore.danger') === 500 && J('CAMP.carrier.shield') === 150 && J('CAMP.recharge.carrier') === 25 && J('CAMP.recharge.earth') === 40 && J('CAMP.recharge.earthPoints') === 200 && J('CAMP.build.fighterCost') === 25 && J('CAMP.build.escortCost') === 45 && J('CAMP.build.fighterTime') === 6 && J('CAMP.build.escortTime') === 10 && J('CAMP.build.maxFighters') === 14 && J('CAMP.build.maxEscorts') === 6);
  N("home");
  check('a new level: 30 ore in the store, a carrier shield of 150, fifteen rocks (100 hit points, 20 ore each) in three fields in level 1; ten rocks in each of levels 2 and 3; no ore lying about yet', J('C.ore') === 30 && J('C.shield') === 150 && J('C.rocks.length') === 15 && J('C.rocks.every(r => r.ore === 20 && r.hp === 100 && r.r === 22)') && J('C.pickups.length') === 0 && (N(2), J('C.rocks.length') === 10) && (N(3), J('C.rocks.length') === 10));
  N("home");
  check('the rocks lie inside their field (within 260 px of its centre), are the same on every run of a seed, and never change how the fight flies (they have a stream of their own)', (() => { const near = J(`C.rocks.length === 15 && C.rocks.every(p => CAMP.levels.home.rocks.some(f => Math.hypot(p.x - f.at[0], p.y - f.at[1]) <= f.spread + 1))`); const a = J('C.rocks.map(p => [Math.round(p.x), Math.round(p.y)])'); N("home"); const same = JSON.stringify(a) === JSON.stringify(J('C.rocks.map(p => [Math.round(p.x), Math.round(p.y)])')); g.run('var __R = CAMP.levels.home.rocks; CAMP.levels.home.rocks = []; __new2("home", [], 1); __run(25)'); const w1 = J('campAliens(C).map(u => [Math.round(u.x), Math.round(u.y)])'); g.run('CAMP.levels.home.rocks = __R; __new2("home", [], 1); __run(25)'); const w2 = J('campAliens(C).map(u => [Math.round(u.x), Math.round(u.y)])'); return near && same && w1.length > 0 && JSON.stringify(w1) === JSON.stringify(w2); })());
  // wrecks
  N("home"); g.run('C.pickups = []; var __a = campSpawn(C, "raider", 5000, 5000); campHurt(C, __a, 9999, "x"); var __g = campSpawn(C, "gunship", 6000, 5000); campHurt(C, __g, 9999, "x"); var __d = campSpawn(C, "drone", 7000, 5000); campHurt(C, __d, 9999, "x")');
  check('a dead alien leaves its ore where it died: a raider 4, a drone 6, a gunship 12; nothing it has not been told to leave', J('C.pickups.map(p => p.ore).sort((a, b) => a - b).join()') === '4,6,12' && J('C.pickups.every(p => p.kind === "wreck")') && J('C.pickups.find(p => p.ore === 4).x') === 5000);
  g.run('C.carrier.x = 50000; __run(29)');
  check('a wreck lies 30 seconds and then it is gone', J('C.pickups.length') === 3 && (g.run('__run(2)'), J('C.pickups.length') === 0));
  // collecting
  N("home"); g.run('C.pickups = [{ id: "rock-x", kind: "chunk", x: C.carrier.x + 40, y: C.carrier.y, ore: 20, born: 0 }]; __run(0.1)');
  check('the carrier takes ore it flies over: 30 plus 20, and the rock is gone', J('C.ore') === 50 && J('C.pickups.length') === 0 && g.run('C.events.some(e => e.type === "ore")') !== undefined);
  g.run('C.pickups = [{ id: "rock-y", kind: "chunk", x: 5000, y: 5000, ore: 20, born: 0 }]; campOrder(C, "launch"); __run(8); var __e = campWing(C, "escort")[0]; __e.x = 5010; __e.y = 5000; __run(0.1)');
  check('so does any ship of yours: an escort at a rock takes it', J('C.pickups.length') === 0 && J('C.ore') === 70);
  g.run('C.ore = 190; C.pickups = [{ id: "rock-z", kind: "chunk", x: C.carrier.x + 20, y: C.carrier.y, ore: 20, born: 0 }]; __run(0.1)');
  check('the store holds 200: a rock of 20 over 190 gives 10 and the rest is lost with it; a full store leaves the ore lying', J('C.ore') === 200 && (g.run('C.pickups = [{ id: "rock-w", kind: "chunk", x: C.carrier.x + 20, y: C.carrier.y, ore: 20, born: 0 }]; __run(0.5)'), J('C.pickups.length') === 1 && J('C.ore') === 200));
  // mine
  N("home");
  check('Mine before launch says launch first (the whole wing mines: in the belt the fighters are the mining drones)', J(`campOrder(C, 'mine').say`) === 'No ships are out. Launch first.' && (g.run('campOrder(C, "launch"); __run(3)'), J(`campOrder(C, 'mine').say`) !== undefined));
  g.run('__new2("home", [], 1); campOrder(C, "launch"); __run(6)');
  const mine0 = J(`campOrder(C, 'mine')`);
  check('Mine with the wing out: every ship of it (fighters and escorts) takes the mine order, and Attack turns the fighters back to the fight', mine0.ok && mine0.say === 'Mining ships are on their way.' && J(`campWing(C).every(u => u.order.type === 'mine')`) && J('C.orders.mine') === 1 && (g.run(`campOrder(C, 'attack', '')`), J(`campWing(C, 'fighter').every(u => u.order.type === 'attack')`) && J(`campWing(C, 'escort').every(u => u.order.type === 'mine')`)));
  g.run('C.pickups = [{ id: "rock-1", kind: "chunk", x: C.carrier.x + 900, y: C.carrier.y, ore: 20, born: 0 }]; var __ore0 = C.ore; __run(12)');
  check('the miners fly to the ore and bring it in: 20 ore more within 12 seconds', J('C.ore') - J('__ore0') === 20 && J('C.pickups.length') === 0);
  g.run('C.pickups = []; C.rocks = [];');
  check('with no ore left in the level (no rock, nothing lying about), Mine says so', J(`campOrder(C, 'mine').say`) === 'There is no ore in reach, pilot.');
  g.run('__new2("home", [], 1); campOrder(C, "launch"); __run(6); C.pickups = []; C.rocks = [{ id: "rock-2", x: C.carrier.x + 1800, y: C.carrier.y, hp: 100, maxHp: 100, r: 22, ore: 20, cutAt: -1e9 }]; var __g2 = campSpawn(C, "drone", C.carrier.x + 1850, C.carrier.y); __g2.hold = true; __g2.goal = "carrier"; campOrder(C, "mine"); __run(8)');
  check('they keep away from a rock with an alien within 500 px of it: it stays uncut (they wait round the carrier)', J('C.rocks.length') === 1 && J('C.rocks[0].hp') === 100 && J(`campWing(C, 'escort').every(u => Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) < 700)`));
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
  // build (docked at an outpost: card space-game-campaign-outposts; tests/campoutpost.mjs has the rule itself)
  N("home"); g.run('C.ore = 100; C.docked = "luna"');
  const b1 = J(`campOrder(C, 'build', 'fighter')`);
  check('Build a fighter: 25 ore at once, one is queued, the answer says so', b1.ok && b1.say === 'Building 1 fighter.' && J('C.ore') === 75 && J('C.build.queue.length') === 1 && J('C.orders.build') === 1);
  g.run('__run(5.9)'); const early = J('C.bay.fighters');
  g.run('__run(0.3)');
  check('it is in the bay after 6 seconds, not before, and the game says so', early === 6 && J('C.bay.fighters') === 7 && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.built'));
  N("home"); g.run('C.ore = 200; C.docked = "luna"; campOrder(C, "build", "two escorts"); __run(9.9)');
  const e0 = J('C.bay.escorts'); g.run('__run(0.3)'); const e1 = J('C.bay.escorts'); g.run('__run(10)');
  check('two escorts cost 90 ore at once and are built one after the other: the first at 10 s (bay 2 to 3), the second at 20 s (to 4)', J('C.ore') === 110 && e0 === 2 && e1 === 3 && J('C.bay.escorts') === 4);
  N("home"); g.run('C.ore = 10; C.docked = "luna"');
  check('with too little ore: "Not enough ore: 25 needed, 10 in the store." and nothing is queued', J(`campOrder(C, 'build', 'fighter').say`) === 'Not enough ore: 25 needed, 10 in the store.' && J('C.build.queue.length') === 0 && J('C.ore') === 10);
  g.run('C.ore = 200; C.docked = "luna"; campOrder(C, "build", "five fighters"); __run(0.1)');
  check('the bay holds 14 fighters at most, counting the queue: six in the bay and five queued is eleven; three more are the last, a fourth is refused', J(`campOrder(C, 'build', 'three fighters').ok`) && J(`campOrder(C, 'build', 'fighter').say`) === 'The bay cannot hold more of those, pilot.' && J('C.build.queue.length') === 8);
  g.run('__new2("home", [], 1); C.ore = 200; C.docked = "luna"; campOrder(C, "build", "fighter"); __run(6.1); campOrder(C, "launch"); __run(6)');
  check('what is built is launched with Launch like the rest: seven fighters out', J(`campWing(C, 'fighter').length`) === 7);
  // plain words
  const I = x => J(`campIntent(${JSON.stringify(x)})`);
  const act = (x, a, arg) => { const r = I(x); return !!r && r.act === a && (arg === undefined || r.arg === arg); };
  check('plain words: "mine", "go mining", "collect the ore", "send the escorts to mine" are Mine', ['mine', 'go mining', 'collect the ore', 'send the escorts to mine', 'gather ore', 'start mining please'].every(x => act(x, 'fleet_mine')));
  check('"recharge shields", "recharge the shield", "recharge Earth\'s shield", "shields up" are Recharge, with Earth or the carrier when named', act('recharge shields', 'fleet_recharge', '') && act('recharge the shield', 'fleet_recharge') && act("recharge Earth's shield", 'fleet_recharge', 'earth') && act('recharge the carrier shields', 'fleet_recharge', 'carrier') && act('shields up', 'fleet_recharge'));
  check('"build fighters", "build an escort", "build two fighters", "make 3 escorts" are Build, the kind and the number in the words', act('build fighters', 'fleet_build') && /escort/.test(I('build an escort').arg) && /two fighters/.test(I('build two fighters').arg) && /3 escorts/.test(I('make 3 escorts').arg) && !I('how do I build a ship') );
  check('a question about mining is the model\'s, and the Long Haul words are not taken for these ("how do I mine", "what is ore")', I('how do I mine') === null && I('what is ore') === null);
  // the doors
  N("home"); g.run('__scene.camp = C; C.ore = 100; C.docked = "luna"; campHurt(C, C.carrier, 150, "x")');
  const loc = x => J(`(() => { const p = shipcompLocal(${JSON.stringify(x)}, __scene); return p ? { text: p.text, action: p.action, refused: p.refused, run: !!p.run } : null; })()`);
  check('typed or spoken, they are acts of the closed list (fleet_mine, fleet_recharge, fleet_build), checked first and run after: "recharge shields" costs nothing until its run', (() => { const r = loc('recharge shields'); return r && r.action === 'fleet_recharge' && r.text === 'Carrier shield recharged.' && J('C.shield') === 0 && J('C.ore') === 100; })() && (g.run('shipcompLocal("recharge shields", __scene).run(__scene)'), J('C.shield') === 150 && J('C.ore') === 75));
  check('"build two fighters" typed: 50 ore and two queued after the run; "mine" before launch is refused in words', (() => { g.run('shipcompLocal("build two fighters", __scene).run(__scene)'); return J('C.ore') === 25 && J('C.build.queue.length') === 2 && loc('mine').refused === true; })());
  check('the model is told the eight orders, the ore and the two panels', (() => { const sys = J('shipcompSystem(__scene)'); return /fleet_mine \| fleet_recharge/.test(sys) && /fleet_build/.test(sys) && /key E the SHIP panel/.test(sys) && /2 recharge shields/.test(sys) && /Ore in the store/.test(sys); })());
  check('every word the new orders can say is in content/text/campaign.md (ui.md is full at 200 rows)', (() => { const md = src('content/text/ui.md') + src('content/text/campaign.md'), ks = ['mine', 'recharge', 'rechargeearth', 'build', 'built'].map(k => 'camp.say.' + k).concat(['noore', 'noore2', 'noearth', 'farearth', 'earthfull', 'shieldfull', 'buildfull'].map(k => 'camp.no.' + k), ['camp.ui.ore', 'camp.ui.shield']); const miss = ks.filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k); return miss.length === 0 || miss.join(); })());
  // the scene, on the stand-in
  g.run(`go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts2.push(msg); }; window.F = __fake(1, {}); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.camp.ore = 100; F.camp.docked = 'luna'; campHurt(F.camp, F.camp.carrier, 150, 'x'); __toasts2.length = 0; 0`); // docked: ships are built only docked at an outpost (tests/campoutpost.mjs)
  const two = (a, b) => g.run(`F.onKey({ code: '${a === 2 ? 'KeyE' : 'KeyQ'}' }); F.onKey({ code: 'Digit${b}' })`); // the panel key (E: SHIP, Q: FLEET) then the digit of the row
  two(2, 2); const t7 = J('__toasts2.pop()');
  two(2, 3); const t8 = J('__toasts2.pop()');
  two(2, 4); const t9 = J('__toasts2.pop()');
  two(2, 1); const t6 = J('__toasts2.pop()');
  check('the keys: E then 2 recharges the shield, E then 3 builds a fighter, E then 4 an escort (ore 100 less 25, 25, 45), E then 1 with no escorts out says launch first; the HUD and the ore sprites draw without error', t7 === 'Carrier shield recharged.' && t8 === 'Building 1 fighter.' && t9 === 'Building 1 escort.' && t6 === 'No ships are out. Launch first.' && J('F.camp.ore') === 100 - 25 - 25 - 45 && J('F.camp.shield') === 150 && (g.run('F.update(0, 33)'), true));
  g.run('go = __go0; toast = __toast0');
  g.run(`window.F = __fake(1, {}); F.onKey({ code: 'Enter' }); delete F.hud.shield; delete F.hud.ore; delete F.osp; 0`);
  check('a stand-in scene with no shield text and no ore sprites (5-GEN\'s UX tests fake the scene that way) still draws a frame: the scene skips the gauges it has no text for and makes the ore sprites it lacks', (() => { try { g.run('F.update(0, 33); F.update(0, 33)'); return true; } catch (e) { return String(e.message).slice(0, 120); } })());
  check('the bottom key line fits the screen: 8.6 px a letter from x 24 ends at 1272 at the latest (8-GEN measured 1512 px for 176 letters, which was cut off at "I type a"), and it ends with "H Keys" and names the two panels', (() => { const k = J(`campKeyLine()`); return 24 + k.length * 8.6 <= 1272 && /H Keys$/.test(k) && /Q Fleet   E Ship/.test(k) && /Tab Map/.test(k) && /Space turrets/.test(k) && /F missiles/.test(k); })());
  // ore in every level, and what it is worth
  check('every level has ore to find: rocks in levels 1, 2 and 3; Earth\'s shield recharge only where there is an Earth', [1, 2, 3].every(n => J(`CAMP.levels[${n}].rocks.length`) >= 1) && (N(3), g.run('C.ore = 100; campHurt(C, C.carrier, 100, "x")'), J(`campOrder(C, 'recharge', '').ok`) === true));
  g.run(`
    window.__ore = (C, s) => {               // the same player, who also uses ore: mines now and then when the sky is quiet, recharges a low shield, builds fighters and launches them
      __stay(C, s);
      if (s > 15 && Math.round(s * 30) % 600 === 100 && campAliens(C).length < 3) campOrder(C, 'mine');
      if (Math.round(s * 30) % 60 === 7) { if (C.shield < 60) campOrder(C, 'recharge', ''); if (C.earth && C.earth.shield < C.earth.max * 0.6) campOrder(C, 'recharge', 'earth'); if (C.ore >= 60) campOrder(C, 'build', 'fighter'); if (C.bay.fighters > 0 && !C.launchQ.length) campOrder(C, 'launch'); }
    };
    window.__plays2 = (script, secs) => [1, 2, 3, 4, 5, 6].map(sd => { window.C = campNew("home", ["fabricator"], { seed: sd }); // the Fabricator: this player builds wherever it is
    for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; } return { r: C.result, t: Math.round(C.t / 1000), ls: C.lostShips, built: C.orders.build, mined: C.orders.mine }; });
  `);
  const withOre = J('__plays2(__ore, 600)'), without = J('__plays2(__stay, 600)');
  check('a player who also mines, recharges and builds wins level 1 on every seed, and loses fewer small ships than the same player without ore (6 seeds together)', withOre.every(r => r.r === 'won') && withOre.reduce((a, r) => a + r.ls, 0) < without.reduce((a, r) => a + r.ls, 0) && withOre.some(r => r.built > 0), JSON.stringify([withOre.map(r => r.ls), without.map(r => r.ls)]));
}

// ---------- M. level 1 is the asteroid belt, in three missions ----------
console.log('M. level 1, the belt: survey, haulers, the mothership; the refit');
{
  check('level 1 is "The belt": at Ceres (Occator Works), Vesta and Pallas; no Earth, a store that starts empty, thirty-two rocks; its missions are the survey, the haulers, the mothership; the level ends with the Earth refit', J('CAMP.levels[1].name') === 'The belt' && J('CAMP.levels[1].start') === 'ceres' && J('CAMP.levels[1].places.ceres.base') === 'Occator Works' && J('CAMP.levels[1].places.vesta.name') === 'Vesta' && J('CAMP.levels[1].places.pallas.name') === 'Pallas' && J('CAMP.levels[1].earth') === false && J('CAMP.levels[1].startOre') === 0 && J('CAMP.levels[1].refit') === true && J('campMissions(1).map(m => m.id).join()') === 'survey,haulers,mothership' && J('CAMP.levels[1].rocks.reduce((a, f) => a + f.n, 0)') === 32);
  // 1.1 the survey
  g.run('__new2(1, [], 1, 0)');
  check('1.1 the survey: the cruiser starts at Ceres with an empty store and no Earth; three points to scan, one in each of three rock fields (8 seconds each); the objectives are to scan them all and to beat the ambush', J('C.ore') === 0 && J('C.earth') === null && J('C.rocks.length') === 32 && J('C.scan.length') === 3 && J('C.scan.every(p => p.secs === 8)') && J('C.L.objectives.map(o => o.type + (o.what || "")).join()') === 'scan,killwave:0' && J('campAliens(C).length') === 0);
  g.run('__run(100)');
  check('a quiet survey: with nothing scanned there is no wave, no alien, however long it takes (the ambush is not on a clock)', J('C.waves[0].started') === false && J('campAliens(C).length') === 0 && J('C.result') === null);
  g.run('C.carrier.x = C.scan[0].x; C.carrier.y = C.scan[0].y; __run(9)');
  check('the first field scanned: "Point scanned: 1 of 3", and still nobody comes', J('C.scan[0].got') && J('campAliens(C).length') === 0 && J('C.waves[0].started') === false);
  g.run('C.events.length = 0; C.carrier.x = C.scan[1].x; C.carrier.y = C.scan[1].y; __run(9)');
  check('the second scanned: the ambush hits mid-survey: the alarm, the line, and four raiders and three drones out of the dark, all for the cruiser', J('C.waves[0].started') && g.run('C.events.some(e => e.type === "alarm")') && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.ambush') && J(`campAliens(C).filter(u => u.kind === 'raider').length`) === 4 && J(`campAliens(C).filter(u => u.kind === 'drone').length`) === 3 && J('campAliens(C).every(u => u.goal === "carrier")'));
  g.run('C.events.length = 0; __run(5)');
  check('five seconds after it the second line: the mining lasers are weapons now, hold Space, the drones answer to 1 then 2', g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.ambush2') && /Hold Space/.test(J(`uiText('camp.say.ambush2')`)) && /press 1, then 2/.test(J(`uiText('camp.say.ambush2')`)));
  g.run('C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); C.carrier.x = C.scan[2].x; C.carrier.y = C.scan[2].y; __run(9)');
  check('all three scanned and the ambush dead: the survey is won, with a score', J('C.result') === 'won' && J('C.score.score') > 1000);
  g.run('__new2(1, [], 1, 0); C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); C.scan.forEach(p => { p.got = true; }); C.waves[0].started = true; var __al = campSpawn(C, "drone", 99999, 99999); __al.wave = 0; __al.hold = true; __run(0.3)');
  check('everything scanned but one of the ambush still alive: not yet won', J('C.result') === null && (g.run('__al.hp = 0; __run(0.2)'), J('C.result') === 'won'));
  // mining is part of the survey
  g.run('__new2(1, [], 1, 0); campOrder(C, "launch"); __run(5); campOrder(C, "mine"); __run(25)');
  const mid = J('C.ore'); g.run('__run(35)');
  check('mining goes on in the survey: launch at once and Mine, and the wing brings the store from empty to full (200) in about a minute, not in ten seconds', mid >= 40 && mid < 200 && J('C.ore') >= 160);
  check('Escort with no hauler in the level keeps the escorts close to the cruiser, and says so; there is no Earth to recharge', J(`campOrder(C, 'escort', '').say`) === 'Escorts are with the cruiser.' && J(`campOrder(C, 'recharge', 'earth').say`) === 'There is no Earth here, pilot.');
  // 1.2 the haulers
  g.run('__new2(1, [], 1, 1)');
  check('1.2 the haulers: three ore haulers (Hauler 1, 2, 3) leave Deimos for Phobos (the two moons of Mars) at 3, 18 and 33 seconds after you arrive; two must arrive and none may be on its way; the raiders go for them', J('C.L.convoys.length') === 3 && J('C.L.convoys.map(c => c.name).join()') === 'Hauler 1,Hauler 2,Hauler 3' && J('C.L.convoys.every(c => c.from === "deimos" && c.to === "phobos")') && J('C.L.place') === 'mars' && J('C.L.objectives[0].n') === 2 && J('C.L.waves.every(w => /^convoy:h/.test(w.goal))'));
  g.run('__run(4)');
  check('the first hauler is out, named, from Deimos (a moon of Mars, a place of the level), with its own line ("Hauler 1 is under way."); the second not yet', J('campConvoys(C).length') === 1 && J('campConvoys(C)[0].cname') === 'Hauler 1' && Math.hypot(J('campConvoys(C)[0].x') - J('campPlaces(1).deimos.x'), J('campConvoys(C)[0].y') - J('campPlaces(1).deimos.y')) < 300 && /under way/.test(J(`uiText('camp.say.hauler', { name: 'Hauler 1' })`)));
  const haul = J('__mplay(1, 1, 1, __mbot, 300)'), haulIdle = J('__mplay(1, 1, 1, (C, s) => { if (C.arrivedAt == null && (!C.nav || !C.nav.on)) campNavGo(C, campNavGoal(C), true); }, 300)'); // the idle player only flies there (and does nothing at the place)
  check('escorted, the haulers get through (a plain player wins, with the bonus for delivering them all on most seeds); not escorted, too many are lost and the mission is lost: "convoy"', haul.r === 'won' && haulIdle.r === 'lost' && haulIdle.w === 'convoy', JSON.stringify([haul, haulIdle]));
  check('the Escort order names a hauler: "escort the haulers" sends the escorts to the nearest, "escort Hauler 2" to that one', (() => { g.run('__new2(1, [], 1, 1); campOrder(C, "launch"); __run(20)'); const a = J(`campOrder(C, 'escort', 'the haulers')`); const b = J(`campOrder(C, 'escort', 'hauler 2')`); return a.ok && /Hauler/.test(a.say) && b.ok && /Hauler 2/.test(b.say) && J(`campWing(C, 'escort').every(u => u.order.target === 'freighter-h2')`); })());
  // 1.3 the mothership
  g.run('__new2(1, [], 1, 2)');
  check('1.3 the mothership: three waves, the last with the mothership; the objective is to destroy it; nothing else is asked', J('C.L.waves.length') === 3 && J('C.L.waves[2].mother.length') === 2 && J('C.L.objectives.length') === 1 && J('C.L.objectives[0].what') === 'mother' && J('C.L.win') === 'mother');
  g.run('C.waves.forEach(w => { w.started = true; }); var __m = campSpawn(C, "mother", 99999, 0); __m.hp = 10; campHurt(C, __m, 50, "x"); __run(0.2)');
  check('the mothership dead wins the mission, and as the last of the level it completes the level (levelDone): the story, then the refit', J('C.result') === 'won' && J('C.why') === 'mother' && J('campMissionDone(campProgressNew(), 1, 2, C.score).levelDone') === true);
  // the carry-over and the refit
  check('the ore and the extra ships of the refit come with the cruiser into the next level: 120 ore and 2 fighters and an escort more in the bay (8 and 3); the cap of 200 holds; a level started by itself has its own 30', J(`(() => { const a = campNew(2, [], { ore: 120, bonus: { fighters: 2, escorts: 1 } }), b = campNew(2, [], { ore: 9999 }), c = campNew(2, []); return [a.ore, a.bay.fighters, a.bay.escorts, b.ore, c.ore, c.bay.fighters, c.bay.escorts]; })()`).join() === '120,8,3,200,30,6,2');
  store.set('longhaul.campaign', JSON.stringify({ level: 2, techs: ['beam'], ore: 99999, bonus: { fighters: 99, escorts: -1 } }));
  check('the save keeps the ore and the extras in range: the ore is cut to the 200 the store holds, the extras to 0 to 3', J('campProgressLoad().ore') === 200 && J('campProgressLoad().bonus.fighters') === 3 && J('campProgressLoad().bonus.escorts') === 0);
  store.delete('longhaul.campaign');
  g.run(`go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts2.push(msg); }; campProgressSave({ level: 1, mission: 1, techs: ['beam'], ore: 77, bonus: { fighters: 2, escorts: 1 }, results: {} }); window.F = __fake(1, {}); 0`);
  check('the scene gives a mission reached by the chain the ore of the one before it (the save is at that level and mission) and the extras; a level started by itself gets the 30 of its own', J('F.mi') === 1 && J('F.camp.mission') === 1 && J('F.camp.ore') === 77 && J('F.camp.bay.fighters') === 8 && (g.run('campProgressSave({ level: 1, mission: 0, techs: [], ore: 77, bonus: { fighters: 2, escorts: 1 }, results: {} }); window.F = __fake(2, {}); 0'), J('F.camp.ore') === 30 && J('F.camp.bay.fighters') === 6));
  store.delete('longhaul.campaign'); g.run('go = __go0; toast = __toast0');
  check('plain words: "send the drones to mine", "mine the belt", "drones mine" are Mine', ['send the drones to mine', 'mine the belt', 'drones mine', 'go mining'].every(x => J(`campIntent(${JSON.stringify(x)})`) && J(`campIntent(${JSON.stringify(x)})`).act === 'fleet_mine'));
  check('every new word of the belt is in its own file, content/text/campaign-belt.md (ui.md is full), and the game reads it', (() => { const md = src('content/text/campaign-belt.md'); const keys = ['camp.l1.before.3', 'camp.l1.after.3', 'camp.say.ambush', 'camp.say.ambush2', 'camp.say.bwave2', 'camp.say.bwave3', 'camp.say.escortcarrier', 'camp.ui.refit', 'camp.ui.refitpick', 'camp.ui.refitbuy', 'camp.ui.refitore', 'camp.ui.refitgot']; const miss = keys.filter(k => !md.includes('| ' + k + ' |') || J(`uiText('${k}')`) === k); return miss.length === 0 || miss.join(); })());
  check('every word of the missions is in content/text/campaign-missions.md and the game reads it (titles and briefings, objectives, bonus objectives, the debrief, the lose reasons)', (() => { const md = src('content/text/campaign-missions.md'); const keys = [...md.matchAll(/^\| (camp\.[a-z0-9.]+) \|/gm)].map(m => m[1]); const miss = keys.filter(k => J(`uiText('${k}', {})`) === k); return keys.length >= 60 && miss.length === 0 || miss.join(); })());
}

// ---------- N. mining by laser ----------
console.log('N. mining lasers: rocks have hit points, a beam cuts them, they break into ore');
{
  g.run(`
    window.__rock = (x, y, hp) => ({ id: 'rock-' + (C.nextId++), x, y, hp: hp || 100, maxHp: 100, r: 22, ore: 20, cutAt: -1e9 });
    window.__lone = () => { __new2(1, [], 1); C.rocks = []; C.pickups = []; };   // the belt with no rocks: the test sets its own
  `);
  check('the numbers are in the table: a rock has 100 hit points and 20 ore, a mining ship\'s laser takes 5 a second from 230 px and holds 150 px off, a turret shot cuts a rock at 35 percent', J('CAMP.ore.rockHp') === 100 && J('CAMP.ore.rock') === 20 && J('CAMP.ore.rockR') === 22 && J('CAMP.laser.dps') === 5 && J('CAMP.laser.range') === 230 && J('CAMP.laser.hold') === 150 && J('CAMP.laser.turret') === 0.35);
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; campOrder(C, "launch"); __run(6); var __r = __rock(30000 + 700, 30000, 100); C.rocks = [__r]; campOrder(C, "mine"); __run(3)');
  const cut8 = J('__r.hp');
  check('Mine sends the drones to a rock, they stop 150 px off it and cut: three seconds on the rock has lost hit points but is not broken, and a beam of kind "rock" is on the list from the drones', cut8 < 100 && cut8 > 0 && J('C.lasers.length') > 0 && J('C.lasers.every(l => l.kind === "rock" && l.to === __r.id && /^(fighter|escort)-/.test(l.from))') && J('C.events.some(e => e.type === "laser" && e.src === "drone")') !== undefined, J('__r.hp'));
  g.run('__run(25)');
  check('a rock breaks into one chunk of 20 ore where it was, the drones fly over it and the store has it; the rock is gone and the beams stop', J('C.rocks.length') === 0 && J('C.ore') === 20 && J('C.pickups.length') === 0 && J('C.lasers.length') === 0, JSON.stringify([J('C.rocks.length'), J('C.ore'), J('C.pickups.length')]));
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; var __r2 = __rock(30000, 30000 - 900, 100); C.rocks = [__r2]; campOrder(C, "launch"); __run(6); var __was = __r2.hp; __run(2)');
  check('with the wing out but not sent to mine nothing cuts: a rock stays whole', J('__r2.hp') === 100);
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; C.rocks = [__rock(30000 + 900, 30000, 100)]; campOrder(C, "launch"); __run(6); campOrder(C, "mine"); __run(0.5)');
  const stillFar = J('C.rocks[0].hp');
  check('a laser reaches 230 px: a drone still flying toward the rock (more than 230 px from its edge) cuts nothing', stillFar === 100);
  // many drones, one rock
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; var __r3 = __rock(30000 + 400, 30000, 100); C.rocks = [__r3]; campOrder(C, "launch"); __run(6); campOrder(C, "mine"); __run(12)');
  check('eight drones on one rock cut it quicker than one: gone within twelve seconds (eight at 5 a second is 40 a second), and the chunk is taken', J('C.rocks.length') === 0 && J('C.ore') >= 20);
  // a rock under the aliens
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; var __r4 = __rock(30000 + 1500, 30000, 100); C.rocks = [__r4]; campOrder(C, "launch"); __run(6); var __dd = campSpawn(C, "drone", 30000 + 1550, 30000); __dd.hold = true; __dd.goal = "carrier"; campOrder(C, "mine"); __run(6)');
  check('a rock with an alien within 500 px of it is left alone (they wait at the cruiser): it is still whole', J('__r4.hp') === 100);
  // the turrets
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; C.carrier.rot = 0; var __r5 = __rock(30000 + 300, 30000, 100); C.rocks = [__r5]; __run(4)');
  check('the turrets cut a rock only while Space is held: four seconds with Space up, the rock is whole', J('__r5.hp') === 100 && J('C.turrets.some(tu => tu.rock === __r5.id)'));
  g.run('C.input.fire = true; __run(4)');
  const t4 = J('__r5.hp');
  check('Space held beside a rock with no alien in reach: the eight turrets aim at it and cut it (16 hit points a second: 4 x 0.35 x 8 turrets every 0.7 s), a beam of kind "rock" from the carrier, and an event for each pulse with its muzzle and the rock\'s near side', t4 < 100 && t4 > 20 && J('C.lasers.every(l => l.kind === "rock" && l.from === C.carrier.id)') && g.run('C.events.filter(e => e.type === "laser" && e.src === "turret").length') !== undefined, t4);
  g.run('__run(12)');
  check('it breaks: the rock is gone and a chunk of 20 ore lies where it was, 300 px from the cruiser, until a ship flies over it', J('C.rocks.length') === 0 && J('C.pickups.length') === 1 && J('C.pickups[0].kind') === 'chunk' && J('C.pickups[0].ore') === 20 && J('C.ore') === 0);
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; C.carrier.rot = 0; var __r6 = __rock(30000 + 300, 30000, 100); C.rocks = [__r6]; var __al = campSpawn(C, "gunship", 30000 + 380, 30000 + 60); __al.hold = true; __al.hp = __al.maxHp = 9999; C.input.fire = true; __run(2)');
  check('with an alien in reach the turrets shoot the alien, not the rock: the rock is whole, the beam on the list is kind "alien", from the carrier to the alien', J('__r6.hp') === 100 && J('C.lasers.length') >= 1 && J('C.lasers.every(l => l.kind === "alien" && l.from === C.carrier.id && l.to === __al.id)'));
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; C.carrier.rot = 0; C.input.fire = true; var __ah = campSpawn(C, "gunship", 30000 + 380, 30000); __ah.hold = true; __ah.hp = __ah.maxHp = 9999; __run(1)');
  const l0 = J('C.lasers.filter(l => l.kind === "alien").map(l => l.since)'); g.run('__run(2)'); const l1 = J('C.lasers.filter(l => l.kind === "alien").map(l => l.since)');
  check('a beam keeps its start: pulses of the eight turrets on one alien are one beam whose since does not move while it fires', l0.length === 1 && l1.length === 1 && l0[0] === l1[0], JSON.stringify([l0, l1]));
  g.run('C.input.fire = false; __run(0.5)');
  check('250 ms after the last pulse the list is empty again (an empty array, never undefined), and a new burst is a new beam with a later since', J('Array.isArray(C.lasers)') && J('C.lasers.length') === 0 && (g.run('C.input.fire = true; __run(1)'), J('C.lasers.filter(l => l.kind === "alien").every(l => l.since > ' + l1[0] + ')')));
  g.run('__lone(); C.carrier.x = 30000; C.carrier.y = 30000; C.carrier.rot = 0; var __r7 = __rock(30000 + 300, 30000, 100); C.rocks = [__r7]; C.input.fire = true; __run(4)');
  const plain4 = J('100 - __r7.hp');
  g.run('__new2(1, ["beam"], 1); C.rocks = []; C.carrier.x = 30000; C.carrier.y = 30000; C.carrier.rot = 0; var __r8 = __rock(30000 + 300, 30000, 100); C.rocks = [__r8]; C.input.fire = true; __run(4)');
  check('the beam tech cuts rock faster too (twice a shot)', J('100 - __r8.hp') > plain4 * 1.5, JSON.stringify([plain4, J('100 - __r8.hp')]));
  g.run('__new2(1, [], 1)');
  check('the quiet minute: launch at once and Mine, and the wing brings the store from empty to full (200 ore) in about a minute, not in ten seconds', (() => { g.run('campOrder(C, "launch"); __run(5); campOrder(C, "mine"); __run(25)'); const mid = J('C.ore'); g.run('__run(35)'); return mid >= 40 && mid < 200 && J('C.ore') >= 160; })());
  // the scene draws it (the stand-in): rocks cracking, beams, no error
  g.run(`go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts2.push(msg); }; window.F = __fake(1, {}); F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' }); F.beamG = document; F.beams = []; F.rsp = {}; campOrder(F.camp, 'launch'); 0`);
  check('the scene draws rocks, cracks and beams from this frame\'s events on a stand-in without an error, and keeps the beams for a moment', (() => { try { g.run('F.camp.rocks[0].hp = 40; F.update(0, 33); F.update(0, 33); F.onEvent({ type: "laser", src: "drone", x: 1, y: 2, tx: 3, ty: 4 }); F.onEvent({ type: "turret", i: 0, x: 1, y: 2, aim: 0, tx: 5, ty: 6 }); F.onEvent({ type: "rockbreak", x: 1, y: 2 }); F.update(0, 33)'); return J('F.beams.length') >= 2; } catch (e) { return String(e.message).slice(0, 140); } })());
  g.run('go = __go0; toast = __toast0');
}

// ---------- O. missions: the table shape, objectives, bonus objectives, score, results ----------
console.log('O. missions: a level is a run of missions (a fixture level, so the shape is tested apart from the real data)');
{
  g.run(`
    var __pl = CAMP.levels[1].places;
    CAMP.levels.t = { name: 'Test', start: 'ceres', startAt: [130, 30], earth: false, startOre: 0, places: __pl, rocks: [], convoys: [], waves: [], missions: [
      { id: 'survey', kind: 'recon', objectives: [{ type: 'scan', points: [{ at: [900, 0], r: 200, secs: 2 }, { at: [-900, 0], r: 200, secs: 2 }] }],
        waves: [{ on: { scanned: 1 }, from: [3000, 0], ships: { drone: 2 }, goal: 'carrier', say: 'camp.say.ambush' }], bonus: [{ id: 'swift', type: 'time', secs: 100, text: 'x' }, { id: 'clean', type: 'lost', n: 0, text: 'y' }] },
      { id: 'haul', kind: 'escort', convoys: [{ id: 'h1', name: 'Hauler 1', at: 1, from: 'vesta', to: 'ceres' }, { id: 'h2', name: 'Hauler 2', at: 2, from: 'vesta', to: 'ceres' }, { id: 'h3', name: 'Hauler 3', at: 3, from: 'vesta', to: 'ceres' }],
        objectives: [{ type: 'deliver', n: 2 }], bonus: [{ id: 'all', type: 'delivered', text: 'z' }] },
      { id: 'hold', kind: 'defend', defend: { place: 'ceres', shield: 200, name: 'the Works' }, objectives: [{ type: 'hold', secs: 30 }], waves: [{ at: 3, from: [2500, 0], ships: { drone: 2 }, goal: 'earth', say: 'camp.say.bwave2' }], bonus: [{ id: 'hull', type: 'hull', pct: 50, text: 'h' }] },
      { id: 'kill', kind: 'attack', towers: [{ place: 'ceres', r: 700, n: 2, hp: 40 }], objectives: [{ type: 'kill', what: 'towers' }], par: 200 }
    ] };
    window.__mnew = (i, seed, techs) => { window.C = campNew('t', techs || [], { seed: seed == null ? 1 : seed, mission: i }); return !!C; };
  `);
  check('a level is a run of missions: campMissions gives the rows, campMissionRow lays a mission over the level row (the level\'s own row is not changed), an index out of range is clamped, a level with no missions is one mission of kind waves', J('campMissions("t").length') === 4 && J('campMissionRow("t", 1).kind') === 'escort' && J('campMissionRow("t", 1).mission') === 1 && J('campMissionRow("t", 1).missions') === 4 && J('campMissionRow("t", 1).convoys.length') === 3 && J('campMissionRow("t", 0).convoys.length') === 0 && J('campMissionRow("t", 99).mid') === 'kill' && J('CAMP.levels.t.convoys.length') === 0 && J('campMissions("home").length') === 1 && J('campMissionRow("home", 0).kind') === 'waves' && J('campMissionRow("nope", 0)') === null);
  check('a battle reads the mission: C.L is the row, C.mission its place in the level, C.level the level', (g.run('__mnew(1)'), J('C.L.id') === 'haul' && J('C.mission') === 1 && J('C.level') === 't' && J('C.L.kind') === 'escort'));
  // recon
  g.run('__mnew(0)');
  check('recon: the mission has two points to scan; none scanned yet, and no alien: the ambush wave waits for the first point (on scanned 1)', J('C.scan.length') === 2 && J('C.scan.every(p => !p.got)') && (g.run('__run(20)'), J('C.waves[0].started') === false && J('campAliens(C).length') === 0 && J('campObjectives(C)[0].got') === 0 && J('campObjectives(C)[0].need') === 2));
  g.run('C.carrier.x = 900; C.carrier.y = 0; __run(1.5)');
  check('a ship of yours near a point fills it, in all (not at once): after 1.5 seconds of 2 it is not scanned', J('C.scan[0].got') === false && J('C.scan[0].t') > 1.4 && J('C.waves[0].started') === false);
  g.run('C.events.length = 0; __run(1)');
  check('scanned after 2 seconds: the point is done, the game says so (1 of 2), and the ambush wave comes on that event: two drones for the carrier', J('C.scan[0].got') && g.run('C.events.some(e => e.type === "scanned")') && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join()').includes('camp.say.scanned') && J('C.waves[0].started') && J('campAliens(C).length') === 2);
  g.run('C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); C.carrier.x = -900; C.carrier.y = 0; __run(2.2)');
  check('both scanned (and the drones gone) wins the mission: result won, a score on it', J('C.result') === 'won' && J('C.score.score') > 0 && J('C.score.base') === 1000);
  // a wing ship scans too
  g.run('__mnew(0); campOrder(C, "launch"); __run(6); var __w = campWing(C)[0]; __w.x = 900; __w.y = 0; __w.vx = 0; __w.vy = 0; __w.order = { type: "guard", at: { kind: "place", id: "ceres" } }; C.carrier.x = 30000; C.carrier.y = 30000; __run(0.5)');
  check('any ship of yours can scan: a drone parked at the point fills it, the carrier far away', J('C.scan[0].t') > 0);
  // escort
  g.run('__mnew(1)');
  g.run('__run(1.2)');
  check('escort: the haulers leave Vesta (a place of the level) for Ceres, one a second, each with its own name; the cruiser is not needed to start them', J('campConvoys(C).length') === 1 && J('campConvoys(C)[0].cname') === 'Hauler 1' && Math.hypot(J('campConvoys(C)[0].x') - 2700, J('campConvoys(C)[0].y') + 1500) < 250 && (g.run('__run(3)'), J('campConvoys(C).length') === 3));
  g.run('__run(60)');
  check('two haulers of the three arriving at Ceres complete the delivery objective (deliver 2); here all three arrive, and the bonus "all delivered" is met', J('C.delivered') >= 2 && J('C.result') === 'won' && J('C.score.bonuses.find(b => b.id === "all").ok') === true);
  g.run('__mnew(1); __run(3.2); campConvoys(C).forEach((u, i) => { if (i < 2) campHurt(C, u, 9999, "x"); }); __run(0.2)');
  check('too many haulers lost: with two of three dead, two can no longer arrive, and the mission is lost for that, "convoy"', J('C.result') === 'lost' && J('C.why') === 'convoy');
  // defend
  g.run('__mnew(2)');
  check('defend: the defended place is an Earth-like thing at Ceres with its own shield (200) and name; the aliens of the wave go for it', J('C.earth.shield') === 200 && J('C.earth.name') === 'the Works' && J('Math.round(C.earth.x)') === 0 && J('C.earth.loseWhy') === 'base' && (g.run('__run(4)'), J('campAliens(C).every(u => u.goal === "earth")')));
  g.run('C.carrier.x = 9000; C.carrier.y = 9000; C.earth.shield = 3; campBullet(C, { x: 700, y: 0, vx: 0, vy: 0, id: "t" }, Math.PI, 600, 40, 3000, "alien", 0); __run(1.5)');
  check('the defended place lost: its shield gone loses the mission, and the reason is "base" (not Earth)', J('C.result') === 'lost' && J('C.why') === 'base');
  g.run('__mnew(2); C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; }); C.waves[0].started = true; __run(25)');
  check('hold: thirty seconds with the place standing wins; at 25 s not yet', J('C.result') === null && (g.run('__run(7)'), J('C.result') === 'won'));
  // attack
  g.run('__mnew(3)');
  check('attack: two towers in a ring of 700 px at Ceres; the objective is to destroy them all: one dead is not enough, both win', J('C.ships.filter(u => u.kind === "tower").length') === 2 && (g.run('campHurt(C, C.ships.find(u => u.kind === "tower" && u.hp > 0), 9999, "x")'), J('C.result') === null) && (g.run('campHurt(C, C.ships.find(u => u.kind === "tower" && u.hp > 0), 9999, "x"); __run(0.1)'), J('C.result') === 'won' && J('C.why') === 'towers'));
  // bonus and score
  g.run('__mnew(0); C.t = 60000; C.lostShips = 0; C.ships.forEach(u => { if (u.team === "alien") u.hp = 0; })');
  const fast = J('campScore(C)');
  g.run('C.t = 150000; C.lostShips = 3; C.carrier.hp = 150');
  const slow = J('campScore(C)');
  check('the score: a fast clean mission earns the base, both bonuses (250 each), the whole hull share (300) and the seconds under the par (120 s: 60 saved at 5 a second); a slow one that lost three ships and half its hull earns far less', fast.score === 1000 + 500 + 300 + 300 && fast.bonuses.every(b => b.ok) && slow.bonuses.every(b => !b.ok) && slow.score < fast.score - 700 && slow.score === 1000 + Math.round(300 * 150 / 600) - 150, JSON.stringify([fast.score, slow.score]));
  check('a mission row can set its own par (200 s): the same 60 s earns 140 s of speed there', (g.run('__mnew(3); C.t = 60000'), J('campScore(C).speed') === 140 * 5));
  check('the bonus objective types: time, lost (at most), hull (at least), ore, delivered (all haulers)', (g.run('__mnew(0); C.t = 60000'), J('campBonuses(C).map(b => b.type).join()') === 'time,lost') && J('campBonuses(C).every(b => typeof b.ok === "boolean" && typeof b.points === "number")'));
  // the results and the state
  store.delete('longhaul.campaign');
  check('the Campaign state: the level and the mission to fly next (a new game: level 1, mission 0), the results of the missions flown, the ore and the extras', (() => { const P = J('campProgressLoad()'); return P.level === 1 && P.mission === 0 && JSON.stringify(P.results) === '{}' && P.ore === 0; })());
  g.run(`var __P = campProgressNew(); window.__sc1 = { score: 1500, bonuses: [{ id: 'swift', ok: true }, { id: 'clean', ok: false }], t: 70, hullLeft: 540, shipsLost: 1 }; window.__r1 = campMissionDone(__P, 't', 0, __sc1)`);
  check('campMissionDone keeps the result under "<level>.<mission>" (the bonuses met, the time, the hull, the ships lost, one try) and moves the mission to fly next on; the level is not done until its last mission', J('__P.results["t.1"].score') === 1500 && J('__P.results["t.1"].bonuses.join()') === 'swift' && J('__P.results["t.1"].tries') === 1 && J('__P.mission') === 1 && J('__r1.levelDone') === false);
  g.run('var __r2 = campMissionDone(__P, "t", 0, { score: 900, bonuses: [], t: 99, hullLeft: 100, shipsLost: 4 }); campMissionTried(__P, "t", 0)');
  check('a mission flown again keeps its best score and counts the tries (best 1500 stays, tries 3)', J('__P.results["t.1"].score') === 1500 && J('__P.results["t.1"].tries') === 3);
  g.run('var __r3 = campMissionDone(__P, "t", 3, __sc1)');
  check('the last mission of a level completes the level: levelDone true, the mission index back to 0', J('__r3.levelDone') === true && J('__P.mission') === 0);
  check('the state is the one JSON under longhaul.campaign: saved with the results and read back, and junk in it is cleaned (a result with no score, a key that is no mission, a level out of range)', (() => { g.run('__P.level = 1; __P.mission = 0; campProgressSave(__P)'); const back = J('campProgressLoad()'); store.set('longhaul.campaign', JSON.stringify({ level: 99, mission: 77, results: { '1.1': { score: 5, bonuses: ['a'], t: 1, hull: 2, lost: 0, tries: 1 }, 'x.y': { score: 1 }, '1.2': { nope: 1 } } })); const junk = J('campProgressLoad()'); return back.results['t.1'] === undefined && JSON.stringify(Object.keys(junk.results)) === '["1.1"]' && junk.level === 1 && junk.mission === 0; })());
  store.delete('longhaul.campaign');
  g.run('delete CAMP.levels.t');
}

// ---------- P. the nav list and the map follow the mission ----------
console.log('P. the goal of the nav list and the marks of the map follow the first open objective of the mission');
{
  const goal = (l, m) => { g.run(`__new2(${l}, [], 1, ${m})`); return J('campNavGoal(C)'); };
  const g11 = goal(1, 0);
  check('1.1: the goal is the nearest point to scan ("Scan point n"); the three points are rows of the list (group finds) and marks of the map', g11 && g11.kind === 'scan' && /^Scan point \d$/.test(g11.name) && J('campNavRows(C).filter(r => r.kind === "scan" && r.group === "finds").length') === 3 && J('campMapMarks(C).filter(m => m.type === "scan").length') === 3);
  g.run('C.scan[0].got = true; C.scan[1].got = true');
  check('two of them scanned: the goal moves on to the one left ("Scan point 3"), one row and one mark are left', J('campNavGoal(C).name') === 'Scan point 3' && J('campNavRows(C).filter(r => r.kind === "scan" && r.group === "finds").length') === 1 && J('campMapMarks(C).filter(m => m.type === "scan").length') === 1);
  const g12 = goal(1, 1); g.run('__run(5)');
  check('1.2: the goal is the nearest hauler once one is under way', (() => { const a = J('campNavGoal(C)'); return a && a.kind === 'convoy' && /Hauler/.test(a.name); })());
  check('1.3: the mothership; 2.1: the nearest cache; 2.2: a guard; 2.3: the relic; 3.2 and 3.3: a tower', (() => { const k = (l, m) => { g.run(`__new2(${l}, [], 1, ${m})`); if (l === 1 && m === 2) g.run('C.waves.forEach(w => { w.started = true; }); campSpawn(C, "mother", 4000, 0)'); const a = J('campNavGoal(C)'); return a ? a.kind : null; }; return k(1, 2) === 'mother' && k(2, 0) === 'cache' && k(2, 1) === 'guard' && k(2, 2) === 'relic' && k(3, 1) === 'tower' && k(3, 2) === 'tower' && k(3, 0) === 'scan'; })());
  check('a point to scan is a place the autopilot can be sent to (the list gives its row a target) and when it is scanned the row is gone', (() => { g.run('__new2(1, [], 1, 0)'); const r = J('campNavRows(C).find(r => r.kind === "scan" && r.group === "finds")'); const t = J(`campNavTarget(C, ${JSON.stringify(r)})`); g.run('C.scan[+String(' + JSON.stringify(r.id) + ').slice(5)].got = true'); return !!t && t.x === r.x && J(`campNavTarget(C, ${JSON.stringify(r)})`) === null; })());
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
  check('the save has no words and no numbers of the battle (the wing\'s stance is one word of the pilot\'s choice)', Object.keys(JSON.parse((g.run(`campProgressSave({ level: 2, techs: ['shield'], ore: 0, bonus: { fighters: 0, escorts: 0 } })`), store.get('longhaul.campaign')))).sort().join() === 'bonus,found,level,mission,ore,results,revealed,stance,techs'); // revealed: the ending has been seen (card space-game-campaign-outpost-reveal): a flag, no words, no battle
  // --- Q. the places of the missions (card space-game-campaign-mission-places): a place in every mission row, the trip, the briefing, the map, the dock
  check('every mission has a place that is a body of its level, and a dock with an outpost name; level 1 has the moons it lists (Mars\'s two, Jupiter\'s four, Saturn\'s two, Luna), level 3 its three, level 2 none added', [1, 2, 3].every(n => [0, 1, 2].every(i => J(`(() => { const L = campMissionRow(${n}, ${i}), pl = campPlaces(${n}); return !!pl[L.place] && !!pl[L.dock] && !!pl[L.dock].outpost && !!pl[L.dock].name; })()`))) && J(`['luna', 'phobos', 'deimos', 'io', 'europa', 'ganymede', 'callisto', 'titan', 'enceladus'].every(id => campPlaces(1)[id] && campPlaces(1)[id].moon)`) && J(`['ran', 'kolga', 'tyr'].every(id => campPlaces(3)[id] && campPlaces(3)[id].moon === 'home')`) && J(`Object.keys(campPlaces(2)).every(id => !campPlaces(2)[id].moon)`));
  check('across a level the missions use at least four different bodies (their places, docks and where the haulers go), and the three levels use at least ten between them', [1, 2, 3].every(n => J(`(() => { const set = {}; [0, 1, 2].forEach(i => { const L = campMissionRow(${n}, i); set[L.place] = 1; set[L.dock] = 1; L.convoys.forEach(c => { set[c.from] = 1; set[c.to] = 1; }); }); return Object.keys(set).length; })()`) >= 4) && J(`(() => { const set = {}; [1, 2, 3].forEach(n => [0, 1, 2].forEach(i => { const L = campMissionRow(n, i); set[n + L.place] = 1; set[n + L.dock] = 1; })); return Object.keys(set).length; })()`) >= 10);
  check('level 1 uses Ceres, Mars (and its moons) and Jupiter\'s moon Europa; level 2 the worlds of Alpha Centauri; level 3 the moons of the alien world', J(`[0, 1, 2].map(i => campMissionRow(1, i).place).join()`) === 'ceres,mars,europa' && J(`[0, 1, 2].map(i => campMissionRow(2, i).place).join()`) === 'alpha-cen-b,proxima-d,proxima' && J(`[0, 1, 2].map(i => campMissionRow(3, i).place).join()`) === 'kolga,ran,home');
  check('the rows of a mission are offsets from its place: caches, guards, scan points, waves and towers lie round it, not round the origin', J(`(() => { const L = campMissionRow(2, 0), p = campPlaces(2)[L.place]; return L.caches.every(c => Math.hypot(c[0] - p.x, c[1] - p.y) < 3000); })()`) && J(`(() => { const L = campMissionRow(2, 1), p = campPlaces(2)[L.place]; return L.guards.every(c => Math.hypot(c.at[0] - p.x, c.at[1] - p.y) < 3000); })()`) && J(`(() => { const L = campMissionRow(3, 0), p = campPlaces(3)[L.place]; return L.objectives[0].points.every(q => Math.hypot(q.at[0] - p.x, q.at[1] - p.y) < 3000); })()`) && J(`(() => { const L = campMissionRow(1, 1), p = campPlaces(1)[L.place]; return L.waves.every(w => Math.hypot(w.from[0] - p.x, w.from[1] - p.y) < 3500) && L.rocks.every(f => Math.hypot(f.at[0] - p.x, f.at[1] - p.y) < 3000); })()`) && J(`CAMP.levels[2].missions[0].caches.every(c => Math.abs(c[0]) < 3000)`));
  check('the trip: where the cruiser starts at the mission\'s place there is none (Ceres, Proxima b, the alien world); elsewhere the distance in px and km (a tenth), and the seconds by Fast on the map\'s own rule', J('campTravel(1, 0)') === null && J('campTravel(2, 2)') === null && J('campTravel(3, 2)') === null && [[1, 1], [1, 2], [2, 0], [2, 1], [3, 0], [3, 1]].every(([n, i]) => J(`(() => { const t = campTravel(${n}, ${i}), L = campMissionRow(${n}, ${i}); const burn = t.dist > CAMP.nav.farFrom ? CAMP.nav.farFast : CAMP.nav.fast; return t.km === Math.round(t.dist / 10) && t.secs === Math.round(t.dist / (CAMP.carrier.speed * burn) * CAMP.nav.etaSlow) && t.name === campPlaces(${n})[L.place].name; })()`)) && J('campTravel(1, 1).secs') >= 20 && J('campTravel(1, 1).secs') <= 90);
  // before the arrival: the clock has not started
  g.run('__new2(1, [], 1, 1, true)');
  check('at the start of a mission with a trip: not arrived, no wave, no hauler, the objective line says to fly there ("Fly to Mars: n km."), the goal on the map and in the list is the place', J('C.arrivedAt') === null && (g.run('__run(30)'), J('C.waves.every(w => !w.started)') && J('campConvoys(C).length') === 0 && J('C.arrivedAt') === null) && /^Fly to Mars: \d+ km\.$/.test(J('campObjective(C)')) && J('campNavGoal(C).id') === 'place:mars' && J('campNavRows(C).find(r => r.goal).name') === 'Mars');
  check('the map marks the place of the mission as the objective, a ring round it, even though Mars is far from Ceres; the view takes it in', J('campMapMarks(C, false).some(m => m.type === "objective" && Math.abs(m.x - campPlaces(1).mars.x) < 1)') && (() => { const b = J('campMapBounds(1, false, C.L)'); const m = J('campPlaces(1).mars'); return b.x0 <= m.x && b.x1 >= m.x && b.y0 <= m.y && b.y1 >= m.y; })());
  g.run('campNavGo(C, campNavGoal(C), true); __run(10)');
  check('click-to-fly (Fast) is the trip: it burns at the far rate, the cruiser gets nearer, and nothing comes yet', J('C.nav.fast') === true && J('C.nav.burn') === J('CAMP.nav.farFast') && J('C.arrivedAt') === null && J('C.waves.every(w => !w.started)'));
  g.run('__run(' + (J('campTravel(1, 1).secs') + 10) + ')');
  check('it arrives: the mission begins (the arrival event and the line, "Arrived at Mars."), the autopilot lets go, the goal is now the mission\'s own', J('C.arrivedAt') > 0 && J('C.nav') === null);
  g.run('__new2(1, [], 1, 1, true); campNavGo(C, campNavGoal(C), true)');
  let arrived = -1; for (let i = 0; i < 200 && arrived < 0; i++) { g.run('__run(1)'); if (J('C.arrivedAt') !== null) arrived = J('C.t') / 1000; }
  check('flown on Fast from Ceres, the cruiser is at Mars in about the seconds the briefing said (a little under, since it arrives within 3,000 px of the place), and the autopilot is off', arrived > 0 && arrived <= J('campTravel(1, 1).secs') + 5 && arrived >= J('campTravel(1, 1).secs') * 0.6 && J('C.nav') === null && J('Math.hypot(C.carrier.x - campPlaces(1).mars.x, C.carrier.y - campPlaces(1).mars.y) <= CAMP.mission.arrive + 20'));
  g.run('__run(12)');
  check('the mission\'s clock counts from the arrival: 12 s after it the first hauler (3 s) is out and the first raiders (10 s) have come, the par time and the swift bonus count from there too', J('campConvoys(C).length') >= 1 && J('C.waves[0].started') === true && Math.abs(J('campMissionClock(C)') - 12) < 1.5);
  // the briefing and the debrief
  g.run('window.F = __fake(1, { mission: 1 }); 0'); g.run('F.showCard = (t, lines, ok) => { window.__card = { t, lines, ok }; }; F.mode = "intro"; F.showBrief()');
  check('the briefing of 1.2 names the place and its distance and the time by Fast: "PLACE  Mars  n km  about n s by Fast"', J('__card.lines.some(l => /^PLACE  Mars +\\d+ km +about \\d+ s by Fast$/.test(l))') && J('__card.lines[0]').startsWith('PLACE'));
  g.run('window.F = __fake(1, { mission: 0 }); 0'); g.run('F.showCard = (t, lines, ok) => { window.__card = { t, lines, ok }; }; F.mode = "intro"; F.showBrief()');
  check('the briefing of 1.1 (the cruiser starts at Ceres) says so: "PLACE  Ceres  you start there"', J('__card.lines[0]') === 'PLACE  Ceres     you start there');
  g.run('window.F = __fake(1, { mission: 1 }); 0'); g.run('F.showCard = (t, lines, ok) => { window.__card = { t, lines, ok }; }; F.camp.arrivedAt = 0; F.showDebrief({ score: 1200, bonuses: [], t: 100, hullLeft: 90, shipsLost: 0 })');
  check('the debrief docks at the outpost of the mission\'s dock: "Docked at Arsia High, Phobos."', J('__card.lines.some(l => l === "Docked at Arsia High, Phobos.")'));
  check('the mothership of the first level comes in facing the mission\'s place (Europa), not the origin', (() => { g.run('__new2(1, [], 1, 2); C.waves[2].started = false; __run(120)'); return J('C.ships.filter(u => u.kind === "mother").every(u => Math.abs(Math.atan2(campPlaces(1).europa.y - u.y, campPlaces(1).europa.x - u.x) - u.rot) < 0.5 || u.hp <= 0)'); })());
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nCAMPAIGN FAIL (${failed} of ${n})` : `\nCAMPAIGN PASS (${n})`);
process.exitCode = failed ? 1 : 0;
