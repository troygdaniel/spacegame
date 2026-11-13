// Measures the planet wind against the effects with an OfflineAudioContext (no sound plays; the page is only used for its code).
// Fails if the planet wind is not at least 8 dB under the laser, tick and hit effects and 15 dB under the old level, or is silent.
// Run: node tests/audiolevels.mjs
import { launch } from './cdp.mjs';
const t = await launch('#surface');
try {
  await t.waitFor("!!(window.game && game.scene.isActive('Surface'))", 30000, 'Surface active');
  const r = await t.send('Runtime.evaluate', { awaitPromise: true, returnByValue: true, expression: `(async () => {
    const SR = 44100, out = {};
    const rms = (b, from, to) => { const d = b.getChannelData(0); let s = 0, n = 0; for (let i = Math.floor(from * SR); i < Math.min(d.length, Math.floor(to * SR)); i++) { s += d[i] * d[i]; n++; } return Math.sqrt(s / Math.max(1, n)); };
    const db = x => Math.round(20 * Math.log10(Math.max(x, 1e-9)) * 10) / 10;
    const render = async (secs, build) => {
      const o = new OfflineAudioContext(1, SR * secs, SR);
      AC = o; AUD.noise = null; AUD.amb = null; AUD.master = o.createGain(); AUD.master.connect(o.destination); AUD.ducked = false;
      build(); return o.startRendering();
    };
    const wind = async level => { const keep = AMB_LEVEL.wind; AMB_LEVEL.wind = level; const b = await render(8, () => startAmbient('wind')); AMB_LEVEL.wind = keep; return rms(b, 3, 8); };
    out.windNow = db(await wind(AMB_LEVEL.wind)); out.windWas = db(await wind(1));
    for (const [name, dur] of [['laser', 0.13], ['tick', 0.05], ['hit', 0.18], ['boom', 0.6]]) {
      out[name] = db(rms(await render(1, () => SFX[name](0)), 0, dur));
    }
    out.level = AMB_LEVEL.wind;
    return JSON.stringify(out);
  })()` });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  const m = JSON.parse(r.result.value); console.log('  levels (dBFS RMS): ' + r.result.value);
  const ok = (c, msg) => { console.log((c ? '  ok   ' : '  FAIL ') + msg); if (!c) process.exitCode = 1; };
  for (const n of ['laser', 'tick', 'hit']) ok(m[n] - m.windNow >= 8, `wind is ${Math.round((m[n] - m.windNow) * 10) / 10} dB under ${n}`);
  ok(m.windWas - m.windNow >= 15, `wind is ${Math.round((m.windWas - m.windNow) * 10) / 10} dB lower than at level 1`);
  ok(m.windNow > -60, `wind is still audible (${m.windNow} dBFS)`);
  ok(t.errors.length === 0, 'no console errors' + (t.errors.length ? ': ' + t.errors.join(' | ') : ''));
} finally { await t.close(); }
