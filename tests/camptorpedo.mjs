// smoke: the torpedo boats: the kinds and the sides, what a boat goes for, arming and launching, the flight and the hit, the cruiser that blocks, the shoot-down, the threat list, the waves and the words (plain Node, no Chrome)
// Card space-game-torpedo-boats (src/camptorpedo.js, CAMP.torpedo in src/campaign.js). The shape the order calls (space-game-order-calls), the Level 1 beats (space-game-l1-1-beats) and the convoy orders build on.
//   A. the kinds and the sides        B. what a boat goes for (prey)       C. arming, launching, running home      D. the torpedo: flight, the hit, the blocker, Earth
//   E. shot down: turrets, missile, stray shots                            F. the threat list                      G. waves, cues and the bonus
//   H. the words                      I. determinism                        J. the pace
// Run: node tests/camptorpedo.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const store = new Map();
const g = nodeGame({ store });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a test mission on Level 1 (this page's own copy of the table): at Ceres, where the cruiser starts; a pirate wave of two torpedo boats and two skiffs after 5 s
g.run(`
  CAMP.levels[1].missions.push({ id: 'tb', kind: 'escort', par: 100, place: 'ceres', dock: 'ceres', 
    rocks: [{ at: [900, 700], n: 7, spread: 300 }],
    objectives: [{ type: 'hold', secs: 100000 }], bonus: [{ id: 'nt', type: 'torpedoes', n: 0 }],
    convoys: [{ id: 'h1', name: 'Hauler 1', at: 2, from: 'vesta', to: 'ceres' }],
    waves: [{ at: 5, from: [3000, 0], ships: { tboat: 2, skiff: 2 }, goal: 'carrier', prey: 'haulers', breaks: 400 }],
    traffic: [] });
  window.__M = CAMP.levels[1].missions.length - 1;
  window.__new = opts => { window.C = campNew(1, [], Object.assign({ seed: 5, god: false, mission: __M }, opts || {})); C.arrivedAt = 0; return C; };
  window.__ev = [];
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.forEach(e => __ev.push(e)); C.events.length = 0; } };
  window.__quiet = () => { C.L.waves = []; C.waves = []; C.L.convoys = []; C.convoys = []; C.L.cues = []; __ev.length = 0; return C; }; // no wave and no convoy of the mission's own: the test lays out the sky
  window.__still = u => { u.vmax = 0; u.accel = 0; return u; };
  window.__spawn = (kind, dx, dy) => campSpawn(C, kind, C.carrier.x + dx, C.carrier.y + dy);
  window.__hauler = (dx, dy) => { const f = campSpawn(C, 'freighter', C.carrier.x + dx, C.carrier.y + dy); f.id = 'freighter-x1'; C.by[f.id] = f; f.dest = { x: f.x + 90000, y: f.y }; f.vmax = 0; f.cname = 'Hauler'; f.named = true; return f; };
  window.__stages = () => __ev.filter(e => e.type === 'torpedo').map(e => e.stage);
  window.__d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
`);

// ---------- A. the kinds and the sides ----------
console.log('A. the kinds and the sides');
{
  g.run('__new(); __quiet()');
  check('two boat kinds in the table: the pirates\' tboat and the aliens\' lancer', J('Object.keys(CAMP.torpedo.boats)').join() === 'tboat,lancer' && J('CAMP.torpedo.boats.tboat.faction') === 'pirate' && J('CAMP.torpedo.boats.lancer.faction') === 'alien');
  const s = J(`(() => { const u = __spawn('tboat', 1500, 0), v = __spawn('lancer', 1500, 300); return { team: u.team, faction: u.faction, boat: u.boat, hp: u.hp, tubes: u.tubes, lteam: v.team, lfaction: v.faction, lhp: v.hp, r: u.r, tr: CAMP.size.tboat.hit } })()`);
  check('a torpedo boat is on the hostile side (team alien): the pirates\' has faction pirate, the aliens\' faction alien', s.team === 'alien' && s.faction === 'pirate' && s.lteam === 'alien' && s.lfaction === 'alien', JSON.stringify(s));
  check('a boat has its own hull and the tubes of its table, and the size table\'s hit circle', s.hp === J('CAMP.torpedo.boats.tboat.hp') && s.lhp === J('CAMP.torpedo.boats.lancer.hp') && s.tubes === J('CAMP.torpedo.boats.tboat.tube.n') && s.r === s.tr && s.boat === true, JSON.stringify(s));
  check('the turrets, the kill counts and the wing\'s targets treat a boat as a foe (campAliens)', J(`campAliens(C).filter(u => u.boat).length`) === 2);
  check('a boat is small: the pace scales it', J(`campSmall('tboat') && campSmall('lancer')`));
  check('a boat has no gun: it never fires a bullet in 20 s with the cruiser in reach', (() => { g.run('__new(); __quiet(); __spawn("tboat", 500, 0); C.carrier.vx = C.carrier.vy = 0'); g.run('__run(20)'); return J('C.bullets.length') === 0 && J('C.bullets.filter(b => b.team === "alien").length') === 0; })());
  g.run('__new(); __quiet()');
  check('a wreck of a boat holds ore (CAMP.torpedo.boats.<kind>.ore)', J(`(() => { const u = __spawn('tboat', 1500, 0); campKill(C, u); return C.pickups.some(p => p.kind === 'wreck' && p.ore === CAMP.torpedo.boats.tboat.ore) && C.kills === 1 })()`));
  check('a game starts with no torpedo in flight and the counts at zero', J(`(() => { __new(); return C.torpedoes.length === 0 && C.torpStat.launched === 0 && C.torpStat.shot === 0 && C.torpStat.hit === 0 })()`));
}

// ---------- B. what a boat goes for ----------
console.log('B. what a boat goes for');
{
  g.run('__new(); __quiet()');
  check('it goes for a hauler 1,500 px off over a fighter 300 px off: fighters are not its prey', J(`(() => { const b = __spawn('tboat', 1500, 600), h = __hauler(2000, 600); const f = __spawn('fighter', 1300, 600); f.order = null; const e = __spawn('fighter', 1400, 700); return campTorpedoTarget(C, b).id === h.id })()`));
  check('it goes for the cruiser when there is no hauler and no miner', J(`(() => { __new(); __quiet(); const b = __spawn('tboat', 1500, 0); const f = __spawn('fighter', 1400, 100); return campTorpedoTarget(C, b).id === C.carrier.id })()`));
  check('the row\'s prey \'carrier\' keeps to the cruiser though a hauler is nearer', J(`(() => { __new(); __quiet(); const b = __spawn('tboat', 1500, 0); __hauler(1700, 0); b.prey = 'carrier'; return campTorpedoTarget(C, b).kind === 'carrier' })()`));
  check('a named hauler (goal convoy:x1) wins over the nearer cruiser', J(`(() => { __new(); __quiet(); const b = __spawn('tboat', 400, 0); const h = __hauler(-3000, 0); b.goal = 'convoy:x1'; return campTorpedoTarget(C, b).id === h.id })()`));
  check('a neutral miner is prey; your own fighter on a Mine order is not (it was: a boat armed on a mining fighter in 1.2, card space-game-l1-pacing-bugs): with the miner gone the boat goes for the cruiser', J(`(() => { __new(); __quiet(); const b = __spawn('tboat', 1500, 0); const m = __spawn('miner', 1700, 0); const t1 = campTorpedoTarget(C, b).id === m.id; m.hp = 0; C.ships = C.ships.filter(s => s.hp > 0); const e = __spawn('fighter', 1700, 0); e.order = { type: 'mine' }; return t1 && campTorpedoTarget(C, b).id === C.carrier.id })()`));
  check('the weights decide between two prey: a hauler 1,000 px off before the cruiser 700 px off (0.5 against 1.1)', J(`(() => { __new(); __quiet(); const b = __spawn('tboat', 700, 0); __hauler(1700, 0); return campTorpedoTarget(C, b).kind === 'freighter' })()`));
}

// ---------- C. arming, launching, running home ----------
console.log('C. arming, launching, running home');
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0');
  g.run(`window.__b = __spawn('tboat', 4000, 0); __b.goal = 'convoy:x1'; window.__h = __hauler(4000 - 560, 0); __b.rot = Math.PI; `);
  g.run('__run(0.5)');
  check('in range with its nose on its prey it begins to arm: an arming event, and it holds still', J(`__stages()`).join() === 'arming' && J('Math.hypot(__b.vx, __b.vy)') < 40 && J('__b.arming') > 0, J('__stages()'));
  check('it says so on the radio (the line for a named ship)', J(`__ev.some(e => e.type === 'say' && e.key === 'camp.say.torp.arm.name' && e.vars.name === 'Hauler')`));
  g.run('__run(0.5)');
  check('no torpedo yet: the windup is ' + J('CAMP.torpedo.boats.tboat.tube.windup') + ' ms', J('C.torpedoes.length') === 0 && J('C.torpStat.launched') === 0);
  g.run('__run(0.5)');
  const t = J('C.torpedoes[0] || null');
  check('then it launches: one torpedo in C.torpedoes and C.by, from the boat, at the hauler, with the table\'s hull', !!t && t.from === J('__b.id') && t.target === J('__h.id') && t.hp === J('CAMP.torpedo.torp.hp') && J('C.by[C.torpedoes[0].id] === C.torpedoes[0]') && J('C.torpStat.launched') === 1, JSON.stringify(t));
  check('the events say arming and launch, and the radio says it is away', J(`__stages()`).join() === 'arming,launch' && J(`__ev.some(e => e.type === 'say' && e.key === 'camp.say.torp.fire.name')`));
  check('the boat has one tube less and its reload is running', J('__b.tubes') === J('CAMP.torpedo.boats.tboat.tube.n') - 1 && J('__b.tubeAt > C.t'));
  g.run('__hauler(0, 0).hp = 0'); // (the first hauler is replaced below: the second launch is at the cruiser)
}
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0');
  g.run(`window.__b = __spawn('tboat', 560, 0); __b.rot = Math.PI; __b.vmax = 0; __b.accel = 0; C.god = true;`); // at the cruiser, held in place; the cruiser cannot die
  g.run('__run(1.1)');
  check('killed while it arms, it fires nothing', (() => { g.run('campKill(C, __b)'); g.run('__run(2)'); return J('C.torpStat.launched') === 0 && J('C.torpedoes.length') === 0; })());
}
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.god = true');
  g.run(`window.__b = __spawn('tboat', 600, 0); __b.rot = Math.PI; __b.vmax = 0; __b.accel = 0;`);
  g.run('__run(2.2)');
  const first = J('C.torpStat.launched');
  g.run('__run(5)');
  check('the second torpedo waits for the reload (' + J('CAMP.torpedo.boats.tboat.tube.reload') + ' ms)', first === 1 && J('C.torpStat.launched') === 1);
  g.run('__run(4.5)');
  check('then it launches again; with the last one gone, it breaks off and runs', J('C.torpStat.launched') === 2 && J('__b.running !== undefined && !!__b.running'), J('C.torpStat.launched'));
  g.run('__b.vmax = 200; __b.accel = 200; __run(60)');
  check('a pirate boat that has run far enough is gone (not killed): C.piratesEscaped counts it', J('C.piratesEscaped') === 1 && J('C.kills') === 0 && J('__b.hp') === 0 && J('__b.gone === true'));
}
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.god = true');
  g.run(`window.__b = __spawn('lancer', 600, 0); __b.rot = Math.PI; __b.vmax = 0; __b.accel = 0; __b.tubes = 1;`);
  g.run('__run(2.2); __b.vmax = 200; __b.accel = 200; __run(60)');
  check('an alien boat out of torpedoes goes the same way, and counts as an escaped alien, not a pirate', J('C.aliensEscaped') === 1 && J('C.piratesEscaped') === 0 && J('C.kills') === 0);
}
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.god = true');
  g.run(`window.__b = __spawn('tboat', 600, 0); __b.rot = Math.PI; __b.vmax = 0; __b.accel = 0; campPirateBreak(C, 'all')`);
  check('a pirate boat breaks off on the pirates\' own cue (campPirateBreak) and fires nothing', (() => { g.run('__run(5)'); return J('C.torpStat.launched') === 0 && J('!!__b.running'); })());
}

// ---------- D. the torpedo: flight, the hit, the blocker, Earth ----------
console.log('D. the torpedo: the flight, the hit, the blocker');
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.input.fire = false');
  g.run(`window.__b = __spawn('tboat', 3000, 0); __b.rot = Math.PI; __still(__b); __b.tubes = 0; window.__h = __hauler(2000, 0); __b.tubes = 1; __b.arming = 0;`);
  g.run(`window.__t = campTorpedoLaunch(C, __b, __h); __b.tubes = 0; `);
  const x0 = J('__t.x');
  g.run('__run(1)');
  check('it flies toward its prey and speeds up to ' + J('CAMP.torpedo.torp.speed') + ' px/s', J('__t.x') < x0 - 100 && J('Math.hypot(__t.vx, __t.vy)') > J('CAMP.torpedo.torp.launch') + 80);
  g.run('__run(5)');
  check('it hits the hauler: a hit event, a blast, the hit counted, the hauler\'s hull down by its damage', J(`__stages()`).includes('hit') && J(`__ev.some(e => e.type === 'tboom')`) && J('C.torpStat.hit') === 1 && Math.abs(J('__h.maxHp - __h.hp') - J('CAMP.torpedo.torp.dmg')) < 1, J('[__h.hp, __h.maxHp, C.torpStat.hit]'));
  check('the torpedo is gone from the list and from C.by after it goes off', J('C.torpedoes.length') === 0 && J('C.by[__t.id] === undefined'));
  check('the radio says the hauler took a torpedo', J(`__ev.some(e => e.type === 'say' && e.key === 'camp.say.torp.hit.name' && e.vars.name === 'Hauler')`));
}
{
  // the cruiser blocks: the hauler is behind the cruiser as the boat sees it, the torpedo meets the cruiser first, and the shield takes it
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.input.fire = false');
  g.run(`window.__b = __spawn('tboat', 1000, 0); __b.rot = Math.PI; __still(__b); __b.tubes = 1; window.__h = __hauler(-700, 0); window.__t = campTorpedoLaunch(C, __b, __h); __b.tubes = 0;`);
  const sh = J('C.shield'), hh = J('__h.hp');
  g.run('__run(5)');
  check('a torpedo aimed at a hauler behind the cruiser hits the cruiser: the shield is down by the damage, the hauler is whole', J('C.shield') < sh && Math.abs(sh - J('C.shield') - J('CAMP.torpedo.torp.dmg')) < 1 && J('__h.hp') === hh, J('[C.shield, __h.hp]'));
  check('and the radio says the cruiser was hit (the line for us)', J(`__ev.some(e => e.type === 'say' && e.key === 'camp.say.torp.hit.us')`));
}
{
  // the blast: another of yours close to where it goes off takes the splash
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.input.fire = false');
  g.run(`window.__b = __spawn('tboat', 3000, 0); __still(__b); __b.tubes = 1; window.__h = __hauler(1500, 0); window.__f = __spawn('fighter', 1500, 60); __f.vmax = 0; __f.accel = 0; __f.order = null; window.__t = campTorpedoLaunch(C, __b, __h); __b.tubes = 0; __t.x = __h.x + 40; __t.y = __h.y; __t.rot = Math.PI;`);
  g.run('__run(1)');
  check('a ship of yours within the blast takes splash of the damage, the one hit takes all of it', Math.abs(J('__f.maxHp - __f.hp') - J('CAMP.torpedo.torp.dmg * CAMP.torpedo.torp.splash')) < 1 || J('__f.hp') <= 0, J('[__f.hp, __h.hp]'));
}
{
  // out of fuel: it goes out with no bang
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0');
  g.run(`window.__b = __spawn('tboat', 9000, 0); __still(__b); __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __t.life = 200; __t.target = ''; __t.rot = 0;`);
  g.run('__run(1)');
  check('out of fuel it fizzles: no bang, no damage, a fizzle event', J('C.torpedoes.length') === 0 && J('__stages()').includes('fizzle') && J('C.torpStat.hit') === 0);
}
{
  // Earth's disc is hit as a shot is
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.carrier.x = 5000; C.carrier.y = 5000; C.earth = { x: 0, y: 0, r: CAMP.earth.radius, shield: CAMP.earth.shield, max: CAMP.earth.shield }; C.earth.loseWhy = "earth"'); // (the rim missions have no Earth: this one has it)
  const sh = J('C.earth.shield');
  g.run(`window.__b = campSpawn(C, 'tboat', C.earth.x + C.earth.r + 300, C.earth.y); __still(__b); __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __t.rot = Math.PI; __t.target = '';`);
  g.run('__run(3)');
  check('a torpedo that crosses Earth\'s disc goes off on it: the shield takes damage times the aliens\' Earth factor', J('C.earth.shield') < sh && Math.abs(sh - J('C.earth.shield') - J('CAMP.torpedo.torp.dmg * CAMP.alien.earthDamage')) < 0.5, J('[C.earth.shield, C.torpStat.hit]'));
}
{
  // dmg follows the level's damage scale
  g.run('__new(); __quiet(); C.dmgS = 2');
  g.run(`window.__b = __spawn('tboat', 3000, 0); __still(__b); __b.tubes = 1; window.__h = __hauler(2500, 0); window.__t = campTorpedoLaunch(C, __b, __h)`);
  check('the damage scale of the mission multiplies the torpedo\'s damage', J('__t.dmg') === J('CAMP.torpedo.torp.dmg * 2'));
}

// ---------- E. shot down ----------
console.log('E. shot down: the turrets, the missile, the stray shot');
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.input.fire = true');
  g.run(`window.__b = __spawn('tboat', 3000, 0); __still(__b); __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __b.tubes = 0; __t.x = C.carrier.x + 480; __t.y = C.carrier.y; __t.rot = Math.PI;`);
  g.run('__run(3)');
  check('the cruiser\'s turrets shoot a torpedo down before it arrives: a shot event, none hit', J('C.torpStat.shot') === 1 && J('C.torpStat.hit') === 0 && J(`__stages()`).includes('shot') && J('C.torpedoes.length') === 0, J('[C.torpStat, __stages()]'));
  check('the radio says it is down', J(`__ev.some(e => e.type === 'say' && e.key === 'camp.say.torp.down')`));
}
{
  // a torpedo in reach is shot before an alien that is nearer by less than the bias
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.input.fire = true');
  g.run(`window.__a = __spawn('raider', 0, 330); __still(__a); __a.hp = __a.maxHp = 9999; window.__b = __spawn('tboat', 3000, 0); __still(__b); __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __b.tubes = 0; __t.x = C.carrier.x + 450; __t.y = C.carrier.y; __t.rot = Math.PI; __t.sp = 0; campTurrets(C);`);
  check('a torpedo 450 px off is the turrets\' target over a raider 330 px off (inside the bias)', J('C.turrets.some(tu => tu.target === __t.id)') && J('C.turrets.every(tu => tu.target === __t.id)'), J('C.turrets.map(tu => tu.target)'));
  g.run(`__t.x = C.carrier.x + 450; __t.y = C.carrier.y; __a.y = C.carrier.y + 100; campTurrets(C);`);
  check('but not over a raider 100 px off (well outside the bias)', J('C.turrets.every(tu => tu.target === __a.id)'), J('C.turrets.map(tu => tu.target)'));
}
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.input.fire = false; C.god = true');
  g.run(`window.__b = __spawn('tboat', 3000, 0); __still(__b); __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __b.tubes = 0; __t.x = C.carrier.x + 900; __t.y = C.carrier.y + 40; __t.rot = Math.PI; __t.sp = 0;`);
  const r = J(`campOrder(C, 'missiles', '', 'key')`);
  check('F with no big ship and no mothership flies a missile at the torpedo in reach (the order says yes)', r.ok === true && J('C.rockets.length') === 1 && J('C.rockets[0].target') === J('__t.id'), JSON.stringify(r));
  g.run('__run(4)');
  check('the missile\'s fuze goes off near the torpedo and its blast kills it', J('C.torpStat.shot') === 1 && J('C.torpStat.hit') === 0 && J('C.torpedoes.length') === 0, J('C.torpStat'));
}
{
  // without a torpedo F answers as before: no big ship
  g.run('__new(); __quiet()');
  check('F with no torpedo and no big ship still says there is none in range', J(`campOrder(C, 'missiles', '', 'key').ok`) === false);
  // a torpedo beyond the lock is not a target
  g.run(`window.__b = __spawn('tboat', 3000, 0); __still(__b); __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __b.tubes = 0; __t.x = C.carrier.x + 2500; __t.sp = 0;`);
  check('and a torpedo beyond the lock (' + J('CAMP.torpedo.torp.lock') + ' px) is not one', J(`campOrder(C, 'missiles', '', 'key').ok`) === false);
}
{
  // a stray shot of yours (or a neutral's) that crosses a torpedo hurts it; four turret shots of 4 are the hull's 14
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0; C.input.fire = false');
  g.run(`window.__b = __spawn('tboat', 3000, 0); __still(__b); __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __b.tubes = 0; __t.x = C.carrier.x + 1500; __t.y = C.carrier.y; __t.rot = Math.PI; __t.sp = 0; __t.vx = __t.vy = 0; __t.life = 1e9;`);
  g.run(`campBullet(C, { x: C.carrier.x + 1300, y: C.carrier.y, id: 'fighter-9' }, 0, 700, 4, 2000, 'earth', 0)`);
  g.run('campBullets(C, 0.4)');
  check('a shot of yours that crosses a torpedo takes 4 off it and is spent', J('__t.hp') === J('CAMP.torpedo.torp.hp') - 4 && J('C.bullets.length') === 0, J('[__t.hp, C.bullets.length]'));
  g.run(`campBullet(C, { x: C.carrier.x + 1300, y: C.carrier.y, id: 'patrol-9' }, 0, 700, 4, 2000, 'neutral', 0)`);
  g.run('campBullets(C, 0.4)');
  check('so does a neutral\'s shot', J('__t.hp') === J('CAMP.torpedo.torp.hp') - 8);
  g.run(`campBullet(C, { x: C.carrier.x + 1300, y: C.carrier.y, id: 'raider-9' }, 0, 700, 4, 2000, 'alien', 0)`);
  g.run('campBullets(C, 0.4)');
  check('a hostile shot does not: the torpedo is the hostile side\'s own', J('__t.hp') === J('CAMP.torpedo.torp.hp') - 8);
  g.run(`campBullet(C, { x: C.carrier.x + 1300, y: C.carrier.y, id: 'fighter-9' }, 0, 700, 8, 2000, 'earth', 0); campBullets(C, 0.4)`);
  check('the shot that takes the last hit point shoots it down: counted, a shot event', J('C.torpStat.shot') === 1 && J(`C.events.some(e => e.type === 'torpedo' && e.stage === 'shot')`));
  // a beam goes through and hurts a torpedo once
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0');
  g.run(`window.__b = __spawn('tboat', 3000, 0); __still(__b); __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __b.tubes = 0; __t.x = C.carrier.x + 1500; __t.y = C.carrier.y; __t.sp = 0; __t.vx = __t.vy = 0; __t.life = 1e9;`);
  g.run(`const bm = campBullet(C, { x: C.carrier.x + 1400, y: C.carrier.y, id: 'carrier-1' }, 0, 700, 3, 2000, 'earth', 0, { beam: true }); for (let i = 0; i < 6; i++) campBullets(C, 0.05);`);
  check('a beam hurts a torpedo once, though it passes through', J('__t.hp') === J('CAMP.torpedo.torp.hp') - 3, J('__t.hp'));
}

// ---------- F. the threat list ----------
console.log('F. the threat list');
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0');
  g.run(`window.__h = __hauler(3000, 0); window.__b = __spawn('tboat', 4500, 0); __b.goal = 'convoy:x1'; __b.rot = Math.PI; window.__b2 = __spawn('tboat', 5500, 0); __b2.goal = 'convoy:x1'; __b2.rot = Math.PI; __run(0.1)`);
  const th = J('campTorpedoThreats(C)');
  check('every boat with a torpedo left is a threat, soonest first, with its target and an eta', th.length === 2 && th[0].kind === 'boat' && th[0].target === J('__h.id') && th[0].eta <= th[1].eta && th[0].eta > 0 && th[0].launchIn > 0 && th[0].fac === 'pirate', JSON.stringify(th));
  check('the nearer boat is the first', th[0].id === J('__b.id'));
  g.run(`__b.tubes = 1; __b.x = __h.x + 500; __b.y = __h.y; window.__t = campTorpedoLaunch(C, __b, __h); __b.tubes = 0; `);
  const th2 = J('campTorpedoThreats(C)');
  check('a torpedo in flight is a threat of kind torpedo, with the seconds to its target and no launch to wait for', th2.some(x => x.kind === 'torpedo' && x.id === J('__t.id') && x.launchIn === 0 && x.eta > 0 && x.target === J('__h.id')), JSON.stringify(th2));
  check('a boat with no torpedo left is no longer one', !th2.some(x => x.id === J('__b.id')), JSON.stringify(th2));
  g.run('__run(4)');
  check('when the torpedo has gone off, it leaves the list', !J('campTorpedoThreats(C)').some(x => x.kind === 'torpedo'));
  check('campTorpedoBoats lists the boats alive', J('campTorpedoBoats(C).length') === 2);
}

// ---------- G. waves, cues and the bonus ----------
console.log('G. waves, cues and the bonus');
{
  g.run('__new()');
  g.run('__run(6)');
  const w = J(`C.ships.filter(u => u.boat).map(u => ({ kind: u.kind, prey: u.prey, wave: u.wave, goal: u.goal }))`);
  check('a wave row\'s `ships: { tboat: 2, skiff: 2 }` brings two boats and two skiffs, and the boats take the row\'s prey', w.length === 2 && w.every(b => b.kind === 'tboat' && b.prey === 'haulers' && b.wave === 0 && b.goal === 'carrier') && J(`C.ships.filter(u => u.kind === 'skiff').length`) === 2, JSON.stringify(w));
  check('they are counted as part of the wave: the wave is not cleared while a boat lives', J(`campWaveOn(C, { cleared: 'wave:0' })`) === false);
  g.run(`C.ships.filter(u => u.team === 'alien').forEach(u => campKill(C, u)); C.ships = C.ships.filter(u => u.hp > 0)`);
  check('the wave is cleared when the boats and the skiffs are dead', J(`campWaveOn(C, { cleared: 'wave:0' })`) === true);
  g.run('__new()');
  check('the bonus { type: torpedoes, n: 0 } is met while none has hit, and lost with the first hit', J(`campBonuses(C)[0].ok`) === true && (g.run('C.torpStat.hit = 1'), J(`campBonuses(C)[0].ok`) === false));
  g.run('__new(); C.torpStat.hit = 1; C.L.bonus[0].n = 1');
  check('and n: 1 allows one hit', J(`campBonuses(C)[0].ok`) === true);
}
{
  // the wave's `breaks` takes the pirate boats away with the rest of the wave
  g.run('__new(); C.L.waves[0].breaks = 8');
  g.run('__run(20)');
  check('a wave that breaks off takes its pirate boats with it (they run: no torpedo is launched after)', J(`C.ships.filter(u => u.boat).every(u => !!u.running)`) || J('C.ships.filter(u => u.boat).length') === 0, J(`C.ships.filter(u => u.boat).map(u => !!u.running)`));
}

// ---------- H. the words ----------
console.log('H. the words');
{
  const keys = [...src('src/camptorpedo.js').matchAll(/'(camp\.say\.torp\.[a-z.]+)'/g)].map(m => m[1]), stems = [...src('src/camptorpedo.js').matchAll(/campTorpKey\([a-z]+, '(camp\.say\.torp\.[a-z]+)'\)/g)].map(m => m[1]);
  const all = new Set(keys.filter(k => !stems.includes(k)).concat(stems.flatMap(s => [s + '.name', s + '.us'])));
  const md = src('content/text/campaign-torpedo.md'), tab = src('src/contenttables.js');
  check('every line the code can say (' + all.size + ') is in its own file, content/text/campaign-torpedo.md, and is a default in the content tables', [...all].every(k => md.includes('| ' + k + ' |') && tab.includes("'" + k + "'")), [...all].filter(k => !md.includes('| ' + k + ' |')).join());
  check('the lines are curt: 12 words at most, one sentence or two, and a full stop', [...all].every(k => { const t = J(`uiText('${k}', { name: 'Hauler' })`); return t.indexOf('camp.say') < 0 && t.split(' ').length <= 12 && /[.]$/.test(t); }));
  check('the pirates\' boat is never called an alien in its lines', [...all].every(k => !/alien/i.test(J(`uiText('${k}', { name: 'x' })`))));
  check('the two kinds have a name for the map\'s list', J(`uiText('camp.nav.k.tboat')`) === 'Torpedo boat' && J(`uiText('camp.nav.k.lancer')`) === 'Lancer');
  check('the new file is registered in index.html, after the pirates\' and before anything that flies a battle', (() => { const h = src('index.html'), a = h.indexOf('src/camppirates.js'), b = h.indexOf('src/camptorpedo.js'); return a > 0 && b > a; })());
}

// ---------- I. determinism ----------
console.log('I. the same seed flies the same');
{
  const run = () => { g.run('__new({ seed: 7 })'); g.run('__run(45)'); return J(`JSON.stringify({ s: C.torpStat, b: C.ships.filter(u => u.boat).map(u => [Math.round(u.x), Math.round(u.y), u.tubes]), t: C.torpedoes.map(t => [Math.round(t.x), Math.round(t.y)]), hh: Math.round(C.carrier.hp), sh: Math.round(C.shield) })`); };
  const a = run(), b = run();
  check('two runs of one seed are the same, to the pixel', a === b, a + ' | ' + b);
  g.run('__new({ seed: 7 })'); g.run('__run(45)');
  check('and a battle with boats in it does launch a torpedo in 45 s (the test is not empty)', J('C.torpStat.launched') >= 1, J('C.torpStat'));
}

// ---------- J. the pace ----------
console.log('J. the pace');
{
  g.run('__new(); __quiet()');
  const p0 = J(`(() => { const u = __spawn('tboat', 2000, 0); return { v: u.vmax, a: u.accel } })()`);
  g.run('campPaceSet(C, 0.5)');
  const p1 = J(`(() => { const u = C.ships.find(s => s.boat); return { v: u.vmax, a: u.accel } })()`);
  check('the pace slows a boat, and a quick pace puts it back', p1.v < p0.v && p1.a < p0.a && (g.run('campPaceSet(C, 1)'), J(`C.ships.find(s => s.boat).vmax`) === p0.v), JSON.stringify([p0, p1]));
}

// ---------- K. the wing and the bots ----------
console.log('K. the wing\'s words and the plain bot');
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0');
  g.run(`window.__b = __spawn('tboat', 1800, 0); window.__b2 = __spawn('lancer', 900, 0); window.__sk = __spawn('skiff', 600, 0); window.__f1 = __spawn('fighter', 100, 50); window.__f2 = __spawn('fighter', 100, -50); __f1.order = __f2.order = null;`);
  check('"torpedo boat" names the nearest boat of either side, "skiff" the nearest skiff, "lancer" the aliens\' boat', J(`campWingTarget(C, 'the torpedo boat').id`) === J('__b2.id') && J(`campWingTarget(C, 'that skiff').id`) === J('__sk.id') && J(`campWingTarget(C, 'lancer').id`) === J('__b2.id') && J(`campWingTarget(C, 'torpedo boats').id`) === J('__b2.id'));
  const r = J(`campWingOrder(C, 'fighters', 'attack', 'the torpedo boat')`);
  check('the order "fighters attack the torpedo boat" goes to the fighters, at that boat', r.ok === true && J(`__f1.order.type`) === 'attack' && J(`JSON.stringify(__f1.order).indexOf(__b2.id) >= 0`), JSON.stringify(r) + J('JSON.stringify(__f1.order)'));
}
{
  const bot = await import('../tools/campaign-bot.mjs');
  bot.botGame.run(`CAMP.levels[1].missions.push({ id: 'tbbot', kind: 'escort', par: 300, hpScale: 1, dmgScale: 1, place: 'ceres', dock: 'ceres', start: 'ceres', startAt: [130, 30],
    convoys: [{ id: 't1', name: 'Transport', at: 4, from: 'ceres', to: 'vesta', speed: 45 }], objectives: [{ type: 'deliver', n: 1 }], bonus: [{ id: 'nt', type: 'torpedoes', n: 0 }],
    waves: [{ at: 10, from: [2500, -1200], ships: { tboat: 2, skiff: 2 }, goal: 'convoy:t1', prey: 'haulers' }] })`); // 62 s of road for the transport: two boats and two skiffs come at her from ahead
  const idx = JSON.parse(bot.botGame.run('JSON.stringify(CAMP.levels[1].missions.length - 1)')), rs = [], torp = [];
  for (let seed = 1; seed <= 4; seed++) { rs.push(bot.run(1, seed, 'plain', 'steady', [], 200, idx)); torp.push(JSON.parse(bot.botGame.run('JSON.stringify(window.C.torpStat)'))); }
  check('the plain bot, with no new orders but the boat rule, still delivers the transport against two torpedo boats and two skiffs (4 of 4 seeds)', rs.every(r => r.result === 'won' && r.delivered === 1 && r.convoyLost === 0), JSON.stringify(rs.map(r => [r.result, r.why, r.convoyLost])));
  check('and the boats did fire in those runs (the test is not empty), and the cruiser\'s turrets shot torpedoes down', torp.some(t => t.launched >= 1) && torp.some(t => t.shot >= 1), JSON.stringify(torp));
}

// ---------- L. the map (card space-game-torpedo-art) ----------
console.log('L. the map\'s marks and legend');
{
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0');
  g.run(`window.__b = __spawn('tboat', 1500, 0); window.__l = __spawn('lancer', 1500, 300); __b.rot = 1; __b.arming = C.t + 500; __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __b.tubes = 0;`);
  const marks = J('campMapMarks(C)');
  const tb = marks.filter(m => m.type === 'tboat'), tp = marks.filter(m => m.type === 'torpedo');
  check('a torpedo boat (either side) is a mark of its own, type tboat, not a pirate or an alien dot', tb.length === 2 && !marks.some(m => (m.type === 'pirate' || m.type === 'alien') && /^(tboat|lancer)-/.test(m.id)), JSON.stringify(marks.map(m => [m.type, m.id])));
  check('the pirates\' boat is yellow like the pirates and the aliens\' is red like the aliens', tb.find(m => /^tboat-/.test(m.id)).color === J('CAMPMAP.color.pirate') && tb.find(m => /^lancer-/.test(m.id)).color === J('CAMPMAP.color.alien'));
  check('a boat that arms says so on its mark (the map pulses a ring), with its heading', tb.find(m => /^tboat-/.test(m.id)).arming === true && tb.find(m => /^lancer-/.test(m.id)).arming === false && Math.abs(tb.find(m => /^tboat-/.test(m.id)).rot - 1) < 1e-9);
  check('a torpedo in flight is a mark, type torpedo, with its heading, in its own bright colour', tp.length === 1 && tp[0].id === J('__t.id') && tp[0].color === J('CAMPMAP.color.torpedo') && typeof tp[0].rot === 'number', JSON.stringify(tp));
  check('the torpedo is drawn above the ships and under the carrier (the carrier is last)', marks[marks.length - 1].type === 'carrier' && marks.findIndex(m => m.type === 'torpedo') > marks.findIndex(m => m.type === 'tboat'));
  const lg = J('campMapLegend(C)');
  check('the legend has a row for the boats and one for the torpedoes, with their words and counts', lg.some(r => r.type === 'tboat' && r.text === 'Torpedo boats (2)') && lg.some(r => r.type === 'torpedo' && r.text === 'Torpedoes (1)'), JSON.stringify(lg.map(r => r.text)));
  g.run('C.torpedoes.forEach(t => { t.dead = true }); ');
  check('a torpedo that is gone is no mark', J(`campMapMarks(C).filter(m => m.type === 'torpedo').length`) === 0);
  check('the boats are in the nav list of the map as enemies, by name ("Torpedo boat 3")', J('campNavRows(C)').some(r => /^Torpedo boat \d+$/.test(r.name)) && J('campNavRows(C)').some(r => /^Lancer \d+$/.test(r.name)), JSON.stringify(J('campNavRows(C)').map(r => r.name)));
  check('the two legend words are in their own file and the content tables', (() => { const md = src('content/text/campaign-torpedo.md'), tab = src('src/contenttables.js'); return ['camp.map.tboat', 'camp.map.torpedo'].every(k => md.includes('| ' + k + ' |') && tab.includes("'" + k + "'")); })());
}

// ---------- M. the pictures and the scene's drawing ----------
console.log('M. the pictures, the torpedo\'s drawing, the arming glow');
{
  g.run(`window.__rec = fn => { const ops = []; const gfx = new Proxy({}, { get: (t, name) => (...a) => { ops.push([name].concat(a)); return gfx; } }); window[fn](gfx); return ops; };`);
  const hsv = c => { const r = (c >> 16 & 255) / 255, gg = (c >> 8 & 255) / 255, b = (c & 255) / 255, mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), d = mx - mn; let h = 0; if (d) h = mx === r ? ((gg - b) / d + 6) % 6 : mx === gg ? (b - r) / d + 2 : (r - gg) / d + 4; return { h: h * 60, s: mx ? d / mx : 0, v: mx }; };
  const fns = { tboat: 'campTboatDraw', lancer: 'campLancerDraw' };
  Object.keys(fns).forEach(kind => {
    const ops = J(`__rec('${fns[kind]}')`), [W, Ht] = J(`campArtSize('${kind}')`), a = J(`CAMP_ART.${kind}`), k = a.k;
    check(kind + ': it is the picture campPirateArt gives for the kind, and campShipTexture falls back to it', J(`campPirateArt('${kind}') === ${fns[kind]}`));
    check(kind + ': it draws with fills, plain lines and paths only', [...new Set(ops.map(o => o[0]))].every(o => ['fillStyle', 'lineStyle', 'fillRect', 'fillCircle', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fillPath', 'strokePath', 'lineBetween'].includes(o)));
    check(kind + ': the picture is the hull plus a margin each side, k times the units', W === Math.round((a.len + 2 * a.pad) * k) && Ht === Math.round((2 * a.half + 2 * a.pad) * k), W + ' x ' + Ht);
    const out = []; ops.forEach(([o, ...p]) => { const inside = (x, y) => x >= -0.5 && y >= -0.5 && x <= W + 0.5 && y <= Ht + 0.5; if (o === 'fillRect' && !(inside(p[0], p[1]) && inside(p[0] + p[2], p[1] + p[3]))) out.push([o, ...p]); if (o === 'fillCircle' && !(inside(p[0] - p[2], p[1] - p[2]) && inside(p[0] + p[2], p[1] + p[2]))) out.push([o, ...p]); if (o === 'moveTo' || o === 'lineTo') { if (!inside(p[0], p[1])) out.push([o, ...p]); } if (o === 'lineBetween' && !(inside(p[0], p[1]) && inside(p[2], p[3]))) out.push([o, ...p]); });
    check(kind + ': every mark lies inside the picture', out.length === 0, out.length + ' outside, first ' + JSON.stringify(out[0]));
    const used = new Set(); ops.forEach(([o, x, y]) => { if (o === 'fillStyle') used.add(x); if (o === 'lineStyle') used.add(y); });
    check(kind + ': no green (it is yours) and nothing cyan or blue but a canopy glass', [...used].every(c => { const x = hsv(c); return !(x.h >= 90 && x.h <= 200 && x.s > 0.3); }));
    if (kind === 'tboat') check('tboat: nothing red or pink (the aliens\' own), it is rust and ochre', [...used].every(c => { const x = hsv(c); return !((x.h >= 330 || x.h <= 15) && x.s > 0.3); }));
    if (kind === 'lancer') check('lancer: it is violet with a red-pink glow: some of its colours are violet and some red', [...used].some(c => { const x = hsv(c); return x.h >= 250 && x.h <= 290 && x.s > 0.3; }) && [...used].some(c => { const x = hsv(c); return (x.h >= 330 || x.h <= 15) && x.s > 0.3; }));
    const look = J(`campArtLook('${kind}', '${kind}')`);
    check(kind + ': the scene scales it to the table length CAMP.size.' + kind + '.len, and CAMP_LOOK has it', Math.abs(look.scale * look.w - J(`CAMP.size.${kind}.len`)) < 1e-9 && look.art === kind && J(`CAMP_LOOK.${kind}.art`) === kind);
    check(kind + ': the hit circle is inside the drawn ship (under its half length)', J(`CAMP.size.${kind}.hit`) <= J(`CAMP.size.${kind}.len`) / 2);
  });
  check('a boat is bigger than a pirate cutter and smaller than the cruiser', J('CAMP.size.tboat.len > CAMP.size.cutter.len && CAMP.size.tboat.len < CAMP.size.carrier.len && CAMP.size.lancer.len < CAMP.size.carrier.len'));
  check('campShipTexture makes each under its own key at the size campArtSize says', (() => { const tex = J(`(() => { const made = {}; const sc = { textures: { exists: k => !!made[k] }, make: { graphics: () => { const g = new Proxy({}, { get: (t, n) => n === 'generateTexture' ? (k, w, h) => { made[k] = [w, h]; } : () => g }); return g; } } }; return ['tboat', 'lancer'].map(k => [campShipTexture(sc, k), made['camp-' + k]]) })()`); return tex.every(([key, size], i) => key === 'camp-' + ['tboat', 'lancer'][i] && size && size[0] === J(`campArtSize('${['tboat', 'lancer'][i]}')`)[0]); })());
  // the scene half, in a stand-in scene (a Proxy that takes any call): the torpedo's texture, its sprites made and destroyed with it, the arming glow, the events
  g.run('__new(); __quiet(); C.carrier.vx = C.carrier.vy = 0');
  g.run(`window.__mk = () => { const live = new Set(), made = {}, booms = []; const mkObj = () => { const o = new Proxy(function () {}, { get: (t, k) => k === 'destroy' ? () => { live.delete(o); } : () => o, apply: () => o }); live.add(o); return o; };
    return { live, made, booms, camp: C, mode: 'play', hud: {}, textures: { exists: k => !!made[k] }, make: { graphics: () => { const g = new Proxy({}, { get: (t, n) => n === 'generateTexture' ? (k, w, h) => { made[k] = [w, h]; } : () => g }); return g; } },
      add: { graphics: () => mkObj(), image: () => mkObj() }, tweens: { add: () => {} }, boom: { explode: (...a) => booms.push(a) }, cameras: { main: { shake: () => {} } } }; }; window.__sc = __mk();`);
  g.run(`window.__b = __spawn('tboat', 700, 0); __b.rot = Math.PI; __b.tubes = 1; window.__t = campTorpedoLaunch(C, __b, C.carrier); __b.tubes = 1; __b.arming = C.t + 600; campTorpedoSync(__sc, 16)`);
  check('the torpedo texture is made once, ' + J('CAMP_TORP.size.join(" x ")'), J('JSON.stringify(__sc.made.torpedo)') === J('JSON.stringify(CAMP_TORP.size)'));
  check('a torpedo in flight gets a body and a flame (two sprites), and the arming boat does not break the frame', J('Object.keys(__sc.hud.tp.sp).length') === 1 && J('__sc.live.size') >= 4);
  const live = J('__sc.live.size');
  g.run('__t.dead = true; campTorpedoSync(__sc, 16)');
  check('when the torpedo is gone its two sprites are destroyed', J('Object.keys(__sc.hud.tp.sp).length') === 0 && J('__sc.live.size') === live - 2, J('[__sc.live.size, ' + live + ']'));
  check('a scene that starts again (a new hud, its old graphics destroyed) makes its torpedo graphics anew, not from a stale field of the scene object', (() => { g.run(`window.__old = __sc.hud.tp.g; __sc.hud = {}; campTorpedoSync(__sc, 16)`); return J('!!__sc.hud.tp && __sc.hud.tp.g !== __old'); })());
  g.run(`campTorpedoEvent(__sc, { type: 'tboom', x: C.carrier.x + 100, y: C.carrier.y, r: 90 }); campTorpedoEvent(__sc, { type: 'torpedo', stage: 'launch', x: 0, y: 0 }); campTorpedoEvent(__sc, { type: 'torpedo', stage: 'arming', x: 0, y: 0 }); campTorpedoEvent(__sc, { type: 'torpedo', stage: 'fizzle', x: 5, y: 5 }); campTorpedoEvent(__sc, { type: 'torpedo', stage: 'shot', x: 5, y: 5 })`);
  check('the events: a blast near the cruiser makes a big bang, a fizzle a small one, the other stages no bang of their own', J('__sc.booms.length') === 2 && J('__sc.booms[0][0]') >= 40 && J('__sc.booms[1][0]') <= 10, J('JSON.stringify(__sc.booms)'));
  check('the scene calls them: the file is registered before the scene, and campaignscene.js calls campTorpedoSync and campTorpedoEvent (the blip a torpedo had on the radar went with it; the Tab map has its own mark)', (() => { const h = src('index.html'), sc = src('src/campaignscene.js'); return h.indexOf('src/camptorpedoscene.js') > 0 && h.indexOf('src/camptorpedoscene.js') < h.indexOf('src/campaignscene.js') && sc.includes('campTorpedoSync(this') && sc.includes('campTorpedoEvent(this, e)'); })());
  check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));
}

console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
