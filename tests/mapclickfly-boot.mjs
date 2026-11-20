// not in the smoke: a boot of both games with the map's click-to-fly buttons, run by hand (one Chrome, muted, through the test lock; card space-game-map-click-fly)
// The rules are in tests/mapclickfly.mjs (plain Node). This boots each game once and does what Troy does with a real mouse and real keys: opens the map, clicks a place, looks at the two buttons by it, and flies.
//   node tests/mapclickfly-boot.mjs campaign     level 1: Tab, a click on Mars sets it, Fast flies at a burn (the speed passes 210), Shift+Enter and Enter, any steering key takes the wheel back
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
const settle = async (t, expr, tries = 40) => { for (let i = 0; i < tries; i++) { if (JSON.parse(await t.ev(`JSON.stringify(!!(${expr}))`))) return true; await sleep(60); await t.run(100); } return false; };
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'mapfly-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } console.log('  picture mapfly-' + name + '.png'); };

async function campaign() {
  console.log('the Campaign');
  const t = await launch('?campaign=1', ROOT);
  try {
    const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
    await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
    await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); // the intro card
    await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(400);
    check('Tab opens the map', await j(`!!${SC}.mp`));
    const at = id => j(`(() => { const s = ${SC}, mp = s.mp, r = mp.rows.find(r => r.id === '${id}'), p = campMapPoint(mp.fit, CAMPMAP.frame, r.x, r.y); return { x: p.x, y: p.y }; })()`);
    const mars = await at('place:mars');
    await clickAt(t, mars.x, mars.y); await t.run(300);
    const st = await j(`({ set: ${SC}.mp.setId, nav: !!${SC}.camp.nav, fly: ${SC}.mp.btnFly.visible, fast: ${SC}.mp.btnFast.visible, ft: ${SC}.mp.btnFly.text, st: ${SC}.mp.btnFast.text })`);
    check('a click on Mars SETS it (no flight), and the two buttons are by it with the keys and the times', st.set === 'place:mars' && !st.nav && st.fly && st.fast && /Enter/.test(st.ft) && /Shift\+Enter/.test(st.st), JSON.stringify(st));
    await snap(t, 'campaign-set');
    const b = await j(`({ x: ${SC}.mp.btnFast.x + 12, y: ${SC}.mp.btnFast.y + 8 })`);
    await clickAt(t, b.x, b.y); await t.run(300);
    check('a click on Fast flies there with the burn on', await j(`!!${SC}.camp.nav && ${SC}.camp.nav.fast === true`));
    await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(100); // the map closes
    await t.run(6000);
    const sp = await j(`Math.round(Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy))`);
    check('six seconds in, the carrier is past its old top speed of 210 and under the burn\'s 420', sp > 230 && sp <= 421, sp + ' px/s');
    await snap(t, 'campaign-burn');
    await t.ev(`(() => { ${SC}.k.W.isDown = true; return 1; })()`); await t.run(200); await t.ev(`(() => { ${SC}.k.W.isDown = false; return 1; })()`); await t.run(200);
    check('a steering key takes the wheel: the autopilot and the burn are off, and the speed is back under 210', await j(`${SC}.camp.nav === null`) && (await j(`Math.hypot(${SC}.camp.carrier.vx, ${SC}.camp.carrier.vy)`)) <= 211);
    await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(300);
    const eros = await at('place:eros'); await clickAt(t, eros.x, eros.y); await t.run(200);
    await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', shiftKey: false, repeat: false }); return 1; })()`); await t.run(200);
    check('Enter on the set place flies there at regular speed', await j(`!!${SC}.camp.nav && ${SC}.camp.nav.fast === false`));
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
