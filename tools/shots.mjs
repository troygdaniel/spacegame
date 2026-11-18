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
  ['sky', '#space', 'Space', async t => { await t.run(2000); }] // the sky with no backdrop sun, giant or moon: only real bodies
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
