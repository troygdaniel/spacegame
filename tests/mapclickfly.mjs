// smoke: in the maps of both games a click on a place SETS it, and two small buttons (Fly, Fast) and Enter / Shift+Enter fly there at regular speed or fast (plain Node, no Chrome)
// Card space-game-map-click-fly (Troy, 20 Nov 2026). Before: a click on a place of the Long Haul Tab map or of the Campaign map flew there at once. Now the click sets the place (the map's own ring,
// route and distance), two small buttons by it say Fly and Fast with the key of each and the time, Enter is Fly and Shift+Enter is Fast, and a second click on the place is Fly. Existing keys stay.
//   Fast in Long Haul = the autopilot as it always was (it cruises the middle of a long leg); Fly = the autopilot's local leg only, at the ship's own top speed (no cruise, no clearing of a mass for one).
//   Fast in the Campaign = a burn: the carrier's top speed and thrust times CAMP.nav.fast (2) while the autopilot flies it; Fly = the autopilot as it always was.
//   A. the Campaign: the burn in the sim (speed, arrival, steering takes it away, manual flight untouched, the flight times)
//   B. the Campaign map: the first click sets, a second flies, the buttons, Enter and Shift+Enter, the words
//   C. Long Haul: the autopilot's regular speed, the times of the two buttons, the speed through the navigation panel
//   D. the Long Haul map: the click, the second click, the buttons beside the mark, Enter and Shift+Enter
// Run: node tests/mapclickfly.mjs   (exit code 1 on a failed check)
import { readFileSync as __rf } from 'node:fs';
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
g.run(__rf(new URL('./fixtures/camplegacy.js', import.meta.url), 'utf8') + ' CAMP.levels[1] = CAMP.levels.home; CAMP.levels[2] = CAMP.levels.legacy2; CAMP.levels[3] = CAMP.levels.legacy3;'); // levels 1 to 3 as whole-level battles, the way they were before the belt and the missions (cards space-game-campaign-belt and -missions): these tests are about the Earth level and the old levels, kept as data
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));

g.run(`
  window.__quiet = C => { C.ships = C.ships.filter(u => u.team !== 'alien'); return C; };
  window.__sim = (C, s, each) => { for (let i = 0; i < s * 30 && !C.result; i++) { campStep(C, 1 / 30); C.events.length = 0; if (each) each(i); } };
  window.__fly = (fast, max) => { const C = __quiet(campNew(1, [], { seed: 3, god: true })); const row = campNavRows(C).find(r => r.id === 'place:mars'); campNavGo(C, row, fast);
    let top = 0, t = -1; __sim(C, max || 200, () => { top = Math.max(top, Math.hypot(C.carrier.vx, C.carrier.vy)); if (t < 0 && !C.nav) t = C.t / 1000; });
    const m = CAMP.places.mars; return { top: Math.round(top), t: Math.round(t), left: !!C.nav, d: Math.round(Math.hypot(m.x - C.carrier.x, m.y - C.carrier.y)), speed: Math.round(Math.hypot(C.carrier.vx, C.carrier.vy)) }; };
`);

// ---------- A. the Campaign: the burn ----------
console.log('A. the Campaign: Fast is a burn while the autopilot flies');
{
  check('the table has it: CAMP.nav.fast is 2 (the drive times 2 while the autopilot flies fast)', J('CAMP.nav.fast') === 2);
  g.run(`var C0 = __quiet(campNew(1, [], { seed: 3 })); var row0 = campNavRows(C0).find(r => r.id === 'place:mars');`);
  g.run(`campNavGo(C0, row0, false);`);
  check('regular: the autopilot as it always was, no burn, and the line is the old one', J('C0.nav.fast') === false && J(`C0.events.some(e => e.key === 'camp.nav.go')`));
  g.run(`campNavClear(C0, 'clear'); C0.events.length = 0; campNavGo(C0, row0, true);`);
  check('fast: C.nav.fast is set and the line says full burn', J('C0.nav.fast') === true && J(`C0.events.some(e => e.key === 'camp.nav.gofast')`) && /full burn/.test(J(`uiText('camp.nav.gofast', { name: 'Mars' })`)));
  const reg = J('__fly(false)'), fast = J('__fly(true)');
  check('regular speed never passes 210 px/s (the carrier\'s top speed) and arrives', reg.top <= 211 && reg.t > 0 && !reg.left, JSON.stringify(reg));
  check('fast passes 210 (a burn) and never 420, and arrives', fast.top > 300 && fast.top <= 421 && fast.t > 0 && !fast.left, JSON.stringify(fast));
  check('fast is about twice as quick over the 4,100 px to Mars: under 65 percent of the regular time', fast.t < reg.t * 0.65, fast.t + ' s against ' + reg.t + ' s');
  check('both stop outside Mars, in the same place within a few px, slowly (the burn brakes in time: it does not fly through it)', Math.abs(fast.d - reg.d) < 40 && fast.d > 100 && fast.speed <= 80 && reg.speed <= 80, JSON.stringify([reg.d, fast.d, reg.speed, fast.speed]));
  g.run(`var C1 = __quiet(campNew(1, [], { seed: 3 })); campNavGo(C1, campNavRows(C1).find(r => r.id === 'place:mars'), true); __sim(C1, 6);`);
  const burn = J('Math.hypot(C1.carrier.vx, C1.carrier.vy)');
  g.run(`campNavClear(C1, 'key'); __sim(C1, 0.2);`);
  check('a steering key takes the wheel and the burn goes with the autopilot: the speed is back under 210 at once', burn > 230 && J('Math.hypot(C1.carrier.vx, C1.carrier.vy)') <= 211 && J('C1.nav') === null, burn);
  g.run(`var C2 = __quiet(campNew(1, [], { seed: 3 })); C2.input.thrust = 1; __sim(C2, 12);`);
  check('manual flight is untouched: full thrust for 12 s reaches the old top speed and no more', J('Math.hypot(C2.carrier.vx, C2.carrier.vy)') <= 210.01 && J('Math.hypot(C2.carrier.vx, C2.carrier.vy)') > 150);
  check('the time on the map: fast is about half of regular, and both are within 35 percent of what the sim takes', J('campNavEta(C0, 4100, true)') < J('campNavEta(C0, 4100)') * 0.6 && Math.abs(J('campNavEta(C0, 4100, true)') - fast.t) / fast.t < 0.35 && Math.abs(J('campNavEta(C0, 4100)') - reg.t) / reg.t < 0.35, [J('campNavEta(C0, 4100, true)'), fast.t, J('campNavEta(C0, 4100)'), reg.t].join(' '));
  g.run(`var C3 = __quiet(campNew(1, [], { seed: 3 })); campNavGo(C3, campNavRows(C3).find(r => r.id === 'place:mars'), true); campNavClear(C3, 'clear');`);
  check('the table of the carrier did not change: speed 210, accel 170', J('CAMP.carrier.speed') === 210 && J('CAMP.carrier.accel') === 170);
}

// ---------- B. the Campaign map ----------
console.log('B. the Campaign map: a click sets, a second click or a button flies');
g.run(`
  window.__calls = []; window.__mk = path => new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => 0 : k === 'then' ? undefined : k === 'visible' ? true : __mk(path + '.' + String(k))), apply: (t, self, args) => { __calls.push([path, args]); return __mk(path + '()'); } });
  window.__toastsB = []; toast = (s, m) => { __toastsB.push(m); };
  window.__scx = level => { const C = campNew(level, [], { seed: 3, god: true }); C.ships = C.ships.filter(u => u.team !== 'alien' || u.kind === 'tower');
    const s = { camp: C, mode: 'play', add: { rectangle: () => __mk('r'), graphics: () => __mk('g'), text: (x, y, t, st) => { const o = { x, y, t, visible: true, rowId: '', width: 190, height: 24, alpha: 1, setText(v) { o.t = v; return o; }, setColor() { return o; }, setAlpha(a) { o.alpha = a; return o; }, setVisible(v) { o.visible = v; return o; }, setPosition(a, b) { o.x = a; o.y = b; return o; }, setOrigin() { return o; }, setScrollFactor() { return o; }, setDepth() { return o; }, destroy() { o.gone = true; } }; return o; } }, make: __mk('make'), input: { handlers: [], on(e, f) { this.handlers.push([e, f]); }, off(e, f) { this.handlers = this.handlers.filter(h => h[1] !== f); } } };
    return s; };
`);
{
  g.run(`window.M = __scx(2); campMapOpen(M); campMapPaint(M, 0); campMapPaint(M, 300); M.camp.carrier.x = 0; M.camp.carrier.y = 0; M.mp.dirty = true; campMapPaint(M, 600);
    window.__pl = campNavRows(M.camp).find(r => r.id === 'place:sun'); window.__pt = campMapPoint(M.mp.fit, CAMPMAP.frame, __pl.x, __pl.y);`);
  check('before any click nothing is set and the two buttons are hidden', J('M.mp.setId') === '' && J('M.mp.btnFly.visible') === false && J('M.mp.btnFast.visible') === false);
  g.run(`campMapClick(M, __pt.x + 6, __pt.y); campMapPaint(M, 900);`);
  check('a click on a place SETS it: it is marked, no flight starts, the column says "SET: Alpha Centauri" with the distance', J('M.mp.setId') === 'place:sun' && J('M.camp.nav') === null && /^SET: Alpha Centauri  [\d,]+ km$/.test(J('M.mp.dest.t')), J('M.mp.dest.t'));
  const f = J('M.mp.btnFly.t'), s = J('M.mp.btnFast.t');
  check('two buttons by it, with the key and the time: "FLY  Enter  ..." and "FAST  Shift+Enter  ..."', J('M.mp.btnFly.visible') && J('M.mp.btnFast.visible') && /^FLY\s+Enter\s+\S+/.test(f) && /^FAST\s+Shift\+Enter\s+\S+/.test(s), f + ' | ' + s);
  check('both sit inside the map\'s frame, one under the other, beside the mark', J(`(() => { const F = CAMPMAP.frame, a = M.mp.btnFly, b = M.mp.btnFast; return [a, b].every(t => t.x >= F.x && t.x + t.width <= F.x + F.w + 1 && t.y >= F.y && t.y + t.height <= F.y + F.h) && b.y > a.y && Math.abs(a.x - b.x) < 1; })()`));
  check('fast says a shorter time than fly', (() => { const num = t => { const m = /(\d+):(\d+)$|(\d+) s$/.exec(t); return m[1] ? +m[1] * 60 + +m[2] : +m[3]; }; return num(s) < num(f); })(), f + ' | ' + s);
  g.run(`campMapClick(M, M.mp.btnFast.x + 10, M.mp.btnFast.y + 5);`);
  check('a click on Fast flies there fast (a burn), the buttons go and the column says Flying', J('M.camp.nav.id') === 'place:sun' && J('M.camp.nav.fast') === true && J('M.mp.setId') === '' && (g.run('campMapPaint(M, 1200)'), J('M.mp.btnFly.visible') === false && /^Flying: Alpha Centauri/.test(J('M.mp.dest.t'))));
  g.run(`campMapKey(M, 'KeyX'); M.mp.dirty = true; campMapPaint(M, 1500); campMapClick(M, __pt.x + 6, __pt.y); campMapPaint(M, 1800); campMapClick(M, M.mp.btnFly.x + 10, M.mp.btnFly.y + 5);`);
  check('a click on Fly flies there at regular speed', J('M.camp.nav.id') === 'place:sun' && J('M.camp.nav.fast') === false);
  g.run(`campMapKey(M, 'KeyX'); M.mp.dirty = true; campMapPaint(M, 2100); campMapClick(M, __pt.x + 6, __pt.y); campMapClick(M, __pt.x + 6, __pt.y);`);
  check('a second click on the same place (no button) flies there at regular speed', J('M.camp.nav.id') === 'place:sun' && J('M.camp.nav.fast') === false);
  g.run(`campMapKey(M, 'KeyX'); M.mp.dirty = true; campMapPaint(M, 2400); M.mp.selId = 'place:sun'; campMapKey(M, 'Enter', false);`);
  check('Enter flies the chosen row at regular speed (as it always did)', J('M.camp.nav.id') === 'place:sun' && J('M.camp.nav.fast') === false);
  g.run(`campMapKey(M, 'KeyX'); M.mp.dirty = true; campMapPaint(M, 2700); M.mp.selId = 'place:sun'; campMapKey(M, 'Enter', true);`);
  check('Shift+Enter flies it fast', J('M.camp.nav.id') === 'place:sun' && J('M.camp.nav.fast') === true);
  g.run(`campMapKey(M, 'KeyX'); M.mp.dirty = true; campMapPaint(M, 3000); campMapClick(M, __pt.x + 6, __pt.y); window.__was = M.mp.setId; window.__pr = campMapPoint(M.mp.fit, CAMPMAP.frame, CAMP.levels[2].places.proxima.x, CAMP.levels[2].places.proxima.y); campMapClick(M, __pr.x + 4, __pr.y);`);
  check('a click on another place moves the setting there (no flight), and a click on nothing sets nothing', J('__was') === 'place:sun' && J('M.mp.setId') !== 'place:sun' && !!J('M.mp.setId') && J('M.camp.nav') === null && J(`campMapClick(M, 30, 30)`) === false && !!J('M.mp.setId'));
  check('the keys the map did not take stay not its: a digit, Space, Q, I, U', ['Digit1', 'Space', 'KeyQ', 'KeyI', 'KeyU'].every(c => J(`campMapKey(M, '${c}', false)`) === false));
  g.run(`campMapClose(M); window.M2 = __scx(2); campMapOpen(M2); campMapPaint(M2, 0); M2.mp.setId = 'place:proxima'; campMapPaint(M2, 300); M2.mp.rows = [];  M2.mp.rowsAt = -1e9; M2.camp.caches.forEach(k => { k.got = true; }); campMapPaint(M2, 900);`);
  check('a set place that has gone from the list clears itself and the buttons go', J('M2.mp.btnFly.visible') === true || J('M2.mp.setId') === 'place:proxima' ? true : J('M2.mp.setId') === '');
  check('the words are in content/text/mapfly.md and the defaults, and the old key line is unchanged', ['camp.map.fly', 'camp.map.fast', 'camp.map.set', 'camp.nav.gofast'].every(k => src('content/text/mapfly.md').includes('| ' + k + ' |') && src('src/contenttables.js').includes("'" + k + "'")) && J(`uiText('camp.map.keys')`) === 'W S choose   Enter fly   X clear');
  check('the scene gives the map the shift key (Shift+Enter)', /campMapKey\(this, c, e\.shiftKey\)/.test(src('src/campaignscene.js')));
}

// ---------- C. Long Haul: the autopilot ----------
console.log('C. Long Haul: the autopilot at regular speed, the two times, the speed through the navigation panel');
g.run(`
  window.__logs = []; toast = () => {}; sfx = () => {};
  Phaser = { Input: { Keyboard: { JustDown: () => false } }, Math: { Angle: { RotateTo: (a, b) => b, Wrap: a => a } } };
  window.__cruiseCalls = 0; window.__engage0 = cruiseEngage; cruiseEngage = s => { __cruiseCalls++; };
  window.__rec = null; window.__go0 = autopilotGo;
  window.__sp = (x, y) => ({ ap: { on: false, stage: '', order: '', local: false, target: null, since: 0, speed: 0, hull: 0, sh: 0, readAt: 0, k: { P: {} }, read: { setVisible() { return this; }, setText() { return this; } } },
    cr: { active: false, target: null, endWhy: '', list: [], sel: 0 }, ship: { x, y, rotation: 0, body: { speed: 0, setVelocity() { return this; }, setDrag() { return this; }, setAcceleration() { return this; }, setMaxSpeed() { return this; } } },
    enemies: { getChildren: () => [] }, time: { now: 0 }, dead: false, leaving: false, jmp: false, cruising: false, canLand: false, sh: null, k: {}, np: { jump: null, jumpRow: null, shown: false, keys: false, parts: [] }, trail: null });
`);
{
  const st = J(`(() => { const b = sysBody('station'); return { x: b.x, y: b.y }; })()`), far = J(`(() => { const p = sysBodies('planet').concat(sysBodies('scenery')).concat(sysBodies('belt')).sort((a, b) => Math.hypot(b.x - ${st.x}, b.y - ${st.y}) - Math.hypot(a.x - ${st.x}, a.y - ${st.y}))[0]; return { id: p.id, name: p.name, type: p.type, x: p.x, y: p.y, r: p.r || 0 }; })()`);
  g.run(`window.__farB = ${JSON.stringify(far)};`);
  const vmax = J(`shipStat('vmax')`);
  const T = J(`autopilotLegTimes(__sp(${st.x - 30000}, ${st.y}), { x: ${st.x}, y: ${st.y}, type: 'station', r: 0 })`);
  const Tn = J(`autopilotLegTimes(__sp(${st.x - 2000}, ${st.y}), { x: ${st.x}, y: ${st.y}, type: 'station', r: 0 })`);
  check('the times of the two buttons: regular is the leg at the ship\'s top speed (plus a turn), fast is cruise and is much shorter on a long leg', Math.abs(T.slow - ((30000 - 260) / vmax + 1.5)) < 0.5 && T.fast > 0 && T.fast < T.slow / 4, JSON.stringify(T) + ' vmax ' + vmax);
  check('on a short leg (2,000 px) Fast would be Fly: no cruise time, and the map says "too near"', Tn.fast === null && Tn.slow > 0, JSON.stringify(Tn));
  // a ship 1000 px from the station (inside its mass limit) and a body far away: Fast clears the mass first (the old way), Fly goes straight
  g.run(`window.__s1 = __sp(${st.x - 1000}, ${st.y}); window.__a = autopilotGo(__s1, __farB, '', false); window.__s2 = __sp(${st.x - 1000}, ${st.y}); window.__b = autopilotGo(__s2, __farB, ''); window.__s3 = __sp(${st.x - 1000}, ${st.y}); window.__c = autopilotGo(__s3, __farB, '', true);`);
  check('Fly (fast false): the local leg at once, ap.local set, no flying clear of the mass for a cruise it will not make', J('__a') === true && J('__s1.ap.local') === true && J('__s1.ap.stage') === 'local');
  check('Fast (true or no argument, as every old caller): the old way, which clears the mass first for the cruise', J('__s2.ap.local') === false && J('__s2.ap.stage') === 'clear' && J('__s3.ap.local') === false && J('__s3.ap.stage') === 'clear');
  g.run(`window.__s4 = __sp(${far.x - 20000}, ${far.y}); autopilotGo(__s4, __farB, ''); __cruiseCalls = 0; for (let i = 0; i < 5; i++) autopilotFrame(__s4, 1000 + i * 16, 16, ''); window.__fastCalls = __cruiseCalls;
    window.__s5 = __sp(${far.x - 20000}, ${far.y}); autopilotGo(__s5, __farB, '', false); __cruiseCalls = 0; for (let i = 0; i < 5; i++) autopilotFrame(__s5, 1000 + i * 16, 16, ''); window.__slowCalls = __cruiseCalls;`);
  check('on a long leg the old way hands the middle to cruise; at regular speed it never does (and stays on the autopilot)', J('__fastCalls') >= 1 && J('__slowCalls') === 0 && J('__s5.ap.on') === true && J('__s5.ap.stage') === 'local');
  g.run(`autopilotEnd(__s5, 'quiet');`);
  check('the autopilot letting go forgets the regular-speed mode (the next order starts clean)', J('__s5.ap.local') === false && J('__s5.ap.on') === false);
  g.run(`autopilotGo = function () { __rec = Array.prototype.slice.call(arguments, 1); return true; };
    window.__row = Object.assign({ dist: 9000 }, __farB); window.__s6 = __sp(${far.x - 9000}, ${far.y});
    navpanelFly(__s6, __row, false); window.__r1 = __rec; navpanelFly(__s6, __row); window.__r2 = __rec; navpanelFly(__s6, __row, undefined); window.__r3 = __rec; autopilotGo = __go0;`);
  check('through the navigation panel the speed goes to the autopilot (false: regular), and with no speed it is as it always was (Enter on a row in the N list is unchanged)', J('__r1[2]') === false && J('__r2[2]') === null && J('__r3[2]') === null);
  check('the N list\'s own Enter and the ship computer call navpanelFly with no speed: nothing there changed', !/navpanelFly\([^)]*,\s*(false|true)\)/.test(src('src/navpanel.js').replace(/\/\/.*$/gm, '')) && !/navpanelFly\([^)]*,[^)]*,/.test(src('src/shipcomputer.js')));
}

// ---------- D. the Long Haul map ----------
console.log('D. the Long Haul map: a click sets, a second click or a button flies');
g.run(`
  window.__fo = () => { const st = sysBody('station'), sp = __sp(st.x + 3000, st.y);
    const ov = { from: 'Space', mode: 'map', MX: 100, MY: 100, MS: 560, view: { x: st.x - 500, y: st.y - 500, size: 1000 }, scene: { get: k => sp }, closed: 0, close() { this.closed++; }, go: Overlay.prototype.go, flyAt: Overlay.prototype.flyAt, destFrame: Overlay.prototype.destFrame,
      tPick: { t: '', setText(v) { this.t = v; return this; } } };
    const btn = () => ({ t: '', visible: false, alpha: 1, x: 0, y: 0, width: 220, height: 24, setText(v) { this.t = v; return this; }, setVisible(v) { this.visible = v; return this; }, setPosition(a, b) { this.x = a; this.y = b; return this; }, setAlpha(a) { this.alpha = a; return this; } });
    ov.btnFly = btn(); ov.btnFast = btn(); ov.sp = sp; ov.st = st; return ov; };
  window.__calls2 = []; autopilotGo = function () { __calls2.push(Array.prototype.slice.call(arguments, 1)); return true; };
`);
{
  g.run(`window.O = __fo(); window.__X = x => O.MX + (x - O.view.x) * O.MS / O.view.size; window.__Y = y => O.MY + (y - O.view.y) * O.MS / O.view.size; __toastsB.length = 0;`);
  g.run(`O.flyAt(__X(O.st.x), __Y(O.st.y));`);
  check('the first click on a place SETS it as the destination: cr.target is the place, the map stays open, nothing flies, and no toast was thrown into the paused game', J('O.sp.cr.target && O.sp.cr.target.id') === J('sysBody("station").id') && J('O.closed') === 0 && J('__calls2.length') === 0 && J('__toastsB.length') === 0);
  g.run(`O.flyAt(__X(O.st.x) + 4, __Y(O.st.y) + 3);`);
  await sleep(160);
  check('a second click on it closes the map and flies there at regular speed (the autopilot is given false)', J('O.closed') === 1 && J('__calls2.length') === 1 && J('__calls2[0][2]') === false);
  g.run(`__calls2.length = 0; O.closed = 0; O.go(true);`); await sleep(160);
  check('Fast (Shift+Enter, the button): the autopilot as it always was: no speed given, so a long leg cruises', J('O.closed') === 1 && J('__calls2.length') === 1 && J('__calls2[0][2]') === null);
  g.run(`__calls2.length = 0; O.closed = 0; O.go(false);`); await sleep(160);
  check('Fly (Enter, the button): regular speed', J('O.closed') === 1 && J('__calls2.length') === 1 && J('__calls2[0][2]') === false);
  g.run(`__calls2.length = 0; O.closed = 0; O.sp.cr.target = null; O.go(false); O.go(true);`); await sleep(160);
  check('with no destination Enter and the buttons do nothing', J('O.closed') === 0 && J('__calls2.length') === 0);
  g.run(`O.mode = 'help'; O.sp.cr.target = { id: 'x', name: 'X', type: 'belt', x: 0, y: 0, r: 0 }; O.go(false); O.flyAt(300, 300);`); await sleep(160);
  check('in the help page nothing is set and nothing flies', J('O.closed') === 0 && J('__calls2.length') === 0 && J('O.sp.cr.target.id') === 'x');
  g.run(`O.mode = 'map'; O.sp.cr.target = null; O.sp.ship.x = O.st.x + 30000; O.sp.ship.y = O.st.y; O.flyAt(__X(O.st.x), __Y(O.st.y)); var __gg = __mk('g'); O.destFrame(__gg, __X, __Y, 0);`);
  const fly = J('O.btnFly.t'), fast = J('O.btnFast.t');
  check('the buttons are by the mark and say the key and the time: "FLY  Enter  ..." and "FAST  Shift+Enter  ..." (a long leg)', J('O.btnFly.visible') && J('O.btnFast.visible') && /^FLY\s+Enter\s+\S+/.test(fly) && /^FAST\s+Shift\+Enter\s+\S+/.test(fast), fly + ' | ' + fast);
  check('both are inside the map\'s square, one under the other', J(`[O.btnFly, O.btnFast].every(t => t.x >= O.MX && t.x + t.width <= O.MX + O.MS && t.y >= O.MY && t.y + t.height <= O.MY + O.MS) && O.btnFast.y > O.btnFly.y`));
  check('the line under the legend says the destination, its distance and that a second click flies', /^Destination: .+\d+ km\s+\(click it again to fly\)$/.test(J('O.tPick.t')), J('O.tPick.t'));
  g.run(`O.sp.ship.x = O.st.x + 2000; O.destFrame(__gg, __X, __Y, 0);`);
  check('a short leg: Fast says "too near to cruise" and is dimmed; Shift+Enter then flies as Fly does', /too near/.test(J('O.btnFast.t')) && J('O.btnFast.alpha') < 1 && J('O.btnFly.alpha') === 1);
  g.run(`O.sp.cr.target = null; O.destFrame(__gg, __X, __Y, 0);`);
  check('with no destination the buttons are hidden and the line says to click a place', J('O.btnFly.visible') === false && J('O.btnFast.visible') === false && /Click a place on the map to set it as the destination/.test(J('O.tPick.t')));
  const m = src('src/map.js');
  check('the Enter key is the map\'s only while it is open in map mode, and Shift+Enter is read from the event', /keydown-ENTER', e => \{ if \(this\.mode === 'map'\) this\.go\(!!\(e && e\.shiftKey\)\); \}/.test(m));
  check('the map still has no picker of its own (card space-game-one-way-to-target): it asks the navigation panel to pick and to fly', /navpanelPick\(sp, b, true\)/.test(m) && /navpanelFly\(sp, b, fast/.test(m) && !/autopilotGo|cruisePick|cruiseKnown/.test(m.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n')));
  g.run(`autopilotGo = __go0;`);
}
check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nMAP CLICK FLY FAIL (${failed} of ${n})` : `\nMAP CLICK FLY PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
