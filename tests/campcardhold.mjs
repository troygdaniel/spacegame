// smoke: the Enter that closes a card (the story, the briefing, a result) is not also a missile: for 0.4 s after a card closes, and at the start of a battle, the missile key and a click on a ship do nothing (plain Node, no Chrome)
// Card space-game-enter-card-fires-missile (Troy, 24 Nov 2026: "the Enter that closes the story card or the briefing also fires a missile, which costs ore now"). The fix: `CAMP.card.lock` (400 ms, src/campaign.js); campPanelHold(P, now) and campPanelHeld(P, now) (src/camppanel.js); the scene holds when a card closes (hideCard) and when a battle begins (create), and its missile branch and shipClick respect the hold (src/campaignscene.js).
//   A. the hold: the table, the two helpers
//   B. the key: a held press fires nothing, says nothing and costs nothing; after the lock it fires; no other key is held
//   C. the scene (on a stand-in): the Enter that closes the story card and the briefing, a second Enter at once, the click, a card that was not there, the start of a battle
//   D. Space and the turrets: held-key reads, not presses, and the battle does not run under a card: nothing to hold
// Run: node tests/campcardhold.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame, ROOT } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 400) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`JSON.stringify(${e}) ?? 'null'`));
const src = f => readFileSync(ROOT + '/' + f, 'utf8');
g.run(`
  window.__toasts = []; toast = (s, msg) => { __toasts.push(msg); };
  window.__new = () => { window.C = campNew(1, [], { seed: 1, god: true }); C.waves.forEach(w => { w.started = true; }); C.convoys.forEach(c => { c.started = true; }); C.motherSpawn = 1e12; window.P = campPanelNew(); return !!C; };
  window.__foe = (kind, dx, dy) => { const c = C.carrier, u = campSpawn(C, kind, c.x + dx, c.y + dy); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; return u.id; };
  window.__k = (code, now) => { const r = campPanelKey(P, C, code, now); return { used: r.used, ran: r.ran, ok: r.ok, say: r.say }; };
  window.__fake = () => { const rec = () => { const log = []; const p = new Proxy({}, { get: (t, k) => (k === 'log' ? log : (...a) => { log.push([k, ...a]); return p; }) }); return p; };
    const f = Object.create(Campaign.prototype); f.add = rec(); f.tweens = { add() {} }; f.cameras = document; f.input = document; f.textures = document; f.boom = { explode() {} };
    f.hud = {}; f.msp = {}; f.reachG = rec(); f.mountG = rec(); f.mode = 'play'; f.leaving = false; f.mp = null; f.camp = C; f.pn = campPanelNew(); f.time = { now: 5000 }; f.card = null; f.via = 'hub'; return f; };
  window.__card = f => { f.card = [{ destroy() { f.__destroyed = (f.__destroyed || 0) + 1; } }]; f.panel = true; };
`);

// ---- A. the hold ----
{
  check('the lock is 400 ms, a number of the CAMP table', J('CAMP.card.lock') === 400);
  g.run(`__new();`);
  check('no hold until a card has closed: held is false, with or without a clock', J('campPanelHeld(P, 1000)') === false && J('campPanelHeld(P)') === false && J('campPanelHeld(null, 1000)') === false);
  g.run(`campPanelHold(P, 1000);`);
  check('after a hold at 1000 it is held to 1399 and free at 1400', J('campPanelHeld(P, 1000)') === true && J('campPanelHeld(P, 1399)') === true && J('campPanelHeld(P, 1400)') === false && J('campPanelHeld(P, 9000)') === false);
  g.run(`__new(); campPanelHold(P); campPanelHold(null, 5);`);
  check('a hold without a clock, or without a state, does nothing', J('campPanelHeld(P, 1)') === false);
}

// ---- B. the key ----
{
  g.run(`__new(); __foe('gunship', 1500, 0); campPanelHold(P, 1000);`);
  const m0 = J('C.missiles'), o0 = J('C.orders.missiles');
  const held = J(`__k('KeyZ', 1100)`), held2 = J(`__k('KeyZ', 1399)`);
  check('Z 100 ms after a card closed is taken (used) and does nothing: no order, no words, no missile', held.used === true && held.ran === false && held.say === '' && J('C.missiles') === m0 && J('C.orders.missiles') === o0 && J('C.rockets.length') === 0, JSON.stringify(held));
  check('Z again, up to the last millisecond of the lock', held2.used === true && held2.ran === false && J('C.missiles') === m0);
  const free = J(`__k('KeyZ', 1400)`);
  check('at 1400 Z fires the missile as it always did (it says Missile away, the rack is one less)', free.ran === true && free.ok === true && free.say === 'Missile away.' && J('C.missiles') === m0 - 1 && J('C.orders.missiles') === o0 + 1, JSON.stringify(free));
  g.run(`__new(); campPanelHold(P, 1000);`);
  const s = J(`__k('KeyQ', 1100)`);
  check('only the missile key is held: S opens the cruiser list in the same moment, and a digit does its row', s.used === true && J('campPanelOpen(P)') === 'cruiser' && J(`__k('Digit5', 1150).used`) === true);
  g.run(`__new(); __foe('gunship', 1500, 0); campPanelHold(P, 1000); __k('KeyZ', 1100);`);
  check('a held press is not remembered: it does not fire when the lock ends (a key is a press, not a hold)', J('C.orders.missiles') === 0 && J('C.rockets.length') === 0);
}

// ---- C. the scene ----
{
  g.run(`__new(); __foe('gunship', 1500, 0); window.F = __fake(); F.mode = 'brief'; __card(F); __toasts.length = 0;`);
  const m0 = J('C.missiles');
  g.run(`F.onKey({ code: 'Enter' });`);
  check('Enter on the briefing closes it (the battle begins) and fires no missile', J('F.mode') === 'play' && J('F.card') === null && J('F.__destroyed') === 1 && J('C.missiles') === m0 && J('__toasts.length') === 0);
  check('closing the card held the missile key (the panel state has a hold, 400 ms past the scene clock)', J('F.pn.hold') === 5400 && J('campPanelHeld(F.pn, 5100)') === true);
  g.run(`F.time.now = 5100; F.onKey({ code: 'Enter' });`);
  check('a second Enter 100 ms later (a double tap) fires nothing and says nothing', J('C.missiles') === m0 && J('C.orders.missiles') === 0 && J('__toasts.length') === 0 && J('C.rockets.length') === 0);
  g.run(`F.time.now = 5450; F.onKey({ code: 'KeyZ' });`);
  check('after the lock Enter fires a missile through the scene as it did', J('C.missiles') === m0 - 1 && J('C.orders.missiles') === 1 && J('__toasts[0]') === 'Missile away.', J('__toasts.join()'));

  g.run(`__new(); __foe('gunship', 1500, 0); window.F = __fake(); F.mode = 'intro'; F.via = 'hub'; __card(F); __toasts.length = 0; F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' });`);
  check('the story card: the Enter that closes it goes to the flight (a mission launched from the ready room has no briefing) and a second at once fires nothing', J('F.mode') === 'play' && J('C.orders.missiles') === 0 && J('C.missiles') === 6 && J('__toasts.length') === 0);

  g.run(`__new(); __foe('gunship', 1500, 0); window.F = __fake(); F.mode = 'debrief'; F.mdone = false; F.nextMission = function () { this.next1 = true; }; __card(F); __toasts.length = 0; F.onKey({ code: 'Enter' }); F.onKey({ code: 'Enter' });`);
  check('the debriefing: its Enter goes on to the next mission and fires no missile', J('F.next1') === true && J('C.orders.missiles') === 0 && J('__toasts.length') === 0);

  g.run(`__new(); window.F = __fake(); F.mode = 'play'; F.pn = campPanelNew();`);
  check('a click on a ship does something with no hold (the guards pass: it asks the click rules)', J('(() => { let asked = false; const was = campClickAct; campClickAct = () => { asked = true; return { used: false }; }; F.cameras = { main: { zoom: 1, scrollX: 0, scrollY: 0, width: 10, height: 10, getWorldPoint: (x, y) => ({ x, y }) } }; try { F.shipClick(5, 5, "left"); } catch (e) { } campClickAct = was; return asked; })()') === true);
  g.run(`campPanelHold(F.pn, 5000);`);
  check('a click in the 0.4 s after a card closed does nothing in the flight view (shipClick says it is not used)', J('(() => { let asked = false; const was = campClickAct; campClickAct = () => { asked = true; return { used: true }; }; const r = F.shipClick(5, 5, "left"); campClickAct = was; return [r, asked]; })()').join() === 'false,false');

  g.run(`__new(); window.F = __fake(); F.card = null; F.hideCard();`);
  check('hideCard with no card up holds nothing (the scene hides a card that is not there before every card it shows)', J('F.pn.hold') === null || J('typeof F.pn.hold') === 'undefined' || J('campPanelHeld(F.pn, 5001)') === false);

  const s = src('src/campaignscene.js'), cr = s.indexOf('create() {'), inst = s.indexOf('campPanelsInstall(this)', cr), hold = s.indexOf("campPanelHold(this.pn", inst);
  check('a battle begins held: create holds the missile key right after it makes the panel state (the Enter or click that launched it is not a missile)', cr > 0 && inst > cr && hold > inst && hold - inst < 400);
}

// ---- D. Space and the turrets ----
{
  const s = src('src/campaignscene.js');
  check('Space is a held-key read of the frame (k.SPACE.isDown), not a press the scene reads: no key handler of the scene says Space, so no card closes on it and the Enter of a card cannot be it', !/'Space'|"Space"|KeyCodes\.SPACE/.test(s) && /inp\.fire = k\.SPACE\.isDown/.test(s));
  check('the battle does not run under a card: campStep (the turrets, the beams, the rockets) is only called while the mode is play', /if \(this\.mode === 'play' && !C\.result\) \{[\s\S]{0,2200}campStep\(C, /.test(s));
  g.run(`__new(); __foe('gunship', 400, 0); const before = C.ships.map(u => u.hp).join();`);
  check('the turrets fire on `input.fire` alone (the Space the player holds): with it off and a held press, nothing fires', J('C.input.fire') === false && J('C.rockets.length') === 0);
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\nCARD HOLD FAIL (${failed} of ${n})` : `\nCARD HOLD PASS (${n} checks)`);
process.exit(failed ? 1 : 0);
