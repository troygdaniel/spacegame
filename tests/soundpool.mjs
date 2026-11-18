// smoke: sound with weight: the voice pool (a fight makes no new audio nodes), the shared reverb and each effect's share of it, sound off makes nothing (plain Node)
// Card space-game-sound-weight (src/audio.js). Nothing plays and there is no browser: the game's audio code runs against a stand-in
// AudioContext that counts every node it is asked for and records what is scheduled on each parameter.
//   the pool     SOUND.tones oscillators and SOUND.noises noise loops, made once at the first sound; after that no effect, no beep and no
//                fight makes another node; a voice is reused when it is free, and when none is, the one ending soonest is taken
//   the reverb   one convolver for the whole game, its impulse made in code (reverbImpulse: it dies away, energy 1); each effect's share:
//                big events a lot, the cannons a little, the interface none; the engine and the space drone feed it, the planet wind does not
//   weight       a kill, the jump, the arrival and the dock go lower and last longer than they did
//   sound off    muted or volume 0: no context, no pool, no reverb, no node
// How loud each effect is stays with tests/sfxlevels.mjs and tests/audiolevels.mjs (Chrome, the overnight smoke).
// Run: node tests/soundpool.mjs   (exit code 1 on a failed check)
import { nodeGame } from './nodegame.mjs';

let failed = 0, n = 0;
const check = (name, cond, detail = '') => { n++; if (cond) console.log('  ok   ' + name); else { failed++; console.log(`  FAIL ${name}${detail ? '  (' + String(detail).slice(0, 500) + ')' : ''}`); } };
const g = nodeGame();
const J = e => JSON.parse(g.run(`(() => { const r = (${e}); return r === undefined ? 'null' : JSON.stringify(r); })()`));

// the stand-in AudioContext: __fake() makes one. made: how many nodes of each kind; every param keeps its events as [what, value, time]
g.run(`
  function __fake() {
    const made = { osc: 0, gain: 0, filter: 0, source: 0, buffer: 0, convolver: 0, compressor: 0 }, nodes = [];
    const param = v => { const p = { value: v, ev: [] };
      p.setValueAtTime = (x, t) => { p.ev.push(['set', x, t]); return p; }; p.linearRampToValueAtTime = (x, t) => { p.ev.push(['lin', x, t]); return p; };
      p.exponentialRampToValueAtTime = (x, t) => { p.ev.push(['exp', x, t]); return p; }; p.setTargetAtTime = (x, t) => { p.ev.push(['target', x, t]); return p; };
      p.cancelScheduledValues = t => { p.ev = p.ev.filter(e => e[2] < t); p.cancelled = (p.cancelled || 0) + 1; return p; };
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
  function __reset(muted, volume) { AC = null; __ac = null; __made = 0; Object.assign(AUD, { master: null, noise: null, amb: null, eng: null, cru: null, rev: null, pool: null, sendNow: undefined, gesture: true, ducked: false }); G.muted = !!muted; G.volume = volume === undefined ? 1 : volume; }
  function __busy(list, t) { return list.filter(v => v.until > t).length; }
`);

console.log('sound off: nothing is made');
for (const [tag, muted, vol] of [['muted', true, 1], ['volume 0', false, 0]]) {
  g.run(`__reset(${muted}, ${vol}); Object.keys(SFX).forEach(k => sfx(k)); for (let i = 0; i < 50; i++) beep(440 + i, 0.08, 'square', 0.03, 100);`);
  check(`${tag}: every effect and 50 beeps: no audio context, no pool, no reverb`, J('__made') === 0 && J('AC') === null && J('AUD.pool') === null && J('AUD.rev') === null);
}

console.log('the pool is made once');
{
  g.run(`__reset(false, 1); sfx('laser');`);
  const first = J('({ made: __ac.made, tones: AUD.pool.tones.length, noises: AUD.pool.noises.length, n: __ac.count() })');
  check('the first sound makes the voices: SOUND.tones oscillators and SOUND.noises noise loops, all started', first.tones === J('SOUND.tones') && first.noises === J('SOUND.noises') && first.made.osc === first.tones && first.made.source === first.noises && J('AUD.pool.tones.every(v => v.o.started === 1) && AUD.pool.noises.every(v => v.s.started === 1 && v.s.loop)'), JSON.stringify(first.made));
  check('20 tone voices and 8 noise voices', first.tones === 20 && first.noises === 8);
  check('every voice is silent until a sound is put on it (its gain starts at 0) and goes to the master gain', J('AUD.pool.tones.concat(AUD.pool.noises).every(v => v.g.gain.value === 0 && v.g.to.includes(AUD.master))'));
  check('and one reverb: a single convolver with a two-channel impulse, returning into the master gain', first.made.convolver === 1 && J('AUD.rev.conv.buffer.numberOfChannels') === 2 && J('AUD.rev.out.to.includes(AUD.master)') && J('AUD.rev.out.gain.value') === J('SOUND.wet'));
  check('every voice has a send into that reverb', J('AUD.pool.tones.concat(AUD.pool.noises).every(v => v.send.to.includes(AUD.rev.in) && v.g.to.includes(v.send))'));

  console.log('a busy fight makes no new audio nodes');
  // ten minutes of it: cannon shots four a second, hits, kills with their bounty, salvage beeps, a shield going down and up, the siren
  g.run(`for (let i = 0; i < 2400; i++) { __ac.currentTime = 10 + i * 0.25; sfx('laser'); if (i % 2 === 0) sfx('tick'); if (i % 3 === 0) sfx('hit'); if (i % 9 === 0) { sfx('boom'); sfx('bounty'); beep(880, 0.08, 'triangle', 0.04, 300); }
    if (i % 40 === 0) sfx('shieldDown'); if (i % 40 === 20) sfx('shieldUp'); if (i % 200 === 0) sfx('siren'); if (i % 5 === 0) beep(200, 0.08, 'square', 0.02, -100); }`);
  const after = J('({ n: __ac.count(), made: __ac.made, played: AUD.pool.played, stolen: AUD.pool.stolen, contexts: __made })');
  check(`after ${after.played} sounds: not one new node (${first.n} before, ${after.n} after)`, after.n === first.n && after.contexts === 1, JSON.stringify(after.made));
  check('that many sounds really were scheduled (thousands), each on a voice of the pool', after.played > 8000 && J('AUD.pool.tones.length') === 20 && J('AUD.pool.noises.length') === 8);
  check('at that pace no voice had to be taken from a sound still playing', after.stolen === 0, 'stolen ' + after.stolen);
  check('never more voices sounding than the pool has', J('__busy(AUD.pool.tones, __ac.currentTime) <= SOUND.tones && __busy(AUD.pool.noises, __ac.currentTime) <= SOUND.noises'));
}

console.log('reuse, and what happens when every voice is busy');
{
  g.run(`__reset(false, 1); __ac = null; sfx('click'); __ac.currentTime = 20;`);
  const used = () => J('AUD.pool.tones.map((v, i) => v.g.gain.ev.length ? i : -1).filter(i => i >= 0)');
  const before = used();
  g.run(`for (let i = 0; i < 30; i++) { __ac.currentTime = 20 + i; sfx('click'); }`);
  check('thirty clicks a second apart all play on the same voice', used().join() === before.join() && before.length === 1, used().join());
  g.run(`__ac.currentTime = 100; sfx('siren');`);
  check('a siren (eight notes over 1.2 s, two waveforms) books two voices ahead, one per waveform, not eight', J('AUD.pool.tones.filter(v => v.until > 100).length') === 2, J('AUD.pool.tones.filter(v => v.until > 100).length'));
  g.run(`__ac.currentTime = 200; var __n0 = __ac.count(), __s0 = AUD.pool.stolen; for (let i = 0; i < 40; i++) SFX.laser(200);`);
  const o = J('({ n: __ac.count() - __n0, stolen: AUD.pool.stolen - __s0, busy: __busy(AUD.pool.tones, 200) })');
  check('forty cannon shots in the same instant (80 tones): no new node, every tone voice busy, the rest take the voice that ends soonest', o.n === 0 && o.busy === 20 && o.stolen === 80 - 20, JSON.stringify(o));
  check('a taken voice is cut clean: its schedule is cancelled from that moment and it starts from silence', J('AUD.pool.tones.some(v => v.g.gain.cancelled > 0) && AUD.pool.tones.filter(v => v.g.gain.cancelled > 0).every(v => v.g.gain.ev.some(e => e[0] === "set" && e[1] === 0 && e[2] === 200) && v.o.frequency.cancelled > 0)'));
  g.run(`__ac.currentTime = 300; sfx('boom');`);
  check('every sound ends in silence on its voice: the last event of a used voice sets its level to 0', J('AUD.pool.tones.concat(AUD.pool.noises).filter(v => v.g.gain.ev.length).every(v => { const e = v.g.gain.ev[v.g.gain.ev.length - 1]; return e[0] === "set" && e[1] === 0; })'));
}

console.log('each effect\'s share of the reverb');
{
  const sendOf = name => { g.run(`__reset(false, 1); __ac = null; sfx('${name}');`); return J('AUD.pool.tones.concat(AUD.pool.noises).filter(v => v.send.gain.ev.length).map(v => v.send.gain.ev[v.send.gain.ev.length - 1][1])'); };
  const boom = sendOf('boom'), laser = sendOf('laser'), click = sendOf('click'), jump = sendOf('hyperJump');
  check('a kill sends a lot, on every one of its voices', boom.length >= 4 && boom.every(x => x === J('SOUND.send.boom')) && boom[0] >= 0.5, boom.join());
  check('a cannon shot a little; the jump the most', laser.every(x => x > 0 && x < 0.2) && jump.every(x => x >= boom[0]), laser.join() + ' / ' + jump.join());
  check('a UI click is dry: nothing to the reverb', click.length >= 1 && click.every(x => x === 0), click.join());
  check('the interface effects are all dry', ['click', 'uiOpen', 'uiClose', 'type', 'buy', 'sell', 'empty'].every(k => J(`soundSend('${k}')`) === 0));
  check('the big events have the longest tails: the kill, the jump, the arrival and the dock send the most', (() => { const s = J('SOUND.send'), big = ['boom', 'hyperJump', 'hyperArrive', 'dock'], rest = Object.keys(s).filter(k => !big.includes(k)); return big.every(b => rest.every(r => s[b] > s[r])); })());
  check('every name in the send table is an effect (or beep); an effect that is not in it gets the default', J(`Object.keys(SOUND.send).filter(k => k !== 'beep' && !SFX[k])`).length === 0 && J(`soundSend('nope')`) === J('SOUND.other'));
  g.run(`__reset(false, 1); __ac = null; sfx('interdict');`);
  check('an effect made of another (interdict plays the siren) gives each part its own share', J('[...new Set(AUD.pool.tones.concat(AUD.pool.noises).filter(v => v.send.gain.ev.length).map(v => v.send.gain.ev[v.send.gain.ev.length - 1][1]))].sort().join()') === [J('SOUND.send.siren'), J('SOUND.send.interdict')].sort().join());
  g.run(`__reset(false, 1); __ac = null; beep(880, 0.08, 'triangle', 0.04, 300);`);
  const b = J('(() => { const v = AUD.pool.tones.find(x => x.g.gain.ev.length); return { type: v.o.type, f: v.o.frequency.ev, g: v.g.gain.ev, send: v.send.gain.ev[0][1], made: __ac.made.osc }; })()');
  check('beep() plays on a pooled voice: its waveform, its slide, its level (the master gain is the volume), nearly dry', b.type === 'triangle' && b.f[0][1] === 880 && b.f[1][1] === 1180 && b.g[0][1] === 0.04 && b.send === J('SOUND.send.beep') && b.made === 20, JSON.stringify(b));
}

console.log('the loops');
{
  g.run(`__reset(false, 1); audioReady(); startAmbient('space');`);
  check('the space drone feeds the reverb', J('AUD.rev !== null && AUD.amb.out.to.some(d => d.kind === "gain" && d.gain.value === SOUND.loop.space && d.to.includes(AUD.rev.in))'));
  g.run(`__reset(false, 1); audioReady(); startAmbient('wind');`);
  check('the planet wind does not (it is the quietest thing in the game and stays as it was): no reverb is even made', J('AUD.rev') === null && J('AUD.amb.out.to.length') === 1);
  g.run(`__reset(false, 1); audioReady(); startEngine({ events: { on() {}, off() {} } });`);
  check('the engine hum feeds the reverb', J('AUD.eng.out.to.some(d => d.kind === "gain" && d.gain.value === SOUND.loop.engine && d.to.includes(AUD.rev.in))'));
  g.run(`stopEngine(); __reset(true, 1); audioReady(); startAmbient('space');`);
  check('started with the sound off, a loop makes no reverb', J('AUD.rev') === null);
}

console.log('the impulse, made in code');
{
  const m = J(`(() => { let s = 7; const rand = () => (s = (s * 16807) % 2147483647) / 2147483647; const [L, R] = reverbImpulse(8000, SOUND.tail, SOUND.rt60, rand);
    const e = (d, a, b) => { let q = 0; for (let i = Math.floor(a * d.length); i < Math.floor(b * d.length); i++) q += d[i] * d[i]; return q; };
    let bad = 0, same = 0; for (let i = 0; i < L.length; i++) { if (!isFinite(L[i]) || !isFinite(R[i])) bad++; if (L[i] === R[i]) same++; }
    return { n: L.length, total: e(L, 0, 1), totalR: e(R, 0, 1), first: e(L, 0, 0.1), last: e(L, 0.9, 1), mid: e(L, 0.45, 0.55), bad, same, start: Math.abs(L[0]) }; })()`);
  check('2.4 s at the context\'s rate, two channels that are not the same noise', m.n === Math.round(8000 * J('SOUND.tail')) && m.same < m.n / 100, JSON.stringify(m));
  check('its energy is 1 on each channel: what comes back is about as loud as what was sent', Math.abs(m.total - 1) < 1e-3 && Math.abs(m.totalR - 1) < 1e-3, m.total + ' ' + m.totalR);
  check('it dies away: the last tenth holds under a thousandth of the energy of the first, the middle is in between', m.last < m.first / 1000 && m.mid < m.first && m.mid > m.last, [m.first, m.mid, m.last].map(x => x.toExponential(2)).join(' '));
  check('nothing not finite, and it starts from silence', m.bad === 0 && m.start === 0);
}

console.log('weight: the big events go lower and last longer');
{
  const shape = name => { g.run(`__reset(false, 1); __ac = null; __ac0 = null; sfx('${name}');`); return J(`(() => { const t0 = __ac.currentTime; let end = 0, low = 1e9; AUD.pool.tones.forEach(v => { v.o.frequency.ev.forEach(e => { low = Math.min(low, e[1]); }); if (v.until > end) end = v.until; }); AUD.pool.noises.forEach(v => { if (v.until > end) end = v.until; }); return { secs: +(end - t0).toFixed(2), low }; })()`); };
  const boom = shape('boom'), jump = shape('hyperJump'), arrive = shape('hyperArrive'), dock = shape('dock'), click = shape('click'), laser = shape('laser');
  check('a kill: down to 26 Hz and over a second (it was 36 Hz and 0.6 s)', boom.low <= 26 && boom.secs >= 1.2, JSON.stringify(boom));
  check('the jump: down to 24 Hz and 1.5 s (it was 30 Hz and under a second)', jump.low <= 24 && jump.secs >= 1.5, JSON.stringify(jump));
  check('the arrival and the dock go on longer too', arrive.secs >= 1.5 && arrive.low <= 26 && dock.secs >= 1 && dock.low <= 30, JSON.stringify({ arrive, dock }));
  check('a click and a cannon shot stay short', click.secs <= 0.1 && laser.secs <= 0.2, JSON.stringify({ click, laser }));
}

check('the game made no error', g.errors.length === 0, g.errors.join(' | '));
console.log(failed ? `\n${failed} of ${n} checks FAILED` : `\nall ${n} checks passed`);
process.exit(failed ? 1 : 0);
