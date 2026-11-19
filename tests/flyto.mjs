// smoke: fly to the pirates and to anything in the nav panels, by pick or by words (plain Node, no Chrome)
// Card space-game-hunt-pirates. Troy (first logged session, 18 Nov 2026): "I wanted to fly to pirates and fight them", and he pressed the places list 19 times
// and the ships overview 17 times without the ship going anywhere. What this checks:
//   A. the phrase table: which typed or spoken words are which act (hunt, fly to, dock, land, the maps), and "how do I jump" / "how do I trade" answered with keys
//   B. hunt: the nearest raider is flown to and fought; a plain line (with where the nearest are) when there is none; nothing is ever bought
//   C. fly_to by name: a place, a ship, a star; and the plain line for what cannot be reached
//   D. Enter or a click: a place of the navigation panel flies there on the FIRST Enter, a jump keeps its two steps, a ship of the Overview is flown to
//   E. no chat key: a plain command still runs (the voice path), costs no question of the day
// Run: node tests/flyto.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  var __toasts = [], __ran = [], __went = [], __cruise = [], __locked = null, __lockCalls = 0, __spoken = [];
  toast = (s, msg) => { __toasts.push(String(msg)); }; sfx = () => {}; beep = () => {}; startCruiseHum = () => {}; stopCruiseHum = () => {}; cruiseFlash = () => {};
  go = (s, key) => { __went.push(key); };
  overviewCruiseTo = (s, then) => { __cruise.push(then === undefined ? null : then); return true; };   // the cruise itself is src/cruise.js's: tests/cruiseto.mjs
  gunlockSet = o => { __lockCalls++; __locked = o || null; return true; }; gunlockTarget = () => __locked;
  clickmoveClick = (s, x, y) => 'ship';                                                                   // a click on a ship picks it and gives no order: what the game does with no order in force
  voiceSayThen = (text, prio, model, start) => { __spoken.push(text); if (start) start('audio'); return true; };
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  Phaser = { Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Angle: { Wrap: __wrap, Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1), RotateTo: (cur, tgt, step) => { const d = __wrap(tgt - cur); return Math.abs(d) <= step ? tgt : cur + Math.sign(d) * step; } } },
    Input: { Keyboard: { JustDown: k => { const d = !!(k && k._justDown); if (k) k._justDown = false; return d; } } } };
  var __game = { scene: { isActive: () => false, getScenes: () => [__cur], getScene: () => null, run: (k, d) => __ran.push([k, d && d.sel || null]) } };
  var __cur = null;
  function __sprite(x, y, key, extra) { return Object.assign({ x, y, active: true, visible: true, def: key ? { key } : undefined, body: { velocity: { x: 0, y: 0 } } }, extra); }
  function __space(x, y, foes) {
    const body = { velocity: { x: 0, y: 0 }, get speed() { return Math.hypot(body.velocity.x, body.velocity.y); }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const list = (foes || []).map(f => __sprite(x + f[0], y + f[1], f[2] || 'raider')), s = __cur = { scene: { key: 'Space', pause() {} }, game: __game, add: __P, input: { keyboard: __P, activePointer: { isDown: false } }, events: __P, cameras: __P, tweens: __P, time: { now: 1000 }, k: {},
      ship: { x, y, rotation: 0, body }, lockUntil: 0, dead: false, leaving: false, jmp: null, cruising: false, canLand: true, nextFire: 0, enemies: { getChildren: () => list }, list, cm: {},
      cr: { target: null, active: false, list: [], sel: 0, speed: 0, nudge: 0, cancel: false, endWhy: '', navOpen: false } };
    ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'SHIFT', 'Q', 'E'].forEach(n => { s.k[n] = { isDown: false }; });
    autopilotSetup(s); s.ap.k = { P: {} }; s.ap.read = { setVisible() { return this; }, setText() { return this; } };
    assistSetup(s); s.as.k = {}; overviewSetup(s); navpanelSetup(s);
    __toasts = []; __ran = []; __went = []; __cruise = []; __locked = null; __lockCalls = 0; __spoken = []; ASSIST.on = false; ASSIST.s = s; G.deep = null;
    return s;
  }
  function __station() { __cur = { scene: { key: 'Station' }, game: __game }; __toasts = []; return __cur; }
  function __world(model, fuel, credits) {
    G.deep = null; G.system = 'halcyon'; G.lastDock = 'halcyon-station'; G.fleet = [newShip(model)]; G.active = 0; G.credits = credits === undefined ? 2580 : credits; if (fuel !== undefined) G.fleet[0].fuel = fuel;
    G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']; G.mission = 'none'; G.missionId = null; G.missionProgress = 0; G.patrolsDone = 1; ASSIST.on = false;
    shipSync(G.fleet[0]); SHIPCOMP.route = '';
  }
  function __do(raw, scene) { const plan = shipcompPlan(raw, scene || __cur); if (plan.run) plan.run(scene || __cur); return plan; }
  function __local(text, scene) { const plan = shipcompLocal(text, scene || __cur); if (plan && plan.run) plan.run(scene || __cur); return plan; }
`);
const planet = J(`(() => { const b = sysBody('planet'); return { id: b.id, name: b.name, x: b.x, y: b.y }; })()`), station = J(`(() => { const b = sysBody('station'); return { id: b.id, name: b.name, x: b.x, y: b.y }; })()`);
const LOCAL = (text, scene = '__cur') => J(`(() => { const p = __local(${JSON.stringify(text)}, ${scene}); return p ? { text: p.text, action: p.action, arg: p.arg, refused: p.refused, runs: !!p.run } : null; })()`);
const SNAP = `JSON.stringify([G.credits, G.fleet.map(x => x.model + ':' + x.fuel), G.mission, G.missionId, G.system, G.known.length, G.ore])`;
const OUT = { x: 0, y: 0 };

console.log('A. the phrase table');
{
  g.run(`__world('kite', 30); __space(${station.x + 3000}, ${station.y})`);
  const it = q => J(`shipcompIntent(${JSON.stringify(q)}, __cur)`);
  const act = (q, a, arg) => { const r = it(q); return !!r && r.act === a && (arg === undefined || r.arg === arg); };
  check('"fly to the pirates and fight them" is the hunt', act('fly to the pirates and fight them', 'hunt'));
  check('go to / head to / take me to the nearest pirate, raider, hostile, gunship: the hunt', ['go to the nearest pirate', 'head to the closest raider', 'take me to the hostiles', 'Fly to a gunship!', 'travel to the enemy'].every(q => act(q, 'hunt')));
  check('hunt, patrol, attack, fight them, kill the raiders, chase the drone, find some pirates: the hunt', ['hunt', 'Hunt pirates', 'patrol', 'attack', 'fight them', 'kill the raiders', 'chase the drone', 'find some pirates', 'attack the pirates', 'engage the bandits', 'please hunt'].every(q => act(q, 'hunt')));
  check('fly / go / head / travel / take me / set course, to a name: fly_to with the name', act('fly to the station', 'fly_to', 'the station') && act('go to Kepler-4b', 'fly_to', 'kepler-4b') && act('Take me to Halcyon Station', 'fly_to', 'halcyon station') && act('head for the belt', 'fly_to', 'the belt') && act('set course for the gate', 'fly_to', 'the gate') && act('travel to the freighter', 'fly_to', 'the freighter'));
  check('approach, visit, follow: fly_to; jump to a star: fly_to (the first jump of the way)', act('approach the police', 'fly_to', 'the police') && act('visit the planet', 'fly_to', 'the planet') && act('follow the freighter', 'fly_to', 'the freighter') && act('jump to meridian', 'fly_to', 'meridian'));
  check('a polite or filler start does not matter', act('please can you fly to the planet', 'fly_to', 'the planet') && act('computer, go to the station', 'fly_to', 'the station') && act('I want to go to the gate', 'fly_to', 'the gate') && act('fly to the station please', 'fly_to', 'the station'));
  check('dock, go home, take me home: dock; land: land; land on / dock at a name: fly_to', act('dock', 'dock') && act('go home', 'dock') && act('take me home', 'dock') && act('land', 'land') && act('land on Kepler-4b', 'fly_to', 'kepler-4b') && act('dock at Halcyon Station', 'fly_to', 'halcyon station'));
  check('open the map / galaxy map: open_map; the sector map / local map: open_sector_map', act('open the map', 'open_map') && act('show me the galaxy map', 'open_map') && act('map', 'open_map') && act('open the sector map', 'open_sector_map') && act('show the local map', 'open_sector_map'));
  check('"where are the pirates" is an answer, not an order', !!it('where are the pirates') && !!it('where are the pirates').say && !it('where are the pirates').act);
  const jump = it('how do I jump'), trade = it('how do I trade');
  check('"how do I jump" says the keys: G, a star, Enter, Esc or S cancels, and what it needs', jump && /\bG\b/.test(jump.say) && /\bEnter\b/.test(jump.say) && /Esc or S cancels/.test(jump.say) && /fuel/.test(jump.say) && /range/.test(jump.say), jump && jump.say);
  check('"how do I trade" says the keys: shoot rocks with Space, dock with L, the MISSIONS terminal with E, number key', trade && /Space/.test(trade.say) && /\bL\b/.test(trade.say) && /\bE\b/.test(trade.say) && /MISSIONS/.test(trade.say), trade && trade.say);
  check('also: how can I make money, how to sell ore, where can I sell ore, how do I get paid, what is jumping', ['how can I make money', 'how to sell ore', 'how do I earn credits'].every(q => it(q) && /MISSIONS/.test(it(q).say)) && it('what is jumping') && /G\b/.test(it('what is jumping').say));
  check('docked, "how do I jump" starts with launching first', (g.run(`__station()`), J(`shipcompIntent('how do I jump', __cur)`).say.startsWith('Launch first')));
  g.run(`__space(${station.x + 3000}, ${station.y})`);
  check('a bare "jump" with no course plotted says how; with a course plotted it is the jump', /galaxy map/.test(it('jump').say) && (g.run(`SHIPCOMP.route = 'kestrel'`), act('jump', 'jump_next_hop')));
  g.run(`SHIPCOMP.route = ''`);
  check('what is not one of these goes to the model: other questions, a plot, how do I buy a ship', ['what is my fuel', 'how do I buy a ship', 'how do I sell my ship', 'plot a course to the roost', 'tell me a joke', 'can I afford the Kite?', 'attack the station', 'why am I slow'].every(q => it(q) === null), JSON.stringify(['what is my fuel', 'how do I buy a ship', 'attack the station', 'plot a course to the roost'].map(q => [q, it(q)])));
}

console.log('B. hunt');
{
  const R = (raw = 'hunt') => LOCAL(raw);
  g.run(`__world('kite', 30); __space(${station.x + 3000}, ${station.y})`);
  const snap = J(SNAP);
  let r = R('fly to the pirates and fight them');
  check('no pirate here: refused in plain words that name the system, how often they come, and the nearest charted stars with more (name, ly, danger)', r.refused && !r.runs && /^No pirates in Halcyon right now; a new one turns up about every \d+ seconds\./.test(r.text) && /Brass Reach, [\d.]+ ly \(danger 2\)/.test(r.text) && /The Hollow, [\d.]+ ly \(danger 2\)/.test(r.text) && !/Kestrel|Meridian/.test(r.text), r.text);
  check('and the line says where to look: the galaxy map key', /G opens the galaxy map/.test(r.text));
  g.run(`G.known = ['halcyon']`);
  check('with no charted star known for pirates, it says that and nothing else', /No charted star is known for pirates yet/.test(R().text));
  g.run(`G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']; G.deep = { x: 0 }`);
  check('in deep space: no pirates, and why', /deep space/.test(R().text));
  g.run(`G.deep = null; __station()`);
  check('docked: launch first', /launch first/.test(R().text) && J('__cur.scene.key') === 'Station');

  g.run(`__space(${station.x + 3000}, ${station.y}, [[1400, 0], [600, 0, 'gunship'], [-900, 300]])`); // three raiders: the nearest is the gunship at 600
  r = R('hunt');
  check('the nearest pirate is chosen, its kind, range in km and direction named; it says the guns lock in range and that any key takes the stick back', r.action === 'hunt' && r.runs && /^Hunting the gunship, 60 km east\. The guns lock in range\. Any flight key takes the stick back\.$/.test(r.text), r.text);
  check('run: the assist comes on and Keep at range is ordered on THAT pirate; a hunt is open on it', J('ASSIST.on') === true && J('__cur.as.mode') === 'keep' && J('__cur.as.target === __cur.list[1]') === true && J('__cur.ov.hunt && __cur.ov.hunt.ref === __cur.list[1]') === true, J('[ASSIST.on, __cur.as.mode, __toasts]'));
  check('a hunt is not a cruise when it is near', J('__cruise.length') === 0);
  g.run(`__cur.time.now += 17; overviewHuntFrame(__cur)`);
  check('in reach (1100 px): the gun lock is taken on it, and the hunt is over once it holds', J('__locked === __cur.list[1]') === true && (g.run(`__cur.time.now += 17; overviewHuntFrame(__cur)`), J('__cur.ov.hunt') === null));
  g.run(`__space(${station.x + 3000}, ${station.y}, [[3000, 0]])`); // far: 300 km
  r = R('attack');
  check('a far one is a Cruise to, handing over to Keep at range; the line says it cruises first', r.runs && /Hunting the raider, 300 km east\. Cruising to it, then the guns lock\./.test(r.text) && J('__cruise.length') === 1 && J('__cruise[0]') === 'keep', r.text);
  g.run(`__cur.time.now += 17; overviewHuntFrame(__cur)`);
  check('out of reach there is no lock yet; it waits', J('__lockCalls') === 0 && J('__cur.ov.hunt !== null') === true);
  g.run(`__cur.list[0].x = __cur.ship.x + 1000; __cur.time.now += 17; overviewHuntFrame(__cur)`);
  check('when it comes into reach the lock is taken', J('__locked === __cur.list[0]') === true);
  g.run(`__space(${station.x + 3000}, ${station.y}, [[3000, 0]]); __local('hunt', __cur); __cur.cruising = true; __cur.time.now += 17; overviewHuntFrame(__cur)`);
  check('while the ship cruises there is no lock (the lock cannot be held then)', J('__lockCalls') === 0);
  g.run(`__cur.cruising = false; __cur.list[0].active = false; __cur.time.now += 17; overviewHuntFrame(__cur)`);
  check('the pirate is gone: the hunt ends by itself', J('__cur.ov.hunt') === null);
  g.run(`__space(${station.x + 3000}, ${station.y}, [[800, 0]]); __local('hunt', __cur); __cur.time.now += 200000; overviewHuntFrame(__cur)`);
  check('a hunt gives up after OVERVIEW.huntFor ms', J('__cur.ov.hunt') === null);

  g.run(`__space(${station.x + 3000}, ${station.y}, [[800, 0]])`);
  r = J(`(() => { const p = shipcompLocal('where are the pirates', __cur); return { text: p.text, run: !!p.run }; })()`);
  check('"where are the pirates" says the nearest and how many, and flies nowhere', /^Nearest: a raider, 80 km east\. Say hunt and I fly there and fight\.$/.test(r.text) && !r.run && J('ASSIST.on') === false, r.text);
  g.run(`__space(${station.x + 3000}, ${station.y}, [[800, 0], [900, 100]]); G.credits = 2580`);
  const before = J(SNAP);
  g.run(`__local('hunt', __cur)`);
  check('the model can write it too: DO: hunt is on the closed list and runs the same', J(`(() => { __space(${station.x + 3000}, ${station.y}, [[800, 0]]); const p = __do('SAY: Engaging.\\nDO: hunt', __cur); return p.action === 'hunt' && !!p.run && __cur.as.mode === 'keep'; })()`));
  g.run(`__space(${station.x + 3000}, ${station.y}, [[800, 0], [900, 100]]); __local('hunt', __cur)`);
  check('never buys: credits, fuel, ore, jobs and the fleet are as they were', J(SNAP) === before);
}

console.log('C. fly to a name');
{
  g.run(`__world('kite', 30); __space(${station.x + 3000}, ${station.y}, [[1200, 0]]); __cur.mx = { freighter: __sprite(${station.x + 3000 - 500}, ${station.y}) }; __cur.tr = { police: [{ img: __sprite(${station.x + 3000}, ${station.y + 900}) }], civ: [{ img: __sprite(${station.x + 3000}, ${station.y - 3000}) }] }`);
  let r = LOCAL('fly to Halcyon Station');
  check('a place by name: "Docking at Halcyon Station, N km." (the station takes the dock order), then the autopilot has the ship with that order', /^Docking at Halcyon Station, [\d,]+ km\. Any flight key takes the stick back\.$/.test(r.text) && J('__cur.ap.on') === true && J('__cur.ap.order') === 'dock' && J('__cur.cr.target.id') === station.id, r.text);
  g.run(`__space(${station.x + 3000}, ${station.y})`);
  r = LOCAL('go to the planet');
  check('the planet you can land on: "Landing on ...", the land order', /^Landing on /.test(r.text) && J('__cur.ap.on') === true && J('__cur.ap.order') === 'land', r.text);
  g.run(`__space(${station.x + 3000}, ${station.y}); __cur.canLand = false`);
  r = LOCAL('go to the planet');
  check('a planet that cannot be landed on is flown to, with no land order', /^Flying to /.test(r.text) && J('__cur.ap.on') === true && J('__cur.ap.order') === '', r.text);
  g.run(`__space(${station.x + 3000}, ${station.y})`);
  r = LOCAL('fly to the asteroid belt');
  check('"the belt", "the asteroid belt", "asteroids": the belt', /^Flying to /.test(r.text) && J('__cur.ap.on') === true && /belt/i.test(J('__cur.cr.target.type')), r.text);
  g.run(`__space(${station.x + 3000}, ${station.y}, [[1200, 0]]); __cur.mx = { freighter: __sprite(${station.x + 3000 - 500}, ${station.y}) }; __cur.tr = { police: [{ img: __sprite(${station.x + 3000}, ${station.y + 900}) }], civ: [{ img: __sprite(${station.x + 3000}, ${station.y - 3000}) }] }`);
  r = LOCAL('fly to the police');
  check('a ship of the Overview by name: the police cruiser, 90 km south; Approach is ordered on it', /^Flying to the police, 90 km south\./.test(r.text) && J('ASSIST.on') === true && J('__cur.as.mode') === 'approach' && J('__cur.as.target === __cur.tr.police[0].img') === true, r.text + ' ' + J('[__cur.as.mode, __toasts]'));
  g.run(`__space(${station.x + 3000}, ${station.y}, [[1200, 0]]); __cur.mx = { freighter: __sprite(${station.x + 3000 - 500}, ${station.y}) }; __cur.tr = { police: [], civ: [{ img: __sprite(${station.x + 3000}, ${station.y - 3000}) }] }`);
  r = LOCAL('go to the freighter');
  check('a far ship (300 km) is a Cruise to', /^Flying to the freighter, 300 km north\./.test(r.text) && J('__cruise.length') === 1, r.text);
  r = LOCAL('go to the MULE');
  check('the escort by its name, MULE', /^Flying to the mule, 50 km west\./.test(r.text) && J('__cur.as.target === __cur.mx.freighter') === true, r.text);
  g.run(`__space(${station.x + 3000}, ${station.y}, [[1200, 0]])`);
  r = LOCAL('go to the raider');
  check('a pirate by its kind is the hunt', r.action === 'hunt' && /^Hunting the raider/.test(r.text));
  r = LOCAL('go to the zorp');
  check('a name that is nowhere in the lists: a plain line that says what is, and nothing runs', r.refused && !r.runs && /^I see nothing called "zorp" in your lists\. Try: .*Halcyon Station/.test(r.text), r.text);
  g.run(`__space(${station.x + 3000}, ${station.y}); __cur.cruising = true`);
  check('while cruising: "Cruising already. S cancels."', LOCAL('fly to the planet').text === 'Cruising already. S cancels.');
  g.run(`__space(${station.x + 3000}, ${station.y}); G.deep = { x: 0 }`);
  check('in deep space there is nothing to fly to, and it says so', /nothing to fly to in deep space/.test(LOCAL('fly to the planet').text));
  g.run(`G.deep = null; __space(${station.x + 3000}, ${station.y}); __cur.jmp = { to: 'kestrel' }`);
  check('while a jump charges: it says S or Esc cancels it first', /jump is charging/.test(LOCAL('fly to the planet').text));
  g.run(`__space(${station.x + 3000}, ${station.y})`);
  r = LOCAL('jump to kestrel');
  check('a star by name: the first jump of the way is charged as the galaxy map\'s Enter charges it ("Jumping to Kestrel"), S or Esc cancels', /^Jumping to Kestrel/.test(r.text) && J('__cur.jmp && __cur.jmp.to') === 'kestrel', r.text);
  g.run(`__world('wren', 40, 2580); __space(${station.x + 3000}, ${station.y}); G.known.push('roost')`);
  r = LOCAL('fly to Reaver\'s Roost');
  check('a star this ship cannot reach: the plotter\'s own words say why and what would fix it; nothing runs', r.refused && !r.runs && /Wren|range|jump/i.test(r.text), r.text);
  g.run(`__station()`);
  check('docked: launch first', LOCAL('fly to the planet', '__cur').text === 'We are docked, pilot: launch first.');
  g.run(`__world('kite', 30); __space(${station.x + 3000}, ${station.y})`);
  r = J(`(() => { __cur.cr.target = { id: '${planet.id}', name: '${planet.name}', type: 'planet', x: ${planet.x}, y: ${planet.y}, r: 316 }; const p = __local('fly to the planet', __cur); return p.text; })()`);
  check('the same word twice is not an error: the planet is flown to again', /^(Landing on|Flying to) /.test(r));
}

console.log('D. Enter and a click');
{
  g.run(`__world('kite', 30); __space(${station.x + 3000}, ${station.y}, [[800, 0]])`);
  const idx = J(`(() => { const s = __cur; s.cr.list = navpanelRows(cruiseKnown(s), navpanelJumps(s), null); return s.cr.list.map(r => r.kind + ':' + r.id + ':' + r.type); })()`);
  const iSt = idx.findIndex(x => x === 'body:' + station.id + ':station'), iJump = idx.findIndex(x => /^jump:/.test(x));
  check('the panel has the station and at least one jump row', iSt >= 0 && iJump >= 0, idx.join(' '));
  g.run(`navpanelClick(__cur, ${iSt})`);
  check('FIRST Enter on a place: the target is the row and the autopilot has the ship, with the dock order for the station', J('__cur.ap.on') === true && J('__cur.cr.target.id') === station.id && J('__cur.ap.order') === 'dock', J('[__cur.ap.on, __toasts]'));
  check('and the confirmation is one line: the autopilot\'s own ("Docking at ... Any key takes the stick back.")', J('__toasts.filter(t => /Docking at/.test(t)).length') === 1 && J('__toasts.length') === 1, J('__toasts'));
  g.run(`__space(${station.x + 3000}, ${station.y}); __cur.cr.list = navpanelRows(cruiseKnown(__cur), navpanelJumps(__cur), null)`);
  g.run(`navpanelClick(__cur, ${iJump})`);
  check('a jump row keeps its two steps: the first Enter only sets it (no autopilot, no charge)', J('__cur.ap.on') === false && J('__cur.jmp') === null && J('!!__cur.np.jump') === true, J('__toasts'));
  g.run(`navpanelClick(__cur, ${iJump})`);
  check('and the second Enter jumps', J('!!(__cur.jmp && __cur.jmp.to)') === true);
  g.run(`__space(${station.x + 3000}, ${station.y}); __cur.cruising = true`);
  g.run(`navpanelFly(__cur, cruiseKnown(__cur)[0])`);
  check('a place that cannot be flown to right now says why in one line (cruising)', J('__toasts.length') === 1 && /Cruising already/.test(J('__toasts[0]')) && J('__cur.ap.on') === false);
  g.run(`__space(${station.x + 3000}, ${station.y}); __toasts = []; navpanelFly(__cur, { id: 'nowhere', name: 'Nowhere', type: 'belt', x: __cur.ship.x + 10, y: __cur.ship.y, r: 0, dist: 10 })`);
  check('a place you are already at: "You are already at ..."', J('__toasts[0]') === 'You are already at Nowhere.');
  // the Overview: Enter or a click on a ship row
  g.run(`__space(${station.x + 3000}, ${station.y}, [[800, 0]]); __cur.tr = { police: [{ img: __sprite(${station.x + 3000}, ${station.y + 900}) }], civ: [] }; __cur.mx = null; overviewBuild(__cur)`);
  check('the Overview lists the raider and the police', J('__cur.ov.rows.map(r => r.name)').join() === 'raider,police');
  g.run(`overviewFly(__cur, __cur.ov.rows[1])`);
  check('Enter on a police row: Approach on it, no hunt, no lock', J('__cur.as.mode') === 'approach' && J('__cur.as.target === __cur.tr.police[0].img') === true && J('__cur.ov.hunt') === null && J('__lockCalls') === 0);
  g.run(`__cur.ov.rows = null; overviewBuild(__cur); overviewFly(__cur, __cur.ov.rows[0])`);
  check('Enter on a raider row: Keep at range on it and a hunt (the gun lock when in reach)', J('__cur.as.mode') === 'keep' && J('__cur.as.target === __cur.list[0]') === true && J('__cur.ov.hunt && __cur.ov.hunt.ref === __cur.list[0]') === true);
  g.run(`overviewFly(__cur, __cur.ov.rows[1])`);
  check('picking the police afterwards ends the hunt of the raider', J('__cur.ov.hunt') === null);
  g.run(`__space(${station.x + 3000}, ${station.y}, [[800, 0]]); overviewBuild(__cur); assistOn(__cur, true); __cur.as.mode = 'orbit'; __cur.as.target = __cur.list[0]; __cruise = []`);
  check('an order already on that ship is kept (Orbit stays Orbit)', (g.run(`overviewFly(__cur, __cur.ov.rows[0])`), J('__cur.as.mode')) === 'orbit');
  g.run(`__space(${station.x + 3000}, ${station.y}, [[3000, 0]]); overviewBuild(__cur); overviewFly(__cur, __cur.ov.rows[0])`);
  check('a far raider row (300 km): Cruise to, handing over to Keep at range', J('__cruise.length') === 1 && J('__cruise[0]') === 'keep');
  check('a place is still refused by the Overview (places are the panel\'s)', J(`overviewFly(__cur, { ref: { id: 'st', name: 'Halcyon Station', x: 0, y: 0 } })`) === '');
  g.run(`__space(${station.x + 3000}, ${station.y}, [[800, 0]]); __cur.list[0].active = false`);
  check('a ship that is gone is not flown to', J(`overviewFly(__cur, { ref: __cur.list[0] })`) === '');
}

console.log('E. the Tab map\'s click');
{
  const rows = [{ id: 'a', name: 'A', x: 100, y: 100 }, { id: 'b', name: 'B', x: 300, y: 100 }, { id: 'c', name: 'C', x: 310, y: 100 }];
  const near = (x, y, r) => J(`(() => { const b = navpanelNear(${JSON.stringify(rows)}, ${x}, ${y}, ${r}); return b && b.id; })()`);
  check('the place under a click: the nearest inside the radius', near(105, 98, 20) === 'a' && near(309, 100, 30) === 'c' && near(299, 100, 30) === 'b');
  check('a click on nothing: no place', near(200, 400, 20) === null && near(0, 0, 5) === null);
  const src = readFileSync(new URL('../src/map.js', import.meta.url), 'utf8');
  check('the map forwards the click to the navigation panel\'s own rule and has no picker of its own', /navpanelPlaceAt\(sp,/.test(src) && /navpanelFly\(sp, b\)/.test(src) && !/autopilotGo|cruisePick|cruiseKnown/.test(src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')));
  check('the map says what a click does, and the tips and the key table say Enter or a click flies there', /Click a place on the map to fly there/.test(src) && J(`CONTROLS.find(g => g.id === 'flight').rows.some(r => /^Places\\. Enter: fly there/.test(r.t))`) && J(`CONTROLS.find(g => g.id === 'flight').rows.some(r => /^Overview of ships: Enter flies/.test(r.t))`) && J(`SCENE_TIPS.Space`).includes('Enter or a click flies there'));
}

console.log('F. no chat key: the plain commands still run, and cost no question');
{
  g.run(`__world('kite', 30); __space(${station.x + 3000}, ${station.y}, [[800, 0]]); chatSetKey(''); chatSetOn(false); SHIPCOMP.mem = { day: '', n: 0 }; try { localStorage.clear(); } catch (e) {}`);
  const used = J('shipcompUsed()');
  check('there is no key: the computer is not available', J('shipcompAvailable()') === false);
  check('a plain command goes through shipcompSubmit with no box: said, toasted and run', J(`shipcompSubmit('fly to the pirates and fight them', __game)`) === true && J('__spoken.length') === 1 && /^Hunting the raider/.test(J('__spoken[0]')) && J('__toasts.some(t => /^Hunting the raider/.test(t))') && J('__cur.as.mode') === 'keep');
  check('words that are not a command: not taken (no box without a key)', J(`shipcompSubmit('what is my fuel', __game)`) === false);
  check('a refusal is said too, with no key', (g.run(`__space(${station.x + 3000}, ${station.y}); __toasts = []; __spoken = []`), J(`shipcompSubmit('hunt', __game)`) === true && /^No pirates in Halcyon/.test(J('__spoken[0]'))));
  check('and none of it counted as a question of the day', J('shipcompUsed()') === used);
  g.run(`chatSetKey('sk-test-${'o'.repeat(28)}'); chatSetProvider('openai'); chatSetOn(true); SHIPCOMP.limit.gap = 0; SHIPCOMP.limit.day = 1000; window.__calls = 0; chatComplete = async () => { window.__calls++; return { text: 'SAY: model' }; };`);
  g.run(`__space(${station.x + 3000}, ${station.y}, [[800, 0]]); (window.__r = null, shipcompAsk('go to the nearest pirate', __cur).then(r => { window.__r = r; }), 1)`);
  g.run(`1`);
  check('with a key, a plain command is still answered by the game and the model is not asked', J('window.__calls') === 0);
}

console.log('G. the table the model reads');
{
  const src = readFileSync(new URL('../src/shipcomputer.js', import.meta.url), 'utf8');
  check('the instructions name hunt, fly_to and open_sector_map, and the how-to lines name Enter and the click', /\| hunt \| fly_to <place, ship or star> \| open_map <star> \| open_sector_map/.test(src) && /Enter or a click on a row flies there at once/.test(src) && /Trade: there is no goods market/.test(src));
  check('the prompt the model gets carries them', J(`shipcompSystem(__cur)`).includes('open_sector_map') && J(`shipcompSystem(__cur)`).includes('Enter or a click on a row flies there'));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
