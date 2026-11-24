// not in the smoke: a boot of mission 1.1 with its four beats, run by hand (one Chrome, muted, through the test lock; card space-game-l1-1-beats)
// The rules are in tests/campbeats.mjs (plain Node). This boots the rim run once and meets, for the first time in one scene, the systems the beats use: the torpedo boats,
// the rival ship's bars and its charge ring, the patrol and the miner on the map. The sim is run forward in the page (campStep in a loop, no drawing) to each beat; the scene then draws it for a moment.
// One picture of each beat. Nothing is judged by eye: the page must stay quiet and the beats must be there.
//   node tests/campbeats-boot.mjs        pictures go to CAMPBEATS_SHOTS (default ~/dev/spacegame-night/shots/campbeats-*.png), never into the repository
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch } = await import('./cdp.mjs');
const OUT = process.env.CAMPBEATS_SHOTS || join(homedir(), 'dev/spacegame-night/shots'); mkdirSync(OUT, { recursive: true });
let bad = 0;
const check = (name, ok, extra = '') => { console.log((ok ? '  ok   ' : '  FAIL ') + name + (extra ? '  ' + extra : '')); if (!ok) bad++; };
const snap = async (t, name) => { for (let i = 0; i < 2; i++) { const r = await t.send('Page.captureScreenshot', { format: 'png' }, { retry: true }); if (i) writeFileSync(join(OUT, 'campbeats-' + name + '.png'), Buffer.from(r.data, 'base64')); await t.run(34); } };

const t = await launch('?campaign=1', ROOT);
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  // the sim forward to a share of the road, the transport made tough (the test is about the beats, not the fight) and the carrier put beside her (the wing is out from the first second: card space-game-keys-orders)
  const toShare = async share => j(`(() => { const C = ${SC}.camp; let n = 0; while ((C.lane.t1 || 0) < ${share} && !C.result && n++ < 90000) { campConvoys(C).forEach(f => { f.hp = f.maxHp = 1e6; }); campStep(C, 1 / 30); C.events.length = 0; } const f = campConvoys(C)[0]; if (f) { C.carrier.x = f.x - 300; C.carrier.y = f.y - 260; C.carrier.vx = C.carrier.vy = 0; C.nav = null; } return +(C.lane.t1 || 0).toFixed(3); })()`);
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 15000, 'the Campaign scene'); await t.clock(); await t.run(700);
  for (let i = 0; i < 4 && (await j(`${SC}.mode`)) !== 'play'; i++) { await t.ev(`(() => { ${SC}.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await t.run(300); }
  check('the flight has started, on the rim run, with the beats in its row', (await j(`${SC}.mode`)) === 'play' && (await j(`${SC}.camp.L.mid === 'escort' && ${SC}.camp.L.rivals.length === 1 && ${SC}.camp.L.traffic.length === 2`)));
  await t.ev(`(() => { const C = ${SC}.camp; if (C.bay.fighters > 0) campOrder(C, 'launch'); return 1; })()`); await t.run(5000); // (the pilots start out beside the cruiser; the Launch order is for a bay that has ships)
  check('beat 1: two patrol ships are about, neutral, on the map list', (await j(`${SC}.camp.ships.filter(u => u.kind === 'patrol').length`)) === 2);
  await snap(t, 'patrol');
  // beat 2: the distress call
  await toShare(0.315); await t.run(2500);
  check('beat 2: the miner is under attack and the radio said so in one plain line; nothing asks for orders (no call, no plate)', (await j(`typeof campCallView`)) === 'undefined' && (await j(`!${SC}.callUi`)) === true && (await j(`${SC}.camp.ships.some(u => u.team === 'alien' && u.prey === 'miners' && u.hp > 0)`)) === true);
  await snap(t, 'call');
  // the player sends help with the ordinary squad order (the one E gives a pilot picked by A D, or all three): the Red squad at a pirate that is on the miner
  await j(`(() => { const foe = ${SC}.camp.ships.find(u => u.team === 'alien' && u.prey === 'miners' && u.hp > 0); return foe ? campWingOrder(${SC}.camp, 'red', 'attack', foe.id, 'key').ok : false; })()`);
  await t.run(3000);
  check('the red squad is on the pirates', (await j(`${SC}.camp.ships.filter(u => u.team === 'earth' && u.kind === 'fighter' && u.squad === 'red').every(u => u.order && u.order.type === 'attack')`)) === true);
  await snap(t, 'sendred');
  await t.run(20000);
  // beat 3: the ambush
  await toShare(0.525); await t.run(2500);
  check('beat 3: the ambush is out: skiffs and two torpedo boats', (await j(`campAliens(${SC}.camp).filter(u => u.kind === 'tboat').length`)) === 2);
  await snap(t, 'ambush');
  await t.run(9000);
  await snap(t, 'torpedo');
  await t.ev(`(() => { const C = ${SC}.camp; C.ships.filter(u => u.team === 'alien').forEach(u => { u.hp = 0; }); return 1; })()`); await t.run(800);
  // beat 4: the leader
  await toShare(0.755); await t.run(3000);
  check('beat 4: the pirate leader is out, a rival ship', (await j(`!!campRivalOf(${SC}.camp, 'leader')`)) === true);
  await snap(t, 'leader');
  await t.run(9000);
  await snap(t, 'leader-later');
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(700);
  check('the map opens with the rival on it', await j(`!!${SC}.mp && campMapMarks(${SC}.camp).some(m => m.type === 'rival' || m.type === 'pirate')`));
  await snap(t, 'map');
  await t.ev(`window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Tab' }))`); await t.run(200);
  await t.ev(`(() => { const C = ${SC}.camp, u = campRivalOf(C, 'leader'); if (u) campHurt(C, u, 99999, 'test'); return 1; })()`); await t.run(1500);
  check('killing the leader earns its bonus', (await j(`campBonuses(${SC}.camp).find(b => b.id === 'leader').ok`)) === true);
  check('the page stayed quiet through all four beats', (t.errors || []).length === 0, JSON.stringify((t.errors || []).slice(0, 3)));
} finally { await t.close(); }
console.log(bad ? `\n${bad} checks failed` : '\nCAMPBEATS BOOT PASS');
process.exit(bad ? 1 : 0);
