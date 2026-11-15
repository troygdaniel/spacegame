// smoke: calls across systems: courier, haul, salvage, survey, the Reaver at the Roost, a board per station, leaving a system (rules in Node, the boards and a paid courier in the page)
// The calls across systems (card space-game-u-e3-missions-xsys, docs/UNIVERSE.md 10.2 e3 and 11): a system id per call, the courier, haul, salvage and survey calls,
// the Reaver bounty at the Roost, a board per station, leaving a system, the goals in other systems.
//   Part 1 runs the game's own scripts in plain Node (tests/nodegame.mjs: no Chrome, no lock): the rows, what each station posts, the pay of every run, a courier and a haul
//   from the board to the dock, the salvage and the survey, what a jump or a death does to each call, the words for a goal in another system, the save.
//   Part 2 opens the real page once: each station's board as the Station scene shows it, and a call taken and paid across a jump.
// Run: node tests/calls.mjs   (exit code 1 on a failed check)
import { launch, sleep } from './cdp.mjs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const ROUTES = [ // [id, posted at, delivered to, ly rounded to 0.1]
  ['courier-halcyon-kestrel', 'halcyon-station', 'kestrel-outpost', 6.3], ['courier-halcyon-brass', 'halcyon-station', 'brass-smelter', 7.5], ['haul-halcyon-brass', 'halcyon-station', 'brass-smelter', 7.5],
  ['courier-kestrel-halcyon', 'kestrel-outpost', 'halcyon-station', 6.3], ['courier-kestrel-meridian', 'kestrel-outpost', 'meridian-exchange', 6.5], ['haul-kestrel-meridian', 'kestrel-outpost', 'meridian-exchange', 6.5],
  ['courier-meridian-kestrel', 'meridian-exchange', 'kestrel-outpost', 6.5], ['courier-meridian-ember', 'meridian-exchange', 'ember-foundry', 8.2], ['courier-meridian-roost', 'meridian-exchange', 'roost-dock', 12.4],
  ['haul-meridian-ember', 'meridian-exchange', 'ember-foundry', 8.2], ['courier-brass-halcyon', 'brass-smelter', 'halcyon-station', 7.5], ['haul-brass-halcyon', 'brass-smelter', 'halcyon-station', 7.5],
  ['courier-ember-meridian', 'ember-foundry', 'meridian-exchange', 8.2], ['haul-ember-meridian', 'ember-foundry', 'meridian-exchange', 8.2]
];

// ================= Part 1: the rules =================
const g = nodeGame();
const J = e => { const r = g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`); return JSON.parse(r); }; // a value out of the game, by value (g.ev answers with a promise)
const fresh = () => g.run(`(() => { G.mission = 'none'; G.missionId = null; G.missionProgress = 0; G.patrolsDone = 0; G.credits = 1000; G.system = 'halcyon'; G.lastDock = 'halcyon-station'; G.known = ['halcyon', 'kestrel']; G.ore = 0; G.fleet = [newShip('wren')]; G.active = 0; return 1; })()`);
const SC = `(() => { const p = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : p, apply: () => p }); return p; })()`; // a scene that takes every call and gives itself back (toast and the sounds draw on it)
const accept = id => g.run(`(() => { pickMission('${id}'); G.mission = 'accepted'; missionAccepted(); return 1; })()`);

console.log('the rows');
{
  fresh();
  const ids = J(`MISSIONS.map(m => m.id)`);
  check('4 old calls, 14 runs, a salvage and a survey: 20 rows, no id twice', ids.length === 20 && new Set(ids).size === 20, ids.join());
  check('every old call has a system: the three of Halcyon, the Reaver at the Roost', J(`['rescue', 'escort', 'patrol'].every(i => MISSIONS.find(m => m.id === i).system === 'halcyon') && MISSIONS.find(m => m.id === 'bounty').system === 'roost'`));
  for (const [id, from, to, ly] of ROUTES) {
    const r = J(`(() => { const m = MISSIONS.find(m => m.id === '${id}'); return { kind: m.kind, carry: m.carry, from: m.from, to: m.to, system: m.system, reward: m.reward, ly: Math.round(m.ly * 10) / 10, offer: m.offer.length > 20, line: m.line('accepted').length > 5 }; })()`);
    const want = id.startsWith('courier') ? Math.round(200 + 90 * (J(`fleetLy('${from}', '${to}')`))) : Math.round(20 * 10 * J(`fleetLy('${from}', '${to}')`) / 5);
    check(`${id}: ${from} to ${to}, ${ly} ly, pays ${want}`, r.carry === true && r.from === from && r.to === to && r.ly === ly && r.reward === want && r.offer && r.line, JSON.stringify(r));
  }
  const sal = J(`(() => { const m = MISSIONS.find(m => m.id === 'salvage-lethe'), v = MISSIONS.find(m => m.id === 'survey-hollow'); return [m.kind, m.system, m.site, m.reward, v.kind, v.system, v.site, v.reward]; })()`);
  check('salvage at Lethe (the Widow, 700), survey at the Hollow (the beacon, 600)', sal.join() === 'salvage,lethe,lethe-wreck-7,700,survey,hollow,beacon-h,600', sal.join());
  check('the sites are bodies of their systems', J(`SYSTEMS.lethe.bodies.some(b => b.id === 'lethe-wreck-7' && b.credits === 800) && SYSTEMS.hollow.bodies.some(b => b.id === 'beacon-h')`));
  check('courier 200 + 90 per ly: Halcyon to Kestrel 764, to the Roost from Meridian 1318 (a courier ship or an explorer reaches it)', J(`MISSIONS.find(m => m.id === 'courier-halcyon-kestrel').reward`) === 764 && J(`MISSIONS.find(m => m.id === 'courier-meridian-roost').reward`) === 1318);
}

console.log('what each station posts');
{
  fresh();
  const at = st => J(`missionsOffered('${st}').map(m => m.id)`);
  check('Halcyon: rescue, escort, patrol first (keys 1 to 3 as ever), then a courier run, a haul and the survey; no bounty yet', at('halcyon-station').join() === 'rescue,escort,patrol,courier-halcyon-kestrel,courier-halcyon-brass,haul-halcyon-brass,survey-hollow', at('halcyon-station').join());
  g.run(`G.patrolsDone = 1`);
  check('after a patrol the Reaver bounty is posted, fourth', at('halcyon-station').slice(0, 4).join() === 'rescue,escort,patrol,bounty');
  g.run(`G.patrolsDone = 0`);
  check('Kestrel: three runs', at('kestrel-outpost').join() === 'courier-kestrel-halcyon,courier-kestrel-meridian,haul-kestrel-meridian');
  check('Meridian: six calls', at('meridian-exchange').join() === 'courier-meridian-kestrel,courier-meridian-ember,courier-meridian-roost,haul-meridian-ember,salvage-lethe,survey-hollow');
  check('Brass Reach and Ember: runs home; the Roost posts nothing', at('brass-smelter').join() === 'courier-brass-halcyon,haul-brass-halcyon,salvage-lethe' && at('ember-foundry').join() === 'courier-ember-meridian,haul-ember-meridian' && at('roost-dock').length === 0);
  check('a station the game does not know posts nothing; a dock with no list posts nothing (the home dock keeps the four old calls)', at('nowhere').length === 0 && J(`(() => { const d = SYSTEMS.halcyon.bodies[0].dock, keep = d.missions; delete d.missions; const r = missionsOffered('halcyon-station').map(m => m.id).join(); d.missions = keep; return r; })()`) === 'rescue,escort,patrol');
  check('every id a dock lists is a row of the game', J(`Object.keys(SYSTEMS).every(id => SYSTEMS[id].bodies.every(b => b.type !== 'station' || !b.dock.missions || b.dock.missions.every(i => MISSIONS.some(m => m.id === i))))`));
  check('the files agree: worldFromFiles says the same lists', J(`['halcyon-station', 'kestrel-outpost', 'meridian-exchange', 'brass-smelter', 'ember-foundry'].every(st => { const f = fleetStation(st), w = worldFromFiles(f.system).bodies.find(b => b.id === st); return JSON.stringify(w.dock.missions) === JSON.stringify(f.body.dock.missions); })`));
}

console.log('a courier, from the board to the dock');
{
  fresh(); accept('courier-halcyon-kestrel');
  const far = J(`missionFar()`);
  check('in Halcyon the goal is another system: Kestrel Outpost, 6.3 ly', far && far.system === 'kestrel' && far.name === 'Kestrel Outpost' && far.ly === '6.3', JSON.stringify(far));
  check('there is no arrow for it, and the words are ready (nav list, Tab map)', J(`missionTarget(${SC})`) === null && J(`missionFarLine()`) === 'CALL: Kestrel Outpost, Kestrel  (6.3 ly)  -  G opens the galaxy map', J(`missionFarLine()`));
  check('the galaxy map marks Kestrel', J(`missionGoalSystem()`) === 'kestrel');
  check('leaving Halcyon does not fail it (it is carried out of one)', (g.run(`missionLeaveSystem(${SC}, 'halcyon')`), J(`G.mission`) === 'accepted'));
  check('docking at the wrong station pays nothing', (g.run(`G.system = 'kestrel'; G.lastDock = 'halcyon-station'; missionDock(${SC})`), J(`G.credits`) === 1000 && J(`G.mission`) === 'accepted'));
  const t = J(`(() => { const t = missionTarget(${SC}); return t && [t.name, t.x, t.y]; })()`);
  check('in Kestrel the arrow points at the outpost, and there is no far goal', t && t[0] === 'Kestrel Outpost' && t[1] === 9000 && t[2] === 21000 && J(`missionFar()`) === null, JSON.stringify(t));
  g.run(`G.lastDock = 'kestrel-outpost'; missionDock(${SC})`);
  check('docking there pays 764 and closes the call', J(`G.credits`) === 1764 && J(`G.mission`) === 'none' && J(`G.missionId`) === null);
  fresh(); accept('courier-halcyon-kestrel'); g.run(`G.system = 'kestrel'; G.lastDock = 'kestrel-outpost'; missionDeath(${SC})`);
  check('dying with the case fails the call', J(`G.mission`) === 'failed');
}

console.log('a haul: the whole hold, 20 cr a unit per 5 ly');
{
  fresh();
  const pay = J(`MISSIONS.find(m => m.id === 'haul-halcyon-brass').reward`);
  check('the row says what this ship earns: the Wren (hold 10) 300 for 7.5 ly, and the board shows it with the pay of Brass Reach, 345', pay === 300 && J(`callReward(MISSIONS.find(m => m.id === 'haul-halcyon-brass'))`) === 345, String(pay));
  g.run(`G.fleet = [newShip('ox')]`);
  check('the Ox (hold 40) 1200', J(`MISSIONS.find(m => m.id === 'haul-halcyon-brass').reward`) === 1200);
  g.run(`G.fleet = [newShip('wren')]`);
  check('a hold of 10 before the call', J(`holdCap()`) === 10);
  accept('haul-halcyon-brass');
  check('taking it loads 10 units of freight: the hold has no room for ore', J(`G.missionProgress`) === 10 && J(`holdCap()`) === 0, J(`holdCap()`));
  g.run(`G.system = 'brass'; G.lastDock = 'brass-smelter'; missionDock(${SC})`);
  check('docking at Brass Smelter pays 345 (300, and Brass Reach pays 1.15 times: card u-e4), closes the call and gives the hold back', J(`G.credits`) === 1345 && J(`G.mission`) === 'none' && J(`holdCap()`) === 10);
  fresh(); g.run(`G.fleet = [newShip('ox')]`); accept('haul-halcyon-brass'); g.run(`G.system = 'brass'; G.lastDock = 'brass-smelter'; missionDock(${SC})`);
  check('the Ox hauling the same run is paid 1380 (1200 times 1.15)', J(`G.credits`) === 2380);
  fresh(); accept('haul-halcyon-brass'); g.run(`abandonMission()`);
  check('dropping the call gives the hold back', J(`holdCap()`) === 10 && J(`G.missionProgress`) === 0);
  fresh(); accept('haul-halcyon-brass'); g.run(`G.system = 'kestrel'; G.lastDock = 'kestrel-outpost'; missionDeath(${SC})`);
  check('dying with the freight fails the call, and a failed call holds nothing', J(`G.mission`) === 'failed' && J(`holdCap()`) === 10);
  fresh(); accept('haul-halcyon-brass');
  const snap = J(`JSON.stringify(snapshot())`);
  g.run(`G.mission = 'none'; G.missionId = null; G.missionProgress = 0; applySave(JSON.parse(${JSON.stringify(snap)}))`);
  check('the call and its freight survive a save and a load', J(`G.missionId`) === 'haul-halcyon-brass' && J(`G.mission`) === 'accepted' && J(`G.missionProgress`) === 10 && J(`holdCap()`) === 0, J(`[G.missionId, G.mission, G.missionProgress].join()`));
}

console.log('salvage at Lethe and survey at the Hollow');
{
  fresh(); accept('salvage-lethe');
  check('in Halcyon: the goal is Lethe, with no arrow', J(`missionFar().system`) === 'lethe' && J(`missionTarget(${SC})`) === null);
  g.run(`G.system = 'lethe'`);
  const t = J(`(() => { const t = missionTarget(${SC}); return t && t.name; })()`);
  check('in Lethe the arrow points at the Widow', t === 'Troop carrier (the Widow)', String(t));
  g.run(`missionSite(${SC}, { id: 'lethe-wreck-1' })`);
  check('another wreck does not end it', J(`G.mission`) === 'accepted' && J(`G.credits`) === 1000);
  g.run(`missionSite(${SC}, { id: 'lethe-wreck-7' })`);
  check('the Widow pays the call 700 (the wreck pays its own 800 on top)', J(`G.credits`) === 1700 && J(`G.mission`) === 'none');
  fresh(); accept('survey-hollow'); g.run(`G.system = 'hollow'; missionSite(${SC}, { id: 'beacon-h' })`);
  check('the Hollow beacon pays the survey 600', J(`G.credits`) === 1600 && J(`G.mission`) === 'none');
  fresh(); accept('survey-hollow'); g.run(`G.system = 'hollow'; missionLeaveSystem(${SC}, 'hollow')`);
  check('leaving the Hollow before the beacon fails the survey', J(`G.mission`) === 'failed');
  fresh(); accept('salvage-lethe'); g.run(`missionLeaveSystem(${SC}, 'halcyon')`);
  check('leaving Halcyon on the way to Lethe does not', J(`G.mission`) === 'accepted');
}

console.log('leaving a system, the Reaver at the Roost');
{
  fresh(); accept('rescue'); g.run(`missionLeaveSystem(${SC}, 'halcyon')`);
  check('a rescue under way fails when you jump away from Halcyon', J(`G.mission`) === 'failed');
  fresh(); accept('patrol'); g.run(`missionLeaveSystem(${SC}, 'halcyon')`);
  check('so does a patrol', J(`G.mission`) === 'failed');
  fresh(); accept('escort'); g.run(`G.mission = 'accepted'; missionLeaveSpace(${SC})`);
  check('and an escort fails as soon as you leave space, as before', J(`G.mission`) === 'failed');
  fresh(); g.run(`G.patrolsDone = 1`); accept('bounty');
  check('the bounty goal is the Roost, 12.2 ly from Kestrel (from Halcyon: far)', J(`missionFar().system`) === 'roost' && J(`missionFarLine()`).includes("Reaver's Roost"), J(`missionFarLine()`));
  g.run(`missionLeaveSystem(${SC}, 'halcyon')`);
  check('leaving Halcyon on the way to the Roost does not fail it', J(`G.mission`) === 'accepted');
  g.run(`G.system = 'roost'`);
  check('at the Roost the call is played: the setup and the update run there, and not in Halcyon', J(`missionHere(missionDef())`) === true && (g.run(`G.system = 'halcyon'`), J(`missionHere(missionDef())`) === false));
  g.run(`G.system = 'roost'; missionLeaveSystem(${SC}, 'roost')`);
  check('jumping away from the Roost fails it', J(`G.mission`) === 'failed');
  check('the words moved to the Roost: the offer, the toast, the file', J(`MISSIONS.find(m => m.id === 'bounty').offer`).includes('Roost') && J(`uiText('toast.reaver-intro')`).includes("Reaver's Rock") && J(`MISSIONS.find(m => m.id === 'bounty').where`).includes('Roost'));
}

console.log('the checklist names a goal in another system');
{
  fresh(); accept('courier-halcyon-kestrel');
  const h = J(`hudMission(${SC}, 'Space')`);
  check('the HUD says so: Courier run, pays 764, jump to Kestrel (6.3 ly)', h.head === 'Courier run' && h.reward === 764 && /jump to Kestrel/.test(h.next), JSON.stringify(h));
  g.run(`G.system = 'kestrel'`);
  check('in Kestrel: dock at Kestrel Outpost (L)', /dock at Kestrel Outpost/.test(J(`hudMission(${SC}, 'Space').next`)));
}
check('no console errors in the whole run', g.errors.length === 0, g.errors.join(' | '));

// ================= Part 2: the page =================
const t = await launch('#space');
try {
  await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active');
  await sleep(1500);
  await t.ev('(() => { G.guideDone = true; G.endingSeen = true; G.mission = "none"; G.missionId = null; return 1; })()');
  await t.clock();
  await t.ev(`(() => { const d0 = Date.now(), p0 = __t; Date.now = () => d0 + (__t - p0); performance.now = () => __t; return 1; })()`);
  const E = x => t.ev(/;/.test(x) && !/^\(\(\) =>/.test(x) ? `(() => { ${x}; return 1; })()` : x);
  const J2 = async x => JSON.parse(await t.ev(`JSON.stringify(${x})`));
  const tick = async f => { for (let left = f; left > 0; left -= 20) await E(`tick(${Math.min(20, left)})`); };

  console.log('the boards as the Station scene shows them');
  const board = async (st, sys) => {
    await E(`(() => { G.system = '${sys}'; G.lastDock = '${st}'; fleetSync(); game.scene.stop('Space'); game.scene.start('Station', { arrive: false }); return 1; })()`);
    await t.waitFor(`game.scene.isActive('Station')`, 8000, 'Station active'); await tick(20);
    await E(`game.scene.getScene('Station').openPanel()`); await tick(10);
    return J2(`(() => { const s = game.scene.getScene('Station'); return { title: s.ui.titleText.text, text: s.boardObjs.filter(o => o.text).map(o => o.text) }; })()`);
  };
  let b = await board('halcyon-station', 'halcyon');
  check('Halcyon: MISSION BOARD - HALCYON STATION, four cards (rescue, escort, patrol, courier run) and a briefing', b.title === 'MISSION BOARD  -  HALCYON STATION' && ['RESCUE CALL', 'ESCORT', 'POLICE PATROL', 'COURIER RUN'].every(x => b.text.includes(x)), JSON.stringify(b.text.slice(0, 12)));
  b = await board('kestrel-outpost', 'kestrel');
  check('Kestrel: its own board, a courier run and a haul to its neighbours', b.title === 'MISSION BOARD  -  KESTREL OUTPOST' && b.text.includes('COURIER RUN') && b.text.includes('HAUL') && !b.text.includes('RESCUE CALL'), JSON.stringify(b.text.slice(0, 14)));
  b = await board('roost-dock', 'roost');
  check('the Roost: nothing posted, the desk says so', b.title === 'MISSION BOARD  -  ROOST DOCK' && b.text.join(' ').includes('No calls are posted at Roost Dock'), JSON.stringify(b.text));
  await E(`game.scene.getScene('Station').closePanel()`);

  console.log('a courier taken at Halcyon, a jump, paid at Kestrel');
  await E(`(() => { G.system = 'halcyon'; G.lastDock = 'halcyon-station'; G.credits = 500; G.mission = 'none'; G.missionId = null; fleetSync(); game.scene.stop('Station'); game.scene.start('Station', { arrive: false }); return 1; })()`);
  await t.waitFor(`game.scene.isActive('Station')`, 8000, 'Station again'); await tick(20);
  await E(`(() => { const s = game.scene.getScene('Station'); s.openPanel(); return 1; })()`); await tick(5);
  await E(`(() => { const s = game.scene.getScene('Station'); s.boardKeys({ key: '4' }); return 1; })()`); await tick(3);
  check('pressing 4 picks the courier run to Kestrel', await E(`G.missionId`) === 'courier-halcyon-kestrel');
  await E(`(() => { const s = game.scene.getScene('Station'); s.k.E.isDown = true; return 1; })()`);
  await E(`(() => { const s = game.scene.getScene('Station'); Phaser.Input.Keyboard.JustDown = k => k === s.k.E; return 1; })()`); await tick(3);
  check('E takes it', await E(`G.mission`) === 'accepted', await E(`G.mission`));
  await E(`(() => { game.scene.stop('Station'); game.scene.start('Space', { from: 'jump', to: 'kestrel', origin: 'halcyon' }); return 1; })()`);
  await t.waitFor(`game.scene.isActive('Space')`, 8000, 'Space in Kestrel'); await tick(40);
  check('the call survived the jump: still accepted, in Kestrel now, the goal is here', await E(`G.mission === 'accepted' && G.system === 'kestrel' && missionFar() === null`));
  check('the HUD arrow points at Kestrel Outpost', await E(`missionTarget(game.scene.getScene('Space')).name`) === 'Kestrel Outpost');
  await E(`(() => { G.lastDock = 'kestrel-outpost'; fleetSync(); game.scene.stop('Space'); game.scene.start('Station', { arrive: true }); return 1; })()`);
  await t.waitFor(`game.scene.isActive('Station')`, 8000, 'Station at Kestrel'); await tick(20);
  check('docking at Kestrel Outpost pays 764: 500 + 764, the call closed', await E(`G.credits`) === 1264 && await E(`G.mission`) === 'none', await E(`G.credits`));
  check('no console errors', t.errors.length === 0, t.errors.join(' | '));
} finally { await t.close(); }

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
