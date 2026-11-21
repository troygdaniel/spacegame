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
  check('it has a hull and a shield of its own', s.hp === s.hull && s.sh === 120 && s.shMax === 120, JSON.stringify(s));
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
  g.run(`campHurt(C, C.ships.find(s => s.kind === 'pirateleader'), 100, 'x')`);
  const u2 = J(`(() => { const u = C.ships.find(s => s.kind === 'pirateleader'); return { hp: u.hp, sh: u.rival.sh } })()`);
  check('a hit past the shield goes through to the hull', u2.sh === 0 && u2.hp === u0.hp - 30, JSON.stringify(u2));
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
