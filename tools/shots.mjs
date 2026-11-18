// not in the smoke: the fixed pictures for the blind critic, run by hand
// Ten fixed pictures of the game for a critic that never sees the code (card space-game-blind-critic; docs/CRITIC.md says how they are judged).
//   node tools/shots.mjs            every picture, into tests/out/critic/ (01-title.png ... 10-settings.png)
//   node tools/shots.mjs 04 07      only the pictures whose name starts with one of these
//   node tools/shots.mjs --look     the first-look views instead (card space-game-first-look, docs/FIRSTLOOK.md): screens that landed on logic tests
//                                   only, drawn once in a 1458 px wide window (the owner's), into tests/out/firstlook/. --look nav menu takes
//                                   only the views whose name has one of those words.
// One Chrome (muted, through the test lock: tests/cdp.mjs), one page per picture, the game clock stepped by hand, so the same commit gives the
// same pictures however busy the Mac is. Each picture is taken twice: the first capture after a step can be a frame behind.
// The list is fixed on purpose: a critic's findings can be compared from one run to the next only when the pictures are the same ones.
// Exit code 1 when a picture could not be taken or the game logged an error while it was set up.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { launch, OUT } from '../tests/cdp.mjs';

const sc = k => `game.scene.getScene('${k}')`;
const SP = sc('Space'), ST = sc('Station');
const up = k => `!!(window.game && game.scene.isActive('${k}'))`;

// name, the page's #hash, the scene to wait for, then what to do before the picture (t is the driver; the clock is already stepped)
const SHOTS = [
  ['01-title', '', 'Title', async t => { await t.run(1500); }],
  ['02-station-lounge', '#station', 'Station', async t => { await t.ev(`(() => { ${ST}.player.setPosition(440, 560); return 1; })()`); await t.run(1200); }],
  ['03-station-hangar', '#station', 'Station', async t => { await t.ev(`(() => { ${ST}.player.setPosition(1040, 360); return 1; })()`); await t.run(1200); }],
  ['04-space-fight', '#space', 'Space', async t => { // three pirates close by, the ship moving (as tests/hudshots.mjs)
    await t.run(1500);
    await t.ev(`(() => { const s = ${SP}, a = s.ship; [[420, -120], [-300, 260], [650, 300]].forEach(([dx, dy]) => s.spawnDrone(a.x + dx, a.y + dy)); a.body.setVelocity(300, 0); a.setRotation(0); return 1; })()`);
    await t.run(900);
  }],
  ['05-space-assist-target', '#space', 'Space', async t => { // the flight assist on, the gate as its target, Keep at range in force
    await t.run(1500);
    await t.ev(`(() => { const s = ${SP}; if (typeof assistOn !== 'function') return 0; assistOn(s, true); s.cr.target = sysBody('gate'); assistSet('keep', null, 500); return 1; })()`);
    await t.run(3500);
  }],
  ['06-escort', '#escort', 'Space', async t => { await t.run(7000); }],
  ['07-surface', '#surface', 'Surface', async t => { await t.run(2500); }],
  ['08-tab-map', '#space', 'Space', async t => { await t.run(1500); await t.ev(`(() => { toggleOverlay(game, 'map'); return 1; })()`); await t.run(800); }],
  ['09-galaxy-map', '#galaxy', 'Galaxy', async t => { await t.run(2000); }],
  ['10-settings', '', 'Title', async t => { await t.run(1000); await t.key('S'); await t.run(1200); if (!(await t.ev(up('Settings')))) throw new Error('S did not open Settings'); }]
];

// First look (docs/FIRSTLOOK.md): one view per screen that landed without a browser test. Not the critic's list: these come and go with the cards.
// A view that asks for something the checkout does not have yet (a card not merged) fails with its own message, it does not take a wrong picture.
const need = (t, expr, what) => t.ev(expr).then(ok => { if (!ok) throw new Error('not in this checkout: ' + what); });
// from where the ship launches to the farthest body of the system, the way the navigation panel sends you (the autopilot flies clear of the station,
// cruises the middle and brings you in): start it, run it for `secs` of game time or until it lets go, say what happened
const farCruise = secs => async t => {
  await t.run(1500);
  const far = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; s.lockUntil = 0;
    const b = cruiseKnown(s).slice().sort((a, c) => c.dist - a.dist)[0]; const ok = autopilotGo(s, b);
    return { name: b.name, type: b.type, km: Math.round(b.dist / 10), cruising: ok, world: [s.physics.world.bounds.width, s.physics.world.bounds.height] }; })())`));
  let ran = 0; const step = 2;
  let cruised = false;
  while (ran < secs) { await t.run(step * 1000); ran += step; if (await t.ev(`!!${SP}.cruising`)) cruised = true; if (!(await t.ev(`!!(${SP}.ap && ${SP}.ap.on)`))) break; }
  const end = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}, k = cruiseKnown(s).find(x => x.name === ${JSON.stringify(far.name)}); return { cruising: !!s.cruising, ap: !!(s.ap && s.ap.on), v: Math.round(s.ship.body.speed), left: k ? Math.round(k.dist / 10) : null, x: Math.round(s.ship.x), y: Math.round(s.ship.y) }; })())`));
  console.log(`        cruise to ${far.name} (${far.type}), ${far.km} km away, world ${far.world.join(' x ')} px: autopilot took it ${far.cruising}; after ${ran} s of game time: cruised ${cruised}, cruising now ${end.cruising}, autopilot on ${end.ap}, ${end.left} km left, ${end.v} px/s`);
};
// take the courier run from Halcyon to Kestrel at the board and launch: the Space scene is up, the launch lock over
const takeJob = async (t, id = 'courier-halcyon-kestrel') => {
  await t.run(800);
  if (!(await t.ev(`missionsOffered().some(m => m.id === '${id}')`))) throw new Error('the board at Halcyon does not post ' + id + ': it posts ' + await t.ev(`missionsOffered().map(m => m.id).join(', ')`));
  await t.ev(`(() => { pickMission('${id}'); G.mission = 'accepted'; missionAccepted(); ${ST}.scene.start('Space'); return 1; })()`);
  for (let i = 0; i < 40 && !(await t.ev(up('Space'))); i++) await t.run(250); // the clock is stepped by hand: the new scene starts on a frame we give it
  if (!(await t.ev(up('Space')))) throw new Error('the Space scene did not start after the launch');
  await t.run(2500);
  await t.ev(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; return 1; })()`);
};
// a carry job of Halcyon taken and followed by its own row: Enter twice on the row (the galaxy map), Enter there (the jump), then Enter twice on its row in the other system (the dock)
const followJob = (id, sys) => async t => {
    await takeJob(t, id);
    const pick = () => t.ev(`JSON.stringify((() => { const s = ${SP}; cruiseNavOpen(s); const i = s.cr.list.findIndex(r => r.group === 'mission'); if (i < 0) return { none: true, rows: s.cr.list.map(r => r.group + ':' + r.name) }; navpanelClick(s, i); navpanelClick(s, i); return { row: s.cr.list[i].name, kind: s.cr.list[i].kind, jump: !!s.jmp, ap: !!(s.ap && s.ap.on) }; })())`);
    const wait = async (expr, secs) => { let ran = 0; while (ran < secs) { await t.run(2000); ran += 2; try { if (await t.ev(expr)) break; } catch (e) { /* between scenes */ } } return ran; };
    console.log('        in ' + await t.ev('G.system') + ', job row twice: ' + await pick());
    await t.run(1500);
    if (await t.ev(up('Galaxy'))) { console.log('        the galaxy map opened at ' + await t.ev(`JSON.stringify((() => { const g = game.scene.getScene('Galaxy'); return g.sel !== undefined ? (g.sel && g.sel.id) || g.sel : null; })())`) + ': Enter'); await t.key('ENTER'); }
    const a = await wait(`G.system === '${sys}' && ${up('Space')}`, 120);
    console.log('        after ' + a + ' s of game time: system ' + await t.ev('G.system') + ', scenes up: ' + await t.ev(`JSON.stringify(game.scene.getScenes(true).map(x => x.scene.key))`));
    if (await t.ev(`G.system === '${sys}' && ${up('Space')}`)) {
      await t.run(3000);
      console.log('        in ' + sys + ', job line: ' + await t.ev('navpanelJob()') + '; job row twice: ' + await pick());
      const b = await wait(up('Station'), 180);
      console.log('        after ' + b + ' s more: ' + ((await t.ev(up('Station'))) ? 'docked at ' + await t.ev('G.lastDock') + ', credits ' + await t.ev('G.credits') + ', call ' + await t.ev('G.mission') : 'not docked: ' + await t.ev(`JSON.stringify((() => { const s = ${SP}; return { ap: !!(s.ap && s.ap.on), stage: s.ap && s.ap.stage, cruising: !!s.cruising, prompt: s.prompt && s.prompt.text }; })())`)));
    }
    await t.run(1500);
  };
// ---- the Sol pack (mods/sol, card space-game-sol-pack): a mod, so it is off until it is switched on and the page restarted ----
const pic = async (t, name) => { await t.shot('firstlook/' + name); if (!(await t.shot('firstlook/' + name))) throw new Error('the picture ' + name + ' could not be taken'); };
// a key the driver's table does not have (O), as a real key press
const rawKey = async (t, vk, code, key) => { await t.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, code, key }); await t.run(60); await t.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, code, key }); await t.run(400); };
// Sol switched on as the Mods screen does it (the same stored list), then the page reloaded, which is the restart the screen asks for; the scene is up and the clock stepped again
const solOn = async (t, scene) => {
  await t.ev(`(() => { modsSetOn('sol', true); location.reload(); return 1; })()`);
  await t.waitFor(up(scene), 30000, scene + ' active after the restart with Sol on'); await t.clock(); await t.run(1500);
  if (!(await t.ev(`Object.prototype.hasOwnProperty.call(SYSTEMS, 'sol')`))) throw new Error('Sol is on but SYSTEMS has no sol: ' + await t.ev(`JSON.stringify({ on: modsOnList(), errors: (typeof CONTENT_ERRORS !== 'undefined' ? CONTENT_ERRORS : []).slice(0, 4) })`));
};
// jump from Halcyon to Sol through the galaxy map; the Space scene of Sol is up
const solJump = async t => {
  await t.ev(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; s.lockUntil = 0; if (!G.known.includes('sol')) G.known.push('sol'); return jumpMapOpen(game, 'sol'); })()`);
  await t.run(1200);
  if (!(await t.ev(up('Galaxy')))) throw new Error('the galaxy map did not open');
  await pic(t, 'sol-galaxy');
  console.log('        galaxy map: ' + await t.ev(`JSON.stringify((() => { const here = galaxyFind(G.system), g = galaxyFind('sol'), j = g && galaxyJump(here, g); return g ? { name: g.name, ly: j.ly, cost: j.cost, ok: j.ok, why: j.why || null, fuel: G.fuel } : { missing: true }; })())`));
  await t.key('ENTER');
  let ran = 0; while (ran < 90) { await t.run(2000); ran += 2; try { if (await t.ev(`G.system === 'sol' && ${up('Space')}`)) break; } catch (e) { /* between scenes */ } }
  if (!(await t.ev(`G.system === 'sol' && ${up('Space')}`))) throw new Error('not in Sol after ' + ran + ' s: system ' + await t.ev('G.system') + ', scenes ' + await t.ev(`JSON.stringify(game.scene.getScenes(true).map(x => x.scene.key))`));
  await t.run(3000);
  await t.ev(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; return 1; })()`);
  return ran;
};
// the autopilot to a body of the system by name; resolves when it lets go (or after `secs`); says how it went
const solFly = async (t, name, secs = 90) => {
  const o = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; const b = cruiseKnown(s).find(x => x.name === '${name}'); if (!b) return { none: cruiseKnown(s).map(x => x.name) }; return { ok: autopilotGo(s, b), km: Math.round(b.dist / 10) }; })())`));
  if (o.none) throw new Error(name + ' is not a body the nav list knows: ' + o.none.join(', '));
  let ran = 0, cruised = false; while (ran < secs) { await t.run(2000); ran += 2; if (await t.ev(`!!${SP}.cruising`)) cruised = true; if (!(await t.ev(`!!(${SP}.ap && ${SP}.ap.on)`))) break; }
  const end = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}, b = cruiseKnown(s).find(x => x.name === '${name}'); return { left: Math.round(b.dist / 10), ap: !!(s.ap && s.ap.on), v: Math.round(s.ship.body.speed) }; })())`));
  console.log(`        to ${name}: ${o.km} km, autopilot took it ${o.ok}; after ${ran} s of game time: ${end.left} km left, cruised ${cruised}, autopilot on ${end.ap}`);
};
const LOOKS = [
  ['far-cruise-mid', '#space', 'Space', farCruise(20)],      // the systems are 3 times the size (card space-game-system-distances): 8 s into a cruise to the farthest body
  ['far-cruise-end', '#space', 'Space', farCruise(180)],    // and where that cruise ends (or where it is after 3 minutes of game time)
  ['far-map', '#space', 'Space', async t => { await t.run(1500); await t.ev(`(() => { toggleOverlay(game, 'map'); return 1; })()`); await t.run(800); }], // the Tab map of the bigger system
  ['nav-panel', '#space', 'Space', async t => { // N: the navigation panel with the keys, a row chosen
    await need(t, `typeof navpanelOpen === 'function'`, 'src/navpanel.js'); await t.run(1500);
    await t.ev(`(() => { const s = ${SP}; cruiseNavOpen(s); return 1; })()`); await t.run(600);
  }],
  ['nav-panel-set', '#space', 'Space', async t => { // a destination set: the pinned line and the foot line that says how to go
    await need(t, `typeof navpanelOpen === 'function'`, 'src/navpanel.js'); await t.run(1500);
    await t.ev(`(() => { const s = ${SP}; cruiseNavOpen(s); const i = s.cr.list.findIndex(r => r.kind === 'body' && r.type === 'planet'); s.cr.sel = Math.max(0, i); navpanelClick(s, s.cr.sel); return 1; })()`); await t.run(600);
  }],
  ['station-menu', '#station', 'Station', async t => { await need(t, `!!${ST}.menu`, 'the station menu (src/station.js)'); await t.run(1200); }],
  ['station-menu-walk', '#station', 'Station', async t => { // N: the keys with your feet, the menu dimmed; the pilot stood at the repair bay by key
    await need(t, `!!${ST}.menu`, 'the station menu (src/station.js)'); await t.run(600);
    await t.ev(`(() => { const s = ${ST}; s.menuPick('repair'); return 1; })()`); await t.run(300);
    await t.ev(`(() => { const s = ${ST}; s.menu.k.N._justDown = true; return 1; })()`); await t.run(600);
  }],
  ['station-menu-roost', '#station', 'Station', async t => { // a dock with rows it does not have: dim, with the reason
    await need(t, `!!${ST}.menu`, 'the station menu (src/station.js)');
    await t.ev(`(() => { G.system = 'roost'; G.lastDock = 'roost-dock'; ${ST}.scene.restart(); return 1; })()`); await t.run(1500);
  }],
  ['overview-orders', '#space', 'Space', async t => { // the Overview list with an order of the flight assist in its target row
    await need(t, `typeof overviewSetup === 'function' || typeof overviewFrame === 'function'`, 'src/overview.js'); await t.run(1500);
    await t.ev(`(() => { const s = ${SP}, a = s.ship; [[420, -120], [-300, 260]].forEach(([dx, dy]) => s.spawnDrone(a.x + dx, a.y + dy)); if (typeof assistOn === 'function') { assistOn(s, true); s.cr.target = sysBody('gate'); assistSet('keep', null, 500); } overviewShow(s, true, false); return 1; })()`);
    await t.run(2500);
  }],
  ['sky', '#space', 'Space', async t => { await t.run(2000); }], // the sky with no backdrop sun, giant or moon: only real bodies
  // ---- round 2 ----
  ['star', '#space', 'Space', async t => { // the star is a real body at the centre of the system (card space-game-real-solar-system): the ship 80 px off its rim, nose at it
    await need(t, `typeof sysStar === 'function'`, 'the star as a body (src/universe.js)'); await t.run(1200);
    const o = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}, b = sysBodies().find(x => x.type === 'star'); if (!b) return { none: true }; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ship.setPosition(b.x + (b.r || 300) + 80, b.y + 250); s.ship.setVelocity(0, 0); s.ship.rotation = Math.PI; s.cameras.main.centerOn(s.ship.x, s.ship.y); return { name: b.name, r: b.r, x: b.x, y: b.y }; })())`));
    if (o.none) throw new Error('no star body in this system'); console.log('        the star: ' + JSON.stringify(o));
    await t.run(1500);
  }],
  ['radar-fight', '#space', 'Space', async t => { // the radar is always the system now: hostiles are red dots over your mark (three raiders close by)
    await t.run(1500);
    await t.ev(`(() => { const s = ${SP}, a = s.ship; [[420, -120], [-300, 260], [650, 300]].forEach(([dx, dy]) => s.spawnDrone(a.x + dx, a.y + dy)); return 1; })()`); await t.run(1200);
  }],
  ['one-target', '#space', 'Space', async t => { // one way to pick a target (card space-game-one-way-to-target): places in the navigation panel, ships in the Overview, both open
    await t.run(1500);
    await t.ev(`(() => { const s = ${SP}, a = s.ship; [[420, -120], [-300, 260]].forEach(([dx, dy]) => s.spawnDrone(a.x + dx, a.y + dy)); cruiseNavOpen(s); overviewShow(s, true, false); return 1; })()`); await t.run(1500);
    console.log('        overview rows: ' + await t.ev(`JSON.stringify((${SP}.ov && ${SP}.ov.rows || []).map(r => r.name + (r.ship ? '' : ' (place)')))`));
  }],
  ['map-dest', '#space', 'Space', async t => { // the Tab map picks nothing now: it rings the destination set in the navigation panel
    await t.run(1500);
    await t.ev(`(() => { const s = ${SP}; cruiseNavOpen(s); const i = s.cr.list.findIndex(r => r.kind === 'body' && r.type === 'planet'); navpanelClick(s, Math.max(0, i)); toggleOverlay(game, 'map'); return 1; })()`); await t.run(800);
  }],
  ['dock-order', '#space', 'Space', async t => { // Dock as an order (card space-game-dock-by-command): Enter twice on the station row; the picture is 4 s in
    await t.run(1500);
    const o = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; s.lockUntil = 0; s.ship.setPosition(s.station.x + 1800, s.station.y + 300); s.ship.setVelocity(0, 0);
      cruiseNavOpen(s); const i = s.cr.list.findIndex(r => r.kind === 'body' && r.type === 'station'); navpanelClick(s, i); navpanelClick(s, i); return { row: s.cr.list[i] && s.cr.list[i].name, ap: !!(s.ap && s.ap.on), order: s.ap && s.ap.order || null }; })())`));
    await t.run(4000);
    const mid = await t.ev(`JSON.stringify((() => { const s = ${SP}; return { ap: !!(s.ap && s.ap.on), stage: s.ap && s.ap.stage, read: s.ap && s.ap.read && s.ap.read.text, v: Math.round(s.ship.body.speed) }; })())`);
    console.log('        Enter twice on ' + o.row + ': autopilot ' + o.ap + ', order ' + JSON.stringify(o.order) + '; 4 s in: ' + mid);
  }],
  ['dock-order-end', '#space', 'Space', async t => { // and where that order ends: docked (the Station scene) inside a minute of game time, or where it is then
    await t.run(1500);
    await t.ev(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; s.lockUntil = 0; s.ship.setPosition(s.station.x + 1800, s.station.y + 300); s.ship.setVelocity(0, 0);
      cruiseNavOpen(s); const i = s.cr.list.findIndex(r => r.kind === 'body' && r.type === 'station'); navpanelClick(s, i); navpanelClick(s, i); return 1; })()`);
    let ran = 0; while (ran < 60) { await t.run(2000); ran += 2; if (await t.ev(up('Station'))) break; }
    console.log('        after ' + ran + ' s of game time: ' + ((await t.ev(up('Station'))) ? 'docked, the Station scene is up' : 'not docked: ' + await t.ev(`JSON.stringify((() => { const s = ${SP}; return { ap: !!(s.ap && s.ap.on), stage: s.ap && s.ap.stage, d: Math.round(Math.hypot(s.ship.x - s.station.x, s.ship.y - s.station.y)), v: Math.round(s.ship.body.speed), prompt: s.prompt.text }; })())`)));
    await t.run(1500);
  }],
  ['board', '#station', 'Station', async t => { // the mission board (card space-game-bug-runs-out-of-jump-range: runs out of jump range are dimmed, four drawing edits never drawn)
    await t.run(1200); await t.ev(`(() => { ${ST}.openPanel(); return 1; })()`); await t.run(800);
    console.log('        board: ' + await t.ev(`JSON.stringify((() => { const s = ${ST}; return { offered: missionsOffered().map(m => m.id + (typeof jumpReach === 'function' && m.system && m.system !== G.system ? ':' + JSON.stringify(jumpReach(m.system)) : '')), texts: s.boardObjs.filter(o => o.type === 'Text').map(o => o.text.replace(/\\n/g, ' / ')).slice(0, 40) }; })())`));
  }],
  ['board-dim', '#station', 'Station', async t => { // the same, flown in a ship with 7 light years of jump range: the Brass and Hollow runs are out of reach, so dimmed, and E does nothing on them
    await t.run(1200); await t.ev(`(() => { const s = ${ST}, real = shipStat; shipStat = (k, r) => (k === 'range' ? 7 : real(k, r)); s.openPanel(); for (let i = 0; i < missionsOffered().length - 1; i++) s.boardKeys({ key: 'ArrowRight' }); return 1; })()`); await t.run(800);
    console.log('        reach at 7 ly: ' + await t.ev(`JSON.stringify(missionsOffered().map(m => m.id + ' ' + (missionReach(m).ok ? 'ok' : missionReach(m).why)))`) + '; can accept the chosen one: ' + await t.ev(`!!${ST}.canAccept`));
  }],
  ['board-far', '#station', 'Station', async t => { // the last call of the board chosen: the far runs, dimmed when the ship you fly cannot reach them
    await t.run(1200); await t.ev(`(() => { const s = ${ST}; s.openPanel(); for (let i = 0; i < missionsOffered().length - 1; i++) s.boardKeys({ key: 'ArrowRight' }); return 1; })()`); await t.run(800);
    console.log('        reach: ' + await t.ev(`JSON.stringify(missionsOffered().map(m => m.id + ' ' + (missionReach(m).ok ? 'ok' : missionReach(m).why)))`) + '; can accept the chosen one: ' + await t.ev(`!!${ST}.canAccept`));
  }],
  // ---- round 3: the job shows the way (card space-game-job-shows-the-way) ----
  ['job-board', '#station', 'Station', async t => { // the courier run to Kestrel chosen on the board: its where line names the place and the star system
    await t.run(1200); await t.ev(`(() => { const s = ${ST}; s.openPanel(); const i = missionsOffered().findIndex(m => m.id === 'courier-halcyon-kestrel'); for (let k = 0; k < i; k++) s.boardKeys({ key: 'ArrowRight' }); return 1; })()`); await t.run(800);
  }],
  ['job-nav', '#station', 'Station', async t => { // the courier taken, launched, N: the job line and the pinned row that says where to go
    await takeJob(t); await t.ev(`(() => { cruiseNavOpen(${SP}); return 1; })()`); await t.run(800);
    console.log('        ' + await t.ev(`JSON.stringify({ job: navpanelJob(), step: missionStep(), rows: ${SP}.cr.list.filter(r => r.group === 'mission').map(r => r.kind + ' ' + r.name + (r.ok === false ? ' (no: ' + r.why + ')' : '')) })`));
  }],
  ['job-follow', '#station', 'Station', followJob('courier-halcyon-kestrel', 'kestrel')],
  ['job-courier-brass', '#station', 'Station', followJob('courier-halcyon-brass', 'brass')], // the other courier run of Halcyon (card space-game-routes-from-files: the runs come from content files)
  ['job-haul-brass', '#station', 'Station', followJob('haul-halcyon-brass', 'brass')],       // and the haul: freight in the hold, paid by what arrives
  ['radar-cruise', '#space', 'Space', async t => { // the minimap at cruise speed (card space-game-minimap-ship-centred: the scale follows speed): 6 s into the trip to the farthest body
    await t.run(1500);
    await t.ev(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; s.lockUntil = 0; const b = cruiseKnown(s).slice().sort((a, c) => c.dist - a.dist)[0]; autopilotGo(s, b); return 1; })()`);
    await t.run(6000);
    console.log('        6 s in: ' + await t.ev(`JSON.stringify((() => { const s = ${SP}; return { cruising: !!s.cruising, v: Math.round(s.ship.body.speed) }; })())`));
  }],
  ['play-escort', '#escort', 'Space', async t => { // one escort played to its end (card space-game-call-places-from-files: the places of the calls come from content files now)
    await t.run(2500);
    const start = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}, f = s.mx.freighter, g = sysBody('gate'); return { call: G.missionId, state: G.mission, mule: !!(f && f.active), toGate: f ? Math.round(Math.hypot(f.x - g.x, f.y - g.y) / 10) : null, gate: g.name, credits: G.credits, target: (missionTarget(s) || {}).name }; })())`));
    console.log('        start: ' + JSON.stringify(start));
    let ran = 0, shot = false;
    while (ran < 300) { // stay in her ring, keep the pirates off her: the route and the payout are what is looked at, not the fight
      await t.ev(`(() => { const s = ${SP}, f = s.mx && s.mx.freighter; s.ironUntil = 1e12; s.enemies.getChildren().slice().forEach(d => d.destroy()); if (f && f.active) { s.ship.setPosition(f.x - 120, f.y + 90); s.ship.setVelocity(f.body.velocity.x, f.body.velocity.y); s.ship.rotation = f.rotation; } return 1; })()`);
      await t.run(2000); ran += 2;
      if (!shot && ran >= 20) { shot = true; await t.shot('firstlook/play-escort-mid'); await t.shot('firstlook/play-escort-mid'); }
      if (await t.ev(`G.mission !== 'accepted'`)) break;
    }
    console.log('        after ' + ran + ' s of game time: ' + await t.ev(`JSON.stringify((() => { const s = ${SP}, f = s.mx && s.mx.freighter, g = sysBody('gate'); return { state: G.mission, credits: G.credits, mule: !!(f && f.active), toGate: f && f.active ? Math.round(Math.hypot(f.x - g.x, f.y - g.y) / 10) : null }; })())`));
    await t.run(1500);
  }],
  ['sol-mods', '', 'Title', async t => { // O on the title: the Mods screen lists the Sol pack; its row switched on by its number key
    await t.run(1000); await rawKey(t, 79, 'KeyO', 'o'); await t.run(800);
    if (!(await t.ev(up('ModsSetup')))) throw new Error('O did not open the Mods screen: scenes ' + await t.ev(`JSON.stringify(game.scene.getScenes(true).map(x => x.scene.key))`));
    const i = await t.ev(`modsAvailable().findIndex(p => p.name === 'sol')`);
    console.log('        packs listed: ' + await t.ev(`JSON.stringify(modsAvailable().map(p => p.name + (p.errors && p.errors.length ? ' (' + p.errors.length + ' problems)' : '')))`) + '; on before: ' + await t.ev('JSON.stringify(modsOnList())'));
    if (i < 0) throw new Error('the Sol pack is not in the list');
    await t.key(String(i + 1)); await t.run(800);
    console.log('        after key ' + (i + 1) + ': on ' + await t.ev('JSON.stringify(modsOnList())'));
  }],
  ['sol-arrive', '#space', 'Space', async t => { // Sol on, the page restarted, the jump from Halcyon: the galaxy map (sol-galaxy.png), then Sol with the navigation panel open
    await solOn(t, 'Space'); const ran = await solJump(t);
    console.log('        in Sol after ' + ran + ' s of game time; fuel ' + await t.ev('G.fuel') + '; bodies in the nav list: ' + await t.ev(`cruiseKnown(${SP}).length`) + '; world ' + await t.ev(`${SP}.physics.world.bounds.width`) + ' px');
    await t.ev(`(() => { cruiseNavOpen(${SP}); return 1; })()`); await t.run(800);
  }],
  ['sol-tour', '#space', 'Space', async t => { // Earth, Mars, Jupiter by autopilot and cruise (a picture at each: sol-earth.png, sol-mars.png, sol-jupiter.png), then the dock at Imbrium
    await solOn(t, 'Space'); await solJump(t);
    for (const name of ['Earth', 'Mars', 'Jupiter']) { await solFly(t, name); await t.run(1000); await pic(t, 'sol-' + name.toLowerCase()); }
    const d = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}; cruiseNavOpen(s); const i = s.cr.list.findIndex(r => r.kind === 'body' && r.type === 'station'); if (i < 0) return { none: true }; navpanelClick(s, i); navpanelClick(s, i); return { row: s.cr.list[i].name, km: Math.round(s.cr.list[i].dist / 10), ap: !!(s.ap && s.ap.on) }; })())`));
    let ran = 0; while (!d.none && ran < 120) { await t.run(2000); ran += 2; try { if (await t.ev(up('Station'))) break; } catch (e) { /* between scenes */ } }
    console.log('        dock order: ' + JSON.stringify(d) + '; after ' + ran + ' s: ' + ((await t.ev(up('Station'))) ? 'docked at ' + await t.ev('G.lastDock') : 'not docked: ' + await t.ev(`JSON.stringify((() => { const s = ${SP}; return { ap: !!(s.ap && s.ap.on), stage: s.ap && s.ap.stage, cruising: !!s.cruising, prompt: s.prompt && s.prompt.text }; })())`)));
    await t.run(1500);
  }],
  ['sol-neptune', '#space', 'Space', async t => { // Earth, then Earth to Neptune by autopilot and cruise, timed in seconds of game time (card space-game-sol-needs-bigger-systems)
    await solOn(t, 'Space'); await solJump(t);
    await solFly(t, 'Earth', 120);
    const t0 = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}, b = cruiseKnown(s).find(x => x.name === 'Neptune'); return b ? { km: Math.round(b.dist / 10) } : { none: true }; })())`));
    if (t0.none) throw new Error('Neptune is not in the nav list'); console.log('        Earth to Neptune: ' + t0.km + ' km');
    await solFly(t, 'Neptune', 600); await t.run(1000); await pic(t, 'sol-neptune');
    console.log('        world ' + await t.ev(`${SP}.physics.world.bounds.width`) + ' px, ship at ' + await t.ev(`JSON.stringify([Math.round(${SP}.ship.x), Math.round(${SP}.ship.y)])`));
  }],
  ['sol-moons', '#space', 'Space', async t => { // Jupiter's moons (the parent column): the ship 6,000 px off Jupiter; every moon image drawn (none missing), the nav list and the minimap
    await solOn(t, 'Space'); await solJump(t);
    const o = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}, j = sysBodies().find(x => x.name === 'Jupiter'); if (!j) return { none: true };
      s.ship.setPosition(j.x - 6000, j.y); s.ship.setVelocity(0, 0); s.ship.rotation = 0; s.cameras.main.centerOn(s.ship.x, s.ship.y);
      const moons = sysBodies('planet').filter(b => b.parent === j.id || ['Io', 'Europa', 'Ganymede', 'Callisto'].includes(b.name)).map(b => ({ name: b.name, parent: b.parent || null, d: Math.round(Math.hypot(b.x - j.x, b.y - j.y)), r: b.r }));
      return { jupiter: { x: j.x, y: j.y, r: j.r }, moons }; })())`));
    if (o.none) throw new Error('no Jupiter'); console.log('        Jupiter ' + JSON.stringify(o.jupiter) + '; moons: ' + JSON.stringify(o.moons));
    await t.run(1500);
    console.log('        images with a missing texture in the scene: ' + await t.ev(`${SP}.children.list.filter(o => o.type === 'Image' && o.texture && o.texture.key === '__MISSING').length`) + '; planet images: ' + await t.ev(`${SP}.children.list.filter(o => o.type === 'Image' && o.texture && /^planet-/.test(o.texture.key)).length`));
    await pic(t, 'sol-moons-far');
    await solFly(t, 'Io', 120); await t.run(1000); await pic(t, 'sol-moons-io');
    await t.ev(`(() => { cruiseNavOpen(${SP}); return 1; })()`); await t.run(600); await pic(t, 'sol-moons-nav');
  }],
  ['sol-jupiter-probe', '#space', 'Space', async t => { // what is drawn where the autopilot says Jupiter is
    await solOn(t, 'Space'); await solJump(t); await solFly(t, 'Jupiter', 120); await t.run(1000);
    console.log('        ' + await t.ev(`JSON.stringify((() => { const s = ${SP}, b = sysBodies().find(x => x.name === 'Jupiter'), near = o => Math.hypot(o.x - s.ship.x, o.y - s.ship.y) < 3000;
      return { ship: [Math.round(s.ship.x), Math.round(s.ship.y)], body: b && { x: b.x, y: b.y, r: b.r, kind: b.kind, d: Math.round(Math.hypot(b.x - s.ship.x, b.y - s.ship.y)) }, cam: [Math.round(s.cameras.main.scrollX), Math.round(s.cameras.main.scrollY), s.cameras.main.zoom],
        images: s.children.list.filter(o => o.type === 'Image' && o.scrollFactorX === 1 && near(o)).map(o => ({ key: o.texture.key, x: Math.round(o.x), y: Math.round(o.y), scale: +o.scaleX.toFixed(2), vis: o.visible, alpha: o.alpha, depth: o.depth, w: o.width })),
        cache: waPlanetCache.slice(), planets: sysBodies('planet').length }; })())`));
  }],
  ['clear-mass', '#space', 'Space', async t => { // Troy's bug beside Kepler-4b (card space-game-bug-travel-refuses-near-mass): C inside a mass limit flies clear, then cruises
    await t.run(1500);
    const o = JSON.parse(await t.ev(`JSON.stringify((() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); s.ironUntil = 1e12; s.lockUntil = 0;
      s.ship.setPosition(s.planet.x + s.planetR + 500, s.planet.y); s.ship.setVelocity(0, 0); s.cameras.main.centerOn(s.ship.x, s.ship.y);
      cruisePick(s, sysBody('gate')); cruiseEngage(s); return { cruising: !!s.cruising, ap: !!(s.ap && s.ap.on), stage: s.ap && s.ap.stage }; })())`));
    await t.run(3000); await t.ev(`(() => { window.__mid = 1; return 1; })()`);
    let ran = 3, cruised = false; while (ran < 40) { await t.run(1000); ran += 1; if (await t.ev(`!!${SP}.cruising`)) { cruised = true; break; } }
    console.log('        C beside the planet with the gate as target: at once ' + JSON.stringify(o) + '; cruising after ' + (cruised ? ran + ' s' : 'never in 40 s') + '; ' + await t.ev(`JSON.stringify((() => { const s = ${SP}; return { d: Math.round(Math.hypot(s.ship.x - s.planet.x, s.ship.y - s.planet.y)), v: Math.round(s.ship.body.speed) }; })())`));
  }]
];
const args = process.argv.slice(2), look = args.includes('--look'), want = args.filter(a => a !== '--look');
const list = look ? LOOKS.filter(([n]) => !want.length || want.some(w => n.includes(w))) : SHOTS.filter(([n]) => !want.length || want.some(w => n.startsWith(w)));
const dir = look ? 'firstlook' : 'critic';
mkdirSync(join(OUT, dir), { recursive: true });
let failed = 0;
const t = await launch('');
try {
  if (look) await t.send('Emulation.setDeviceMetricsOverride', { width: 1458, height: 820, deviceScaleFactor: 1, mobile: false }); // the owner's window: 1458 px wide
  for (const [name, hash, scene, setup] of list) {
    try {
      await t.goto(hash);
      await t.waitFor(up(scene), 20000, scene + ' active');
      await t.clock();
      await setup(t);
      await t.shot(dir + '/' + name);
      if (!(await t.shot(dir + '/' + name))) throw new Error('the picture could not be taken');
      if (t.errors.length) throw new Error('console errors: ' + t.errors.join(' | '));
      console.log('  ok   ' + name);
    } catch (e) { failed++; console.log('  FAIL ' + name + ': ' + e.message); }
  }
} finally { await t.close(); }
console.log(failed ? `\nSHOTS FAIL (${failed} of ${list.length})` : `\nSHOTS: ${list.length} pictures in tests/out/${dir}/`);
process.exitCode = failed ? 1 : 0;
