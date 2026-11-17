// not in the smoke: the fixed pictures for the blind critic, run by hand
// Ten fixed pictures of the game for a critic that never sees the code (card space-game-blind-critic; docs/CRITIC.md says how they are judged).
//   node tools/shots.mjs            every picture, into tests/out/critic/ (01-title.png ... 10-settings.png)
//   node tools/shots.mjs 04 07      only the pictures whose name starts with one of these
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

const want = process.argv.slice(2), list = SHOTS.filter(([n]) => !want.length || want.some(w => n.startsWith(w)));
mkdirSync(join(OUT, 'critic'), { recursive: true });
let failed = 0;
const t = await launch('');
try {
  for (const [name, hash, scene, setup] of list) {
    try {
      await t.goto(hash);
      await t.waitFor(up(scene), 20000, scene + ' active');
      await t.clock();
      await setup(t);
      await t.shot('critic/' + name);
      if (!(await t.shot('critic/' + name))) throw new Error('the picture could not be taken');
      if (t.errors.length) throw new Error('console errors: ' + t.errors.join(' | '));
      console.log('  ok   ' + name);
    } catch (e) { failed++; console.log('  FAIL ' + name + ': ' + e.message); }
  }
} finally { await t.close(); }
console.log(failed ? `\nSHOTS FAIL (${failed} of ${list.length})` : `\nSHOTS: ${list.length} pictures in tests/out/critic/`);
process.exitCode = failed ? 1 : 0;
