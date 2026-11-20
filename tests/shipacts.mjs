// smoke: the ship's computer acts: the model's reply is parsed and checked against the live game, the closed list runs, everything else is dropped, buying is never run (plain Node, a mocked model)
// Card space-game-ship-computer-acts (src/shipcomputer.js). Troy wants to say "plot a course to the mission's destination" and have the ship's computer answer and do it, or
// tell him what to buy. The model only writes words (a line to say and at most one action name); the GAME parses them, checks them against the live state and runs its own
// public functions. This test holds, on a stand-in Space scene that the real autopilot, cruise, assist, jump and map code run on:
//   A. the reply as { say, name, arg }: JSON, the two-line form, plain text; bad or odd replies; injection
//   B. each of the ten actions runs and changes the right state, announced first
//   C. each is refused, in plain words and doing nothing, when the live state says no
//   D. buying, selling, accepting, abandoning, refuelling are NEVER run, whatever the model writes, in any form; names that are not on the list are dropped
//   E. the Roost end to end, with a mocked model through shipcompAsk: a Wren is told it cannot and why and what to buy; a Kite gets its course in two hops and jumps the first
//   F. the prompt lists exactly the closed list, and the spoken line is the announcement (through the ship voice)
// Run: node tests/shipacts.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 700) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const KEY = 'sk-test-' + 'o'.repeat(28); // built from pieces: tests/hygiene.mjs looks for key-like strings in the repo

g.run(`
  var __toasts = [], __ran = [], __went = [], __nav = 0, __cruiseTo = 0, __spoken = [];
  toast = (s, msg) => { __toasts.push(String(msg)); }; sfx = () => {}; beep = () => {}; startCruiseHum = () => {}; stopCruiseHum = () => {}; cruiseFlash = () => {};
  go = (s, key) => { __went.push(key); }; navpanelOpen = () => { __nav++; }; overviewCruiseTo = () => { __cruiseTo++; return true; };
  voiceSayThen = (text, prio, model, start) => { __spoken.push(text); if (start) start('audio'); return true; };
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
  Phaser = { Math: { Clamp: (v, a, b) => Math.max(a, Math.min(b, v)), Angle: { Wrap: __wrap, Between: (x1, y1, x2, y2) => Math.atan2(y2 - y1, x2 - x1), RotateTo: (cur, tgt, step) => { const d = __wrap(tgt - cur); return Math.abs(d) <= step ? tgt : cur + Math.sign(d) * step; } }, Distance: { Between: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1) } },
    Input: { Keyboard: { JustDown: k => { const d = !!(k && k._justDown); if (k) k._justDown = false; return d; } } } };
  // the Space scene as the game's own code reads it: the real autopilot, cruise, assist and jump code run on it
  var __game = { scene: { isActive: () => false, getScenes: () => [__cur], getScene: () => null, run: (k, d) => __ran.push([k, d && d.sel || null]) } };
  var __cur = null;
  function __space(x, y) {
    const body = { velocity: { x: 0, y: 0 }, get speed() { return Math.hypot(body.velocity.x, body.velocity.y); }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const foes = [], s = __cur = { scene: { key: 'Space', pause() {} }, game: __game, add: __P, input: __P, events: __P, cameras: __P, tweens: __P, time: { now: 1000 }, k: {}, ship: { x, y, rotation: 0, body }, lockUntil: 0, dead: false, leaving: false, jmp: null, cruising: false, canLand: true,
      enemies: { getChildren: () => foes }, foes, cr: { target: null, active: false, list: [], sel: 0, speed: 0, nudge: 0, cancel: false, endWhy: '', navOpen: false } };
    ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'SHIFT', 'Q', 'E'].forEach(n => { s.k[n] = { isDown: false }; });
    autopilotSetup(s); s.ap.k = { P: {} }; s.ap.read = { setVisible() { return this; }, setText() { return this; } };
    assistSetup(s); __toasts = []; __ran = []; __went = []; __nav = 0; __cruiseTo = 0; __spoken = [];
    return s;
  }
  function __station() { __cur = { scene: { key: 'Station' }, game: __game }; __toasts = []; __ran = []; __went = []; return __cur; }
  function __world(model, fuel, credits, system) {
    G.deep = null; G.system = system || 'halcyon'; G.lastDock = 'halcyon-station'; G.fleet = [newShip(model)]; G.active = 0; G.credits = credits === undefined ? 2580 : credits; if (fuel !== undefined) G.fleet[0].fuel = fuel;
    G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']; G.mission = 'none'; G.missionId = null; G.missionProgress = 0; G.patrolsDone = 1; ASSIST.on = false;
    shipSync(G.fleet[0]); SHIPCOMP.route = '';
  }
  // the whole path of one reply: plan it, run it as the box would, and say what the game did
  function __do(raw, scene) { const plan = shipcompPlan(raw, scene || __cur); if (plan.run) plan.run(scene || __cur); return plan; }
`);
const P = (raw, scene = '__cur') => J(`(() => { const p = shipcompPlan(${JSON.stringify(raw)}, ${scene}); return { text: p.text, action: p.action, arg: p.arg, refused: p.refused, dropped: p.dropped, runs: !!p.run }; })()`);
const DO = (raw, scene = '__cur') => J(`(() => { const p = __do(${JSON.stringify(raw)}, ${scene}); return { text: p.text, action: p.action, refused: p.refused, dropped: p.dropped, runs: !!p.run }; })()`);
const SNAP = `JSON.stringify([G.credits, G.fleet.map(x => x.model + ':' + x.fuel), G.mission, G.missionId, G.system, G.known.length])`;
const planet = J(`(() => { const b = sysBody('planet'); return { id: b.id, name: b.name, x: b.x, y: b.y }; })()`), station = J(`(() => { const b = sysBody('station'); return { id: b.id, name: b.name, x: b.x, y: b.y }; })()`);

console.log('A. the reply, read');
{
  const pr = raw => J(`shipcompParse(${JSON.stringify(raw)})`);
  let r = pr('SAY: Plotting a course to the Roost.\nDO: plot_route roost');
  check('the two-line form: the line and the action with its argument', r.say === 'Plotting a course to the Roost.' && r.name === 'plot_route' && r.arg === 'roost', JSON.stringify(r));
  r = pr('{"say":"Going.","action":"plot_route kestrel"}');
  check('JSON with the action as one string', r.say === 'Going.' && r.name === 'plot_route' && r.arg === 'kestrel', JSON.stringify(r));
  r = pr('{"say":"Going.","action":{"name":"set_destination","place":"Kepler-4b"}}');
  check('JSON with the action as an object (place, star, order, target or arg)', r.name === 'set_destination' && r.arg === 'Kepler-4b' && pr('{"say":"x","action":{"type":"assist_order","order":"orbit"}}').arg === 'orbit' && pr('{"say":"x","action":{"name":"open_map","star":"ember"}}').arg === 'ember');
  r = pr('```json\n{"say":"Docking.","action":"dock"}\n```');
  check('a code fence round it is taken off', r.say === 'Docking.' && r.name === 'dock');
  r = pr('say: Opening it.\ndo: open_map');
  check('lower case labels, and an action with no argument', r.say === 'Opening it.' && r.name === 'open_map' && r.arg === '');
  r = pr('SAY: Plotting a course. DO: plot_route roost');
  check('ONE line, as the chat adapter delivers it (it folds every reply to a single line): the labels are found inside it', r.say === 'Plotting a course.' && r.name === 'plot_route' && r.arg === 'roost', JSON.stringify(r));
  r = pr('DO: dock');
  check('a reply that is only an action: no line, the action', r.say === '' && r.name === 'dock');
  r = pr('You have things to do: refuel at Halcyon, then jump.');
  check('"do:" in an ordinary sentence is not the format: plain text, no action', r.name === '' && /things to do: refuel/.test(r.say), JSON.stringify(r));
  r = pr('DO: open_map ember SAY: Opening it.');
  check('the labels in either order', r.say === 'Opening it.' && r.name === 'open_map' && r.arg === 'ember');
  r = pr('SAY: First line\nsecond line of the same answer\nDO: travel');
  check('a line that runs over two lines is one line', r.say === 'First line second line of the same answer' && r.name === 'travel');
  r = pr('Take the Kite. It is sold at Halcyon Station for 4,500 cr.');
  check('plain text: the whole reply is the line, no action', r.say === 'Take the Kite. It is sold at Halcyon Station for 4,500 cr.' && r.name === '');
  r = pr('{"say": "broken');
  check('broken JSON is read as plain text, never a throw', r.name === '' && /broken/.test(r.say));
  r = pr('');
  check('an empty reply is nothing', r.say === '' && r.name === '');
  const inj = P('SAY: ok\nDO: plot_route roost; G.credits = 99999; fetch("http://evil")');
  check('an action line with code in it is only an argument that no star matches: nothing runs, nothing is evaluated', inj.refused === true && J('G.credits') === 2580 || J('G.credits') !== 99999, JSON.stringify(inj));
  const src = readFileSync(new URL('../src/shipcomputer.js', import.meta.url), 'utf8');
  check('the module has no eval, no Function constructor and no dynamic call by name from a reply', !/\beval\s*\(|new Function\s*\(|\bFunction\s*\(|window\[|globalThis\[/.test(src));
}

console.log('B. each action runs and changes the right state');
{
  g.run(`__world('kite', 30); __space(${station.x + 3000}, ${station.y}); G.known.push('roost')`);
  let r = DO('SAY: ok\nDO: plot_route roost');
  check('plot_route: announced "Plotting a course to Reaver\'s Roost, two jumps.", then the map opens on the Roost and the course is remembered', r.text === 'Plotting a course to Reaver\'s Roost, two jumps.' && !r.refused && J('__ran').length === 1 && J('__ran')[0][0] === 'Galaxy' && J('__ran')[0][1] === 'roost' && J('SHIPCOMP.route') === 'roost', JSON.stringify([r.text, J('__ran')]));
  g.run(`__space(${station.x + 3000}, ${station.y}); __ran = []`);
  r = DO('DO: plot_route kestrel');
  check('plot_route, one jump: "one jump"; a star by its name or its id', r.text === 'Plotting a course to Kestrel, one jump.' && DO('DO: plot_route "Reaver\'s Roost"').text === 'Plotting a course to Reaver\'s Roost, two jumps.');
  g.run(`__space(${station.x + 3000}, ${station.y}); SHIPCOMP.route = 'roost'`);
  r = DO('DO: jump_next_hop');
  check('jump_next_hop: announced as jump 1 of 2, and the charge starts for KESTREL, the first hop', r.text === 'Jumping to Kestrel, jump 1 of 2. S or Esc cancels.' && J('__cur.jmp && __cur.jmp.to') === 'kestrel', JSON.stringify([r.text, J('__cur.jmp && __cur.jmp.to')]));
  g.run(`__space(${station.x + 3000}, ${station.y})`);
  r = DO(`DO: set_destination ${planet.name}`);
  check('set_destination: "Destination set: Kepler-4b, N km" and the nav target is that planet (cruisePick)', /^Destination set: Kepler-4b, [\d,]+ km\.$/.test(r.text) && J('__cur.cr.target.id') === planet.id, r.text + ' ' + J('__cur.cr.target && __cur.cr.target.id'));
  g.run(`__space(${station.x + 3000}, ${station.y}); __cur.cr.target = { id: '${planet.id}', name: '${planet.name}', type: 'planet', x: ${planet.x}, y: ${planet.y}, r: 316 }`);
  r = DO('DO: travel');
  check('travel: "Flying to Kepler-4b" and the autopilot has the ship, on that target', /^Flying to Kepler-4b, [\d,]+ km\./.test(r.text) && J('__cur.ap.on') === true && J('__cur.ap.target.id') === planet.id, r.text);
  g.run(`__space(${station.x + 3000}, ${station.y}); __cur.cr.target = null`);
  r = DO('DO: travel kepler-4b');
  check('travel with a place named: sets it and goes', J('__cur.ap.on') === true && J('__cur.cr.target.id') === planet.id);
  g.run(`__space(${station.x + 3000}, ${station.y})`);
  r = DO('DO: dock');
  check('dock: "Docking at Halcyon Station." and the autopilot has a dock order on the station', r.text === 'Docking at ' + station.name + '.' && J('__cur.ap.on') === true && J('__cur.ap.order') === 'dock' && J('__cur.ap.target.id') === station.id, r.text);
  g.run(`__space(${planet.x - 2000}, ${planet.y})`);
  r = DO('DO: land');
  check('land: "Landing on Kepler-4b." and a land order', r.text === 'Landing on ' + planet.name + '.' && J('__cur.ap.order') === 'land' && J('__cur.ap.target.id') === planet.id, r.text);
  for (const [order, label] of [['approach', 'Approach'], ['keep', 'Keep at range'], ['orbit', 'Orbit'], ['match', 'Match speed']]) {
    g.run(`__space(${planet.x - 4000}, ${planet.y}); __cur.cr.target = { id: '${planet.id}', name: '${planet.name}', type: 'planet', x: ${planet.x}, y: ${planet.y}, r: 316 }`);
    r = DO('DO: assist_order ' + order);
    check(`assist_order ${order}: "${label} on Kepler-4b." the assist is switched on and holds that order on the target`, r.text === label + ' on ' + planet.name + '.' && J('ASSIST.on') === true && J('__cur.as.mode') === order && J('__cur.as.target.id') === planet.id, r.text + ' ' + J('__cur.as.mode'));
  }
  g.run(`__space(0, 0); __cur.cm = { pick: { active: true, body: {} } }`);
  r = DO('DO: assist_order cruise_to');
  check('assist_order cruise_to: the Overview\'s Cruise to runs on the selected ship', r.text === 'Cruising to the selected ship.' && J('__cruiseTo') === 1, r.text);
  g.run(`__space(${station.x + 3000}, ${station.y})`);
  r = DO('DO: open_map ember');
  check('open_map: opens the galaxy map on that star; with no star, on the default', r.text === 'Opening the galaxy map at Ember.' && J('__ran')[0][1] === 'ember' && (g.run('__ran = []'), DO('DO: open_map').text === 'Opening the galaxy map.' && J('__ran')[0][0] === 'Galaxy'));
  g.run(`__station(); G.lastDock = 'halcyon-station'; HANGAR_UI.tab = 'fleet'`);
  r = DO('DO: open_yard', '__cur');
  check('open_yard: in a station, opens the ship bay on the yard tab, and buys nothing', r.text === 'Opening the yard. The purchase is yours to make.' && J('HANGAR_UI.tab') === 'yard' && J('__went').join() === 'Ship' && J('G.fleet.length') === 1 && J('G.credits') === 2580, r.text);
  g.run(`__world('kite', 30); G.mission = 'accepted'; G.missionId = 'bounty'; __space(${station.x + 3000}, ${station.y}); __nav = 0`);
  r = DO('DO: show_job');
  check('show_job: says the job and its next step, and opens the nav list where it is pinned', /^Your job, Bounty\. Jump 1 of 2: Kestrel/.test(r.text) && J('__nav') === 1, r.text);
}

console.log('C. refused, in plain words, doing nothing');
{
  const refuse = (setup, raw, re, what) => { g.run(setup); const before = J(SNAP), r = DO(raw), after = J(SNAP); check(what, r.refused === true && r.runs === false && re.test(r.text) && before === after && J('__ran').length === 0 && J('__went').length === 0, r.text); };
  const sp = `__world('wren', 40); __space(${station.x + 3000}, ${station.y})`;
  refuse(sp, 'DO: plot_route', /^Which star, pilot\?$/, 'plot_route with no star asks which');
  refuse(sp, 'DO: plot_route Narnia', /^I have no star called "Narnia" on my charts\.$/, 'plot_route to a star that does not exist');
  refuse(sp, 'DO: plot_route halcyon', /^We are already in Halcyon\.$/, 'plot_route to where we are');
  refuse(sp, 'DO: plot_route ember', /^Ember is not charted yet\./, 'plot_route to a star not on the chart');
  refuse(sp + '; G.known.push("roost")', 'DO: plot_route roost', /^Needs a 12\.2 ly jump: your Wren does 8\. The Kite at the Halcyon yard does 14, 4,500 cr\. You have 2,580 cr: 1,920 short, about 4 more rescues\.$/, 'plot_route the Roost with a Wren: the plotter\'s words, the price, the gap in credits, in rescues (500 each)');
  refuse(sp + '; G.deep = { x: 1 }', 'DO: plot_route kestrel', /^The jump drive is spent/, 'plot_route in deep space');
  refuse(sp, 'DO: jump_next_hop', /^No course is plotted\. Tell me which star\.$/, 'jump_next_hop with no course and no job');
  refuse(sp + '; SHIPCOMP.route = "kestrel"; __cur.foes.push({ active: true, x: __cur.ship.x + 500, y: __cur.ship.y })', 'DO: jump_next_hop', /^Hostiles near: no jump\.$/, 'jump_next_hop with a hostile close');
  refuse(`__world('wren', 3); __space(${station.x + 3000}, ${station.y}); SHIPCOMP.route = "kestrel"`, 'DO: jump_next_hop', /^The jump to Kestrel costs 6\.3 fuel and we hold 3\. Dock and fill up at a pump first\.$/, 'jump_next_hop with too little fuel');
  refuse(`__world('wren', 40); __space(${station.x + 3000}, ${station.y}); SHIPCOMP.route = "halcyon"`, 'DO: jump_next_hop', /^We are already in Halcyon\.$/, 'jump_next_hop to where we are');
  refuse(`__world('kite', 30); __station(); SHIPCOMP.route = "kestrel"`, 'DO: jump_next_hop', /^Jumps start from space, pilot: launch first\.$/, 'jump_next_hop while docked');
  refuse(sp, 'DO: set_destination Narnia', /^I see no place called "Narnia" here\.$/, 'set_destination to a place that is not here');
  refuse(sp, 'DO: set_destination ember', /^Ember is another star: ask me to plot a course there\.$/, 'set_destination to another star points to plot_route');
  refuse(sp, 'DO: set_destination', /^Where to, pilot\?$/, 'set_destination with no place');
  refuse(sp, 'DO: travel', /^No destination is set\. Tell me where\.$/, 'travel with no destination');
  refuse(`__world('wren', 40); __station()`, 'DO: set_destination kepler-4b', /^We are docked, pilot: launch first, then I can set a destination\.$/, 'set_destination while docked');
  refuse(`__world('wren', 40); __station()`, 'DO: dock', /^We are already docked, pilot\.$/, 'dock while docked');
  refuse(`__world('wren', 40); __space(${station.x + 3000}, ${station.y}); __cur.canLand = false`, 'DO: land', /^There is no planet here that we can land on\.$/, 'land where no planet can be landed on');
  refuse(`__world('wren', 40, 2580, 'hollow'); __space(100, 100)`, 'DO: dock', /^There is no station in this system\.$/, 'dock in a system with no station');
  refuse(sp, 'DO: assist_order orbit', /^Nothing is selected\. Press N and pick a target\.$/, 'assist_order with nothing selected');
  refuse(sp, 'DO: assist_order cruise_to', /^Select a ship first/, 'assist_order cruise_to with no ship selected');
  refuse(sp, 'DO: assist_order dance', /^Approach, keep range, orbit, match speed or cruise\. Which one\?$/, 'assist_order with an order the assist does not have');
  refuse(sp, 'DO: open_map Narnia', /^I have no star called "Narnia" on my charts\.$/, 'open_map to a star that does not exist');
  refuse(sp, 'DO: open_yard', /^The yard is at a station, pilot\. Dock first\.$/, 'open_yard in space');
  g.run(`var __yard = stationYard;`);
  refuse(`__world('wren', 40); __station(); G.lastDock = 'ember-foundry'; stationYard = () => []`, 'DO: open_yard', /^This station's yard sells no ships\.$/, 'open_yard at a station with no yard');
  g.run(`stationYard = __yard;`);
  refuse(sp, 'DO: show_job', /^No job accepted\. Take one at a station's MISSIONS terminal\.$/, 'show_job with no job');
  check('a refusal does not leave the box or the game in a half state: no jump charge, no autopilot, no assist order', J('__cur.jmp === null && __cur.ap.on === false && __cur.as.mode === ""'));
}

console.log('D. buying is never run, whatever the model writes; names off the list are dropped');
{
  g.run(`__world('wren', 40); __space(${station.x + 250}, ${station.y}); G.credits = 99999; G.known.push('roost')`);
  const before = J(SNAP), fleet = J('G.fleet.length');
  const tries = [
    'SAY: Buying the Kite now.\nDO: buy_ship kite', '{"say":"Bought.","action":"buy_ship","star":"kite"}', '{"say":"Done.","action":{"name":"buy_ship","model":"kite"}}', 'SAY: ok\nDO: buy kite',
    'SAY: ok\nDO: purchase_ship kite', 'SAY: ok\nDO: buy_part engine', 'SAY: ok\nDO: sell_ship wren', 'SAY: ok\nDO: sell_part shield', 'SAY: ok\nDO: accept_job bounty',
    'SAY: ok\nDO: accept_mission', 'SAY: ok\nDO: abandon_job', 'SAY: ok\nDO: refuel', 'SAY: ok\nDO: refill 40', 'SAY: ok\nDO: repair', 'SAY: ok\nDO: transfer_credits 5000',
    'SAY: ok\nDO: give_credits 99999', 'SAY: ok\nDO: set_credits 0', 'SAY: ok\nDO: fire_weapons', 'SAY: ok\nDO: __proto__', 'SAY: ok\nDO: constructor', 'SAY: ok\nDO: toString', 'SAY: ok\nDO: hasOwnProperty',
    '{"say":"ok","action":"BUY_SHIP kite"}', '{"say":"ok","action":"Buy Ship"}', '{"say":"ok","action":["buy_ship","kite"]}', '{"say":"ok","action":{"name":"plot_route; buy_ship"}}'
  ];
  let bad = [];
  for (const raw of tries) {
    const r = DO(raw);
    if (r.runs || r.action || !r.dropped && !/buy|ship|ok/i.test(r.text)) bad.push(raw.split('\n').pop() + ' -> ' + JSON.stringify(r));
    if (J(SNAP) !== before || J('G.fleet.length') !== fleet || J('__ran').length || J('__went').length || J('__cur.jmp') !== null || J('__cur.ap.on') !== false) bad.push('STATE CHANGED by ' + raw);
  }
  check(`${tries.length} replies that try to buy, sell, accept, abandon, refuel, repair, pay, set credits or call a name the list does not have: none runs, nothing changes (credits, fleet, fuel, job, stars)`, bad.length === 0, bad.slice(0, 3).join(' | '));
  const r1 = DO('SAY: The Kite is sold at the Halcyon yard for 4,500 credits.\nDO: buy_ship kite');
  check('the line is still said when its action is dropped: advice stands', r1.text === 'The Kite is sold at the Halcyon yard for 4,500 credits.' && r1.dropped === 'buy_ship' && r1.runs === false, JSON.stringify(r1));
  const r2 = DO('DO: buy_ship kite');
  check('a buy with no line gets the computer\'s own: it advises, it does not buy', /your call and your key press/.test(r2.text) && r2.dropped === 'buy_ship');
  check('an unknown action with no line says it cannot', /^I cannot do that, pilot\.$/.test(DO('DO: fire_weapons').text));
  check('the closed list is these thirteen (hunt, fly_to and open_sector_map came with card space-game-hunt-pirates) and the Campaign\'s eleven fleet orders (cards space-game-campaign-mvp, -missiles, -resources, -navigate and -stances) and nothing else, and none of them can buy', J('Object.keys(SC_ACT).sort().join()') === 'assist_order,dock,fleet_attack,fleet_build,fleet_escort,fleet_fly,fleet_guard,fleet_launch,fleet_mine,fleet_missiles,fleet_recall,fleet_recharge,fleet_stance,fly_to,hunt,jump_next_hop,land,open_map,open_sector_map,open_yard,plot_route,set_destination,show_job,travel');
  const src = readFileSync(new URL('../src/shipcomputer.js', import.meta.url), 'utf8'), acts = src.slice(src.indexOf('const SC_ACT = {'), src.indexOf('// the reply made safe.'));
  check('the code of the thirteen never reaches a purchase, a sale, an accept, an abandon or a payment (it names none of those functions)', !/fleetBuy|fleetSell|fleetSwitch|shopBuy|buyPart|sellPart|pickMission|abandonMission|missionTryAccept|missionAccepted|rangerCall|pumpFill|G\.credits\s*[-+]?=[^=]|G\.mission\s*=[^=]/.test(acts), (acts.match(/fleetBuy|fleetSell|shopBuy|pickMission|abandonMission|missionTryAccept|G\.credits\s*[-+]?=[^=]|G\.mission\s*=[^=]/) || [''])[0]);
  check('open_yard only opens the screen: the yard\'s own buy needs two Enters there, and the bay keeps its own checks', /HANGAR_UI\.tab = 'yard'; sfx\('dock'\); go\(s2, 'Ship'\)/.test(acts));
}

console.log('E. the Roost, end to end, with a mocked model');
{
  g.run(`
    window.__calls = []; window.__reply = ''; window.__status = 200;
    window.fetch = (url, opts) => { __calls.push({ url: String(url), body: opts && opts.body }); return Promise.resolve(new Response(JSON.stringify({ choices: [{ message: { role: 'assistant', content: __reply } }] }), { status: 200, headers: { 'content-type': 'application/json' } })); };
    chatSetKey('${KEY}'); chatSetProvider('openai'); chatSetOn(true); SHIPCOMP.limit.gap = 0; SHIPCOMP.limit.day = 1000;
  `);
  const ask = async (q, reply) => { g.run(`window.__reply = ${JSON.stringify(reply)}; SHIPCOMP.history = []; SHIPCOMP.busy = false; SHIPCOMP.lastAt = 0; (window.__r = null, shipcompAsk(${JSON.stringify(q)}, __cur).then(r => { window.__r = r; }), 1)`); await g.waitFor('window.__r !== null', 8000); return J('({ text: window.__r.text, error: window.__r.error, hasPlan: !!window.__r.plan, runs: !!(window.__r.plan && window.__r.plan.run), refused: !!(window.__r.plan && window.__r.plan.refused) })'); };
  // a Wren, 2,580 credits, the bounty accepted: "plot a course to the mission's destination"
  g.run(`__world('wren', 40, 2580); G.mission = 'accepted'; G.missionId = 'bounty'; __space(${station.x + 3000}, ${station.y}); G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']`);
  let before = J(SNAP);
  let r = await ask('plot a course to the mission\'s destination', 'SAY: Plotting a course to the Roost.\nDO: plot_route the mission');
  check('a Wren: told it cannot and why, what to buy, where, and what is missing, in the game\'s words, not the model\'s', r.refused && !r.runs && r.text === 'Needs a 12.2 ly jump: your Wren does 8. The Kite at the Halcyon yard does 14, 4,500 cr. You have 2,580 cr: 1,920 short, about 4 more rescues.', r.text);
  check('and nothing happened: no map, no jump, no purchase', J(SNAP) === before && J('__ran').length === 0 && J('__cur.jmp') === null);
  check('the model was asked once, with the closed list in its instructions and the live state; the key went only in the header', J('__calls.length') === 1 && /ACTIONS/.test(J('__calls[0].body')) && !J('__calls[0].body').includes('sk-test'));
  r = await ask('how do I get there?', 'SAY: You need the Kite, 4,500 credits, at the Halcyon yard. You have 2,580.');
  check('a question with no action: the model\'s own line is said', !r.refused && !r.runs && r.text === 'You need the Kite, 4,500 credits, at the Halcyon yard. You have 2,580.');
  // the same pilot with 5,000 credits: it is enough, it says so, and offers the yard (a station)
  g.run(`G.credits = 5000`);
  r = await ask('can I afford the ship?', 'SAY: ok\nDO: plot_route roost');
  check('with the credits for it: it says it is enough and that the purchase is the pilot\'s own key press', /You have 5,000 cr: enough\. The purchase is your own key press; I can open the yard at a station\.$/.test(r.text), r.text);
  // a Kite: the course in two hops, then the first jump
  g.run(`__world('kite', 30, 2580); G.mission = 'accepted'; G.missionId = 'bounty'; __space(${station.x + 3000}, ${station.y}); G.known = ['halcyon', 'kestrel', 'meridian', 'brass', 'hollow']`);
  r = await ask('plot a course to the mission\'s destination', 'SAY: Plotting.\nDO: plot_route the mission');
  check('a Kite: "Plotting a course to Reaver\'s Roost, two jumps." and it will run', !r.refused && r.runs && r.text === 'Plotting a course to Reaver\'s Roost, two jumps.', r.text);
  g.run(`(() => { const p = window.__r.plan; p.run(__cur); })()`);
  check('run: the galaxy map opens on the Roost, with the chain the plotter made, and the course is kept', J('__ran')[0][0] === 'Galaxy' && J('__ran')[0][1] === 'roost' && J('SHIPCOMP.route') === 'roost' && J('galaxyPlan("halcyon", "roost", activeShip()).n') === 2);
  r = await ask('jump', 'SAY: Jumping.\nDO: jump_next_hop');
  g.run(`window.__r.plan.run(__cur)`);
  check('"jump": the first hop, Kestrel, is charged; any key of the charge cancels it as before', r.text === 'Jumping to Kestrel, jump 1 of 2. S or Esc cancels.' && J('__cur.jmp.to') === 'kestrel');
  g.run(`__cur.jmp = null; G.system = 'kestrel'; G.known.push('kestrel'); __space(0, 0)`);
  check('after the jump, from Kestrel: the course goes on to the Roost, one jump', (await ask('go on', 'SAY: Continuing.\nDO: jump_next_hop')).text === 'Jumping to Reaver\'s Roost. S or Esc cancels.');
}

console.log('F. the instruction, and the voice');
{
  g.run(`__world('wren', 40); __space(${station.x + 3000}, ${station.y})`);
  const sys = g.run(`shipcompSystem(__cur)`), names = J('Object.keys(SC_ACT)');
  check('the prompt names every action of the closed list (the Campaign\'s fleet orders are told to the model in a battle only: tests/campaign.mjs G), and the ones it may not do', names.filter(k => !/^fleet_/.test(k)).every(k => sys.includes(k)) && !/fleet_/.test(sys) && /NEVER buy, sell, accept, abandon or refuel/.test(sys));
  check('the format is told: SAY: and DO:, one action, and "say only what you are doing, never that it is done"', /SAY: one short sentence/.test(sys) && /DO: one action from the list/.test(sys) && /never that it is done/.test(sys));
  check('the prompt still holds the rules, the persona, the state and the keys, and never a key', /RULES\n/.test(sys) && /<persona>/.test(sys) && /STATE\n/.test(sys) && /KEYS\n/.test(sys) && !sys.includes(KEY));
  g.run(`__spoken = []; shipcompSay('Plotting a course to Kestrel, one jump.', () => { window.__started = true; })`);
  check('the announcement goes through the ship voice (voiceSayThen) and the action may start when it does', J('__spoken').join() === 'Plotting a course to Kestrel, one jump.' && J('window.__started') === true);
  const plan = J(`(() => { const p = shipcompPlan('SAY: x\\nDO: plot_route kestrel', __cur); return [p.text, p.action]; })()`);
  check('what is said for an action is the game\'s announcement, not the model\'s words', plan[0] === 'Plotting a course to Kestrel, one jump.' && plan[1] === 'plot_route');
  check('the persona file greets with what it can do', /plot courses/.test(readFileSync(new URL('../content/npcs/ship-computer.md', import.meta.url), 'utf8')));
}
check('the game was quiet', g.errors.length === 0, g.errors.slice(0, 2).join(' | '));

console.log(failed ? `\nSHIPACTS FAIL (${failed} of ${n})` : `\nSHIPACTS PASS (${n})`);
process.exit(failed ? 1 : 0);
