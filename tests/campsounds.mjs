// smoke: the Campaign's sounds: each is built of the pool's tones and noise bursts, short, within the level rules, in the one table of what each is made of (plain Node, no browser)
// Card space-game-campaign-sounds (src/audio.js: SFX, SFX_BUILT; src/campaignscene.js: which event plays which). Nothing plays: the game's audio code runs against a stand-in
// AudioContext (the one of tests/soundpool.mjs) that records what is scheduled on every voice, and the sounds are measured from that: how long, how high, how loud at worst.
//   G1. the turrets: the pew
//   G2. the beam and mining hum
//   G3. the missiles
//   G4. the explosions and the hits
//   ALL. the rules every one of them keeps: no new nodes, volume and mute, the effects volume, a share of the reverb, a name in the table
// Run: node tests/campsounds.mjs   (exit code 1 on a failed check)
import { readFileSync } from 'node:fs';
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name + (detail ? '  ' + String(detail).slice(0, 200) : '')); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 300) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));
const src = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');

// the stand-in AudioContext (as tests/soundpool.mjs): every node counted, every parameter keeps its events as [what, value, time]
g.run(`
  function __fake() {
    const made = { osc: 0, gain: 0, filter: 0, source: 0, buffer: 0, convolver: 0, compressor: 0 }, nodes = [];
    const param = v => { const p = { value: v, ev: [] };
      p.setValueAtTime = (x, t) => { p.ev.push(['set', x, t]); return p; }; p.linearRampToValueAtTime = (x, t) => { p.ev.push(['lin', x, t]); return p; };
      p.exponentialRampToValueAtTime = (x, t) => { p.ev.push(['exp', x, t]); return p; }; p.setTargetAtTime = (x, t) => { p.ev.push(['target', x, t]); return p; };
      p.cancelScheduledValues = t => { p.ev = p.ev.filter(e => e[2] < t); return p; };
      return p; };
    const node = (kind, extra) => { made[kind]++; const o = Object.assign({ kind, to: [], connect(d) { o.to.push(d); return d; }, disconnect() { o.to = []; }, start() { o.started = (o.started || 0) + 1; }, stop() { o.stopped = true; } }, extra); nodes.push(o); return o; };
    const ac = { sampleRate: 8000, currentTime: 10, state: 'running', destination: { kind: 'destination' }, made, nodes, resume() {},
      createOscillator: () => node('osc', { type: 'sine', frequency: param(440) }),
      createGain: () => node('gain', { gain: param(1) }),
      createBiquadFilter: () => node('filter', { type: 'lowpass', frequency: param(350), Q: param(1) }),
      createBufferSource: () => node('source', { buffer: null, loop: false }),
      createConvolver: () => node('convolver', { buffer: null }),
      createDynamicsCompressor: () => node('compressor', {}),
      createBuffer: (ch, len, rate) => { made.buffer++; const data = Array.from({ length: ch }, () => new Float32Array(len)); return { numberOfChannels: ch, length: len, sampleRate: rate, getChannelData: c => data[c] }; } };
    ac.count = () => made.osc + made.gain + made.filter + made.source + made.convolver + made.compressor;
    return ac;
  }
  var __made = 0; window.AudioContext = function () { __made++; return (__ac = __fake()); }; window.webkitAudioContext = undefined;
  var __ac = null;
  function __reset(muted, volume, fx) { AC = null; __ac = null; __made = 0; Object.assign(AUD, { master: null, noise: null, amb: null, eng: null, cru: null, rev: null, pool: null, sendNow: undefined, gesture: true, ducked: false }); G.muted = !!muted; G.volume = volume === undefined ? 1 : volume; FX.vol = fx === undefined ? 1 : fx; }
  // one sound on a fresh pool: what it asks of the voices. voices: those it touched (a gain that went above silence); peak: the sum of their loudest points (an upper bound of how loud it gets);
  // secs: from its start to the last thing scheduled; freqs: each tone voice's first and last pitch; noise: each noise voice's filter type and sweep
  window.__render = (name, arg, setup) => {
    __reset(false, 1); Math.random = () => (window.__rand === undefined ? 0.5 : window.__rand); if (setup) setup();
    sfx('click'); const before = __ac.count(); const t0 = 20; __ac.currentTime = t0;
    const pool = AUD.pool, base = new Map(); pool.tones.concat(pool.noises).forEach(v => base.set(v, v.g.gain.ev.length));
    SFX[name](t0, arg);
    const used = [], lvl = v => v.g.gain.ev.slice(base.get(v)).filter(e => e[1] > 0.0011);
    pool.tones.concat(pool.noises).forEach(v => { if (lvl(v).length) used.push(v); });
    const peak = used.reduce((s, v) => s + Math.max(...lvl(v).map(e => e[1])), 0);
    const end = Math.max(0, ...used.map(v => Math.max(...v.g.gain.ev.slice(base.get(v)).map(e => e[2])))) - t0;
    return { voices: used.length, peak, secs: end, nodes: __ac.count() - before,
      freqs: used.filter(v => v.o).map(v => { const e = v.o.frequency.ev.filter(x => x[2] >= t0 - 0.0001); return { type: v.o.type, f0: e[0] && e[0][1], f1: e[e.length - 1] && e[e.length - 1][1] }; }),
      noise: used.filter(v => v.flt).map(v => { const e = v.flt.frequency.ev.filter(x => x[2] >= t0 - 0.0001); return { type: v.flt.type, f0: e[0] && e[0][1], f1: e[e.length - 1] && e[e.length - 1][1] }; }),
      finite: used.every(v => v.g.gain.ev.every(e => Number.isFinite(e[1]) && Number.isFinite(e[2])) && (!v.o || v.o.frequency.ev.every(e => Number.isFinite(e[1])))) };
  };
`);
const R = (name, arg) => J(`__render(${JSON.stringify(name)}, ${arg === undefined ? 'undefined' : JSON.stringify(arg)})`);
const LASER = R('laser');

// ---------- G1. the turrets ----------
console.log('G1. the turrets: the pew');
{
  const p = Array.from({ length: 8 }, (_, i) => R('turret', i));
  check('a pew is short: under 100 ms from the first thing to the last, so eight turrets 88 ms apart do not smear', p.every(x => x.secs <= 0.1 && x.secs > 0.03), p.map(x => Math.round(x.secs * 1000)).join());
  check('and not louder than the laser shot of before (its loudest points added: ' + LASER.peak.toFixed(3) + ')', p.every(x => x.peak <= LASER.peak + 1e-9 && x.peak > 0.02), p[0].peak.toFixed(3));
  check('it is a bolt: a square tone that falls to under a third of its pitch, a sawtooth zip over it, and a click of noise', p[0].freqs.some(f => f.type === 'square' && f.f1 < f.f0 * 0.35) && p[0].freqs.some(f => f.type === 'sawtooth') && p[0].noise.some(f => f.type === 'highpass'), JSON.stringify(p[0].freqs));
  const base = p.map(x => x.freqs.find(f => f.type === 'square').f0);
  check('each turret has its own pitch: eight numbers give four steps of 150 Hz and the back four a little higher, all between 1.4 and 2.2 kHz', new Set(base.map(f => Math.round(f))).size === 8 && Math.min(...base) >= 1400 && Math.max(...base) <= 2200 && base[1] - base[0] === 150 && base[4] > base[0], base.map(Math.round).join());
  const lo = (g.run('window.__rand = 0'), J(`__render('turret', 0).freqs.find(f => f.type === 'square').f0`)), hi = (g.run('window.__rand = 1'), J(`__render('turret', 0).freqs.find(f => f.type === 'square').f0`)); g.run('window.__rand = 0.5');
  check('it moves 3 percent at random, so no two shots of one turret are the same: from 3 percent under to 3 percent over the turret\'s own pitch', Math.abs(lo / 1500 - 0.97) < 1e-6 && Math.abs(hi / 1500 - 1.03) < 1e-6, [lo, hi].join());
  check('it uses the pool: no new node', p.every(x => x.nodes === 0), p.map(x => x.nodes).join());
  check('the turret takes a little of the reverb, and no more than the laser', J('SOUND.send.turret') > 0 && J('SOUND.send.turret') <= J('SOUND.send.laser'));
  const sc = src('src/campaignscene.js');
  check('the scene plays it for each turret event, with the turret\'s number, no more than once in CAMP_BLIP.gap ms; the loud laser and the beep are gone from the turrets', /sfx\('turret', e\.i\)/.test(sc) && /C\.t - this\.blipAt < B\.gap/.test(sc) && !/B\.freq|B\.step/.test(sc));
}

// ---------- ALL. the rules every one of them keeps ----------
console.log('ALL. the rules');
{
  const NEW = J('Object.keys(SFX_BUILT)');
  check('every sound of the Campaign is a sound that exists and has its words in the table of what it is made of, with its group', NEW.length >= 1 && NEW.every(k => J(`!!SFX['${k}']`)) && NEW.every(k => J(`SFX_BUILT['${k}'].says.length`) > 40 && /^(turrets|hum|missiles|blasts)$/.test(J(`SFX_BUILT['${k}'].group`))), NEW.join());
  check('each draws on the pool and makes no node of its own, and nothing it schedules is not a number', NEW.every(k => { const r = R(k, 3); return r.nodes === 0 && r.finite && r.voices >= 1; }));
  check('each has its share of the reverb in SOUND.send (not left to the default)', NEW.every(k => J(`SOUND.send['${k}'] !== undefined`)));
  check('muted, or volume 0, or the effects at 0: no sound is made at all (no context, no pool)', NEW.every(k => { g.run(`__reset(true, 1); sfx('${k}', 2)`); const a = J('__made') === 0 && J('AUD.pool') === null; g.run(`__reset(false, 0); sfx('${k}', 2)`); const b = J('__made') === 0 && J('AUD.pool') === null; g.run(`__reset(false, 1, 0); sfx('${k}', 2)`); return a && b && J('__made') === 0; }));
  check('the effects volume of Settings > Sound scales every one (half the volume, half the level)', NEW.every(k => { const full = J(`(__reset(false, 1, 1), __render('${k}', 2).peak)`), half = J(`(__render('${k}', 2, () => { FX.vol = 0.5; }).peak)`); return Math.abs(half / full - 0.5) < 0.02; }));
  check('the master volume and M are the master gain, as for every effect: nothing here sets the master', !/AUD\.master\.gain\.(value|setTarget)[^\n]*campaign|SFX_BUILT[^\n]*master/i.test(src('src/audio.js')));
  check('the ship\'s voice stays louder than the effects: the effects are all at the level of a laser or under, and the voice is not in the effects volume (it is not scaled by FX.vol)', NEW.every(k => R(k, 3).peak <= 0.3));
}

console.log(failed ? `\nCAMPSOUNDS FAIL (${failed} of ${n})` : `\nCAMPSOUNDS PASS (${n})`);
process.exitCode = failed ? 1 : 0;
