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
  window.__new = (techs, seed, god) => { window.C = campNew(1, techs || [], { seed: seed == null ? 1 : seed, god: !!god }); return C.id; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30) && !C.result; i++) { campStep(C, 1 / 30); } };
  window.__play = (seed, techs, script, secs) => {
    window.C = campNew(1, techs || [], { seed });
    for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; }
    return { result: C.result, why: C.why, t: Math.round(C.t / 1000), hull: Math.round(C.carrier.hp), earth: Math.round(C.earth.shield), kills: C.kills, delivered: C.delivered, lost: C.lost, aliens: campAliens(C).length };
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
  check('level 1 is there: three waves, two convoys, win by the mothership, the carrier starts at the Lunar base', J('CAMP.levels[1].waves.length') === 3 && J('CAMP.levels[1].convoys.length') === 2 && J('CAMP.levels[1].win') === 'mother' && J('CAMP.levels[1].start') === 'luna');
  check('the last wave brings the mothership and waits for the one before to be dead', J('CAMP.levels[1].waves[2].mother.length') === 2 && J('CAMP.levels[1].waves[2].needClear') === true);
  check('every place a level names is in the table of places', J(`CAMP.levels[1].convoys.every(c => CAMP.places[c.to]) && !!CAMP.places[CAMP.levels[1].start]`));
  check('the places are at 1 to 12 of the Sol pack: Earth to Mars about 4,100 px', Math.abs(J('Math.hypot(CAMP.places.mars.x, CAMP.places.mars.y)') - 4104) < 10);
  check('three techs are offered after level 1 and three after level 2, each with its own name and words', J('campTechChoices(1)').length === 3 && J('campTechChoices(2)').length === 3 && J('campTechChoices(1).concat(campTechChoices(2))').every(id => J(`uiText('camp.tech.${id}.name')`) !== `camp.tech.${id}.name` && J(`uiText('camp.tech.${id}.text')`) !== `camp.tech.${id}.text`));
  check('the story of level 1: two lines before, two after, in plain words', J(`campStory(1, 'before')`).length === 2 && J(`campStory(1, 'after')`).length === 2 && J(`campStory(1, 'before').concat(campStory(1, 'after'))`).every(t => t.length > 20 && t.length < 130));
  check('every wave and convoy line, order answer and refusal the code can say is a string of the game that content/text/ui.md has', (() => {
    const code = src('src/campaign.js'), md = src('content/text/ui.md');
    const keys = new Set([...code.matchAll(/'(camp\.[a-z0-9.]+)'/g)].map(m => m[1]));
    ['launch', 'attack', 'attackmother', 'escort', 'guard', 'recall'].forEach(k => keys.add('camp.say.' + k));
    ['over', 'bay', 'launching', 'baydry', 'nofighters', 'noescorts', 'noconvoy', 'nomother', 'nowing', 'what'].forEach(k => keys.add('camp.no.' + k));
    J('CAMP.levels[1].waves.map(w => w.say)').forEach(k => keys.add(k));
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
  check('a new game: the carrier at the Lunar base, 600 hull, the bay full (six fighters, two escorts), nothing out, no shot fired', J('C.carrier.hp') === 600 && J('C.bay.fighters') === 6 && J('C.bay.escorts') === 2 && J('campWing(C).length') === 0 && J('Math.hypot(C.carrier.x - CAMP.places.luna.x - CAMP.levels[1].startAt[0], C.carrier.y - CAMP.places.luna.y - CAMP.levels[1].startAt[1])') < 1); // where it starts is the table's startAt, read, not pinned (night graphics moved it off the moon)
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
  check('it is a fight, not a walk: aliens killed (12 or more) on every seed, the carrier alive and hurt on most', rs.every(r => r.kills >= 12 && r.hull > 0) && rs.filter(r => r.hull < 600).length >= 4, JSON.stringify(rs.map(r => [r.kills, r.hull])));
  check('both convoys get through for the sensible player (one escorted, one covered by the wing)', rs.filter(r => r.delivered === 2).length >= 5, rs.map(r => r.delivered).join(' '));
  const a = J(`__play(7, [], __smart, 400)`), b = J(`__play(7, [], __smart, 400)`), c2 = J(`__play(8, [], __smart, 400)`);
  check('the same seed flies the same battle to the last number; another seed flies another', JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c2), JSON.stringify(a));
  check('the fight leaves Math.random as it was (pirateSteer is given the game\'s own numbers for a step, then the page\'s again)', (g.run('window.__r0 = Math.random; __play(9, [], () => {}, 30)'), J('Math.random === __r0')));
  g.run('__new([], 1)');
  g.run('__run(21)');
  check('at 10 s the Mars convoy leaves Earth, at 20 s the first wave comes on the Mars lane (four raiders, two drones), and the game says so', J('C.convoys[0].started') && J('C.waves[0].started') && J(`campAliens(C).filter(u => u.kind === 'raider').length`) === 4 && J(`campAliens(C).filter(u => u.kind === 'drone').length`) === 2 && g.run('C.events.filter(e => e.type === "say").map(e => e.key).join(",")').includes('camp.say.wave1'));
  check('the first wave hunts the Mars convoy, the second and third go for Earth', J(`campAliens(C).every(u => u.goal === 'convoy:mars')`) && J('CAMP.levels[1].waves[1].goal') === 'earth' && J('CAMP.levels[1].waves[2].goal') === 'earth');
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
  const hit = (techs, dmg) => { g.run(`__new(${JSON.stringify(techs)}, 1); campHurt(C, C.carrier, ${dmg}, 'x')`); return J('C.carrier.hp'); };
  check('the shield grid: 40 percent less damage (50 hit takes 30, not 50)', hit([], 50) === 550 && Math.abs(hit(['shield'], 50) - 570) < 1e-6);
  check('hull plating: the hull is half as strong again (900)', (g.run(`__new(['plating'], 1)`), J('C.carrier.hp') === 900 && J('C.carrier.maxHp') === 900));
  check('the second bay: four more fighters', (g.run(`__new(['bay2'], 1)`), J('C.bay.fighters') === 10 && J('C.bay.escorts') === 2));
    g.run(`__new(['beam'], 1); C.waves.forEach(w => { w.started = true; }); const u = campSpawn(C, 'gunship', C.carrier.x + 700, C.carrier.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 9000; C.input.fire = true; campStep(C, 0.05)`);
  check('the beam cannon: the turrets fire beams (twice the damage, 8 not 4), reach half as far again (750 px), and a shot goes through what it hits', J('C.bullets.length') >= 1 && J('C.bullets.every(b => b.beam && b.pd)') && J('C.bullets[0].dmg') === 2 * J('CAMP.carrier.pd') && J('C.bullets[0].dmg') === 8 && Math.abs(J('C.bullets[0].life') - ((750 + 120) / J('CAMP.carrier.pdSpeed') * 1000)) < 80 && J('CAMP.tech.beam.reach') === 1.5);
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
  g.run(`__new([], 1); campHurt(C, C.carrier, 700, 'x')`);
  check('the carrier destroyed loses the level; god mode cannot die', J('C.result') === 'lost' && J('C.why') === 'carrier' && (g.run(`__new([], 1, true); campHurt(C, C.carrier, 700, 'x')`), J('C.result') === null && J('C.carrier.hp') === 600));
  g.run(`__new([], 1); C.ships.push({ id: 'mother-9', kind: 'mother', team: 'alien', x: 99999, y: 0, vx: 0, vy: 0, hp: 10, r: 90 }); C.by['mother-9'] = C.ships[C.ships.length - 1]; campHurt(C, C.by['mother-9'], 50, 'x')`);
  check('the mothership dead wins the level', J('C.result') === 'won' && J('C.why') === 'mother');
  g.run(`__new([], 1)`); const sm = J('campSummary(C)');
  check('the ship computer is told the battle: level, hull, shield, bay, aliens', /level 1, Home/.test(sm) && /hull 600 of 600/.test(sm) && /Earth shield 100 percent/.test(sm) && /6 fighters, 2 escorts/.test(sm), sm);
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
  check('the model is told the battle, the five orders and the Campaign keys, and not the Long Haul list', (() => { const sys = J('shipcompSystem(__scene)'); return /Campaign level 1, Home/.test(sys) && /fleet_launch \| fleet_attack/.test(sys) && /1 launch   2 attack/.test(sys) && !/plot_route/.test(sys) && !/jump_next_hop/.test(sys); })());
  check('the strip, the microphone and the plain-command door all find the Campaign scene (src/cmdstrip.js, src/listen.js, src/shipcomputer.js)', ['src/cmdstrip.js', 'src/listen.js', 'src/shipcomputer.js'].every(f => /sc\.scene\.key === 'Campaign'/.test(src(f))));
  check('the scene is a Phaser scene named Campaign, in the game\'s scene list; the title\'s K opens it', J(`typeof Campaign`) === 'function' && /Journal, Campaign\]/.test(src('src/main.js')) && /KeyK'\) campaignStart\(this\)/.test(src('src/title.js')) && J('typeof campaignStart') === 'function');
  check('the tune kit\'s doors are there, guarded, so this branch runs with or without it: how an order was given (key, strip, voice), how a level was started (menu, address, next, retry, skip), the debug keys, the pause line, the address', (() => { const sc = src('src/campaignscene.js'), ti = src('src/title.js'); return /campOrder\(C, order, '', 'key'\)/.test(sc) && /via: 'retry'/.test(sc) && /via: 'next'/.test(sc) && /via: 'skip'/.test(sc) && /typeof campDebugKey === 'function'/.test(sc) && /typeof campDebugLine === 'function'/.test(sc) && /typeof campAddrPlanPage === 'function'/.test(ti) && /via: 'address'/.test(ti) && /campOrder\(s2\.camp, name, arg, 'strip'\)/.test(src('src/shipcomputer.js')); })());
  check('a level started with techs of its own (the address) takes them instead of the saved ones; an unknown tech is dropped; via is kept on the game', J(`(() => { const C = campNew(1, ['beam', 'nope'], { via: 'address' }); return C.via === 'address' && C.techs.join() === 'beam' && campNew(1, []).via === 'menu'; })()`));
  check('the page loads the sim, then the scene, before main.js makes the game', (() => { const h = src('index.html'), a = h.indexOf('src/campaign.js'), b = h.indexOf('src/campaignscene.js'), m = h.indexOf('src/main.js'); return a > 0 && b > a && m > b; })());
  check('every text the scene says is a key of content/text/ui.md that the game reads (a translation changes it, the code does not)', (() => {
    const sc = src('src/campaignscene.js'), md = src('content/text/ui.md');
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
      f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.hud = { hull: document, earth: document, bay: document, wave: document, mother: document, blink: document, obj: document, keys: document }; f.relicG = document;
      f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false } };
      f.init(Object.assign({ level }, d || {})); f.camp = campNew(f.level, f.P.techs, f.opts); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.showIntro(); __went.length = 0; __toasts2.length = 0; return f; };
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
  check('the mothership dead: the story after the battle, Enter for the tech pick', J('F.mode') === 'won' && (key('Enter'), J('F.mode') === 'pick') && J('F.choices.length') === 3);
  key('Digit9'); check('a key that is not a choice does nothing', J('F.mode') === 'pick');
  key('Digit2');
  check('1, 2 or 3 picks that tech: kept in the progress (level 2 reached, the tech named), and the scene goes on to level 2 started as "next"', JSON.parse(store.get('longhaul.campaign')).level === 2 && JSON.parse(store.get('longhaul.campaign')).techs[0] === J('F.choices[1]') && (() => { const w = J('__went.pop()'); return w.key === 'Campaign' && w.data.level === 2 && w.data.via === 'next'; })());
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
  check('the table has levels 1, 2 and 3: win by the mothership, the relic, the towers; levels 2 and 3 have no Earth and no convoys', J('Object.keys(CAMP.levels).join()') === '1,2,3' && J('CAMP.levels[2].win') === 'relic' && J('CAMP.levels[3].win') === 'towers' && J('CAMP.levels[2].earth') === false && J('CAMP.levels[3].earth') === false && J('CAMP.levels[2].convoys.length + CAMP.levels[3].convoys.length') === 0);
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
  check('a tower on its post: it turns on the nearest of your ships inside 800 px and fires, and does nothing when none is near; it never moves', (() => { g.run('var __t = C.ships.find(u => u.kind === "tower"); var __tx = __t.x, __ty = __t.y; __run(3)'); const idle = J('C.bullets.length') === 0; g.run('C.carrier.x = __t.x + 500; C.carrier.y = __t.y; __run(4)'); return idle && J('C.bullets.some(b => b.team === "alien")') !== undefined && J('__t.x') === J('__tx') && J('__t.y') === J('__ty') && (J('C.carrier.hp') < 600 || J('C.bullets.length') > 0); })());
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
  g.run('__new2(1, [], 1); campOrder(C, "launch"); __run(6)');
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
    window.__plays = (script, secs) => [1, 2, 3, 4, 5, 6].map(sd => { window.C = campNew(1, [], { seed: sd }); for (let i = 0; i < secs * 30 && !C.result; i++) { script(C, i / 30); campStep(C, 1 / 30); C.events.length = 0; } return { r: C.result, w: C.why, t: Math.round(C.t / 1000), earth: Math.round(C.earth.shield) }; });
  `);
  check('the numbers: Earth\'s shield 600 (was 300) and it mends 3 a second after 6 s unhit; wave 3 is two raiders and a gunship (was three and one); the mothership 700 hull, 8 a shot, holds 1,300 px out, launches a raider every 12 s up to 3', J('CAMP.earth.shield') === 600 && J('CAMP.earth.regen') === 3 && J('CAMP.earth.regenDelay') === 6000 && J('CAMP.levels[1].waves[2].ships.raider') === 2 && J('CAMP.levels[1].waves[2].ships.gunship') === 1 && J('CAMP.mother.hp') === 700 && J('CAMP.mother.damage') === 8 && J('CAMP.mother.holdAt') === 1300 && J('CAMP.mother.spawnEvery') === 12000 && J('CAMP.mother.spawnMax') === 3);
  g.run('__new2(1, [], 1); C.earth.shield = 300; C.t = 0; __run(5.9)');
  check('Earth\'s shield does not mend for the first 6 seconds after it was left alone, and then mends 3 a second', J('C.earth.shield') === 300 && (g.run('__run(2)'), Math.abs(J('C.earth.shield') - 306) < 3.5 || J('C.earth.shield') > 300));
  g.run('__new2(1, [], 1); C.earth.shield = 300; __run(20)');
  check('it never mends past its full 600, and a level with no Earth has nothing to mend', (g.run('C.earth.shield = 599; __run(5)'), J('C.earth.shield') === 600) && (g.run('__new2(2, [], 1); __run(5)'), J('C.earth') === null));
  g.run('__new2(1, [], 1); C.earth.shield = 300; C.earth.hitAt = C.t; var __last = 300; var __mend = 0; for (let i = 0; i < 30 * 30; i++) { campBullet(C, { x: 700, y: 0, vx: 0, vy: 0, id: "t" }, Math.PI, 600, 4, 3000, "alien", 0); campStep(C, 1 / 30); if (C.earth.shield > __last + 0.5) __mend++; __last = C.earth.shield; }');
  check('a siege does not mend it: shot at every frame it only goes down, so shots of 1 each 0.033 s never let the 6 s lull come', J('__mend') === 0 && J('C.earth.shield') < 300);
  const plain = J('__plays(__plain, 600)'), stay = J('__plays(__stay, 600)');
  check('a first-time player who launches, escorts, attacks and guards but leaves the carrier alone wins level 1 on at least half the seeds, and never in under three minutes', plain.filter(r => r.r === 'won').length >= 3 && plain.filter(r => r.r === 'won').every(r => r.t >= 150 && r.t <= 360), JSON.stringify(plain.map(r => r.r + ' ' + r.t + ' ' + r.earth)));
  check('and one whose carrier also fires on what comes close wins five seeds of six, in 2.5 to 5 minutes, with Earth\'s shield most of the way up', stay.filter(r => r.r === 'won').length >= 5 && stay.filter(r => r.r === 'won').every(r => r.t >= 150 && r.t <= 300 && r.earth >= 400), JSON.stringify(stay.map(r => r.r + ' ' + r.t + ' ' + r.earth)));
  check('it is still not a walk: nobody wins by doing nothing, and the same two players could not win with the old numbers (Earth\'s shield 300, no mending, the old wave 3 and mothership)', J('__plays(() => {}, 500)').every(r => r.r === 'lost') && (g.run(`window.__old = { e: Object.assign({}, CAMP.earth), m: Object.assign({}, CAMP.mother), w: Object.assign({}, CAMP.levels[1].waves[2].ships) }; CAMP.earth.shield = 300; CAMP.earth.regen = 0; Object.assign(CAMP.mother, { hp: 900, damage: 12, holdAt: 1600, spawnEvery: 8000, spawnMax: 6 }); CAMP.levels[1].waves[2].ships = { raider: 3, gunship: 1 };`), J('__plays(__stay, 600)').filter(r => r.r === 'won').length === 0) && (g.run(`Object.assign(CAMP.earth, __old.e); Object.assign(CAMP.mother, __old.m); CAMP.levels[1].waves[2].ships = __old.w;`), J('CAMP.earth.shield') === 600));
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
  check('the save has no words and no numbers of the battle', Object.keys(JSON.parse((g.run(`campProgressSave({ level: 2, techs: ['shield'] })`), store.get('longhaul.campaign')))).sort().join() === 'level,techs');
  check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\nCAMPAIGN FAIL (${failed} of ${n})` : `\nCAMPAIGN PASS (${n})`);
process.exitCode = failed ? 1 : 0;
