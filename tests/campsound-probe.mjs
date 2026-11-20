// not in the smoke: how loud the Campaign's firing sounds are at the master output, measured in headless Chrome (one Chrome, muted, through the test lock; card space-game-campaign-turret-sound-bug)
// Troy could not hear the turrets or his ships' guns. A muted headless Chrome still runs the whole audio graph (--mute-audio mutes the device, not the graph), so an AnalyserNode on the master
// gain (AUD.master) reads exactly what the game sends to the speakers, before the compressor. For each firing sound, with the music OFF and with it ON, it reads the loudest 46 ms (RMS, dBFS)
// and the peak, and counts what the game did to make it: the sfx() calls, the audio nodes created (the pool should make none), the voices used and stolen, and the bullets the sim fired.
//   node tests/campsound-probe.mjs            the table (about two minutes); exit code 1 only when the page logged an error
//   node tests/campsound-probe.mjs --json     the numbers
// The sounds: the carrier's turrets (Space held beside an alien), the wing's guns (fighters and escorts attacking, Space up), a missile (F), the beam hum (Beam turrets), a small and a big blast,
// and for comparison the game's own laser and boom, and the music alone. The numbers are dBFS: 0 is full scale, 20 less is a tenth of the amplitude.
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { launch, sleep } = await import('./cdp.mjs');
const JSONOUT = process.argv.includes('--json');
const db = x => (x > 1e-6 ? Math.round(20 * Math.log10(x) * 10) / 10 : -120);

const t = await launch('?campaign=1', ROOT);
let bad = 0; const out = { music: {}, state: {} };
try {
  const SC = `game.scene.getScene('Campaign')`, j = async e => JSON.parse(await t.ev(`JSON.stringify(${e}) ?? 'null'`));
  await t.waitFor(`!!(window.game && game.scene.isActive('Campaign'))`, 30000, 'the Campaign scene');
  await t.press('ENTER'); await sleep(900); await t.press('ENTER'); await sleep(900); // the story card, the briefing: real keys, so the browser counts them as a gesture and the audio context may run
  await t.ev(`(() => { const s = ${SC}; if (s.mode !== 'play') s.onKey({ code: 'Enter', repeat: false }); return 1; })()`); await sleep(500);
  out.state = await j(`({ mode: ${SC}.mode, ac: AC ? AC.state : 'none', gesture: AUD.gesture, volume: G.volume, muted: G.muted, fx: FX.vol, music: MUSIC.on, musicVol: MUSIC.vol, rank: ${SC}.camp.rank, level: ${SC}.level })`);
  // the probe, in the page: the analyser on the master, the counters, and a battle with a tough gunship that stands still 300 px off
  await t.ev(`(() => {
    sfx('click'); const an = AC.createAnalyser(); an.fftSize = 2048; AUD.master.connect(an); const buf = new Float32Array(2048);
    window.__M = { on: false, rms: [], peak: [], sfx: [], nodes: 0, beeps: 0, bullets: { pd: 0, wing: 0, alien: 0 } };
    setInterval(() => { if (!__M.on) return; an.getFloatTimeDomainData(buf); let s = 0, pk = 0; for (let i = 0; i < buf.length; i++) { const x = buf[i]; s += x * x; if (Math.abs(x) > pk) pk = Math.abs(x); } __M.rms.push(Math.sqrt(s / buf.length)); __M.peak.push(pk); }, 20);
    ['createOscillator', 'createGain', 'createBiquadFilter', 'createBufferSource'].forEach(m => { const o = AC[m].bind(AC); AC[m] = (...a) => { __M.nodes++; return o(...a); }; });
    const s0 = sfx; window.sfx = (n, a) => { __M.sfx.push(n); return s0(n, a); }; const b0 = beep; window.beep = (...a) => { __M.beeps++; return b0(...a); };
    const cb = campBullet; window.campBullet = function (C, from, rot, speed, dmg, life, team, ahead, extra) { if (team === 'earth') { if (extra && extra.pd) __M.bullets.pd++; else __M.bullets.wing++; } else __M.bullets.alien++; return cb.apply(this, arguments); };
    window.__start = () => { __M.rms = []; __M.peak = []; __M.sfx = []; __M.nodes = 0; __M.beeps = 0; __M.bullets = { pd: 0, wing: 0, alien: 0 }; __M.p0 = AUD.pool ? AUD.pool.played : 0; __M.st0 = AUD.pool ? AUD.pool.stolen : 0; __M.on = true; };
    window.__stop = () => { __M.on = false; const w = __M.rms; let best = 0; for (let i = 0; i + 2 < w.length; i++) best = Math.max(best, Math.sqrt((w[i] ** 2 + w[i + 1] ** 2 + w[i + 2] ** 2) / 3)); // the loudest 46 + 40 ms
      const names = {}; __M.sfx.forEach(n => { names[n] = (names[n] || 0) + 1; });
      return { rms: best, peak: Math.max(0, ...__M.peak), mean: w.reduce((a, b) => a + b, 0) / Math.max(1, w.length), sfx: names, nodes: __M.nodes, beeps: __M.beeps, played: (AUD.pool ? AUD.pool.played : 0) - __M.p0, stolen: (AUD.pool ? AUD.pool.stolen : 0) - __M.st0, bullets: Object.assign({}, __M.bullets) }; };
    const C = ${SC}.camp, c = C.carrier; C.god = true; C.motherSpawn = 1e12; C.waves.forEach(w => { w.started = true; }); C.ships.forEach(u => { if (u.team === 'alien') u.hp = 0; });
    window.__foe = (dx, dy) => { const u = campSpawn(C, 'gunship', c.x + dx, c.y + dy); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; u.hp = u.maxHp = 1e7; return u.id; };
    window.__foe(300, 0); ${SC}.k.SPACE = { isDown: false };
    return 1; })()`);
  const phase = async (name, setup, secs, teardown) => {
    await t.ev('__start()'); // the measurement starts first: a one-shot sound (a kill, a missile) is made in the frame after its setup, and a frame between the two calls would be missed
    if (setup) await t.ev(`(() => { ${setup}; return 1; })()`);
    await sleep(secs * 1000); const r = await j('__stop()');
    if (teardown) await t.ev(`(() => { ${teardown}; return 1; })()`);
    return Object.assign({ name, rmsDb: db(r.rms), peakDb: db(r.peak), meanDb: db(r.mean) }, { sfx: r.sfx, nodes: r.nodes, beeps: r.beeps, played: r.played, stolen: r.stolen, bullets: r.bullets });
  };
  const run = async tag => {
    const rows = [];
    rows.push(await phase('silence', null, 2));
    rows.push(await phase('turrets (Space held beside an alien)', `${SC}.k.SPACE = { isDown: true }`, 5, `${SC}.k.SPACE = { isDown: false }`));
    await sleep(1500);
    rows.push(await phase('the wing launches out of the bay (Space up)', `const C = ${SC}.camp; campOrder(C, 'launch')`, 6)); // one ship every 0.6 s: the bay beeps
    await sleep(3000); // and they go at the gunship
    rows.push(await phase('wing firing (Space up)', `const C = ${SC}.camp; campOrder(C, 'attack', ''); campOrder(C, 'recall'); campOrder(C, 'attack', '')`, 6));
    await t.ev(`(() => { campOrder(${SC}.camp, 'recall'); return 1; })()`); await sleep(2500);
    rows.push(await phase('missile (F)', `const C = ${SC}.camp; C.missiles = 6; C.nextRocket = 0; campOrder(C, 'missiles', '')`, 4));
    rows.push(await phase('beam hum (Beam turrets, Space held)', `const C = ${SC}.camp; if (C.techs.indexOf('beam') < 0) C.techs.push('beam'); ${SC}.k.SPACE = { isDown: true }`, 4, `${SC}.k.SPACE = { isDown: false }; const C = ${SC}.camp; C.techs = C.techs.filter(x => x !== 'beam')`));
    await sleep(800);
    rows.push(await phase('a small ship dies (blastSmall)', `const C = ${SC}.camp, u = campSpawn(C, 'raider', C.carrier.x + 900, C.carrier.y); u.vmax = 0; u.accel = 0; u.nextShot = 1e12; campHurt(C, u, 1e6, 'x')`, 2));
    rows.push(await phase('a shot on the shield, then the hull (zap, clank)', `const C = ${SC}.camp; C.god = false; C.shield = 30; campHurt(C, C.carrier, 20, 'x'); campHurt(C, C.carrier, 40, 'x')`, 2, `${SC}.camp.god = true; ${SC}.camp.shield = 150; ${SC}.camp.carrier.hp = ${SC}.camp.carrier.maxHp`));
    rows.push(await phase('the mothership dies (blastBig, fed as the scene event)', `${SC}.onEvent({ type: 'boom', x: 0, y: 0, big: true, kind: 'mother' })`, 3));
    rows.push(await phase('REFERENCE: the laser of Long Haul', `sfx('laser')`, 1));
    rows.push(await phase('REFERENCE: the boom of a kill in Long Haul', `sfx('boom')`, 2));
    return rows;
  };
  // music off first
  await t.ev(`(() => { musicSetOn(false); return 1; })()`); await sleep(4500);
  out.state.musicBusOff = await j('!!MUS.bus');
  out.music.off = await run('off');
  // then on: let it come up, read the music alone, then the same
  await t.ev(`(() => { musicSetOn(true); return 1; })()`); await sleep(7000);
  out.state.musicBusOn = await j('!!MUS.bus'); out.state.fxScale = await j('fxScale()');
  out.music.on = await run('on');
  out.errors = (t.errors || []).slice(0, 5); if (out.errors.length) bad++;
} finally { await t.close(); }

if (JSONOUT) console.log(JSON.stringify(out, null, 1));
else {
  console.log('state:', JSON.stringify(out.state));
  for (const tag of ['off', 'on']) {
    console.log(`\nmusic ${tag.toUpperCase()}   (loudest 46 ms RMS and peak at the master output, dBFS; sfx calls; audio nodes made; pool voices used / taken from another sound; bullets fired by the sim)`);
    for (const r of out.music[tag]) console.log(`  ${r.name.padEnd(50)} rms ${String(r.rmsDb).padStart(6)}  peak ${String(r.peakDb).padStart(6)}   sfx ${JSON.stringify(r.sfx)}  beeps ${r.beeps}  nodes ${r.nodes}  voices ${r.played}/${r.stolen}  bullets ${JSON.stringify(r.bullets)}`);
  }
}
process.exitCode = bad ? 1 : 0;
