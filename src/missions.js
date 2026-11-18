// ---------- Missions: the calls on the station boards, and the space-side logic for each ----------
// G.missionId names a row of MISSIONS; G.mission is its state: none | accepted | rescued | failed.
// Rescue plays out in surface.js (land, find the colonist) and pays on docking (station.js), as in v0.1.
// Escort and Police patrol live entirely in space (hooks below) and pay the moment they are done.
// Calls and systems (docs/UNIVERSE.md 10.2 e3, 11; card u-e3):
//   system    where a call is played: the gate, Kepler-4b and the patrol are Halcyon's, the Reaver is at the Roost, the Widow at Lethe, the beacon at the Hollow. Leaving that system by a
//             jump fails the call (missionLeaveSystem); a carry call (courier, haul) is played in two systems and fails on death only. A call under way sits quiet in any other system.
//   posted    each station's board is its dock.missions list (src/data_systems.js): the ids of the calls it offers. Halcyon posts the four it always had, then a courier run, a haul
//             and a survey; the other docks post runs to their neighbours; the Roost posts none. A call a content pack adds is posted at Halcyon.
//   courier   200 + 90 per light year to a station in another system; a case in your pocket, paid on docking there. haul: freight that fills the whole hold for the trip (src/fleet.js
//             holdCap), paid 20 per unit of hold per 5 ly on docking there. salvage (Lethe, the Widow) and survey (the Hollow beacon): press E on the named site (both are files in content/missions: a site call names its system and site there); the site's own
//             payout stays, the call's pay is on top.
//   far goals the HUD checklist, the Tab map, the nav list (N) and the galaxy map name a goal in another system and its distance instead of an arrow (missionFar).
G.missionId = null; G.missionProgress = 0; G.patrolsDone = 0; // patrolsDone unlocks the bounty call (saved by meta.js)

// The Perseus gate is a body of type 'gate' in the system data (src/data_systems.js). GATE stays as a live alias of its position
// for tests/missions.mjs, which moves the MULE next to it; the code below asks sysBody('gate') itself.
const GATE = { get x() { return escortGate().x; }, get y() { return escortGate().y; } };

// ---- where the first four calls are played: from their files (card space-game-call-places-from-files) ----
// Each call says its star system (system) and the body there it is about (body: an id of that system's Bodies table, content/systems/<id>.md):
//   rescue   the planet you land on        escort   the gate the MULE flies to
//   patrol   the station the wanted pirates loiter round        bounty   the planet the Reaver hides behind
// The rows below carry what the shipped files say (content/missions/*.md; src/contenttables.js CT_MISSION puts a file's values over them), so
// the game is the same with no content loaded. A call that names no body gets the first body of its type in its system, as the code used to.
// The rescue file also lists the pirates that are always in its system: guards (drones in a ring round its body) and pickets (fixed places).
const CALL_BODY = { rescue: 'planet', escort: 'gate', patrol: 'station', bounty: 'planet' };
// the body a call is played at: { id, type, name, x, y, r, ... } of its system's data, or null (a kind with no body, a system that is not there)
function missionBody(m) {
  const type = m ? CALL_BODY[missionKind(m)] : null, sys = m ? (m.system || 'halcyon') : null;
  if (!type || !Object.prototype.hasOwnProperty.call(SYSTEMS, sys)) return null;
  const all = sysBodies(null, sys);
  return (m.body && all.find(b => b.id === m.body && b.type === type)) || all.find(b => b.type === type) || null;
}
// what is wrong with a body named for a call of this kind in this system, as a sentence, or '' when it is fine (the content loader says it)
function missionBodyFault(kind, sys, body) {
  const type = CALL_BODY[kind]; if (!type) return 'a ' + kind + ' call has no body: it is played between stations or at its site';
  if (!Object.prototype.hasOwnProperty.call(SYSTEMS, sys)) return 'the system "' + sys + '" is not in the game';
  const b = sysBodies(null, sys).find(x => x.id === body);
  if (!b) return 'there is no body "' + body + '" in ' + sys + ' (its Bodies table has: ' + sysBodies(type, sys).map(x => x.id).join(', ') + ')';
  if (b.type !== type) return '"' + body + '" is a ' + b.type + ', and a ' + kind + ' call needs a ' + type;
  if (kind === 'rescue' && !b.landable) return '"' + body + '" is not landable, and the rescue lands on its planet';
  return '';
}
// the gate the escort flies to (the open call's when it is an escort, else the built-in escort's)
function escortGate() { const m = missionDef(); return missionBody(m && missionKind(m) === 'escort' ? m : MISSIONS.find(x => x.id === 'escort')) || sysBody('gate'); }
// the planet you can land on in the system you are in: the body of a rescue call played here, when it is landable. The Surface scene is that call's.
function missionLandBody() {
  return MISSIONS.filter(m => missionKind(m) === 'rescue' && (m.system || 'halcyon') === G.system).map(missionBody).find(b => b && b.landable) || null;
}
// the pirates that are always in the system you are in, whatever call is open: [{ x, y }] from the calls played here that list them
// (guards: that many in a ring 520 to 740 px round the call's body; pickets: [x, y] in the units of the system files, placed through sysAt)
function missionPirates() {
  const out = [], seen = new Set(); // one set per body: a call a pack adds is a copy of its kind's row (src/contentadd.js) and would bring the same pirates again
  MISSIONS.forEach(m => {
    if ((m.system || 'halcyon') !== G.system || (!m.guards && !(m.pickets && m.pickets.length))) return;
    const b = missionBody(m), n = b ? m.guards | 0 : 0, key = b ? b.id : '';
    if (seen.has(key)) return; seen.add(key);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, r = 520 + Math.random() * 220; out.push({ x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r }); }
    (m.pickets || []).forEach(([x, y]) => out.push({ x: sysAt(x), y: sysAt(y) }));
  });
  return out;
}
const REAVER_HP = 300;

const MISSIONS = [
  {
    id: 'rescue', key: '1', title: 'Rescue call', where: 'Kepler-4b', reward: REWARD,
    offer: 'A survey pod went down on the surface.\nPirate drones circle the planet and\ncrawlers roam the ground.\nLand, find the colonist, keep them alive,\nwalk them back to your ship, bring them home.',
    line: st => st === 'rescued' ? 'Colonist aboard: dock at the station'
      : st === 'failed' ? 'Failed. Ask the station for another call' : 'Rescue the colonist on Kepler-4b',
    progress: () => G.mission === 'rescued' ? 'The colonist is aboard.\nDock at Halcyon Station to get paid.'
      : 'Find the colonist on Kepler-4b and\nbring them back alive.',
    failOnDeath: ['rescued'], deathMsg: 'Ship destroyed. The colonist was lost. Mission failed.', system: 'halcyon', body: 'kepler-4b',
    guards: 6, pickets: [[5700, 2700], [6000, 3500], [2500, 2200]] // the drones round the planet, and three on the way to it, over 2000 px from the station: outside the police zone and well past engage range
  },
  {
    id: 'escort', key: '2', title: 'Escort', where: 'MULE to the Perseus gate', reward: 400,
    offer: 'The freighter MULE leaves the hangar when you do,\nbound for the Perseus gate to the south-west.\nPirates know the route. Fly with her and shoot\nanything that gets close. She pays on arrival.\nLose her and you get nothing.',
    line: st => st === 'failed' ? 'Failed. The MULE was lost' : 'Escort the MULE to the Perseus gate',
    progress: () => 'The MULE is under way to the Perseus gate.\nStay with her. Do not dock or land.',
    failOnDeath: ['accepted'], deathMsg: 'Ship destroyed. The MULE is on her own. Mission failed.', system: 'halcyon', body: 'perseus-gate',
    space: { setup: escortSetup, update: escortUpdate, target: escortTarget,
      leave: s => failMission(s, uiText('toast.mule-left')) }
  },
  {
    id: 'patrol', key: '3', title: 'Police patrol', where: 'Halcyon approach', reward: 600, count: 5,
    offer: 'Five pirates with bounties on their heads are\nloitering on the approach to Halcyon Station.\nThey are marked in amber on your radar.\nDestroy all five and the station pays the bounty.\nCome back and dock whenever you like.',
    line: st => st === 'failed' ? 'Failed. The pirates got away'
      : 'Police patrol: ' + G.missionProgress + ' of 5 wanted pirates down',
    progress: () => 'Wanted pirates destroyed: ' + G.missionProgress + ' of 5.\nThey wait on the approach to the station.',
    failOnDeath: [], deathMsg: '', system: 'halcyon', body: 'halcyon-station',
    space: { setup: patrolSetup, update: patrolUpdate, target: patrolTarget }
  },
  {
    id: 'bounty', key: '4', title: 'Bounty', where: 'The Reaver, at Reaver\'s Roost', reward: 1200, system: 'roost', body: 'roost-rock', paySystem: 'halcyon',
    unlock: () => G.patrolsDone > 0, // the board offers it once a police patrol has been finished
    offer: 'The pirate warlord they call the Reaver has gone\nto ground at Reaver\'s Roost, twelve light years out,\nwith two escorts and a nest full of friends.\nA warship three times a drone: spread guns and\na ramming charge it telegraphs with a flash.\nHalcyon pays 1200 cr for the wreck.',
    line: st => st === 'failed' ? 'Failed. The Reaver got away'
      : 'Bounty: the Reaver  hull ' + Math.round(100 * Math.max(0, REAVER_HP - G.missionProgress) / REAVER_HP) + '%',
    progress: () => 'The Reaver waits south-west of Reaver\'s Rock.\nIts hull is at ' + Math.round(100 * Math.max(0, REAVER_HP - G.missionProgress) / REAVER_HP) + '%.\nDock whenever you like; it will still be there.',
    failOnDeath: ['accepted'], deathMsg: 'Ship destroyed. The Reaver got away. Mission failed.',
    space: { setup: bountySetup, update: bountyUpdate, target: bountyTarget }
  }
];

// ---- the new calls: courier and haul runs between stations, a salvage at Lethe, a survey at the Hollow (card u-e3) ----
const callSystemOf = st => (fleetStation(st) || { system: 'halcyon' }).system;        // the system a station is in (src/fleet.js)
const callSysName = id => (SYSTEMS[id] || { name: id }).name;
const callStName = st => fleetStationName(st);
const callFmtLy = ly => (Math.round(ly * 10) / 10).toFixed(1);
// light years from the system you are in to another one
function callLy(id) { const a = sysDef().ly, b = (SYSTEMS[id] || {}).ly; return a && b ? callFmtLy(Math.hypot(a[0] - b[0], a[1] - b[1])) : '?'; }
// where a call wants you now: { system, name, station } when that is another system (or, for a carry call, the station in this one), else null
function callGoal(m) {
  if (!m) return null;
  if (m.carry) return { system: callSystemOf(m.to), station: m.to, name: callStName(m.to) };
  const sys = m.system || 'halcyon';
  return { system: sys, station: null, name: callSysName(sys) };
}
const HAUL = { perUnit: 20, perLy: 5 };               // 20 cr per unit of hold per 5 ly
const haulPay = (ly, units) => Math.round(HAUL.perUnit * units * ly / HAUL.perLy);
const COURIER = { base: 200, perLy: 90 };             // 200 + 90 per ly
function carryRow(kind, from, to) {
  const ly = fleetLy(from, to), toSys = callSystemOf(to), where = callStName(to) + ', ' + callSysName(toSys);
  const row = {
    id: kind + '-' + callSystemOf(from) + '-' + toSys, kind, carry: true, from, to, system: toSys, where, ly,
    failOnDeath: ['accepted']
  };
  const here = () => G.system === toSys;
  const far = () => 'jump to ' + callSysName(toSys) + '  (' + callLy(toSys) + ' ly, G for the map)';
  if (kind === 'courier') {
    Object.assign(row, {
      title: 'Courier run', reward: Math.round(COURIER.base + COURIER.perLy * ly),
      offer: 'A sealed case for ' + callStName(to) + ', ' + callFmtLy(ly) + ' light years out.\nJump there, dock, and hand it over.\nIt pays on delivery.\nLose the ship and you lose the case.',
      line: st => st === 'failed' ? 'Failed. The case was lost' : 'Courier: ' + (here() ? 'dock at ' + callStName(to) + ' (L)' : far()),
      progress: () => 'Deliver the sealed case to ' + callStName(to) + '.\n' + (here() ? 'You are in ' + callSysName(toSys) + ': dock there.' : callSysName(toSys) + ' is ' + callLy(toSys) + ' ly from here.'),
      deathMsg: 'Ship destroyed. The case is lost. Call failed.'
    });
  } else {
    Object.defineProperty(row, 'reward', { enumerable: true, get: () => haulPay(ly, shipStat('hold')) }); // what this ship earns: the whole hold, 20 cr a unit per 5 ly
    Object.assign(row, {
      title: 'Haul',
      offer: 'Freight for ' + callStName(to) + ', ' + callFmtLy(ly) + ' light years out. It fills your whole hold for the trip,\nso no ore fits. Pays ' + HAUL.perUnit + ' cr a unit of hold per ' + HAUL.perLy + ' ly.\nLose the ship and you lose the freight.',
      line: st => st === 'failed' ? 'Failed. The freight was lost' : 'Haul: ' + (here() ? 'dock at ' + callStName(to) + ' (L)' : far()),
      progress: () => 'Freight for ' + callStName(to) + ': ' + (G.missionProgress | 0) + ' units in the hold.\n' + (here() ? 'You are in ' + callSysName(toSys) + ': dock there.' : callSysName(toSys) + ' is ' + callLy(toSys) + ' ly from here.'),
      deathMsg: 'Ship destroyed. The freight is lost. Call failed.'
    });
  }
  return row;
}
// ---- which runs exist: the station files say (card space-game-routes-from-files) ----
// A run is a row of the Runs table of the station that posts it (content/stations/<id>.md: | kind | to |): courier or haul, to another station.
// There is no list of routes in the code any more: a new dock, in the core files or in a pack, posts runs to its neighbours by listing them.
//   carryRoutes()   [[kind, posted at, delivered to], ...] read from the docks of SYSTEMS (dock.runs: the station file's table, put there by
//                   src/data_systems.js, and again by worldSync for a pack), in the order of the systems and of each table; a row whose
//                   two docks are not both in SYSTEMS (yet) is left out
//   carrySync()     makes MISSIONS agree with them: a run that is new gets its row (after the runs already there), one the files dropped
//                   goes (never the run you are flying), the rest keep their objects, so words or pay a mission file laid over a run stay.
//                   It runs when this script loads (SYSTEMS is already made from the core files) and again whenever the routes have changed since:
//                   missionsOffered and missionDef ask, so a pack's dock has its runs the first time its board opens or a saved run is read.
// A run's id is kind-fromSystem-toSystem, as it always was (a saved game names it); two runs that would share one take the station ids instead.
// A dock posts its own runs whether or not its `missions` list names them (missionsOffered); the list still sets what else it posts and the order.
function carryRoutes() {
  const out = [];
  Object.keys(SYSTEMS).forEach(sys => (SYSTEMS[sys].bodies || []).forEach(b => {
    const runs = b.type === 'station' && b.dock && b.dock.runs; // the dock row is made from the station file (src/data_systems.js sysDockFrom)
    if (!Array.isArray(runs)) return;
    runs.forEach(r => { if (r && (r.kind === 'courier' || r.kind === 'haul') && r.to !== b.id && fleetStation(r.to)) out.push([r.kind, b.id, r.to]); });
  }));
  return out;
}
let CARRY_KEY = null;
function carrySync() {
  const routes = carryRoutes(), key = JSON.stringify(routes);
  if (key === CARRY_KEY) return false;
  CARRY_KEY = key;
  const want = new Map();
  routes.forEach(r => { const row = carryRow(...r); if (want.has(row.id)) row.id = r.join('-'); want.set(row.id, row); });
  const flying = id => G.mission === 'accepted' && G.missionId === id;
  for (let i = MISSIONS.length - 1; i >= 0; i--) { const m = MISSIONS[i]; if (m.carry && !want.has(m.id) && !flying(m.id)) MISSIONS.splice(i, 1); }
  want.forEach((row, id) => {
    const i = MISSIONS.findIndex(m => m.id === id);
    if (i >= 0) { if (MISSIONS[i].from !== row.from || MISSIONS[i].to !== row.to) MISSIONS[i] = row; return; } // the same run keeps its object
    let at = -1; MISSIONS.forEach((m, j) => { if (m.carry) at = j; });
    if (at < 0) { const site = MISSIONS.findIndex(m => m.site); at = (site < 0 ? MISSIONS.length : site) - 1; }
    MISSIONS.splice(at + 1, 0, row);
  });
  return true;
}
carrySync();
// ---- the site calls: fly to a named site of a system and press E beside it (src/poi.js calls missionSite) ----
// They come from files (card space-game-site-calls-from-files): a mission file of kind salvage or survey names its system and its site,
// the id of a row in that system's ## Bodies table. content/missions/salvage-lethe.md (the Widow) and survey-hollow.md (the old beacon)
// are the two the game ships with; a new system gets its own site call with one more file, and a content pack can add one too
// (src/contentadd.js). What a site call DOES is this code: the row below, missionSite, missionTarget. What it says and pays is the file.
const SITE_KINDS = ['salvage', 'survey'];
const SITE_PROBLEMS = []; // a core file that could not become a call: [{ id, why }] (tests/sitecalls.mjs wants none)
function siteRow(o) {
  const row = Object.assign({ site: o.site, failOnDeath: [], deathMsg: '' }, o), fail = o.fail || 'The call was lost';
  row.line = st => st === 'failed' ? 'Failed. ' + fail : row.title + ': ' + (G.system === o.system ? o.here : 'jump to ' + callSysName(o.system) + '  (' + callLy(o.system) + ' ly, G for the map)');
  row.progress = () => o.here + '\n' + (G.system === o.system ? 'You are in ' + callSysName(o.system) + '.' : callSysName(o.system) + ' is ' + callLy(o.system) + ' ly from here.');
  return row;
}
// why a file's data cannot be a site call, in words for the person who wrote the file; '' when it can
function siteWhy(d) {
  if (!d || !SITE_KINDS.includes(d.kind)) return 'kind must be ' + SITE_KINDS.join(' or ') + ' for a site call';
  if (!d.system) return 'a ' + d.kind + ' call needs system: the id of the star system its site is in';
  const sys = SYSTEMS[d.system];
  if (!sys) return 'system is "' + d.system + '" but there is no star system with that id';
  if (!d.site) return 'a ' + d.kind + ' call needs site: the id of a poi row in the ## Bodies table of ' + d.system;
  const body = (sys.bodies || []).find(b => b.id === d.site);
  if (!body) return 'site is "' + d.site + '" but ' + d.system + ' has no body with that id (its poi rows: ' + ((sys.bodies || []).filter(b => b.type === 'poi').map(b => b.id).join(', ') || 'none') + ')';
  if (body.type !== 'poi') return 'site "' + d.site + '" is a ' + body.type + ' of ' + d.system + ', not a poi: a site call ends when you press E on a salvage site';
  return '';
}
// the row of a site call from a mission file's data ({ kind, title, where, reward, system, site, here, description }); throws with siteWhy's words
function siteRowFrom(id, d) {
  const why = siteWhy(d); if (why) throw new Error(why);
  const body = SYSTEMS[d.system].bodies.find(b => b.id === d.site);
  return siteRow({ id, kind: d.kind, title: d.title, where: d.where !== undefined ? d.where : callSysName(d.system), reward: d.reward, system: d.system, site: d.site,
    offer: d.offer !== undefined ? d.offer : d.description !== undefined ? d.description : d.title + ' - ' + callSysName(d.system),
    here: d.here || 'Fly to ' + (body.name || 'the site') + ' and press E' });
}
// every site call of a CONTENT object (content.generated.js), in the order of its entries
function siteCallsFrom(content) {
  const out = [];
  ((content && content.entries) || []).forEach(e => {
    if (e.type !== 'mission' || !e.data || !SITE_KINDS.includes(e.data.kind)) return;
    try { out.push(siteRowFrom(e.id, e.data)); } catch (err) { SITE_PROBLEMS.push({ id: e.id, why: err.message }); }
  });
  return out;
}
MISSIONS.push(...siteCallsFrom(typeof CONTENT !== 'undefined' ? CONTENT : null));

function missionDef() { return MISSIONS.find(m => m.id === G.missionId) || (G.missionId && carrySync() && MISSIONS.find(m => m.id === G.missionId)) || null; } // a run a pack's dock posts is in MISSIONS once the routes are read again (carrySync)
// what a station's board shows: the calls its dock lists (dock.missions in src/data_systems.js), unlocked ones only; the home dock also posts what a content pack added
function missionsOffered(station) {
  station = station || G.lastDock;
  carrySync(); // the runs are what the station files say now (a pack may have added a dock since this script loaded)
  const st = fleetStation(station), list = st && st.body.dock && st.body.dock.missions, home = station === homeDock(), mine = m => m.carry && m.from === station; // a dock posts its own runs
  const posted = MISSIONS.filter(m => (!m.unlock || m.unlock()) && (Array.isArray(list) ? list.includes(m.id) || mine(m) || (home && m.added) : mine(m) || (home && !m.carry && !m.site)));
  return posted.filter(m => m.key).concat(posted.filter(m => !m.key)); // the calls with a number key of their own (the four, and a pack's: 5 to 8) first, then the runs and sites
}
// ---- can the ship you fly do this call (card space-game-bug-runs-out-of-jump-range) ----
// Five runs on the boards are 8.2 or 12.4 light years and the Wren jumps 8: a new player could take a job he could not do. The board still posts
// every call (missionsOffered), but one the ship cannot fly to and come back from is shown dimmed, cannot be accepted, and says in one line
// what would reach it, so it reads as a goal and not a trap.
//   missionReach(m, station, rec)   { ok } or { ok: false, why: 'range' | 'fuel', line, need }  (src/jump.js jumpReach does the sum)
//                                   need: { kind: 'part', part, tier, name } (a part of the ship you fly, named first when one is enough)
//                                         or { kind: 'ship', model, name } (the cheapest ship that reaches it), or null
//   missionsBoard(station)          every posted call with its reach: [{ m, reach }]
//   missionCanAccept(m, station)    may the board take it
const missionReachSystem = m => (m.carry ? callSystemOf(m.to) : (m.system || 'halcyon')); // the system a call sends you to
function missionReach(m, station, rec) {
  rec = rec || activeShip();
  const from = callSystemOf(station || G.lastDock), to = missionReachSystem(m);
  const test = r => jumpReach(from, to, shipStat('range', r), shipStat('tank', r), shipStat('fuelPerLy', r));
  const res = test(rec);
  if (res.ok) return res;
  const fit = (part, tier) => Object.assign({}, rec, { parts: Object.assign({}, rec.parts, { [part]: tier }) });
  let need = null;
  (res.why === 'fuel' ? ['tank', 'engine'] : ['engine', 'tank']).forEach(part => {
    const top = PARTS[part].prices.length;
    for (let tier = (rec.parts[part] | 0) + 1; tier <= top && !need; tier++) if (test(fit(part, tier)).ok) need = { kind: 'part', part, tier, name: PARTS[part].name + ' tier ' + tier };
  });
  if (!need) {
    const ship = Object.values(SHIP_MODELS).filter(s => s.side === 'player' && s.id !== rec.model).sort((a, b) => a.price - b.price).find(s => test(newShip(s.id)).ok);
    if (ship) need = { kind: 'ship', model: ship.id, name: ship.name };
  }
  const head = res.why === 'fuel' ? 'Not enough tank for the trip' : 'Out of jump range for this ship';
  const line = head + (need ? (need.kind === 'part' ? ': ' + need.name + ' reaches it.' : ': the ' + need.name + ' reaches it.') : '.');
  return Object.assign(res, { line, need });
}
function missionsBoard(station) { return missionsOffered(station).map(m => ({ m, reach: missionReach(m, station) })); }
function missionCanAccept(m, station) { return !!m && missionReach(m, station).ok; }
// the board calls this when a call is accepted (station.js): a haul loads the freight, which fills the hold
function missionAccepted() {
  const m = missionDef();
  if (m && missionKind(m) === 'haul') G.missionProgress = shipStat('hold'); // units of freight; holdCap() (src/fleet.js) takes them off the hold while the call is open
}
const haulFreight = () => (G.mission === 'accepted' && missionKind(missionDef()) === 'haul') ? (G.missionProgress | 0) : 0;
// a call is of a kind (rescue, escort, patrol, bounty); the four built-in rows are called by their kind, a call a content pack adds (src/contentadd.js)
// carries its own id and kind. missionActive('patrol') is true for any patrol call under way, so the space-side logic never cares whose row it is.
const missionKind = m => m && (m.kind || m.id);
function missionActive(id) { const m = G.mission === 'accepted' ? missionDef() : null; return !!m && (m.id === id || missionKind(m) === id); }
// the board calls this when Troy reads a call; pressing E in station.js then sets G.mission = 'accepted'
function pickMission(id) { G.missionId = id; G.missionProgress = 0; }
function abandonMission() { G.mission = 'none'; G.missionId = null; G.missionProgress = 0; }

function failMission(s, msg) {
  if (G.mission !== 'accepted' && G.mission !== 'rescued') return;
  G.mission = 'failed'; beep(150, 0.6, 'sawtooth', 0.05, -100); toast(s, msg, '#ff4d6d');
}
// A system's pay (src/data_systems.js: 1.10 at the Meridian hub, 1.15 at Brass Reach, 1.30 at Ember: docs/ECONOMY.md 9) multiplies what a call pays that is paid there: a courier or haul
// by the system it is delivered to, a site call by its system; the four calls of Halcyon's board by Halcyon's (the bounty is paid by Halcyon too, whatever the Roost's). No pay in the
// data is 1, so the Hollow and Lethe, which have no dock to pay anything, change nothing.
const callPayMult = m => { const s = SYSTEMS[(m && (m.paySystem || m.system)) || 'halcyon']; return s && s.pay > 0 ? s.pay : 1; };
const callReward = m => Math.round((m.reward | 0) * callPayMult(m));
function completeMission(s, msg, bonus) { // bonus: extra pay on top of the call's reward (the escort's pay by hull), before the system's pay
  const m = missionDef(); if (!m) return;
  const pay = callReward(m) + Math.round((bonus | 0) * callPayMult(m));
  G.credits += pay; G.mission = 'none'; G.missionId = null; G.missionProgress = 0;
  beep(660, 0.25, 'triangle', 0.05, 440); toast(s, msg + '  +' + pay + ' cr', '#6dff9c');
}

// ---- hooks called from space.js ----
// A call is played in its own system (m.system): the gate, Kepler-4b and the patrol are Halcyon's, the Reaver is at the Roost. A call under way sits quiet in any other
// system: nothing is set up for it there, and it picks up again when you are back.
const missionHere = m => G.system === ((m && m.system) || 'halcyon');
function missionSpaceSetup(s) {
  s.mx = {};
  const m = missionDef();
  if (m && m.space && G.mission === 'accepted' && missionHere(m)) m.space.setup(s);
}
function missionSpaceUpdate(s, time, dt) {
  const m = missionDef();
  if (m && m.space && G.mission === 'accepted' && missionHere(m)) m.space.update(s, time, dt);
}
// a jump away from the system a call is played in fails it (docs/UNIVERSE.md 10.2 e3); a carry call (courier, haul) is meant to be carried out of one, so it only fails on death
function missionLeaveSystem(s, from) {
  const m = missionDef();
  if (!m || m.carry || (G.mission !== 'accepted' && G.mission !== 'rescued') || (m.system || 'halcyon') !== from) return;
  failMission(s, 'You left ' + callSysName(from) + '. ' + m.title + ' failed.');
}
function missionLeaveSpace(s) {
  const m = missionDef();
  if (m && m.space && m.space.leave && G.mission === 'accepted') m.space.leave(s);
}
function missionDeath(s) {
  const m = missionDef();
  if (!m || !m.failOnDeath.includes(G.mission)) return false;
  failMission(s, m.deathMsg); return true;
}
// where the active call wants you when that is another system: { system, name, station, ly } (the arrow cannot point there: the checklist, the Tab map, the nav list and the
// galaxy map say it in words), or null when it is here or there is no call
function missionFar() {
  const m = G.mission === 'accepted' ? missionDef() : null, g = callGoal(m);
  return g && g.system !== G.system ? Object.assign({ ly: callLy(g.system) }, g) : null;
}
// the system the open call wants you in (a courier or haul: the one its station is in), or null: the galaxy map marks it (src/galaxymap.js)
function missionGoalSystem() { const g = callGoal(G.mission === 'accepted' ? missionDef() : null); return g ? g.system : null; }
// one line for the nav list, the Tab map and the galaxy map: what the call wants, where, how far
function missionFarLine() {
  const far = missionFar(); if (!far) return '';
  return 'CALL: ' + (far.station ? far.name + ', ' : '') + callSysName(far.system) + '  (' + far.ly + ' ly)  -  G opens the galaxy map';
}
// ---- the next step, in plain words (card space-game-job-shows-the-way) ----
// Troy took a courier run and could not find where to go: a job in another system gave him nothing to follow. This is the one sentence the
// navigation panel pins (src/navpanel.js), the checklist shows as NEXT (src/hud.js) and tests/jobway.mjs reads for every kind of call.
// what the call wants once you are in its system: { kind, text }. kind: 'dock', 'land', 'site', 'escort' or 'fight'
function missionThen(m, st) {
  const kind = missionKind(m);
  if (st === 'rescued') { const dock = sysBody('station', m.system || 'halcyon'); return { kind: 'dock', text: 'Dock at ' + (dock ? callStName(dock.id) : 'the station') }; } // the station of the call's own system
  if (m.carry) return { kind: 'dock', text: 'Dock at ' + callStName(m.to) };
  if (m.site) return { kind: 'site', text: m.here };
  if (kind === 'rescue') return { kind: 'land', text: 'Land on ' + m.where };
  if (kind === 'escort') return { kind: 'escort', text: 'Stay with the MULE to the Perseus gate' };
  if (kind === 'patrol') return { kind: 'fight', text: 'Destroy the wanted pirates: ' + (G.missionProgress | 0) + ' of ' + (m.count || 5) + ' down' };
  if (kind === 'bounty') return { kind: 'fight', text: 'Destroy the Reaver' };
  return { kind: 'go', text: m.line(st) };
}
// the next step of the open call: { kind, text, system } or null with no call. In another system than the call's it is the jump first:
// kind 'jump', system: where to, text: "Jump to Kestrel: press G, then dock at Kestrel Outpost". In the right system: missionThen, system null.
function missionStep() {
  const st = G.mission, m = st === 'accepted' || st === 'rescued' ? missionDef() : null; if (!m) return null;
  const then = missionThen(m, st), sys = st === 'rescued' ? (m.system || 'halcyon') : callGoal(m).system;
  if (sys === G.system) return Object.assign({ system: null }, then);
  return { kind: 'jump', system: sys, text: 'Jump to ' + callSysName(sys) + ': press G, then ' + then.text.charAt(0).toLowerCase() + then.text.slice(1) };
}
// the where line of the mission board and the checklist: the place, and the star system it is in when the place does not say so itself
function missionWhere(m) {
  if (!m) return '';
  const sys = callSysName(callGoal(m).system), where = m.where || '';
  return where.toLowerCase().includes(sys.toLowerCase()) ? where : where + ', ' + sys;
}
// docking pays a carry call at the station it was bound for (station.js calls this when you arrive)
function missionDock(s) {
  const m = missionDef();
  if (!m || !m.carry || G.mission !== 'accepted' || m.to !== G.lastDock) return;
  const haul = missionKind(m) === 'haul', pay = Math.round((haul ? haulPay(m.ly, G.missionProgress | 0) : m.reward) * callPayMult(m));
  G.credits += pay; G.mission = 'none'; G.missionId = null; G.missionProgress = 0;
  sfx('chime'); toast(s, (haul ? 'Freight delivered.' : 'Case delivered.') + '  +' + pay + ' cr', '#6dff9c');
}
// a salvage or survey call ends when its named site is salvaged (src/poi.js calls this)
function missionSite(s, p) {
  const m = missionDef();
  if (!m || !m.site || G.mission !== 'accepted' || m.site !== p.id) return;
  completeMission(s, missionKind(m) === 'salvage' ? 'Salvage complete.' : 'Beacon charted.');
}
// where the objective arrow points
function missionTarget(s) {
  const m = missionDef();
  const t = m && m.space && m.space.target && G.mission === 'accepted' && missionHere(m) ? m.space.target(s) : null;
  if (t) return t;
  const far = missionFar(); // a goal in another system has no arrow: the checklist, the maps and the nav list name it (missionFar)
  if (far) return null;
  if (m && m.carry && G.mission === 'accepted') { const dock = sysBodies('station').find(b => b.id === m.to); return dock ? { x: dock.x, y: dock.y, name: dock.name } : null; }
  if (m && m.site && G.mission === 'accepted') { const site = sysBodies('poi').find(b => b.id === m.site); return site ? { x: site.x, y: site.y, name: site.name } : null; }
  const pod = missionActive('rescue') && missionHere(m) ? missionBody(m) : null; // the planet the rescue is on (its file's body)
  if (pod) return { x: pod.x, y: pod.y, name: pod.name };
  const st = sysBody('station'); // a system with no station (Kestrel until card u-b5) has nothing to point at
  return st ? { x: s.station.x, y: s.station.y, name: st.name } : null;
}
// a pirate went down: a wanted one counts for the patrol, the Reaver ends the bounty
function missionKill(s, e) {
  if (e && e.boss) {
    if (missionActive('bounty')) { s.cameras.main.shake(600, 0.012); completeMission(s, uiText('toast.reaver-dead')); }
    return;
  }
  if (!e || !e.wanted || !missionActive('patrol')) return;
  const m = missionDef(); G.missionProgress++;
  if (G.missionProgress >= m.count) { G.patrolsDone++; completeMission(s, uiText('toast.patrol-done')); }
  else toast(s, uiText('toast.patrol-down'), '#ffb454');
}
function radarDot(s, x, y, color, r) { hudBlip(s, x, y, color, r); } // the HUD radar (src/hud.js) draws it this frame

// ---- Escort: the MULE flies station -> gate; pirates lie in wait along the route ----
// The escort box (docs/ESCORT.md change 2): a ring of ESCORT.box px around her. Inside it you are covering her: she runs at her cruise speed
// and a hit costs her half. Outside it she drops to ESCORT.slow and takes it all. Pirates nearby no longer slow her: the fight is on the move.
// s.mx.covered says which it is this frame (the assist panel's Match speed reads the box from ESCORT.box).
// The stakes (change 3): she pays ESCORT.bonus more for a whole hull (in proportion), calls out at half hull and with the gate ESCORT.sight px off, and
// at the gate she holds still for ESCORT.spinUp ms while ESCORT.lastStand pirates come in from ESCORT.lastOut px. s.mx.spin is the ms left of the spin-up.
// Her speeds (cruise 90, slow 45 px/s; they were 60 and 30) follow the 3 times spread of the systems: her route to the gate went from 2800 to 9000 px, which made the
// call over 5 minutes with a wave every 49 s. At 90 and 45 it is about 3.7 minutes with a wave every 33 s (docs/MISSIONS-TIMING.md, tools/mission-timing.mjs).
const ESCORT = { box: 350, cruise: 90, slow: 45, hull: 200, cover: 0.5, shot: 5, ram: 2, bonus: 200, sight: 900, spinUp: 8000, lastStand: 3, lastOut: 1100,
  waves: [0.25, 0.5, 0.75], waveSize: [2, 3, 3], waveOut: 1400, inbound: 240, peel: 4000 };
// The fight (change 1): nobody waits on the route any more. A wave comes when she is ESCORT.waves of the way there, ESCORT.waveOut px out on her port
// flank, then starboard, then dead ahead, and she calls it. The first pirate of a wave is its screen: it has no prey and hunts you. The rest go for her,
// and one you hit drops her and fights you for ESCORT.peel ms (d.distractedUntil, read by pirateAI in src/enemies.js). They fly in at ESCORT.inbound
// px/s until they are inside their own engage range, then pirateAI flies the fight.
function escortSend(s, f, x, y, hunt) { // one escort pirate; hunt: it goes for her (else for you)
  const d = s.spawnDrone(x, y);
  d.escort = true; d.ambush = true; d.inbound = true; d.lastHp = d.hp; if (hunt) d.prey = f; // ambush: the launch grace and the first-wave cap do not hold it
  return d;
}
function escortWave(s, f, i) {
  const gate = escortGate(), side = [-1, 1, 0][i % 3], a = Phaser.Math.Angle.Between(f.x, f.y, gate.x, gate.y) + side * 1.2; // y is down, so a turn to the right is starboard
  const cx = f.x + Math.cos(a) * ESCORT.waveOut, cy = f.y + Math.sin(a) * ESCORT.waveOut, n = ESCORT.waveSize[i] || 2;
  for (let k = 0; k < n; k++) escortSend(s, f, cx + Phaser.Math.Between(-90, 90), cy + Phaser.Math.Between(-90, 90), k > 0);
  toast(s, uiText(side < 0 ? 'toast.mule-wave-port' : side > 0 ? 'toast.mule-wave-starboard' : 'toast.mule-wave-ahead'), '#ff8da0'); sfx('tick');
}
function escortPirates(s, f, now) { // every frame: who you have pulled off her, and the fly-in
  s.enemies.getChildren().forEach(e => {
    if (!e.active || !e.escort) return;
    if (e.prey && e.hp < e.lastHp) e.distractedUntil = now + ESCORT.peel; // you hit it: it turns on you
    e.lastHp = e.hp;
    if (!e.inbound) return;
    const tg = e.prey && e.prey.active ? e.prey : s.ship;
    if (Phaser.Math.Distance.Between(e.x, e.y, tg.x, tg.y) < (e.def ? e.def.engage : 900) - 100) { e.inbound = false; return; }
    s.physics.moveToObject(e, tg, ESCORT.inbound); e.rotation = Phaser.Math.Angle.Between(e.x, e.y, tg.x, tg.y);
  });
}
const escortCover = (s, n) => (s.mx.covered ? n * ESCORT.cover : n); // what a hit of n costs her right now
function escortRing(s, f) { // drawn every frame: a steady green ring while you cover her, a beating amber one while you do not
  const g = s.mx.ring, t = s.mx.ringText; if (!g) return;
  g.clear();
  if (!f || !f.active) { t.setVisible(false); return; }
  const on = s.mx.covered, beat = 0.5 + 0.5 * Math.sin(s.time.now / 130);
  g.lineStyle(on ? 2 : 3, on ? 0x6dff9c : AMBER, on ? 0.5 : 0.35 + 0.45 * beat); g.strokeCircle(f.x, f.y, ESCORT.box);
  if (on) { g.fillStyle(0x6dff9c, 0.035); g.fillCircle(f.x, f.y, ESCORT.box); }
  t.setPosition(f.x, f.y + 34).setText(on ? 'COVERED' : 'EXPOSED').setColor(on ? '#6dff9c' : '#ffb454').setVisible(true);
}
function escortSetup(s) {
  const st = s.station, gate = escortGate(); // the gate the call's file names (missionBody)
  const f = s.physics.add.sprite(st.x - 60, st.y + 260, 'freighter').setDepth(4);
  f.body.setCircle(14, 24, 6).setMaxSpeed(ESCORT.cruise); // offset in the 76x40 texture (ships.js)
  f.hp = ESCORT.hull; f.maxHp = ESCORT.hull; f.rammedAt = 0; f.wave = 0;
  f.route = Math.max(1, Phaser.Math.Distance.Between(f.x, f.y, gate.x, gate.y) - gate.r); // px she has to fly: the waves come by her progress along it
  f.rotation = Phaser.Math.Angle.Between(f.x, f.y, gate.x, gate.y);
  s.mx.freighter = f; s.mx.covered = false;
  s.mx.ring = s.add.graphics().setDepth(3);
  s.mx.ringText = s.add.text(0, 0, '', { fontFamily: 'monospace', fontSize: '12px', color: '#6dff9c' }).setOrigin(0.5).setStroke('#02060d', 3).setDepth(4).setVisible(false);

  const g = s.add.graphics().setDepth(1);
  g.lineStyle(6, AMBER, 0.9); g.strokeCircle(gate.x, gate.y, gate.r);
  g.lineStyle(2, AMBER, 0.4); g.strokeCircle(gate.x, gate.y, gate.r + 20);
  label(s, gate.x, gate.y - gate.r - 50, gate.name.toUpperCase(), '#ffb454', 18);

  s.physics.add.overlap(f, s.eb, (fr, b) => { if (!b.active) return; b.disableBody(true, true); freighterHurt(s, escortCover(s, ESCORT.shot)); });
  s.physics.add.overlap(f, s.enemies, (fr, e) => {
    if (s.time.now < f.rammedAt) return; f.rammedAt = s.time.now + 1000; e.hp -= 10; e.lastHp = e.hp; freighterHurt(s, escortCover(s, ESCORT.ram)); // lastHp: bumping her is not you pulling it off her
  });
  s.time.delayedCall(3600, () => { if (f.active && !s.leaving) toast(s, uiText('toast.mule-leaving'), '#ffd37a'); });
}
function freighterHurt(s, n) {
  const f = s.mx.freighter; if (!f || !f.active) return;
  f.hp -= n; f.setTint(0xffffff); s.time.delayedCall(70, () => f.active && f.clearTint());
  if (s.sparks) s.sparks.explode(5, f.x, f.y); // ships.js
  beep(200, 0.08, 'square', 0.02, -100);
  if (f.hp <= 0) {
    s.boom.explode(50, f.x, f.y); f.destroy(); escortRing(s, null); beep(90, 0.5, 'sawtooth', 0.05, -60);
    failMission(s, uiText('toast.mule-lost'));
  }
}
function escortUpdate(s) {
  const f = s.mx.freighter; if (!f || !f.active) return;
  const gate = escortGate(), now = s.time.now, toGate = Phaser.Math.Distance.Between(f.x, f.y, gate.x, gate.y);
  // the escort box: inside her ring you cover her (cruise speed, half damage); outside it she slows, so you can catch up, and takes it all
  const was = s.mx.covered;
  s.mx.covered = !s.dead && Phaser.Math.Distance.Between(f.x, f.y, s.ship.x, s.ship.y) <= ESCORT.box;
  if (was !== s.mx.covered && s.mx.ringSaid) sfx('tick');
  s.mx.ringSaid = true;
  // she talks (docs/ESCORT.md change 3): once each, as toasts
  if (!f.saidHalf && f.hp <= f.maxHp / 2) { f.saidHalf = true; toast(s, uiText('toast.mule-half'), '#ffb454'); }
  if (!f.saidGate && toGate < ESCORT.sight) { f.saidGate = true; toast(s, uiText('toast.mule-gate-sight'), '#ffd37a'); }
  if (f.wave < ESCORT.waves.length && 1 - (toGate - gate.r) / f.route >= ESCORT.waves[f.wave]) escortWave(s, f, f.wave++); // one a frame at most
  escortPirates(s, f, now);
  if (toGate < gate.r) {
    // the last stand: she holds still in the ring while the gate spins up, and the last pirates come for her then
    if (!f.spinAt) {
      f.spinAt = now; toast(s, uiText('toast.mule-spinup'), '#ffd37a'); sfx('thrusters');
      const out = Phaser.Math.Angle.Between(gate.x, gate.y, s.station.x, s.station.y);
      for (let i = 0; i < ESCORT.lastStand; i++) { const a = out + (i - (ESCORT.lastStand - 1) / 2) * 0.9; escortSend(s, f, f.x + Math.cos(a) * ESCORT.lastOut, f.y + Math.sin(a) * ESCORT.lastOut, true); }
    }
    f.body.setVelocity(0, 0);
    s.mx.spin = Math.max(0, ESCORT.spinUp - (now - f.spinAt)); // ms left; the HUD hint counts it down
    if (s.mx.spin <= 0) {
      const bonus = Math.round(ESCORT.bonus * Phaser.Math.Clamp(f.hp / f.maxHp, 0, 1)); // pay by hull: a clean run is worth flying well for
      s.boom.explode(30, f.x, f.y); f.destroy(); escortRing(s, null);
      completeMission(s, uiText('toast.mule-arrived'), bonus); return;
    }
  } else {
    s.physics.moveTo(f, gate.x, gate.y, s.mx.covered ? ESCORT.cruise : ESCORT.slow);
    f.rotation = Phaser.Math.Angle.RotateTo(f.rotation, Phaser.Math.Angle.Between(f.x, f.y, gate.x, gate.y), 0.02);
  }
  hudMeter(s, 'MULE', f.hp / f.maxHp, s.mx.covered ? 0x6dff9c : AMBER);
  escortRing(s, f);
  if (f.spinAt) { // the gate winds up: an arc that closes round its ring
    const g = s.mx.ring, k = 1 - s.mx.spin / ESCORT.spinUp;
    g.lineStyle(8, 0xffffff, 0.85); g.beginPath(); g.arc(gate.x, gate.y, gate.r + 10, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2); g.strokePath();
  }
  radarDot(s, f.x, f.y, 0xffd37a, 3); radarDot(s, gate.x, gate.y, AMBER, 2);
}
function escortTarget(s) {
  const f = s.mx.freighter, gate = escortGate();
  return f && f.active ? { x: f.x, y: f.y, name: 'Freighter MULE' } : { x: gate.x, y: gate.y, name: gate.name };
}

// ---- Police patrol: wanted pirates loiter on the approach to the station ----
function patrolSetup(s) {
  const m = missionDef(), left = m.count - G.missionProgress, at = missionBody(m) || s.station; // the station the call's file names
  s.mx.mark = s.add.graphics().setDepth(3);
  for (let i = 0; i < left; i++) {
    const a = i / left * Math.PI * 2 + Math.random() * 0.8, r = Phaser.Math.Between(650, 950);
    const d = s.spawnDrone(at.x + Math.cos(a) * r, at.y + Math.sin(a) * r);
    d.wanted = true; d.hp = 40;
  }
}
function patrolUpdate(s) {
  const g = s.mx.mark; g.clear(); g.lineStyle(2, AMBER, 0.9);
  s.enemies.getChildren().forEach(d => {
    if (!d.wanted || !d.active) return;
    g.strokeCircle(d.x, d.y, 26); radarDot(s, d.x, d.y, AMBER, 3);
  });
}
function patrolTarget(s) {
  let best = null, bd = Infinity;
  s.enemies.getChildren().forEach(d => {
    if (!d.wanted || !d.active) return;
    const dd = Phaser.Math.Distance.Between(s.ship.x, s.ship.y, d.x, d.y);
    if (dd < bd) { bd = dd; best = d; }
  });
  return best ? { x: best.x, y: best.y, name: 'Wanted pirate' } : null;
}

// ---- Bounty: the Reaver, a warship with two escorts on the dark side of Kepler-4b ----
// It is a pirate in s.enemies like the others (your guns, salvage and the radar all work on it), with its own AI.
const REAVER = {
  key: 'reaver', tex: 'reaver', hp: REAVER_HP, credits: 150, ram: 25, radar: 0xff2a4a, body: [30, 14, 13], // offset in the 112x90 texture (ships.js)
  engage: 1400, speed: 220, max: 190, turn: 0.02, hold: 380, range: 820, aim: 0.5, shot: [1200, 1800], bullet: 400, dmg: 10, spread: 3,
  boss: true, ai: (s, d, ship, time) => reaverAI(s, d, ship, time)
};
function bountySetup(s) {
  const rock = missionBody(missionDef()) || s.planet, bx = rock.x - 1100, by = rock.y + 650; // the planet the call's file names
  const d = spawnPirate(s, bx, by, REAVER);
  d.boss = true; d.hp = Math.max(1, REAVER_HP - G.missionProgress); d.phase = 1; d.chargeAt = s.time.now + 6000; d.tele = 0; d.chargeEnd = 0;
  s.mx.boss = d;
  spawnPirate(s, bx + 180, by - 140, 'raider'); spawnPirate(s, bx - 160, by + 160, 'gunship'); // the two escorts
  s.mx.mark = s.add.graphics().setDepth(3);
  s.time.delayedCall(3600, () => { if (!s.leaving && d.active) toast(s, uiText('toast.reaver-intro'), '#ffd37a'); });
}
function reaverAI(s, d, ship, time) {
  const def = d.def, dist = Phaser.Math.Distance.Between(d.x, d.y, ship.x, ship.y);
  // phases: below two thirds and one third it speeds up and calls two raiders
  const phase = d.hp > REAVER_HP * 2 / 3 ? 1 : d.hp > REAVER_HP / 3 ? 2 : 3;
  if (phase > d.phase) {
    d.phase = phase; s.cameras.main.shake(300, 0.006);
    toast(s, uiText(phase === 2 ? 'toast.reaver-wing' : 'toast.reaver-burning'), '#ff4d6d');
    for (let i = 0; i < 2; i++) spawnPirate(s, d.x + Phaser.Math.Between(-200, 200), d.y + Phaser.Math.Between(-200, 200), 'raider');
  }
  const mult = [1, 1, 1.25, 1.5][phase];
  if (dist >= def.engage) { d.body.setAcceleration(0, 0); d.body.setMaxSpeed(def.max); d.rotation += 0.002; return; }
  const target = Phaser.Math.Angle.Between(d.x, d.y, ship.x, ship.y);
  // the ram: a white flash for 800 ms, then a 600 ms charge straight at where you are
  if (time > d.chargeEnd && d.charging) { d.charging = false; d.body.setMaxSpeed(def.max * mult); d.chargeAt = time + [0, 8000, 6500, 5000][phase]; }
  if (!d.charging && !d.tele && time > d.chargeAt) d.tele = time + 800;
  if (d.tele && time < d.tele) { // telegraph
    d.setTint(Math.floor(time / 90) % 2 ? 0xffffff : 0xff2a4a); d.body.setAcceleration(0, 0); d.body.setVelocity(d.body.velocity.x * 0.9, d.body.velocity.y * 0.9);
    d.rotation = Phaser.Math.Angle.RotateTo(d.rotation, target, 0.12);
    return;
  }
  if (d.tele && time >= d.tele) { // charge
    d.tele = 0; d.charging = true; d.chargeEnd = time + 600; d.clearTint();
    d.body.setMaxSpeed(900); d.body.setAcceleration(0, 0); s.physics.velocityFromRotation(d.rotation, 850, d.body.velocity);
    beep(90, 0.5, 'sawtooth', 0.06, -40);
  }
  if (d.charging) return;
  d.rotation = Phaser.Math.Angle.RotateTo(d.rotation, target, def.turn * mult);
  if (dist > def.hold) s.physics.velocityFromRotation(d.rotation, def.speed * mult, d.body.acceleration);
  else d.body.setAcceleration(0, 0);
  if (dist < def.range && time > d.nextShot && Math.abs(Phaser.Math.Angle.Wrap(target - d.rotation)) < def.aim) {
    d.nextShot = time + Phaser.Math.Between(def.shot[0], def.shot[1]) / mult;
    const n = phase === 3 ? 5 : 3;
    for (let i = 0; i < n; i++) {
      const b = s.shoot(s.eb, d.x, d.y, d.rotation + (i - (n - 1) / 2) * 0.17, def.bullet, time);
      if (b) b.dmg = def.dmg;
    }
  }
}
function bountyUpdate(s) {
  const d = s.mx.boss; if (!d || !d.active) return;
  G.missionProgress = REAVER_HP - Math.max(0, d.hp); // damage dealt so far; survives docking and reloads
  hudMeter(s, 'REAVER', d.hp / REAVER_HP, RED);
  radarDot(s, d.x, d.y, 0xff2a4a, 4);
  const g = s.mx.mark; g.clear();
  g.lineStyle(2, d.tele ? 0xffffff : RED, d.tele ? 0.9 : 0.5); g.strokeCircle(d.x, d.y, 48 + (d.tele ? 6 * Math.sin(s.time.now / 60) : 0));
}
function bountyTarget(s) {
  const d = s.mx.boss;
  return d && d.active ? { x: d.x, y: d.y, name: 'The Reaver' } : null;
}
