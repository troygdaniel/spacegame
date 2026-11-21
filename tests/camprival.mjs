// smoke: the rival ship (plain Node, no Chrome): the hook a mission row uses, the shield and the hull, the cues, the objective, the words
// Card space-game-rival-duel (src/camprival.js, CAMP.rival in src/campaign.js). The hook is what space-game-l1-1-beats builds the pirate leader of mission 1.1 on.
//   A. the kind and its sides          B. the row: when and where it comes          C. the shield and the hull and the death          D. the objective and the cues
//   E. the words and the script
// Run: node tests/camprival.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame({ store: new Map() });
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// a test mission on Level 1: at Ceres, a hold objective that never ends, and a row of rivals to start from
g.run(`
  CAMP.levels[1].missions.push({ id: 'rv', kind: 'escort', par: 100, place: 'ceres', dock: 'ceres',
    objectives: [{ type: 'kill', what: 'rival:leader' }], bonus: [],
    convoys: [{ id: 't1', name: 'Transport', at: 2, from: 'vesta', to: 'ceres' }],
    waves: [],
    rivals: [{ id: 'leader', kind: 'pirateleader', at: 10, from: [3000, 0], escorts: { skiff: 2 }, say: 'camp.say.rival.leader' }] });
  window.__M = CAMP.levels[1].missions.length - 1;
  window.__R = CAMP.levels[1].missions[__M].rivals;
  window.__new = (opts, rivals) => { CAMP.levels[1].missions[__M].rivals = rivals || __R; window.C = campNew(1, [], Object.assign({ seed: 5, god: true, mission: __M }, opts || {})); C.arrivedAt = 0; return C; };
  window.__run = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); C.events.length = 0; } };
`);

console.log('A. the kind and its sides');
{
  g.run('__new()');
  check('one rival kind: the pirate leader', J('Object.keys(CAMP.rival.kinds)').join() === 'pirateleader');
  const s = J(`(() => { const u = campSpawn(C, 'pirateleader', C.carrier.x + 2000, C.carrier.y); return { team: u.team, faction: u.faction, hp: u.hp, hull: CAMP.rival.kinds.pirateleader.hull, sh: u.rival.sh, shMax: u.rival.shMax, r: u.r, carr: CAMP.size.carrier.hit, hurts: u.def.dmg, kind: u.kind } })()`);
  check('it is on the hostile side, faction pirate (the turrets, the wing and the map need no change)', s.team === 'alien' && s.faction === 'pirate');
  check('it has a hull and a shield of its own', s.hp === s.hull && s.sh === 600 && s.shMax === 600, JSON.stringify(s));
  check('it is the cruiser\'s size', s.r === s.carr && J('CAMP.size.pirateleader.len') === J('CAMP.size.carrier.len'));
  check('it is a ship a wave can call by kind, with its own name', s.kind === 'pirateleader' && J(`CAMP.rival.kinds.pirateleader.name`) === 'Pirate leader');
  check('the pace scales it like the other small ships', J(`campSmall('pirateleader')`));
  check('its wreck holds ore (CAMP.rival.kinds.ore)', J(`(() => { const u = C.ships.find(s => s.kind === 'pirateleader'); campKill(C, u); return C.pickups.some(p => p.kind === 'wreck' && p.ore === CAMP.rival.kinds.pirateleader.ore) })()`));
}

console.log('B. the row: when and where it comes');
{
  g.run('__new()');
  check('nothing before its time', J(`C.ships.filter(u => u.kind === 'pirateleader').length`) === 0);
  g.run('__run(9)');
  check('still nothing at 9 s', J(`C.ships.filter(u => u.kind === 'pirateleader').length`) === 0);
  g.run('__run(2)');
  const r = J(`(() => { const u = C.ships.find(s => s.kind === 'pirateleader'); return u ? { id: u.rival.id, x: Math.round(u.x), y: Math.round(u.y), goal: u.goal, esc: C.ships.filter(s => s.rivalEscort === 'leader' && s.kind === 'skiff').length } : null })()`);
  check('it comes at its second, from its place, with its two skiffs', r && r.id === 'leader' && Math.abs(r.x - 3000) < 400 && r.esc === 2, JSON.stringify(r));
  check('it goes for the carrier by default', r && r.goal === 'carrier');
  g.run('__run(30)');
  check('it comes once', J(`C.ships.filter(u => u.kind === 'pirateleader').length`) === 1);
  // on a cue
  g.run(`__new({}, [{ id: 'leader', kind: 'pirateleader', on: { cue: 'beat4' }, from: [-2500, 100] }])`);
  g.run('__run(20)');
  check('a row with on: { cue } waits for it', J(`C.ships.filter(u => u.kind === 'pirateleader').length`) === 0);
  g.run(`campCue(C, 'beat4'); __run(0.5)`);
  check('and comes when it fires', J(`C.ships.filter(u => u.kind === 'pirateleader').length`) === 1);
  // ahead of a convoy
  g.run(`__new({}, [{ id: 'leader', kind: 'pirateleader', at: 8, ahead: 2000 }])`);
  g.run('__run(9)');
  const a = J(`(() => { const u = C.ships.find(s => s.kind === 'pirateleader'), f = campConvoys(C)[0]; return u && f ? { d: Math.round(Math.hypot(u.x - f.x, u.y - f.y)) } : null })()`);
  check('a row with ahead comes out of the dark in front of the convoy', a && a.d > 800 && a.d < 3200, JSON.stringify(a));
  // no place at all: a set distance from the carrier
  g.run(`__new({}, [{ id: 'leader', kind: 'pirateleader', at: 1 }])`);
  g.run('__run(2)');
  check('a row with no place comes the table\'s distance from the carrier', J(`(() => { const u = C.ships.find(s => s.kind === 'pirateleader'); return !!u && Math.abs(Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) - CAMP.rival.comeFrom) < 400 })()`));
  g.run(`__new({}, [{ id: 'x', kind: 'nothing', at: 1 }])`);
  g.run('__run(3)');
  check('a row of an unknown kind brings nothing and throws nothing', J(`C.ships.filter(u => u.rival).length`) === 0);
}

console.log('C. the shield and the hull and the death');
{
  g.run('__new({ god: true })');
  g.run('__run(11)');
  const u0 = J(`(() => { const u = C.ships.find(s => s.kind === 'pirateleader'); return { hp: u.hp, sh: u.rival.sh } })()`);
  g.run(`campHurt(C, C.ships.find(s => s.kind === 'pirateleader'), 50, 'x')`);
  const u1 = J(`(() => { const u = C.ships.find(s => s.kind === 'pirateleader'); return { hp: u.hp, sh: u.rival.sh } })()`);
  check('a hit takes the shield first and leaves the hull', u1.sh === u0.sh - 50 && u1.hp === u0.hp, JSON.stringify([u0, u1]));
  g.run(`campHurt(C, C.ships.find(s => s.kind === 'pirateleader'), 600, 'x')`);
  const u2 = J(`(() => { const u = C.ships.find(s => s.kind === 'pirateleader'); return { hp: u.hp, sh: u.rival.sh } })()`);
  check('a hit past the shield goes through to the hull', u2.sh === 0 && u2.hp === u0.hp - 50, JSON.stringify(u2));
  g.run(`campHurt(C, C.ships.find(s => s.kind === 'pirateleader'), 5000, 'x')`);
  check('it dies at no hull: the end is dead', J(`C.rivalEnd.leader`) === 'dead' && J(`campRivalDone(C, 'leader')`) && J(`campRivalOf(C, 'leader')`) === null);
}

console.log('D. the objective and the cues');
{
  g.run('__new({ god: true })');
  g.run('__run(11)');
  const ob = () => J(`campObjectives(C)[0]`);
  check('the objective kill rival:leader is not met while it lives', !ob().done);
  check('the cue appear fired', J(`C.cues['rival:leader:appear'] != null`));
  g.run(`campHurt(C, C.ships.find(s => s.kind === 'pirateleader'), 9999, 'x')`);
  check('the cue dead fired', J(`C.cues['rival:leader:dead'] != null`));
  check('the objective is met when it is dead', ob().done);
  g.run('__run(1)');
  check('and the mission is won', J('C.result') === 'won', J('C.result'));
  // a cue starts a wave
  g.run(`__new({ god: true }, [{ id: 'leader', kind: 'pirateleader', at: 1 }]); C.L.waves = [{ on: { cue: 'rival:leader:dead' }, from: [3000, 0], ships: { skiff: 2 }, goal: 'carrier' }]; C.waves = C.L.waves.map(() => ({ started: false, at: 0 }))`);
  g.run('__run(3)');
  check('a wave can start on the rival\'s death', J(`C.waves[0].started`) === false);
  g.run(`campHurt(C, C.ships.find(s => s.kind === 'pirateleader'), 9999, 'x'); __run(0.5)`);
  check('and does when it dies', J(`C.waves[0].started`) === true);
}

console.log('F. the phases');
g.run(`
  window.__ev = [];
  window.__runE = sec => { for (let i = 0; i < Math.round(sec * 30); i++) { campStep(C, 1 / 30); __ev.push(...C.events); C.events.length = 0; } };
  window.__duel = (opts, row) => { const C0 = __new(Object.assign({ god: true }, opts || {}), [Object.assign({ id: 'leader', kind: 'pirateleader', at: 1 }, row || {})]); C0.L.rivals[0].from = row && row.from ? row.from : [C0.carrier.x + 900, C0.carrier.y]; __ev = []; return C0; };
  window.__rv = () => C.ships.find(s => s.kind === 'pirateleader');
  window.__stages = () => __ev.filter(e => e.type === 'rival').map(e => e.stage);
`);
{
  g.run('__duel(); __runE(75)');
  const st = J('__stages()');
  check('the cycle runs in order: appear, charge, broadside, down, ram, ramhit, charge, broadside, down, run', st.join(' ').startsWith('appear charge broadside down ram ramhit stalk charge broadside down run'), st.join(' '));
  const ch = J(`__ev.find(e => e.type === 'rival' && e.stage === 'charge')`);
  check('the charge announces its length (3.2 s) for the ring', ch && ch.secs === 3.2, JSON.stringify(ch));
  const say = J(`__ev.filter(e => e.type === 'say').map(e => e.key)`);
  check('the ship says charge, down, ram and run in turn', ['camp.say.rival.charge', 'camp.say.rival.down', 'camp.say.rival.ram', 'camp.say.rival.run'].every(k => say.includes(k)), say.join());
  check('every phase fired its cue', J(`['charge', 'down', 'ram', 'run'].every(k => C.cues['rival:leader:' + k] != null)`));
  // the time from the charge to the broadside
  g.run('__duel(); __runE(14)');
  const t = J(`(() => { const a = __ev.findIndex(e => e.stage === 'charge'), b = __ev.findIndex(e => e.stage === 'broadside'); return a >= 0 && b >= 0 })()`);
  check('it fires within 14 s of the start (6 s of stalk, 3.2 of charge)', t);
}
{
  // the broadside: six shots; a still carrier is hit by most of them, a moving one by far fewer
  const run = (move) => { g.run('__duel({ god: false })'); if (move) g.run('C.input.thrust = 1'); g.run(`(() => { for (let i = 0; i < 30 * 16; i++) { if (${move}) { const a = Math.atan2(__rv() ? __rv().y - C.carrier.y : 0, __rv() ? __rv().x - C.carrier.x : 1) + Math.PI / 2; C.carrier.rot = a; C.input.thrust = 1; } campStep(C, 1 / 30); C.events.length = 0; } })()`); return J('({ shield: C.shield, hull: C.carrier.hp, max: campShieldMax(C) })'); };
  const still = run(false), moving = run(true);
  const lostStill = still.max - still.shield + (600 - still.hull), lostMoving = moving.max - moving.shield + (600 - moving.hull);
  check('a still carrier takes the broadside on the shield (more than 60 of the 108)', lostStill > 60 && lostStill <= 125, JSON.stringify(still));
  check('a carrier that moves across its line takes under half of it', lostMoving < lostStill / 2, JSON.stringify([lostStill, lostMoving]));
  check('a full shield at the default power keeps the hull whole against one broadside', still.hull === 600, JSON.stringify(still));
  g.run('__duel({ god: false }); C.shield = 30');
  g.run('__runE(12)');
  check('with the shield low the broadside reaches the hull', J('C.carrier.hp') < 600, J('C.carrier.hp'));
}
{
  g.run('__duel()'); g.run('__runE(10.5)');
  const R = () => J(`(() => { const u = __rv(); return { ph: u.rival.ph, sh: u.rival.sh, max: u.rival.shMax, hp: u.hp, mx: u.maxHp } })()`);
  check('after it fires the shield is down', R().ph === 'down' && R().sh === 0, JSON.stringify(R()));
  const hp0 = R().hp; g.run(`campHurt(C, __rv(), 10, 'x')`);
  check('with the shield down a hit goes to the hull, 1.3 times over', Math.abs((hp0 - R().hp) - 13) < 1e-6, JSON.stringify(R()));
  g.run('__runE(6.5)');
  const after = R();
  check('the shield comes back at 60 percent of its cap when the down ends', after.ph !== 'down' && Math.abs(after.sh - after.max * 0.6) < 1e-6, JSON.stringify(after));
}
{
  // the ram: a still carrier is hit (40 on the shield); one that runs straight away at its top speed is missed (the ram times out)
  g.run('__duel({ god: false })'); g.run('__runE(40)');
  check('a ram on a still carrier hits it', J(`__stages().includes('ramhit')`));
  g.run('__duel({ god: false }); C.shield = 150');
  g.run(`(() => { let hit = false, rams = 0; for (let i = 0; i < 30 * 40; i++) { const u = __rv(); if (u && u.rival.ph === 'ram') { const a = Math.atan2(C.carrier.y - u.y, C.carrier.x - u.x); C.carrier.rot = a; C.input.thrust = 1; } campStep(C, 1 / 30); __ev.push(...C.events); C.events.length = 0; } })()`);
  check('a carrier that runs from the ram at full speed is missed', J(`__stages().includes('ram')`) && !J(`__stages().includes('ramhit')`), J('__stages()').join(' '));
}
{
  // running: below 30 percent of its hull it runs for good and is gone; leaves: false and it never does
  g.run('__duel(); __runE(3)');
  g.run(`__rv().hp = __rv().maxHp * 0.25; __runE(1)`);
  check('hurt below 30 percent it turns to run for good', J(`__stages().includes('run')`) && J(`__rv().rival.final`) === true);
  g.run('__runE(30)');
  check('it is gone once it is far off: the cue, the end and the objective', J(`C.rivalEnd.leader`) === 'gone' && J(`C.cues['rival:leader:gone'] != null`) && J(`campObjectives(C)[0].done`));
  check('a rival that is gone is not a kill', J('C.kills') === 0 && J(`C.ships.some(s => s.kind === 'pirateleader')`) === false);
  g.run(`__runE(1)`);
  check('and the mission is won by it', J('C.result') === 'won', J('C.result'));
  g.run(`__duel({}, { leaves: false }); __runE(3); __rv().hp = __rv().maxHp * 0.1; __runE(40)`);
  check('a rival with leaves: false never runs for good', J(`__rv() ? __rv().rival.final : false`) === false && J('C.rivalEnd.leader') !== 'gone');
}
{
  // a charge cannot be turned into a run: hurt in the charge or while its shield is down it keeps to the phase
  g.run('__duel(); __runE(8)');
  g.run(`__rv().hp = __rv().maxHp * 0.2; __runE(0.3)`);
  check('hurt badly in a charge it still charges (the punishment is for the player)', J(`__rv().rival.ph`) === 'charge', J(`__rv().rival.ph`));
}
{
  // the state the scene draws
  g.run('__duel(); __runE(8)');
  const s = J(`campRivalState(C, __rv())`);
  check('the scene is told the phase, how far into it, the shield and the hull', s.phase === 'charge' && s.frac > 0 && s.frac < 1 && s.shield === 1 && s.hull === 1 && s.name === 'Pirate leader', JSON.stringify(s));
}

console.log('G. a plain player wins at the default power');
{
  // the carrier flies at the rival and holds Space; the wing launches and attacks every 5 s (the plain strategy of tests/campaign.mjs); the default power
  const plain = seed => { g.run(`__duel({ seed: ${seed}, god: false })`); g.run(`(() => {
    campOrder(C, 'launch'); let t = 0;
    for (let i = 0; i < 30 * 300 && !C.result; i++, t += 1 / 30) {
      const u = __rv(); if (u) { const a = Math.atan2(u.y - C.carrier.y, u.x - C.carrier.x), e = campWrap(a - C.carrier.rot); C.input.turn = Math.max(-1, Math.min(1, e * 2)); C.input.thrust = Math.hypot(u.x - C.carrier.x, u.y - C.carrier.y) > 380 ? 1 : 0; C.input.fire = true; } else C.input.fire = false;
      if (Math.floor(t * 30) % 150 === 0 && t > 6) campOrder(C, 'attack');
      campStep(C, 1 / 30); __ev.push(...C.events); C.events.length = 0;
    } })()`); return J(`({ result: C.result, end: C.rivalEnd && C.rivalEnd.leader, hull: Math.round(C.carrier.hp), t: Math.round(C.t / 1000) })`); };
  const rs = [1, 2, 3, 4, 5, 6].map(plain);
  check('six seeds: the plain player wins every time', rs.every(r => r.result === 'won'), JSON.stringify(rs));
  check('with the carrier alive and over half of its hull', rs.every(r => r.hull > 300), JSON.stringify(rs));
  check('in 25 to 120 s: long enough to see the phases, short enough to be one beat', rs.every(r => r.t >= 25 && r.t < 120), JSON.stringify(rs));
  console.log('       plain player, six seeds: ' + rs.map(r => `${r.end} ${r.t}s hull ${r.hull}`).join('; '));
  // a player who does nothing is beaten (it is a duel, not a toy); the carrier dies or the mission is not won
  g.run(`__duel({ seed: 2, god: false }); __runE(300)`);
  check('a player who does nothing does not win', J('C.result') !== 'won', J('C.result'));
}

console.log('E. the words and the script');
{
  for (const k of ['camp.say.rival.leader', 'camp.say.rival.dead', 'camp.nav.k.pirateleader']) check('the word ' + k + ' is said', !/^camp\./.test(J(`uiText('${k}', { name: 'Pirate leader' })`)));
  check('the dead line names it', J(`uiText('camp.say.rival.dead', { name: 'Pirate leader' })`) === 'Pirate leader is down.');
  check('the script is in index.html', /src\/camprival\.js/.test(src('index.html')));
  check('the words are in their own file', /camp\.say\.rival\.leader/.test(src('content/text/campaign-rival.md')));
  check('the nav names it by its kind', J(`campNavUnitName({ id: 'pirateleader-3', kind: 'pirateleader' })`) === 'Pirate leader 3');
}

console.log(`\n${n - failed} of ${n} checks pass`);
process.exit(failed ? 1 : 0);
