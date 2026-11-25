// not in the smoke: a boot of both games with the map's click-to-fly buttons, run by hand (one Chrome, muted, through the test lock; card space-game-map-click-fly)
// The rules are in tests/mapclickfly.mjs (plain Node). This boots each game once and does what Troy does with a real mouse and real keys: opens the map, clicks a place, looks at the two buttons by it, and flies.
//   node tests/mapclickfly-boot.mjs campaign     level 1 (the belt): Tab, a click on Vesta sets it, Fast flies at a burn (the speed passes 210), Shift+Enter and Enter (a burn with the wing out tows it), any steering key takes the wheel back
//   node tests/mapclickfly-boot.mjs longhaul     the Space scene: the sector map, a click on the station sets it, Enter flies at regular speed (ap.local), Shift+Enter fast
//   node tests/mapclickfly-boot.mjs              both, one after the other
// Pictures go to the folder in MAPFLY_SHOTS (default ~/dev/spacegame-night/shots/mapfly-*.png), never into the repository. Exit code 1 when a check fails or the game logged an error.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const OUT = process.env.MAPFLY_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const which = process.argv[2] || 'both';

// a real click: the game's own coordinates (1280 x 720) to the page's, by where the canvas sits
async function clickAt(t, gx, gy) {
  const p = JSON.parse(await t.ev(`(() => { const r = game.canvas.getBoundingClientRect(); return JSON.stringify({ x: r.left + ${gx} * r.width / 1280, y: r.top + ${gy} * r.height / 720 }); })()`));
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await t.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: type === 'mouseMoved' ? 'none' : 'left', buttons: type === 'mousePressed' ? 1 : 0, clickCount: 1 });
  await t.run(100);
}
const enterKey = async (t, modifiers) => { // a real Enter, and with modifiers 8 a real Shift+Enter: the modifier is on the event, as a keyboard sends it
  const k = { windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, code: 'Enter', key: 'Enter', modifiers };
  await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyDown' }, k)); await t.run(50); await t.send('Input.dispatchKeyEvent', Object.assign({ type: 'keyUp' }, k)); await t.run(150);
};
// the map hands the flight over on a real timer (80 ms, "after the scene runs again": src/map.js go) while this test steps the game clock by hand, so a check made a few stepped frames after Enter can
// come before the timer has fired. Wait for the condition in real time too: a pause, a few frames, again.
const settle = async (t, expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (JSON.parse(await t.ev(`JSON.stringify(!!(${expr}))`))) return true; await sleep(60); await t.run(200); } return false; };
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'mapfly-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture mapfly-' + name + '.png'); };

async function campaign() {
  console.log('the Campaign');
  const t = await launch('?campaign=1', ROOT);
  try {
    const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
    for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); } // the intro card, and on a tree with missions a briefing after it: Enter until the flight
    // the three pilots start the mission out beside the cruiser (card space-game-keys-orders) and a fast burn needs them aboard: they are called home first (the recall order; no key gives it now), so the first half is the map's buttons alone
    await t.ev(`(() => { campOrder(${SC}.camp, 'recall', '', 'key'); return 1; })()`);
    check('the pilots are aboard before the map is tried (recalled by the order)', await settle(t, `campNavOut(${SC}.camp) === 0 && ${SC}.camp.launchQ.length === 0`, 200), JSON.stringify(await j(`campNavOut(${SC}.camp)`)));
    await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(400);
    check('Tab opens the map', await j(`!!${SC}.mp`));
    const at = id => j(`(() => { const s = ${SC}, mp = s.mp, r = mp.rows.find(r => r.id === '${id}'), p = campMapPoint(mp.fit, CAMPMAP.frame, r.x, r.y); return { x: p.x, y: p.y }; })()`);
    const mars = await at('place:vesta');
    await clickAt(t, mars.x, mars.y); await t.run(300);
    const st = await j(`({ set: ${SC}.mp.setId, nav: !!${SC}.camp.nav, fly: ${SC}.mp.btnFly.visible, fast: ${SC}.mp.btnFast.visible, ft: ${SC}.mp.btnFly.text, st: ${SC}.mp.btnFast.text })`);
    check('a click on Vesta SETS it (no flight), and the two buttons are by it with the keys and the times', st.set === 'place:vesta' && !st.nav && st.fly && st.fast && /Enter/.test(st.ft) && /Shift\+Enter/.test(st.st), JSON.stringify(st));
    await snap(t, 'campaign-set');
    const b = await j(`({ x: ${SC}.mp.btnFast.x + 12, y: ${SC}.mp.btnFast.y + 8 })`);
    await clickAt(t, b.x, b.y); await t.run(300);
    check('a click on Fast flies there with the burn on', await j(`!!${SC}.camp.nav && ${SC}.camp.nav.fast === true`));
    await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(100); // the map closes
    await t.run(6000);
    const sp = await j(`Math.round(Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy))`), top = await j(`Math.round(CAMP.carrier.speed)`), burn = await j(`Math.round(CAMP.carrier.speed * Math.max(CAMP.nav.fast, CAMP.nav.farFast))`); // far trips burn at farFast // the table's numbers, not a number written here (the carrier's top speed was 210 when this was written)
    check('six seconds in, the carrier is past its own top speed (' + top + ') and under the burn\'s (' + burn + ')', sp > top * 1.05 && sp <= burn + 1, sp + ' px/s');
    await snap(t, 'campaign-burn');
    await t.ev(`(() => { ${SC}.k.UP.isDown = true; return 1; })()`); await t.run(200); await t.ev(`(() => { ${SC}.k.UP.isDown = false; return 1; })()`); await t.run(200); // the arrows fly (no letter does: card one-list-keys)
    check('a steering key (Up) takes the wheel: the autopilot and the burn are off, and the speed is back under the top speed (' + top + ')', await j(`${SC}.camp.nav === null`) && (await j(`Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy)`)) <= top + 1);
    await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(300);
    const eros = await at('place:pallas'); await clickAt(t, eros.x, eros.y); await t.run(200);
    await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', shiftKey: false, repeat: false }); return 1; })()`); await t.run(200);
    check('Enter on the set place flies there at regular speed', await j(`!!${SC}.camp.nav && ${SC}.camp.nav.fast === false`));
    // Troy, 20 Nov 2026: mid-flight the two buttons and Enter / Shift+Enter stay live; the active one is marked; the target is kept and only the speed changes
    await t.run(300);
    check('mid-flight the two buttons are still on the map, with Fly marked ON (regular speed)', (await j(`${SC}.mp.btnFly.visible && ${SC}.mp.btnFast.visible && /ON$/.test(${SC}.mp.btnFly.text) && !/ON$/.test(${SC}.mp.btnFast.text)`)) === true, JSON.stringify(await j(`[${SC}.mp.btnFly.text, ${SC}.mp.btnFast.text, ${SC}.mp.setId]`)));
    await t.ev(`(() => { window.__trip = ${SC}.camp.nav; return 1; })()`);
    await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', shiftKey: true, repeat: false }); return 1; })()`); await t.run(300);
    check('Shift+Enter on the same place: the same trip, now a burn, and Fast is marked ON', (await j(`${SC}.camp.nav === window.__trip && ${SC}.camp.nav.fast === true && /ON$/.test(${SC}.mp.btnFast.text) && !/ON$/.test(${SC}.mp.btnFly.text)`)) === true, JSON.stringify(await j(`[${SC}.mp.btnFly.text, ${SC}.mp.btnFast.text]`)));
    const fb2 = await j(`({ x: ${SC}.mp.btnFly.x + 12, y: ${SC}.mp.btnFly.y + 8 })`); await clickAt(t, fb2.x, fb2.y); await t.run(300);
    check('a click on Fly: back to regular speed, the same trip, Fly marked ON', (await j(`${SC}.camp.nav === window.__trip && ${SC}.camp.nav.fast === false && /ON$/.test(${SC}.mp.btnFly.text)`)) === true);
    await snap(t, 'campaign-switch');
    // card space-game-burn-with-wing-out (it was fast-board: Fast needed the wing aboard): the wing is out, and Fast on the map burns at once with the pilots towed
    // the wing is sent out again by the launch order (the all-squads list and its Launch row are switched off: card space-game-keys-orders). A list's key over the map closes the map (W, the fleet pick: card space-game-keys5-qwe; Q is the map's own reset since card space-game-q-recentre-map and closes nothing), so Tab opens it again after
    const listOverMap = await j(`(() => { const S = ${SC}, k = code => S.onKey({ code, repeat: false }); campNavClear(S.camp, 'clear'); const cr = campKeyList('cruiser'), fl = campKeyList('fleet'); if (!cr || !cr.code || !fl || !fl.code) return 'the cruiser or the fleet list has no key';
      k(cr.code); const qKeeps = !!S.mp && campPanelOpen(S.pn) === ''; k(fl.code); const overMap = !S.mp && campPanelOpen(S.pn) === 'fleet'; k('Escape'); const closed = campPanelOpen(S.pn) === '' && S.mode === 'play';
      const went = campOrder(S.camp, 'launch', '', 'key'); return qKeeps && overMap && closed ? 'ok' : 'Q left the map open and no list: ' + qKeeps + ', map closed and list opened: ' + overMap + ', Esc closed the list and did not pause: ' + closed + ', launch: ' + JSON.stringify(went); })()`);
    check('Q (the zoom reset, read from the table) over the open map leaves it open with no list; W (the fleet list\'s key) closes the map and opens the fleet pick; Esc closes the list; the pilots are sent out again by the launch order (the strip\'s word: no key and no row gives it now)', listOverMap === 'ok', String(listOverMap));
    await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(300);
    check('Tab opens the map again', (await j(`!!${SC}.mp`)) === true);
    await settle(t, `${SC}.camp.launchQ.length === 0 && campWing(${SC}.camp).length === 3`, 200); // every ship out (a ship still in the launch queue when the wing is recalled is not recalled: it comes out later; ships come out one per bay interval; the wing is the three pilots since card space-game-three-pilots, 23 Nov 2026)
    check('the wing is out (the three pilots)', (await j(`campNavOut(${SC}.camp)`)) === 3);
    // the place is chosen on the map's list and set (not by a click on its mark: the carrier is by Vesta now), and the keys do the rest: the Fast button, Shift+Enter, Shift+Enter
    await t.ev(`(() => { ${SC}.mp.selId = 'place:pallas'; ${SC}.mp.setId = 'place:pallas'; ${SC}.mp.dirty = true; return 1; })()`); await t.run(300);
    check('with the wing out the Fast button is the same button: its key and its time, no "wing is out" (a burn tows the wing: card space-game-burn-with-wing-out)', /^FAST\s+Shift\+Enter/.test(await j(`${SC}.mp.btnFast.text`)) && !/wing is out/.test(await j(`${SC}.mp.btnFast.text`)), await j(`${SC}.mp.btnFast.text`));
    const recalls0 = await j(`${SC}.camp.orders.recall`); // the mission's count of recall orders so far (this walk recalled the wing once to test it): a burn must add none
    await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', shiftKey: true, repeat: false }); return 1; })()`); await t.run(200);
    check('Shift+Enter burns at once with the wing out: the trip is on and fast, nobody is recalled, nothing waits', (await j(`!!${SC}.camp.nav && ${SC}.camp.nav.fast === true && ${SC}.camp.orders.recall === ${recalls0} && !${SC}.camp.navWait`)) === true, JSON.stringify(await j(`({ nav: ${SC}.camp.nav && ${SC}.camp.nav.id, fast: ${SC}.camp.nav && ${SC}.camp.nav.fast, recall: ${SC}.camp.orders.recall, navWait: ${SC}.camp.navWait })`)));
    await t.run(3000);
    check('and the three pilots are towed along with the cruiser: a lifted top speed, none left behind (within 450 px of it)', (await j(`campWing(${SC}.camp).length === 3 && campWing(${SC}.camp).every(u => u.tow > 1 && Math.hypot(u.x - ${SC}.camp.carrier.x, u.y - ${SC}.camp.carrier.y) < 450)`)) === true, JSON.stringify(await j(`[campNavOut(${SC}.camp), campWing(${SC}.camp).map(u => [u.tow, Math.round(Math.hypot(u.x - ${SC}.camp.carrier.x, u.y - ${SC}.camp.carrier.y))])]`)));
    check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

async function longhaul() {
  console.log('Long Haul');
  const t = await launch('#space', ROOT);
  try {
    const SP = `game.scene.getScene('Space')`, OV = `game.scene.getScene('Overlay')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Space'))`, 30000, 'Space active'); await t.run(0).catch(() => {}); await t.ev('G.guideDone = true'); await t.clock(); await t.run(1000);
    await t.ev(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.calmUntil = 1e12; s.cr.target = null; return 1; })()`);
    await t.ev(`(() => { ${SP}.scene.pause(); game.scene.run('Overlay', { from: 'Space', mode: 'map' }); return 1; })()`); await t.run(300);
    check('the sector map is open over the game', await j(`game.scene.isActive('Overlay')`));
    // the first place to fly to is a belt, an outpost or a gate a few thousand px off, never a station or a planet: those take a dock or land order, and a ship that starts a few hundred px from the station docks
    // within a second or two of game time, so whether the steering-key check below found it still flying depended on how many game frames the map's real 80 ms timer let pass (load). A plain body means a
    // plain local flight of several seconds.
    const pick = await j(`(() => { const c = cruiseKnown(${SP}).filter(r => ['belt', 'scenery', 'gate'].includes(r.type) && r.dist >= 2000 && r.dist <= 15000).sort((a, b) => a.dist - b.dist)[0]; return c ? { id: c.id, name: c.name, dist: Math.round(c.dist) } : null; })()`);
    check('there is a belt, an outpost or a gate 2,000 to 15,000 px away to fly to', !!pick, JSON.stringify(pick));
    await t.ev(`${OV}.whole = true`); await t.run(800); // the whole system, so it is on the map to click
    const mark = await j(`(() => { const ov = ${OV}, b = cruiseKnown(${SP}).find(r => r.id === '${pick && pick.id}'), v = ov.view, sc = ov.MS / v.size; return { x: ov.MX + (b.x - v.x) * sc, y: ov.MY + (b.y - v.y) * sc, id: b.id, ok: b.x >= v.x && b.x <= v.x + v.size && b.y >= v.y && b.y <= v.y + v.size }; })()`);
    check('it is on the map to click', mark.ok, JSON.stringify(mark));
    await clickAt(t, mark.x, mark.y); await t.run(300);
    const st = await j(`({ set: ${SP}.cr.target && ${SP}.cr.target.id, ap: ${SP}.ap.on, open: game.scene.isActive('Overlay'), fly: ${OV}.btnFly.visible, fast: ${OV}.btnFast.visible, ft: ${OV}.btnFly.text, st: ${OV}.btnFast.text })`);
    check('a click on the place SETS it as the destination: the map stays open, nothing flies, the two buttons are by the mark', st.set === mark.id && !st.ap && st.open && st.fly && st.fast && /Enter/.test(st.ft) && /Shift\+Enter|too near/.test(st.st), JSON.stringify(st));
    await snap(t, 'longhaul-set');
    await enterKey(t, 0); await settle(t, `${SP}.ap.on`);
    const fl = await j(`({ open: game.scene.isActive('Overlay'), on: ${SP}.ap.on, local: ${SP}.ap.local, stage: ${SP}.ap.stage })`);
    check('Enter closes the map and the autopilot flies there at regular speed (no cruise: ap.local)', !fl.open && fl.on && fl.local === true, JSON.stringify(fl));
    await t.run(300);
    // Troy, 20 Nov 2026: reopen the map mid-flight: the destination is kept, the buttons are there with the active one marked, and Shift+Enter changes the speed of the same trip
    await t.ev(`(() => { ${SP}.scene.pause(); game.scene.run('Overlay', { from: 'Space', mode: 'map' }); return 1; })()`); await t.run(300);
    const mid = await j(`({ tgt: ${SP}.cr.target && ${SP}.cr.target.id, fly: ${OV}.btnFly.visible, fast: ${OV}.btnFast.visible, ft: ${OV}.btnFly.text, st: ${OV}.btnFast.text })`);
    check('mid-flight the map shows the same destination, the two buttons, and Fly marked ON', mid.tgt === mark.id && mid.fly && mid.fast && /ON$/.test(mid.ft) && !/ON$/.test(mid.st), JSON.stringify(mid));
    await enterKey(t, 8); await settle(t, `${SP}.ap.on && ${SP}.ap.local === false`, 60); await t.run(200); // Shift+Enter on the reopened map: the same destination, now the autopilot as it always was (cruise for the middle of a long leg)
    const sw = await j(`({ open: game.scene.isActive('Overlay'), on: ${SP}.ap.on || ${SP}.cruising, local: ${SP}.ap.local, tgt: ${SP}.cr.target && ${SP}.cr.target.id })`);
    check('Shift+Enter on the reopened map switches the same trip to Fast: same destination, not regular speed any more', !sw.open && sw.on && sw.local === false && sw.tgt === mark.id, JSON.stringify(sw));
    await snap(t, 'longhaul-flying');
    await t.ev(`(() => { ${SP}.k.W.isDown = true; return 1; })()`); await t.run(600); await t.ev(`(() => { ${SP}.k.W.isDown = false; return 1; })()`);
    check('a steering key takes the wheel back', await j(`${SP}.ap.on === false`), JSON.stringify(await j(`({ on: ${SP}.ap.on, stage: ${SP}.ap.stage, leaving: ${SP}.leaving })`)));
    // a far body: the leg is long, so Fast cruises and Fly does not
    await t.ev(`(() => { const s = ${SP}, far = cruiseKnown(s).filter(r => r.type !== 'star').sort((a, b) => b.dist - a.dist)[0]; navpanelPick(s, far, true); window.__far = far.id; return 1; })()`);
    await t.ev(`(() => { ${SP}.scene.pause(); game.scene.run('Overlay', { from: 'Space', mode: 'map' }); return 1; })()`); await t.run(300);
    await snap(t, 'longhaul-far');
    check('the far place has a Fast time (a long leg) and the buttons are on the map', await j(`${OV}.btnFast.visible && !/too near/.test(${OV}.btnFast.text)`), await j(`${OV}.btnFast.text`));
    await enterKey(t, 8); await settle(t, `${SP}.ap.on || ${SP}.cruising`); await t.run(300);
    const fs = await j(`({ open: game.scene.isActive('Overlay'), on: ${SP}.ap.on, local: ${SP}.ap.local, cruising: ${SP}.cruising, stage: ${SP}.ap.stage })`);
    check('Shift+Enter flies fast: the autopilot is on, not at regular speed, and cruise takes the middle of the leg', !fs.open && (fs.on || fs.cruising) && fs.local !== true && (fs.cruising || fs.stage === 'cruise' || fs.stage === 'clear'), JSON.stringify(fs));
    await snap(t, 'longhaul-fast');
    check('the game logged no error', t.errors.length === 0, t.errors.join(' | '));
  } finally { await t.close(); }
}

try {
  if (which === 'campaign' || which === 'both') await campaign();
  if (which === 'longhaul' || which === 'both') await longhaul();
} catch (e) { console.log('  FAIL the boot stopped: ' + (e && e.message)); bad++; }
console.log(bad ? `\nMAP CLICK FLY BOOT FAIL (${bad})` : '\nMAP CLICK FLY BOOT PASS');
process.exit(bad ? 1 : 0);
