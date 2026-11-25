// not in the smoke: the new ship look's signal shapes, taken by hand (card space-game-ship-look-d-glyphs; the mock is docs/ship-look-mock.html direction 4)
// One Chrome (muted, through the test lock: tests/cdp.mjs), the game clock stepped by hand, a window of 1578 by 1000 px. The SAME page is shown today's ships and the new look: the switch (CAMP.flags.shiplook) is flipped in the page
// between two pictures. Pictures go OUTSIDE the repository: ~/dev/spacegame-night/shiplook/ (SHIPLOOK_SHOTS=<folder> for another), named <TAG>-<picture>.png (TAG default d).
//   node tools/shiplookglyphshot.mjs   the busy moment at the start zoom (pictures), then zoomed out three presses (signs), then the Tab map; each with the switch off and on
// Exit code 1 when a picture could not be taken, the game logged an error, a ship is on the wrong picture for the zoom, or a sign was made with the switch off.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('../tests/cdp.mjs');
const OUT = process.env.SHIPLOOK_SHOTS || join(homedir(), 'dev/spacegame-night/shiplook'); mkdirSync(OUT, { recursive: true });
const TAG = process.env.TAG || 'd';
const SC = `game.scene.getScene('Campaign')`;
const up = `!!(window.game && game.scene.isActive('Campaign'))`;
const note = (...a) => console.log('  ' + a.join(' '));
let bad = 0;

const t = await launch('?campaign=1&shiplook=flag', ROOT); // shiplook=flag: neither on nor off, so the switch flipped in the page decides (the boot helper adds shiplook=0 to an address that does not name it)
const j = async expr => JSON.parse(await t.ev(`JSON.stringify(${expr})`));
await t.send('Emulation.setDeviceMetricsOverride', { width: 1578, height: 1000, deviceScaleFactor: 1, mobile: false });
const snap = async name => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, `${TAG}-${name}.png`), Buffer.from(r.data, 'base64')); await t.run(34); } note('picture', name); };
const keyOn = code => t.ev(`(() => { ${SC}.onKey({ code: '${code}', repeat: false }); return 1; })()`);
await t.waitFor(up, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await keyOn('Enter'); await t.run(300); }
await t.run(600);
const flip = on => t.ev(`(() => { CAMP.flags.shiplook = ${on ? 'true' : 'false'}; return 1; })()`);
const keys = () => j(`(() => { const s = ${SC}; return Object.keys(s.sp).map(id => s.sp[id].texture.key); })()`);
const expect = async (label, want) => { // want: 'old', 'ship' (look-<kind>-<side>) or 'sign' (look-g-...)
  await t.run(150); const K = await keys(), ok = K.filter(k => want === 'old' ? !String(k).startsWith('look-') : want === 'sign' ? String(k).startsWith('look-g-') : (String(k).startsWith('look-') && !String(k).startsWith('look-g-')));
  if (ok.length !== K.length) { bad++; note('FAIL', label, 'expected', want, 'got', JSON.stringify(K.filter(k => !ok.includes(k)).slice(0, 5))); } else note('ok', label, K.length + ' sprites, all', want);
};

// the busy moment as the mock stages it: the wing out, pirates and aliens close
await t.ev(`(() => { const C = ${SC}.camp, c = C.carrier; C.god = true; const at = (k, dx, dy) => { const u = campSpawn(C, k, c.x + dx, c.y + dy); if (u) u.rot = Math.atan2(-dy, -dx); return u; };
  at('skiff', 260, -90); at('skiff', 340, 0); at('cutter', 300, 120); at('tboat', 420, 150); at('brute', 360, -170); at('raider', -300, -200); at('drone', -380, 40); at('gunship', -340, 180); return 1; })()`);
await t.run(400);
await flip(false); await expect('start zoom, switch off', 'old'); await snap('far-0-start-today');
await flip(true); await expect('start zoom, look on: pictures, not signs', 'ship'); await snap('far-1-start-new');
// three presses out: 0.335 / 1.2 ^ 3 = 0.19, far
for (let i = 0; i < 3; i++) await keyOn('Minus'); await t.run(1200);
const z = await j(`${SC}.cameras.main.zoom`); note('zoom now', z.toFixed(3));
await flip(false); await expect('far zoom, switch off', 'old'); await snap('far-2-zoomed-today');
await flip(true); await expect('far zoom, look on: signs', 'sign'); await snap('far-3-zoomed-signs');
// one press back is still signs (the hysteresis), a second press back is pictures again
await keyOn('Equal'); await t.run(900); const z1 = await j(`${SC}.cameras.main.zoom`); note('one press in', z1.toFixed(3)); await expect('one press back in (' + z1.toFixed(2) + '), the hysteresis', z1 < 0.3 ? 'sign' : 'ship');
for (let i = 0; i < 2; i++) await keyOn('Equal'); await t.run(900); const z2 = await j(`${SC}.cameras.main.zoom`); note('back in', z2.toFixed(3)); await expect('back at ' + z2.toFixed(2) + ', pictures again', z2 > 0.3 ? 'ship' : 'sign');
// the Tab map
await t.key('TAB'); await t.run(500); if (!(await j(`!!${SC}.mp`))) { bad++; note('FAIL the Tab map did not open'); }
await flip(false); await t.run(200); await snap('map-0-today'); await flip(true); await t.run(200); await snap('map-1-signs');
await t.key('TAB'); await t.run(300);
const errs = (await t.errors) || [];
if (errs.length) { bad++; note('FAIL the game logged errors:', JSON.stringify(errs.slice(0, 3))); }
await t.close();
console.log(bad ? `\n${bad} problem(s)` : `\nall pictures taken; folder ${OUT}`);
process.exit(bad ? 1 : 0);
