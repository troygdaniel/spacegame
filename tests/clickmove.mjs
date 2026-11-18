// smoke: click to move: a click on empty space flies there and stops, a click on a body or a ship makes it the target (plain Node, no Chrome)
// Card space-game-click-to-move, src/clickmove.js, on top of the flight assist (src/assist.js). The picking and what a click does are plain
// functions, so this runs in plain Node (tests/nodegame.mjs) with a stand-in scene, like tests/assist.mjs: this file moves the ship by its
// velocity each frame as Phaser would; clickmoveFrame, assistFrame and assistDrive do the rest exactly as in the game.
// Checks: nothing happens with the assist off or the nav list open; a point click flies there, stops there and ends; a body click sets the
// nav target the N list sets; a belt is not picked; a ship click moves a flying order onto the ship, and with no order hands 1 and 2 the ship;
// the picked ship is dropped when it dies or the nav target changes; an order's click keeps the guns quiet while the button is down.
// Run: node tests/clickmove.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 300) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 600) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

g.run(`
  var __toasts = [];
  toast = (s, msg) => { __toasts.push(msg); };
  sfx = () => {};
  var __P = new Proxy(function () {}, { get: (o, k) => k === Symbol.toPrimitive ? () => 0 : __P, apply: () => __P });
  var __s = null;
  function __ship(x, y, key, vx) { return { x, y, active: true, def: { key }, name: '', body: { velocity: { x: vx || 0, y: 0 } } }; }
  function __scene(x, y) {
    const body = { velocity: { x: 0, y: 0 }, setAcceleration() { return body; }, setDrag() { return body; }, setMaxSpeed() { return body; }, setVelocity(vx, vy) { body.velocity.x = vx; body.velocity.y = vy; return body; } };
    const list = [];
    const s = __s = { add: __P, events: __P, input: { on() {}, keyboard: __P, activePointer: { isDown: false } }, cameras: { main: { zoom: 1 } }, time: { now: 0 }, k: {}, nextFire: 0,
      cr: { target: null, navOpen: false }, ship: { x, y, rotation: 0, body }, lockUntil: 0, enemies: { list, getChildren: () => list },
      tr: { police: [{ img: { x: 5000, y: 5000, active: true, visible: true } }], civ: [] }, mx: {} };
    ASSIST.keys.forEach(n => { s.k[n] = { isDown: false }; });
    assistSetup(s);
    s.as.k = {}; [ASSIST.key].concat(Object.values(ASSIST_MODES).map(m => m.key)).forEach(n => { s.as.k[n] = {}; });
    clickmoveSetup(s);
    __toasts = [];
    return s;
  }
  function __frames(count) {
    const s = __s, dt = 1000 / 60; let maxV = 0;
    for (let i = 0; i < count; i++) {
      s.time.now += dt;
      clickmoveFrame(s, s.time.now);
      if (assistFrame(s, s.time.now, dt, '', '') === 'assist') assistDrive(s, dt);
      else { const k = Math.pow(0.55, dt / 1000); s.ship.body.velocity.x *= k; s.ship.body.velocity.y *= k; }
      const v = s.ship.body.velocity; s.ship.x += v.x * dt / 1000; s.ship.y += v.y * dt / 1000; maxV = Math.max(maxV, Math.hypot(v.x, v.y));
      s.enemies.list.forEach(e => { e.x += e.body.velocity.x * dt / 1000; });
      if (count > 100 && !s.as.mode) break;
    }
    const v = s.ship.body.velocity;
    return { x: s.ship.x, y: s.ship.y, v: Math.hypot(v.x, v.y), maxV, mode: s.as.mode };
  }
  function __press(n) { __s.as.k[n]._justDown = true; __frames(1); }
`);

check('the functions are there', J(`[typeof clickmovePick, typeof clickmoveClick, typeof clickmoveFrame, typeof clickmoveSetup, typeof clickmoveInstall]`).every(t => t === 'function'));

// far from every body of the home system, so a click here is empty space
const bodies = J(`cruiseKnown({ ship: { x: 0, y: 0 } }).map(b => ({ id: b.id, type: b.type, x: b.x, y: b.y, r: b.r }))`);
const st = bodies.find(b => b.type === 'station'), belt = bodies.find(b => b.type === 'belt');
const X = 20000, Y = 30000;
check('the test point is empty space', bodies.every(b => Math.hypot(b.x - X, b.y - Y) > (b.r || 0) + 2000), JSON.stringify(bodies.length));

// ---- off, and the nav list ----
g.run(`__scene(${X}, ${Y}); ASSIST.on = false;`);
check('assist off: a click does nothing (the mouse fires as before)', J(`clickmoveClick(__s, ${X + 800}, ${Y})`) === '' && J(`__s.as.mode`) === '' && J(`__s.cm.hold`) === false);
g.run(`ASSIST.on = true; __s.cr.navOpen = true;`);
check('nav list open: a click does nothing', J(`clickmoveClick(__s, ${X + 800}, ${Y})`) === '' && J(`__s.as.mode`) === '');
g.run(`__s.cr.navOpen = false; __s.dead = true;`);
check('dead: a click does nothing', J(`clickmoveClick(__s, ${X + 800}, ${Y})`) === '');
g.run(`__s.dead = false;`);

// ---- a point ----
check('a click on empty space is an Approach to that point, range 0', J(`clickmoveClick(__s, ${X + 1500}, ${Y + 900})`) === 'point' && J(`__s.as.mode`) === 'approach' && J(`__s.as.range`) === 0 && J(`__s.as.target.x`) === X + 1500);
const fly = J(`__frames(60 * 40)`);
check('the ship flies there, stops on it and the order ends', fly.mode === '' && Math.hypot(fly.x - (X + 1500), fly.y - (Y + 900)) <= 25 && fly.v <= 16, JSON.stringify(fly));
check('it said so', J(`__toasts`).some(m => /^Approach: the point/.test(m)) && J(`__toasts`).some(m => /Approach done/.test(m)), JSON.stringify(J(`__toasts`)));
g.run(`__frames(1)`);
check('the point marker is gone with the order', J(`__s.cm.point`) === null);
g.run(`clickmoveClick(__s, ${X + 3000}, ${Y}); __frames(30); clickmoveClick(__s, ${X}, ${Y - 2000}); __frames(2);`);
check('a second click changes where it is going', J(`__s.as.target.y`) === Y - 2000 && J(`__s.cm.point === __s.as.target`));
g.run(`__s.k.W.isDown = true; __frames(1); __s.k.W.isDown = false; __frames(1);`);
check('a flight key still takes the stick back', J(`__s.as.mode`) === '' && J(`__s.cm.point`) === null);

// ---- a body ----
g.run(`__scene(${st.x + 900}, ${st.y}); ASSIST.on = true;`);
check('a click on the station makes it the nav target, and gives no order by itself', J(`clickmoveClick(__s, ${st.x + 40}, ${st.y - 30})`) === 'body' && J(`__s.cr.target.id`) === st.id && J(`__s.as.mode`) === '', JSON.stringify(J(`__toasts`)));
g.run(`__press('ONE')`);
check('1 then approaches it, as after the N list', J(`__s.as.mode`) === 'approach' && J(`__s.as.target.id`) === st.id && J(`__s.as.range`) === 260);
g.run(`assistSet('')`);
if (belt) check('a belt is not picked: a click inside one is a point', J(`clickmovePick(__s, ${belt.x + 30}, ${belt.y + 30}).kind`) === 'point');

// ---- a ship ----
g.run(`__scene(${X}, ${Y}); ASSIST.on = true; __s.enemies.list.push(__ship(${X + 900}, ${Y}, 'raider'), __ship(${X - 700}, ${Y + 100}, 'gunship'));`);
check('a click near a ship picks the ship, not the point', J(`clickmovePick(__s, ${X + 920}, ${Y + 15}).kind`) === 'ship' && J(`clickmovePick(__s, ${X + 960}, ${Y}).kind`) === 'point');
check('with no order flying, the click makes it the target and says so in one short line', J(`clickmoveClick(__s, ${X + 905}, ${Y})`) === 'ship' && J(`__s.as.mode`) === '' && J(`__s.cm.pick === __s.enemies.list[0]`) && J(`__toasts`).some(m => m === 'Target: the raider.'), JSON.stringify(J(`__toasts`)));
g.run(`__press('TWO')`);
check('2 keeps range on the picked ship (not the nav target)', J(`__s.as.mode`) === 'keep' && J(`__s.as.target === __s.enemies.list[0]`) && J(`__s.as.range`) === 500);
g.run(`clickmoveClick(__s, ${X - 700}, ${Y + 100}); __frames(1);`);
check('a click on another ship moves the flying order onto it', J(`__s.as.mode`) === 'keep' && J(`__s.as.target === __s.enemies.list[1]`) && J(`__toasts`).some(m => /^Keep at range: the gunship/.test(m)));
g.run(`__press('TWO')`);
check('the same key again ends the order', J(`__s.as.mode`) === '' && J(`__s.cm.pick === __s.enemies.list[1]`));
g.run(`__press('ONE'); __s.enemies.list[1].active = false; __frames(2);`);
check('the picked ship dies: the order ends and it is no longer the target', J(`__s.as.mode`) === '' && J(`__s.cm.pick`) === null && J(`__toasts`).some(m => /Target lost/.test(m)));
g.run(`clickmoveClick(__s, ${X + 900}, ${Y}); __s.cr.target = { id: 'b', name: 'Tern', type: 'planet', x: ${X}, y: ${Y + 9000}, r: 300 }; __press('ONE');`);
check('a nav target picked afterwards wins: 1 goes to it', J(`__s.cm.pick`) === null && J(`__s.as.target.name`) === 'Tern');
g.run(`assistSet(''); __s.cr.target = null;`);
check('a hand-moved ship (police) is a target with a name and a live position', J(`(() => { const p = clickmovePick(__s, 5010, 5000); __s.tr.police[0].img.x = 5200; return [p.kind, p.target.name, p.target.x, !!p.target.body]; })()`).join() === 'ship,the police cruiser,5200,true');

// a moving ship: Approach comes to rest beside it
g.run(`__scene(${X}, ${Y}); ASSIST.on = true; __s.enemies.list.push(__ship(${X + 1200}, ${Y}, 'drone', 60)); clickmoveClick(__s, ${X + 1200}, ${Y}); __press('ONE');`);
const chase = J(`(() => { __frames(60 * 20); const e = __s.enemies.list[0], v = __s.ship.body.velocity; return { d: Math.hypot(e.x - __s.ship.x, e.y - __s.ship.y), rel: Math.hypot(v.x - 60, v.y), mode: __s.as.mode }; })()`);
check('Approach on a clicked, moving ship holds 150 px off it at its speed', chase.mode === 'approach' && Math.abs(chase.d - 150) <= 30 && chase.rel <= 20, JSON.stringify(chase));

// ---- the guns ----
g.run(`__scene(${X}, ${Y}); ASSIST.on = true; __s.input.activePointer.isDown = true; clickmoveClick(__s, ${X + 500}, ${Y}); __frames(3);`);
check('while the order button is down the guns stay quiet', J(`__s.nextFire > __s.time.now`) && J(`__s.cm.hold`) === true);
g.run(`__s.input.activePointer.isDown = false; __frames(1); __s.time.now += 200;`);
check('button up: the hold is over', J(`__s.cm.hold`) === false && J(`__s.nextFire <= __s.time.now`));
g.run(`ASSIST.on = false; __s.nextFire = 0; __s.input.activePointer.isDown = true; clickmoveClick(__s, ${X + 500}, ${Y}); __frames(2);`);
check('assist off: the mouse is the trigger again', J(`__s.nextFire`) === 0);

// ---- a press on the HUD is not a click in space (playtest 4, step click-on-hud-panel: each of these four gave an Approach order) ----
// the HUD says what it covers each frame (s._hud.zones, src/hud.js); the key line, the tip bar, the assist readout, the Overview and the nav
// panel are objects of their own. The pointer's screen point is p.x, p.y in game px; its world point is what the order would fly to.
g.run(`
  var __box = (x, y, w, h, visible = true) => ({ visible, active: true, getBounds: () => ({ x, y, right: x + w, bottom: y + h }) });
  function __hud() {
    const s = __scene(${X}, ${Y}); ASSIST.on = true;
    s._hud = { zones: [{ x0: 0, y0: 0, x1: 122, y1: 132 }, { x0: 0, y0: 0, x1: 336, y1: 330 }, { x0: 1050, y0: 0, x1: 1280, y1: 250 }, { x0: 430, y0: 0, x1: 850, y1: 50 }, { x0: 1004, y0: 256, x1: 1280, y1: 430 }] };
    s.keyLine = __box(24, 676, 820, 22); s._gh = __box(300, 590, 680, 40, false);
    s.ov = { shown: false, bg: __box(1004, 242, 260, 230, false) }; s.np = { shown: false, bg: __box(24, 340, 322, 300, false) };
    return s;
  }
  // a press at a screen point; the world point behind it is far from the ship, so an order would show
  function __click(px, py) { assistSet(''); __s.cm.point = null; const kind = clickmovePress(__s, { button: 0, x: px, y: py, worldX: ${X} + (px - 640) * 2, worldY: ${Y} + (py - 360) * 2 }); return [kind, __s.as.mode]; }
`);
g.run(`__hud()`);
for (const [what, px, py] of [['the mission panel', 180, 230], ['the radar', 1105, 100], ['the hull gauge', 140, 70], ['the key line at the bottom', 400, 686], ['the top strip', 640, 25], ['the assist target panel', 1100, 300]]) {
  const r = J(`__click(${px}, ${py})`);
  check(`a press on ${what} (${px},${py}) gives no order`, r[0] === '' && r[1] === '', JSON.stringify(r));
}
check('a press in open space still flies there', J(`__click(640, 420)`).join() === 'point,approach');
check('just outside a panel is space', J(`__click(350, 420)`).join() === 'point,approach' && J(`__click(900, 150)`).join() === 'point,approach');
check('the Overview and the nav panel are not in the way while they are hidden', J(`__click(1100, 450)`).join() === 'point,approach' && J(`__click(180, 500)`).join() === 'point,approach');
g.run(`__s.ov.shown = true; __s.ov.bg.visible = true; __s.np.shown = true; __s.np.bg.visible = true; __s._gh.visible = true;`);
check('shown, the Overview counts as HUD', J(`__click(1100, 450)`).join() === ',');
check('shown, the nav panel counts as HUD', J(`__click(180, 500)`).join() === ',');
check('a tip of the guide on the screen counts as HUD', J(`__click(640, 610)`).join() === ',');
check('clickmoveOnHud says where: true on the radar, false in the middle of the screen', J(`[clickmoveOnHud(__s, 1105, 100), clickmoveOnHud(__s, 640, 360)]`).join() === 'true,false');
check('another file can add its own panel to the list', J(`(() => { CLICKMOVE.hud.push(s => ({ x: 600, y: 300, w: 80, h: 80 })); const r = __click(640, 340); CLICKMOVE.hud.pop(); return r.concat(__click(640, 340)); })()`).join() === ',,point,approach');
check('a scene with no HUD yet (the first frame) takes the click as before', J(`(() => { __scene(${X}, ${Y}); ASSIST.on = true; return __click(180, 230); })()`).join() === 'point,approach');
check('the right button gives no order', J(`(() => { assistSet(''); return [clickmovePress(__s, { button: 2, x: 640, y: 420, worldX: ${X} + 400, worldY: ${Y} }), __s.as.mode]; })()`).join() === ',');

check('no errors in the game scripts', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `CLICKMOVE FAIL (${failed} of ${n})` : `CLICKMOVE PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
