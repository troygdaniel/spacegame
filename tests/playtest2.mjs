// Playtest round 2 (card space-game-playtest-2): one scripted walk through the game the way Troy plays it, in headless Chrome,
// one Chrome at a time. Every step saves a screenshot to tests/out/pt2-<step>.png, notes the console errors it caused and how long
// 30 stepped frames took, and never stops the walk: a failed step is written down and the next one runs. The result is printed
// and saved to tests/out/playtest2.json; the human reading is docs/PLAYTEST2.md. Run: node tests/playtest2.mjs
// Nothing here calls a provider: the chat and voice use a mocked fetch.
import { launch, sleep, OUT } from './cdp.mjs';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ST = "game.scene.getScene('Station')", SP = "game.scene.getScene('Space')";
const KEY = 'sk-test-' + 'p'.repeat(28);
const MOCK = `(() => {
  window.__calls = []; window.__reply = 'Welcome back, pilot. Quiet night.';
  window.fetch = (url, opts) => { __calls.push(String(url)); const anth = /anthropic/.test(String(url));
    const body = /deepgram/.test(String(url)) ? 'no' : JSON.stringify(anth ? { content: [{ type: 'text', text: __reply }] } : { choices: [{ message: { content: __reply } }] });
    return Promise.resolve(new Response(body, { status: /deepgram/.test(String(url)) ? 401 : 200, headers: { 'content-type': 'application/json' } })); };
  return 1; })()`;
const results = [];
let t = null, errSeen = 0;
const vk = { V: [86, 'KeyV', 'v'], N: [78, 'KeyN', 'n'], T: [84, 'KeyT', 't'], H: [72, 'KeyH', 'h'], M: [77, 'KeyM', 'm'], A: [65, 'KeyA', 'a'], D: [68, 'KeyD', 'd'] };
const tap = async (name, hold = 80) => {
  const [code, key, ch] = vk[name];
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, code: key, key: ch });
  await sleep(hold);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, code: key, key: ch });
};
const skey = async (name) => { // for the stepped clock: down, frames, up, frames (tests/cdp.mjs key() does this for its own table)
  const [code, key, ch] = vk[name] || { ENTER: [13, 'Enter', 'Enter'], C: [67, 'KeyC', 'c'], L: [76, 'KeyL', 'l'] }[name];
  await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, code: key, key: ch }); await t.run(50);
  await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, code: key, key: ch }); await t.run(100);
};
const loopState = () => t.ev("JSON.stringify({ frame: game.loop.frame, hidden: document.hidden, hasFocus: game.hasFocus })");
const hold = async (name, down) => { const [code, key, ch] = vk[name] || { W: [87, 'KeyW', 'w'], S: [83, 'KeyS', 's'] }[name]; await t.send('Input.dispatchKeyEvent', { type: down ? 'keyDown' : 'keyUp', windowsVirtualKeyCode: code, nativeVirtualKeyCode: code, code: key, key: ch }); };
const active = (scene, ms = 20000) => t.waitFor(`!!(window.game && game.scene.isActive('${scene}'))`, ms, scene + ' active');
// how long 30 game frames take to render right now (real ms per frame; under software GL and a shared Mac this is relative, not absolute)
const frameMs = async () => { const a = Date.now(); await t.ev('(() => { for (let i = 0; i < 30; i++) game.step(performance.now(), 16.67); return 1; })()'); return Math.round((Date.now() - a) / 30); };
// one step: do it, screenshot it, note errors and timing; a throw becomes a finding, not an abort
async function step(name, fn, note = '') {
  const r = { step: name, note, ok: true, detail: '', errors: [], frameMs: null };
  try {
    const d = await fn();
    if (typeof d === 'string') r.detail = d; else if (d && typeof d === 'object') Object.assign(r, d);
  } catch (e) { r.ok = false; r.detail = 'threw: ' + e.message; }
  try { await t.shot('pt2-' + name); } catch (e) { r.detail += ' (no screenshot)'; }
  try { r.frameMs = await frameMs(); } catch (e) { /* a scene without a game loop */ }
  r.errors = t.errors.slice(errSeen); errSeen = t.errors.length;
  results.push(r);
  console.log(`  ${r.ok && !r.errors.length ? 'ok  ' : 'LOOK'} ${name}${r.detail ? '  ' + r.detail : ''}${r.frameMs !== null ? '  [' + r.frameMs + ' ms/frame]' : ''}${r.errors.length ? '  ERRORS: ' + r.errors.join(' | ') : ''}`);
}
const panels = async () => t.ev(`(() => { const out = []; game.scene.getScenes(true).forEach(s => out.push(s.scene.key)); return out.join('+'); })()`);
const walkTo = async (x, y) => { await t.ev(`(() => { const s = ${ST}; s.player.setPosition(${x}, ${y}); s.player.setVelocity(0, 0); return 1; })()`); await sleep(300); };

// ---- 1. title and the two optional-key panels ----
t = await launch('');
try {
  await active('Title');
  await sleep(1200);
  await step('title', async () => 'hint line: ' + await t.ev(`game.scene.getScene('Title').children.list.filter(o => o.text && /move/.test(o.text)).map(o => o.text).join(' | ')`));
  await step('title-chat-panel', async () => { await t.press('C'); await active('ChatSetup', 8000); await sleep(400); const a = await loopState(); await sleep(500); return 'scenes ' + await panels() + '; loop ' + a + ' then ' + await loopState(); });
  await step('title-chat-panel-closed', async () => { await t.press('ESC'); await t.waitFor("!game.scene.isActive('ChatSetup')", 8000, 'chat panel closed'); await sleep(300); return 'scenes ' + await panels() + ', inputs left: ' + await t.ev("document.querySelectorAll('input').length"); });
  await step('title-voice-panel', async () => { await tap('V'); await active('VoiceSetup', 8000); await sleep(400); const a = await loopState(); await sleep(500); return 'scenes ' + await panels() + '; loop ' + a + ' then ' + await loopState(); });
  await step('title-voice-panel-closed', async () => { await t.press('ESC'); try { await t.waitFor("!game.scene.isActive('VoiceSetup')", 8000, 'voice panel closed'); } catch (e) { const st = 'STILL OPEN after 8 s; loop ' + await loopState() + '; queued scene ops ' + await t.ev('game.scene._queue.length'); await t.ev("(game.scene.stop('VoiceSetup'), game.scene.resume('Title'), 1)"); await sleep(500); return st; } await sleep(300); return 'scenes ' + await panels(); });
  await step('title-help', async () => { await tap('H'); await sleep(600); const sc = await panels(); await tap('H'); await sleep(300); return 'H on the title opened: ' + sc; });
} finally { await t.close(); }

// ---- 2. the station: bar, chat, journal, pause, map, repair, shop, ship bay, launch, flight, dock, reload ----
t = await launch('#station'); errSeen = 0;
try {
  await active('Station');
  await sleep(1500);
  await step('station', async () => 'credits ' + await t.ev('G.credits') + ', hull ' + await t.ev('G.hull') + '/' + await t.ev('G.maxHull') + ', chat ' + await t.ev('chatStatus()'));
  await t.ev(MOCK);
  await t.ev(`(chatSetKey(''), chatReset(), 1)`);
  await step('bar-talk-juno', async () => { await walkTo(255, 572); await t.press('E'); await sleep(2500); return 'prompt was: ' + await t.ev(`${ST}.prompt.text`) + '; line: ' + (await t.ev(`${ST}.talkText.text`)).slice(0, 60); });
  await step('bar-talk-moss', async () => { await walkTo(340, 530); await sleep(200); const p = await t.ev(`${ST}.prompt.text`); await t.press('E'); await sleep(2500); return 'prompt: ' + p + '; line: ' + (await t.ev(`${ST}.talkText.text`)).slice(0, 60); });
  await step('bar-talk-sable', async () => { await walkTo(740, 600); await sleep(200); const p = await t.ev(`${ST}.prompt.text`); await t.press('E'); await sleep(2500); return 'prompt: ' + p + '; line: ' + (await t.ev(`${ST}.talkText.text`)).slice(0, 60); });
  await step('bar-ida-absent-before-rescue', async () => { await walkTo(236, 540); await sleep(300); return 'prompt near IDA\'s spot: "' + await t.ev(`${ST}.prompt.text`) + '" (expected nothing: IDA comes after the first rescue), spots in bar: ' + await t.ev(`${ST}.spots.filter(s => s.npc !== undefined).map(s => s.text).join(',')`); });
  await t.ev(`chatSetKey('${KEY}')`);
  await step('bar-chat-open', async () => { await walkTo(255, 572); await sleep(300); const p = await t.ev(`${ST}.prompt.text`); await tap('T'); await t.waitFor(`${ST}.chat !== null`, 8000, 'chat opened'); await t.waitFor(`${ST}.chat && ${ST}.chat.busy === false`, 15000, 'first reply'); await sleep(1800); return 'prompt: ' + p + '; reply: ' + await t.ev(`${ST}.chatText.text`); });
  await step('bar-chat-j-while-open', async () => { await t.press('J'); await sleep(600); const sc = await panels(); if (/Journal/.test(sc)) { await t.press('J'); await sleep(400); } return 'J while chatting opened: ' + sc + ' (a chat and the Journal at once would be two screens on one key)'; });
  await step('bar-chat-tab-while-open', async () => { await t.press('TAB'); await sleep(600); const sc = await panels(); if (/Overlay/.test(sc)) { await t.press('TAB'); await sleep(400); } return 'Tab while chatting opened: ' + sc; });
  await step('bar-chat-say', async () => { await t.ev(`(() => { const el = document.querySelector('input'); if (el) el.value = 'What is the best way to the planet?'; return 1; })()`); await t.ev(`(${ST}.chat.lastSend = 0, 1)`); await t.ev(`(() => { const el = document.querySelector('input'); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return 1; })()`); await t.waitFor(`${ST}.chat && ${ST}.chat.busy === false && __calls.length >= 2`, 15000, 'second reply'); await sleep(1800); return 'calls ' + await t.ev('__calls.length'); });
  await step('bar-chat-closed', async () => { await t.ev(`(() => { const el = document.querySelector('input'); el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return 1; })()`); await t.waitFor(`${ST}.chat === null`, 8000, 'chat closed'); await sleep(800); return 'inputs left ' + await t.ev("document.querySelectorAll('input').length") + ', scenes ' + await panels() + ', summary calls ' + await t.ev('__calls.length'); });
  await step('journal', async () => { await t.press('J'); await active('Journal', 8000); await sleep(700); return 'scenes ' + await panels() + '; people: ' + await t.ev('Object.keys(G.chat.npcs).join(",")') + '; facts ' + await t.ev('G.chat.journal.length'); });
  await step('journal-esc-over-journal', async () => { await t.press('ESC'); await sleep(700); return 'after Esc: ' + await panels() + ' (Esc should close the Journal, not also open Pause)'; });
  await step('pause', async () => { if (await t.ev("game.scene.isActive('Journal')")) { await t.press('J'); await sleep(400); } await t.press('ESC'); await active('Pause', 8000); await sleep(500); return 'rows: ' + await t.ev(`game.scene.getScene('Pause').rows.map(r => r.text.trim()).join(' | ')`); });
  await step('pause-controls', async () => { await t.ev(`(() => { const p = game.scene.getScene('Pause'); p.sel = 2; p.activate(2); return 1; })()`); await sleep(500); return 'view ' + await t.ev(`game.scene.getScene('Pause').view`); });
  await step('pause-tab-over-pause', async () => { await t.press('TAB'); await sleep(600); const sc = await panels(); return 'Tab over Pause: ' + sc; });
  await step('pause-closed', async () => { for (let i = 0; i < 3 && (await t.ev("game.scene.isActive('Overlay') || game.scene.isActive('Pause')")); i++) { await t.press('ESC'); await sleep(500); } return 'scenes ' + await panels(); });
  await step('map', async () => { await t.press('TAB'); await active('Overlay', 8000); await sleep(700); return 'scenes ' + await panels(); });
  await step('map-closed', async () => { await t.press('TAB'); await sleep(500); return 'scenes ' + await panels(); });
  await step('repair-price', async () => { await t.ev('(G.hull = 40, G.credits = 500, 1)'); await walkTo(640, 272); await sleep(300); const p = await t.ev(`${ST}.prompt.text`); await t.press('E'); await sleep(900); return 'prompt: ' + p + '; hull now ' + await t.ev('G.hull') + ', credits ' + await t.ev('G.credits') + ' (expected 60 points at half a credit = 30 cr)'; });
  await step('shop', async () => { await walkTo(1000, 244); await sleep(300); const p = await t.ev(`${ST}.prompt.text`); await t.press('E'); await sleep(800); return 'prompt: ' + p + '; shop open ' + await t.ev(`${ST}.shopOpen`); });
  await step('shop-buy-armor', async () => { await t.press('1'); await sleep(700); return 'armor tier ' + await t.ev('G.upgrades.armor') + ', credits ' + await t.ev('G.credits') + ', maxHull ' + await t.ev('G.maxHull') + '; msg: ' + await t.ev(`${ST}.shopMsgText.text`); });
  await step('shop-closed', async () => { await t.press('ESC'); await sleep(500); return 'shop open ' + await t.ev(`${ST}.shopOpen`) + ', scenes ' + await panels(); });
  await step('missions-board', async () => { await walkTo(200, 272); await sleep(300); await t.press('E'); await sleep(900); return 'panel ' + await t.ev(`${ST}.panel`) + ', title: ' + await t.ev(`${ST}.ui.titleText.text`); });
  await step('missions-accept-rescue', async () => { await t.press('1'); await sleep(300); await t.press('E'); await sleep(800); return 'mission ' + await t.ev('G.mission') + ' ' + await t.ev('G.missionId'); });
  await step('ship-bay', async () => { await walkTo(1090, 440); await sleep(300); const p = await t.ev(`${ST}.prompt.text`); await t.press('E'); await active('Ship', 10000); await sleep(1200); return 'prompt: ' + p + '; scenes ' + await panels(); });
  await step('ship-bay-tab', async () => { await t.press('TAB'); await sleep(600); const sc = await panels(); if (/Overlay/.test(sc)) { await t.press('TAB'); await sleep(400); } return 'Tab in the bay: ' + sc; });
  const saved = await t.ev('JSON.stringify(snapshot())');
  await step('launch', async () => { await t.press('ENTER'); await active('Space', 15000); await sleep(600); await t.clock(); await t.run(4000); return 'from ' + await t.ev(`${SP}.from`) + ', grace cap ' + await t.ev(`pirateCap(${SP}, ${SP}.time.now)`) + ', toast: ' + await t.ev(`(${SP}.children.list.filter(o => o.text && o.scrollFactorX === 0).map(o => o.text).join(' | ')).slice(0, 120)`); });
  await step('undock-grace-end', async () => { await hold('W', true); for (let i = 0; i < 10; i++) await t.run(1800); await hold('W', false); return 'hull ' + await t.ev('G.hull') + ' after 22 s, pirates engaged ' + await t.ev(`${SP}.enemies.getChildren().filter(d => d.active && d.calm === false && Phaser.Math.Distance.Between(d.x, d.y, ${SP}.ship.x, ${SP}.ship.y) < 1000).length`) + ', cap ' + await t.ev(`pirateCap(${SP}, ${SP}.time.now)`); });
  await step('first-fight', async () => { await t.ev(`(() => { const s = ${SP}; s.ship.body.setVelocity(0, 0); s.enemies.clear(true, true); const d = spawnPirate(s, s.ship.x + 420, s.ship.y, 'raider'); d.rotation = Math.PI; return 1; })()`); for (let i = 0; i < 6; i++) await t.run(1000); return 'hull ' + await t.ev('G.hull') + ' after 6 s with one raider at 420 px, enemy bullets ' + await t.ev(`${SP}.eb.countActive()`); });
  await step('bounty', async () => { await t.ev(`(() => { const s = ${SP}; s.enemies.clear(true, true); s.eb.getChildren().forEach(b => b.disableBody(true, true)); const d = spawnPirate(s, s.ship.x + 260, s.ship.y, 'drone'); d.hp = 10; const b = s.pb.get(d.x - 40, d.y); b.enableBody(true, d.x - 40, d.y, true, true); b.born = s.time.now; b.body.setVelocity(900, 0); return 1; })()`); const c0 = await t.ev('G.credits'); await t.run(250); return 'credits ' + c0 + ' -> ' + await t.ev('G.credits') + '; bounty text on screen: ' + await t.ev(`${SP}.children.list.some(o => o.text && /BOUNTY/.test(o.text))`); });
  await step('nav-list', async () => { await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(1600, 6400); s.ship.body.setVelocity(0, 0); s.enemies.clear(true, true); return 1; })()`); await t.run(300); await skey('N'); await t.run(300); return 'nav open: ' + await t.ev(`${SP}.cr.navOpen`) + '; rows: ' + (await t.ev(`${SP}.cr.rows.filter(r => r.name.visible).map(r => r.name.text + ' ' + r.km.text + ' ' + r.eta.text).join(' | ')`)); });
  await step('nav-target', async () => { await skey('ENTER'); await t.run(300); return 'nav open now: ' + await t.ev(`${SP}.cr.navOpen`) + '; target: ' + await t.ev(`${SP}.cr.target ? ${SP}.cr.target.name : 'none'`); });
  await step('cruise', async () => { await skey('C'); for (let i = 0; i < 4; i++) await t.run(800); return 'cruising ' + await t.ev(`${SP}.cruising`) + ', speed ' + Math.round(await t.ev(`${SP}.ship.body.speed`)) + ' px/s, hull ' + await t.ev('G.hull'); });
  await step('cruise-arrive', async () => { for (let i = 0; i < 20 && (await t.ev(`${SP}.cruising`)); i++) await t.run(1500); return 'cruising ' + await t.ev(`${SP}.cruising`) + ', speed ' + Math.round(await t.ev(`${SP}.ship.body.speed`)) + ', at ' + Math.round(await t.ev(`${SP}.ship.x`)) + ',' + Math.round(await t.ev(`${SP}.ship.y`)); });
  await step('dock', async () => { await t.ev(`(() => { const s = ${SP}; s.ship.setPosition(s.station.x + 200, s.station.y); s.ship.body.setVelocity(0, 0); s.enemies.clear(true, true); return 1; })()`); await t.run(400); const p = await t.ev(`${SP}.prompt.text`); await t.key('L'); await t.run(2500); await sleep(500); return 'prompt: ' + p + '; scenes ' + await panels(); });
  await step('docked-summary', async () => { await t.waitFor("game.scene.isActive('Station')", 15000, 'back in the station'); await sleep(1500); return 'credits ' + await t.ev('G.credits') + ', hull ' + await t.ev('G.hull') + ', toasts: ' + await t.ev(`(${ST}.children.list.filter(o => o.text && o.depth >= 100 && o.y < 240).map(o => o.text).join(' | ')).slice(0, 160)`); });
  await step('save-reload', async () => {
    await t.ev('saveGame(true)');
    const before = await t.ev('JSON.stringify(snapshot())');
    await t.send('Page.navigate', { url: 'file://' + (await t.ev('location.pathname')) });
    await sleep(1500); await active('Title'); await sleep(800);
    await t.press('SPACE'); await active('Station', 15000); await sleep(1200);
    const after = await t.ev('JSON.stringify(snapshot())');
    const same = before === after;
    return (same ? 'the save survives a reload byte for byte' : 'reload changed the save: before ' + before.slice(0, 200) + ' after ' + after.slice(0, 200)) + '; launch snapshot was ' + saved.length + ' chars';
  });
  await step('reload-journal-kept', async () => 'people after reload: ' + await t.ev('Object.keys((G.chat || {}).npcs || {}).join(",")') + ', chat key status ' + await t.ev('chatStatus()'));
  await t.ev(`(chatSetKey(''), 1)`);
} finally { await t.close(); }

// ---- 3. the surface ----
t = await launch('#surface'); errSeen = 0;
try {
  await active('Surface');
  await sleep(1500);
  await step('surface', async () => 'controls panel shown: ' + await t.ev(`!!(game.scene.getScene('Surface').ctl && game.scene.getScene('Surface').ctl.box.visible)`));
  await step('surface-controls-again', async () => { await sleep(7000); const gone = !(await t.ev(`game.scene.getScene('Surface').ctl.box.visible`)) || (await t.ev(`game.scene.getScene('Surface').ctl.box.alpha`)) < 0.5; await t.press('C'); await sleep(500); return 'faded by 8 s: ' + gone + '; C brings it back: ' + await t.ev(`game.scene.getScene('Surface').ctl.box.visible && game.scene.getScene('Surface').ctl.box.alpha > 0.5`); });
  await step('surface-pause-and-map', async () => { await t.press('ESC'); await sleep(500); const a = await panels(); await t.press('ESC'); await sleep(400); await t.press('TAB'); await sleep(500); const b = await panels(); await t.press('TAB'); await sleep(300); return 'Esc: ' + a + '; Tab: ' + b; });
} finally { await t.close(); }

writeFileSync(join(OUT, 'playtest2.json'), JSON.stringify(results, null, 1));
const look = results.filter(r => !r.ok || r.errors.length);
console.log(`\nplaytest2: ${results.length} steps, ${look.length} to look at: ${look.map(r => r.step).join(', ') || 'none'}; details in tests/out/playtest2.json`);
