// not in the smoke: the new ship look's pictures, taken by hand (card space-game-ship-look-a-ships; the mock is docs/ship-look-mock.html direction 1, flat cut)
// One Chrome (muted, through the test lock: tests/cdp.mjs), the game clock stepped by hand, a window of 1578 by 1000 px like the mock's stage. The SAME page is shown today's ships and the new ones: the N panel's switch (CAMP.flags.shiplook) is
// flipped in the page between two pictures, so the two differ in nothing but the look. Pictures go OUTSIDE the repository: ~/dev/spacegame-night/shiplook/ (SHIPLOOK_SHOTS=<folder> for another), named <TAG>-<picture>.png (TAG default a).
//   node tools/shiplookshot.mjs        the busy moment (the cruiser, the wing, the transport of mission 1.1, pirates close by), then every kind (the transport is the mission's own: a hand-made one has no road to follow) in a strip, small and big, each with the switch off and on, and a launch (the tubes lit)
// Exit code 1 when a picture could not be taken, the game logged an error, or a ship was left on an old picture with the switch on.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('../tests/cdp.mjs');
const OUT = process.env.SHIPLOOK_SHOTS || join(homedir(), 'dev/spacegame-night/shiplook'); mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'a';
const SC = `game.scene.getScene('Campaign')`;
const up = `!!(window.game && game.scene.isActive('Campaign'))`;
const notes = []; const note = (...a) => { const s = a.join(' '); console.log('  ' + s); notes.push(s); };
let bad = 0;

const t = await launch('?campaign=1&shiplook=flag', ROOT); // shiplook=flag: neither on nor off, so the switch flipped in the page decides (the boot helper adds shiplook=0 to an address that does not name it)
const j = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));
await t.send('Emulation.setDeviceMetricsOverride', { width: 1578, height: 1000, deviceScaleFactor: 1, mobile: false });
const snap = async name => { // taken twice: the first capture after a step can be a frame behind
  for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); }
  note('picture', name);
};
const keyOn = code => t.ev(`(() => { ${SC}.onKey({ code: '${code}', repeat: false }); return 1; })()`);
await t.waitFor(up, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await keyOn('Enter'); await t.run(300); } // the story card, then the briefing: Enter until the battle is on
await t.run(600);
const flip = on => t.ev(`(() => { CAMP.flags.shiplook = ${on ? 'true' : 'false'}; return 1; })()`);
// what each ship's sprite is showing: none with the switch on may be on an old picture (no key starting look-) and the new textures all exist
const looks = () => j(`(() => { const s = ${SC}; return Object.keys(s.sp).map(id => { const u = s.camp.by[id]; return { id, kind: u && u.kind, key: s.sp[id].texture.key }; }); })()`);
const check = async (label, on) => {
  await t.run(120); const L = await looks(), olds = L.filter(x => on ? !String(x.key).startsWith('look-') : String(x.key).startsWith('look-'));
  if (olds.length) { bad++; note('FAIL', label, 'ships on the wrong picture:', JSON.stringify(olds.slice(0, 6))); } else note('ok', label, L.length + ' ships, all on the ' + (on ? 'new' : 'old') + ' pictures');
};

// 1. the busy moment: the cruiser and its wing out, the mission's transport, and the pirates close, as the mock stages it
await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; C.god = true;
  const at = (k, dx, dy) => { const u = campSpawn(C, k, c.x + dx, c.y + dy); if (u) u.rot = Math.atan2(-dy, -dx); return u; };
  at('skiff', 260, -90); at('skiff', 340, 0); at('cutter', 300, 120); at('tboat', 420, 150); at('brute', 360, -170); return 1; })()`);
await t.run(400);
await flip(false); await t.run(150); await check('busy moment, today\'s ships', false); await snap('busy-0-today');
await flip(true); await t.run(150); await check('busy moment, the new look', true); await snap('busy-1-new');

// 2. every kind in a strip, up close: the small ones, then the big ones (the aliens, the pirate leader, the mothership, a tower)
const strip = async (name, kinds, zoom, dx0, step) => {
  await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; C.ships.filter(u => u.team !== 'earth').forEach(u => { u.hp = 0; }); CAMZOOM.want = ${zoom}; return 1; })()`);
  await t.run(200);
  await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; ${JSON.stringify(kinds)}.forEach((k, i) => { const u = campSpawn(C, k, c.x + ${dx0} + i * ${step}, c.y - 150); if (u) { u.rot = -0.0; u.vmax = 0; u.vx = 0; u.vy = 0; u.hold = true; } }); return 1; })()`);
  await t.run(60);
  await flip(false); await t.run(100); await snap(name + '-0-today'); await flip(true); await t.run(100); await check(name + ', the new look', true); await snap(name + '-1-new');
};
await strip('strip-small', ['fighter', 'skiff', 'cutter', 'brute', 'tboat', 'lancer', 'patrol', 'miner', 'raider', 'drone', 'gunship'], 1.1, -330, 62);
await strip('strip-big', ['pirateleader', 'tower', 'mother'], 0.9, -300, 280);

// 3. a launch: the tubes at the front of the pods lit, with the new look on
await t.ev(`(() => { CAMZOOM.want = 1.6; return 1; })()`); await t.run(500);
await flip(true); await snap('cruiser-1-new');
await flip(false); await t.run(100); await snap('cruiser-0-today');

const errs = (await t.errors) || [];
if (errs.length) { bad++; note('FAIL the game logged errors:', JSON.stringify(errs.slice(0, 3))); }
await t.close();
console.log(bad ? `\n${bad} problem(s)` : `\nall pictures taken; folder ${OUT}`);
process.exit(bad ? 1 : 0);
