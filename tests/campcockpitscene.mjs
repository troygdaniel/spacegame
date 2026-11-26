// smoke: taking the stick of a pilot's fighter, L1 part 2 (plain Node, no Chrome): the real Campaign scene's keys on a stand-in, the camera on the eye, the cruiser's order kept, the page HUD's fighter bars, the C chip and the feel's one hook
// Card space-game-fly-fighter-l1-scene (Troy, 26 Nov 2026), after the simulation half (tests/campcockpit.mjs). Behind CAMP.flags.cockpit.
//   A. the switch: off, the C key does nothing in the scene; on, C takes the stick and a second C hands it back (the toast, and the run is marked tuned)
//   B. the keys: the arrows, Space and Shift write the fighter's input and not the cruiser's; the cruiser's turrets are the sim's; the map's or a list's arrows are not the wheel
//   C. the cruiser's order: the arrows in a fighter do not give up the autopilot's trip (out of a fighter they do, as always)
//   D. the camera: on the fighter after a take, on the cruiser after a hand-back and after the fighter is lost
//   E. the ship he flies: the feel's one hook (campFeelShip), the boost store and the flame state, the top speed, the ship look's branch
//   F. the keys page (the new one and the old) lists C only while the switch is on; the page HUD's bars, the cruiser line and the chip are tests/camppagehud.mjs section W
// Run: node tests/campcockpitscene.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const near = (a, b, e = 1e-6) => Math.abs(a - b) <= e;
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
g.run(`
  window.__toasts = []; window.__went = []; go = (s, key, data) => { __went.push({ key, data }); }; toast = (s, msg) => { __toasts.push(msg); }; shipcompSay = () => true; beep = () => {};
  window.__fake = (level) => { const f = Object.create(Campaign.prototype); f.add = document; f.cameras = document; f.input = document; f.textures = document; f.tweens = document;
    f.time = { delayedCall: (ms, fn) => fn() }; f.boom = { explode() {} }; f.bgLayers = []; f.hudG = document; f.relicG = document;
    const h = {}; ['hull', 'earth', 'bay', 'wave', 'mother', 'blink', 'obj', 'keys', 'nav', 'arrow'].forEach(k => { h[k] = { text: '', vis: true, setText(t) { h[k].text = t; return h[k]; }, setVisible(v) { h[k].vis = v; return h[k]; }, setPosition() { return h[k]; } }; }); f.hud = h;
    f.k = { W: { isDown: false }, A: { isDown: false }, S: { isDown: false }, D: { isDown: false }, UP: { isDown: false }, DOWN: { isDown: false }, LEFT: { isDown: false }, RIGHT: { isDown: false }, SPACE: { isDown: false }, SHIFT: { isDown: false } };
    f.init({ level, seed: 3, god: true }); f.camp = campNew(f.level, f.P.techs, f.opts); f.camp.ships = f.camp.ships.filter(u => u.team !== 'alien' && u.team !== 'neutral'); f.sp = {}; f.bsp = []; f.csp = f.camp.caches.map(() => document); f.sync = () => {}; f.syncRockets = () => {};
    f.followed = null; f.cameras = { main: { scrollX: 0, scrollY: 0, startFollow(sp) { f.followed = sp.id; } } }; f.camp.ships.forEach(u => { f.sp[u.id] = { id: u.id }; }); f.eyeId = f.camp.carrier.id; f.followed = f.eyeId;
    for (let i = 0; i < 6 && f.mode !== 'play'; i++) f.onKey({ code: 'Enter' }); __toasts.length = 0; return f; }; // (the briefing and the cards: Enter until the flight)
  window.__tick = s => { for (let i = 0; i < Math.round(s * 30); i++) F.update(0, 1000 / 30); };
  window.__keys = o => { Object.keys(F.k).forEach(k => { F.k[k].isDown = !!o[k]; }); };
`);

console.log('A. the switch');
{
  g.run(`CAMP.flags.cockpit = false; window.F = __fake(1); campStep(F.camp, 2);`);
  g.run(`F.onKey({ code: 'KeyC' }); __tick(0.2);`);
  check('off: the C key does nothing in the scene (no cockpit, no toast)', J('F.camp.cockpit') === null && J('__toasts.length') === 0);
  g.run(`CAMP.flags.cockpit = true; F.onKey({ code: 'KeyC' }); __tick(0.1);`);
  check('on: C takes the stick of a pilot (Wedge, nothing being picked), the fighter is marked, and the run is a tuned one (score and rank not kept)', J('!!F.camp.cockpit') === true && J(`F.camp.by[F.camp.cockpit.id].squad`) === 'red' && J('F.tuned') === true);
  g.run(`F.onKey({ code: 'KeyC' }); __tick(0.1);`);
  check('a second C hands it back', J('F.camp.cockpit') === null && J(`F.camp.ships.some(u => u.cockpit)`) === false);
  g.run(`F.camp.ships.filter(u => u.kind === 'fighter').forEach(u => { u.hp = 0; }); F.camp.ships = F.camp.ships.filter(u => u.hp > 0); __toasts.length = 0; F.onKey({ code: 'KeyC' });`);
  check('no pilot out: C says so (the W pick\'s own refusal), and nothing is taken', J('F.camp.cockpit') === null && J('__toasts.length') === 1 && J('__toasts[0]') === J(`uiText('camp.no.nopilot')`), J('__toasts'));
}

console.log('B. the keys');
{
  g.run(`CAMP.flags.cockpit = true; window.F = __fake(1); campStep(F.camp, 2); F.onKey({ code: 'KeyC' }); __keys({ UP: 1, LEFT: 1, SPACE: 1, SHIFT: 1 }); __tick(0.1);`);
  check('Up, Left, Space and Shift are the FIGHTER\'S: thrust 1, turn -1, fire, boost', J('JSON.stringify(F.camp.cockpit.input)') === JSON.stringify({ turn: -1, thrust: 1, brake: false, boost: true, fire: true }));
  check('and not the cruiser\'s: its thrust, turn, boost and fire stay down (its turrets are the sim\'s), and it has not given up anything', J('F.camp.input.thrust') === 0 && J('F.camp.input.turn') === 0 && J('F.camp.input.boost') === false && J('F.camp.input.fire') === false);
  g.run(`__keys({ DOWN: 1, RIGHT: 1 }); __tick(0.1);`);
  check('Down is the brake and Right the other turn', J('F.camp.cockpit.input.brake') === true && J('F.camp.cockpit.input.turn') === 1 && J('F.camp.cockpit.input.thrust') === 0 && J('F.camp.cockpit.input.fire') === false);
  g.run(`F.pn.open = CAMP_PANELS.panels.find(p => !p.numbers).id; __keys({ UP: 1, RIGHT: 1, SHIFT: 1, SPACE: 1 }); __tick(0.1); campPanelClose(F.pn);`);
  check('with a list that owns the arrows open (and the Tab map: the same `hold`) they are the list\'s: the fighter has no thrust, turn or boost (Space is still its gun)', J('F.camp.cockpit.input.thrust') === 0 && J('F.camp.cockpit.input.turn') === 0 && J('F.camp.cockpit.input.boost') === false && J('F.camp.cockpit.input.fire') === true);
  check('the map is the same hold in the code: the scene\'s `hold` is the map or a list', /hold = this\.mp \|\| listed/.test(src('src/campaignscene.js')));
  g.run(`__keys({}); F.onKey({ code: 'KeyC' }); __keys({ UP: 1, SPACE: 1 }); __tick(0.1);`);
  check('handed back: the same keys are the cruiser\'s again (thrust 1, fire)', J('F.camp.input.thrust') === 1 && J('F.camp.input.fire') === true && J('F.camp.cockpit') === null);
}

console.log('C. the cruiser\'s order');
{
  g.run(`CAMP.flags.cockpit = true; window.F = __fake(1); campStep(F.camp, 2); campNavGo(F.camp, campNavRows(F.camp).find(r => r.id === 'place:earth'), false); F.onKey({ code: 'KeyC' }); __keys({ UP: 1, LEFT: 1 }); __tick(4); window.__d0 = Math.hypot(F.camp.carrier.vx, F.camp.carrier.vy);`);
  check('in a fighter the arrows do not give up the cruiser\'s trip: the autopilot is on and the cruiser is under way', J('F.camp.nav && F.camp.nav.on') === true && J('__d0') > 5, J('[F.camp.nav, __d0]'));
  g.run(`__keys({}); F.onKey({ code: 'KeyC' }); __tick(0.1);`);
  check('the trip is still its order when the stick is handed back (the arrows let go)', J('F.camp.nav && F.camp.nav.on') === true);
  g.run(`__keys({ LEFT: 1 }); __tick(0.1);`);
  check('out of a fighter a steering key gives the trip up, as always', J('F.camp.nav') === null || J('F.camp.nav.on') === false);
}

console.log('D. the camera');
{
  g.run(`CAMP.flags.cockpit = true; window.F = __fake(1); campStep(F.camp, 2); __tick(0.1);`);
  check('the camera starts on the cruiser', J('F.followed') === J('F.camp.carrier.id') && J('F.eyeId') === J('F.camp.carrier.id'));
  g.run(`F.onKey({ code: 'KeyC' }); __tick(0.1);`);
  check('after a take it follows the fighter whose stick he holds', J('F.followed') === J('F.camp.cockpit.id') && J('F.eyeId') === J('F.camp.cockpit.id'));
  check('the camera\'s way home (a drag, F, a peek) goes to the sprite of the ship he flies: the fighter\'s while he holds the stick', J('campEyeSprite(F).id') === J('F.camp.cockpit.id'));
  g.run(`F.onKey({ code: 'KeyC' }); __tick(0.1);`);
  check('after a hand-back, the cruiser again', J('F.followed') === J('F.camp.carrier.id'));
  check('and the way home is the cruiser\'s sprite again (and a scene with no sprite for it answers null)', J('campEyeSprite(F).id') === J('F.camp.carrier.id') && J('campEyeSprite({ camp: F.camp, sp: {} })') === null);
  g.run(`F.onKey({ code: 'KeyC' }); __tick(0.1); { const u = F.camp.by[F.camp.cockpit.id]; u.hp = 0; campKill(F.camp, u); } __tick(0.2);`);
  check('the fighter is lost: the stick is handed back by itself and the camera is on the cruiser again', J('F.camp.cockpit') === null && J('F.followed') === J('F.camp.carrier.id') && J('F.eyeId') === J('F.camp.carrier.id'));
}

console.log('E. the ship he flies');
{
  g.run(`CAMP.flags.cockpit = true; window.F = __fake(1); campStep(F.camp, 2); window.C = F.camp; C.boost = campBoostNew(); C.boost.en = 77; C.boost.on = true; C.boost.fx = 0.5;`);
  check('flag on, no stick: every hook answers the cruiser (campFeelShip, the boost store and the flames are the cruiser\'s own)', J('campFeelShip(C) === C.carrier') && J('campBoostStatus(C).frac') === 0.77 && J('campFlameState(C).boost') === 0.5 && J('campBoostHolder(C) === C.boost'));
  g.run(`campCockpitTake(C); C.cockpit.boost.en = 40; C.cockpit.boost.on = false; C.cockpit.boost.fx = 0.25; C.cockpit.boost.th = 0.5; C.by[C.cockpit.id].vx = 300; C.by[C.cockpit.id].vy = 0;`);
  check('with the stick: the feel\'s ship is the fighter, the boost status is the fighter\'s store (40 of 100) and the flame state its own, and the cruiser\'s store is untouched', J('campFeelShip(C) === C.by[C.cockpit.id]') && J('campBoostStatus(C).frac') === 0.4 && J('campBoostStatus(C).on') === false && J('campFlameState(C).boost') === 0.25 && J('campFlameState(C).th') === 0.5 && J('C.boost.en') === 77);
  check('its top speed for the feel is the boost\'s 800, and the page HUD\'s speed row reads the fighter (300 px/s, not over its top)', J('campFeelTop(C, C.by[C.cockpit.id])') === 800 && J('campPageHudSpeed(C).n') === 300 && J('campPageHudSpeed(C).over') === false);
  g.run(`campCockpitGive(C, 'hand');`);
  check('handed back: all of it is the cruiser\'s again', J('campFeelShip(C) === C.carrier') && J('campBoostStatus(C).frac') === 0.77);
  check('the ship look draws the feel for the ship he flies and not for the cruiser he left (one branch, one condition: the cruiser when no hook exists)', /typeof campFeelShip === 'function' \? u === campFeelShip\(C\) : u\.kind === 'carrier'/.test(src('src/shiplookfx.js')));
  check('the scene reads the cockpit\'s stick only while the switch is on, and keeps the nav on in a fighter', /cp = C\.cockpit && typeof campCockpitOn === 'function' && campCockpitOn\(\) \? C\.cockpit : null/.test(src('src/campaignscene.js')) && /if \(wheel && !cp && C\.nav/.test(src('src/campaignscene.js')));
}
console.log('F. the keys page');
{
  g.run(`CAMP.flags.cockpit = false;`);
  const row = () => J(`(() => { const fly = scrKeysModel().groups.find(gr => gr.id === 'fly'); return !!fly && fly.rows.some(r => r.chips.some(c => c.k === 'C')); })()`);
  const off = row(); g.run(`CAMP.flags.cockpit = true;`); const on = row();
  check('the new keys page lists C (Take a pilot\'s stick; again hands it back) under FLY AND FIRE only while the switch is on; the old page too', off === false && on === true && J(`scrKeysModel().groups.find(gr => gr.id === 'fly').rows.find(r => r.chips[0].k === 'C').t`) === "Take a pilot's stick; again hands it back" && J(`campKeysPage().some(gr => gr.rows.some(r => r.caps.join() === 'C'))`) === true);
  g.run(`CAMP.flags.cockpit = false;`);
}
check('the game logged no error', g.errors.length === 0, g.errors.join(' | '));

console.log(`\n${n - failed}/${n} checks passed`);
process.exit(failed ? 1 : 0);
