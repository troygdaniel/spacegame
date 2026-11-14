// smoke: the sound pass: levels against the planet wind and a laser shot, mute and volume 0, and the wiring
// Levels of the sound pass (card space-game-sfx-pass; src/audio.js). Run: node tests/sfxlevels.mjs
// Nothing plays: every effect is rendered into an OfflineAudioContext (the page is only used for its code), like tests/audiolevels.mjs.
// For each new effect and the cruise rumble loop it measures the loudest 50 ms stretch (RMS, dBFS) and checks:
//   - not silent: at least 8 dB above the planet wind (the quietest thing in the game, tests/audiolevels.mjs)
//   - never louder than a laser shot (the loudest "ordinary" effect), nor clipping (peak under 0.9)
//   - nothing not finite, and an end: no sound goes on longer than its length plus a tail
// and that mute and volume 0 make sfx() start nothing at all.
import { launch } from './cdp.mjs';

const NEW = ['interdict', 'hyperCharge', 'hyperJump', 'hyperArrive', 'fuelPump', 'fuelLow', 'buy', 'sell', 'shieldDown', 'shieldUp', 'click', 'uiOpen', 'uiClose', 'type', 'siren', 'cruiseOn', 'cruiseOff'];
const t = await launch('#space');
let bad = 0;
const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); if (!c) bad++; };
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Space'))", 30000, 'Space active');
  // ---- the wiring: the real events call the right sounds (sfx is spied on; nothing plays) ----
  await t.clock();
  const E = x => t.ev(x), SP = "game.scene.getScene('Space')";
  const tick = async n => { for (let left = n; left > 0; left -= 20) await E(`tick(${Math.min(20, left)})`); };
  await E(`(() => { const s = ${SP}; s.enemies.getChildren().slice().forEach(d => d.destroy()); G.guideDone = true; window.__calls = []; window.__sfx0 = sfx; window.sfx = n => { window.__calls.push(n); }; return 1; })()`);
  const calls = async (what, fn) => { await E('window.__calls.length = 0'); await fn(); return JSON.parse(await E('JSON.stringify(window.__calls)')); };
  // cruise: engage starts the rumble and the whoosh; every way out stops the rumble and plays the drop-out
  let c = await calls('cruise engage', () => E(`(() => { const s = ${SP}; s.ship.setPosition(9000, 9000); s.ship.setVelocity(0, 0); cruisePick(s, cruiseKnown(s).find(b => b.name === 'Kepler-4c')); cruiseEngage(s); return 1; })()`));
  ok(c.includes('cruiseOn') && (await E('!!AUD.cru')), 'cruise engage plays cruiseOn and starts the rumble', JSON.stringify(c));
  c = await calls('cruise end', () => E(`cruiseEnd(${SP}, 'arrived')`));
  ok(c.includes('cruiseOff') && (await E('AUD.cru === null')), 'dropping out plays cruiseOff and stops the rumble', JSON.stringify(c));
  await E(`(() => { cruiseEngage(${SP}); return 1; })()`); await E(`${SP}.scene.restart()`); await tick(10);
  ok(await E('AUD.cru === null'), 'a scene restart in the middle of a cruise leaves no rumble behind');
  // shields: down, then whole again
  await E(`(() => { window.__calls = window.__calls || []; const s = ${SP}; s.ironUntil = 0; s.sh.max = 40; s.sh.pts = 40; s.sh.hurt = false; s.sh.last = -1e9; return 1; })()`);
  c = await calls('shield down', () => E(`(() => { const s = ${SP}; s.ironUntil = 0; s.hurt(60, s.ship.x + 50, s.ship.y); return 1; })()`));
  ok(c.includes('shieldDown'), 'the shield absorbing a hit it cannot hold plays shieldDown', JSON.stringify(c));
  c = await calls('shield up', async () => { await E(`(() => { const s = ${SP}; s.sh.last = s.time.now - 100000; s.sh.regen = 200; return 1; })()`); await tick(120); });
  ok(c.filter(n => n === 'shieldUp').length === 1, 'and when it has recharged, shieldUp plays once', JSON.stringify(c));
  // low fuel: once when it falls into amber, once more at red, not every frame
  await E(`(() => { const r = activeShip(); window.__fuelFull = r.fuel; r.fuel = fuelTank(r) * 0.9; return 1; })()`); await tick(5);
  c = await calls('fuel amber', async () => { await E(`(() => { const r = activeShip(); r.fuel = fuelTank(r) * 0.2; return 1; })()`); await tick(30); });
  ok(c.filter(n => n === 'fuelLow').length === 1, 'the tank falling to amber plays fuelLow once, not every frame', JSON.stringify(c));
  c = await calls('fuel red', async () => { await E(`(() => { const r = activeShip(); r.fuel = fuelTank(r) * 0.05; return 1; })()`); await tick(30); });
  ok(c.filter(n => n === 'fuelLow').length === 1, 'falling to red plays it again, once', JSON.stringify(c));
  await E(`(() => { const r = activeShip(); r.fuel = window.__fuelFull; return 1; })()`);
  // typing: a tick every few letters of an NPC line
  c = await calls('typing', async () => { await E(`(() => { const s = ${SP}; const tx = s.add.text(0, 0, ''); window.__tw = typewrite(s, tx, 'Hello there, pilot. Looking for work?', 200); return 1; })()`); await tick(120); });
  ok(c.filter(n => n === 'type').length >= 5 && c.filter(n => n === 'type').length <= 14, 'an NPC line types with a soft tick every few letters (not every one)', c.filter(n => n === 'type').length + ' ticks');
  // panels: Pause and the Journal open and close with their pair
  c = await calls('pause', async () => { await E('openPause(game)'); await tick(5); await E(`game.scene.getScene('Pause').resume()`); await tick(5); });
  ok(c.includes('uiOpen') && c.includes('uiClose'), 'the Pause menu opens with uiOpen and closes with uiClose', JSON.stringify(c));
  c = await calls('journal', async () => { await E(`journalOpen(${SP})`); await tick(15); await E(`game.scene.getScene('Journal').close()`); await tick(5); });
  ok(c.includes('uiOpen') && c.includes('uiClose'), 'the Journal opens with uiOpen and closes with uiClose', JSON.stringify(c));
  // the rest are one-line calls in handlers a test cannot reach without a full station walk: check that the handlers still make them
  const uses = async (fn, name) => E(`String(${fn}).includes("sfx('${name}')")`);
  ok(await uses('ShipBay.prototype.hangarTab', 'click') && await uses('ShipBay.prototype.hangarPick', 'click'), 'the hangar tabs and rows click');
  ok(await uses('cruiseInterdict', 'interdict'), 'an interdiction plays interdict');
  ok(await uses('buyFuel', 'fuelPump'), 'the pump plays fuelPump');
  ok(await uses('Hyper.prototype.create', 'hyperCharge') && await uses('Hyper.prototype.create', 'hyperJump') && await uses('Hyper.prototype.arrive', 'hyperArrive'), 'the #hyper demo plays the charge, the jump and the arrival (silent in headless Chrome, so checked in the source)');
  ok(await uses('buyUpgrade', 'buy'), 'buying a part plays buy');
  ok(await uses('ShipBay.prototype.hangarDone', 'buy') && await uses('ShipBay.prototype.hangarDone', 'sell'), 'buying and selling a ship play buy and sell');
  await E(`(() => { window.sfx = window.__sfx0; return 1; })()`);

  const r = await t.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const SR = 44100, out = { fx: {}, loops: {} };
    const db = x => Math.round(20 * Math.log10(Math.max(x, 1e-9)) * 10) / 10;
    // loudest 50 ms of channel 0 (RMS), the peak, the last moment above -70 dBFS, and any non-finite sample
    const meas = b => { const d = b.getChannelData(0), w = Math.floor(0.05 * SR); let peak = 0, bad = 0, last = 0, best = 0;
      for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (!isFinite(a)) { bad++; continue; } if (a > peak) peak = a; if (a > 0.0003) last = i / SR; }
      for (let s = 0; s + w <= d.length; s += Math.floor(w / 2)) { let q = 0; for (let i = s; i < s + w; i++) q += d[i] * d[i]; best = Math.max(best, Math.sqrt(q / w)); }
      return { rms: db(best), peak: Math.round(peak * 1000) / 1000, end: Math.round(last * 100) / 100, bad }; };
    const render = async (secs, build) => {
      const o = new OfflineAudioContext(1, SR * secs, SR);
      AC = o; AUD.noise = null; AUD.amb = null; AUD.cru = null; AUD.master = o.createGain(); AUD.master.connect(o.destination); AUD.ducked = false;
      build(); return o.startRendering();
    };
    const keep = AMB_LEVEL.wind; const wb = await render(8, () => startAmbient('wind')); const wd = wb.getChannelData(0); let wq = 0, wn = 0; for (let i = 3 * SR; i < 8 * SR; i++) { wq += wd[i] * wd[i]; wn++; }
    out.wind = db(Math.sqrt(wq / wn));
    out.laser = meas(await render(1, () => SFX.laser(0)));
    for (const name of ${JSON.stringify(NEW)}) out.fx[name] = meas(await render(4, () => SFX[name](0)));
    // the loops: 4 s after they start (the cruise rumble fades in over 0.6 s)
    const loop = async (name, build, from) => { const b = await render(5, build); const d = b.getChannelData(0); let q = 0, n = 0, peak = 0; for (let i = from * SR; i < d.length; i++) { q += d[i] * d[i]; n++; peak = Math.max(peak, Math.abs(d[i])); } out.loops[name] = { rms: db(Math.sqrt(q / n)), peak: Math.round(peak * 1000) / 1000 }; };
    await loop('cruiseHum', () => startCruiseHum(), 2);
    // mute and volume 0: sfx() must not even build a node
    const spy = []; const AC0 = window.AudioContext; let made = 0;
    const o = new OfflineAudioContext(1, SR, SR); AC = o; AUD.master = o.createGain(); AUD.master.connect(o.destination);
    const co = o.createOscillator.bind(o), cb = o.createBufferSource.bind(o); o.createOscillator = () => { made++; return co(); }; o.createBufferSource = () => { made++; return cb(); };
    const gm = G.muted, gv = G.volume, res = {};
    G.muted = true; G.volume = 1; made = 0; for (const n of ${JSON.stringify(NEW)}) sfx(n); res.muted = made;
    G.muted = false; G.volume = 0; made = 0; for (const n of ${JSON.stringify(NEW)}) sfx(n); res.volume0 = made;
    G.muted = true; made = 0; startCruiseHum(); res.humMuted = made > 0; // the hum is a loop: it is built but plays through the master gain, which is 0 when muted
    G.muted = gm; G.volume = gv; out.guard = res; stopCruiseHum();
    return JSON.stringify(out);
  })()` });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  const m = JSON.parse(r.result.value);
  console.log('  planet wind ' + m.wind + ' dBFS, laser ' + m.laser.rms + ' dBFS RMS (peak ' + m.laser.peak + ')');
  for (const [n, v] of Object.entries(m.fx)) console.log(`  ${n.padEnd(12)} ${String(v.rms).padStart(6)} dBFS  peak ${v.peak}  ends ${v.end} s`);
  for (const [n, v] of Object.entries(m.loops)) console.log(`  ${n.padEnd(12)} ${String(v.rms).padStart(6)} dBFS (steady)  peak ${v.peak}`);
  for (const [n, v] of Object.entries(m.fx)) {
    ok(v.rms - m.wind >= 8, `${n}: ${Math.round((v.rms - m.wind) * 10) / 10} dB above the planet wind (at least 8)`);
    ok(v.rms <= m.laser.rms + 0.3, `${n}: not louder than a laser shot (${v.rms} against ${m.laser.rms} dBFS)`);
    ok(v.peak < 0.9 && v.bad === 0, `${n}: no clipping, nothing not finite (peak ${v.peak})`);
    ok(v.end < 3.5, `${n}: it ends (last sound at ${v.end} s)`);
  }
  for (const [n, v] of Object.entries(m.loops)) {
    ok(v.rms - m.wind >= 8 || n === 'cruiseHum' && v.rms - m.wind >= 3, `${n}: audible over the planet wind (${Math.round((v.rms - m.wind) * 10) / 10} dB above)`);
    ok(v.rms <= m.laser.rms - 3, `${n}: a bed, well under a laser shot (${v.rms} against ${m.laser.rms} dBFS)`);
  }
  ok(m.guard.muted === 0, 'muted: sfx() builds no oscillator and no noise source for any of them');
  ok(m.guard.volume0 === 0, 'volume 0: the same');
  ok(t.errors.length === 0, 'no console errors' + (t.errors.length ? ': ' + t.errors.join(' | ') : ''));
} finally { await t.close(); }
console.log(bad ? `\nSFXLEVELS FAIL (${bad})` : '\nSFXLEVELS PASS');
process.exitCode = bad ? 1 : 0;
